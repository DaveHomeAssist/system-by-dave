/* Cue Sheet layout only: media nodes stay mounted and the cue engine owns state. */
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
 'use strict';
 const root=document.documentElement,app=document.querySelector('.app'),main=app.querySelector('main'),header=app.querySelector('.topbar');
 const oldLinks=header.querySelector('.top-actions'),slot=document.querySelector('[data-sbd-nav-slot]');
 const heading=document.createElement('h1');heading.textContent='Cue Sheet';
 const theme=document.createElement('button');theme.id='viewportTheme';theme.type='button';
 function themeLabel(){theme.textContent=root.dataset.avTheme==='dark'?'Light':'Dark';theme.setAttribute('aria-label',`Switch to ${theme.textContent.toLowerCase()} mode`);}
 theme.addEventListener('click',()=>{root.dataset.avTheme=root.dataset.avTheme==='dark'?'light':'dark';try{localStorage.setItem('av-theme-mode.v1',root.dataset.avTheme);}catch(_){}themeLabel();});themeLabel();
 header.className='av-header';header.replaceChildren(heading,slot,theme);document.querySelector('body>h1')?.remove();
 const nav=document.createElement('nav');nav.className='av-task-nav';nav.setAttribute('aria-label','Cue Sheet tasks');
 const panels=[],pagers=[];
 function panel(id,name,nodes,long=false){const node=document.createElement('section');node.id=id;node.className='av-view'+(long?' av-records-view':'');const items=document.createElement('div');items.className='av-items';items.append(...nodes.filter(Boolean));node.append(items);main.append(node);panels.push({node,name});return {node,items};}
 const hero=main.querySelector('.hero-panel'),toolbar=main.querySelector('.toolbar'),workbench=main.querySelector('.workbench'),quick=main.querySelector('.quick-add-panel'),rack=main.querySelector('.source-rack');
 const preview=main.querySelector('.preview-monitor'),program=main.querySelector('.program-monitor'),transport=main.querySelector('.transport');
 const stats=main.querySelector('.side-panel'),layers=main.querySelector('#layerList').closest('.side-panel'),next=main.querySelector('.next-cue'),shortcuts=main.querySelector('.shortcut-list').closest('.side-panel');
 const caller=main.querySelector('.caller-deck-panel'),actions=next.querySelector('.side-actions');
 const setup=panel('setupView','Setup',[hero]);
 const edit=panel('editView','Edit',[workbench],true);
 const operate=panel('operateView','Operate',[]);operate.node.classList.add('av-cue-operate');
 const live=document.createElement('div');live.className='av-cue-live';
 const current=document.createElement('section');current.className='av-cue-current';current.setAttribute('aria-label','Current program cues');
 const currentLabel=document.createElement('strong');currentLabel.textContent='Current';const currentText=document.createElement('div');currentText.id='viewportCurrent';currentText.dataset.web2Scroll='';currentText.tabIndex=0;currentText.setAttribute('role','region');currentText.setAttribute('aria-label','Current program cue details');current.append(currentLabel,currentText);
 const nextCard=next.querySelector('.next-card');nextCard.classList.add('av-cue-next');nextCard.dataset.web2Scroll='';nextCard.tabIndex=0;nextCard.setAttribute('role','region');nextCard.setAttribute('aria-label','Next cue details');
 const liveControls=document.createElement('div');liveControls.className='av-cue-live-controls';liveControls.append(document.getElementById('goLiveBtn'),document.getElementById('takeNextBtn'));
 const nextGroup=document.createElement("section");nextGroup.className="av-cue-current";const nextLabel=document.createElement("strong");nextLabel.textContent="Next";nextGroup.append(nextLabel,nextCard);
 live.append(current,nextGroup);operate.items.append(live,liveControls);
 const pending=[setup,edit,operate,
  panel('editToolsView','Edit tools',[toolbar]),panel('addView','Quick add',[quick]),
  panel('previewView','Preview',[preview],true),panel('programView','Program',[program],true),
  panel('transportView','Playback',[transport,document.getElementById('programBusStatus'),document.getElementById('selectedReadout'),actions,document.getElementById('hint')]),
  panel('connectionsView','Connections',[rack]),panel('layersView','Layers',[layers],true),
  panel('callerView','On deck',[caller],true),panel('statusView','Status',[stats,shortcuts,oldLinks])];
 const context=document.querySelector('[data-sbd-suite-dock]');if(context){context.querySelector('input')?.setAttribute('aria-label','Show readiness note');pending.push(panel('contextView','Show context',[context]));}
 main.querySelector('.operator-stage')?.remove();main.querySelector('.shell')?.remove();
 // Only lists, freeform notes and full cue details scroll; controls use field pages.
 const longSelectors='.table-wrap,#callerDeck,#layerList';
 main.querySelectorAll(longSelectors).forEach(n=>{n.dataset.web2Scroll='';n.tabIndex=0;n.setAttribute('role','region');n.setAttribute('aria-label',n.id==='layerList'?'Playback layers':n.id==='callerDeck'?'Cue caller records':'Cue rundown records');});
 function units(node){
  if(node.matches('[type=file],.av-print-text,.sr-only'))return [];
  if(node.matches('.table-wrap,#callerDeck,#layerList,.monitor,.stat,.quick-add-btn,.next-card,.volume-control,label,button,a,input,select,textarea,h2,h3,p,legend,.hint,.status-chip,.bus-state,span,.av-shortcut'))return [node];
  if(node.matches('dl'))for(const dt of [...node.querySelectorAll(':scope>dt')]){const row=document.createElement('div');row.className='av-shortcut';const dd=dt.nextElementSibling;node.insertBefore(row,dt);row.append(dt);if(dd?.tagName==='DD')row.append(dd);}
  if(!node.children.length)return [node];node.classList.add('av-flow');if(node.tagName==='DIV'&&node.hasAttribute('aria-label')&&!node.hasAttribute('role'))node.setAttribute('role','group');return [...node.children].flatMap(units);
 }
 pending.forEach(({node,items},index)=>{if(node===operate.node)return; pagers[index]=AVViewport.paginate(node,items,{label:panels[index].name,units:()=>[...items.children].flatMap(units),beforeMeasure:height=>{items.querySelectorAll(longSelectors+',.monitor').forEach(n=>n.style.height=`${height}px`);}});});
 const wide=matchMedia('(min-width:2200px)');let scrolls=new Map();
 const navigation=AVViewport.tabs(nav,panels,{label:'Cue Sheet',beforeChange:()=>{main.querySelectorAll('[data-web2-scroll]').forEach(n=>{if(n.checkVisibility())scrolls.set(n,[n.scrollLeft,n.scrollTop]);});},onChange:index=>{pagers[index]?.refresh();if(wide.matches&&index===2){pagers[5].refresh();pagers[6].refresh();}scrolls.forEach(([x,y],n)=>{if(n.checkVisibility())n.scrollTo(x,y);});},additionalVisible:(index,active)=>wide.matches&&active===2&&(index===5||index===6),onTarget:(target,index)=>pagers[index]?.reveal(target)});
 root.dataset.avViewport='ready';main.prepend(nav);wide.addEventListener('change',navigation.refresh);navigation.fromLocation();
 function updateCurrent(){document.querySelectorAll('.monitor-slate,.monitor-label').forEach(n=>{n.dataset.web2Scroll='';n.tabIndex=0;n.setAttribute('role','region');const bus=n.closest('#previewSurface')?'Preview':n.closest('.program-layer')?'Program layer '+n.closest('.program-layer').dataset.layer:'Program';n.setAttribute('aria-label',bus+(n.classList.contains('monitor-slate')?' source text':' cue identification'));});const labels=[...document.querySelectorAll('#programSurface .monitor-label')].map(n=>n.textContent.trim());currentText.textContent=labels.join('\n')||document.getElementById('programBusStatus').textContent;}
 new MutationObserver(updateCurrent).observe(document.getElementById('programSurface'),{childList:true,subtree:true,characterData:true});new MutationObserver(updateCurrent).observe(document.getElementById('previewSurface'),{childList:true,subtree:true,characterData:true});updateCurrent();
 // Keep the existing F/Expand shortcut and saved timeline preference meaningful.
 let expanded=document.body.classList.contains('timeline-expanded');if(expanded)navigation.activate(1);
 new MutationObserver(()=>{const value=document.body.classList.contains('timeline-expanded');if(value!==expanded){expanded=value;navigation.activate(value?1:2,true);}}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.getElementById('addCueBtn').addEventListener('click',()=>navigation.activate(1,true));quick.addEventListener('click',event=>{if(event.target.closest('[data-quick-add]'))navigation.activate(1,true);});
 let lastError='';for(const id of ['hint','sourceStatus']){const feedback=document.getElementById(id);new MutationObserver(()=>{const error=feedback.classList.contains('error')?feedback.textContent:'';if(!error||error===lastError){lastError=error;return;}lastError=error;const i=panels.findIndex(p=>p.node.contains(feedback));navigation.activate(i);pagers[i]?.reveal(feedback);}).observe(feedback,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});}
 document.querySelectorAll('.sr-only,.skip-link').forEach(n=>n.dataset.web2Ignore='Accessible label or focus-revealed skip link is intentionally visually hidden');
 const phone=matchMedia('(max-width:680px)');function headers(){document.querySelectorAll('.table-wrap thead,.table-wrap thead *').forEach(n=>{if(phone.matches)n.dataset.web2Ignore='Responsive table header is visually hidden; each record cell displays its corresponding label';else delete n.dataset.web2Ignore;});}phone.addEventListener('change',headers);headers();
 const measure=document.createElement('canvas').getContext('2d');
 function fields(){main.querySelectorAll('textarea').forEach(n=>{n.dataset.web2Scroll='';});main.querySelectorAll('.table-wrap input').forEach(n=>{const s=getComputedStyle(n);measure.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;n.style.setProperty('min-width',`${Math.ceil(measure.measureText(n.value||n.placeholder).width+48)}px`,'important');});}
 new MutationObserver(fields).observe(document.getElementById('cueBody'),{childList:true,subtree:true});main.addEventListener('input',fields);document.fonts.ready.then(fields);fields();
},0));
