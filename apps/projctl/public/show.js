// Show backup page. Reads the relay's snapshot and sends two kinds of command through the shared
// projector control component: power and shutter, each after a two-step confirm. Input, pattern,
// lens, schedules and Show Lock are not reachable from this file. Nothing here sends MIDI.
import { createConnectionMonitor } from './projector-connection.js';
import { createProjectorControl } from './projector-control.js';
import { createKnow } from './show-know.js';
import { STATE_WORDS, STATE_MARKS, SETUP_WORDS, SETUP_MARKS, laneViews, buildChecks, verdictOf, setupCheck, setupBlocked,
  midiTestBlocked, midiTestStart, midiTestStep, midiTestView, midiTestRunning, feedView, clockSeconds } from './show-model.js';

const SILENT_MS = 15000;       // the relay sends a heartbeat every 5 s
const DISPLAY_POLL_MS = 30000; // the relay caches its display report for 30 s
const FEED_POLL_MS = 5000;     // the cue feed, while nothing is being tested
const FEED_TEST_MS = 1000;     // the cue feed, while a MIDI test is waiting
const FEED_ABSENT_MS = 60000;  // a relay without the route is asked again once a minute
const TABS = ['control', 'setup', 'midi', 'know'];

const $ = (selector, root = document) => root.querySelector(selector);
function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text != null) node.textContent = text;
  return node;
}
const put = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const mark = (node, name, value) => { if (value == null) node.removeAttribute(name); else if (node.getAttribute(name) !== value) node.setAttribute(name, value); };
const reveal = (node, visible) => { if (node.hidden === visible) node.hidden = !visible; };
const say = text => { const live = $('#sb-live'); live.textContent = ''; live.textContent = text; };
const tickClock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' });

const monitor = createConnectionMonitor();
const relay = { connected: false, everConnected: false, lastMessageAt: 0, startedAt: null };
let snapshot = null, socket = null, socketOpen = false, heard = false, openedAt = 0, generation = 0, retry = 0, leaving = false;
// Relay clock minus this device's clock. Reply ages are measured on the relay's clock, so a tablet
// with a wrong clock cannot make a fresh reply look stale or a stale one look fresh.
let clockOffset = 0, clockPrecise = false;
let displays = { status: 'loading' }, feed = { status: 'loading' }, hostChecks = { status: 'loading' };
let lanes = [], checks = [], verdict = null, openCheck = null, detailKey = '';
let setupResult = null, setupRunning = false, midiTest = null, feedTimer = 0, feedBusy = false, tab = 'control';
const relayNow = () => Date.now() + clockOffset;
const lockState = () => !relay.connected || !snapshot ? null : !!snapshot.lock;

// ---- Relay requests
function signIn() {
  if (leaving) return;
  leaving = true;
  location.href = `login.html?next=${encodeURIComponent(location.pathname + location.hash)}`;
}
// The one write this page makes. The control component decides what goes in it: power or shutter, one lane.
async function postCommand(body) {
  const response = await fetch('api/command', { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(20000), body: JSON.stringify(body) });
  if (response.status === 401) signIn();
  return { status: response.status, body: await response.json().catch(() => ({})) };
}
// A read that never throws: { status: 'ok', data } or 'absent' (an older relay) or 'error'.
async function readJson(route, timeout = 12000) {
  try {
    const response = await fetch(route, { cache: 'no-store', signal: AbortSignal.timeout(timeout) });
    if (response.status === 401) { signIn(); return { status: 'error' }; }
    if (response.status === 404) return { status: 'absent' };
    if (!response.ok) return { status: 'error' };
    syncClock(response.headers.get('date'), false);
    return { status: 'ok', data: await response.json(), fetchedAt: relayNow() };
  } catch { return { status: 'error' }; }
}

const control = createProjectorControl({ root: $('#pc-root'), pick: $('#pc-pick'), post: postCommand, announce: say, relayNow,
  sharedNote: 'Shared sign-in: the relay logs the command, not who sent it.' });
const know = createKnow({ panel: $('#know'), list: $('#sb-know-list'), status: $('#sb-know-status'), title: $('#sb-know-title'), tools: $('#sb-know-tools'), stage: $('#sb-know-stage'), back: $('#sb-know-back'), onSignedOut: signIn });

