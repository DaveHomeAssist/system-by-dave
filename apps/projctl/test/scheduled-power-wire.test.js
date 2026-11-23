import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { pulseDriver } from '../server/drivers/pulse.js';
import { pjlinkDriver } from '../server/drivers/pjlink.js';
import { simulatorDriver } from '../server/drivers/simulator.js';

async function fixture(t, handler) {
  const sockets = new Set(), server = net.createServer(socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); handler(socket); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  return server.address().port;
}
const refused = () => { throw Object.assign(new Error('Schedule no longer eligible'), { scheduleSkip: true }); };

test('queued Pulse power off checks eligibility before the actual RPC write', async t => {
  const methods = []; let first, release; const received = new Promise(resolve => release = resolve);
  const port = await fixture(t, socket => socket.once('data', raw => { const req = JSON.parse(String(raw)); methods.push(req.method); first = { socket, req }; release(); }));
  const driver = pulseDriver({ host: '127.0.0.1', port, timeoutMs: 1000 });
  const occupied = driver.power(true); await received;
  const off = driver.power(false, { guard: refused });
  const rejected = assert.rejects(off, /no longer eligible/);
  first.socket.write(JSON.stringify({ jsonrpc: '2.0', id: first.req.id, result: true }));
  await occupied; await rejected;
  assert.deepEqual(methods, ['system.poweron'], 'the fake fixture never receives a queued power-off packet');
});

test('PJLink rechecks after handshake before transmitting power off', async t => {
  const packets = [];
  const port = await fixture(t, socket => { socket.on('data', raw => packets.push(String(raw))); socket.write('PJLINK 0\r'); });
  const driver = pjlinkDriver({ host: '127.0.0.1', port, timeoutMs: 1000 });
  await assert.rejects(driver.power(false, { guard: refused }), /no longer eligible/);
  assert.deepEqual(packets, []);
});

test('simulator also rejects ineligible power without optimistic state mutation', async () => {
  const driver = simulatorDriver(); await assert.rejects(driver.power(true, { guard: refused }), /no longer eligible/);
  assert.equal((await driver.getStatus()).power, 'off');
});
