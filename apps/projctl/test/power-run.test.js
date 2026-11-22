// The all-four power run: one run in the relay, one shared state, a fixed unit order with the
// waits inside it, at most one command per projector, and a banner only when every lane's own
// reply supports it. A fake clock and stand-in projectors; nothing here reaches hardware.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createPowerRun, RUN_ORDER, RUN_BANNER, RUN_RULES } from '../server/power-run.js';
import { startRelay, until } from './relay-helper.js';

const T0 = Date.parse('2026-11-18T23:00:00Z');
const settle = () => delay(0); // let a sent command's promise resolve
// The rig as the run sees it: C is the laser unit on its own driver, B a laser Panasonic, A and D lamp Panasonics.
// aged: the relay has been watching these units for ten minutes, so no state counts as just entered.
// extra: more status fields per slot (rawState, lightHours, errors). asked: the fresh reads the run asked for.
function bench({ power = {}, refuse = {}, lock = false, file = null, react = true, aged = true, extra = {} } = {}) {
  const b = { t: T0, T: T0, sent: [], asked: [], lock, changes: [], refuse, extra,
    projectors: [
      { slot: 'P1', lane: 'C', driver: 'pulse', ip: 'c', model: 'UDM 4K22' }, { slot: 'P2', lane: 'B', driver: 'panasonic', ip: 'b', model: 'PT-RZ970' },
      { slot: 'P3', lane: 'A', driver: 'panasonic', ip: 'a', model: 'PT-DW830U' }, { slot: 'P4', lane: 'D', driver: 'panasonic', ip: 'd', model: 'PT-DW830U' }],
    state: { P1: 'off', P2: 'off', P3: 'off', P4: 'off', ...power }, silent: new Set() };
  b.slot = lane => b.projectors.find(p => p.lane === lane).slot;
  b.run = createPowerRun({
    projectors: () => b.projectors, locked: () => b.lock, revision: p => `${p.slot}:${p.ip}:${p.model}`, now: () => b.t, file, interval: () => null, clearTimer: () => {},
    status: slot => ({ power: b.state[slot], ...b.extra[slot], online: !b.silent.has(slot), connection: { state: b.silent.has(slot) ? 'reconnecting' : 'online', lastSuccessAt: new Date(b.silent.has(slot) ? b.t - 600000 : b.t - 1000).toISOString() } }),
    refresh: async slot => { b.asked.push([slot, b.t - b.T]); },
    power: async (slot, on) => { b.sent.push([slot, on ? 'on' : 'off', b.t - b.T]); if (b.refuse[slot]) throw new Error(b.refuse[slot]); if (react) b.state[slot] = on ? 'warming' : 'cooling'; },
    changed: view => b.changes.push(view) });
  if (aged) { b.run.observe(); b.t += 600000; b.T = b.t; }
  b.go = async direction => { const reply = b.run.start(direction, b.run.plan(direction).confirm); await settle(); return reply; };
  b.step = async (ms = 500) => { b.t += ms; b.run.tick(); await settle(); };
  b.steps = () => Object.fromEntries(b.run.view().run.steps.map(step => [step.lane, step]));
  b.states = () => b.run.view().run.steps.map(step => `${step.lane}:${step.state}`).join(' ');
  return b;
}

test('the order, the banners and the waits are fixed in one place', () => {
  assert.deepEqual(RUN_ORDER, { on: ['C', 'B', 'A', 'D'], off: ['A', 'D', 'B', 'C'] });
  assert.deepEqual(RUN_BANNER, { on: 'All four on', off: 'Safe to leave the building' });
  assert.deepEqual([RUN_RULES.quietAfterLitMs, RUN_RULES.relightMs, RUN_RULES.planMs], [60000, 75000, 10000]);
  // From the rig's daily order of operations (researched, not yet tested on a rig).
  assert.deepEqual([RUN_RULES.readEveryMs, RUN_RULES.staggerMs, RUN_RULES.lampWatchMs, RUN_RULES.lampRetries, RUN_RULES.settleMs.off], [10000, 10000, 180000, 1, 240000]);
});

