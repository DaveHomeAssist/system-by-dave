import test from 'node:test';
import assert from 'node:assert/strict';
import { empty, validate, addRecord, updateRecord, handoff, SCHEMA } from './model.mjs';
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
