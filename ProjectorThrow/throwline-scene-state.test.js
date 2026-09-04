'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Scene = require('./throwline-scene-state.js');

function manualScene() {
  return Scene.createSceneState({ w: 20, ar: 16 / 9, bottom: 4, basisW: 20, rasterAr: 16 / 10, lh: 6, dist: 22.8, wide: 0.978, tele: 1.32, mode: 'manual', allowed: true });
}

test('manual state is explicit and never claims verified safety', () => {
  const geometry = Scene.calculateProjectorGeometry(manualScene());
  assert.equal(geometry.allowed, true);
  assert.equal(geometry.provenance.label, 'MANUAL ESTIMATE');
  assert.equal(geometry.placement.label, 'Fits the ratio you entered');
});

test('blocked state suppresses optical geometry', () => {
  const geometry = Scene.calculateProjectorGeometry(Scene.createSceneState({ mode: 'conflicting', allowed: false }));
  assert.equal(geometry.allowed, false);
  assert.equal(geometry.placement.kind, 'blocked');
  assert.equal(geometry.image, undefined);
});

test('driving edits invalidate job-scoped field verification', () => {
  const stamped = Scene.stampFieldVerification(manualScene(), { measuredDistance: 22, measuredWidth: 20, verifiedBy: 'Dave' });
  assert.equal(Scene.activeProjector(stamped).provenance.mode, 'field_verified');
  const edited = Scene.applyIntent(stamped, { type: 'set-distance', value: 24 });
  assert.equal(Scene.activeProjector(edited).provenance.mode, 'manual');
  assert.match(Scene.activeProjector(edited).provenance.reason, /measure again/i);
});

test('duplicate projectors do not inherit field verification', () => {
  const stamped = Scene.stampFieldVerification(manualScene(), { measuredDistance: 22, measuredWidth: 20, verifiedBy: 'Dave' });
  const duplicated = Scene.applyIntent(stamped, { type: 'add-projector' });
  assert.equal(duplicated.projectors.length, 2);
  assert.equal(Scene.activeProjector(duplicated).provenance.mode, 'manual');
});

test('beam obstruction produces a collision', () => {
  const scene = Scene.applyIntent(manualScene(), { type: 'add-obstacle' });
  assert.equal(Scene.calculateProjectorGeometry(scene).collisions.length, 1);
});

test('scene normalization caps projectors and preserves one active unit', () => {
  const scene = Scene.normalizeSceneState({ projectors: Array.from({ length: 12 }, (_, index) => ({ id: `p-${index}` })) });
  assert.equal(scene.projectors.length, 8);
  assert.ok(scene.projectors.some(projector => projector.id === scene.activeProjectorId));
});

test('scene import repairs duplicate entity identifiers', () => {
  const scene = Scene.normalizeSceneState({ projectors: [{ id: 'same' }, { id: 'same' }], obstacles: [{ id: 'same' }, { id: 'same' }] });
  assert.equal(new Set(scene.projectors.map(item => item.id)).size, 2);
  assert.equal(new Set(scene.obstacles.map(item => item.id)).size, 2);
});

test('obstructions can be selected and edited through scene intents', () => {
  let scene = Scene.applyIntent(manualScene(), { type: 'add-obstacle' });
  const id = scene.activeObstacleId;
  scene = Scene.applyIntent(scene, { type: 'set-obstacle', obstacleId: id, key: 'width', value: 4.25 });
  scene = Scene.applyIntent(scene, { type: 'set-obstacle', obstacleId: id, key: 'x', value: -2.5 });
  const obstacle = scene.obstacles.find(item => item.id === id);
  assert.equal(obstacle.size.width, 4.25);
  assert.equal(obstacle.position.x, -2.5);
});

