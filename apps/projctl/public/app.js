import { LANES, laneOf, projectorName, orderedProjectors, rigLanes } from './lanes.js';
import { createStageView } from './stage-view.js';
import { mountPowerSchedules } from './power-schedules.js';
import { createLensWorkspace } from './lens-workspace.js';
import { lensDirection } from './lens-direction.js';
import { loadReference, mountReference, referenceGearHTML } from './reference-view.js';
import { createConnectionMonitor } from './projector-connection.js';
import { startHeaderClock } from './header-clock.js';
startHeaderClock(document.querySelector('#operator-clock'));
const $ = (s, r = document) => r.querySelector(s);
let state = { projectors: [], presets: [], events: [], lock: false };
const confirmTokens = {}; // command key -> one-use token
const commandsInFlight = new Set();
let connected = false;
const monitorConnection = createConnectionMonitor();
const connectionOf = p => monitorConnection(p, connected, state.relay?.pollIntervalMs);
const dirtySetup = new Set();
let selectedDetailLane = null, lastRigLane = null, referenceData = null, referenceView = null;
const referenceReady = loadReference('./workspace/projectors.json').then(data => { referenceData = data; if (selectedDetailLane) renderProjectorInfo(); return data; }).catch(() => null);
const stageView = createStageView(document.querySelector('#tab-stage'), (slot) => openAdjust(slot), (p) => canPattern(p));
const lensWorkspace = createLensWorkspace($('#projector-lens-workspace'), {
  send: (target,arg) => { const current=state.projectors.find(p=>p.slot===target.slot); if(!current||JSON.stringify([current.driver,current.ip,current.mac])!==JSON.stringify([target.driver,target.ip,target.mac]))throw new Error('Projector target changed; select it again.'); return cmd(target.slot,'lens',arg); },
  onSave: async name => { await api('preset/save',{name}); toast(`Saved rig preset ${name}. Only supported reported lens positions are stored.`); },
  onRecall: name => recallDetailLensPreset(name),
  onPresets: () => $('#tab-btn-presets').click(),
});
function updateLensWorkspace(){ const p=selectedDetailLane?rigLanes(state.projectors).find(item=>item.lane===selectedDetailLane)?.projector:null;lensWorkspace.update({projector:p,connected,connection:connectionOf(p),lock:state.lock,active:!!selectedDetailLane,presets:state.presets.map(item=>({...item,confirm:presetConfirmations.get(item.name),result:presetResults.get(item.name)}))}); }
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
  if(t.dataset.tab==='rig'){selectedDetailLane=lastRigLane||rigLanes(state.projectors).find(item=>item.projector)?.lane||'A';lastRigLane=selectedDetailLane;$('#tab-projector').hidden=false;$('#tab-projector').classList.add('on');renderGrid();renderProjectorInfo();}else{selectedDetailLane=null;updateLensWorkspace();$('#tab-projector').hidden=true;$('#tab-projector').classList.remove('on');}
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

