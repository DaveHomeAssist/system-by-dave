import { createRoomLayers, addRoomLayerControls } from './stage-visibility.js';

// Private, metric geometry. No rig commands, lane bindings or optical simulation.
export async function createVenueView(host, venue, planWithRoom) {
  await import('/ProjectorThrow/three-d-stage.js');
  const { GLTFLoader } = await import('/ProjectorThrow/vendor/three/addons/loaders/GLTFLoader.js');
  const stage = document.createElement('three-d-stage');
  stage.setAttribute('external-controls', ''); stage.setAttribute('inspection-only', '');
  stage.setAttribute('aria-label', `${venue.title} building model`);
  stage.setAttribute('fallback', '#tab-rig'); host.append(stage);
  let THREE;
  try { ({ THREE } = await stage.ready); }
  catch (error) { stage.destroy(); stage.remove(); throw error; }
  const model = new THREE.Group(), layers = new Map(), abort = new AbortController();
  let disposed = false;
  function dispose(object) {
    const textures = new Set(), materials = new Set(), geometries = new Set();
    object.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean)) {
        materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
      }
    });
    textures.forEach(t => { t.source?.data?.close?.(); t.dispose(); });
    materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
  }
  async function load(role) {
    const response = await fetch(venue.assets[role].url, { signal: abort.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Model layer unavailable. Check the local bundle.');
    const result = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
    if (disposed) { dispose(result.scene); throw new Error('Viewer closed'); }
    result.scene.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
    layers.set(role, result.scene); model.add(result.scene);
    return result.scene;
  }
  let cutaway;
  try {
    const room = await load('room');
    cutaway = createRoomLayers(room, venue.cutaway);
    host.dataset.roofMeshes = String(cutaway.count('roof'));
    stage.setObject(model);
  }
  catch (error) { disposed = true; abort.abort(); dispose(model); stage.destroy(); stage.remove(); throw error; }
  model.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
  const controls = document.createElement('div'); controls.className = 'pj-stage-camera';
  controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Building camera and layers');
  const status = document.createElement('p'); status.className = 'pj-venue-status'; status.setAttribute('role', 'status');
  const cameras = [[.4, 1.15, 1], [0, .18, 1], [0, 1, .001]];
  let camera = 0;
  const frame = (index = camera) => { camera = index; stage.frameObject(cameras[index], ['Room overview', 'Audience', 'Plan'][index], { fit: 'content', padding: 1.08, saveDefault: true }); };
  const button = (label, action) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = action; controls.append(b); return b; };
  ['Room overview', 'Audience', 'Plan'].forEach((label, index) => button(label, () => frame(index)));
  button('+', () => stage.zoomBy(.8)).setAttribute('aria-label', 'Zoom in');
  button('−', () => stage.zoomBy(1.25)).setAttribute('aria-label', 'Zoom out');
  button('Reset', () => frame(0));
  if (planWithRoom) button('Plan with this room', planWithRoom).className = 'pj-stage-primary';
  addRoomLayerControls(controls, cutaway, () => stage.requestRender(), false);
  for (const [role, label] of [['plot', 'Drawing'], ['scan', 'LiDAR']]) {
    if (!venue.assets[role]) continue;
    const b = button(label, async () => {
      b.disabled = true;
      try {
        let layer = layers.get(role);
        if (layer) layer.visible = !layer.visible;
        else { status.textContent = `Loading ${label}…`; layer = await load(role); }
        if (disposed) return;
        b.setAttribute('aria-pressed', String(layer.visible));
        status.textContent = role === 'plot' && layer.visible ? 'Drawing alignment is provisional. Plan markers have unknown mounting heights.' : '';
        stage.requestRender();
      } catch { if (!disposed) status.textContent = `${label} could not load. Check the local bundle and try again.`; }
      finally { b.disabled = false; }
    });
    b.dataset.venueLayer = role; b.setAttribute('aria-pressed', String(role === 'room'));
  }
  host.append(controls, status);
  stage.addEventListener('stage-camera-shortcut', event => { if (event.detail.index < cameras.length) frame(event.detail.index); });
  stage.addEventListener('stage-context-lost', () => { status.textContent = '3D graphics interrupted. The Rig controls remain available.'; host.dataset.state = 'lost'; });
  stage.addEventListener('stage-context-restored', () => { status.textContent = ''; host.dataset.state = 'ready'; });
  const resize = new ResizeObserver(() => { if (stage.clientWidth && stage.clientHeight) frame(); }); resize.observe(stage);
  window.addEventListener('pagehide', event => {
    if (!event.persisted) { disposed = true; abort.abort(); resize.disconnect(); stage.destroy(); }
  });
  frame(); host.dataset.state = 'ready';
  return { active(on) { stage.toggleAttribute('paused', !on); if (on) stage.requestRender(); } };
}
