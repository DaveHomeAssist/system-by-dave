/* Show Board retains its own show, timeline, conflict and snapshot model. */
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
 'use strict';
 const root=document.documentElement, app=document.getElementById('app'), setup=document.getElementById('setup');
 const theme=document.getElementById('viewportTheme');
 const themeLabel=()=>{theme.textContent=root.dataset.avTheme==='dark'?'Light':'Dark';theme.setAttribute('aria-label',`Switch to ${theme.textContent.toLowerCase()} mode`);};
 themeLabel();theme.onclick=()=>{root.dataset.avTheme=root.dataset.avTheme==='dark'?'light':'dark';try{localStorage.setItem('av-theme-mode.v1',root.dataset.avTheme);}catch(_){}themeLabel();};
 const skip=document.querySelector('.sbd-skip-link');document.querySelector('.av-board-header').prepend(skip);skip.dataset.web2Ignore='Offscreen skip link becomes visible on keyboard focus';
 function long(node,label){if(!node)return;node.dataset.web2Scroll='';node.tabIndex=0;node.setAttribute('role','region');node.setAttribute('aria-label',label);node.classList.add('av-long');}
 const panels=[],pagers=[];
 const scrollPositions=new Map();
 function remember(){document.querySelectorAll('.av-long').forEach(n=>{if(n.checkVisibility())scrollPositions.set(n,{top:n.scrollTop,left:n.scrollLeft});});}
 function restore(){scrollPositions.forEach((p,n)=>{if(n.checkVisibility()){n.scrollTop=p.top;n.scrollLeft=p.left;}});}
 document.addEventListener('scroll',remember,true);
 document.querySelectorAll('textarea').forEach(n=>{n.dataset.web2Scroll='';if(!n.hasAttribute('aria-label'))n.setAttribute('aria-label',n.closest('.field')?.querySelector('label')?.textContent || 'Notes');});
 function units(node){
  if(node.matches('[type=file],.av-pages,.av-print-text'))return [];
  if(node.matches('.av-long,.field,.chk,h1,h2,h3,p,button,a,input,select,textarea,.note,.lede,.footnote,.sub,.clock,.err,.hint,span'))return [node];
  node.classList.add('av-flow');return [...node.children].flatMap(units);
 }
 function paginate(node,label){
  const items=document.createElement('div');items.className='av-items';items.append(...node.childNodes);node.append(items);node.classList.add('av-board-view');
  return AVViewport.paginate(node,items,{label,units:()=>[...items.children].flatMap(units),beforeMeasure:h=>items.querySelectorAll('.av-long').forEach(n=>n.style.height=`${h}px`)});
 }
 function panel(id,name,nodes){const node=document.createElement('section');node.id=id;node.append(...nodes.filter(Boolean));app.append(node);panels.push({node,name});pagers.push(paginate(node,name));}
 long(app.querySelector('.scroller'),'Room timeline');long(document.getElementById('live'),'Live rooms');long(document.getElementById('next'),'Next actions');long(document.getElementById('attentiongrid'),'Current issues');long(document.getElementById('turns'),'Turn stack');long(document.getElementById('s_preview'),'Room preview');
 const labels=[...app.querySelectorAll(':scope > .section-label')];
 panel('timelineView','Timeline',[app.querySelector('.scroller')]);
 panel('liveView','Live / Next',[app.querySelector('.now')]);
 panel('issuesView','Issues',[app.querySelector('.attention')]);
 panel('turnsView','Turns',[document.getElementById('turns')]);
 panel('controlsView','Controls',[app.querySelector('.masthead'),document.getElementById('daytabs'),...labels,app.querySelector('.board-foot'),app.querySelector('.footnote')]);
 panel('recoveryView','Recovery',[document.getElementById('datahealth')]);
 const context=document.querySelector('[data-sbd-suite-dock]');
 if(context){context.querySelector('input')?.setAttribute('aria-label','Show readiness note');panel('contextView','Show context',[context]);}
 const sessionList=document.createElement('div');sessionList.id='sessionList';long(sessionList,'Sessions with full timing and status');
 panel('sessionsView','Sessions',[sessionList]);
 function sessionLabels(){
  sessionList.replaceChildren(...[...document.querySelectorAll('#rows .blk')].map((block,index)=>{
   const button=document.createElement('button');button.type='button';button.textContent=block.getAttribute('aria-label');button.id=`sessionLabel${index}`;
   if(block.hasAttribute('aria-pressed'))button.setAttribute('aria-pressed',block.getAttribute('aria-pressed'));
   button.addEventListener('click',()=>block.click());
   block.setAttribute('aria-describedby',button.id);block.dataset.web2Ignore='Time-scaled timeline graphic; complete timing and status are visible in the Sessions list and its accessible label';
   return button;
  }));
  if(!sessionList.children.length){const empty=document.createElement('p');empty.textContent='No sessions yet. Use Controls to edit rooms or paste sign text.';sessionList.append(empty);}
 }
 sessionLabels();new MutationObserver(sessionLabels).observe(document.getElementById('rows'),{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed','aria-label']});
 const nav=document.createElement('nav');nav.className='av-task-nav';app.prepend(nav);
 const setupPager=paginate(setup,'New show');
 root.dataset.avViewport='ready';
 const wide=matchMedia('(min-width:2200px)');
 const navigation=AVViewport.tabs(nav,panels,{label:'Show Board',onTarget:(target,index)=>{if(index>=0)pagers[index].reveal(target);else if(setup.contains(target))setupPager.reveal(target);},additionalVisible:(i,active)=>wide.matches&&active===0&&i===1,beforeChange:remember,onChange:i=>{pagers[i].refresh();if(wide.matches&&i===0)pagers[1].refresh();restore();}});navigation.fromLocation();wide.addEventListener('change',navigation.refresh);
 function placeContext(){if(!context)return;const target=document.body.classList.contains('setup')?setup.querySelector('.av-items'):document.querySelector('#contextView .av-items');if(context.parentElement!==target)target.append(context);}
 placeContext();
 new MutationObserver(()=>{placeContext();setupPager.refresh();navigation.refresh();skip.href=document.body.classList.contains('setup')?'#setup':'#app';}).observe(document.body,{attributes:true,attributeFilter:['class']});
 const recovery=document.getElementById('keepminebtn');
 new MutationObserver(()=>{if(!recovery.hidden){navigation.activate(5);pagers[5].reveal(recovery);}}).observe(recovery,{attributes:true,attributeFilter:['hidden']});
 const err=document.getElementById('s_err');new MutationObserver(()=>{if(err.classList.contains('show'))setupPager.reveal(err);}).observe(err,{childList:true});
 const sheet=document.getElementById('sheet');let sheetPager;
 new MutationObserver(()=>{
  if(sheet.querySelector(':scope > .av-items'))return;
  for(const id of ['gearlist','isslist','zlist','slist','snapshotlist'])long(sheet.querySelector('#'+id),id==='snapshotlist'?'Saved snapshots':'Show records');
  sheet.querySelectorAll('textarea').forEach(n=>{n.dataset.web2Scroll='';if(!n.hasAttribute('aria-label'))n.setAttribute('aria-label',n.closest('.field')?.querySelector('label')?.textContent || 'Notes');});
  sheetPager?.destroy();sheetPager=paginate(sheet,'Dialog');sheetPager.refresh();
  requestAnimationFrame(()=>[...sheet.querySelectorAll('input,select,textarea,button')].find(n=>!n.disabled&&n.checkVisibility())?.focus({preventScroll:true}));
 }).observe(sheet,{childList:true});
 let lastDialogError='';
 new MutationObserver(()=>{const error=sheet.querySelector('#err.show');const message=error?.textContent || '';if(message&&message!==lastDialogError){lastDialogError=message;sheetPager?.reveal(error);}else lastDialogError=message;}).observe(sheet,{childList:true,subtree:true,characterData:true});
 sheet.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const focusable=[...sheet.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(n=>!n.disabled&&n.tabIndex>=0&&n.checkVisibility());
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 // Existing labels predate their input ids. Associate them without changing fields.
 function labelsFor(parent){parent.querySelectorAll('.field').forEach(field=>{const label=field.querySelector('label'),input=field.querySelector('input,select,textarea');if(label&&input?.id)label.htmlFor=input.id;});}
 labelsFor(document);new MutationObserver(()=>labelsFor(sheet)).observe(sheet,{childList:true,subtree:true});
},0));
