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

test('attempts are counted per exercise while replay and seed changes remain retries', () => {
  let state = Practice.createPracticeState({ scenarioId: 'match-cameras', attempt: 4, seed: 'attempts' });
  state = Practice.applyIntent(state, { type: 'load-scenario', scenarioId: 'recover-highlights' });
  assert.equal(state.attempt, 1);
  state = Practice.applyIntent(state, { type: 'replay' });
  assert.equal(state.attempt, 2);
  state = Practice.applyIntent(state, { type: 'set-seed', seed: 'attempts-two' });
  assert.equal(state.attempt, 3);
  state = Practice.applyIntent(state, { type: 'load-scenario', scenarioId: 'recover-highlights' });
  assert.equal(state.attempt, 4);
  state = Practice.applyIntent(state, { type: 'load-scenario', scenarioId: 'neutralize-cast' });
  assert.equal(state.attempt, 1);
});

// ---------- console redesign: view, controls, coaching, faults, demos ----------

// Values recorded from the engine before the console redesign. Scores and
// metrics must not drift when presentation or coaching code changes.
const GOLDEN = {
  'match-cameras': { score: 45, objectives: [0, 0, 84.7, 82.8, 57.2, 70.4], black: 0.15533, peak: 1 },
  'recover-highlights': { score: 12, objectives: [30.6, 0, 0], black: 0.11748, peak: 1 },
  'set-black-level': { score: 32, objectives: [0, 66.9, 76.7], black: 0.09198, peak: 1 },
  'neutralize-cast': { score: 4, objectives: [0, 17, 0], black: 0.05398, peak: 0.92232 }
};

const matchError = evaluation => evaluation.objectives.reduce((sum, item) => sum + item.weight * Math.abs(item.value - item.target) / item.tolerance, 0);

// A trainee who follows each correction until the scopes stop improving.
function followCoaching(state, maxAdvice = 20) {
  const advice = [];
  for (let count = 0; count < maxAdvice; count += 1) {
    const next = Practice.nextCorrection(state);
    if (next.complete || !next.control) return { state, advice };
    advice.push(next);
    let current = matchError(Practice.evaluatePractice(state));
    for (const size of ['coarse', 'fine']) {
      for (let step = 0; step < 200; step += 1) {
        const moved = Practice.applyIntent(state, { type: 'step-control', cameraId: next.cameraId, control: next.control, direction: next.direction, size });
        if (JSON.stringify(moved.cameras) === JSON.stringify(state.cameras)) break;
        const error = matchError(Practice.evaluatePractice(moved));
        if (error >= current) break;
        state = moved;
        current = error;
      }
    }
  }
  return { state, advice };
}

test('exercise scores and metrics are unchanged from the pre-redesign engine', () => {
  for (const [id, golden] of Object.entries(GOLDEN)) {
    const evaluation = Practice.evaluatePractice(Practice.createPracticeState({ scenarioId: id, seed: 'golden-seed' }));
    assert.equal(evaluation.score, golden.score, id);
    assert.deepEqual(evaluation.objectives.map(item => item.score), golden.objectives, id);
    assert.equal(evaluation.target.black, golden.black, id);
    assert.equal(evaluation.target.peak, golden.peak, id);
  }
});

test('comparison view state is versioned with the session and survives replay', () => {
  let state = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'view-01' });
  assert.deepEqual(state.view, { compare: 'side', wipe: 0.5, scopeLayout: 'single', freeze: null });
  state = Practice.applyIntent(state, { type: 'set-compare', mode: 'wipe' });
  assert.equal(state.view.compare, 'wipe');
  assert.equal(state.splitView, true);
  state = Practice.applyIntent(state, { type: 'set-wipe', value: 2 });
  assert.equal(state.view.wipe, 0.95);
  state = Practice.applyIntent(state, { type: 'set-wipe', value: 0.333 });
  assert.equal(state.view.wipe, 0.33);
  state = Practice.applyIntent(state, { type: 'set-scope-layout', layout: 'quad' });
  state = Practice.applyIntent(state, { type: 'set-scope', scope: 'parade' });
  assert.deepEqual(Practice.applyIntent(state, { type: 'set-compare', mode: 'sideways' }), Practice.normalizeState(state), 'an unknown mode changes nothing');
  const replayed = Practice.applyIntent(state, { type: 'replay' });
  assert.equal(replayed.view.compare, 'wipe');
  assert.equal(replayed.view.scopeLayout, 'quad');
  assert.equal(replayed.scope, 'parade');
  const target = Practice.applyIntent(state, { type: 'set-compare', mode: 'target' });
  assert.equal(target.splitView, false);
  assert.equal(Practice.applyIntent(target, { type: 'set-split-view', value: true }).view.compare, 'side');
});

