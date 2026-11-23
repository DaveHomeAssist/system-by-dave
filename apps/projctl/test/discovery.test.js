import test from 'node:test';
import assert from 'node:assert/strict';
import { discoveryPlan, createManualDiscovery } from '../server/discovery.js';

const rig = [
  { slot: 'P3', lane: 'A', ip: '192.0.2.21', mac: 'aa:00:00:00:00:01', model: 'DW830', password: 'fixture-A' },
  { slot: 'P4', lane: 'D', ip: '192.0.2.11', mac: 'aa:00:00:00:00:02', model: 'DW830', password: 'fixture-D' },
];
test('manual discovery matches unique MACs across subnets and preserves same-model lanes/credentials', () => {
  const before = structuredClone(rig), current = structuredClone(rig);
  const p = discoveryPlan(before, current, [{ mac: rig[1].mac, ip: '198.51.100.23' }, { mac: rig[0].mac.toUpperCase(), ip: '198.51.100.20' }]);
  assert.deepEqual(p.updates.map(x => [x.slot, x.ip]), [['P4', '198.51.100.23'], ['P3', '198.51.100.20']]);
  assert.deepEqual(current, rig); assert.equal(JSON.stringify(p).includes('fixture-'), false);
});
test('ambiguous MAC, conflicting addresses, unknown devices and mid-scan retarget cannot remap a lane', () => {
  assert.equal(discoveryPlan(rig, rig, [{ mac: rig[0].mac, ip: '198.51.100.20' }, { mac: rig[0].mac, ip: '198.51.100.21' }]).updates.length, 0);
  assert.equal(discoveryPlan(rig, [...rig, { ...rig[0], slot: 'other' }], [{ mac: rig[0].mac, ip: '198.51.100.20' }]).updates.length, 0);
  assert.equal(discoveryPlan(rig, rig, [{ mac: rig[0].mac, ip: rig[1].ip }]).updates.length, 0);
  assert.equal(discoveryPlan(rig, rig, [{ mac: 'unknown', ip: '198.51.100.22', model: 'DW830' }]).updates.length, 0);
  const current = structuredClone(rig); current[0].lane = 'B';
  assert.equal(discoveryPlan(rig, current, [{ mac: rig[0].mac, ip: '198.51.100.20' }]).updates.length, 0);
});
test('concurrent manual scans share one operation; socket failure remains an error and permits retry', async () => {
  let scans = 0, finish, applied = 0;
  const scan = createManualDiscovery({ projectors: () => rig, scan: () => { scans++; return new Promise((resolve, reject) => { finish = { resolve, reject }; }); }, apply: () => applied++ });
  const a = scan(), b = scan(); assert.equal(a, b); await Promise.resolve(); assert.equal(scans, 1);
  finish.reject(new Error('socket failed')); await assert.rejects(a, /socket failed/); assert.equal(applied, 0);
  const c = scan(); await Promise.resolve(); finish.resolve([]); const result = await c;
  assert.equal(result.exhaustive, false); assert.match(result.note, /No response does not mean/); assert.equal(scans, 2);
});