test('stack and blend arrangements remain explicit scene state', () => {
  let scene = Scene.applyIntent(manualScene(), { type: 'add-projector' });
  scene = Scene.applyIntent(scene, { type: 'arrange-projectors', mode: 'stack' });
  assert.equal(scene.layoutMode, 'stack');
  assert.ok(scene.projectors.every(projector => projector.position.x === 0 && projector.position.targetX === 0));
  scene = Scene.applyIntent(scene, { type: 'arrange-projectors', mode: 'blend' });
  assert.equal(scene.layoutMode, 'blend');
  assert.notEqual(scene.projectors[0].position.targetX, scene.projectors[1].position.targetX);
});

test('manual screen edits preserve the ratio basis relationship', () => {
  const scene = manualScene();
  const resized = Scene.applyIntent(scene, { type: 'set-screen-width', value: 30 });
  assert.equal(resized.screen.width, 30);
  assert.equal(Scene.activeProjector(resized).optical.basisWidth, 30);
});

test('shift limits remain part of the derived spatial envelope', () => {
  const scene = Scene.createSceneState({ w: 20, ar: 16 / 9, basisW: 20, rasterAr: 16 / 10, lh: 6, dist: 22, wide: 0.978, tele: 1.32, mode: 'manual', allowed: true, shift: { up: 60, down: 40, left: 20, right: 20 } });
  assert.deepEqual(Scene.calculateProjectorGeometry(scene).shiftEnvelope, { up: 60, down: 40, left: 20, right: 20 });
});

// Regression coverage from the Stage 3D calculation audit (exact production link:
// ?mode=manual&w=20&bottom=4&ar=1.777778&basisW=20&rasterAr=1.6&lh=6&dist=7.3229&min=0.978&max=1.32).
function auditScene(overrides = {}) {
  return Scene.createSceneState({ w: 20, bottom: 4, ar: 1.777778, basisW: 20, rasterAr: 1.6, lh: 6, dist: 7.3229, wide: 0.978, tele: 1.32, mode: 'manual', allowed: true, ...overrides });
}
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test('audit link reproduces the documented throw geometry in feet', () => {
  const geometry = Scene.calculateProjectorGeometry(auditScene());
  near(geometry.screen.height, 11.25, 1e-5);
  near(geometry.envelope.wideDistance, 19.56);
  near(geometry.envelope.teleDistance, 26.4);
  near(geometry.envelope.safeLow, 20.538);
  near(geometry.envelope.safeHigh, 25.08);
  near(geometry.image.requiredRatio, 0.366145);
  near(geometry.image.currentRatio, 0.978);
  near(geometry.image.width, 7.487628, 1e-6);
  near(geometry.image.height, 4.679767, 1e-6);
  near(geometry.image.shiftPercent, 77.4611, 1e-4);
  assert.equal(geometry.placement.kind, 'undershoot');
  assert.equal(Scene.calculateProjectorGeometry(auditScene({ dist: 7.3229 / 0.3048 })).placement.kind, 'safe');
});

test('snap intents land on the exact optical stops instead of quarter-foot marks', () => {
  const wide = Scene.applyIntent(auditScene(), { type: 'snap-distance', target: 'wide' });
  const tele = Scene.applyIntent(auditScene(), { type: 'snap-distance', target: 'tele' });
  const mid = Scene.applyIntent(auditScene(), { type: 'snap-distance', target: 'mid' });
  near(Scene.activeProjector(wide).position.distance, 19.56);
  near(Scene.activeProjector(tele).position.distance, 26.4);
  near(Scene.activeProjector(mid).position.distance, 22.809);
  assert.equal(Scene.calculateProjectorGeometry(wide).placement.kind, 'near-limit');
  assert.equal(Scene.calculateProjectorGeometry(tele).placement.kind, 'near-limit');
  assert.equal(Scene.calculateProjectorGeometry(mid).placement.kind, 'safe');
  const rounded = Scene.applyIntent(auditScene(), { type: 'set-distance', value: 19.56 });
  assert.equal(Scene.calculateProjectorGeometry(rounded).placement.kind, 'undershoot', 'quarter-foot rounding is the documented failure mode for the raw distance intent');
});

