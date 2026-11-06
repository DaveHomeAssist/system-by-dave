// Panasonic network control, TCP 1024. Text protocol with optional
// "protect mode" (MD5 of user:pass:random). PJLink (4352) covers power,
// shutter, input and status; the native port does what PJLink lacks:
// test patterns, lens, picture settings. Commands verified against the
// PT-DZ870/DW830 and PT-RZ970 control command specs (2015/2018) and the
// WST house PT-DW830U units on 2026-11-02.
import net from 'node:net';
import { createHash } from 'node:crypto';
import { pjlinkDriver } from './pjlink.js';
import { throwIfAborted } from './transport.js';

// Test pattern codes (OTS / QTS), PT-DW830 spec section 2.8.
export const PATTERNS = {
  '00': 'Off', '01': 'White', '02': 'Black', '03': 'Flag', '04': 'Reversed flag',
  '05': 'Window', '06': 'Reversed window', '11': 'Focus (white)', '08': 'Colour bars',
  '22': 'Red', '23': 'Green', '24': 'Blue', '28': 'Cyan', '29': 'Magenta', '30': 'Yellow',
  '41': 'CW index', '51': 'Colour bars (side)', '59': '16:9 / 4:3', '70': 'Focus (red)',
  '71': 'Focus (green)', '72': 'Focus (blue)', '73': 'Focus (cyan)', '74': 'Focus (magenta)', '75': 'Focus (yellow)',
};

// Lens jog: VXX:LNSI{n}=+00{speed}0{dir}. Spec 2.216-2.219 and 3.1.
const LENS_AXIS = { h: 2, v: 3, focus: 4, zoom: 5 };
const LENS_SPEED = { slow: 0, normal: 1, fast: 2 };

// Picture settings: set command, query command, encoding. Spec 2.42-2.63.
const off32 = { enc: (v) => String(Number(v) + 32).padStart(3, '0'), dec: (s) => Number(s) - 32 };
const plain3 = { enc: (v) => String(Number(v)).padStart(3, '0'), dec: (s) => Number(s) };
const asis = { enc: (v) => String(v), dec: (s) => s };
export const PICTURE = {
  mode:       { label: 'Picture mode', set: 'VPM', query: 'QPM', type: 'enum', options: { NAT: 'Natural', STD: 'Standard', DYN: 'Dynamic', CIN: 'Cinema', GRA: 'Graphic', DIC: 'DICOM sim.', USR: 'User', 709: 'REC709' }, codec: asis },
  contrast:   { label: 'Contrast', set: 'VCN', query: 'QVR', type: 'range', min: -31, max: 31, codec: off32 },
  brightness: { label: 'Brightness', set: 'VBR', query: 'QVB', type: 'range', min: -31, max: 31, codec: off32 },
  color:      { label: 'Colour', set: 'VCO', query: 'QVC', type: 'range', min: -31, max: 31, codec: off32 },
  tint:       { label: 'Tint', set: 'VTN', query: 'QVT', type: 'range', min: -31, max: 31, codec: off32 },
  sharpness:  { label: 'Sharpness', set: 'VSR', query: 'QVS', type: 'range', min: 0, max: 15, codec: plain3 },
  gamma:      { label: 'Gamma', set: 'VGA', query: 'QGA', type: 'enum', options: { DEF: 'Default', 1.8: '1.8', 2.0: '2.0', 2.2: '2.2' }, codec: asis },
  colorTemp:  { label: 'Colour temperature', set: 'OTE', query: 'QTE', type: 'enum', options: Object.fromEntries([['10', 'Default'], ['4', 'User 1'], ['9', 'User 2'], ...Array.from({ length: 62 }, (_, i) => [String(3200 + i * 100), `${3200 + i * 100} K`])]), codec: asis },
  noise:      { label: 'Noise reduction', set: 'VNS', query: 'QNS', type: 'enum', options: { 0: 'Off', 1: '1', 2: '2', 3: '3' }, codec: asis },
  iris:       { label: 'Dynamic iris', set: 'OAI', query: 'QAI', type: 'enum', options: { 0: 'Off', 1: '1', 2: '2', 3: '3', 4: 'User' }, codec: asis },
};
// PT-RZ970 supports a subset (RZ970 command spec 2018); code 11 is Convergence there.
export const PATTERNS_RZ970 = {
  '00': 'Off', '01': 'White', '02': 'Black', '05': 'Window', '06': 'Reversed window', '08': 'Colour bars',
  '11': 'Convergence', '51': 'Colour bars (side)', '59': '16:9 / 4:3', '70': 'Focus (red)', '71': 'Focus (green)',
  '72': 'Focus (blue)', '73': 'Focus (cyan)', '74': 'Focus (magenta)', '75': 'Focus (yellow)',
};
export function patternsFor(model = '') { return /RZ970|RZ770|RZ660/i.test(model) ? PATTERNS_RZ970 : PATTERNS; }
export function pictureSchema() {
  return Object.fromEntries(Object.entries(PICTURE).map(([k, v]) => [k, { label: v.label, type: v.type, min: v.min, max: v.max, options: v.options }]));
}

