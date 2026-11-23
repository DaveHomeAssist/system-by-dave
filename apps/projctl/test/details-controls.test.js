import test from 'node:test';
import assert from 'node:assert/strict';
import { patternKind, patternThumb } from '../public/pattern-thumbs.js';
import { heatNotice, worstHeat, heatDetail, thermalIsCurrent } from '../public/heat-notice.js';
import { normalizeTimer, elapsedOf, formatElapsed } from '../public/session-timer.js';
import { patternTiles } from '../public/details-controls.js';

test('pattern thumbnails follow the reported pattern names', () => {
  const kinds = {
    'Colour bars': 'bars', 'Color Bars': 'bars', 'Colour bars (side)': 'bars-side', White: 'solid-white', Black: 'solid-black',
    Red: 'solid-red', 'Focus (white)': 'focus-white', 'Focus (cyan)': 'focus-cyan', Crosshatch: 'grid', Flag: 'flag',
    'Reversed flag': 'flag-reversed', Window: 'window', 'Reversed window': 'window-reversed', '16:9 / 4:3': 'aspect',
    'CW index': 'steps', 'Grey ramp': 'ramp', 'Mystery': 'unknown', '': 'unknown',
  };
  for (const [name, kind] of Object.entries(kinds)) assert.equal(patternKind(name), kind, name);
  const svg = patternThumb('Colour bars');
  assert.match(svg, /^<svg class="pj-thumb" data-thumb="bars"/);
  assert.match(svg, /aria-hidden="true"/);
  assert.doesNotMatch(svg, /<text|<title|id=/, 'thumbnails add no text or ids');
});

test('pattern tiles drop Off, keep code order and put favorites first', () => {
  const table = { 11: 'Focus (white)', 22: 'Red', '00': 'Off', '01': 'White', '08': 'Colour bars' };
  assert.deepEqual(patternTiles(table).map(([code]) => code), ['01', '08', '11', '22']);
  assert.deepEqual(patternTiles(table, ['22']).map(([code]) => code), ['22', '01', '08', '11']);
  assert.deepEqual(patternTiles(null), []);
});

test('heat notices show only current Watch or Hot readings', () => {
  const now = Date.parse('2026-11-13T20:00:00Z');
  const at = new Date(now - 30_000).toISOString();
  const projector = (level, extra = {}) => ({ thermal: { c: 38.2, at, sampleMs: 60000, level, limitC: 40, headroomC: 1.8, ...extra } });
  assert.equal(heatNotice(projector('ok'), true, now), null);
  assert.equal(heatNotice(projector('unknown'), true, now), null);
  assert.deepEqual(heatNotice(projector('watch'), true, now), { level: 'watch', word: 'Watch', c: 38.2, headroomC: 1.8, text: 'Watch · 38.2 °C' });
  assert.equal(heatNotice(projector('hot'), true, now).text, 'Hot · 38.2 °C');
  assert.equal(heatNotice(projector('hot'), false, now), null, 'no current projector reply');
  assert.equal(heatNotice(projector('hot', { at: new Date(now - 181_000).toISOString() }), true, now), null, 'older than three samples');
  assert.equal(heatNotice({ thermal: null }, true, now), null);
  assert.equal(thermalIsCurrent(null, true, now), false);
});

test('the worst heat notice prefers Hot, then the least headroom', () => {
  const now = Date.parse('2026-11-13T20:00:00Z'), at = new Date(now).toISOString();
  const p = (level, headroomC) => ({ thermal: { c: 40 - headroomC, at, level, headroomC, limitC: 40 } });
  assert.equal(worstHeat([{ lane: 'A', projector: p('watch', 2), current: true }, { lane: 'B', projector: p('hot', 1), current: true }], now).lane, 'B');
  assert.equal(worstHeat([{ lane: 'A', projector: p('watch', 2), current: true }, { lane: 'C', projector: p('watch', 1), current: true }], now).lane, 'C');
  assert.equal(worstHeat([{ lane: 'A', projector: p('ok', 9), current: true }], now), null);
});

test('heat detail states missing, unassigned and last-known readings plainly', () => {
  const now = Date.parse('2026-11-13T20:00:00Z');
  assert.equal(heatDetail(null, false, now).word, 'Unassigned');
  assert.equal(heatDetail({}, true, now).word, 'No reading');
  const stale = heatDetail({ thermal: { c: 31.04, at: new Date(now - 600_000).toISOString(), level: 'ok', kind: 'ambient', limitC: 40, headroomC: 8.96 } }, true, now);
  assert.deepEqual([stale.value, stale.word, stale.note], ['31.0', 'OK · last known', 'Ambient air · 9.0 °C below its 40 °C limit']);
  assert.equal(heatDetail({ thermal: { c: 30, at: new Date(now).toISOString(), level: 'unknown' } }, true, now).note, 'Intake air · No rated limit known');
});

test('session timer state is validated and measured from wall time', () => {
  const now = 1_000_000;
  assert.deepEqual(normalizeTimer(null, now), { version: 1, running: false, startedAt: null, elapsedMs: 0 });
  assert.deepEqual(normalizeTimer({ version: 2, running: true, startedAt: 1 }, now).running, false);
  assert.deepEqual(normalizeTimer({ version: 1, running: true, startedAt: now + 5, elapsedMs: -4 }, now), { version: 1, running: false, startedAt: null, elapsedMs: 0 }, 'future start and negative time are rejected');
  const running = normalizeTimer({ version: 1, running: true, startedAt: now - 5000, elapsedMs: 2000 }, now);
  assert.equal(elapsedOf(running, now), 7000);
  assert.equal(elapsedOf({ ...running, running: false }, now), 2000);
  assert.equal(formatElapsed(0), '00:00:00');
  assert.equal(formatElapsed(3_723_999), '01:02:03');
  assert.equal(formatElapsed(100 * 3600 * 1000), '100:00:00');
});
