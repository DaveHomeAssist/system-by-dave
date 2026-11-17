import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOscTarget, slotsForSelector, recordedSlotLabel, isLaneId } from '../server/rig-lanes.js';
import { isBlockedByShowLock, showLockRefusal } from '../server/show-lock.js';

const alpha = [
  { slot: 'QA', lane: 'A' },
  { slot: 'QB', lane: 'B' },
  { slot: 'QC', lane: 'C' },
  { slot: 'QD', lane: 'D' },
];
const beta = [
  { slot: 'QA', lane: 'D' },
  { slot: 'QB', lane: 'C' },
  { slot: 'QC', lane: 'B' },
  { slot: 'QD', lane: 'A' },
];

test('lane letters resolve to whatever the fixture rig assigns, not a hard-coded slot map', () => {
  assert.deepEqual(resolveOscTarget(alpha, 'A').slots, ['QA']);
  assert.deepEqual(resolveOscTarget(alpha, 'C').slots, ['QC']);
  assert.deepEqual(resolveOscTarget(beta, 'A').slots, ['QD']);
  assert.deepEqual(resolveOscTarget(beta, 'C').slots, ['QB']);
  assert.equal(resolveOscTarget(alpha, 'A').kind, 'lane');
  assert.deepEqual(resolveOscTarget(alpha, 'all').slots, ['QA', 'QB', 'QC', 'QD']);
  assert.deepEqual(resolveOscTarget(alpha, 'QA').slots, ['QA']);
  assert.equal(resolveOscTarget(alpha, 'QA').kind, 'slot');
});

test('unassigned lanes are refused rather than inventing a slot', () => {
  const empty = [{ slot: 'QA' }, { slot: 'QB' }];
  assert.throws(() => resolveOscTarget(empty, 'A'), /unassigned/);
  const { slots, missing } = slotsForSelector(empty, 'portals');
  assert.deepEqual(slots, []);
  assert.deepEqual(missing, ['A', 'B', 'D']);
});

test('portals and stage follow lane letters on two different fixtures', () => {
  assert.deepEqual(slotsForSelector(alpha, 'portals').slots, ['QA', 'QB', 'QD']);
  assert.deepEqual(slotsForSelector(alpha, 'stage').slots, ['QC']);
  assert.deepEqual(slotsForSelector(beta, 'portals').slots, ['QD', 'QC', 'QA']); // A,B,D order
  assert.deepEqual(slotsForSelector(beta, 'stage').slots, ['QB']);
  assert.deepEqual(slotsForSelector(beta, 'portals').missing, []);
});

test('displayed slot IDs are labeled recorded, not verified', () => {
  assert.equal(recordedSlotLabel('QA'), 'QA (recorded, not verified)');
  assert.equal(isLaneId('A'), true);
  assert.equal(isLaneId('P1'), false);
  assert.equal(isLaneId('QA'), false);
});

test('Show Lock allows shutter close and lens stop, refuses open/power/input/lens move', () => {
  assert.equal(isBlockedByShowLock('shutter', true), false);
  assert.equal(isBlockedByShowLock('shutter', false), true);
  assert.equal(isBlockedByShowLock('power', true), true);
  assert.equal(isBlockedByShowLock('power', false), true);
  assert.equal(isBlockedByShowLock('input', '31'), true);
  assert.equal(isBlockedByShowLock('lens', { op: 'stop' }), false);
  assert.equal(isBlockedByShowLock('lens', { op: 'move', axis: 'focus' }), true);
  assert.equal(isBlockedByShowLock('pattern', 'off'), true);
  assert.match(showLockRefusal('shutter', false), /opening shutters is refused/i);
  assert.match(showLockRefusal('power', true), /power commands are refused/i);
  assert.match(showLockRefusal('lens', { op: 'move' }), /Stop lens stays available/i);
});
