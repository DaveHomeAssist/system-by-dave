import test from 'node:test';
import assert from 'node:assert/strict';
import { startRelay, until } from './relay-helper.js';

// The Thermal watch samples through the health reports' reader and uses their limits. The
// portrait units are held to 40 C in health-reports.json, as on the venue rig.
const SETTINGS = { files: { 'health-reports.json': JSON.stringify({ ratedAmbientC: { P4: 40 } }) } };
const FAST = { PROJCTL_THERMAL_SAMPLE_MS: '100' };
const thermalOf = async (relay, slot) => (await relay.state()).projectors.find((p) => p.slot === slot).thermal;
const setAir = (relay, slot, intake) => relay.api('sim', { slot, temps: { intake } });
const powerOn = (relay) => relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
// The test relay starts from the default rig (no lanes). Describe the installed units the way Setup does.
async function describeRig(relay) {
  await relay.api('projector', { slot: 'P4', lane: 'D', model: 'PT-DW830U' });
  await relay.api('projector', { slot: 'P2', lane: 'B', model: 'PT-RZ970' });
  await relay.api('projector', { slot: 'P3', model: 'TBC', label: 'Unknown unit' });
}

test('no temperature is read while projectors are off', { timeout: 20000 }, async (t) => {
  const relay = await startRelay(FAST, SETTINGS); t.after(relay.close);
  await new Promise((r) => setTimeout(r, 600)); // several polls and sampling intervals
  const v = await thermalOf(relay, 'P4');
  assert.equal(v.c, null); assert.equal(v.lastReadAt, null, 'no read was attempted'); assert.equal(v.source, 'intake');
  assert.equal(v.sampleMs, 100);
});

test('relay samples lit projectors, applies health-report limits and logs one entry per level change', { timeout: 30000 }, async (t) => {
  const relay = await startRelay(FAST, SETTINGS); t.after(relay.close);
  await describeRig(relay); await powerOn(relay);
  await until(async () => (await thermalOf(relay, 'P4')).c === 24);
  let v = await thermalOf(relay, 'P4');
  assert.equal(v.level, 'ok'); assert.equal(v.limitC, 40, 'limit comes from health-reports.json'); assert.equal(v.headroomC, 16);
  assert.equal(v.kind, 'intake'); assert.equal(v.lastReadOk, true);

  await setAir(relay, 'P4', 37);
  await until(async () => (await thermalOf(relay, 'P4')).level === 'watch');
  v = await thermalOf(relay, 'P4');
  assert.equal(v.c, 37); assert.equal(v.headroomC, 3); assert.equal(v.peakC, 37);
  const other = await thermalOf(relay, 'P2');
  assert.equal(other.level, 'ok', 'other units are not affected'); assert.equal(other.limitC, 45, 'model default from health reports');
  const unrated = await thermalOf(relay, 'P3');
  assert.equal(unrated.level, 'unknown', 'a unit with an unknown model has no limit, so no level'); assert.equal(unrated.headroomC, null);
  assert.equal(unrated.c, 24, 'its temperature is still shown');

  await new Promise((r) => setTimeout(r, 400)); // more samples at the same level
  let events = (await relay.state()).events.filter((e) => e.source === 'thermal');
  assert.equal(events.length, 1, 'one entry per level change, not one per sample');
  assert.equal(events[0].slot, 'P4'); assert.equal(events[0].command, 'air watch'); assert.equal(events[0].result, 'WARN');
  assert.match(events[0].detail, /D · SR Portal.*intake air 37 °C, 3 °C below the 40 °C rated limit/);

  await setAir(relay, 'P4', 39);
  await until(async () => (await thermalOf(relay, 'P4')).level === 'hot');
  await setAir(relay, 'P4', 30);
  await until(async () => (await thermalOf(relay, 'P4')).level === 'ok');
  events = (await relay.state()).events.filter((e) => e.source === 'thermal').map((e) => `${e.command}:${e.result}`);
  assert.deepEqual(events, ['air watch:WARN', 'air hot:WARN', 'air ok:OK']);
  assert.equal((await thermalOf(relay, 'P4')).peakC, 39, 'peak survives recovery');
});