test('snap intents never fall outside the envelope across random ratio ranges', () => {
  let seed = 7;
  const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let index = 0; index < 2000; index += 1) {
    const min = 0.3 + random() * 2, max = min + random() * 2, basisW = 4 + random() * 60;
    const scene = Scene.createSceneState({ w: basisW, ar: 1.7778, bottom: 4, basisW, rasterAr: 1.6, lh: 6, dist: 22, wide: min, tele: max, mode: 'manual', allowed: true });
    ['wide', 'tele', 'mid'].forEach(target => {
      const kind = Scene.calculateProjectorGeometry(Scene.applyIntent(scene, { type: 'snap-distance', target })).placement.kind;
      assert.ok(kind === 'safe' || kind === 'near-limit' || kind === 'nominal', `${target} snap produced ${kind} for ${min}-${max} × ${basisW}`);
    });
  }
});

test('snap intents are ignored while optical geometry is blocked', () => {
  const blocked = Scene.createSceneState({ mode: 'partial', allowed: false, dist: 22 });
  assert.equal(Scene.activeProjector(Scene.applyIntent(blocked, { type: 'snap-distance', target: 'wide' })).position.distance, 22);
});

test('field stamps certify the ratio against the planned basis, not the measured throw', () => {
  const stamped = Scene.stampFieldVerification(auditScene({ dist: 22.75 }), { measuredDistance: 12, measuredWidth: 10, verifiedBy: 'Dave' });
  const projector = Scene.activeProjector(stamped);
  const geometry = Scene.calculateProjectorGeometry(stamped);
  assert.equal(projector.optical.basisWidth, 20);
  near(projector.optical.min, 1.2);
  near(geometry.envelope.wideDistance, 24);
  near(geometry.envelope.teleDistance, 24);
  assert.equal(geometry.placement.kind, 'undershoot');
  assert.deepEqual({ ...projector.provenance.verification, verifiedAt: '' }, { ratio: 1.2, measuredDistance: 12, measuredWidth: 10, verifiedBy: 'Dave', verifiedAt: '', note: '' });
});

test('a fixed ratio passes at its exact mark instead of an inverted safe band', () => {
  const stamped = Scene.stampFieldVerification(auditScene({ dist: 24 }), { measuredDistance: 24, measuredWidth: 20, verifiedBy: 'Dave' });
  const geometry = Scene.calculateProjectorGeometry(stamped);
  assert.ok(geometry.envelope.safeLow <= geometry.envelope.safeHigh);
  assert.equal(geometry.placement.kind, 'safe');
  assert.equal(geometry.placement.label, 'At the measured distance');
  assert.equal(geometry.provenance.mode, 'field_verified');
  const off = Scene.applyIntent(stamped, { type: 'set-distance', value: 23 });
  assert.equal(Scene.calculateProjectorGeometry(off).placement.kind, 'nominal', 'after a driving edit the fixed ratio is manual again and 23 ft sits in the verify band');
  const measuredOff = Scene.stampFieldVerification(auditScene({ dist: 23 }), { measuredDistance: 24, measuredWidth: 20, verifiedBy: 'Dave' });
  assert.equal(Scene.calculateProjectorGeometry(measuredOff).placement.kind, 'undershoot', 'a measured ratio has no verify band: off the mark is out of range');
});

