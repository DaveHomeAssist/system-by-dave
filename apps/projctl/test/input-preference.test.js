import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveInputPreference } from '../server/input-preference.js';
import { startRelay, until } from './relay-helper.js';

test('HDMI defaults resolve metadata for each model and refuse ambiguity or missing support', () => {
  for (const [inputs, value] of [[{ '31': 'HDMI', '32': 'DVI-D' }, '31'], [{ '31': 'DVI-D', '32': 'HDMI' }, '32'], [{ HDMI: 'HDMI', SDI: 'SDI' }, 'HDMI'], [{ hdmi1: 'HDMI 1' }, 'hdmi1']]) {
    assert.equal(resolveInputPreference(inputs).value, value);
    assert.equal(resolveInputPreference(inputs).available, true);
  }
  for (const inputs of [undefined, {}, { '31': 'DVI-D' }, { a: 'HDMI 1', b: 'HDMI 2' }, { a: 'HDMI', b: 'HDMI' }]) {
    assert.equal(resolveInputPreference(inputs).available, false);
    assert.equal(resolveInputPreference(inputs).value, null);
    assert.ok(resolveInputPreference(inputs).reason);
  }
});

test('reset uses per-device HDMI, remains explicit, and respects lock/offline/unsupported targets', async t => {
  const r = await startRelay(); t.after(r.close);
  await r.api('projector', { slot: 'P1', inputs: { HDMI: 'HDMI', SDI: 'SDI' } });
  await r.api('projector', { slot: 'P2', inputs: { '31': 'DVI-D', '32': 'HDMI' } });
  await r.api('projector', { slot: 'P3', inputs: { a: 'HDMI 1', b: 'HDMI 2' } });
  await r.api('projector', { slot: 'P4', ip: '' });
  await r.api('command', { slot: 'P1', cmd: 'input', arg: 'SDI' });
  await r.api('command', { slot: 'P2', cmd: 'input', arg: '31' });
  await r.api('preferred-input', { input: 'HDMI' });
  assert.equal((await r.state()).projectors.find(p => p.slot === 'P1').status.input, 'SDI', 'setting a preference sends no input command');
  await r.api('lock', { lock: true });
  const locked = (await r.api('command', { slot: 'all', cmd: 'resetInput' })).body;
  assert.match(locked.P1.error, /lock/);
  assert.match(locked.P2.error, /lock/);
  await r.api('lock', { lock: false });
  const reset = (await r.api('command', { slot: 'all', cmd: 'resetInput' })).body;
  assert.equal(reset.P1.result, 'OK'); assert.equal(reset.P2.result, 'OK');
  assert.match(reset.P3.error, /specific HDMI/); assert.match(reset.P4.error, /offline/);
  const state = await r.state();
  assert.equal(state.projectors.find(p => p.slot === 'P1').status.input, 'HDMI');
  assert.equal(state.projectors.find(p => p.slot === 'P2').status.input, '32');
  assert.equal(state.projectors.find(p => p.slot === 'P2').inputPreference.value, '32');
  assert.equal((await r.api('preferred-input', { input: 'SDI' })).status, 400);
  await until(() => fs.existsSync(r.rigFile) && JSON.parse(fs.readFileSync(r.rigFile)).preferredInput === 'HDMI');
});