test('an on run goes C, B, A, then D about 10 s after A, and says "All four on" only once the lamps have stayed lit 3 minutes', async () => {
  const b = bench({ extra: { P3: { lightHours: 1234, errors: { lamp: 0 } } } });
  const plan = b.run.plan('on');
  assert.deepEqual(plan.steps.map(step => [step.lane, step.intent, step.slot]), [['C', 'send', 'P1'], ['B', 'send', 'P2'], ['A', 'send', 'P3'], ['D', 'send', 'P4']]);
  assert.deepEqual([plan.banner, plan.expiresInMs, typeof plan.confirm], ['All four on', 10000, 'string']);
  assert.deepEqual(b.sent, [], 'a plan sends nothing');
  const started = b.run.start('on', plan.confirm);
  await settle();
  assert.deepEqual([started.active, started.run.direction, started.run.state], [true, 'on', 'running']);
  assert.deepEqual(b.sent.map(item => item[0]), ['P1'], 'C first, and only C');
  await b.step();                                    // C reports WARMING: the laser unit does not hold the line
  assert.deepEqual(b.sent.map(item => item[0]), ['P1', 'P2']);
  await b.step();
  assert.deepEqual(b.sent.map(item => item[0]), ['P1', 'P2', 'P3']);
  const aSent = b.sent[2][2];
  // A is a lamp unit: D goes about 10 s after A's on command, without waiting for A to light.
  for (let i = 0; i < 8; i++) await b.step(1000);
  assert.deepEqual(b.sent.map(item => item[0]), ['P1', 'P2', 'P3'], 'D waits out the 10 s');
  assert.deepEqual(b.steps().A.state, 'watching');
  assert.match(b.steps().A.note, /^Sent\. Nothing more to it for \d+ s$/);
  for (let i = 0; i < 3; i++) await b.step(1000);
  assert.deepEqual(b.sent.map(item => [item[0], item[1]]), [['P1', 'on'], ['P2', 'on'], ['P3', 'on'], ['P4', 'on']]);
  assert.ok(b.sent[3][2] - aSent >= 10000 && b.sent[3][2] - aSent <= 11000, 'D about 10 s after A');
  // Every unit has had its command. C and B light; the lamps light but are watched for 3 minutes.
  b.state.P1 = 'on'; b.state.P2 = 'on'; b.state.P3 = 'on'; b.state.P4 = 'on';
  for (let i = 0; i < 175; i++) await b.step(1000);
  let view = b.run.view();
  assert.deepEqual([view.active, view.run.banner, b.steps().A.state, b.steps().D.state], [true, null, 'reported', 'watching'], 'A has stayed lit 3 minutes; D has not yet');
  assert.equal(b.steps().A.note, 'Reported ON and stayed on for 3 minutes. Lamp hours 1234; no lamp error.');
  assert.match(b.steps().D.note, /^Reports ON\. Watching the lamp for \d+ s more; lamp state not reported$/);
  for (let i = 0; i < 12; i++) await b.step(1000);
  view = b.run.view();
  assert.deepEqual([view.active, view.run.state, view.run.banner, view.run.message], [false, 'done', 'All four on', 'Every lane reports ON.']);
  assert.equal(b.sent.length, 4, 'one command per unit');
  assert.equal(b.states(), 'C:reported B:reported A:reported D:reported');
  // Nothing at all, not even a read from the run, reached a lamp unit in the minute after its on command.
  for (const [slot, sentAt] of [['P3', aSent], ['P4', b.sent[3][2]]]) {
    assert.equal(b.asked.some(([asked, at]) => asked === slot && at > sentAt && at < sentAt + 60000), false, `${slot} left alone for 60 s`);
    assert.ok(b.asked.some(([asked, at]) => asked === slot && at >= sentAt + 60000), `${slot} read after its quiet minute`);
  }
  assert.equal(JSON.stringify(view).includes('identity'), false, 'pages do not get the relay\'s bookkeeping');
  assert.ok(b.changes.length > 4 && b.changes.at(-1).run.banner === 'All four on', 'every page is told as the run moves');
});

