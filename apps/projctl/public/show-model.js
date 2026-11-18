// Show backup page model. Pure functions over the relay snapshot: no DOM, no network.
// A value is a reading only while the relay's reply behind it is current. Everything else
// is worded as "check by eye", "not reported" or "not connected", never as a state.
import { LANES, rigLanes } from './lanes.js';
import { fieldFeedback, feedbackAge } from './status-feedback.js';

export const STATE_WORDS = Object.freeze({ ok: 'OK', eye: 'Check by eye', attention: 'Attention', off: 'No reading' });
export const DISPLAY_STALE_MS = 120000;
export const MOVE_CONFIRM_MS = 6000;
export const MOVE_GUARD_MS = 600;
export const MOVE_REPORT_MS = 30000; // the relay follows a shutter command for the same 30 s

const shortClock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const fullClock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
const stamp = value => typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
export const clockShort = value => Number.isFinite(stamp(value)) ? shortClock.format(new Date(stamp(value))) : null;
export const clockFull = value => Number.isFinite(stamp(value)) ? fullClock.format(new Date(stamp(value))) : null;
const lower = text => text.charAt(0).toLowerCase() + text.slice(1);
const list = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

// PJLink alarm status: 0 none, 1 warning, 2 error. A driver that never read alarms reports nothing.
const ALARMS = [['fan', 'fan'], ['lamp', 'lamp'], ['temp', 'temperature'], ['cover', 'cover'], ['filter', 'filter'], ['other', 'other']];
export function alarmSummary(errors) {
  if (!errors || typeof errors !== 'object') return null;
  const items = ALARMS.filter(([key]) => Number(errors[key]) > 0)
    .map(([key, name]) => ({ key, name, level: Number(errors[key]) >= 2 ? 'error' : 'warning' }))
    .sort((a, b) => (b.level === 'error') - (a.level === 'error'));
  if (!items.length) return null;
  const text = items.map(item => `${item.name} ${item.level}`).join(', ');
  return { level: items[0].level, text: text.charAt(0).toUpperCase() + text.slice(1) };
}

const BLOCKED = {
  connecting: 'Waiting for the relay.',
  'relay-offline': 'Relay not answering. Use the remote.',
  conflict: 'Lane claimed twice. Use the remote.',
  unassigned: 'No projector on this lane.',
  stale: 'Reply too old. Waiting for a fresh one.',
  unreached: "Relay can't reach it. Use the remote.",
};

function blockedLane(base, reach, fresh) {
  const connecting = reach === 'connecting';
  return { ...base, reach, tone: connecting ? 'off' : 'eye', headline: connecting ? 'CONNECTING' : 'CHECK BY EYE', power: null, shutter: null, lit: false,
    shutterText: 'Shutter not reported', freshText: fresh, alarm: null, alarmsReported: false,
    move: { arg: 1, verb: 'Close', label: 'Close shutter', enabled: false, reason: BLOCKED[reach] } };
}

// One view per drawing lane A to D. `monitor` is createConnectionMonitor() from projector-connection.js.
export function laneViews(snapshot, { relayConnected = false, everConnected = false, monitor, now = Date.now() } = {}) {
  const projectors = Array.isArray(snapshot?.projectors) ? snapshot.projectors : [];
  const pollMs = snapshot?.relay?.pollIntervalMs || 5000;
  return rigLanes(projectors).map(({ lane, projector: p, conflict }) => {
    const base = { lane, surface: LANES[lane].target, slot: p?.slot ?? null, revision: p?.controlRevision ?? null,
      model: p ? String(p.model || p.label || '').slice(0, 40) : '' };
    if (!snapshot || !everConnected) return blockedLane(base, 'connecting', 'Waiting for relay');
    if (!relayConnected) return blockedLane(base, 'relay-offline', 'Relay not answering');
    if (conflict) return blockedLane(base, 'conflict', 'Lane claimed twice');
    if (!p) return blockedLane(base, 'unassigned', 'Nothing assigned');
    const c = monitor(p, true, pollMs, now), s = p.status || {};
    if (c.state === 'unassigned') return blockedLane(base, 'unassigned', 'No address saved');
    if (!c.current) {
      if (c.state === 'stale') return blockedLane(base, 'stale', `Last reply ${lower(c.ageLabel)}`);
      if (c.state === 'checking') return blockedLane(base, 'unreached', 'Relay is checking');
      const last = clockShort(c.lastSuccessAt);
      return blockedLane(base, 'unreached', last ? `Last reply ${last}` : 'No reply yet');
    }
    const reported = field => fieldFeedback(p, field, c).current;
    const power = reported('power') && ['on', 'off', 'warming', 'cooling'].includes(s.power) ? s.power : 'unknown';
    const shutter = reported('shutter') && ['open', 'closed'].includes(s.shutter) ? s.shutter : 'unknown';
    const alarmsReported = reported('errors') && ALARMS.some(([key]) => [0, 1, 2].includes(s.errors?.[key]));
    const alarm = alarmsReported ? alarmSummary(s.errors) : null;
    const lit = power === 'on';
    const move = !lit ? { arg: 1, verb: 'Close', label: 'Close shutter', enabled: false, reason: power === 'unknown' ? 'Power not reported, so no shutter move.' : `Reports ${power.toUpperCase()}, so no shutter move.` }
      : shutter === 'closed' ? { arg: 0, verb: 'Open', label: 'Open shutter', enabled: true, reason: '' }
      : { arg: 1, verb: 'Close', label: 'Close shutter', enabled: true, reason: shutter === 'unknown' ? 'Position not reported. Close is available.' : '' };
    return { ...base, reach: 'live', tone: alarm || !lit ? 'attention' : 'ok', headline: power === 'unknown' ? 'POWER UNKNOWN' : power.toUpperCase(), power, shutter, lit,
      shutterText: shutter === 'unknown' ? 'Shutter not reported' : lit && shutter === 'closed' ? 'Shutter CLOSED · dark on stage' : `Shutter ${shutter.toUpperCase()}`,
      freshText: `Reply ${lower(c.ageLabel)}`, alarm, alarmsReported, move };
  });
}

