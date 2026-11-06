// rig.json: projectors, presets, events, lock. Single writer (the relay).
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_RIG = {
  show: 'Frozen at WST',
  lock: false,
  projectors: [
    { slot: 'P1', label: 'Barco UDM 4K22', make: 'Barco', model: 'UDM 4K22', owner: 'Rental', driver: 'pulse', mac: '', ip: '', inputs: { 'HDMI': 'HDMI', 'SDI': 'SDI' }, notes: 'Snorkel, right angle out. L6-30 cord, needs 208V for full output.' },
    { slot: 'P2', label: 'House Panasonic A', make: 'Panasonic', model: 'TBC', owner: 'House', driver: 'panasonic', mac: '', ip: '', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI' }, notes: 'Portrait, cross shoots portal.' },
    { slot: 'P3', label: 'House Panasonic B', make: 'Panasonic', model: 'TBC', owner: 'House', driver: 'panasonic', mac: '', ip: '', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI' }, notes: 'Portrait, cross shoots portal.' },
    { slot: 'P4', label: 'Panasonic PT-RZ970B', make: 'Panasonic', model: 'PT-RZ970B', owner: 'Rental', driver: 'panasonic', mac: '', ip: '192.168.1.8', inputs: { '31': 'HDMI', '32': 'DVI-D', '33': 'SDI', '34': 'DIGITAL LINK' }, notes: 'ET-DLE080 lens. S/N DA7610162.' },
  ],
  presets: [],
  events: [],
};

export function openStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let rig;
  try { rig = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { rig = structuredClone(DEFAULT_RIG); }
  let pending = null;
  const save = () => {
    if (pending) return; pending = setTimeout(() => { pending = null; fs.writeFileSync(file, JSON.stringify(rig, null, 2)); }, 150);
  };
  return {
    rig, save,
    projector(slot) { return rig.projectors.find((p) => p.slot === slot); },
    event(e) {
      rig.events.push({ at: new Date().toISOString(), ...e });
      if (rig.events.length > 2000) rig.events.splice(0, rig.events.length - 2000);
      save();
    },
  };
}

export function simRig(rig) {
  for (const p of rig.projectors) { p.driver = 'simulator'; p.ip = 'sim'; }
  return rig;
}
