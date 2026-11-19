// Show backup page model. Pure functions: no DOM, no network. Lane readings and the control
// rules live in projector-control-model.js, which other role pages share; this file holds what
// is specific to this page: the go or no-go strip, the setup check and the MIDI test.
import { laneViews, alarmSummary, clockShort, lower, list, feedbackAge } from './projector-control-model.js';

export { laneViews, alarmSummary, clockShort };
export const STATE_WORDS = Object.freeze({ ok: 'OK', eye: 'Check by eye', attention: 'Attention', off: 'No reading' });
export const STATE_MARKS = Object.freeze({ ok: '✓', eye: '?', attention: '!', off: '–' });
export const DISPLAY_STALE_MS = 120000;
export const FEED_STALE_MS = 20000; // how old this page's own copy of the cue feed may be

const stamp = value => typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
const secondsClock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' });
export const clockSeconds = value => Number.isFinite(stamp(value)) ? secondsClock.format(new Date(stamp(value))) : null;
const ago = (value, now) => lower(feedbackAge(now - stamp(value)));
const cueWords = message => `${message.command === 'go' ? 'Cue' : `${message.command.toUpperCase()} cue`} ${message.cue ?? '(none)'}${message.list ? `, list ${message.list}` : ''}`;

// ---- Go or no-go strip
function lanesCheck(lanes, relay) {
  const check = { id: 'lanes', label: 'Lanes lit', short: 'Lanes',
    detail: ['Each lane counts as lit only while the relay holds a current reply from that projector saying its power is ON.',
      'A lane the relay is not reading says "check by eye". Its last known state is never shown as a reading.'],
    cannot: ['Whether light reaches the surface. A lit projector with a closed shutter, a wrong input or no picture still counts as lit.', 'Anything about a lane the relay has not reached.'] };
  if (!relay.everConnected) return { ...check, state: 'off', value: 'Waiting', brief: 'Waiting', note: 'No relay data yet' };
  if (!relay.connected) return { ...check, state: 'eye', value: 'By eye', brief: 'By eye', note: 'Relay not answering' };
  const live = lanes.filter(l => l.reach === 'live'), lit = live.filter(l => l.lit), blind = lanes.filter(l => l.reach !== 'live');
  const trouble = live.filter(l => !l.lit || l.flags.length);
  const value = `${lit.length} of ${lanes.length} lit`, brief = `${lit.length}/${lanes.length} lit`;
  if (trouble.length) return { ...check, state: 'attention', value, brief, note: [...trouble.map(l => `${l.lane} ${l.lit ? l.flags.join(', ') : `reports ${l.headline}`}`), ...(blind.length ? [`${list(blind.map(l => l.lane))} by eye`] : [])].join(' · ') };
  if (blind.length) return { ...check, state: 'eye', value, brief, note: `${list(blind.map(l => l.lane))}: check by eye` };
  const closed = live.filter(l => l.shutter === 'closed');
  return { ...check, state: 'ok', value, brief, note: closed.length ? `${list(closed.map(l => l.lane))} shutter closed` : 'All four answering' };
}

// The displays the show computer reports, and the rule this page applies to them.
function readDisplays(displays, lanes, now) {
  if (!displays || displays.status === 'loading') return { known: false, reason: 'Asking the show computer', value: 'Reading' };
  if (displays.status === 'error') return { known: false, reason: displays.error || 'Display report failed', value: 'Not read' };
  const report = displays.data || {};
  if (report.state === 'simulation') return { known: false, reason: 'Reader is off in simulation', value: 'Not read' };
  if (report.state !== 'reported') return { known: false, reason: report.reason || 'No display report', value: 'Not available' };
  const age = now - stamp(report.collectedAt);
  if (!Number.isFinite(age) || age > DISPLAY_STALE_MS) return { known: false, stale: true, reason: `Last read ${lower(feedbackAge(age))}`, value: 'Stale' };
  const present = (Array.isArray(report.displays) ? report.displays : []).filter(d => d && d.online !== false && d.mirror !== true);
  const mains = present.filter(d => d.main === true), outputs = present.filter(d => d.main !== true);
  return { known: true, age, present, mains, outputs, expected: lanes.filter(l => l.slot).length,
    modes: present.map((d, index) => `${index + 1}${d.main === true ? ' main' : ''}: ${d.resolution || d.pixelResolution || 'mode not reported'}`) };
}

