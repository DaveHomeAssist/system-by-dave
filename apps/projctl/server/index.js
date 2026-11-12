// projctl relay: HTTP + WebSocket API, status polling, presets, OSC/TCP cue input.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createHash, timingSafeEqual } from 'node:crypto';
import { openStore, simRig } from './store.js';
import { makeDriver } from './drivers/index.js';
import { PATTERNS, pictureSchema } from './drivers/panasonic.js';
import { pjlinkSearch } from './drivers/pjlink.js';
import { emptyStatus, POWER } from './drivers/base.js';
import { projectorDisplayInfo, createHostDisplayReader } from './display-info.js';
import { hasLens, lensSummary, lensPositionMatch, lensMotorState, LENS_AXES } from './preset-lens.js';
import { startOsc, startTcpLines, cuePowerOffMode } from './osc.js';
import { LANES } from '../public/lanes.js';
import { formatCommandArg } from '../public/operator-guard.js';
import { confirmations } from './confirmations.js';
import { readStagePlot } from './stage-plot.js';
import { readVenue, readVenueAsset } from './venue-model.js';
import { throwlineAsset, withThrowlineImports } from './throwline-assets.js';
import { resolveInputPreference } from './input-preference.js';
import { createPowerSchedules, scheduledPowerGuard } from './power-schedules.js';
import { createPoller } from './polling.js';
import { createHealthReports, readHealthConfig, createNotionPublisher, notionTokenReader, ratedAmbientDetail, isLit } from './health-reports.js';
import { createThermalMonitor, thermalThresholds, plausibleAirC, thermalCsv, RETENTION_MS } from './thermal.js';
import { createManualDiscovery } from './discovery.js';
import { readJsonBody, proxyPolicy, createLoginThrottle, applyServerLimits, LOGIN_BODY_BYTES, mutationAllowed, FRAME_ANCESTORS } from './http-security.js';
import { servePublic, pipeFile } from './static-files.js';
import { createSessions } from './sessions.js';
import { readBuildInfo } from './build-info.js';

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
if (!PASSCODE && process.env.PROJCTL_OPEN !== '1') {
  console.error('[projctl] No passcode configured. Set PJ_PASSCODE or PROJCTL_PASSWORD. Set PROJCTL_OPEN=1 only to run an explicit open relay.');
  process.exit(1);
}
const sessions = createSessions(); // a restart drops every login; logout drops one token, or all of them
const BUILD = readBuildInfo({ root: path.join(__dirname, '..') });
const CUE_POWER_OFF = cuePowerOffMode();
const loginThrottle = createLoginThrottle(); // bounded per-client backoff; active lockouts survive eviction
const proxy = proxyPolicy(); // PROJCTL_TRUSTED_PROXIES (default loopback); invalid values stop startup
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((kv) => kv[0]).map(([k, ...v]) => [k, v.join('=')])); }
function authed(req) {
  if (!PASSCODE) return true;
  return sessions.valid(cookies(req).pj || '');
}
function sessionCookie(token, req, clear = false) {
  const secure = proxy.isHttps(req) ? '; Secure' : '';
  return `pj=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 60 * 60 * 24 * 90}${secure}`;
}
function clientIp(req) { return proxy.clientAddress(req); }
function enforceLoginThrottle(ip, res) {
  const wait = loginThrottle.retryAfterMs(ip);
  if (!wait) return;
  const seconds = Math.ceil(wait / 1000);
  res.setHeader('retry-after', seconds);
  throw httpErr(429, `too many tries, wait ${seconds} s`);
}
const DATA = process.env.RIG || path.join(__dirname, '..', 'data', SIM ? 'rig.sim.json' : 'rig.json');
const STAGE_PLOT = process.env.STAGE_PLOT || path.join(path.dirname(DATA), 'stage-plot.json');
const VENUE_MODEL = process.env.VENUE_MODEL || path.join(path.dirname(DATA), 'venue');

