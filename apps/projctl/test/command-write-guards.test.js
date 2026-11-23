import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { createCommandBinding } from '../server/command-binding.js';
import { pjlinkDriver } from '../server/drivers/pjlink.js';
import { panasonicDriver } from '../server/drivers/panasonic.js';
import { pulseDriver } from '../server/drivers/pulse.js';
import { simulatorDriver } from '../server/drivers/simulator.js';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const denied = () => { throw Object.assign(new Error('Command revoked'), { status: 423, commandRejected: true }); };
async function fixture(t, handler) {
  const sockets = new Set();
  const server = net.createServer(socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); handler(socket); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  return server.address().port;
}

for (const [name, invoke] of [
  ['pattern', driver => driver.pattern('01', { guard: denied })],
  ['lens', driver => driver.lens({ axis: 'focus', dir: '+' }, { guard: denied })],
  ['picture', driver => driver.picture('brightness', 0, { guard: denied })],
]) {
  test(`Panasonic ${name} checks the guard after the handshake before writing`, async t => {
    const received = [];
    const port = await fixture(t, socket => {
      socket.on('data', data => { received.push(String(data)); socket.end('00OK\r'); });
      socket.write('NTCONTROL 0\r');
    });
    await assert.rejects(invoke(panasonicDriver({ host: '127.0.0.1', port, timeoutMs: 500 })), /Command revoked/);
    assert.deepEqual(received, []);
  });
}

for (const [name, invoke] of [
  ['power', (driver, guard) => driver.power(false, { guard })],
  ['shutter', (driver, guard) => driver.shutter(true, { guard })],
  ['input', (driver, guard) => driver.input('32', { guard })],
]) {
  test(`PJLink ${name} rechecks a changed guard after its delayed handshake`, async t => {
    const connected = deferred(), packets = [];
    let socket, allowed = true;
    const port = await fixture(t, client => { socket = client; client.on('data', data => packets.push(String(data))); connected.resolve(); });
    const driver = pjlinkDriver({ host: '127.0.0.1', port, timeoutMs: 500 });
    const pending = assert.rejects(invoke(driver, () => { if (!allowed) denied(); }), /Command revoked/);
    await connected.promise;
    allowed = false;
    socket.write('PJLINK 0\r');
    await pending;
    assert.deepEqual(packets, []);
    driver.close();
  });
}

function pulseReply(request) {
  const property = request.params?.property;
  if (request.method === 'image.source.list') return ['HDMI'];
  if (request.method === 'introspect') return { properties: [{ name: 'brightness', access: 'READ_WRITE', type: { base: 'float', min: -1, max: 1, precision: 0.01 } }] };
  if (request.method !== 'property.get') return true;
  if (property === 'system.state') return 'on';
  if (property?.endsWith('.state')) return 'Stopped';
  if (property?.endsWith('.safetooperate')) return true;
  if (property?.endsWith('.minposition')) return 0;
  if (property?.endsWith('.maxposition')) return 65535;
  if (property?.endsWith('.position')) return 1000;
  return 0;
}
const pulseActions = [
  ['shutter', driver => driver.shutter(true, { guard: denied })],
  ['input', driver => driver.input('HDMI', { guard: denied })],
  ['pattern', driver => driver.pattern('internal:white', { guard: denied })],
  ['picture', driver => driver.picture('brightness', 0.5, { guard: denied })],
  ['lens', driver => driver.lens({ axis: 'focus', dir: '+' }, { guard: denied })],
  ['lens recall', driver => driver.recallLens({ focus: 1500 }, { guard: denied })],
  ['Stop', driver => driver.lens({ op: 'stop' }, { guard: denied })],
];
for (const [name, invoke] of pulseActions) {
  test(`Pulse ${name} cannot write after waiting in the queue`, async t => {
    const occupied = deferred(), requests = [];
    let release;
    const port = await fixture(t, socket => socket.once('data', data => {
      const request = JSON.parse(String(data)); requests.push(request);
      const reply = () => socket.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: pulseReply(request) }));
      if (request.method === 'system.poweron') { release = reply; occupied.resolve(); } else reply();
    }));
    const driver = pulseDriver({ host: '127.0.0.1', port, timeoutMs: 1000, motionPollMs: 1, motionSettleMs: 0 });
    const first = driver.power(true);
    await occupied.promise;
    const rejected = assert.rejects(invoke(driver), /Command revoked/);
    release();
    await first;
    await rejected;
    assert.deepEqual(requests.filter(r => r.method !== 'property.get' && r.method !== 'introspect' && r.method !== 'image.source.list').map(r => r.method), ['system.poweron']);
  });
}

