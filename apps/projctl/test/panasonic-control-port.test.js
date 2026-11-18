// Panasonic control-port fallback: when another controller holds a projector's PJLink link, the
// relay reads and commands power and shutter on the control port instead. Stand-in servers only.
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { panasonicDriver, PJLINK_RETRY_MS } from '../server/drivers/panasonic.js';

// A stand-in control port: one command per connection, as the driver uses it.
async function controlPort(t, initial = {}) {
  const state = { power: '001', shutter: '0', lamp: '2', pattern: '00', lampQuery: true, down: false, lines: [], ...initial };
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    if (state.down) { socket.destroy(); return; }
    socket.write('NTCONTROL 0\r');
    let text = '';
    socket.on('data', (bytes) => {
      text += bytes.toString('latin1');
      const end = text.indexOf('\r');
      if (end < 0) return;
      const command = text.slice(2, end); text = '';
      state.lines.push(command);
      const set = (key, value) => { state[key] = value; return command; };
      const reply = command === 'QPW' ? state.power : command === 'QSH' ? state.shutter : command === 'QTS' ? state.pattern
        : command === 'Q$S' ? (state.lampQuery ? state.lamp : 'ER401')
        : command === 'PON' ? set('power', '001') : command === 'POF' ? set('power', '000')
        : command === 'OSH:1' ? set('shutter', '1') : command === 'OSH:0' ? set('shutter', '0') : 'ER401';
      socket.write(`00${reply}\r`);
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise((resolve) => server.close(resolve)); });
  return { port: server.address().port, state };
}