test('an off run starts the lamp units first, sends one command each, and waits for OFF before it says safe', async () => {
  const b = bench({ power: { P1: 'on', P2: 'on', P3: 'on', P4: 'on' } });
  await b.go('off');
  for (let i = 0; i < 4; i++) await b.step();
  assert.deepEqual(b.sent.map(item => [item[0], item[1]]), [['P3', 'off'], ['P4', 'off'], ['P2', 'off'], ['P1', 'off']], 'A, D, B, C');
  assert.ok(b.sent[3][2] - b.sent[0][2] <= 5000, 'the lamp units cool while the others go down');
  assert.equal(b.states(), 'A:reported D:reported B:reported C:reported');
  assert.equal(b.steps().A.note, 'Reported COOLING');
  // Cooling is not off. Three minutes later the lamp units are still cooling and nothing is sent again.
  b.state.P2 = 'off'; b.state.P1 = 'off';
  for (let i = 0; i < 180; i++) await b.step(1000);
  let view = b.run.view();
  assert.deepEqual([view.active, view.run.banner, view.run.message, b.sent.length], [true, null, 'Waiting for A, D to report OFF', 4]);
  const reads = b.asked.filter(([slot]) => slot === 'P3').map(([, at]) => at);
  assert.ok(reads.length >= 17 && reads.every((at, i) => i === 0 || at - reads[i - 1] >= 10000), 'A is read every 10 s while the run waits for OFF');
  b.state.P3 = 'off'; b.state.P4 = 'off';
  await b.step();
  view = b.run.view();
  assert.deepEqual([view.run.state, view.run.banner, view.run.message], ['done', 'Safe to leave the building', 'Every lane reports OFF.']);
  assert.equal(b.sent.length, 4, 'the laser unit got exactly one off');
});

test('a unit already in the target state is read and skipped, not commanded', async () => {
  const b = bench({ power: { P1: 'on', P2: 'warming', P3: 'off', P4: 'on' } });
  assert.deepEqual(b.run.plan('on').steps.map(step => [step.lane, step.intent, step.note]), [['C', 'already', 'Already ON'], ['B', 'already', 'Already WARMING'], ['A', 'send', 'Power on'], ['D', 'already', 'Already ON']]);
  await b.go('on');
  for (let i = 0; i < 4; i++) await b.step();
  assert.deepEqual(b.sent.map(item => item[0]), ['P3']);
  assert.deepEqual([b.steps().C.state, b.steps().C.note, b.steps().B.note], ['already', 'Already ON. Nothing sent.', 'Already WARMING. Nothing sent.']);
  // Nothing to do at all still ends with the banner, because the banner is about what the lanes report.
  const idle = bench({ power: { P1: 'off', P2: 'off', P3: 'off', P4: 'off' } });
  await idle.go('off');
  for (let i = 0; i < 5; i++) await idle.step();
  assert.deepEqual([idle.sent, idle.run.view().run.banner], [[], 'Safe to leave the building']);
});

test('nothing is sent to a Panasonic for 60 seconds after it lights; the other driver is not held', async () => {
  const b = bench({ power: { P1: 'off', P2: 'off', P3: 'off', P4: 'off' } });
  b.run.observe();
  b.t += 200000; b.state.P1 = 'on'; b.state.P2 = 'on'; b.state.P3 = 'on'; b.state.P4 = 'on'; b.run.observe(); // all four light now
  b.t += 20000;                                                                                              // 20 s later someone asks for off
  assert.deepEqual(b.run.plan('off').steps.map(step => [step.lane, step.intent]), [['A', 'hold'], ['D', 'hold'], ['B', 'hold'], ['C', 'send']]);
  assert.equal(b.run.plan('off').steps[0].note, 'Lit 20 s ago. Waiting 40 s before any command');
  await b.go('off');
  for (let i = 0; i < 30; i++) await b.step(1000);
  assert.deepEqual([b.sent, b.steps().A.state, b.steps().A.note], [[], 'checking', 'Lit 50 s ago. Waiting 10 s before any command'], 'the run keeps its order and waits');
  for (let i = 0; i < 12; i++) await b.step(1000);
  assert.equal(b.sent[0][0], 'P3');
  assert.ok(b.sent[0][2] >= 200000 + 60000, 'A got its off no sooner than 60 s after it lit');
  for (let i = 0; i < 6; i++) await b.step(1000);
  assert.deepEqual(b.sent.map(item => item[0]), ['P3', 'P4', 'P2', 'P1']);
});

