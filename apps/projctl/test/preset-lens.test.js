import test from 'node:test';
import assert from 'node:assert/strict';
import { lensPositionMatch, lensMotorState, lensSummary } from '../server/preset-lens.js';

test('position match, mismatch, unknown and motor stopped are independent', () => {
  assert.deepEqual(lensPositionMatch({ h: 499, v: 202, focus: null, zoom: 1005 }, { h: 500, v: 200, focus: 33, zoom: 1000 }, ['h', 'v', 'focus', 'zoom']), { h: 'match', v: 'mismatch (reported 202, saved 200)', focus: 'unknown', zoom: 'mismatch (reported 1005, saved 1000)' });
  assert.deepEqual(lensMotorState({ hState: 'Running', focusState: 'Stopped' }, ['h', 'focus', 'zoom']), { h: 'Running', focus: 'stopped', zoom: 'unknown' });
  const preset = { perSlot: { P1: { lens: { h: 20, v: 30, focus: 40, zoom: 50 } } } };
  assert.equal(lensSummary(preset, () => ({})).P1.unsupported.length, 4);
});
