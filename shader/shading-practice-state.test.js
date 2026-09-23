'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Practice = require('./shading-practice-state.js');

function setControls(state, cameraId, controls) {
  return Object.entries(controls).reduce((next, [control, value]) => Practice.applyIntent(next, { type: 'set-control', cameraId, control, value }), state);
}

test('practice state is versioned, deterministic, and contains two isolated virtual cameras', () => {
  const one = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'show-42' });
  const two = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'show-42' });
  assert.equal(one.schema, 'shader.camera-practice.v1');
  assert.equal(one.schemaVersion, 1);
  assert.deepEqual(one, two);
  assert.deepEqual(one.cameras.map(camera => camera.id), ['camera-a', 'camera-b']);
  const changed = Practice.applyIntent(one, { type: 'set-control', cameraId: 'camera-b', control: 'iris', value: -1.2 });
  assert.equal(one.cameras[1].controls.iris, 0.8);
  assert.equal(changed.cameras[0].controls.iris, one.cameras[0].controls.iris);
  assert.equal(changed.cameras[1].controls.iris, -1.2);
});

test('every requested control is normalized to its documented range and step', () => {
  const state = Practice.createPracticeState();
  const controls = { iris: 99, pedestal: -99, gain: 2.24, gamma: 0, whiteBalance: 3333, saturation: 7, colorPhase: -999 };
  const adjusted = setControls(state, 'camera-b', controls);
  assert.deepEqual(adjusted.cameras[1].controls, {
    iris: 4, pedestal: -10, gain: 2.2, gamma: 0.6, whiteBalance: 3350, saturation: 2, colorPhase: -180
  });
});

test('the same seed and controls generate byte-for-byte identical frame and scope data', () => {
  const state = Practice.createPracticeState({ scenarioId: 'neutralize-cast', seed: 'repeatable-seed' });
  const first = Practice.analyzeCamera(state, 'camera-b', { width: 32, height: 18 });
  const second = Practice.analyzeCamera(state, 'camera-b', { width: 32, height: 18 });
  assert.deepEqual(first, second);
  const different = Practice.analyzeCamera(Practice.createPracticeState({ scenarioId: 'neutralize-cast', seed: 'different-seed' }), 'camera-b', { width: 32, height: 18 });
  assert.notDeepEqual(first.samples, different.samples);
  assert.equal(first.waveform.length, 32);
  assert.equal(first.histogram.length, 64);
  assert.equal(first.parade.r.length, 32);
  assert.deepEqual(Object.keys(first.parade.r[0]), ['min', 'max', 'mean']);
  assert.ok(first.parade.r.some((column, index) => index && column.mean !== first.parade.r[index - 1].mean), 'RGB parade must preserve horizontal picture structure');
  assert.ok(first.vectorscope.length > 20);
});

test('matching Camera B controls to Camera A materially improves the camera-match score', () => {
  let state = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'match-01' });
  const before = Practice.evaluatePractice(state);
  state = setControls(state, 'camera-b', state.cameras[0].controls);
  const after = Practice.evaluatePractice(state);
  assert.ok(before.score < 75, `expected initial mismatch, got ${before.score}`);
  assert.ok(after.score >= 95, `expected a strong match, got ${after.score}`);
  assert.equal(after.status, 'complete');
});

test('recovering iris and gain restores highlight score without a false calibration claim', () => {
  let state = Practice.createPracticeState({ scenarioId: 'recover-highlights', seed: 'highlight-01' });
  const before = Practice.evaluatePractice(state);
  state = setControls(state, 'camera-b', { iris: 0, gain: 0, gamma: 1 });
  const after = Practice.evaluatePractice(state);
  assert.ok(before.objectives.find(item => item.label === 'Highlight detail').score < 50);
  assert.ok(after.score > before.score);
  assert.ok(after.objectives.find(item => item.label === 'Highlight detail').score >= 80);
});

test('setting pedestal back to reference improves the black-level exercise', () => {
  let state = Practice.createPracticeState({ scenarioId: 'set-black-level', seed: 'black-01' });
  const before = Practice.evaluatePractice(state);
  state = setControls(state, 'camera-b', { pedestal: 0 });
  const after = Practice.evaluatePractice(state);
  assert.ok(after.score > before.score);
  assert.equal(after.status, 'complete');
  assert.ok(after.objectives.find(item => item.label === 'Black floor').passed);
});

test('matching white balance, phase, and saturation neutralizes the cast', () => {
  let state = Practice.createPracticeState({ scenarioId: 'neutralize-cast', seed: 'color-01' });
  const before = Practice.evaluatePractice(state);
  state = setControls(state, 'camera-b', { whiteBalance: 3200, saturation: 1, colorPhase: 0 });
  const after = Practice.evaluatePractice(state);
  assert.ok(after.score > before.score + 20, `${before.score} -> ${after.score}`);
  assert.equal(after.status, 'complete');
});

