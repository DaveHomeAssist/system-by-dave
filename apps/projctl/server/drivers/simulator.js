// In-process fake projector. Warms up 4 s, cools 6 s. Same interface as the real drivers.
import { POWER, SHUTTER, NotSupported } from './base.js';

export function simulatorDriver({ name = 'SIM', inputs = ['31', '32'] } = {}) {
  const st = { power: POWER.OFF, shutter: SHUTTER.CLOSED, input: inputs[0], lightHours: 1234, name, flaky: false, lens: { h: 0, v: 0, focus: 1000, zoom: 1000, hState: 'Stopped', vState: 'Stopped', focusState: 'Stopped', zoomState: 'Stopped' } };
  let timer = null;
  const later = (ms, fn) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
  return {
    kind: 'simulator',
    lensJog: { axes: ['h', 'v', 'focus', 'zoom'], speeds: ['slow', 'normal', 'fast'], mode: 'bounded-step', stop: true, positionReadback: true },
    lensControls: { h: true, v: true, focus: true, zoom: true },
    _state: st,
    async getStatus() {
      if (st.flaky) throw new Error('simulated offline');
      const { power, shutter, input, lightHours, name, lens, pattern } = st;
      if (st.pollFocus != null) st.lens.focus = st.pollFocus;
      const result = { power, shutter, input, lightHours, name, lens: { ...lens }, pattern, errors: { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 }, online: true };
      return result;
    },
    async healthReadings() {
      if (st.flaky) throw new Error('simulated offline');
      const t = st.temps || { intake: 24, qtm1: 36, qtm2: 31 };
      return { sensors: [
        { id: 'intake', label: 'Intake air (simulated)', role: 'intake', c: t.intake },
        { id: 'qtm1', label: 'Internal 1 (simulated)', role: 'internal', c: t.qtm1 },
        { id: 'qtm2', label: 'Internal 2 (simulated)', role: 'internal', c: t.qtm2 },
      ], alarm: st.alarm ?? null };
    },
    async power(on, { guard } = {}) {
      guard?.();
      if (on) {
        if (st.power === POWER.COOLING) throw Object.assign(new Error('Unavailable at this time'), { code: 'ERR3' });
        if (st.power === POWER.OFF) { st.power = POWER.WARMING; later(4000, () => { st.power = POWER.ON; }); }
      } else if (st.power === POWER.ON || st.power === POWER.WARMING) {
        st.power = POWER.COOLING; later(6000, () => { st.power = POWER.OFF; });
      }
      return 'OK';
    },
    async shutter(closed, { guard } = {}) { guard?.(); st.shutter = closed ? SHUTTER.CLOSED : SHUTTER.OPEN; return 'OK'; },
    async input(id, { guard } = {}) {
      guard?.();
      if (!inputs.includes(String(id))) throw Object.assign(new Error('Invalid parameter'), { code: 'ERR2' });
      st.input = String(id); return 'OK';
    },
    async pattern(code, { guard } = {}) { guard?.(); st.pattern = String(code).padStart(2, '0'); return 'OK'; },
    async lens(op, { guard } = {}) { guard?.(); st.pollFocus = null; if (['h', 'v', 'focus', 'zoom'].includes(op.axis)) { st.lens[op.axis] = Math.max(0, Math.min(65535, st.lens[op.axis] + (op.dir === '+' ? 1 : -1) * ({ slow: 128, normal: 512, fast: 2048 }[op.speed || 'slow']))); st.lens[op.axis + 'State'] = 'Stopped'; } else if (op.op === 'home') { st.lens.h = st.lens.v = 0; } return 'OK'; },
    async recallLens(targets, { guard } = {}) { guard?.(); for (const [axis, target] of Object.entries(targets)) { if (Number.isFinite(target)) st.lens[axis] = target; st.lens[axis + 'State'] = 'Stopped'; } return 'OK'; },
    async getPicture() { return st.picture || (st.picture = { mode: 'STD', contrast: 0, brightness: 0, color: 0, tint: 0, sharpness: 8, gamma: 'DEF', colorTemp: '10', noise: '0', iris: '0' }); },
    async picture(key, value, { guard } = {}) {
      guard?.();
      if (!st.picture) await this.getPicture();
      guard?.();
      st.picture[key] = value;
      return 'OK';
    },
  };
}
