// Power operator page (docs/power-operator-page.md). A guided checklist over the relay's existing
// state stream and its existing power command. It sends `power` for one relay lane at a time and
// nothing else, and it never sends anything to a lane the operator powers by handheld remote.
import { LANES, rigLanes } from './lanes.js';
import { createConnectionMonitor } from './projector-connection.js';
import { STORAGE_KEY, COOL_SECONDS, TICK_VALID_MS, STEPS, LAMP_LANES, emptyRecord, parseRecord, tickCurrent, clock, crewNotesUrl, laneReading, relayStep, banner } from './power-model.js';

const $ = (selector, root = document) => root.querySelector(selector);
const MODES = ['on', 'off'];
const VIEWS = ['on', 'off', 'rules'];
const CONFIRM_MS = 3000;
const monitor = createConnectionMonitor();
const timeOfDay = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const at = value => timeOfDay.format(new Date(value));

let state = { projectors: [], lock: false, relay: {}, simulation: false };
let connected = false;
// Reply age is judged on the relay's clock, taken from its heartbeat, so a phone with a wrong
// clock does not see every lane as stale. Ticks and timers are set and read on this device only.
let relayClockOffset = 0;
const stepIndex = { on: 0, off: 0 };
// The open step is chosen once, from the first snapshot. After that only the operator moves it, so a
// second tap can never land on a different step's button.
const stepSettled = { on: false, off: false };
const confirms = new Map(); // lane -> { token, issuedAt, expiresAt }
const sending = new Set();  // lanes with a command in flight
const notes = new Map();    // `${mode}:${key}` -> { text, tone, until }

// ---- Saved ticks and timers: this browser only, validated on every read ----
const store = (() => {
  let memory = null, persisted = true;
  return {
    read() {
      try { const text = localStorage.getItem(STORAGE_KEY); persisted = true; return text === null ? (memory ? parseRecord(memory) : emptyRecord()) : parseRecord(text); }
      catch { persisted = false; return memory ? parseRecord(memory) : emptyRecord(); }
    },
    write(record) {
      memory = JSON.stringify(record);
      try { localStorage.setItem(STORAGE_KEY, memory); persisted = true; } catch { persisted = false; }
    },
    get persisted() { return persisted; },
  };
})();
let record = store.read();
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) { record = store.read(); render(); } });

// ---- Build both mode panels from one template ----
const panels = {};
for (const mode of MODES) {
  const panel = $(`#${mode}`);
  panel.append($('#mode-template').content.cloneNode(true));
  const detail = $('[data-detail]', panel);
  detail.id = `detail-${mode}`;
  $('[data-detail-open]', panel).setAttribute('popovertarget', detail.id);
  $('[data-detail-close]', panel).setAttribute('popovertarget', detail.id);
  $('[data-why]', panel).id = `why-${mode}`;
  $('[data-action]', panel).setAttribute('aria-describedby', `why-${mode}`);
  const rail = $('[data-rail]', panel);
  STEPS[mode].forEach((key, index) => {
    const item = document.createElement('li'), pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'pw-pill'; pill.dataset.step = String(index);
    if (key !== 'playback') pill.dataset.lane = key;
    // Screen-reader text sits around the visible label, so the spoken name still contains it.
    const lead = document.createElement('span'); lead.className = 'avd-sr'; lead.textContent = key === 'playback' ? `Step ${index + 1}: ` : `Step ${index + 1}: lane `;
    const badge = document.createElement('span'); badge.className = key === 'playback' ? 'pw-pill__key pw-pill__key--plain' : 'pw-pill__key'; badge.textContent = key === 'playback' ? 'App' : key;
    const name = document.createElement('span'); name.className = 'pw-pill__name'; name.textContent = key === 'playback' ? 'Playback app' : LANES[key].target;
    const word = document.createElement('span'); word.className = 'pw-pill__word';
    const tail = document.createElement('span'); tail.className = 'avd-sr'; tail.dataset.done = '';
    pill.append(lead, badge, ' ', name, ' ', word, tail); item.append(pill); rail.append(item);
    pill.addEventListener('click', () => { goToStep(mode, index); });
  });
  // The rules read the same on a very wide screen, beside the open step.
  const aside = $('[data-aside]', panel), copy = $('#rules-body').cloneNode(true);
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  copy.querySelectorAll('[aria-labelledby]').forEach(node => node.removeAttribute('aria-labelledby'));
  aside.append(...copy.children);
  $('[data-prev]', panel).addEventListener('click', () => goToStep(mode, stepIndex[mode] - 1, true));
  $('[data-next]', panel).addEventListener('click', () => goToStep(mode, stepIndex[mode] + 1, true));
  $('[data-action]', panel).addEventListener('click', () => act(mode));
  $('[data-alt]', panel).addEventListener('click', () => altPower(mode));
  panels[mode] = { panel, detail, pills: [...rail.querySelectorAll('.pw-pill')] };
}

