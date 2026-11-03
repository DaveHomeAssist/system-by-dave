// Barco Pulse JSON-RPC 2.0 over TCP 9090, one JSON object per request; replies carry no newline.
// Confirmed by field use: system.poweron / system.poweroff,
// property.set optics.shutter.target = Open|Closed, property.get.
// Sources, picture ranges and motor state are discovered from the connected projector.
import net from 'node:net';
import { POWER, SHUTTER } from './base.js';

// Internal test patterns on the UDM 4K22 (image.testpattern.list, WST unit 2026-11-02). Code = pattern id.
export const PULSE_PATTERNS = {
  'off': 'Off', 'internal:colorbars': 'Colour bars', 'internal:white': 'White', 'internal:black': 'Black',
  'internal:red': 'Red', 'internal:green': 'Green', 'internal:blue': 'Blue', 'internal:cyan': 'Cyan', 'internal:magenta': 'Magenta', 'internal:yellow': 'Yellow',
  'internal:crosshatch': 'Crosshatch', 'internal:geometry': 'Geometry', 'internal:checkerboard': 'Checkerboard', 'internal:aspect': 'Aspect',
  'internal:focus-green': 'Focus (green)', 'internal:focus-bursts': 'Focus bursts', 'internal:horizontal-graybars': 'Grey bars (horizontal)',
  'internal:vertical-graybars': 'Grey bars (vertical)', 'internal:color-gradients': 'Colour gradients', 'internal:3d-stereo': '3D stereo',
};

