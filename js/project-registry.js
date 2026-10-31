(function(){
  'use strict';
  var data=window.SBD_PROJECT_REGISTRY;
  // The generated static list stays available if enhancement data is unavailable.
  if(!data||!Array.isArray(data.projects))return;
  var projects=data.projects,rows=document.getElementById('registry-rows'),directory=document.querySelector('.directory');
  var tabs=Array.from(document.querySelectorAll('[role="tab"]'));
  var fields={search:document.getElementById('registry-search'),status:document.getElementById('registry-status'),category:document.getElementById('registry-category'),sort:document.getElementById('registry-sort')};
  var scrollKey='sbd.publicRegistry.scroll.v1';
  function selectTab(tab){tabs.forEach(function(item){var selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!selected;});}
  tabs.forEach(function(tab,i){tab.addEventListener('click',function(){selectTab(tab);});tab.addEventListener('keydown',function(e){var n=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;if(n===null)return;e.preventDefault();selectTab(tabs[n]);tabs[n].focus();});});
  function cell(row,value,tag){var el=document.createElement(tag||'td');el.textContent=value;row.appendChild(el);return el;}
  function render(){
    var query=fields.search.value.trim().toLowerCase();
    var items=projects.filter(function(p){return(!query||[p.name,p.fullName,p.purpose,p.category,p.stack.join(' ')].join(' ').toLowerCase().includes(query))&&(fields.status.value==='all'||p.status===fields.status.value)&&(fields.category.value==='all'||p.category===fields.category.value);});
    items.sort(function(a,b){var mode=fields.sort.value;var primary=mode==='name'?0:mode==='category'?a.category.localeCompare(b.category):mode==='activity'?b.recentCommits90d-a.recentCommits90d:(Date.parse(b.lastRemoteUpdate)||0)-(Date.parse(a.lastRemoteUpdate)||0);return primary||a.name.localeCompare(b.name);});
    var fragment=document.createDocumentFragment();
    items.forEach(function(p){var row=document.createElement('tr'),first=cell(row,'');var link=document.createElement('a');link.href=p.github;link.target='_blank';link.rel='noopener noreferrer';link.textContent=p.name;first.appendChild(link);cell(first,p.defaultBranch||'No default branch','small');cell(row,p.category);cell(row,p.purpose);cell(row,p.stack.join(', ')||'No languages reported');cell(row,p.archived?'Archived':'Unarchived');var activity=cell(row,p.lastRemoteUpdate?p.lastRemoteUpdate.slice(0,10):'Unknown push date');cell(activity,p.recentCommits90d+' commits / 90d','small');fragment.appendChild(row);});
    if(!items.length){var row=document.createElement('tr');var empty=cell(row,'No public repositories match these filters.');empty.colSpan=6;fragment.appendChild(row);}
    rows.replaceChildren(fragment);directory.scrollTop=0;
    document.getElementById('registry-count').textContent=items.length+' of '+projects.length+' repositories';
    document.getElementById('filter-count').textContent=items.length+' matching repositories';
  }
  Array.from(new Set(projects.map(function(p){return p.category;}))).sort().forEach(function(category){var option=document.createElement('option');option.value=category;option.textContent=category;fields.category.appendChild(option);});
  Object.values(fields).forEach(function(field){field.addEventListener('input',render);field.addEventListener('change',render);});
  document.getElementById('registry-filters').addEventListener('submit',function(e){e.preventDefault();selectTab(tabs[0]);});
  document.getElementById('registry-filters').addEventListener('reset',function(){fields.search.value='';setTimeout(render,0);});
  document.getElementById('show-results').addEventListener('click',function(){selectTab(tabs[0]);directory.focus();});
  document.getElementById('registry-summary').textContent=projects.length+' repositories, '+data.registry.counts.archived+' archived. Snapshot '+data.registry.generatedAt.slice(0,10)+'.';
  document.body.classList.add('enhanced');document.getElementById('registry-tabs').hidden=false;document.querySelector('.search').hidden=false;
  render();
  try{var top=Number(sessionStorage.getItem(scrollKey));if(Number.isFinite(top)&&top>0)directory.scrollTop=top;}catch(_){}
  window.addEventListener('pagehide',function(){try{sessionStorage.setItem(scrollKey,String(directory.scrollTop));}catch(_){}});
}());