// On a small screen the Rules view shows one rule set at a time. A roomy screen shows all three.
const ruleSets = [...document.querySelectorAll('#rules [data-rule-set]')], rulePicks = [...document.querySelectorAll('#rules [data-rule-pick]')];
function pickRules(id) {
  for (const button of rulePicks) button.setAttribute('aria-pressed', String(button.dataset.rulePick === id));
  for (const set of ruleSets) set.toggleAttribute('data-off', set.dataset.ruleSet !== id);
}
for (const button of rulePicks) button.addEventListener('click', () => pickRules(button.dataset.rulePick));
pickRules('never');

// ---- Optional crew notes link ----
// The address lives in the relay's private settings and reaches the page through one read. The page
// only draws a link to it: it never requests, checks or frames that address. With no usable address,
// or on a relay without the route, the link and its rule set are not shown at all.
function showCrewNotes(address) {
  for (const link of document.querySelectorAll('[data-crew-notes]')) { if (address) link.href = address; else link.removeAttribute('href'); }
  for (const node of document.querySelectorAll('[data-rule-set=notes], [data-rule-pick=notes]')) node.hidden = !address;
  if (!address && $('#rules [data-rule-pick=notes]').getAttribute('aria-pressed') === 'true') pickRules('never');
}
async function loadCrewNotes() {
  try {
    const response = await fetch('api/crew-links', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    showCrewNotes(response.ok ? crewNotesUrl(await response.json()) : null);
  } catch { showCrewNotes(null); }
}

// A sheet left open while the screen grows back to the tall layout returns to the card.
const shortScreen = window.matchMedia('(max-height:620px)');
shortScreen.addEventListener('change', () => {
  if (shortScreen.matches) return;
  for (const mode of MODES) { try { if (panels[mode].detail.matches(':popover-open')) panels[mode].detail.hidePopover(); } catch { /* not open */ } }
});

// ---- Views ----
function buildMode(mode, now) {
  const entries = new Map(rigLanes(state.projectors).map(entry => [entry.lane, entry]));
  const playbackTicked = tickCurrent(record.playback[mode], now);
  const steps = STEPS[mode].map(key => {
    if (key === 'playback') {
      const lapsed = !playbackTicked && record.playback[mode] !== null;
      return { key, kind: 'playback', done: playbackTicked, word: playbackTicked ? 'CLOSED BY EYE' : lapsed ? 'TICK LAPSED' : 'TO DO', tone: playbackTicked ? 'done' : 'todo', tickedAt: playbackTicked ? record.playback[mode] : null };
    }
    const entry = entries.get(key), projector = entry?.projector || null;
    const reading = laneReading(entry, monitor(projector, connected, state.relay?.pollIntervalMs, now + relayClockOffset));
    return { key, lane: key, kind: 'relay', reading, projector, ...relayStep(mode, reading, { lock: !!state.lock, busy: !!projector?.busy, playbackTicked, tick: record.relay[key]?.tick, lamp: LAMP_LANES.includes(key), coolUntil: record.lanes[key]?.coolUntil, now }) };
  });
  return { steps, banner: banner(mode, steps.filter(step => step.kind !== 'playback')) };
}

const TEXT = {
  playback: {
    on: 'Look at the show computer. The playback app must be closed before any projector changes power. If it is open, stop and tell the show backup.',
    off: 'Check with the show backup that the show is over and the playback app is quit. If it is still open, stop and tell the show backup.',
  },
  relay: {
    on: 'Read the power word first. If it says STANDBY, press Power on, then watch it go to WARMING and then ON. After it lights, leave it alone for 60 seconds.',
    off: 'Press Power off, then Confirm within 3 seconds. Watch it go to COOLING and then STANDBY. Never cut mains power while it cools.',
  },
  // A relay lane whose reply has no power state, at night: the operator's eyes decide, as for a manual lane.
  unread: lane => `The relay cannot read lane ${lane}'s power state, so go by eye. If the unit is dark and its indicator shows standby, tick below. If it is still lit, press Power off, then Confirm.`,

};

// The rail has room for one short word per step. The open step shows the full one.
const RAIL_WORDS = { 'CLOSED BY EYE': 'TICKED', 'LIT BY EYE': 'TICKED', 'OFF BY EYE': 'TICKED', 'COOLING TIMER': 'TIMER', 'TICK LAPSED': 'LAPSED', 'CHECK AGAIN': 'CHECK', 'PAGE OFFLINE': 'OFFLINE', 'NOT SET UP': 'NOT SET' };

function setText(node, text) { if (node.textContent !== text) node.textContent = text; }
function setAttr(node, name, value) { if (value === null || value === false) { if (node.hasAttribute(name)) node.removeAttribute(name); } else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value)); }
function setHidden(node, hidden) { if (node.hidden !== hidden) node.hidden = hidden; }

