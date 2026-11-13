import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommandBinding } from '../server/command-binding.js';
import { startRelay } from './relay-helper.js';

test('reviewed revisions reject changed targets and changed groups', () => {
  const binding = createCommandBinding();
  const projectors = [{ slot: 'P1', ip: 'sim', model: 'Original', password: 'private' }, { slot: 'P2', ip: 'sim' }];
  const expected = projectors.map(p => ({ slot: p.slot, revision: binding.revision(p) }));
  const check = binding.guard(expected, () => projectors, 'all');
  check('P1');
  projectors[1].model = 'Replacement';
  assert.throws(() => check('P2'), /configuration changed/);
  assert.throws(() => binding.guard(expected.slice(0, 1), () => projectors, 'all'), /list changed/);
  assert.throws(() => binding.guard([{ slot: 'P1', revision: 'bad' }], () => projectors, 'P1'), /Invalid/);
  assert.notEqual(binding.revision(projectors[0]), createCommandBinding().revision(projectors[0]), 'opaque revisions are scoped to the relay process');
});

test('a stale reviewed group is rejected before any shutter command', async () => {
  const relay = await startRelay();
  try {
    const before = await relay.state();
    const expectedTargets = before.projectors.map(p => ({ slot: p.slot, revision: p.controlRevision }));
    await relay.api('projector', { slot: 'P1', model: 'Replacement after confirmation' });
    const result = await relay.api('command', { slot: 'all', cmd: 'shutter', arg: 0, expectedTargets });
    assert.equal(result.status, 409);
    assert.match(result.body.error, /configuration changed/);
    assert.equal((await relay.state()).events.filter(e => e.command?.startsWith('shutter')).length, 0);
  } finally { await relay.close(); }
});

test('new Panasonic defaults resolve HDMI to code 32', async () => {
  const relay = await startRelay();
  try {
    const projectors = (await relay.state()).projectors.filter(p => ['P2', 'P3', 'P4'].includes(p.slot));
    assert.ok(projectors.every(p => p.inputs['31'] === 'DVI-D' && p.inputs['32'] === 'HDMI'));
  } finally { await relay.close(); }
});
