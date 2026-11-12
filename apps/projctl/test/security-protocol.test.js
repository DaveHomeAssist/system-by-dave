import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { cuePolicy, startOsc, startTcpLines } from '../server/osc.js';
import { pjlinkDriver } from '../server/drivers/pjlink.js';

test('cue source restrictions normalize mapped and equivalent IPv6 addresses', () => {
  const policy = cuePolicy('TCP', { allowlist: '127.0.0.1,::1' }, {});
  assert.equal(policy.permits('127.0.0.1'), true);
  assert.equal(policy.permits('::ffff:127.0.0.1'), true);
  assert.equal(policy.permits('0:0:0:0:0:0:0:1'), true);
  assert.equal(policy.permits('192.0.2.1'), false);
  assert.equal(policy.permits(undefined), false);
});
test('cue policy validates configuration and supports explicit disable', () => {
  assert.equal(cuePolicy('OSC', {}, { PROJCTL_OSC_ENABLED: '0' }).enabled, false);
  assert.equal(cuePolicy('TCP', {}, { PROJCTL_TCP_ENABLED: '1', PROJCTL_CUE_HOST: '127.0.0.1' }).host, '127.0.0.1');
  assert.throws(() => cuePolicy('OSC', {}, { PROJCTL_CUE_ALLOWLIST: '127.0.0.1,wrong' }), /invalid IP/);
  assert.throws(() => cuePolicy('TCP', {}, { PROJCTL_TCP_ENABLED: 'yes' }), /0 or 1/);
  assert.throws(() => cuePolicy('TCP', {}, { PROJCTL_CUE_HOST: 'not-an-ip' }), /IP address/);
  assert.equal(startOsc({ port: 0, enabled: false, allowlist: '', host: '127.0.0.1' }), null);
  assert.equal(startTcpLines({ port: 0, enabled: false, allowlist: '', host: '127.0.0.1' }), null);
});
test('loopback stays allowed and an unlisted address does not', { timeout: 3000 }, async t => {
  let calls = 0;
  const server = startTcpLines({ port: 0, host: '127.0.0.1', enabled: true, allowlist: '192.0.2.1', onMessage: () => { calls++; return { P1: { result: 'OK' } }; } });
  await once(server, 'listening');
  const client = net.connect(server.address().port, '127.0.0.1');
  client.on('error', () => {});
  t.after(async () => { client.destroy(); await new Promise(resolve => server.close(resolve)); });
  const reply = new Promise(resolve => client.once('data', resolve));
  client.on('connect', () => client.write('/proj/P1/shutter 1\n'));
  assert.match((await reply).toString(), /^OK\n/);
  assert.equal(calls, 1);
  const listed = cuePolicy('TCP', { allowlist: '192.0.2.1' }, {});
  assert.equal(listed.permits('192.0.2.1'), true);
  assert.equal(listed.permits('198.51.100.4'), false);
  assert.equal(listed.permits('127.0.0.1'), true);
  assert.equal(cuePolicy('TCP', {}, {}).permits('198.51.100.4'), true, 'an unset allowlist keeps existing show cues working');
  assert.equal(cuePolicy('TCP', { allowlist: '' }, {}).permits('198.51.100.4'), false);
  assert.equal(cuePolicy('TCP', { allowlist: '' }, {}).permits('::1'), true);
});
async function projector(t, reply, handshake = 'PJLINK 0\r') {
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    socket.write(handshake);
    let buffer = '';
    socket.on('data', data => { buffer += data.toString(); if (buffer.includes('\r')) socket.end(reply); });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  return pjlinkDriver({ host: '127.0.0.1', port: server.address().port, timeoutMs: 1000 });
}
for (const [reply, pattern] of [['%1INPT=OK\r', /Mismatched/], ['%2POWR=OK\r', /Mismatched/], ['%1POWR=anything\r', /acknowledgement/], ['x'.repeat(8193), /size limit/]]) {
  test(`PJLink rejects invalid response ${pattern}`, { timeout: 3000 }, async t => {
    const driver = await projector(t, reply); await assert.rejects(driver.power(true), pattern);
  });
}
test('PJLink accepts a matching acknowledgement', { timeout: 3000 }, async t => {
  const driver = await projector(t, '%1POWR=OK\r'); assert.equal(await driver.power(true), 'OK');
});
test('PJLink refuses CRLF injection before opening a socket', async () => {
  const driver = pjlinkDriver({ host: '127.0.0.1', port: 1 });
  await assert.rejects(driver.input('31\r%1POWR 0'), /Invalid PJLink command/);
});
test('PJLink clears unsupported optional telemetry instead of retaining an earlier sample', { timeout: 3000 }, async t => {
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {}); socket.write('PJLINK 0\r');
    let text = '';
    socket.on('data', data => { text += data.toString(); if (!text.includes('\r')) return; const cmd = text.slice(2, 6); socket.end(`%1${cmd}=${cmd === 'POWR' ? '1' : 'ERR1'}\r`); });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  const status = await pjlinkDriver({ host: '127.0.0.1', port: server.address().port }).getStatus();
  assert.equal(status.online, true); assert.equal(status.errors, null); assert.equal(status.lightHours, null); assert.equal(status.name, null);
});
