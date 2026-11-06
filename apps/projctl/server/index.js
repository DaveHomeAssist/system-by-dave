// projctl relay: HTTP + WebSocket API, status polling, presets, OSC/TCP cue input.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { openStore, simRig } from './store.js';
import { makeDriver } from './drivers/index.js';
import { PATTERNS, pictureSchema } from './drivers/panasonic.js';
import { pjlinkSearch } from './drivers/pjlink.js';
import { emptyStatus, POWER } from './drivers/base.js';
import { projectorDisplayInfo, createHostDisplayReader } from './display-info.js';
import { hasLens, lensSummary, lensPositionMatch, lensMotorState, LENS_AXES } from './preset-lens.js';
import { startOsc, startTcpLines } from './osc.js';
import { LANES } from '../public/lanes.js';
import { confirmations } from './confirmations.js';
import { readStagePlot } from './stage-plot.js';
import { readVenue, readVenueAsset } from './venue-model.js';
import { throwlineAsset, withThrowlineImports } from './throwline-assets.js';
import { resolveInputPreference } from './input-preference.js';
import { createPowerSchedules, scheduledPowerGuard } from './power-schedules.js';
import { createPoller } from './polling.js';
import { createManualDiscovery } from './discovery.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const OSC_PORT = Number(process.env.OSC_PORT || 9000);
const TCP_PORT = Number(process.env.TCP_PORT || 9001);
const POLL_MS = Number(process.env.POLL_MS || 5000);
const SIM = process.env.SIM === '1';
const readHostDisplays = createHostDisplayReader({ sim: SIM });
const STARTED_AT = new Date().toISOString();
// ---- Login (optional). Set PJ_PASSCODE to require it: needed before exposing the relay beyond the LAN.
const PASSCODE = (process.env.PROJCTL_PASSWORD || process.env.PJ_PASSCODE || '').trim();
const SESSION_SECRET = randomBytes(32).toString('hex'); // sessions end when the relay restarts
const SESSION = createHash('sha256').update(`pj:${SESSION_SECRET}:${PASSCODE}`).digest('hex');
const loginFails = new Map(); // ip -> { n, until }
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((kv) => kv[0]).map(([k, ...v]) => [k, v.join('=')])); }
function authed(req) {
  if (!PASSCODE) return true;
  const c = cookies(req).pj || ''; const want = Buffer.from(SESSION), got = Buffer.from(c);
  return got.length === want.length && timingSafeEqual(got, want);
}
function clientIp(req) { return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?'; }
const DATA = process.env.RIG || path.join(__dirname, '..', 'data', SIM ? 'rig.sim.json' : 'rig.json');
const STAGE_PLOT = process.env.STAGE_PLOT || path.join(path.dirname(DATA), 'stage-plot.json');
const VENUE_MODEL = process.env.VENUE_MODEL || path.join(path.dirname(DATA), 'venue');

const store = openStore(DATA, { allowCreate: SIM || !process.env.RIG });
if (SIM) simRig(store.rig);
const rig = store.rig;
let powerSchedules, poller;
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { poller?.close(); powerSchedules?.close(); store.close(); process.exit(0); });

const drivers = new Map();   // slot -> driver
const status = new Map();    // slot -> status
const busy = new Map();
const connections = new Map();
for (const p of rig.projectors) {
  status.set(p.slot, emptyStatus());
  connections.set(p.slot, { state: p.ip ? 'checking' : 'unassigned', lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, error: null, consecutiveFailures: 0, nextRetryAt: null, retryDelayMs: 0 });
}
function connectionError(p, error) {
  let message = String(error?.message || error);
  for (const secret of [p.password, PASSCODE]) if (secret) message = message.split(secret).join('[redacted]');
  return message.slice(0, 240);
}

function driverFor(p) {
  const key = JSON.stringify([p.slot, p.driver, p.ip, p.user, p.password, p.model]);
  let d = drivers.get(p.slot);
  if (!d || d._key !== key) { d = makeDriver(p); d._key = key; drivers.set(p.slot, d); }
  return d;
}