function sourceText(step) {
  const reading = step.reading;
  if (step.timer.running) return `${clock(step.timer.remaining)} left · lamp timer · keep mains on`;
  if (reading.kind === 'reading') return `Relay reading · reply ${reading.ageLabel.toLowerCase()}`;
  if (reading.kind === 'noreply') return `No fresh reply · last known ${reading.lastKnown || 'nothing'} · last reply ${reading.lastReply}`;
  if (reading.kind === 'disconnected') return `Relay offline · last known ${reading.lastKnown || 'nothing'}`;
  if (reading.kind === 'unknown') return `Reply ${reading.ageLabel.toLowerCase()} · no power state in it`;
  return '';
}

function whyText(mode, step, now) {
  const note = notes.get(`${mode}:${step.key}`);
  if (note && note.until > now) return note;
  if (note) notes.delete(`${mode}:${step.key}`);
  if (step.kind === 'playback') {
    if (step.done) return { text: `Ticked ${at(step.tickedAt)}. Lapses ${at(step.tickedAt + TICK_VALID_MS)}.${store.persisted ? '' : ' Browser storage is unavailable, so ticks last only while this page stays open.'}`, tone: '' };
    return { text: step.word === 'TICK LAPSED' ? 'The earlier tick lapsed. Look again, then tick.' : 'The relay power buttons wait for this tick.', tone: '' };
  }
  if (step.eye.ticked) return { text: `Ticked ${at(step.eye.tickedAt)}. Lapses ${at(step.eye.tickedAt + TICK_VALID_MS)}. The relay still cannot read this unit.`, tone: '' };
  if (step.eye.lapsed) return { text: 'The earlier tick lapsed. Look again, then tick.', tone: '' };
  return { text: step.reason, tone: '' };
}

function actionView(mode, step) {
  if (step.kind === 'playback') return { label: step.done ? '\u2713 App closed by eye' : 'Tick by eye: app closed', pressed: step.done, enabled: true };
  // A relay lane the relay cannot read, at night: the tick is the main action and power moves beside it.
  if (step.eye.offered) return { label: step.eye.ticked ? `\u2713 ${step.lane} off by eye` : `Tick by eye: ${step.lane} is off`, pressed: step.eye.ticked, enabled: true };
  return powerView(mode, step);
}

function powerView(mode, step) {
  if (sending.has(step.lane)) return { label: 'Sending…', pressed: null, enabled: false, busy: true };
  const confirming = mode === 'off' && liveConfirm(step.lane);
  if (confirming) return { label: `Confirm power off ${step.lane}`, pressed: null, enabled: step.enabled, confirming: true };
  return { label: mode === 'on' ? `Power on ${step.lane}` : `Power off ${step.lane}`, pressed: null, enabled: step.enabled };
}