export function panasonicDriver({ host, port = 1024, user = 'admin1', password = '', timeoutMs = 5000, model = '', ...rest }) {
  const pj = pjlinkDriver({ host, password, ...rest, port: 4352 });
  const patterns = patternsFor(model);

  function native(cmd, { signal } = {}) {
    throwIfAborted(signal);
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host, port });
      let buf = '', prefix = null, done = false;
      const cleanup = () => { clearTimeout(t); signal?.removeEventListener('abort', abort); };
      const fail = (e) => { if (!done) { done = true; cleanup(); sock.destroy(); reject(e); } };
      const abort = () => fail(signal.reason || new Error('Projector poll cancelled'));
      const t = setTimeout(() => fail(new Error('timeout (port 1024)')), timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      sock.on('error', fail);
      sock.on('end', () => fail(new Error('connection closed before Panasonic reply')));
      sock.on('close', () => fail(new Error('connection closed before Panasonic reply')));
      sock.on('data', (d) => {
        buf += d.toString('latin1');
        let idx;
        while ((idx = buf.indexOf('\r')) >= 0) {
          const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (prefix === null) {
            if (!line.startsWith('NTCONTROL ')) return fail(new Error('not Panasonic network control: ' + line));
            prefix = line[10] === '1' ? createHash('md5').update(`${user}:${password}:${line.slice(12, 20)}`).digest('hex') : '';
            try { throwIfAborted(signal); sock.write(prefix + '00' + cmd + '\r'); } catch (e) { return fail(e); }
          } else {
            cleanup(); done = true; sock.end();
            const body = line.replace(/^00/, '');
            if (body === 'ERRA') return reject(new Error('auth failed: admin user/password wrong (Setup tab)'));
            if (body.startsWith('ER401')) return reject(Object.assign(new Error('projector refuses this now (no signal, wrong state, or unsupported)'), { code: 'ER401' }));
            if (body.startsWith('ER402')) return reject(new Error('invalid parameter'));
            if (body.startsWith('ER')) return reject(new Error(body));
            resolve(body);
          }
        }
      });
    });
  }

  return {
    ...pj,
    kind: 'panasonic',
    lensJog: { axes: ['h', 'v', 'focus', 'zoom'], speeds: ['slow', 'normal', 'fast'], mode: 'native-jog', stop: false, positionReadback: false },
    lensControls: { h: false, v: false, focus: false, zoom: false },
    patterns,
    async getStatus({ signal } = {}) {
      const s = await pj.getStatus({ signal });
      try { s.pattern = await native('QTS', { signal }); } catch { throwIfAborted(signal); s.pattern = null; }
      throwIfAborted(signal);
      return s;
    },
    async pattern(code) {
      const c = String(code).padStart(2, '0');
      if (!patterns[c]) throw new Error(`pattern ${c} not on this model`);
      await native(`OTS:${c}`);
      return 'OK';
    },
    // lens({ axis: 'h'|'v'|'focus'|'zoom', speed: 'slow'|'normal'|'fast', dir: '+'|'-' }) or lens({ op: 'home' })
    async lens(op = {}) {
      if (op.op === 'home') { await native('VXX:LNSI1=+00001'); return 'OK'; }
      const n = LENS_AXIS[op.axis], s = LENS_SPEED[op.speed || 'normal'];
      if (n == null || s == null || !['+', '-'].includes(op.dir)) throw new Error('lens needs axis h|v|focus|zoom, speed slow|normal|fast, dir + or -');
      await native(`VXX:LNSI${n}=+00${s}0${op.dir === '+' ? 0 : 1}`);
      return 'OK';
    },
    async getPicture() {
      const out = {};
      for (const [k, d] of Object.entries(PICTURE)) {
        try { out[k] = d.codec.dec(await native(d.query)); } catch (e) { out[k] = null; out._error = e.message; }
      }
      return out;
    },
    async picture(key, value) {
      const d = PICTURE[key];
      if (!d) throw new Error(`unknown picture setting ${key}`);
      if (d.type === 'range' && (Number(value) < d.min || Number(value) > d.max || Number.isNaN(Number(value)))) throw new Error(`${key} must be ${d.min}..${d.max}`);
      if (d.type === 'enum' && !(String(value) in d.options)) throw new Error(`${key}: unknown option ${value}`);
      await native(`${d.set}:${d.codec.enc(value)}`);
      return 'OK';
    },
  };
}