function lanesCheck(lanes, relay) {
  const check = { id: 'lanes', label: 'Lanes lit',
    detail: ['Each lane counts as lit only while the relay holds a current reply from that projector saying its power is ON.',
      'A projector whose control link is held by the playback app does not answer the relay. That lane reads "check by eye", which is normal while the playback app is open.'],
    cannot: ['Whether light reaches the surface. A lit projector with a closed shutter, a wrong input or no picture still counts as lit.', 'Anything about a lane the relay has not reached.'] };
  if (!relay.everConnected) return { ...check, state: 'off', value: 'Waiting', note: 'No relay data yet' };
  if (!relay.connected) return { ...check, state: 'eye', value: 'By eye', note: 'Relay not answering' };
  const live = lanes.filter(l => l.reach === 'live'), lit = live.filter(l => l.lit), blind = lanes.filter(l => l.reach !== 'live');
  const trouble = live.filter(l => !l.lit || l.alarm);
  const value = `${lit.length} of ${lanes.length} lit`;
  if (trouble.length) return { ...check, state: 'attention', value, note: [...trouble.map(l => `${l.lane} ${l.lit ? lower(l.alarm.text) : `reports ${l.headline}`}`), ...(blind.length ? [`${list(blind.map(l => l.lane))} by eye`] : [])].join(' · ') };
  if (blind.length) return { ...check, state: 'eye', value, note: `${list(blind.map(l => l.lane))}: check by eye` };
  const closed = live.filter(l => l.shutter === 'closed');
  return { ...check, state: 'ok', value, note: closed.length ? `${list(closed.map(l => l.lane))} shutter closed` : 'All four answering' };
}

function outputsCheck(displays, lanes, relay, now) {
  const check = { id: 'outputs', label: 'Outputs',
    detail: ['The relay asks the show computer which displays its operating system has connected, at most once every 30 seconds.',
      'The rule used here: one display flagged as main (the control monitor) plus at least one more display for every lane that has a projector assigned.'],
    cannot: ['Whether the playback app has a fullscreen window on each output.', 'Which display feeds which lane.', 'Whether the picture reaches the projector past the adapter and cable.', 'Whether the show computer is locked.'] };
  if (!relay.everConnected) return { ...check, state: 'off', value: 'Waiting', note: 'No relay data yet' };
  if (!relay.connected) return { ...check, state: 'off', value: 'Unknown', note: 'Relay not answering' };
  if (!displays || displays.status === 'loading') return { ...check, state: 'off', value: 'Reading', note: 'Asking the show computer' };
  if (displays.status === 'error') return { ...check, state: 'off', value: 'Not read', note: displays.error || 'Display report failed' };
  const report = displays.data || {};
  if (report.state === 'simulation') return { ...check, state: 'off', value: 'Not read', note: 'Reader is off in simulation' };
  if (report.state !== 'reported') return { ...check, state: 'off', value: 'Not available', note: report.reason || 'No display report' };
  const age = now - stamp(report.collectedAt);
  if (!Number.isFinite(age) || age > DISPLAY_STALE_MS) return { ...check, state: 'eye', value: 'Stale', note: `Last read ${lower(feedbackAge(age))}` };
  const present = (Array.isArray(report.displays) ? report.displays : []).filter(d => d && d.online !== false && d.mirror !== true);
  const mains = present.filter(d => d.main === true), outputs = present.filter(d => d.main !== true);
  const expected = lanes.filter(l => l.slot).length;
  if (!expected) return { ...check, state: 'eye', value: `${present.length} displays`, note: 'No lanes assigned to compare' };
  if (outputs.length < expected) return { ...check, state: 'attention', value: `${outputs.length} of ${expected} outputs`, note: `Fewer outputs than lanes · read ${lower(feedbackAge(age))}` };
  if (mains.length !== 1) return { ...check, state: 'eye', value: `${present.length} displays`, note: 'Main display not identified' };
  return { ...check, state: 'ok', value: `${outputs.length} outputs + main`, note: `Windows not reported · read ${lower(feedbackAge(age))}` };
}

