const $ = (s, r = document) => r.querySelector(s);
let state = { projectors: [], presets: [], events: [], lock: false };
const confirmTokens = {}; // command key -> one-use token
const commandsInFlight = new Set();
let connected = false;
const dirtySetup = new Set();
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Respect saved operator choice; a fresh browser starts in the light theme.
const root = document.documentElement;
root.dataset.theme = 'light';
try { const t = localStorage.getItem('theme'); if (['light', 'dark'].includes(t)) root.dataset.theme = t; } catch {}
$('#theme').onclick = () => { root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('theme', root.dataset.theme); } catch {} };

// tabs (WAI-ARIA tabs: arrow keys move, Home/End jump)
function wireTabs(list, attr, panelFor) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (t) => { tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; const panel = panelFor(x); panel.classList.toggle('on', on); panel.hidden = !on; }); };
  tabs.forEach((t, i) => {
    t.onclick = () => select(t);
    t.onkeydown = (e) => { const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null; if (n == null) return; e.preventDefault(); const x = tabs[(n + tabs.length) % tabs.length]; x.focus(); select(x); };
  });
}
wireTabs($('.avd-tabs[aria-label="Views"]'), 'tab', (t) => $('#tab-' + t.dataset.tab));
wireTabs($('.pj-sheet-tabs'), 'adjtab', (t) => $(`[data-adjpanel="${t.dataset.adjtab}"]`));

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
document.querySelectorAll('[data-all]').forEach((b) => b.onclick = () => cmd('all', b.dataset.all, b.dataset.all === 'pattern' ? b.dataset.arg : Number(b.dataset.arg)));

$('#lock-on').onclick = () => api('lock', { lock: true }).catch((e) => toast(e.message));
$('#lock-off').onclick = () => api('lock', { lock: false }).catch((e) => toast(e.message));
$('#preset-save').onclick = () => { const n = $('#preset-name').value.trim(); if (!n) return toast('Name the preset first'); api('preset/save', { name: n }).then(() => { $('#preset-name').value = ''; toast(`Saved ${n}`); }).catch((e) => toast(e.message)); };
$('#discover').onclick = async () => { $('#discover-out').textContent = 'searching…'; try { const r = await api('discover'); $('#discover-out').textContent = r.note ? r.note : `${r.found.length} replied, ${r.changed} updated`; } catch (e) { $('#discover-out').textContent = e.message; } };

// ---- render ----
let PATTERNS = { '00': 'Off', '08': 'Colour bars' }; let PICTURE = {};
fetch('/api/schema').then((r) => r.json()).then((j) => { PATTERNS = j.patterns; PICTURE = j.picture; }).catch(() => {});
function canPattern(p) { return !!p.patterns || p.driver === 'panasonic' || p.driver === 'simulator'; }
// Circle plus word. online+on: done "Powered"; standby: queued; cooling/warming: waiting; offline: blocked.
function stateOf(p) {
  const s = p.status || {};
  if (!s.online) return { st: 'blocked', word: 'Offline' };
  if (s.power === 'on') return { st: 'done', word: 'Powered' };
  if (s.power === 'cooling') return { st: 'waiting', word: 'Cooling' };
  if (s.power === 'warming') return { st: 'waiting', word: 'Warming' };
  if (s.power === 'off') return { st: 'queued', word: 'Standby' };
  return { st: 'idle', word: 'Unknown' };
}
const pill = (st, word) => `<span class="avd-state"><span class="avd-dot avd-dot--${st}" aria-hidden="true"></span>${esc(word)}</span>`;
const seg = (label, opts, cur, attrs) => `<div class="avd-seg avd-seg--fill" role="group" aria-label="${esc(label)}">${opts.map(([v, lab]) => `<button class="avd-seg__btn" type="button" aria-pressed="${String(cur) === String(v)}" ${attrs(v)}>${esc(lab)}</button>`).join('')}</div>`;

