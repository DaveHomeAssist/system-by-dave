import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const text = value => typeof value === 'string' ? value.replace(/[\r\n\t]/g, ' ').slice(0, 200) : value == null ? null : String(value).slice(0, 200);
function safeSignal(value, depth = 0) {
  if (value == null || typeof value === 'boolean') return value ?? null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return text(value);
  if (depth >= 2) return null;
  if (Array.isArray(value)) return value.slice(0, 24).map(v => safeSignal(v, depth + 1));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret|token|credential|serial|username/i.test(key)).slice(0, 24).map(([key, v]) => [text(key), safeSignal(v, depth + 1)]));
  return null;
}

// Existing cached poll feedback only. A reported input or timing is not EDID.
export function projectorDisplayInfo(projector, status = {}, inputs = {}) {
  const sample = status.connection?.lastSuccessAt || null;
  const availability = !projector.ip ? 'unassigned' : !status.online ? 'offline' : null;
  const input = status.input == null ? null : text(status.input);
  const signal = safeSignal(status.signal);
  return {
    slot: projector.slot, scope: 'projector',
    input: { state: availability || (input == null ? 'unknown' : 'reported'), value: input,
      label: input == null ? null : text(inputs?.[input]) || 'Reported input', observedAt: input == null ? null : sample },
    signal: { state: projector.driver !== 'pulse' ? 'unsupported' : availability || (signal == null ? 'unknown' : 'reported'),
      value: projector.driver === 'pulse' ? signal : null, observedAt: signal == null || projector.driver !== 'pulse' ? null : sample },
    edid: { state: 'unsupported', value: null, reason: 'EDID is not read by this driver.' },
  };
}

const yes = value => value === true || ['spdisplays_yes', 'spdisplays_on'].includes(value) ? true : value === false || ['spdisplays_no', 'spdisplays_off'].includes(value) ? false : null;
const osLabel = value => text(value)?.replace(/^spdisplays_/, '').replace(/_/g, ' ') || null;
export function normalizeHostDisplays(report) {
  return (report?.SPDisplaysDataType || []).flatMap(gpu => Array.isArray(gpu.spdisplays_ndrvs) ? gpu.spdisplays_ndrvs : []).slice(0, 32).map((display, index) => ({
    id: `display-${index + 1}`, name: text(display._name) || 'Unnamed display',
    connection: osLabel(display.spdisplays_connection_type), resolution: text(display.spdisplays_resolution),
    pixelResolution: osLabel(display.spdisplays_pixelresolution || display._spdisplays_pixels),
    rotation: /^\d+(?:\.\d+)?(?:°| degrees)?$/.test(String(display.spdisplays_rotation)) ? Number.parseFloat(display.spdisplays_rotation) : null,
    rotationSupport: display.spdisplays_rotation === 'spdisplays_supported' ? true : display.spdisplays_rotation === 'spdisplays_unsupported' ? false : null, online: yes(display.spdisplays_online), main: yes(display.spdisplays_main), mirror: yes(display.spdisplays_mirror),
    manufacturerId: text(display['_spdisplays_display-vendor-id']), productId: text(display['_spdisplays_display-product-id']),
    edid: { state: 'unavailable', value: null, reason: 'Raw EDID is not provided by this OS display report.' }, assignedSlot: null,
  }));
}

export function createHostDisplayReader({ platform = process.platform, sim = false, run = execute, now = Date.now, ttlMs = 30000 } = {}) {
  let cached, expires = 0, pending;
  return async function read() {
    if (sim) return { scope: 'relay-computer', state: 'simulation', collectedAt: null, reason: 'Host display collection is disabled in simulation.', displays: [] };
    if (platform !== 'darwin') return { scope: 'relay-computer', state: 'unsupported', collectedAt: null, reason: 'Host display collection is implemented for macOS only.', displays: [] };
    if (cached && now() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const { stdout } = await run('/usr/sbin/system_profiler', ['SPDisplaysDataType', '-json', '-detailLevel', 'basic'], { timeout: 8000, maxBuffer: 1024 * 1024, encoding: 'utf8' });
        cached = { scope: 'relay-computer', state: 'reported', collectedAt: new Date(now()).toISOString(), reason: null, displays: normalizeHostDisplays(JSON.parse(stdout)) };
      } catch {
        cached = { scope: 'relay-computer', state: 'unavailable', collectedAt: null, reason: 'OS display information could not be collected. Try again shortly.', displays: [] };
      }
      expires = now() + ttlMs;
      return cached;
    })().finally(() => { pending = undefined; });
    return pending;
  };
}