function commandFeedback(button,phase,message){if(!button)return;clearTimeout(button._feedbackTimer);button.dataset.commandState=phase;button.setAttribute('aria-busy',String(phase==='sending'));button.title=message;if(['acknowledged','error'].includes(phase))button._feedbackTimer=setTimeout(()=>{if(button.dataset.commandState===phase)delete button.dataset.commandState;},2500);}
async function cmd(slot, c, arg, source) {
  const key = c === 'lens' ? `${slot}:lens:${arg?.op === 'stop' ? 'stop' : 'move'}` : `${slot}:${c}:${JSON.stringify(arg)}`;
  if (!connected) { toast('Relay disconnected. Reconnect before sending commands.'); return false; }
  if (slot !== 'all' && !(c === 'lens' && arg?.op === 'stop') && !connectionOf(state.projectors.find(p=>p.slot===slot)).current) { toast('No fresh projector reply. Waiting for reconnection.'); return false; }
  if (commandsInFlight.has(key)) return;
  commandsInFlight.add(key);commandFeedback(source,'sending','Sending command; waiting for acknowledgement.');
  if (c === 'lens') { $('#adj-motion').textContent = arg?.op === 'stop' ? 'Stopping lens...' : 'Lens moving. Waiting for stopped feedback...'; renderAdjust(); }
  try {
    const out = await api('command', { slot, cmd: c, arg, confirm: confirmTokens[key] });
    const r = out[slot];
    const errs = Object.entries(out).filter(([, v]) => v.error).map(([k, v]) => `${k}: ${v.error}`);
    if (r?.confirm) {
      confirmTokens[key] = r.confirm;commandFeedback(source,'confirmation','Confirmation required; no action sent yet.');
      toast([r.message, ...errs].join(' · '), 3000);
      setTimeout(() => { if (confirmTokens[key] === r.confirm) delete confirmTokens[key]; }, 3000);
      return;
    }
    delete confirmTokens[key];commandFeedback(source,errs.length?'error':'acknowledged',errs.length?errs.join(' · '):'Command acknowledged. Check the live status; acknowledgement is not position verification.');
    if (slot === 'all') toast(Object.entries(out).map(([k, v]) => `${k}: ${v.error || (v.result === 'OK' ? 'command accepted' : v.result)}`).join(' · '), 6000);
    else if (errs.length) toast(errs.join(' · '), 6000);
    else toast(c === 'lens' ? `${slot}: lens command completed; check the reported position and image` : `${slot}: command accepted`);
    if (r?.status) { const p = state.projectors.find((x) => x.slot === slot); if (p) p.status = r.status; }
    if (c === 'lens') $('#adj-motion').textContent = errs.length ? errs.join(' · ') : 'Lens command completed. Check the reported position and image; absolute readback may be unavailable.';
    return !errs.length;
  } catch (e) { commandFeedback(source,'error',e.message);toast(e.message, 6000); if (c === 'lens') $('#adj-motion').textContent = e.message; return false; }
  finally { commandsInFlight.delete(key); if (c === 'lens') { if(adjSlot)renderAdjust(); updateLensWorkspace(); } }
}
document.querySelectorAll('[data-all]').forEach((b) => b.onclick = () => cmd('all', b.dataset.all, b.dataset.all === 'resetInput' ? undefined : b.dataset.all === 'pattern' ? b.dataset.arg : Number(b.dataset.arg),b));

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
  if (!connectionOf(p).current) return { st: 'blocked', word: connectionOf(p).label };
  if (s.power === 'on') return { st: 'done', word: 'Powered' };
  if (s.power === 'cooling') return { st: 'waiting', word: 'Cooling' };
  if (s.power === 'warming') return { st: 'waiting', word: 'Warming' };
  if (s.power === 'off') return { st: 'queued', word: 'Standby' };
  return { st: 'idle', word: 'Unknown' };
}
const pill = (st, word) => `<span class="avd-state"><span class="avd-dot avd-dot--${st}" aria-hidden="true"></span>${esc(word)}</span>`;
const seg = (label, opts, cur, attrs) => `<div class="avd-seg avd-seg--fill" role="group" aria-label="${esc(label)}">${opts.map(([v, lab]) => `<button class="avd-seg__btn" type="button" aria-pressed="${String(cur) === String(v)}" ${attrs(v)}>${esc(lab)}</button>`).join('')}</div>`;