test('a lamp unit is not relit while cooling, nor inside 75 seconds of going off', async () => {
  const b = bench({ power: { P1: 'on', P2: 'on', P3: 'cooling', P4: 'off' }, aged: false });
  b.run.observe();                 // D is first seen OFF now, so its 75 s count from here
  b.t += 30000;
  const plan = b.run.plan('on');
  assert.deepEqual(plan.steps.map(step => [step.lane, step.intent, step.note]).slice(2), [['A', 'hold', 'Cooling. Waiting for it to finish before power on'], ['D', 'hold', 'Went off 30 s ago. Waiting 45 s before relight']]);
  b.run.start('on', plan.confirm); await settle();
  for (let i = 0; i < 60; i++) await b.step(1000);
  assert.deepEqual([b.sent, b.steps().A.state], [[], 'checking'], 'A is still cooling a minute later: nothing sent');
  b.state.P3 = 'off';              // cooling finishes now; the 75 s for A start here
  for (let i = 0; i < 70; i++) await b.step(1000);
  assert.deepEqual(b.sent, []);
  assert.match(b.steps().A.note, /^Went off \d+ s ago\. Waiting \d+ s before relight$/);
  for (let i = 0; i < 8; i++) await b.step(1000);
  assert.deepEqual(b.sent.map(item => item[0]), ['P3']);
  for (let i = 0; i < 11; i++) await b.step(1000);
  assert.deepEqual(b.sent.map(item => item[0]), ['P3', 'P4'], 'D had been off long enough by then, and goes about 10 s after A');
  // A laser Panasonic has no relight wait.
  const laser = bench({ power: { P1: 'on', P2: 'off', P3: 'on', P4: 'on' }, aged: false });
  laser.run.observe(); laser.t += 5000;
  assert.deepEqual(laser.run.plan('on').steps.map(step => step.intent), ['already', 'send', 'already', 'already']);
});

test('a unit with no current reply gets nothing, the run goes on, and there is no banner', async () => {
  const b = bench({ power: { P1: 'on', P2: 'on', P3: 'on', P4: 'on' } });
  b.t += 120000; b.run.observe();
  b.silent.add('P4');
  assert.deepEqual(b.run.plan('off').steps.map(step => [step.lane, step.intent])[1], ['D', 'no-reply']);
  await b.go('off');
  for (let i = 0; i < 50; i++) await b.step();
  assert.deepEqual(b.sent.map(item => item[0]), ['P3', 'P2', 'P1'], 'D was never commanded');
  assert.deepEqual([b.steps().D.state, b.steps().D.note], ['failed', 'No current reply. Nothing sent.']);
  b.state.P3 = 'off'; b.state.P2 = 'off'; b.state.P1 = 'off';
  for (let i = 0; i < 800; i++) await b.step(1000);
  const view = b.run.view();
  assert.deepEqual([view.active, view.run.state, view.run.banner], [false, 'attention', null]);
  assert.equal(view.run.message, 'Not confirmed OFF: D (no current reply). Check by eye.');
});

