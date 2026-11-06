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
    const scale = 44 * span / height;
    label.scale.set(scale, scale, 1); label.updateMatrixWorld();
  };
  return label;
}
