import test from 'node:test';
import assert from 'node:assert/strict';
import { referenceIdentity } from '../public/reference-view.js';

const recorded = {lane: 'A', model: 'Unassigned', internalSlot: null};
const assigned = {projectors: [{lane: 'A', slot: 'P3', make: 'Panasonic', model: 'PT-DW830U', status: {online: false}}]};

test('connected reference uses the relay assignment even when the device is offline', () => {
  assert.deepEqual(referenceIdentity(recorded, assigned, true), {model: 'Panasonic PT-DW830U', assignment: 'Relay slot P3'});
  const moved = structuredClone(assigned);
  moved.projectors[0].slot = 'P4';
  moved.projectors[0].model = 'Panasonic PT-RZ970';
  assert.deepEqual(referenceIdentity(recorded, moved, true), {model: 'Panasonic PT-RZ970', assignment: 'Relay slot P4'});
});

test('empty and duplicate live lanes never borrow a recorded control assignment', () => {
  const saved = {...recorded, model: 'Panasonic PT-DW830U', internalSlot: 'P3'};
  assert.deepEqual(referenceIdentity(saved, {projectors: []}, true), {model: 'Unassigned', assignment: 'No assigned live device'});
  const duplicate = {projectors: [...assigned.projectors, {...assigned.projectors[0], slot: 'P4'}]};
  assert.deepEqual(referenceIdentity(saved, duplicate, true), {model: 'Assignment conflict', assignment: 'Multiple control slots use this lane'});
});

test('disconnected and simulated references identify the source of the assignment', () => {
  const saved = {...recorded, model: 'Panasonic PT-DW830U', internalSlot: 'P3'};
  assert.deepEqual(referenceIdentity(saved, assigned, false), {model: saved.model, assignment: 'Recorded slot P3'});
  assert.equal(referenceIdentity(saved, {...assigned, simulation: true}, true).assignment, 'Simulator slot P3');
});
