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

  theme.textContent = value === 'dark' ? '☀' : '☾';


}
try {
  notes.value = localStorage.getItem(NOTE_KEY) || '';
  showTheme(window.FrozenTheme?.theme || (localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'));
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
window.addEventListener('frozen:themechange', event => {
 showTheme(event.detail.theme);

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
let editingEntry = null;
const feedback = document.querySelector('#task-feedback');
const updateFeedback = document.querySelector('#update-feedback');
async function taskAPI(path = '', data) {
 const response = await fetch(TASK_BASE + '/api/tasks' + path, {method:data ? 'POST':'GET', headers:data ? {'Content-Type':'application/json'}:{}, body:data ? JSON.stringify(data):undefined, cache:'no-store'});
 const result = await response.json();
 if(!response.ok) throw Error(result.error || 'Could not save. Try again.');
 return result;
}
function showEntryFeedback(message) {
 feedback.textContent = message;
 updateFeedback.textContent = message;
}
function entryButton(text, action, entry) {
 const button = document.createElement('button');
 button.type = 'button'; button.textContent = text;
 button.setAttribute('aria-label', text + ' ' + entry.text);
 button.onclick = action;
 return button;
}
function editEntry(entry, item) {
 editingEntry = entry.id;
 const form = document.createElement('form'); form.className = 'entry-editor';
 const field = document.createElement('textarea');
 field.value = entry.text; field.maxLength = 500; field.required = true;
 field.setAttribute('aria-label', 'Edit ' + (entry.kind === 'update' ? 'update' : 'task'));
 const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Save';
 const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
 cancel.onclick = () => { editingEntry = null; renderTasks(); };
 form.append(field, save, cancel); item.replaceChildren(form); field.focus();
 form.onsubmit = async event => {
  event.preventDefault();
  if(!field.value.trim()) return;
  save.disabled = true;
  const latest = currentTasks.find(row => row.id === entry.id);
  if(!latest) { showEntryFeedback('This entry was removed. Copy your text before cancelling.'); save.disabled = false; return; }
  const saved = await mutate('/' + entry.id, {...latest, text:field.value.trim()});
  save.disabled = false;
  if(saved) { editingEntry = null; renderTasks(); }
 };
}
function renderEntry(entry) {
 const item = document.createElement('li');
 const isUpdate = entry.kind === 'update';
 item.classList.toggle('completed', !isUpdate && !!entry.done);
 const body = document.createElement(isUpdate ? 'div' : 'label'); body.className = 'entry-body';
 if(!isUpdate) {
  const check = document.createElement('input'); check.type = 'checkbox'; check.checked = !!entry.done;
  check.onchange = () => mutate('/' + entry.id, {...entry, done:check.checked});
  body.append(check);
 }
 const text = document.createElement('span'); text.textContent = entry.text; body.append(text);
 if(isUpdate && entry.created_at) {
  const date = document.createElement('time'); date.dateTime = entry.created_at;
  date.textContent = new Intl.DateTimeFormat('en-US', {month:'short',day:'numeric',timeZone:'America/New_York'}).format(new Date(entry.created_at));
  body.prepend(date);
 }
 const actions = document.createElement('div'); actions.className = 'entry-actions';
 actions.append(entryButton('Edit', () => editEntry(entry,item), entry));
 actions.append(entryButton(isUpdate ? 'Make a task' : 'Move to updates', () => mutate('/'+entry.id, {...entry,kind:isUpdate ? 'task' : 'update',done:false}), entry));
 actions.append(entryButton('Delete', () => { if(confirm('Delete this '+(isUpdate?'update':'task')+'?')) mutate('/'+entry.id,{...entry,delete:true}); }, entry));
 item.append(body, actions); return item;
}
function renderTasks() {
 const updates = currentTasks.filter(entry => entry.kind === 'update');
 const tasks = currentTasks.filter(entry => entry.kind !== 'update');
 const open = tasks.filter(entry => !entry.done), completed = tasks.filter(entry => entry.done);
 for(const [id,entries,empty] of [['#task-list',open,'Nothing left on the list.'],['#completed-task-list',completed,''],['#update-list',updates,'No team updates yet.']]) {
  const list = document.querySelector(id); list.replaceChildren(...entries.map(renderEntry));
  if(!entries.length && empty) { const item = document.createElement('li'); item.className = 'empty-list'; item.textContent = empty; list.append(item); }
 }
 document.querySelector('#task-state').textContent = open.length + ' open';
 document.querySelector('#completed-count').textContent = completed.length;
 document.querySelector('#completed-tasks').hidden = !completed.length;
}
async function loadTasks() {
 try { currentTasks = (await taskAPI()).tasks; if(!editingEntry) renderTasks(); showEntryFeedback('Up to date.'); }
 catch(error) { showEntryFeedback(error.message); }
}
async function mutate(path,data) {
 try {
  const payload = path ? {...data, done:!!data.done} : data;
  await taskAPI(path,payload); await loadTasks(); return true;
 }
 catch(error) { await loadTasks(); showEntryFeedback(error.message); return false; }
}
for(const [formId,fieldId,kind] of [['#task-add','#task-text','task'],['#update-add','#update-text','update']]) {
 document.querySelector(formId).onsubmit = async event => {
  event.preventDefault(); const field = document.querySelector(fieldId), text = field.value.trim();
  if(!text) return;
  const submit = event.currentTarget.querySelector('button[type=submit]');
  submit.disabled = true;
  if(await mutate('',{text,kind})) field.value = '';
  submit.disabled = false;
 };
}
document.querySelector('#refresh').onclick = loadTasks;
loadTasks(); setInterval(() => { if(!document.hidden && !editingEntry) loadTasks(); },10000);

const clock = document.querySelector('#clock');
function tick(){clock.textContent = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date());clock.dateTime=new Date().toISOString();}tick();setInterval(tick,1000);

const projectorInfo=document.querySelector('#projector-info'),workspacePanels=document.querySelector('#workspace-panels');
const homePanel=document.querySelector('#home-panel'),throwPanel=document.querySelector('#throw-panel');
const schedulePanel=document.querySelector('#schedule-panel');
const relayPanel=document.querySelector('#relay-panel'),relayFrame=document.querySelector('#relay-frame'),relayStatus=document.querySelector('#relay-status'),relayLink=document.querySelector('#open-controller');
const publicStagePanel=document.querySelector('#public-stage-panel');
const pixelReference=document.querySelector('#pixel-reference');
const documentsPanel=document.querySelector('#documents-panel');
const updatesPanel=document.querySelector('#updates-panel');
const handoffPanel=document.querySelector('#handoff-panel');
const ROUTES={handoff:{panel:handoffPanel,heading:'House handoff'},updates:{panel:updatesPanel,heading:'Team updates'},documents:{panel:documentsPanel,heading:'Documents'},pixels:{panel:pixelReference,heading:'Pixel Strip Reference'},schedule:{panel:schedulePanel,heading:'Tech Schedule'},home:{panel:homePanel},notes:{panel:workspacePanels},rig:{panel:projectorInfo,heading:'My Projector Rig'},stage:{panel:publicStagePanel,heading:'3D Stage View'},presets:{panel:relayPanel,child:'presets',heading:'Presets',note:'Choose and recall saved show presets.'},log:{panel:relayPanel,child:'log',heading:'Log',note:'Review recent projector actions.'},configuration:{panel:relayPanel,child:'setup',heading:'Configuration',note:'Manage projector connections and settings.'},throw:{panel:throwPanel,heading:'Throw Calc'}};
const PANELS=[handoffPanel,updatesPanel,documentsPanel,pixelReference,schedulePanel,homePanel,workspacePanels,projectorInfo,relayPanel,throwPanel,publicStagePanel];
const CHILD_VIEWS=new Set(['rig','stage','presets','log','setup','throw']);
let relayViews=new Set(['rig','stage']),relayProjectorSelection=false;
const LOCAL_RELAY_WORKSPACE = LOCAL_CONTROLLER && location.pathname.startsWith('/workspace/');
const controllerUrl = LOCAL_RELAY_WORKSPACE ? new URL('/',location.href).href : 'http://localhost:8080/';
if(LOCAL_RELAY_WORKSPACE){
 relayLink.href=controllerUrl;relayLink.textContent='Open controller ↗';
 document.querySelector('#connect-mac').textContent='Connect this controller';
}
let relayOrigin=null,relayReady=false,relayView='rig',relayProjector=null,relayTimer,currentRoute='home',selectedProjector=null,reference=null,referenceLoading=null;
function childMessage(){const message={type:'wst:show-panel',panel:relayView};if(/^[A-D]$/.test(relayProjector||''))message.projector=relayProjector;return message;}
function sendChildView(){if(!relayReady||!relayOrigin)return;if(!relayViews.has(relayView)){relayFrame.hidden=true;relayStatus.textContent='This view needs a controller update. Open the controller in a new tab to continue.';return;}relayFrame.hidden=false;const message=childMessage();if(message.projector&&!relayProjectorSelection){delete message.projector;relayStatus.textContent='Controller connected. Choose projector '+relayProjector+' inside the rig view.';}relayFrame.contentWindow.postMessage(message,relayOrigin);}
function recommendLink(on){if(on)relayLink.dataset.recommended='true';else delete relayLink.dataset.recommended;}
async function ensureReference(){if(reference)return reference;if(!referenceLoading)referenceLoading=import('./reference-view.js').then(async module=>{reference=await module.mountReference(document.querySelector('#rig-reference'),{dataUrl:new URL('projectors.json',import.meta.url).href,view:'rig',onProjectorSelect:lane=>{if(!/^[A-D]$/.test(lane))return;selectedProjector=lane;reference?.selectProjector(lane);document.querySelector('#rig-reference h2')?.focus();document.querySelector('#rig-controls').textContent='Open projector '+lane+' controls';document.querySelector('#rig-selection-note').textContent='Projector '+lane+' selected. This is the saved gear list. Use Controls to reach the projectors.';if(location.hash!== '#rig/'+lane)history.replaceState(null,'','#rig/'+lane);}});return reference;}).catch(error=>{document.querySelector('#rig-reference').textContent='The projector reference could not load. Reload to retry.';referenceLoading=null;throw error;});return referenceLoading;}
function parseHash(){const match=location.hash.match(/^#(home|handoff|notes|updates|rig|stage|presets|log|configuration|throw|schedule|pixels|documents)(?:\/([A-D]))?(?:\/(controls))?$/);if(match&&(match[2]||match[3])&&match[1]!=='rig')return {route:'home'};return match?{route:match[1],projector:match[2]||null,controls:match[3]==='controls'}:{route:'home'};}
function navigate(route,{projector=null,controls=false,updateHash=true}={}){if(!ROUTES[route])return;
 if(LOCAL_RELAY_WORKSPACE && parent!==window && (controls||ROUTES[route].child)){const message={type:'wst:show-panel',panel:controls?'rig':ROUTES[route].child};if(projector||selectedProjector)message.projector=projector||selectedProjector;parent.postMessage(message,location.origin);return;}
currentRoute=route;const planningActive=route==='updates'||route==='notes'||route==='schedule'||route==='documents';document.querySelector('#planning-shell').hidden=!planningActive;const moreWasOpen=document.querySelector('#nav-more').open;document.querySelector('#nav-more').open=false;const menuWasOpen=document.body.classList.contains('workspace-menu-open');document.body.classList.remove('workspace-menu-open');const menu=document.querySelector('#workspace-menu');menu?.setAttribute('aria-expanded','false');if(menuWasOpen)menu?.focus();if(menu)menu.textContent='Menu · '+({handoff:'House handoff',updates:'Team updates',documents:'Planning documents',pixels:'Pixel Strips',schedule:'Planning calendar',home:'Home',notes:'Planning notes',rig:'My Projector Rig',stage:'3D Stage View',presets:'Presets',log:'Log',configuration:'Configuration',throw:'Throw Calc'}[route]);document.body.classList.toggle('stage-focus',route==='stage');if(route==='rig'&&!projector&&!controls)selectedProjector=null;if(/^[A-D]$/.test(projector||''))selectedProjector=projector;const spec=ROUTES[route],privateRig=route==='rig'&&controls;for(const panel of PANELS)panel.hidden=panel!==(privateRig?relayPanel:spec.panel);for(const button of document.querySelectorAll('[data-route]')){if(button.closest('nav')){if(button.dataset.planningEntry!==undefined?planningActive:(button.dataset.route===route && button.hasAttribute('data-open-controls')===privateRig))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}}if(updateHash){const hash='#'+route+(route==='rig'&&selectedProjector?'/'+selectedProjector:'')+(privateRig?'/controls':'');if(location.hash!==hash)history.pushState(null,'',hash);}document.querySelector('.skip').href=route==='handoff'?'#handoff-title':route==='updates'?'#updates-title':route==='documents'?'#documents-title':route==='home'?'#home-title':route==='notes'?'#notes':route==='rig'&&!privateRig?'#projector-info-title':route==='throw'?'#throw-title':route==='schedule'?'#schedule-title':route==='pixels'?'#pixel-reference-title':'#relay-view-title';
 if(moreWasOpen&&!menuWasOpen)spec.panel.querySelector('h2')?.focus();
 if(route==='rig'&&!privateRig){document.querySelector('#rig-controls').textContent=selectedProjector?'Open projector '+selectedProjector+' controls':'Open rig controls';ensureReference().then(view=>{view.setView('rig');if(selectedProjector)view.selectProjector(selectedProjector);}).catch(()=>{});}
 if(spec.child||privateRig){relayView=privateRig?'rig':spec.child;relayProjector=privateRig?selectedProjector:null;document.querySelector('#relay-view-title').textContent=privateRig?(selectedProjector?'Projector '+selectedProjector+' controls':'My Projector Rig controls'):spec.heading;document.querySelector('#relay-view-note').textContent=privateRig?(LOCAL_RELAY_WORKSPACE?'This workspace is served by the controller. Open it directly or connect the view below.':'Live controls require the Mac running Projctl. On another device, use the verified theatre controller address. This website does not send commands.'):spec.note;document.querySelector('#back-reference').hidden=!privateRig;sendChildView();}
 if(route==='stage'){const frame=document.querySelector('#public-stage-frame');if(!frame.getAttribute('src')){const target=new URL((location.pathname.startsWith('/workspace/')?'https://wst.housevideo.app':'')+'/stage/index.html',location.href);target.searchParams.set('embed','workspace');target.searchParams.set('theme',document.documentElement.dataset.theme||'light');frame.src=target.href;}}
 if(route==='schedule')queueMicrotask(ensureSchedule);
 if(route==='throw'){const frame=document.querySelector('#throw-frame');if(!frame.getAttribute('src'))frame.src='https://avbydave.com/ProjectorThrow/';}
}
for(const button of document.querySelectorAll('[data-route]'))button.onclick=()=>navigate(button.dataset.route,{controls:button.hasAttribute('data-open-controls')});
for(const button of document.querySelectorAll('[data-reference-view]'))button.onclick=()=>{ensureReference().then(view=>view.setView(button.dataset.referenceView)).catch(()=>{});for(const peer of document.querySelectorAll('[data-reference-view]'))peer.setAttribute('aria-pressed',String(peer===button));};
document.querySelector('#rig-controls').onclick=()=>navigate('rig',{projector:selectedProjector,controls:true});document.querySelector('#back-reference').onclick=()=>navigate('rig',{projector:selectedProjector});
async function connectRelay(url,label){const target=new URL(url);if(!['http:','https:'].includes(target.protocol)||target.username||target.password)throw Error('Invalid controller address');relayOrigin=target.origin;relayReady=false;relayFrame.hidden=true;clearTimeout(relayTimer);recommendLink(false);relayStatus.textContent='Requesting access to '+label+'…';document.querySelector('#workspace-connection').textContent='Private controller connecting';
 try{const response=await fetch(new URL('/api/health',target),{cache:'no-store',targetAddressSpace:target.hostname==='localhost'?'loopback':'local',signal:AbortSignal.timeout(12000)});const health=await response.json();if(!response.ok||health.service!=='projctl'||health.ok!==true)throw Error('Relay health unavailable');}
 catch{recommendLink(true);relayStatus.textContent='Cannot reach the controller. Open it in a new tab, or allow local-network access in your browser.';document.querySelector('#workspace-connection').textContent='Private controller not connected';return;}
 relayStatus.textContent='Opening the controller… You can also open it in a new tab.';relayFrame.hidden=false;target.searchParams.set('workspaceEmbed','1');relayFrame.src=target.href;relayTimer=setTimeout(()=>{if(!relayReady){relayFrame.hidden=true;recommendLink(true);relayStatus.textContent='The controller could not open inside this page. Use Open local controller to try a new tab.';document.querySelector('#workspace-connection').textContent='Private controller: open in a new tab';}},8000);}
function themeController(){if(relayOrigin)relayFrame.contentWindow.postMessage({type:'wst:theme',mode:window.FrozenTheme.mode},relayOrigin);}
window.addEventListener('frozen:themechange',themeController);
relayFrame.addEventListener('load',()=>{if(relayOrigin){relayFrame.contentWindow.postMessage({type:'wst:hello'},relayOrigin);themeController();}});
window.addEventListener('message',event=>{if(event.source!==relayFrame.contentWindow||event.origin!==relayOrigin||event.data?.type!=='projctl:ready')return;if(event.data.relayConnected!==true){relayReady=false;relayStatus.textContent='Controller page loaded; relay is reconnecting.';document.querySelector('#workspace-connection').textContent='Private relay reconnecting';return;}relayReady=true;relayViews=new Set(Array.isArray(event.data.views)?event.data.views.filter(view=>CHILD_VIEWS.has(view)):['rig','stage']);relayProjectorSelection=event.data.projectorSelection===true;clearTimeout(relayTimer);recommendLink(false);const word='Private controller connected · '+(new URL(relayOrigin).hostname==='localhost'?'this Mac':new URL(relayOrigin).hostname);relayStatus.textContent=word;document.querySelector('#workspace-connection').textContent=word;sendChildView();});
document.querySelector('#connect-mac').onclick=()=>connectRelay(controllerUrl,LOCAL_RELAY_WORKSPACE?'this controller':'this Mac');
(async()=>{try{const response=await fetch(new URL('workspace-config.json',import.meta.url),{cache:'no-store'});const cfg=await response.json();if(cfg.control?.verified&&cfg.control.url){const button=document.querySelector('#connect-venue');button.hidden=false;button.onclick=()=>connectRelay(cfg.control.url,cfg.control.label||'theatre controller');}}catch{/* Keep explicit connection options. */}})();
window.addEventListener('hashchange',()=>navigate(parseHash().route,{...parseHash(),updateHash:false}));
const embed=new URL(location.href).searchParams.get('embed');if(embed==='notes'||embed==='info'){document.body.classList.add('embedded-workspace');navigate(embed==='info'?'rig':'notes',{updateHash:false});}else navigate(parseHash().route,{...parseHash(),updateHash:false});
window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='workspace:theme'&&['light','dark','system'].includes(event.data.mode||event.data.theme))window.FrozenTheme.set(event.data.mode||event.data.theme,{save:false});});
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
