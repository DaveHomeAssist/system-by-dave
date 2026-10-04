/* Read-only exception views retain each logistics application's own validation. */
window.AVWorksheetExtraViews = ({ main, panel, pending }) => {
 const label=document.createElement('p');label.textContent='All exceptions, including records outside the current filters. Opening a record clears filters and shows its details.';
 const list=document.createElement('div');list.className='av-exception-list';list.dataset.web2Scroll='';list.tabIndex=0;list.setAttribute('role','region');list.setAttribute('aria-label','Missing, blocked and incomplete records');
 pending.push(panel('exceptionsView','Exceptions',[label,list],true));
 let signature='';
 function render(){
  const records=window.AVLogisticsExceptions();const next=JSON.stringify(records);if(next===signature)return;signature=next;
  const fragment=document.createDocumentFragment();
  for(const record of records){const article=document.createElement('article'),button=document.createElement('button');button.type='button';button.textContent=`Open ${record.item||record.contents||record.cable||record.caseId||'record'}`;button.dataset.recordId=record.id;
   const details=document.createElement('dl');for(const [key,value]of Object.entries(record)){if(key==='id'||value==null||value==='')continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key.replace(/([A-Z])/g,' $1');dd.textContent=String(value);details.append(dt,dd);}article.append(button,details);fragment.append(article);
  }
  if(!records.length){const empty=document.createElement('p');empty.textContent='No exceptions in this document.';fragment.append(empty);}list.replaceChildren(fragment);
 }
 list.addEventListener('click',event=>{const button=event.target.closest('button[data-record-id]');if(!button)return;const id=button.dataset.recordId;
  const search=document.getElementById('searchInput');search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));
  for(const select of main.querySelectorAll('.toolbar select')){select.value='all';select.dispatchEvent(new Event('change',{bubbles:true}));}
  const row=main.querySelector(`tr[data-id="${CSS.escape(id)}"]`);row?.click();
  const url=new URL(location.href);url.searchParams.set('taskView','selectedView');history.pushState(null,'',url);dispatchEvent(new PopStateEvent('popstate'));
 });
 // Original input handlers update the model synchronously; schedule its projection afterward.
 let scheduled=0;function schedule(){if(!scheduled)scheduled=requestAnimationFrame(()=>{scheduled=0;render();});}
 main.addEventListener('input',schedule);main.addEventListener('change',schedule);main.addEventListener('click',schedule);document.addEventListener('keydown',schedule);
 new MutationObserver(schedule).observe(document.getElementById('itemBody'),{childList:true,subtree:true});render();
};