function displayInfoFor(p, current = status.get(p.slot)) { return projectorDisplayInfo(p, { ...current, connection: connections.get(p.slot) }, driverFor(p).inputs ?? p.inputs); }

function inputPreferenceFor(p) { return resolveInputPreference(driverFor(p).inputs ?? p.inputs, rig.preferredInput || 'HDMI'); }

// ---- WebSocket broadcast ----
const clients = new Set();
function broadcast(msg) { const s = JSON.stringify(msg); for (const c of clients) if (c.readyState === 1) c.send(s); }
// Relay liveness is independent of potentially slow device polling.
setInterval(() => broadcast({ type: 'heartbeat', at: new Date().toISOString() }), 5000).unref();
function snapshot() {
  return {
    type: 'snapshot', show: rig.show, lock: rig.lock, simulation: SIM, preferredInput: rig.preferredInput || 'HDMI',
    relay: { startedAt: STARTED_AT, pollIntervalMs: POLL_MS },
    projectors: rig.projectors.map((p) => {
      const d = driverFor(p);
      return { ...p, password: undefined, status: { ...status.get(p.slot), connection: connections.get(p.slot) }, busy: busy.get(p.slot) || null,
        inputs: d.inputs ?? p.inputs, displayInfo: displayInfoFor(p), inputPreference: inputPreferenceFor(p), patterns: p.ip ? (d.patterns || null) : null,
        pictureSchema: d.pictureSchema ?? (d.getPicture ? pictureSchema() : {}),
        capabilities: { lens: !!d.lensJog?.axes.length, lensJog: d.lensJog, picture: !!d.getPicture, lensRecall: !!d.recallLens } };
    }),
    presets: rig.presets, events: rig.events.slice(-200), powerSchedules: powerSchedules?.view(),
  };
}

// ---- Polling ----
function poll(p) {
  return poller.poll(p.slot);
}
poller = createPoller({
  target: (slot) => store.projector(slot),
  intervalMs: POLL_MS,
  timeoutMs: 10000,
  maxRetryMs: Math.max(POLL_MS, 15000),
  read: (p, options) => p.ip ? driverFor(p).getStatus(options) : null,
  started(p, { identityChanged, at }) {
    if (identityChanged) {
      status.set(p.slot, emptyStatus());
      connections.set(p.slot, { state: 'checking', lastSuccessAt: null, lastFailureAt: null, error: null, consecutiveFailures: 0, retryDelayMs: 0 });
    }
    const c = connections.get(p.slot);
    Object.assign(c, { lastAttemptAt: new Date(at).toISOString(), nextRetryAt: null });
    if (!p.ip) Object.assign(c, { state: 'unassigned', error: null, consecutiveFailures: 0, retryDelayMs: 0 });
    broadcastStatus(p);
  },
  succeeded(p, s, { at }) {
    if (!p.ip) return;
    Object.assign(connections.get(p.slot), { state: 'online', lastSuccessAt: new Date(at).toISOString(), error: null, consecutiveFailures: 0, nextRetryAt: null, retryDelayMs: 0 });
    const prev = status.get(p.slot);
    const next = { ...prev, ...s, online: true, updatedAt: new Date().toISOString() };
    status.set(p.slot, next);
    if (!prev.online) store.event({ source: 'poll', slot: p.slot, command: 'online', result: 'OK' });
    broadcastStatus(p);
  },
  failed(p, e, { at, consecutiveFailures, nextRetryAt, retryDelayMs }) {
    const connection = connections.get(p.slot);
    Object.assign(connection, { state: 'reconnecting', error: connectionError(p, e), lastFailureAt: new Date(at).toISOString(), consecutiveFailures, nextRetryAt: new Date(nextRetryAt).toISOString(), retryDelayMs });
    setOffline(p.slot, connection.error);
  },
});
function broadcastStatus(p) {
  const next = status.get(p.slot), d = driverFor(p);
  broadcast({ type: 'status', slot: p.slot, status: { ...next, connection: connections.get(p.slot) }, displayInfo: displayInfoFor(p, next), inputPreference: inputPreferenceFor(p), inputs: d.inputs ?? p.inputs, pictureSchema: d.pictureSchema ?? (d.getPicture ? pictureSchema() : {}) });
}
function setOffline(slot, why) {
  const prev = status.get(slot);
  // Keep the last reply available, explicitly marked unavailable until a new reply.
  const next = { ...prev, online: false, updatedAt: new Date().toISOString() };
  status.set(slot, next);
  if (prev.online) store.event({ source: 'poll', slot, command: 'offline', result: why });
  broadcast({ type: 'status', slot, status: { ...next, connection: connections.get(slot) }, displayInfo: displayInfoFor(store.projector(slot), next), inputPreference: inputPreferenceFor(store.projector(slot)) });
}
rig.projectors.forEach(poll);

