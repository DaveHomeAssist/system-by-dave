// Show Mac status reports through the real relay (simulator): who may send one, what is refused,
// freshness, and the proof that a report only ever gets stored.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { startRelay } from './relay-helper.js';

const TOKEN = 'status-token-for-tests-0123456789abcdef';
const PASS = 'venue-passcode';
const golden = () => JSON.parse(fs.readFileSync(new URL('./fixtures/status-report.example.json', import.meta.url), 'utf8'));
const send = (relay, path, { method = 'GET', body, headers = {} } = {}) => fetch(relay.base + path, {
  redirect: 'manual', method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
});
const bearer = (token = TOKEN) => ({ authorization: `Bearer ${token}` });
const signIn = async (relay) => {
  const r = await send(relay, '/api/login', { method: 'POST', body: { code: PASS } });
  assert.equal(r.status, 200);
  return { cookie: r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') };
};

test('with a passcode, only the status token or a signed-in session may send a report', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: PASS, PROJCTL_STATUS_TOKEN: TOKEN }); t.after(relay.close);
  assert.equal((await send(relay, '/api/mac-status', { method: 'POST', body: golden() })).status, 401, 'no credentials');
  const ok = await send(relay, '/api/mac-status', { method: 'POST', body: golden(), headers: bearer() });
  assert.equal(ok.status, 200);
  const stored = await ok.json();
  assert.deepEqual([stored.ok, stored.host], [true, 'm5']);
  const session = await signIn(relay);
  assert.equal((await send(relay, '/api/mac-status', { method: 'POST', body: golden(), headers: session })).status, 200, 'a signed-in session works too');
  const view = await (await send(relay, '/api/mac-status', { headers: session })).json();
  assert.deepEqual(view.hosts.map(h => [h.host, h.state, h.stale]), [['m5', 'ok', false]]);
  assert.equal(view.simulation, true);
});

test('the status token opens its two routes and nothing else', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: PASS, PROJCTL_STATUS_TOKEN: TOKEN }); t.after(relay.close);
  const denied = [
    ['/api/mac-status', 'GET'], ['/api/state', 'GET'], ['/api/health-reports', 'GET'], ['/api/health-reports/run', 'POST'],
    ['/api/command', 'POST', { slot: 'all', cmd: 'power', arg: 0 }], ['/api/lock', 'POST', { lock: false }],
    ['/api/projector', 'POST', { slot: 'P1', ip: '192.0.2.1' }], ['/api/preset/recall', 'POST', { name: 'x' }], ['/monitor/rig.html', 'GET'],
  ];
  for (const [path, method, body] of denied) {
    const r = await send(relay, path, { method, body, headers: bearer() });
    assert.ok(r.status === 401 || r.status === 302, `${method} ${path} must not accept the status token (${r.status})`);
    await r.arrayBuffer();
  }
  const projectors = await send(relay, '/api/mac-status/projectors', { headers: bearer() });
  assert.equal(projectors.status, 200);
  const summary = await projectors.json();
  assert.equal(summary.projectors.length, 4);
  assert.deepEqual(Object.keys(summary.projectors[0]).sort(), ['current', 'lane', 'lastReplyAt', 'online', 'power', 'shutter', 'slot']);
  assert.doesNotMatch(JSON.stringify(summary), /"ip"|password|192\.|10\./);
  assert.equal((await send(relay, '/api/mac-status/projectors')).status, 401);
});

test('a wrong status token is refused and backs off', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: PASS, PROJCTL_STATUS_TOKEN: TOKEN }); t.after(relay.close);
  const wrong = await send(relay, '/api/mac-status', { method: 'POST', body: golden(), headers: bearer('wrong-token-wrong-token-wrong') });
  assert.equal(wrong.status, 401);
  const again = await send(relay, '/api/mac-status', { method: 'POST', body: golden(), headers: bearer() });
  assert.equal(again.status, 429, 'a client that just failed must wait, even with the right token');
  assert.ok(Number(again.headers.get('retry-after')) >= 1);
  const session = await signIn(relay);
  assert.equal((await send(relay, '/api/mac-status', { headers: session })).status, 200, 'the status throttle does not lock out passcode sign-in');
});

test('a token that is too short is ignored and does not stop the relay', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: PASS, PROJCTL_STATUS_TOKEN: 'short' }); t.after(relay.close);
  assert.equal((await send(relay, '/api/mac-status', { method: 'POST', body: golden(), headers: bearer('short') })).status, 401);
  assert.equal((await send(relay, '/api/health')).status, 200);
});