test('shift utilization is judged against the limit for its own direction and axis', () => {
  const downward = Scene.calculateProjectorGeometry(auditScene({ dist: 22, lh: 14, shift: { up: 10, down: 80, left: 5, right: 5 } }));
  near(downward.image.shiftPercent, -35, 1e-3);
  assert.equal(downward.shift.vertical.direction, 'down');
  assert.equal(downward.shift.vertical.limit, 80);
  assert.equal(downward.shift.vertical.exceeded, false);
  const upward = Scene.calculateProjectorGeometry(auditScene({ dist: 22, lh: 2, shift: { up: 10, down: 80 } }));
  assert.equal(upward.shift.vertical.direction, 'up');
  assert.equal(upward.shift.vertical.exceeded, true);
  assert.equal(upward.shift.horizontal.limit, undefined);
  assert.equal(upward.shift.horizontal.exceeded, undefined);
  const lateral = Scene.applyIntent(auditScene({ dist: 22, shift: { up: 50, down: 50, left: 10, right: 10 } }), { type: 'set-projector-x', value: -6 });
  const lateralGeometry = Scene.calculateProjectorGeometry(lateral);
  near(lateralGeometry.image.horizontalShiftPercent, 6 / lateralGeometry.image.width * 100, 1e-9);
  assert.equal(lateralGeometry.shift.horizontal.direction, 'right');
  assert.equal(lateralGeometry.shift.horizontal.exceeded, true);
  assert.equal(Scene.calculateProjectorGeometry(auditScene({ dist: 22 })).shift.vertical.limit, undefined);
});

test('room conflicts cover ceiling, lateral bounds, projected image, and inactive units', () => {
  const base = auditScene({ dist: 22 });
  assert.deepEqual(Scene.roomConflicts(base), []);
  const ceiling = Scene.normalizeSceneState({ ...base, screen: { width: 20, aspect: 1.777778, bottom: 10 }, room: { width: 40, depth: 40, height: 8 } });
  assert.deepEqual(Scene.roomConflicts(ceiling).map(item => item.kind), ['screen-height', 'image-height']);
  const lateral = Scene.applyIntent(base, { type: 'set-projector-x', value: 25 });
  assert.ok(Scene.roomConflicts(lateral).some(item => item.kind === 'projector-width'));
  const lens = Scene.normalizeSceneState({ ...base, room: { width: 40, depth: 40, height: 8 }, projectors: [{ ...Scene.activeProjector(base), position: { ...Scene.activeProjector(base).position, lensHeight: 12 } }] });
  assert.ok(Scene.roomConflicts(lens).some(item => item.kind === 'projector-height'));
  let multi = Scene.applyIntent(base, { type: 'add-projector' });
  multi = Scene.applyIntent(multi, { type: 'set-distance', value: 60 });
  multi = Scene.applyIntent(multi, { type: 'select-projector', projectorId: 'projector-a' });
  const inactive = Scene.roomConflicts(multi).filter(item => item.kind === 'projector-depth');
  assert.equal(inactive.length, 1);
  assert.equal(inactive[0].projectorId, 'projector-2');
  assert.match(inactive[0].label, /^Unit B is behind the back wall$/);
  const onFloor = Scene.normalizeSceneState({ ...base, screen: { width: 20, aspect: 1.777778, bottom: 0 } });
  assert.deepEqual(Scene.roomConflicts(Scene.applyIntent(onFloor, { type: 'set-distance', value: 22 })).map(item => item.kind), ['image-floor'], 'a 16:10 raster on a floor-level 16:9 screen overshoots the floor');
  assert.deepEqual(Scene.roomConflicts(Scene.applyIntent(onFloor, { type: 'set-distance', value: 7.3229 })), [], 'an undersized image inside the screen does not breach the floor');
});

// Second-audit regressions: validation, depth-aware collision, tolerance, fixed lenses, coverage, installation check.
test('missing, blank, and boolean optical values never normalize into an allowed ratio', () => {
  [null, '', '   ', true, false, undefined].forEach(value => {
    const projector = Scene.normalizeSceneState({ projectors: [{ allowed: true, optical: { min: value, max: value, mode: 'manual' }, provenance: { mode: 'manual' } }] }).projectors[0];
    assert.equal(projector.allowed, false, `${JSON.stringify(value)} must not be calculation-enabled`);
    assert.ok(Number.isNaN(projector.optical.min));
  });
});

