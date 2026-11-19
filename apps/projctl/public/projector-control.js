// Projector control component, shared by the role pages. It draws one card per lane and one
// "All lanes" card, and sends two kinds of command: power and shutter. Every action takes two
// steps. Power off uses the relay's own confirmation; the others arm on the page.
//
//   const control = createProjectorControl({ root, pick, post, announce });
//   control.render({ views, lock, local });     // views from laneViews() in projector-control-model.js
//
// post(body) sends POST api/command and resolves to { status, body }; it rejects when no answer came.
import { LANES } from './lanes.js';
import { ACTIONS, ACTION_IDS, ALL, CONFIRM_MS, RELAY_CONFIRM_MS, GUARD_MS, REPORT_MS, DEFAULT_POLICY,
  actionState, sharedReason, groupState, groupSummary, targetsText, skippedText, clockShort, list } from './projector-control-model.js';

const WITHDRAWN_MS = 20000; // a withdrawn confirm clears itself; a refusal stays until the next action
const DONE_MS = 60000;
const NOTE_MS = 15000;
const LIVE_PHASES = ['armed', 'asking', 'relay-armed', 'sending', 'waiting'];
const KEYS = [...Object.keys(LANES), ALL];

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text != null) node.textContent = text;
  return node;
}
const put = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const mark = (node, name, value) => { if (value == null) node.removeAttribute(name); else if (node.getAttribute(name) !== value) node.setAttribute(name, value); };
const reveal = (node, visible) => { if (node.hidden === visible) node.hidden = !visible; };