function renderOverview() {
  const extras=state.projectors.filter(p=>!laneOf(p)).length;$('#rig-extra-devices').hidden=!extras;$('#rig-extra-devices').textContent=`Other devices (${extras}) · Configuration`;
  referenceView?.updateLive(state,connected);
  $('[data-all="resetInput"]').disabled = !connected || state.lock || !state.projectors.some((p) => p.inputPreference?.available && connectionOf(p).current && !p.busy);
  const online = state.projectors.filter((p) => connectionOf(p).current).length;
  const assigned = rigLanes(state.projectors).filter((x) => x.projector).length;
  $('#relay-mode').textContent = state.simulation === true ? 'DEMO · simulated devices' : state.simulation === false ? 'REAL RELAY' : 'Connecting…';
  $('#relay-mode').classList.toggle('pj-mode--demo', state.simulation === true);
  const staticPreview = location.pathname.includes('/apps/projctl/public') || ['systembydave.com', 'www.systembydave.com', 'davehomeassist.github.io'].includes(location.hostname);
  $('#local-controller-help').hidden = connected || !staticPreview;
  $('#summary').textContent = connected ? `${online} / ${state.projectors.length} devices replying · ${assigned} / 4 lanes assigned` : 'Relay disconnected · device data unavailable';
  $('#connection-note').textContent = !connected ? 'Reconnecting automatically. Displayed values are last known; current projector power is unknown.' : online < state.projectors.length ? 'Relay connected. Devices without a reply: check the venue network and projector connection. No reply does not confirm power off.' : state.simulation ? 'Simulator data · no physical projector feedback. Status updates automatically.' : 'Device feedback updates automatically. Each card shows its latest successful reply.';
}
// Keep interactive nodes stable through status polls; only changed content is patched.
function patchControls(current, desired, protectedNode = null) {
  const before = [...current.childNodes], after = [...desired.childNodes];
  after.forEach((next,index) => {
    const old = before[index];
    if (!old || old.nodeType !== next.nodeType || old.nodeName !== next.nodeName) { if(old)old.replaceWith(next);else current.append(next); return; }
    if (old.nodeType === 3) { if(old.textContent !== next.textContent)old.textContent=next.textContent; return; }
    if (old.nodeType !== 1) return;
    const targetChanged = old._controlIdentity !== next._controlIdentity;
    const actionChanged = old.dataset.focusKey !== next.dataset.focusKey;
    const unsafeSelect = old.matches('select') && (old.disabled !== next.disabled || old._inputOptions !== next._inputOptions);
    if (targetChanged || actionChanged || unsafeSelect) { old.replaceWith(next); return; }
    if (old === protectedNode) return; // An unchanged, safely editable native menu stays open.
    if(old.hasAttribute('data-command-state'))for(const key of ['data-command-state','aria-busy','title'])if(old.hasAttribute(key))next.setAttribute(key,old.getAttribute(key));
    for(const attr of [...old.attributes])if(!next.hasAttribute(attr.name))old.removeAttribute(attr.name);
    for(const attr of [...next.attributes])if(old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);
    for(const event of ['onclick','onpointerdown','onkeydown','onchange','onblur'])old[event]=next[event];
    if(next._inputOptions!==undefined)old._inputOptions=next._inputOptions;
    patchControls(old,next,protectedNode);
    if(old.matches('select,input') && old.value!==next.value)old.value=next.value;
  });
  before.slice(after.length).forEach(node=>node.remove());
}
function renderGrid() {
  const g = $('#grid');
  const active = document.activeElement;
  const editing = g.contains(active) && active.matches('select[data-c="input"]') ? state.projectors.find((p) => p.slot === active.closest('[data-slot]')?.dataset.slot) : null;
  // Preserve only the active native select. Other telemetry and safety state must keep updating.
  const keepSelect = editing && active.dataset.editing === 'true' && connectionOf(editing).current && !state.lock && !editing.busy && !active.disabled && active._inputOptions === JSON.stringify(Object.entries(editing.inputs || {}));
  const focusKey = g.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null; const scroll = g.scrollTop;
  const unassignedOpen = g.querySelector('.pj-unassigned')?.open || false;
  const inputOptionsOpen = new Set([...document.querySelectorAll('#grid details[data-input-options][open], #projector-controls details[data-input-options][open]')].map((el) => el.dataset.inputOptions));
  const output = document.createElement('div');
  function deviceCard(p, lane = laneOf(p)) {
    const s = p.status || {}; const connection = connectionOf(p), off = !connection.current; const lock = state.lock;
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
    const shutterAt = new Date(s.connection?.lastSuccessAt || s.updatedAt || NaN).getTime();
    const freshShutter = Number.isFinite(shutterAt) && Date.now()-shutterAt <= Math.max(15000,(state.relay?.pollIntervalMs||5000)*3) && connected && s.online && (!s.connection || s.connection.state === 'online') && ['open','closed'].includes(s.shutter);
    const shutterActions = freshShutter ? (s.shutter === 'open' ? [['closed','Close shutter']] : [['open','Open shutter']]) : [['open','Open shutter'],['closed','Close shutter']];

    const pat = s.pattern ? ((p.patterns || PATTERNS)[s.pattern] || s.pattern) : '—';
    const card = document.createElement('section'); card.className = 'avd-panel pj-tile' + (off ? ' offline' : ''); card._controlIdentity = JSON.stringify([p.slot,p.driver,p.ip,p.mac]); card.dataset.slot = p.slot; card.dataset.lane = lane ? p.lane : ''; card.setAttribute('aria-label', lane ? projectorName(p) : `Unassigned ${p.label}`);
    card.innerHTML = `
      <div class="avd-panel__head"><h2 class="avd-panel__title"><span class="avd-panel__index">${lane ? esc(p.lane) : '—'}</span>${esc(lane ? 'Projector ' + p.lane : p.label)}<span class="avd-dot avd-dot--${st}" aria-hidden="true"></span></h2></div>
      <div class="avd-panel__body">
        ${lane ? `<div class="pj-lane"><h3>${esc(lane.target)}</h3><span class="pj-mono">${esc(lane.role)} · ${esc(lane.orientation)}</span><span class="pj-lane-device pj-mono">${esc(p.model || p.label)}</span></div>` : `<p class="pj-mono">Unassigned · Relay ${esc(p.slot)}</p>`}
        <div class="pj-tile-top">${pill(st, word)}<span class="pj-mono">${esc(p.owner)} · ${esc(p.ip || 'no address')}</span></div>
        <div class="pj-telemetry-note pj-mono">${esc(connection.detail)}${off ? ' · values last known' : state.simulation ? ' · simulated feedback' : ''}<span>Last reply: ${esc(connection.lastReply)}${connection.retry ? ' · '+esc(connection.retry) : ''}</span>${off && s.connection?.error ? `<span>${esc(s.connection.error)}</span>` : ''}</div>
        <p class="pj-mono" role="status" ${busy ? '' : 'style="display:none"'}>Lens moving</p>
        <div class="pj-tile-top" ${errs.length ? '' : 'style="display:none"'}>${errs.map((e) => pill('blocked', e)).join('')}</div>
        <div class="pj-two">
          <div class="avd-readout avd-readout--sm"><span class="avd-readout__label avd-eyebrow">Input</span><span class="avd-readout__value">${esc(s.input ? (p.inputs?.[s.input] || s.input) : '—')}</span></div>
          <div class="avd-readout avd-readout--sm"><span class="avd-readout__label avd-eyebrow">Light source</span><span class="avd-readout__value">${s.lightHours != null ? esc(s.lightHours) + '<span class="avd-readout__unit">h</span>' : '—'}</span></div>
        </div>
        ${lane ? `<button class="avd-btn pj-open-projector" type="button" data-open-projector="${esc(p.lane)}">Open ${esc(p.lane)} · controls &amp; info</button>` : ''}
        <div class="pj-health pj-mono"><span>Shutter <strong>${esc(s.shutter || 'Unknown')}</strong></span><span>Alarms <strong>${!alarmKnown ? 'Unavailable' : errs.length ? esc(errs.length + ' reported') : 'None reported'}</strong></span></div>
        <div class="avd-field"><span class="avd-field__label pj-caps">Shutter control</span>
          ${seg(`Shutter, ${lane ? 'Projector ' + p.lane : p.label}`, shutterActions, null, (v) => `data-c="shutter" data-a="${v === 'closed' ? 1 : 0}" ${off ? 'disabled' : ''}`)}
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
    if(card.querySelector('[data-open-projector]'))card.querySelector('[data-open-projector]').onclick = () => openProjector(p.lane);
    card.querySelectorAll('button[data-c]').forEach((b) => b.onclick = (e) => cmd(p.slot, b.dataset.c, Number(b.dataset.a),e.currentTarget));
    card.querySelector('[data-reset-input]').onclick = (e) => cmd(p.slot, 'resetInput',undefined,e.currentTarget);
    card.querySelectorAll('button[data-p]').forEach((b) => b.onclick = (e) => cmd(p.slot, 'pattern', b.dataset.p,e.currentTarget));
    card.querySelectorAll('button[data-adj]').forEach((b) => b.onclick = () => openAdjust(p.slot, b.dataset.adj));
    const sel = card.querySelector('select'); sel._inputOptions = JSON.stringify(inputs);
    sel.onpointerdown = (e) => { e.currentTarget.dataset.editing = 'true'; };
    sel.onkeydown = (e) => { if (['ArrowDown', 'ArrowUp', ' ', 'Enter'].includes(e.key)) e.currentTarget.dataset.editing = 'true'; if (e.key === 'Escape') { delete e.currentTarget.dataset.editing; setTimeout(renderGrid, 0); } };
    sel.onchange = (e) => { delete e.currentTarget.dataset.editing; cmd(p.slot, 'input', e.currentTarget.value); setTimeout(renderGrid, 0); };
    sel.onblur = (e) => { delete e.currentTarget.dataset.editing; setTimeout(renderGrid, 0); };
    card.querySelectorAll('button, select').forEach((el, n) => { el.dataset.focusKey = el.hasAttribute('data-reset-input') ? `${p.slot}:reset-input` : el.dataset.c ? `${p.slot}:${el.dataset.c}:${el.dataset.a||''}` : el.dataset.p ? `${p.slot}:pattern:${el.dataset.p}` : el.dataset.adj ? `${p.slot}:adjust:${el.dataset.adj}` : el.dataset.openProjector ? `${p.slot}:info` : `${p.slot}:${n}`; });
    return card;
  }
  for(const {lane,projector:p,conflict} of rigLanes(state.projectors)){
    const info=LANES[lane],s=p?.status||{},health=connectionOf(p),online=health.current,card=document.createElement('section');card.className='avd-panel pj-tile pj-summary-tile';card.dataset.lane=lane;card.classList.toggle('offline',!online);if(p)card.dataset.slot=p.slot;card._controlIdentity=p?JSON.stringify([p.slot,p.driver,p.ip,p.mac]):lane;
    const input=s.input==null?'Unknown':p.inputs?.[s.input]||s.input,signal=p?.displayInfo?.signal;
    const signalText=signal?.value!=null?reportedValue(signal.value):signal?.state==='unsupported'?'Not reported':'Unknown';
    const last=`Last reply ${health.lastReply}`;
    const alarms=Object.entries(s.errors||{}).filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]).map(([key,value])=>`${key}${value===2?' fault':' warning'}`);
    const connection=conflict?'Assignment conflict':health.detail;
    card.innerHTML=`<button type="button" class="pj-summary-select" data-open-projector="${lane}" data-focus-key="lane:${lane}:select" aria-pressed="${selectedDetailLane===lane}"><span class="pj-summary-heading"><b class="pj-summary-letter">${lane}</b><strong>${esc(info.target)}</strong><span class="avd-dot ${online?'avd-dot--done':p?'avd-dot--blocked':'avd-dot--idle'}" aria-hidden="true"></span></span><span class="pj-summary-model">${esc(p?.model||'No assigned device')} · ${esc(info.orientation)}</span><span class="pj-summary-state ${alarms.length?'has-alarms':''}" title="${esc([connection,...alarms].join(' · '))}">${esc([connection,...alarms].join(' · '))}</span><span class="pj-summary-values"><span>Power<strong>${esc(s.power||'Unknown')}</strong></span><span>Shutter<strong>${esc(s.shutter||'Unknown')}</strong></span><span>Input<strong>${esc(input)}</strong></span></span><span class="pj-summary-signal">${!online&&signal?.value!=null?'Last known signal':'Signal'}: ${esc(signalText)}</span><span class="pj-summary-freshness">${esc(last)}${health.retry?' · '+esc(health.retry):''}${!online&&p?' · values last known':''}</span></button>`;
    card.querySelector('button').onclick=()=>openProjector(lane);output.append(card);
  }
  const nextSelect = [...output.querySelectorAll('select[data-c="input"]')].find(node => node.closest('[data-slot]')?.dataset.slot === editing?.slot);
  const pathTo = (node, root) => { const path = []; while (node && node !== root) { path.unshift([...node.parentNode.childNodes].indexOf(node)); node = node.parentNode; } return node === root ? path.join('.') : null; };
  const retained = keepSelect && nextSelect && pathTo(active, g) === pathTo(nextSelect, output);
  patchControls(g,output,retained ? active : null);
  if(selectedDetailLane){$('#projector-detail-title').textContent=`${selectedDetailLane} · ${LANES[selectedDetailLane].target}`;$('#tab-projector').dataset.lane=selectedDetailLane;}
  if (selectedDetailLane) {
    const selected = rigLanes(state.projectors).find(item => item.lane === selectedDetailLane)?.projector;
    if (selected) {
      const detailCard = deviceCard(selected); detailCard.classList.remove('pj-tile'); detailCard.classList.add('pj-detail-controls');
      detailCard.querySelector('[data-open-projector]')?.remove();
      updateDetailControls(detailCard);
    } else {
      $('#projector-controls').innerHTML = '<div class="pj-device-note"><h3>No assigned live device</h3><p>This lane remains available for recorded gear and planning information. Controls become available after a unique device is assigned in Configuration.</p></div>';
    }
    renderDisplayInfo(selected);renderPrimaryControls(selected);
  }
  updateLensWorkspace();
  g.scrollTop = scroll;
  if (focusKey && !retained) [...g.querySelectorAll('[data-focus-key]')].find((el) => el.dataset.focusKey === focusKey)?.focus({ preventScroll: true });
}
function updateDetailControls(card) {
  const host = $('#projector-controls'), active = document.activeElement, key = host.contains(active) ? active.dataset.focusKey : null;
  const desired = document.createElement('div'); desired.append(card);
  const p = state.projectors.find(item => item.slot === card.dataset.slot);
  const keep = host.contains(active) && active.matches('select[data-c="input"]') && active.dataset.editing === 'true' && connectionOf(p).current && !state.lock && !p.busy && active._inputOptions === JSON.stringify(Object.entries(p.inputs || {}));
  const path = (node, root) => { const out = []; while (node && node !== root) { out.unshift([...node.parentNode.childNodes].indexOf(node)); node = node.parentNode; } return node === root ? out.join('.') : null; };
  const next = card.querySelector('select[data-c="input"]');
  const retain = keep && path(active,host) === path(next,desired);
  patchControls(host,desired,retain ? active : null);
  if(key&&!retain)[...host.querySelectorAll('[data-focus-key]')].find(node=>node.dataset.focusKey===key)?.focus({preventScroll:true});
}
async function ensureReference() {
  if (referenceView) return referenceView;
  try { referenceView = await mountReference($('#reference-view'), {dataUrl:'./workspace/projectors.json',onProjectorSelect:openProjector}); referenceView.updateLive(state,connected); }
  catch(error){$('#reference-view').textContent=error.message;}
  return referenceView;
}
function openProjector(lane){
  if(!Object.hasOwn(LANES,lane))return;
  lastRigLane=lane;if($('#tab-btn-rig').getAttribute('aria-selected')!=='true')$('#tab-btn-rig').click();selectedDetailLane=lane;
  const detail=$('#tab-projector');detail.hidden=false;detail.classList.add('on');detail.dataset.lane=lane;
  $('#projector-detail-title').textContent=`${lane} · ${LANES[lane].target}`;
  document.querySelectorAll('[data-detail-lane]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.detailLane===lane)));
  renderGrid();renderProjectorInfo();
}
function renderPrimaryControls(p){
 const host=$('#projector-primary-controls'),out=document.createElement('div');
 if(!p){out.innerHTML='<span class="pj-mono">Unassigned · lens controls unavailable</span>';patchControls(host,out);return;}
 const s=p.status||{},off=!connectionOf(p).current,at=new Date(s.connection?.lastSuccessAt||s.updatedAt||NaN).getTime(),fresh=Number.isFinite(at)&&Date.now()-at<=Math.max(15000,(state.relay?.pollIntervalMs||5000)*3)&&!off&&(!s.connection||s.connection.state==='online');
 const options=fresh&&s.shutter==='open'?[['1','Close shutter']]:fresh&&s.shutter==='closed'?[['0','Open shutter']]:[['0','Open shutter'],['1','Close shutter']];
 for(const[arg,label]of options){const b=document.createElement('button');b.className='avd-btn';b.type='button';b._controlIdentity=JSON.stringify([p.slot,p.driver,p.ip,p.mac]);b.dataset.focusKey=`${p.slot}:dock:shutter:${arg}`;b.dataset.c='shutter';b.dataset.a=arg;b.textContent=label;b.disabled=off;b.onclick=e=>cmd(p.slot,'shutter',Number(arg),e.currentTarget);out.append(b);}
 const input=document.createElement('button');input.type='button';input.className='avd-btn';input._controlIdentity=JSON.stringify([p.slot,p.driver,p.ip,p.mac]);input.dataset.focusKey=`${p.slot}:dock:reset-input`;input.dataset.resetInput='';input.textContent=`Reset to ${p.inputPreference?.label||state.preferredInput||'HDMI'}`;input.disabled=off||state.lock||!!p.busy||!p.inputPreference?.available;input.onclick=e=>cmd(p.slot,'resetInput',undefined,e.currentTarget);out.append(input);patchControls(host,out);
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
  const field=(label,data,fallback)=>{const stale=!connectionOf(p).current||data?.state==='offline';return `<div><dt>${label}</dt><dd>${esc(data?.value!=null ? (data.label || reportedValue(data.value)) : fallback)}<br><span class="pj-mono">${esc(stale&&data?.value!=null?'Last known · ': '')}${esc(data?.state || (p?'unsupported':'unassigned'))}${data?.observedAt?' · '+esc(new Date(data.observedAt).toLocaleString()):''}</span></dd></div>`;};
  $('#projector-display-info').innerHTML=`<dl>${field('Reported input',input,'No input reported')}${field('Driver signal readout',signal,'Signal information unavailable')}<div><dt>Projector EDID</dt><dd>${esc(edid?.state==='reported'&&edid.value!=null?reportedValue(edid.value):edid?.reason||(p?'EDID is not read by this driver.':'No device is assigned to this lane; projector EDID is unavailable.'))}<br><span class="pj-mono">${esc(edid?.state||(p?'unsupported':'unassigned'))} · projector scope</span></dd></div></dl><p class="pj-detail-unavailable">Input names and signal readings are separate from EDID. No resolution or EDID is inferred from the selected input.</p>`;
}
let powerSchedulesView=null;$('#power-schedule-panel').addEventListener('toggle',()=>{if($('#power-schedule-panel').open&&!powerSchedulesView)powerSchedulesView=mountPowerSchedules($('#power-schedules'),{projectors:()=>state.projectors,connected:()=>connected});});
$('#rig-extra-devices').onclick=()=>$('#tab-btn-setup').click();
$('#projector-back').onclick=()=>$('#tab-btn-rig').click();
document.querySelectorAll('[data-detail-lane]').forEach(button=>button.onclick=()=>openProjector(button.dataset.detailLane));
$('#host-displays-load').onclick=async()=>{
  const output=$('#host-display-results');output.textContent='Reading relay computer display records…';
  try{const response=await fetch('/api/host-displays',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(response.status===401){location.href='/login.html';return;}const data=await response.json();if(!response.ok||data.scope!=='relay-computer')throw Error(data.reason||'Computer display information unavailable.');output.innerHTML=`<p class="pj-mono">${esc(data.state)} · ${esc(data.reason||'OS records only; no projector assignment implied.')}</p>${(data.displays||[]).map(display=>`<article><strong>${esc(display.name||display.id)}</strong><p>${esc(reportedValue(display.resolution))} · ${esc(display.connection||'Connection unknown')}</p><p class="pj-mono">EDID ${esc(display.edid?.state||'unavailable')} · unassigned to A–D</p></article>`).join('')}`;}catch(error){output.textContent=error.message;}
};
window.addEventListener('projctl:navigate',event=>{const {panel,projector}=event.detail||{};if(!['home','notes','info','rig','stage','presets','log','setup','throw'].includes(panel))return;document.querySelector(`#tab-btn-${panel}`)?.click();if(projector&&Object.hasOwn(LANES,projector))openProjector(projector);});

function slotName(slot) { const p = state.projectors.find((p) => p.slot === slot); return p && laneOf(p) ? `${slot} · ${p.lane} / ${laneOf(p).target}` : slot; }
const presetResults = new Map(), presetConfirmations = new Map();
async function recallDetailLensPreset(name){
  if(!connected||state.lock)throw new Error('Connect and disable show lock before recalling lenses.');
  const preset=state.presets.find(item=>item.name===name),p=rigLanes(state.projectors).find(item=>item.lane===selectedDetailLane)?.projector;
  if(!p||!preset?.perSlot?.[p.slot]?.lens)throw new Error('No stored lens positions for the selected unit.');
  const token=presetConfirmations.get(name);
  try{const response=await api('preset/recall',{name,...(token?{confirmLens:token}:{})});if(response.confirm){presetConfirmations.set(name,response.confirm);presetResults.set(name,response.message||'Confirm the rig lens recall to send movement commands.');}else{presetConfirmations.delete(name);presetResults.set(name,Object.entries(response.projectors||response).map(([slot,result])=>`${slotName(slot)}: ${typeof result==='string'?result:JSON.stringify(result)}`).join(' · '));}}
  catch(error){presetConfirmations.delete(name);presetResults.set(name,error.message);throw error;}
  finally{renderPresets();updateLensWorkspace();}
}

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
  powerSchedulesView?.projectorsChanged();
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
  const off = !connectionOf(p).current;
  const moving = p.busy || commandsInFlight.has(`${adjSlot}:lens:move`);
  const lens = p.status?.lens;
  const readback = lens && p.driver === 'pulse' ? Object.entries({ h: 'H', v: 'V', focus: 'Focus', zoom: 'Zoom' }).map(([key, label]) => `${label} ${lens[key] ?? '?'}`).join(' · ') : '';
  $('#adj-position').textContent = readback;
  const cur = p.status?.pattern; const table = p.patterns || PATTERNS;
  $('#adj-pattern-now').textContent = (off ? 'Last reported: ' : 'Showing: ') + (table[cur] || (cur ? cur : 'unknown'));
  const el = $('#adj-patterns'), patterns = document.createElement('div');
  for (const [code, name] of Object.entries(table)) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.pattern = code; b.className = 'avd-btn'; b.textContent = name; b.setAttribute('aria-pressed', String(cur === code));
    b._controlIdentity = JSON.stringify([p.slot,p.driver,p.ip,p.mac]); b.dataset.focusKey = `${p.slot}:adjust:pattern:${code}`;
    b.disabled = state.lock || off || !!moving || !canPattern(p); b.onclick = event => cmd(p.slot, 'pattern', code, event.currentTarget); patterns.appendChild(b);
  }
  patchControls(el, patterns);
  $('#adj-speed').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === adjSpeed)));
  document.querySelectorAll('.lens button, #adj-home, #adj-speed button').forEach((b) => b.disabled = state.lock || off || !!moving || p.capabilities?.lens === false || (p.driver === 'pulse' && p.status?.power !== 'on'));
  $('#adj-stop').hidden = p.driver !== 'pulse'; $('#adj-stop').disabled = off;
  updatePictureLock();
}
function updatePictureLock() {
  const p = state.projectors.find((x) => x.slot === adjSlot);
  const unavailable = !connectionOf(p).current || !!p?.busy;
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
  if (!connectionOf(p).current) { $('#adj-pic-note').textContent = 'Current picture values unavailable. Waiting for projector connection.'; return; }
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
function setConn(on) { connected = on; powerSchedulesView?.connectionChanged(); const d = $('#conn .avd-dot'); d.className = 'avd-dot ' + (on ? 'avd-dot--done' : 'avd-dot--blocked'); $('#conn-word').textContent = on ? 'Relay connected' : 'Relay offline'; $('#show-lock').disabled = !on; document.querySelectorAll('[data-all]').forEach((b) => b.disabled = !on || (state.lock && b.dataset.all !== 'shutter' && !(b.dataset.all === 'power' && b.dataset.arg === '1'))); renderOverview(); renderGrid(); stageView.update(state, connected); if (adjSlot) renderAdjust(); }
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
      markAlive(); state = msg;if(msg.powerSchedules&&typeof msg.powerSchedules==='object'&&Array.isArray(msg.powerSchedules.schedules)&&Array.isArray(msg.powerSchedules.audit))powerSchedulesView?.update(msg.powerSchedules); setConn(true); renderAll();
    }
    else if (!connected) return;
    else if (msg.type === 'heartbeat') { if (typeof msg.at === 'number' || typeof msg.at === 'string') { markAlive(); renderGrid(); renderOverview(); if (adjSlot) renderAdjust(); } }
    else if (msg.type === 'status' && typeof msg.slot === 'string' && msg.status && typeof msg.status === 'object') { markAlive(); const p = state.projectors.find((x) => x.slot === msg.slot); if (p) { p.status = msg.status; if (msg.displayInfo !== undefined) p.displayInfo = msg.displayInfo; if (msg.inputPreference !== undefined) p.inputPreference = msg.inputPreference; if (msg.inputs) p.inputs = msg.inputs; if (msg.pictureSchema) p.pictureSchema = msg.pictureSchema; renderGrid(); stageView.update(state, connected); if (adjSlot) renderAdjust(); renderOverview(); } }
    else if (msg.type === 'busy' && typeof msg.slot === 'string') { markAlive(); const p = state.projectors.find((x) => x.slot === msg.slot); if (p) p.busy = msg.busy; renderGrid(); stageView.update(state, connected); if (adjSlot) renderAdjust(); renderOverview(); }
    else if (msg.type === 'powerSchedules' && msg.schedules && typeof msg.schedules === 'object' && Array.isArray(msg.schedules.schedules) && Array.isArray(msg.schedules.audit)) { markAlive(); powerSchedulesView?.update(msg.schedules); }
    else if (msg.type === 'event' && msg.event && typeof msg.event === 'object') { markAlive(); state.events.push(msg.event); if (state.events.length > 200) state.events.shift(); renderLog(); }
  };
}
setConn(false);
connect();