test('troubleshooting injections are explicit, bounded, and replay clears them', () => {
  const base = Practice.createPracticeState({ seed: 'inject-01' });
  const injected = Practice.injectTrouble(base, 'excessive-gain', 'camera-b');
  assert.equal(injected.cameras[1].controls.gain, 18);
  assert.deepEqual(injected.injections, ['excessive-gain']);
  assert.match(injected.lastAction, /injected/i);
  const replayed = Practice.applyIntent(injected, { type: 'replay' });
  assert.equal(replayed.seed, base.seed);
  assert.equal(replayed.attempt, base.attempt + 1);
  assert.deepEqual(replayed.injections, []);
  assert.deepEqual(replayed.cameras, base.cameras);
});

test('every troubleshooting injection creates its named fault from adversarial controls', () => {
  const setAdversarial = values => setControls(Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'fault-proof' }), 'camera-b', values);
  const low = setAdversarial({ iris: -4, pedestal: 0, gain: -6, whiteBalance: 3200, saturation: 2, colorPhase: -58 });
  const high = setAdversarial({ iris: 4, pedestal: 0, gain: 18, whiteBalance: 10000, saturation: 0, colorPhase: 180 });
  for (const fault of Practice.troubleshootingList()) {
    const fromLow = Practice.injectTrouble(low, fault.id, 'camera-b');
    const fromHigh = Practice.injectTrouble(high, fault.id, 'camera-b');
    assert.equal(fromLow.injections.at(-1), fault.id);
    assert.equal(fromHigh.injections.at(-1), fault.id);
    const controls = fromLow.cameras[1].controls;
    if (fault.id === 'clipped-highlights') assert.ok(Practice.analyzeCamera(fromLow, 'camera-b').metrics.clippedPercent > 10);
    if (fault.id === 'lifted-blacks') assert.equal(controls.pedestal, 10);
    if (fault.id === 'crushed-blacks') assert.ok(Practice.analyzeCamera(fromLow, 'camera-b').metrics.crushedPercent > 10);
    if (fault.id === 'warm-cast') assert.ok(Math.abs(Math.log2(controls.whiteBalance / fromLow.cameras[1].source.sourceKelvin)) > 0.8);
    if (fault.id === 'low-saturation') assert.equal(controls.saturation, 0.35);
    if (fault.id === 'phase-error') assert.ok(Math.abs(controls.colorPhase - fromLow.cameras[0].controls.colorPhase) >= 90);
    if (fault.id === 'excessive-gain') assert.equal(controls.gain, 18);
    Object.keys(fault.controls).forEach(name => {
      if (!['colorPhase','whiteBalance'].includes(name)) assert.equal(fromLow.cameras[1].controls[name], fromHigh.cameras[1].controls[name], `${fault.id} must not depend on the starting ${name}`);
    });
  }
});

test('JSON export and import reproduce the full practice state', () => {
  let state = Practice.createPracticeState({ scenarioId: 'neutralize-cast', seed: 'portable-show' });
  state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-b', control: 'whiteBalance', value: 3850 });
  state = Practice.applyIntent(state, { type: 'set-scope', scope: 'vectorscope' });
  state = Practice.injectTrouble(state, 'phase-error', 'camera-b');
  const encoded = Practice.exportPracticeJSON(state);
  const restored = Practice.importPracticeJSON(encoded);
  assert.deepEqual(restored, state);
  assert.equal(JSON.parse(encoded).exportedAt, null);
  assert.throws(() => Practice.importPracticeJSON('{bad json'), /not valid JSON/);
  assert.throws(() => Practice.importPracticeJSON(JSON.stringify({ schema: 'other' })), /must use/);
});

test('legacy Throwline exports import once into the Shader schema', () => {
  const state = Practice.createPracticeState({ seed: 'legacy-proof' });
  const legacy = JSON.stringify({
    kind: 'throwline-camera-practice-session',
    schema: 'throwline.camera-practice.v1',
    schemaVersion: 1,
    state: { ...state, schema: 'throwline.camera-practice.v1' }
  });
  const restored = Practice.importPracticeJSON(legacy);
  assert.equal(restored.schema, 'shader.camera-practice.v1');
  assert.equal(restored.seed, 'legacy-proof');
});

test('import normalization rejects unknown scenarios and unsafe numeric values', () => {
  const state = Practice.normalizeState({
    scenarioId: 'invented', seed: 'x', cameras: [{ id: 'camera-a', controls: { iris: Infinity, gain: -999 } }],
    injections: ['not-real', 'clipped-highlights']
  });
  assert.equal(state.scenarioId, 'match-cameras');
  assert.equal(state.cameras[0].controls.iris, 0);
  assert.equal(state.cameras[0].controls.gain, -6);
  assert.deepEqual(state.injections, ['clipped-highlights']);
});

test('all four scenario definitions remain available with coach copy and objective metadata', () => {
  const scenarios = Practice.scenarioList();
  assert.deepEqual(scenarios.map(item => item.id), ['match-cameras', 'recover-highlights', 'set-black-level', 'neutralize-cast']);
  scenarios.forEach(item => {
    assert.ok(item.brief.length > 30);
    assert.ok(item.objective.length > 20);
    assert.ok(Practice.SCENARIOS[item.id].coach.length >= 3);
  });
});
