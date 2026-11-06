import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmations } from '../server/confirmations.js';

test('confirmation binds action, expires, and cannot replay or use the old preset bypass', () => {
  let now = 100;
  const gate = confirmations({ now: () => now });
  const targets = [{ slot: 'P2', identity: 'rig revision' }];
  const token = gate.issue('all:power:off', targets);
  assert.equal(gate.take('P2:power:off', token), null);
  assert.equal(gate.take('all:power:off', 'preset'), null);
  assert.deepEqual(gate.take('all:power:off', token), targets);
  assert.equal(gate.take('all:power:off', token), null);
  const expired = gate.issue('all:power:off', targets);
  now += 3000;
  assert.equal(gate.take('all:power:off', expired), null);
  const locked = gate.issue('all:power:off', targets);
  gate.clear();
  assert.equal(gate.take('all:power:off', locked), null);
});
