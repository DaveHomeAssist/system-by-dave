// Frozen Monitor runtime shared by the six pages: theme, Eastern clock, the relay connection and
// the live lane model. The monitor reads relay state; the only command it can send is Stop lens.
import { rigLanes } from '../lanes.js';
import { createConnectionMonitor } from '../projector-connection.js';
import { heatDetail } from '../heat-notice.js';
import { LANES, OPENING } from './monitor-data.js';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (selector, root = document) => root.querySelector(selector);

const ZONE = 'America/New_York';
const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayLine = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short', month: 'short', day: 'numeric' });
const clockLine = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
const logTime = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
export const todayISO = (now = new Date()) => isoDay.format(now);
export const easternTime = value => { const t = Date.parse(value); return Number.isFinite(t) ? logTime.format(new Date(t)) : '—'; };
export const shortTime = value => { const t = Date.parse(value); return Number.isFinite(t) ? clockLine.format(new Date(t)).replace(/:\d\d (?=[AP]M)/, ' ') : '—'; };
const dayNumber = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;
export const daysBetween = (from, to) => Math.round(dayNumber(to) - dayNumber(from));

// ---- Theme: Light, Dark or Deep Freeze. A fresh browser follows Projctl's saved theme, else light.
const THEME_KEY = 'projctl.monitor.theme.v1';
const THEMES = ['light', 'dark', 'deep-freeze'];
const THEME_COLOR = { light: '#ffffff', dark: '#102438', 'deep-freeze': '#0a2232' };
function savedTheme() {
  try {
    const own = localStorage.getItem(THEME_KEY);
    if (THEMES.includes(own)) return own;
    const projctl = JSON.parse(localStorage.getItem('projctl.ui.v1') || 'null');
    if (projctl?.version === 1 && ['light', 'dark'].includes(projctl.theme)) return projctl.theme;
  } catch { /* Storage can be unavailable; the light default still works. */ }
  return 'light';
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('[data-theme-choice]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === theme)));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

// ---- Clock: Eastern time with the countdown to opening night.
function startClock() {
  const clock = $('#fm-clock');
  if (!clock) return;
  let timer = null;
  const tick = () => {
    clearTimeout(timer);
    const now = new Date(), away = daysBetween(todayISO(now), OPENING);
    const countdown = away > 1 ? `${away} days to opening` : away === 1 ? '1 day to opening' : away === 0 ? 'Opening night' : 'Running';
    clock.dateTime = now.toISOString();
    $('[data-clock-date]', clock).textContent = `${dayLine.format(now).replace(', ', ' · ')} · ${countdown}`;
    $('[data-clock-time]', clock).textContent = clockLine.format(now);
    if (!document.hidden) timer = setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else tick(); });
  tick();
}

// ---- Relay connection: the same snapshot, status and event messages Projctl itself uses.
export const live = { connected: false, attempted: false, snapshot: null, events: [], health: null };
const listeners = new Set();
let frame = 0;
function emit() {
  if (frame) return;
  frame = requestAnimationFrame(() => { frame = 0; listeners.forEach(fn => fn(live)); });
}
export function onLive(fn) { listeners.add(fn); fn(live); }

let socket = null, generation = 0, retryTimer = 0, silenceTimer = 0, snapshotTimer = 0, healthTimer = 0, wantHealth = false;
function lost(gen) {
  if (gen !== generation) return;
  generation++;
  clearTimeout(snapshotTimer); clearTimeout(silenceTimer);
  try { socket?.close(); } catch { /* already closed */ }
  live.connected = false; live.attempted = true; emit(); renderShell();
  fetch('/api/state', { cache: 'no-store', signal: AbortSignal.timeout(4000) })
    .then(r => { if (r.status === 401) location.href = '/login.html'; }).catch(() => {});
  clearTimeout(retryTimer); retryTimer = setTimeout(open, 3000);
}
function alive(gen) { clearTimeout(silenceTimer); silenceTimer = setTimeout(() => lost(gen), 15000); }
function open() {
  const gen = ++generation;
  try { socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); }
  catch { lost(gen); return; }
  // A transport alone does not prove current relay state; wait for the snapshot.
  snapshotTimer = setTimeout(() => lost(gen), 5000);
  socket.onclose = () => lost(gen);
  socket.onerror = () => lost(gen);
  socket.onmessage = message => {
    if (gen !== generation) return;
    let msg; try { msg = JSON.parse(message.data); } catch { lost(gen); return; }
    if (!msg || typeof msg !== 'object') { lost(gen); return; }
    if (msg.type === 'snapshot') {
      if (!Array.isArray(msg.projectors) || !msg.projectors.every(p => p && typeof p.slot === 'string') || !Array.isArray(msg.events)) { lost(gen); return; }
      clearTimeout(snapshotTimer); alive(gen);
      live.snapshot = msg; live.events = msg.events.slice(-200); live.connected = true; live.attempted = true;
      renderShell(); emit(); if (wantHealth) loadHealth();
      return;
    }
    if (!live.connected) return;
    alive(gen);
    const p = typeof msg.slot === 'string' ? live.snapshot.projectors.find(x => x.slot === msg.slot) : null;
    if (msg.type === 'status' && p && msg.status && typeof msg.status === 'object') {
      p.status = msg.status;
      for (const key of ['displayInfo', 'inputPreference', 'inputs', 'thermal']) if (msg[key] !== undefined) p[key] = msg[key];
    } else if (msg.type === 'busy' && p) p.busy = msg.busy;
    else if (msg.type === 'event' && msg.event && typeof msg.event === 'object') { live.events.push(msg.event); if (live.events.length > 200) live.events.shift(); }
    else if (msg.type === 'powerSchedules' && msg.schedules && typeof msg.schedules === 'object') live.snapshot.powerSchedules = msg.schedules;
    emit();
  };
}
async function loadHealth() {
  clearTimeout(healthTimer);
  try {
    const r = await fetch('/api/health-reports', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (r.ok) { live.health = await r.json(); emit(); }
  } catch { /* The live readings still render without the report summary. */ }
  healthTimer = setTimeout(() => { if (live.connected && !document.hidden) loadHealth(); }, 60000);
}

// Stop lens is the one command a monitor page may send; the relay rechecks the target at the write.
export async function stopLens(slot) {
  const r = await fetch('/api/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot, cmd: 'lens', arg: { op: 'stop' } }), signal: AbortSignal.timeout(10000) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `Relay answered ${r.status}`);
  return body;
}

// ---- Live lane model: recorded identity plus whatever this relay reports now.
const monitor = createConnectionMonitor();
const ago = ms => ms < 0 ? 'just now' : ms < 60000 ? `${Math.max(1, Math.round(ms / 1000))} s ago` : ms < 3600000 ? `${Math.round(ms / 60000)} min ago` : 'over an hour ago';
const HEAT_STATE = { ok: 'done', watch: 'waiting', hot: 'blocked', unknown: 'idle' };
function signalText(info) {
  const s = info?.signal;
  if (!s || s.state === 'unsupported') return 'Not reported';
  if (s.state !== 'reported') return '—';
  const v = s.value;
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  const w = v?.width ?? v?.horizontal ?? v?.h, h = v?.height ?? v?.vertical ?? v?.v;
  return Number.isFinite(+w) && Number.isFinite(+h) ? `${w} × ${h}` : 'Reported';
}
export function laneModels(now = Date.now()) {
  const projectors = live.connected ? live.snapshot.projectors : [];
  const pollMs = live.snapshot?.relay?.pollIntervalMs || 5000;
  const byLane = Object.fromEntries(rigLanes(projectors).map(entry => [entry.lane, entry]));
  const out = {};
  for (const rec of LANES) {
    const entry = byLane[rec.lane], p = entry?.projector;
    const v = { ...rec, projector: p || null, slot: p?.slot || null, ip: p?.ip || null, current: false, st: 'idle', word: 'Relay offline',
      power: '—', shutter: '—', input: '—', signal: '—', pattern: '—', reply: '—', intake: '—', heat: '—', heatSt: 'idle', lampNow: null,
      liveModel: p ? [p.make, p.model].filter(Boolean).join(' ') : null };
    if (live.connected && !p) { v.st = entry?.conflict ? 'waiting' : 'idle'; v.word = entry?.conflict ? 'Lane conflict' : 'Unassigned'; }
    if (live.connected && p) {
      const c = monitor(p, true, pollMs, now), s = p.status || {};
      v.current = c.current;
      v.reply = c.lastSuccessAt ? ago(now - Date.parse(c.lastSuccessAt)) : 'No reply yet';
      if (c.current) {
        const words = { on: ['done', 'Powered'], warming: ['active', 'Warming'], cooling: ['waiting', 'Cooling'], off: ['idle', 'Standby'] };
        [v.st, v.word] = words[s.power] || ['queued', 'Power unknown'];
        v.power = String(s.power || 'unknown').toUpperCase();
        v.shutter = s.shutter === 'open' ? 'Open' : s.shutter === 'closed' ? 'Closed' : 'Unknown';
        v.input = p.displayInfo?.input?.label && p.displayInfo.input.label !== 'Reported input' ? p.displayInfo.input.label : s.input || 'Not reported';
        v.signal = signalText(p.displayInfo);
        v.pattern = s.pattern ? String(s.pattern) : 'Off';
        if (s.errors?.lamp > 0) v.lampNow = 'Lamp error reported now';
      } else {
        const words = { checking: ['queued', 'Checking'], stale: ['waiting', 'Stale reply'], reconnecting: ['blocked', 'No reply'], unassigned: ['idle', 'No address'] };
        [v.st, v.word] = words[c.state] || ['blocked', 'No reply'];
      }
      const heat = heatDetail(p, c.current, now);
      v.intake = heat.value === 'N/A' ? 'No reading' : `${heat.value} °C`;
      v.heat = heat.word; v.heatSt = HEAT_STATE[heat.level] || 'idle';
    }
    out[rec.lane] = v;
  }
  return out;
}
export const laneOfSlot = slot => live.snapshot?.projectors.find(p => p.slot === slot)?.lane || null;
export const lockState = () => !live.connected ? 'unknown' : live.snapshot.lock ? 'on' : 'off';

// ---- Shell: relay chip, data source and Show Lock state in the app bar.
function renderShell() {
  const chip = $('#fm-relay'), source = $('#fm-source'), lock = $('#fm-lock');
  if (chip) {
    const sim = live.connected && live.snapshot.simulation;
    $('.avd-dot', chip).className = `avd-dot avd-dot--${live.connected ? sim ? 'automated' : 'done' : live.attempted ? 'blocked' : 'queued'}`;
    $('[data-relay-word]', chip).textContent = live.connected ? sim ? 'Simulator relay · live' : 'Projctl relay · live' : live.attempted ? 'Relay offline' : 'Connecting…';
    chip.title = live.connected ? `Connected to the relay at ${location.host}` : 'Recorded facts still show. Live readings need the relay that serves this page.';
  }
  if (source) { source.dataset.source = live.connected ? 'live' : 'recorded'; source.textContent = live.connected ? 'Live relay data' : 'Recorded only'; }
  if (lock) {
    const state = lockState();
    lock.dataset.lock = state;
    $('[data-lock-word]', lock).textContent = state === 'on' ? 'Show Lock on' : state === 'off' ? 'Show Lock off' : 'Show Lock unknown';
  }
}

// Replace a region only when its markup changed, keeping keyboard focus on the same control.
export function patch(el, html) {
  if (!el || el.__html === html) return;
  const key = el.contains(document.activeElement) ? document.activeElement.dataset.key : null;
  el.innerHTML = html; el.__html = html;
  if (key) el.querySelector(`[data-key="${CSS.escape(key)}"]`)?.focus();
}

export function startMonitor({ health = false } = {}) {
  wantHealth = health;
  applyTheme(savedTheme());
  document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
    applyTheme(button.dataset.themeChoice);
    try { localStorage.setItem(THEME_KEY, button.dataset.themeChoice); } catch { /* This visit keeps the choice. */ }
  }));
  startClock();
  renderShell();
  open();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && live.connected && wantHealth) loadHealth(); });
}

