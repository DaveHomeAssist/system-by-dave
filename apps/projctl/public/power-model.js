// Rules for the power operator page (docs/power-operator-page.md). No DOM and no network,
// so every rule here is unit-tested in Node. Nothing in this file sends a command.
import { fieldFeedback } from './status-feedback.js';

export const STORAGE_KEY = 'projctl.powerPage.v1';
// Recorded cooling time for the lamp units. A guide for the operator's eyes, not a measurement.
export const COOL_SECONDS = 170;
// A "confirmed by eye" tick describes one moment. It lapses so an old tick cannot satisfy a later check.
export const TICK_VALID_MS = 30 * 60 * 1000;
// Pending decision POWER-1: the relay powers these lanes; the operator powers the others by handheld remote.
export const RELAY_LANES = Object.freeze(['B', 'C']);
export const MANUAL_LANES = Object.freeze(['A', 'D']);
export const STEPS = Object.freeze({
  on: Object.freeze(['playback', 'C', 'B', 'A', 'D']),
  off: Object.freeze(['playback', 'B', 'C', 'A', 'D']),
});
export const POWER_WORDS = Object.freeze({ on: 'ON', off: 'STANDBY', warming: 'WARMING', cooling: 'COOLING' });

const time = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 8.64e15 ? value : null;

export function emptyRecord() {
  return { v: 1, playback: { on: null, off: null }, lanes: Object.fromEntries(MANUAL_LANES.map(lane => [lane, { tick: null, coolUntil: null }])) };
}

// Saved browser data is untrusted: anything that is not the expected shape is dropped.
export function parseRecord(text) {
  const record = emptyRecord();
  let raw;
  try { raw = JSON.parse(text); } catch { return record; }
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return record;
  for (const mode of ['on', 'off']) record.playback[mode] = time(raw.playback?.[mode]);
  for (const lane of MANUAL_LANES) {
    const item = raw.lanes?.[lane];
    if (!item || typeof item !== 'object') continue;
    if (item.tick && typeof item.tick === 'object' && ['lit', 'off'].includes(item.tick.state) && time(item.tick.at)) record.lanes[lane].tick = { state: item.tick.state, at: item.tick.at };
    record.lanes[lane].coolUntil = time(item.coolUntil);
  }
  return record;
}

export function tickCurrent(at, now) {
  return time(at) !== null && now - at >= -60000 && now - at < TICK_VALID_MS;
}

// An operator-started countdown. A stored end time further away than one full countdown is ignored.
export function coolTimer(coolUntil, now) {
  const end = time(coolUntil);
  if (end === null) return { running: false, remaining: 0, finishedAt: null };
  const left = end - now;
  if (left > COOL_SECONDS * 1000 + 1000) return { running: false, remaining: 0, finishedAt: null };
  if (left > 0) return { running: true, remaining: Math.ceil(left / 1000), finishedAt: null };
  return { running: false, remaining: 0, finishedAt: -left < TICK_VALID_MS ? end : null };
}

export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// The optional crew notes link. The address comes from the relay's private settings (api/crew-links).
// The relay validates it; the page checks again and accepts only a plain http or https address.
// Anything else, including a relay without that route, means "not configured".
export function crewNotesUrl(payload) {
  const value = payload?.notes?.url;
  if (typeof value !== 'string' || !value || value.length > 300 || /[\s\u0000-\u001f\u007f]/.test(value)) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
  return url.href.length <= 300 ? url.href : null;
}

// What the relay can honestly say about one lane right now. Only kind 'reading' is a reading.
export function laneReading(entry, connection) {
  if (!entry || entry.conflict) return { kind: 'conflict', word: 'CONFLICT' };
  if (!entry.projector || connection?.state === 'unassigned') return { kind: 'unassigned', word: 'NOT SET UP' };
  const power = fieldFeedback(entry.projector, 'power', connection);
  const known = Object.hasOwn(POWER_WORDS, power.value) ? power.value : null;
  const lastKnown = known ? POWER_WORDS[known] : null;
  if (connection.state === 'disconnected') return { kind: 'disconnected', word: 'PAGE OFFLINE', lastKnown, lastReply: connection.lastReply };
  if (!connection.current) return { kind: 'noreply', word: 'NO REPLY', lastKnown, lastReply: connection.lastReply, ageLabel: connection.ageLabel };
  if (!power.current || !known) return { kind: 'unknown', word: 'UNKNOWN', ageLabel: connection.ageLabel };
  return { kind: 'reading', power: known, word: POWER_WORDS[known], ageLabel: connection.ageLabel };
}

