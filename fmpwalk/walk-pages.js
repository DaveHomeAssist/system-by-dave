/* View-only pagination. Original controls, event handlers and persisted data stay canonical. */
(function(){
'use strict';
const $=id=>document.getElementById(id), main=$('main-content');
const memories=new Map(), pagers=new Map(), seenAlerts=new Map();let scheduled=0, busy=false;
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
function topic(title,nodes){const e=element('div','flow-topic');e.dataset.title=title;for(const n of nodes)if(n)e.append(n);return e;}
function wrapRange(root,groups){
 const children=[...root.children];root.replaceChildren();
 for(const [title,from,to] of groups){const nodes=children.slice(from,to);if(nodes.length)root.append(topic(title,nodes));}
}
function prepareStatic(){
 const setup=$('p-setup'),c=[...setup.children];
 const first=c.findIndex(e=>e.querySelector('#fDate')), zone=c.findIndex(e=>e.querySelector('#secChips')), theme=c.findIndex(e=>e.querySelector('#themeChips'));
 const saved=c.slice(0,first), details=c.slice(first,zone-1), areas=c.slice(zone-1,theme-1), display=c.slice(theme-1,theme+1), start=c.slice(theme+1);
 setup.replaceChildren(topic('Show details',details),topic('Areas to check',areas),topic('Saved walk and recovery',saved),topic('Display mode',display),topic('Begin or resume',start));
 const ref=$('p-ref');let group=null;for(const node of [...ref.children]){if(/^H[23]$/.test(node.tagName)){group=topic(node.textContent,[]);ref.insertBefore(group,node);}group.append(node);}
 const firstRef=ref.querySelector('.flow-topic');if(firstRef&&firstRef.children.length===1&&firstRef.querySelector('h2')){firstRef.nextElementSibling.prepend(...firstRef.childNodes);firstRef.remove();}
 const dated=$('walkContext');ref.append(topic('Dated reference',[dated]));
 const faults=$('knownFaults'),gallery=$('fieldGallery');ref.append(topic('Known faults',[faults]),topic('Reference photos',[gallery]));
}
function preparePanel(panel){
 if(panel.id==='p-walk'){
  const body=$('walkBody');if(body.querySelector(':scope > .flow-topic'))return;
  const card=body.querySelector(':scope > .card');if(!card){body.replaceChildren(topic('Walk',[...body.childNodes]));return;}
  const nodes=[...card.children], intro=[], checks=[], readings=[], notes=[], result=[];
  for(const n of nodes){if(n.matches('.visual-checklist'))checks.push(n);else if(n.matches('.rd,.mini'))readings.push(n);else if(n.matches('.notefld'))notes.push(n);else if(n.matches('.pf,.stepnav'))result.push(n);else intro.push(n);}
  const resume=body.querySelector('.resume');body.replaceChildren();if(resume)body.append(topic('Unfinished fault',[resume]));
  for(const [title,list] of [['Position details',intro],['Visual checks',checks],['Readings',readings],['Note',notes],['Result and next position',result]])if(list.length)body.append(topic(title,list));
 }else if(panel.id==='p-tk'&&!panel.querySelector(':scope > .flow-topic'))panel.replaceChildren(topic('Fault tickets',[...panel.children]));
 else if(panel.id==='p-rep'&&!panel.querySelector(':scope > .flow-topic')){
  const groups=[];let g;
  for(const n of [...panel.children]){
   let title=n.matches('#reportPreview')?'Report preview':n.querySelector('#btnCopy')?'Downloads':n.querySelector('#restoreTitle')?'Restore backup':n.querySelector('#photosTitle')?'Photos':n.querySelector('#emailTitle')?'Gmail draft':n.querySelector('#notionTitle')?'Personal Notion record':n.matches('h3')?'Clear observations':null;
   if(title||!g){g=topic(title||'Report overview',[]);groups.push(g);}g.append(n);
  }if(groups.length>1&&groups[0].dataset.title==='Report overview'){groups[1].prepend(...groups[0].childNodes);groups.shift();}panel.replaceChildren(...groups);const downloads=groups.find(g=>g.dataset.title==='Downloads');if(downloads)downloads.append($('exportStatus'));
 }
}
function visibleByApp(el){return !el.hidden&&!el.classList.contains('hide')&&!el.matches('input[type=hidden],.sr-only,script,style')&&getComputedStyle(el).display!=='none';}
function clearMasks(root){root.querySelectorAll('.flow-off,.flow-empty').forEach(e=>e.classList.remove('flow-off','flow-empty'));}
function mask(root,units,shown){
 shown=shown.slice();for(const u of [...shown]){const table=u.closest('table');if(table&&!table.closest('.report-table')){const header=table.querySelector('tr:has(th)');if(header&&units.includes(header)&&!shown.includes(header))shown.push(header);}}
 for(const u of units)u.classList.toggle('flow-off',!shown.includes(u));
 const parents=new Set();for(const u of units)for(let p=u.parentElement;p&&p!==root;p=p.parentElement)parents.add(p);
 for(const p of parents)p.classList.toggle('flow-empty',!shown.some(u=>p.contains(u)));
}
function atoms(root){
 const out=[];
 function visit(e){
  if(!visibleByApp(e))return;
  if(e.matches('.fld,.notefld,.note-pages,.card-hd,.spec,.zone-chip,.photo-card,.field-gallery>button,.known-fault,label,button,input,select,textarea,p,.note,.mini,.empty,.resume,h1,h2,h3,h4,legend,tr,.flow-text-piece')||!e.children.length){out.push(e);return;}
  for(const ch of e.children)visit(ch);
 }
 for(const ch of root.children)visit(ch);return out;
}
function refine(e){
 if(e.matches('button,input,select,textarea,img,.note-pages'))return null;
 // Split only reading text; its original order and characters survive in the DOM.
 if(!e.querySelector('button,input,select,textarea,img')&&e.textContent.length>70){
  const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
  for(const t of texts){if(!t.textContent.trim()||t.parentElement.closest('.flow-text-piece'))continue;const chunks=t.textContent.match(/[\s\S]{1,63}(?:\s|$)|[\s\S]{1,64}/g)||[];const f=document.createDocumentFragment();for(const s of chunks){const span=element('span','flow-text-piece',s);f.append(span);}t.replaceWith(f);}
  const pieces=[...e.querySelectorAll('.flow-text-piece')].filter(piece=>!piece.querySelector('.flow-text-piece'));return pieces.length?pieces:null;
 }
 if(e.matches('.flow-text-piece'))return null;
 for(const n of [...e.childNodes])if(n.nodeType===Node.TEXT_NODE&&n.textContent.trim()){const span=element('span','flow-text-piece',n.textContent);n.replaceWith(span);}
 const children=[...e.children].filter(visibleByApp);return children.length?children:null;
}
function labelRows(root){for(const table of root.querySelectorAll('.report-table table')){const heads=[...table.querySelectorAll('th')].map(x=>x.textContent);for(const row of table.querySelectorAll('tr'))[...row.querySelectorAll('td')].forEach((td,i)=>td.dataset.column=heads[i]||'');}}
function fit(root){return root.scrollHeight<=root.clientHeight+1&&root.scrollWidth<=root.clientWidth+1;}
function paginate(root){
 clearMasks(root);labelRows(root);let units=atoms(root);if(!units.length)return [[]];
 let pages=[],page=[];mask(root,units,[]);
 for(let i=0;i<units.length;i++){
  const u=units[i];mask(root,units,page.concat(u));
  if(fit(root)){page.push(u);continue;}
  if(page.length){pages.push(page);page=[];i--;continue;}
  const smaller=refine(u);
  if(smaller){u.classList.remove('flow-off');units.splice(i,1,...smaller);i--;continue;}
  // Oversize controls are a visible failure, never silently discarded.
  page.push(u);root.dataset.layoutIssue=u.id||u.tagName;
 }
 if(page.length)pages.push(page);return pages.length?pages:[[]];
}
function makePager(host,roots,getTitle){
 const footer=element('div','flow-pager'),back=element('button','', 'Back'),status=element('output'),next=element('button','', 'Next');
 back.type=next.type='button';footer.append(back,status,next);host.append(footer);
 const state={host,roots,footer,back,next,status,index:0,page:0,pages:[],units:[],cache:new WeakMap(),getTitle};
 state.show=function(index,page,focus=false){
  const all=state.roots();if(!all.length)return;state.index=Math.max(0,Math.min(index,all.length-1));
  for(const [i,r]of all.entries()){r.hidden=i!==state.index;if(i!==state.index)clearMasks(r);}
  const root=all[state.index];delete root.dataset.layoutIssue;
  state.pages=state.cache.get(root)||paginate(root);state.cache.set(root,state.pages);state.units=state.pages.flat();state.page=Math.max(0,Math.min(page,state.pages.length-1));mask(root,state.units,state.pages[state.page]);
  status.textContent=`${state.page+1} / ${state.pages.length}`;status.setAttribute('aria-label',`${root.dataset.title||getTitle()} — page ${state.page+1} of ${state.pages.length}`);
  back.disabled=state.index===0&&state.page===0;next.disabled=state.index===all.length-1&&state.page===state.pages.length-1;
  back.setAttribute('aria-label','Previous page');next.setAttribute('aria-label','Next page');
  refreshNotes(root);state.onchange?.();if(focus){root.tabIndex=-1;root.focus({preventScroll:true});}
  observer.takeRecords();
 };
 back.onclick=()=>{if(state.page)state.show(state.index,state.page-1,true);else{state.show(state.index-1,9999,true);}};
 next.onclick=()=>{if(state.page+1<state.pages.length)state.show(state.index,state.page+1,true);else state.show(state.index+1,0,true);};
 return state;
}
const toolbar=element('div','flow-toolbar'),taskLabel=element('label'),taskSelect=element('select');taskSelect.id='walkTask';taskSelect.setAttribute('aria-label','Choose task');taskLabel.append(document.createTextNode('Task'),taskSelect);toolbar.append(taskLabel);main.prepend(toolbar);
const positionLabel=element('label'),position=element('select');position.id='stationPicker';position.setAttribute('aria-label','Jump to position');positionLabel.append(document.createTextNode('Position'),position);toolbar.prepend(positionLabel);
position.onchange=()=>{if(window.__grab)window.__grab();S.idx=Number(position.value);go('walk');};
prepareStatic();
const workspace=makePager(main,()=>[...document.querySelectorAll('.panel.on .flow-topic')],()=>S.tab);
workspace.onchange=()=>{taskSelect.value=String(workspace.index);memories.set(S.tab+(S.tab==='walk'?':'+S.idx:''),[workspace.index,workspace.page]);};
taskSelect.onchange=()=>workspace.show(Number(taskSelect.value),0,true);
function noteEditor(original){
 if(original.dataset.paged)return;original.dataset.paged='true';original.hidden=true;
 const wrapper=element('div','note-pages'),editor=element('textarea'),tools=element('div','note-page-tools'),prev=element('button','','Previous text'),count=element('output'),next=element('button','','Next text');
 editor.id=original.id+'Editor';editor.setAttribute('aria-label',original.labels?.[0]?.textContent||'Notes');editor.placeholder=original.placeholder;prev.type=next.type='button';tools.append(prev,count,next);wrapper.append(editor,tools);original.after(wrapper);
 let chunks=[''],index=0,writing=false,lastValue=null,lastSize='';
 function split(text){const list=[];let start=0;while(start<text.length){let lo=1,hi=Math.min(text.length-start,2000),best=1;while(lo<=hi){const mid=(lo+hi)>>1;editor.value=text.slice(start,start+mid);if(editor.scrollHeight<=editor.clientHeight+1){best=mid;lo=mid+1;}else hi=mid-1;}editor.value=text.slice(start,start+best);while(best>1&&editor.scrollHeight>editor.clientHeight){best--;editor.value=text.slice(start,start+best);}list.push(text.slice(start,start+best));start+=best;}return list.length?list:[''];}
 function paint(){editor.value=chunks[index]||'';editor.scrollTop=0;count.textContent=`Text ${index+1} / ${chunks.length}`;prev.disabled=index===0;next.disabled=index===chunks.length-1;}
 function refresh(){if(!wrapper.getClientRects().length)return;const size=editor.clientWidth+':'+editor.clientHeight;if(lastValue===original.value&&lastSize===size)return;const focused=document.activeElement===editor,offset=chunks.slice(0,index).join('').length+(focused?editor.selectionStart:0);chunks=split(original.value);let n=0;index=0;while(index<chunks.length-1&&n+chunks[index].length<offset)n+=chunks[index++].length;paint();if(focused)editor.setSelectionRange(offset-n,offset-n);lastValue=original.value;lastSize=size;}
 editor.addEventListener('compositionend',()=>editor.dispatchEvent(new Event('input')));
 editor.addEventListener('input',event=>{if(event.isComposing)return;const before=chunks.slice(0,index).join(''),after=chunks.slice(index+1).join(''),cursor=before.length+editor.selectionStart;original.value=before+editor.value+after;writing=true;original.dispatchEvent(new Event('input',{bubbles:true}));writing=false;chunks=split(original.value);let offset=0;index=0;while(index<chunks.length-1&&offset+chunks[index].length<cursor)offset+=chunks[index++].length;paint();lastValue=original.value;lastSize=editor.clientWidth+':'+editor.clientHeight;editor.setSelectionRange(cursor-offset,cursor-offset);});
 editor.addEventListener('blur',()=>original.dispatchEvent(new Event('blur')));
 original.addEventListener('input',()=>{if(!writing)refresh();});
 prev.onclick=()=>{index--;paint();editor.focus({preventScroll:true});};next.onclick=()=>{index++;paint();editor.focus({preventScroll:true});};
 wrapper._refresh=refresh;
 wrapper._cursor=()=>({offset:chunks.slice(0,index).join('').length+editor.selectionStart,length:editor.selectionEnd-editor.selectionStart});
 wrapper._restoreCursor=({offset,length})=>{chunks=split(original.value);let start=0;index=0;while(index<chunks.length-1&&start+chunks[index].length<offset)start+=chunks[index++].length;paint();editor.setSelectionRange(offset-start,Math.min(chunks[index].length,offset-start+length));lastValue=original.value;lastSize=editor.clientWidth+':'+editor.clientHeight;};
 refresh();
}
function prepareNotes(root){root.querySelectorAll('textarea:not([data-paged]):not(.note-pages textarea)').forEach(noteEditor);}
function refreshNotes(root){root.querySelectorAll('.note-pages').forEach(n=>n._refresh?.());}
function prepareSheet(){
 const sheet=$('sheet');if(!sheet.classList.contains('on'))return;
 const body=$('shBody'),fresh=!body.querySelector('.flow-topic');if(fresh)body.replaceChildren(topic('Fault details',[...body.children]));
 prepareNotes(body);let pager=pagers.get(sheet);if(!pager){pager=makePager(sheet,()=>[...body.querySelectorAll(':scope > .flow-topic')],()=> 'Fault details');pagers.set(sheet,pager);}
 pager.show(0,fresh?0:pager.page);refreshNotes(body);
}
function prepareDialogs(){
 for(const dialog of document.querySelectorAll('dialog[open]')){
  let pager=pagers.get(dialog);
  if(!pager){dialog.classList.add('flow-dialog');const nodes=[...dialog.children],heading=nodes.shift(),actions=nodes.pop(),body=element('div','dialog-pages');body.append(topic('Details',nodes));dialog.replaceChildren(heading,body);pager=makePager(dialog,()=>[...body.children],()=> 'Details');if(actions)dialog.append(actions);pagers.set(dialog,pager);}
  pager.show(0,pager.page);
 }
}
function update(){
 scheduled=0;if(busy)return;busy=true;
 const active=document.activeElement,editing=active?.matches('input,select,textarea'),textPages=active?.closest('.note-pages'),cursor=textPages?._cursor?.();
 try{
  const vv=window.visualViewport;document.documentElement.toggleAttribute('data-short-viewport',(vv?.height||innerHeight)<=540);document.documentElement.style.setProperty('--walk-height',(vv?.height||innerHeight)+'px');document.documentElement.style.setProperty('--walk-top',(vv?.offsetTop||0)+'px');
  workspace.cache=new WeakMap();for(const [host,pager]of pagers){if(!host.isConnected)pagers.delete(host);else pager.cache=new WeakMap();}
  const panel=document.querySelector('.panel.on');if(!panel)return;preparePanel(panel);prepareNotes(panel);
  const key=S.tab+(S.tab==='walk'?':'+S.idx:''),remembered=memories.get(key)||[0,0],roots=workspace.roots();
  taskSelect.replaceChildren(...roots.map((r,i)=>new Option(r.dataset.title,String(i))));taskLabel.firstChild.textContent=({setup:'Setup',walk:'Walk',tk:'Faults',rep:'Report',ref:'Reference'})[S.tab];
  positionLabel.hidden=S.tab!=='walk';if(S.tab==='walk'){position.replaceChildren(...stations().map((s,i)=>new Option(`${i+1} · ${s.name}`,String(i))));const route=stations();position.append(new Option(route.length&&route.every(s=>S.res[s.id]?.status)?'Walk complete':'End of route',String(route.length)));position.value=String(S.idx);}
  workspace.show(...remembered);refreshNotes(panel);prepareSheet();prepareDialogs();
  if(editing&&active.isConnected){
   const host=active.closest('dialog[open],#sheet.on'),pager=host?pagers.get(host):workspace;
   const all=pager?.roots()||[],index=all.findIndex(root=>root.contains(active));
   if(index>=0){pager.show(index,0);const page=pager.pages.findIndex(items=>items.some(unit=>unit===active||unit.contains(active)));pager.show(index,Math.max(0,page));active.focus({preventScroll:true});if(cursor)textPages._restoreCursor(cursor);}
  }
  // Bring new errors into view; pagination must never conceal recovery or export failures.
  for(const id of ['recoveryNotice','exportStatus','emailStatus','restoreStatus']){
   const el=$(id),text=el?.textContent||'',before=seenAlerts.get(id);seenAlerts.set(id,text);
   const critical=id==='recoveryNotice'&&!el.hidden||id==='exportStatus'&&el.classList.contains('crit');
   if(text&&text!==before&&(critical||before!==undefined)&&!el.hidden&&!el.classList.contains('hide')){
    const owner=el.closest('.panel');if(owner&&!owner.classList.contains('on')){if(!critical)continue;go(owner.id.slice(2));preparePanel(owner);}
    const all=workspace.roots(),index=all.findIndex(r=>r.contains(el));if(index>=0){taskSelect.replaceChildren(...all.map((r,i)=>new Option(r.dataset.title,String(i))));workspace.show(index,0);const page=workspace.pages.findIndex(items=>items.some(u=>u===el||u.contains(el)||el.contains(u)));workspace.show(index,Math.max(0,page));}
   }
  }
 }finally{busy=false;observer.takeRecords();}
}
function schedule(){if(!scheduled)scheduled=requestAnimationFrame(update);}
const observer=new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.flow-toolbar,.flow-pager,.note-page-tools')))schedule();});
observer.observe(main,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden']});observer.observe($('sheet'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});observer.observe(document.body,{childList:true});
window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
function reveal(el){
 if(!el)return false;update();let owner=el.closest('dialog[open],#sheet.on');const pager=owner?pagers.get(owner):workspace;if(!pager)return false;
 const roots=pager.roots(),i=roots.findIndex(r=>r.contains(el));if(i<0)return false;pager.show(i,0);const page=pager.pages.findIndex(p=>p.some(u=>u===el||u.contains(el)||el.contains(u)));pager.show(i,Math.max(0,page));refreshNotes(roots[i]);return true;
}
window.FMPWalkPages={refresh:update,reveal};
window.addEventListener('fmp-walk-change',schedule);
update();
})();
