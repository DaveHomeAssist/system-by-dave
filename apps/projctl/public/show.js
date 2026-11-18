// Show backup page. Reads the relay's snapshot and sends one kind of command: a shutter move
// for one lane, after a two-step confirm. Power, input, pattern, lens, schedules and Show Lock
// are not reachable from this file.
import { LANES } from './lanes.js';
import { createConnectionMonitor } from './projector-connection.js';
import { STATE_WORDS, MOVE_CONFIRM_MS, MOVE_GUARD_MS, MOVE_REPORT_MS, laneViews, buildChecks, verdictOf, snapshotText, smsHref, clockShort } from './show-model.js';

const SILENT_MS = 15000;       // the relay sends a heartbeat every 5 s
const DISPLAY_POLL_MS = 30000; // the relay caches its display report for 30 s
const RESULT_MS = 20000;       // how long a finished move's result stays on the card

const $ = (selector, root = document) => root.querySelector(selector);
function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text != null) node.textContent = text;
  return node;
}
const put = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const mark = (node, name, value) => { if (node.getAttribute(name) !== value) node.setAttribute(name, value); };
const reveal = (node, visible) => { if (node.hidden === visible) node.hidden = !visible; };
const say = text => { const live = $('#sb-live'); live.textContent = ''; live.textContent = text; };
const tickClock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' });

const monitor = createConnectionMonitor();
const relay = { connected: false, everConnected: false, lastMessageAt: 0, startedAt: null };
const moves = new Map(); // lane -> { phase, arg, verb, slot, revision, armedAt, sentAt, until, message }
let snapshot = null, socket = null, socketOpen = false, heard = false, openedAt = 0, generation = 0, retry = 0, leaving = false;
// Relay clock minus this device's clock. Reply ages are measured on the relay's clock, so a tablet
// with a wrong clock cannot make a fresh reply look stale or a stale one look fresh.
let clockOffset = 0, clockPrecise = false;
let displays = { status: 'loading' };
let lanes = [], checks = [], verdict = null, lastMove = null, openCheck = null, detailKey = '', solo = 'A';

// ---- Build the fixed parts once; later renders only change text and attributes, so focus survives.
const laneNodes = new Map();
for (const lane of Object.keys(LANES)) {
  const card = el('article', { class: 'sb-lane', 'data-lane': lane, 'data-tone': 'off', 'data-reach': 'connecting', 'aria-labelledby': `sb-lane-${lane}-name` });
  const head = el('header', { class: 'sb-lane__head' });
  const name = el('h3', { class: 'sb-lane__name', id: `sb-lane-${lane}-name` });
  name.append(el('span', { class: 'sb-sr' }, `Lane ${lane}, `), LANES[lane].target);
  const model = el('p', { class: 'sb-lane__model' });
  head.append(el('span', { class: 'sb-lane__letter', 'aria-hidden': 'true' }, lane), name, model);
  const headline = el('p', { class: 'sb-lane__state' });
  const shutter = el('p', { class: 'sb-lane__shutter' });
  const fresh = el('p', { class: 'sb-lane__fresh' });
  const alarm = el('p', { class: 'sb-lane__alarm', hidden: '' });
  const why = el('p', { class: 'sb-lane__why', id: `sb-lane-${lane}-why` });
  // aria-disabled, not disabled: the button stays reachable by keyboard so its reason can be read.
  const arm = el('button', { type: 'button', class: 'sb-btn sb-btn--move', 'data-act': 'arm', 'aria-describedby': why.id, 'aria-disabled': 'true' }, 'Close shutter');
  const confirm = el('button', { type: 'button', class: 'sb-btn sb-btn--confirm', 'data-act': 'confirm', hidden: '' });
  const cancel = el('button', { type: 'button', class: 'sb-btn sb-btn--quiet', 'data-act': 'cancel', hidden: '' }, 'Cancel');
  const move = el('div', { class: 'sb-lane__move' });
  move.append(arm, confirm, cancel);
  const inner = el('div', { class: 'sb-lane__in' }); // the card is a size container, so its layout lives one level in
  inner.append(head, headline, shutter, fresh, alarm, move, why);
  card.append(inner);
  $('#sb-lane-list').append(card);
  const pick = el('button', { type: 'button', class: 'sb-pick__btn', 'data-pick': lane, 'data-tone': 'off', 'aria-pressed': 'false' }, lane);
  $('#sb-pick').append(pick);
  laneNodes.set(lane, { card, model, headline, shutter, fresh, alarm, why, arm, confirm, cancel, pick });
}
const checkNodes = new Map();
function checkNode(check) {
  if (checkNodes.has(check.id)) return checkNodes.get(check.id);
  const button = el('button', { type: 'button', class: 'sb-check', 'data-check': check.id, 'data-state': 'off', 'aria-haspopup': 'dialog' });
  const label = el('span', { class: 'sb-check__label' }, check.label), state = el('span', { class: 'sb-check__state' });
  const value = el('strong', { class: 'sb-check__value' }), note = el('span', { class: 'sb-check__note' });
  button.append(label, state, value, note);
  const item = el('li'); item.append(button); $('#sb-check-list').append(item);
  const nodes = { button, state, value, note };
  checkNodes.set(check.id, nodes);
  return nodes;
}

