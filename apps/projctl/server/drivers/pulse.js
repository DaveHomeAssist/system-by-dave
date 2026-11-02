// Barco Pulse JSON-RPC 2.0 over TCP 9090, one JSON object per request; replies carry no newline.
// Confirmed by field use: system.poweron / system.poweroff,
// property.set optics.shutter.target = Open|Closed, property.get.
// Input property name still to confirm in the projector's API console.
import net from 'node:net';
import { POWER, SHUTTER, NotSupported } from './base.js';

// Internal test patterns on the UDM 4K22 (image.testpattern.list, WST unit 2026-11-02). Code = pattern id.
export const PULSE_PATTERNS = {
  'off': 'Off', 'internal:colorbars': 'Colour bars', 'internal:white': 'White', 'internal:black': 'Black',
  'internal:red': 'Red', 'internal:green': 'Green', 'internal:blue': 'Blue', 'internal:cyan': 'Cyan', 'internal:magenta': 'Magenta', 'internal:yellow': 'Yellow',
  'internal:crosshatch': 'Crosshatch', 'internal:geometry': 'Geometry', 'internal:checkerboard': 'Checkerboard', 'internal:aspect': 'Aspect',
  'internal:focus-green': 'Focus (green)', 'internal:focus-bursts': 'Focus bursts', 'internal:horizontal-graybars': 'Grey bars (horizontal)',
  'internal:vertical-graybars': 'Grey bars (vertical)', 'internal:color-gradients': 'Colour gradients', 'internal:3d-stereo': '3D stereo',
};

export function pulseDriver({ host, port = 9090, timeoutMs = 3000, inputProperty = 'image.window.main.source' }) {
  let id = 0;
  function rpc(method, params) {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host, port });
      let buf = '', done = false;
      const fail = (e) => { if (!done) { done = true; sock.destroy(); reject(e); } };
      const t = setTimeout(() => fail(new Error('timeout')), timeoutMs);
      const req = { jsonrpc: '2.0', id: ++id, method };
      if (params !== undefined) req.params = params;
      sock.on('error', fail);
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
  const mapPower = (v) => ({ on: POWER.ON, ready: POWER.OFF, eco: POWER.OFF, boot: POWER.WARMING, conditioning: POWER.WARMING, deconditioning: POWER.COOLING }[String(v).toLowerCase()] ?? POWER.UNKNOWN);
  return {
    kind: 'pulse',
    patterns: PULSE_PATTERNS,
    async pattern(code) {
      if (code === 'off' || code === '00') { await set('image.testpattern.show', false); return 'OK'; }
      if (!PULSE_PATTERNS[code]) throw new Error(`pattern ${code} not on this projector`);
      await set('image.testpattern.selected', code); await set('image.testpattern.show', true); return 'OK';
    },
    async getStatus() {
      const s = { online: true };
      try { s.power = mapPower(await get('system.state')); } catch { s.power = POWER.UNKNOWN; }
      try { const sh = String(await get('optics.shutter.target')).toLowerCase(); s.shutter = sh === 'closed' ? SHUTTER.CLOSED : SHUTTER.OPEN; } catch { s.shutter = SHUTTER.UNKNOWN; }
      try { s.input = String(await get(inputProperty)); } catch { s.input = null; }
      // Laser runtime property name not found on firmware 2.10.4 (tried illumination.* and statistics.*); left null.
      try { s.name = String(await get('system.name')); } catch {}
      try { s.pattern = (await get('image.testpattern.show')) ? String(await get('image.testpattern.selected')) : 'off'; } catch { s.pattern = null; }
      try { s.lens = { zoom: await get('optics.zoom.position'), focus: await get('optics.focus.position'), h: await get('optics.lensshift.horizontal.position'), v: await get('optics.lensshift.vertical.position') }; } catch {}
      return s;
    },
    power: (on) => rpc(on ? 'system.poweron' : 'system.poweroff').then(() => 'OK'),
    shutter: (closed) => set('optics.shutter.target', closed ? 'Closed' : 'Open').then(() => 'OK'),
    input: (idv) => set(inputProperty, idv).then(() => 'OK'),
    // Lens jog over Pulse: optics.focus.stepforward / stepreverse { steps },
    // optics.zoom.*, optics.lensshift.horizontal.* and .vertical.*; home = optics.shifttocenter.
    // Method names from the Pulse JSON reference (barco-pulse-rs bindings). Step counts per speed
    // are a starting guess until tried on the UDM; the API console at http://<ip>/ lists them.
    async lens(op = {}) {
      if (op.op === 'home') { await rpc('optics.shifttocenter'); return 'OK'; }
      const axis = { h: 'optics.lensshift.horizontal', v: 'optics.lensshift.vertical', focus: 'optics.focus', zoom: 'optics.zoom' }[op.axis];
      const steps = { slow: 1, normal: 5, fast: 20 }[op.speed || 'normal'];
      if (!axis || !steps || !['+', '-'].includes(op.dir)) throw new Error('lens needs axis h|v|focus|zoom, speed slow|normal|fast, dir + or -');
      await rpc(`${axis}.${op.dir === '+' ? 'stepforward' : 'stepreverse'}`, { steps });
      return 'OK';
    },
  };
}