function outputsCheck(displays, lanes, relay, now) {
  const check = { id: 'outputs', label: 'Outputs', short: 'Outputs',
    detail: ['The relay asks the show computer which displays its operating system has connected, at most once every 30 seconds.',
      'The rule used here: one display flagged as main (the control monitor) plus at least one more display for every lane that has a projector assigned.'],
    cannot: ['Whether the playback app has a fullscreen window on each output.', 'Which display feeds which lane.', 'Whether the picture reaches the projector past the adapter and cable.', 'Whether the show computer is locked.'] };
  if (!relay.everConnected) return { ...check, state: 'off', value: 'Waiting', brief: 'Waiting', note: 'No relay data yet' };
  if (!relay.connected) return { ...check, state: 'off', value: 'Unknown', brief: 'Unknown', note: 'Relay not answering' };
  const d = readDisplays(displays, lanes, now);
  if (!d.known) return { ...check, state: d.stale ? 'eye' : 'off', value: d.value, brief: d.value, note: d.reason };
  const read = `read ${lower(feedbackAge(d.age))}`;
  if (!d.expected) return { ...check, state: 'eye', value: `${d.present.length} displays`, brief: `${d.present.length} seen`, note: 'No lanes assigned to compare' };
  if (d.outputs.length < d.expected) return { ...check, state: 'attention', value: `${d.outputs.length} of ${d.expected} outputs`, brief: `${d.outputs.length}/${d.expected}`, note: `Fewer outputs than lanes · ${read}` };
  if (d.mains.length !== 1) return { ...check, state: 'eye', value: `${d.present.length} displays`, brief: `${d.present.length} seen`, note: 'Main display not identified' };
  return { ...check, state: 'ok', value: `${d.outputs.length} outputs + main`, brief: `${d.outputs.length} + main`, note: `Windows not reported · ${read}` };
}

// feed is { status: 'loading' | 'ok' | 'absent' | 'error', data, fetchedAt } where data is GET api/cue-feed.
export function feedState(feed, now = Date.now()) {
  if (!feed || feed.status === 'loading') return { kind: 'loading', text: 'Asking the relay' };
  if (feed.status === 'absent') return { kind: 'not-connected', text: 'This relay has no cue feed' };
  if (feed.status === 'error') return { kind: 'unread', text: 'The cue feed could not be read' };
  if (!Number.isFinite(feed.fetchedAt) || now - feed.fetchedAt > FEED_STALE_MS) return { kind: 'unread', text: 'The cue feed has not been read lately' };
  const data = feed.data || {};
  if (data.state === 'not-configured') return { kind: 'not-connected', text: 'No cue feed is set up on the relay' };
  if (data.state === 'listening') return { kind: 'listening', text: 'Listening' };
  if (data.state === 'stopped') return { kind: 'stopped', text: data.lastRowAt ? `Listener stopped. Last heard ${ago(data.lastRowAt, now)}` : 'Listener stopped. Nothing heard yet' };
  return { kind: 'unread', text: data.reason || 'The observer file could not be read' };
}

function cueCheck(feed, relay, now) {
  const check = { id: 'cues', label: 'Cue link', short: 'Cues',
    detail: ['A listen-only observer on the show computer writes down each MIDI message it hears. The relay reads that record. Nothing on this page sends MIDI.',
      'OK means the listener is running. It also shows the last cue it heard and when.'],
    cannot: ['Whether the playback app followed the cue. A cue that arrived is not a picture that changed.', 'Anything while the listener is stopped.'] };
  if (!relay.everConnected) return { ...check, state: 'off', value: 'Waiting', brief: 'Waiting', note: 'No relay data yet' };
  if (!relay.connected) return { ...check, state: 'off', value: 'Unknown', brief: 'Unknown', note: 'Relay not answering' };
  const state = feedState(feed, now), last = feed?.data?.lastCue;
  if (state.kind === 'loading') return { ...check, state: 'off', value: 'Reading', brief: 'Reading', note: state.text };
  if (state.kind === 'not-connected') return { ...check, state: 'off', value: 'Not connected', brief: 'No feed', note: 'Console cues do not reach this page' };
  if (state.kind === 'unread') return { ...check, state: 'eye', value: 'Not read', brief: 'Not read', note: state.text };
  const heard = last ? `Last: ${lower(cueWords(last))} at ${clockShort(last.at)}` : 'No cue heard yet';
  if (state.kind === 'stopped') return { ...check, state: 'eye', value: 'Listener stopped', brief: 'Stopped', note: `${state.text} · ${lower(heard)}` };
  return { ...check, state: 'ok', value: last ? cueWords(last) : 'Listening', brief: last ? `Cue ${last.cue}` : 'Listening', note: last ? `Heard ${clockShort(last.at)}${last.source ? ` from ${last.source}` : ''} · not proof that video followed` : 'Listening · no cue heard yet' };
}

