// Notes page: personal notes (the key Projctl's Notes panel uses on this origin), the shared
// team task list from the public Frozen workspace service, documents and Notion records.
import { startMonitor, esc, $ } from './monitor.js';
import { DOCUMENTS, RECORDS, SHARED_BOARD } from './monitor-data.js';

const NOTE_KEY = 'wst.frozen.personal-notes.v1';
const TASKS = 'https://wst.housevideo.app/api/tasks';
const notes = $('#fm-notes-text'), noteStatus = $('#fm-notes-status');
let storageAvailable = true;
try { notes.value = localStorage.getItem(NOTE_KEY) || ''; noteStatus.textContent = notes.value ? 'Saved notes restored.' : 'Ready. Notes save as you type.'; }
catch { storageAvailable = false; noteStatus.textContent = 'Browser storage unavailable. Export before leaving.'; }
notes.addEventListener('input', () => {
  try { localStorage.setItem(NOTE_KEY, notes.value); storageAvailable = true; noteStatus.textContent = 'Saved in this browser.'; }
  catch { storageAvailable = false; noteStatus.textContent = 'Could not save. Keep this page open and export your notes.'; }
});
// Another tab (or Projctl's Notes panel) on this origin may edit the same notes.
window.addEventListener('storage', event => { if (event.key === NOTE_KEY && document.activeElement !== notes) { notes.value = event.newValue || ''; noteStatus.textContent = 'Updated from another tab.'; } });
notes.disabled = false;
$('#fm-notes-export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([notes.value], { type: 'text/plain;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `frozen-personal-notes-${new Date().toISOString().slice(0, 10)}.txt` });
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  noteStatus.textContent = 'Export requested. Check your downloads.';
});
window.addEventListener('beforeunload', event => { if (!storageAvailable && notes.value) { event.preventDefault(); event.returnValue = ''; } });

let tasks = [];
const feedback = $('#fm-task-feedback');
async function taskAPI(path = '', data) {
  const r = await fetch(TASKS + path, { method: data ? 'POST' : 'GET', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  const result = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(result.error || 'Task request failed.');
  return result;
}
function renderTasks() {
  $('#fm-task-list').innerHTML = tasks.length ? tasks.map(t => `<li class="${t.done ? 'fm-done' : ''}"><label><input type="checkbox" data-task="${esc(t.id)}" data-key="task-${esc(t.id)}" ${t.done ? 'checked' : ''}><span>${esc(t.text)}</span></label><span class="pj-mono fm-small">${t.done ? 'Done' : 'Open'}</span></li>`).join('')
    : '<li><span class="fm-muted">No tasks yet. Add the first one.</span></li>';
}
async function loadTasks() {
  try { tasks = (await taskAPI()).tasks || []; renderTasks(); $('#fm-task-state').textContent = 'Shared · live'; feedback.textContent = 'Tasks up to date.'; }
  catch (error) { $('#fm-task-state').textContent = 'Unavailable'; feedback.textContent = `${error.message} Your personal notes still work.`; }
}
$('#fm-task-list').addEventListener('change', async event => {
  const box = event.target.closest('[data-task]'), task = tasks.find(t => String(t.id) === box?.dataset.task);
  if (!task) return;
  try { await taskAPI('/' + encodeURIComponent(task.id), { revision: task.revision, done: box.checked, text: task.text }); }
  catch (error) { feedback.textContent = error.message; }
  await loadTasks();
});
$('#fm-task-add').addEventListener('submit', async event => {
  event.preventDefault();
  const field = $('#fm-task-text'), text = field.value.trim();
  if (!text) return;
  try { await taskAPI('', { text }); field.value = ''; await loadTasks(); } catch (error) { feedback.textContent = error.message; }
});
$('#fm-task-refresh').addEventListener('click', loadTasks);
$('#fm-shared-board').href = SHARED_BOARD;
loadTasks();
setInterval(() => { if (!document.hidden) loadTasks(); }, 10000);

$('#fm-docs').innerHTML = DOCUMENTS.map(d => `<a href="${esc(d.href)}" target="_blank" rel="noopener noreferrer"><span class="avd-eyebrow">${esc(d.tag)}</span><strong>${esc(d.title)} ↗</strong><span>${esc(d.text)}</span></a>`).join('')
  + '<p class="fm-muted">Nov 14 pixel routing reply is not in the drawings yet.</p>';
$('#fm-records').innerHTML = RECORDS.map(r => `<li><a href="${esc(r.href)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a></li>`).join('');

startMonitor();
