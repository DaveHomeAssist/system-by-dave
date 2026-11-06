// Visibility aids never change physical projector or optical geometry.
export function roofCutaway(model, supplied = []) {
  const targets = [];
  const names = new Set(supplied.map(name => name.replace(/_/g, ' ').toLowerCase()));
  model.traverse(object => {
    const name = String(object.userData.name || object.name).replace(/_/g, ' ').toLowerCase();
    if (names.has(name) || /(^|\W)(roof|ceiling)(\W|$)|recess perimeter|luminous ceiling/.test(name)) targets.push(object);
  });
  return { count: targets.length, set(visible) { targets.forEach(object => { object.visible = visible; }); } };
}
export function screenLaneLabel(THREE, lane, color, position) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = color; context.beginPath(); context.roundRect(6, 6, 116, 116, 22); context.fill();
  context.strokeStyle = '#ffffff'; context.lineWidth = 5; context.stroke();
  context.fillStyle = '#102131'; context.font = 'bold 76px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(lane, 64, 68);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, sizeAttenuation: false }));
  label.position.set(...position); label.renderOrder = 20; label.name = `${lane} screen-size label`;
  label.userData.screenPixels = 44;
  const size = new THREE.Vector2();
  label.scale.set(.06, .06, 1);
  label.onBeforeRender = (renderer, scene, camera) => {
    const height = renderer.getSize(size).y || 600;
    const span = camera.isOrthographicCamera ? (camera.top - camera.bottom) / camera.zoom : 2 * Math.tan((Number.isFinite(camera.fov) ? camera.fov : 50) * Math.PI / 360);
    const scale = (label.userData.screenPixels || 44) * span / height;
    label.scale.set(scale, scale, 1); label.updateMatrixWorld();
    const end=label.getWorldPosition(new THREE.Vector3());label.center.set(.5,.5);
    if(label.userData.declutter){const group=[...label.userData.labelGroup.values()],center=group.reduce((sum,item)=>sum.add(new THREE.Vector3(...item.userData.origin).applyMatrix4(item.parent.matrixWorld).project(camera)),new THREE.Vector3()).multiplyScalar(1/group.length);const offsets={A:[-40,50],C:[40,50],B:[-40,-20],D:[40,-20]},offset=offsets[label.userData.lane],here=end.clone().project(camera),target=center.clone();target.x+=offset[0]*2/(size.x||800);target.y+=offset[1]*2/height;label.center.set(.5-(target.x-here.x)*(size.x||800)/2/(label.userData.screenPixels||44),.5-(target.y-here.y)*height/2/(label.userData.screenPixels||44));end.copy(target.unproject(camera));}
    const leader=label.userData.leader;if(leader){const local=leader.parent.worldToLocal(end);leader.geometry.attributes.position.setXYZ(1,local.x,local.y,local.z);leader.geometry.attributes.position.needsUpdate=true;leader.geometry.computeBoundingSphere();}

  };
  return label;
}

