import test from 'node:test';
import assert from 'node:assert/strict';
import { STORE, emptyRun, fromCueSheet, cueForgeLists, fromCueForge, logEvent, save, validate } from './model.mjs';

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

test('CueForge schema 7 list becomes a private calling snapshot without patch or secrets', () => {
  const source = { version: 7, name: 'Show', modifiedAt: '2026-10-07T12:00:00Z', settings: { oscRemoteControl: { sharedSecret: 'fixture-secret' } }, patch: { audioOutputs: ['fixture-patch'] }, cueLists: [{ id: 'main', name: 'Main', cues: [{ id: 'a', number: '1.5', name: 'Walk on', type: 'audio', notes: 'Standby A1', properties: { filePath: '/fixture/private.wav' }, triggers: [{ type: 'osc' }] }] }] };
  const raw = JSON.stringify(source);
  const run = fromCueForge(cueForgeLists(raw), 'main');
  const backup = JSON.stringify(validate(run));
  assert.equal(run.cues[0].number, '1.5');
  assert.equal(run.source.product, 'CueForge');
  assert.equal(backup.includes('fixture-secret'), false);
  assert.equal(backup.includes('fixture-patch'), false);
  assert.equal(backup.includes('private.wav'), false);
  assert.equal(raw, JSON.stringify(source));
  assert.throws(() => cueForgeLists(JSON.stringify({ ...source, version: 8 })), /version 7/);
});