export function createProjectorControl({ root, pick = null, post, announce = () => {}, relayNow = () => Date.now(), policy = DEFAULT_POLICY, sharedNote = '' }) {
  const cards = new Map(), ops = new Map(), notes = new Map();
  let views = [], lock = null, selected = 'A';
  const options = () => ({ lock, policy });
  const viewOf = lane => views.find(view => view.lane === lane);
  const where = key => key === ALL ? 'all lanes' : `lane ${key}`;

  // ---- Build once; later renders only change text and attributes, so focus survives.
  for (const key of KEYS) {
    const isLane = key !== ALL;
    const card = el('article', { class: 'pc-card', 'data-lane': key, 'data-tone': 'off', 'data-reach': 'connecting', 'data-phase': 'idle', 'aria-labelledby': `pc-${key}-name` });
    const name = el('h3', { class: 'pc-name', id: `pc-${key}-name` });
    if (isLane) name.append(el('span', { class: 'pc-sr' }, `Lane ${key}, `), LANES[key].target); else name.textContent = 'All lanes';
    const model = el('p', { class: 'pc-model' });
    const head = el('header', { class: 'pc-head' });
    head.append(el('span', { class: 'pc-letter', 'aria-hidden': 'true' }, isLane ? key : 'All'), name, model);
    const state = el('p', { class: 'pc-state' }), fresh = el('p', { class: 'pc-fresh' });
    const facts = el('dl', { class: 'pc-facts' }), fact = {};
    for (const [id, label] of isLane ? [['shutter', 'Shutter'], ['input', 'Input'], ['pattern', 'Pattern'], ['link', 'Link']] : [['lit', 'Lit'], ['closed', 'Shutters closed']]) {
      const wrap = el('div', { class: 'pc-fact', 'data-fact': id }), value = el('dd');
      wrap.append(el('dt', {}, label), value);
      facts.append(wrap);
      fact[id] = { wrap, value };
    }
    const alarm = el('p', { class: 'pc-alarm', hidden: '' });
    const actions = el('div', { class: 'pc-actions' }), buttons = {};
    for (const row of ['power', 'shutter']) {
      const title = row === 'power' ? 'Power' : 'Shutter';
      const group = el('div', { class: 'pc-row', role: 'group', 'aria-label': `${title}, ${where(key)}` });
      group.append(el('span', { class: 'pc-row__label', 'aria-hidden': 'true' }, title));
      for (const id of ACTION_IDS.filter(item => ACTIONS[item].row === row)) {
        // aria-disabled, not disabled: a blocked button stays reachable so its reason can be read and tapped for.
        buttons[id] = el('button', { type: 'button', class: 'pc-btn', 'data-act': id, 'aria-disabled': 'true' }, ACTIONS[id].label);
        group.append(buttons[id]);
      }
      actions.append(group);
    }
    const confirm = el('div', { class: 'pc-confirm', hidden: '' }), confirmText = el('p', { class: 'pc-confirm__text' });
    const go = el('button', { type: 'button', class: 'pc-btn pc-btn--confirm', 'data-act': 'confirm' });
    const stop = el('button', { type: 'button', class: 'pc-btn pc-btn--quiet', 'data-act': 'cancel' }, 'Cancel');
    confirm.append(confirmText, go, stop);
    const msg = el('p', { class: 'pc-msg', 'data-kind': 'info' });
    const inner = el('div', { class: 'pc-card__in' }); // the card is a size container, so its layout lives one level in
    inner.append(head, state, fresh, facts, alarm, actions, confirm, msg);
    card.append(inner);
    root.append(card);
    let picker = null;
    if (pick) {
      picker = el('button', { type: 'button', class: 'pc-pick', 'data-pick': key, 'data-tone': 'off', 'aria-pressed': 'false' });
      picker.append(el('span', { class: 'pc-pick__key' }, isLane ? key : 'All'), el('span', { class: 'pc-pick__word' }));
      pick.append(picker);
    }
    cards.set(key, { card, model, state, fresh, fact, alarm, actions, buttons, confirm, confirmText, go, stop, msg, picker });
  }

  // ---- Messages
  const UP = { on: 'ON', off: 'OFF', warming: 'WARMING', cooling: 'COOLING', open: 'OPEN', closed: 'CLOSED' };
  function describe(op) {
    const action = ACTIONS[op.action], want = UP[action.want[0]], single = op.key !== ALL, parts = [];
    const lanes = status => op.targets.filter(target => target.status === status);
    const reported = lanes('reported'), names = items => list(items.map(target => target.lane));
    for (const word of new Set(reported.map(target => target.reportedAs))) {
      const these = reported.filter(target => target.reportedAs === word);
      parts.push(single ? `Reported ${UP[word]} at ${clockShort(these[0].at)}.` : `${names(these)} reported ${UP[word]}`);
    }
    if (lanes('accepted').length) parts.push(single ? `Sent. Waiting for ${op.key} to report ${want}.` : `${names(lanes('accepted'))} sent, waiting for the report`);
    if (lanes('timeout').length) parts.push(single ? `Sent, but not reported ${want}. Check by eye.` : `${names(lanes('timeout'))} sent, not reported ${want}: check by eye`);
    for (const target of lanes('refused')) parts.push(single ? `Not done: ${target.detail}` : `${target.lane} not done: ${target.detail}`);
    if (lanes('unsure').length) parts.push(single ? 'No answer from the relay. Check the lane by eye.' : `${names(lanes('unsure'))} no answer from the relay: check by eye`);
    if (lanes('expired').length) parts.push(single ? 'Confirm expired at the relay. Nothing sent.' : `${names(lanes('expired'))} confirm expired, nothing sent`);
    const text = parts.join(' · ');
    return op.finishedAt && !(single && reported.length) ? `${clockShort(op.finishedAt)} · ${action.verb}: ${text}` : text;
  }
  function finish(op, phase, message, { sticky = false } = {}) {
    op.finishedAt = relayNow();
    Object.assign(op, { phase, message: message ?? describe(op), until: sticky ? Infinity : Date.now() + (phase === 'done' ? DONE_MS : WITHDRAWN_MS) });
    announce(op.message);
  }
  function note(key, text) { notes.set(key, { text, until: Date.now() + NOTE_MS }); announce(text); }

  // ---- One command to the relay for one target
  async function send(target, action, token) {
    let reply;
    try { reply = await post({ slot: target.slot, cmd: action.cmd, arg: action.arg, expectedTargets: [{ slot: target.slot, revision: target.revision }], ...(token ? { confirm: token } : {}) }); }
    catch { return { status: 'unsure', detail: 'no answer from the relay' }; } // not a refusal: it may have left before the reply was lost
    const out = reply?.body?.[target.slot];
    if (reply.status === 401) return { status: 'refused', detail: 'signed out. Sign in again.' };
    if (!(reply.status >= 200 && reply.status < 300)) return { status: 'refused', detail: reply.body?.error || `the relay refused it (${reply.status})` };
    if (out?.error) return { status: 'refused', detail: out.error };
    if (typeof out?.confirm === 'string') return { status: 'token', token: out.confirm };
    if (out?.result === 'OK') return { status: 'accepted' };
    return { status: 'refused', detail: 'the projector did not acknowledge' };
  }

  // ---- Two steps
  function stillValid(op) {
    if (op.key === ALL) {
      const state = groupState(views, op.action, options());
      const open = op.targets.filter(target => !target.status || target.status === 'ready');
      return state.enabled && open.every(target => state.ready.some(item => item.lane === target.lane && item.slot === target.slot && item.revision === target.revision))
        && (op.phase !== 'armed' || state.ready.length === op.targets.length);
    }
    const view = viewOf(op.key), target = op.targets[0];
    return !!view && actionState(view, op.action, options()).enabled && view.slot === target.slot && view.revision === target.revision;
  }
  function refocus(key) {
    const nodes = cards.get(key);
    if (!nodes.card.contains(document.activeElement)) return;
    queueMicrotask(() => (nodes.confirm.hidden ? nodes.buttons[ops.get(key)?.action] || nodes.buttons['power-on'] : nodes.go).focus());
  }
  function settle(local) {
    for (const [key, op] of ops) {
      if (op.phase === 'armed' || op.phase === 'relay-armed') {
        if (!stillValid(op)) { finish(op, 'note', 'Not sent: the reading changed.'); refocus(key); }
        else if (local >= op.armedAt + op.window) { finish(op, 'note', 'Not sent: confirm timed out.'); refocus(key); }
      } else if (op.phase === 'waiting') {
        const action = ACTIONS[op.action];
        for (const target of op.targets.filter(item => item.status === 'accepted')) {
          const view = viewOf(target.lane);
          if (view?.reach === 'live' && action.want.includes(view[action.field])) Object.assign(target, { status: 'reported', reportedAs: view[action.field], at: relayNow() });
        }
        const open = op.targets.filter(item => item.status === 'accepted');
        if (open.length && local >= op.sentAt + REPORT_MS) { for (const target of open) target.status = 'timeout'; open.length = 0; }
        if (!open.length) {
          const clean = op.targets.every(item => item.status === 'reported');
          finish(op, clean ? 'done' : 'note', undefined, { sticky: !clean });
        } else op.message = describe(op);
      } else if (!LIVE_PHASES.includes(op.phase) && Date.now() >= op.until) ops.delete(key);
    }
    for (const [key, item] of notes) if (Date.now() >= item.until) notes.delete(key);
  }

  function press(key, id) {
    const action = ACTIONS[id], current = ops.get(key);
    if (current && LIVE_PHASES.includes(current.phase)) { if (current.phase === 'waiting') note(key, 'Wait for the last command to report.'); return; }
    const state = key === ALL ? groupState(views, id, options()) : actionState(viewOf(key), id, options());
    if (!state.enabled) { note(key, `${action.verb} is blocked. ${state.reason}`); render(); return; }
    for (const [other, op] of ops) if (op.phase === 'armed' || op.phase === 'relay-armed') ops.delete(other); // one armed action at a time
    const view = viewOf(key);
    const targets = key === ALL ? state.ready.map(target => ({ ...target })) : [{ lane: key, slot: view.slot, revision: view.revision }];
    const op = { key, action: id, targets, skipped: key === ALL ? state.skipped : [], armedAt: Date.now(), window: CONFIRM_MS, phase: 'armed' };
    notes.delete(key);
    ops.set(key, op);
    if (action.relayConfirm) { op.phase = 'asking'; op.message = 'Checking with the relay. Nothing sent to the projector.'; render(); ask(op); return; }
    render();
    cards.get(key).go.focus();
    announce(`Confirm ${action.verb.toLowerCase()} on ${key === ALL ? `lanes ${targetsText(targets)}` : `lane ${key}`} within ${CONFIRM_MS / 1000} seconds. Nothing sent yet.`);
  }
  // Power off, step one: the relay checks each target and returns a one-use confirmation. Nothing reaches a projector.
  async function ask(op) {
    const action = ACTIONS[op.action], startedAt = Date.now();
    const replies = await Promise.all(op.targets.map(target => send(target, action)));
    if (ops.get(op.key) !== op || op.phase !== 'asking') return;
    replies.forEach((reply, index) => Object.assign(op.targets[index], reply.status === 'token' ? { status: 'ready', token: reply.token } : reply.status === 'accepted' ? { status: 'accepted' } : reply));
    if (!op.targets.some(target => target.status === 'ready')) { finish(op, 'error', undefined, { sticky: true }); render(); return; }
    // The relay's three seconds started when it answered; counting from the request keeps the page inside them.
    Object.assign(op, { phase: 'relay-armed', armedAt: startedAt, readyAt: Date.now(), window: RELAY_CONFIRM_MS, message: '' });
    render();
    cards.get(op.key).go.focus();
    announce(`The relay is ready. Confirm ${action.verb.toLowerCase()} on ${op.key === ALL ? `lanes ${targetsText(op.targets.filter(target => target.status === 'ready'))}` : `lane ${op.key}`} within 3 seconds.`);
  }
  async function confirm(key) {
    const op = ops.get(key);
    if (!op || !['armed', 'relay-armed'].includes(op.phase) || Date.now() - (op.readyAt ?? op.armedAt) < GUARD_MS) return; // a double tap never counts as the second step
    render(); // recheck the reading at the moment of the second step
    if (ops.get(key) !== op || !['armed', 'relay-armed'].includes(op.phase)) return;
    const action = ACTIONS[op.action], relayStep = op.phase === 'relay-armed';
    const going = op.targets.filter(target => relayStep ? target.status === 'ready' : true);
    op.phase = 'sending'; op.message = 'Sending to the relay.';
    render();
    cards.get(key).buttons[op.action].focus();
    const replies = await Promise.all(going.map(target => send(target, action, target.token)));
    replies.forEach((reply, index) => Object.assign(going[index], reply.status === 'token' ? { status: 'expired' } : reply));
    op.sentAt = Date.now();
    if (op.targets.some(target => target.status === 'accepted')) { op.phase = 'waiting'; op.message = describe(op); announce(op.message); }
    else finish(op, 'error', undefined, { sticky: true });
    render();
  }
  function cancel(key, { quiet = false } = {}) {
    const op = ops.get(key);
    if (!op || !['armed', 'relay-armed', 'asking'].includes(op.phase)) return false;
    ops.delete(key);
    render();
    cards.get(key).buttons[op.action].focus();
    if (!quiet) announce(op.phase === 'armed' ? 'Cancelled. Nothing sent.' : 'Cancelled. Nothing sent to the projector.');
    return true;
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button[data-act]');
    if (!button || !root.contains(button)) return;
    const key = button.closest('[data-lane]').dataset.lane, act = button.dataset.act;
    if (act === 'confirm') confirm(key); else if (act === 'cancel') cancel(key); else press(key, act);
  });
  root.addEventListener('keydown', event => { if (event.repeat && event.target.closest?.('button[data-act]')) event.preventDefault(); }); // a held key is one press
  pick?.addEventListener('click', event => {
    const button = event.target.closest('button[data-pick]');
    if (button) { selected = button.dataset.pick; render(); }
  });

  // ---- Render
  function renderOp(key, nodes, local, fallback) {
    const op = ops.get(key), phase = op?.phase || 'idle', armed = phase === 'armed' || phase === 'relay-armed';
    mark(nodes.card, 'data-phase', phase);
    reveal(nodes.actions, !armed); reveal(nodes.confirm, armed);
    if (armed) {
      const action = ACTIONS[op.action], left = Math.max(0, Math.ceil((op.armedAt + op.window - local) / 1000));
      const going = op.targets.filter(target => phase === 'armed' || target.status === 'ready');
      put(nodes.go, `Confirm ${action.verb.toLowerCase()} ${key === ALL ? targetsText(going) : key} (${left})`);
      const refused = op.targets.filter(target => target.status === 'refused' || target.status === 'unsure').map(target => ({ lane: target.lane, reason: target.detail }));
      const skipped = [...op.skipped, ...refused];
      const lead = phase === 'armed' ? 'Nothing sent yet.' : 'The relay is ready. Nothing sent to the projector yet.';
      put(nodes.confirmText, [key === ALL ? `${lead} Goes to ${targetsText(going)}.` : lead, skipped.length ? `Skipping ${skippedText(skipped)}.` : '', sharedNote].filter(Boolean).join(' '));
      mark(nodes.confirmText, 'title', nodes.confirmText.textContent);
    }
    // A reason the operator just asked for by tapping a blocked action comes first, then the last outcome.
    const asked = armed ? null : notes.get(key)?.text;
    const text = asked || op?.message || fallback || '';
    put(nodes.msg, text);
    mark(nodes.msg, 'data-kind', asked ? 'warn' : op?.message ? (phase === 'done' ? 'done' : phase === 'error' || phase === 'note' ? 'warn' : 'info') : 'info');
    mark(nodes.msg, 'title', text || null);
    return { phase, busy: LIVE_PHASES.includes(phase) && !armed, op };
  }
  function renderButtons(key, nodes, stateOf, busy, op) {
    for (const id of ACTION_IDS) {
      const state = stateOf(id), button = nodes.buttons[id], action = ACTIONS[id];
      mark(button, 'aria-disabled', String(!state.enabled || busy));
      mark(button, 'aria-busy', busy && op?.action === id ? 'true' : null);
      mark(button, 'aria-label', `${action.verb}, ${where(key)}${state.enabled ? '' : `. Blocked: ${state.reason}`}`);
      mark(button, 'title', state.enabled ? null : state.reason);
    }
  }
  function render({ views: nextViews, lock: nextLock, local = Date.now() } = {}) {
    if (nextViews) { views = nextViews; lock = nextLock ?? null; }
    settle(local);
    for (const view of views) {
      const nodes = cards.get(view.lane);
      mark(nodes.card, 'data-tone', view.tone);
      mark(nodes.card, 'data-reach', view.reach);
      put(nodes.model, view.model);
      put(nodes.state, view.headline);
      put(nodes.fresh, view.freshText);
      mark(nodes.fresh, 'title', view.freshText);
      put(nodes.fact.shutter.value, view.shutterText);
      const inputText = view.inputFlag ? `${view.inputText} · ${view.inputFlag.toLowerCase()}` : view.inputText;
      put(nodes.fact.input.value, inputText);
      mark(nodes.fact.input.value, 'title', inputText);
      mark(nodes.fact.pattern.value, 'title', view.patternText);
      mark(nodes.fact.input.wrap, 'data-flag', view.inputFlag ? '' : null);
      put(nodes.fact.pattern.value, view.patternText);
      mark(nodes.fact.pattern.wrap, 'data-flag', view.patternFlag ? '' : null);
      put(nodes.fact.link.value, view.link ? `${view.link.label}${view.link.unproven ? ' · unproven' : ''}` : 'Not reported');
      mark(nodes.fact.link.wrap, 'data-flag', view.link?.unproven ? '' : null);
      mark(nodes.fact.link.wrap, 'title', view.link?.unproven ? 'Power and shutter over the control port have not been proven on a rig yet.' : null);
      reveal(nodes.alarm, !!view.alarm);
      put(nodes.alarm, view.alarm ? `${view.alarm.text} reported` : '');
      const { busy, op } = renderOp(view.lane, nodes, local, sharedReason(view, options()));
      renderButtons(view.lane, nodes, id => actionState(view, id, options()), busy, op);
    }
    // All lanes
    const nodes = cards.get(ALL), summary = groupSummary(views), states = Object.fromEntries(ACTION_IDS.map(id => [id, groupState(views, id, options())]));
    const reasons = new Set(ACTION_IDS.map(id => states[id].enabled ? '' : states[id].reason));
    const connecting = views.some(view => view.reach === 'connecting'), down = views.length > 0 && views.every(view => view.reach === 'relay-offline');
    mark(nodes.card, 'data-tone', connecting ? 'off' : !summary.reading ? 'eye' : summary.lit === summary.total ? 'ok' : 'attention');
    mark(nodes.card, 'data-reach', connecting ? 'connecting' : down ? 'relay-offline' : 'live');
    put(nodes.model, 'One command per lane');
    put(nodes.state, connecting ? 'CONNECTING' : `${summary.reading} OF ${summary.total} READING`);
    put(nodes.fresh, lock === true ? 'Show Lock is on' : lock === false ? 'Show Lock is off' : 'Show Lock not read');
    put(nodes.fact.lit.value, `${summary.lit} of ${summary.total}`);
    put(nodes.fact.closed.value, summary.reading ? String(summary.closed) : 'Not reported');
    const { busy, op } = renderOp(ALL, nodes, local, reasons.size === 1 ? [...reasons][0] : '');
    renderButtons(ALL, nodes, id => states[id], busy, op);
    // Picker: one card at a time on a small screen. It carries each lane's state as a word.
    for (const key of KEYS) {
      const item = cards.get(key), view = viewOf(key);
      mark(item.card, 'data-selected', key === selected ? '' : null);
      if (!item.picker) continue;
      const tone = key === ALL ? nodes.card.dataset.tone : view?.tone || 'off', word = key === ALL ? `${summary.lit}/${summary.total}` : view?.word || '';
      mark(item.picker, 'data-tone', tone);
      mark(item.picker, 'aria-pressed', String(key === selected));
      mark(item.picker, 'aria-label', key === ALL ? `All lanes: ${summary.lit} of ${summary.total} lit` : `Lane ${key}, ${LANES[key].target}: ${view?.headline || 'no reading'}`);
      put(item.picker.lastChild, word);
    }
  }

  return {
    render,
    select(key) { if (KEYS.includes(key)) { selected = key; render(); } },
    get selected() { return selected; },
    // Escape withdraws whatever is armed. Returns true when something was.
    cancelArmed() { let any = false; for (const key of [...ops.keys()]) any = cancel(key) || any; return any; },
    get armed() { return [...ops.values()].some(op => ['armed', 'relay-armed', 'asking'].includes(op.phase)); },
  };
}
