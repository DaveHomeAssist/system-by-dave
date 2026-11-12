// Barco Pulse JSON-RPC 2.0 over TCP 9090, one JSON object per request; replies carry no newline.
// Confirmed by field use: system.poweron / system.poweroff,
// property.set optics.shutter.target = Open|Closed, property.get.
// Sources, picture ranges and motor state are discovered from the connected projector.
import net from 'node:net';
import { POWER, SHUTTER } from './base.js';
import { abortable, throwIfAborted, transportFailure } from './transport.js';

// Internal test patterns on the UDM 4K22 (image.testpattern.list, WST unit 2026-11-02). Code = pattern id.
export const PULSE_PATTERNS = {
  'off': 'Off', 'internal:colorbars': 'Colour bars', 'internal:white': 'White', 'internal:black': 'Black',
  'internal:red': 'Red', 'internal:green': 'Green', 'internal:blue': 'Blue', 'internal:cyan': 'Cyan', 'internal:magenta': 'Magenta', 'internal:yellow': 'Yellow',
  'internal:crosshatch': 'Crosshatch', 'internal:geometry': 'Geometry', 'internal:checkerboard': 'Checkerboard', 'internal:aspect': 'Aspect',
  'internal:focus-green': 'Focus (green)', 'internal:focus-bursts': 'Focus bursts', 'internal:horizontal-graybars': 'Grey bars (horizontal)',
  'internal:vertical-graybars': 'Grey bars (vertical)', 'internal:color-gradients': 'Colour gradients', 'internal:3d-stereo': '3D stereo',
};

