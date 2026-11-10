import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { readJsonBody, proxyPolicy, createLoginThrottle, applyServerLimits } from '../server/http-security.js';
import { startRelay } from './relay-helper.js';

async function bodyServer(t, options) {
  const server = http.createServer(async (req, res) => {
    try { const value = await readJsonBody(req, options); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); }
    catch (e) { if (e.closeConnection) res.setHeader('connection', 'close'); res.writeHead(e.status || 500); res.end(e.message); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  return server.address().port;
}

// Raw sockets keep requests the server refuses mid-body deterministic (no client-side EPIPE races).
async function rawRequest(port, parts, pauseMs = 0) {
  const socket = net.connect(port, '127.0.0.1');
  socket.on('error', () => {});
  let out = '';
  socket.on('data', (d) => { out += d; });
  const closed = once(socket, 'close');
  await once(socket, 'connect');
  for (const [i, part] of parts.entries()) { if (i && pauseMs) await delay(pauseMs); if (!socket.destroyed) socket.write(part); }
  await closed;
  return out;
}
const statusOf = (raw) => Number(raw.match(/^HTTP\/1\.1 (\d{3})/)?.[1]);

test('JSON bodies accept objects and reject malformed, non-object and invalid UTF-8 input', async (t) => {
  const port = await bodyServer(t, { maxBytes: 64 });
  const post = (body) => fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body });
  let res = await post('{"a":1}'); assert.equal(res.status, 200); assert.deepEqual(await res.json(), { a: 1 });
  res = await post(''); assert.equal(res.status, 200); assert.deepEqual(await res.json(), {});
  for (const [body, pattern] of [['{', /valid JSON/], ['[1]', /JSON object/], ['null', /JSON object/], ['3', /JSON object/], [Buffer.from([0x7b, 0xff, 0x7d]), /UTF-8/]]) {
    res = await post(body); assert.equal(res.status, 400); assert.match(await res.text(), pattern);
  }
});

test('JSON bodies over the limit are refused by declared length and while streaming chunks', async (t) => {
  const port = await bodyServer(t, { maxBytes: 32 });
  const declared = await rawRequest(port, ['POST / HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 1000000\r\n\r\n']);
  assert.equal(statusOf(declared), 413); assert.match(declared, /connection: close/i);
  const chunk = '{"a":"' + 'x'.repeat(40) + '"}';
  const chunked = await rawRequest(port, [`POST / HTTP/1.1\r\nHost: x\r\nTransfer-Encoding: chunked\r\n\r\n${chunk.length.toString(16)}\r\n${chunk}\r\n0\r\n\r\n`]);
  assert.equal(statusOf(chunked), 413);
});

test('stalled JSON bodies time out and close the connection', { timeout: 5000 }, async (t) => {
  const port = await bodyServer(t, { timeoutMs: 100 });
  const raw = await rawRequest(port, ['POST / HTTP/1.1\r\nHost: x\r\nContent-Length: 20\r\n\r\n{"a"']);
  assert.equal(statusOf(raw), 408); assert.match(raw, /connection: close/i);
});

test('server receive limits are applied to the HTTP server', () => {
  const server = applyServerLimits(http.createServer());
  assert.equal(server.headersTimeout, 15000); assert.equal(server.requestTimeout, 30000);
  assert.ok(server.headersTimeout <= server.requestTimeout);
});

test('forwarding headers count only from trusted proxies', () => {
  const req = (remoteAddress, headers = {}, encrypted) => ({ socket: { remoteAddress, encrypted }, headers });
  const loopback = proxyPolicy('127.0.0.1,::1');
  assert.equal(loopback.clientAddress(req('192.0.2.5', { 'x-forwarded-for': '198.51.100.9' })), '192.0.2.5');
  assert.equal(loopback.clientAddress(req('::ffff:127.0.0.1', { 'x-forwarded-for': '203.0.113.1, 198.51.100.9' })), '198.51.100.9');
  assert.equal(loopback.clientAddress(req('::1', { 'x-forwarded-for': '198.51.100.9, 127.0.0.1' })), '198.51.100.9');
  assert.equal(loopback.clientAddress(req('127.0.0.1', { 'x-forwarded-for': 'not-an-ip' })), '127.0.0.1');
  assert.equal(loopback.clientAddress(req('127.0.0.1')), '127.0.0.1');
  assert.equal(loopback.isHttps(req('192.0.2.5', { 'x-forwarded-proto': 'https' })), false);
  assert.equal(loopback.isHttps(req('::ffff:127.0.0.1', { 'x-forwarded-proto': 'https' })), true);
  assert.equal(loopback.isHttps(req('127.0.0.1', { 'x-forwarded-proto': 'https, http' })), false);
  assert.equal(loopback.isHttps(req('192.0.2.5', {}, true)), true);
  const none = proxyPolicy('');
  assert.equal(none.clientAddress(req('127.0.0.1', { 'x-forwarded-for': '198.51.100.9' })), '127.0.0.1');
  assert.equal(none.isHttps(req('127.0.0.1', { 'x-forwarded-proto': 'https' })), false);
  assert.throws(() => proxyPolicy('127.0.0.1,proxy.local'), /IP addresses/);
  assert.throws(() => proxyPolicy('10.0.0.0/8'), /IP addresses/);
});