// An expired entry stays until its own timer reports the lapse, so the operator is always told.
function liveConfirm(lane) {
  const entry = confirms.get(lane);
  return entry && entry.expiresAt > Date.now() ? entry : null;
}

function renderMode(mode, now) {
  const { panel, pills } = panels[mode], view = buildMode(mode, now);
  if (!stepSettled[mode] && connected) { const first = view.steps.findIndex(step => !step.done); stepIndex[mode] = first === -1 ? view.steps.length - 1 : first; stepSettled[mode] = true; }
  const index = stepIndex[mode], step = view.steps[index];

  const strip = $('[data-banner]', panel);
  setAttr(strip, 'data-state', view.banner.state);
  setText($('[data-banner-title]', panel), view.banner.title);
  setText($('[data-banner-detail]', panel), view.banner.detail);

  view.steps.forEach((item, i) => {
    const pill = pills[i];
    setAttr(pill, 'data-tone', item.tone);
    setAttr(pill, 'aria-current', i === index ? 'step' : null);
    setText($('.pw-pill__word', pill), RAIL_WORDS[item.word] || item.word);
    setText($('[data-done]', pill), item.done ? ', done' : '');
  });

  const card = $('[data-card]', panel);
  setAttr(card, 'data-tone', step.tone);
  setAttr(card, 'data-lane', step.lane || null);
  setAttr(card, 'data-kind', step.kind);
  setText($('[data-count]', panel), `Step ${index + 1} of ${view.steps.length}`);
  setText($('[data-title]', panel), step.kind === 'playback' ? 'Playback app' : `${step.lane} · ${LANES[step.lane].target}`);
  setText($('[data-word]', panel), step.word);
  setText($('[data-source]', panel), step.kind === 'playback' ? '' : sourceText(step));
  // Each of these depends on a decision that is still open (see the brief).
  const pending = step.kind === 'playback' ? 'Pending POWER-2' : step.eye.offered ? 'Pending POWER-4' : '';
  setHidden($('[data-pending]', panel), !pending);
  setText($('[data-pending]', panel), pending || 'Pending decision');
  const byEye = step.kind === 'relay' && step.eye.offered;
  setText($('[data-text]', panel), byEye ? TEXT.unread(step.lane) : TEXT[step.kind][mode]);

  const lamp = LAMP_LANES.includes(step.lane);
  setHidden($('[data-tools]', panel), !lamp && !byEye);
  setHidden($('[data-lamp]', panel), !lamp);
  const alt = $('[data-alt]', panel);
  setHidden(alt, !byEye);
  if (byEye) {
    const power = powerView(mode, step);
    setText(alt, power.label);
    setAttr(alt, 'aria-disabled', power.enabled ? null : 'true');
    setAttr(alt, 'aria-busy', power.busy ? 'true' : null);
    setAttr(alt, 'data-confirming', power.confirming ? '' : null);
  }
  const why = whyText(mode, step, now), whyNode = $('[data-why]', panel);
  setText(whyNode, why.text);
  setAttr(whyNode, 'data-tone', why.tone || null);

  const action = actionView(mode, step), button = $('[data-action]', panel);
  setText(button, action.label);
  setAttr(button, 'aria-pressed', action.pressed === null ? null : String(action.pressed));
  setAttr(button, 'aria-disabled', action.enabled ? null : 'true');
  setAttr(button, 'aria-busy', action.busy ? 'true' : null);
  setAttr(button, 'data-confirming', action.confirming ? '' : null);

  const prev = $('[data-prev]', panel), next = $('[data-next]', panel);
  setAttr(prev, 'aria-disabled', index === 0 ? 'true' : null);
  setAttr(next, 'aria-disabled', index === view.steps.length - 1 ? 'true' : null);
  next.classList.toggle('pw-next--go', step.done && index < view.steps.length - 1);
  return view;
}

function render() {
  const now = Date.now();
  for (const mode of MODES) renderMode(mode, now);
  const conn = $('#conn');
  setAttr(conn, 'data-state', connected ? 'online' : conn.dataset.state === 'connecting' ? 'connecting' : 'offline');
  setText($('#conn-word'), connected ? 'connected' : conn.dataset.state === 'connecting' ? 'connecting' : 'offline');
  $('#conn-dot').className = 'avd-dot ' + (connected ? 'avd-dot--done' : conn.dataset.state === 'connecting' ? 'avd-dot--waiting' : 'avd-dot--blocked');
  setHidden($('#lock-flag'), !(connected && state.lock));
  setHidden($('#sim-flag'), !(connected && state.simulation));
}

