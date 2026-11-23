import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateShutterEvidence } from '../server/shutter-evidence.js';
function sample() {
  const f = (i, value) => ({ id: `f${i}`, capturedAtMs: 1000 + i * 100, viewRevision: 'fixed', exposureRevision: 'manual', unobscured: true, exposureStable: true, rgb: [value, value, value, 10, 10, 10] });
  return { schema: 'projctl.shutter-input.v1', lane: 'C', profile: { revision: 'synthetic', width: 2, height: 1, viewRevision: 'fixed', exposureRevision: 'manual', targetMask: [0], controlMask: [1], minimumDelta: 30, maximumControlDelta: 10, maximumResidualDelta: 5, maximumSpanMs: 2000 },
    baseline: f(0, 10), openFrames: [1, 2, 3].map(i => f(i, 80)), closedFrames: [4, 5, 6].map(i => f(i, 10)) };
}
test('isolated open and close responses produce optical candidates without readiness claims', () => {
  const s = sample(), before = JSON.stringify(s), r = evaluateShutterEvidence(s);
  assert.equal(r.result, 'candidate optical response'); assert.equal(r.showReady, false); assert.equal(r.restoration, 'not verified'); assert.equal(JSON.stringify(s), before);
});
test('missing light and failure to return to baseline remain mismatches', () => {
  for (const change of [s => { s.openFrames[0].rgb[0] = 0; s.openFrames[0].rgb[1] = 0; s.openFrames[0].rgb[2] = 0; }, s => { s.closedFrames[0].rgb = s.openFrames[0].rgb; }]) {
    const s = sample(); change(s); assert.equal(evaluateShutterEvidence(s).result, 'candidate mismatch');
  }
});
test('camera movement, contamination, duplicate, stale, occluded and missing evidence stay unverified', () => {
  for (const change of [s => { s.openFrames.pop(); }, s => { s.openFrames[0].viewRevision = 'moved'; }, s => { s.openFrames[0].rgb[3] = 200; },
    s => { s.closedFrames[1].id = s.openFrames[0].id; }, s => { s.closedFrames[2].capturedAtMs = 9999; }, s => { s.baseline.unobscured = false; }]) {
    const s = sample(); change(s); assert.equal(evaluateShutterEvidence(s).result, 'unable to verify');
  }
});
test('invalid masks and dimensions are rejected', () => {
  const s = sample(); s.profile.targetMask = [1]; assert.throws(() => evaluateShutterEvidence(s), /masks/);
});