// ---- Go or no-go strip: built once, then only text and attributes change, so focus survives.
const checkNodes = new Map();
function checkNode(check) {
  if (checkNodes.has(check.id)) return checkNodes.get(check.id);
  const button = el('button', { type: 'button', class: 'sb-check', 'data-check': check.id, 'data-state': 'off', 'aria-haspopup': 'dialog' });
  const sign = el('span', { class: 'sb-check__mark', 'aria-hidden': 'true' }), label = el('span', { class: 'sb-check__label' }), value = el('strong', { class: 'sb-check__value' });
  label.append(el('span', { class: 'sb-long' }, check.label), el('span', { class: 'sb-short' }, check.short));
  button.append(sign, label, value);
  const item = el('li'); item.append(button); $('#sb-check-list').append(item);
  const nodes = { button, sign, value };
  checkNodes.set(check.id, nodes);
  return nodes;
}

// ---- Render
function render() {
  const local = Date.now(), now = local + clockOffset;
  // Connected means this socket has delivered something recently. A reopened socket that has said nothing yet does not count.
  relay.connected = socketOpen && heard && local - relay.lastMessageAt <= SILENT_MS;
  lanes = laneViews(snapshot, { relayConnected: relay.connected, everConnected: relay.everConnected, monitor, now });
  const relayView = { ...relay, lastMessageAt: relay.lastMessageAt + clockOffset }, lock = lockState();
  checks = buildChecks({ lanes, relay: relayView, displays, feed, now });
  verdict = verdictOf(checks, relay);

  const lockNode = $('#sb-lock'), lockWord = lock === true ? 'on' : lock === false ? 'off' : 'unknown';
  mark(lockNode, 'data-lock', lockWord);
  put($('[data-f=word]', lockNode), lock === true ? 'Lock ON' : lock === false ? 'Lock off' : 'Lock unknown'); // "Show " sits in the markup and drops out on a phone
  mark(lockNode, 'title', 'While Show Lock is on, this page locks power, every all-lanes action, the MIDI test and the setup check. Shutters for one lane stay available.');
  reveal($('#sb-sim'), !!snapshot?.simulation);
  put($('#sb-clock'), tickClock.format(new Date(now)));

  const verdictNode = $('#sb-verdict');
  mark(verdictNode, 'data-state', verdict.state);
  put($('[data-f=title]', verdictNode), verdict.title);
  put($('[data-f=short]', verdictNode), verdict.short);
  put($('[data-f=text]', verdictNode), verdict.text);
  mark(verdictNode, 'title', `${verdict.title}. ${verdict.text}`);
  for (const check of checks) {
    const nodes = checkNode(check);
    mark(nodes.button, 'data-state', check.state);
    put(nodes.sign, STATE_MARKS[check.state]);
    put(nodes.value, check.brief);
    mark(nodes.button, 'aria-label', `${check.label}: ${STATE_WORDS[check.state]}. ${check.value}. ${check.note}.`);
    mark(nodes.button, 'title', `${check.value}. ${check.note}.`);
  }
  if (openCheck) fillDetail();

  control.render({ views: lanes, lock, local });
  renderSetup(relayView, lock);
  renderMidi(relayView, lock, now);
}

// ---- Setup check: one press, a list of pass, fail or cannot check. It reads; it sends nothing to a projector.
function renderSetup(relayView, lock) {
  const blocked = setupRunning ? 'Checking.' : setupBlocked({ relay: relayView, lock }), button = $('#sb-setup-run');
  mark(button, 'aria-disabled', String(!!blocked));
  mark(button, 'aria-busy', setupRunning ? 'true' : null);
  put(button, setupResult ? 'Run setup check again' : 'Run setup check');
  put($('#sb-setup-why'), setupRunning ? 'Asking the relay.' : blocked);
  put($('#sb-setup-summary'), setupResult ? `${setupResult.summary} · checked ${clockSeconds(setupResult.at)}` : 'Not run yet.');
  mark($('#sb-setup-summary'), 'data-state', !setupResult ? 'off' : setupResult.counts.fail ? 'attention' : setupResult.counts.cannot ? 'eye' : 'ok');
}
function drawSetup(result) {
  const groups = new Map();
  for (const line of result.lines) { if (!groups.has(line.group)) groups.set(line.group, []); groups.get(line.group).push(line); }
  const nodes = [];
  for (const [name, lines] of groups) {
    const section = el('section', { class: 'sb-group' }), items = el('ul', { class: 'sb-lines' });
    const worst = lines.some(line => line.state === 'fail') ? 'fail' : lines.some(line => line.state === 'cannot') ? 'cannot' : 'pass';
    section.dataset.state = worst;
    section.append(el('h3', { class: 'sb-group__h' }, name));
    for (const line of lines) {
      const item = el('li', { class: 'sb-line', 'data-state': line.state, 'data-line': line.id });
      item.append(el('span', { class: 'sb-line__mark', 'aria-hidden': 'true' }, SETUP_MARKS[line.state]), el('span', { class: 'sb-line__label' }, line.label),
        el('span', { class: 'sb-line__state' }, SETUP_WORDS[line.state]), el('span', { class: 'sb-line__reading' }, line.reading));
      items.append(item);
    }
    section.append(items);
    nodes.push(section);
  }
  $('#sb-setup-list').replaceChildren(...nodes);
  reveal($('#sb-setup-empty'), false);
}
async function runSetup() {
  render();
  if (setupRunning || setupBlocked({ relay, lock: lockState() })) { say($('#sb-setup-why').textContent); return; }
  setupRunning = true;
  render();
  // Fresh copies of everything the relay answers by request; lane readings come from the live snapshot.
  [displays, feed, hostChecks] = await Promise.all([readDisplayReport(), readJson('api/cue-feed'), readJson('api/host-checks')]);
  setupRunning = false;
  render();
  setupResult = setupCheck({ lanes, relay: { ...relay, lastMessageAt: relay.lastMessageAt + clockOffset }, displays, feed, hostChecks, lock: lockState(), release: snapshot?.relay?.release?.version || snapshot?.relay?.release?.id || '', now: relayNow() });
  drawSetup(setupResult);
  render();
  say(`Setup check done. ${setupResult.summary}.`);
}
$('#sb-setup-run').addEventListener('click', runSetup);