// ---- Discovery (PJLink class 2 search by MAC) ----
const discover = createManualDiscovery({
  projectors: () => rig.projectors,
  scan: () => SIM ? [] : pjlinkSearch(),
  apply(updates) {
    for (const update of updates) {
      const p = store.projector(update.slot);
      store.event({ source: 'ui', slot: p.slot, command: 'discover', result: 'OK', detail: `${p.ip || 'none'} -> ${update.ip}` });
      p.ip = update.ip;
      poll(p);
    }
    if (updates.length) { store.save(); broadcast(snapshot()); }
  },
});
// Saved addresses remain authoritative. Rediscovery is an explicit operator action.

// ---- Commands ----
const pendingConfirm = confirmations();
const targetIdentity = (p) => JSON.stringify([p.slot, p.driver, p.ip, p.user, p.password, p.model]);

function fmtArg(a) { return a && typeof a === 'object' ? Object.values(a).join(' ') : String(a); }
async function command(slot, cmd, arg, source = 'ui', executionGuard) {
  executionGuard?.();
  const p = store.projector(slot);
  if (!p) throw httpErr(404, `no projector ${slot}`);
  const st = status.get(slot);
  if (!st.online) throw httpErr(409, `${slot} is offline`);
  const resettingInput = cmd === 'resetInput';
  if (resettingInput) {
    const preference = inputPreferenceFor(p);
    if (!preference.available) throw httpErr(409, preference.reason);
    cmd = 'input'; arg = preference.value;
  }
  if (rig.lock && (cmd === 'power' && !arg || cmd === 'input' || cmd === 'pattern' || cmd === 'lens' && arg?.op !== 'stop' || cmd === 'picture')) throw httpErr(423, 'show lock is on');
  if (cmd === 'power' && arg && st.power === POWER.COOLING) throw httpErr(409, `${slot} is cooling, wait before power on`);
  const stop = cmd === 'lens' && arg?.op === 'stop';
  if (busy.has(slot) && !stop && cmd !== 'shutter') throw httpErr(409, `${slot}: lens is moving. Wait or use Stop lens.`);
  const d = driverFor(p);
  const moving = cmd === 'lens' && !stop;
  if (moving) { busy.set(slot, 'lens'); broadcast({ type: 'busy', slot, busy: 'lens' }); }
  let result, detail;
  try {
    if (cmd === 'power') result = await d.power(!!arg, { guard: executionGuard });
    else if (cmd === 'shutter') result = await d.shutter(!!arg);
    else if (cmd === 'input') result = await d.input(String(arg));
    else if (cmd === 'pattern') { if (!d.pattern) throw httpErr(400, `${slot}: test pattern not supported by ${d.kind} driver`); let code = String(arg); if (d.kind === 'pulse') code = code === '08' ? 'internal:colorbars' : code === '00' ? 'off' : code; result = await d.pattern(code); }
    else if (cmd === 'lens') { if (arg?.op === 'recall') { if (!d.recallLens) throw httpErr(400, `${slot}: absolute lens recall not stored by this driver`); result = await d.recallLens(arg.targets || {}); } else { if (!d.lens) throw httpErr(400, `${slot}: lens not supported by ${d.kind} driver`); result = await d.lens(arg); } }
    else if (cmd === 'picture') { if (!d.picture) throw httpErr(400, `${slot}: picture settings not supported by ${d.kind} driver`); result = await d.picture(arg.key, arg.value); }
    else throw httpErr(400, `unknown command ${cmd}`);
  } catch (e) { result = 'ERR'; detail = e.message; store.event({ source, slot, command: `${cmd} ${resettingInput ? inputPreferenceFor(p).label : fmtArg(arg)}`, result, detail }); broadcast({ type: 'event', event: rig.events.at(-1) }); throw Object.assign(httpErr(502, e.message), { scheduleSkip: !!e.scheduleSkip }); }
  finally { if (moving) { busy.delete(slot); broadcast({ type: 'busy', slot, busy: null }); } }
  store.event({ source, slot, command: `${cmd} ${resettingInput ? inputPreferenceFor(p).label : fmtArg(arg)}`, result, detail });
  broadcast({ type: 'event', event: rig.events.at(-1) });
  if (cmd === 'lens' || cmd === 'input' || cmd === 'picture') await poller.refresh(slot);
  else setTimeout(() => poll(p), 400);
  return { result, status: { ...status.get(slot), connection: connections.get(slot) } };
}

