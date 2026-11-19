// Shared projector control model: what counts as a reading, when each of the four actions is
// offered, every block reason, the Show Lock policy and the all-lanes target list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createConnectionMonitor } from '../public/projector-connection.js';
import { suggestRun, runSummary, SUGGEST_QUIET_MS, powerLook, shutterLook, pendingShutter } from '../public/projector-control-model.js';
import { ACTIONS, ACTION_IDS, DEFAULT_POLICY, CONFIRM_MS, RELAY_CONFIRM_MS, laneViews, actionState, sharedReason, groupState, groupSummary, linkOf, alarmSummary, targetsText, skippedText } from '../public/projector-control-model.js';

const NOW = Date.parse('2026-11-18T19:00:00Z');
const ago = ms => new Date(NOW - ms).toISOString();
const QUIET = { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 };
function projector(slot, lane, status = {}, extra = {}) {
  return { slot, lane, driver: 'simulator', ip: 'sim', model: `Model ${lane}`, controlRevision: lane.toLowerCase().repeat(64),
    inputs: { 31: 'HDMI 1', 32: 'SDI 1' }, inputPreference: { available: true, value: '31', label: 'HDMI 1' }, patterns: { '00': 'Off', '08': 'Crosshatch' },
    status: { power: 'on', shutter: 'open', input: '31', pattern: '00', errors: QUIET, online: true, updatedAt: ago(2000), connection: { state: 'online', lastSuccessAt: ago(2000) }, ...status }, ...extra };
}
const held = (slot, lane) => projector(slot, lane, { online: false, connection: { state: 'reconnecting', lastSuccessAt: ago(9 * 3600000) } });
const rig = (...projectors) => ({ type: 'snapshot', lock: false, relay: { pollIntervalMs: 5000 }, projectors });
const views = (snapshot, relay = { connected: true, everConnected: true }) => laneViews(snapshot, { relayConnected: relay.connected, everConnected: relay.everConnected, monitor: createConnectionMonitor(), now: NOW });
const byLane = list => Object.fromEntries(list.map(view => [view.lane, view]));
const four = () => rig(projector('P1', 'A'), projector('P2', 'B'), projector('P3', 'C'), projector('P4', 'D'));
const offered = (view, options) => Object.fromEntries(ACTION_IDS.map(id => [id, actionState(view, id, options).enabled]));

test('the four actions map to the two relay commands and nothing else', () => {
  assert.deepEqual(ACTION_IDS, ['power-on', 'power-off', 'shutter-open', 'shutter-close']);
  assert.deepEqual(ACTION_IDS.map(id => [ACTIONS[id].cmd, ACTIONS[id].arg]), [['power', 1], ['power', 0], ['shutter', 0], ['shutter', 1]]);
  assert.deepEqual(ACTION_IDS.filter(id => ACTIONS[id].relayConfirm), ['power-off'], 'only power off uses the relay\'s own confirmation');
  assert.deepEqual([CONFIRM_MS, RELAY_CONFIRM_MS], [6000, 3000]);
  assert.deepEqual(DEFAULT_POLICY, { lockBlocksPowerOn: false, lockBlocksGroup: false });
});

test('a current reply shows power, shutter, input, pattern and link; a lost one shows none of them', () => {
  const lanes = byLane(views(rig(held('P1', 'A'), projector('P2', 'B'), projector('P3', 'C', { controlLink: 'control-port', input: null, shutter: 'closed' }, { driver: 'panasonic' }), projector('P4', 'D'))));
  assert.deepEqual([lanes.B.reach, lanes.B.headline, lanes.B.shutterText, lanes.B.inputText, lanes.B.patternText, lanes.B.tone, lanes.B.word], ['live', 'ON', 'OPEN', 'HDMI 1', 'Off', 'ok', 'ON']);
  assert.deepEqual(lanes.B.link, { id: 'simulator', label: 'Simulator', caution: null, cautionText: null });
  assert.equal(lanes.B.freshText, 'Reply 2s ago');
  assert.deepEqual([lanes.A.reach, lanes.A.headline, lanes.A.power, lanes.A.shutter, lanes.A.input, lanes.A.pattern, lanes.A.link, lanes.A.word], ['unreached', 'CHECK BY EYE', null, null, null, null, null, 'EYE']);
  assert.equal(lanes.A.blocked, "Relay can't reach it. Check by eye.");
  assert.match(lanes.A.freshText, /^Last reply \d+:\d\d [AP]M$/);
  // The control port reports power and shutter but not the input.
  assert.deepEqual(lanes.C.link, { id: 'control-port', label: 'Control port', caution: 'power untested', cautionText: 'Shutter over this link is proven on the rig. Power over it has not been tested on the rig yet.' });
  assert.deepEqual([lanes.C.inputText, lanes.C.input, lanes.C.shutterText], ['Not reported', null, 'CLOSED · dark on stage']);
});

