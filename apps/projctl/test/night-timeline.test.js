// Night timeline for the power page: one row per lane in the off run's order, each unit's expected
// wait, what the relay reads now, and "safe to leave" only when all four read OFF. Pure model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nightRows, unitKind, NIGHT_ORDER, NIGHT_TOTAL, NIGHT_MAINS, NIGHT_SOURCE, UNIT_WAITS } from '../public/night-timeline.js';

const NOW = Date.parse('2026-11-19T03:00:00Z');
const live = (lane, model, power, extra = {}) => ({ lane, surface: `Surface ${lane}`, model, reach: 'live', power, raw: null, deepStandby: false, ...extra });
const rig = (over = {}) => [
  live('A', 'PT-DW830U', 'off'), live('B', 'PT-RZ970', 'off'), live('C', 'UDM 4K22', 'off', { raw: 'ready' }), live('D', 'PT-DW830U', 'off'),
].map(view => ({ ...view, ...(over[view.lane] || {}) }));
const offRun = steps => ({ active: true, run: { direction: 'off', state: 'running', steps: Object.entries(steps).map(([lane, [state, sentAt]]) => ({ lane, state, sentAt })) } });

test('the words and waits come from the research, labelled as not yet tested', () => {
  assert.deepEqual(NIGHT_ORDER, ['A', 'D', 'B', 'C'], 'the relay\'s off order');
  assert.deepEqual([NIGHT_TOTAL, NIGHT_MAINS], ['All off, about 3 min', 'Never cut mains while a lamp unit is cooling.']);
  assert.match(NIGHT_SOURCE, /not yet tested on this rig\.$/);
  assert.deepEqual(Object.fromEntries(Object.entries(UNIT_WAITS).map(([kind, wait]) => [kind, wait.expect])),
    { lamp: 'about 170 s of cooling', laser: 'about 5 s', barco: 'about 30 s to READY', other: 'until it reads OFF' });
  assert.deepEqual(['PT-DW830U', 'PT-RZ970B', 'UDM 4K22', 'Barco something', 'Model X', ''].map(unitKind), ['lamp', 'laser', 'barco', 'barco', 'other', 'other']);
});

test('all four OFF, the Barco in READY: safe to leave', () => {
  const model = nightRows(rig(), null, { now: NOW });
  assert.deepEqual(model.rows.map(row => [row.lane, row.unit, row.expect, row.state, row.now]), [
    ['A', 'Lamp unit', 'about 170 s of cooling', 'ok', 'OFF'], ['D', 'Lamp unit', 'about 170 s of cooling', 'ok', 'OFF'],
    ['B', 'Laser unit', 'about 5 s', 'ok', 'OFF'], ['C', 'Barco laser', 'about 30 s to READY', 'ok', 'OFF · READY']]);
  assert.deepEqual([model.allOff, model.verdict, model.cautions, model.cooling], [true, 'Safe to leave the building', [], false]);
});

test('a lamp unit cooling counts from its off command and lights up the mains line; nothing is safe yet', () => {
  const model = nightRows(rig({ A: { power: 'cooling' }, C: { power: 'cooling', raw: 'deconditioning' } }), offRun({ A: ['reported', NOW - 72000], C: ['reported', NOW - 20000] }), { now: NOW });
  const A = model.rows.find(row => row.lane === 'A'), C = model.rows.find(row => row.lane === 'C');
  assert.deepEqual([A.state, A.now, A.detail], ['busy', 'COOLING · 1:12 so far', NIGHT_MAINS]);
  assert.deepEqual([C.state, C.now, C.detail], ['busy', 'DECONDITIONING · 0:20 so far', ''], 'the Barco shows its raw state while it cools');
  assert.equal(model.cooling, true);
  assert.equal(model.verdict, 'Not safe to leave yet: A (COOLING · 1:12 so far), C (DECONDITIONING · 0:20 so far)');
  // With no run behind it, the count starts when this page first saw it cooling.
  const seen = nightRows(rig({ D: { power: 'cooling' } }), null, { now: NOW, coolingSince: new Map([['D', NOW - 5000]]) });
  assert.equal(seen.rows.find(row => row.lane === 'D').now, 'COOLING · 0:05 so far');
});

test('no reply after an off is "sent, not confirmed", never success; no reply with nothing sent is "no reply"', () => {
  const silent = { reach: 'unreached', power: null };
  const model = nightRows(rig({ A: silent, D: silent }), offRun({ A: ['sent', NOW - 30000], D: ['failed', null] }), { now: NOW });
  const [A, D] = model.rows;
  assert.deepEqual([A.state, A.now, A.detail], ['eye', 'Sent, not confirmed', 'Check it by eye.']);
  assert.deepEqual([D.state, D.now, D.detail], ['eye', 'No reply', 'Check by eye: indicator red, fans stopped.']);
  assert.deepEqual([model.allOff, model.verdict], [false, 'Not safe to leave yet: A (Sent, not confirmed), D (No reply)']);
  // An on run in the record does not count as an off command.
  const morning = nightRows(rig({ A: silent }), { active: false, run: { direction: 'on', steps: [{ lane: 'A', state: 'sent', sentAt: NOW }] } }, { now: NOW });
  assert.equal(morning.rows[0].now, 'No reply');
});

test('the Barco in deep standby is off, so it is safe to leave, but the morning power on cannot reach it and the page says so', () => {
  const model = nightRows(rig({ C: { raw: 'eco', deepStandby: true } }), null, { now: NOW });
  const C = model.rows.find(row => row.lane === 'C');
  assert.deepEqual([C.state, C.now, C.detail], ['warn', 'OFF · ECO', 'Deep standby: the morning power on cannot reach it.']);
  assert.deepEqual([model.allOff, model.verdict, model.cautions], [true, 'Safe to leave the building', ['C: Deep standby: the morning power on cannot reach it.']]);
  const unknown = nightRows(rig({ C: { raw: null } }), null, { now: NOW }).rows.find(row => row.lane === 'C');
  assert.deepEqual([unknown.now, unknown.detail], ['OFF', 'Raw state not reported, so READY is not confirmed.']);
});

test('a lane still lit or not reporting keeps the verdict on "not safe"', () => {
  const model = nightRows(rig({ B: { power: 'on' }, D: { power: 'unknown' } }), null, { now: NOW });
  assert.deepEqual(model.rows.map(row => row.state), ['ok', 'eye', 'lit', 'ok']);
  assert.equal(model.verdict, 'Not safe to leave yet: D (Power not reported), B (ON)');
  assert.equal(nightRows([], null, { now: NOW }).verdict, 'Not safe to leave yet: A (Waiting for the relay), D (Waiting for the relay), B (Waiting for the relay), C (Waiting for the relay)');
});
