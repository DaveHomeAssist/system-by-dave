import {mountCalendar, eventKind} from './calendar.js';
const LOCAL_CONTROLLER = !['wst.housevideo.app','wst-frozen.davein4k.chatgpt.site'].includes(location.hostname);
const TASK_BASE = LOCAL_CONTROLLER ? 'https://wst.housevideo.app' : '';
const scopeNotice=document.querySelector('#privacy');if(scopeNotice&&LOCAL_CONTROLLER)scopeNotice.textContent='Saved in this browser on the controller address only. These personal notes are not shared or synced to the website. Export a backup before clearing browser data.';
const NOTE_KEY = 'wst.frozen.personal-notes.v1';
const THEME_KEY = 'wst.frozen.theme.v1';
const notes = document.querySelector('#notes');
const status = document.querySelector('#save-status');
const theme = document.querySelector('#theme');
let storageAvailable = true;
function showTheme(value) {
  document.documentElement.dataset.theme = value;
  const stageFrame=document.querySelector("#public-stage-frame");if(stageFrame?.contentWindow&&stageFrame.getAttribute("src")){const origin=new URL(stageFrame.src,location.href).origin;stageFrame.contentWindow.postMessage({type:"wst:stage-theme",theme:value},origin);}
  theme.setAttribute('aria-pressed', String(value === 'dark'));
  theme.textContent = value === 'dark' ? '☀' : '☾';
  theme.setAttribute('aria-label',value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  theme.title=value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
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
// Enable editing only after saved content and its autosave listener are ready.
notes.setAttribute('data-notes-ready', 'true');
notes.disabled = false;
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
 const response = await fetch(TASK_BASE + '/api/tasks' + path, {method:data ? 'POST':'GET', headers:data ? {'Content-Type':'application/json'}:{}, body:data ? JSON.stringify(data):undefined, cache:'no-store'});
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

const projectorInfo=document.querySelector('#projector-info'),workspacePanels=document.querySelector('#workspace-panels');
const homePanel=document.querySelector('#home-panel'),throwPanel=document.querySelector('#throw-panel');
const schedulePanel=document.querySelector('#schedule-panel');
const relayPanel=document.querySelector('#relay-panel'),relayStatus=document.querySelector('#relay-status');
const publicStagePanel=document.querySelector('#public-stage-panel');
const pixelReference=document.querySelector('#pixel-reference');
const documentsPanel=document.querySelector('#documents-panel');
const ROUTES={documents:{panel:documentsPanel,heading:'Documents'},pixels:{panel:pixelReference,heading:'Pixel Strip Reference'},schedule:{panel:schedulePanel,heading:'Tech Schedule'},home:{panel:homePanel},notes:{panel:workspacePanels},rig:{panel:projectorInfo,heading:'My Projector Rig'},stage:{panel:publicStagePanel,heading:'3D Stage View'},presets:{panel:relayPanel,child:'presets',heading:'Presets',note:'Saved show presets are available only from the connected private controller.'},log:{panel:relayPanel,child:'log',heading:'Log',note:'The real command log is available from the connected private controller.'},configuration:{panel:relayPanel,child:'setup',heading:'Configuration',note:'Projector connection settings and actual EDID availability come from the private controller.'},throw:{panel:throwPanel,heading:'Throw Calc'}};
const PANELS=[documentsPanel,pixelReference,schedulePanel,homePanel,workspacePanels,projectorInfo,relayPanel,throwPanel,publicStagePanel];
let currentRoute='home',selectedProjector=null,reference=null,referenceLoading=null;
async function ensureReference(){if(reference)return reference;if(!referenceLoading)referenceLoading=import('./reference-view.js').then(async module=>{reference=await module.mountReference(document.querySelector('#rig-reference'),{dataUrl:new URL('projectors.json',import.meta.url).href,view:'rig',onProjectorSelect:lane=>{if(!/^[A-D]$/.test(lane))return;selectedProjector=lane;reference?.selectProjector(lane);document.querySelector('#rig-reference h2')?.focus();document.querySelector('#rig-controls').textContent='Open projector '+lane+' controls';document.querySelector('#rig-selection-note').textContent='Projector '+lane+' selected. Gear information is reference; controls open separately on localhost.';if(location.hash!== '#rig/'+lane)history.replaceState(null,'','#rig/'+lane);}});return reference;}).catch(error=>{document.querySelector('#rig-reference').textContent='The projector reference could not load. Reload to retry.';referenceLoading=null;throw error;});return referenceLoading;}
function parseHash(){const match=location.hash.match(/^#(home|notes|rig|stage|presets|log|configuration|throw|schedule|pixels|documents)(?:\/([A-D]))?(?:\/(controls))?$/);if(match&&(match[2]||match[3])&&match[1]!=='rig')return {route:'home'};return match?{route:match[1],projector:match[2]||null,controls:match[3]==='controls'}:{route:'home'};}
function navigate(route,{projector=null,controls=false,updateHash=true}={}){if(!ROUTES[route])return;currentRoute=route;const planningActive=route==='notes'||route==='schedule'||route==='documents';document.querySelector('#planning-shell').hidden=!planningActive;const moreWasOpen=document.querySelector('#nav-more').open;document.querySelector('#nav-more').open=false;const menuWasOpen=document.body.classList.contains('workspace-menu-open');document.body.classList.remove('workspace-menu-open');const menu=document.querySelector('#workspace-menu');menu?.setAttribute('aria-expanded','false');if(menuWasOpen)menu?.focus();if(menu)menu.textContent='Menu · '+({documents:'Planning documents',pixels:'Pixel Strips',schedule:'Planning calendar',home:'Home',notes:'Planning notes',rig:'My Projector Rig',stage:'3D Stage View',presets:'Presets',log:'Log',configuration:'Configuration',throw:'Throw Calc'}[route]);document.body.classList.toggle('stage-focus',route==='stage');if(route==='rig'&&!projector&&!controls)selectedProjector=null;if(/^[A-D]$/.test(projector||''))selectedProjector=projector;const spec=ROUTES[route],privateRig=route==='rig'&&controls;for(const panel of PANELS)panel.hidden=panel!==(privateRig?relayPanel:spec.panel);for(const button of document.querySelectorAll('[data-route]')){if(button.closest('nav')){if(button.dataset.planningEntry!==undefined?planningActive:button.dataset.route===route)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}}if(updateHash){const hash='#'+route+(route==='rig'&&selectedProjector?'/'+selectedProjector:'')+(privateRig?'/controls':'');if(location.hash!==hash)history.pushState(null,'',hash);}document.querySelector('.skip').href=route==='documents'?'#documents-title':route==='home'?'#home-title':route==='notes'?'#notes':route==='rig'&&!privateRig?'#projector-info-title':route==='throw'?'#throw-title':route==='schedule'?'#schedule-title':route==='pixels'?'#pixel-reference-title':'#relay-view-title';
 if(moreWasOpen&&!menuWasOpen)spec.panel.querySelector('h2')?.focus();
 if(route==='rig'&&!privateRig){document.querySelector('#rig-controls').textContent=selectedProjector?'Open projector '+selectedProjector+' controls':'Open rig controls';ensureReference().then(view=>{view.setView('rig');if(selectedProjector)view.selectProjector(selectedProjector);}).catch(()=>{});}
 if(spec.child||privateRig){document.querySelector('#relay-view-title').textContent=privateRig?(selectedProjector?'Projector '+selectedProjector+' controls':'My Projector Rig controls'):spec.heading;document.querySelector('#relay-view-note').textContent=privateRig?'Live status and controls stay in the local controller. This website sends no projector commands.':spec.note;document.querySelector('#back-reference').hidden=!privateRig;}
 if(route==='stage'){const frame=document.querySelector('#public-stage-frame');if(!frame.getAttribute('src')){const target=new URL((location.pathname.startsWith('/workspace/')?'https://wst.housevideo.app':'')+'/stage/index.html',location.href);target.searchParams.set('embed','workspace');target.searchParams.set('theme',document.documentElement.dataset.theme||'light');frame.src=target.href;}}
 if(route==='schedule')queueMicrotask(ensureSchedule);
 if(route==='throw'){const frame=document.querySelector('#throw-frame');if(!frame.getAttribute('src'))frame.src='https://avbydave.com/ProjectorThrow/';}
}
for(const button of document.querySelectorAll('[data-route]'))button.onclick=()=>navigate(button.dataset.route);
for(const button of document.querySelectorAll('[data-reference-view]'))button.onclick=()=>{ensureReference().then(view=>view.setView(button.dataset.referenceView)).catch(()=>{});for(const peer of document.querySelectorAll('[data-reference-view]'))peer.setAttribute('aria-pressed',String(peer===button));};
document.querySelector('#rig-controls').onclick=()=>navigate('rig',{projector:selectedProjector,controls:true});document.querySelector('#back-reference').onclick=()=>navigate('rig',{projector:selectedProjector});
window.addEventListener('hashchange',()=>navigate(parseHash().route,{...parseHash(),updateHash:false}));
const embed=new URL(location.href).searchParams.get('embed');if(embed==='notes'||embed==='info'){document.body.classList.add('embedded-workspace');navigate(embed==='info'?'rig':'notes',{updateHash:false});}else navigate(parseHash().route,{...parseHash(),updateHash:false});
window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='workspace:theme'&&['light','dark'].includes(event.data.theme))showTheme(event.data.theme);});
document.querySelector('#workspace-host').textContent=LOCAL_CONTROLLER?'Controller workspace':'Website workspace';

const publicStageFrame=document.querySelector("#public-stage-frame");publicStageFrame.addEventListener("load",()=>{const origin=new URL(publicStageFrame.src,location.href).origin;publicStageFrame.contentWindow.postMessage({type:"wst:stage-theme",theme:document.documentElement.dataset.theme},origin);});

const workspaceMenu=document.querySelector('#workspace-menu');workspaceMenu.addEventListener('click',()=>{const open=document.body.classList.toggle('workspace-menu-open');workspaceMenu.setAttribute('aria-expanded',String(open));});

const moreMenu=document.querySelector('#nav-more');
document.addEventListener('click',event=>{if(!moreMenu.contains(event.target))moreMenu.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(moreMenu.open){moreMenu.open=false;moreMenu.querySelector('summary').focus();}else if(document.body.classList.contains('workspace-menu-open')){document.body.classList.remove('workspace-menu-open');workspaceMenu.setAttribute('aria-expanded','false');workspaceMenu.focus();}}});
let scheduleData=null,scheduleLoading=null,scheduleIndex=0,calendar=null;
function easternDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function scheduleLabel(date,short=false){return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:short?'short':'long',month:short?'short':'long',day:'numeric'}).format(new Date(date+'T12:00:00Z'));}
function renderSchedule(){
 calendar?.select(scheduleIndex);
 const day=scheduleData[scheduleIndex],detail=document.querySelector('#schedule-detail');detail.replaceChildren();
 const heading=document.createElement('h3');heading.textContent=scheduleLabel(day.date);detail.append(heading);
 const list=document.createElement('ul');list.className='schedule-events';
 for(const event of day.events){const row=document.createElement('li'),name=document.createElement('strong'),time=document.createElement('span');name.textContent=event.label;time.textContent=event.time||'Time not specified';row.dataset.kind=eventKind(event.label);row.classList.toggle('schedule-highlight',/Preview|Performance|Final Dress|Opening Night/.test(event.label));row.append(name,time);list.append(row);}detail.append(list);detail.scrollTop=0;
 document.querySelector('#schedule-date').value=String(scheduleIndex);document.querySelector('#schedule-prev').disabled=scheduleIndex===0;document.querySelector('#schedule-next').disabled=scheduleIndex===scheduleData.length-1;
 for(const button of document.querySelectorAll('#schedule-days button')){if(Number(button.dataset.index)===scheduleIndex)button.setAttribute('aria-current','date');else button.removeAttribute('aria-current');}
}
async function ensureSchedule(){
 if(scheduleData)return;if(scheduleLoading)return scheduleLoading;
 scheduleLoading=(async()=>{try{
 const response=await fetch(new URL('tech-schedule.json',import.meta.url));if(!response.ok)throw Error('Schedule unavailable');scheduleData=await response.json();
 calendar=mountCalendar(document.querySelector('#schedule-month'),scheduleData,index=>{scheduleIndex=index;renderSchedule();},easternDate());
 const today=easternDate(),found=scheduleData.findIndex(day=>day.date===today);scheduleIndex=found>=0?found:today<scheduleData[0].date?0:scheduleData.length-1;
 const select=document.querySelector('#schedule-date'),days=document.querySelector('#schedule-days');select.replaceChildren();days.replaceChildren();
 scheduleData.forEach((day,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=scheduleLabel(day.date);select.append(option);const button=document.createElement('button');button.type='button';button.dataset.index=String(index);button.textContent=scheduleLabel(day.date,true);if(day.date===today)button.textContent+=' · Today';button.onclick=()=>{scheduleIndex=index;renderSchedule();};days.append(button);});
 select.onchange=()=>{scheduleIndex=Number(select.value);renderSchedule();};document.querySelector('#schedule-prev').onclick=()=>{if(scheduleIndex>0){scheduleIndex--;renderSchedule();}};document.querySelector('#schedule-next').onclick=()=>{if(scheduleIndex<scheduleData.length-1){scheduleIndex++;renderSchedule();}};
 const todayButton=document.querySelector('#schedule-today');todayButton.disabled=found<0;todayButton.title=found<0?'Today is outside this November 2026 schedule':'Show today in Philadelphia';todayButton.onclick=()=>{const index=scheduleData.findIndex(day=>day.date===easternDate());if(index>=0){scheduleIndex=index;renderSchedule();}};renderSchedule();
 }catch{document.querySelector('#schedule-month').textContent='Calendar unavailable. Open the original PDF or retry below.';const detail=document.querySelector('#schedule-detail');detail.replaceChildren();const text=document.createElement('p');text.textContent='The daily schedule could not load. Open the original PDF above, or retry.';const retry=document.createElement('button');retry.type='button';retry.textContent='Retry schedule';retry.onclick=()=>ensureSchedule();detail.append(text,retry);scheduleData=null;}finally{scheduleLoading=null;}})();return scheduleLoading;
}

for(const button of document.querySelectorAll('[data-schedule-view]'))button.onclick=()=>{const month=button.dataset.scheduleView==='month';document.querySelector('.schedule-body').classList.toggle('calendar-mode',month);document.querySelector('#schedule-month').hidden=!month;for(const peer of document.querySelectorAll('[data-schedule-view]'))peer.setAttribute('aria-pressed',String(peer===button));};
