import test from 'node:test';
import assert from 'node:assert/strict';
import { levelFor, ratedAmbientMaxC, createThermalMonitor, thermalCsv, THRESHOLDS } from '../server/thermal.js';
import { parseTemperaturePair } from '../server/drivers/panasonic.js';

test('rated limits come from the model, with a bounded per-projector override', () => {
  assert.equal(ratedAmbientMaxC({ model: 'UDM 4K22' }), 40);
  assert.equal(ratedAmbientMaxC({ model: 'PT-RZ970B' }), 45);
  assert.equal(ratedAmbientMaxC({ model: 'PT-DW830U' }), 40);
  assert.equal(ratedAmbientMaxC({ model: 'TBC', label: 'Barco UDM 4K22' }), 40, 'label is the fallback');
  assert.equal(ratedAmbientMaxC({ model: 'PT-DW830U', label: 'Panasonic PT-RZ970B' }), 40, 'a stale label never overrides the model');
  assert.equal(ratedAmbientMaxC({ model: 'TBC' }), null, 'unknown model has no limit rather than a guess');
  assert.equal(ratedAmbientMaxC({ model: 'PT-DW830U', ambientLimitC: 45 }), 45);
  for (const bad of [5, 99, 'warm', null, NaN]) assert.equal(ratedAmbientMaxC({ model: 'PT-DW830U', ambientLimitC: bad }), 40, `ignores ${bad}`);
});

test('levels escalate at once and step down one level only after the hysteresis margin', () => {
  assert.deepEqual([10, 5.1, 5, 2.1, 2, -1].map((h) => levelFor(h)), ['ok', 'ok', 'watch', 'watch', 'hot', 'hot']);
  assert.equal(levelFor(3, 'hot'), 'hot', 'inside the margin stays hot');
  assert.equal(levelFor(3.5, 'hot'), 'watch');
  assert.equal(levelFor(5.5, 'watch'), 'watch', 'on the line does not flap');
  assert.equal(levelFor(6.5, 'watch'), 'ok');
  assert.equal(levelFor(5.5, 'hot'), 'watch', 'a fast drop still passes through the watch margin');
  assert.equal(levelFor(9, 'hot'), 'ok');
  assert.equal(levelFor(1, 'ok'), 'hot', 'can jump straight to hot');
  assert.equal(THRESHOLDS.watchHeadroomC > THRESHOLDS.hotHeadroomC, true);
});

test('the 11 Nov health report P4 reading is a watch item, not a fault', () => {
  const monitor = createThermalMonitor();
  const r = monitor.observe('P4', { at: Date.now(), c: 37, kind: 'intake', limitC: 40 });
  assert.equal(r.level, 'watch'); assert.equal(r.headroomC, 3); assert.equal(r.changed, true);
  assert.equal(monitor.observe('P4', { at: Date.now() + 5000, c: 36, kind: 'intake', limitC: 40 }).changed, false);
});

test('monitor ignores non-numbers, tracks the peak and keeps a unit with no limit unrated', () => {
  const monitor = createThermalMonitor();
  assert.equal(monitor.observe('P1', { at: 1, c: null, limitC: 40 }), null);
  assert.equal(monitor.observe('P1', { at: 1, c: NaN, limitC: 40 }), null);
  assert.equal(monitor.view('P1', 40).level, 'unknown');
  const now = Date.now();
  for (const [i, c] of [30, 36, 33].entries()) monitor.observe('P1', { at: now + i * 1000, c, kind: 'ambient', limitC: 40 });
  const v = monitor.view('P1', 40);
  assert.equal(v.c, 33); assert.equal(v.peakC, 36); assert.equal(v.kind, 'ambient'); assert.equal(v.headroomC, 7);
  assert.equal(new Date(v.peakAt).getTime(), now + 1000);
  assert.equal(monitor.observe('P2', { at: now, c: 30, limitC: null }).level, 'unknown');
  assert.equal(monitor.view('P2', null).headroomC, null);
});

test('history is bounded by age and count, and reset drops a slot', () => {
  let clock = 1_000_000;
  const monitor = createThermalMonitor({ retentionMs: 10_000, maxSamples: 4, now: () => clock });
  for (let i = 0; i < 6; i++) { monitor.observe('P1', { at: clock, c: 20 + i, limitC: 40 }); clock += 1000; }
  assert.deepEqual(monitor.rows().map((r) => r.c), [22, 23, 24, 25], 'count cap keeps the newest');
  clock += 9500;
  monitor.observe('P1', { at: clock, c: 30, limitC: 40 });
  assert.deepEqual(monitor.rows().map((r) => r.c), [30], 'age cap drops expired samples');
  monitor.reset('P1');
  assert.deepEqual(monitor.rows(), []); assert.equal(monitor.view('P1', 40).c, null);
});

test('series thins by bucket but never smooths away a peak', () => {
  let clock = 5_000_000;
  const monitor = createThermalMonitor({ now: () => clock });
  for (let i = 0; i < 100; i++) { monitor.observe('P4', { at: clock, c: i === 41 ? 39 : 30, limitC: 40 }); clock += 1000; }
  const thinned = monitor.series('P4', { windowMs: 3_600_000, maxPoints: 10 });
  assert.ok(thinned.length <= 10);
  assert.equal(Math.max(...thinned.map(([, c]) => c)), 39);
  assert.equal(monitor.series('P4', { windowMs: 5000, maxPoints: 50 }).length, 5, 'window keeps only recent samples');
  assert.deepEqual(monitor.series('nope'), []);
});

test('CSV has a stable header, ISO times and neutralises spreadsheet formulas', () => {
  const csv = thermalCsv([{ slot: 'P4', t: Date.UTC(2026, 10, 12, 3, 0, 0), c: 37.5, kind: 'intake' }, { slot: '=P5', t: Date.UTC(2026, 10, 12, 3, 0, 5), c: 22, kind: 'intake' }],
    (slot) => slot === 'P4' ? { lane: 'D', model: 'PT-DW830U', limitC: 40 } : { lane: '', model: '+cmd|"x"', limitC: null });
  const lines = csv.trimEnd().split('\n');
  assert.equal(lines[0], 'time_utc,slot,lane,model,air_kind,air_c,rated_max_c');
  assert.equal(lines[1], '2026-11-12T03:00:00.000Z,P4,D,PT-DW830U,intake,37.5,40');
  assert.equal(lines[2], `2026-11-12T03:00:05.000Z,'=P5,,"'+cmd|""x""",intake,22,`);
});

test('Panasonic temperature replies are accepted only when the C and F values agree', () => {
  assert.equal(parseTemperaturePair('023/073'), 23);
  assert.equal(parseTemperaturePair('+037 +099'), 37);
  assert.equal(parseTemperaturePair('37.0 98.6'), 37);
  assert.equal(parseTemperaturePair('0230 0734'), 23, 'tenths');
  assert.equal(parseTemperaturePair('023/090'), null, 'disagreeing pair');
  for (const bad of ['', 'ER401', '23', '23 73 99', null, undefined, '999/999', 'abc/def']) assert.equal(parseTemperaturePair(bad), null, `rejects ${JSON.stringify(bad)}`);
});