// Acceptance coverage rows for a role=table (Cues, Rig and Network share the crew workbook checks).
export function checksHTML(rows) {
  const cell = (kind, say) => `<span role="cell" class="fm-td fm-cellwrap"><span class="avd-cell avd-cell--${kind}" role="img" aria-label="${esc(say)}"></span></span>`;
  return `<div role="row" class="fm-tr fm-tr--head"><span role="columnheader" class="avd-eyebrow">Check</span><span role="columnheader" class="avd-eyebrow">A</span><span role="columnheader" class="avd-eyebrow">B</span><span role="columnheader" class="avd-eyebrow">C</span><span role="columnheader" class="avd-eyebrow">D</span><span role="columnheader" class="avd-eyebrow">Rig</span><span role="columnheader" class="avd-eyebrow">State</span></div>`
    + rows.map(r => `<div role="row" class="fm-tr"><span role="cell" class="fm-td"><span class="fm-check-id">${esc(r.id)}</span> <span class="fm-check-text">${esc(r.text)}</span></span>${cell(r.lane, r.laneSay).repeat(4)}${cell(r.rig, r.rigSay)}<span role="cell" class="fm-td fm-cellwrap"><span class="avd-dot avd-dot--idle" role="img" aria-label="No result recorded"></span></span></div>`).join('');
}