test('a refused command is shown in the relay\'s words and never sent twice; a silent one is "check by eye"', async () => {
  const b = bench({ refuse: { P2: 'P2: no fresh projector reply. Wait for reconnection.' }, react: false });
  await b.go('on');
  b.state.P1 = 'warming';
  for (let i = 0; i < 4; i++) await b.step();
  assert.deepEqual([b.steps().B.state, b.steps().B.note], ['failed', 'Not done: P2: no fresh projector reply. Wait for reconnection.']);
  for (let i = 0; i < 11; i++) await b.step(1000);
  b.state.P1 = 'on'; b.state.P4 = 'on';
  // A accepted the command but never reports: it is watched for 3 minutes, then the run says so.
  for (let i = 0; i < 200; i++) await b.step(1000);
  assert.deepEqual([b.steps().A.state, b.steps().A.note], ['unreported', 'Sent, not confirmed: reports OFF after 3 minutes. Check by eye.']);
  for (let i = 0; i < 700; i++) await b.step(1000);
  assert.deepEqual(b.sent.map(item => item[0]), ['P1', 'P2', 'P3', 'P4'], 'each unit was asked once, the refused one included');
  assert.deepEqual([b.run.view().run.state, b.run.view().run.banner], ['attention', null]);
  assert.match(b.run.view().run.message, /^Not confirmed ON: B \(reports OFF\), A \(reports OFF\)\. Check by eye\.$/);
});

test('a second press from any page meets the run in progress and never starts another', async () => {
  const b = bench();
  await b.go('on');
  const first = b.run.view().run.id;
  for (const attempt of [() => b.run.plan('on'), () => b.run.plan('off'), () => b.run.start('off', 'anything')]) {
    assert.throws(attempt, error => error.status === 409 && error.message === 'A run is already in progress.' && error.run.run.id === first && error.run.active === true);
  }
  assert.equal(b.sent.length, 1);
  // Stop sends nothing more and says so; a new run can then be reviewed.
  const stopped = b.run.stop();
  assert.deepEqual([stopped.active, stopped.run.state, stopped.run.message], [false, 'stopped', 'Stopped from a page. Nothing more was sent. Check each lane.']);
  for (let i = 0; i < 10; i++) await b.step();
  assert.equal(b.sent.length, 1);
  assert.equal(typeof b.run.plan('off').confirm, 'string');
});

test('Show Lock refuses an off run and stops one under way; an on run is allowed, as power on always is', async () => {
  const b = bench({ lock: true, power: { P1: 'on', P2: 'on', P3: 'on', P4: 'on' } });
  assert.throws(() => b.run.plan('off'), error => error.status === 423 && error.message === 'show lock is on');
  b.lock = false;
  const plan = b.run.plan('off');
  b.lock = true;
  assert.throws(() => b.run.start('off', plan.confirm), error => error.status === 423);
  b.lock = false;
  await b.go('off');
  b.lock = true;
  await b.step();
  assert.deepEqual([b.run.view().run.state, b.run.view().run.message, b.sent.length], ['stopped', 'Stopped: Show Lock was turned on. Nothing more was sent. Check each lane.', 1]);
  // Morning with Show Lock still on from the night before: the on run goes ahead.
  const morning = bench({ lock: true });
  assert.equal(typeof morning.run.plan('on').confirm, 'string');
  await morning.go('on');
  await morning.step();
  assert.deepEqual([morning.run.view().run.state, morning.sent.length], ['running', 2]);
});

test('the confirm is one use, short lived, and bound to the direction and the projectors it was shown for', async () => {
  const b = bench();
  assert.throws(() => b.run.plan('sideways'), error => error.status === 400);
  assert.throws(() => b.run.start('on', 'made-up'), error => error.status === 409 && error.message === 'Confirm expired. Review the run again.');
  let plan = b.run.plan('on');
  assert.throws(() => b.run.start('off', plan.confirm), error => error.status === 409, 'a plan for on does not start an off run');
  assert.throws(() => b.run.start('on', plan.confirm), error => error.status === 409, 'and it was used up by that attempt');
  plan = b.run.plan('on');
  b.t += 10001;
  assert.throws(() => b.run.start('on', plan.confirm), error => error.message === 'Confirm expired. Review the run again.');
  plan = b.run.plan('on');
  b.projectors[2].ip = 'somewhere-else';
  assert.throws(() => b.run.start('on', plan.confirm), error => error.message === 'Projector configuration changed. Review the run again.');
  assert.deepEqual(b.sent, []);
  // A lane with no projector cannot be part of "all four".
  const three = bench();
  three.projectors[3].lane = '';
  assert.deepEqual(three.run.plan('on').steps[3], { lane: 'D', surface: 'SR Portal', slot: null, model: '', intent: 'none', note: 'No projector on this lane' });
  await three.go('on');
  for (let i = 0; i < 400; i++) { await three.step(1000); for (const slot of ['P1', 'P2', 'P3']) if (three.state[slot] === 'warming') three.state[slot] = 'on'; }
  assert.deepEqual([three.run.view().run.state, three.run.view().run.banner, three.run.view().run.message], ['attention', null, 'Not confirmed ON: D (no projector). Check by eye.']);
  assert.deepEqual(three.sent.map(item => item[0]), ['P1', 'P2', 'P3']);
});