function computerCheck(relay, now) {
  const check = { id: 'computer', label: 'Show computer', short: 'Relay',
    detail: ['The relay runs on the show computer and sends this page a heartbeat every 5 seconds. A recent heartbeat means that computer is powered, awake and running the relay.'],
    cannot: ['Whether the screen is locked or its displays are asleep.', 'Whether the playback app is open or which show file is loaded.'] };
  if (!relay.everConnected) return { ...check, state: 'off', value: 'Connecting', brief: 'Waiting', note: 'No relay data yet' };
  if (!relay.connected) return { ...check, state: 'attention', value: 'Not answering', brief: 'Lost', note: relay.lastMessageAt ? `Last heard ${lower(feedbackAge(now - relay.lastMessageAt))}` : 'Relay not answering' };
  const since = clockShort(relay.startedAt);
  return { ...check, state: 'ok', value: 'Answering', brief: 'Answering', note: since ? `Relay up since ${since} · lock screen not reported` : 'Lock screen not reported' };
}

// The four go or no-go items, in display order.
export function buildChecks({ lanes, relay, displays, feed, now = Date.now() }) {
  return [lanesCheck(lanes, relay), outputsCheck(displays, lanes, relay, now), cueCheck(feed, relay, now), computerCheck(relay, now)];
}

export function verdictOf(checks, relay) {
  if (!relay.everConnected) return { state: 'off', title: 'Connecting', text: 'Waiting for the relay. Nothing below is a reading yet.' };
  const bad = checks.filter(c => c.state === 'attention');
  if (bad.length) return { state: 'attention', title: 'Attention', text: bad.map(c => `${c.label}: ${c.value}. ${c.note}`).join(' · ') };
  const open = checks.filter(c => c.state !== 'ok');
  if (open.length) return { state: 'eye', title: 'Nothing wrong reported', text: `${open.length} of ${checks.length} need your eyes: ${list(open.map(c => lower(c.label)))}.` };
  return { state: 'ok', title: 'All reported good', text: 'Every item has a current reading.' };
}

// ---- Setup check: pass, fail or cannot check, each with its reading. A line with no rule to judge
// it against is a plain reading. A guess is never a pass.
export const SETUP_WORDS = Object.freeze({ pass: 'Pass', fail: 'Fail', cannot: 'Cannot check', reading: 'Reading' });
export const SETUP_MARKS = Object.freeze({ pass: '✓', fail: '!', cannot: '?', reading: '·' });

export function setupBlocked({ relay, lock }) {
  if (!relay.connected) return 'Relay not answering.';
  if (lock !== false) return lock ? 'Show Lock is on. The setup check is locked.' : 'Show Lock not read.';
  return '';
}