test('Pulse pattern rechecks between selection and display writes', async t => {
  const writes = [];
  let allowed = true;
  const port = await fixture(t, socket => socket.once('data', data => {
    const request = JSON.parse(String(data)); writes.push(request.params.property);
    allowed = false;
    socket.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: true }));
  }));
  const driver = pulseDriver({ host: '127.0.0.1', port });
  await assert.rejects(driver.pattern('internal:white', { guard: () => { if (!allowed) denied(); } }), /Command revoked/);
  assert.deepEqual(writes, ['image.testpattern.selected']);
});

test('Pulse lens recall stops an earlier axis when a later write is revoked', async t => {
  const writes = [];
  let allowed = true;
  const port = await fixture(t, socket => socket.once('data', data => {
    const request = JSON.parse(String(data));
    if (request.method === 'property.set') { writes.push(request.params.property); allowed = false; }
    if (request.method.endsWith('.stop')) writes.push(request.method);
    socket.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: pulseReply(request) }));
  }));
  const driver = pulseDriver({ host: '127.0.0.1', port });
  await assert.rejects(driver.recallLens({ h: 1500, v: 1500 }, { guard: () => { if (!allowed) denied(); } }), /Command revoked; stop requested/);
  assert.deepEqual(writes, ['optics.lensshift.horizontal.target', 'optics.lensshift.horizontal.stop', 'optics.lensshift.vertical.stop']);
});

test('captured commands reject changed targets, offline state, cooling and lock transitions', () => {
  const binding = createCommandBinding();
  const state = { projector: { slot: 'P1', ip: '127.0.0.1', lane: 'A', inputs: { 32: 'HDMI' } }, status: { online: true, power: 'on' }, lock: false, lockRevision: 0, busy: false };
  const guard = binding.commandGuard('P1', () => state);
  guard('input', '32');
  state.projector.lane = 'B';
  assert.throws(() => guard('shutter', false), /configuration changed/);
  state.projector.lane = 'A'; state.projector.reverseH = true;
  assert.throws(() => guard('lens', { axis: 'h', dir: '+' }), /configuration changed/);
  delete state.projector.reverseH; state.status.online = false;
  assert.throws(() => guard('power', true), /offline/);
  state.status.online = true; state.status.power = 'cooling';
  assert.throws(() => guard('power', true), /cooling/);
  state.status.power = 'on'; state.lockRevision = 2;
  for (const [cmd, arg] of [['power', false], ['input', '32'], ['resetInput', null], ['pattern', '01'], ['picture', {}], ['lens', { axis: 'focus' }]]) {
    assert.throws(() => guard(cmd, arg), error => error.status === 423);
  }
  state.lock = true; state.busy = true;
  guard('shutter', false);
  guard('lens', { op: 'stop' });
  state.busy = false;
  guard('power', true);
});

test('a movement may retain its own busy slot while competing commands are rejected', () => {
  const binding = createCommandBinding();
  const state = { projector: { slot: 'P1' }, status: { online: true }, lock: false, lockRevision: 0, busy: false };
  const guard = binding.commandGuard('P1', () => state);
  state.busy = true;
  assert.throws(() => guard('lens', { axis: 'focus' }), /lens is moving/);
  guard('lens', { axis: 'focus' }, { allowBusy: true });
});

test('simulator rejects every guarded mutation without changing state', async () => {
  const driver = simulatorDriver();
  const before = await driver.getStatus();
  for (const invoke of [
    () => driver.shutter(false, { guard: denied }), () => driver.input('32', { guard: denied }),
    () => driver.pattern('01', { guard: denied }), () => driver.picture('brightness', 1, { guard: denied }),
    () => driver.lens({ axis: 'focus', dir: '+' }, { guard: denied }), () => driver.recallLens({ focus: 2 }, { guard: denied }),
  ]) await assert.rejects(invoke(), /Command revoked/);
  assert.deepEqual(await driver.getStatus(), before);
});

test('simulator rechecks after asynchronous picture initialization', async () => {
  const driver = simulatorDriver();
  let allowed = true;
  const pending = driver.picture('brightness', 12, { guard: () => { if (!allowed) denied(); } });
  allowed = false;
  await assert.rejects(pending, /Command revoked/);
  assert.equal((await driver.getPicture()).brightness, 0);
});
