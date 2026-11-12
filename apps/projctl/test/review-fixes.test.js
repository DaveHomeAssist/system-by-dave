import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startRelay, until } from './relay-helper.js';
import { openStore } from '../server/store.js';
import { guardStream } from '../server/static-files.js';
import { EventEmitter } from 'node:events';
import { funnelDecision } from '../deploy/share-guard.js';
import { createSessions } from '../server/sessions.js';

test('a folder URL, a traversal and a stream error do not kill the relay', async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  for (const route of ['/avd/', '/avd/fonts/', '/%2e%2e/%2e%2e/package.json', '/avd/%2e%2e/%2e%2e/server/index.js', '/%00', '/workspace/%2f%2e%2e/package.json']) {
    const response = await fetch(relay.base + route);
    assert.ok(response.status === 400 || response.status === 404, `${route} ${response.status}`);
    await response.arrayBuffer();
  }
  const workspace = await fetch(relay.base + '/workspace/');
  assert.equal(workspace.status, 200, 'a directory with index.html is served, not streamed as a folder');
  await workspace.arrayBuffer();
  assert.equal(relay.child.exitCode, null);
  assert.equal((await relay.api('health')).status, 200);
});

test('a static stream error is handled', () => {
  let status = 0;
  const res = {
    headersSent: true,
    writableEnded: false,
    writeHead(code) { status = code; },
    end() { this.writableEnded = true; },
    destroy() { this.destroyed = true; },
  };
  const stream = new EventEmitter();
  guardStream(res, stream);
  assert.doesNotThrow(() => stream.emit('error', Object.assign(new Error('EISDIR'), { code: 'EISDIR' })));
  assert.equal(res.destroyed, true);
  assert.equal(status, 0);
});

test('state-changing requests from another site are refused, including a sibling host', async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  const plain = await fetch(relay.base + '/api/lock', { method: 'POST', headers: { 'content-type': 'text/plain', origin: 'http://evil.example' }, body: '{"lock":false}' });
  assert.equal(plain.status, 403);
  const sibling = await fetch(relay.base + '/api/lock', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://todos.housevideo.app', 'sec-fetch-site': 'same-site' }, body: '{"lock":false}' });
  assert.equal(sibling.status, 403);
  const cross = await fetch(relay.base + '/api/command', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }, body: '{"slot":"P1","cmd":"shutter","arg":1}' });
  assert.equal(cross.status, 403);
  const health = await fetch(relay.base + '/api/health');
  assert.equal(health.headers.get('access-control-allow-origin'), null);
  assert.match(health.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.match(health.headers.get('content-security-policy'), /https:\/\/wst\.housevideo\.app/);
  const same = await fetch(relay.base + '/api/lock', { method: 'POST', headers: { 'content-type': 'application/json', origin: new URL(relay.base).origin, 'sec-fetch-site': 'same-origin' }, body: '{"lock":true}' });
  assert.equal(same.status, 200);
  assert.equal((await relay.state()).lock, true);
});

test('one missed poll still accepts a shutter, and the second marks the projector offline', async (t) => {
  const relay = await startRelay({ POLL_MS: '2000' }); t.after(relay.close);
  await relay.api('sim', { slot: 'P2', offline: true });
  await until(async () => (await relay.state()).projectors.find((p) => p.slot === 'P2').status.connection.consecutiveFailures === 1, 8000);
  const missed = (await relay.state()).projectors.find((p) => p.slot === 'P2').status;
  assert.equal(missed.online, true);
  assert.equal((await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 1 })).body.P2.result, 'OK');
});

test('show lock blocks address edits, discovery, presets and schedules', async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  await relay.api('lock', { lock: true });
  assert.equal((await relay.api('projector', { slot: 'P1', ip: '198.51.100.9' })).status, 423);
  assert.equal((await relay.api('discover', {})).status, 423);
  assert.equal((await relay.api('preset/save', { name: 'locked' })).status, 423);
  assert.equal((await relay.api('preset/delete', { name: 'locked' })).status, 423);
  assert.equal((await relay.api('preferred-input', { input: 'HDMI' })).status, 423);
  assert.equal((await relay.api('power-schedules/save', { name: 'nope' })).status, 423);
  assert.equal((await relay.api('command', { slot: 'P1', cmd: 'shutter', arg: 0 })).body.P1.result, 'OK');
  assert.equal((await relay.api('command', { slot: 'P1', cmd: 'power', arg: 1 })).body.P1.result, 'OK');
  assert.equal((await relay.state()).projectors.find((p) => p.slot === 'P1').ip, 'sim');
});