function renderGrid() {
  const g = $('#grid'); const focusKey = g.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null; const scroll = g.scrollTop; g.innerHTML = '';
  state.projectors.forEach((p, idx) => {
    const s = p.status || {}; const off = !connected || !s.online; const lock = state.lock;
    const { st, word } = stateOf(p);
    const errs = Object.entries(s.errors || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k}${v === 2 ? ' fault' : ' warning'}`);
    const inputs = Object.entries(p.inputs || {});
    const busy = !!p.busy;

    const pat = s.pattern ? ((p.patterns || PATTERNS)[s.pattern] || s.pattern) : '—';
    const card = document.createElement('section'); card.className = 'avd-panel pj-tile' + (off ? ' offline' : ''); card.setAttribute('aria-label', `${p.slot} ${p.label}`);
    card.innerHTML = `
      <div class="avd-panel__head"><h2 class="avd-panel__title"><span class="avd-panel__index">${String(idx + 1).padStart(2, '0')}</span>${esc(p.slot)} · ${esc(p.label)}<span class="avd-dot avd-dot--${st}" aria-hidden="true"></span></h2></div>
      <div class="avd-panel__body">
        <div class="pj-tile-top">${pill(st, word)}<span class="pj-mono">${esc(p.owner)} · ${esc(p.ip || 'no address')}</span></div>
        ${s.errors == null ? '<p class="pj-mono">Alarm telemetry unavailable</p>' : ''}
        ${busy ? '<p class="pj-mono" role="status">Lens moving</p>' : ''}
        ${errs.length ? `<div class="pj-tile-top">${errs.map((e) => pill('blocked', e)).join('')}</div>` : ''}
        <div class="pj-two">
          <div class="avd-readout avd-readout--sm"><span class="avd-readout__label avd-eyebrow">Input</span><span class="avd-readout__value">${esc(s.input ? (p.inputs?.[s.input] || s.input) : '—')}</span></div>
          <div class="avd-readout avd-readout--sm"><span class="avd-readout__label avd-eyebrow">Light source</span><span class="avd-readout__value">${s.lightHours != null ? esc(s.lightHours) + '<span class="avd-readout__unit">h</span>' : '—'}</span></div>
        </div>
        <div class="avd-field"><span class="avd-field__label pj-caps">Shutter</span>
          ${seg(`Shutter, ${p.slot}`, [['open', 'Open'], ['closed', 'Closed']], s.shutter, (v) => `data-c="shutter" data-a="${v === 'closed' ? 1 : 0}" ${off ? 'disabled' : ''}`)}
        </div>
        <div class="pj-two">
          <button class="avd-btn" data-c="power" data-a="1" type="button" ${off || busy || s.power === 'cooling' ? 'disabled' : ''}>Power on</button>
          <button class="avd-btn avd-btn--danger" data-c="power" data-a="0" type="button" ${off || busy || lock || s.power === 'off' ? 'disabled' : ''}>Power off</button>
        </div>
        <label class="avd-field"><span class="avd-field__label pj-caps">Input select</span>
          <select class="avd-input" data-c="input" ${off || busy || lock || !inputs.length ? 'disabled' : ''}>${inputs.map(([id, lab]) => `<option value="${esc(id)}" ${String(s.input) === id ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>
        </label>
        <div class="pj-well"><span class="avd-eyebrow">Test pattern</span><span class="pj-mono pj-ink">${esc(pat)}</span></div>
        <div class="pj-two">
          <button class="avd-btn avd-btn--quiet" data-p="08" type="button" ${off || busy || lock || !canPattern(p) ? 'disabled' : ''}>Colour bars</button>
          <button class="avd-btn avd-btn--quiet" data-p="00" type="button" ${off || busy || lock || !canPattern(p) ? 'disabled' : ''}>Pattern off</button>
        </div>
        <button class="avd-btn" data-adj type="button" ${off || !canPattern(p) ? 'disabled' : ''}>Adjust lens, pattern, picture</button>
        <div class="pj-meta pj-mono"><span>${esc(p.model || '')}</span><span>${s.updatedAt ? 'Updated ' + new Date(s.updatedAt).toLocaleTimeString() : ''}</span></div>
      </div>`;
    card.querySelectorAll('button[data-c]').forEach((b) => b.onclick = () => cmd(p.slot, b.dataset.c, Number(b.dataset.a)));
    card.querySelectorAll('button[data-p]').forEach((b) => b.onclick = () => cmd(p.slot, 'pattern', b.dataset.p));
    card.querySelector('button[data-adj]').onclick = () => openAdjust(p.slot);
    const sel = card.querySelector('select'); sel.onchange = () => cmd(p.slot, 'input', sel.value);
    card.querySelectorAll('button, select').forEach((el, n) => { el.dataset.focusKey = `${p.slot}:${n}`; });
    g.appendChild(card);
  });
  g.scrollTop = scroll;
  if (focusKey) [...g.querySelectorAll('[data-focus-key]')].find((el) => el.dataset.focusKey === focusKey)?.focus({ preventScroll: true });
}
function renderPresets() {
  const el = $('#presets'); el.innerHTML = '';
  if (!state.presets.length) el.innerHTML = '<p class="pj-mono">No presets yet. Set the rig how you want it, name it, save.</p>';
  for (const pr of state.presets) {
    const d = document.createElement('div'); d.className = 'pj-item';
    const sum = Object.entries(pr.perSlot).map(([k, v]) => `${k}: ${v.power ? 'on' : 'off'}, ${v.shutter}, ${v.input ?? ''}`).join(' · ');
    d.innerHTML = `<span class="name">${esc(pr.name)}</span><button class="avd-btn" data-r type="button">Recall, tap twice</button><button class="avd-btn avd-btn--danger" data-d type="button">Remove preset</button><span class="sum pj-mono">${esc(sum)}</span>`;
    let armed = 0;
    d.querySelector('[data-r]').onclick = () => { if (Date.now() - armed > 3000) { armed = Date.now(); toast(`Tap again within 3 s to recall ${pr.name}`); return; } armed = 0; api('preset/recall', { name: pr.name }).then((r) => toast(Object.entries(r).map(([k, v]) => `${k} ${v}`).join(' · '), 3500)).catch((e) => toast(e.message)); };
    d.querySelector('[data-d]').onclick = () => api('preset/delete', { name: pr.name }).catch((e) => toast(e.message));
    el.appendChild(d);
  }
}
function renderLog() {
  const tb = $('#log tbody'); tb.innerHTML = '';
  const query = $('#log-search').value.toLowerCase();
  for (const e of [...state.events].reverse().filter((e) => !query || [e.slot, e.command, e.result, e.detail, e.source].join(' ').toLowerCase().includes(query))) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="avd-td--mono">${new Date(e.at).toLocaleTimeString()}</td><td class="avd-td--mono">${esc(e.slot)}</td><td>${esc(e.command)}</td><td class="${e.result === 'OK' ? 'ok' : e.result === 'ERR' ? 'err' : ''}">${esc(e.result)}${e.detail ? ' · ' + esc(e.detail) : ''}</td><td class="pj-mono">${esc(e.source)}</td>`;
    tb.appendChild(tr);
  }
}
$('#log-search').oninput = renderLog;
function renderSetup() {
  const el = $('#setup');
  [...el.children].filter((node) => !dirtySetup.has(node.dataset.slot)).forEach((node) => node.remove());
  const field = (label, inner) => `<label class="avd-field"><span class="avd-field__label">${label}</span>${inner}</label>`;
  for (const p of state.projectors) {
    if (dirtySetup.has(p.slot)) continue;
    const d = document.createElement('div'); d.className = 'pj-item pj-setup'; d.dataset.slot = p.slot;
    d.innerHTML = `<strong>${esc(p.slot)}</strong>
      ${field('Label', `<input class="avd-input" value="${esc(p.label)}" data-k="label">`)}
      ${field('MAC', `<input class="avd-input" value="${esc(p.mac || '')}" placeholder="aa:bb:cc:dd:ee:ff" data-k="mac">`)}
      ${field('IP', `<input class="avd-input" value="${esc(p.ip || '')}" placeholder="192.168.1.x" data-k="ip">`)}
      ${field('Admin user', `<input class="avd-input" value="${esc(p.user || '')}" placeholder="admin1" data-k="user">`)}
      ${field('Driver', `<select class="avd-input" data-k="driver">${['pjlink', 'panasonic', 'pulse', 'simulator'].map((x) => `<option ${p.driver === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`)}
      ${field('PJLink password <span class="avd-field__opt">(blank keeps current)</span>', `<input class="avd-input" type="password" value="" data-k="password" autocomplete="new-password">`)}
      ${field('Notes', `<input class="avd-input" value="${esc(p.notes || '')}" data-k="notes">`)}
      <button class="avd-btn avd-btn--primary" type="button">Save</button>`;
    d.querySelector('button').onclick = () => { const upd = { slot: p.slot }; d.querySelectorAll('[data-k]').forEach((i) => { const v = i.value.trim(); if (i.dataset.k === 'password' && !v) return; upd[i.dataset.k] = v; }); api('projector', upd).then(() => { dirtySetup.delete(p.slot); toast(`${p.slot} saved`); }).catch((e) => toast(e.message)); };
    d.addEventListener('input', () => dirtySetup.add(p.slot));
    const order = state.projectors.map((x) => x.slot);
    el.insertBefore(d, [...el.children].find((node) => order.indexOf(node.dataset.slot) > order.indexOf(p.slot)) || null);
  }
}
function renderAll() {
  $('#show').textContent = state.show || 'Projectors';
  $('#lock-on').setAttribute('aria-pressed', String(!!state.lock)); $('#lock-off').setAttribute('aria-pressed', String(!state.lock));
  const online = state.projectors.filter((p) => p.status?.online).length;
  $('#summary').textContent = `${state.projectors.length} slots · ${online} online`;
  $('#count-rig').textContent = state.projectors.length; $('#count-presets').textContent = state.presets.length || '';
  document.querySelectorAll('[data-all="power"][data-arg="0"], [data-all="pattern"]').forEach((b) => b.disabled = state.lock || !connected);
  renderGrid(); renderPresets(); renderLog(); renderSetup(); if (adjSlot) renderAdjust();
}

// ---- Adjust sheet: patterns, lens, picture ----
let adjSlot = null, adjSpeed = 'slow', adjHomeArmed = 0, adjReturnFocus = null;
function openAdjust(slot) {
  adjSlot = slot; const p = state.projectors.find((x) => x.slot === slot); if (!p) return;
  adjReturnFocus = document.activeElement;
  $('#adj-title').textContent = `${slot} · ${p.label}`; $('#adj-sub').textContent = [p.model, p.ip].filter(Boolean).join(' · ');
  $('#adjust').hidden = false; $('#adjust').showModal(); $('#adj-feedback').textContent = ''; $('#adj-motion').textContent = ''; renderAdjust(); loadPicture(); $('#adj-close').focus();
}
function closeAdjust() { const slot = adjSlot; $('#adjust').close(); $('#adjust').hidden = true; adjSlot = null; const trigger = adjReturnFocus?.isConnected ? adjReturnFocus : [...$('#grid').children].find((el) => el.getAttribute('aria-label')?.startsWith(slot + ' '))?.querySelector('[data-adj]'); trigger?.focus(); }
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
    b.disabled = state.lock || off || !!moving; b.onclick = () => cmd(adjSlot, 'pattern', code); el.appendChild(b);
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
document.querySelectorAll('.lens button[data-l]').forEach((b) => b.onclick = () => cmd(adjSlot, 'lens', { axis: b.dataset.l, speed: adjSpeed, dir: b.dataset.d }));
$('#adj-home').onclick = () => {
  if (Date.now() - adjHomeArmed > 3000) { adjHomeArmed = Date.now(); toast('Tap again within 3 s to send lens shift to home'); return; }
  adjHomeArmed = 0; cmd(adjSlot, 'lens', { op: 'home' });
};
$('#adj-pic-reload').onclick = () => loadPicture();
async function loadPicture() {
  const slot = adjSlot; const el = $('#adj-picture'); el.innerHTML = ''; $('#adj-pic-note').textContent = 'Reading values…';
  const p = state.projectors.find((x) => x.slot === slot);
  const schema = p?.pictureSchema ?? PICTURE;
  if (!Object.keys(schema).length) { $('#adj-pic-note').textContent = 'No picture controls reported by this projector.'; return; }
  let vals = {};
  try { const r = await fetch('/api/picture?slot=' + slot); vals = await r.json(); if (!r.ok) throw new Error(vals.error); }
  catch (e) { $('#adj-pic-note').textContent = e.message; return; }
  if (slot !== adjSlot) return;
  const missing = Object.keys(schema).filter((k) => vals[k] == null);
  $('#adj-pic-note').textContent = missing.length ? 'Greyed values need a signal on the input.' : '';
  for (const [k, d] of Object.entries(schema)) {
    const row = document.createElement('label'); row.className = 'pic-row' + (vals[k] == null ? ' na' : '');
    const v = vals[k];
    if (d.type === 'range') {
      row.innerHTML = `<span>${esc(d.label)}${v == null ? ', needs a signal' : ''}</span><input type="range" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${v ?? 0}" data-unavailable="${v == null}"><output>${v ?? '—'}</output>`;
      const inp = row.querySelector('input'), out = row.querySelector('output');
      inp.oninput = () => out.textContent = inp.value;
      inp.onchange = () => cmd(slot, 'picture', { key: k, value: Number(inp.value) }).then((ok) => { if (ok) row.classList.remove('na'); });
    } else {
      row.innerHTML = `<span>${esc(d.label)}</span><select class="avd-input">${Object.entries(d.options).map(([val, lab]) => `<option value="${esc(val)}" ${String(v) === val ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
      const sel = row.querySelector('select'); if (v == null) sel.value = '';
      sel.onchange = () => cmd(slot, 'picture', { key: k, value: sel.value }).then((ok) => { if (ok) row.classList.remove('na'); });
    }
    el.appendChild(row);
  }
  updatePictureLock();
}

// websocket
function setConn(on) { connected = on; const d = $('#conn .avd-dot'); d.className = 'avd-dot ' + (on ? 'avd-dot--done' : 'avd-dot--blocked'); $('#conn-word').textContent = on ? 'Relay connected' : 'Relay offline'; $('#lock-on').disabled = !on; $('#lock-off').disabled = !on; document.querySelectorAll('[data-all]').forEach((b) => b.disabled = !on || (state.lock && b.dataset.all !== 'shutter' && !(b.dataset.all === 'power' && b.dataset.arg === '1'))); renderGrid(); if (adjSlot) renderAdjust(); }
function connect() {
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  ws.onopen = () => setConn(true);
  ws.onclose = () => { setConn(false); fetch('/api/state').then((r) => { if (r.status === 401) location.href = '/login.html'; else setTimeout(connect, 1500); }).catch(() => setTimeout(connect, 1500)); };
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.type === 'snapshot') { state = msg; renderAll(); }
    else if (msg.type === 'status') { const p = state.projectors.find((x) => x.slot === msg.slot); if (p) { p.status = msg.status; if (msg.inputs) p.inputs = msg.inputs; if (msg.pictureSchema) p.pictureSchema = msg.pictureSchema; renderGrid(); if (adjSlot) renderAdjust(); const online = state.projectors.filter((x) => x.status?.online).length; $('#summary').textContent = `${state.projectors.length} slots · ${online} online`; } }
    else if (msg.type === 'busy') { const p = state.projectors.find((x) => x.slot === msg.slot); if (p) p.busy = msg.busy; renderGrid(); if (adjSlot) renderAdjust(); }
    else if (msg.type === 'event') { state.events.push(msg.event); if (state.events.length > 200) state.events.shift(); renderLog(); }
  };
}
connect();