export function setupCheck({ lanes, relay, displays, feed, hostChecks, lock, release, now = Date.now() }) {
  const lines = [], add = (group, id, label, state, reading) => lines.push({ group, id, label, state, reading });
  const system = 'Relay and show computer';
  if (relay.connected) add(system, 'relay', 'Relay', 'pass', `Answering${release ? `, release ${release}` : ''}${clockShort(relay.startedAt) ? `, up since ${clockShort(relay.startedAt)}` : ''}`);
  else add(system, 'relay', 'Relay', 'fail', 'Not answering');
  add(system, 'lock', 'Show Lock', 'reading', lock === true ? 'On' : lock === false ? 'Off' : 'Not read');

  for (const v of lanes) {
    const group = `Lane ${v.lane} · ${v.surface}`, id = name => `${v.lane}-${name}`, live = v.reach === 'live';
    const away = v.reach === 'unassigned' ? 'No projector on this lane' : 'Lane not reachable';
    if (live) add(group, id('reach'), 'Reachable', 'pass', `${v.freshText}${v.model ? `, ${v.model}` : ''}`);
    else if (v.reach === 'unassigned') add(group, id('reach'), 'Reachable', 'cannot', 'No projector on this lane');
    else add(group, id('reach'), 'Reachable', 'fail', `${v.blocked} ${v.freshText}.`);

    if (!live) add(group, id('power'), 'Power', 'cannot', away);
    else if (v.power === 'unknown') add(group, id('power'), 'Power', 'cannot', 'Not reported');
    else add(group, id('power'), 'Power', v.power === 'on' ? 'pass' : 'fail', v.power.toUpperCase());

    if (!live) add(group, id('input'), 'Input', 'cannot', away);
    else if (v.input == null) add(group, id('input'), 'Input', 'cannot', v.link?.id === 'control-port' ? 'Not reported: the control port does not report the input' : 'Not reported');
    else if (!v.expectedInput) add(group, id('input'), 'Input', 'cannot', `Reads ${v.inputText}; the rig has no preferred input to compare`);
    else if (v.input === v.expectedInput.value) add(group, id('input'), 'Input', 'pass', v.inputText);
    else add(group, id('input'), 'Input', 'fail', `${v.inputText}, expected ${v.expectedInput.label}`);

    if (!live) add(group, id('shutter'), 'Shutter', 'cannot', away);
    else if (v.power !== 'on') add(group, id('shutter'), 'Shutter', 'cannot', 'Projector is not ON');
    else if (v.shutter === 'unknown') add(group, id('shutter'), 'Shutter', 'cannot', 'Not reported');
    else add(group, id('shutter'), 'Shutter', v.shutter === 'open' ? 'pass' : 'fail', v.shutter === 'open' ? 'OPEN' : 'CLOSED: dark on stage');

    if (!live) add(group, id('pattern'), 'Test pattern off', 'cannot', away);
    else if (v.pattern == null) add(group, id('pattern'), 'Test pattern off', 'cannot', 'Not reported');
    else add(group, id('pattern'), 'Test pattern off', v.patternFlag ? 'fail' : 'pass', v.patternFlag ? v.patternText : 'Off');

    add(group, id('link'), 'Link', 'reading', v.link ? `${v.link.label}${v.link.unproven ? ' (commands unproven on a rig)' : ''}` : 'Not reported');
  }

  const d = readDisplays(displays, lanes, now);
  if (!d.known) add('Displays', 'displays', 'Outputs present', 'cannot', d.reason);
  else {
    const reading = `${d.present.length} displays · ${d.modes.join(' · ') || 'none listed'}`;
    if (!d.expected) add('Displays', 'displays', 'Outputs present', 'cannot', `${reading} · no lanes assigned to compare`);
    else if (d.outputs.length < d.expected) add('Displays', 'displays', 'Outputs present', 'fail', `${d.outputs.length} outputs for ${d.expected} lanes · ${reading}`);
    else if (d.mains.length !== 1) add('Displays', 'displays', 'Outputs present', 'cannot', `Main display not identified · ${reading}`);
    else add('Displays', 'displays', 'Outputs present', 'pass', reading);
  }

  const state = feedState(feed, now), data = feed?.data || {};
  if (state.kind === 'listening') add('Cues', 'listener', 'Cue listener', 'pass', `Running, last row ${ago(data.lastRowAt, now)}${Number.isInteger(data.sources) ? `, ${data.sources} MIDI ${data.sources === 1 ? 'source' : 'sources'}` : ''}`);
  else if (state.kind === 'stopped') add('Cues', 'listener', 'Cue listener', 'fail', state.text);
  else add('Cues', 'listener', 'Cue listener', 'cannot', state.text);

  const host = hostChecks?.status === 'ok' && Array.isArray(hostChecks.data?.checks) ? hostChecks.data.checks : null;
  for (const [id, label] of [['playback-app', 'Playback app running with its fullscreen outputs'], ['midi-interface', 'MIDI interface present'], ['computer-awake', 'Computer awake and unlocked']]) {
    const found = host?.find(item => item?.id === id);
    if (found && ['pass', 'fail'].includes(found.state)) add(system, id, label, found.state, String(found.reading || '').slice(0, 200) || (found.state === 'pass' ? 'Reported good' : 'Reported not good'));
    else add(system, id, label, 'cannot', found?.reading ? String(found.reading).slice(0, 200) : 'The relay did not answer this check');
  }

  const count = name => lines.filter(line => line.state === name).length;
  const counts = { pass: count('pass'), fail: count('fail'), cannot: count('cannot') };
  return { at: now, lines, counts, summary: `${counts.pass} pass · ${counts.fail} fail · ${counts.cannot} cannot check` };
}

