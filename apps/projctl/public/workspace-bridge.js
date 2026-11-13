import { panelNavigation } from './workspace-navigation.js';
const trustedParents=new Set(['https://wst.housevideo.app','https://wst-frozen.davein4k.chatgpt.site']);
const frames=[...document.querySelectorAll('[data-workspace]')];
function loadPanel(name){const frame=frames.find(f=>f.dataset.workspace===name);if(frame&&!frame.getAttribute('src'))frame.src=`workspace/index.html?embed=${name}`;}
function themeFrames(){for(const frame of frames){if(frame.contentWindow)frame.contentWindow.postMessage({type:'workspace:theme',theme:document.documentElement.dataset.theme},location.origin);}}
for(const frame of frames)frame.addEventListener('load',themeFrames);
new MutationObserver(themeFrames).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
for(const name of ['notes','info'])document.querySelector(`#tab-btn-${name}`)?.addEventListener('click',()=>loadPanel(name));
let parentOrigin=null,lastReport='',reporting=false;
async function report(){if(!parentOrigin||parent===window||reporting)return;reporting=true;let healthy=false;try{const r=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(4000)});const body=await r.json();healthy=r.ok&&body.ok===true&&document.querySelector('#conn-word')?.textContent==='Relay connected';}catch{}finally{reporting=false;}
 const body={type:'projctl:ready',relayConnected:healthy,views:['rig','stage','presets','log','setup','throw'],projectorSelection:true};const key=JSON.stringify(body);if(key!==lastReport){parent.postMessage(body,parentOrigin);lastReport=key;}}
window.addEventListener('message',event=>{if(event.source!==parent||!trustedParents.has(event.origin)||parent===window)return;const data=event.data;if(data?.type==='wst:hello'){parentOrigin=event.origin;lastReport='';report();}else{const detail=panelNavigation(data);if(detail)window.dispatchEvent(new CustomEvent('projctl:navigate',{detail}));}});
window.addEventListener('load',()=>{const embedded=parent!==window&&new URL(location.href).searchParams.get('workspaceEmbed')==='1';if(embedded){document.body.classList.add('pj-embedded-control');document.querySelector('#tab-btn-rig')?.click();setInterval(report,1000);}else{document.querySelector('#tab-btn-rig')?.click();}});

for(const button of document.querySelectorAll('[data-local-target]'))button.addEventListener('click',()=>document.querySelector('#tab-btn-'+button.dataset.localTarget)?.click());
