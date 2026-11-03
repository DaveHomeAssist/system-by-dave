import { stageReference } from './stage-reference.js';
import { LANES } from './lanes.js';

const COLORS = { A: '#ed23dc', B: '#00cfe5', C: '#ffbc00', D: '#20bd42' };
const CAMERAS = [
  { name: 'Perspective', label: 'Orbit', direction: [1, .55, 1.6] },
  { name: 'Audience', direction: [0, .12, 1] },
  { name: 'Overhead', label: 'Top', direction: [0, 1, .001] },
];

export async function createStage3D(host, plot, openLane) {
  const reference = stageReference(plot);
  // This is the canonical Throwline custom element, served locally by the relay.
  await import('/ProjectorThrow/three-d-stage.js');
  const stage = document.createElement('three-d-stage');
  stage.setAttribute('external-controls', '');
  stage.setAttribute('inspection-only', '');
  stage.setAttribute('aria-label', 'Throwline 3D stage reference');
  stage.setAttribute('fallback', '#tab-stage');
  host.append(stage);
  let THREE;
  try { ({ THREE } = await stage.ready); }
  catch (error) { stage.destroy(); stage.remove(); throw error; }
  const model = new THREE.Group(); model.name = 'Private plot reference';
  model.userData.units = reference.metric ? 'metres' : 'diagram';
  const groups = new Map(), surfaces = [], trim = [], bodies = [];
  const line = (points, color, opacity = 1) => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
  );
  const box = (size, position, color) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: .8 }));
    mesh.position.set(...position); return mesh;
  };
  const polygon = (points, color, opacity) => {
    const vertices = [];
    for (let i = 1; i < points.length - 1; i++) vertices.push(...points[0], ...points[i], ...points[i + 1]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
  };
  const xs = Object.values(reference.lanes).flatMap(l => l.coverage.map(p => p[0]));
  const left = Math.min(...xs) - .5, right = Math.max(...xs) + .5;
  const floor = box([right - left, .16, 4], [(left + right) / 2, -.15, -.5], '#e1e8ec');
  model.add(floor); surfaces.push(floor);
  // The elevation has no depth registration. Keep it in Front instead of
  // placing a second facade through the angled coverage surfaces.
  for (const points of reference.planOutline) { const shape = line(points, '#6f8493', .65); model.add(shape); trim.push(shape); }
  const targets = [];
  for (const [lane, data] of Object.entries(reference.lanes)) {
    const color = COLORS[lane], coverage = new THREE.Group(); coverage.name = `${lane} drawing coverage`;
    const face = polygon(data.coverage, color, .23); face.renderOrder = 2; coverage.add(face);
    coverage.add(line([...data.coverage, data.coverage[0]], color, .9));
    // Unknown heights only support plan rays, not a fabricated 3D beam cone.
    const rays = data.metric && !data.heightKnown
      ? data.planEdge : data.coverage;
    for (const p of rays) {
      coverage.add(line([data.projector, p], color, .3));
    }
    model.add(coverage); groups.set(lane, coverage);
    const projector = new THREE.Group(); projector.name = `${lane} ${LANES[lane].target}`;
    projector.position.set(...data.projector);
    projector.userData = { lane, units: reference.metric ? 'metres' : 'diagram',
      enclosure: [...data.body], heightKnown: data.heightKnown,
      datum: 'Lens position; enclosure offset schematic' };
    const body = box(data.body, [0, 0, data.body[2] / 2], '#334858');
    body.name = `${lane} enclosure`;
    bodies.push(body); projector.add(body);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), new THREE.MeshBasicMaterial({ color }));
    lens.name = `${lane} lens datum`; projector.add(lens);
    const target = data.coverage.reduce((out, p) => out.map((v, i) => v + p[i] / data.coverage.length), [0, 0, 0]);
    // Aim in plan only. Lens shift does not imply physical chassis pitch.
    projector.rotation.y = data.yaw === null
      ? Math.atan2(data.projector[0] - target[0], data.projector[2] - target[2]) : data.yaw * Math.PI / 180;
    model.add(projector);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(8, 8, 112, 112, 24); ctx.fill();
    ctx.fillStyle = '#102131'; ctx.font = 'bold 76px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lane, 64, 68);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
    label.position.set(data.projector[0], data.projector[1] + (lane === 'B' || lane === 'D' ? 1.05 : .65), data.projector[2]);
    label.scale.set(.42, .42, 1); label.renderOrder = 5; model.add(label);
    model.add(line([data.projector, label.position.toArray()], color, .8));
    targets.push({ id: lane, label: `${lane} ${LANES[lane].target}`, objects: [projector, label] });
  }
  stage.setObject(model);
  // Reference faces must remain translucent and never cast artificial beam shadows.
  model.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  stage.setActivationTargets(targets, { context: 'projctl.stage.v1' });
  stage.addEventListener('stage-object-activate', event => {
    const detail = event.detail;
    if (detail?.version === 1 && detail.context === 'projctl.stage.v1' && Object.hasOwn(LANES, detail.id)) openLane(detail.id);
  });
  const defaultCamera = reference.metric && !reference.heightsKnown ? 2 : 0;
  let camera = defaultCamera;
  const frame = (index = camera) => { camera = index; const c = CAMERAS[index]; stage.frameObject(c.direction, c.name, { fit: 'content', padding: 1.08, saveDefault: true }); };
  const controls = document.createElement('div'); controls.className = 'pj-stage-camera'; controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', '3D camera');
  for (const [index, c] of CAMERAS.entries()) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = c.label || c.name; button.title = c.name;
    button.onclick = () => frame(index); controls.append(button);
  }
  for (const [name, action] of [['Zoom in', () => stage.zoomBy(.8)], ['Zoom out', () => stage.zoomBy(1.25)], ['Reset', () => frame(defaultCamera)]]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = name === 'Zoom in' ? '+' : name === 'Zoom out' ? '−' : name; button.setAttribute('aria-label', name); button.onclick = action; controls.append(button);
  }
  host.append(controls);
  stage.addEventListener('stage-camera-shortcut', event => { if (event.detail.index < CAMERAS.length) frame(event.detail.index); });
  stage.addEventListener('stage-context-lost', () => { host.dataset.state = 'lost'; });
  stage.addEventListener('stage-context-restored', () => { host.dataset.state = 'ready'; });
  function theme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    surfaces.forEach(m => m.material.color.set(dark ? '#152934' : '#dce6eb'));
    trim.forEach(m => m.material.color.set(dark ? '#7895a7' : '#667f91'));
    bodies.forEach(m => m.material.color.set(dark ? '#658092' : '#405d70'));
    stage.requestRender();
  }
  const observer = new MutationObserver(theme); observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const resize = new ResizeObserver(() => { if (stage.clientWidth && stage.clientHeight) frame(); }); resize.observe(stage);
  const onPageHide = event => { if (!event.persisted) { observer.disconnect(); resize.disconnect(); stage.destroy(); } };
  window.addEventListener('pagehide', onPageHide);
  theme(); frame(); host.dataset.state = 'ready';
  return {
    layers(hidden) { for (const [lane, group] of groups) group.visible = !hidden.has(lane); stage.requestRender(); },
    highlight(lane) { for (const [key, group] of groups) group.traverse(o => { if (o.material) { o.material.opacity = o.material.userData.baseOpacity ?? o.material.opacity; o.material.userData.baseOpacity = o.material.opacity; if (lane && lane !== key) o.material.opacity *= .15; } }); stage.requestRender(); },
    active(on) { stage.toggleAttribute('paused', !on); if (on) stage.requestRender(); },
  };
}
