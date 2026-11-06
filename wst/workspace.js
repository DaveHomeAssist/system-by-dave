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
const relayPanel=document.querySelector('#relay-panel'),relayFrame=document.querySelector('#relay-frame'),relayStatus=document.querySelector('#relay-status');
const ROUTES={home:{panel:homePanel},notes:{panel:workspacePanels},rig:{panel:projectorInfo,heading:'My Projector Rig'},stage:{panel:relayPanel,child:'stage',heading:'3D Stage View',note:'The theatre room model and projector positions stay on the private controller.'},presets:{panel:relayPanel,child:'presets',heading:'Presets',note:'Saved show presets are available only from the connected private controller.'},log:{panel:relayPanel,child:'log',heading:'Log',note:'The real command log is available from the connected private controller.'},configuration:{panel:relayPanel,child:'setup',heading:'Configuration',note:'Projector connection settings and actual EDID availability come from the private controller.'},throw:{panel:throwPanel,heading:'Throw Calc'}};
const PANELS=[homePanel,workspacePanels,projectorInfo,relayPanel,throwPanel];
let relayOrigin=null,relayReady=false,relayView='rig',relayProjector=null,relayTimer,currentRoute='home',selectedProjector=null,reference=null,referenceLoading=null;
function childMessage(){const message={type:'wst:show-panel',panel:relayView};if(/^[A-D]$/.test(relayProjector||''))message.projector=relayProjector;return message;}
function sendChildView(){if(relayReady&&relayOrigin)relayFrame.contentWindow.postMessage(childMessage(),relayOrigin);}
async function ensureReference(){if(reference)return reference;if(!referenceLoading)referenceLoading=import('./reference-view.js').then(async module=>{reference=await module.mountReference(document.querySelector('#rig-reference'),{dataUrl:new URL('projectors.json',import.meta.url).href,view:'rig',onProjectorSelect:lane=>{if(!/^[A-D]$/.test(lane))return;selectedProjector=lane;document.querySelector('#rig-controls').textContent='Open projector '+lane+' controls';document.querySelector('#rig-selection-note').textContent='Projector '+lane+' selected. Gear information is reference; private controls need the connected relay.';if(location.hash!== '#rig/'+lane)history.replaceState(null,'','#rig/'+lane);}});return reference;}).catch(error=>{document.querySelector('#rig-reference').textContent='The projector reference could not load. Reload to retry.';referenceLoading=null;throw error;});return referenceLoading;}
function parseHash(){const match=location.hash.match(/^#(home|notes|rig|stage|presets|log|configuration|throw)(?:\/([A-D]))?(?:\/(controls))?$/);return match?{route:match[1],projector:match[2]||null,controls:match[3]==='controls'}:{route:'home'};}
function navigate(route,{projector=null,controls=false,updateHash=true}={}){if(!ROUTES[route])return;currentRoute=route;if(/^[A-D]$/.test(projector||''))selectedProjector=projector;const spec=ROUTES[route],privateRig=route==='rig'&&controls;for(const panel of PANELS)panel.hidden=panel!==(privateRig?relayPanel:spec.panel);for(const button of document.querySelectorAll('[data-route]')){if(button.closest('nav')){if(button.dataset.route===route)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}}if(updateHash){const hash='#'+route+(route==='rig'&&selectedProjector?'/'+selectedProjector:'')+(privateRig?'/controls':'');if(location.hash!==hash)history.pushState(null,'',hash);}document.querySelector('.skip').href=route==='home'?'#home-title':route==='notes'?'#notes':route==='rig'&&!privateRig?'#projector-info-title':route==='throw'?'#throw-title':'#relay-view-title';
 if(route==='rig'&&!privateRig){ensureReference().then(view=>{if(selectedProjector)view.selectProjector(selectedProjector);}).catch(()=>{});}
 if(spec.child||privateRig){relayView=privateRig?'rig':spec.child;relayProjector=privateRig?selectedProjector:null;document.querySelector('#relay-view-title').textContent=privateRig?(selectedProjector?'Projector '+selectedProjector+' controls':'My Projector Rig controls'):spec.heading;document.querySelector('#relay-view-note').textContent=privateRig?'Live status and controls stay on the private relay. Opening this view does not send a projector command.':spec.note;document.querySelector('#back-reference').hidden=!privateRig;sendChildView();}
 if(route==='throw'){const frame=document.querySelector('#throw-frame');if(!frame.getAttribute('src'))frame.src='https://avbydave.com/ProjectorThrow/';}
}
async function connectRelay(url,label){const target=new URL(url);if(!['http:','https:'].includes(target.protocol)||target.username||target.password)throw Error('Invalid controller address');relayOrigin=target.origin;relayReady=false;relayFrame.hidden=true;clearTimeout(relayTimer);relayStatus.textContent='Requesting access to '+label+'…';document.querySelector('#workspace-connection').textContent='Private controller connecting';
 try{const response=await fetch(new URL('/api/health',target),{cache:'no-store',targetAddressSpace:target.hostname==='localhost'?'loopback':'local',signal:AbortSignal.timeout(12000)});const health=await response.json();if(!response.ok||health.service!=='projctl'||health.ok!==true)throw Error('Relay health unavailable');}
 catch{relayStatus.textContent='Could not connect. Start Projctl on this Mac and allow this website’s local-network access in browser site settings, then try again. Private controls are not connected.';document.querySelector('#workspace-connection').textContent='Private controller not connected';return;}
 relayStatus.textContent='Loading the private controller…';relayFrame.hidden=false;target.searchParams.set('workspaceEmbed','1');relayFrame.src=target.href;relayTimer=setTimeout(()=>{if(!relayReady){relayStatus.textContent='Connection not confirmed. The browser may block the embedded controller. The local workspace remains available.';document.querySelector('#workspace-connection').textContent='Private controller not connected';}},12000);}
relayFrame.addEventListener('load',()=>{if(relayOrigin)relayFrame.contentWindow.postMessage({type:'wst:hello'},relayOrigin);});
window.addEventListener('message',event=>{if(event.source!==relayFrame.contentWindow||event.origin!==relayOrigin||event.data?.type!=='projctl:ready')return;if(event.data.relayConnected!==true){relayReady=false;relayStatus.textContent='Controller page loaded; relay is reconnecting.';document.querySelector('#workspace-connection').textContent='Private relay reconnecting';return;}relayReady=true;clearTimeout(relayTimer);const word='Private controller connected · '+(new URL(relayOrigin).hostname==='localhost'?'this Mac':new URL(relayOrigin).hostname);relayStatus.textContent=word;document.querySelector('#workspace-connection').textContent=word;sendChildView();});
for(const button of document.querySelectorAll('[data-route]'))button.onclick=()=>navigate(button.dataset.route);
for(const button of document.querySelectorAll('[data-reference-view]'))button.onclick=()=>{ensureReference().then(view=>view.setView(button.dataset.referenceView)).catch(()=>{});for(const peer of document.querySelectorAll('[data-reference-view]'))peer.setAttribute('aria-pressed',String(peer===button));};
document.querySelector('#rig-controls').onclick=()=>navigate('rig',{projector:selectedProjector,controls:true});document.querySelector('#back-reference').onclick=()=>navigate('rig',{projector:selectedProjector});
document.querySelector('#connect-mac').onclick=()=>connectRelay('http://localhost:8080/','this Mac');
(async()=>{try{const response=await fetch(new URL('workspace-config.json',import.meta.url),{cache:'no-store'});const cfg=await response.json();if(cfg.control?.verified&&cfg.control.url){const button=document.querySelector('#connect-venue');button.hidden=false;button.onclick=()=>connectRelay(cfg.control.url,cfg.control.label||'theatre controller');}}catch{/* Keep explicit connection options. */}})();
window.addEventListener('hashchange',()=>navigate(parseHash().route,{...parseHash(),updateHash:false}));
const embed=new URL(location.href).searchParams.get('embed');if(embed==='notes'||embed==='info'){document.body.classList.add('embedded-workspace');navigate(embed==='info'?'rig':'notes',{updateHash:false});}else navigate(parseHash().route,{...parseHash(),updateHash:false});
window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='workspace:theme'&&['light','dark'].includes(event.data.theme))showTheme(event.data.theme);});
document.querySelector('#workspace-host').textContent=LOCAL_CONTROLLER?'Controller workspace':'Website workspace';