// ---- Steps ----
function goToStep(mode, index, focusTitle = false) {
  const last = STEPS[mode].length - 1;
  if (index < 0 || index > last) return;
  stepIndex[mode] = index; stepSettled[mode] = true;
  render();
  if (focusTitle) $('[data-title]', panels[mode].panel).focus();
}

function note(mode, key, text, tone = '', ms = 8000) { notes.set(`${mode}:${key}`, { text, tone, until: Date.now() + ms }); }

function act(mode) {
  stepSettled[mode] = true;
  const view = buildMode(mode, Date.now()), step = view.steps[stepIndex[mode]];
  if (step.kind === 'playback') {
    record.playback[mode] = step.done ? null : Date.now();
    store.write(record); render(); return;
  }
  if (step.eye.offered) {
    record.relay[step.lane].tick = step.eye.ticked ? null : { state: 'off', at: Date.now() };
    store.write(record); render(); return;
  }
  if (!step.enabled || sending.has(step.lane)) return;
  sendPower(mode, step);
}

// Power for a relay lane whose main action is the by-eye tick. Same guards, same two-step power off.
function altPower(mode) {
  stepSettled[mode] = true;
  const step = buildMode(mode, Date.now()).steps[stepIndex[mode]];
  if (step.kind !== 'relay' || !step.eye.offered || !step.enabled || sending.has(step.lane)) return;
  sendPower(mode, step);
}

// ---- The one command this page sends ----
async function sendPower(mode, step) {
  const lane = step.lane, projector = step.projector, on = mode === 'on';
  const pending = on ? null : liveConfirm(lane);
  // Same rule as the operator console: a rapid repeat cannot stand in for the second, deliberate tap.
  if (pending && Date.now() - pending.issuedAt < 400) return;
  sending.add(lane); render();
  try {
    const response = await fetch('api/command', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ slot: projector.slot, cmd: 'power', arg: on ? 1 : 0, ...(pending ? { confirm: pending.token } : {}), expectedTargets: [{ slot: projector.slot, revision: projector.controlRevision }] }),
    });
    if (response.status === 401) { signIn(); return; }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The relay refused the command.');
    const result = data[projector.slot] || {};
    if (result.error) throw new Error(result.error);
    if (result.confirm) {
      const issuedAt = Date.now();
      confirms.set(lane, { token: result.confirm, issuedAt, expiresAt: issuedAt + CONFIRM_MS });
      note(mode, lane, `Nothing sent yet. Press Confirm power off ${lane} within 3 seconds.`, 'ok', CONFIRM_MS);
      setTimeout(() => {
        if (confirms.get(lane)?.token !== result.confirm) return;
        confirms.delete(lane);
        note(mode, lane, 'Confirmation expired. Nothing was sent.', '', 6000);
        render();
      }, CONFIRM_MS + 50);
      return;
    }
    confirms.delete(lane);
    // The lane was just switched, so an earlier by-eye tick no longer describes it.
    record.relay[lane].tick = null;
    if (!on && LAMP_LANES.includes(lane)) record.lanes[lane].coolUntil = Date.now() + COOL_SECONDS * 1000;
    store.write(record);
    note(mode, lane, `Command accepted by the relay. Watch for ${on ? 'WARMING, then ON' : 'COOLING, then STANDBY'}.`, 'ok', 12000);
  } catch (error) {
    confirms.delete(lane);
    const lost = error?.name === 'TimeoutError' || error instanceof TypeError;
    note(mode, lane, lost ? 'No answer from the relay. The command may or may not have been sent. Watch the reading before trying again.' : `Not sent: ${error.message}`, 'error', 15000);
  } finally { sending.delete(lane); render(); }
}

function signIn() { location.href = 'login.html?next=' + encodeURIComponent(location.pathname + location.hash); }

