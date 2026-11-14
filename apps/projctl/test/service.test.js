import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openStore } from '../server/store.js';
import { servicePaths, servicePlist, launcherText, assertSavedRig } from '../deploy/service-tools.js';
import { startRelay, until } from './relay-helper.js';
import { WebSocket } from 'ws';

test('health is available before login without exposing configuration', async t => {
  const r = await startRelay({ PJ_PASSCODE: 'test-only' }); t.after(r.close);
  const health = await r.api('health');
  assert.equal(health.status, 200);
  assert.deepEqual(Object.keys(health.body).sort(), ['ok', 'service', 'simulation', 'uptimeSeconds']);
  assert.equal(health.body.service, 'projctl');
  assert.equal(health.body.simulation, true);
  assert.equal((await r.api('state')).status, 401);
});

test('WebSocket carries unassigned, failed and recovered telemetry without page reload', async t => {
  const r = await startRelay(); t.after(r.close);
  const ws = new WebSocket(r.base.replace('http:', 'ws:') + '/ws'); t.after(() => ws.close());
  const messages = [];
  ws.on('message', data => messages.push(JSON.parse(data)));
  await until(() => messages.some(m => m.type === 'snapshot'));
  assert.ok(messages[0].relay.startedAt);
  await r.api('projector', { slot: 'P1', ip: '' });
  await until(() => messages.some(m => m.slot === 'P1' && m.status?.connection?.state === 'unassigned'));
  await r.api('projector', { slot: 'P1', ip: 'sim' });
  await until(() => messages.some(m => m.slot === 'P1' && m.status?.connection?.state === 'online'));
  await r.api('sim', { slot: 'P1', offline: true });
  await until(() => messages.some(m => m.slot === 'P1' && m.status?.connection?.state === 'reconnecting'));
  const firstFailure = messages.find(m => m.slot === 'P1' && m.status?.connection?.state === 'reconnecting').status;
  assert.equal(firstFailure.online, false);
  const failed = firstFailure.connection;
  assert.equal(failed.consecutiveFailures, 1);
  assert.ok(failed.error); assert.ok(failed.lastAttemptAt); assert.ok(failed.lastSuccessAt);
  assert.ok(Date.parse(failed.nextRetryAt) > Date.parse(failed.lastFailureAt));
  assert.ok(failed.retryDelayMs > 0);
  assert.equal((await r.api('health')).body.ok, true);
  messages.length = 0;
  await r.api('sim', { slot: 'P1', offline: false });
  await until(() => messages.some(m => m.slot === 'P1' && m.status?.connection?.state === 'online'));
  assert.equal(messages.find(m => m.slot === 'P1' && m.status?.connection?.state === 'online').status.connection.error, null);
  assert.equal(messages.find(m => m.slot === 'P1' && m.status?.connection?.state === 'online').status.connection.retryDelayMs, 0);
});

test('unreadable or corrupt saved rig never becomes the default rig; writes replace atomically', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-store-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'rig.json');
  assert.throws(() => openStore(file, { allowCreate: false }), /Cannot read saved rig/);
  assert.equal(fs.existsSync(file), false);
  fs.writeFileSync(file, '{broken');
  assert.throws(() => openStore(file), /Cannot read saved rig/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{broken');
  fs.writeFileSync(file, '{"password":"private-canary",broken');
  assert.throws(() => openStore(file), error => !error.stack.includes('private-canary') && !error.cause);
  fs.writeFileSync(file, JSON.stringify({ projectors: [], presets: [], events: [] }));
  const store = openStore(file); store.rig.show = 'Preserved'; store.flush();
  assert.equal(JSON.parse(fs.readFileSync(file)).show, 'Preserved');
  assert.equal(fs.existsSync(file + '.tmp'), false);
  assertSavedRig(file);
});

test('service configuration escapes paths and preserves private environment without embedding it in launcher', () => {
  const paths = servicePaths('/example/Test & Person');
  assert.equal(paths.app, path.join('/example/Test & Person', 'Library', 'Application Support', 'Projctl', 'app'));
  assert.equal(paths.data, path.join('/example/Test & Person', 'Library', 'Application Support', 'Projctl', 'data'));
  assert.equal(paths.launcher, path.join('/example/Test & Person', 'Applications', 'Open Projctl.command'));
  const plist = servicePlist({ node: '/opt/node', ...paths, env: { PJ_PASSCODE: 'a<&', RIG: paths.data + '/rig.json' } });
  assert.match(plist, /a&lt;&amp;/); assert.match(plist, /<key>RunAtLoad<\/key><true\/>/);
  assert.match(plist, /<key>KeepAlive<\/key><true\/>/);
  assert.doesNotMatch(launcherText({ node: '/opt/node', ...paths }), /PJ_PASSCODE|a<&/);
});

test('relay heartbeat continues independently of projector commands', async t => {
  const r = await startRelay(); t.after(r.close);
  const ws = new WebSocket(r.base.replace('http:', 'ws:') + '/ws'); t.after(() => ws.close());
  const messages = [];
  ws.on('message', data => messages.push(JSON.parse(data)));
  await until(() => messages.some(m => m.type === 'heartbeat'), 7000);
  assert.ok(messages.find(m => m.type === 'heartbeat').at);
});


test('an explicit password update replaces its alias while an ordinary update preserves private auth', async () => {
  const { withAuthEnvironment } = await import('../deploy/service-tools.js');
  const old = { PROJCTL_PASSWORD: 'old-fixture', PORT: '8080' };
  assert.deepEqual(withAuthEnvironment(old, {}), old);
  assert.deepEqual(withAuthEnvironment(old, { PJ_PASSCODE: 'new-fixture' }), { PJ_PASSCODE: 'new-fixture', PORT: '8080' });
  assert.deepEqual(withAuthEnvironment({ PJ_PASSCODE: 'legacy' }, { PROJCTL_PASSWORD: 'new-fixture' }), { PROJCTL_PASSWORD: 'new-fixture' });
});
