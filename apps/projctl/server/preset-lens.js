export const LENS_AXES = ['h', 'v', 'focus', 'zoom'];
export function hasLens(preset) { return Object.values(preset?.perSlot || {}).some((p) => LENS_AXES.some((k) => Number.isFinite(p.lens?.[k]))); }
export function lensSummary(preset, capabilities = () => ({ h: true, v: true, focus: true, zoom: true })) {
  const out = {};
  for (const [slot, want] of Object.entries(preset?.perSlot || {})) {
    const saved = Object.fromEntries(LENS_AXES.filter((k) => Number.isFinite(want.lens?.[k])).map((k) => [k, want.lens[k]]));
    const unsupported = LENS_AXES.filter((k) => saved[k] !== undefined && !capabilities(slot)[k]).map((k) => capabilities(slot)[k] === undefined ? `${k} (lens recall unverified / not stored)` : k);    if (!Object.keys(saved).length) continue;
    out[slot] = { saved, supported: LENS_AXES.filter((k) => saved[k] !== undefined && capabilities(slot)[k] === true), unsupported };
  }
  return out;
}
export function lensPositionMatch(actual, saved, supported) {
  return Object.fromEntries(supported.map((axis) => {
    const value = actual?.[axis];
    return [axis, Number.isFinite(value) && Math.abs(value - saved[axis]) <= 1 ? 'match' : Number.isFinite(value) ? `mismatch (reported ${value}, saved ${saved[axis]})` : 'unknown'];
  }));
}

export function lensMotorState(actual, supported) {
  return Object.fromEntries(supported.map((axis) => [axis, actual?.[axis + 'State'] === 'Stopped' ? 'stopped' : actual?.[axis + 'State'] || 'unknown']));
}