test('a unit read in its end state stays confirmed if it then stops answering', async () => {
  const b = bench({ power: { P1: 'on', P2: 'on', P3: 'on', P4: 'on' } });
  b.t += 120000; b.run.observe();
  await b.go('off');
  for (let i = 0; i < 4; i++) await b.step();
  b.state.P1 = 'off';
  await b.step();
  b.silent.add('P1');             // the resting laser unit drops off the network
  b.state.P2 = 'off'; b.state.P3 = 'off'; b.state.P4 = 'off';
  for (let i = 0; i < 3; i++) await b.step();
  assert.deepEqual([b.run.view().run.state, b.run.view().run.banner], ['done', 'Safe to leave the building']);
});

test('morning: a lamp that shuts itself off is retried once after OFF plus 75 s, then the run stops and alerts', async () => {
  const b = bench();
  await b.go('on');
  for (let i = 0; i < 2; i++) await b.step();
  const aSent = b.sent.find(item => item[0] === 'P3')[2];
  b.state.P1 = 'on'; b.state.P2 = 'on'; b.state.P3 = 'on';
  for (let i = 0; i < 12; i++) await b.step(1000);
  b.state.P4 = 'on';
  for (let i = 0; i < 80; i++) await b.step(1000);
  b.state.P3 = 'cooling';                             // 93 s after its on command, A turns itself off
  await b.step(1000);
  assert.equal(b.steps().A.state, 'fault');
  assert.match(b.steps().A.note, /^Lamp fault: it turned itself off \d+ s after the on command\. Waiting for OFF, then 75 s, then one retry\. Photograph any lamp message\.$/);
  // Never an on while it reads COOLING, however long that takes.
  for (let i = 0; i < 150; i++) await b.step(1000);
  assert.equal(b.sent.filter(item => item[0] === 'P3').length, 1, 'nothing sent while cooling');
  b.state.P3 = 'off';
  for (let i = 0; i < 70; i++) await b.step(1000);
  assert.equal(b.sent.filter(item => item[0] === 'P3').length, 1, 'and not inside 75 s of OFF');
  assert.match(b.steps().A.note, /^Lamp fault\. Reads OFF; one retry in \d+ s\. Photograph any lamp message\.$/);
  for (let i = 0; i < 8; i++) await b.step(1000);
  const retries = b.sent.filter(item => item[0] === 'P3');
  assert.equal(retries.length, 2, 'one retry');
  assert.ok(retries[1][2] - aSent >= 93000 + 150000 + 75000, 'the retry waited for OFF plus 75 s');
  assert.equal(b.steps().A.state, 'watching');
  b.state.P3 = 'on';
  for (let i = 0; i < 70; i++) await b.step(1000);
  b.state.P3 = 'cooling';                             // and again
  for (let i = 0; i < 3; i++) await b.step(1000);
  assert.deepEqual([b.steps().A.state, b.steps().A.alert, b.steps().A.note], ['failed', true, 'Lamp fault again: it turned itself off after the retry. Stopped. Photograph any lamp message. This is a service call.']);
  for (let i = 0; i < 400; i++) await b.step(1000);
  const view = b.run.view();
  assert.deepEqual([view.run.state, view.run.banner, view.run.message], ['attention', null, 'Not confirmed ON: A (lamp fault, a service call). Check by eye.']);
  assert.equal(b.sent.filter(item => item[0] === 'P3').length, 2, 'no third try');
  assert.equal(b.steps().D.state, 'reported', 'D was handled on its own');
});

