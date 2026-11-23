import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const slotsByLane = { A: 'P1', B: 'P2', C: 'P3', D: 'P4' };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// Deliberate offline migration only. Editing a drawing lane never renumbers it.
export function renumberRig(rig, schedules = null, at = new Date().toISOString()) {
  if (!rig || !Array.isArray(rig.projectors) || rig.projectors.length !== 4 || !Array.isArray(rig.presets) || !Array.isArray(rig.events)) throw new Error('Expected a saved four-projector rig.');
  const lanes = new Set(), slots = new Set(), mapping = [];
  for (const p of rig.projectors) {
    if (!Object.hasOwn(slotsByLane, p.lane) || lanes.has(p.lane) || !/^P[1-4]$/.test(p.slot) || slots.has(p.slot)) throw new Error('Each lane A through D and slot P1 through P4 must appear exactly once.');
    lanes.add(p.lane); slots.add(p.slot); mapping.push({ lane: p.lane, from: p.slot, to: slotsByLane[p.lane] });
  }
  mapping.sort((a, b) => a.lane.localeCompare(b.lane));
  const changed = mapping.some(item => item.from !== item.to);
  if (!changed) return { rig: structuredClone(rig), mapping, changed: false };
  if (schedules && (schedules.version !== 1 || !Array.isArray(schedules.schedules) || !Array.isArray(schedules.audit) || schedules.schedules.length || schedules.audit.length)) throw new Error('Saved schedules or schedule history require a separate target migration; no files changed.');
  const lookup = Object.fromEntries(mapping.map(item => [item.from, item.to]));
  const next = structuredClone(rig);
  next.projectors = next.projectors.map(p => ({ ...p, slot: lookup[p.slot] })).sort((a, b) => a.slot.localeCompare(b.slot));
  for (const preset of next.presets) {
    if (!preset.perSlot || Array.isArray(preset.perSlot) || typeof preset.perSlot !== 'object') throw new Error('Unsupported preset shape; no files changed.');
    preset.perSlot = Object.fromEntries(Object.entries(preset.perSlot).map(([slot, values]) => {
      if (!Object.hasOwn(lookup, slot)) throw new Error('Preset refers to an unknown slot; no files changed.');
      return [lookup[slot], values];
    }));
  }
  next.events = next.events.map(event => Object.hasOwn(lookup, event.slot) && lookup[event.slot] !== event.slot
    ? { ...event, slot: lookup[event.slot], slotBeforeRenumber: event.slotBeforeRenumber || event.slot }
    : event);
  if (next.slotMigrations !== undefined && !Array.isArray(next.slotMigrations)) throw new Error('Unsupported migration history; no files changed.');
  next.slotMigrations = [...(next.slotMigrations || []), { at, mapping }];
  return { rig: next, mapping, changed: true };
}

export function migrateFile(file, { write = false, expectedSha, relayStopped = false } = {}) {
  const bytes = fs.readFileSync(file), beforeSha = sha256(bytes), directory = path.dirname(file);
  const schedulesPath = path.join(directory, 'power-schedules.json');
  const schedules = fs.existsSync(schedulesPath) ? JSON.parse(fs.readFileSync(schedulesPath, 'utf8')) : null;
  const result = renumberRig(JSON.parse(bytes), schedules);
  const summary = { changed: result.changed, mapping: result.mapping, beforeSha, presets: result.rig.presets.length, events: result.rig.events.length, written: false };
  if (!write || !result.changed) return summary;
  if (!relayStopped) throw new Error('Stop the relay and review external slot-based cues before using --write --relay-stopped.');
  if (expectedSha !== beforeSha) throw new Error('Saved rig changed since review; run the preview again.');
  const claims = schedulesPath + '.claims';
  if (fs.existsSync(claims) && fs.readdirSync(claims).length) throw new Error('Schedule occurrence claims require a separate migration; no files changed.');
  const backup = file + '.before-numbering-' + new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(backup, bytes, { mode: 0o600, flag: 'wx' });
  const temporary = file + '.renumber-' + randomUUID();
  const output = JSON.stringify(result.rig, null, 2) + '\n';
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(fd, output); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (sha256(fs.readFileSync(file)) !== beforeSha) { fs.unlinkSync(temporary); throw new Error('Saved rig changed during migration; original file preserved.'); }
  fs.renameSync(temporary, file);
  if (fs.readFileSync(file, 'utf8') !== output) throw new Error('Migration readback failed; retain the backup and stop.');
  return { ...summary, written: true, backup, afterSha: sha256(output) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { rig: { type: 'string' }, write: { type: 'boolean' }, 'relay-stopped': { type: 'boolean' }, 'expected-sha': { type: 'string' } } });
    if (!values.rig) throw new Error('Use --rig /absolute/path/to/rig.json to preview A=P1, B=P2, C=P3, D=P4.');
    console.log(JSON.stringify(migrateFile(path.resolve(values.rig), { write: values.write, expectedSha: values['expected-sha'], relayStopped: values['relay-stopped'] }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
