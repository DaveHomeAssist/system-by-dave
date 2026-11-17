import test from 'node:test';
import assert from 'node:assert/strict';
import { startRelay, until } from './relay-helper.js';

test('a slow idle poll still observes simulated power and shutter transitions without command replay', { timeout: 25000 }, async t => {
  const relay = await startRelay({ POLL_MS: '60000' }); t.after(relay.close);
  const state = async () => (await relay.state()).projectors.find(p => p.slot === 'P4').status;
  const send = async (cmd, arg, extra = {}) => (await relay.api('command', { slot: 'P4', cmd, arg, ...extra })).body.P4;
  assert.equal((await send('power', 1)).result, 'OK');
  await until(async () => (await state()).power === 'warming', 2000);
  await until(async () => (await state()).power === 'on', 7000);
  assert.equal((await send('shutter', 0)).result, 'OK');
  await until(async () => (await state()).shutter === 'open', 2000);
  assert.equal((await send('shutter', 1)).result, 'OK');
  await until(async () => (await state()).shutter === 'closed', 2000);
  const confirmation = await send('power', 0);
  assert.ok(confirmation.confirm);
  assert.equal((await send('power', 0, { confirm: confirmation.confirm })).result, 'OK');
  await until(async () => (await state()).power === 'cooling', 2000);
  await until(async () => (await state()).power === 'off', 12000);
  const receipt = (await relay.state()).projectors.find(p => p.slot === 'P4').commandFeedback;
  assert.equal(receipt.phase, 'confirmed');
  assert.equal(receipt.expected, 'off');
  assert.ok(receipt.elapsedSeconds >= 6 && receipt.elapsedSeconds < 15);
  assert.equal(receipt.identity, undefined);
  const commands = (await relay.state()).events.filter(e => e.slot === 'P4' && /^(power|shutter) /.test(e.command));
  assert.deepEqual(commands.map(e => e.command), ['power 1', 'shutter 0', 'shutter 1', 'power 0']);
  assert.ok(commands.every(e => e.result === 'OK'));
});
