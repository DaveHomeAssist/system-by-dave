import { SCHEMA, KEY, empty, validate, addRecord, updateRecord, handoff, statuses } from './model.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let doc = empty(); let saved = JSON.stringify(doc); let tab = 'setup'; let pending = null; let storageReadable = true;
try { const raw = localStorage.getItem(KEY); if (raw) { doc = validate(JSON.parse(raw)); saved = JSON.stringify(doc); } } catch (error) { storageReadable = false; notice(`Saved Show Ops data could not be read: ${error.message}. It has not been changed. Save is disabled until you can reload and review it.`, true); }
let dark = false;
try { dark = localStorage.getItem('sbd.showOps.theme.v1') === 'dark'; } catch { /* A blocked theme preference must not stop the workspace. */ }
document.documentElement.dataset.theme = dark ? 'dark' : 'light';
function notice(message, error = false) { $('notice').textContent = message; $('notice').dataset.error = error ? 'true' : 'false'; }
function changed() { $('dirty').textContent = JSON.stringify(doc) === saved ? 'Saved' : 'Unsaved edits'; render(); }
function render() {
  $('show-title').textContent = doc.show || 'Untitled show'; $('show-date').textContent = doc.date || 'Set a show date in Setup';
  const outstanding = handoff(doc); $('counts').innerHTML = `<div><b>${outstanding.rooms.length}</b><span>Rooms to check</span></div><div><b>${outstanding.crew.length}</b><span>Crew on call</span></div><div><b>${outstanding.tasks.length}</b><span>Tasks open</span></div>`;
  $('dirty').textContent = JSON.stringify(doc) === saved ? 'Saved' : 'Unsaved edits';
  document.querySelectorAll('[data-tab]').forEach(button => { button.setAttribute('aria-current', button.dataset.tab === tab ? 'page' : 'false'); });
  const labels = { setup:'Set the show', rooms:'Room readiness', crew:'Crew calls', tasks:'Show tasks', handoff:'Handoff', backup:'Backup & restore' };
  $('section-label').textContent = tab.toUpperCase(); $('section-title').textContent = labels[tab];
  if (tab === 'setup') $('view').innerHTML = `<div class="card"><p class="eyebrow">SHOW RECORD</p><label>Show name<input id="name" maxlength="200" value="${esc(doc.show)}" placeholder="e.g. Fall gala"></label><label>Show date<input id="date" type="date" value="${esc(doc.date)}"></label><label>Operating notes<textarea id="notes" maxlength="10000" rows="6" placeholder="Venue, contacts, briefing…">${esc(doc.notes)}</textarea></label></div>`;
  else if (['rooms','crew','tasks'].includes(tab)) renderRecords(tab);
  else if (tab === 'handoff') renderHandoff();
  else renderBackup();
}
function renderRecords(kind) {
  const headings = { rooms:['Room / area','Owner, deadline or blocker'], crew:['Crew member / role','Call time, location or contact'], tasks:['Task','Owner, deadline or next action'] };
  $('view').innerHTML = `<div class="card"><p class="eyebrow">ADD ${kind.toUpperCase()}</p><form id="add-form"><label>${headings[kind][0]}<input name="name" required maxlength="500"></label><label>${headings[kind][1]}<input name="detail" maxlength="2000"></label><button class="primary" type="submit">Add ${kind.slice(0,-1)}</button></form></div><div class="records" aria-label="${kind} records">${doc[kind].length ? doc[kind].map((row,index) => `<article class="record" data-id="${esc(row.id)}"><span class="index">${String(index+1).padStart(2,'0')}</span><div class="record-fields"><label>Name<input data-field="name" maxlength="500" value="${esc(row.name)}"></label><label>Details<input data-field="detail" maxlength="2000" value="${esc(row.detail)}"></label></div><label>Status<select data-field="status">${statuses[kind].map(status=>`<option ${row.status===status?'selected':''}>${status}</option>`).join('')}</select></label><button type="button" data-remove="${esc(row.id)}" aria-label="Remove ${esc(row.name)}">Remove</button></article>`).join('') : '<p class="empty">No records yet. Add the first one above.</p>'}</div>`;
}
function renderHandoff() {
  const open = handoff(doc);
  $('view').innerHTML = `<div class="card handoff"><p class="eyebrow">CURRENT STATE</p><h3>${esc(doc.show || 'Untitled show')}</h3><p>${esc(doc.date || 'Date not set')}</p><p class="note">${esc(doc.notes || 'No operating notes yet.')}</p></div>${[['Rooms needing attention',open.rooms],['Crew not released',open.crew],['Tasks not done',open.tasks]].map(([title,rows])=>`<section class="card"><h3>${title} <span class="count">${rows.length}</span></h3>${rows.length ? `<ul>${rows.map(row=>`<li><strong>${esc(row.name)}</strong><span>${esc(row.status)}${row.detail ? ' · '+esc(row.detail) : ''}</span></li>`).join('')}</ul>` : '<p class="empty">Clear</p>'}</section>`).join('')}<p class="footnote">This is an internal operating summary. Confirm any client-facing output in the original Show Report or Client Signoff tool.</p>`;
}
function renderBackup() {
  $('view').innerHTML = `<div class="card"><p class="eyebrow">PORTABLE BACKUP</p><h3>Export the current show</h3><p>Download a JSON copy of your current edits. It does not change saved data.</p><button id="export" type="button">Export JSON</button></div><div class="card"><p class="eyebrow">RESTORE</p><h3>Review before replacing</h3><p>Select a Show Ops backup. The current show stays intact until you confirm.</p><label>JSON backup<input id="import" type="file" accept="application/json,.json"></label><div id="preview"></div></div>`;
  if (pending) showPreview();
}
function showPreview() { const p = $('preview'); if (!p) return; p.innerHTML = `<div class="preview"><strong>${esc(pending.show || 'Untitled show')}</strong><p>${esc(pending.date || 'No date')} · ${pending.rooms.length} rooms · ${pending.crew.length} crew · ${pending.tasks.length} tasks</p><button id="confirm-import" class="primary" type="button">Replace current show</button><button id="cancel-import" type="button">Cancel</button></div>`; }
document.addEventListener('input', event => {
  if (['name','date','notes'].includes(event.target.id)) { doc = { ...doc, [event.target.id === 'name' ? 'show' : event.target.id]: event.target.value }; $('show-title').textContent = doc.show || 'Untitled show'; $('show-date').textContent = doc.date || 'Set a show date in Setup'; $('dirty').textContent = 'Unsaved edits'; }
  const field = event.target.dataset.field; const row = event.target.closest('[data-id]'); if (field && row && field !== 'status') { doc = updateRecord(doc, tab, row.dataset.id, field, event.target.value); $('dirty').textContent = 'Unsaved edits'; }
});
document.addEventListener('change', async event => {
  if (event.target.dataset.field === 'status') { const row = event.target.closest('[data-id]'); doc = updateRecord(doc, tab, row.dataset.id, 'status', event.target.value); changed(); }
  if (event.target.id === 'import') { pending = null; try { const file = event.target.files[0]; if (!file || file.size > 5000000) throw new Error('Choose a JSON backup smaller than 5 MB.'); pending = validate(JSON.parse(await file.text())); showPreview(); notice('Backup validated. Review its summary, then confirm to replace the current show.'); } catch (error) { $('preview').textContent = ''; event.target.value = ''; notice(error.message, true); } }
});
document.addEventListener('submit', event => { if (event.target.id !== 'add-form') return; event.preventDefault(); const data = new FormData(event.target); doc = addRecord(doc, tab, String(data.get('name')||''), String(data.get('detail')||'')); changed(); });
document.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.dataset.tab) { tab = target.dataset.tab; render(); return; }
  if (target.id === 'save') { try { if (!storageReadable) throw new Error('Saved data could not be read; reload when storage is available before saving.'); const serialized = JSON.stringify(validate(doc)); localStorage.setItem(KEY, serialized); saved = serialized; $('dirty').textContent = 'Saved'; notice('Show saved on this device. Export a JSON backup for recovery.'); } catch (error) { notice(`Save failed: ${error.message}. Your edits remain in this tab; export a backup.`, true); } return; }
  if (target.id === 'theme') { const next = document.documentElement.dataset.theme === 'dark' ? 'light':'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('sbd.showOps.theme.v1',next); } catch {} target.textContent = next === 'dark' ? 'Light mode':'Dark mode'; return; }
  if (target.dataset.remove) { doc = { ...doc, [tab]: doc[tab].filter(row=>row.id!==target.dataset.remove) }; changed(); return; }
  if (target.id === 'export') { const blob = new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='show-ops-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); notice('Backup downloaded.'); return; }
  if (target.id === 'confirm-import' && pending) { doc=pending;pending=null;changed();notice('Backup loaded as unsaved edits. Save to keep it on this device.');return; }
  if (target.id === 'cancel-import') {pending=null;$('preview').textContent='';$('import').value='';notice('Import cancelled.');}
});
window.addEventListener('beforeunload', event => { if (JSON.stringify(doc) !== saved) { event.preventDefault(); event.returnValue=''; } });
$('theme').textContent = dark ? 'Light mode' : 'Dark mode'; render();
