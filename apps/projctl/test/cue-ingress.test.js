import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { startTcpLines } from '../server/osc.js';

async function fixture(t, options = {}) {
  const messages = [];
  const server = startTcpLines({ port: 0, host: '127.0.0.1', onMessage: (...args) => messages.push(args), ...options });
  await once(server, 'listening');
  const sockets = new Set();
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  async function connect() {
    const socket = net.connect(server.address().port, '127.0.0.1');
    sockets.add(socket); socket.on('error', () => {}); socket.resume();
    await once(socket, 'connect'); return socket;
  }
  return { messages, connect };
}

test('TCP rejects an oversized unterminated line without dispatch', async t => {
  const f = await fixture(t, { maxLineBytes: 16 });
  const socket = await f.connect(), closed = once(socket, 'close');
  socket.write('x'.repeat(17)); await closed;
  assert.equal(f.messages.length, 0);
});

test('TCP preserves split lines, CRLF, and numeric arguments', async t => {
  const f = await fixture(t);
  const socket = await f.connect();
  const received = new Promise(resolve => socket.once('data', resolve));
  socket.write('/proj/P1/shut'); socket.write('ter 1\r\n');
  await received;
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0][0], '/proj/P1/shutter');
  assert.deepEqual(f.messages[0][1], [1]);
});

test('TCP bounds pending async cue execution across connections', async t => {
  let release, entered = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const f = await fixture(t, { maxInFlight: 1, onMessage: () => { entered++; return pending; } });
  t.after(() => release());
  const first = await f.connect();
  const acknowledged = new Promise(resolve => first.once('data', resolve));
  first.write('/proj/P1/power 1\n'); await acknowledged;
  const second = await f.connect(), closed = once(second, 'close');
  second.write('/proj/P2/power 1\n'); await closed;
  assert.equal(entered, 1); release();
});
