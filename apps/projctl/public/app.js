import { LANES, laneOf, projectorName, orderedProjectors, rigLanes } from './lanes.js';
import { createStageView } from './stage-view.js';
import { lensDirection } from './lens-direction.js';
import { loadReference, mountReference, referenceGearHTML } from './reference-view.js';
import { startHeaderClock } from './header-clock.js';
startHeaderClock(document.querySelector('#operator-clock'));
const $ = (s, r = document) => r.querySelector(s);
let state = { projectors: [], presets: [], events: [], lock: false };
const confirmTokens = {}; // command key -> one-use token
const commandsInFlight = new Set();
let connected = false;
const dirtySetup = new Set();
let selectedDetailLane = null, referenceData = null, referenceView = null;
const referenceReady = loadReference('./workspace/projectors.json').then(data => { referenceData = data; if (selectedDetailLane) renderProjectorInfo(); return data; }).catch(() => null);
const stageView = createStageView(document.querySelector('#tab-stage'), (slot) => openAdjust(slot), (p) => canPattern(p));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Respect saved operator choice; a fresh browser starts in the light theme.
const root = document.documentElement;
root.dataset.theme = 'light';
try { const t = localStorage.getItem('theme'); if (['light', 'dark'].includes(t)) root.dataset.theme = t; } catch {}
$('#theme').onclick = () => { root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('theme', root.dataset.theme); } catch {} };

// tabs (WAI-ARIA tabs: arrow keys move, Home/End jump)
function wireTabs(list, attr, panelFor, onSelect = () => {}) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (t) => { tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; const panel = panelFor(x); panel.classList.toggle('on', on); panel.hidden = !on; }); onSelect(t); };
  tabs.forEach((t, i) => {
    t.onclick = () => select(t);
    t.onkeydown = (e) => { const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null; if (n == null) return; e.preventDefault(); const x = tabs[(n + tabs.length) % tabs.length]; x.focus(); select(x); };
  });
}
wireTabs($('.avd-tabs[aria-label="Views"]'), 'tab', (t) => $('#tab-' + t.dataset.tab), t => {
  selectedDetailLane = null; $('#tab-projector').hidden = true; $('#tab-projector').classList.remove('on');
  if (t.dataset.tab === 'info') ensureReference();
  if (t.dataset.tab === 'throw' && !$('#throw-calc-frame').getAttribute('src')) $('#throw-calc-frame').src = 'https://avbydave.com/ProjectorThrow/';
});
wireTabs($('.pj-sheet-tabs'), 'adjtab', (t) => $(`[data-adjpanel="${t.dataset.adjtab}"]`), (t) => { if (t.dataset.adjtab === 'picture' && adjSlot) loadPicture(); });

function toast(msg, ms = 4000) { if (!$('#adjust').hidden) $('#adj-feedback').textContent = msg; const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), ms); }