// ---- MIDI test and the cue feed. The page only reads what the listener saw.
const stepNodes = [0, 1].map(() => {
  const item = el('li', { class: 'sb-step', 'data-state': 'idle' }), sign = el('span', { class: 'sb-step__mark', 'aria-hidden': 'true' }), label = el('span', { class: 'sb-step__label' }), word = el('span', { class: 'sb-step__word' });
  const long = el('span', { class: 'sb-step__long' }), short = el('span', { class: 'sb-step__short', 'aria-hidden': 'true' });
  label.append(long, short);
  item.append(sign, label, word);
  $('#sb-midi-steps').append(item);
  return { item, sign, long, short, word };
});
// A button with a long label and a short one for a tiny screen; the style sheet shows one of them.
const twoLabels = (node, long, short) => { put($('.sb-tl', node), long); put($('.sb-ts', node), short); };
const STEP = { idle: ['·', 'Not yet'], wait: ['…', 'Waiting'], pass: ['✓', 'Pass'], fail: ['!', 'Did not arrive'], cannot: ['?', 'Cannot tell'] };
let recentKey = '';
function renderMidi(relayView, lock, now) {
  if (midiTestRunning(midiTest)) {
    const next = midiTestStep(midiTest, feed, now);
    if (next !== midiTest) { midiTest = next; const view = midiTestView(midiTest, { feed, relay: relayView, lock, now }); say(`${view.title}. ${view.text}`); scheduleFeed(0); }
  }
  const view = midiTestView(midiTest, { feed, relay: relayView, lock, now }), blocked = midiTestBlocked({ relay: relayView, lock, feed, now });
  mark($('#sb-midi-test'), 'data-state', view.state);
  put($('#sb-midi-title'), view.title);
  put($('#sb-midi-text'), view.running || midiTest ? view.text : blocked || view.text);
  put($('#sb-midi-hint'), view.hint);
  put($('#sb-midi-tip'), view.tip);
  twoLabels($('#sb-midi-stop'), view.running ? `Stop test (${view.count})` : 'Stop test', view.running ? `Stop (${view.count})` : 'Stop');
  // On a small screen the longer explanation sits behind "What this means"; the dialog follows the test live.
  put($('#sb-midi-more-title'), view.title); put($('#sb-midi-more-text'), $('#sb-midi-text').textContent); put($('#sb-midi-more-hint'), view.hint);
  view.steps.forEach((step, index) => {
    const nodes = stepNodes[index];
    mark(nodes.item, 'data-state', step.state);
    put(nodes.sign, STEP[step.state][0]); put(nodes.long, step.label); put(nodes.short, step.short); put(nodes.word, [STEP[step.state][1], step.detail].filter(Boolean).join(' · '));
  });
  const start = $('#sb-midi-start');
  reveal(start, !view.running); reveal($('#sb-midi-stop'), view.running);
  mark(start, 'aria-disabled', String(!!blocked));
  twoLabels(start, midiTest ? 'Start MIDI test again' : 'Start MIDI test', midiTest ? 'Again' : 'Start');
  mark(start, 'title', blocked || null);

  const seen = feedView(feed, now);
  mark($('#sb-feed'), 'data-tone', seen.tone);
  put($('#sb-feed-title'), seen.title); put($('#sb-feed-text'), seen.text);
  put($('#sb-last-title'), seen.lastCue.title); put($('#sb-last-text'), seen.lastCue.text);
  const key = seen.recent.map(item => item.seq).join(',');
  if (key !== recentKey) {
    recentKey = key;
    $('#sb-recent').replaceChildren(...seen.recent.map(item => { const row = el('li', { class: 'sb-recent__row' }); row.append(el('strong', {}, item.text), el('span', {}, item.meta)); return row; }));
  }
  reveal($('#sb-recent-empty'), !seen.recent.length);
  put($('#sb-recent-empty'), seen.kind === 'listening' || seen.kind === 'stopped' ? 'No Show Control message heard yet.' : 'There is no cue feed to list.');
}
$('#sb-midi-start').addEventListener('click', async () => {
  render();
  const blocked = midiTestBlocked({ relay, lock: lockState(), feed, now: relayNow() });
  if (blocked) { put($('#sb-midi-text'), blocked); say(blocked); return; }
  // Start from a fresh copy of the feed, so a cue that arrived before the tap can never count.
  const fresh = await readJson('api/cue-feed');
  if (fresh.status !== 'ok' || fresh.data?.state !== 'listening') { feed = fresh; render(); say('The cue feed could not be read. The test did not start.'); return; }
  feed = fresh;
  midiTest = midiTestStart(feed, relayNow());
  render();
  scheduleFeed(0);
  $('#sb-midi-stop').focus();
  say('MIDI test started. Fire cue 999 on the console now. This page sends nothing.');
});
$('#sb-midi-stop').addEventListener('click', () => {
  if (!midiTestRunning(midiTest)) return;
  midiTest = { ...midiTest, phase: 'cancelled', endedAt: relayNow() };
  render();
  $('#sb-midi-start').focus();
  say('Test stopped.');
});
async function pollFeed() {
  if (feedBusy) return;
  feedBusy = true;
  const next = await readJson('api/cue-feed', 8000);
  feedBusy = false;
  feed = next;
  render();
  scheduleFeed();
}
function scheduleFeed(delay) {
  clearTimeout(feedTimer);
  feedTimer = setTimeout(pollFeed, delay ?? (midiTestRunning(midiTest) ? FEED_TEST_MS : feed.status === 'absent' ? FEED_ABSENT_MS : FEED_POLL_MS));
}