test('the Barco shows its raw state; deep standby is flagged on the card, READY is not', () => {
  const list = byLane(views(rig(projector('P3', 'C', { power: 'off', rawState: 'eco', shutter: 'unknown' }), projector('P2', 'B', { power: 'off', rawState: 'ready' }), projector('P1', 'A', { power: 'off', rawState: 'Weird state!' }))));
  assert.deepEqual([list.C.raw, list.C.deepStandby, list.C.caution, list.C.tone], ['eco', true, 'ECO. Deep standby: the morning power on cannot reach it.', 'attention']);
  assert.ok(list.C.flags.includes('deep standby'));
  assert.deepEqual([list.B.raw, list.B.deepStandby, list.B.caution], ['ready', false, null]);
  assert.equal(list.A.raw, null, 'only a plain word is shown');
  const lost = byLane(views(rig({ ...held('P3', 'C'), status: { ...held('P3', 'C').status, power: 'off', rawState: 'eco' } })));
  assert.deepEqual([lost.C.raw, lost.C.caution], [null, null], 'no current reply, no raw state');
});

test('the link is named from what the driver reports, and only the control port carries the "power untested" tag', () => {
  const link = (driver, controlLink) => linkOf({ driver, status: { controlLink } });
  const plain = (id, label) => ({ id, label, caution: null, cautionText: null });
  assert.deepEqual(link('panasonic', 'pjlink'), plain('pjlink', 'PJLink'));
  assert.deepEqual(link('panasonic', undefined), plain('pjlink', 'PJLink'));
  assert.deepEqual([link('panasonic', 'control-port').caution, link('panasonic', 'control-port').cautionText], ['power untested', 'Shutter over this link is proven on the rig. Power over it has not been tested on the rig yet.']);
  assert.deepEqual(link('pulse', undefined), plain('pulse', 'Barco API'));
  assert.deepEqual(link('other', undefined), plain(null, 'Not reported'));
});

test('a wrong input and a test pattern left on are flagged, so a blue picture can be explained', () => {
  const lanes = byLane(views(rig(projector('P1', 'A', { input: '32' }), projector('P2', 'B', { pattern: '08' }), projector('P3', 'C', { pattern: null, input: null }), projector('P4', 'D', {}, { inputPreference: { available: false, value: null, label: 'HDMI' } }))));
  assert.deepEqual([lanes.A.inputText, lanes.A.inputFlag, lanes.A.tone, lanes.A.flags], ['SDI 1', 'Expected HDMI 1', 'attention', ['input SDI 1']]);
  assert.deepEqual([lanes.B.patternText, lanes.B.patternFlag, lanes.B.tone, lanes.B.flags], ['ON · Crosshatch', 'Test pattern is on', 'attention', ['test pattern on']]);
  assert.deepEqual([lanes.C.patternText, lanes.C.inputText, lanes.C.tone], ['Not reported', 'Not reported', 'ok'], 'not reported is not a fault');
  assert.deepEqual([lanes.D.inputFlag, lanes.D.expectedInput], [null, null], 'no preferred input, so nothing to compare');
  assert.deepEqual(alarmSummary({ ...QUIET, lamp: 1, temp: 2 }), { level: 'error', text: 'Temperature error, lamp warning' });
});