test('legacy split-view sessions map onto the comparison modes', () => {
  const single = Practice.normalizeState({ scenarioId: 'match-cameras', seed: 'split', splitView: false, selectedCameraId: 'camera-a' });
  assert.equal(single.view.compare, 'reference');
  assert.equal(single.splitView, false);
  const target = Practice.createPracticeState({ splitView: false });
  assert.equal(target.view.compare, 'target');
  const both = Practice.normalizeState({ splitView: true });
  assert.equal(both.view.compare, 'side');
});

test('freezing the reference stores a still that replay and exercise changes release', () => {
  let state = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'freeze-01' });
  state = Practice.applyIntent(state, { type: 'freeze-reference' });
  assert.equal(state.view.freeze.cameraId, 'camera-a');
  assert.deepEqual(state.view.freeze.controls, state.cameras[0].controls);
  state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-a', control: 'iris', value: 2 });
  const sources = Practice.comparisonSources(state);
  assert.equal(sources.left.frozen, true);
  assert.equal(Practice.getCamera(sources.left.state, 'camera-a').controls.iris, 0, 'the still keeps the frozen reference');
  assert.equal(Practice.getCamera(sources.right.state, 'camera-a').controls.iris, 2, 'scores still use the live cameras');
  assert.equal(Practice.applyIntent(state, { type: 'release-freeze' }).view.freeze, null);
  assert.equal(Practice.applyIntent(state, { type: 'replay' }).view.freeze, null);
});

test('fine and coarse steps, per-control reset, and camera reset stay inside documented ranges', () => {
  let state = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'steps-01' });
  const step = (control, direction, size) => { state = Practice.applyIntent(state, { type: 'step-control', cameraId: 'camera-b', control, direction, size }); return state.cameras[1].controls[control]; };
  assert.equal(step('iris', 1, 'fine'), 0.85);
  assert.equal(step('iris', 1, 'coarse'), 1.35);
  assert.equal(step('whiteBalance', -1, 'coarse'), 3600);
  assert.equal(step('gain', 1, 'coarse'), 6);
  for (let index = 0; index < 20; index += 1) step('gain', 1, 'coarse');
  assert.equal(state.cameras[1].controls.gain, 18);
  for (const [name, info] of Object.entries(Practice.CONTROL_INFO)) {
    const [min, max, precision] = Practice.CONTROL_LIMITS[name];
    assert.ok(info.fine >= precision && info.coarse > info.fine, name);
    assert.ok(info.summary.startsWith('Generally:') && info.simulation.startsWith('Here:') && info.caveat.length > 20, `${name} explains itself honestly`);
    assert.ok(info.fine < max - min);
  }
  state = Practice.applyIntent(state, { type: 'reset-control', cameraId: 'camera-b', control: 'gain' });
  assert.equal(state.cameras[1].controls.gain, 3, 'reset returns to the exercise start, not a hidden answer');
  state = Practice.applyIntent(state, { type: 'reset-camera', cameraId: 'camera-b' });
  assert.deepEqual(state.cameras[1].controls, Practice.startControls(state)['camera-b']);
  assert.deepEqual(Practice.applyIntent(state, { type: 'step-control', cameraId: 'camera-b', control: 'constructor', direction: 1 }), Practice.normalizeState(state), 'prototype keys are not controls');
  assert.equal(Practice.formatControl('iris', 0.8), '+0.80 stops');
  assert.equal(Practice.formatControl('pedestal', -4.5), '−4.5');
  assert.equal(Practice.formatControl('whiteBalance', 4100), '4100 K');
  assert.equal(Practice.formatControl('saturation', 1.28), '1.28×');
  assert.equal(Practice.formatControl('colorPhase', 24), '+24°');
});

