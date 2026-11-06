import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { startRelay } from './relay-helper.js';

test('schedule API preserves rig bytes and never dispatches on save/enable/edit', async t => {
  const relay = await startRelay(); t.after(() => relay.close());
  await relay.api('projector', { slot: 'P1', lane: 'C' }); await delay(250);
  const before = fs.readFileSync(relay.rigFile), args = { name: 'SIM future fixture only', slots: ['P1'], action: 'off', days: [0], time: '23:59', timeZone: 'America/New_York' };
  const saved = await relay.api('power-schedules/save', args); assert.equal(saved.status, 200); const item = saved.body.schedules[0];
  assert.equal(item.enabled, false); assert.equal(item.lastRun, null); assert.equal(JSON.stringify(saved.body).includes('identity'), false);
  assert.ok(fs.existsSync(path.join(path.dirname(relay.rigFile), 'power-schedules.json')));
  const enabled = await relay.api('power-schedules/enable', { id: item.id, enabled: true }); assert.equal(enabled.status, 200); assert.equal(enabled.body.schedules[0].enabled, true);
  const edited = await relay.api('power-schedules/save', { ...args, id: item.id }); assert.equal(edited.body.schedules[0].enabled, false);
  assert.deepEqual(fs.readFileSync(relay.rigFile), before, 'schedule settings never rewrite the private rig');
  assert.equal((await relay.state()).events.some(e => e.source === 'schedule'), false);
  assert.equal((await relay.api('power-schedules/save', { ...args, slots: ['P3'] })).status, 400, 'unassigned candidates cannot silently become schedule targets');
  assert.equal((await relay.api('power-schedules/delete', { id: item.id })).body.schedules.length, 0);
});

test('schedule APIs keep existing authentication', async t => {
  const relay = await startRelay({ PJ_PASSCODE: 'schedule-api-fixture-passcode' }); t.after(() => relay.close());
  assert.equal((await relay.api('power-schedules')).status, 401);
  assert.equal((await relay.api('power-schedules/save', {})).status, 401);
});
