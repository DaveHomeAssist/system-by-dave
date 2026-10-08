import { KEY, ADVANCE_KEY, STAGES, emptyDocument, parseDocument, parseShowAdvance, alreadyImportedAdvance, appendShowAdvance, validateDocument, addClient, addVenue, addJob, updateJob } from './model.mjs';
const $ = id => document.getElementById(id);
let doc = emptyDocument(), saved = '', blocked = false, original = null, pending = null, interactive = false;
let advancePending = null, advanceReturnFocus = null;
const source = { advance: '../show-advance.html', change: '../change-order.html', signoff: '../client-signoff.html', handoff: '../show-handoff.html' };
const tabs = ['clients', 'venues', 'jobs'];
let activeTab = 'clients';
function activateTab(name, focus = false) {
  if (!tabs.includes(name)) return;
  activeTab = name;
  for (const id of tabs) {
    const selected = id === name;
    const tab = $(`tab-${id}`);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(`panel-${id}`).hidden = !selected;
  }
  if (focus) $(`tab-${name}`).focus();
}
function applyTheme(mode, persist = false) {
  const choice = ['light', 'dark', 'system'].includes(mode) ? mode : 'light';
  document.documentElement.setAttribute('data-av-theme', choice);
  $('theme-toggle').textContent = `${choice[0].toUpperCase()}${choice.slice(1)} theme`;
  $('theme-toggle').setAttribute('aria-label', `Theme: ${choice}. Change theme`);
  for (const id of ['light', 'dark']) {
    const meta = document.querySelector(`meta[data-av-theme-color="${id}"]`);
    meta.media = choice === 'system' ? `(prefers-color-scheme: ${id})` : choice === id ? 'all' : 'not all';
  }
  if (persist) try { localStorage.setItem('av-theme-mode.v1', choice); } catch (error) { status('Theme changed for this visit. This browser could not save the preference.', true); }
}
try { applyTheme(localStorage.getItem('av-theme-mode.v1') || 'light'); } catch (error) { applyTheme('light'); }
$('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-av-theme');
  applyTheme(current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light', true);
});
for (const id of tabs) $('tab-' + id).addEventListener('click', () => activateTab(id));
document.querySelector('.tab-list').addEventListener('keydown', event => {
  const index = tabs.indexOf(activeTab);
  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault();
  activateTab(tabs[next], true);
});
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function download(name, content, type = 'application/json') { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function dirty() { return JSON.stringify(doc) !== saved; }
function mark() { status(dirty() ? 'Unsaved changes · Save your document or export a backup.' : original === null ? 'New document · Add records, then save on this device.' : 'Saved on this device. Export a backup for transfer.'); }
function node(tag, content, className) { const element = document.createElement(tag); if (content != null) element.textContent = content; if (className) element.className = className; return element; }
function option(select, value, label) { const element = document.createElement('option'); element.value = value; element.textContent = label; select.append(element); }
function closeAdvancePreview() {
  advancePending = null;
  $('advance-preview').hidden = true;
  for (const element of [document.querySelector('.site-header'), document.querySelector('.hero'), $('workspace'), document.querySelector('footer')]) element.inert = false;
  if (advanceReturnFocus?.isConnected) advanceReturnFocus.focus();
  advanceReturnFocus = null;
}
function updateAdvanceBinding() {
  for (const kind of ['client', 'venue']) {
    const creating = !$(`advance-${kind}-choice`).value;
    $(`advance-${kind}-name-label`).hidden = !creating;
    $(`advance-${kind}-name`).required = creating;
  }
}
function previewAdvance(raw, sourceKind, trigger) {
  if (blocked) throw new Error('Recover the saved Front Office document before copying a source.');
  const candidate = parseShowAdvance(raw);
  if (alreadyImportedAdvance(doc, candidate)) throw new Error('This exact Show Advance is already copied into a job.');
  const savedAdvanceRaw = sourceKind === 'saved' ? raw : null;
  advancePending = { candidate, savedAdvanceRaw, docSnapshot: JSON.stringify(doc), storedSnapshot: original };
  advanceReturnFocus = trigger;
  pending = null;
  $('import-preview').hidden = true;
  const meta = candidate.meta;
  $('advance-summary').textContent = `${meta.showName || 'Unnamed show'} · ${meta.showDate || 'No date'} · ${candidate.items.length} requests. Choose the Front Office identities below. Copying creates one unsaved Advance-stage job.`;
  $('advance-identities').textContent = `Source client: ${meta.client || 'Not provided'} · Source venue: ${meta.venue || 'Not provided'}. These names remain visible while you choose existing or new records.`;
  const statuses = $('advance-statuses');
  statuses.replaceChildren(...Object.entries(candidate.statusCounts).map(([name, count]) => node('li', `${name.slice(0, 80)}: ${count}`)));
  for (const [kind, rows] of [['client', doc.clients], ['venue', doc.venues]]) {
    const select = $(`advance-${kind}-choice`);
    select.replaceChildren();
    option(select, '', `Create new ${kind}`);
    rows.forEach(row => option(select, row.id, `Use existing: ${row.name}`));
    $(`advance-${kind}-name`).value = String(meta[kind] || '').slice(0, 500);
  }
  $('advance-job-name').value = String(meta.showName || '').slice(0, 500);
  updateAdvanceBinding();
  const similar = doc.jobs.filter(job => job.name.trim().toLowerCase() === meta.showName.trim().toLowerCase()).length;
  const warnings = [];
  if (similar) warnings.push(`${similar} existing job${similar === 1 ? '' : 's'} share this show name; this copy will be a separate job.`);
  if (candidate.unsupportedStatuses.length) warnings.push(`Unrecognized source statuses are retained but not mapped: ${candidate.unsupportedStatuses.map(value => value.slice(0, 50)).join(', ')}.`);
  if (!meta.client || !meta.venue) warnings.push('Supply any missing client or venue name, or choose an existing record.');
  $('advance-warning').textContent = warnings.join(' ');
  $('advance-preview').hidden = false;
  for (const element of [document.querySelector('.site-header'), document.querySelector('.hero'), $('workspace'), document.querySelector('footer')]) element.inert = true;
  $('advance-client-choice').focus();
  status('Show Advance preview ready. No Front Office or source data has changed.');
}
function render() {
  $('stats').replaceChildren();
  for (const [value, label] of [[doc.clients.length, 'Clients'], [doc.venues.length, 'Venues'], [doc.jobs.filter(job => job.stage !== 'Complete').length, 'Open jobs'], [doc.jobs.filter(job => job.stage === 'Complete').length, 'Complete']]) { const card = node('div', null, 'stat'); card.append(node('strong', value), node('span', label)); $('stats').append(card); }
  for (const [id, rows, detail] of [['clients', doc.clients, 'contact'], ['venues', doc.venues, 'location']]) { const list = $(id); list.replaceChildren(); rows.forEach(row => { const item = node('li'); item.append(node('strong', row.name)); if (row[detail]) item.append(node('small', row[detail])); if (row.notes) item.append(node('p', row.notes)); list.append(item); }); if (!rows.length) list.append(node('li', 'No records yet.', 'empty')); }
  const form = $('job-form'); for (const [name, rows] of [['clientId', doc.clients], ['venueId', doc.venues]]) { const select = form.elements[name]; select.replaceChildren(); option(select, '', `Choose ${name === 'clientId' ? 'client' : 'venue'}`); rows.forEach(row => option(select, row.id, row.name)); }
  $('job-hint').hidden = doc.clients.length > 0 && doc.venues.length > 0;
  form.querySelector('button').disabled = !($('job-hint').hidden);
  const jobs = $('jobs'); jobs.replaceChildren(); const selected = $('filter').value; const visible = doc.jobs.filter(job => selected === 'all' || job.stage === selected);
  visible.forEach(job => { const client = doc.clients.find(row => row.id === job.clientId), venue = doc.venues.find(row => row.id === job.venueId); const card = node('article', null, 'job'); const top = node('div', null, 'job-top'); const title = node('div'); title.append(node('h3', job.name), node('p', `${client.name} · ${venue.name}`)); top.append(title, node('span', job.stage, 'badge')); card.append(top);
    const form = node('form', null, 'update-form'); form.hidden = !interactive; form.dataset.id = job.id; const stageLabel = node('label', 'Stage'); const stage = node('select'); stage.name = 'stage'; STAGES.forEach(value => option(stage, value, value)); stage.value = job.stage; stageLabel.append(stage); const nextLabel = node('label', 'Next action'); const next = node('input'); next.name = 'nextAction'; next.maxLength = 2000; next.value = job.nextAction; nextLabel.append(next); const noteLabel = node('label', 'Add update'); const note = node('textarea'); note.name = 'note'; note.maxLength = 500; note.placeholder = 'Decision, change, approval, or handoff note'; noteLabel.append(note); const button = node('button', 'Update job'); form.append(stageLabel, nextLabel, noteLabel, button); card.append(form);
    if (job.nextAction) card.append(node('p', `Next: ${job.nextAction}`, 'next-action'));
    if (job.updates.length) { const log = node('details'); const summary = node('summary', `${job.updates.length} update${job.updates.length === 1 ? '' : 's'}`); log.append(summary); const list = node('ol'); job.updates.forEach(update => { const item = node('li'); item.append(node('time', update.date), node('p', update.body)); list.append(item); }); log.append(list); card.append(log); }
    if (job.sourceAdvance) { const advance = parseShowAdvance(job.sourceAdvance.raw); card.append(node('p', `Show Advance copy · ${advance.items.length} original requests retained in backup.`, 'source-note')); const sourceButton = node('button', 'Export original Show Advance'); sourceButton.type = 'button'; sourceButton.dataset.exportAdvance = job.id; card.append(sourceButton); }
    const links = node('div', null, 'tool-links'); for (const [key, label] of [['advance', 'Show Advance'], ['change', 'Change Order'], ['signoff', 'Client Sign Off'], ['handoff', 'Show Handoff']]) { const a = node('a', label); a.href = source[key]; links.append(a); } card.append(links); jobs.append(card); });
  if (!visible.length) jobs.append(node('p', selected === 'all' ? 'No jobs yet. Start with a client and venue.' : `No ${selected.toLowerCase()} jobs.`, 'empty'));
}
function activateForms() { document.querySelectorAll('#workspace form').forEach(form => { form.hidden = false; }); }
function edit(build) { try { const next = validateDocument(build(doc)); doc = next; render(); mark(); return true; } catch (error) { status(`Could not update: ${error.message} Current records are unchanged.`, true); return false; } }
try { const raw = localStorage.getItem(KEY); if (raw !== null) { original = raw; doc = parseDocument(raw); saved = JSON.stringify(doc); } else saved = JSON.stringify(doc); } catch (error) { blocked = true; $('save').disabled = true; $('export').disabled = true; $('recovery').hidden = false; $('workspace').hidden = true; status(`Saved data could not be opened: ${error.message}`, true); }
if (!blocked) { render(); mark(); }
$('client-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; if (edit(current => addClient(current, form.elements.name.value, form.elements.contact.value, form.elements.notes.value))) { form.reset(); if (doc.clients.length === 1 && !doc.venues.length) activateTab('venues', true); else form.elements.name.focus(); } });
$('venue-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; if (edit(current => addVenue(current, form.elements.name.value, form.elements.location.value, form.elements.notes.value))) { form.reset(); if (doc.venues.length === 1 && doc.clients.length) activateTab('jobs', true); else form.elements.name.focus(); } });
$('job-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return; if (edit(current => addJob(current, form.elements.name.value, form.elements.clientId.value, form.elements.venueId.value, form.elements.nextAction.value))) form.reset(); form.elements.name.focus(); });
$('jobs').addEventListener('submit', event => { const form = event.target.closest('.update-form'); if (!form) return; event.preventDefault(); const job = doc.jobs.find(row => row.id === form.dataset.id); if (!job) return; const note = form.elements.note.value.trim(); if (note.length > 500) return status('Update is too long.', true); edit(current => updateJob(current, job.id, form.elements.stage.value, form.elements.nextAction.value, note, new Date().toISOString())); });
$('jobs').addEventListener('click', event => { const button = event.target.closest('[data-export-advance]'); if (!button) return; const job = doc.jobs.find(row => row.id === button.dataset.exportAdvance); if (job?.sourceAdvance) download('show-advance-original.json', job.sourceAdvance.raw); });
$('advance-saved').addEventListener('click', event => { try { const raw = localStorage.getItem(ADVANCE_KEY); if (raw === null) throw new Error('No saved Show Advance was found on this origin. Choose a JSON export instead.'); previewAdvance(raw, 'saved', event.currentTarget); } catch (error) { status(`Show Advance preview rejected: ${error.message} Current work is unchanged.`, true); } });
$('advance-file-button').addEventListener('click', () => $('advance-file').click());
$('advance-file').addEventListener('change', async event => { const file = event.target.files[0]; event.target.value = ''; if (!file) return; try { if (file.size > 1_000_000) throw new Error('Show Advance export is larger than 1 MB.'); previewAdvance(await file.text(), 'file', $('advance-file-button')); } catch (error) { status(`Show Advance preview rejected: ${error.message} Current work is unchanged.`, true); } });
for (const kind of ['client', 'venue']) $(`advance-${kind}-choice`).addEventListener('change', updateAdvanceBinding);
$('cancel-advance').addEventListener('click', () => { closeAdvancePreview(); mark(); });
$('advance-preview').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeAdvancePreview(); mark(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...$('advance-preview').querySelectorAll('select, input:not([type="file"]), button')].filter(element => !element.hidden && !element.disabled && !element.closest('[hidden]'));
  if (!focusable.length) return;
  if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
  else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
});
$('advance-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!advancePending || !event.currentTarget.reportValidity()) return;
  let storedNow;
  let sourceNow;
  try { storedNow = localStorage.getItem(KEY); if (advancePending.savedAdvanceRaw !== null) sourceNow = localStorage.getItem(ADVANCE_KEY); }
  catch (error) { closeAdvancePreview(); status(`Storage could not be checked: ${error.message}. Nothing was copied.`, true); return; }
  if (JSON.stringify(doc) !== advancePending.docSnapshot || storedNow !== advancePending.storedSnapshot || storedNow !== original || (advancePending.savedAdvanceRaw !== null && sourceNow !== advancePending.savedAdvanceRaw)) { closeAdvancePreview(); status('Preview is stale: Front Office or saved Show Advance changed. Review the source again; nothing was copied.', true); return; }
  try {
    const next = appendShowAdvance(doc, advancePending.candidate, {
      clientId: $('advance-client-choice').value,
      clientName: $('advance-client-name').value,
      venueId: $('advance-venue-choice').value,
      venueName: $('advance-venue-name').value,
      jobName: $('advance-job-name').value
    });
    doc = next;
    closeAdvancePreview();
    render();
    activateTab('jobs');
    status('Show Advance copied into this unsaved Front Office document. Save or export a backup.');
  } catch (error) { status(`Show Advance copy rejected: ${error.message} Current work is unchanged.`, true); }
});
$('filter').addEventListener('change', render);
$('save').addEventListener('click', () => { if (blocked) return status('Recover the saved original first.', true); try { const current = localStorage.getItem(KEY); if (current !== original) return status('Saved data changed in another tab. Export your current work, then reload before saving.', true); const raw = JSON.stringify(validateDocument(doc)); localStorage.setItem(KEY, raw); original = raw; saved = raw; mark(); } catch (error) { status(`Save failed: ${error.message}. Export a backup.`, true); } });
$('export').addEventListener('click', () => download('front-office-backup.json', JSON.stringify(doc, null, 2)));
$('export-original').addEventListener('click', () => { if (original != null) download('front-office-original.txt', original, 'text/plain'); });
$('start-fresh').addEventListener('click', () => { if (!confirm('Start a new document? The original bytes remain in storage until you save. Export them first.')) return; blocked = false; $('save').disabled = false; $('export').disabled = false; doc = emptyDocument(); saved = original ?? JSON.stringify(doc); $('recovery').hidden = true; $('workspace').hidden = false; render(); activateForms(); mark(); });
$('import-button').addEventListener('click', () => $('import').click());
$('import').addEventListener('change', async event => { const file = event.target.files[0]; event.target.value = ''; if (!file) return; try { if (file.size > 2_000_000) throw new Error('Backup is larger than 2 MB.'); const candidate = parseDocument(await file.text()); pending = candidate; $('import-summary').textContent = `${candidate.clients.length} clients · ${candidate.venues.length} venues · ${candidate.jobs.length} jobs. Replacing affects only this Front Office document. Export your current document first if needed.`; $('import-preview').hidden = false; $('confirm-import').focus(); status('Valid backup ready to review. No saved data has changed.'); } catch (error) { pending = null; $('import-preview').hidden = true; status(`Import rejected: ${error.message}. Current work is unchanged.`, true); } });
$('cancel-import').addEventListener('click', () => { pending = null; $('import-preview').hidden = true; $('import-button').focus(); mark(); });
$('confirm-import').addEventListener('click', () => { if (!pending) return; if (dirty() && !confirm('Replace unsaved Front Office changes? Export a backup first if needed.')) return; doc = pending; pending = null; $('import-preview').hidden = true; if (blocked) { blocked = false; $('save').disabled = false; $('export').disabled = false; $('recovery').hidden = true; $('workspace').hidden = false; } render(); activateForms(); mark(); $('main').focus(); });
window.addEventListener('beforeunload', event => { if (dirty() && !blocked) { event.preventDefault(); event.returnValue = ''; } });

// Controls become active only after every handler is installed.
interactive = true;
$('boot-status').hidden = true;
if (!blocked) { activateForms(); $('advance-saved').disabled = false; $('advance-file-button').disabled = false; activateTab(doc.jobs.length ? 'jobs' : doc.clients.length ? 'venues' : 'clients'); }
