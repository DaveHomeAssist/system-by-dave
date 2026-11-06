import { stageReference } from './stage-reference.js';
import { LANES } from './lanes.js';
import { roofCutaway, screenLaneLabel } from './stage-visibility.js';

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
  const targets = [], projectorGroups = [], labels = new Map(), leaders = new Map();
  const labelLift = lane => ['A', 'C'].includes(lane) ? 1.35 : .3;
  let room, roomCutaway, roomLoading, roofVisible = false;
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
    const silhouette = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color, depthTest: false }));
    silhouette.position.copy(body.position); silhouette.renderOrder = 15; silhouette.name = `${lane} physical enclosure outline`; projector.add(silhouette);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), new THREE.MeshBasicMaterial({ color }));
    lens.name = `${lane} lens datum`; projector.add(lens);
    const target = data.coverage.reduce((out, p) => out.map((v, i) => v + p[i] / data.coverage.length), [0, 0, 0]);
    // Aim in plan only. Lens shift does not imply physical chassis pitch.
    projector.rotation.y = data.yaw === null
      ? Math.atan2(data.projector[0] - target[0], data.projector[2] - target[2]) : data.yaw * Math.PI / 180;
    model.add(projector); projectorGroups.push(projector);
    const label = screenLaneLabel(THREE, lane, color, [data.projector[0], data.projector[1] + labelLift(lane), data.projector[2]]);
    model.add(label); labels.set(lane, label);
    label.userData.referencePosition = label.position.toArray();
    const leader = line([data.projector, label.position.toArray()], color, .8); model.add(leader); leaders.set(lane, leader);
    targets.push({ id: lane, label: `${lane} ${LANES[lane].target}`, objects: [projector, label] });
  }
  const proposal = new THREE.Group(); proposal.name = 'Local what-if proposal'; model.add(proposal);
  stage.setObject(model);
  // Reference faces must remain translucent and never cast artificial beam shadows.
  model.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  stage.setActivationTargets(targets, { context: 'projctl.stage.v1' });
  stage.addEventListener('stage-object-activate', event => {
    const detail = event.detail;
    if (detail?.version === 1 && detail.context === 'projctl.stage.v1' && Object.hasOwn(LANES, detail.id)) openLane(detail.id);
  });
  const defaultCamera = 3;
  let camera = defaultCamera;
  const frame = (index = camera) => {
    camera = index;
    if (index === 3) {
      const bounds = new THREE.Box3(); model.updateMatrixWorld(true);
      projectorGroups.filter(object => object.visible).forEach(object => bounds.union(new THREE.Box3().setFromObject(object)));
      labels.forEach(label => bounds.expandByPoint(label.position));
      if (proposal.children.length) bounds.expandByPoint(proposal.children.at(-1).position);
      bounds.expandByScalar(.25);
      stage.frameObject([.15, .28, -1], 'Projectors', { bounds, padding: 1.3, saveDefault: true });
    } else { const c = CAMERAS[index]; stage.frameObject(c.direction, c.name, { fit: 'content', padding: 1.08, saveDefault: true }); }
    controls?.querySelectorAll('[data-camera]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.camera) === index)));
  };
  const controls = document.createElement('div'); controls.className = 'pj-stage-camera'; controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', '3D camera');
  const focusButton = document.createElement('button'); focusButton.type = 'button'; focusButton.textContent = 'Projectors'; focusButton.dataset.camera = '3'; focusButton.onclick = () => frame(3); controls.append(focusButton);
  for (const [index, c] of CAMERAS.entries()) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = c.label || c.name; button.title = c.name; button.dataset.camera = String(index);
    button.onclick = () => frame(index); controls.append(button);
  }
  for (const [name, action] of [['Zoom in', () => stage.zoomBy(.8)], ['Zoom out', () => stage.zoomBy(1.25)], ['Reset', () => frame(defaultCamera)]]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = name === 'Zoom in' ? '+' : name === 'Zoom out' ? '−' : name; button.setAttribute('aria-label', name); button.onclick = action; controls.append(button);
  }
  const roofButton = document.createElement('button'); roofButton.type = 'button'; roofButton.textContent = 'Roof'; roofButton.hidden = true;
  roofButton.onclick = () => { roofVisible = !roofVisible; roomCutaway?.set(roofVisible); roofButton.setAttribute('aria-pressed', String(roofVisible)); roofButton.title = roofVisible ? 'Hide roof for interior view' : 'Show roof'; stage.requestRender(); };
  controls.append(roofButton); host.append(controls);
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
    async venue(venue, alignment) {
      if (!room && !roomLoading) {
        roomLoading = true;
        try {
          const { GLTFLoader } = await import('/ProjectorThrow/vendor/three/addons/loaders/GLTFLoader.js');
          const response = await fetch(venue.assets.room.url, { cache: 'no-store' });
          if (!response.ok) throw new Error('Room reference could not load.');
          room = (await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')).scene;
          room.name = 'Approximate venue reference'; room.traverse(object => { object.castShadow = false; object.receiveShadow = false; });
          roomCutaway = roofCutaway(room, venue.cutaway); roomCutaway.set(roofVisible);
          model.add(room); roofButton.hidden = !roomCutaway.count; roofButton.setAttribute('aria-pressed', String(roofVisible)); roofButton.title = 'Show roof';
        } finally { roomLoading = false; }
      }
      if (room) { roofButton.hidden = !roomCutaway?.count; room.visible = true; room.position.set(alignment.x, alignment.y, alignment.z); room.rotation.y = alignment.yaw * Math.PI / 180; }
      frame(3); stage.requestRender();
    },
    hideVenue() { if (room) room.visible = false; roofButton.hidden = true; stage.requestRender(); },
    focusProjectors() { frame(3); },
    planning(result, reframe = false) {
      projectorGroups.forEach(object => { object.visible = true; });
      labels.forEach((label, lane) => {
        label.position.fromArray(label.userData.referencePosition);
        leaders.get(lane).geometry.dispose();
        leaders.get(lane).geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...reference.lanes[lane].projector), label.position]);
      });
      for (const child of [...proposal.children]) {
        child.traverse(object => { object.geometry?.dispose(); for (const material of [object.material].flat().filter(Boolean)) material.dispose(); });
        proposal.remove(child);
      }
      host.dataset.planningLane = result?.lane || '';
      if (result) {
        const color = COLORS[result.lane];
        projectorGroups.find(object => object.userData.lane === result.lane).visible = false;
        const label = labels.get(result.lane); label.position.set(result.projector[0], result.projector[1] + labelLift(result.lane), result.projector[2]);
        leaders.get(result.lane).geometry.dispose();
        leaders.get(result.lane).geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...result.projector), label.position]);
        const face = polygon(result.corners, color, .4); face.renderOrder = 6; proposal.add(face);
        const outline = line([...result.corners, result.corners[0]], color); outline.renderOrder = 7; proposal.add(outline);
        const content = line([...result.content, result.content[0]], '#ffffff'); content.material.depthTest = false; content.renderOrder = 8; proposal.add(content);
        for (const corner of result.corners) proposal.add(line([result.projector, corner], color, .65));
        const marker = box(result.body, result.projector.map((v, i) => v + result.normal[i] * result.body[2] / 2), color);
        marker.rotation.y = Math.atan2(result.normal[0], result.normal[2]);
        marker.material.wireframe = true; marker.material.depthTest = false; marker.renderOrder = 15; marker.name = 'Proposed lens position and schematic enclosure'; proposal.add(marker);
        const datum = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshBasicMaterial({ color }));
        datum.position.set(...result.projector); proposal.add(datum);
      }
      if (reframe && result) frame(3);
      stage.requestRender();
    },
    layers(hidden) { for (const [lane, group] of groups) group.visible = !hidden.has(lane); stage.requestRender(); },
    highlight(lane) { for (const [key, group] of groups) group.traverse(o => { if (o.material) { o.material.opacity = o.material.userData.baseOpacity ?? o.material.opacity; o.material.userData.baseOpacity = o.material.opacity; if (lane && lane !== key) o.material.opacity *= .15; } }); stage.requestRender(); },
    active(on) { stage.toggleAttribute('paused', !on); if (on) stage.requestRender(); },
  };
}
