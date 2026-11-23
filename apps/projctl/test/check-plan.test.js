import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckPlan, CHECK_ORDER } from '../server/check-plan.js';

function snapshot() {
  return { schema: 'projctl.check-snapshot.v1', nowMs: 2000000, mode: 'startup', windowReleased: true,
    manualTestCard: true, finishProfile: { A: 'closed', B: 'closed', C: 'open', D: 'closed' },
    lanes: CHECK_ORDER.map(id => ({ id, observedAtMs: 2000000, stateSinceMs: 1980000, power: 'off', lampError: 0 })) };
}
test('plans startup order with overlapping warmup constraints and no execution', () => {
  const input = snapshot(), before = JSON.stringify(input), p = buildCheckPlan(input);
  assert.deepEqual(p.steps.map(s => s.id), ['C', 'B', 'A', 'D']);
  assert.ok(p.steps.every(s => s.action === 'propose-start' && !s.retry));
  assert.equal(p.steps[0].waits.at(-1).minimumMs, 1200000);
  assert.equal(p.steps[2].waits[0].minimumMs, 55000);
  assert.equal(p.executable, false); assert.equal(p.showReady, false);
  assert.equal(JSON.stringify(input), before);
});
test('missing release, test card and finish state remain blockers', () => {
  const s = snapshot(); delete s.windowReleased; delete s.manualTestCard; delete s.finishProfile;
  assert.equal(buildCheckPlan(s).blockers.length, 3);
});
test('cooling, fault, stale and missing lanes cannot propose starts', () => {
  const s = snapshot(); s.lanes[0].power = 'cooling'; s.lanes[1].observedAtMs = 0; s.lanes[2].lampError = 2; s.lanes.pop();
  assert.ok(buildCheckPlan(s).steps.every(x => x.action === 'hold' && x.reasons.length));
});
test('already on skips power and accounts for warmup and newer start command', () => {
  const s = snapshot(); s.lanes.forEach(x => Object.assign(x, { power: 'on', stateSinceMs: 1000000, lastStartAtMs: 1990000 }));
  const p = buildCheckPlan(s);
  assert.ok(p.steps.every(x => x.action === 'keep-on'));
  assert.equal(p.steps[0].waits[0].minimumMs, 200000);
  assert.equal(p.steps[2].waits[1].minimumMs, 50000);
});
test('picture mode never powers off units on, unknown elapsed time stays unqualified', () => {
  const s = snapshot(); s.mode = 'picture'; assert.ok(buildCheckPlan(s).steps.every(x => x.action === 'hold'));
  s.lanes.forEach(x => { x.power = 'on'; delete x.stateSinceMs; });
  assert.ok(buildCheckPlan(s).steps.every(x => x.reasons.length && !x.proposedEvidence.length));
});
test('rejects duplicate lanes, future/stale timestamps and unknown input', () => {
  assert.throws(() => buildCheckPlan({}));
  const s = snapshot(); s.lanes[1].id = 'C'; assert.throws(() => buildCheckPlan(s), /duplicate/);
  const f = snapshot(); f.lanes[0].observedAtMs++; assert.equal(buildCheckPlan(f).steps[0].action, 'hold');
});
test('deep standby is held and observe mode contains no equipment proposals', () => {
  const s = snapshot(); s.lanes[0].rawState = 'eco'; assert.equal(buildCheckPlan(s).steps[0].action, 'hold');
  s.mode = 'observe'; assert.ok(buildCheckPlan(s).steps.every(x => x.action === 'observe'));
});