// A stand-in PJLink port. mode 'answer' behaves like a free projector; 'held' accepts and closes at
// once, as a projector does when another controller already has its one session; 'silent' never speaks.
async function pjlinkPort(t, mode = 'answer') {
  const values = { POWR: '1', AVMT: '30', INPT: '31', ERST: '000000', LAMP: '10 1', NAME: 'fixture' };
  const state = { mode, connections: 0, lines: [], values };
  const sockets = new Set();
  const server = net.createServer((socket) => {
    state.connections += 1;
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    if (state.mode === 'held') { socket.end(); return; }
    if (state.mode === 'silent') return;
    socket.write('PJLINK 0\r');
    let text = '';
    socket.on('data', (bytes) => {
      text += bytes.toString('latin1');
      let index;
      while ((index = text.indexOf('\r')) >= 0) {
        const line = text.slice(0, index); text = text.slice(index + 1);
        state.lines.push(line);
        const name = line.slice(2, 6);
        if (!line.endsWith('?')) { if (name === 'POWR') values.POWR = line.slice(7); if (name === 'AVMT') values.AVMT = line.slice(7); }
        socket.write(line.endsWith('?') ? `%1${name}=${values[name]}\r` : `%1${name}=OK\r`);
      }
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise((resolve) => server.close(resolve)); });
  return { port: server.address().port, state };
}

async function rig(t, { pjlink = 'answer', control = {}, retryMs = PJLINK_RETRY_MS } = {}) {
  const native = await controlPort(t, control), pj = await pjlinkPort(t, pjlink);
  const clock = { at: 1000000 };
  const driver = panasonicDriver({ host: '127.0.0.1', port: native.port, pjlinkPort: pj.port, pjlinkRetryMs: retryMs, now: () => clock.at, timeoutMs: 400 });
  t.after(() => driver.close?.());
  return { driver, native: native.state, pj: pj.state, clock };
}

test('a projector whose PJLink answers is read and commanded exactly as before', async (t) => {
  const { driver, native, pj } = await rig(t);
  const status = await driver.getStatus();
  assert.deepEqual([status.power, status.shutter, status.input, status.controlLink], ['on', 'open', '31', 'pjlink']);
  assert.deepEqual(status.errors, { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 });
  assert.deepEqual(native.lines, ['QTS'], 'only the test pattern is read on the control port');
  assert.equal(await driver.shutter(true), 'OK');
  assert.equal(await driver.power(false), 'OK');
  assert.ok(pj.lines.includes('%1AVMT 31') && pj.lines.includes('%1POWR 0'));
  assert.deepEqual(native.lines, ['QTS'], 'no power or shutter command went to the control port');
  assert.equal(driver.controlLink, 'pjlink');
});

for (const mode of ['held', 'silent']) {
  test(`with PJLink ${mode} by another controller, power and shutter come from the control port`, async (t) => {
    const { driver, native, pj } = await rig(t, { pjlink: mode });
    const status = await driver.getStatus();
    assert.deepEqual([status.power, status.shutter, status.online, status.controlLink], ['on', 'open', true, 'control-port']);
    // PJLink-only readings are "not reported", never a guess.
    assert.deepEqual([status.input, status.errors, status.lightHours, status.name], [null, null, null, null]);
    assert.equal(status.pattern, '00');
    assert.deepEqual(native.lines, ['QPW', 'Q$S', 'QSH', 'QTS']);
    assert.equal(driver.controlLink, 'control-port');
    // The next polls leave PJLink alone until the retry time.
    const before = pj.connections;
    await driver.getStatus(); await driver.getStatus();
    assert.equal(pj.connections, before, 'PJLink is not retried on every poll');
  });
}

test('on the control port, shutter and power are sent once, there, after the guard', async (t) => {
  const { driver, native, pj } = await rig(t, { pjlink: 'held' });
  await driver.getStatus();
  native.lines.length = 0;
  const attempts = pj.connections;
  let guarded = 0;
  assert.equal(await driver.shutter(true, { guard: () => { guarded += 1; } }), 'OK');
  assert.deepEqual([native.lines, guarded], [['OSH:1'], 1]);
  assert.equal((await driver.getStatus()).shutter, 'closed');
  assert.equal(await driver.shutter(false), 'OK');
  assert.equal((await driver.getStatus()).shutter, 'open');
  native.lines.length = 0;
  assert.equal(await driver.power(false), 'OK');
  assert.deepEqual(native.lines, ['POF']);
  assert.equal(await driver.power(true), 'OK');
  assert.deepEqual(native.lines, ['POF', 'PON']);
  assert.equal(pj.connections, attempts, 'no command was also tried over PJLink');
  // A guard that refuses stops the command before anything is written.
  native.lines.length = 0;
  await assert.rejects(driver.shutter(true, { guard: () => { throw new Error('show lock is on'); } }), /show lock is on/);
  assert.deepEqual(native.lines, []);
});

test('lamp control status separates warming and cooling, and a model that refuses it is not asked again', async (t) => {
  const { driver, native } = await rig(t, { pjlink: 'held', control: { power: '001', lamp: '1' } });
  let status = await driver.getStatus();
  assert.deepEqual([status.power, status.shutter], ['warming', 'unknown'], 'no shutter reading is claimed while warming');
  Object.assign(native, { power: '000', lamp: '3' });
  assert.equal((await driver.getStatus()).power, 'cooling');
  Object.assign(native, { power: '000', lamp: '0' });
  status = await driver.getStatus();
  assert.deepEqual([status.power, status.shutter, status.pattern], ['off', 'unknown', null]);

  const plain = await rig(t, { pjlink: 'held', control: { lampQuery: false } });
  assert.equal((await plain.driver.getStatus()).power, 'on');
  await plain.driver.getStatus();
  assert.equal(plain.native.lines.filter(line => line === 'Q$S').length, 1, 'the refused query is sent once only');
  assert.equal((await plain.driver.getStatus()).shutter, 'open');
});

test('replies the driver does not recognise read as unknown, not as a state', async (t) => {
  const { driver, native } = await rig(t, { pjlink: 'held', control: { power: '7' } });
  let status = await driver.getStatus();
  assert.deepEqual([status.power, status.shutter], ['unknown', 'unknown']);
  Object.assign(native, { power: '001', shutter: 'x' });
  status = await driver.getStatus();
  assert.deepEqual([status.power, status.shutter], ['on', 'unknown']);
});

test('PJLink is tried again after the retry time, and taken back when it answers', async (t) => {
  const { driver, native, pj, clock } = await rig(t, { pjlink: 'held', retryMs: 60000 });
  await driver.getStatus();
  const first = pj.connections;
  clock.at += 59000;
  await driver.getStatus();
  assert.equal(pj.connections, first, 'not before the retry time');
  clock.at += 2000;
  let status = await driver.getStatus();
  assert.ok(pj.connections > first, 'retried once the time has passed');
  assert.equal(status.controlLink, 'control-port', 'still held: the control-port reading stands');
  const held = pj.connections;
  await driver.getStatus();
  assert.equal(pj.connections, held, 'and the retry clock starts again');
  // The other controller lets go.
  pj.mode = 'answer';
  clock.at += 61000;
  status = await driver.getStatus();
  assert.deepEqual([status.controlLink, status.input, status.power], ['pjlink', '31', 'on']);
  assert.equal(driver.controlLink, 'pjlink');
  native.lines.length = 0;
  assert.equal(await driver.shutter(true), 'OK');
  assert.deepEqual(native.lines, [], 'commands return to PJLink with the status link');
  assert.ok(pj.lines.includes('%1AVMT 31'));
});

test('when neither link answers the poll fails, and nothing is reported', async (t) => {
  const { driver, native } = await rig(t, { pjlink: 'held', control: { down: true } });
  await assert.rejects(driver.getStatus());
  assert.equal(driver.controlLink, 'pjlink', 'a dead control port is not adopted');
  // The control port comes back: the next poll reads it.
  native.down = false;
  assert.equal((await driver.getStatus()).controlLink, 'control-port');
  // It then dies mid-run: the poll fails rather than returning an old reading.
  native.down = true;
  await assert.rejects(driver.getStatus());
});
