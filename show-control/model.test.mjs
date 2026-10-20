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
  const safeSource = cueForgeLists(raw);
  assert.deepEqual(Object.keys(safeSource), ['version', 'name', 'modifiedAt', 'cueLists']);
  assert.deepEqual(safeSource.cueLists[0].cues[0], { id: 'a', number: '1.5', name: 'Walk on', type: 'audio', notes: 'Standby A1' });
  const run = fromCueForge(safeSource, 'main');
  const backup = JSON.stringify(validate(run));
  assert.equal(run.cues[0].number, '1.5');
  assert.deepEqual(run.source, { product: 'CueForge', listId: 'main', listName: 'Main', fileModifiedAt: '2026-10-07T12:00:00Z' });
  assert.equal(backup.includes('fixture-secret'), false);
  assert.equal(backup.includes('fixture-patch'), false);
  assert.equal(backup.includes('private.wav'), false);
  assert.equal(backup.includes('triggers'), false);
  const map = new Map();
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  assert.equal(save(run, storage, null), backup);
  assert.deepEqual(validate(JSON.parse(map.get(STORE))).cues[0].sourceRow, safeSource.cueLists[0].cues[0]);
  assert.equal(raw, JSON.stringify(source));
  assert.throws(() => cueForgeLists(JSON.stringify({ ...source, version: 8 })), /version 7/);
});

test('CueForge rejects ambiguous or malformed identities before offering a list', () => {
  const source = { version: 7, name: 'Show', modifiedAt: '2026-10-07T12:00:00Z', cueLists: [
    { id: 'first', name: 'First', cues: [{ id: 'one', number: '1', name: 'First cue', type: 'audio', notes: '' }] },
    { id: 'second', name: 'Second', cues: [{ id: 'two', number: '2', name: 'Second cue', type: 'video', notes: '' }] },
  ] };
  const read = value => cueForgeLists(JSON.stringify(value));
  assert.equal(fromCueForge(read(source), 'second').cues[0].sourceRow.id, 'two');
  assert.throws(() => read({ ...source, cueLists: [{ ...source.cueLists[0], id: ' ' }, source.cueLists[1]] }), /empty ID/);
  assert.throws(() => read({ ...source, cueLists: [source.cueLists[0], { ...source.cueLists[1], id: 'first' }] }), /duplicate cue list ID/);
  assert.throws(() => fromCueForge({ ...source, cueLists: [source.cueLists[0], { ...source.cueLists[1], id: 'first' }] }, 'first'), /duplicate cue list ID/);
  assert.throws(() => read({ ...source, cueLists: [{ ...source.cueLists[0], cues: [{ ...source.cueLists[0].cues[0], id: '' }] }, source.cueLists[1]] }), /empty ID/);
  assert.throws(() => read({ ...source, cueLists: [{ ...source.cueLists[0], cues: [source.cueLists[0].cues[0], { ...source.cueLists[0].cues[0] }] }, source.cueLists[1]] }), /duplicate cue ID/);
  assert.throws(() => read({ ...source, cueLists: [{ ...source.cueLists[0], cues: [{ ...source.cueLists[0].cues[0], number: 1 }] }, source.cueLists[1]] }), /number is invalid/);
  assert.throws(() => read({ ...source, cueLists: [{ ...source.cueLists[0], cues: [{ ...source.cueLists[0].cues[0], id: 'x'.repeat(101) }] }, source.cueLists[1]] }), /ID is invalid or too long/);
});
