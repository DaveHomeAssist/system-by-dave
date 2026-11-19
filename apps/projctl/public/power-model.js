// Rules for the power operator page (docs/power-operator-page.md). No DOM and no network,
// so every rule here is unit-tested in Node. Nothing in this file sends a command.
import { fieldFeedback } from './status-feedback.js';

export const STORAGE_KEY = 'projctl.powerPage.v1';
// Recorded cooling time for the lamp units. A guide for the operator's eyes, not a measurement.
export const COOL_SECONDS = 170;
// A "confirmed by eye" tick describes one moment. It lapses so an old tick cannot satisfy a later check.
export const TICK_VALID_MS = 30 * 60 * 1000;
export const RELAY_LANES = Object.freeze(['A', 'B', 'C', 'D']);
export const LAMP_LANES = Object.freeze(['A', 'D']);
export const STEPS = Object.freeze({
  on: Object.freeze(['playback', 'C', 'B', 'A', 'D']),
  off: Object.freeze(['playback', 'B', 'C', 'A', 'D']),
});
export const POWER_WORDS = Object.freeze({ on: 'ON', off: 'STANDBY', warming: 'WARMING', cooling: 'COOLING' });

const time = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 8.64e15 ? value : null;

export function emptyRecord() {
  return { v: 1, playback: { on: null, off: null },
    lanes: Object.fromEntries(LAMP_LANES.map(lane => [lane, { coolUntil: null }])),
    // Night only: a relay lane the relay cannot read may be confirmed off by eye (decision POWER-4).
    relay: Object.fromEntries(RELAY_LANES.map(lane => [lane, { tick: null }])) };
}

// Saved browser data is untrusted: anything that is not the expected shape is dropped.
export function parseRecord(text) {
  const record = emptyRecord();
  let raw;
  try { raw = JSON.parse(text); } catch { return record; }
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return record;
  for (const mode of ['on', 'off']) record.playback[mode] = time(raw.playback?.[mode]);
  for (const lane of LAMP_LANES) {
    const item = raw.lanes?.[lane];
    if (!item || typeof item !== 'object') continue;
    record.lanes[lane].coolUntil = time(item.coolUntil);
  }
  for (const lane of RELAY_LANES) {
    const tick = raw.relay?.[lane]?.tick;
    if (tick && typeof tick === 'object' && tick.state === 'off' && time(tick.at)) record.relay[lane].tick = { state: 'off', at: tick.at };
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
// `tick` is the operator's own "off by eye" tick for this lane, used only at night and only while the
// relay's fresh reply carries no power state.
export function relayStep(mode, reading, { lock = false, busy = false, playbackTicked = false, tick = null, lamp = false, coolUntil = null, now = Date.now() } = {}) {
  const want = mode === 'on' ? 'on' : 'off';
  const timer = coolTimer(coolUntil, now);
  const read = !timer.running && reading.kind === 'reading' && reading.power === want;
  // A fresh reply with no power state in it (for example a unit in a standby the relay's driver does
  // not name). The relay still accepts power for it, as the operator console does, so the step
  // stays usable. It is never shown or counted as On or Standby.
  const unread = reading.kind === 'unknown';
  // At night such a lane can be confirmed off by eye, exactly as a lane powered by handheld remote is.
  const eyeOffered = unread && !lamp && mode === 'off';
  const eyeMatches = eyeOffered && !!tick && tick.state === 'off';
  const eyeTicked = eyeMatches && tickCurrent(tick.at, now);
  const done = read || eyeTicked;
  let reason = '', enabled = false;
  if (reading.kind === 'conflict') reason = 'This lane is assigned to more than one projector. Call the video lead.';
  else if (reading.kind === 'unassigned') reason = 'This lane is not set up on the relay. Call the video lead.';
  else if (reading.kind === 'disconnected') reason = 'The control page lost the relay. Wait for it to reconnect.';
  else if (reading.kind === 'noreply') reason = 'No fresh reply from this projector. No reply does not confirm power off.';
  else if (timer.running) reason = 'Wait for the lamp cooling timer.';
  else if (unread && lamp) reason = 'Wait for a fresh lamp power reading.';
  else if (read) reason = mode === 'on' ? 'The relay reads On. Nothing to send.' : 'The relay reads Standby. Nothing to send.';
  else if (!playbackTicked) reason = 'Tick step 1 first.';
  else if (busy) reason = 'Another operation is running on this projector. Wait for it to finish.';
  else if (reading.power === 'cooling') reason = mode === 'on' ? 'Cooling. Wait for Standby before power on.' : 'Cooling down. Watch for Standby.';
  else if (mode === 'on' && reading.power === 'warming') reason = 'Warming up. Watch for On.';
  else if (mode === 'off' && lock) reason = 'Show Lock is on, so power off is blocked. Ask the video lead to release it.';
  else {
    enabled = true;
    if (unread) reason = mode === 'on'
      ? "The relay cannot read this unit's power state. Look at it first: power on only from standby."
      : "The relay cannot read this unit's power state. Look at it: tick if it is off, power off if it is lit.";
  }
  const tone = done ? 'done' : timer.running ? 'waiting' : unread ? 'waiting' : reading.kind !== 'reading' ? 'blocked' : ['warming', 'cooling'].includes(reading.power) ? 'waiting' : 'todo';
  return { done, enabled, reason, timer, word: eyeTicked ? 'OFF BY EYE' : reading.word, tone, action: want,
    // How this lane came to count: read by the relay, or looked at by the operator. Never both.
    basis: read ? 'read' : eyeTicked ? 'eye' : null,
    eye: { offered: eyeOffered, ticked: eyeTicked, lapsed: eyeMatches && !eyeTicked, tickedAt: eyeTicked ? tick.at : null } };
}

// The strip above the checklist. Night: safe to leave only when every lane is either read as Standby
// from a fresh relay reply or carries a current "off by eye" tick that no fresh reading disputes.
// The detail says which lanes were read and which were looked at.
export function banner(mode, lanes) {
  const missing = lanes.filter(lane => !lane.done).map(lane => ({ lane: lane.lane,
    why: lane.timer?.running ? 'cooling timer' : lane.eye?.lapsed ? 'tick lapsed' : lane.word.toLowerCase() }));
  const complete = lanes.length > 0 && missing.length === 0;
  const read = lanes.filter(lane => lane.basis !== 'eye').map(lane => lane.lane);
  const eye = lanes.filter(lane => lane.basis === 'eye').map(lane => lane.lane);
  const list = items => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] || '';
  const told = (state, sight) => [read.length ? `${list(read)} ${read.length === 1 ? 'reads' : 'read'} ${state}.` : '', eye.length ? `${list(eye)} confirmed ${sight} by eye.` : ''].filter(Boolean).join(' ');
  const waiting = `Waiting on: ${missing.map(item => `${item.lane} ${item.why}`).join(' · ')}`;
  if (mode === 'off') return complete
    ? { state: 'safe', title: 'Safe to leave the building', detail: told('Standby', 'off'), missing }
    : { state: 'wait', title: 'Not safe to leave yet', detail: waiting, missing };
  return complete
    ? { state: 'ready', title: 'All four on', detail: told('On', 'lit'), missing }
    : { state: 'wait', title: 'Not all on yet', detail: waiting, missing };
}