test('lens home needs a server confirmation', async (t) => {
  const relay = await startRelay(); t.after(relay.close);
  await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
  await relay.api('command', { slot: 'P1', cmd: 'lens', arg: { axis: 'h', dir: '+', speed: 'slow' } });
  const first = (await relay.api('command', { slot: 'P1', cmd: 'lens', arg: { op: 'home' } })).body.P1;
  assert.ok(first.confirm);
  assert.notEqual((await relay.state()).projectors.find((p) => p.slot === 'P1').status.lens.h, 0);
  const second = (await relay.api('command', { slot: 'P1', cmd: 'lens', arg: { op: 'home' }, confirm: first.confirm })).body.P1;
  assert.equal(second.result, 'OK');
  assert.equal((await relay.state()).projectors.find((p) => p.slot === 'P1').status.lens.h, 0);
});

test('logout revokes the session token', async (t) => {
  const relay = await startRelay({ PJ_PASSCODE: 'desk-pass' }); t.after(relay.close);
  const login = await fetch(relay.base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'desk-pass' }) });
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  const jar = cookie.split(';')[0];
  assert.equal((await fetch(relay.base + '/api/state', { headers: { cookie: jar } })).status, 200);
  const logout = await fetch(relay.base + '/api/logout', { method: 'POST', headers: { 'content-type': 'application/json', cookie: jar }, body: '{}' });
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.match(logout.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await fetch(relay.base + '/api/state', { headers: { cookie: jar } })).status, 401);
});

test('simulator mode does not rewrite a rig that already has an address', async (t) => {
  const original = { show: 'Live', lock: false, preferredInput: 'HDMI', presets: [], events: [], projectors: [
    { slot: 'P1', label: 'House', driver: 'panasonic', model: 'PT-DW830U', ip: '198.51.100.20', inputs: { '31': 'HDMI' } },
  ] };
  const text = JSON.stringify(original);
  const relay = await startRelay({}, { files: { 'rig.json': text } }); t.after(relay.close);
  assert.equal(fs.readFileSync(relay.rigFile, 'utf8'), text);
  const state = await relay.state();
  assert.equal(state.projectors[0].ip, 'sim');
  assert.equal(state.projectors[0].driver, 'simulator');
  assert.equal(state.simulation, true);
});

test('a rig write is atomic and a write error does not throw', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-store-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'rig.json');
  const store = openStore(file);
  store.rig.show = 'First'; store.flush();
  store.rig.show = 'Second'; store.flush();
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).show, 'Second');
  assert.equal(JSON.parse(fs.readFileSync(file + '.bak', 'utf8')).show, 'First');
  assert.equal(fs.existsSync(file + '.tmp'), false);
  fs.chmodSync(dir, 0o500);
  store.rig.show = 'Third';
  assert.doesNotThrow(() => store.flush());
  assert.ok(store.lastError());
  fs.chmodSync(dir, 0o700);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).show, 'Second');
});

test('funnel refuses a missing passcode and refuses cue or projector ports', () => {
  assert.equal(funnelDecision({ port: 9000, env: { PJ_PASSCODE: 'x' } }).ok, false);
  assert.equal(funnelDecision({ port: 9001, plist: '<key>EnvironmentVariables</key><key>PJ_PASSCODE</key><string>secret</string>' }).ok, false);
  assert.equal(funnelDecision({ port: 4352, env: { PROJCTL_PASSWORD: 'x' } }).ok, false);
  assert.equal(funnelDecision({ port: 8080 }).ok, false);
  assert.equal(funnelDecision({ port: 8080, health: { login: 'open' }, env: { PJ_PASSCODE: 'x' } }).ok, false);
  assert.equal(funnelDecision({ port: 8080, health: { login: 'passcode' } }).ok, true);
  assert.equal(funnelDecision({ port: 8080, plist: '<key>EnvironmentVariables</key><key>PROJCTL_PASSWORD</key><string>secret</string>' }).ok, true);
});

test('a session token can be revoked without ending the others', () => {
  const sessions = createSessions();
  const first = sessions.issue(), second = sessions.issue();
  assert.equal(sessions.valid(first), true);
  sessions.revoke(first);
  assert.equal(sessions.valid(first), false);
  assert.equal(sessions.valid(second), true);
  sessions.revokeAll();
  assert.equal(sessions.valid(second), false);
});
