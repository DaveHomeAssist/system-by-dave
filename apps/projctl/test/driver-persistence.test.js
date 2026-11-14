import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { panasonicDriver } from '../server/drivers/panasonic.js';
import { pjlinkDriver } from '../server/drivers/pjlink.js';

test('a mismatched Panasonic reply rejects promptly and the next exchange succeeds', async (t) => {
  const replies = ['00VXX:LNSI2=+00001', '00VXX:LNSI1=+00001'];
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    socket.write('NTCONTROL 0\r');
    let text = '', answered = false;
    socket.on('data', (bytes) => {
      text += bytes;
      if (answered || !text.includes('\r')) return;
      answered = true; socket.write(replies.shift() + '\r');
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { for (const socket of sockets) socket.destroy(); server.close(); });
  const driver = panasonicDriver({ host: '127.0.0.1', port: server.address().port, timeoutMs: 500 });
  // The driver's own timer is cleared once a reply arrives, so only this test's limit can show a command that never settles.
  let limit;
  const waited = new Promise((resolve) => { limit = setTimeout(resolve, 1500, 'still waiting'); });
  const outcome = await Promise.race([driver.lens({ op: 'home' }).then(() => 'resolved', (error) => error), waited]);
  clearTimeout(limit);
  assert.ok(outcome instanceof Error, `lens home with a mismatched reply: ${outcome}`);
  assert.match(outcome.message, /does not match the command/);
  assert.equal(await driver.lens({ op: 'home' }), 'OK', 'a reply that echoes the command sent is still accepted');
});

// A stand-in PJLink projector with a password. It keeps a session open until the
// client closes it, records every line it receives, and can refuse every Nth new
// connection by accepting TCP and closing before the greeting.
async function pjlinkProjector(t, { refuseEvery = 0, digestOnEveryCommand = false } = {}) {
  const nonce = '1a2b3c4d', password = 'fixture-pass';
  const expected = createHash('md5').update(nonce + password).digest('hex');
  const values = { POWR: '1', AVMT: '30', INPT: '31', ERST: '000000', LAMP: '10 1', NAME: 'fixture' };
  const state = { connections: 0, refused: 0, lines: [], sockets: new Set(), values, stallQuery: null, open: () => state.sockets.size };
  const server = net.createServer((socket) => {
    state.connections += 1;
    socket.on('error', () => {});
    if (refuseEvery && state.connections % refuseEvery === 0) { state.refused += 1; socket.end(); return; }
    state.sockets.add(socket); socket.on('close', () => state.sockets.delete(socket));
    socket.write(`PJLINK 1 ${nonce}\r`);
    let text = '', authenticated = false;
    socket.on('data', (bytes) => {
      text += bytes.toString('latin1');
      let index;
      while ((index = text.indexOf('\r')) >= 0) {
        const line = text.slice(0, index); text = text.slice(index + 1);
        state.lines.push(line);
        const digest = /^[0-9a-f]{32}%1/.test(line) ? line.slice(0, 32) : '';
        if (digest ? digest !== expected : (!authenticated || digestOnEveryCommand)) { socket.write('PJLINK ERRA\r'); continue; }
        authenticated = true;
        const body = digest ? line.slice(32) : line, name = body.slice(2, 6);
        if (body.endsWith('?') && state.stallQuery === name) continue;
        socket.write(body.endsWith('?') ? `%1${name}=${values[name]}\r` : `%1${name}=OK\r`);
      }
    });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const driver = pjlinkDriver({ host: '127.0.0.1', port: server.address().port, password, timeoutMs: 500 });
  t.after(async () => { driver.close?.(); for (const socket of state.sockets) socket.destroy(); await new Promise((resolve) => server.close(resolve)); });
  return { driver, state };
}
const settle = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

test('PJLink status polls share one session and send the digest once', async (t) => {
  const { driver, state } = await pjlinkProjector(t);
  for (let poll = 0; poll < 3; poll++) {
    const status = await driver.getStatus();
    assert.equal(status.power, 'on'); assert.equal(status.shutter, 'open'); assert.equal(status.input, '31');

  }
  assert.equal(state.connections, 1, 'three polls opened one connection');
  assert.match(state.lines[0], /^[0-9a-f]{32}%1POWR \?$/, 'the first command of the session carries the digest');
  assert.ok(state.lines.length >= 14 && state.lines.slice(1).every((line) => /^%1[A-Z]{4} \?$/.test(line)), 'later commands carry no digest');
});

test('a projector that refuses every ninth new session does not cost a poll', async (t) => {
  const { driver, state } = await pjlinkProjector(t, { refuseEvery: 9 });
  for (let poll = 0; poll < 20; poll++) assert.equal((await driver.getStatus()).power, 'on');
  assert.equal(state.connections, 1);
  assert.equal(state.refused, 0);
});

test('a PJLink session the projector closed while idle is replaced on the next poll', async (t) => {
  const { driver, state } = await pjlinkProjector(t);
  assert.equal((await driver.getStatus()).power, 'on');
  for (const socket of state.sockets) socket.end();
  await settle();
  const status = await driver.getStatus();
  assert.equal(status.power, 'on');
  assert.equal(state.connections, 2);
  // The same when the close lands in the same instant as the next poll's first command.
  for (const socket of state.sockets) socket.destroy();
  const again = await driver.getStatus();
  assert.equal(again.power, 'on');
  assert.equal(state.connections, 3);
});

test('a projector that wants the digest on every command still gives a full status', async (t) => {
  const { driver, state } = await pjlinkProjector(t, { digestOnEveryCommand: true });
  for (let poll = 0; poll < 2; poll++) {
    const status = await driver.getStatus();
    assert.equal(status.power, 'on'); assert.equal(status.shutter, 'open');
  }
  const lastPoll = state.lines.slice(-4);
  assert.ok(lastPoll.every((line) => /^[0-9a-f]{32}%1[A-Z]{4} \?$/.test(line)), 'once refused, every command carries the digest');
});

test('a PJLink command closes the held status session and uses its own connection', async (t) => {
  const { driver, state } = await pjlinkProjector(t);
  assert.equal((await driver.getStatus()).power, 'on');
  await settle();
  assert.equal(state.open(), 1, 'the status session stays open between polls');
  assert.equal(await driver.shutter(true), 'OK');
  assert.equal(state.connections, 2);
  assert.match(state.lines.at(-1), /^[0-9a-f]{32}%1AVMT 31$/);
  await settle();
  assert.equal(state.open(), 0, 'no session is left open after a command');
  assert.equal((await driver.getStatus()).power, 'on');
  assert.equal(state.connections, 3);
});

test('disposing a PJLink driver closes its held session', async (t) => {
  const { driver, state } = await pjlinkProjector(t);
  await driver.getStatus();
  await settle();
  assert.equal(state.open(), 1);
  driver.close();
  await settle();
  assert.equal(state.open(), 0);
});

test('each status poll refreshes lamp hours and identity on the retained connection', async (t) => {
  const { driver, state } = await pjlinkProjector(t);
  assert.equal((await driver.getStatus()).lightHours, 10);
  state.values.LAMP = '11 1';
  state.values.NAME = 'changed name';
  const next = await driver.getStatus();
  assert.equal(next.lightHours, 11);
  assert.equal(next.name, 'changed name');
  assert.equal(state.connections, 1);
});

test('a cancelled partial poll releases a queued control without reporting a complete status', async (t) => {
  const { driver, state } = await pjlinkProjector(t);
  state.stallQuery = 'AVMT';
  const abort = new AbortController();
  const poll = driver.getStatus({ signal: abort.signal });
  const rejected = assert.rejects(poll, /test poll cancelled/);
  for (let attempt = 0; attempt < 100 && !state.lines.some(line => line.endsWith('%1AVMT ?')); attempt++) await settle(5);
  assert.ok(state.lines.some(line => line.endsWith('%1AVMT ?')), 'the poll reached the stalled query');
  const control = driver.shutter(false);
  abort.abort(new Error('test poll cancelled'));
  await rejected;
  assert.equal(await control, 'OK');
  assert.equal(state.lines.filter(line => line.endsWith('%1AVMT 30')).length, 1);
  assert.equal(state.connections, 2);
});
