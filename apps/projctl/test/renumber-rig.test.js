import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renumberRig, migrateFile } from '../scripts/renumber-rig.js';

const rig = () => ({ show: 'Fixture', lock: true, preferredInput: 'HDMI', projectors: [
  { slot: 'P1', lane: 'C', ip: '192.0.2.3', model: 'Barco', password: 'fixture-C', reverseH: true },
  { slot: 'P2', lane: 'B', ip: '192.0.2.2', model: 'Panasonic B' },
  { slot: 'P3', lane: 'A', ip: '192.0.2.1', model: 'Panasonic A', password: 'fixture-A', lens: { calibration: 99 } },
  { slot: 'P4', lane: 'D', ip: '192.0.2.4', model: 'Panasonic D' },
], presets: [{ name: 'Saved look', perSlot: { P1: { power: true, lens: { focus: 22 } }, P3: { shutter: 'closed' } } }], events: [
  { at: '2026-11-01T00:00:00Z', slot: 'P1', command: '/proj/P1/power', result: 'OK' },
  { slot: 'P3', command: 'online', result: 'OK' }, { slot: 'all', command: 'lock', result: 'OK' },
] });
const emptySchedules = { version: 1, schedules: [], audit: [] };

test('numbering follows lanes while every physical setting and saved preset stays with its device', () => {
  const before = rig(), original = structuredClone(before), result = renumberRig(before, emptySchedules, '2026-11-07T00:00:00Z');
  assert.deepEqual(before, original, 'preview must not modify its input');
  assert.deepEqual(result.rig.projectors.map(p => [p.lane, p.slot]), [['A','P1'],['B','P2'],['C','P3'],['D','P4']]);
  for (const p of original.projectors) assert.deepEqual({ ...result.rig.projectors.find(q => q.lane === p.lane), slot: p.slot }, p);
  assert.deepEqual(result.rig.presets[0].perSlot, { P3: original.presets[0].perSlot.P1, P1: original.presets[0].perSlot.P3 });
  assert.equal(result.rig.lock, true);
  assert.deepEqual(result.rig.events[0], { ...original.events[0], slot: 'P3', slotBeforeRenumber: 'P1' });
  assert.deepEqual(result.rig.events[2], original.events[2]);
  assert.equal(result.rig.slotMigrations.length, 1);
  assert.deepEqual(renumberRig(result.rig, emptySchedules).rig, result.rig, 'repeat does not rewrite history');
});

test('ambiguous assignments, unknown preset targets and existing schedules fail closed', () => {
  const duplicate = rig(); duplicate.projectors[0].lane = 'A';
  assert.throws(() => renumberRig(duplicate), /exactly once/);
  const unassigned = rig(); delete unassigned.projectors[0].lane;
  assert.throws(() => renumberRig(unassigned), /exactly once/);
  const unknown = rig(); unknown.presets[0].perSlot.P5 = {};
  assert.throws(() => renumberRig(unknown), /unknown slot/);
  assert.throws(() => renumberRig(rig(), { ...emptySchedules, schedules: [{ enabled: false }] }), /separate target migration/);
  assert.throws(() => renumberRig(rig(), { ...emptySchedules, audit: [{}] }), /separate target migration/);
});

test('file migration previews without writes and requires an unchanged stopped rig, with exact backup and readback', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-numbering-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'rig.json'), bytes = JSON.stringify(rig()); fs.writeFileSync(file, bytes);
  fs.writeFileSync(path.join(dir, 'power-schedules.json'), JSON.stringify(emptySchedules));
  const preview = migrateFile(file); assert.equal(preview.written, false); assert.equal(fs.readFileSync(file, 'utf8'), bytes);
  assert.throws(() => migrateFile(file, { write: true, expectedSha: preview.beforeSha }), /Stop the relay/);
  assert.throws(() => migrateFile(file, { write: true, relayStopped: true, expectedSha: 'stale' }), /changed since review/);
  const saved = migrateFile(file, { write: true, relayStopped: true, expectedSha: preview.beforeSha });
  assert.equal(saved.written, true); assert.equal(fs.readFileSync(saved.backup, 'utf8'), bytes);
  assert.equal(JSON.parse(fs.readFileSync(file)).projectors[0].lane, 'A');
  assert.equal(fs.statSync(saved.backup).mode & 0o777, 0o600);
  assert.equal(migrateFile(file, { write: true }).written, false);
});