async function api(path, body) {
  const r = await fetch('/api/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(120000) });
  if (r.status === 401) { location.href = '/login.html'; throw new Error('login required'); }
  const j = await r.json(); if (!r.ok) throw new Error(j.error || r.statusText); return j;
}

async function cmd(slot, c, arg) {
  const key = c === 'lens' ? `${slot}:lens:${arg?.op === 'stop' ? 'stop' : 'move'}` : `${slot}:${c}:${JSON.stringify(arg)}`;
  if (!connected) { toast('Relay disconnected. Reconnect before sending commands.'); return false; }
  if (commandsInFlight.has(key)) return;
  commandsInFlight.add(key);
  if (c === 'lens') { $('#adj-motion').textContent = arg?.op === 'stop' ? 'Stopping lens...' : 'Lens moving. Waiting for stopped feedback...'; renderAdjust(); }
  try {
    const out = await api('command', { slot, cmd: c, arg, confirm: confirmTokens[key] });
    const r = out[slot];
    const errs = Object.entries(out).filter(([, v]) => v.error).map(([k, v]) => `${k}: ${v.error}`);
    if (r?.confirm) {
      confirmTokens[key] = r.confirm;
      toast([r.message, ...errs].join(' · '), 3000);
      setTimeout(() => { if (confirmTokens[key] === r.confirm) delete confirmTokens[key]; }, 3000);
      return;
    }
    delete confirmTokens[key];
    if (slot === 'all') toast(Object.entries(out).map(([k, v]) => `${k}: ${v.error || (v.result === 'OK' ? 'command accepted' : v.result)}`).join(' · '), 6000);
    else if (errs.length) toast(errs.join(' · '), 6000);
    else toast(c === 'lens' ? `${slot}: lens stopped; position refreshed` : `${slot}: command accepted`);
    if (r?.status) { const p = state.projectors.find((x) => x.slot === slot); if (p) p.status = r.status; }
    if (c === 'lens') $('#adj-motion').textContent = errs.length ? errs.join(' · ') : 'Lens stopped. Position confirmed by the projector.';
    return !errs.length;
  } catch (e) { toast(e.message, 6000); if (c === 'lens') $('#adj-motion').textContent = e.message; return false; }
  finally { commandsInFlight.delete(key); if (c === 'lens' && adjSlot) renderAdjust(); }
}
document.querySelectorAll('[data-all]').forEach((b) => b.onclick = () => cmd('all', b.dataset.all, b.dataset.all === 'resetInput' ? undefined : b.dataset.all === 'pattern' ? b.dataset.arg : Number(b.dataset.arg)));

$('#show-lock').onclick = () => api('lock', { lock: !state.lock }).catch((e) => toast(e.message));
$('#preset-save').onclick = () => { const n = $('#preset-name').value.trim(); if (!n) return toast('Name the preset first'); api('preset/save', { name: n }).then(() => { $('#preset-name').value = ''; toast(`Saved ${n}`); }).catch((e) => toast(e.message)); };
$('#discover').onclick = async () => { $('#discover-out').textContent = 'searching…'; try { const r = await api('discover'); $('#discover-out').textContent = r.note ? r.note : `${r.found.length} replied, ${r.changed} updated`; } catch (e) { $('#discover-out').textContent = e.message; } };

// ---- render ----
let PATTERNS = { '00': 'Off', '08': 'Colour bars' }; let PICTURE = {};
fetch('/api/schema').then((r) => r.json()).then((j) => { PATTERNS = j.patterns; PICTURE = j.picture; }).catch(() => {});
function canPattern(p) { return !!p.patterns || p.driver === 'panasonic' || p.driver === 'simulator'; }
// Circle plus word. online+on: done "Powered"; standby: queued; cooling/warming: waiting; offline: blocked.
function stateOf(p) {
  const s = p.status || {};
  if (!connected) return { st: 'blocked', word: 'Relay disconnected' };
  if (!s.online) return { st: 'blocked', word: s.connection?.state === 'checking' ? 'Checking connection' : s.connection?.state === 'unassigned' || !p.ip ? 'No address' : 'No reply' };
  if (s.power === 'on') return { st: 'done', word: 'Powered' };
  if (s.power === 'cooling') return { st: 'waiting', word: 'Cooling' };
  if (s.power === 'warming') return { st: 'waiting', word: 'Warming' };
  if (s.power === 'off') return { st: 'queued', word: 'Standby' };
  return { st: 'idle', word: 'Unknown' };
}
const pill = (st, word) => `<span class="avd-state"><span class="avd-dot avd-dot--${st}" aria-hidden="true"></span>${esc(word)}</span>`;
const seg = (label, opts, cur, attrs) => `<div class="avd-seg avd-seg--fill" role="group" aria-label="${esc(label)}">${opts.map(([v, lab]) => `<button class="avd-seg__btn" type="button" aria-pressed="${String(cur) === String(v)}" ${attrs(v)}>${esc(lab)}</button>`).join('')}</div>`;

function renderOverview() {
  referenceView?.updateLive(state,connected);
  $('[data-all="resetInput"]').disabled = !connected || state.lock || !state.projectors.some((p) => p.inputPreference?.available && p.status?.online && !p.busy);
  const online = state.projectors.filter((p) => p.status?.online).length;
  const assigned = rigLanes(state.projectors).filter((x) => x.projector).length;
  $('#relay-mode').textContent = state.simulation === true ? 'DEMO · simulated devices' : state.simulation === false ? 'REAL RELAY' : 'Connecting…';
  $('#relay-mode').classList.toggle('pj-mode--demo', state.simulation === true);
  const staticPreview = location.pathname.includes('/apps/projctl/public') || ['systembydave.com', 'www.systembydave.com', 'davehomeassist.github.io'].includes(location.hostname);
  $('#local-controller-help').hidden = connected || !staticPreview;
  $('#summary').textContent = connected ? `${online} / ${state.projectors.length} devices replying · ${assigned} / 4 lanes assigned` : 'Relay disconnected · device data unavailable';
  $('#connection-note').textContent = !connected ? 'Reconnecting automatically. Displayed values are last known; current projector power is unknown.' : online < state.projectors.length ? 'Relay connected. Devices without a reply: check the venue network and projector connection. No reply does not confirm power off.' : state.simulation ? 'Simulator data · no physical projector feedback. Status updates automatically.' : 'Device feedback updates automatically. Each card shows its latest successful reply.';
}
function replyTime(s) {
  const at = s.connection?.lastSuccessAt || (s.online ? s.updatedAt : null);
  return at ? new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No successful reply yet';
}
function renderGrid() {
  const g = $('#grid');
  const active = document.activeElement;
  const editing = g.contains(active) && active.matches('select[data-c="input"]') ? state.projectors.find((p) => p.slot === active.closest('[data-slot]')?.dataset.slot) : null;
  // Preserve only the active native select. Other telemetry and safety state must keep updating.
  const keepSelect = editing && active.dataset.editing === 'true' && connected && editing.status?.online && !state.lock && !editing.busy && !active.disabled && active._inputOptions === JSON.stringify(Object.entries(editing.inputs || {}));
  const focusKey = g.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null; const scroll = g.scrollTop;
  const unassignedOpen = g.querySelector('.pj-unassigned')?.open || false;
  const inputOptionsOpen = new Set([...g.querySelectorAll('details[data-input-options][open]')].map((el) => el.dataset.inputOptions));
  const output = document.createElement('div');
  function deviceCard(p, lane = laneOf(p)) {
    const s = p.status || {}; const off = !connected || !s.online; const lock = state.lock;
    const { st, word } = stateOf(p);
    const errs = Object.entries(s.errors || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k}${v === 2 ? ' fault' : ' warning'}`);
    const inputs = Object.entries(p.inputs || {});
    const alarmKnown = s.errors != null && !!(s.connection?.lastSuccessAt || s.online);
    const inputMatched = s.input != null && inputs.some(([id]) => id === String(s.input));
    const inputPlaceholder = s.input == null || s.input === '' ? 'No input reported' : `Reported input: ${s.input} (not in available options)`;
    const busy = !!p.busy;
    const preference = p.inputPreference;
    const preferredLabel = preference?.label || state.preferredInput || 'HDMI';
    const resetAvailable = preference?.available === true;

    const pat = s.pattern ? ((p.patterns || PATTERNS)[s.pattern] || s.pattern) : '—';
    const card = document.createElement('section'); card.className = 'avd-panel pj-tile' + (off ? ' offline' : ''); card.dataset.slot = p.slot; card.dataset.lane = lane ? p.lane : ''; card.setAttribute('aria-label', lane ? projectorName(p) : `Unassigned ${p.label}`);
    card.innerHTML = `
      <div class="avd-panel__head"><h2 class="avd-panel__title"><span class="avd-panel__index">${lane ? esc(p.lane) : '—'}</span>${esc(lane ? 'Projector ' + p.lane : p.label)}<span class="avd-dot avd-dot--${st}" aria-hidden="true"></span></h2></div>
      <div class="avd-panel__body">
        ${lane ? `<div class="pj-lane"><h3>${esc(lane.target)}</h3><span class="pj-mono">${esc(lane.role)} · ${esc(lane.orientation)}</span><span class="pj-lane-device pj-mono">${esc(p.model || p.label)}</span></div>` : `<p class="pj-mono">Unassigned · Relay ${esc(p.slot)}</p>`}
        <div class="pj-tile-top">${pill(st, word)}<span class="pj-mono">${esc(p.owner)} · ${esc(p.ip || 'no address')}</span></div>
        <div class="pj-telemetry-note pj-mono">${off ? 'Current values unavailable · last known below' : state.simulation ? 'Simulated feedback' : 'Projector feedback'}<span>Last reply: ${esc(replyTime(s))}</span>${off && s.connection?.error ? `<span>${esc(s.connection.error)}</span>` : ''}</div>
        <p class="pj-mono" role="status" ${busy ? '' : 'style="display:none"'}>Lens moving</p>
        <div class="pj-tile-top" ${errs.length ? '' : 'style="display:none"'}>${errs.map((e) => pill('blocked', e)).join('')}</div>
        <div class="pj-two">
          <div class="avd-readout avd-readout--sm"><span class="avd-readout__label avd-eyebrow">Input</span><span class="avd-readout__value">${esc(s.input ? (p.inputs?.[s.input] || s.input) : '—')}</span></div>
          <div class="avd-readout avd-readout--sm"><span class="avd-readout__label avd-eyebrow">Light source</span><span class="avd-readout__value">${s.lightHours != null ? esc(s.lightHours) + '<span class="avd-readout__unit">h</span>' : '—'}</span></div>
        </div>
        ${lane ? `<button class="avd-btn pj-open-projector" type="button" data-open-projector="${esc(p.lane)}">Open ${esc(p.lane)} · controls &amp; info</button>` : ''}
        <div class="pj-health pj-mono"><span>Shutter <strong>${esc(s.shutter || 'Unknown')}</strong></span><span>Alarms <strong>${!alarmKnown ? 'Unavailable' : errs.length ? esc(errs.length + ' reported') : 'None reported'}</strong></span></div>
        <div class="avd-field"><span class="avd-field__label pj-caps">Shutter control</span>
          ${seg(`Shutter, ${lane ? 'Projector ' + p.lane : p.label}`, [['open', 'Open'], ['closed', 'Closed']], s.shutter, (v) => `data-c="shutter" data-a="${v === 'closed' ? 1 : 0}" ${off ? 'disabled' : ''}`)}
        </div>
        <div class="pj-two">
          <button class="avd-btn" data-c="power" data-a="1" type="button" ${off || busy || s.power === 'cooling' ? 'disabled' : ''}>Power on</button>
          <button class="avd-btn avd-btn--danger" data-c="power" data-a="0" type="button" ${off || busy || lock || s.power === 'off' ? 'disabled' : ''}>Power off</button>
        </div>
        <div class="pj-input-actions">
          <button class="avd-btn avd-btn--primary avd-btn--block" data-reset-input type="button" ${off || busy || lock || !resetAvailable ? 'disabled' : ''}>Reset to ${esc(preferredLabel)}</button>
          <p class="pj-mono pj-note" ${resetAvailable ? 'style="display:none"' : ''}>${esc(preferredLabel)} input has not been verified for this projector.</p>
          <details class="pj-input-options" data-input-options="${esc(p.slot)}" ${inputOptionsOpen.has(p.slot) ? 'open' : ''}>
            <summary data-focus-key="${esc(p.slot)}:input-options">Other inputs</summary>
            <label class="avd-field"><span class="avd-field__label pj-caps">Select another input</span>
              <select class="avd-input" data-c="input" ${off || busy || lock || !inputs.length ? 'disabled' : ''}>${!inputMatched ? `<option value="" disabled selected>${esc(inputPlaceholder)}</option>` : ''}${inputs.map(([id, lab]) => `<option value="${esc(id)}" ${String(s.input) === id ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>
            </label>
          </details>
        </div>
        <div class="pj-well"><span class="avd-eyebrow">Test pattern</span><span class="pj-mono pj-ink">${esc(pat)}</span></div>
        <div class="pj-two">
          <button class="avd-btn avd-btn--quiet" data-p="08" type="button" ${off || busy || lock || !canPattern(p) ? 'disabled' : ''}>Colour bars</button>
          <button class="avd-btn avd-btn--quiet" data-p="00" type="button" ${off || busy || lock || !canPattern(p) ? 'disabled' : ''}>Pattern off</button>
        </div>
        <div class="pj-adjust-links" role="group" aria-label="Details and adjustments"><button class="avd-btn" data-adj="lens" type="button">Lens</button><button class="avd-btn" data-adj="picture" type="button">Picture</button><button class="avd-btn" data-adj="pattern" type="button">Patterns</button></div>
      </div>`;
    card.querySelector('[data-open-projector]')?.addEventListener('click', () => openProjector(p.lane));
    card.querySelectorAll('button[data-c]').forEach((b) => b.onclick = () => cmd(p.slot, b.dataset.c, Number(b.dataset.a)));
    card.querySelector('[data-reset-input]').onclick = () => cmd(p.slot, 'resetInput');
    card.querySelectorAll('button[data-p]').forEach((b) => b.onclick = () => cmd(p.slot, 'pattern', b.dataset.p));
    card.querySelectorAll('button[data-adj]').forEach((b) => b.onclick = () => openAdjust(p.slot, b.dataset.adj));
    const sel = card.querySelector('select'); sel._inputOptions = JSON.stringify(inputs);
    sel.onpointerdown = () => { sel.dataset.editing = 'true'; };
    sel.onkeydown = (e) => { if (['ArrowDown', 'ArrowUp', ' ', 'Enter'].includes(e.key)) sel.dataset.editing = 'true'; if (e.key === 'Escape') { delete sel.dataset.editing; setTimeout(renderGrid, 0); } };
    sel.onchange = () => { delete sel.dataset.editing; cmd(p.slot, 'input', sel.value); setTimeout(renderGrid, 0); };
    sel.onblur = () => { delete sel.dataset.editing; setTimeout(renderGrid, 0); };
    card.querySelectorAll('button, select').forEach((el, n) => { el.dataset.focusKey = el.hasAttribute('data-reset-input') ? `${p.slot}:reset-input` : `${p.slot}:${n}`; });
    return card;
  }
  const bound = new Set();
  for (const { lane, projector, conflict } of rigLanes(state.projectors)) {
    if (projector) { bound.add(projector); output.appendChild(deviceCard(projector)); continue; }
    const info = LANES[lane], card = document.createElement('section');
    card.className = 'avd-panel pj-tile pj-unbound'; card.dataset.lane = lane;
    card.setAttribute('aria-label', `Projector ${lane} · ${info.target} · ${conflict ? 'Assignment conflict' : 'Unassigned'}`);
    card.innerHTML = `<div class="avd-panel__head"><h2 class="avd-panel__title"><span class="avd-panel__index">${lane}</span>Projector ${lane}</h2></div>
      <div class="avd-panel__body"><div class="pj-lane"><h3>${esc(info.target)}</h3><span class="pj-mono">${esc(info.role)} · ${esc(info.orientation)}</span></div>
      ${pill('idle', conflict ? 'Assignment conflict' : 'Unassigned')}<p class="pj-mono">${conflict ? 'More than one device uses this lane. Check Setup.' : 'No device assigned to this position.'}</p>
      <button class="avd-btn" type="button" data-open-projector="${lane}" data-focus-key="lane:${lane}:info">Open ${lane} · info</button><button class="avd-btn" type="button" data-open-setup data-focus-key="lane:${lane}:setup">Open Configuration</button></div>`;
    card.querySelector('[data-open-projector]').onclick = () => openProjector(lane);
    card.querySelector('[data-open-setup]').onclick = () => { $('[data-tab="setup"]').click(); $('[data-tab="setup"]').focus(); };
    output.appendChild(card);
  }
  const unassigned = state.projectors.filter((p) => !bound.has(p));
  if (unassigned.length) {
    const extra = document.createElement('details'); extra.className = 'pj-unassigned'; extra.open = unassignedOpen;
    extra.innerHTML = `<summary class="avd-btn" data-focus-key="unassigned">Unassigned devices (${unassigned.length})</summary><div class="pj-grid"></div>`;
    unassigned.forEach((p) => extra.querySelector('.pj-grid').appendChild(deviceCard(p, null)));
    output.appendChild(extra);
  }
  const nextSelect = [...output.querySelectorAll('select[data-c="input"]')].find(node => node.closest('[data-slot]')?.dataset.slot === editing?.slot);
  const pathTo = (node, root) => { const path = []; while (node && node !== root) { path.unshift([...node.parentNode.childNodes].indexOf(node)); node = node.parentNode; } return node === root ? path.join('.') : null; };
  const retained = keepSelect && nextSelect && pathTo(active, g) === pathTo(nextSelect, output);
  if (retained) {
    const patch = (current, desired) => {
      const before = [...current.childNodes], after = [...desired.childNodes];
      after.forEach((next, index) => {
        const old = before[index];
        if (old === active) return; // Never detach or repopulate an open native menu.
        if (old?.nodeType === 1 && old.contains(active)) {
          for (const attr of [...old.attributes]) if (!next.hasAttribute(attr.name)) old.removeAttribute(attr.name);
          for (const attr of [...next.attributes]) old.setAttribute(attr.name, attr.value);
          patch(old, next);
        } else if (old) old.replaceWith(next);
        else current.append(next);
      });
      before.slice(after.length).forEach(node => node.remove());
    };
    patch(g, output);
  } else g.replaceChildren(...output.childNodes);
  if (selectedDetailLane) {
    const selected = rigLanes(state.projectors).find(item => item.lane === selectedDetailLane)?.projector;
    if (selected) {
      const detailCard = deviceCard(selected); detailCard.classList.remove('pj-tile'); detailCard.classList.add('pj-detail-controls');
      detailCard.querySelector('[data-open-projector]')?.remove();
      updateDetailControls(detailCard);
    } else {
      $('#projector-controls').innerHTML = '<div class="pj-device-note"><h3>No assigned live device</h3><p>This lane remains available for recorded gear and planning information. Controls become available after a unique device is assigned in Configuration.</p></div>';
    }
    renderDisplayInfo(selected);
  }
  g.scrollTop = scroll;
  if (focusKey && !retained) [...g.querySelectorAll('[data-focus-key]')].find((el) => el.dataset.focusKey === focusKey)?.focus({ preventScroll: true });
}
function updateDetailControls(card) {
  const host = $('#projector-controls'), active = document.activeElement, key = host.contains(active) ? active.dataset.focusKey : null;
  const desired = document.createElement('div'); desired.append(card);
  const p = state.projectors.find(item => item.slot === card.dataset.slot);
  const keep = host.contains(active) && active.matches('select[data-c="input"]') && active.dataset.editing === 'true' && connected && p?.status?.online && !state.lock && !p.busy && active._inputOptions === JSON.stringify(Object.entries(p.inputs || {}));
  const path = (node, root) => { const out = []; while (node && node !== root) { out.unshift([...node.parentNode.childNodes].indexOf(node)); node = node.parentNode; } return node === root ? out.join('.') : null; };
  const next = card.querySelector('select[data-c="input"]');
  const retain = keep && path(active,host) === path(next,desired);
  const patch = (old, fresh) => {
    const before=[...old.childNodes],after=[...fresh.childNodes];
    after.forEach((node,i) => {const prev=before[i];if(prev===active)return;if(prev?.nodeType===1&&prev.contains(active)){for(const attr of [...prev.attributes])if(!node.hasAttribute(attr.name))prev.removeAttribute(attr.name);for(const attr of [...node.attributes])prev.setAttribute(attr.name,attr.value);patch(prev,node);}else if(prev)prev.replaceWith(node);else old.append(node);});before.slice(after.length).forEach(node=>node.remove());
  };
  if(retain)patch(host,desired);else host.replaceChildren(card);
  if(key&&!retain)[...host.querySelectorAll('[data-focus-key]')].find(node=>node.dataset.focusKey===key)?.focus({preventScroll:true});
}
async function ensureReference() {
  if (referenceView) return referenceView;
  try { referenceView = await mountReference($('#reference-view'), {dataUrl:'./workspace/projectors.json',onProjectorSelect:openProjector}); referenceView.updateLive(state,connected); }
  catch(error){$('#reference-view').textContent=error.message;}
  return referenceView;
}
function openProjector(lane) {
  if (!Object.hasOwn(LANES,lane)) return;
  $('#tab-btn-rig').click(); selectedDetailLane=lane;
  $('#tab-rig').hidden=true;$('#tab-rig').classList.remove('on');
  const detail=$('#tab-projector');detail.hidden=false;detail.classList.add('on');detail.dataset.lane=lane;
  $('#projector-detail-title').textContent=`${lane} · ${LANES[lane].target}`;
  document.querySelectorAll('[data-detail-lane]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.detailLane===lane)));
  renderGrid();renderProjectorInfo();$('#projector-detail-title').focus();
}
function renderProjectorInfo() {
  const lane=selectedDetailLane;if(!lane)return;
  const item=referenceData?.projectors.find(item=>item.lane===lane);
  $('#projector-static-info').innerHTML=item?`<h3>Recorded gear &amp; planning</h3><p>${esc(item.note)}</p><div class="fr-gear-grid">${referenceGearHTML(referenceData,lane)}</div>`:'<p>Loading recorded gear reference…</p>';
}
function reportedValue(value) { return value == null || value === '' ? 'Unavailable' : typeof value === 'object' ? JSON.stringify(value) : String(value); }
function renderDisplayInfo(p) {
  const info=p?.displayInfo?.scope==='projector'?p.displayInfo:null;
  const status=p?.status||{};
  const input=info?.input || (status.input!=null ? {state:connected&&status.online?'reported':'offline',value:status.input,label:p.inputs?.[status.input]||status.input,observedAt:status.connection?.lastSuccessAt||status.updatedAt} : null),signal=info?.signal,edid=info?.edid;
  const field=(label,data,fallback)=>{const stale=!connected||data?.state==='offline';return `<div><dt>${label}</dt><dd>${esc(data?.value!=null ? (data.label || reportedValue(data.value)) : fallback)}<br><span class="pj-mono">${esc(stale&&data?.value!=null?'Last known · ': '')}${esc(data?.state || (p?'unsupported':'unassigned'))}${data?.observedAt?' · '+esc(new Date(data.observedAt).toLocaleString()):''}</span></dd></div>`;};
  $('#projector-display-info').innerHTML=`<dl>${field('Reported input',input,'No input reported')}${field('Driver signal readout',signal,'Signal information unavailable')}<div><dt>Projector EDID</dt><dd>${esc(edid?.state==='reported'&&edid.value!=null?reportedValue(edid.value):edid?.reason||(p?'EDID is not read by this driver.':'No device is assigned to this lane; projector EDID is unavailable.'))}<br><span class="pj-mono">${esc(edid?.state||(p?'unsupported':'unassigned'))} · projector scope</span></dd></div></dl><p class="pj-detail-unavailable">Input names and signal readings are separate from EDID. No resolution or EDID is inferred from the selected input.</p>`;
}
$('#projector-back').onclick=()=>$('#tab-btn-rig').click();
document.querySelectorAll('[data-detail-lane]').forEach(button=>button.onclick=()=>openProjector(button.dataset.detailLane));
$('#host-displays-load').onclick=async()=>{
  const output=$('#host-display-results');output.textContent='Reading relay computer display records…';
  try{const response=await fetch('/api/host-displays',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(response.status===401){location.href='/login.html';return;}const data=await response.json();if(!response.ok||data.scope!=='relay-computer')throw Error(data.reason||'Computer display information unavailable.');output.innerHTML=`<p class="pj-mono">${esc(data.state)} · ${esc(data.reason||'OS records only; no projector assignment implied.')}</p>${(data.displays||[]).map(display=>`<article><strong>${esc(display.name||display.id)}</strong><p>${esc(reportedValue(display.resolution))} · ${esc(display.connection||'Connection unknown')}</p><p class="pj-mono">EDID ${esc(display.edid?.state||'unavailable')} · unassigned to A–D</p></article>`).join('')}`;}catch(error){output.textContent=error.message;}
};
window.addEventListener('projctl:navigate',event=>{const {panel,projector}=event.detail||{};if(!['home','notes','info','rig','stage','presets','log','setup','throw'].includes(panel))return;document.querySelector(`#tab-btn-${panel}`)?.click();if(projector&&Object.hasOwn(LANES,projector))openProjector(projector);});

function slotName(slot) { const p = state.projectors.find((p) => p.slot === slot); return p && laneOf(p) ? `${slot} · ${p.lane} / ${laneOf(p).target}` : slot; }
const presetResults = new Map(), presetConfirmations = new Map();
function renderPresets() {
  const el = $('#presets'); el.innerHTML = '';
  if (!state.presets.length) el.innerHTML = '<p class="pj-mono">No presets yet. Set the rig how you want it, name it, save.</p>';
  for (const preset of state.presets) {
    const hasLens = Object.values(preset.perSlot).some(want => want.lens && Object.keys(want.lens).length);
    const node = document.createElement('div'); node.className = 'pj-item'; node.dataset.preset = preset.name;
    const summary = Object.entries(preset.perSlot).map(([slot,want]) => {
      const projector = state.projectors.find(p=>p.slot===slot);
      const axes = Object.entries(want.lens||{}).map(([axis,value])=>`${axis}: ${value}`).join(' · ');
      const lens = projector?.capabilities?.lensRecall ? axes || 'No absolute lens position stored' : 'Absolute lens recall unsupported / not stored';
      return `<span class="pj-preset-slot"><strong>${esc(slotName(slot))}</strong> · ${want.power?'on':'off'} · ${esc(want.shutter)} · ${esc(want.input??'input unknown')}<br><span class="pj-mono">${esc(lens)}</span></span>`;
    }).join('');
    const output = presetResults.get(preset.name);
    node.innerHTML = `<strong class="name">${esc(preset.name)}</strong><button class="avd-btn" type="button" data-recall ${!connected||state.lock?'disabled':''}>${presetConfirmations.has(preset.name)?'Confirm lens recall':'Recall'}</button><button class="avd-btn avd-btn--danger" type="button" data-delete>Remove preset</button><div class="sum">${summary}</div>${hasLens?'<p class="pj-mono pj-note">Lens recall requires a separate confirmation. Readbacks report position matching separately from motor state; alignment and focus still need checking.</p>':''}<p class="pj-mono" role="status">${esc(output||'')}</p>`;
    let armed = 0;
    node.querySelector('[data-recall]').onclick = async () => {
      if (!connected || state.lock) return;
      if (!hasLens && Date.now()-armed>3000) { armed=Date.now();toast(`Tap again within 3 s to recall ${preset.name}`);return; }
      const token=presetConfirmations.get(preset.name);
      try {
        const response=await api('preset/recall',{name:preset.name,...(token?{confirmLens:token}:{})});
        if(response.confirm){presetConfirmations.set(preset.name,response.confirm);presetResults.set(preset.name,response.message||'Confirm the lens recall to send movement commands.');}
        else{presetConfirmations.delete(preset.name);const results=response.projectors||response;presetResults.set(preset.name,Object.entries(results).map(([slot,result])=>`${slotName(slot)}: ${typeof result==='string'?result:JSON.stringify(result)}`).join(' · '));}
        armed=0;renderPresets();
      }catch(error){presetConfirmations.delete(preset.name);presetResults.set(preset.name,error.message);renderPresets();}
    };
    node.querySelector('[data-delete]').onclick=()=>api('preset/delete',{name:preset.name}).then(()=>{presetResults.delete(preset.name);presetConfirmations.delete(preset.name);}).catch(error=>toast(error.message));
    el.append(node);
  }
}

function renderLog() {
  const tb = $('#log tbody'); tb.innerHTML = '';
  const query = $('#log-search').value.toLowerCase();
  for (const e of [...state.events].reverse().filter((e) => !query || [e.slot, slotName(e.slot), e.command, e.result, e.detail, e.source].join(' ').toLowerCase().includes(query))) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="avd-td--mono">${new Date(e.at).toLocaleTimeString()}</td><td class="avd-td--mono">${esc(slotName(e.slot))}</td><td>${esc(e.command)}</td><td class="${e.result === 'OK' ? 'ok' : e.result === 'ERR' ? 'err' : ''}">${esc(e.result)}${e.detail ? ' · ' + esc(e.detail) : ''}</td><td class="pj-mono">${esc(e.source)}</td>`;
    tb.appendChild(tr);
  }
}
$('#log-search').oninput = renderLog;
function renderSetup() {
  const el = $('#setup');
  [...el.children].filter((node) => !dirtySetup.has(node.dataset.slot) && !node.contains(document.activeElement)).forEach((node) => node.remove());
  const field = (label, inner) => `<label class="avd-field"><span class="avd-field__label">${label}</span>${inner}</label>`;
  for (const p of state.projectors) {
    if (dirtySetup.has(p.slot) || [...el.children].some((node) => node.dataset.slot === p.slot && node.contains(document.activeElement))) continue;
    const d = document.createElement('div'); d.className = 'pj-item pj-setup'; d.dataset.slot = p.slot;
    d.innerHTML = `<div class="pj-setup-heading"><strong>${esc(projectorName(p))}</strong><span class="pj-mono">${esc(p.model || p.label)} · Relay ${esc(p.slot)}</span></div>
      <fieldset class="pj-setup-fields"><legend>Identity &amp; position</legend>
      ${field('Label', `<input class="avd-input" value="${esc(p.label)}" data-k="label">`)}
      ${field('Drawing lane', `<select class="avd-input" data-k="lane"><option value="">Unassigned</option>${Object.entries(LANES).map(([id, lane]) => `<option value="${id}" ${p.lane === id ? 'selected' : ''}>${id} · ${lane.target}</option>`).join('')}</select>`)}
      </fieldset><fieldset class="pj-setup-fields"><legend>Connection</legend>
      ${field('MAC', `<input class="avd-input" value="${esc(p.mac || '')}" placeholder="aa:bb:cc:dd:ee:ff" data-k="mac">`)}
      ${field('IP', `<input class="avd-input" value="${esc(p.ip || '')}" placeholder="192.168.1.x" data-k="ip">`)}
      ${field('Admin user', `<input class="avd-input" value="${esc(p.user || '')}" placeholder="admin1" data-k="user">`)}
      ${field('Driver', `<select class="avd-input" data-k="driver">${['pjlink', 'panasonic', 'pulse', 'simulator'].map((x) => `<option ${p.driver === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`)}
      </fieldset><fieldset class="pj-setup-fields"><legend>Mounting &amp; access</legend>
      ${field('Left / right image shift', `<select class="avd-input" data-k="reverseH"><option value="false">Normal</option><option value="true" ${p.reverseH === true ? 'selected' : ''}>Reversed</option></select>`)}
      ${field('Up / down image shift', `<select class="avd-input" data-k="reverseV"><option value="false">Normal</option><option value="true" ${p.reverseV === true ? 'selected' : ''}>Reversed</option></select>`)}
      ${field('PJLink password <span class="avd-field__opt">(blank keeps current)</span>', `<input class="avd-input" type="password" value="" data-k="password" autocomplete="new-password">`)}
      ${field('Notes', `<input class="avd-input" value="${esc(p.notes || '')}" data-k="notes">`)}
      </fieldset><div class="pj-setup-footer"><button class="avd-btn avd-btn--primary" type="button">Save</button></div>`;
    d.querySelector('button').onclick = () => { const upd = { slot: p.slot }; d.querySelectorAll('[data-k]').forEach((i) => { const v = i.value.trim(); if (i.dataset.k === 'password' && !v) return; upd[i.dataset.k] = ['reverseH', 'reverseV'].includes(i.dataset.k) ? v === 'true' : v; }); api('projector', upd).then(() => { dirtySetup.delete(p.slot); toast(`${p.slot} saved`); }).catch((e) => toast(e.message)); };
    d.addEventListener('input', () => dirtySetup.add(p.slot));
    d.addEventListener('change', () => dirtySetup.add(p.slot));
    const order = orderedProjectors(state.projectors).map((x) => x.slot);
    el.insertBefore(d, [...el.children].find((node) => order.indexOf(node.dataset.slot) > order.indexOf(p.slot)) || null);
  }
}
function renderAll() {
  $('#show').textContent = state.show || 'Projectors';
  const lockButton = $('#show-lock');
  const lockLabel = state.lock ? 'Show lock on. Disable show lock' : 'Show lock off. Enable show lock';
  lockButton.setAttribute('aria-pressed', String(!!state.lock));
  lockButton.setAttribute('aria-label', lockLabel); lockButton.title = lockLabel;
  lockButton.dataset.lockState = state.lock ? 'locked' : 'unlocked';
  renderOverview();
  $('[data-all="resetInput"]').textContent = `Reset all to ${state.preferredInput || 'HDMI'}`;
  $('#count-rig').textContent = state.projectors.length; $('#count-presets').textContent = state.presets.length || '';
  document.querySelectorAll('[data-all="power"][data-arg="0"], [data-all="pattern"]').forEach((b) => b.disabled = state.lock || !connected);
  renderGrid(); renderPresets(); renderLog(); renderSetup(); stageView.update(state, connected); if (adjSlot) renderAdjust();
}

// ---- Adjust sheet: patterns, lens, picture ----
let adjSlot = null, adjSpeed = 'slow', adjHomeArmed = 0, adjReturnFocus = null, adjReturnSection = 'pattern', pictureRequestId = 0;
function openAdjust(slot, section = 'pattern') {
  pictureRequestId++; $('#adj-picture').replaceChildren(); $('#adj-pic-note').textContent = '';
  adjSlot = slot; const p = state.projectors.find((x) => x.slot === slot); if (!p) return;
  adjReturnFocus = document.activeElement; adjReturnSection = section;
  $('#adj-title').textContent = projectorName(p); $('#adj-sub').textContent = [slot, laneOf(p)?.orientation, p.model, p.ip].filter(Boolean).join(' · ');
  $('#adjust').dataset.lane = laneOf(p) ? p.lane : '';
  $('#adjust').hidden = false; $('#adjust').showModal(); $('#adj-feedback').textContent = ''; $('#adj-motion').textContent = ''; renderAdjust(); $(`[data-adjtab="${section}"]`).click(); $('#adj-close').focus();
}
function closeAdjust() {
  const slot = adjSlot, section = adjReturnSection;
  $('#adjust').close(); $('#adjust').hidden = true; adjSlot = null;
  pictureRequestId++; $('#adj-picture').replaceChildren(); $('#adj-pic-note').textContent = '';
  const card = [...$(selectedDetailLane ? '#projector-controls' : '#grid').querySelectorAll('[data-slot]')].find((el) => el.dataset.slot === slot);
  const currentTrigger = card?.querySelector(`[data-adj="${section}"]:not(:disabled)`);
  const originalTrigger = adjReturnFocus?.isConnected && adjReturnFocus.matches('button:not(:disabled), [role="button"]') ? adjReturnFocus : null;
  (currentTrigger || originalTrigger || card?.querySelector('[data-adj]:not(:disabled)') || $('#tab-btn-rig')).focus();
}

function renderAdjust() {
  const p = state.projectors.find((x) => x.slot === adjSlot); if (!p) return;
  const off = !connected || !p.status?.online;
  const moving = p.busy || commandsInFlight.has(`${adjSlot}:lens:move`);
  const lens = p.status?.lens;
  const readback = lens && p.driver === 'pulse' ? Object.entries({ h: 'H', v: 'V', focus: 'Focus', zoom: 'Zoom' }).map(([key, label]) => `${label} ${lens[key] ?? '?'}`).join(' · ') : '';
  $('#adj-position').textContent = readback;
  const cur = p.status?.pattern; const table = p.patterns || PATTERNS;
  $('#adj-pattern-now').textContent = 'Showing: ' + (table[cur] || (cur ? cur : 'unknown'));
  const patternFocus = document.activeElement?.dataset.pattern;
  const el = $('#adj-patterns'); el.innerHTML = '';
  for (const [code, name] of Object.entries(table)) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.pattern = code; b.className = 'avd-btn'; b.textContent = name; b.setAttribute('aria-pressed', String(cur === code));
    b.disabled = state.lock || off || !!moving || !canPattern(p); b.onclick = () => cmd(adjSlot, 'pattern', code); el.appendChild(b);
  }
  if (patternFocus) [...el.children].find((b) => b.dataset.pattern === patternFocus)?.focus({ preventScroll: true });
  $('#adj-speed').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === adjSpeed)));
  document.querySelectorAll('.lens button, #adj-home, #adj-speed button').forEach((b) => b.disabled = state.lock || off || !!moving || p.capabilities?.lens === false || (p.driver === 'pulse' && p.status?.power !== 'on'));
  $('#adj-stop').hidden = p.driver !== 'pulse'; $('#adj-stop').disabled = off;
  updatePictureLock();
}
function updatePictureLock() {
  const p = state.projectors.find((x) => x.slot === adjSlot);
  const unavailable = !connected || !p?.status?.online || !!p.busy;
  document.querySelectorAll('#adj-picture input, #adj-picture select').forEach((el) => { el.disabled = state.lock || unavailable || el.dataset.unavailable === 'true'; });
}
$('#adj-close').onclick = closeAdjust;
$('#adjust').addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const controls = [...$('#adjust').querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter((el) => el.tabIndex >= 0 && el.getClientRects().length);
  const first = controls[0], last = controls.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
});
$('#adjust').addEventListener('cancel', (e) => { e.preventDefault(); closeAdjust(); });
$('#adj-stop').onclick = () => cmd(adjSlot, 'lens', { op: 'stop' });
$('#adjust').onclick = (e) => { if (e.target === $('#adjust')) closeAdjust(); };

$('#adj-speed').querySelectorAll('button').forEach((b) => b.onclick = () => { adjSpeed = b.dataset.s; renderAdjust(); });
document.querySelectorAll('.lens button[data-l]').forEach((b) => b.onclick = () => {
  const p = state.projectors.find((x) => x.slot === adjSlot);
  if (!p) return;
  cmd(adjSlot, 'lens', { axis: b.dataset.l, speed: adjSpeed, dir: lensDirection(p, b.dataset.l, b.dataset.d) });
});
$('#adj-home').onclick = () => {
  if (Date.now() - adjHomeArmed > 3000) { adjHomeArmed = Date.now(); toast('Tap again within 3 s to send lens shift to home'); return; }
  adjHomeArmed = 0; cmd(adjSlot, 'lens', { op: 'home' });
};
$('#adj-pic-reload').onclick = () => loadPicture();
async function loadPicture() {
  const slot = adjSlot, requestId = ++pictureRequestId; const el = $('#adj-picture'); el.innerHTML = ''; $('#adj-pic-note').textContent = 'Reading values…';
  const p = state.projectors.find((x) => x.slot === slot);
  if (!connected || !p?.status?.online) { $('#adj-pic-note').textContent = 'Current picture values unavailable. Waiting for projector connection.'; return; }
  const schema = p?.pictureSchema ?? PICTURE;
  if (!Object.keys(schema).length) { $('#adj-pic-note').textContent = 'No picture controls reported by this projector.'; return; }
  let vals = {};
  try { const r = await fetch('/api/picture?slot=' + slot); vals = await r.json(); if (!r.ok) throw new Error(vals.error); }
  catch (e) { if (slot === adjSlot && requestId === pictureRequestId) $('#adj-pic-note').textContent = e.message; return; }
  if (slot !== adjSlot || requestId !== pictureRequestId) return;
  const missing = Object.keys(schema).filter((k) => vals[k] == null);
  $('#adj-pic-note').textContent = missing.length ? 'Greyed values need a signal on the input.' : '';
  for (const [k, d] of Object.entries(schema)) {
    const row = document.createElement('label'); row.className = 'pic-row' + (vals[k] == null ? ' na' : '');
    const v = vals[k];
    if (d.type === 'range') {
      row.innerHTML = `<span>${esc(d.label)}${v == null ? ', needs a signal' : ''}</span><input type="range" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${v ?? 0}" data-unavailable="${v == null}"><output>${v ?? '—'}</output>`;
      const inp = row.querySelector('input'), out = row.querySelector('output');
      inp.oninput = () => out.textContent = inp.value;
      inp.onchange = () => { if (slot !== adjSlot || requestId !== pictureRequestId) return; return cmd(slot, 'picture', { key: k, value: Number(inp.value) }).then((ok) => { if (ok) row.classList.remove('na'); }); };
    } else {
      row.innerHTML = `<span>${esc(d.label)}</span><select class="avd-input">${Object.entries(d.options).map(([val, lab]) => `<option value="${esc(val)}" ${String(v) === val ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
      const sel = row.querySelector('select'); if (v == null) sel.value = '';
      sel.onchange = () => { if (slot !== adjSlot || requestId !== pictureRequestId) return; return cmd(slot, 'picture', { key: k, value: sel.value }).then((ok) => { if (ok) row.classList.remove('na'); }); };
    }
    el.appendChild(row);
  }
  updatePictureLock();
}

// websocket
function setConn(on) { connected = on; const d = $('#conn .avd-dot'); d.className = 'avd-dot ' + (on ? 'avd-dot--done' : 'avd-dot--blocked'); $('#conn-word').textContent = on ? 'Relay connected' : 'Relay offline'; $('#show-lock').disabled = !on; document.querySelectorAll('[data-all]').forEach((b) => b.disabled = !on || (state.lock && b.dataset.all !== 'shutter' && !(b.dataset.all === 'power' && b.dataset.arg === '1'))); renderOverview(); renderGrid(); stageView.update(state, connected); if (adjSlot) renderAdjust(); }
let reconnectTimer = null, socketGeneration = 0;
function scheduleReconnect() {
  if (reconnectTimer !== null) return;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 1500);
}
function connect() {
  const generation = ++socketGeneration;
  let ws, disconnected = false, snapshotTimer = null, silenceTimer = null;
  const recover = () => {
    if (generation !== socketGeneration || disconnected) return;
    disconnected = true;
    clearTimeout(snapshotTimer); clearTimeout(silenceTimer);
    setConn(false);
    // Retry independently: an unavailable HTTP endpoint must not stall the socket.
    scheduleReconnect();
    fetch('/api/state', { signal: AbortSignal.timeout(4000), cache: 'no-store' })
      .then((r) => { if (generation === socketGeneration && r.status === 401) location.href = '/login.html'; })
      .catch(() => {});
  };
  const markAlive = () => {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => { recover(); ws.close(); }, 15000);
  };
  try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); }
  catch { recover(); return; }
  // A transport connection alone does not prove we have current controller state.
  snapshotTimer = setTimeout(() => { recover(); ws.close(); }, 5000);
  ws.onclose = () => { clearTimeout(snapshotTimer); recover(); };
  ws.onerror = () => { clearTimeout(snapshotTimer); recover(); ws.close(); };
  ws.onmessage = (m) => {
    if (generation !== socketGeneration || disconnected) return;
    let msg;
    try { msg = JSON.parse(m.data); } catch { recover(); ws.close(); return; }
    if (!msg || typeof msg !== 'object') { recover(); ws.close(); return; }
    if (msg.type === 'snapshot') {
      if (!Array.isArray(msg.projectors) || !msg.projectors.every((p) => p && typeof p.slot === 'string') || !Array.isArray(msg.presets) || !Array.isArray(msg.events)) { recover(); ws.close(); return; }
      clearTimeout(snapshotTimer);
      markAlive(); state = msg; setConn(true); renderAll();
    }
    else if (!connected) return;
    else if (msg.type === 'heartbeat') { if (typeof msg.at === 'number' || typeof msg.at === 'string') markAlive(); }
    else if (msg.type === 'status' && typeof msg.slot === 'string' && msg.status && typeof msg.status === 'object') { markAlive(); const p = state.projectors.find((x) => x.slot === msg.slot); if (p) { p.status = msg.status; if (msg.displayInfo !== undefined) p.displayInfo = msg.displayInfo; if (msg.inputPreference !== undefined) p.inputPreference = msg.inputPreference; if (msg.inputs) p.inputs = msg.inputs; if (msg.pictureSchema) p.pictureSchema = msg.pictureSchema; renderGrid(); stageView.update(state, connected); if (adjSlot) renderAdjust(); renderOverview(); } }
    else if (msg.type === 'busy' && typeof msg.slot === 'string') { markAlive(); const p = state.projectors.find((x) => x.slot === msg.slot); if (p) p.busy = msg.busy; renderGrid(); stageView.update(state, connected); if (adjSlot) renderAdjust(); renderOverview(); }
    else if (msg.type === 'event' && msg.event && typeof msg.event === 'object') { markAlive(); state.events.push(msg.event); if (state.events.length > 200) state.events.shift(); renderLog(); }
  };
}
setConn(false);
connect();