test('scored checks are bounded, numbered, and cleared by replay', () => {
  let state = Practice.createPracticeState({ scenarioId: 'set-black-level', seed: 'checks-01' });
  assert.equal(Practice.debriefPractice(state), null);
  for (let index = 0; index < 25; index += 1) state = Practice.applyIntent(state, { type: 'score-check' });
  assert.equal(state.checks.length, Practice.LIMITS.checks);
  assert.equal(state.checks.at(-1).n, 25);
  assert.match(state.lastAction, /check 25 scored \d+/);
  assert.deepEqual(Practice.applyIntent(state, { type: 'replay' }).checks, []);
});

test('the debrief explains which change helped or hurt, and why', () => {
  let state = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'debrief-01' });
  state = Practice.applyIntent(state, { type: 'score-check' });
  let first = Practice.debriefPractice(state);
  assert.equal(first.baseline, 'the exercise start');
  assert.equal(first.changes.length, 0);
  state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-b', control: 'pedestal', value: 0 });
  state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-b', control: 'saturation', value: 1.8 });
  state = Practice.applyIntent(state, { type: 'score-check' });
  const debrief = Practice.debriefPractice(state);
  assert.equal(debrief.check, 2);
  assert.equal(debrief.baseline, 'check 1');
  const pedestal = debrief.changes.find(change => change.control === 'pedestal');
  const saturation = debrief.changes.find(change => change.control === 'saturation');
  assert.equal(pedestal.verdict, 'helped');
  assert.ok(pedestal.effects.some(effect => effect.label === 'Black floor' && effect.closer > 0), JSON.stringify(pedestal.effects));
  assert.match(pedestal.explanation, /black floor/i);
  assert.equal(saturation.verdict, 'hurt');
  assert.ok(saturation.effects.some(effect => effect.label === 'Saturation' && effect.closer < 0));
  assert.equal(debrief.objectives.length, 6);
  assert.ok(debrief.objectives.every(item => ['OK', 'WARN', 'CRIT'].includes(item.band)));
  assert.equal(typeof debrief.next.message, 'string');
  assert.equal(debrief.coach.length, 3);
});

test('the next correction follows each exercise’s teaching order without revealing values', () => {
  const first = id => Practice.nextCorrection(Practice.createPracticeState({ scenarioId: id, seed: 'coach-01' }));
  assert.equal(first('set-black-level').control, 'pedestal');
  assert.equal(first('set-black-level').direction, -1);
  assert.equal(first('neutralize-cast').control, 'whiteBalance');
  assert.equal(first('recover-highlights').control, 'iris');
  assert.equal(first('recover-highlights').direction, -1);
  for (const id of Object.keys(GOLDEN)) {
    const advice = first(id);
    assert.equal(advice.complete, false);
    assert.doesNotMatch(advice.message, /\d/, `${id} advice must not reveal a value: ${advice.message}`);
    assert.match(advice.message, /Camera B/);
  }
});

test('following the coaching completes every exercise for several seeds', () => {
  for (const seed of ['coach-01', 'show-42']) {
    for (const id of Object.keys(GOLDEN)) {
      const { state, advice } = followCoaching(Practice.createPracticeState({ scenarioId: id, seed }));
      const evaluation = Practice.evaluatePractice(state);
      assert.equal(evaluation.status, 'complete', `${id}/${seed} stalled at ${evaluation.score} after ${advice.map(item => item.control).join(', ')}`);
      assert.ok(advice.length <= 8, `${id}/${seed} needed ${advice.length} corrections`);
      assert.equal(Practice.nextCorrection(state).complete, true);
      assert.equal(Practice.exerciseStatus(state), 'OK');
    }
  }
});

test('troubleshooting faults are reversible, including legacy sessions without records', () => {
  let state = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'revert-01' });
  state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-b', control: 'gain', value: 1.5 });
  const before = state.cameras[1].controls;
  state = Practice.applyIntent(state, { type: 'inject-trouble', injectionId: 'clipped-highlights', cameraId: 'camera-b' });
  assert.deepEqual(state.injectionRecords.at(-1), { id: 'clipped-highlights', cameraId: 'camera-b', previous: { iris: before.iris, gain: 1.5 } });
  state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-b', control: 'pedestal', value: 2 });
  const reverted = Practice.applyIntent(state, { type: 'revert-injection' });
  assert.equal(reverted.cameras[1].controls.gain, 1.5);
  assert.equal(reverted.cameras[1].controls.iris, before.iris);
  assert.equal(reverted.cameras[1].controls.pedestal, 2, 'later work on other controls is kept');
  assert.deepEqual(reverted.injections, []);
  assert.deepEqual(reverted.injectionRecords, []);
  assert.match(reverted.lastAction, /reverted/);
  assert.deepEqual(Practice.applyIntent(reverted, { type: 'revert-injection' }), Practice.normalizeState(reverted), 'nothing left to revert');
  const legacy = Practice.normalizeState({ scenarioId: 'set-black-level', seed: 'legacy-fault', injections: ['lifted-blacks'], cameras: [{ id: 'camera-b', controls: { pedestal: 10 } }] });
  const legacyReverted = Practice.applyIntent(legacy, { type: 'revert-injection' });
  assert.equal(legacyReverted.cameras[1].controls.pedestal, 8, 'without a record the fault returns to the exercise start');
  assert.deepEqual(legacyReverted.injections, []);
});

