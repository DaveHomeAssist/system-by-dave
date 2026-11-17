// Lane letters are the cue identity. Slot IDs are read from the current rig
// (rig.json) at runtime and are recorded, not verified. Never invent a map.
import { LANES } from '../public/lanes.js';

export const LANE_IDS = Object.freeze(Object.keys(LANES));
export const PORTAL_LANES = Object.freeze(['A', 'B', 'D']);
export const STAGE_LANES = Object.freeze(['C']);

export function isLaneId(value) {
  return typeof value === 'string' && Object.hasOwn(LANES, value.toUpperCase());
}

export function projectorsForLane(projectors, lane) {
  const id = String(lane || '').toUpperCase();
  if (!isLaneId(id)) return [];
  return (projectors || []).filter((p) => p.lane === id);
}

export function slotsForLanes(projectors, lanes) {
  const slots = [];
  const missing = [];
  for (const lane of lanes) {
    const found = projectorsForLane(projectors, lane);
    if (found.length) slots.push(...found.map((p) => p.slot));
    else missing.push(String(lane).toUpperCase());
  }
  return { slots, missing };
}

/** Resolve a show-preset selector ('all', 'portals', 'stage', slot, or slot list) against the live rig. */
export function slotsForSelector(projectors, selector) {
  if (selector === 'all') return { slots: (projectors || []).map((p) => p.slot), missing: [] };
  if (selector === 'portals') return slotsForLanes(projectors, PORTAL_LANES);
  if (selector === 'stage') return slotsForLanes(projectors, STAGE_LANES);
  if (Array.isArray(selector)) {
    const slots = [];
    const missing = [];
    for (const item of selector) {
      if (isLaneId(item)) {
        const found = projectorsForLane(projectors, item);
        if (found.length) slots.push(...found.map((p) => p.slot));
        else missing.push(String(item).toUpperCase());
      } else slots.push(item);
    }
    return { slots, missing };
  }
  if (isLaneId(selector)) return slotsForLanes(projectors, [selector]);
  return { slots: [selector], missing: [] };
}

/**
 * Resolve an OSC/TCP cue target: 'all', a lane letter A–D, or a recorded slot ID.
 * Lane letters always follow the current rig.json assignment.
 */
export function resolveOscTarget(projectors, id) {
  const key = String(id || '').toUpperCase();
  if (!key) throw new Error('cue needs a lane letter, all, or a recorded slot');
  if (key === 'ALL') return { kind: 'all', slots: (projectors || []).map((p) => p.slot), missing: [] };
  if (isLaneId(key)) {
    const found = projectorsForLane(projectors, key);
    if (!found.length) {
      const error = new Error(`Lane ${key} is unassigned in the current rig`);
      error.code = 'UNASSIGNED_LANE';
      throw error;
    }
    return { kind: 'lane', lane: key, slots: found.map((p) => p.slot), missing: [] };
  }
  if ((projectors || []).some((p) => p.slot === key)) return { kind: 'slot', slots: [key], missing: [] };
  throw new Error(`Unknown cue target ${key}`);
}

/** Slot IDs shown in the UI come from config and are not hardware-verified. */
export function recordedSlotLabel(slot) {
  if (!slot) return '';
  return `${slot} (recorded, not verified)`;
}