// ---- Relay connection
// A heartbeat carries the relay's time to the millisecond. Until one arrives, an HTTP Date header
// (whole seconds) is close enough against a 15 second freshness limit.
function syncClock(value, precise) {
  const at = typeof value === 'string' ? Date.parse(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(at) || (clockPrecise && !precise)) return;
  clockOffset = at - Date.now();
  clockPrecise = clockPrecise || precise;
}
function receive(message) {
  if (!message || typeof message !== 'object') return;
  if (message.type === 'snapshot' && Array.isArray(message.projectors)) {
    snapshot = message; relay.everConnected = true; relay.startedAt = message.relay?.startedAt ?? null;
  } else if (!snapshot) return;
  else if (message.type === 'heartbeat') syncClock(message.at, true);
  else if (message.type === 'status' && typeof message.slot === 'string' && message.status && typeof message.status === 'object') {
    const projector = snapshot.projectors.find(p => p.slot === message.slot);
    if (projector) projector.status = message.status;
  } else return; // events, lens activity and schedules are not shown here
  relay.lastMessageAt = Date.now(); heard = true;
  render();
}
function connect() {
  const mine = ++generation;
  const again = () => { if (mine === generation) setTimeout(connect, Math.min(5000, 500 * 2 ** retry++)); };
  const url = new URL('ws', location.href);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'; url.search = ''; url.hash = '';
  let ws;
  try { ws = new WebSocket(url); } catch { again(); return; }
  socket = ws;
  ws.addEventListener('open', () => { if (mine === generation) { socketOpen = true; heard = false; openedAt = Date.now(); retry = 0; readCrewLinks(); scheduleFeed(0); } });
  ws.addEventListener('message', event => {
    if (mine !== generation) return;
    try { receive(JSON.parse(event.data)); } catch { /* an unreadable frame is not a reading */ }
  });
  ws.addEventListener('close', () => {
    if (mine !== generation) return;
    socketOpen = false; heard = false; render();
    // A relay restart ends every session; a 401 here means sign in again, not "relay offline".
    fetch('api/state', { cache: 'no-store', signal: AbortSignal.timeout(4000) }).then(response => { if (response.status === 401) signIn(); }).catch(() => {});
    again();
  });
}
// A socket that stays open but silent is treated as lost: drop it and dial again.
function dropSilentSocket() {
  if (!socketOpen || Date.now() - Math.max(relay.lastMessageAt, openedAt) <= SILENT_MS) return;
  socketOpen = false; heard = false;
  try { socket?.close(); } catch { /* already closed */ }
  connect();
}
async function readDisplayReport() {
  const answer = await readJson('api/host-displays');
  return answer.status === 'ok' && answer.data?.scope === 'relay-computer' ? answer : { status: 'error', error: 'Display report failed' };
}
async function readDisplays() { displays = await readDisplayReport(); render(); }