test('simulated signal alerts put CRIT before WARN and flag a moved reference', () => {
  const start = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'alerts-01' });
  const alerts = Practice.signalAlerts(start);
  assert.equal(alerts[0].level, 'CRIT');
  assert.equal(alerts[0].code, 'clip');
  assert.match(alerts[0].detail, /generated samples/);
  const moved = Practice.applyIntent(Practice.injectTrouble(start, 'excessive-gain', 'camera-a'), { type: 'set-control', cameraId: 'camera-a', control: 'pedestal', value: -10 });
  const levels = Practice.signalAlerts(moved).map(alert => alert.level);
  assert.deepEqual([...levels].sort((a, b) => (a === 'CRIT' ? 0 : 1) - (b === 'CRIT' ? 0 : 1)), levels);
  assert.ok(Practice.signalAlerts(moved).some(alert => alert.code === 'reference-moved'));
  const matched = Practice.applyIntent(Practice.createPracticeState({ scenarioId: 'set-black-level', seed: 'alerts-02' }), { type: 'set-control', cameraId: 'camera-b', control: 'pedestal', value: 0 });
  assert.deepEqual(Practice.signalAlerts(matched), []);
});

test('workflow position and exercise status follow the operator through a run', () => {
  let state = Practice.createPracticeState({ scenarioId: 'set-black-level', seed: 'workflow-01', selectedCameraId: 'camera-a' });
  const current = () => Practice.workflowSteps(state).find(step => step.current).id;
  assert.equal(Practice.WORKFLOW.length, 8);
  assert.equal(current(), 'select');
  assert.equal(Practice.exerciseStatus(state), 'IDLE');
  state = Practice.applyIntent(state, { type: 'select-camera', cameraId: 'camera-b' });
  assert.equal(current(), 'adjust');
  state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-b', control: 'pedestal', value: 4 });
  assert.equal(current(), 'score');
  assert.equal(Practice.exerciseStatus(state), 'RUN');
  state = Practice.applyIntent(state, { type: 'score-check' });
  assert.equal(current(), 'review');
  state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-b', control: 'pedestal', value: 0 });
  state = Practice.applyIntent(state, { type: 'score-check' });
  assert.equal(current(), 'replay');
  assert.equal(Practice.exerciseStatus(state), 'OK');
  assert.ok(Practice.workflowSteps(state).slice(0, 7).every(step => step.done));
});

