// Projector control model, shared by the role pages. Pure functions over the relay snapshot:
// no DOM, no network. A value is a reading only while the relay's reply behind it is current.
// Everything else is worded as "check by eye" or "not reported", never as a state.
import { LANES, rigLanes } from './lanes.js';
import { fieldFeedback, feedbackAge } from './status-feedback.js';

export const CONFIRM_MS = 6000;        // an action armed on the page
export const RELAY_CONFIRM_MS = 3000;  // the relay's own power-off confirmation
export const GUARD_MS = 600;           // a double tap is not two steps
export const REPORT_MS = 30000;        // how long a sent command waits for the projector's own report
export const ALL = 'ALL';

// The four actions. `want` is what the projector reports once the command has taken.
export const ACTIONS = Object.freeze({
  'power-on': Object.freeze({ id: 'power-on', row: 'power', cmd: 'power', arg: 1, label: 'On', verb: 'Power on', field: 'power', want: ['on', 'warming'], relayConfirm: false }),
  'power-off': Object.freeze({ id: 'power-off', row: 'power', cmd: 'power', arg: 0, label: 'Off', verb: 'Power off', field: 'power', want: ['off', 'cooling'], relayConfirm: true }),
  'shutter-open': Object.freeze({ id: 'shutter-open', row: 'shutter', cmd: 'shutter', arg: 0, label: 'Open', verb: 'Open shutter', field: 'shutter', want: ['open'], relayConfirm: false }),
  'shutter-close': Object.freeze({ id: 'shutter-close', row: 'shutter', cmd: 'shutter', arg: 1, label: 'Close', verb: 'Close shutter', field: 'shutter', want: ['closed'], relayConfirm: false }),
});
export const ACTION_IDS = Object.freeze(Object.keys(ACTIONS));

// What Show Lock locks on a role page. The relay itself blocks only power off; a page may be stricter.
export const DEFAULT_POLICY = Object.freeze({ lockBlocksPower: true, lockBlocksGroup: true });

const shortClock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const stamp = value => typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
export const clockShort = value => Number.isFinite(stamp(value)) ? shortClock.format(new Date(stamp(value))) : null;
export const lower = text => text.charAt(0).toLowerCase() + text.slice(1);
export const list = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

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

// Which link the relay is using for this projector. Commands over the control port have been
// tested against stand-in servers only, so that link is tagged until it is proven on a rig.
export const UNPROVEN_LINKS = Object.freeze(['control-port']);
export function linkOf(projector) {
  const reported = projector?.status?.controlLink, driver = projector?.driver;
  const id = reported === 'control-port' || reported === 'pjlink' ? reported
    : driver === 'panasonic' || driver === 'pjlink' ? 'pjlink' : driver === 'pulse' ? 'pulse' : driver === 'simulator' ? 'simulator' : null;
  const label = { 'control-port': 'Control port', pjlink: 'PJLink', pulse: 'Barco API', simulator: 'Simulator' }[id] || 'Not reported';
  return { id, label, unproven: UNPROVEN_LINKS.includes(id) };
}

const patternIsOff = value => ['00', 'off', '0'].includes(String(value).toLowerCase());
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
  return { ...base, reach, tone: connecting ? 'off' : 'eye', headline: connecting ? 'CONNECTING' : 'CHECK BY EYE', word: connecting ? 'WAIT' : 'EYE', power: null, shutter: null, lit: false,
    shutterText: 'Not reported', inputText: 'Not reported', inputFlag: null, input: null, expectedInput: null, patternText: 'Not reported', patternFlag: null, pattern: null,
    link: null, freshText: fresh, alarm: null, alarmsReported: false, flags: [], blocked: BLOCKED[reach] };
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

    // Input and pattern are read only. They explain a wrong or blue picture; this page never changes them.
    const names = p.inputs && typeof p.inputs === 'object' && !Array.isArray(p.inputs) ? p.inputs : {};
    const input = reported('input') ? String(s.input) : null;
    const want = p.inputPreference?.available ? { value: String(p.inputPreference.value), label: String(p.inputPreference.label) } : null;
    const inputName = input == null ? null : String(names[input] || `Input ${input}`).slice(0, 24);
    const inputFlag = input != null && want && input !== want.value ? `Expected ${want.label}` : null;
    const pattern = reported('pattern') ? String(s.pattern) : null;
    const patternOn = pattern != null && !patternIsOff(pattern);
    const patternName = patternOn ? String(p.patterns?.[pattern] || pattern).slice(0, 24) : null;

    const flags = [...(alarm ? [lower(alarm.text)] : []), ...(lit && patternOn ? ['test pattern on'] : []), ...(lit && inputFlag ? [`input ${inputName}`] : [])];
    return { ...base, reach: 'live', tone: !lit || flags.length ? 'attention' : 'ok',
      headline: power === 'unknown' ? 'POWER UNKNOWN' : power.toUpperCase(), word: power === 'unknown' ? '?' : power === 'warming' ? 'WARM' : power === 'cooling' ? 'COOL' : power.toUpperCase(),
      power, shutter, lit,
      shutterText: shutter === 'unknown' ? 'Not reported' : lit && shutter === 'closed' ? 'CLOSED · dark on stage' : shutter.toUpperCase(),
      input, expectedInput: want, inputText: inputName ?? 'Not reported', inputFlag,
      pattern, patternText: pattern == null ? 'Not reported' : patternOn ? `ON · ${patternName}` : 'Off', patternFlag: patternOn ? 'Test pattern is on' : null,
      link: linkOf(p), freshText: `Reply ${lower(c.ageLabel)}`, alarm, alarmsReported, flags, blocked: null };
  });
}