const store = openStore(DATA, { allowCreate: SIM || !process.env.RIG });
const liveAddresses = !store.created && store.rig.projectors.some((p) => p.ip && p.ip !== 'sim');
if (SIM) simRig(store.rig);
if (SIM && process.env.RIG && liveAddresses) {
  const sidecar = path.join(path.dirname(DATA), 'rig.sim-runtime.json');
  store.setWriteFile(sidecar);
  console.warn(`[projctl] SIM=1 left ${DATA} unchanged. Simulator state is ${sidecar}.`);
}
const rig = store.rig;
let powerSchedules, poller, health, stopping = false;
// A lit rig gets a final health report before exit; health.stop() is capped at a few seconds.
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => {
  if (stopping) return; stopping = true;
  try { await health?.stop(); } catch { /* exit regardless */ }
  poller?.close(); powerSchedules?.close(); store.close(); process.exit(0);
});

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
    relay: { startedAt: STARTED_AT, pollIntervalMs: POLL_MS, build: BUILD, storeError: store.lastError(), healthConfigError: healthConfig.error || null,
      cuePowerOff: CUE_POWER_OFF, showLock: 'Show lock blocks power off, inputs, test patterns, picture, lens moves except Stop, address and driver edits, discovery, presets and power schedules. Shutter and power on stay available.' },
    projectors: rig.projectors.map((p) => {
      const d = driverFor(p);
      return { ...p, password: undefined, status: { ...status.get(p.slot), connection: connections.get(p.slot) }, busy: busy.get(p.slot) || null, thermal: thermalView(p),
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
const freshSlots = new Set();
const OFFLINE_AFTER = 2;
poller = createPoller({
  target: (slot) => store.projector(slot),
  intervalMs: POLL_MS,
  timeoutMs: 10000,
  maxRetryMs: Math.max(POLL_MS, 15000),
  defer: (slot) => busy.get(slot) === 'lens',
  read: (p, options) => {
    if (SIM && p.ip && p.ip !== 'sim') throw new Error('simulator mode will not contact a saved projector address');
    if (!p.ip) return null;
    const fresh = freshSlots.delete(p.slot);
    return driverFor(p).getStatus({ ...options, fresh });
  },
  started(p, { identityChanged, at }) {
    // Temperature history follows the physical target. Correcting a model or lane label keeps it; a new driver or address starts fresh.
    const target = JSON.stringify([p.driver, p.ip]);
    if (thermalTargets.has(p.slot) && thermalTargets.get(p.slot) !== target) { thermal.reset(p.slot); thermalReads.delete(p.slot); }
    thermalTargets.set(p.slot, target);
    if (identityChanged) {
      status.set(p.slot, emptyStatus());
      connections.set(p.slot, { state: 'checking', lastSuccessAt: null, lastFailureAt: null, error: null, consecutiveFailures: 0, retryDelayMs: 0 });
    }
    const c = connections.get(p.slot);
    Object.assign(c, { lastAttemptAt: new Date(at).toISOString(), nextRetryAt: null });
    if (!p.ip) Object.assign(c, { state: 'unassigned', error: null, consecutiveFailures: 0, retryDelayMs: 0 });
    // Healthy reads retain the existing fresh sample until their result arrives.
    // Broadcast start only when it changes operator-visible recovery/identity state.
    if (identityChanged || c.state !== 'online') broadcastStatus(p);
  },
  succeeded(p, s, { at }) {
    if (!p.ip) return;
    Object.assign(connections.get(p.slot), { state: 'online', fresh: true, lastSuccessAt: new Date(at).toISOString(), error: null, consecutiveFailures: 0, nextRetryAt: null, retryDelayMs: 0 });
    const prev = status.get(p.slot);
    const stale = Array.isArray(s?.stale) ? s.stale : [];
    const overlay = { ...s };
    delete overlay.stale;
    for (const [key, value] of Object.entries(overlay)) if (value === undefined) delete overlay[key];
    const next = { ...prev, ...overlay, online: true, stale, updatedAt: new Date().toISOString() };
    for (const key of stale) if (Object.hasOwn(prev, key)) next[key] = prev[key];
    status.set(p.slot, next);
    if (!prev.online) store.event({ source: 'poll', slot: p.slot, command: 'online', result: 'OK' });
    health?.observe(p.slot, next.power);
    sampleThermal(p, next);
    broadcastStatus(p);
  },
  failed(p, e, { at, consecutiveFailures, nextRetryAt, retryDelayMs }) {
    const connection = connections.get(p.slot);
    const keep = !!status.get(p.slot)?.online && consecutiveFailures < OFFLINE_AFTER;
    Object.assign(connection, { state: keep ? 'online' : 'reconnecting', fresh: false, error: connectionError(p, e), lastFailureAt: new Date(at).toISOString(), consecutiveFailures, nextRetryAt: new Date(nextRetryAt).toISOString(), retryDelayMs });
    if (keep) { broadcastStatus(p); return; }
    setOffline(p.slot, connection.error);
  },
});
function broadcastStatus(p) {
  const next = status.get(p.slot), d = driverFor(p);
  broadcast({ type: 'status', slot: p.slot, status: { ...next, connection: connections.get(p.slot) }, thermal: thermalView(p), displayInfo: displayInfoFor(p, next), inputPreference: inputPreferenceFor(p), inputs: d.inputs ?? p.inputs, pictureSchema: d.pictureSchema ?? (d.getPicture ? pictureSchema() : {}) });
}
function setOffline(slot, why) {
  const prev = status.get(slot);
  // Keep the last reply available, explicitly marked unavailable until a new reply.
  const next = { ...prev, online: false, updatedAt: new Date().toISOString() };
  status.set(slot, next);
  health?.observe(slot, null);
  if (prev.online) store.event({ source: 'poll', slot, command: 'offline', result: why });
  broadcast({ type: 'status', slot, status: { ...next, connection: connections.get(slot) }, thermal: thermalView(store.projector(slot)), displayInfo: displayInfoFor(store.projector(slot), next), inputPreference: inputPreferenceFor(store.projector(slot)) });
}
// ---- Health reports (read-only readings; see docs/health-reports.md) ----
const healthConfig = readHealthConfig(path.join(path.dirname(DATA), 'health-reports.json'));
health = createHealthReports({
  dir: path.join(path.dirname(DATA), 'health-reports'),
  config: healthConfig,
  projectors: () => rig.projectors,
  status: (slot) => status.get(slot),
  connection: (slot) => connections.get(slot),
  events: () => rig.events,
  readTelemetry, // shared with the Thermal watch below: one read at a time per projector
  describeError: (p, e) => connectionError(store.projector(p.slot) || p, e),
  publish: healthConfig.notion.databaseId ? createNotionPublisher({ databaseId: healthConfig.notion.databaseId, token: notionTokenReader({ keychain: !SIM }) }) : null,
  powerOnDelayMs: Number(process.env.PROJCTL_HEALTH_POWER_ON_DELAY_MS || 120000),
}).start();
console.log(`[health] reports ${healthConfig.enabled ? 'on' : 'off'}; Notion ${healthConfig.notion.databaseId ? 'database configured' : 'not configured'}${healthConfig.error ? `; ${healthConfig.error}` : ''}`);

// ---- Thermal watch (operator panel; README "Thermal watch") ----
// Air temperature between health reports: the same read-only driver query, at most once per
// THERMAL_SAMPLE_MS per projector and only while it is on, warming or cooling. It is never part
// of the 5-second status poll. Limits and the watch threshold are the health reports' own.
const THERMAL_SAMPLE_MS = Math.min(600000, Math.max(50, Number(process.env.PROJCTL_THERMAL_SAMPLE_MS) || 60000));
const THERMAL_READ_TIMEOUT_MS = 8000;
const thermalLevels = thermalThresholds(healthConfig.watchHeadroomC);
const thermal = createThermalMonitor({ thresholds: thermalLevels }); // in memory; a restart begins empty
const thermalTargets = new Map();  // slot -> driver and address behind the history
const thermalReads = new Map();    // slot -> { at, ok } for the latest finished temperature read
const thermalAttempts = new Map(); // slot -> when the latest read started
const telemetryQueue = new Map();  // slot -> tail of that projector's read chain
const limitInfo = (p) => ratedAmbientDetail(p, healthConfig.ratedAmbientC, { reliable: healthConfig.reliable !== false });
const limitFor = (p) => limitInfo(p).c;
const airSource = (p) => { const d = driverFor(p); return d.healthReadings ? (d.kind === 'pulse' ? 'ambient' : 'intake') : null; };
// `source` says what the driver can report (intake, ambient or nothing), so the page can tell
// "no reading yet" from "this driver does not report temperature".
function thermalView(p) {
  const read = thermalReads.get(p.slot), limit = limitInfo(p);
  return { ...thermal.view(p.slot, limit.c), limitSource: limit.source, limitWarning: limit.warning, configError: healthConfig.error || null, source: p.ip ? airSource(p) : null, sampleMs: THERMAL_SAMPLE_MS,
    lastReadAt: read ? new Date(read.at).toISOString() : null, lastReadOk: read ? read.ok : null };
}
function recordThermal(p, readings) {
  const sensor = readings?.sensors?.find((s) => s.role === 'intake'), c = sensor?.c, at = Date.now(), ok = plausibleAirC(c);
  thermalReads.set(p.slot, { at, ok });
  if (ok) {
    const limitC = limitFor(p), kind = sensor.id === 'ambient' ? 'ambient' : 'intake';
    const r = thermal.observe(p.slot, { at, c, kind, limitC });
    if (r?.changed) {
      const where = typeof p.lane === 'string' && Object.hasOwn(LANES, p.lane) ? `${p.lane} · ${LANES[p.lane].target}` : p.slot;
      store.event({ source: 'thermal', slot: p.slot, command: `air ${r.level}`, result: r.level === 'ok' ? 'OK' : 'WARN', detail: `${where}: ${kind} air ${c} °C, ${r.headroomC} °C below the ${limitC} °C rated limit` });
      broadcast({ type: 'event', event: rig.events.at(-1) });
    }
  }
  broadcastStatus(p);
}
// One temperature reader per projector for health reports and the Thermal watch. Reads for a
// slot run one after another, and every finished read reaches the watch, whoever asked for it.
function readTelemetry(p, options) {
  const current = store.projector(p.slot) || p, d = driverFor(current);
  if (!d.healthReadings) return null;
  thermalAttempts.set(current.slot, Date.now());
  const run = () => d.healthReadings(options);
  const read = (telemetryQueue.get(current.slot) || Promise.resolve()).then(run, run);
  telemetryQueue.set(current.slot, read.catch(() => {}));
  return read.then((readings) => { try { recordThermal(current, readings); } catch (e) { console.error('[thermal]', e.message); } return readings; },
    (error) => { thermalReads.set(current.slot, { at: Date.now(), ok: false }); throw error; });
}
// Called after each successful status poll; takes a sample only when one is due.
function sampleThermal(p, st) {
  // A partial status read already lost a connection. Do not open the temperature port on top of it.
  if (st?.stale?.length) return;
  if ((connections.get(p.slot)?.consecutiveFailures || 0) > 0) return;
  if (!p.ip || !(isLit(st.power) || st.power === POWER.COOLING) || busy.has(p.slot) || !airSource(p)) return;
  if (Date.now() - (thermalAttempts.get(p.slot) ?? -Infinity) < THERMAL_SAMPLE_MS) return;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(Object.assign(new Error('temperature read timed out'), { code: 'POLL_TIMEOUT' })), THERMAL_READ_TIMEOUT_MS);
  deadline.unref?.();
  Promise.resolve().then(() => readTelemetry(p, { signal: controller.signal })).catch(() => {}).finally(() => clearTimeout(deadline));
}
function thermalReport(minutes, points) {
  return {
    at: new Date().toISOString(), windowMinutes: minutes, retentionMinutes: RETENTION_MS / 60000, thresholds: thermalLevels, sampleMs: THERMAL_SAMPLE_MS,
    projectors: rig.projectors.map((p) => ({ slot: p.slot, lane: p.lane || null, ...thermalView(p), series: thermal.series(p.slot, { windowMs: minutes * 60000, maxPoints: points }) })),
  };
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

function fmtArg(a) { return formatCommandArg(a); }
async function command(slot, cmd, arg, source = 'ui', executionGuard) {
  executionGuard?.();
  const p = store.projector(slot);
  if (!p) throw httpErr(404, `no projector ${slot}`);
  if (SIM && p.ip && p.ip !== 'sim') throw httpErr(409, 'simulator mode will not contact a saved projector address');
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
  // Readings start alongside the off command; the command itself is never held.
  if (cmd === 'power' && !arg) health?.powerOff(slot, source);
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
  if (cmd === 'lens' || cmd === 'input' || cmd === 'picture' || cmd === 'pattern') { freshSlots.add(slot); await poller.refresh(slot); }
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
  if (cmd === 'lens' && arg?.op === 'home') {
    if (rig.lock) throw httpErr(423, 'show lock is on');
    const key = `${slot}:lens:home`;
    const confirmed = pendingConfirm.take(key, confirm);
    if (!confirmed) {
      const p = store.projector(slot);
      if (!p) throw httpErr(404, `no projector ${slot}`);
      if (!status.get(slot)?.online) throw httpErr(409, `${slot} is offline`);
      return { [slot]: { confirm: pendingConfirm.issue(key, [{ slot, identity: targetIdentity(p) }]), message: `Tap again within 3 s to send ${slot} lens shift to home` } };
    }
    const p = store.projector(slot);
    if (!p || confirmed[0]?.identity !== targetIdentity(p)) throw httpErr(409, 'configuration changed; confirm again');
  }
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
      const freshLens = r.status?.online && r.status?.connection?.state === 'online' && r.status?.connection?.fresh !== false ? r.status.lens : null;
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
    if (cmd === 'power' && Number(arg) !== 1) {
      if (CUE_POWER_OFF === 'off') throw new Error('Cue power off is disabled');
      if (CUE_POWER_OFF === 'confirm') {
        const armed = cueOffArmed.get(source) || 0;
        if (armed < Date.now()) { cueOffArmed.set(source, Date.now() + 3000); throw new Error('Cue power off needs the same cue again within 3 s'); }
        cueOffArmed.delete(source);
      }
    }
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
const cueOffArmed = new Map();
if (CUE_POWER_OFF === 'allow') console.warn('[cue] Power off cues are a single packet until PROJCTL_CUE_POWER_OFF=confirm or off. Show lock still blocks them. Do not publish UDP 9000, TCP 9001, or projector ports on Funnel or a tunnel.');
startOsc({ port: OSC_PORT, onMessage: onCue });
startTcpLines({ port: TCP_PORT, onMessage: onCue });

// ---- HTTP ----
function httpErr(status, message) { return Object.assign(new Error(message), { status }); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const PUB = path.join(__dirname, '..', 'public');
function body(req) { return readJsonBody(req); } // 64 KiB JSON object, 10 s to arrive
function confirmTokenFor(_name, token) { return typeof token === 'string' && token.length <= 256 ? token : ''; }
function json(res, code, obj) { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); }
function requireUnlocked() { if (rig.lock) throw httpErr(423, 'show lock is on'); }
function guardMutation(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
  if (!mutationAllowed(req, proxy)) throw httpErr(403, 'this request is not allowed from that page');
}
function socketAllowed(req) {
  const site = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).host.toLowerCase();
    const names = new Set([String(req.headers.host || '').toLowerCase()]);
    if (proxy.trusted(req.socket?.remoteAddress)) {
      const forwarded = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim().toLowerCase();
      if (forwarded) names.add(forwarded);
    }
    return names.has(host);
  } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    res.setHeader('content-security-policy', FRAME_ANCESTORS);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: 'projctl', simulation: SIM, login: PASSCODE ? 'passcode' : 'open', uptimeSeconds: Math.floor(process.uptime()), ...BUILD });
    if (req.method === 'OPTIONS') { res.writeHead(mutationAllowed(req, proxy, { requireJson: false }) ? 204 : 403); return res.end(); }
    guardMutation(req);
    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (!PASSCODE) return json(res, 200, { ok: true, open: true });
      const ip = clientIp(req);
      enforceLoginThrottle(ip, res);
      const { code } = await readJsonBody(req, { maxBytes: LOGIN_BODY_BYTES });
      // A parallel attempt may have failed while this body was arriving; check again before comparing.
      enforceLoginThrottle(ip, res);
      const a = Buffer.from(String(code || '')), b = Buffer.from(PASSCODE);
      if (a.length !== b.length || !timingSafeEqual(a, b)) { loginThrottle.fail(ip); store.event({ source: 'ui', slot: '*', command: 'login', result: 'ERR', detail: `wrong passcode from ${ip}` }); throw httpErr(401, 'wrong passcode'); }
      loginThrottle.succeed(ip); store.event({ source: 'ui', slot: '*', command: 'login', result: 'OK', detail: ip });
      const token = sessions.issue();
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': sessionCookie(token, req) }); return res.end(JSON.stringify({ ok: true }));
    }
    if (url.pathname === '/api/logout' && req.method === 'POST') {
      const token = cookies(req).pj || '';
      let all = false;
      try { all = !!(await body(req)).all; } catch { /* a JSON object is required; an empty one logs out this token */ }
      if (all) sessions.revokeAll(); else sessions.revoke(token);
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': sessionCookie('', req, true) }); return res.end('{"ok":true}');
    }
    if (url.pathname === '/login.html' || url.pathname.startsWith('/avd/') || url.pathname === '/app.css') { /* public assets */ }
    else if (!authed(req)) {
      if (url.pathname.startsWith('/api/')) throw httpErr(401, 'login required');
      res.writeHead(302, { location: '/login.html' }); return res.end();
    }
    if (url.pathname === '/api/state') return json(res, 200, snapshot());
    if (url.pathname === '/api/power-schedules' && req.method === 'GET') return json(res, 200, powerSchedules.view());
    if (url.pathname === '/api/power-schedules/save' && req.method === 'POST') { requireUnlocked(); return json(res, 200, powerSchedules.save(await body(req))); }
    if (url.pathname === '/api/power-schedules/enable' && req.method === 'POST') { requireUnlocked(); const { id, enabled } = await body(req); return json(res, 200, powerSchedules.enable(id, enabled)); }
    if (url.pathname === '/api/power-schedules/delete' && req.method === 'POST') { requireUnlocked(); const { id } = await body(req); return json(res, 200, powerSchedules.remove(id)); }
    if (url.pathname === '/api/health-reports' && req.method === 'GET') return json(res, 200, health.view());
    if (url.pathname === '/api/health-reports/run' && req.method === 'POST') return json(res, 200, { report: await health.run(), ...health.view() });
    if (url.pathname === '/api/thermal' && req.method === 'GET') {
      const minutes = Math.min(RETENTION_MS / 60000, Math.max(1, Number(url.searchParams.get('minutes')) || 30));
      const points = Math.min(600, Math.max(20, Number(url.searchParams.get('points')) || 180));
      return json(res, 200, thermalReport(minutes, points));
    }
    if (url.pathname === '/api/thermal.csv' && req.method === 'GET') {
      const meta = (slot) => { const p = store.projector(slot); return p ? { lane: p.lane || '', model: p.model || p.label || '', limitC: limitFor(p) } : {}; };
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="projctl-air-temperature.csv"' });
      return res.end(thermalCsv(thermal.rows(), meta));
    }

    if (url.pathname === '/api/display-info' && req.method === 'GET') {
      const p = store.projector(url.searchParams.get('slot'));
      if (!p) throw httpErr(404, 'no slot');
      return json(res, 200, displayInfoFor(p));
    }
    if (url.pathname === '/api/host-displays' && req.method === 'GET') return json(res, 200, await readHostDisplays());
    if (url.pathname === '/api/preferred-input' && req.method === 'POST') {
      requireUnlocked();
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
    if (url.pathname === '/api/preset/save' && req.method === 'POST') { requireUnlocked(); const { name } = await body(req); if (!name) throw httpErr(400, 'name required'); savePreset(name); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/preset/recall' && req.method === 'POST') { requireUnlocked(); const { name, confirmLens } = await body(req); return json(res, 200, await recallPreset(name, 'ui', confirmTokenFor(name, confirmLens) || false)); }
    if (url.pathname === '/api/preset/delete' && req.method === 'POST') { requireUnlocked(); const { name } = await body(req); rig.presets = rig.presets.filter((x) => x.name !== name); store.save(); broadcast(snapshot()); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/lock' && req.method === 'POST') { const { lock } = await body(req); rig.lock = !!lock; pendingConfirm.clear(); store.save(); store.event({ source: 'ui', slot: '*', command: `lock ${rig.lock ? 'on' : 'off'}`, result: 'OK' }); broadcast(snapshot()); return json(res, 200, { lock: rig.lock }); }
    if (url.pathname === '/api/projector' && req.method === 'POST') {
      requireUnlocked();
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
    if (url.pathname === '/api/discover' && req.method === 'POST') { requireUnlocked(); return json(res, 200, await discover('ui')); }
    if (url.pathname === '/api/sim' && req.method === 'POST' && SIM) { // test hook: toggle offline or set an out-of-position reported lens readback
      const { slot, offline, lens, temps } = await body(req); const d = driverFor(store.projector(slot)); if (offline !== undefined) d._state.flaky = !!offline; if (temps && typeof temps === 'object') d._state.temps = { intake: 24, qtm1: 36, qtm2: 31, ...d._state.temps, ...temps }; if (lens) Object.assign(d._state.lens, lens); if (lens?._pollFocus != null) d._state.pollFocus = lens._pollFocus; return json(res, 200, { ok: true });
    }
    if (url.pathname.startsWith('/ProjectorThrow/')) {
      const asset = throwlineAsset(url.pathname);
      if (!asset) { res.writeHead(404); return res.end('not found'); }
      return pipeFile(res, asset, { 'content-type': 'application/javascript' });
    }
    const requestPath = url.pathname === '/' ? '/index.html' : url.pathname;
    return servePublic(res, requestPath, {
      root: PUB, mime: MIME, indexHtml(_res, file) {
        const html = withThrowlineImports(fs.readFileSync(file, 'utf8'));
        res.writeHead(200, { 'content-type': MIME['.html'] });
        return res.end(html);
      },
    });
  } catch (e) { if (e.closeConnection) res.setHeader('connection', 'close'); json(res, e.status || 500, { error: e.message }); }
});
applyServerLimits(server);

// Browsers never send messages on this socket; keep any inbound frame small.
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
server.on('upgrade', (req, sock, head) => { if (new URL(req.url, 'http://x').pathname !== '/ws' || !authed(req) || !socketAllowed(req)) { sock.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return sock.destroy(); } wss.handleUpgrade(req, sock, head, (ws) => wss.emit('connection', ws, req)); });
wss.on('connection', (ws) => { clients.add(ws); ws.send(JSON.stringify(snapshot())); ws.on('close', () => clients.delete(ws)); });

server.listen(PORT, () => console.log(`[projctl] ${SIM ? 'SIMULATOR ' : ''}http://0.0.0.0:${server.address().port}  rig=${DATA}  login=${PASSCODE ? 'passcode' : 'open (LAN only)'}`));