// ---- MIDI test. Nothing is sent: the page waits for a cue the operator fires from the console.
export const MIDI_TEST = Object.freeze({ cue: '999', clear: '999.5', goMs: 30000, clearMs: 60000 });
const RUNNING = ['waiting-go', 'waiting-clear'];
export const midiTestRunning = test => RUNNING.includes(test?.phase);

export function midiTestBlocked({ relay, lock, feed, now = Date.now() }) {
  if (!relay.connected) return 'Relay not answering.';
  if (lock !== false) return lock ? 'Show Lock is on. The MIDI test is locked.' : 'Show Lock not read.';
  const state = feedState(feed, now);
  if (state.kind === 'listening') return '';
  if (state.kind === 'not-connected') return 'No cue feed is connected, so a cue cannot be seen arriving.';
  if (state.kind === 'stopped') return 'The listener has stopped, so a cue cannot be seen arriving.';
  return `${state.text}.`;
}

export function midiTestStart(feed, now = Date.now()) {
  return { phase: 'waiting-go', startedAt: now, feedId: feed.data.feedId, afterSeq: feed.data.seq, go: null, clear: null, endedAt: null };
}

const heard = (data, afterSeq, cue) => (Array.isArray(data?.recent) ? data.recent : []).find(m => m.seq > afterSeq && m.command === 'go' && m.cue === cue);

// Advance a running test against the latest copy of the feed. An arrival is looked for before any timeout.
export function midiTestStep(test, feed, now = Date.now()) {
  if (!midiTestRunning(test)) return test;
  const data = feed?.status === 'ok' ? feed.data : null, end = (phase, extra = {}) => ({ ...test, ...extra, phase, endedAt: now });
  if (data && data.feedId !== test.feedId) return end('interrupted');
  if (test.phase === 'waiting-go') {
    const go = heard(data, test.afterSeq, MIDI_TEST.cue);
    if (go) return { ...test, phase: 'waiting-clear', go: { seq: go.seq, at: go.at, source: go.source || '' }, goSeenAt: now };
    if (now - test.startedAt >= MIDI_TEST.goMs) return end(feedState(feed, now).kind === 'listening' ? 'timeout' : 'stopped');
    return test;
  }
  const clear = heard(data, test.go.seq, MIDI_TEST.clear);
  if (clear) return end('cleared', { clear: { seq: clear.seq, at: clear.at, source: clear.source || '' } });
  if (now - test.goSeenAt >= MIDI_TEST.clearMs) return end('clear-missing');
  return test;
}

