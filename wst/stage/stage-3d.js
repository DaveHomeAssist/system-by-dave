import { stageReference } from './stage-reference.js';
import { LANES } from './lanes.js';
import { createRoomLayers, addRoomLayerControls, screenLaneLabel } from './stage-visibility.js';

const COLORS = { A: '#ff00ff', B: '#00ffff', C: '#fbf302', D: '#00ab00' };
const CAMERAS = [
  { name: 'Coverage', direction: [0, .03, 1] },
  { name: 'Plan', direction: [0, 1, .001] },
  { name: 'Selected side' },
  { name: 'Projectors' },
  { name: 'Stage', direction: [.12, .15, 1] },
  { name: 'Room & beams' },
];
const STAGE_CAMERA = 4;

export async function createStage3D(host, plot, openLane, options = {}) {
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
  let room, roomLayers, roomLoading, roomControls;
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
    // Decorative x-ray edges must not expand the model's click target via the
    // raycaster's line tolerance or steal clicks from another lane's label.
    silhouette.raycast = () => {};
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
    const leader = line([data.projector, label.position.toArray()], color, .8); model.add(leader); leaders.set(lane, leader);label.userData.leader=leader;label.userData.lane=lane;label.userData.origin=[...data.projector];label.userData.labelGroup=labels;leader.onBeforeRender=(renderer,scene,camera)=>label.onBeforeRender(renderer,scene,camera);
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
  const defaultCamera = options.initialCamera === 'overview' ? 5 : STAGE_CAMERA;
  let camera = defaultCamera, selectedLane = 'D', framedSideLane = 'D', currentProposal = null;
  const hiddenLanes = new Set();
  const viewVisibility = () => {
    roomLayers?.cutawayForCamera(camera === 0 || camera === STAGE_CAMERA ? ['seats'] : []); roomControls?.sync(); host.dataset.coverageSeatMeshes = String(roomLayers?.count('seats') || 0);
    proposal.visible = camera !== 2 || currentProposal?.lane === framedSideLane;
    for (const [lane, group] of groups) group.visible = !hiddenLanes.has(lane) && (camera !== 2 || lane === framedSideLane);
    labels.forEach((label,lane) => { label.visible = camera === 3 || camera === 5 || camera === STAGE_CAMERA || (camera === 2 && lane === framedSideLane); label.userData.screenPixels = camera === 3 || camera === 5 ? 44 : 30; label.userData.declutter = !!options.declutterLabels && [3, STAGE_CAMERA, 5].includes(camera); leaders.get(lane).visible = label.visible; });
    projectorGroups.forEach(object => { object.visible = camera !== 0 && object.userData.lane !== currentProposal?.lane && (camera !== 2 || object.userData.lane === framedSideLane); });
  };
  const frame = (index = camera) => {
    camera = index;
    if(index===5){
      const points=[],origins=[],ends=[];for(const[lane,data]of Object.entries(reference.lanes)){const proposed=currentProposal?.lane===lane?currentProposal:null,origin=proposed?.projector||data.projector,corners=proposed?.corners||data.coverage;points.push(new THREE.Vector3(...origin),...corners.map(p=>new THREE.Vector3(...p)));origins.push(new THREE.Vector3(...origin));ends.push(...corners.map(p=>new THREE.Vector3(...p)));}
      const mean=values=>values.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/values.length),forward=mean(ends).sub(mean(origins));forward.y=0;forward.normalize();const side=new THREE.Vector3(forward.z,0,-forward.x);const direction=side.multiplyScalar(.85).addScaledVector(forward,-.35);direction.y=.2;stage.frameObject(direction.toArray(),'Room & beams',{points,fit:'content',padding:1.22,saveDefault:true});
    }else if (index === 3) {
      const bounds = new THREE.Box3(); model.updateMatrixWorld(true);
      projectorGroups.filter(object => object.userData.lane !== currentProposal?.lane).forEach(object => bounds.union(new THREE.Box3().setFromObject(object)));
      labels.forEach(label => bounds.expandByPoint(label.position));
      if (proposal.children.length) bounds.expandByPoint(proposal.children.at(-1).position);
      bounds.expandByScalar(.25);
      stage.frameObject([.15, .28, -1], 'Projectors', { bounds, padding: 1.3, saveDefault: true });
    } else {
      const bounds = new THREE.Box3(), points = [];
      let direction = CAMERAS[index].direction, name = CAMERAS[index].name;
      const include = values => values.forEach(point => { const vector = new THREE.Vector3(...point); bounds.expandByPoint(vector); points.push(vector); });
      if (index === 2) {
        const data = reference.lanes[selectedLane], proposed = currentProposal?.lane === selectedLane ? currentProposal : null;
        include([proposed?.projector || data.projector, ...(proposed?.corners || data.coverage)]);
        const corners = proposed?.corners || data.coverage;
        const center = corners.reduce((sum,p) => sum.map((v,i) => v + p[i]/corners.length), [0,0,0]);
        const beam = new THREE.Vector3(...center).sub(new THREE.Vector3(...(proposed?.projector || data.projector)));
        direction = new THREE.Vector3(-beam.z, 0, beam.x).normalize().toArray(); framedSideLane = selectedLane; name = `${selectedLane} side`;
      } else {
        for (const [lane, data] of Object.entries(reference.lanes)) {
          const proposed = currentProposal?.lane === lane ? currentProposal : null;
          include(proposed?.corners || data.coverage);
          if (index === 1 || index === STAGE_CAMERA) include([proposed?.projector || data.projector]);
        }
        // Frame the complete beams from the house side, keeping their labels
        // inside the view without fitting the unrelated auditorium geometry.
        if (index === STAGE_CAMERA) labels.forEach(label => include([label.position.toArray()]));
      }
      bounds.expandByScalar(.25); stage.frameObject(direction, name, { points, fit: 'content', padding: 1.12, saveDefault: true });
    }
    viewVisibility();
    host.dataset.cameraPreset = index === 5 ? 'Room & beams' : index === 3 ? 'Projectors' : index === 2 ? `${selectedLane} side` : CAMERAS[index].name;
    controls?.querySelectorAll('[data-camera]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.camera) === index)));
  };
  const controls = document.createElement('div'); controls.className = 'pj-stage-camera'; controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', '3D camera');
  for (const index of [STAGE_CAMERA, ...(options.showOverview ? [5] : []), 3, 0, 1, 2]) {
    const c = CAMERAS[index];
    const button = document.createElement('button'); button.type = 'button'; button.textContent = c.label || c.name; button.title = c.name; button.dataset.camera = String(index);
    button.onclick = () => frame(index); controls.append(button);
  }
  for (const [name, action] of [['Zoom in', () => stage.zoomBy(.8)], ['Zoom out', () => stage.zoomBy(1.25)], ['Reset view', () => frame(camera)]]) {
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
    async venue(venue, alignment) {
      if (!room && !roomLoading) {
        roomLoading = true;
        try {
          const { GLTFLoader } = await import('/ProjectorThrow/vendor/three/addons/loaders/GLTFLoader.js');
          const response = await fetch(venue.assets.room.url, { cache: 'no-store' });
          if (!response.ok) throw new Error('Room reference could not load.');
          room = (await new GLTFLoader().parseAsync(await response.arrayBuffer(), '')).scene;
          room.name = 'Approximate venue reference'; room.traverse(object => { object.castShadow = false; object.receiveShadow = false; for (const material of [object.material].flat().filter(Boolean)) { material.transparent = true; material.opacity = .22; material.depthWrite = false; } });
          roomLayers = createRoomLayers(room, venue.cutaway, options.roomLayers); host.dataset.roofMeshes = String(roomLayers.count('roof'));
          roomControls = addRoomLayerControls(controls, roomLayers, () => stage.requestRender());
          roomLayers.cutawayForCamera(camera === 0 || camera === STAGE_CAMERA ? ['seats'] : []); roomControls.sync();
          model.add(room);
        } finally { roomLoading = false; }
      }
      if (room) { roomControls.visible(true); room.visible = roomLayers.visible; room.position.set(alignment.x, alignment.y, alignment.z); room.rotation.y = alignment.yaw * Math.PI / 180; }
      stage.requestRender();
    },
    hideVenue() { if (room) room.visible = false; roomControls?.visible(false); stage.requestRender(); },
    focusStage() { frame(STAGE_CAMERA); },
    select(lane) { if (reference.lanes[lane]) selectedLane = lane; },
    planning(result, reframe = false) {
      currentProposal = result; if (result) selectedLane = result.lane;
      projectorGroups.forEach(object => { object.visible = true; });
      labels.forEach((label, lane) => {
        label.position.fromArray(label.userData.referencePosition);label.userData.origin=[...reference.lanes[lane].projector];
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
        const label = labels.get(result.lane);label.userData.origin=[...result.projector]; label.position.set(result.projector[0], result.projector[1] + labelLift(result.lane), result.projector[2]);
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
      if (reframe && result) frame(STAGE_CAMERA);
      viewVisibility(); stage.requestRender();
    },
    layers(hidden) { hiddenLanes.clear(); hidden.forEach(lane => hiddenLanes.add(lane)); viewVisibility(); stage.requestRender(); },
    highlight(lane) { for (const [key, group] of groups) group.traverse(o => { if (o.material) { o.material.opacity = o.material.userData.baseOpacity ?? o.material.opacity; o.material.userData.baseOpacity = o.material.opacity; if (lane && lane !== key) o.material.opacity *= .15; } }); stage.requestRender(); },
    active(on) { stage.toggleAttribute('paused', !on); if (on) stage.requestRender(); },
  };
}