// ---- Render
function render() {
  const local = Date.now(), now = local + clockOffset;
  // Connected means this socket has delivered something recently. A reopened socket that has said nothing yet does not count.
  relay.connected = socketOpen && heard && local - relay.lastMessageAt <= SILENT_MS;
  lanes = laneViews(snapshot, { relayConnected: relay.connected, everConnected: relay.everConnected, monitor, now });
  settleMoves(local);
  checks = buildChecks({ lanes, relay: { ...relay, lastMessageAt: relay.lastMessageAt + clockOffset }, displays, now });
  verdict = verdictOf(checks, relay);

  const lock = !relay.connected || !snapshot ? 'unknown' : snapshot.lock ? 'on' : 'off';
  const lockNode = $('#sb-lock');
  mark(lockNode, 'data-lock', lock);
  put(lockNode, lock === 'on' ? 'Show Lock ON' : lock === 'off' ? 'Show Lock off' : 'Show Lock unknown');
  mark(lockNode, 'title', 'Show Lock blocks power off, input, pattern and lens commands at the relay. Shutter moves stay available.');
  reveal($('#sb-sim'), !!snapshot?.simulation);
  put($('#sb-clock'), tickClock.format(new Date(now)));

  const verdictNode = $('#sb-verdict');
  mark(verdictNode, 'data-state', verdict.state);
  put($('[data-f=title]', verdictNode), verdict.title);
  put($('[data-f=text]', verdictNode), verdict.text);
  mark(verdictNode, 'title', `${verdict.title}. ${verdict.text}`);

  for (const check of checks) {
    const nodes = checkNode(check);
    mark(nodes.button, 'data-state', check.state);
    put(nodes.state, STATE_WORDS[check.state]);
    put(nodes.value, check.value);
    put(nodes.note, check.note);
  }
  for (const view of lanes) renderLane(view, local);
  if (openCheck) fillDetail();
}

function renderLane(view, local) {
  const nodes = laneNodes.get(view.lane), move = moves.get(view.lane), phase = move?.phase || 'idle';
  mark(nodes.card, 'data-tone', view.tone);
  mark(nodes.card, 'data-reach', view.reach);
  mark(nodes.card, 'data-phase', phase);
  if (view.lane === solo) mark(nodes.card, 'data-selected', ''); else nodes.card.removeAttribute('data-selected');
  mark(nodes.pick, 'data-tone', view.tone);
  mark(nodes.pick, 'aria-pressed', String(view.lane === solo));
  mark(nodes.pick, 'aria-label', `Lane ${view.lane}, ${view.surface}: ${view.headline}`);
  put(nodes.model, view.model);
  put(nodes.headline, view.headline);
  put(nodes.shutter, view.shutterText);
  put(nodes.fresh, view.freshText);
  reveal(nodes.alarm, !!view.alarm);
  put(nodes.alarm, view.alarm ? `${view.alarm.text} reported` : '');

  const armed = phase === 'armed', busy = phase === 'sending' || phase === 'waiting';
  reveal(nodes.arm, !armed); reveal(nodes.confirm, armed); reveal(nodes.cancel, armed);
  put(nodes.arm, phase === 'sending' ? 'Sending…' : view.move.label);
  mark(nodes.arm, 'aria-disabled', String(!view.move.enabled || busy));
  mark(nodes.arm, 'aria-busy', String(phase === 'sending'));
  if (armed) {
    const left = Math.max(0, Math.ceil((move.armedAt + MOVE_CONFIRM_MS - local) / 1000));
    put(nodes.confirm, `Confirm ${move.verb.toLowerCase()} ${view.lane} (${left})`);
    put(nodes.why, 'Nothing sent yet.');
  } else put(nodes.why, move?.message || (phase === 'sending' ? 'Sending to the relay.' : view.move.reason));
  mark(nodes.why, 'title', nodes.why.textContent);
  mark(nodes.fresh, 'title', view.freshText);
}

