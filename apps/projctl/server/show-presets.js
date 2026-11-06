// Built-in show presets for the Frozen WST rig.
// Steps only run when the active driver can do them; otherwise they are
// returned as unsupported/unverified. Show/backup inputs are placeholders
// from rig.showInputs — never invented.

import { patternsFor } from './drivers/panasonic.js';
import { PULSE_PATTERNS } from './drivers/pulse.js';

export const SHOW_INPUT_KEYS = ['show', 'backup'];

/** Preferred symbolic pattern → driver-native code, or null when unsupported. */
export function resolvePattern(driverKind, model, want) {
  const w = String(want || '').toLowerCase();
  if (driverKind === 'pulse') {
    const map = {
      crosshatch: 'internal:crosshatch',
      colorbars: 'internal:colorbars',
      white: 'internal:white',
      off: 'off',
    };
    const code = map[w];
    return code && PULSE_PATTERNS[code] ? { code, label: PULSE_PATTERNS[code] } : null;
  }
  if (driverKind === 'panasonic' || driverKind === 'simulator') {
    const table = driverKind === 'simulator'
      ? { '00': 'Off', '01': 'White', '08': 'Colour bars', '11': 'Focus (white)', '05': 'Window' }
      : patternsFor(model);
    if (w === 'off') return table['00'] ? { code: '00', label: table['00'] } : null;
    if (w === 'colorbars') return table['08'] ? { code: '08', label: table['08'] } : null;
    if (w === 'white') return table['01'] ? { code: '01', label: table['01'] } : null;
    if (w === 'crosshatch') {
      // No literal crosshatch on Panasonic; use the model's focus/alignment pattern.
      if (table['11']) return { code: '11', label: table['11'] };
      if (table['05']) return { code: '05', label: table['05'] };
      return null;
    }
  }
  return null; // pjlink and unknown kinds have no pattern API
}

// Frozen WST slot roles when drawing lanes are not yet assigned.
const WST_FALLBACK = { portals: ['P2', 'P4', 'P3'], stage: ['P1'] };
function slotList(projectors, selector) {
  if (selector === 'all') return projectors.map((p) => p.slot);
  if (selector === 'portals' || selector === 'stage') {
    const byLane = projectors.filter((p) => selector === 'portals' ? (p.lane === 'A' || p.lane === 'B' || p.lane === 'D') : p.lane === 'C').map((p) => p.slot);
    if (byLane.length) return byLane;
    const want = new Set(WST_FALLBACK[selector]);
    return projectors.filter((p) => want.has(p.slot)).map((p) => p.slot);
  }
  if (Array.isArray(selector)) return selector;
  return [selector];
}

/**
 * Built-in show presets. `steps` use symbolic commands; recall expands them
 * against the live drivers and rig.showInputs.
 *
 * confirmPowerOff: strike needs the existing two-tap power-off gate.
 */
export const SHOW_PRESETS = [
  {
    id: 'preshow',
    name: 'Preshow / house open',
    summary: 'Power on, show inputs, shutters closed.',
    osc: '/proj/show/preshow',
    steps: [
      { cmd: 'power', arg: true, slots: 'all' },
      { cmd: 'input', from: 'show', slots: 'all' },
      { cmd: 'pattern', want: 'off', slots: 'all' },
      { cmd: 'shutter', arg: true, slots: 'all' },
    ],
  },
  {
    id: 'top-of-show',
    name: 'Top of show',
    summary: 'Show inputs, shutters open.',
    osc: '/proj/show/top-of-show',
    steps: [
      { cmd: 'input', from: 'show', slots: 'all' },
      { cmd: 'pattern', want: 'off', slots: 'all' },
      { cmd: 'shutter', arg: false, slots: 'all' },
    ],
  },
  {
    id: 'intermission',
    name: 'Intermission',
    summary: 'Shutters closed; stay powered.',
    osc: '/proj/show/intermission',
    steps: [
      { cmd: 'shutter', arg: true, slots: 'all' },
    ],
  },
  {
    id: 'focus',
    name: 'Focus / alignment',
    summary: 'Crosshatch / focus pattern, shutters open.',
    osc: '/proj/show/focus',
    steps: [
      { cmd: 'pattern', want: 'crosshatch', slots: 'all' },
      { cmd: 'shutter', arg: false, slots: 'all' },
    ],
  },
  {
    id: 'color-check',
    name: 'Color / brightness check',
    summary: 'Colour bars (or white field where bars are unavailable).',
    osc: '/proj/show/color-check',
    steps: [
      { cmd: 'pattern', want: 'colorbars', slots: 'all', fallbackWant: 'white' },
      { cmd: 'shutter', arg: false, slots: 'all' },
    ],
  },
  {
    id: 'blackout',
    name: 'Blackout safe',
    summary: 'All shutters closed. CueForge Panic can send /proj/all/shutter 1.',
    osc: '/proj/all/shutter 1',
    steps: [
      { cmd: 'shutter', arg: true, slots: 'all' },
    ],
  },
  {
    id: 'portals-only',
    name: 'Portals only',
    summary: 'Lanes A, B, D open; stage (C) closed.',
    osc: '/proj/show/portals-only',
    steps: [
      { cmd: 'shutter', arg: false, slots: 'portals' },
      { cmd: 'shutter', arg: true, slots: 'stage' },
    ],
  },
  {
    id: 'stage-only',
    name: 'Stage only',
    summary: 'Lane C open; portals A, B, D closed.',
    osc: '/proj/show/stage-only',
    steps: [
      { cmd: 'shutter', arg: false, slots: 'stage' },
      { cmd: 'shutter', arg: true, slots: 'portals' },
    ],
  },
  {
    id: 'backup-input',
    name: 'Backup input',
    summary: 'Switch each projector to its configured backup input.',
    osc: '/proj/show/backup-input',
    steps: [
      { cmd: 'input', from: 'backup', slots: 'all' },
    ],
  },
  {
    id: 'strike',
    name: 'Strike / end of night',
    summary: 'Shutters closed, then power off (two-tap confirm).',
    osc: '/proj/show/strike',
    confirmPowerOff: true,
    steps: [
      { cmd: 'shutter', arg: true, slots: 'all' },
      { cmd: 'pattern', want: 'off', slots: 'all' },
      { cmd: 'power', arg: false, slots: 'all' },
    ],
  },
];