// Scheduling has separate private persistence and never replays missed occurrences.
try {
  powerSchedules = createPowerSchedules({
    file: path.join(path.dirname(DATA), 'power-schedules.json'),
    targets: () => rig.projectors.map(p => ({ slot: p.slot, assigned: !!p.ip && Object.hasOwn(LANES, p.lane || ''), identity: createHash('sha256').update(targetIdentity(p) + '|' + (p.lane || '')).digest('hex') })),
    guard: (slot, action) => {
      const p = store.projector(slot), st = status.get(slot), connection = connections.get(slot);
      return scheduledPowerGuard({ assigned: !!p?.ip && Object.hasOwn(LANES, p?.lane || ''), online: !!st?.online && connection?.state === 'online', lastReplyAt: connection?.lastSuccessAt, busy: busy.has(slot), lock: rig.lock, power: st?.power }, action, Date.now(), Math.max(15000, POLL_MS * 3));
    },
    dispatch: async (slot, action, guard) => {
      try { return await command(slot, 'power', action === 'on', 'schedule', guard); }
      catch (error) { throw Object.assign(new Error(connectionError(store.projector(slot) || {}, error)), { scheduleSkip: !!error.scheduleSkip }); }
    },
    changed: schedules => broadcast({ type: 'powerSchedules', schedules }),
  });
  powerSchedules.start();
} catch {
  const unavailable = { engine: { state: 'unavailable', reason: 'Saved power schedules are unreadable. Restore a valid power-schedules.json; controller access is still available.' }, timeZone: 'America/New_York', schedules: [], audit: [] };
  const blocked = () => { throw httpErr(503, unavailable.engine.reason); };
  powerSchedules = { view: () => unavailable, save: blocked, enable: blocked, remove: blocked, close() {} };
  console.error('[schedules] Saved power schedules unavailable; scheduling disabled, controller remains available.');
}

async function uiCommand(slot, cmd, arg, confirm) {
  if ((cmd === 'power' || cmd === 'shutter') && ![0, 1, false, true].includes(arg)) throw httpErr(400, `${cmd} needs 0 or 1`);
  const slots = slot === 'all' ? rig.projectors.map((p) => p.slot) : [slot];
  const out = {};
  let targets = slots.map((s) => ({ slot: s }));
  if (cmd === 'power' && !arg) {
    if (rig.lock) throw httpErr(423, 'show lock is on');
    const key = `${slot}:power:off`;
    const confirmed = pendingConfirm.take(key, confirm);
    if (!confirmed) {
      targets = [];
      for (const s of slots) {
        const p = store.projector(s);
        if (!p || !status.get(s)?.online) { out[s] = { error: p ? `${s} is offline` : `no projector ${s}` }; continue; }
        targets.push({ slot: s, identity: targetIdentity(p) });
      }
      if (targets.length) out[slot] = {
        confirm: pendingConfirm.issue(key, targets),
        targets: targets.map((t) => t.slot),
        message: `Tap again within 3 s to power off ${targets.map((t) => t.slot).join(', ')}`,
      };
      return out;
    }
    targets = confirmed;
    for (const s of slots) if (!targets.some((t) => t.slot === s)) out[s] = { error: 'not in confirmed target list; skipped' };
  }
  // Consume the batch confirmation before any network wait. A slow target must not
  // expire confirmations for later devices, and a failed target must not stop them.
  for (const target of targets) {
    try {
      const p = store.projector(target.slot);
      if (target.identity && (!p || targetIdentity(p) !== target.identity)) throw httpErr(409, 'configuration changed; confirm again');
      out[target.slot] = await command(target.slot, cmd, arg);
    } catch (e) { out[target.slot] = { error: e.message }; }
  }
  return out;
}