export function pulseDriver({ host, port = 9090, timeoutMs = 5000, inputProperty = 'image.window.main.source', motionTimeoutMs = 90000, motionPollMs = 200, motionSettleMs = 750 }) {
  let id = 0;
  let sources = {}, pictureSchema = {}, refreshed = 0;
  const axes = { h: 'optics.lensshift.horizontal', v: 'optics.lensshift.vertical', focus: 'optics.focus', zoom: 'optics.zoom' };
  const pictureProperties = { brightness: 'brightness', contrast: 'contrast', color: 'saturation', gamma: 'gamma', sharpness: 'sharpness', intensity: 'intensity' };
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // One call at a time per projector: the poll's string of gets and a UI command otherwise race for the socket and the loser times out.
  let chain = Promise.resolve();
  function rpc(method, params, callTimeoutMs = timeoutMs) {
    const run = () => rpcOnce(method, params, callTimeoutMs);
    const p = chain.then(run, run); chain = p.catch(() => {}); return p;
  }
  function rpcOnce(method, params, callTimeoutMs) {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host, port });
      let buf = '', done = false;
      const fail = (e) => { if (!done) { done = true; clearTimeout(t); sock.destroy(); reject(e); } };
      const t = setTimeout(() => fail(new Error('timeout')), callTimeoutMs);
      const req = { jsonrpc: '2.0', id: ++id, method };
      if (params !== undefined) req.params = params;
      sock.on('error', fail);
      sock.on('end', () => fail(new Error('connection closed before Pulse reply')));
      sock.on('connect', () => sock.write(JSON.stringify(req) + '\n'));
      sock.on('data', (d) => {
        buf += d.toString();
        // The UDM answers with one JSON object and no newline (seen on the WST unit 2026-11-02): parse when it is complete.
        let res; try { res = JSON.parse(buf); } catch { return; }
        clearTimeout(t); done = true; sock.end();
        if (res.error) reject(Object.assign(new Error(res.error.message || 'rpc error'), { code: res.error.code }));
        else resolve(res.result);
      });
    });
  }
  const get = (property) => rpc('property.get', { property });
  const set = (property, value) => rpc('property.set', { property, value });
  async function discover() {
    if (Date.now() - refreshed < 60000) return;
    // Missing optional capabilities must not hide a reachable projector.
    try {
      const list = await rpc('image.source.list');
      if (Array.isArray(list)) sources = Object.fromEntries(list.filter((v) => typeof v === 'string').map((v) => [v, v]));
    } catch { sources = {}; }
    try {
      const image = await rpc('introspect', { object: 'image', recursive: false });
      pictureSchema = {};
      for (const [key, property] of Object.entries(pictureProperties)) {
        const meta = image.properties?.find((p) => p.name === property && p.access === 'READ_WRITE');
        const t = meta?.type;
        if (!t || !Number.isFinite(t.min) || !Number.isFinite(t.max)) continue;
        pictureSchema[key] = { label: { color: 'Colour saturation', intensity: 'Intensity' }[key] || key[0].toUpperCase() + key.slice(1), type: 'range', min: t.min, max: t.max, step: t.base === 'int' ? 1 : t.precision || 0.01 };
      }
    } catch { pictureSchema = {}; }
    refreshed = Date.now();
  }
  async function waitStopped(selected) {
    const started = Date.now(), deadline = started + motionTimeoutMs;
    // The acknowledgement can precede motor startup. Require two stopped reads.
    let stopped = 0;
    while (Date.now() < deadline) {
      await pause(motionPollMs);
      const states = [];
      for (const axis of selected) states.push(await get(axis + '.state'));
      if (Date.now() - started >= motionSettleMs && states.every((v) => v === 'Stopped')) { if (++stopped >= 2) return; }
      else stopped = 0;
    }
    for (const axis of selected) await rpc(axis + '.stop').catch(() => {});
    throw new Error('Lens movement timed out; stop requested. Check the projector before retrying.');
  }
  async function lensReadback() {
    const out = {};
    for (const [key, axis] of Object.entries(axes)) {
      out[key] = await get(axis + '.position');
      out[key + 'State'] = await get(axis + '.state');
    }
    return out;
  }
  const mapPower = (v) => ({ on: POWER.ON, ready: POWER.OFF, eco: POWER.OFF, boot: POWER.WARMING, conditioning: POWER.WARMING, deconditioning: POWER.COOLING }[String(v).toLowerCase()] ?? POWER.UNKNOWN);
  return {
    kind: 'pulse',
    patterns: PULSE_PATTERNS,
    get inputs() { return sources; },
    get pictureSchema() { return pictureSchema; },
    async pattern(code) {
      if (code === 'off' || code === '00') { await set('image.testpattern.show', false); return 'OK'; }
      if (!PULSE_PATTERNS[code]) throw new Error(`pattern ${code} not on this projector`);
      await set('image.testpattern.selected', code); await set('image.testpattern.show', true); return 'OK';
    },
    async getStatus() {
      // A successful core query proves liveness. Optional properties may be
      // unsupported, but total transport failure must reach the relay's offline policy.
      const s = { online: true, power: mapPower(await get('system.state')) };
      await discover();
      s.errors = null; // Pulse alarm telemetry is not implemented; unknown is not clear.
      try { const sh = String(await get('optics.shutter.target')).toLowerCase(); s.shutter = sh === 'closed' ? SHUTTER.CLOSED : sh === 'open' ? SHUTTER.OPEN : SHUTTER.UNKNOWN; } catch { s.shutter = SHUTTER.UNKNOWN; }
      try { s.input = String(await get(inputProperty)); } catch { s.input = null; }
      try { s.lightHours = Math.round(Number(await get('statistics.laserruntime.value')) / 3600); } catch {} // seconds on the UDM
      try { s.name = String(await get('system.name')); } catch {}
      try { s.pattern = (await get('image.testpattern.show')) ? String(await get('image.testpattern.selected')) : 'off'; } catch { s.pattern = null; }
      try { s.lens = await lensReadback(); } catch { s.lens = null; }
      try { s.signal = await get('image.window.main.activesignal'); } catch { s.signal = null; }
      return s;
    },
    power: (on) => rpc(on ? 'system.poweron' : 'system.poweroff').then(() => 'OK'),
    shutter: (closed) => set('optics.shutter.target', closed ? 'Closed' : 'Open').then(() => 'OK'),
    async input(idv) {
      await discover();
      if (!Object.hasOwn(sources, idv)) throw new Error('Select an available projector input.');
      // Source changes can keep Pulse busy while the input electronics relock.
      await rpc('property.set', { property: inputProperty, value: idv }, Math.max(timeoutMs, 15000));
      if (await rpc('property.get', { property: inputProperty }, Math.max(timeoutMs, 15000)) !== idv) throw new Error('Projector input did not match the requested source.');
      return 'OK';
    },
    async getPicture() {
      await discover();
      const out = {};
      for (const key of Object.keys(pictureSchema)) {
        try { out[key] = await get('image.' + pictureProperties[key]); } catch { out[key] = null; }
      }
      return out;
    },
    async picture(key, value) {
      await discover();
      const d = pictureSchema[key];
      if (!d || !Number.isFinite(value) || value < d.min || value > d.max || (d.step === 1 && !Number.isInteger(value))) throw new Error('Unsupported picture setting or value outside the projector range.');
      await set('image.' + pictureProperties[key], value);
      const actual = await get('image.' + pictureProperties[key]);
      if (!Number.isFinite(actual) || Math.abs(actual - value) > d.step / 2) throw new Error('Picture readback did not match the requested value.');
      return 'OK';
    },
    async lens(op = {}) {
      if (op.op === 'stop') {
        for (const axis of Object.values(axes)) await rpc(axis + '.stop');
        return 'OK';
      }
      if (mapPower(await get('system.state')) !== POWER.ON) throw new Error('Power on the projector before moving the lens.');
      const selected = op.op === 'home' ? [axes.h, axes.v] : [axes[op.axis]];
      if (selected.some((axis) => !axis)) throw new Error('Unknown lens axis.');
      for (const axis of selected) {
        if (await get(axis + '.state') !== 'Stopped') throw new Error('Lens is moving. Wait or use Stop lens.');
        if (!await get(axis + '.safetooperate')) throw new Error('Projector reports lens movement unavailable.');
      }
      if (op.op === 'home') await rpc('optics.shifttocenter');
      else {
        // Encoder targets give consistent bounded increments across the motor types.
        const increment = { slow: 128, normal: 512, fast: 2048 }[op.speed || 'slow'];
        if (!increment || !['+', '-'].includes(op.dir) || op.op) throw new Error('Lens needs a valid direction and step size.');
        const axis = selected[0], before = await get(axis + '.position');
        const min = await get(axis + '.minposition'), max = await get(axis + '.maxposition');
        if (![before, min, max].every(Number.isFinite)) throw new Error('Lens limits are unavailable.');
        const target = Math.max(min, Math.min(max, before + (op.dir === '+' ? increment : -increment)));
        if (target === before) throw new Error('Lens travel limit reached.');
        await set(axis + '.target', target);
      }
      await waitStopped(selected);
      return 'OK';
    },
  };
}
