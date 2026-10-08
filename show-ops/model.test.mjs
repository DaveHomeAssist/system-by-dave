import test from 'node:test';
import assert from 'node:assert/strict';
import { empty, validate, addRecord, updateRecord, handoff, SCHEMA, ROOM_CHECK_SCHEMA, MAX_ROOM_CHECK_BYTES, parseRoomCheck, previewRoomCheck, copyRoomCheck } from './model.mjs';
const roomCheck = (items = [
  { id: 'check-1', area: 'room', check: 'Sightlines', owner: 'Lead tech', due: '07:30', priority: 'high', status: 'ready', blocker: '', notes: 'Back row checked', custom: 'Keep exact original' },
  { id: 'check-2', area: 'video', check: 'DSM route', owner: 'V1', due: '08:00', priority: 'normal', status: 'issue', blocker: 'Aux missing', notes: 'Ask switcher' }
]) => JSON.stringify({ schema: ROOM_CHECK_SCHEMA, exportedAt: '2026-10-08T10:00:00Z', meta: { showName: 'Test show', showDate: '2026-10-08', venue: 'Hall', room: 'Main' }, items });
const ids = () => { let count = 0; return () => `copy-${++count}`; };
test('records survive JSON backup and reload with their statuses', () => {
  let doc = { ...empty(), show: 'Test show', date: '2026-10-07' };
  doc = addRecord(doc, 'rooms', 'Main room', 'Check projector');
  doc = addRecord(doc, 'crew', 'Camera operator', '08:00 call');
  doc = addRecord(doc, 'tasks', 'Check screens', 'Assigned to lead');
  doc = updateRecord(doc, 'rooms', doc.rooms[0].id, 'status', 'Ready');
  const restored = validate(JSON.parse(JSON.stringify(doc)));
  assert.equal(restored.show, 'Test show');
  assert.equal(handoff(restored).rooms.length, 0);
  assert.equal(handoff(restored).crew.length, 1);
  assert.equal(handoff(restored).tasks.length, 1);
});
test('invalid import fails without mutating current document', () => {
  const current = addRecord(empty(), 'tasks', 'Keep this');
  const bytes = JSON.stringify(current);
  assert.throws(() => validate({ ...current, tasks: [{ id: 'x', name: 'Oops', detail: '', status: 'invented' }] }), /Invalid tasks record/);
  assert.throws(() => validate({ ...current, schema: 'wrong' }), /not a Show Ops/);
  assert.equal(JSON.stringify(current), bytes);
  assert.equal(current.schema, SCHEMA);
});
test('Room Check copy keeps source bytes and every original field without asserting readiness', () => {
  const raw = roomCheck();
  const candidate = previewRoomCheck(empty(), raw);
  assert.equal(candidate.available.length, 2);
  const copied = copyRoomCheck(empty(), candidate, ['check-1', 'check-2'], 'file', '2026-10-08T11:00:00Z', ids());
  assert.equal(copied.show, 'Test show');
  assert.equal(copied.date, '2026-10-08');
  assert.deepEqual(copied.rooms.map(row => row.status), ['Needs check', 'Needs check']);
  assert.deepEqual(copied.rooms.map(row => row.source.snapshot.status), ['ready', 'issue']);
  assert.equal(copied.rooms[1].source.snapshot.blocker, 'Aux missing');
  assert.equal(copied.roomCheckSources[0].raw, raw);
  assert.equal(JSON.parse(copied.roomCheckSources[0].raw).items[0].custom, 'Keep exact original');
  assert.deepEqual(validate(JSON.parse(JSON.stringify(copied))), copied);
});
test('older Show Ops v1 backups load without a source list', () => {
  const old = { schema: SCHEMA, show: 'Old show', date: '2026-10-08', notes: '', rooms: [], crew: [], tasks: [] };
  assert.deepEqual(validate(old).roomCheckSources, []);
});
test('Room Check show and date must match, and selected checks remain distinct', () => {
  const raw = roomCheck();
  assert.throws(() => previewRoomCheck({ ...empty(), show: 'Another show' }, raw), /show differs/);
  assert.throws(() => previewRoomCheck({ ...empty(), date: '2026-10-09' }, raw), /date differs/);
  const nextId = ids();
  const first = copyRoomCheck(empty(), previewRoomCheck(empty(), raw), ['check-1'], 'saved', '2026-10-08T11:00:00Z', nextId);
  assert.equal(previewRoomCheck(first, raw).available.length, 1);
  const second = copyRoomCheck(first, previewRoomCheck(first, raw), ['check-2'], 'file', '2026-10-08T12:00:00Z', nextId);
  assert.equal(second.rooms.length, 2);
  assert.equal(second.roomCheckSources.length, 1);
  assert.equal(second.rooms[0].source.sourceId, second.rooms[1].source.sourceId);
  assert.throws(() => previewRoomCheck(second, raw), /already copied/);
  assert.throws(() => copyRoomCheck(first, previewRoomCheck(first, raw), ['check-1'], 'file', '2026-10-08T12:00:00Z', ids()), /unavailable/);
});
test('repeated partial copies of unchanged source reuse one history entry', () => {
  const items = Array.from({ length: 25 }, (_, index) => ({ id: `part-${index}`, area: 'room', check: `Check ${index}`, owner: '', due: '', priority: 'normal', status: 'pending', blocker: '', notes: '' }));
  const raw = roomCheck(items);
  const nextId = ids();
  let doc = empty();
  for (const item of items) doc = copyRoomCheck(doc, previewRoomCheck(doc, raw), [item.id], 'file', '2026-10-08T12:00:00Z', nextId);
  assert.equal(doc.roomCheckSources.length, 1);
  assert.equal(doc.rooms.length, items.length);
  assert.deepEqual(new Set(doc.rooms.map(row => row.source.sourceId)), new Set([doc.roomCheckSources[0].id]));
});
test('Room Check rejects malformed, oversized, duplicate and unsupported source data', () => {
  assert.throws(() => parseRoomCheck('{bad'), /could not be parsed/);
  assert.throws(() => parseRoomCheck('x'.repeat(MAX_ROOM_CHECK_BYTES + 1)), /exceeds 500 KB/);
  assert.throws(() => parseRoomCheck('é'.repeat(MAX_ROOM_CHECK_BYTES / 2 + 1)), /exceeds 500 KB/);
  assert.throws(() => parseRoomCheck(roomCheck([{ id: 'x', area: 'room', check: 'A', owner: '', due: '', priority: 'normal', status: 'ready', blocker: '', notes: '' }, { id: 'x', area: 'room', check: 'B', owner: '', due: '', priority: 'normal', status: 'ready', blocker: '', notes: '' }])), /duplicate check/);
  const unknown = JSON.parse(roomCheck()); unknown.items[0].status = 'verified';
  assert.throws(() => parseRoomCheck(JSON.stringify(unknown)), /unsupported/);
  unknown.items[0].status = 'ready'; unknown.schema = 'system-by-dave.room-check.v2';
  assert.throws(() => parseRoomCheck(JSON.stringify(unknown)), /Room Check v1/);
  unknown.schema = ROOM_CHECK_SCHEMA; unknown.meta.showDate = '2026-02-30';
  assert.throws(() => parseRoomCheck(JSON.stringify(unknown)), /valid show date/);
});
test('invalid source provenance and duplicate selection cannot alter a saved candidate', () => {
  const raw = roomCheck();
  const before = empty(); const bytes = JSON.stringify(before);
  assert.throws(() => copyRoomCheck(before, previewRoomCheck(before, raw), ['check-1', 'check-1'], 'file', '2026-10-08T11:00:00Z', ids()), /distinct/);
  const copied = copyRoomCheck(before, previewRoomCheck(before, raw), ['check-1'], 'file', '2026-10-08T11:00:00Z', ids());
  const broken = structuredClone(copied); broken.roomCheckSources[0].raw = roomCheck([]);
  assert.throws(() => validate(broken), /Room Check v1/);
  assert.equal(JSON.stringify(before), bytes);
});