export function roomLayerNames(raw) {
  const name = String(raw || '').replace(/_/g, ' ').toLowerCase();
  if (/stage (?:deck|floor)|upstage masking|black stage wing|proscenium (?:pier|header)/.test(name)) return [];
  const names = [];
  if (/(^|\W)(roof|ceiling)(\W|$)|recess perimeter|luminous ceiling/.test(name)) names.push('roof');
  if (/side (?:auditorium wall|wall pilaster)|rear (?:orchestra wall|upper wall|support pier)|sconce (?:plate|diffuser)/.test(name)) names.push('walls');
  if (/mezzanine (?:terrace|aisle handrail)|balcony|cove (?:lip|lintel|black|fixture|glass|cable)|rear (?:technical recess|recess mullion|recess trim)|monitor (?:black frame|blue screen)/.test(name)) names.push('balcony');
  if (/^(?:orchestra (?:center|right 300|left 200)|(?:upper|lower) mezzanine center|mezzanine side)\b|\b(?:chair|seat)\b/.test(name)) names.push('seats');
  if (/^(?:(?:upper|lower) mezzanine center|mezzanine side)\b/.test(name) && !names.includes('balcony')) names.push('balcony');
  return names;
}
export function createRoomLayers(model, supplied = [], initial = {}) {
  const namedRoofs = new Set(supplied.map(name => name.replace(/_/g, ' ').toLowerCase()));
  const defaults={roof:false,walls:true,balcony:true,seats:true,...initial};const items = [], enabled = {...defaults};
  const initialRootVisible = model.visible;
  let visible = initialRootVisible;
  let cameraCutaway = new Set();
  model.traverse(object => {
    const memberships = new Set();
    for (let parent = object; parent && parent !== model.parent; parent = parent.parent) {
      const name = String(parent.userData.name || parent.name).replace(/_/g, ' ').toLowerCase();
      roomLayerNames(name).forEach(key => memberships.add(key));
      if (namedRoofs.has(name)) memberships.add('roof');
    }
    items.push({object, initial:object.visible, memberships});
  });
  const apply = () => { items.forEach(({object, initial, memberships}) => { object.visible = initial && [...memberships].every(key => enabled[key] && !cameraCutaway.has(key)); }); model.visible = visible; };
  apply();
  return {
    enabled, get cameraCutaway() { return cameraCutaway; },
    cutawayForCamera(keys = []) { cameraCutaway = new Set(keys); apply(); },
    get visible() { return visible; },
    count(key) { return items.filter(item => item.memberships.has(key)).length; },
    set(key, on) { enabled[key] = on; apply(); },
    show(on) { visible = on; apply(); },
    restore() { Object.assign(enabled, defaults); visible = initialRootVisible; apply(); },
  };
}
export function addRoomLayerControls(container, layers, render, projectorContext = true) {
  const roof = document.createElement('button'); roof.type = 'button'; roof.textContent = 'Roof'; roof.dataset.venueRoof = '';
  const menu = document.createElement('details'); menu.className = 'pj-room-layers';
  const summary = document.createElement('summary'); summary.textContent = 'Room layers'; menu.append(summary);
  const panel = document.createElement('div'); panel.className = 'pj-room-layer-panel'; menu.append(panel);
  const controls = [];
  const action = (label, key, fn) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.dataset.roomLayer = key; button.onclick = () => { fn(); sync(); render(); }; panel.append(button); controls.push(button); return button; };
  for (const [key,label] of [['walls','Walls'],['balcony','Balcony'],['seats','Seats']]) action(label,key,()=>layers.set(key,!layers.enabled[key]));
  action(projectorContext ? 'Projectors & beams only' : 'Hide room','room',()=>layers.show(!layers.visible));
  action('Restore room','restore',()=>layers.restore());
  const sync = () => {
    roof.disabled = !layers.count('roof'); roof.setAttribute('aria-pressed',String(layers.enabled.roof)); roof.title = layers.enabled.roof ? 'Hide roof' : 'Show roof';
    controls.forEach(button => {
      const key = button.dataset.roomLayer;
      if (key === 'restore') return;
      button.setAttribute('aria-pressed',String(key === 'room' ? !layers.visible : layers.enabled[key]));
      if (key !== 'room') { button.disabled = !layers.count(key); button.title = layers.cameraCutaway.has(key) ? 'Temporarily hidden by Coverage camera cutaway; preference retained' : ''; button.textContent = key === 'seats' && layers.cameraCutaway.has(key) ? 'Seats · coverage cutaway' : key[0].toUpperCase()+key.slice(1); }
    });
  };
  roof.onclick = () => { layers.set('roof',!layers.enabled.roof); sync(); render(); };
  menu.addEventListener('keydown', event => { if (event.key === 'Escape') { menu.open = false; summary.focus(); } });
  container.append(roof,menu); sync();
  return { visible(on) { roof.hidden = !on; menu.hidden = !on; }, sync };
}