// ---- Shutter moves: arm, confirm inside six seconds, then wait for the projector's own report.
function finish(lane, move, phase, message, outcome) {
  Object.assign(move, { phase, message, until: Date.now() + RESULT_MS });
  if (outcome) lastMove = { lane, verb: move.verb, at: Date.now() + clockOffset, outcome };
  say(message);
}
function settleMoves(local) {
  for (const [lane, move] of moves) {
    const view = lanes.find(l => l.lane === lane);
    if (move.phase === 'armed') {
      const same = view?.move.enabled && view.slot === move.slot && view.revision === move.revision && view.move.arg === move.arg;
      if (!same) { finish(lane, move, 'note', 'Not sent: the reading changed.'); refocus(lane); }
      else if (local >= move.armedAt + MOVE_CONFIRM_MS) { finish(lane, move, 'note', 'Not sent: confirm timed out.'); refocus(lane); }
    } else if (move.phase === 'waiting') {
      const want = move.arg ? 'closed' : 'open';
      if (view?.reach === 'live' && view.shutter === want) finish(lane, move, 'done', `Reported ${want.toUpperCase()} at ${clockShort(local + clockOffset)}.`, `projector reported ${want}`);
      else if (local >= move.sentAt + MOVE_REPORT_MS) finish(lane, move, 'note', `Sent, but not reported ${want}. Check by eye.`, `sent, projector has not reported ${want}`);
    } else if (move.phase !== 'sending' && local >= move.until) moves.delete(lane);
  }
}
// Hiding a focused button drops focus to the page; put it back on the lane's visible control.
function refocus(lane) {
  const nodes = laneNodes.get(lane);
  if (!nodes.card.contains(document.activeElement)) return;
  queueMicrotask(() => (nodes.confirm.hidden ? nodes.arm : nodes.confirm).focus());
}
function arm(lane) {
  const view = lanes.find(l => l.lane === lane), current = moves.get(lane);
  if (!view?.move.enabled || ['armed', 'sending', 'waiting'].includes(current?.phase)) return;
  for (const [other, move] of moves) if (move.phase === 'armed') moves.delete(other);
  moves.set(lane, { phase: 'armed', arg: view.move.arg, verb: view.move.verb, slot: view.slot, revision: view.revision, armedAt: Date.now() });
  render();
  laneNodes.get(lane).confirm.focus();
  say(`Confirm ${view.move.verb.toLowerCase()} shutter on lane ${lane} within ${MOVE_CONFIRM_MS / 1000} seconds. Nothing sent yet.`);
}
function cancel(lane) {
  const move = moves.get(lane);
  if (move?.phase !== 'armed') return;
  moves.delete(lane);
  render();
  laneNodes.get(lane).arm.focus();
  say('Cancelled. Nothing sent.');
}
async function confirmMove(lane) {
  const move = moves.get(lane);
  if (move?.phase !== 'armed' || Date.now() - move.armedAt < MOVE_GUARD_MS) return; // a double tap never counts as the second step
  render(); // recheck the reading at the moment of the second step
  if (moves.get(lane) !== move || move.phase !== 'armed') return;
  move.phase = 'sending';
  render();
  laneNodes.get(lane).arm.focus();
  const want = move.arg ? 'closed' : 'open';
  try {
    await sendShutter(move);
    Object.assign(move, { phase: 'waiting', sentAt: Date.now(), message: `Sent. Waiting for ${lane} to report ${want}.` });
    lastMove = { lane, verb: move.verb, at: move.sentAt + clockOffset, outcome: 'relay accepted it, waiting for the projector report' };
    say(move.message);
  } catch (error) {
    // No answer is not a refusal: the command may have left before the reply was lost.
    if (error.unsure) finish(lane, move, 'note', 'No answer from the relay. Check the lane by eye.', 'no answer from the relay, so it is not known whether it was sent');
    else finish(lane, move, 'error', `Not done: ${error.message}`, `not done (${error.message})`);
  }
  render();
}
async function sendShutter({ slot, arg, revision }) {
  let response;
  try {
    response = await fetch('api/command', { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ slot, cmd: 'shutter', arg, ...(revision ? { expectedTargets: [{ slot, revision }] } : {}) }) });
  } catch { throw Object.assign(new Error('the relay did not answer'), { unsure: true }); }
  if (response.status === 401) { signIn(); throw new Error('signed out'); }
  const out = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(out.error || `the relay refused it (${response.status})`);
  if (out[slot]?.error) throw new Error(out[slot].error);
  if (out[slot]?.result !== 'OK') throw new Error('the projector did not acknowledge');
}
$('#sb-lane-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-act]');
  if (!button) return;
  const lane = button.closest('[data-lane]').dataset.lane;
  if (button.dataset.act === 'arm') arm(lane);
  else if (button.dataset.act === 'confirm') confirmMove(lane);
  else cancel(lane);
});
document.addEventListener('keydown', event => {
  if (event.repeat && event.target.closest?.('button[data-act]')) event.preventDefault(); // a held key is one press
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) for (const [lane, move] of moves) if (move.phase === 'armed') cancel(lane);
});

