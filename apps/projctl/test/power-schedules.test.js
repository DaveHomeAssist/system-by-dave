import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPowerSchedules, nextOccurrence, scheduledPowerGuard, TIME_ZONE } from '../server/power-schedules.js';
const schedule = { name: 'Fixture only', slots: ['P1'], action: 'off', days: [5], time: '12:00', timeZone: TIME_ZONE };
function harness(t, start = '2026-11-06T16:59:59Z') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'power-schedule-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let time = Date.parse(start), blocked = '', identity = 'fixture-projector'; const sent = [];
  const options = { file: path.join(dir, 'schedules.json'), now: () => time, targets: () => [{ slot: 'P1', assigned: true, identity }], guard: () => blocked, dispatch: async (slot, action) => sent.push([slot, action]) };
  const engine = createPowerSchedules(options); t.after(() => engine.close());
  return { engine, options, sent, set: value => { time = typeof value === 'string' ? Date.parse(value) : value; }, block: value => { blocked = value; }, retarget: () => { identity = 'different-projector'; } };
}
test('wall-clock planning uses Eastern DST: spring gap skips and fall repeat runs once', () => {
  const s = { time: '01:30', days: [0] };
  assert.equal(new Date(nextOccurrence(s, Date.parse('2026-11-01T04:00:00Z'))).toISOString(), '2026-11-01T05:30:00.000Z');
  assert.equal(new Date(nextOccurrence(s, Date.parse('2026-11-01T05:30:01Z'))).toISOString(), '2026-11-08T06:30:00.000Z');
  assert.equal(new Date(nextOccurrence({ time: '02:30', days: [0] }, Date.parse('2026-03-08T05:00:00Z'))).toISOString(), '2026-03-15T06:30:00.000Z');
});
test('save, enable and edit never dispatch; new/edited schedules stay disabled until explicit enable', async t => {
  const h = harness(t); h.engine.save(schedule); let s = h.engine.view().schedules[0];
  assert.equal(s.enabled, false); assert.equal(s.nextRunAt, null); assert.equal(s.lastRun, null);
  assert.throws(() => h.engine.save({ ...schedule, enabled: true }), /explicitly enable/);
  h.engine.enable(s.id, true); assert.equal(h.sent.length, 0);
  h.engine.save({ ...schedule, id: s.id }); assert.equal(h.engine.view().schedules[0].enabled, false);
  h.set('2026-11-06T17:00:00Z'); await h.engine.tick(); assert.equal(h.sent.length, 0);
});
test('on-time occurrence claims durably and dispatches once despite repeated ticks/restart', async t => {
  const h = harness(t); h.engine.save(schedule); const id = h.engine.view().schedules[0].id; h.engine.enable(id, true);
  h.set('2026-11-06T17:00:00Z'); await h.engine.tick(); await h.engine.tick(); assert.deepEqual(h.sent, [['P1','off']]);
  h.engine.close(); const restarted = createPowerSchedules(h.options); t.after(() => restarted.close()); await restarted.tick(); assert.equal(h.sent.length, 1);
  assert.equal(restarted.view().schedules[0].lastRun.status, 'acknowledged');
  assert.equal(fs.readdirSync(h.options.file + '.claims').length, 1);
});
test('restart and delayed ticks skip missed power-off without replay', async t => {
  const h = harness(t); h.engine.save(schedule); h.engine.enable(h.engine.view().schedules[0].id, true);
  h.set('2026-11-06T17:10:00Z'); await h.engine.tick(); assert.equal(h.sent.length, 0); assert.equal(h.engine.view().schedules[0].lastRun.status, 'skipped');
  const other = harness(t); other.engine.save(schedule); other.engine.enable(other.engine.view().schedules[0].id, true); other.engine.close(); other.set('2026-11-06T17:00:01Z');
  const restarted = createPowerSchedules(other.options); t.after(() => restarted.close()); await restarted.tick(); assert.equal(other.sent.length, 0); assert.match(restarted.view().schedules[0].lastRun.reason, /not replayed/);
});
test('online/busy/show-lock guard failures skip without retry and retargeting requires review', async t => {
  const h = harness(t); h.engine.save(schedule); const id = h.engine.view().schedules[0].id; h.engine.enable(id, true); h.block('Show lock is on.');
  h.set('2026-11-06T17:00:00Z'); await h.engine.tick(); assert.equal(h.sent.length, 0); assert.equal(h.engine.view().schedules[0].lastRun.targets.P1.reason, 'Show lock is on.');
  h.block(''); await h.engine.tick(); assert.equal(h.sent.length, 0); h.retarget(); assert.equal(h.engine.view().schedules[0].targetChanged, true); assert.throws(() => h.engine.enable(id, true), /configuration changed/);
});
test('durable exclusive claim prevents a second engine dispatching the same occurrence', async t => {
  const h = harness(t); h.engine.save(schedule); h.engine.enable(h.engine.view().schedules[0].id, true);
  const other = createPowerSchedules(h.options); t.after(() => other.close());
  h.set('2026-11-06T17:00:00Z'); await h.engine.tick(); await other.tick(); assert.equal(h.sent.length, 1); assert.equal(other.view().schedules[0].lastRun.status, 'skipped');
});
test('a backward clock pauses, and enabling at an already reached minute does not fire immediately', async t => {
  const h = harness(t); h.engine.save(schedule); h.set('2026-11-06T16:50:00Z'); await h.engine.tick(); assert.ok(h.engine.view().clockPausedUntil); assert.equal(h.sent.length, 0);
  h.set('2026-11-06T17:00:00Z'); h.engine.enable(h.engine.view().schedules[0].id, true); await h.engine.tick(); assert.equal(h.sent.length, 0); assert.equal(h.engine.view().schedules[0].nextRunAt, '2026-11-13T17:00:00.000Z');
});