async function recallPreset(name, source = 'ui', confirmedLens = false) {
  const pr = rig.presets.find((x) => x.name === name);
  if (!pr) throw httpErr(404, `no preset ${name}`);
  if (!hasLens(pr)) return recallOldPreset(pr, source);
  const key = `preset:${name}:lens`;
  const summary = lensSummary(pr, (slot) => { const p = store.projector(slot); return p ? driverFor(p).lensControls || {} : {}; });
  if (!confirmedLens) {
    const targets = Object.entries(summary).filter(([, v]) => v.supported.length).map(([slot]) => slot);
    if (rig.lock && targets.some((slot) => status.get(slot)?.online)) throw httpErr(423, 'show lock is on');
    return { preset: name, confirm: targets.length ? pendingConfirm.issue(key, targets.map((slot) => ({ slot, identity: targetIdentity(store.projector(slot)) }))) : null,
      message: targets.length ? `Recall lens positions for ${targets.join(', ')}? Re-hang still needs alignment and focus checked.` : 'No absolute lens recall is stored for this rig.',
      projectors: summary };
  }
  const targetsForRecall = (items) => Object.entries(items).filter(([, v]) => v.supported.length).map(([slot]) => slot);
  const confirmed = confirmedLens === true ? targetsForRecall(summary).map((slot) => ({ slot, identity: targetIdentity(store.projector(slot)) })) : pendingConfirm.take(key, confirmedLens);
  if (!confirmed) return { preset: name, confirm: null, message: 'Lens confirmation expired. Recall and confirm again.', projectors: summary };
  const out = {};
  for (const [slot, info] of Object.entries(summary)) {
    if (!confirmed.some((t) => t.slot === slot)) { out[slot] = { ...info, result: 'not confirmed', lens: 'unknown' }; continue; }
    if (targetIdentity(store.projector(slot)) !== confirmed.find((t) => t.slot === slot).identity) { out[slot] = { ...info, result: 'configuration changed; confirm again', lens: 'unknown' }; continue; }
    try {
      const r = await command(slot, 'lens', { op: 'recall', targets: Object.fromEntries(info.supported.map((k) => [k, info.saved[k]])) }, `${source} preset ${name}`);
      // Failed polls preserve last-known status for the UI. Those cached values
      // must not verify the movement that just finished.
      const freshLens = r.status?.online && r.status?.connection?.state === 'online' ? r.status.lens : null;
      out[slot] = { ...info, position: lensPositionMatch(freshLens, info.saved, info.supported), motors: lensMotorState(freshLens, info.supported), result: freshLens ? 'fresh feedback received; verify position per axis' : 'fresh lens feedback unavailable; cached values are not verification', lens: freshLens ?? null, status: r.status };
    } catch (e) { out[slot] = { ...info, result: e.message, lens: 'unknown' }; }
  }
  return { preset: name, projectors: out, message: 'Position and motor feedback are reported separately. Check alignment and focus after any re-hang.' };
}
async function recallOldPreset(pr, source) {
  const out = {};
  for (const [slot, want] of Object.entries(pr.perSlot)) {
    const st = status.get(slot); if (!st?.online) { out[slot] = 'offline'; continue; }
    try {
      if (want.power !== undefined) await command(slot, 'power', want.power, `${source} preset ${pr.name}`);
      if (want.input) await command(slot, 'input', want.input, `${source} preset ${pr.name}`);
      if (want.shutter !== undefined) await command(slot, 'shutter', want.shutter === 'closed', `${source} preset ${pr.name}`);
      out[slot] = 'OK';
    } catch (e) { out[slot] = e.message; }
  }
  return out;
}
function savePreset(name) {
  const perSlot = {};
  for (const p of rig.projectors) {
    const s = status.get(p.slot); if (!s.online) continue;
    perSlot[p.slot] = { power: s.power !== POWER.OFF, shutter: s.shutter, input: s.input };
    if (driverFor(p).recallLens && s.lens) {
      perSlot[p.slot].lens = Object.fromEntries(LENS_AXES.filter((k) => Number.isFinite(s.lens[k])).map((k) => [k, s.lens[k]]));
      if (!Object.keys(perSlot[p.slot].lens).length) delete perSlot[p.slot].lens;
    }
  }
  const existing = rig.presets.find((x) => x.name === name);
  if (existing) { existing.perSlot = perSlot; existing.createdAt = new Date().toISOString(); }
  else rig.presets.push({ name, createdAt: new Date().toISOString(), perSlot });
  store.save(); store.event({ source: 'ui', slot: '*', command: `preset save ${name}`, result: 'OK' });
  broadcast(snapshot());
}