test('night: the Barco gets one off; deep standby is named; a lane that does not reach OFF in 240 s is named', async () => {
  const b = bench({ power: { P1: 'on', P2: 'on', P3: 'on', P4: 'on' }, extra: { P1: { rawState: 'on' } } });
  await b.go('off');
  for (let i = 0; i < 4; i++) await b.step();
  assert.deepEqual(b.sent.map(item => item[0]), ['P3', 'P4', 'P2', 'P1']);
  b.extra.P1.rawState = 'deconditioning';
  for (let i = 0; i < 20; i++) await b.step(1000);
  b.state.P1 = 'off'; b.extra.P1.rawState = 'eco'; b.state.P2 = 'off'; b.state.P3 = 'off'; b.state.P4 = 'off';
  for (let i = 0; i < 3; i++) await b.step(1000);
  let view = b.run.view();
  assert.deepEqual([view.run.state, view.run.banner], ['done', 'Safe to leave the building'], 'deep standby is still off');
  assert.equal(view.run.message, 'Every lane reports OFF. C is in deep standby: the morning power on from this page cannot reach it. Wake it at the unit.');
  assert.equal(b.sent.filter(item => item[0] === 'P1').length, 1, 'one off to the Barco, never a second');
  // Next night the Barco already reads off in deep standby: the plan says so and sends it nothing.
  const next = bench({ power: { P1: 'off', P2: 'on', P3: 'on', P4: 'on' }, extra: { P1: { rawState: 'standby' } } });
  assert.deepEqual(next.run.plan('off').steps[3].note, 'Already OFF (deep standby). Nothing will be sent');
  // A lamp unit still cooling at 240 s is named; nothing is sent to it again.
  const slow = bench({ power: { P1: 'on', P2: 'on', P3: 'on', P4: 'on' } });
  await slow.go('off');
  for (let i = 0; i < 4; i++) await slow.step();
  slow.state.P1 = 'off'; slow.state.P2 = 'off'; slow.state.P3 = 'off';
  for (let i = 0; i < 245; i++) await slow.step(1000);
  view = slow.run.view();
  assert.deepEqual([view.run.state, view.run.banner, view.run.message], ['attention', null, 'Not confirmed OFF: D (reports COOLING). Check by eye.']);
  assert.equal(slow.sent.length, 4);
  // After an off, a Barco that drops off the network before reading off may be in deep standby.
  const quiet = bench({ power: { P1: 'on', P2: 'on', P3: 'on', P4: 'on' } });
  await quiet.go('off');
  for (let i = 0; i < 4; i++) await quiet.step();
  quiet.silent.add('P1'); quiet.state.P2 = 'off'; quiet.state.P3 = 'off'; quiet.state.P4 = 'off';
  for (let i = 0; i < 245; i++) await quiet.step(1000);
  assert.equal(quiet.run.view().run.message, 'Not confirmed OFF: C (no current reply; it may be in deep standby). Check by eye.');
});

test('morning: a Barco with no reply may be in deep standby, and gets nothing', async () => {
  const b = bench();
  b.silent.add('P1');
  assert.equal(b.run.plan('on').steps[0].note, 'No current reply. It may be in deep standby, which needs a wake at the unit. Nothing will be sent unless it answers');
  await b.go('on');
  for (let i = 0; i < 25; i++) await b.step(1000);
  assert.deepEqual([b.steps().C.state, b.steps().C.note], ['failed', 'No current reply. It may be in deep standby, which needs a wake at the unit. Nothing sent.']);
  assert.equal(b.sent.some(item => item[0] === 'P1'), false);
});

