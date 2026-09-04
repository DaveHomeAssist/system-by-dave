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
  assert.equal(geometry.placement.label, 'FITS SUPPLIED RANGE');
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
  assert.match(Scene.activeProjector(edited).provenance.reason, /driving value changed/i);
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