// ---- Relay connection
function signIn() {
  if (leaving) return;
  leaving = true;
  location.href = `login.html?next=${encodeURIComponent(location.pathname + location.hash)}`;
}
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
  ws.addEventListener('open', () => { if (mine === generation) { socketOpen = true; heard = false; openedAt = Date.now(); retry = 0; readCrewLinks(); } });
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
async function readDisplays() {
  try {
    const response = await fetch('api/host-displays', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (response.status === 401) { signIn(); return; }
    const data = await response.json();
    if (!response.ok || data?.scope !== 'relay-computer') throw new Error('unexpected reply');
    syncClock(response.headers.get('date'), false);
    displays = { status: 'ok', data };
  } catch { displays = { status: 'error', error: 'Display report failed' }; }
  render();
}

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
  if (address) mark(link, 'href', address); else link.removeAttribute('href');
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
  const key = check.id;
  if (key === detailKey) return;
  detailKey = key;
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
for (const button of document.querySelectorAll('dialog [data-close]')) button.addEventListener('click', () => button.closest('dialog').close());

// ---- Call for help with a snapshot
async function copySnapshot() {
  const area = $('#sb-snapshot-text'), status = $('#sb-snapshot-status');
  let copied = false;
  try { if (window.isSecureContext && navigator.clipboard?.writeText) { await navigator.clipboard.writeText(area.value); copied = true; } } catch { copied = false; }
  if (!copied) { // plain-http LAN pages have no Clipboard API; the selection command still works on a tap
    area.focus(); area.select(); area.setSelectionRange(0, area.value.length);
    try { copied = document.execCommand('copy'); } catch { copied = false; }
  }
  put(status, copied ? 'Copied. Paste it into a text message.' : 'This browser blocked the copy. Select the text below and copy it by hand.');
  mark(status, 'data-state', copied ? 'ok' : 'eye');
}
$('#sb-help').addEventListener('click', () => {
  render();
  const text = snapshotText({ lanes, checks, verdict, lock: !!snapshot?.lock, simulation: !!snapshot?.simulation, relay, lastMove, now: Date.now() + clockOffset });
  $('#sb-snapshot-text').value = text;
  $('#sb-snapshot-sms').href = smsHref(text);
  $('#sb-snapshot').showModal();
  copySnapshot();
});
$('#sb-snapshot-copy').addEventListener('click', copySnapshot);

// ---- Views: both sections show on a large screen; a small screen shows one, chosen from the bottom rail.
function setView(view, { write = false } = {}) {
  const next = view === 'checks' ? 'checks' : 'lanes';
  mark($('#sb-main'), 'data-view', next);
  for (const button of document.querySelectorAll('[data-view-btn]')) mark(button, 'aria-pressed', String(button.dataset.viewBtn === next));
  if (write && location.hash.slice(1) !== next) history.replaceState(null, '', `#${next}`); // a reload or a sign-in returns to the same view
}
for (const button of document.querySelectorAll('[data-view-btn]')) button.addEventListener('click', () => setView(button.dataset.viewBtn, { write: true }));
addEventListener('hashchange', () => setView(location.hash.slice(1)));
$('#sb-pick').addEventListener('click', event => {
  const button = event.target.closest('button[data-pick]');
  if (!button) return;
  solo = button.dataset.pick;
  render();
});

setView(location.hash.slice(1));
render();
connect();
readDisplays();
setInterval(readDisplays, DISPLAY_POLL_MS);
setInterval(() => { dropSilentSocket(); render(); }, 1000);
