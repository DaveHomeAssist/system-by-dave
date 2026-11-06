// In-process fake projector. Warms up 4 s, cools 6 s. Same interface as the real drivers.
import { POWER, SHUTTER, NotSupported } from './base.js';

export function simulatorDriver({ name = 'SIM', inputs = ['31', '32'] } = {}) {
  const st = { power: POWER.OFF, shutter: SHUTTER.CLOSED, input: inputs[0], lightHours: 1234, name, flaky: false };
  let timer = null;
  const later = (ms, fn) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
  return {
    kind: 'simulator',
    _state: st,
    async getStatus() {
      if (st.flaky) throw new Error('simulated offline');
      return { ...st, errors: { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 }, online: true };
    },
    async power(on) {
      if (on) {
        if (st.power === POWER.COOLING) throw Object.assign(new Error('Unavailable at this time'), { code: 'ERR3' });
        if (st.power === POWER.OFF) { st.power = POWER.WARMING; later(4000, () => { st.power = POWER.ON; }); }
      } else if (st.power === POWER.ON || st.power === POWER.WARMING) {
        st.power = POWER.COOLING; later(6000, () => { st.power = POWER.OFF; });
      }
      return 'OK';
    },
    async shutter(closed) { st.shutter = closed ? SHUTTER.CLOSED : SHUTTER.OPEN; return 'OK'; },
    async input(id) {
      if (!inputs.includes(String(id))) throw Object.assign(new Error('Invalid parameter'), { code: 'ERR2' });
      st.input = String(id); return 'OK';
    },
    async pattern(code) { st.pattern = String(code).padStart(2, '0'); return 'OK'; },
    async lens(op) { st.lens = op; return 'OK'; },
    async getPicture() { return st.picture || (st.picture = { mode: 'STD', contrast: 0, brightness: 0, color: 0, tint: 0, sharpness: 8, gamma: 'DEF', colorTemp: '10', noise: '0', iris: '0' }); },
    async picture(key, value) { (st.picture || await this.getPicture()); st.picture[key] = value; return 'OK'; },
  };
}
