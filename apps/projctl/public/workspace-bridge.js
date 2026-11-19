import { panelNavigation } from './workspace-navigation.js';
const trustedParents=new Set(['https://wst.housevideo.app','https://wst-frozen.davein4k.chatgpt.site']);
const frames=[...document.querySelectorAll('[data-workspace]')];
function loadPanel(name){const frame=frames.find(f=>f.dataset.workspace===name);if(frame&&!frame.getAttribute('src'))frame.src=`workspace/index.html?embed=${name}`;}
function themeFrames(){for(const frame of frames){if(frame.contentWindow)frame.contentWindow.postMessage({type:'workspace:theme',theme:document.documentElement.dataset.theme,mode:window.FrozenTheme?.mode},location.origin);}}
for(const frame of frames)frame.addEventListener('load',themeFrames);
new MutationObserver(themeFrames).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-theme-preference']});
for(const name of ['notes','info'])document.querySelector(`#tab-btn-${name}`)?.addEventListener('click',()=>loadPanel(name));
let parentOrigin=null,lastReport='',reporting=false;
async function report(){if(!parentOrigin||parent===window||reporting)return;reporting=true;let healthy=false;try{const r=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(4000)});const body=await r.json();healthy=r.ok&&body.ok===true&&document.querySelector('#conn-word')?.textContent==='Relay connected';}catch{}finally{reporting=false;}
 const body={type:'projctl:ready',relayConnected:healthy,views:['rig','all','stage','presets','log','setup','throw'],projectorSelection:true};const key=JSON.stringify(body);if(key!==lastReport){parent.postMessage(body,parentOrigin);lastReport=key;}}
// Project only the four-lane freshness summary and Show Lock to an opted-in parent.
async function reportBoothState() {
 if (!parentOrigin || parent === window) return;
 const target = parentOrigin;
 try {
  const response = await fetch('/api/state', {cache:'no-store', signal:AbortSignal.timeout(4000)});
  if (!response.ok) return;
  const state = await response.json();
  if (target !== parentOrigin || state.simulation !== false || typeof state.lock !== 'boolean' || !Array.isArray(state.projectors)) return;
  const times = state.projectors.map(p => p.status?.connection?.state === 'online' ? Date.parse(p.status.connection.lastSuccessAt) : NaN);
  const observedAt = times.length === 4 && times.every(Number.isFinite) ? Math.min(...times) : null;
  parent.postMessage({type:'projctl:telemetry', lock:state.lock, lockAt:Date.now(), observedAt},target);
 } catch { /* The parent expires its last reading. */ }
}
window.addEventListener('message',event=>{if(event.source!==parent||!trustedParents.has(event.origin)||parent===window)return;const data=event.data;if(data?.type==='wst:theme'&&['light','dark','system'].includes(data.mode)){window.FrozenTheme.set(data.mode,{save:false});}else if(data?.type==='wst:hello'){parentOrigin=event.origin;lastReport='';report();}else{const detail=panelNavigation(data);if(detail)window.dispatchEvent(new CustomEvent('projctl:navigate',{detail}));}});
window.addEventListener('load',()=>{const embedded=parent!==window&&new URL(location.href).searchParams.get('workspaceEmbed')==='1';if(embedded){document.body.classList.add('pj-embedded-control');document.querySelector('#tab-btn-rig')?.click();setInterval(report,5000);setInterval(reportBoothState,5000);}else{document.querySelector('#tab-btn-rig')?.click();}});

for(const button of document.querySelectorAll('[data-local-target]'))button.addEventListener('click',()=>document.querySelector('#tab-btn-'+button.dataset.localTarget)?.click());

// Local reference frames can request an existing view, never dispatch a device action.
window.addEventListener('message', event => {
 if (event.origin !== location.origin || !frames.some(frame => frame.contentWindow === event.source)) return;
 const detail = panelNavigation(event.data);
 if (detail) window.dispatchEvent(new CustomEvent('projctl:navigate', { detail }));
});
