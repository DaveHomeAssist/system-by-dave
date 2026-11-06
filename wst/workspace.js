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

const controlAccess=document.querySelector('#control-access');
document.querySelector('#open-control').addEventListener('click',async()=>{
 controlAccess.showModal();
 try{const response=await fetch('/workspace-config.json',{cache:'no-store'});if(!response.ok)return;const config=await response.json();if(!config.control?.verified||!config.control.url)return;const url=new URL(config.control.url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return;const link=document.querySelector('#control-link');link.href=url.href;link.hidden=false;document.querySelector('#control-status').textContent=config.control.label||'Theatre controller';document.querySelector('#control-guidance').textContent=config.control.guidance||'Opens the separately protected theatre controller in a new tab.';}catch{/* Keep the explicit setup state; never substitute this browser’s localhost. */}
});
document.querySelector('#close-control').addEventListener('click',()=>controlAccess.close());
controlAccess.addEventListener('close',()=>document.querySelector('#open-control').focus());

const projectorInfo=document.querySelector('#projector-info'),workspacePanels=document.querySelector('#workspace-panels');
function showSection(info){projectorInfo.hidden=!info;workspacePanels.hidden=info;for(const [id,active] of [['#show-workspace',!info],['#show-projectors',info]]){const el=document.querySelector(id);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}if(info)document.querySelector('#projector-info-title').focus();}
document.querySelector('#show-workspace').onclick=()=>showSection(false);
document.querySelector('#show-projectors').onclick=()=>showSection(true);
async function renderProjectorReference(){
const response=await fetch('/projectors.json',{cache:'no-store'});if(!response.ok)throw Error('Projector reference unavailable.');const {projectors:projectionReference}=await response.json();

for(const p of projectionReference){const card=document.createElement('article');card.className='projector-card';card.style.setProperty('--lane',p.color);const h=document.createElement('h3');h.textContent='Projector '+p.lane;const position=document.createElement('span');position.textContent=p.position;h.append(position);const model=document.createElement('h4');model.textContent=p.model;const dl=document.createElement('dl');for(const [label,value] of [['Position',p.position],['Orientation',p.orientation],['Installed lens',p.lens],['Lens evidence',p.provenance.lens],...(p.image?[['Image',p.image],['Lens to surface',p.throwDistance],['Candidate lens',p.candidate],['Likely current model',p.likelyLens]]:[])]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}const note=document.createElement('p');note.textContent=p.note;card.append(h,model,dl,note);if(p.reviewPlan){const plan=document.createElement('p');plan.className='review-plan';plan.textContent=p.reviewPlan;card.append(plan);}if(p.candidateCheck){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Sizing and installation checks';details.append(summary);for(const value of [p.provenance.likelyLens,p.candidateCheck,p.installationCheck]){const paragraph=document.createElement('p');paragraph.textContent=value;details.append(paragraph);}const spec=document.createElement('a');spec.href=p.installationSource;spec.target='_blank';spec.rel='noopener noreferrer';spec.textContent='Projector installation specification ↗';details.append(spec);const likely=document.createElement('a');likely.href=p.likelyLensSource;likely.target='_blank';likely.rel='noopener noreferrer';likely.textContent='Likely lens manufacturer reference ↗';details.append(document.createElement('br'),likely);card.append(details);}if(p.source){const link=document.createElement('a');link.href=p.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Manufacturer lens specification ↗';card.append(link);}document.querySelector('#projector-cards').append(card);}

}
renderProjectorReference().catch(()=>{document.querySelector('#projector-cards').textContent='Projector reference could not load. Refresh to retry.';});