test('the run is recorded beside the rig, and a relay restart mid-run says nothing more was sent', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'projctl-power-run-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'power-run.json');
  const b = bench({ file });
  assert.equal(b.run.view().run, null);
  await b.go('on');
  assert.equal(JSON.parse(await readFile(file, 'utf8')).state, 'running');
  const after = bench({ file });  // the relay comes back
  const view = after.run.view();
  assert.deepEqual([view.active, view.run.state, view.run.banner, view.run.message], [false, 'interrupted', null, 'The relay restarted during this run. Nothing more was sent. Check each lane.']);
  for (let i = 0; i < 5; i++) await after.step();
  assert.deepEqual(after.sent, [], 'a restarted relay does not pick the run back up');
  assert.equal(typeof after.run.plan('on').confirm, 'string', 'a new run can be reviewed');
  // A finished run is kept as the last run.
  const done = bench({ file: path.join(dir, 'done.json'), power: { P1: 'on', P2: 'on', P3: 'on', P4: 'on' } });
  await done.go('on'); await done.step();
  assert.equal(bench({ file: path.join(dir, 'done.json') }).run.view().run.banner, 'All four on');
});

test('the relay runs it against the simulator: plan, confirm, shared state, one run at a time, behind the sign-in', async () => {
  const relay = await startRelay();
  try {
    for (const [slot, lane] of [['P1', 'A'], ['P2', 'B'], ['P3', 'C'], ['P4', 'D']]) assert.equal((await relay.api('projector', { slot, lane })).status, 200);
    assert.deepEqual([(await relay.api('power-run')).body.active, (await relay.api('power-run')).body.run], [false, null]);
    const plan = (await relay.api('power-run/plan', { direction: 'on' })).body;
    assert.deepEqual(plan.steps.map(step => [step.lane, step.intent]), [['C', 'send'], ['B', 'send'], ['A', 'send'], ['D', 'send']]);
    assert.equal((await relay.state()).projectors.every(p => p.status.power === 'off'), true, 'a plan sends nothing');
    const started = await relay.api('power-run/start', { direction: 'on', confirm: plan.confirm });
    assert.deepEqual([started.status, started.body.active], [200, true]);
    // Another page presses while it runs.
    const second = await relay.api('power-run/plan', { direction: 'off' });
    assert.deepEqual([second.status, second.body.error, second.body.active, second.body.run.id], [409, 'A run is already in progress.', true, started.body.run.id]);
    assert.equal((await relay.api('power-run/start', { direction: 'on', confirm: plan.confirm })).status, 409);
    await until(async () => !(await relay.api('power-run')).body.active, 30000);
    const done = (await relay.api('power-run')).body.run;
    assert.deepEqual([done.state, done.banner, done.steps.map(step => `${step.lane}:${step.state}`).join(' ')], ['done', 'All four on', 'C:reported B:reported A:reported D:reported']);
    assert.equal((await relay.state()).projectors.every(p => p.status.power === 'on'), true);
    const events = (await relay.state()).events.filter(event => event.source === 'run').map(event => `${event.slot} ${event.command}`);
    assert.deepEqual(events, ['P3 power 1', 'P2 power 1', 'P1 power 1', 'P4 power 1'], 'the relay logged one command per unit, in order: C, B, A, D');

    // Show Lock: no off run. An on run is still allowed, as power on always is.
    await relay.api('lock', { lock: true });
    assert.deepEqual([(await relay.api('power-run/plan', { direction: 'off' })).status, (await relay.api('power-run/plan', { direction: 'on' })).status], [423, 200]);
    await relay.api('lock', { lock: false });
    // Off, then the banner only once every lane reports OFF.
    const off = (await relay.api('power-run/plan', { direction: 'off' })).body;
    await relay.api('power-run/start', { direction: 'off', confirm: off.confirm });
    await until(async () => !(await relay.api('power-run')).body.active, 30000);
    assert.deepEqual([(await relay.api('power-run')).body.run.banner, (await relay.state()).projectors.every(p => p.status.power === 'off')], ['Safe to leave the building', true]);
    assert.equal((await fetch(`${relay.base}/api/power-run`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${relay.base}/api/power-run/plan`)).status, 405);
  } finally { await relay.close(); }
  const locked = await startRelay({ PJ_PASSCODE: 'simulator-only-code' });
  try {
    assert.equal((await fetch(`${locked.base}/api/power-run`)).status, 401);
    assert.equal((await fetch(`${locked.base}/api/power-run/start`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ direction: 'on', confirm: 'x' }) })).status, 401);
  } finally { await locked.close(); }
});