// ---- OSC / TCP cue input: /proj/<slot>/<power|shutter|input> <arg>, /proj/preset/<name>, /proj/all/<power|shutter> <arg>
async function onCue(addr, args, source) {
  const parts = addr.split('/').filter(Boolean);
  if (parts[0] !== 'proj') return;
  try {
    if (parts[1] === 'preset' && parts[2] === 'lens' && args.length === 1 && args[0] === 1) {
      // An explicit numeric 1 is the local cue equivalent of the UI's deliberate confirmation.
      return await recallPreset(parts.slice(3).join('/'), source, true);
    }
    if (parts[1] === 'preset') return await recallPreset(parts.slice(2).join('/'), source);
    if (!parts[1] || !['power', 'shutter', 'input'].includes(parts[2]) || args.length !== 1) throw new Error('cue needs slot, power/shutter/input and one argument');
    const slots = parts[1] === 'all' ? rig.projectors.map((p) => p.slot) : [parts[1].toUpperCase()];
    const cmd = parts[2]; const arg = args[0];
    if (cmd !== 'input' && ![0, 1, '0', '1'].includes(arg)) throw new Error(`${cmd} needs 0 or 1`);
    const out = {};
    for (const s of slots) {
      try { out[s] = await command(s, cmd, cmd === 'input' ? arg : Number(arg) === 1, source); }
      catch (e) {
        out[s] = { error: e.message };
        store.event({ source, slot: s, command: addr, result: 'ERR', detail: e.message });
        broadcast({ type: 'event', event: rig.events.at(-1) });
      }
    }
    return out;
  } catch (e) { store.event({ source, slot: parts[1], command: addr, result: 'ERR', detail: e.message }); broadcast({ type: 'event', event: rig.events.at(-1) }); return { error: e.message }; }
}
startOsc({ port: OSC_PORT, onMessage: onCue });
startTcpLines({ port: TCP_PORT, onMessage: onCue });