test('a portrait PT-DW830U defaults to 40 C and a landscape one stays at 45 C', { timeout: 20000 }, async (t) => {
  const relay = await startRelay(FAST); t.after(relay.close);
  await describeRig(relay);
  await relay.api('projector', { slot: 'P1', lane: 'C', model: 'PT-DW830U' });
  await powerOn(relay); await setAir(relay, 'P4', 37); await setAir(relay, 'P1', 37);
  await until(async () => (await thermalOf(relay, 'P4')).c === 37 && (await thermalOf(relay, 'P1')).c === 37);
  const portrait = await thermalOf(relay, 'P4');
  assert.equal(portrait.limitC, 40); assert.equal(portrait.headroomC, 3); assert.equal(portrait.level, 'watch');
  assert.equal(portrait.limitSource, 'model');
  const landscape = await thermalOf(relay, 'P1');
  assert.equal(landscape.limitC, 45); assert.equal(landscape.headroomC, 8); assert.equal(landscape.level, 'ok');
});

test('sampling is rate limited, and a health report reading feeds the watch', { timeout: 30000 }, async (t) => {
  // Default one-minute sampling: after the first sample, nothing more is read for a minute.
  const relay = await startRelay({}, SETTINGS); t.after(relay.close);
  await describeRig(relay); await powerOn(relay);
  await until(async () => (await thermalOf(relay, 'P4')).c === 24);
  assert.equal((await thermalOf(relay, 'P4')).sampleMs, 60000);
  await setAir(relay, 'P4', 37);
  await new Promise((r) => setTimeout(r, 700)); // a dozen status polls
  assert.equal((await thermalOf(relay, 'P4')).c, 24, 'status polls do not read temperature');
  const rows = (await (await fetch(relay.base + '/api/thermal.csv')).text()).trimEnd().split('\n').filter((l) => l.includes(',P4,'));
  assert.equal(rows.length, 1, 'one sample so far');

  // A health report reads every unit through the same reader, so the watch gets that reading too.
  const report = (await relay.api('health-reports/run', {})).body.report;
  assert.equal(report.kind, 'manual'); assert.equal(report.counts.watch, 1, 'the report and the watch agree');
  const v = await thermalOf(relay, 'P4');
  assert.equal(v.c, 37); assert.equal(v.level, 'watch'); assert.equal(v.headroomC, 3);
});

test('thermal endpoints serve a bounded series and a CSV', { timeout: 20000 }, async (t) => {
  const relay = await startRelay(FAST, SETTINGS); t.after(relay.close);
  await describeRig(relay); await powerOn(relay); await setAir(relay, 'P4', 36);
  await until(async () => (await thermalOf(relay, 'P4')).c === 36);
  const report = (await relay.api('thermal?minutes=5&points=20')).body;
  assert.equal(report.windowMinutes, 5); assert.equal(report.thresholds.watchHeadroomC, 5); assert.equal(report.sampleMs, 100);
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

test('missing and implausible readings are not shown as temperatures, and a retargeted slot starts fresh', { timeout: 30000 }, async (t) => {
  const relay = await startRelay(FAST, SETTINGS); t.after(relay.close);
  await describeRig(relay); await powerOn(relay);
  await until(async () => (await thermalOf(relay, 'P2')).c === 24);

  await setAir(relay, 'P2', null); // the projector answers but returns no temperature
  await until(async () => (await thermalOf(relay, 'P2')).lastReadOk === false);
  let v = await thermalOf(relay, 'P2');
  assert.equal(v.c, 24, 'the last real sample is kept'); assert.equal(v.source, 'intake');
  const stoppedAt = v.at;
  await new Promise((r) => setTimeout(r, 400));
  assert.equal((await thermalOf(relay, 'P2')).at, stoppedAt, 'no new sample is recorded');

  await setAir(relay, 'P2', 230); // an implausible value is treated as no reading
  await new Promise((r) => setTimeout(r, 400));
  v = await thermalOf(relay, 'P2');
  assert.equal(v.c, 24); assert.equal(v.peakC, 24); assert.equal(v.lastReadOk, false);
  assert.equal((await relay.state()).events.filter((e) => e.source === 'thermal').length, 0, 'no alert from an implausible value');

  await setAir(relay, 'P4', 38);
  await until(async () => (await thermalOf(relay, 'P4')).peakC === 38);
  await relay.api('projector', { slot: 'P4', model: 'PT-DW830KU', lane: 'D' }); // a corrected label is the same hardware
  await new Promise((r) => setTimeout(r, 300));
  assert.equal((await thermalOf(relay, 'P4')).peakC, 38, 'correcting a model or lane label keeps the history');
  await relay.api('projector', { slot: 'P4', ip: 'sim-2' }); // a new target behind the slot
  await until(async () => (await thermalOf(relay, 'P4')).peakC !== 38);
  assert.notEqual((await thermalOf(relay, 'P4')).level, 'hot', 'old unit history is not inherited');
});