test('an inverted ratio range blocks instead of collapsing to a fixed ratio', () => {
  const projector = Scene.normalizeSceneState({ projectors: [{ allowed: true, optical: { min: 2, max: 1, mode: 'manual' }, provenance: { mode: 'manual' } }] }).projectors[0];
  assert.equal(projector.allowed, false);
  assert.equal(projector.provenance.mode, 'conflicting');
  assert.match(projector.provenance.reason, /tele ratio is smaller/i);
  const scene = Scene.applyIntent(auditScene(), { type: 'set-optical-range', min: 2, max: 1 });
  near(Scene.activeProjector(scene).optical.min, 0.978, 1e-9);
});

test('field stamps outside the optical model are rejected rather than clamped in one place', () => {
  assert.throws(() => Scene.stampFieldVerification(auditScene(), { measuredDistance: 100, measuredWidth: 1 }), RangeError);
  assert.throws(() => Scene.stampFieldVerification(auditScene(), { measuredDistance: 1, measuredWidth: 100 }), RangeError);
});

test('a deep obstruction that only clips the wide end of the beam is a collision', () => {
  const base = Scene.createSceneState({ w: 20, ar: 1.7778, bottom: 4, basisW: 20, rasterAr: 1.7778, lh: 9.625, dist: 20, wide: 1, tele: 1, mode: 'manual', allowed: true });
  const scene = Scene.normalizeSceneState({ ...base, obstacles: [{ position: { x: 5, y: 9.625, z: 15 }, size: { width: 1, height: 1, depth: 10 } }] });
  assert.equal(Scene.calculateProjectorGeometry(scene).collisions.length, 1);
  const clear = Scene.normalizeSceneState({ ...base, obstacles: [{ position: { x: 5, y: 9.625, z: 15 }, size: { width: 1, height: 1, depth: 2 } }] });
  assert.equal(Scene.calculateProjectorGeometry(clear).collisions.length, 0);
});

test('collision detection matches an exact frustum/box oracle across random geometry', () => {
  let seed = 99;
  const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const oracle = (obstacle, scene, projector, image) => {
    const d = projector.position.distance;
    const lo = Math.max(0, obstacle.position.z - obstacle.size.depth / 2), hi = Math.min(d, obstacle.position.z + obstacle.size.depth / 2);
    if (hi < lo) return false;
    const centerY = scene.screen.bottom + scene.screen.width / scene.screen.aspect / 2;
    const axes = [
      [projector.position.x, projector.position.targetX, image.width / 2, obstacle.position.x, obstacle.size.width / 2],
      [projector.position.lensHeight, centerY, image.height / 2, obstacle.position.y, obstacle.size.height / 2]
    ];
    const ok = z => axes.every(([apex, target, half, center, size]) => Math.abs(center - (target + (apex - target) * z / d)) <= half * (1 - z / d) + size + 1e-7);
    // Each constraint is linear in z, so the feasible set is an interval whose endpoints are constraint roots or lo/hi.
    const candidates = [lo, hi];
    axes.forEach(([apex, target, half, center, size]) => {
      const cs = (apex - target) / d, es = -half / d;
      [[cs - es, center + half + size - target], [-cs - es, target + half + size - center]].forEach(([slope, offset]) => { if (Math.abs(slope) > 1e-12) candidates.push(Math.min(hi, Math.max(lo, offset / slope))); });
    });
    return candidates.some(ok);
  };
  let disagreements = 0;
  for (let index = 0; index < 4000; index += 1) {
    const dist = 5 + random() * 40;
    const scene = Scene.normalizeSceneState({
      screen: { width: 5 + random() * 30, aspect: 1.2 + random() * 1.2, bottom: random() * 6 },
      projectors: [{ allowed: true, position: { x: random() * 20 - 10, targetX: random() * 10 - 5, distance: dist, lensHeight: random() * 14 }, optical: { min: 0.5 + random(), max: 1.5 + random(), basisWidth: 5 + random() * 30, rasterAspect: 1.6 }, provenance: { mode: 'manual' } }],
      obstacles: [{ position: { x: random() * 30 - 15, y: random() * 16, z: random() * dist * 1.2 }, size: { width: 0.2 + random() * 4, height: 0.2 + random() * 6, depth: 0.2 + random() * 12 } }]
    });
    const projector = scene.projectors[0];
    const geometry = Scene.calculateProjectorGeometry(scene);
    const expected = oracle(scene.obstacles[0], scene, projector, geometry.image);
    if (Scene.obstacleIntersectsBeam(scene.obstacles[0], scene, projector, geometry.image) !== expected) disagreements += 1;
  }
  assert.equal(disagreements, 0);
});