function cueCheck() {
  return { id: 'cues', label: 'Cue link', state: 'off', value: 'Not connected', note: 'Console cues do not reach this page',
    detail: ['The lighting console triggers the playback app directly. That cue traffic does not pass through the relay, so this page has nothing to read.',
      'This item stays "not connected" until a cue feed into the relay is built and accepted.'],
    cannot: ['Whether the console sent a cue.', 'Whether the playback app received or followed it.'] };
}

function computerCheck(relay, now) {
  const check = { id: 'computer', label: 'Show computer',
    detail: ['The relay runs on the show computer and sends this page a heartbeat every 5 seconds. A recent heartbeat means that computer is powered, awake and running the relay.'],
    cannot: ['Whether the screen is locked or its displays are asleep.', 'Whether the playback app is open or which show file is loaded.'] };
  if (!relay.everConnected) return { ...check, state: 'off', value: 'Connecting', note: 'No relay data yet' };
  if (!relay.connected) return { ...check, state: 'attention', value: 'Not answering', note: relay.lastMessageAt ? `Last heard ${lower(feedbackAge(now - relay.lastMessageAt))}` : 'Relay not answering' };
  const since = clockShort(relay.startedAt);
  return { ...check, state: 'ok', value: 'Answering', note: since ? `Relay up since ${since} · lock screen not reported` : 'Lock screen not reported' };
}

// The four go or no-go items, in display order.
export function buildChecks({ lanes, relay, displays, now = Date.now() }) {
  return [lanesCheck(lanes, relay), outputsCheck(displays, lanes, relay, now), cueCheck(), computerCheck(relay, now)];
}

export function verdictOf(checks, relay) {
  if (!relay.everConnected) return { state: 'off', title: 'Connecting', text: 'Waiting for the relay. Nothing below is a reading yet.' };
  const bad = checks.filter(c => c.state === 'attention');
  if (bad.length) return { state: 'attention', title: 'Attention', text: bad.map(c => `${c.label}: ${c.value}. ${c.note}`).join(' · ') };
  const open = checks.filter(c => c.state !== 'ok');
  if (open.length) return { state: 'eye', title: 'Nothing wrong reported', text: `${open.length} of ${checks.length} need your eyes: ${list(open.map(c => lower(c.label)))}.` };
  return { state: 'ok', title: 'All reported good', text: 'Every item has a current reading.' };
}

// Plain text for a text message. Readings carry their age; gaps are stated as gaps.
export function snapshotText({ lanes, checks, verdict, lock, simulation, relay, lastMove, now = Date.now() }) {
  const lines = [`Projection snapshot, ${clockFull(now)}${simulation ? ' (SIMULATION, not the real rig)' : ''}`,
    `${verdict.title}: ${verdict.text}`];
  for (const l of lanes) {
    lines.push(l.reach === 'live'
      ? `${l.lane} ${l.surface}: ${l.headline}, ${lower(l.shutterText)}, ${lower(l.freshText)}. ${l.alarm ? `${l.alarm.text}.` : l.alarmsReported ? 'No alarms reported.' : 'Alarms not reported.'}`
      : `${l.lane} ${l.surface}: no reading (${lower(l.freshText)}). Check by eye.`);
  }
  for (const c of checks.filter(c => c.id !== 'lanes')) lines.push(`${c.label}: ${lower(c.value)}. ${c.note}.`);
  lines.push(`Show Lock: ${!relay.connected ? 'unknown' : lock ? 'on' : 'off'}.`);
  if (lastMove) lines.push(`Last move from this page: ${lastMove.verb} shutter ${lastMove.lane}, ${clockShort(lastMove.at)}, ${lastMove.outcome}.`);
  return lines.join('\n');
}

// No number is stored in this source. The link opens the device's message composer with the text.
export const smsHref = text => `sms:?&body=${encodeURIComponent(text)}`;
