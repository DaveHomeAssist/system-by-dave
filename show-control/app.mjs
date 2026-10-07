import { STORE, CUE_KEY, emptyRun, validate, fromCueSheet, logEvent, save } from './model.mjs';
const $ = id => document.getElementById(id);
let baseline = null, run = emptyRun(), dirty = false, pending = null, blocked = false;
try { baseline = localStorage.getItem(STORE); if (baseline) run = validate(JSON.parse(baseline)); }
catch (error) { blocked = true; message(`Saved run could not be opened: ${error.message}. Export the original browser data before editing.`, true); }
const buttons = { go: $('go'), hold: $('hold'), resume: $('resume') };
function message(value, error = false) { $('message').textContent = value; $('message').classList.toggle('error', error); }
function render() {
  $('summary').textContent = `${run.title} · ${run.cues.length} cues${dirty ? ' · Unsaved changes' : ''}`;
  const cue = run.cues[run.current];
  $('current').textContent = cue ? `${cue.number || `Cue ${run.current + 1}`} · ${cue.action || 'Untitled cue'}` : run.cues.length ? 'End of run' : 'No cues loaded';
  $('cue-detail').textContent = cue ? [cue.time, cue.owner, cue.notes].filter(Boolean).join(' · ') : run.cues.length ? 'Every cue has been called. Select a cue to review or repeat it.' : 'Preview a Cue Sheet in Setup, then confirm the copy.';
  $('run-status').textContent = run.held ? 'HOLD — Go is disabled until Resume' : cue ? 'Ready to call' : 'No cue on deck';
  buttons.go.disabled = run.held || !cue; buttons.hold.disabled = run.held || !cue; buttons.resume.disabled = !run.held;
  $('count').textContent = `${run.current} / ${run.cues.length} called`;
  const list = $('cues'); list.replaceChildren();
  run.cues.forEach((item, index) => { const b = document.createElement('button'); b.type = 'button'; b.className = `cue${index === run.current ? ' active' : ''}`; b.setAttribute('aria-label', `Select cue ${item.number || index + 1}: ${item.action}`); b.append(`${item.number || index + 1}  ${item.action || 'Untitled cue'}`); const small = document.createElement('small'); small.textContent = `${item.time || 'No time'} · ${item.owner || 'Unassigned'}${index < run.current ? ' · Called' : ''}`; b.append(small); b.addEventListener('click', () => { run.current = index; dirty = true; render(); message('Cue selected. Save to keep this position.'); }); list.append(b); });
  $('notes').value = run.notes;
  const events = $('events'); events.replaceChildren();
  if (!run.events.length) events.textContent = 'No calls recorded yet.';
  run.events.forEach(event => { const div = document.createElement('div'); div.className = 'event'; div.textContent = `${new Date(event.at).toLocaleString()} · ${event.action}${event.cue ? ` · ${event.cue}` : ''}`; events.append(div); });
}
function replace(next) { run = validate(next); pending = null; dirty = true; $('preview').hidden = true; $('import-preview').hidden = true; render(); message('Run loaded in this tab. Save to keep it after reload.'); }
function download() { const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'show-control-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('Backup exported.'); }
function setTab(id) { document.querySelectorAll('[role=tab]').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.tab === id))); document.querySelectorAll('.view').forEach(view => { view.hidden = view.id !== id; view.classList.toggle('active', view.id === id); }); }
document.querySelectorAll('[role=tab]').forEach(tab => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
document.querySelector('.tabs').addEventListener('keydown', e => { if (!['ArrowLeft','ArrowRight'].includes(e.key)) return; const tabs = [...document.querySelectorAll('[role=tab]')]; const i = tabs.indexOf(document.activeElement); const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; next.focus(); setTab(next.dataset.tab); e.preventDefault(); });
buttons.go.onclick = () => { run = logEvent(run, 'Go'); dirty = true; render(); message('Go recorded. Save the run.'); };
buttons.hold.onclick = () => { run = logEvent(run, 'Hold'); dirty = true; render(); message('Hold recorded.'); };
buttons.resume.onclick = () => { run = logEvent(run, 'Resume'); dirty = true; render(); message('Resume recorded.'); };
$('notes').addEventListener('input', e => { run.notes = e.target.value; dirty = true; $('summary').textContent = `${run.title} · ${run.cues.length} cues · Unsaved changes`; });
$('save').onclick = () => { if (blocked) { message('Saved data is unreadable. Export or recover it before saving here.', true); return; } try { baseline = save(run, localStorage, baseline); dirty = false; render(); message('Run saved and verified in this browser.'); } catch (error) { message(error.message, true); } };
$('export').onclick = download;
$('preview-cues').onclick = () => { try { const raw = localStorage.getItem(CUE_KEY); if (!raw) throw Error('No local Cue Sheet was found in this browser.'); pending = fromCueSheet(raw); const box = $('preview'); box.replaceChildren(); const p = document.createElement('p'); p.textContent = `${pending.title} · ${pending.cues.length} cues. This will replace the current Show Control run only after you confirm.`; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Copy cues into this run'; b.onclick = () => replace(pending); box.append(p,b); box.hidden = false; message('Cue Sheet preview ready.'); } catch (error) { message(error.message, true); } };
$('cue-file').onchange = async e => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; try { if (file.size > 8_000_000) throw Error('Cue Sheet export is too large.'); pending = fromCueSheet(await file.text()); const box = $('cue-file-preview'); box.replaceChildren(); const p = document.createElement('p'); p.textContent = `${pending.title} · ${pending.cues.length} cues. Confirm to copy into this run.`; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Copy imported cues'; b.onclick = () => replace(pending); box.append(p,b); box.hidden = false; message('Cue Sheet export preview ready.'); } catch (error) { pending = null; $('cue-file-preview').hidden = true; message(error.message, true); } };
$('add-cue').onsubmit = e => { e.preventDefault(); const number = $('cue-number').value.trim(), action = $('cue-action').value.trim(), owner = $('cue-owner').value.trim(); if (!number || !action) return; const row = { number, action, owner, time: '', status: 'Ready', notes: '' }; run.cues.push({ id: `cue-${Date.now()}-${run.cues.length}`, ...row, sourceRow: structuredClone(row) }); dirty = true; e.target.reset(); render(); message('Cue added. Save the run.'); };
$('import-file').onchange = async e => { const file = e.target.files[0]; e.target.value = ''; if (!file) return; try { if (file.size > 8_000_000) throw Error('Backup is too large. The current run was kept.'); pending = validate(JSON.parse(await file.text())); const box = $('import-preview'); box.replaceChildren(); const p = document.createElement('p'); p.textContent = `${pending.title} · ${pending.cues.length} cues · ${pending.events.length} log events. Confirm to replace the current Show Control run.`; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Restore this backup'; b.onclick = () => replace(pending); box.append(p,b); box.hidden = false; message('Backup preview ready.'); } catch (error) { pending = null; $('import-preview').hidden = true; message(error.message, true); } };
$('new').onclick = () => { if (dirty && !confirm('Replace unsaved Show Control changes? Export first if needed.')) return; replace(emptyRun()); };
const themeKey = 'sbd.showControl.theme.v1';
let theme = 'light'; try { theme = localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light'; } catch {}
function applyTheme() { document.documentElement.dataset.theme = theme; $('theme').textContent = theme === 'light' ? 'Dark mode' : 'Light mode'; }
$('theme').onclick = () => { theme = theme === 'light' ? 'dark' : 'light'; applyTheme(); try { localStorage.setItem(themeKey, theme); } catch { message('Theme choice could not be saved.', true); } }; applyTheme();
function tick() { $('clock').textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }); } tick(); setInterval(tick, 1000);
const phonePanels = ['on-deck','cues','notes']; let phonePanel = 0;
function applyPhone() { $('run').dataset.panel = phonePanels[phonePanel]; document.querySelectorAll('[data-phone]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.phone === phonePanels[phonePanel]))); }
document.querySelectorAll('[data-phone]').forEach(b => b.addEventListener('click', () => { phonePanel = phonePanels.indexOf(b.dataset.phone); applyPhone(); }));
document.addEventListener('keydown', e => { if (e.altKey && e.key === 'ArrowRight') { phonePanel = (phonePanel + 1) % phonePanels.length; applyPhone(); message(`Phone panel: ${phonePanels[phonePanel]}.`); } }); applyPhone(); render();
