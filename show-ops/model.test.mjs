import test from 'node:test';
import assert from 'node:assert/strict';
import { empty, validate, addRecord, updateRecord, handoff, SCHEMA, ROOM_CHECK_SCHEMA, MAX_ROOM_CHECK_BYTES, parseRoomCheck, previewRoomCheck, copyRoomCheck, TASK_BOARD_SCHEMA, MAX_TASK_BOARD_BYTES, parseTaskBoard, previewTaskBoard, copyTaskBoard, CREW_CALL_SCHEMA, MAX_CREW_CALL_BYTES, parseCrewCall, previewCrewCall, copyCrewCall } from './model.mjs';
const roomCheck = (items = [
  { id: 'check-1', area: 'room', check: 'Sightlines', owner: 'Lead tech', due: '07:30', priority: 'high', status: 'ready', blocker: '', notes: 'Back row checked', custom: 'Keep exact original' },
  { id: 'check-2', area: 'video', check: 'DSM route', owner: 'V1', due: '08:00', priority: 'normal', status: 'issue', blocker: 'Aux missing', notes: 'Ask switcher' }
]) => JSON.stringify({ schema: ROOM_CHECK_SCHEMA, exportedAt: '2026-10-08T10:00:00Z', meta: { showName: 'Test show', showDate: '2026-10-08', venue: 'Hall', room: 'Main' }, items });
const ids = () => { let count = 0; return () => `copy-${++count}`; };
const taskBoard = (items = [
  { id: 'task-1', area: 'video', task: 'Replace DSM cable', owner: 'V1', priority: 'critical', due: '09:00', status: 'blocked', source: 'Line check', blocker: 'Spare cable needed', notes: 'Case A3' },
  { id: 'task-2', area: 'audio', task: 'Confirm lectern mic', owner: 'A1', priority: 'normal', due: '09:15', status: 'in-progress', source: 'Sound check', blocker: '', notes: '' },
  { id: 'task-3', area: 'stage', task: 'Tape lectern', owner: 'Stage', priority: 'low', due: '08:00', status: 'done', source: 'Room walk', blocker: '', notes: '' },
  { id: 'task-4', area: 'comms', task: 'Swap beltpack', owner: 'Comms', priority: 'normal', due: '10:00', status: 'deferred', source: 'Operator', blocker: '', notes: '' }
]) => JSON.stringify({ schema: TASK_BOARD_SCHEMA, exportedAt: '2026-10-08T10:00:00Z', meta: { showName: 'Test show', client: 'Client', venue: 'Hall', room: 'Main', showDate: '2026-10-08', boardLead: 'Lead', showCaller: 'Caller', shift: 'Day', handoffTime: '17:00' }, items });
const crewCall = (items = [
  { id: 'crew-1', section: 'audio', name: 'A1', role: 'Audio Lead', call: '07:30', location: 'FOH', meal: '12:30', release: '18:00', phone: '555-0101', status: 'on-site', notes: 'Mixes show' },
  { id: 'crew-2', section: 'stage', name: 'Stagehand', role: 'Labor', call: '08:00', location: 'Dock', meal: '13:00', release: '17:00', phone: '555-0102', status: 'problem', notes: 'Awaiting access' },
  { id: 'crew-3', section: 'video', name: 'V1', role: 'Video Lead', call: '07:00', location: 'Video world', meal: '12:00', release: '18:30', phone: '555-0103', status: 'wrapped', notes: 'Released' }
], saved = false) => JSON.stringify({ schema: CREW_CALL_SCHEMA, [saved ? 'savedAt' : 'exportedAt']: '2026-10-08T10:00:00Z', meta: { showName: 'Test show', client: 'Client', venue: 'Hall', showDate: '2026-10-08', advanceLead: 'PM', loadIn: '07:00', handoffTo: 'Caller' }, items, ...(saved ? { selectedId: 'crew-1', filters: { search: '', section: 'all', status: 'all' } } : {}) });
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
test('active Show Task Board copy is unsaved Open work with exact provenance and older backup compatibility', () => {
  const raw = taskBoard();
  const preview = previewTaskBoard(empty(), raw);
  assert.deepEqual(preview.available.map(item => item.id), ['task-1', 'task-2']);
  assert.equal(preview.excluded, 2);
  const doc = copyTaskBoard(empty(), preview, ['task-1'], 'file', '2026-10-08T11:00:00Z', ids());
  assert.equal(doc.show, 'Test show'); assert.equal(doc.date, '2026-10-08');
  assert.equal(doc.tasks[0].status, 'Open');
  assert.equal(doc.tasks[0].taskSource.snapshot.status, 'blocked');
  assert.equal(doc.tasks[0].taskSource.snapshot.blocker, 'Spare cable needed');
  assert.match(doc.tasks[0].detail, /Owner: V1.*Due: 09:00.*Blocker: Spare cable needed/);
  assert.equal(doc.taskBoardSources[0].raw, raw);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(doc))), doc);
  assert.deepEqual(validate({ schema: SCHEMA, show: 'Old', date: '', notes: '', rooms: [], crew: [], tasks: [] }).taskBoardSources, []);
});
test('Show Task Board rejects conflicts, repeated and inactive task selections without changing the input', () => {
  const raw = taskBoard(); const before = empty(); const baseline = JSON.stringify(before);
  assert.throws(() => previewTaskBoard({ ...before, show: 'Other' }, raw), /show differs/);
  assert.throws(() => previewTaskBoard({ ...before, date: '2026-10-09' }, raw), /date differs/);
  assert.throws(() => copyTaskBoard(before, previewTaskBoard(before, raw), ['task-1', 'task-1'], 'saved', '2026-10-08T11:00:00Z', ids()), /distinct/);
  assert.throws(() => copyTaskBoard(before, previewTaskBoard(before, raw), ['task-3'], 'saved', '2026-10-08T11:00:00Z', ids()), /unavailable/);
  const nextId = ids();
  const first = copyTaskBoard(before, previewTaskBoard(before, raw), ['task-1'], 'saved', '2026-10-08T11:00:00Z', nextId);
  assert.deepEqual(previewTaskBoard(first, raw).available.map(item => item.id), ['task-2']);
  const second = copyTaskBoard(first, previewTaskBoard(first, raw), ['task-2'], 'file', '2026-10-08T12:00:00Z', nextId);
  assert.equal(second.taskBoardSources.length, 1);
  assert.throws(() => previewTaskBoard(second, raw), /No new active/);
  const changed = JSON.parse(raw); changed.items[0].notes = 'Updated elsewhere';
  assert.deepEqual(previewTaskBoard(first, JSON.stringify(changed)).available.map(item => item.id), ['task-2']);
  assert.equal(JSON.stringify(before), baseline);
});
test('Show Task Board source validation rejects malformed, unsupported, oversized and ambiguous data', () => {
  assert.throws(() => parseTaskBoard('{bad'), /could not be parsed/);
  assert.throws(() => parseTaskBoard('é'.repeat(MAX_TASK_BOARD_BYTES / 2 + 1)), /exceeds 500 KB/);
  const duplicate = JSON.parse(taskBoard()); duplicate.items[1].id = duplicate.items[0].id;
  assert.throws(() => parseTaskBoard(JSON.stringify(duplicate)), /duplicate task/);
  const unknown = JSON.parse(taskBoard()); unknown.items[0].status = 'verified';
  assert.throws(() => parseTaskBoard(JSON.stringify(unknown)), /unsupported/);
  unknown.items[0].status = 'blocked'; unknown.items[0].password = 'unsafe';
  assert.throws(() => parseTaskBoard(JSON.stringify(unknown)), /unsupported/);
  delete unknown.items[0].password; unknown.schema = 'system-by-dave.show-task-board.v2';
  assert.throws(() => parseTaskBoard(JSON.stringify(unknown)), /Show Task Board v1/);
  unknown.schema = TASK_BOARD_SCHEMA; unknown.meta.showDate = '2026-02-30';
  assert.throws(() => parseTaskBoard(JSON.stringify(unknown)), /valid show date/);
});
test('Show Task Board provenance rejects missing source and changed active status', () => {
  const raw = taskBoard();
  const doc = copyTaskBoard(empty(), previewTaskBoard(empty(), raw), ['task-1'], 'file', '2026-10-08T11:00:00Z', ids());
  const missing = structuredClone(doc); missing.taskBoardSources = [];
  assert.throws(() => validate(missing), /Show Task Board provenance/);
  const changed = structuredClone(doc); const source = JSON.parse(raw); source.items[0].status = 'done'; changed.taskBoardSources[0].raw = JSON.stringify(source);
  assert.throws(() => validate(changed), /Show Task Board provenance/);
});
test('Crew Call saved and exported copies keep exact source and never infer attendance', () => {
  const raw = crewCall(undefined, true);
  const preview = previewCrewCall(empty(), raw);
  assert.deepEqual(preview.available.map(item => item.id), ['crew-1', 'crew-2']);
  assert.equal(preview.excluded, 1);
  const doc = copyCrewCall(empty(), preview, ['crew-1', 'crew-2'], 'saved', '2026-10-09T04:00:00Z', ids());
  assert.equal(doc.show, 'Test show'); assert.equal(doc.date, '2026-10-08');
  assert.deepEqual(doc.crew.map(row => row.status), ['Called', 'Called']);
  assert.deepEqual(doc.crew.map(row => row.crewSource.snapshot.status), ['on-site', 'problem']);
  assert.equal(doc.crew[0].crewSource.snapshot.phone, '555-0101');
  assert.equal(doc.crew[1].crewSource.snapshot.notes, 'Awaiting access');
  assert.equal(doc.crewCallSources[0].raw, raw);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(doc))), doc);
  assert.deepEqual(validate({ schema: SCHEMA, show: 'Old', date: '', notes: '', rooms: [], crew: [], tasks: [] }).crewCallSources, []);
  assert.deepEqual(parseCrewCall(crewCall()).active.map(item => item.id), ['crew-1', 'crew-2']);
});
test('Crew Call rejects show/date conflicts, repeated or wrapped rows and stale source revisions', () => {
  const raw = crewCall(); const before = empty(); const baseline = JSON.stringify(before);
  assert.throws(() => previewCrewCall({ ...before, show: 'Another show' }, raw), /show differs/);
  assert.throws(() => previewCrewCall({ ...before, date: '2026-10-09' }, raw), /date differs/);
  assert.throws(() => copyCrewCall(before, previewCrewCall(before, raw), ['crew-1', 'crew-1'], 'file', '2026-10-09T04:00:00Z', ids()), /distinct/);
  assert.throws(() => copyCrewCall(before, previewCrewCall(before, raw), ['crew-3'], 'file', '2026-10-09T04:00:00Z', ids()), /unavailable/);
  const nextId = ids();
  const first = copyCrewCall(before, previewCrewCall(before, raw), ['crew-1'], 'file', '2026-10-09T04:00:00Z', nextId);
  assert.deepEqual(previewCrewCall(first, raw).available.map(item => item.id), ['crew-2']);
  const changed = JSON.parse(raw); changed.items[0].notes = 'Changed at source';
  assert.deepEqual(previewCrewCall(first, JSON.stringify(changed)).available.map(item => item.id), ['crew-2']);
  assert.throws(() => copyCrewCall(first, previewCrewCall(first, JSON.stringify(changed)), ['crew-1'], 'file', '2026-10-09T04:30:00Z', nextId), /unavailable/);
  const second = copyCrewCall(first, previewCrewCall(first, raw), ['crew-2'], 'file', '2026-10-09T05:00:00Z', nextId);
  assert.equal(second.crewCallSources.length, 1);
  assert.throws(() => previewCrewCall(second, raw), /No new active/);
  assert.equal(JSON.stringify(before), baseline);
});
test('Crew Call parser rejects malformed, future, oversized and ambiguous input', () => {
  assert.throws(() => parseCrewCall('{bad'), /could not be parsed/);
  assert.throws(() => parseCrewCall('é'.repeat(MAX_CREW_CALL_BYTES / 2 + 1)), /exceeds 500 KB/);
  const duplicate = JSON.parse(crewCall()); duplicate.items[1].id = duplicate.items[0].id;
  assert.throws(() => parseCrewCall(JSON.stringify(duplicate)), /duplicate crew member/);
  const unknown = JSON.parse(crewCall()); unknown.items[0].status = 'verified';
  assert.throws(() => parseCrewCall(JSON.stringify(unknown)), /unsupported/);
  unknown.items[0].status = 'on-site'; unknown.items[0].token = 'unsafe';
  assert.throws(() => parseCrewCall(JSON.stringify(unknown)), /unsupported/);
  delete unknown.items[0].token; unknown.schema = 'system-by-dave.crew-call.v2';
  assert.throws(() => parseCrewCall(JSON.stringify(unknown)), /Crew Call v1/);
  unknown.schema = CREW_CALL_SCHEMA; unknown.meta.showDate = '2026-02-30';
  assert.throws(() => parseCrewCall(JSON.stringify(unknown)), /valid show date/);
  unknown.meta.showDate = '2026-10-08'; unknown.meta.showName = 'Untitled Crew Call';
  assert.throws(() => parseCrewCall(JSON.stringify(unknown)), /named show/);
});
test('Crew Call provenance and source history reject tampering without mutating the candidate', () => {
  const raw = crewCall();
  const doc = copyCrewCall(empty(), previewCrewCall(empty(), raw), ['crew-1'], 'file', '2026-10-09T04:00:00Z', ids());
  const missing = structuredClone(doc); missing.crewCallSources = [];
  assert.throws(() => validate(missing), /Crew Call provenance/);
  const changed = structuredClone(doc); const source = JSON.parse(raw); source.items[0].status = 'wrapped'; changed.crewCallSources[0].raw = JSON.stringify(source);
  assert.throws(() => validate(changed), /Crew Call provenance/);
  const many = structuredClone(doc); many.crewCallSources = Array.from({ length: 21 }, () => doc.crewCallSources[0]);
  assert.throws(() => validate(many), /Crew Call source history/);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(doc))), doc);
});
