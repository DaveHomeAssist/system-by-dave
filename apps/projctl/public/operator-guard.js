// UI timing for dangerous and repeating controls. The relay still decides
// whether a command is allowed. This only decides when the page may send one.
export const CONFIRM_BEAT_MS = 450;
export const CONFIRM_WINDOW_MS = 3000;
export const LENS_MIN_HOLD_MS = 450;
export const LENS_MAX_HOLD_MS = 8000;

export function createConfirmGate({ now = () => Date.now(), beatMs = CONFIRM_BEAT_MS, windowMs = CONFIRM_WINDOW_MS } = {}) {
  const arms = new Map();
  const current = (key, time) => {
    const arm = arms.get(key);
    if (!arm) return null;
    if (time > arm.until) { arms.delete(key); return null; }
    return arm;
  };
  return {
    // 'arm' shows the confirm label and sends nothing that would perform the action.
    // 'ignore' is a fast repeat while that label is still coming up.
    // 'send' is a later, deliberate press.
    press(key) {
      const time = now();
      const arm = current(key, time);
      if (!arm) {
        arms.set(key, { at: time, until: time + windowMs });
        return 'arm';
      }
      if (time - arm.at < beatMs) return 'ignore';
      arms.delete(key);
      return 'send';
    },
    armed(key) { return !!current(key, now()); },
    clear(key) { if (key == null) arms.clear(); else arms.delete(key); },
  };
}

export function lensMotorsStopped(lens) {
  if (!lens || typeof lens !== 'object') return true;
  const states = ['h', 'v', 'focus', 'zoom'].map((axis) => lens[`${axis}State`]).filter((state) => state != null && state !== '');
  if (!states.length) return true;
  return states.every((state) => /stop/i.test(String(state)));
}

export function createLensHold({ now = () => Date.now(), minMs = LENS_MIN_HOLD_MS, maxMs = LENS_MAX_HOLD_MS } = {}) {
  const holds = new Map();
  return {
    begin(slot) {
      const time = now();
      holds.set(slot, { started: time, deadline: time + maxMs });
    },
    // True while another jog must not be sent. An instant "Stopped" report
    // still holds for minMs so a double-click cannot slip through. The hold
    // ends at maxMs even if a motor state never returns to stopped.
    blocking(slot, { busy = false, lens = null } = {}) {
      const hold = holds.get(slot);
      if (!hold) return !!busy;
      const time = now();
      if (time >= hold.deadline) { holds.delete(slot); return !!busy; }
      const withinMinimum = time - hold.started < minMs;
      const moving = !!busy || !lensMotorsStopped(lens);
      if (!withinMinimum && !moving) { holds.delete(slot); return false; }
      return true;
    },
    clear(slot) { holds.delete(slot); },
  };
}

export function formatCommandArg(value) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  return Object.entries(value).map(([key, item]) => `${key} ${item != null && typeof item === 'object' ? JSON.stringify(item) : item}`).join(' ');
}

export const confirmGate = createConfirmGate();
export const lensHold = createLensHold();

export function disabledDangerReason({ connected = true, offline = false, locked = false, busy = false, power = '' } = {}) {
  if (!connected) return 'relay offline';
  if (offline) return 'no reply';
  if (locked) return 'show lock';
  if (busy) return 'lens moving';
  if (power === 'cooling') return 'cooling';
  if (power === 'off') return 'already off';
  return '';
}