// ---- Crew notes link: optional, from the relay's private settings. The page never requests the
// address itself; it only becomes the target of a link, and only if it is plain http or https.
function notesAddress(value) {
  if (typeof value !== 'string' || value.length > 300) return null;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
async function readCrewLinks() {
  let address = null;
  try {
    const response = await fetch('api/crew-links', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (response.ok) address = notesAddress((await response.json())?.notes?.url); // 404 on an older relay, 401 when signed out: both mean no link
  } catch { address = null; }
  const link = $('#sb-notes-link');
  mark(link, 'href', address);
  reveal($('#sb-notes'), !!address);
}

// ---- Go or no-go details
function fillDetail() {
  const check = checks.find(c => c.id === openCheck), dialog = $('#sb-detail');
  if (!check) return;
  put($('[data-f=state]', dialog), STATE_WORDS[check.state]);
  mark($('[data-f=state]', dialog), 'data-state', check.state);
  put($('[data-f=title]', dialog), check.label);
  put($('[data-f=value]', dialog), `${check.value}. ${check.note}.`);
  if (check.id === detailKey) return;
  detailKey = check.id;
  $('[data-f=detail]', dialog).replaceChildren(...check.detail.map(text => el('p', {}, text)));
  $('[data-f=cannot]', dialog).replaceChildren(...check.cannot.map(text => el('li', {}, text)));
}
$('#sb-check-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-check]');
  if (!button) return;
  openCheck = button.dataset.check;
  fillDetail();
  $('#sb-detail').showModal();
});
$('#sb-detail').addEventListener('close', () => { openCheck = null; });
$('#sb-shared').addEventListener('click', () => $('#sb-shared-note').showModal());
$('#sb-midi-more').addEventListener('click', () => $('#sb-midi-detail').showModal());
// A tiny screen shows the test or what was heard, one at a time.
for (const button of document.querySelectorAll('[data-midi-view]')) button.addEventListener('click', () => {
  mark($('#midi'), 'data-midi', button.dataset.midiView);
  $(button.dataset.midiView === 'feed' ? '#sb-midi-back' : '#sb-midi-heard').focus();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) control.cancelArmed(); });

// ---- Tabs. The open tab is kept in the address, so a reload or a sign-in returns to it.
const tabButtons = TABS.map(id => $(`#t-${id}`));
function showTab(id, { focusPanel = false, push = true } = {}) {
  tab = TABS.includes(id) ? id : 'control';
  for (const button of tabButtons) {
    const on = button.getAttribute('aria-controls') === tab;
    mark(button, 'aria-selected', String(on));
    button.tabIndex = on ? 0 : -1;
    $(`#${button.getAttribute('aria-controls')}`).hidden = !on;
  }
  mark($('.sb-shell'), 'data-tab', tab);
  if (push && location.hash !== `#${tab}`) history.pushState(null, '', `#${tab}`);
  if (tab === 'know') know.load();
  if (focusPanel) $(`#${tab}`).focus();
}
tabButtons.forEach((button, index) => {
  button.addEventListener('click', () => showTab(button.getAttribute('aria-controls'), { focusPanel: true }));
  button.addEventListener('keydown', event => {
    const to = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }[event.key];
    if (to == null) return;
    event.preventDefault();
    const next = tabButtons[(to + TABS.length) % TABS.length];
    next.focus();
    showTab(next.getAttribute('aria-controls'));
  });
});
addEventListener('popstate', () => showTab(location.hash.slice(1), { push: false }));

showTab(location.hash.slice(1), { push: false });
render();
connect();
readDisplays();
setInterval(readDisplays, DISPLAY_POLL_MS);
setInterval(() => { dropSilentSocket(); render(); }, 1000);