// What the MIDI test panel says. state is one of the strip's four state words.
export function midiTestView(test, { feed, relay, lock, now = Date.now() }) {
  const blocked = midiTestBlocked({ relay, lock, feed, now }), left = ms => Math.max(0, Math.ceil(ms / 1000));
  const arrived = test?.go ? `Cue ${MIDI_TEST.cue} arrived at ${clockSeconds(test.go.at)}${test.go.source ? ` from ${test.go.source}` : ''}.` : '';
  const picture = 'An arrival is not a picture. If the test picture did not appear, the cue reached the show computer and the playback app did not act on it: check the playback app.';
  const when = hit => hit ? `${clockSeconds(hit.at)}${hit.source ? ` · from ${hit.source}` : ''}` : '';
  const steps = (go, clear, goDetail = when(test?.go), clearDetail = when(test?.clear)) => [
    { label: `Cue ${MIDI_TEST.cue} arrives`, state: go, detail: goDetail }, { label: `Clear cue ${MIDI_TEST.clear} arrives`, state: clear, detail: clearDetail }];
  switch (test?.phase) {
    case 'waiting-go': { const count = left(test.startedAt + MIDI_TEST.goMs - now);
      return { state: 'eye', running: true, count, title: `Fire cue ${MIDI_TEST.cue} on the console now`, text: `Waiting ${count} s for it to arrive.`, hint: 'This page sends nothing. It only watches for the cue.', steps: steps('wait', 'idle', `${count} s left`) }; }
    case 'waiting-clear': { const count = left(test.goSeenAt + MIDI_TEST.clearMs - now);
      return { state: 'ok', running: true, count, title: 'Pass: the cue arrived', text: `${arrived} Now fire the clear cue ${MIDI_TEST.clear}. Waiting ${count} s.`, hint: picture, steps: steps('pass', 'wait', undefined, `${count} s left`) }; }
    case 'cleared': return { state: 'ok', running: false, title: 'Pass: cue and clear both arrived', text: `${arrived} Clear cue ${MIDI_TEST.clear} arrived at ${clockSeconds(test.clear.at)}.`, hint: picture, steps: steps('pass', 'pass') };
    case 'clear-missing': return { state: 'attention', running: false, title: 'The cue arrived. The clear cue did not', text: `${arrived} Clear cue ${MIDI_TEST.clear} was not seen in ${MIDI_TEST.clearMs / 1000} s. The test picture may still be up: fire ${MIDI_TEST.clear} and look.`, hint: picture, steps: steps('pass', 'fail') };
    case 'timeout': return { state: 'attention', running: false, title: `Timed out: cue ${MIDI_TEST.cue} did not arrive`, text: `Nothing arrived in ${MIDI_TEST.goMs / 1000} s while the listener was running. Check the console side: the cue on the console, the cable, and the MIDI interface.`, hint: 'The playback app is not the cause when nothing arrives.', steps: steps('fail', 'idle') };
    case 'stopped': return { state: 'eye', running: false, title: 'No result: the listener stopped', text: 'The listener stopped during the test, so the page could not see whether the cue arrived. This is not a failed cue.', hint: 'Start the listener on the show computer, then test again.', steps: steps('cannot', 'idle') };
    case 'interrupted': return { state: 'eye', running: false, title: 'No result: the relay restarted', text: 'The relay restarted during the test. Start the test again.', hint: '', steps: steps('cannot', 'idle') };
    case 'cancelled': return { state: 'off', running: false, title: 'Test stopped', text: test.go ? `${arrived} Stopped before the clear cue.` : 'Stopped before a cue arrived. No result.', hint: test.go ? picture : '', steps: steps(test.go ? 'pass' : 'idle', 'idle') };
    default: return { state: 'off', running: false, title: 'Not run yet', text: blocked || `Tap Start, then fire cue ${MIDI_TEST.cue} on the console inside ${MIDI_TEST.goMs / 1000} seconds.`, hint: 'This page sends nothing. It only watches for the cue.', steps: steps('idle', 'idle') };
  }
}

// "Last cue received" and the recent messages, for the MIDI test tab.
export function feedView(feed, now = Date.now()) {
  const state = feedState(feed, now), data = feed?.status === 'ok' ? feed.data || {} : {};
  const connected = state.kind === 'listening' || state.kind === 'stopped';
  const last = connected ? data.lastCue : null;
  return {
    kind: state.kind, tone: state.kind === 'listening' ? 'ok' : state.kind === 'stopped' || state.kind === 'unread' ? 'eye' : 'off',
    title: state.kind === 'listening' ? 'Listening' : state.kind === 'stopped' ? 'Listener stopped' : state.kind === 'not-connected' ? 'Not connected' : state.kind === 'loading' ? 'Reading' : 'Not read',
    text: state.kind === 'listening' ? `Last row ${ago(data.lastRowAt, now)}${Number.isInteger(data.sources) ? ` · ${data.sources} MIDI ${data.sources === 1 ? 'source' : 'sources'}` : ''}${data.sourceNames?.length ? ` · ${data.sourceNames.join(', ')}` : ''}` : state.text,
    lastCue: last ? { title: cueWords(last), text: `${clockSeconds(last.at)}${last.source ? ` · from ${last.source}` : ''} · ${ago(last.at, now)}` }
      : { title: connected ? 'No cue heard yet' : 'Not available', text: connected ? 'Nothing has arrived since the listener started.' : 'There is no cue feed to read.' },
    recent: connected && Array.isArray(data.recent) ? data.recent.slice(-12).reverse().map(m => ({ seq: m.seq, text: cueWords(m), meta: `${clockSeconds(m.at)}${m.source ? ` · ${m.source}` : ''}` })) : [],
  };
}