// Whether one action is offered for one lane right now, and the reason when it is not.
// lock is true, false or null (unknown, for example while the relay is not answering).
export function actionState(view, actionId, { lock = null, policy = DEFAULT_POLICY } = {}) {
  const action = ACTIONS[actionId], no = reason => ({ enabled: false, reason, note: '' });
  if (!action || !view) return no('Not available.');
  if (view.reach !== 'live') return no(view.blocked || 'No current reply.');
  if (!view.slot || !view.revision) return no('No reviewed target for this lane.');
  const power = view.power, POWER = power.toUpperCase();
  if (action.cmd === 'power') {
    if (lock === null) return no('Show Lock not read.');
    if (lock && policy.lockBlocksPower) return no('Show Lock is on. Power is locked.');
    if (power === 'unknown') return no('Power not reported.');
    if (action.arg) {
      if (power === 'off') return { enabled: true, reason: '', note: '' };
      return no(power === 'on' ? 'Already reports ON.' : power === 'warming' ? 'Already warming up.' : 'Cooling. Wait before power on.');
    }
    if (power === 'on' || power === 'warming') return { enabled: true, reason: '', note: '' };
    return no(power === 'off' ? 'Already reports OFF.' : 'Already cooling.');
  }
  if (power !== 'on') return no(power === 'unknown' ? 'Power not reported, so no shutter move.' : `Reports ${POWER}, so no shutter move.`);
  const there = action.arg ? 'closed' : 'open';
  if (view.shutter === there) return no(`Already reports ${there.toUpperCase()}.`);
  return { enabled: true, reason: '', note: view.shutter === 'unknown' ? 'Shutter position not reported.' : '' };
}

// The one reason shared by every action on a lane, or '' when they differ or any is offered.
export function sharedReason(view, options) {
  const reasons = new Set(ACTION_IDS.map(id => { const state = actionState(view, id, options); return state.enabled ? '' : state.reason; }));
  return reasons.size === 1 ? [...reasons][0] : '';
}

// An all-lanes action sends one command per ready lane; the skipped lanes are listed with their reasons.
export function groupState(views, actionId, { lock = null, policy = DEFAULT_POLICY } = {}) {
  const action = ACTIONS[actionId], ready = [], skipped = [];
  for (const view of views) {
    const state = actionState(view, actionId, { lock, policy });
    if (state.enabled) ready.push({ lane: view.lane, slot: view.slot, revision: view.revision });
    else skipped.push({ lane: view.lane, reason: state.reason });
  }
  const no = reason => ({ enabled: false, reason, ready: [], skipped });
  if (!action) return no('Not available.');
  if (lock === null) return no(views.some(view => view.reach === 'connecting') ? 'Waiting for the relay.' : 'Show Lock not read.');
  if (lock && policy.lockBlocksGroup) return no('Show Lock is on. All-lanes actions are locked.');
  if (!ready.length) { const reasons = new Set(skipped.map(item => item.reason)); return no(reasons.size === 1 ? [...reasons][0] : 'No lane can take this now.'); }
  return { enabled: true, reason: '', ready, skipped };
}

export const targetsText = ready => list(ready.map(target => target.lane));
export const skippedText = skipped => skipped.map(item => `${item.lane}: ${lower(item.reason).replace(/\.$/, '')}`).join(' · ');

// Counts for the all-lanes card.
export function groupSummary(views) {
  const live = views.filter(view => view.reach === 'live');
  return { total: views.length, reading: live.length, lit: live.filter(view => view.lit).length, closed: live.filter(view => view.lit && view.shutter === 'closed').length };
}

export { LANES, feedbackAge };