test('guided demonstrations sweep one control with before and after pictures', () => {
  const practice = Practice.applyIntent(Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'demo-01' }), { type: 'set-control', cameraId: 'camera-b', control: 'gamma', value: 1.3 });
  for (const control of Object.keys(Practice.CONTROL_LIMITS)) {
    const demo = Practice.applyIntent(practice, { type: 'start-demo', control });
    const values = demo.demo.steps.map(step => step.controls['camera-b'][control]);
    assert.equal(new Set(values).size, values.length, `${control} steps are distinct`);
    assert.equal(demo.demo.focus, control);
    assert.equal(demo.scope, Practice.CONTROL_INFO[control].scope);
    assert.ok(demo.demo.steps.slice(1).every(step => /generated 0–100 scale/.test(step.note)), control);
    assert.deepEqual(demo.demo.steps[0].controls['camera-a'], demo.demo.steps[0].controls['camera-b'], 'the baseline starts matched');
  }
  let demo = Practice.applyIntent(practice, { type: 'start-demo', control: 'pedestal' });
  demo = Practice.applyIntent(demo, { type: 'demo-goto', index: 2 });
  assert.equal(demo.cameras[1].controls.pedestal, 10);
  let sources = Practice.comparisonSources(demo);
  assert.equal(sources.mode, 'demo');
  assert.equal(Practice.getCamera(sources.left.state, 'camera-b').controls.pedestal, 0);
  demo = Practice.applyIntent(demo, { type: 'demo-compare-with', value: 'previous' });
  sources = Practice.comparisonSources(demo);
  assert.equal(Practice.getCamera(sources.left.state, 'camera-b').controls.pedestal, 5);
  assert.equal(Practice.demoStepModified(demo), false);
  demo = Practice.applyIntent(demo, { type: 'set-control', cameraId: 'camera-b', control: 'pedestal', value: 3 });
  assert.equal(Practice.demoStepModified(demo), true);
  demo = Practice.applyIntent(demo, { type: 'demo-update-step', recapture: true, note: 'Three is enough\n\n\n\nto see it' });
  assert.equal(demo.demo.steps[2].controls['camera-b'].pedestal, 3);
  assert.equal(demo.demo.steps[2].note, 'Three is enough\n\nto see it');
  const exited = Practice.applyIntent(demo, { type: 'exit-demo' });
  assert.equal(exited.demo, null);
  assert.equal(exited.cameras[1].controls.gamma, 1.3, 'leaving the demonstration restores the practice work');
});

test('instructor sequences capture, bound, remove, and replay exact states', () => {
  let state = Practice.createPracticeState({ scenarioId: 'neutralize-cast', seed: 'instructor-01' });
  state = Practice.applyIntent(state, { type: 'demo-capture', label: 'Start\u202e', note: 'Warm cast', title: 'White balance lesson' });
  assert.equal(state.demo.title, 'White balance lesson');
  assert.equal(state.demo.steps[0].label, 'Start');
  for (let index = 0; index < 30; index += 1) {
    state = Practice.applyIntent(state, { type: 'set-control', cameraId: 'camera-b', control: 'whiteBalance', value: 5600 - index * 100 });
    state = Practice.applyIntent(state, { type: 'demo-capture' });
  }
  assert.equal(state.demo.steps.length, Practice.LIMITS.demoSteps);
  assert.match(state.lastAction, /holds 24 steps/);
  state = Practice.applyIntent(state, { type: 'demo-goto', index: 3 });
  const removed = Practice.applyIntent(state, { type: 'demo-remove-step' });
  assert.equal(removed.demo.steps.length, 23);
  assert.equal(removed.demo.index, 3);
  const restored = Practice.importPracticeJSON(Practice.exportPracticeJSON(removed));
  assert.deepEqual(restored, removed);
  const one = Practice.applyIntent(Practice.createPracticeState(), { type: 'demo-capture' });
  assert.equal(Practice.applyIntent(one, { type: 'demo-remove-step' }).demo.steps.length, 1, 'a sequence keeps at least one step');
});