export function pulseDriver({ host, port = 9090, timeoutMs = 5000, inputProperty = 'image.window.main.source', motionTimeoutMs = 90000, motionPollMs = 200, motionSettleMs = 750 }) {
  let id = 0, motionGeneration = 0;
  let sources = {}, pictureSchema = {}, refreshed = 0;
  const axes = { h: 'optics.lensshift.horizontal', v: 'optics.lensshift.vertical', focus: 'optics.focus', zoom: 'optics.zoom' };
  const pictureProperties = { brightness: 'brightness', contrast: 'contrast', color: 'saturation', gamma: 'gamma', sharpness: 'sharpness', intensity: 'intensity' };
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // One call at a time per projector: the poll's string of gets and a UI command otherwise race for the socket and the loser times out.
  let chain = Promise.resolve();
  function rpc(method, params, callTimeoutMs = timeoutMs, guard, signal) {
    const run = () => { throwIfAborted(signal); guard?.(); return rpcOnce(method, params, callTimeoutMs, guard, signal); };
    const p = chain.then(run, run); chain = p.catch(() => {}); return abortable(p, signal);
  }
  function rpcOnce(method, params, callTimeoutMs, guard, signal) {
    throwIfAborted(signal);
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host, port });
      let buf = '', done = false;
      const cleanup = () => { clearTimeout(t); signal?.removeEventListener('abort', abort); };
      const fail = (e) => { if (!done) { done = true; cleanup(); sock.destroy(); reject(e); } };
      const abort = () => fail(signal.reason || new Error('Projector poll cancelled'));
      const t = setTimeout(() => fail(new Error('timeout')), callTimeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      const req = { jsonrpc: '2.0', id: ++id, method };
      if (params !== undefined) req.params = params;
      sock.on('error', fail);
      sock.on('end', () => fail(new Error('connection closed before Pulse reply')));
      sock.on('close', () => fail(new Error('connection closed before Pulse reply')));
      sock.on('connect', () => { try { throwIfAborted(signal); guard?.(); sock.write(JSON.stringify(req) + '\n'); } catch (error) { fail(error); } });
      sock.on('data', (d) => {
        buf += d.toString();
        // The UDM answers with one JSON object and no newline (seen on the WST unit 2026-11-02): parse when it is complete.
        let res; try { res = JSON.parse(buf); } catch { return; }
        cleanup(); done = true; sock.end();
        if (res.error) reject(Object.assign(new Error(res.error.message || 'rpc error'), { code: res.error.code }));
        else resolve(res.result);
      });
    });
  }
  const get = (property) => rpc('property.get', { property });
  const set = (property, value) => rpc('property.set', { property, value });
  async function discover(signal) {
    if (Date.now() - refreshed < 60000) return;
    // Missing optional capabilities must not hide a reachable projector.
    try {
      const list = await rpc('image.source.list', undefined, timeoutMs, undefined, signal);
      if (Array.isArray(list)) sources = Object.fromEntries(list.filter((v) => typeof v === 'string').map((v) => [v, v]));
    } catch (e) { throwIfAborted(signal); if (signal && transportFailure(e)) throw e; sources = {}; }
    try {
      const image = await rpc('introspect', { object: 'image', recursive: false }, timeoutMs, undefined, signal);
      pictureSchema = {};
      for (const [key, property] of Object.entries(pictureProperties)) {
        const meta = image.properties?.find((p) => p.name === property && p.access === 'READ_WRITE');
        const t = meta?.type;
        if (!t || !Number.isFinite(t.min) || !Number.isFinite(t.max)) continue;
        pictureSchema[key] = { label: { color: 'Colour saturation', intensity: 'Intensity' }[key] || key[0].toUpperCase() + key.slice(1), type: 'range', min: t.min, max: t.max, step: t.base === 'int' ? 1 : t.precision || 0.01 };
      }
    } catch (e) { throwIfAborted(signal); if (signal && transportFailure(e)) throw e; pictureSchema = {}; }
    refreshed = Date.now();
  }
  async function waitStopped(selected, checkMove) {
    const started = Date.now(), deadline = started + motionTimeoutMs;
    let stopped = 0;
    try {
      while (Date.now() < deadline) {
        await pause(motionPollMs);
        checkMove();
        const states = [];
        for (const axis of selected) states.push(await get(axis + '.state'));
        // Acknowledgement can precede motor startup. Allow settling and require two stopped reads.
        if (Date.now() - started >= motionSettleMs && states.every((v) => v === 'Stopped')) { if (++stopped >= 2) return; }
        else stopped = 0;
      }
      throw new Error('Lens movement timed out');
    } catch (e) {
      for (const axis of selected) await rpc(axis + '.stop').catch(() => {});
      throw new Error(`${e.message}; stop requested. Check the projector before retrying.`);
    }
  }
  async function lensReadback(signal) {
    const out = {};
    for (const [key, axis] of Object.entries(axes)) {
      try { out[key] = await rpc('property.get', { property: axis + '.position' }, timeoutMs, undefined, signal); } catch (e) { throwIfAborted(signal); if (signal && transportFailure(e)) throw e; out[key] = null; }
      try { out[key + 'State'] = await rpc('property.get', { property: axis + '.state' }, timeoutMs, undefined, signal); } catch (e) { throwIfAborted(signal); if (signal && transportFailure(e)) throw e; out[key + 'State'] = null; }
    }
    return out;
  }
  async function moveTargets(targetList) {
      const generation = motionGeneration;
      const checkMove = () => { if (generation !== motionGeneration) throw new Error('Lens movement cancelled by Stop lens'); };
      if (mapPower(await get('system.state')) !== POWER.ON) throw new Error('Power on the projector before moving the lens.');
      if (!targetList.length) throw new Error('No supported lens positions.');
      const selected = targetList.map(([axis]) => axis);
      for (const [axis, target] of targetList) {
        if (await get(axis + '.state') !== 'Stopped') throw new Error('Lens is moving. Wait or use Stop lens.');
        if (!await get(axis + '.safetooperate')) throw new Error('Projector reports lens movement unavailable.');
        const min = await get(axis + '.minposition'), max = await get(axis + '.maxposition');
        if (![min, max].every(Number.isFinite) || target < min || target > max) throw new Error('Lens target is outside the reported travel limits.');
      }
      // Validate every axis before sending the first target. A later invalid axis
      // must not leave an earlier motor moving after a rejected compound recall.
      try {
        for (const [axis, target] of targetList) await rpc('property.set', { property: axis + '.target', value: target }, timeoutMs, checkMove);
      } catch (error) {
        for (const axis of selected) await rpc(axis + '.stop').catch(() => {});
        throw new Error(`${error.message}; stop requested. Check the projector before retrying.`);
      }
      await waitStopped(selected, checkMove);
      return 'OK';
  }
  const mapPower = (v) => ({ on: POWER.ON, ready: POWER.OFF, eco: POWER.OFF, boot: POWER.WARMING, conditioning: POWER.WARMING, deconditioning: POWER.COOLING }[String(v).toLowerCase()] ?? POWER.UNKNOWN);
  return {
    kind: 'pulse',
    lensJog: { axes: ['h', 'v', 'focus', 'zoom'], speeds: ['slow', 'normal', 'fast'], mode: 'bounded-step', stop: true, positionReadback: true },
    lensControls: { h: true, v: true, focus: true, zoom: true },
    patterns: PULSE_PATTERNS,
    get inputs() { return sources; },
    get pictureSchema() { return pictureSchema; },
    async pattern(code) {
      if (code === 'off' || code === '00') { await set('image.testpattern.show', false); return 'OK'; }
      if (!PULSE_PATTERNS[code]) throw new Error(`pattern ${code} not on this projector`);
      await set('image.testpattern.selected', code); await set('image.testpattern.show', true); return 'OK';
    },
    async getStatus({ signal } = {}) {
      // A successful core query proves liveness. Optional properties may be
      // unsupported, but total transport failure must reach the relay's offline policy.
      const read = (property) => rpc('property.get', { property }, timeoutMs, undefined, signal);
      const optional = async (fn, fallback) => { try { return await fn(); } catch (e) { throwIfAborted(signal); if (transportFailure(e)) throw e; return fallback; } };
      const s = { online: true, power: mapPower(await read('system.state')) };
      await discover(signal);
      s.errors = null; // Pulse alarm telemetry is not implemented; unknown is not clear.
      s.shutter = await optional(async () => { const sh = String(await read('optics.shutter.target')).toLowerCase(); return sh === 'closed' ? SHUTTER.CLOSED : sh === 'open' ? SHUTTER.OPEN : SHUTTER.UNKNOWN; }, SHUTTER.UNKNOWN);
      s.input = await optional(async () => String(await read(inputProperty)), null);
      s.lightHours = await optional(async () => Math.round(Number(await read('statistics.laserruntime.value')) / 3600));
      s.name = await optional(async () => String(await read('system.name')));
      s.pattern = await optional(async () => (await read('image.testpattern.show')) ? String(await read('image.testpattern.selected')) : 'off', null);
      s.lens = await optional(() => lensReadback(signal), null);
      s.signal = await optional(() => read('image.window.main.activesignal'), null);
      throwIfAborted(signal);
      return s;
    },
    // Read-only ambient temperature and alarm state for health reports.
    async healthReadings({ signal } = {}) {
      const read = (property) => rpc('property.get', { property }, timeoutMs, undefined, signal);
      const optional = async (property) => { try { return await read(property); } catch (e) { throwIfAborted(signal); if (transportFailure(e)) throw e; return null; } };
      const raw = await optional('environment.temperature.ambient_outside.value');
      const ambient = raw == null || raw === '' ? NaN : Number(raw);
      const alarm = await optional('environment.alarmstate');
      throwIfAborted(signal);
      return {
        sensors: [{ id: 'ambient', label: 'Ambient, outside', role: 'intake', c: Number.isFinite(ambient) ? Math.round(ambient * 10) / 10 : null }],
        alarm: alarm == null ? null : String(alarm),
      };
    },
    power: (on, { guard } = {}) => rpc(on ? 'system.poweron' : 'system.poweroff', undefined, timeoutMs, guard).then(() => 'OK'),
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
    async recallLens(targets) {
      const entries = Object.entries(targets);
      if (entries.some(([axis, target]) => !Object.hasOwn(axes, axis) || !Number.isFinite(target))) throw new Error('Invalid lens recall targets.');
      return moveTargets(entries.map(([axis, target]) => [axes[axis], target]));
    },
    async lens(op = {}) {
      if (op.op === 'stop') {
        motionGeneration++;
        for (const axis of Object.values(axes)) await rpc(axis + '.stop');
        return 'OK';
      }
      const generation = motionGeneration;
      const checkMove = () => { if (generation !== motionGeneration) throw new Error('Lens movement cancelled by Stop lens'); };
      if (mapPower(await get('system.state')) !== POWER.ON) throw new Error('Power on the projector before moving the lens.');
      const selected = op.op === 'home' ? [axes.h, axes.v] : [axes[op.axis]];
      if (selected.some((axis) => !axis)) throw new Error('Unknown lens axis.');
      for (const axis of selected) {
        if (await get(axis + '.state') !== 'Stopped') throw new Error('Lens is moving. Wait or use Stop lens.');
        if (!await get(axis + '.safetooperate')) throw new Error('Projector reports lens movement unavailable.');
      }
      if (op.op === 'home') await rpc('optics.shifttocenter', undefined, timeoutMs, checkMove);
      else {
        // Encoder targets give consistent bounded increments across the motor types.
        const increment = { slow: 128, normal: 512, fast: 2048 }[op.speed || 'slow'];
        if (!increment || !['+', '-'].includes(op.dir) || op.op) throw new Error('Lens needs a valid direction and step size.');
        const axis = selected[0], before = await get(axis + '.position');
        const min = await get(axis + '.minposition'), max = await get(axis + '.maxposition');
        if (![before, min, max].every(Number.isFinite)) throw new Error('Lens limits are unavailable.');
        const target = Math.max(min, Math.min(max, before + (op.dir === '+' ? increment : -increment)));
        if (target === before) throw new Error('Lens travel limit reached.');
        // Check inside the serialized queue, so a queued write cannot follow an accepted Stop.
        await rpc('property.set', { property: axis + '.target', value: target }, timeoutMs, checkMove);
      }
      await waitStopped(selected, checkMove);
      return 'OK';
    },
  };
}
