import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOsc } from '../server/osc.js';
import { oscInt } from './relay-helper.js';

test('OSC validates every truncation, padding and type before dispatch', () => {
  const valid = oscInt('/proj/all/power', 0);
  assert.deepEqual(parseOsc(valid), [{ addr: '/proj/all/power', args: [0] }]);
  for (let n = 0; n < valid.length; n++) {
    const parsed = parseOsc(valid.subarray(0, n));
    assert.ok(parsed.length === 0 || parsed.every((m) => m.args.length === 0), `truncated packet ${n} must not fabricate an argument`);
  }
  const badType = Buffer.from(valid); badType[badType.indexOf(',i') + 1] = 'b'.charCodeAt(0);
  assert.deepEqual(parseOsc(badType), []);
  const badPadding = Buffer.from(valid); badPadding[badPadding.indexOf(',i') + 3] = 1;
  assert.deepEqual(parseOsc(badPadding), []);
  const nan = Buffer.from(valid); nan[nan.indexOf(',i') + 1] = 'f'.charCodeAt(0); nan.writeFloatBE(NaN, nan.length - 4);
  assert.deepEqual(parseOsc(nan), []);
});