test('planning tolerance is scene state and drives the conservative band', () => {
  const scene = Scene.createSceneState({ ...{ w: 20, bottom: 4, ar: 1.777778, basisW: 20, rasterAr: 1.6, lh: 6, dist: 21, wide: 0.978, tele: 1.32, mode: 'manual', allowed: true }, tolerance: 10 });
  const geometry = Scene.calculateProjectorGeometry(scene);
  assert.equal(scene.tolerance, 10);
  near(geometry.envelope.safeLow, 19.56 * 1.1);
  near(geometry.envelope.safeHigh, 26.4 * 0.9);
  assert.equal(geometry.placement.kind, 'near-limit');
  assert.equal(Scene.calculateProjectorGeometry(auditScene({ dist: 21 })).placement.kind, 'safe');
  assert.equal(Scene.applyIntent(scene, { type: 'set-tolerance', value: 40 }).tolerance, 15);
  assert.equal(Scene.normalizeSceneState({ tolerance: 'abc' }).tolerance, 5);
});

test('a fixed manual lens has a nominal verify band and no safe interior', () => {
  const fixed = Scene.createSceneState({ w: 20, bottom: 4, ar: 1.777778, basisW: 20, rasterAr: 1.6, lh: 6, dist: 13, wide: 0.65, tele: 0.65, mode: 'manual', allowed: true });
  const geometry = Scene.calculateProjectorGeometry(fixed);
  assert.equal(geometry.envelope.fixed, true);
  assert.ok(geometry.envelope.safeLow <= geometry.envelope.safeHigh);
  assert.equal(geometry.placement.kind, 'nominal');
  assert.equal(geometry.placement.label, 'At this lens\u2019s set distance \u2014 check it on site');
  assert.equal(Scene.calculateProjectorGeometry(Scene.applyIntent(fixed, { type: 'set-distance', value: 13.5 })).placement.kind, 'nominal');
  assert.equal(Scene.calculateProjectorGeometry(Scene.applyIntent(fixed, { type: 'set-distance', value: 14 })).placement.kind, 'overshoot');
});

test('coverage reports missing width and spill separately', () => {
  const short = Scene.calculateProjectorGeometry(auditScene()).coverage;
  near(short.missing, 6.256186, 1e-5);
  near(short.spill, 0, 1e-9);
  const over = Scene.calculateProjectorGeometry(auditScene({ dist: 24 })).coverage;
  near(over.spill, 0.625, 1e-6, 'a 16:10 raster on a 16:9 screen spills vertically');
  near(over.missing, 0, 1e-9);
});