test('each action is offered only on a current reading that allows it', () => {
  const state = power => byLane(views(rig(projector('P1', 'A', { power, shutter: 'open' }))))['A'];
  assert.deepEqual(offered(state('on'), { lock: false }), { 'power-on': false, 'power-off': true, 'shutter-open': false, 'shutter-close': true });
  assert.deepEqual(offered(state('off'), { lock: false }), { 'power-on': true, 'power-off': false, 'shutter-open': false, 'shutter-close': false });
  assert.deepEqual(offered(state('warming'), { lock: false }), { 'power-on': false, 'power-off': true, 'shutter-open': false, 'shutter-close': false });
  assert.deepEqual(offered(state('cooling'), { lock: false }), { 'power-on': false, 'power-off': false, 'shutter-open': false, 'shutter-close': false });
  assert.deepEqual(offered(state('unknown'), { lock: false }), { 'power-on': false, 'power-off': false, 'shutter-open': false, 'shutter-close': false });

  const reason = (view, id, lock = false) => actionState(view, id, { lock }).reason;
  assert.equal(reason(state('on'), 'power-on'), 'Already reports ON.');
  assert.equal(reason(state('warming'), 'power-on'), 'Already warming up.');
  assert.equal(reason(state('cooling'), 'power-on'), 'Cooling. Wait before power on.');
  assert.equal(reason(state('off'), 'power-off'), 'Already reports OFF.');
  assert.equal(reason(state('cooling'), 'power-off'), 'Already cooling.');
  assert.equal(reason(state('unknown'), 'power-on'), 'Power not reported.');
  assert.equal(reason(state('off'), 'shutter-close'), 'Reports OFF, so no shutter move.');
  assert.equal(reason(state('unknown'), 'shutter-open'), 'Power not reported, so no shutter move.');
  assert.equal(reason(state('on'), 'shutter-open'), 'Already reports OPEN.');

  const closed = byLane(views(rig(projector('P1', 'A', { shutter: 'closed' })))).A;
  assert.deepEqual([actionState(closed, 'shutter-open', { lock: false }).enabled, reason(closed, 'shutter-close')], [true, 'Already reports CLOSED.']);
  const blind = byLane(views(rig(projector('P1', 'A', { shutter: 'unknown' })))).A;
  assert.deepEqual([actionState(blind, 'shutter-open', { lock: false }), actionState(blind, 'shutter-close', { lock: false })].map(s => [s.enabled, s.note]), [[true, 'Shutter position not reported.'], [true, 'Shutter position not reported.']]);
});

test('nothing is offered without a current reply, and every block carries its reason', () => {
  const snapshot = rig(held('P1', 'A'), projector('P2', 'B', { connection: { state: 'online', lastSuccessAt: ago(40000) } }), projector('P3', 'C'), projector('P4', 'D'));
  snapshot.projectors[2].lane = '';
  const lanes = byLane(views(snapshot));
  for (const [lane, reach, why] of [['A', 'unreached', "Relay can't reach it. Check by eye."], ['B', 'stale', 'Reply too old. Waiting for a fresh one.'], ['C', 'unassigned', 'No projector on this lane.']]) {
    assert.equal(lanes[lane].reach, reach);
    for (const id of ACTION_IDS) assert.deepEqual(actionState(lanes[lane], id, { lock: false }), { enabled: false, reason: why, note: '' }, `${lane} ${id}`);
    assert.equal(sharedReason(lanes[lane], { lock: false }), why);
  }
  assert.equal(sharedReason(lanes.D, { lock: false }), '', 'a lane with something on offer has no single reason');
  for (const view of views(four(), { connected: false, everConnected: true })) assert.equal(sharedReason(view, { lock: null }), 'Relay not answering. Check by eye.');
  for (const view of views(null, { connected: false, everConnected: false })) assert.deepEqual([view.headline, sharedReason(view, { lock: null })], ['CONNECTING', 'Waiting for the relay.']);
  const noTarget = { ...lanes.D, revision: null };
  assert.equal(actionState(noTarget, 'shutter-close', { lock: false }).reason, 'No reviewed target for this lane.');
});

test('Show Lock blocks power off and nothing else: power on and shutters stay available', () => {
  const on = byLane(views(four())).A, off = byLane(views(rig(projector('P1', 'A', { power: 'off' })))).A;
  assert.deepEqual(offered(on, { lock: true }), { 'power-on': false, 'power-off': false, 'shutter-open': false, 'shutter-close': true });
  assert.equal(actionState(on, 'power-off', { lock: true }).reason, 'Show Lock is on. Power off is locked.');
  assert.equal(actionState(off, 'power-on', { lock: true }).enabled, true, 'power on is allowed under Show Lock, as at the relay');
  assert.equal(actionState(on, 'power-off', { lock: null }).reason, 'Show Lock not read.');
  // A page may choose to be stricter.
  assert.equal(actionState(off, 'power-on', { lock: true, policy: { lockBlocksPowerOn: true, lockBlocksGroup: false } }).reason, 'Show Lock is on. Power is locked.');
});