test('imports stay bounded, reject prototype keys, and strip unsafe text', () => {
  const hostile = Practice.normalizeState({
    scenarioId: 'constructor', seed: 'x'.repeat(500), selectedCameraId: '__proto__', scope: 'toString',
    injections: ['constructor', '__proto__', 'hasOwnProperty', 'warm-cast'],
    injectionRecords: [{ id: 'constructor', cameraId: 'camera-b' }, { id: 'warm-cast', cameraId: 'camera-b', previous: { whiteBalance: 'NaN', __proto__: { polluted: true } } }],
    cameras: [{ id: 'camera-b', controls: { constructor: 5, iris: '1.234', gain: Number.NaN } }],
    view: { compare: 'constructor', wipe: 'Infinity', scopeLayout: '__proto__', freeze: { cameraId: 'camera-z' } },
    checks: Array.from({ length: 50 }, (_, index) => ({ n: index + 1, controls: {} })),
    demo: { title: '<img src=x onerror=alert(1)>\u0007', steps: Array.from({ length: 40 }, () => ({ label: 'x'.repeat(200), note: 'n'.repeat(900), scope: 'bogus' })), index: 999 },
    lastAction: 'Loaded\u0000\u202e'
  });
  assert.equal(hostile.scenarioId, 'match-cameras');
  assert.equal(hostile.seed.length, 80);
  assert.equal(hostile.selectedCameraId, 'camera-b');
  assert.equal(hostile.scope, 'waveform');
  assert.deepEqual(hostile.injections, ['warm-cast']);
  assert.deepEqual(hostile.injectionRecords, [{ id: 'warm-cast', cameraId: 'camera-b', previous: { whiteBalance: 5600 } }]);
  assert.equal(hostile.cameras[1].controls.iris, 1.25);
  assert.equal(hostile.cameras[1].controls.gain, 0);
  assert.equal(Object.hasOwn(hostile.cameras[1].controls, 'constructor'), false);
  assert.deepEqual(hostile.view, { compare: 'side', wipe: 0.5, scopeLayout: 'single', freeze: null });
  assert.equal(hostile.checks.length, Practice.LIMITS.checks);
  assert.equal(hostile.demo.steps.length, Practice.LIMITS.demoSteps);
  assert.equal(hostile.demo.index, Practice.LIMITS.demoSteps - 1);
  assert.ok(hostile.demo.steps.every(step => step.label.length <= Practice.LIMITS.label && step.note.length <= Practice.LIMITS.note && step.scope === 'waveform'));
  assert.equal(hostile.demo.title, '<img src=x onerror=alert(1)>', 'text is kept as plain text for textContent rendering');
  assert.equal(hostile.lastAction, 'Loaded');
  assert.equal({}.polluted, undefined);
  assert.throws(() => Practice.importPracticeJSON('x'.repeat(400001)), /too large/);
  assert.throws(() => Practice.importPracticeJSON(JSON.stringify({ kind: 'shader-camera-practice-session', schema: 'shader.camera-practice.v1', schemaVersion: 1, state: 'nope' })), /must use/);
  assert.throws(() => Practice.importPracticeJSON(JSON.stringify({ kind: 'shader-camera-practice-session', schema: 'shader.camera-practice.v1', schemaVersion: 2, state: {} })), /must use/);
  assert.doesNotThrow(() => Practice.createPracticeState({ scenarioId: 'toString' }));
  assert.doesNotThrow(() => Practice.applyIntent(Practice.createPracticeState(), { type: 'load-scenario', scenarioId: '__proto__' }));
});

test('version 1 exports without the new fields still import, and new exports keep every v1 field', () => {
  const v1 = {
    kind: 'shader-camera-practice-session', schema: 'shader.camera-practice.v1', schemaVersion: 1, exportedAt: null,
    state: { schema: 'shader.camera-practice.v1', schemaVersion: 1, scenarioId: 'recover-highlights', seed: 'v1-file', attempt: 3, selectedCameraId: 'camera-a', splitView: false, scope: 'histogram', cameras: [{ id: 'camera-b', controls: { iris: 1, gain: 0 } }], injections: ['excessive-gain'], lastAction: 'Old file' }
  };
  const restored = Practice.importPracticeJSON(JSON.stringify(v1));
  assert.equal(restored.view.compare, 'reference');
  assert.equal(restored.scope, 'histogram');
  assert.equal(restored.cameras[1].controls.iris, 1);
  assert.deepEqual(restored.checks, []);
  assert.equal(restored.demo, null);
  const exported = JSON.parse(Practice.exportPracticeJSON(restored));
  assert.equal(exported.schemaVersion, 1);
  for (const key of ['schema', 'schemaVersion', 'scenarioId', 'seed', 'attempt', 'selectedCameraId', 'splitView', 'scope', 'cameras', 'injections', 'lastAction']) {
    assert.ok(Object.hasOwn(exported.state, key), `v1 readers need ${key}`);
  }
  assert.equal(typeof exported.state.splitView, 'boolean');
});

test('analyses of the same camera state are shared and stay distinct across seeds', () => {
  const state = Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'cache-01' });
  const first = Practice.analyzeCamera(state, 'camera-b', { width: 96, height: 54 });
  const again = Practice.analyzeCamera(JSON.parse(JSON.stringify(state)), 'camera-b', { width: 96, height: 54 });
  assert.equal(first, again);
  const other = Practice.analyzeCamera(Practice.createPracticeState({ scenarioId: 'match-cameras', seed: 'cache-02' }), 'camera-b', { width: 96, height: 54 });
  assert.notDeepEqual(first.samples, other.samples);
  assert.equal(first.samples.length, 96 * 54);
  assert.ok(Math.abs(Practice.lumaOf([1, 1, 1]) - 1) < 1e-12);
  assert.equal(Practice.lumaOf([2, 2, 2]), 1);
});