export function showPreset(id) {
  return SHOW_PRESETS.find((p) => p.id === id || p.name === id) || null;
}

export function listShowPresets() {
  return SHOW_PRESETS.map(({ id, name, summary, osc, confirmPowerOff }) => ({
    id, name, summary, osc, confirmPowerOff: !!confirmPowerOff, builtin: true,
  }));
}

/**
 * Expand a show preset into per-slot planned actions for the current rig.
 * @param {object} preset
 * @param {object[]} projectors
 * @param {(slot: string) => object} driverFor  returns driver with .kind and optional .pattern
 * @param {object} showInputs  rig.showInputs = { show: {P1:id}, backup: {P1:id} }
 */
export function planShowPreset(preset, projectors, driverFor, showInputs = {}) {
  const plan = [];
  for (const step of preset.steps || []) {
    const slots = slotList(projectors, step.slots);
    for (const slot of slots) {
      const p = projectors.find((x) => x.slot === slot);
      if (!p) {
        plan.push({ slot, cmd: step.cmd, status: 'unsupported/unverified', detail: 'no projector in slot' });
        continue;
      }
      const d = driverFor(slot) || {};
      if (step.cmd === 'power' || step.cmd === 'shutter') {
        plan.push({
          slot, cmd: step.cmd, arg: !!step.arg, status: 'ok',
          detail: step.cmd === 'shutter' ? (step.arg ? 'closed' : 'open') : (step.arg ? 'on' : 'off'),
        });
        continue;
      }
      if (step.cmd === 'input') {
        const map = showInputs?.[step.from] || {};
        const id = map[slot];
        if (id == null || id === '') {
          plan.push({
            slot, cmd: 'input', status: 'unsupported/unverified',
            detail: `rig.showInputs.${step.from}.${slot} not configured`,
          });
          continue;
        }
        const known = p.inputs && Object.hasOwn(p.inputs, String(id));
        // Pulse discovers live sources; still allow the configured placeholder through.
        if (!known && d.kind !== 'pulse') {
          plan.push({
            slot, cmd: 'input', arg: String(id), status: 'unsupported/unverified',
            detail: `input ${id} not in projector inputs map`,
          });
          continue;
        }
        plan.push({ slot, cmd: 'input', arg: String(id), status: 'ok', detail: `input ${id}` });
        continue;
      }
      if (step.cmd === 'pattern') {
        if (typeof d.pattern !== 'function') {
          plan.push({
            slot, cmd: 'pattern', status: 'unsupported/unverified',
            detail: `test pattern not supported by ${d.kind || 'this'} driver`,
          });
          continue;
        }
        let resolved = resolvePattern(d.kind, p.model, step.want);
        if (!resolved && step.fallbackWant) resolved = resolvePattern(d.kind, p.model, step.fallbackWant);
        if (!resolved) {
          plan.push({
            slot, cmd: 'pattern', status: 'unsupported/unverified',
            detail: `${step.want} pattern not on this model`,
          });
          continue;
        }
        plan.push({
          slot, cmd: 'pattern', arg: resolved.code, status: 'ok',
          detail: resolved.label,
        });
        continue;
      }
      plan.push({ slot, cmd: step.cmd, status: 'unsupported/unverified', detail: `unknown step ${step.cmd}` });
    }
  }
  return plan;
}

/** Group planned actions for UI cards. */
export function summarizePlan(plan) {
  const bySlot = {};
  for (const a of plan) {
    (bySlot[a.slot] || (bySlot[a.slot] = [])).push(a);
  }
  return bySlot;
}
