import test from 'node:test';
import assert from 'node:assert/strict';
import { startRelay, until } from './relay-helper.js';

const thermalOf = async (relay, slot) => (await relay.state()).projectors.find((p) => p.slot === slot).thermal;
const setAir = (relay, slot, airC) => relay.api('sim', { slot, airC });
// The test relay starts from the default rig (no lanes, P4 is an RZ970B). Describe the
// installed A-D units the way the Setup tab does: P4 is lane D, a PT-DW830U (40 C limit).
async function describeRig(relay) {
  await relay.api('projector', { slot: 'P4', lane: 'D', model: 'PT-DW830U' });
  await relay.api('projector', { slot: 'P2', lane: 'B', model: 'PT-RZ970' });
}

test('relay reports air temperature, levels, history and a log entry only when the level changes', { timeout: 20000 }, async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  await describeRig(relay);
  await until(async () => (await thermalOf(relay, 'P4')).c === 24);
  let v = await thermalOf(relay, 'P4');
  assert.equal(v.level, 'ok'); assert.equal(v.limitC, 40); assert.equal(v.headroomC, 16); assert.equal(v.source, 'intake');

  await setAir(relay, 'P4', 37);
  await until(async () => (await thermalOf(relay, 'P4')).level === 'watch');
  v = await thermalOf(relay, 'P4');
  assert.equal(v.c, 37); assert.equal(v.headroomC, 3); assert.equal(v.peakC, 37);
  const other = await thermalOf(relay, 'P2');
  assert.equal(other.level, 'ok', 'other units are not affected'); assert.equal(other.limitC, 45);
  const unrated = await thermalOf(relay, 'P3');
  assert.equal(unrated.level, 'unknown', 'a unit with an unknown model has no limit, so no level'); assert.equal(unrated.headroomC, null);

  await new Promise((r) => setTimeout(r, 300)); // many more polls at the same level
  let events = (await relay.state()).events.filter((e) => e.source === 'thermal');
  assert.equal(events.length, 1, 'one entry per level change, not one per poll');
  assert.equal(events[0].slot, 'P4'); assert.equal(events[0].command, 'air watch'); assert.equal(events[0].result, 'WARN');
  assert.match(events[0].detail, /D · SR Portal.*intake air 37 °C, 3 °C below the 40 °C rated limit/);

  await setAir(relay, 'P4', 39);
  await until(async () => (await thermalOf(relay, 'P4')).level === 'hot');
  await setAir(relay, 'P4', 30);
  await until(async () => (await thermalOf(relay, 'P4')).level === 'ok');
  events = (await relay.state()).events.filter((e) => e.source === 'thermal').map((e) => `${e.command}:${e.result}`);
  assert.deepEqual(events, ['air watch:WARN', 'air hot:WARN', 'air ok:OK']);
  v = await thermalOf(relay, 'P4'); assert.equal(v.peakC, 39, 'peak survives recovery');
});

test('thermal endpoints serve a bounded series and a CSV', { timeout: 20000 }, async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  await describeRig(relay);
  await setAir(relay, 'P4', 36);
  await until(async () => (await thermalOf(relay, 'P4')).c === 36);
  const report = (await relay.api('thermal?minutes=5&points=20')).body;
  assert.equal(report.windowMinutes, 5); assert.equal(report.thresholds.watchHeadroomC, 5);
  const p4 = report.projectors.find((p) => p.slot === 'P4');
  assert.equal(p4.lane, 'D'); assert.ok(p4.series.length >= 1 && p4.series.length <= 20);
  assert.deepEqual(p4.series.at(-1)[1], 36);
  assert.equal((await relay.api('thermal?minutes=99999&points=99999')).body.windowMinutes, 480, 'window is clamped to retention');

  const csv = await fetch(relay.base + '/api/thermal.csv');
  assert.equal(csv.status, 200); assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.match(csv.headers.get('content-disposition'), /attachment/);
  const lines = (await csv.text()).trimEnd().split('\n');
  assert.equal(lines[0], 'time_utc,slot,lane,model,air_kind,air_c,rated_max_c');
  assert.ok(lines.some((l) => /,P4,D,PT-DW830U,intake,36,40$/.test(l)));
});

test('no reading is reported honestly and a retargeted slot starts a fresh history', { timeout: 20000 }, async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  await describeRig(relay);
  await setAir(relay, 'P2', null);
  await until(async () => (await relay.state()).projectors.find((p) => p.slot === 'P2').status.air === null);
  const none = await thermalOf(relay, 'P2');
  assert.equal(none.source, 'intake', 'driver supports it; just no current reply');
  await setAir(relay, 'P4', 38);
  await until(async () => (await thermalOf(relay, 'P4')).peakC === 38);
  await relay.api('projector', { slot: 'P4', model: 'PT-DW830KU', lane: 'D' }); // a corrected label is the same hardware
  await new Promise((r) => setTimeout(r, 300));
  assert.equal((await thermalOf(relay, 'P4')).peakC, 38, 'correcting a model or lane label keeps the history');
  await relay.api('projector', { slot: 'P4', ip: 'sim-2' }); // a new target behind the slot
  await until(async () => (await thermalOf(relay, 'P4')).peakC !== 38);
  assert.equal((await thermalOf(relay, 'P4')).level === 'hot', false, 'old unit history is not inherited');
});