test('an all-lanes action lists exactly the lanes that will get it and why the others are skipped', () => {
  const snapshot = rig(held('P1', 'A'), projector('P2', 'B'), projector('P3', 'C', { shutter: 'closed' }), projector('P4', 'D', { power: 'off' }));
  const lanes = views(snapshot);
  const close = groupState(lanes, 'shutter-close', { lock: false });
  assert.equal(close.enabled, true);
  assert.deepEqual(close.ready, [{ lane: 'B', slot: 'P2', revision: 'b'.repeat(64) }]);
  assert.deepEqual(close.skipped, [{ lane: 'A', reason: "Relay can't reach it. Check by eye." }, { lane: 'C', reason: 'Already reports CLOSED.' }, { lane: 'D', reason: 'Reports OFF, so no shutter move.' }]);
  assert.equal(skippedText(close.skipped), "A: relay can't reach it. Check by eye · C: already reports CLOSED · D: reports OFF, so no shutter move");
  assert.deepEqual(groupState(lanes, 'power-on', { lock: false }).ready.map(target => target.lane), ['D']);
  assert.deepEqual(groupState(lanes, 'power-off', { lock: false }).ready.map(target => target.lane), ['B', 'C']);
  assert.equal(targetsText(groupState(lanes, 'power-off', { lock: false }).ready), 'B and C');
  assert.equal(skippedText(groupState(views(four()), 'power-on', { lock: false }).skipped), 'A, B, C and D: already reports ON', 'lanes skipped for one reason are named together');
  assert.deepEqual(groupSummary(lanes), { total: 4, reading: 3, lit: 2, closed: 1 });

  // Under Show Lock the all-lanes shutters stay available and power off is locked lane by lane.
  assert.deepEqual(groupState(lanes, 'shutter-close', { lock: true }).ready.map(target => target.lane), ['B']);
  assert.deepEqual([groupState(lanes, 'power-off', { lock: true }).enabled, groupState(views(four()), 'power-off', { lock: true }).reason], [false, 'Show Lock is on. Power off is locked.']);
  assert.deepEqual(groupState(lanes, 'power-on', { lock: true }).ready.map(target => target.lane), ['D']);
  // A page may lock every all-lanes action instead.
  for (const id of ACTION_IDS) assert.deepEqual([groupState(lanes, id, { lock: true, policy: { lockBlocksPowerOn: false, lockBlocksGroup: true } }).enabled, groupState(lanes, id, { lock: true, policy: { lockBlocksPowerOn: false, lockBlocksGroup: true } }).reason], [false, 'Show Lock is on. All-lanes actions are locked.']);

  // Nothing to do, and no relay.
  assert.deepEqual([groupState(views(four()), 'power-on', { lock: false }).enabled, groupState(views(four()), 'power-on', { lock: false }).reason], [false, 'Already reports ON.']);
  assert.equal(groupState(lanes, 'shutter-open', { lock: false }).ready.length, 1);
  assert.equal(groupState(views(four(), { connected: false, everConnected: true }), 'shutter-close', { lock: null }).reason, 'Show Lock not read.');
  assert.equal(groupState(views(null, { connected: false, everConnected: false }), 'shutter-close', { lock: null }).reason, 'Waiting for the relay.');
});