test('installation check aggregates every unit and never passes on a manual ratio', () => {
  const audit = Scene.assessInstallation(auditScene());
  assert.equal(audit.tone, 'bad');
  assert.match(audit.label, /^Needs a fix · too close/i);
  assert.ok(audit.issues.some(issue => issue.kind === 'coverage-missing'));
  const manualGood = Scene.assessInstallation(auditScene({ dist: 22, shift: { up: 60, down: 40, left: 10, right: 10 }, rasterAr: 1.777778 }));
  assert.equal(manualGood.tone, 'warn');
  assert.ok(manualGood.issues.every(issue => issue.tone === 'warn'));
  assert.ok(manualGood.issues.some(issue => issue.kind === 'provenance-manual'));
  const verified = Scene.stampFieldVerification(auditScene({ dist: 22, shift: { up: 60, down: 40, left: 10, right: 10 }, rasterAr: 1.777778 }), { measuredDistance: 22, measuredWidth: 20, verifiedBy: 'Dave' });
  assert.equal(Scene.assessInstallation(verified).tone, 'go');
  let multi = Scene.applyIntent(verified, { type: 'add-projector' });
  multi = Scene.applyIntent(multi, { type: 'set-distance', value: 60 });
  multi = Scene.applyIntent(multi, { type: 'select-projector', projectorId: 'projector-a' });
  const aggregate = Scene.assessInstallation(multi);
  assert.equal(aggregate.tone, 'bad');
  assert.ok(aggregate.issues.some(issue => issue.projectorId === 'projector-2' && issue.kind === 'room-projector-depth'));
});

test('verified catalog profiles resolve the ratio for the chosen picture shape and block other shapes', () => {
  const profile = { automaticCalculationAllowed: true, calculationState: 'verified_image_width', throw_ratio_min: 2, throw_ratio_max: 3.41, basisAspect: 4096 / 2160, basisAspectLabel: '17:9 (DCI 4K)', aspectVariants: [{ aspect: 1.6, label: '16:10', throw_ratio_min: 2.36, throw_ratio_max: 4.03 }, { aspect: 16 / 9, label: '16:9', throw_ratio_min: 2.13, throw_ratio_max: 3.63 }] };
  const native = Scene.resolveProfileRatio(profile, 4096 / 2160);
  assert.deepEqual([native.eligible, native.matched, native.min, native.max, native.label], [true, true, 2, 3.41, '17:9 (DCI 4K)']);
  const wide = Scene.resolveProfileRatio(profile, 1.6);
  assert.deepEqual([wide.matched, wide.min, wide.max], [true, 2.36, 4.03]);
  const off = Scene.resolveProfileRatio(profile, 4 / 3);
  assert.equal(off.matched, false);
  assert.match(off.reason, /17:9 \(DCI 4K\), 16:10, 16:9/);
  near(off.min, 2, 1e-9, 'the base ratio is still reported for display');
  const blocked = Scene.resolveProfileRatio({ automaticCalculationAllowed: false, calculationState: 'partial', throw_ratio_min: 1.25, throw_ratio_max: 1.6 }, 1.6);
  assert.equal(blocked.eligible, false);
  assert.equal(blocked.matched, false);
  assert.equal(Scene.resolveProfileRatio(null, 1.6).eligible, false);
});

test('every calculation-ready catalog profile resolves at its own basis shape', () => {
  const fs = require('node:fs');
  const catalog = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, 'data/throwline-pilot-catalog.v1.json'), 'utf8'));
  const ready = catalog.opticalProfiles.filter(profile => profile.automaticCalculationAllowed === true);
  assert.equal(ready.length, catalog.meta.calculationReadyCount);
  ready.forEach(profile => {
    const resolved = Scene.resolveProfileRatio(profile, profile.basisAspect);
    assert.equal(resolved.matched, true, profile.optical_profile_id);
    assert.equal(resolved.min, profile.throw_ratio_min);
    profile.verificationEvidence.crossChecks.forEach(check => {
      assert.ok(Math.abs(check.distanceMinM / check.imageWidthM - check.ratioMinPublished) / check.ratioMinPublished <= 0.02, `${profile.optical_profile_id} min cross-check`);
      assert.ok(Math.abs(check.distanceMaxM / check.imageWidthM - check.ratioMaxPublished) / check.ratioMaxPublished <= 0.02, `${profile.optical_profile_id} max cross-check`);
    });
  });
});