// ---- HTTP ----
function httpErr(status, message) { return Object.assign(new Error(message), { status }); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const PUB = path.join(__dirname, '..', 'public');
async function body(req) { let b = ''; for await (const c of req) b += c; return b ? JSON.parse(b) : {}; }
function confirmTokenFor(_name, token) { return typeof token === 'string' && token.length <= 256 ? token : ''; }
function json(res, code, obj) { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(obj)); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    res.setHeader('cache-control', 'no-store');
    if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: 'projctl', simulation: SIM, uptimeSeconds: Math.floor(process.uptime()) });
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST' }); return res.end(); }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (!PASSCODE) return json(res, 200, { ok: true, open: true });
      const ip = clientIp(req); const f = loginFails.get(ip) || { n: 0, until: 0 };
      if (f.until > Date.now()) { res.setHeader('retry-after', Math.ceil((f.until - Date.now()) / 1000)); throw httpErr(429, `too many tries, wait ${Math.ceil((f.until - Date.now()) / 1000)} s`); }
      const { code } = await body(req);
      const a = Buffer.from(String(code || '')), b = Buffer.from(PASSCODE);
      if (a.length !== b.length || !timingSafeEqual(a, b)) { f.n++; f.until = Date.now() + Math.min(60000, 1000 * 2 ** f.n); loginFails.set(ip, f); store.event({ source: 'ui', slot: '*', command: 'login', result: 'ERR', detail: `wrong passcode from ${ip}` }); throw httpErr(401, 'wrong passcode'); }
      loginFails.delete(ip); store.event({ source: 'ui', slot: '*', command: 'login', result: 'OK', detail: ip });
      const secure = (req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `pj=${SESSION}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 90}${secure}` }); return res.end(JSON.stringify({ ok: true }));
    }
    if (url.pathname === '/api/logout' && req.method === 'POST') { res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'pj=; Path=/; HttpOnly; Max-Age=0' }); return res.end('{"ok":true}'); }
    if (url.pathname === '/login.html' || url.pathname.startsWith('/avd/') || url.pathname === '/app.css') { /* public assets */ }
    else if (!authed(req)) {
      if (url.pathname.startsWith('/api/')) throw httpErr(401, 'login required');
      res.writeHead(302, { location: '/login.html' }); return res.end();
    }
    if (url.pathname === '/api/state') return json(res, 200, snapshot());
    if (url.pathname === '/api/power-schedules' && req.method === 'GET') return json(res, 200, powerSchedules.view());
    if (url.pathname === '/api/power-schedules/save' && req.method === 'POST') return json(res, 200, powerSchedules.save(await body(req)));
    if (url.pathname === '/api/power-schedules/enable' && req.method === 'POST') { const { id, enabled } = await body(req); return json(res, 200, powerSchedules.enable(id, enabled)); }
    if (url.pathname === '/api/power-schedules/delete' && req.method === 'POST') { const { id } = await body(req); return json(res, 200, powerSchedules.remove(id)); }

    if (url.pathname === '/api/display-info' && req.method === 'GET') {
      const p = store.projector(url.searchParams.get('slot'));
      if (!p) throw httpErr(404, 'no slot');
      return json(res, 200, displayInfoFor(p));
    }
    if (url.pathname === '/api/host-displays' && req.method === 'GET') return json(res, 200, await readHostDisplays());
    if (url.pathname === '/api/preferred-input' && req.method === 'POST') {
      const { input } = await body(req);
      if (input !== 'HDMI') throw httpErr(400, 'The supported default input is HDMI.');
      rig.preferredInput = input; store.save(); broadcast(snapshot());
      return json(res, 200, { preferredInput: input });
    }
    if (url.pathname === '/api/schema') return json(res, 200, { patterns: PATTERNS, picture: pictureSchema() });
    if (url.pathname === '/api/stage-plot' && req.method === 'GET') return json(res, 200, { plot: await readStagePlot(STAGE_PLOT) });
    if ((url.pathname === '/api/venue-model' || url.pathname.startsWith('/api/venue-model/')) && req.method === 'GET') {
      res.setHeader('cache-control', 'no-store');
      if (url.pathname === '/api/venue-model') return json(res, 200, { venue: await readVenue(VENUE_MODEL) });
      const asset = await readVenueAsset(VENUE_MODEL, url.pathname.slice('/api/venue-model/'.length));
      if (!asset) throw httpErr(404, 'No building asset');
      res.writeHead(200, { 'content-type': asset.type, 'content-length': asset.bytes.length });
      return res.end(asset.bytes);
    }
    if (url.pathname === '/api/picture' && req.method === 'GET') {
      const slot = url.searchParams.get('slot'); const p = store.projector(slot); if (!p) throw httpErr(404, 'no slot');
      const d = driverFor(p); if (!d.getPicture) throw httpErr(400, `${slot}: picture settings not supported by ${d.kind} driver`);
      if (!status.get(slot).online) throw httpErr(409, `${slot} is offline`);
      return json(res, 200, await d.getPicture());
    }
    if (url.pathname === '/api/command' && req.method === 'POST') {
      const { slot, cmd, arg, confirm } = await body(req);
      return json(res, 200, await uiCommand(slot, cmd, arg, confirm));
    }
    if (url.pathname === '/api/preset/save' && req.method === 'POST') { const { name } = await body(req); if (!name) throw httpErr(400, 'name required'); savePreset(name); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/preset/recall' && req.method === 'POST') { const { name, confirmLens } = await body(req); return json(res, 200, await recallPreset(name, 'ui', confirmTokenFor(name, confirmLens) || false)); }
    if (url.pathname === '/api/preset/delete' && req.method === 'POST') { const { name } = await body(req); rig.presets = rig.presets.filter((x) => x.name !== name); store.save(); broadcast(snapshot()); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/lock' && req.method === 'POST') { const { lock } = await body(req); rig.lock = !!lock; pendingConfirm.clear(); store.save(); store.event({ source: 'ui', slot: '*', command: `lock ${rig.lock ? 'on' : 'off'}`, result: 'OK' }); broadcast(snapshot()); return json(res, 200, { lock: rig.lock }); }
    if (url.pathname === '/api/projector' && req.method === 'POST') {
      const upd = await body(req); const p = store.projector(upd.slot); if (!p) throw httpErr(404, 'no slot');
      for (const k of ['reverseH', 'reverseV']) {
        if (k in upd && typeof upd[k] !== 'boolean') throw httpErr(400, `${k} must be true or false`);
      }
      if ('lane' in upd) {
        if (typeof upd.lane !== 'string' || (upd.lane !== '' && !Object.hasOwn(LANES, upd.lane))) throw httpErr(400, 'Unknown drawing lane');
        if (upd.lane && rig.projectors.some((other) => other.slot !== p.slot && other.lane === upd.lane)) throw httpErr(409, 'Drawing lane already assigned. Clear its current assignment first.');
      }
      for (const k of ['lane', 'label', 'make', 'model', 'owner', 'driver', 'mac', 'ip', 'notes', 'user', 'password', 'inputs', 'reverseH', 'reverseV']) if (k in upd) p[k] = upd[k];
      store.save(); store.event({ source: 'ui', slot: p.slot, command: 'edit', result: 'OK' }); poll(p); broadcast(snapshot()); return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/discover' && req.method === 'POST') return json(res, 200, await discover('ui'));
    if (url.pathname === '/api/sim' && req.method === 'POST' && SIM) { // test hook: toggle offline or set an out-of-position reported lens readback
      const { slot, offline, lens } = await body(req); const d = driverFor(store.projector(slot)); if (offline !== undefined) d._state.flaky = !!offline; if (lens) Object.assign(d._state.lens, lens); if (lens?._pollFocus != null) d._state.pollFocus = lens._pollFocus; return json(res, 200, { ok: true });
    }
    // static
    if (url.pathname.startsWith('/ProjectorThrow/')) {
      const asset = throwlineAsset(url.pathname);
      if (!asset) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': 'application/javascript' });
      return fs.createReadStream(asset).pipe(res);
    }
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    const fp = path.join(PUB, path.normalize(filePath));
    if (!fp.startsWith(PUB) || !fs.existsSync(fp)) { res.writeHead(404); return res.end('not found'); }
    if (fp === path.join(PUB, 'index.html')) {
      const html = withThrowlineImports(fs.readFileSync(fp, 'utf8'));
      res.writeHead(200, { 'content-type': MIME['.html'] });
      return res.end(html);
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  } catch (e) { json(res, e.status || 500, { error: e.message }); }
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, sock, head) => { if (new URL(req.url, 'http://x').pathname !== '/ws' || !authed(req)) { sock.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return sock.destroy(); } wss.handleUpgrade(req, sock, head, (ws) => wss.emit('connection', ws, req)); });
wss.on('connection', (ws) => { clients.add(ws); ws.send(JSON.stringify(snapshot())); ws.on('close', () => clients.delete(ws)); });

server.listen(PORT, () => console.log(`[projctl] ${SIM ? 'SIMULATOR ' : ''}http://0.0.0.0:${server.address().port}  rig=${DATA}  login=${PASSCODE ? 'passcode' : 'open (LAN only)'}`));