test('a browser from another origin cannot send a report, even with the token', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: PASS, PROJCTL_STATUS_TOKEN: TOKEN }); t.after(relay.close);
  const r = await send(relay, '/api/mac-status', { method: 'POST', body: golden(), headers: { ...bearer(), origin: 'https://evil.example' } });
  assert.equal(r.status, 403);
});

test('reports are validated, size-capped and never partly stored', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PROJCTL_STATUS_TOKEN: TOKEN }); t.after(relay.close);
  const post = (body) => send(relay, '/api/mac-status', { method: 'POST', body, headers: bearer() });
  const view = async () => (await (await send(relay, '/api/mac-status')).json()).hosts;
  assert.deepEqual(await view(), []);
  const cases = [
    [{ ...golden(), command: 'reboot' }, 400, /unknown field/],
    [{ ...golden(), state: 'fault' }, 400, /failing check/],
    [{ ...golden(), checks: [] }, 400, /between 1 and 24/],
    [{ ...golden(), host: 'M5!' }, 400, /host/],
    ['{not json', 400, /not valid JSON/],
    ['[]', 400, /JSON object/],
  ];
  for (const [body, status, message] of cases) {
    const r = await post(body);
    assert.equal(r.status, status);
    assert.match((await r.json()).error, message);
  }
  const big = await post({ ...golden(), message: 'x'.repeat(20000) });
  assert.equal(big.status, 413);
  const chunked = await fetch(relay.base + '/api/mac-status', { method: 'POST', headers: { 'content-type': 'application/json', ...bearer() }, body: JSON.stringify({ ...golden(), message: 'y'.repeat(20000) }) });
  assert.equal(chunked.status, 413);
  assert.deepEqual(await view(), [], 'nothing was stored by a refused report');
  assert.equal((await post(golden())).status, 200);
  assert.equal((await view()).length, 1);
  assert.equal((await send(relay, '/api/mac-status', { method: 'DELETE' })).status, 404, 'there is no way to delete or change a report except sending a newer one');
});

test('a report goes stale on the relay clock and recovers with the next one', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PROJCTL_STATUS_TOKEN: TOKEN, PROJCTL_MAC_STALE_MS: '1500' }); t.after(relay.close);
  const post = () => send(relay, '/api/mac-status', { method: 'POST', body: golden(), headers: bearer() });
  const view = async () => (await send(relay, '/api/mac-status')).json();
  await post();
  let { hosts, staleAfterMs } = await view();
  assert.equal(staleAfterMs, 1500);
  assert.equal(hosts[0].stale, false);
  await delay(1800);
  ({ hosts } = await view());
  assert.equal(hosts[0].stale, true);
  assert.ok(hosts[0].ageMs >= 1500);
  await post();
  assert.equal((await view()).hosts[0].stale, false);
});

test('a report is only stored: no command, event, lock or projector state changes', { timeout: 30000 }, async (t) => {
  const relay = await startRelay({ PROJCTL_STATUS_TOKEN: TOKEN }); t.after(relay.close);
  await relay.api('lock', { lock: true });
  const before = await relay.state();
  const post = (report) => send(relay, '/api/mac-status', { method: 'POST', body: report, headers: bearer() });
  for (let i = 0; i < 5; i++) assert.equal((await post({ ...golden(), cycle: i, state: i % 2 ? 'fault' : 'ok', checks: golden().checks.map(c => (i % 2 && c.id === 'displays' ? { ...c, status: 'FAIL' } : c)) })).status, 200);
  await post({ ...golden(), message: '/proj/all/power 0', checks: [{ id: 'cmd', label: 'power off all', status: 'PASS', observed: '{"cmd":"power","arg":0}' }] });
  await delay(300);
  const after = await relay.state();
  assert.equal(after.lock, before.lock);
  assert.equal(after.events.length, before.events.length, 'nothing was added to the command log');
  assert.deepEqual(after.projectors.map(p => [p.slot, p.status.power, p.status.shutter]), before.projectors.map(p => [p.slot, p.status.power, p.status.shutter]));
  assert.ok(after.projectors.every(p => p.busy == null));
});

test('with no passcode the relay behaves as before and reports are accepted without a token', { timeout: 30000 }, async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  assert.equal((await send(relay, '/api/mac-status', { method: 'POST', body: golden() })).status, 200);
  assert.equal((await (await send(relay, '/api/mac-status')).json()).hosts.length, 1);
});