test('overlapping enabled target/day/time is rejected and malformed files fail closed', t => {
  const h = harness(t); h.engine.save(schedule); h.engine.enable(h.engine.view().schedules[0].id, true); h.engine.save({ ...schedule, name: 'Conflicting fixture' });
  assert.throws(() => h.engine.enable(h.engine.view().schedules[1].id, true), /resolve the overlap/);
  h.engine.close(); fs.writeFileSync(h.options.file, '{"password":"private-fragment", broken');
  assert.throws(() => createPowerSchedules(h.options), error => !error.message.includes('private-fragment') && /unreadable/.test(error.message));
});


test('actual scheduled guard preserves show-lock semantics and rejects unsafe feedback/busy/cooling', () => {
  const at = Date.parse('2026-11-06T17:00:00Z'), ready = { assigned: true, online: true, lastReplyAt: new Date(at).toISOString(), busy: false, lock: true, power: 'on' };
  assert.equal(scheduledPowerGuard(ready, 'on', at), null);
  assert.match(scheduledPowerGuard(ready, 'off', at), /Show lock/);
  for (const patch of [{assigned:false},{online:false},{busy:true},{lastReplyAt:null},{lastReplyAt:new Date(at-16000).toISOString()},{power:'cooling'}]) assert.ok(scheduledPowerGuard({...ready,lock:false,...patch}, 'on', at));
});


test('a queued dispatch rechecks deadline and explicit disable before its write', async t => {
  const h = harness(t); let queuedGuard;
  const options = { ...h.options, dispatch: async (slot, action, guard) => { queuedGuard = guard; h.set('2026-11-06T17:00:04Z'); guard(); h.sent.push([slot,action]); } };
  const engine = createPowerSchedules(options); t.after(() => engine.close()); engine.save(schedule); engine.enable(engine.view().schedules[0].id, true); h.set('2026-11-06T17:00:00Z'); await engine.tick();
  assert.equal(h.sent.length, 0); assert.ok(queuedGuard); assert.equal(engine.view().schedules[0].lastRun.status, 'skipped'); assert.match(engine.view().schedules[0].lastRun.targets.P1.reason, /overdue/);
});


test('a slow projector reply cannot hold independent healthy targets past their deadline', async t => {
  const h = harness(t); let releaseSlow, fastStarted;
  const fast = new Promise(resolve => { fastStarted = resolve; });
  const options = { ...h.options, targets: () => [{slot:'P1',assigned:true,identity:'slow'},{slot:'P2',assigned:true,identity:'healthy'}], dispatch: async (slot, action, guard) => { guard(); if(slot==='P1') await new Promise(resolve => { releaseSlow=resolve; }); h.sent.push([slot,action]); if(slot==='P2')fastStarted(); } };
  const engine=createPowerSchedules(options);t.after(()=>engine.close());engine.save({...schedule,slots:['P1','P2']});engine.enable(engine.view().schedules[0].id,true);h.set('2026-11-06T17:00:00Z');
  const pending=engine.tick();await fast;assert.deepEqual(h.sent,[['P2','off']]);assert.ok(releaseSlow,'slow reply is still pending');h.set('2026-11-06T17:00:05Z');releaseSlow();await pending;
  assert.equal(engine.view().schedules[0].lastRun.targets.P2.status,'acknowledged');assert.equal(h.sent.length,2);
});
