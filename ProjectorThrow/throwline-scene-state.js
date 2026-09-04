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
  const finite = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));
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
    const max = finite(optical.max) ? clamp(optical.max, 0.05, 20) : NaN;
    const inverted = finite(min) && finite(max) && Number(optical.max) < Number(optical.min);
    const provenance = normalizeProvenance(inverted ? { mode: 'conflicting', reason: 'CALCULATION BLOCKED · the supplied ratio range is inverted (tele below wide).' } : (input.provenance || { mode: optical.mode }));
    const allowed = input.allowed === true && !inverted && finite(min) && finite(max) && max >= min && ['manual', 'verified_image_width', 'field_verified'].includes(provenance.mode);
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
      tolerance: finite(input.tolerance) ? clamp(input.tolerance, 0, 15) : 5,
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
      tolerance: transfer.tolerance,
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

  // Solve a*z + b <= c*z + e (i.e. (a - c) z <= e - b) over [lo, hi]; returns the feasible sub-interval or null.
  function linearInterval(slope, offset, lo, hi) {
    if (Math.abs(slope) < 1e-12) return offset >= -1e-9 ? [lo, hi] : null;
    const bound = offset / slope;
    const next = slope > 0 ? [lo, Math.min(hi, bound)] : [Math.max(lo, bound), hi];
    return next[0] <= next[1] + 1e-9 ? next : null;
  }
  function axisOverlapInterval(apex, target, halfImage, center, halfSize, distance, lo, hi) {
    // Beam center along this axis at depth z: target + (apex - target) * z / d. Beam half-extent: halfImage * (1 - z / d).
    // Overlap requires |center - beamCenter(z)| <= halfExtent(z) + halfSize, i.e. two linear inequalities in z.
    const centerSlope = (apex - target) / distance, extentSlope = -halfImage / distance;
    // beamCenter(z) - center <= halfExtent(z) + halfSize
    const upper = linearInterval(centerSlope - extentSlope, center + halfImage + halfSize - target, lo, hi);
    if (!upper) return null;
    // center - beamCenter(z) <= halfExtent(z) + halfSize
    return linearInterval(-centerSlope - extentSlope, target + halfImage + halfSize - center, upper[0], upper[1]);
  }
  function obstacleIntersectsBeam(obstacle, scene, projector, image) {
    const distance = projector.position.distance;
    if (!finite(distance) || distance <= 0 || !image) return false;
    const nearZ = Math.max(0, obstacle.position.z - obstacle.size.depth / 2);
    const farZ = Math.min(distance, obstacle.position.z + obstacle.size.depth / 2);
    if (farZ < nearZ) return false;
    const screenHeight = scene.screen.width / scene.screen.aspect;
    const screenCenterY = scene.screen.bottom + screenHeight / 2;
    const zx = axisOverlapInterval(projector.position.x, projector.position.targetX, image.width / 2, obstacle.position.x, obstacle.size.width / 2, distance, nearZ, farZ);
    if (!zx) return false;
    return !!axisOverlapInterval(projector.position.lensHeight, screenCenterY, image.height / 2, obstacle.position.y, obstacle.size.height / 2, distance, zx[0], zx[1]);
  }

  const PLACEMENT_TOLERANCE = 0.01;

  // Shift utilization is judged against the limit for the direction the image actually moves:
  // a positive value uses `positiveKey` (up or right) and a negative value uses `negativeKey` (down or left).
  // Combined-axis (elliptical) limits are not modeled; each axis is reported independently.
  function assessShift(percent, envelope, positiveKey, negativeKey) {
    const direction = percent >= 0 ? positiveKey : negativeKey;
    const limit = envelope && finite(envelope[direction]) ? Number(envelope[direction]) : undefined;
    return { percent, direction, limit, exceeded: limit === undefined ? undefined : Math.abs(percent) > limit };
  }

  function roomConflicts(input) {
    const scene = normalizeSceneState(input);
    const conflicts = [];
    const screenHeight = scene.screen.width / scene.screen.aspect;
    const screenTop = scene.screen.bottom + screenHeight;
    if (scene.screen.width > scene.room.width + PLACEMENT_TOLERANCE) conflicts.push({ kind: 'screen-width', label: 'screen is wider than room' });
    if (screenTop > scene.room.height + PLACEMENT_TOLERANCE) conflicts.push({ kind: 'screen-height', label: 'screen extends above ceiling' });
    scene.projectors.forEach(projector => {
      const name = scene.projectors.length > 1 ? `${projector.label} ` : 'projector ';
      if (projector.position.distance > scene.room.depth + PLACEMENT_TOLERANCE) conflicts.push({ projectorId: projector.id, kind: 'projector-depth', label: `${name}is beyond room depth` });
      if (projector.position.lensHeight > scene.room.height + PLACEMENT_TOLERANCE) conflicts.push({ projectorId: projector.id, kind: 'projector-height', label: `${name}lens is above ceiling` });
      if (Math.abs(projector.position.x) > scene.room.width / 2 + PLACEMENT_TOLERANCE) conflicts.push({ projectorId: projector.id, kind: 'projector-width', label: `${name}is outside room width` });
      const geometry = calculateProjectorGeometry(scene, projector.id);
      if (!geometry.image) return;
      const imageTop = geometry.screen.centerY + geometry.image.height / 2;
      const imageBottom = geometry.screen.centerY - geometry.image.height / 2;
      if (imageTop > scene.room.height + PLACEMENT_TOLERANCE) conflicts.push({ projectorId: projector.id, kind: 'image-height', label: `${name}image extends above ceiling` });
      if (imageBottom < -PLACEMENT_TOLERANCE) conflicts.push({ projectorId: projector.id, kind: 'image-floor', label: `${name}image extends below floor` });
      if (Math.abs(geometry.image.centerX) + geometry.image.width / 2 > scene.room.width / 2 + PLACEMENT_TOLERANCE) conflicts.push({ projectorId: projector.id, kind: 'image-width', label: `${name}image extends outside room width` });
    });
    return conflicts;
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
    const tolerance = scene.tolerance;
    const factor = tolerance / 100;
    let safeLow = wideDistance * (1 + factor);
    let safeHigh = teleDistance * (1 - factor);
    // A fixed ratio, or a zoom span narrower than the margin, has no conservative interior: the mark is nominal and
    // the ±tolerance band is a verify zone, never a safe zone (this mirrors the planner's fixed-lens handling).
    const fixed = safeLow > safeHigh;
    const nominal = (wideDistance + teleDistance) / 2;
    if (fixed) { safeLow = nominal; safeHigh = nominal; }
    const distance = projector.position.distance;
    const requiredRatio = distance / optical.basisWidth;
    const currentRatio = clamp(requiredRatio, optical.min, optical.max);
    const imageWidth = distance / currentRatio;
    const imageHeight = imageWidth / optical.rasterAspect;
    let kind = 'near-limit'; let rawLabel = 'PASS · NEAR LIMIT'; let tone = 'warn';
    const measured = projector.provenance.mode === 'field_verified';
    const verifyLow = fixed && !measured ? nominal * (1 - factor) : wideDistance, verifyHigh = fixed && !measured ? nominal * (1 + factor) : teleDistance;
    if (distance > verifyHigh + PLACEMENT_TOLERANCE) { kind = 'overshoot'; rawLabel = 'OVERSHOOT'; tone = 'bad'; }
    else if (distance < verifyLow - PLACEMENT_TOLERANCE) { kind = 'undershoot'; rawLabel = 'UNDERSHOOT'; tone = 'bad'; }
    else if (fixed) {
      const atMark = Math.abs(distance - nominal) <= PLACEMENT_TOLERANCE;
      if (measured) { kind = 'safe'; rawLabel = 'PASS · MEASURED MARK'; tone = 'go'; }
      else { kind = 'nominal'; rawLabel = atMark ? 'NOMINAL MARK · VERIFY' : 'NEAR NOMINAL · VERIFY'; tone = 'warn'; }
    }
    else if (distance >= safeLow && distance <= safeHigh) { kind = 'safe'; rawLabel = 'PASS · SAFE'; tone = 'go'; }
    const label = projector.provenance.mode === 'manual' && kind === 'safe' ? 'FITS SUPPLIED RANGE' : projector.provenance.mode === 'manual' && kind === 'near-limit' ? 'FITS · NEAR LIMIT' : rawLabel;
    const shiftPercent = ((base.screen.centerY - projector.position.lensHeight) / imageHeight) * 100;
    const horizontalShiftPercent = ((projector.position.targetX - projector.position.x) / imageWidth) * 100;
    const image = { width: imageWidth, height: imageHeight, centerX: projector.position.targetX, requiredRatio, currentRatio, shiftPercent, horizontalShiftPercent };
    const shift = { vertical: assessShift(shiftPercent, optical.shift, 'up', 'down'), horizontal: assessShift(horizontalShiftPercent, optical.shift, 'right', 'left') };
    const collisions = scene.obstacles.filter(obstacle => obstacleIntersectsBeam(obstacle, scene, projector, image)).map(obstacle => ({ obstacleId: obstacle.id, label: obstacle.label, kind: 'beam-obstruction' }));
    const screenLeft = -scene.screen.width / 2, screenRight = scene.screen.width / 2;
    const imageLeft = image.centerX - imageWidth / 2, imageRight = image.centerX + imageWidth / 2;
    const heightVariance = (imageHeight - screenHeight) / 2;
    const coverage = {
      spill: Math.max(0, screenLeft - imageLeft, imageRight - screenRight, heightVariance),
      missing: Math.max(0, imageLeft - screenLeft, screenRight - imageRight, -heightVariance)
    };
    coverage.maxEdgeVariance = Math.max(coverage.spill, coverage.missing);
    return { ...base, placement: { kind, label, tone }, reason: collisions.length ? `${collisions.length} obstruction${collisions.length === 1 ? '' : 's'} intersect the beam.` : '', envelope: { wideDistance, teleDistance, safeLow, safeHigh, tolerance, fixed, nominal }, image, shift, shiftEnvelope: optical.shift, coverage, collisions };
  }

  const COVERAGE_TOLERANCE = 0.02;
  function assessInstallation(input) {
    const scene = normalizeSceneState(input);
    const issues = [];
    const push = (tone, kind, label, projectorId) => issues.push({ tone, kind, label, projectorId });
    scene.projectors.forEach(projector => {
      const name = scene.projectors.length > 1 ? `${projector.label}: ` : '';
      const geometry = calculateProjectorGeometry(scene, projector.id);
      if (!geometry.allowed) { push('bad', 'blocked', `${name}calculation blocked`, projector.id); return; }
      if (geometry.placement.tone !== 'go') push(geometry.placement.tone, `placement-${geometry.placement.kind}`, `${name}${geometry.placement.label.toLowerCase()}`, projector.id);
      if (geometry.coverage.missing > COVERAGE_TOLERANCE) push('bad', 'coverage-missing', `${name}image does not cover the screen`, projector.id);
      else if (geometry.coverage.spill > COVERAGE_TOLERANCE) push('warn', 'coverage-spill', `${name}image spills past the screen`, projector.id);
      ['vertical', 'horizontal'].forEach(axis => {
        const shift = geometry.shift[axis];
        if (shift.exceeded === true) push('bad', `shift-${axis}`, `${name}${axis} shift exceeds the ${shift.direction} limit`, projector.id);
        else if (shift.exceeded === undefined && Math.abs(shift.percent) > 0.05) push('warn', `shift-${axis}-unknown`, `${name}${axis} shift limit unknown`, projector.id);
      });
      geometry.collisions.forEach(collision => push('bad', 'beam-obstruction', `${name}beam hits ${collision.label}`, projector.id));
      if (geometry.provenance.mode === 'manual') push('warn', 'provenance-manual', `${name}manual ratio is unverified`, projector.id);
    });
    roomConflicts(scene).forEach(conflict => push('bad', `room-${conflict.kind}`, conflict.label, conflict.projectorId));
    const tone = issues.some(issue => issue.tone === 'bad') ? 'bad' : issues.some(issue => issue.tone === 'warn') ? 'warn' : 'go';
    const first = issues.find(issue => issue.tone === tone);
    const label = tone === 'go' ? 'INSTALLATION CHECKS PASS' : tone === 'warn' ? `REVIEW · ${first.label}` : `FAIL · ${first.label}`;
    return { tone, label, issues };
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
    else if (type === 'snap-distance' && projector.allowed && finite(projector.optical.min) && finite(projector.optical.max)) {
      // Optical stops are exact ratios times the basis width; quarter-foot rounding would push a stop outside its own envelope.
      const { min, max, basisWidth } = projector.optical;
      const target = intent.target === 'wide' ? min * basisWidth : intent.target === 'tele' ? max * basisWidth : ((min * 1.05 + max * 0.95) / 2) * basisWidth;
      updateProjector({ ...projector, position: { ...projector.position, distance: clamp(target, 1, 300) } });
    }
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
    else if (type === 'set-tolerance' && finite(intent.value)) scene.tolerance = clamp(intent.value, 0, 15);
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
    if (ratio < 0.05 || ratio > 20) throw new RangeError(`Measured ratio ${ratio.toFixed(3)}:1 is outside the 0.05–20:1 optical model; check the measurements.`);
    // The measurement certifies the throw ratio only. The planned raster basis stays, so the corrected mark is ratio × basis
    // (the same relationship the planner uses), not the measured throw itself.
    scene.projectors[index] = normalizeProjector({ ...projector, allowed: true, optical: { ...projector.optical, min: ratio, max: ratio }, provenance: { mode: 'field_verified', reason: 'FIELD VERIFIED · job-scoped measured ratio.', verification: { ratio, measuredDistance, measuredWidth, verifiedBy: values.verifiedBy, verifiedAt: values.verifiedAt || new Date().toISOString(), note: values.note } } }, index);
    scene.updatedAt = new Date().toISOString();
    return normalizeSceneState(scene);
  }

  return Object.freeze({ SCHEMA_VERSION, STORAGE_KEY, PLACEMENT_TOLERANCE, COVERAGE_TOLERANCE, normalizeProvenance, normalizeSceneState, createSceneState, activeProjector, calculateProjectorGeometry, roomConflicts, assessInstallation, obstacleIntersectsBeam, applyIntent, stampFieldVerification });
});
