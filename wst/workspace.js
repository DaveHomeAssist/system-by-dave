const NOTE_KEY = 'wst.frozen.personal-notes.v1';
const THEME_KEY = 'wst.frozen.theme.v1';
const notes = document.querySelector('#notes');
const status = document.querySelector('#save-status');
const theme = document.querySelector('#theme');
let storageAvailable = true;
function showTheme(value) {
  document.documentElement.dataset.theme = value;
  theme.setAttribute('aria-pressed', String(value === 'dark'));
  theme.textContent = value === 'dark' ? 'Light theme' : 'Dark theme';
}
try {
  notes.value = localStorage.getItem(NOTE_KEY) || '';
  showTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
  status.textContent = notes.value ? 'Saved notes restored.' : 'Ready. Notes save as you type.';
} catch {
  storageAvailable = false;
  status.textContent = 'Browser storage unavailable. Export before leaving.';
}
notes.addEventListener('input', () => {
  try {
    localStorage.setItem(NOTE_KEY, notes.value);
    storageAvailable = true;
    status.textContent = 'Saved in this browser.';
  } catch {
    storageAvailable = false;
    status.textContent = 'Could not save. Keep this page open and export your notes.';
  }
});
theme.addEventListener('click', () => {
  const value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  showTheme(value);
  try { localStorage.setItem(THEME_KEY, value); } catch { /* Theme remains usable for this visit. */ }
});
document.querySelector('#export').addEventListener('click', () => {
  const blob = new Blob([notes.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `frozen-personal-notes-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = 'Export requested. Check your downloads.';
});
window.addEventListener('beforeunload', event => {
  if (!storageAvailable && notes.value) { event.preventDefault(); event.returnValue = ''; }
});

let currentTasks = [];
const feedback = document.querySelector('#task-feedback');
async function taskAPI(path = '', data) {
 const response = await fetch('/api/tasks' + path, {method:data ? 'POST':'GET', headers:data ? {'Content-Type':'application/json'}:{}, body:data ? JSON.stringify(data):undefined, cache:'no-store'});
 const result = await response.json(); if(!response.ok) throw Error(result.error || 'Task request failed.'); return result;
}
function renderTasks() {
 const list=document.querySelector('#task-list');list.replaceChildren();
 if(!currentTasks.length) { const li=document.createElement('li');li.textContent='No tasks yet. Add the first one.';list.append(li); }
 for(const task of currentTasks){
 const li=document.createElement('li');li.classList.toggle('completed',!!task.done);
 const label=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span');check.type='checkbox';check.checked=!!task.done;text.textContent=task.text;label.append(check,text);li.append(label);
 const edit=document.createElement('button');edit.textContent='Edit';edit.type='button';edit.setAttribute('aria-label','Edit '+task.text);li.append(edit);
 check.onchange=()=>mutate('/'+task.id,{revision:task.revision,done:check.checked,text:task.text});
 const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.setAttribute('aria-label','Delete '+task.text);remove.onclick=()=>{if(confirm('Delete this shared task?'))mutate('/'+task.id,{revision:task.revision,delete:true,text:task.text,done:!!task.done});};li.append(remove);
 edit.onclick=()=>{const value=prompt('Edit team task',task.text);if(value!==null&&value.trim())mutate('/'+task.id,{revision:task.revision,text:value.trim(),done:!!task.done});};list.append(li);
 }
}
async function loadTasks(){try{currentTasks=(await taskAPI()).tasks;renderTasks();document.querySelector('#task-state').textContent='Shared';feedback.textContent='Tasks up to date.';}catch(error){document.querySelector('#task-state').textContent='Unavailable';feedback.textContent=error.message+' Your personal notes still work.';}}
async function mutate(path,data){try{await taskAPI(path,data);await loadTasks();}catch(error){feedback.textContent=error.message;await loadTasks();feedback.textContent=error.message;}}
document.querySelector('#task-add').onsubmit=async(event)=>{event.preventDefault();const field=document.querySelector('#task-text'),text=field.value.trim();if(!text)return;try{await taskAPI('',{text});field.value='';await loadTasks();}catch(error){feedback.textContent=error.message;}};
document.querySelector('#refresh').onclick=loadTasks;loadTasks();setInterval(()=>{if(!document.hidden)loadTasks();},10000);

const clock = document.querySelector('#clock');
function tick(){clock.textContent = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date());clock.dateTime=new Date().toISOString();}tick();setInterval(tick,1000);