test('login throttle backs off and forgets old records', () => {
  let now = 0;
  const throttle = createLoginThrottle({ maxEntries: 3, baseMs: 1000, maxMs: 8000, forgetMs: 60000, now: () => now });
  assert.equal(throttle.fail('a'), 2000); assert.equal(throttle.retryAfterMs('a'), 2000);
  now += 2000; assert.equal(throttle.retryAfterMs('a'), 0);
  assert.equal(throttle.fail('a'), 4000); assert.equal(throttle.fail('a'), 8000); assert.equal(throttle.fail('a'), 8000);
  now += 8000 + 60000; assert.equal(throttle.retryAfterMs('a'), 0);
  assert.equal(throttle.fail('a'), 2000, 'a forgotten record restarts the backoff');
  throttle.succeed('a'); assert.equal(throttle.retryAfterMs('a'), 0); assert.equal(throttle.size, 0);
});

test('login throttle stays bounded without dropping active lockouts', () => {
  let now = 1_000_000;
  const throttle = createLoginThrottle({ maxEntries: 3, now: () => now });
  for (const key of ['a', 'b', 'c']) throttle.fail(key);
  throttle.fail('d'); // every slot is an active lockout: d lands in the shared overflow record
  assert.equal(throttle.size, 3);
  for (const key of ['a', 'b', 'c', 'd', 'e']) assert.ok(throttle.retryAfterMs(key) > 0, `${key} stays locked`);
  now += 2000; // lockouts end but are not yet forgotten
  assert.equal(throttle.retryAfterMs('e'), 0);
  throttle.fail('e'); // evicts the oldest idle record (a)
  assert.equal(throttle.size, 3);
  assert.equal(throttle.fail('b'), 4000, 'records that were not evicted keep their history');
});

const loginWith = (relay) => (code, headers = {}) => fetch(relay.base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ code }) });

test('relay rejects malformed, non-object and oversized JSON bodies', { timeout: 20000 }, async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  const post = (body) => fetch(relay.base + '/api/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  let res = await post('{"slot":'); assert.equal(res.status, 400); assert.match((await res.json()).error, /valid JSON/);
  res = await post('[]'); assert.equal(res.status, 400); assert.match((await res.json()).error, /JSON object/);
  const raw = await rawRequest(Number(new URL(relay.base).port), ['POST /api/command HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 70000\r\n\r\n']);
  assert.equal(statusOf(raw), 413); assert.match(raw, /connection: close/i);
});

test('relay ignores forwarding headers from untrusted peers', { timeout: 20000 }, async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: 'fixture-code', PROJCTL_TRUSTED_PROXIES: '' }); t.after(relay.close);
  const login = loginWith(relay);
  const ok = await login('fixture-code', { 'x-forwarded-proto': 'https' });
  assert.equal(ok.status, 200); assert.doesNotMatch(ok.headers.get('set-cookie'), /Secure/);
  assert.equal((await login('wrong', { 'x-forwarded-for': '198.51.100.1' })).status, 401);
  const blocked = await login('fixture-code', { 'x-forwarded-for': '198.51.100.2' });
  assert.equal(blocked.status, 429, 'a spoofed address must not escape the lockout');
  assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
});

test('relay keys lockouts by the forwarded client behind a trusted loopback proxy', { timeout: 20000 }, async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: 'fixture-code' }); t.after(relay.close);
  const login = loginWith(relay);
  assert.equal((await login('wrong', { 'x-forwarded-for': '198.51.100.1' })).status, 401);
  assert.equal((await login('fixture-code', { 'x-forwarded-for': '198.51.100.1' })).status, 429);
  const other = await login('fixture-code', { 'x-forwarded-for': '198.51.100.2', 'x-forwarded-proto': 'https' });
  assert.equal(other.status, 200); assert.match(other.headers.get('set-cookie'), /Secure/);
});

test('relay rechecks the login lockout after a slow body arrives', { timeout: 20000 }, async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: 'fixture-code', PROJCTL_TRUSTED_PROXIES: '' }); t.after(relay.close);
  const body = JSON.stringify({ code: 'fixture-code' });
  const socket = net.connect(Number(new URL(relay.base).port), '127.0.0.1');
  socket.on('error', () => {}); t.after(() => socket.destroy());
  let out = ''; socket.on('data', (d) => { out += d; });
  const closed = once(socket, 'close');
  await once(socket, 'connect');
  socket.write(`POST /api/login HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: ${body.length}\r\n\r\n${body.slice(0, 8)}`);
  await delay(150); // the slow request has passed the first throttle check
  assert.equal((await loginWith(relay)('wrong')).status, 401);
  socket.write(body.slice(8));
  await closed;
  assert.equal(statusOf(out), 429, 'a correct code that arrives during a lockout is still refused');
});
