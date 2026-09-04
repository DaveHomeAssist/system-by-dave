(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ThrowlineSceneState = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';

  const SCHEMA_VERSION = 1;
  const STORAGE_KEY = 'throwline:stage-scene:v1';
  const MODES = new Set(['manual', 'verified_image_width', 'field_verified', 'manufacturer_unspecified', 'conflicting', 'partial', 'legacy_unverified', 'blocked']);
  const finite = value => Number.isFinite(Number(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const stepped = (value, step) => Math.round(Number(value) / step) * step;
  const copy = value => JSON.parse(JSON.stringify(value));
  const cleanId = (value, fallback) => String(value || fallback).replace(/[^a-z0-9_-]/gi, '-').slice(0, 64);
  const nextId = (items, prefix) => { let index = items.length + 1; while (items.some(item => item.id === `${prefix}-${index}`)) index += 1; return `${prefix}-${index}`; };
  function uniqueIds(items, prefix) {
    const seen = new Set();
    items.forEach((item, index) => {
      let id = item.id || `${prefix}-${index + 1}`;
      let suffix = index + 1;
      while (seen.has(id)) { id = `${prefix}-${suffix}`; suffix += 1; }
      item.id = id; seen.add(id);
    });
    return items;
  }

  function normalizeProvenance(input = {}) {
    const mode = MODES.has(input.mode) ? input.mode : 'blocked';
    const definitions = {
      manual: ['MANUAL ESTIMATE', 'Operator-supplied ratio; compatibility and source remain unverified.', 'warn'],
      verified_image_width: ['MANUFACTURER VERIFIED', 'Exact calculation-eligible image-width profile.', 'go'],
      field_verified: ['FIELD VERIFIED', 'Job-scoped measured ratio. This does not promote the catalog globally.', 'go'],
      manufacturer_unspecified: ['CALCULATION BLOCKED', 'Manufacturer basis is not specified.', 'bad'],
      conflicting: ['CALCULATION BLOCKED', 'Source evidence conflicts.', 'bad'],
      partial: ['CALCULATION BLOCKED', 'The optical profile is incomplete.', 'bad'],
      legacy_unverified: ['CALCULATION BLOCKED', 'Legacy reference data is not calculation eligible.', 'bad'],
      blocked: ['CALCULATION BLOCKED', 'No trusted calculation input is available.', 'bad']
    };
    const [label, fallbackReason, tone] = definitions[mode];
    const verification = input.verification && typeof input.verification === 'object' ? {
      ratio: finite(input.verification.ratio) ? Number(input.verification.ratio) : undefined,
      measuredDistance: finite(input.verification.measuredDistance) ? Number(input.verification.measuredDistance) : undefined,
      measuredWidth: finite(input.verification.measuredWidth) ? Number(input.verification.measuredWidth) : undefined,
      verifiedBy: String(input.verification.verifiedBy || '').slice(0, 120),
      verifiedAt: String(input.verification.verifiedAt || '').slice(0, 80),
      note: String(input.verification.note || '').slice(0, 500)
    } : undefined;
    return { mode, label, reason: String(input.reason || fallbackReason).slice(0, 500), tone, verification };
  }

  function normalizeProjector(input = {}, index = 0) {
    const position = input.position || {};
    const optical = input.optical || {};
    const min = finite(optical.min) ? clamp(optical.min, 0.05, 20) : NaN;
    const max = finite(optical.max) ? clamp(optical.max, min || 0.05, 20) : NaN;
    const provenance = normalizeProvenance(input.provenance || { mode: optical.mode });
    const allowed = input.allowed === true && finite(min) && finite(max) && max >= min && ['manual', 'verified_image_width', 'field_verified'].includes(provenance.mode);
    return {
      id: cleanId(input.id, `projector-${index + 1}`),
      label: String(input.label || `Unit ${String.fromCharCode(65 + index)}`).slice(0, 80),
      position: {
        x: finite(position.x) ? clamp(position.x, -100, 100) : index * 2,
        distance: finite(position.distance) ? clamp(position.distance, 1, 300) : 22,
        lensHeight: finite(position.lensHeight) ? clamp(position.lensHeight, 0, 100) : 6,
        targetX: finite(position.targetX) ? clamp(position.targetX, -100, 100) : 0
      },
      optical: {
        min,
        max,
        basisWidth: finite(optical.basisWidth) ? clamp(optical.basisWidth, 1, 300) : 20,
        rasterAspect: finite(optical.rasterAspect) ? clamp(optical.rasterAspect, 0.2, 10) : 1.7778,
        shift: optical.shift && typeof optical.shift === 'object' ? {
          up: finite(optical.shift.up) ? clamp(optical.shift.up, 0, 500) : undefined,
          down: finite(optical.shift.down) ? clamp(optical.shift.down, 0, 500) : undefined,
          left: finite(optical.shift.left) ? clamp(optical.shift.left, 0, 500) : undefined,
          right: finite(optical.shift.right) ? clamp(optical.shift.right, 0, 500) : undefined
        } : undefined
      },
      allowed,
      provenance
    };
  }

  function normalizeObstacle(input = {}, index = 0) {
    const position = input.position || {};
    const size = input.size || {};
    return {
      id: cleanId(input.id, `obstacle-${index + 1}`),
      label: String(input.label || `Obstruction ${index + 1}`).slice(0, 80),
      position: {
        x: finite(position.x) ? clamp(position.x, -100, 100) : 0,
        y: finite(position.y) ? clamp(position.y, 0, 100) : 3,
        z: finite(position.z) ? clamp(position.z, 0, 300) : 10
      },
      size: {
        width: finite(size.width) ? clamp(size.width, 0.1, 100) : 2,
        height: finite(size.height) ? clamp(size.height, 0.1, 100) : 6,
        depth: finite(size.depth) ? clamp(size.depth, 0.1, 100) : 2
      }
    };
  }

  function normalizeSceneState(input = {}) {
    const screen = input.screen || {};
    const room = input.room || {};
    const projectors = uniqueIds((Array.isArray(input.projectors) && input.projectors.length ? input.projectors : [{}]).slice(0, 8).map(normalizeProjector), 'projector');
    const obstacles = uniqueIds((Array.isArray(input.obstacles) ? input.obstacles : []).slice(0, 24).map(normalizeObstacle), 'obstacle');
    const requestedActive = cleanId(input.activeProjectorId, projectors[0].id);
    return {
      schemaVersion: SCHEMA_VERSION,
      screen: {
        width: finite(screen.width) ? clamp(screen.width, 2, 200) : 20,
        aspect: finite(screen.aspect) ? clamp(screen.aspect, 0.2, 10) : 1.7778,
        bottom: finite(screen.bottom) ? clamp(screen.bottom, 0, 100) : 4
      },
      room: {
        width: finite(room.width) ? clamp(room.width, 8, 400) : 40,
        depth: finite(room.depth) ? clamp(room.depth, 8, 600) : 40,
        height: finite(room.height) ? clamp(room.height, 8, 150) : 20
      },
      projectors,
      activeProjectorId: projectors.some(projector => projector.id === requestedActive) ? requestedActive : projectors[0].id,
      obstacles,
      activeObstacleId: obstacles.some(obstacle => obstacle.id === input.activeObstacleId) ? cleanId(input.activeObstacleId, '') : obstacles[0]?.id,
      layoutMode: ['independent', 'stack', 'blend'].includes(input.layoutMode) ? input.layoutMode : 'independent',
      overlays: {
        beam: input.overlays?.beam !== false,
        room: input.overlays?.room !== false,
        grid: input.overlays?.grid !== false,
        envelope: input.overlays?.envelope !== false,
        shift: input.overlays?.shift !== false,
        dimensions: input.overlays?.dimensions !== false
      },
      view: { camera: ['three', 'side', 'front', 'top', 'op'].includes(input.view?.camera) ? input.view.camera : 'three' },
      updatedAt: String(input.updatedAt || new Date().toISOString())
    };
  }

  function createSceneState(transfer = {}) {
    const mode = MODES.has(transfer.mode) ? transfer.mode : 'manual';
    return normalizeSceneState({
      screen: { width: transfer.w, aspect: transfer.ar, bottom: transfer.bottom },
      room: transfer.room,
      projectors: [{
        id: 'projector-a',
        label: transfer.label || 'Unit A',
        position: { x: transfer.x, distance: transfer.dist, lensHeight: transfer.lh, targetX: transfer.targetX },
        optical: { min: transfer.wide, max: transfer.tele, basisWidth: transfer.basisW, rasterAspect: transfer.rasterAr, shift: transfer.shift, mode },
        allowed: transfer.allowed,
        provenance: { mode, reason: transfer.reason, verification: transfer.verification }
      }]
    });
  }

  function activeProjector(scene) {
    return scene.projectors.find(projector => projector.id === scene.activeProjectorId) || scene.projectors[0];
  }

  function obstacleIntersectsBeam(obstacle, scene, projector, image) {
    const distance = projector.position.distance;
    if (!finite(distance) || distance <= 0) return false;
    const nearZ = obstacle.position.z - obstacle.size.depth / 2;
    const farZ = obstacle.position.z + obstacle.size.depth / 2;
    if (farZ < 0 || nearZ > distance) return false;
    const z = clamp(obstacle.position.z, 0, distance);
    const progress = 1 - z / distance;
    const screenHeight = scene.screen.width / scene.screen.aspect;
    const screenCenterY = scene.screen.bottom + screenHeight / 2;
    const beamCenterX = projector.position.x * (z / distance) + projector.position.targetX * progress;
    const beamCenterY = projector.position.lensHeight + (screenCenterY - projector.position.lensHeight) * progress;
    return Math.abs(obstacle.position.x - beamCenterX) <= image.width * progress / 2 + obstacle.size.width / 2 &&
      Math.abs(obstacle.position.y - beamCenterY) <= image.height * progress / 2 + obstacle.size.height / 2;
  }

  function calculateProjectorGeometry(input, projectorId) {
    const scene = normalizeSceneState(input);
    const projector = scene.projectors.find(item => item.id === projectorId) || activeProjector(scene);
    const screenHeight = scene.screen.width / scene.screen.aspect;
    const optical = projector.optical;
    const allowed = projector.allowed && finite(optical.min) && finite(optical.max);
    const base = {
      projectorId: projector.id,
      screen: { width: scene.screen.width, height: screenHeight, bottom: scene.screen.bottom, centerY: scene.screen.bottom + screenHeight / 2 },
      provenance: projector.provenance,
      allowed
    };
    if (!allowed) return { ...base, placement: { kind: 'blocked', label: 'CALCULATION BLOCKED', tone: 'bad' }, reason: projector.provenance.reason, envelope: undefined, image: undefined, collisions: [] };

    const wideDistance = optical.min * optical.basisWidth;
    const teleDistance = optical.max * optical.basisWidth;
    const safeLow = wideDistance * 1.05;
    const safeHigh = teleDistance * 0.95;
    const distance = projector.position.distance;
    const requiredRatio = distance / optical.basisWidth;
    const currentRatio = clamp(requiredRatio, optical.min, optical.max);
    const imageWidth = distance / currentRatio;
    const imageHeight = imageWidth / optical.rasterAspect;
    let kind = 'near-limit'; let rawLabel = 'PASS · NEAR LIMIT'; let tone = 'warn';
    if (distance > teleDistance + 0.01) { kind = 'overshoot'; rawLabel = 'OVERSHOOT'; tone = 'bad'; }
    else if (distance < wideDistance - 0.01) { kind = 'undershoot'; rawLabel = 'UNDERSHOOT'; tone = 'bad'; }
    else if (distance >= safeLow && distance <= safeHigh) { kind = 'safe'; rawLabel = 'PASS · SAFE'; tone = 'go'; }
    const label = projector.provenance.mode === 'manual' && kind === 'safe' ? 'FITS SUPPLIED RANGE' : projector.provenance.mode === 'manual' && kind === 'near-limit' ? 'FITS · NEAR LIMIT' : rawLabel;
    const image = { width: imageWidth, height: imageHeight, centerX: projector.position.targetX, requiredRatio, currentRatio, shiftPercent: ((base.screen.centerY - projector.position.lensHeight) / imageHeight) * 100 };
    const collisions = scene.obstacles.filter(obstacle => obstacleIntersectsBeam(obstacle, scene, projector, image)).map(obstacle => ({ obstacleId: obstacle.id, label: obstacle.label, kind: 'beam-obstruction' }));
    return { ...base, placement: { kind, label, tone }, reason: collisions.length ? `${collisions.length} obstruction${collisions.length === 1 ? '' : 's'} intersect the beam.` : '', envelope: { wideDistance, teleDistance, safeLow, safeHigh }, image, shiftEnvelope: optical.shift, collisions };
  }

  function invalidateFieldVerification(projector) {
    if (projector.provenance.mode !== 'field_verified') return projector;
    return { ...projector, provenance: normalizeProvenance({ mode: 'manual', reason: 'MANUAL ESTIMATE · a driving value changed after field verification.' }) };
  }

  function applyIntent(input, intent = {}) {
    const scene = normalizeSceneState(input);
    const type = String(intent.type || '');
    const index = scene.projectors.findIndex(projector => projector.id === (intent.projectorId || scene.activeProjectorId));
    const projector = scene.projectors[index >= 0 ? index : 0];
    const updateProjector = next => { scene.projectors[index >= 0 ? index : 0] = invalidateFieldVerification(next); };
    if (type === 'set-distance') updateProjector({ ...projector, position: { ...projector.position, distance: clamp(stepped(intent.value, 0.25), 1, 300) } });
    else if (type === 'set-lens-height') updateProjector({ ...projector, position: { ...projector.position, lensHeight: clamp(stepped(intent.value, 0.25), 0, 100) } });
    else if (type === 'set-projector-x') { updateProjector({ ...projector, position: { ...projector.position, x: clamp(stepped(intent.value, 0.25), -100, 100) } }); scene.layoutMode = 'independent'; }
    else if (type === 'set-projector-target-x') { updateProjector({ ...projector, position: { ...projector.position, targetX: clamp(stepped(intent.value, 0.25), -100, 100) } }); scene.layoutMode = 'independent'; }
    else if (type === 'set-screen-width') {
      const previousWidth = scene.screen.width;
      scene.screen.width = clamp(stepped(intent.value, 0.5), 2, 200);
      scene.projectors = scene.projectors.map(item => {
        const next = invalidateFieldVerification(item);
        if (next.provenance.mode === 'manual') next.optical.basisWidth = scene.screen.width * (item.optical.basisWidth / previousWidth);
        return next;
      });
    }
    else if (type === 'set-screen-bottom') { scene.screen.bottom = clamp(stepped(intent.value, 0.25), 0, 100); scene.projectors = scene.projectors.map(invalidateFieldVerification); }
    else if (type === 'set-screen-aspect') { scene.screen.aspect = clamp(Number(intent.value), 0.2, 10); scene.projectors = scene.projectors.map(invalidateFieldVerification); }
    else if (type === 'set-optical-range' && finite(intent.min) && Number(intent.min) > 0 && finite(intent.max) && Number(intent.max) >= Number(intent.min)) updateProjector({ ...projector, allowed: true, optical: { ...projector.optical, min: Number(intent.min), max: Number(intent.max) }, provenance: normalizeProvenance({ mode: 'manual', reason: 'MANUAL ESTIMATE · operator-supplied ratio range.' }) });
    else if (type === 'set-room') { const key = ['width', 'depth', 'height'].includes(intent.key) ? intent.key : 'depth'; scene.room[key] = clamp(stepped(intent.value, 0.5), 8, key === 'depth' ? 600 : 400); }
    else if (type === 'select-projector' && scene.projectors.some(item => item.id === intent.projectorId)) scene.activeProjectorId = intent.projectorId;
    else if (type === 'add-projector' && scene.projectors.length < 8) { const source = copy(projector); const nextIndex = scene.projectors.length; source.id = nextId(scene.projectors, 'projector'); source.label = `Unit ${String.fromCharCode(65 + nextIndex)}`; source.position.x = clamp(projector.position.x + 2, -100, 100); source.provenance = normalizeProvenance({ mode: projector.provenance.mode === 'field_verified' ? 'manual' : projector.provenance.mode, reason: projector.provenance.mode === 'field_verified' ? 'MANUAL ESTIMATE · duplicated from a field-verified unit.' : projector.provenance.reason }); scene.projectors.push(normalizeProjector(source, nextIndex)); scene.activeProjectorId = source.id; scene.layoutMode = 'independent'; }
    else if (type === 'remove-projector' && scene.projectors.length > 1) { scene.projectors = scene.projectors.filter(item => item.id !== projector.id); scene.activeProjectorId = scene.projectors[0].id; }
    else if (type === 'add-obstacle' && scene.obstacles.length < 24) { const obstacle = normalizeObstacle({ id: nextId(scene.obstacles, 'obstacle'), label: `Obstruction ${scene.obstacles.length + 1}`, position: { x: projector.position.x, y: Math.max(3, scene.screen.bottom), z: projector.position.distance / 2 } }, scene.obstacles.length); scene.obstacles.push(obstacle); scene.activeObstacleId = obstacle.id; }
    else if (type === 'select-obstacle' && scene.obstacles.some(item => item.id === intent.obstacleId)) scene.activeObstacleId = intent.obstacleId;
    else if (type === 'set-obstacle') { const obstacleIndex = scene.obstacles.findIndex(item => item.id === (intent.obstacleId || scene.activeObstacleId)); if (obstacleIndex >= 0) { const obstacle = scene.obstacles[obstacleIndex]; if (['x', 'y', 'z'].includes(intent.key)) obstacle.position[intent.key] = stepped(intent.value, 0.25); else if (['width', 'height', 'depth'].includes(intent.key)) obstacle.size[intent.key] = Math.max(0.1, stepped(intent.value, 0.25)); scene.obstacles[obstacleIndex] = normalizeObstacle(obstacle, obstacleIndex); } }
    else if (type === 'remove-obstacle' && intent.obstacleId) { scene.obstacles = scene.obstacles.filter(item => item.id !== intent.obstacleId); scene.activeObstacleId = scene.obstacles[0]?.id; }
    else if (type === 'clear-obstacles') { scene.obstacles = []; scene.activeObstacleId = undefined; }
    else if (type === 'arrange-projectors' && ['stack', 'blend'].includes(intent.mode)) { const center = (scene.projectors.length - 1) / 2; scene.projectors = scene.projectors.map((item, itemIndex) => { const offset = itemIndex - center; return invalidateFieldVerification({ ...item, position: { ...item.position, x: intent.mode === 'stack' ? 0 : stepped(offset * Math.max(2, scene.screen.width * 0.18), 0.25), lensHeight: intent.mode === 'stack' ? stepped(projector.position.lensHeight + offset * 0.75, 0.25) : item.position.lensHeight, distance: projector.position.distance, targetX: intent.mode === 'stack' ? 0 : stepped(offset * scene.screen.width * 0.34, 0.25) } }); }); scene.layoutMode = intent.mode; }
    else if (type === 'toggle-overlay' && Object.prototype.hasOwnProperty.call(scene.overlays, intent.key)) scene.overlays[intent.key] = intent.value === undefined ? !scene.overlays[intent.key] : Boolean(intent.value);
    else if (type === 'set-camera' && ['three', 'side', 'front', 'top', 'op'].includes(intent.camera)) scene.view.camera = intent.camera;
    scene.updatedAt = new Date().toISOString();
    return normalizeSceneState(scene);
  }

  function stampFieldVerification(input, values = {}) {
    const scene = normalizeSceneState(input);
    const index = scene.projectors.findIndex(projector => projector.id === scene.activeProjectorId);
    const projector = scene.projectors[index];
    const measuredDistance = Number(values.measuredDistance); const measuredWidth = Number(values.measuredWidth);
    if (!finite(measuredDistance) || measuredDistance <= 0 || !finite(measuredWidth) || measuredWidth <= 0) throw new TypeError('Measured distance and image width must be positive numbers.');
    const ratio = measuredDistance / measuredWidth;
    scene.projectors[index] = normalizeProjector({ ...projector, allowed: true, optical: { ...projector.optical, min: ratio, max: ratio, basisWidth: measuredWidth }, provenance: { mode: 'field_verified', reason: 'FIELD VERIFIED · job-scoped measured ratio.', verification: { ratio, measuredDistance, measuredWidth, verifiedBy: values.verifiedBy, verifiedAt: values.verifiedAt || new Date().toISOString(), note: values.note } } }, index);
    scene.updatedAt = new Date().toISOString();
    return normalizeSceneState(scene);
  }

  return Object.freeze({ SCHEMA_VERSION, STORAGE_KEY, normalizeProvenance, normalizeSceneState, createSceneState, activeProjector, calculateProjectorGeometry, obstacleIntersectsBeam, applyIntent, stampFieldVerification });
});
