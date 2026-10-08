import { SCHEMA, KEY, ROOM_CHECK_KEY, MAX_ROOM_CHECK_BYTES, empty, validate, addRecord, updateRecord, handoff, statuses, previewRoomCheck, copyRoomCheck } from './model.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let doc = empty(); let saved = JSON.stringify(doc); let storedRaw = null; let tab = 'setup'; let pending = null; let pendingRoom = null; let storageReadable = true;
try { const raw = localStorage.getItem(KEY); storedRaw = raw; if (raw) { doc = validate(JSON.parse(raw)); saved = JSON.stringify(doc); } } catch (error) { storageReadable = false; notice(`Saved Show Ops data could not be read: ${error.message}. It has not been changed. Save is disabled until you can reload and review it.`, true); }
const themeRoot = document.documentElement;
function themeButtonLabel() { return themeRoot.getAttribute('data-av-theme') === 'dark' ? 'Light mode' : 'Dark mode'; }
function notice(message, error = false) { $('notice').textContent = message; $('notice').dataset.error = error ? 'true' : 'false'; }
function changed() { $('dirty').textContent = JSON.stringify(doc) === saved ? 'Saved' : 'Unsaved edits'; render(); }
function sourceDetails(row) {
  if (!row.source) return '';
  const item = row.source.snapshot;
  return `<details class="source-fields"><summary>Original Room Check: ${esc(item.status)} · ${esc(item.area)}</summary><p><strong>Check:</strong> ${esc(item.check)}</p><p><strong>Owner:</strong> ${esc(item.owner || 'Not assigned')} · <strong>Due:</strong> ${esc(item.due || 'Not set')} · <strong>Priority:</strong> ${esc(item.priority)}</p>${item.blocker ? `<p><strong>Blocker:</strong> ${esc(item.blocker)}</p>` : ''}${item.notes ? `<p><strong>Notes:</strong> ${esc(item.notes)}</p>` : ''}</details>`;
}
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
  $('view').innerHTML = `<div class="card"><p class="eyebrow">ADD ${kind.toUpperCase()}</p><form id="add-form"><label>${headings[kind][0]}<input name="name" required maxlength="500"></label><label>${headings[kind][1]}<input name="detail" maxlength="2000"></label><button class="primary" type="submit">Add ${kind.slice(0,-1)}</button></form></div><div class="records" aria-label="${kind} records">${doc[kind].length ? doc[kind].map((row,index) => `<article class="record" data-id="${esc(row.id)}"><span class="index">${String(index+1).padStart(2,'0')}</span><div class="record-fields"><label>Name<input data-field="name" maxlength="500" value="${esc(row.name)}"></label><label>Details<input data-field="detail" maxlength="2000" value="${esc(row.detail)}"></label>${sourceDetails(row)}</div><label>Status<select data-field="status">${statuses[kind].map(status=>`<option ${row.status===status?'selected':''}>${status}</option>`).join('')}</select></label><button type="button" data-remove="${esc(row.id)}" aria-label="Remove ${esc(row.name)}">Remove</button></article>`).join('') : '<p class="empty">No records yet. Add the first one above.</p>'}</div>`;
}
function renderHandoff() {
  const open = handoff(doc);
  $('view').innerHTML = `<div class="card handoff"><p class="eyebrow">CURRENT STATE</p><h3>${esc(doc.show || 'Untitled show')}</h3><p>${esc(doc.date || 'Date not set')}</p><p class="note">${esc(doc.notes || 'No operating notes yet.')}</p></div>${[['Rooms needing attention',open.rooms],['Crew not released',open.crew],['Tasks not done',open.tasks]].map(([title,rows])=>`<section class="card"><h3>${title} <span class="count">${rows.length}</span></h3>${rows.length ? `<ul>${rows.map(row=>`<li><strong>${esc(row.name)}</strong><span>${esc(row.status)}${row.detail ? ' · '+esc(row.detail) : ''}</span></li>`).join('')}</ul>` : '<p class="empty">Clear</p>'}</section>`).join('')}<p class="footnote">This is an internal operating summary. Confirm any client-facing output in the original Show Report or Client Signoff tool.</p>`;
}
function renderBackup() {
  $('view').innerHTML = `<div class="card"><p class="eyebrow">PORTABLE BACKUP</p><h3>Export the current show</h3><p>Download a JSON copy of your current edits, including exact Room Check source text. It does not change saved data.</p><button id="export" type="button">Export JSON</button></div><div class="card"><p class="eyebrow">RESTORE</p><h3>Review before replacing</h3><p>Select a Show Ops backup. The current show stays intact until you confirm.</p><label>JSON backup<input id="import" type="file" accept="application/json,.json"></label><div id="preview"></div></div><div class="card room-copy"><p class="eyebrow">ONE-WAY COPY</p><h3>Copy Room Check checks</h3><p>Review saved or exported Room Check v1 data. The original is never changed. Copied checks start as <strong>Needs check</strong> in Show Ops, even if Room Check says ready.</p><button id="room-saved" type="button">Review saved Room Check</button><label>Room Check JSON file<input id="room-file" type="file" accept="application/json,.json"></label><div id="room-preview"></div></div>`;
  if (pending) showPreview();
  if (pendingRoom) showRoomPreview();
}
function showPreview() { const p = $('preview'); if (!p) return; p.innerHTML = `<div class="preview"><strong>${esc(pending.show || 'Untitled show')}</strong><p>${esc(pending.date || 'No date')} · ${pending.rooms.length} rooms · ${pending.crew.length} crew · ${pending.tasks.length} tasks</p><button id="confirm-import" class="primary" type="button">Replace current show</button><button id="cancel-import" type="button">Cancel</button></div>`; }
function showRoomPreview() {
  const { preview } = pendingRoom;
  $('room-preview').innerHTML = `<div class="preview"><strong>${esc(preview.meta.showName)} · ${esc(preview.meta.showDate)}</strong><p>${esc(preview.meta.venue || 'Venue not set')} · ${esc(preview.meta.room || 'Room not set')}</p><p>Target: ${esc(doc.show || preview.meta.showName)} · ${esc(doc.date || preview.meta.showDate)}. ${preview.alreadyCopied} previously copied. Select checks below; every new Show Ops status will be Needs check until you review it.</p><div class="room-check-list" role="group" aria-label="Room Check checks to copy">${preview.available.map(item => `<label class="room-check-option"><input type="checkbox" name="room-check-row" value="${esc(item.id)}" checked><span><strong>${esc(item.area)} · ${esc(item.check)}</strong><small>Room Check ${esc(item.status)} · ${esc(item.priority)} · ${esc(item.owner || 'No owner')} · due ${esc(item.due || 'not set')}${item.blocker ? ` · blocker: ${esc(item.blocker)}` : ''}${item.notes ? ` · notes: ${esc(item.notes)}` : ''}</small></span></label>`).join('')}</div><div class="preview-actions"><button id="confirm-room" class="primary" type="button">Copy selected as unsaved edits</button><button id="cancel-room" type="button">Cancel</button></div></div>`;
}
function prepareRoomCopy(raw, origin) {
  if (!storageReadable) throw new Error('Saved Show Ops data could not be read. Export and review it before copying.');
  const currentStored = localStorage.getItem(KEY);
  if (currentStored !== storedRaw) throw new Error('Show Ops changed in another tab. Export edits, reload and review before copying.');
  const preview = previewRoomCheck(doc, raw);
  pendingRoom = { preview, origin, docAtPreview: JSON.stringify(doc), targetAtPreview: currentStored };
  renderBackup();
  notice('');
}
document.addEventListener('input', event => {
  if (['name','date','notes'].includes(event.target.id)) { doc = { ...doc, [event.target.id === 'name' ? 'show' : event.target.id]: event.target.value }; $('show-title').textContent = doc.show || 'Untitled show'; $('show-date').textContent = doc.date || 'Set a show date in Setup'; $('dirty').textContent = 'Unsaved edits'; }
  const field = event.target.dataset.field; const row = event.target.closest('[data-id]'); if (field && row && field !== 'status') { doc = updateRecord(doc, tab, row.dataset.id, field, event.target.value); $('dirty').textContent = 'Unsaved edits'; }
});
document.addEventListener('change', async event => {
  if (event.target.dataset.field === 'status') { const row = event.target.closest('[data-id]'); doc = updateRecord(doc, tab, row.dataset.id, 'status', event.target.value); changed(); }
  if (event.target.id === 'import') { pending = null; try { const file = event.target.files[0]; if (!file || file.size > 5000000) throw new Error('Choose a JSON backup smaller than 5 MB.'); pending = validate(JSON.parse(await file.text())); showPreview(); notice('Backup validated. Review its summary, then confirm to replace the current show.'); } catch (error) { $('preview').textContent = ''; event.target.value = ''; notice(error.message, true); } }
  if (event.target.id === 'room-file') { pendingRoom = null; try { const file = event.target.files[0]; if (!file || file.size > MAX_ROOM_CHECK_BYTES) throw new Error('Choose a Room Check JSON file smaller than 500 KB.'); prepareRoomCopy(await file.text(), 'file'); } catch (error) { renderBackup(); notice(error.message, true); } }
});
document.addEventListener('submit', event => { if (event.target.id !== 'add-form') return; event.preventDefault(); const data = new FormData(event.target); doc = addRecord(doc, tab, String(data.get('name')||''), String(data.get('detail')||'')); changed(); });
document.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.dataset.tab) { tab = target.dataset.tab; render(); return; }
  if (target.id === 'save') { try { if (!storageReadable) throw new Error('Saved data could not be read; reload when storage is available before saving.'); if (localStorage.getItem(KEY) !== storedRaw) throw new Error('Another tab changed this show. Export your edits, reload and review before saving.'); const serialized = JSON.stringify(validate(doc)); localStorage.setItem(KEY, serialized); storedRaw = serialized; saved = serialized; $('dirty').textContent = 'Saved'; notice('Show saved on this device. Export a JSON backup for recovery.'); } catch (error) { notice(`Save failed: ${error.message}. Your edits remain in this tab; export a backup.`, true); } return; }
  if (target.id === 'theme') { const next = themeRoot.getAttribute('data-av-theme') === 'dark' ? 'light' : 'dark'; themeRoot.setAttribute('data-av-theme', next); try { localStorage.setItem('av-theme-mode.v1', next); } catch { notice('Theme changed for this visit. Browser preferences could not be saved.', true); } target.textContent = themeButtonLabel(); return; }
  if (target.dataset.remove) { doc = { ...doc, [tab]: doc[tab].filter(row=>row.id!==target.dataset.remove) }; changed(); return; }
  if (target.id === 'export') { const blob = new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='show-ops-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); notice('Backup downloaded.'); return; }
  if (target.id === 'room-saved') { pendingRoom = null; try { const raw = localStorage.getItem(ROOM_CHECK_KEY); if (!raw) throw new Error('No saved Room Check was found on this origin. Export a JSON file from the original tool instead.'); prepareRoomCopy(raw, 'saved'); } catch (error) { renderBackup(); notice(error.message, true); } return; }
  if (target.id === 'confirm-room' && pendingRoom) {
    try {
      if (JSON.stringify(doc) !== pendingRoom.docAtPreview || localStorage.getItem(KEY) !== pendingRoom.targetAtPreview || (pendingRoom.origin === 'saved' && localStorage.getItem(ROOM_CHECK_KEY) !== pendingRoom.preview.raw)) throw new Error('The Room Check or Show Ops document changed after preview. Review a fresh copy.');
      const selected = [...document.querySelectorAll('input[name="room-check-row"]:checked')].map(input => input.value);
      const next = copyRoomCheck(doc, pendingRoom.preview, selected, pendingRoom.origin, new Date().toISOString());
      doc = next; pendingRoom = null; tab = 'rooms'; changed(); notice(`${selected.length} Room Check checks copied as unsaved edits. Review Show Ops readiness, then Save.`);
    } catch (error) { pendingRoom = null; renderBackup(); notice(error.message, true); }
    return;
  }
  if (target.id === 'cancel-room') { pendingRoom = null; renderBackup(); notice('Room Check copy cancelled. Neither saved document changed.'); return; }
  if (target.id === 'confirm-import' && pending) { doc=pending;pending=null;pendingRoom=null;changed();notice('Backup loaded as unsaved edits. Save to keep it on this device.');return; }
  if (target.id === 'cancel-import') {pending=null;$('preview').textContent='';$('import').value='';notice('Import cancelled.');}
});
window.addEventListener('beforeunload', event => { if (JSON.stringify(doc) !== saved) { event.preventDefault(); event.returnValue=''; } });
$('theme').textContent = themeButtonLabel(); render();