test('the component sends only what the model names, one lane at a time, with the reviewed target', async () => {
  const source = await readFile(new URL('../public/projector-control.js', import.meta.url), 'utf8');
  const model = await readFile(new URL('../public/projector-control-model.js', import.meta.url), 'utf8');
  assert.deepEqual([...model.matchAll(/cmd: '(\w+)'/g)].map(match => match[1]), ['power', 'power', 'shutter', 'shutter']);
  assert.doesNotMatch(source, /cmd: '/, 'the component takes its commands from the model');
  assert.match(source, /expectedTargets: \[\{ slot: target\.slot, revision: target\.revision \}\]/);
  assert.doesNotMatch(source + model, /slot: 'all'|fetch\(|XMLHttpRequest|WebSocket|localStorage/, 'no group target and no network of its own');
});

test('a run is suggested from B and C only, never during Show Lock, never straight after the run it would repeat', () => {
  const lanes = (b, c, extra = {}) => [{ lane: 'A', reach: 'unreached' }, { lane: 'B', reach: 'live', power: b }, { lane: 'C', reach: 'live', power: c }, { lane: 'D', reach: 'live', power: 'on' }].map(v => ({ ...v, ...(extra[v.lane] || {}) }));
  const none = { active: false, run: null }, ended = (direction, ms) => ({ active: false, run: { direction, state: 'done', endedAt: new Date(NOW - ms).toISOString() } });
  assert.deepEqual(suggestRun(lanes('off', 'off'), { lock: false, run: none, now: NOW }), { direction: 'on', text: 'B and C read OFF. Morning: Turn all on?' });
  assert.deepEqual(suggestRun(lanes('off', 'off'), { lock: true, run: none, now: NOW })?.direction, 'on', 'the morning on run is allowed under Show Lock');
  assert.deepEqual(suggestRun(lanes('on', 'on'), { lock: false, run: none, now: NOW }), { direction: 'off', text: 'B and C read ON and Show Lock is off. Night: Turn all off?' });
  assert.equal(suggestRun(lanes('on', 'on'), { lock: true, run: none, now: NOW }), null, 'during a show Show Lock is on: no off suggestion');
  assert.equal(suggestRun(lanes('on', 'on'), { lock: null, run: none, now: NOW }), null, 'Show Lock not read');
  assert.equal(suggestRun(lanes('on', 'off'), { lock: false, run: none, now: NOW }), null, 'B and C disagree');
  assert.equal(suggestRun(lanes('on', 'on', { C: { reach: 'stale' } }), { lock: false, run: none, now: NOW }), null, 'C has no current reply');
  assert.equal(suggestRun(lanes('cooling', 'cooling'), { lock: false, run: none, now: NOW }), null);
  assert.equal(suggestRun(lanes('off', 'off'), { lock: false, run: ended('off', SUGGEST_QUIET_MS.afterOff - 1000), now: NOW }), null, 'the same night: no morning suggestion');
  assert.equal(suggestRun(lanes('off', 'off'), { lock: false, run: ended('off', SUGGEST_QUIET_MS.afterOff + 1000), now: NOW })?.direction, 'on', 'next morning');
  assert.equal(suggestRun(lanes('on', 'on'), { lock: false, run: ended('on', 20 * 60000), now: NOW }), null, 'the morning check: no off suggestion');
  assert.equal(suggestRun(lanes('on', 'on'), { lock: false, run: ended('on', SUGGEST_QUIET_MS.afterOn + 1000), now: NOW })?.direction, 'off');
  assert.equal(suggestRun(lanes('off', 'off'), { lock: false, run: { active: true, run: { direction: 'on', state: 'running' } }, now: NOW }), null, 'a run in progress');
  assert.equal(suggestRun(lanes('off', 'off'), { lock: false, run: null, now: NOW }), null, 'a relay with no run');
  assert.equal(suggestRun(lanes('off', 'off'), { lock: false, run: undefined, now: NOW }), null, 'not read yet');
});

test('a finished run gives a plain summary with the time, the Barco state at night and lamp hours in the morning', () => {
  const at = '2026-11-19T03:04:00Z', C = (raw, deep = false) => [{ lane: 'C', reach: 'live', power: 'off', raw, deepStandby: deep }];
  assert.equal(runSummary({ direction: 'off', state: 'done', endedAt: at, message: 'Every lane reports OFF.' }, C('ready')), 'Units off at 10:04 PM. Every lane reports OFF. C reads READY.');
  assert.equal(runSummary({ direction: 'off', state: 'done', endedAt: at, message: 'Every lane reports OFF.' }, C('eco', true)), 'Units off at 10:04 PM. Every lane reports OFF. C reads ECO: deep standby: the morning power on cannot reach it.');
  assert.equal(runSummary({ direction: 'off', state: 'done', endedAt: at, message: 'Every lane reports OFF. C is in deep standby: the morning power on from this page cannot reach it. Wake it at the unit.' }, C('eco', true)),
    'Units off at 10:04 PM. Every lane reports OFF. C is in deep standby: the morning power on from this page cannot reach it. Wake it at the unit.', 'said once');
  assert.equal(runSummary({ direction: 'on', state: 'done', endedAt: at, message: 'Every lane reports ON.', steps: [{ lane: 'C', note: 'Reported ON' }, { lane: 'A', note: 'Reported ON and stayed on for 3 minutes. Lamp hours 1234; no lamp error.' }, { lane: 'D', note: 'Reported ON and stayed on for 3 minutes. Lamp hours not reported; lamp state not reported.' }] }),
    'Units on at 10:04 PM. Every lane reports ON. A: lamp hours 1234; no lamp error. D: lamp hours not reported; lamp state not reported.');
  assert.equal(runSummary({ direction: 'off', state: 'attention', endedAt: at, message: 'Not confirmed OFF: D (reports COOLING). Check by eye.' }, []), 'Not safe to leave yet at 10:04 PM. Not confirmed OFF: D (reports COOLING). Check by eye.');
  assert.equal(runSummary({ direction: 'on', state: 'interrupted', endedAt: at, message: 'The relay restarted during this run. Nothing more was sent. Check each lane.' }), 'Run interrupted at 10:04 PM. The relay restarted during this run. Nothing more was sent. Check each lane.');
  assert.equal(runSummary({ direction: 'on', state: 'running' }), '', 'nothing while it runs');
  assert.equal(runSummary(null), '');
});

test('the power banner look comes from the reading only, and a lane with no current reply keeps its own tone', () => {
  const live = extra => ({ reach: 'live', power: 'off', raw: null, deepStandby: false, ...extra });
  assert.deepEqual(powerLook(live({ power: 'on' })), { look: 'lit', note: '' });
  assert.deepEqual(powerLook(live({ power: 'warming' })), { look: 'warming', note: '' });
  assert.deepEqual(powerLook(live({ power: 'cooling' })), { look: 'cooling', note: '' });
  assert.deepEqual(powerLook(live({})), { look: 'off', note: '' });
  assert.deepEqual(powerLook(live({ raw: 'ready' })), { look: 'ready', note: 'READY · this page can wake it' });
  assert.deepEqual(powerLook(live({ raw: 'eco', deepStandby: true })), { look: 'deep-standby', note: "ECO · this page can't wake it" });
  assert.deepEqual(powerLook(live({ raw: 'standby', deepStandby: true })), { look: 'deep-standby', note: "STANDBY · this page can't wake it" });
  assert.deepEqual(powerLook(live({ power: 'unknown' })), { look: 'unknown', note: '' });
  for (const reach of ['connecting', 'stale', 'unreached', 'relay-offline', 'unassigned', 'conflict']) assert.deepEqual(powerLook({ reach, power: null }), { look: null, note: '' }, reach);
  assert.deepEqual(powerLook(null), { look: null, note: '' });
});

test('the shutter pill shows the report, or a command sent and not confirmed', () => {
  const live = (shutter, shutterText) => ({ reach: 'live', shutter, shutterText });
  assert.deepEqual(shutterLook(live('open', 'OPEN')), { look: 'open', text: 'OPEN' });
  assert.deepEqual(shutterLook(live('closed', 'CLOSED · dark on stage')), { look: 'closed', text: 'CLOSED · dark on stage' });
  assert.deepEqual(shutterLook(live('unknown', 'Not reported')), { look: 'not-reported', text: 'Not reported' });
  assert.deepEqual(shutterLook(live('open', 'OPEN'), 'CLOSE'), { look: 'sent-unconfirmed', text: 'CLOSE sent, not confirmed' });
  assert.deepEqual(shutterLook({ reach: 'stale', shutter: null, shutterText: 'Not reported' }), { look: 'not-reported', text: 'Not reported' });
  assert.deepEqual(shutterLook(undefined), { look: 'not-reported', text: 'Not reported' });
});

test('a shutter command is pending for a lane while it waits for, or has missed, its report', () => {
  const op = (action, targets) => ({ action, targets });
  assert.equal(pendingShutter([op('shutter-close', [{ lane: 'B', status: 'accepted' }]), undefined], 'B'), 'CLOSE');
  assert.equal(pendingShutter([undefined, op('shutter-open', [{ lane: 'A', status: 'reported' }, { lane: 'B', status: 'timeout' }])], 'B'), 'OPEN', 'an all-lanes command');
  assert.equal(pendingShutter([op('shutter-close', [{ lane: 'B', status: 'reported' }])], 'B'), null, 'reported');
  assert.equal(pendingShutter([op('shutter-close', [{ lane: 'B', status: 'refused' }])], 'B'), null, 'never sent');
  assert.equal(pendingShutter([op('shutter-close', [{ lane: 'B', status: 'ready' }])], 'B'), null, 'armed, not sent');
  assert.equal(pendingShutter([op('power-on', [{ lane: 'B', status: 'accepted' }])], 'B'), null, 'a power command');
  assert.equal(pendingShutter([op('shutter-close', [{ lane: 'A', status: 'accepted' }])], 'B'), null, 'another lane');
  assert.equal(pendingShutter([undefined, undefined], 'B'), null);
});