// ---- Relay connection: same snapshot, status, busy and heartbeat messages as the console ----
function setConnected(value) {
  const first = value && !connected;
  connected = value;
  $('#conn').dataset.state = value ? 'online' : 'offline';
  if (!value) { confirms.clear(); }
  render();
  if (first) loadCrewNotes(); // once per connection, after the relay has accepted this session
}
let reconnectTimer = null, generationCounter = 0;
function scheduleReconnect() { if (reconnectTimer === null) reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 1500); }
function connect() {
  const generation = ++generationCounter;
  let socket, lost = false, snapshotTimer = null, silenceTimer = null;
  const recover = () => {
    if (generation !== generationCounter || lost) return;
    lost = true;
    clearTimeout(snapshotTimer); clearTimeout(silenceTimer);
    setConnected(false);
    scheduleReconnect();
    fetch('api/state', { signal: AbortSignal.timeout(4000), cache: 'no-store' })
      .then(response => { if (generation === generationCounter && response.status === 401) signIn(); })
      .catch(() => {});
  };
  const alive = () => { clearTimeout(silenceTimer); silenceTimer = setTimeout(() => { recover(); socket.close(); }, 15000); };
  try {
    const url = new URL('ws', location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'; url.search = ''; url.hash = '';
    socket = new WebSocket(url.href);
  } catch { recover(); return; }
  // An open socket is not current state. Wait for the snapshot.
  snapshotTimer = setTimeout(() => { recover(); socket.close(); }, 5000);
  socket.onclose = () => { clearTimeout(snapshotTimer); recover(); };
  socket.onerror = () => { clearTimeout(snapshotTimer); recover(); socket.close(); };
  socket.onmessage = event => {
    if (generation !== generationCounter || lost) return;
    let message;
    try { message = JSON.parse(event.data); } catch { recover(); socket.close(); return; }
    if (!message || typeof message !== 'object') { recover(); socket.close(); return; }
    if (message.type === 'snapshot') {
      if (!Array.isArray(message.projectors) || !message.projectors.every(p => p && typeof p.slot === 'string')) { recover(); socket.close(); return; }
      clearTimeout(snapshotTimer); alive();
      state = message; setConnected(true);
      return;
    }
    if (!connected) return;
    if (message.type === 'heartbeat') {
      alive();
      const relayNow = typeof message.at === 'string' ? Date.parse(message.at) : NaN;
      if (Number.isFinite(relayNow)) relayClockOffset = relayNow - Date.now();
      render();
    }
    else if (message.type === 'status' && typeof message.slot === 'string' && message.status && typeof message.status === 'object') {
      alive();
      const projector = state.projectors.find(p => p.slot === message.slot);
      if (projector) { projector.status = message.status; render(); }
    }
    else if (message.type === 'busy' && typeof message.slot === 'string') {
      alive();
      const projector = state.projectors.find(p => p.slot === message.slot);
      if (projector) { projector.busy = message.busy; render(); }
    }
    else alive();
  };
}

// ---- Tabs (WAI-ARIA tabs, view kept in the URL hash) ----
const tabs = VIEWS.map(id => $(`#t-${id}`));
function show(id, { push = true } = {}) {
  const view = VIEWS.includes(id) ? id : 'on';
  for (const tab of tabs) {
    const selected = tab.getAttribute('aria-controls') === view;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    $(`#${tab.getAttribute('aria-controls')}`).hidden = !selected;
  }
  if (push && location.hash !== '#' + view) history.pushState(null, '', '#' + view);
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => show(tab.getAttribute('aria-controls')));
  tab.addEventListener('keydown', event => {
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    const target = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : move ? tabs[(index + move + tabs.length) % tabs.length] : null;
    if (!target) return;
    event.preventDefault(); target.focus(); show(target.getAttribute('aria-controls'));
  });
});
window.addEventListener('popstate', () => show(location.hash.slice(1), { push: false }));
$('.pw-skip').addEventListener('click', event => { event.preventDefault(); const view = tabs.find(tab => tab.getAttribute('aria-selected') === 'true').getAttribute('aria-controls'); ($(`#${view} [data-title]`) || $('#panels')).focus(); });

// Morning on is the default view: it can only send Power on.
show(location.hash.slice(1), { push: false });
render();
setInterval(render, 1000);
connect();
