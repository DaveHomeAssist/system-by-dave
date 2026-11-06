import test from 'node:test';
import assert from 'node:assert/strict';
import { projectorDisplayInfo, normalizeHostDisplays, createHostDisplayReader } from '../server/display-info.js';
import { startRelay } from './relay-helper.js';

test('projector input and signal remain separate from unsupported EDID, with truthful stale and missing feedback', () => {
  const p = { slot: 'P1', driver: 'pulse', ip: 'fixture' };
  const sample = { online: true, input: 'hdmi1', signal: { width: 1920, height: 1080, refresh: 60, password: 'do-not-return' }, connection: { lastSuccessAt: '2026-11-06T07:00:00Z' } };
  const result = projectorDisplayInfo(p, sample, { hdmi1: 'HDMI 1' });
  assert.equal(result.input.label, 'HDMI 1'); assert.equal(result.signal.state, 'reported');
  assert.deepEqual(result.signal.value, { width: 1920, height: 1080, refresh: 60 });
  assert.equal(result.edid.state, 'unsupported'); assert.equal(result.edid.value, null);
  const stale = projectorDisplayInfo(p, { ...sample, online: false });
  assert.equal(stale.signal.state, 'offline'); assert.deepEqual(stale.signal.value, result.signal.value); assert.equal(stale.signal.observedAt, sample.connection.lastSuccessAt);
  assert.equal(projectorDisplayInfo(p, { online: true }).input.state, 'unknown');
  assert.equal(projectorDisplayInfo({ ...p, ip: '' }).input.state, 'unassigned');
  assert.equal(projectorDisplayInfo({ ...p, driver: 'panasonic' }, sample).signal.state, 'unsupported');
});

test('OS report exposes only whitelisted display metadata and never assigns a projector or invents raw EDID', () => {
  const rows = normalizeHostDisplays({ SPDisplaysDataType: [{ spdisplays_ndrvs: [{ _name: 'Source display', spdisplays_resolution: '1920 x 1080 @ 60Hz', spdisplays_online: 'spdisplays_yes', spdisplays_rotation: 'spdisplays_supported', spdisplays_mirror: 'spdisplays_off', spdisplays_connection_type: 'spdisplays_internal', '_spdisplays_display-serial-number': 'private', '_spdisplays_display-vendor-id': '0x1234' }] }] });
  assert.equal(rows[0].resolution, '1920 x 1080 @ 60Hz'); assert.equal(rows[0].online, true);
  assert.equal(rows[0].rotation, null); assert.equal(rows[0].rotationSupport, true); assert.equal(rows[0].mirror, false); assert.equal(rows[0].connection, 'internal');
  assert.equal(rows[0].manufacturerId, '0x1234'); assert.equal(rows[0].assignedSlot, null);
  assert.equal(rows[0].edid.state, 'unavailable'); assert.doesNotMatch(JSON.stringify(rows), /private|serial/);
});

test('host reader coalesces and caches bounded OS reads, sanitizes errors and does no host collection in SIM', async () => {
  let calls = 0, time = 0;
  const reader = createHostDisplayReader({ platform: 'darwin', now: () => time, run: async (file, args, options) => {
    calls++; assert.equal(file, '/usr/sbin/system_profiler'); assert.equal(options.timeout, 8000); assert.equal(options.maxBuffer, 1024 * 1024);
    return { stdout: '{"SPDisplaysDataType":[]}' };
  } });
  await Promise.all([reader(), reader()]); assert.equal(calls, 1); await reader(); assert.equal(calls, 1);
  time = 30001; await reader(); assert.equal(calls, 2);
  const failed = await createHostDisplayReader({ platform: 'darwin', run: async () => { throw Error('secret command output'); } })();
  assert.equal(failed.state, 'unavailable'); assert.doesNotMatch(JSON.stringify(failed), /secret/);
  assert.equal((await createHostDisplayReader({ sim: true, run: () => assert.fail('no OS read in simulation') })()).state, 'simulation');
});

test('display endpoints share relay authentication and snapshots carry cached projector information', async () => {
  const relay = await startRelay();
  try {
    const snapshot = await relay.state(); assert.equal(snapshot.projectors[0].displayInfo.scope, 'projector');
    const result = await relay.api('display-info?slot=P2'); assert.equal(result.status, 200); assert.equal(result.body.slot, 'P2');
    assert.equal((await relay.api('display-info?slot=missing')).status, 404);
    assert.equal((await relay.api('host-displays')).body.state, 'simulation');
  } finally { await relay.close(); }
  const gated = await startRelay({ PROJCTL_PASSWORD: 'fixture-password' });
  try { assert.equal((await gated.api('display-info?slot=P2')).status, 401); assert.equal((await gated.api('host-displays')).status, 401); }
  finally { await gated.close(); }
});