// A relay lane: the one command this mode may send, whether it may be sent now, and why not.
export function relayStep(mode, reading, { lock = false, busy = false, playbackTicked = false } = {}) {
  const want = mode === 'on' ? 'on' : 'off';
  const done = reading.kind === 'reading' && reading.power === want;
  let reason = '', enabled = false;
  if (reading.kind === 'conflict') reason = 'This lane is assigned to more than one projector. Call the video lead.';
  else if (reading.kind === 'unassigned') reason = 'This lane is not set up on the relay. Call the video lead.';
  else if (reading.kind === 'disconnected') reason = 'The control page lost the relay. Wait for it to reconnect.';
  else if (reading.kind === 'noreply') reason = 'No fresh reply from this projector. No reply does not confirm power off.';
  else if (reading.kind === 'unknown') reason = 'The projector replied without a power state. Wait for the next reading.';
  else if (done) reason = mode === 'on' ? 'The relay reads On. Nothing to send.' : 'The relay reads Standby. Nothing to send.';
  else if (!playbackTicked) reason = 'Tick step 1 first.';
  else if (busy) reason = 'Another operation is running on this projector. Wait for it to finish.';
  else if (reading.power === 'cooling') reason = mode === 'on' ? 'Cooling. Wait for Standby before power on.' : 'Cooling down. Watch for Standby.';
  else if (mode === 'on' && reading.power === 'warming') reason = 'Warming up. Watch for On.';
  else if (mode === 'off' && lock) reason = 'Show Lock is on, so power off is blocked. Ask the video lead to release it.';
  else enabled = true;
  const tone = done ? 'done' : reading.kind !== 'reading' ? 'blocked' : ['warming', 'cooling'].includes(reading.power) ? 'waiting' : 'todo';
  return { done, enabled, reason, word: reading.word, tone, action: want };
}

// A manual lane: the operator's own tick and timer. The relay reading, when there is one, can only veto.
export function manualStep(mode, item, reading, now) {
  const want = mode === 'on' ? 'lit' : 'off';
  const matches = !!item?.tick && item.tick.state === want;
  const ticked = matches && tickCurrent(item.tick.at, now);
  const lapsed = matches && !ticked;
  const timer = coolTimer(item?.coolUntil, now);
  const relayPower = reading.kind === 'reading' ? reading.power : null;
  const conflict = ticked && relayPower !== null && (mode === 'on' ? ['off', 'cooling'].includes(relayPower) : relayPower !== 'off');
  const done = ticked && !conflict;
  const tickEnabled = ticked || !timer.running;
  const word = conflict ? 'CHECK AGAIN' : ticked ? (mode === 'on' ? 'LIT BY EYE' : 'OFF BY EYE') : timer.running ? 'COOLING TIMER' : lapsed ? 'TICK LAPSED' : 'TO DO';
  const tone = conflict ? 'blocked' : done ? 'done' : timer.running ? 'waiting' : 'todo';
  return { done, ticked, lapsed, conflict, timer, tickEnabled, word, tone, tickedAt: ticked ? item.tick.at : null,
    tickReason: tickEnabled ? '' : 'Wait for the cooling countdown, then check by eye.' };
}

// The strip above the checklist. Night: safe to leave only when every relay lane reads Standby
// from a fresh reply and every manual lane carries a current tick that no fresh reading disputes.
export function banner(mode, lanes) {
  const missing = lanes.filter(lane => !lane.done).map(lane => ({ lane: lane.lane,
    why: lane.kind === 'relay' ? lane.word.toLowerCase() : lane.conflict ? `ticked, but the relay reads ${lane.relayWord}` : lane.lapsed ? 'tick lapsed' : lane.timer?.running ? 'cooling timer' : 'not ticked' }));
  const complete = lanes.length > 0 && missing.length === 0;
  const relay = lanes.filter(lane => lane.kind === 'relay').map(lane => lane.lane), manual = lanes.filter(lane => lane.kind === 'manual').map(lane => lane.lane);
  const list = items => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] || '';
  if (mode === 'off') return complete
    ? { state: 'safe', title: 'Safe to leave the building', detail: `${list(relay)} read Standby. ${list(manual)} confirmed off by eye.`, missing }
    : { state: 'wait', title: 'Not safe to leave yet', detail: `Waiting on: ${missing.map(item => `${item.lane} ${item.why}`).join(' · ')}`, missing };
  return complete
    ? { state: 'ready', title: 'All four on', detail: `${list(relay)} read On. ${list(manual)} confirmed lit by eye.`, missing }
    : { state: 'wait', title: 'Not all on yet', detail: `Waiting on: ${missing.map(item => `${item.lane} ${item.why}`).join(' · ')}`, missing };
}
