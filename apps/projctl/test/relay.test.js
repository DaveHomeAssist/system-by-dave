import test from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import net from 'node:net';
import { startRelay, until, oscInt } from './relay-helper.js';

const off = { slot: 'all', cmd: 'power', arg: 0 };
for (const offline of [null, 'P1', 'P3']) {
  test(`bulk off reaches every confirmed slot with ${offline || 'none'} offline`, { timeout: 15000 }, async (t) => {
    const relay = await startRelay(); t.after(relay.close);
    if (offline) await relay.api('projector', { slot: offline, ip: '' });
    await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
    const first = (await relay.api('command', off)).body;
    assert.deepEqual(first.all.targets, ['P1', 'P2', 'P3', 'P4'].filter((s) => s !== offline));
    const second = (await relay.api('command', { ...off, confirm: first.all.confirm })).body;
    for (const s of first.all.targets) assert.equal(second[s].result, 'OK');
    if (offline) assert.match(second[offline].error, /skipped/);
    await until(async () => (await relay.state()).projectors.filter((p) => p.slot !== offline).every((p) => p.status.power === 'cooling'));
    const events = (await relay.state()).events.filter((e) => e.command === 'power 0' && e.result === 'OK');
    assert.deepEqual(events.map((e) => e.slot), first.all.targets);
    assert.ok((await relay.api('command', { ...off, confirm: first.all.confirm })).body.all.confirm, 'replay requires a new confirmation');
  });
}

test('confirmation does not add newly online slots or follow changed configuration', async (t) => {
  const r = await startRelay(); t.after(r.close);
  await r.api('projector', { slot: 'P1', ip: '' });
  const first = (await r.api('command', off)).body;
  await r.api('projector', { slot: 'P1', ip: 'sim' });
  await r.api('projector', { slot: 'P3', ip: 'changed-simulator' });
  const out = (await r.api('command', { ...off, confirm: first.all.confirm })).body;
  assert.match(out.P1.error, /skipped/);
  assert.match(out.P3.error, /configuration changed/);
  assert.equal(out.P2.result, 'OK'); assert.equal(out.P4.result, 'OK');
});

test('single-slot confirmations, lock invalidation and power argument validation', async (t) => {
  const r = await startRelay(); t.after(r.close);
  const one = { slot: 'P2', cmd: 'power', arg: 0 };
  const first = (await r.api('command', one)).body.P2;
  assert.ok((await r.api('command', { ...off, confirm: first.confirm })).body.all.confirm);
  assert.ok((await r.api('command', { ...one, confirm: 'preset' })).body.P2.confirm);
  await r.api('lock', { lock: true });
  assert.equal((await r.api('command', { ...one, confirm: first.confirm })).status, 423);
  assert.match((await r.api('command', { slot: 'P2', cmd: 'picture', arg: { key: 'brightness', value: 10 } })).body.P2.error, /lock/);
  assert.equal((await r.api('command', { slot: 'P2', cmd: 'shutter', arg: 1 })).body.P2.result, 'OK');
  await r.api('lock', { lock: false });
  const fresh = (await r.api('command', { ...one, confirm: first.confirm })).body.P2;
  assert.ok(fresh.confirm);
  assert.equal((await r.api('command', { ...one, confirm: fresh.confirm })).body.P2.result, 'OK');
  assert.equal((await r.api('command', { ...one, arg: '0' })).status, 400);
});

test('a confirmed target going offline does not stop later targets; presets still obey lock', async (t) => {
  const r = await startRelay(); t.after(r.close);
  await r.api('preset/save', { name: 'standby' });
  await r.api('command', { slot: 'all', cmd: 'power', arg: 1 });
  const first = (await r.api('command', off)).body;
  await r.api('sim', { slot: 'P2', offline: true });
  await until(async () => !(await r.state()).projectors.find((p) => p.slot === 'P2').status.online);
  const out = (await r.api('command', { ...off, confirm: first.all.confirm })).body;
  assert.match(out.P2.error, /offline/);
  for (const s of ['P1', 'P3', 'P4']) assert.equal(out[s].result, 'OK');
  await r.api('lock', { lock: true });
  assert.equal((await r.api('preset/recall', { name: 'standby' })).status, 423);
  await r.api('lock', { lock: false });
});

test('legacy shapes stay recognizable and confirmed presets verify each reported position', async (t) => {
  const r = await startRelay(); t.after(r.close);
  const legacy = { standby: { perSlot: { P1: { power: true, shutter: 'open', input: '31' } } } };
  const previewOnly = (await import('../server/preset-lens.js')).hasLens(legacy.standby);
  assert.equal(previewOnly, false);
  await r.api('preset/save', { name: 'lenses' });
  assert.ok(Object.values((await r.state()).presets[0].perSlot).every((p) => Object.keys(p.lens).length === 4));
  const before = JSON.stringify((await r.state()).projectors.map((p) => p.status.lens));
  const first = (await r.api('preset/recall', { name: 'lenses' })).body;
  assert.ok(first.confirm); assert.ok(first.projectors.P2);
  assert.equal(JSON.stringify((await r.state()).projectors.map((p) => p.status.lens)), before);
  await r.api('command', { slot: 'P1', cmd: 'lens', arg: { axis: 'focus', dir: '+', speed: 'slow' } });
  const second = (await r.api('preset/recall', { name: 'lenses', confirmLens: first.confirm })).body;
  for (const result of Object.values(second.projectors)) assert.equal(result.position.focus, 'match');
  await r.api('command', { slot: 'P2', cmd: 'lens', arg: { axis: 'focus', dir: '+', speed: 'slow' } });
  await r.api('sim', { slot: 'P2', lens: { _pollFocus: 500 } });
  const third = (await r.api('preset/recall', { name: 'lenses' })).body;
  const mismatch = (await r.api('preset/recall', { name: 'lenses', confirmLens: third.confirm })).body;
  assert.match(mismatch.projectors.P2.position.focus, /mismatch/);
  await r.api('lock', { lock: true });
  assert.equal((await r.api('preset/recall', { name: 'lenses' })).status, 423);
});

test('OSC and TCP all cues survive offline slots; malformed UDP cannot stop the relay', async (t) => {
  const r = await startRelay(); t.after(r.close);
  await r.api('projector', { slot: 'P1', ip: '' });
  const sock = dgram.createSocket('udp4'); t.after(() => sock.close());
  const valid = oscInt('/proj/all/shutter', 0);
  for (let n = 0; n < valid.length; n++) await new Promise((resolve, reject) => sock.send(valid.subarray(0, n), r.udp, '127.0.0.1', (e) => e ? reject(e) : resolve()));
  await new Promise((resolve) => sock.send(valid, r.udp, '127.0.0.1', resolve));
  await until(async () => (await r.state()).projectors.filter((p) => p.slot !== 'P1').every((p) => p.status.shutter === 'open'));
  await new Promise((resolve, reject) => {
    const tcp = net.connect(r.tcp, '127.0.0.1', () => tcp.end('/proj/all/shutter 1\n'));
    tcp.resume(); tcp.setTimeout(2000, () => tcp.destroy(new Error('TCP timeout'))); tcp.on('error', reject); tcp.on('close', resolve);
  });
  await until(async () => (await r.state()).projectors.filter((p) => p.slot !== 'P1').every((p) => p.status.shutter === 'closed'));
  assert.equal(r.child.exitCode, null);
  assert.ok((await r.state()).events.some((e) => e.source.startsWith('tcp') && e.slot === 'P1' && e.result === 'ERR'));
});
