import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { startRelay } from './relay-helper.js';

const socket = (relay, options) => new WebSocket(relay.base.replace('http:', 'ws:') + '/ws', options);
test('malformed and oversized client frames cannot stop the relay', { timeout: 15000 }, async t => {
  const relay = await startRelay(); t.after(relay.close);
  const ws = socket(relay); ws.on('error', () => {}); t.after(() => ws.terminate());
  await once(ws, 'open');
  ws.send('x'.repeat(65537));
  await delay(150);
  assert.equal(relay.child.exitCode, null, 'bad client input must not crash the process');
  assert.equal((await relay.api('health')).status, 200);
});

test('cross-origin browser sockets are refused before a snapshot is disclosed', { timeout: 15000 }, async t => {
  const relay = await startRelay(); t.after(relay.close);
  const ws = socket(relay, { origin: 'https://untrusted.example' });
  t.after(() => ws.terminate());
  const result = await new Promise(resolve => {
    ws.on('unexpected-response', (_req, res) => { res.resume(); resolve(res.statusCode); });
    ws.on('message', () => resolve('snapshot leaked'));
    ws.on('error', () => {});
  });
  assert.equal(result, 403);
  const own = socket(relay, { origin: relay.base }); own.on('error', () => {}); t.after(() => own.terminate());
  const [message] = await once(own, 'message');
  assert.equal(JSON.parse(message).type, 'snapshot');
});

test('cross-origin browser writes are refused without changing show state', { timeout: 15000 }, async t => {
  const relay = await startRelay(); t.after(relay.close);
  const initial = await relay.state();
  const result = await fetch(relay.base + '/api/lock', { method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' }, body: JSON.stringify({ lock: !initial.lock }) });
  assert.equal(result.status, 403);
  assert.equal((await relay.state()).lock, initial.lock);
  assert.equal((await relay.api('health')).status, 200);
});

test('protected and embedded sessions retain their own-origin access', { timeout: 15000 }, async t => {
  const relay = await startRelay({ PJ_PASSCODE: 'fixture-only-passcode' }); t.after(relay.close);
  const login = await fetch(relay.base + '/api/login', { method: 'POST', headers: { origin: relay.base, 'content-type': 'application/json' }, body: JSON.stringify({ code: 'fixture-only-passcode' }) });
  assert.equal(login.status, 200);
  const cookies = login.headers.getSetCookie();
  const normal = cookies.find(c => c.startsWith('pj=')).split(';')[0];
  const embedded = cookies.find(c => c.startsWith('pj_embed=')).split(';')[0];
  assert.match(cookies.find(c => c.startsWith('pj_embed=')), /Secure; SameSite=None; Partitioned/);
  assert.equal((await fetch(relay.base + '/api/state', { headers: { cookie: normal, origin: relay.base } })).status, 200);
  assert.equal((await fetch(relay.base + '/api/state', { headers: { cookie: embedded, 'sec-fetch-site': 'same-origin' } })).status, 200);
  assert.equal((await fetch(relay.base + '/api/state', { headers: { cookie: embedded } })).status, 401);
  assert.equal((await fetch(relay.base + '/api/state', { headers: { cookie: normal, origin: 'https://untrusted.example' } })).status, 403);
  const frame = await fetch(relay.base + '/', { headers: { cookie: embedded, 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'iframe' } });
  assert.equal(frame.status, 200);
  assert.match(frame.headers.get('content-security-policy'), /frame-ancestors 'self' https:\/\/wst.housevideo.app/);
  for (const name of ['frozen-theme.js', 'frozen-theme.css', 'frozen-favicon.js', 'frozen-favicon.css', 'frozen-zone-nav.js', 'frozen-zone-nav.css', 'favicons/favicon-01-classic.svg']) {
    const asset = await fetch(relay.base + '/' + name, { redirect: 'manual' });
    assert.equal(asset.status, 200, 'login can load ' + name + ' before authentication');
  }
});
