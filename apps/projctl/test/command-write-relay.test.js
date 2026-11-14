import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import dgram from 'node:dgram';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { startRelay, until, oscInt } from './relay-helper.js';

async function delayedRelay(t, method) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-guard-'));
  const rig = JSON.parse(fs.readFileSync(new URL('../data/rig.sim.json', import.meta.url), 'utf8'));
  rig.events = [];
  rig.presets = [
    { name: 'Inputs', perSlot: { P1: { input: '32' }, P2: { input: '32' } } },
    { name: 'Lenses', perSlot: { P1: { lens: { focus: 1500 } }, P2: { lens: { focus: 1500 } } } },
  ];
  const rigFile = path.join(dir, 'rig.json'), gate = path.join(dir, 'gate');
  fs.writeFileSync(rigFile, JSON.stringify(rig));
  const relay = await startRelay({
    RIG: rigFile, PROJCTL_TEST_GATE: gate, PROJCTL_TEST_DELAY_METHOD: method,
    NODE_OPTIONS: `--loader ${fileURLToPath(new URL('./delayed-driver-loader.mjs', import.meta.url))}`,
  });
  const release = () => fs.writeFileSync(gate + '.release', 'release');
  t.after(async () => { release(); await relay.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  return { ...relay, release, waiting: () => until(() => fs.existsSync(gate + '.started')) };
}
const successful = (state, command) => state.events.filter(event => event.command?.startsWith(command + ' ') && event.result === 'OK');

test('API target changes during a pending shutter command prevent its write', async t => {
  const relay = await delayedRelay(t, 'shutter');
  const pending = relay.api('command', { slot: 'P1', cmd: 'shutter', arg: 0 });
  await relay.waiting();
  await relay.api('projector', { slot: 'P1', model: 'Replacement' });
  relay.release();
  const result = await pending;
  assert.match(result.body.P1.error, /configuration changed/);
  assert.equal(successful(await relay.state(), 'shutter').length, 0);
});

test('group writes remain revoked after Show Lock is enabled and then disabled', async t => {
  const relay = await delayedRelay(t, 'input');
  const pending = relay.api('command', { slot: 'all', cmd: 'input', arg: '32' });
  await relay.waiting();
  await relay.api('lock', { lock: true });
  await relay.api('lock', { lock: false });
  relay.release();
  const result = await pending;
  assert.ok(Object.values(result.body).every(value => /Show lock changed/.test(value.error)));
  assert.equal(successful(await relay.state(), 'input').length, 0);
});

test('legacy presets retain their original later target while an earlier write waits', async t => {
  const relay = await delayedRelay(t, 'input');
  const pending = relay.api('preset/recall', { name: 'Inputs' });
  await relay.waiting();
  await relay.api('projector', { slot: 'P2', model: 'Replacement' });
  relay.release();
  const result = await pending;
  assert.equal(result.body.P1, 'OK');
  assert.match(result.body.P2, /configuration changed/);
  assert.deepEqual(successful(await relay.state(), 'input').map(event => event.slot), ['P1']);
});

test('confirmed lens presets reject a target changed before a delayed movement', async t => {
  const relay = await delayedRelay(t, 'recallLens');
  const review = (await relay.api('preset/recall', { name: 'Lenses' })).body;
  assert.ok(review.confirm);
  const pending = relay.api('preset/recall', { name: 'Lenses', confirmLens: review.confirm });
  await relay.waiting();
  await relay.api('projector', { slot: 'P1', model: 'Replacement' });
  relay.release();
  const result = await pending;
  assert.match(result.body.projectors.P1.result, /configuration changed/);
  assert.equal(successful(await relay.state(), 'lens').some(event => event.slot === 'P1'), false);
});

for (const transport of ['tcp', 'osc']) {
  test(`${transport} cue writes remain revoked after a lock transition while queued`, async t => {
    const relay = await delayedRelay(t, 'input');
    let client;
    if (transport === 'tcp') {
      client = net.createConnection({ host: '127.0.0.1', port: relay.tcp });
      await once(client, 'connect');
      client.write('/proj/all/input 32\n');
      t.after(() => client.destroy());
    } else {
      client = dgram.createSocket('udp4');
      await new Promise((resolve, reject) => client.send(oscInt('/proj/all/input', 32), relay.udp, '127.0.0.1', error => error ? reject(error) : resolve()));
      t.after(() => client.close());
    }
    await relay.waiting();
    await relay.api('lock', { lock: true });
    await relay.api('lock', { lock: false });
    relay.release();
    await until(async () => (await relay.state()).events.filter(event => event.source?.startsWith(transport + ' ') && event.result === 'ERR').length >= 4);
    assert.equal(successful(await relay.state(), 'input').length, 0);
  });
}
