import test from 'node:test';
import assert from 'node:assert/strict';
import { STORE, emptyRun, fromCueSheet, logEvent, save, validate } from './model.mjs';

test('Cue Sheet copy retains every original row and advances only the private run', () => {
  const original = { title: 'General Session', rows: [{ id: 'a', number: '001', action: 'Doors', custom: { layer: 2 } }, { id: 'b', number: '002', action: 'Walk on' }] };
  const raw = JSON.stringify(original);
  const run = fromCueSheet(raw);
  assert.deepEqual(run.cues[0].sourceRow, original.rows[0]);
  const next = logEvent(run, 'Go', '2026-10-07T12:00:00Z');
  assert.equal(next.current, 1);
  assert.equal(run.current, 0);
  assert.equal(raw, JSON.stringify(original));
  const held = logEvent(next, 'Hold');
  assert.equal(held.held, true);
  assert.equal(logEvent(held, 'Go').current, 1);
  assert.equal(logEvent(held, 'Resume').held, false);
});

test('invalid imports and stale saves preserve stored bytes', () => {
  assert.throws(() => fromCueSheet('{"rows":[]}'));
  assert.throws(() => validate({ schema: 'other', cues: [], events: [] }));
  const map = new Map();
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const saved = save(emptyRun(), storage, null);
  assert.equal(map.get(STORE), saved);
  assert.throws(() => save(emptyRun(), storage, null), /Another tab/);
  assert.equal(map.get(STORE), saved);
});
