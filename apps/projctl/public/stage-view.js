import { LANES } from './lanes.js';
import { normalizePlot, projectorForLane } from './stage-plot.js';
import { createStage3D } from './stage-3d.js';
import { createVenueView } from './venue-view.js';
import { createStagePlanner } from './stage-planner.js';

const svgNode = (name, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
};

export function createStageView(root, openControls, canAdjust) {
  const $ = (s) => root.querySelector(s);
  const canvas = $('#stage-canvas');
  let plot, view = '3d', current = { projectors: [] }, connected = false, viewer, loading3D;
  const spatial = $('#stage-3d');
  const building = $('#stage-building');
  let venue, buildingViewer, loadingBuilding, planner, plannerLoading, planning = false, proposal, approximateRoom = false;
  const roomAlignment = { x: 0, y: 0, z: .2, yaw: 0 };
  const hidden = new Set(), cards = new Map(), markers = new Map();
  const highlight = (lane) => { canvas.dataset.highlight = lane || ''; viewer?.highlight(lane); };

  function openLane(lane) {
    viewer?.select(lane);
    if (planning) { planner?.select(lane); return; }
    const p = projectorForLane(current.projectors, lane);
    if (p && connected && p.status?.online && canAdjust(p)) openControls(p.slot);
  }
  function buttonFor(lane, className) {
    const b = document.createElement('button'); b.type = 'button'; b.className = className; b.dataset.lane = lane;
    b.onclick = () => openLane(lane);
    b.onpointerenter = () => highlight(lane); b.onpointerleave = () => highlight();
    b.onfocus = () => highlight(lane); b.onblur = () => highlight();
    return b;
  }
  for (const [lane, info] of Object.entries(LANES)) {
    const b = buttonFor(lane, 'pj-stage-card');
    b.innerHTML = `<span class="pj-stage-letter">${lane}</span><span class="pj-stage-card-copy"><strong>${info.target}</strong><span class="pj-stage-device"></span><span class="pj-stage-state"></span><span class="pj-stage-note"></span></span><span aria-hidden="true">↗</span>`;
    $('#stage-projectors').append(b); cards.set(lane, b);
    const layer = document.createElement('button'); layer.type = 'button'; layer.dataset.lane = lane; layer.dataset.coverage = lane;
    layer.textContent = lane; layer.setAttribute('aria-label', `${lane} ${info.target} coverage`); layer.setAttribute('aria-pressed', 'true');
    layer.onclick = () => { hidden.has(lane) ? hidden.delete(lane) : hidden.add(lane); layer.setAttribute('aria-pressed', String(!hidden.has(lane))); updateLayers(); };
    $('.pj-stage-layers').append(layer);
  }
  function updateLayers() {
    canvas.querySelectorAll('.pj-stage-coverage').forEach((node) => { node.style.display = hidden.has(node.dataset.lane) ? 'none' : ''; });
    viewer?.layers(hidden);
  }
  async function load3D() {
    if (loading3D || !plot || root.hidden || view !== '3d') return;
    loading3D = true;
    try {
      viewer = await createStage3D(spatial, plot, lane => { cards.get(lane)?.focus({ preventScroll: true }); openLane(lane); });
      $('#stage-3d-message').hidden = true;
      updateLayers(); if (planning) viewer.planning(proposal, true); if (planning && approximateRoom) updateRoom(); viewer.active(!root.hidden && view === '3d');
    } catch (error) {
      spatial.dataset.state = 'unavailable';
      $('#stage-3d-message').textContent = error.message.includes('triangular') ? error.message : '3D could not start. Use Front or Plan above; projector controls remain available.';
    }
  }
  async function loadBuilding() {
    if (loadingBuilding || !venue || root.hidden || view !== 'building') return;
    loadingBuilding = true;
    try {
      buildingViewer = await createVenueView(building, venue, plot ? () => setPlanning(true, true) : null);
      $('#stage-building-message').hidden = true;
      buildingViewer.active(!root.hidden && view === 'building');
    } catch {
      building.dataset.state = 'unavailable';
      $('#stage-building-message').textContent = '3D could not start. The Rig controls remain available.';
      if (venue.assets.preview) {
        const preview = document.createElement('img'); preview.src = venue.assets.preview.url;
        preview.alt = `${venue.title} model preview. ${venue.notes}`;
        preview.className = 'pj-venue-preview'; building.append(preview);
      }
    }
  }
  function draw() {
    if (!plot && !venue) return;
    canvas.hidden = view === '3d' || view === 'building'; spatial.hidden = view !== '3d';
    building.hidden = view !== 'building';
    $('.pj-stage-layers').hidden = view === 'building';
    viewer?.active(!root.hidden && view === '3d');
    buildingViewer?.active(!root.hidden && view === 'building');
    $('#stage-title').textContent = view === 'building' ? venue.title : plot.title;
    const venueNote = venue?.notes?.replace(/Do not align planning beams to this building yet\.\s*/gi, '') || '';
    $('#stage-source').textContent = view === 'building' ? venueNote : plot.source;
    if (view === 'building') {
      $('#stage-caption').textContent = `Venue reference · ${venue.modelVersion} · metres`;
      if (!venue.registration?.planningOverlayAllowed) $('#stage-source').textContent = `Unregistered appearance reference. Plan with this room opens a clearly approximate overlay. ${venueNote}`;
      $('#stage-foot').textContent = venue.registration?.planningOverlayAllowed ? 'Venue reference · confirm registration before physical decisions' : 'Appearance reference · target-plane registration unverified · approximate planning preview available';
      for (const card of cards.values()) card.querySelector('.pj-stage-note').textContent = '';
      loadBuilding(); return;
    }
    $('#stage-foot').textContent = view === '3d'
      ? plot.measurements
        ? Object.values(plot.measurements.projectors).some(p => p.y === null)
          ? 'Metres · heights unknown: projectors shown in plan · enclosure offsets schematic'
          : 'Metres · dimensioned plot reference · enclosure offsets schematic'
        : 'Plot reference · diagram scale · mounting heights illustrative'
      : 'Plot reference · coverage is not live beam position';
    if (view === '3d') {
      $('#stage-caption').textContent = planning ? 'WHAT-IF · local proposal' : 'Throwline 3D';
      if (planning) $('#stage-foot').textContent = approximateRoom ? 'Approximate venue alignment · editable preview, not a clearance check' : 'Proposed optical geometry · recorded coverage retained · cove clearance not verified';
      for (const lane of Object.keys(LANES)) {
        const p = plot.measurements?.projectors[lane];
        cards.get(lane).querySelector('.pj-stage-note').textContent = p
          ? `${plot.views.plan.lanes[lane].note}. Body W/H/D: ${p.body.map(v => Math.round(v * 1000)).join(' / ')} mm. Lens height: ${p.y === null ? 'not measured' : p.y.toFixed(3) + ' m'}.`
          : plot.views.plan.lanes[lane].note;
      }
      load3D(); return;
    }
    canvas.replaceChildren(); markers.clear();
    const data = plot.views[view];
    $('#stage-caption').textContent = data.caption;
    const svg = svgNode('svg', { viewBox: '0 0 1000 600', role: 'img', 'aria-label': `${plot.title}. ${data.caption}. Colored areas are drawing reference, not live beam positions.` });
    svg.append(svgNode('line', { x1: 500, x2: 500, y1: 40, y2: 560, class: 'pj-stage-center' }));
    for (const pts of data.outline) svg.append(svgNode('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'pj-stage-outline' }));
    // Paint broad coverage first so portal boundaries remain legible.
    for (const lane of ['C', 'B', 'D', 'A']) {
      const group = svgNode('g', { 'data-lane': lane, class: 'pj-stage-coverage' });
      group.append(svgNode('polygon', { points: data.lanes[lane].coverage.map((p) => p.join(',')).join(' ') }));
      svg.append(group);
    }
    for (const label of data.labels) {
      const el = svgNode('text', { x: label.at[0], y: label.at[1], class: 'pj-stage-label', 'text-anchor': 'middle' });
      el.textContent = label.text; svg.append(el);
    }
    canvas.append(svg);
    for (const [lane, info] of Object.entries(LANES)) {
      const marker = buttonFor(lane, 'pj-stage-marker');
      marker.innerHTML = `<svg viewBox="0 0 32 24" aria-hidden="true"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M22 10l8-4v14l-8-4M7 2h10M12 2v4"/></svg><b>${lane}</b>`;
      const { projector, control } = data.lanes[lane];
      if (projector.some((value, i) => value !== control[i])) {
        svg.append(svgNode('line', { x1: projector[0], y1: projector[1], x2: control[0], y2: control[1], class: 'pj-stage-leader' }));
        svg.append(svgNode('circle', { cx: projector[0], cy: projector[1], r: 6, class: 'pj-stage-origin', 'data-lane': lane }));
      }
      marker.style.left = `${control[0] / 10}%`; marker.style.top = `${control[1] / 6}%`;
      marker.title = `${lane} · ${info.target}`;
      canvas.append(marker); markers.set(lane, marker);
      cards.get(lane).querySelector('.pj-stage-note').textContent = data.lanes[lane].note;
    }
    updateLayers(); update(current, connected);
  }
  async function updateRoom() {
    if (!viewer || !venue) return;
    try { await viewer.venue(venue, roomAlignment); if (!planning || !approximateRoom) viewer.hideVenue(); }
    catch { $('#stage-message').textContent = 'Room reference could not load. Optical planning remains available.'; $('#stage-message').hidden = false; }
  }
  $('#stage-add-room').onclick = () => setPlanning(true, true);
  root.querySelectorAll('[data-room-axis]').forEach(input => input.addEventListener('change', () => {
    const value = Number(input.value);
    if (!Number.isFinite(value) || Math.abs(value) > (input.dataset.roomAxis === 'yaw' ? 360 : 100)) return;
    roomAlignment[input.dataset.roomAxis] = value; if (planning && approximateRoom) updateRoom();
  }));
  async function setPlanning(on, withRoom = approximateRoom) {
    planning = on; approximateRoom = withRoom && !!venue;
    $('#stage-alignment').hidden = !on || !approximateRoom;
    $('#stage-add-room').hidden = !on || !venue || approximateRoom;
    root.dataset.planning = String(on);
    root.querySelectorAll('[data-stage-mode]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.stageMode === 'planning') === on)));
    $('#stage-live-reference').hidden = on; $('#stage-planner').hidden = !on;
    root.querySelectorAll('[data-stage-view]').forEach(button => { button.disabled = on && button.dataset.stageView !== '3d'; });
    if (on) {
      view = '3d'; root.querySelectorAll('[data-stage-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.stageView === '3d')));
      if (!planner && !plannerLoading && plot) {
        plannerLoading = true;
        try { planner = await createStagePlanner($('#stage-planner'), plot, (result, lane) => { proposal = result; viewer?.select(lane); if (planning) viewer?.planning(result); }, lane => {
          const p = projectorForLane(current.projectors, lane);
          if (p && connected && p.status?.online && canAdjust(p)) openControls(p.slot);
          else { $('#stage-message').textContent = 'Live controls unavailable for this projector. Use Rig to inspect connection status.'; $('#stage-message').hidden = false; }
        }); }
        catch (error) { $('#stage-planner').textContent = error.message; }
        finally { plannerLoading = false; }
      }
      planner?.refresh();
    } else { viewer?.planning(null); viewer?.hideVenue(); }
    draw(); if (on) { viewer?.planning(proposal, true); if (approximateRoom) updateRoom(); }
  }
  root.querySelectorAll('[data-stage-mode]').forEach(button => button.onclick = () => setPlanning(button.dataset.stageMode === 'planning'));
  root.querySelectorAll('[data-stage-view]').forEach((b) => {
    b.onclick = () => {
      view = b.dataset.stageView;
      root.querySelectorAll('[data-stage-view]').forEach((other) => other.setAttribute('aria-pressed', String(other === b)));
      highlight(); draw();
    };
  });
  function update(state, online) {
    current = state; connected = online;
    $('#stage-status-kind').textContent = !online ? 'Relay offline' : state.simulation ? 'Simulated status' : 'Reported status';
    for (const [lane, info] of Object.entries(LANES)) {
      const p = projectorForLane(state.projectors, lane), s = p?.status;
      const matches = state.projectors.filter((p) => p.lane === lane).length;
      const reason = !p ? matches ? 'Duplicate lane. Check Setup.' : 'Assign this lane in Setup.' : !online ? 'Relay offline' : !s?.online ? 'Projector offline' : !canAdjust(p) ? 'Adjustment controls unavailable' : null;
      const power = { on: 'Powered', off: 'Standby', cooling: 'Cooling', warming: 'Warming' }[s?.power] || 'Power unknown';
      const shutter = ['open', 'closed'].includes(s?.shutter) ? `Shutter ${s.shutter}` : 'Shutter unknown';
      const status = !p || !online || !s?.online ? reason : [power, shutter, !canAdjust(p) && 'Adjustments unavailable'].filter(Boolean).join(' · ');
      const card = cards.get(lane), marker = markers.get(lane);
      card.querySelector('.pj-stage-device').textContent = p ? `${p.model || p.make || 'Projector'} · ${info.orientation}` : 'No unique control slot';
      card.querySelector('.pj-stage-state').textContent = status;
      // Keep buttons in the keyboard order so unavailable states remain discoverable.
      for (const b of [card, marker].filter(Boolean)) {
        b.setAttribute('aria-disabled', String(!!reason));
        b.setAttribute('aria-label', `${lane} ${info.target}. ${status}${reason ? '' : '. Open controls'}`);
        b.dataset.slot = p?.slot || '';
      }
    }
  }
  async function load() {
    const [plotResult, venueResult] = await Promise.allSettled([
      fetch('/api/stage-plot', { signal: AbortSignal.timeout(10000) }).then(async response => {
        if (!response.ok) throw new Error('The local plot could not be loaded. Check the relay and reload.');
        const data = await response.json(); return data.plot ? normalizePlot(data.plot) : null;
      }),
      fetch('/api/venue-model', { signal: AbortSignal.timeout(10000) }).then(async response => {
        if (!response.ok) throw new Error('The building bundle could not be loaded. Check the relay and reload.');
        return (await response.json()).venue;
      }),
    ]);
    try {
      plot = plotResult.status === 'fulfilled' ? plotResult.value : null;
      venue = venueResult.status === 'fulfilled' ? venueResult.value : null;
      if (!plot && !venue) throw new Error(plotResult.reason?.message || venueResult.reason?.message || 'No stage plot loaded. Add a stage plot or building bundle beside the relay’s rig file, then reload.');
      if (venue) view = 'building';
      root.querySelector('[data-stage-mode="planning"]').disabled = !plot;
      root.querySelectorAll('[data-stage-view]').forEach(b => {
        if (b.dataset.stageView === 'building') b.textContent = 'Venue reference';
        b.hidden = b.dataset.stageView === 'building' ? !venue : !plot;
        b.setAttribute('aria-pressed', String(b.dataset.stageView === view));
      });
      $('#stage-message').hidden = true; $('#stage-workspace').hidden = false; draw();
      const warning = plotResult.reason?.message || venueResult.reason?.message;
      if (warning) { $('#stage-message').textContent = warning; $('#stage-message').hidden = false; }
    } catch (error) { $('#stage-message').textContent = error.message; }
  }
  load();
  const visibility = new MutationObserver(() => {
    viewer?.active(!root.hidden && view === '3d'); buildingViewer?.active(!root.hidden && view === 'building');
    load3D(); loadBuilding();
  });
  visibility.observe(root, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('pagehide', event => { if (!event.persisted) visibility.disconnect(); });
  return { update };
}
