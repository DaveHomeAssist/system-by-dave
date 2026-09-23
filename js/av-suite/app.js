import { setModalBackgroundInert } from './modal-controller.js';

const avSuiteRoot=document.getElementById('avApp');
if(avSuiteRoot&&window.__avResolveInitialTheme){avSuiteRoot.setAttribute('data-theme',window.__avResolveInitialTheme().theme);}

(function(){
'use strict';
/* ============================================================
   CONSTANTS + REGISTRY DATA
   ============================================================ */
var STORAGE_KEY='av-suite-dashboard.v1';
var UI_KEY='av-suite-ui.v1';
var THEME_KEY='av-theme-mode.v1';
var REG=window.SBD_REGISTRY||{};
var AV_CACHE_NAME='sbd-av-suite-'+(REG.version||'v-fallback');
var PHASES=REG.phases||[];
var TOOLS=REG.tools||[];
var RECOMMENDED=REG.recommended||{};
var TOOL_ID_ALIASES=REG.idAliases||{};
var FAMILIES=(REG.consoleFamilies||[]).filter(function(f){return f.toolIds&&f.toolIds.length;});
var TOOL_STORAGE_KEYS=TOOLS.reduce(function(list,tool){(tool.storageKeys||[]).forEach(function(entry){list.push({tool:tool.id,label:entry.label,key:entry.key});});return list;},[]);
var SENSITIVE_PACKAGE_KEYS={'PixelForge.ai.v1':true};
var OFFLINE_ASSETS=REG.offlineAssets?REG.offlineAssets():[];
var READINESS_VALUES=['pending','ready','issue','skipped'];
var READINESS_LABELS={pending:'Pending',ready:'Ready',issue:'Issue',skipped:'Skipped'};
var ISSUE_TERMS=['issue','problem','blocker','blocked','risk','missing','fail','failed','open item','open question','conflict','not ready','not tested','backup missing','gap'];
var SHOW_CONTEXT_PARAMS=['sbdShow','sbdVenue','sbdDate','sbdOperator','sbdPhase'];
var TOOLBOX_FILTERS=['all','featured','pinned','recent'];
var TOOLBOX_FEATURED=TOOLS.filter(function(tool){return tool.toolboxFeatured===true;});
var $=function(id){return document.getElementById(id);};

/* ============================================================
   CORE SUITE STATE — byte-compatible with the previous console and
   with js/av-suite-context.js's writes on the other 40+ tool pages.
   Schema: system-by-dave.av-suite.v1 under localStorage[av-suite-dashboard.v1]
   ============================================================ */
function defaultState(){return {showName:'',venue:'',showDate:new Date().toISOString().slice(0,10),operator:'',phase:'show',favorites:['teleprompter','show-timer','cue-sheet'],recent:[],readiness:{},toolNotes:{},commandRecent:[],filters:{search:'',phase:'all',dept:'all',pin:'all'}};}
var state=defaultState();

function storageAvailable(){try{var key='av-suite-probe';localStorage.setItem(key,key);localStorage.removeItem(key);return true;}catch(e){return false;}}
function normalizeToolId(id){id=String(id||'');return REG.normalizeToolId?REG.normalizeToolId(id):(TOOL_ID_ALIASES[id]||id);}
function toolById(id){id=normalizeToolId(id);return TOOLS.find(function(t){return t.id===id;})||null;}
function phaseExists(id){return id==='all'||PHASES.some(function(p){return p.id===id;});}
function departments(){var map={};TOOLS.forEach(function(t){map[t.dept]=true;});return Object.keys(map).sort();}
function deptExists(name){return name==='all'||departments().indexOf(name)>=0;}
function familyById(id){return FAMILIES.find(function(f){return f.id===id;})||null;}
function familyExists(id){return FAMILIES.some(function(f){return f.id===id;});}
function familyForTool(id){return FAMILIES.find(function(f){return f.toolIds.indexOf(id)>=0;})||null;}
function familyTools(fam){return (fam?fam.toolIds:[]).map(toolById).filter(Boolean);}
function titleCase(value){return String(value||'').replace(/-/g,' ').replace(/\b\w/g,function(l){return l.toUpperCase();});}
function phaseLabel(id){var p=PHASES.find(function(x){return x.id===id;});return p?p.label:titleCase(id);}

function cleanFilters(filters){filters=filters&&typeof filters==='object'?filters:{};return {search:String(filters.search||''),phase:phaseExists(filters.phase)?filters.phase:'all',dept:deptExists(filters.dept)?filters.dept:'all',pin:['all','pinned','recent','ready','issues','skipped','notes','saved'].indexOf(filters.pin)>=0?filters.pin:'all'};}
function cleanIds(ids){var seen={};return Array.isArray(ids)?ids.map(function(id){var tool=toolById(id);return tool?tool.id:'';}).filter(function(id){if(!id||seen[id]) return false;seen[id]=true;return true;}):[];}
function commandIdAllowed(id){var value=String(id||'');var viewValues=['all','pinned','recent','ready','issues','skipped','notes','saved'];var actionValues=['action:openRecommended','action:copyPhaseGate','action:copyPhaseHandoff','action:copySuiteLink','action:copyLaunchList','action:copyReviewQueue','action:scanSavedData','action:markRecommendedReady','action:showIssues','action:showNotes','action:pinRecommended','action:exportSuite','action:exportPackage','action:cacheAvTools','action:refreshOfflineCache','action:clearOfflineCache','action:toggleHelp','action:openOnboarding','action:toggleCitations','action:cycleBrand','action:toggleMode','action:openSettings','action:viewAll','action:showShop','action:showToolbox','action:showOffice','action:showShow','action:openDoorway','action:toolboxAll','action:toolboxFeatured','action:toolboxPinned','action:toolboxRecent'];if(value.indexOf('tool:')===0) return Boolean(toolById(value.slice(5)));if(value.indexOf('phase:')===0) return phaseExists(value.slice(6))&&value.slice(6)!=='all';if(value.indexOf('family:')===0) return familyExists(value.slice(7));if(value.indexOf('view:')===0) return viewValues.indexOf(value.slice(5))>=0;return actionValues.indexOf(value)>=0;}
function normalizeCommandId(id){id=String(id||'').slice(0,80);if(id.indexOf('tool:')===0){var tool=toolById(id.slice(5));if(tool) return 'tool:'+tool.id;}return id;}
function cleanCommandRecent(ids){var seen={};return Array.isArray(ids)?ids.map(normalizeCommandId).filter(function(id){if(!id||seen[id]||!commandIdAllowed(id)) return false;seen[id]=true;return true;}).slice(0,10):[];}
function cleanReadiness(map){var next={};if(!map||typeof map!=='object') return next;Object.keys(map).forEach(function(id){var tool=toolById(id);var value=String(map[id]||'pending');if(tool&&READINESS_VALUES.indexOf(value)>=0&&value!=='pending') next[tool.id]=value;});return next;}
function cleanNote(value){return String(value||'').replace(/\s+/g,' ').trim().slice(0,240);}
function cleanNotes(map){var next={};if(!map||typeof map!=='object') return next;Object.keys(map).forEach(function(id){var tool=toolById(id);var value=cleanNote(map[id]);if(tool&&value) next[tool.id]=value;});return next;}

function suitePayload(){return {schema:'system-by-dave.av-suite.v1',savedAt:new Date().toISOString(),showName:state.showName,venue:state.venue,showDate:state.showDate,operator:state.operator,phase:state.phase,favorites:state.favorites,recent:state.recent,readiness:state.readiness,toolNotes:state.toolNotes,commandRecent:state.commandRecent,filters:state.filters};}
function saveState(){if(!storageAvailable()) return false;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(suitePayload()));return true;}catch(e){showHint('Suite preferences could not be saved in this browser.','error');return false;}}
function applySuitePayload(parsed){if(!parsed||typeof parsed!=='object') throw new Error('Invalid payload');var savedName=String(parsed.showName||'').trim();state.showName=(savedName==='AV by Dave'?'':savedName).slice(0,120);state.venue=String(parsed.venue||'').slice(0,120);state.showDate=String(parsed.showDate||state.showDate).slice(0,20);state.operator=String(parsed.operator||'').slice(0,80);state.phase=phaseExists(parsed.phase)?parsed.phase:state.phase;state.favorites=cleanIds(parsed.favorites).slice(0,60);state.recent=cleanIds(parsed.recent).slice(0,12);state.readiness=cleanReadiness(parsed.readiness);state.toolNotes=cleanNotes(parsed.toolNotes);state.commandRecent=cleanCommandRecent(parsed.commandRecent);state.filters=cleanFilters(parsed.filters);}
function loadState(){if(!storageAvailable()) return;try{var raw=localStorage.getItem(STORAGE_KEY);if(!raw) return;applySuitePayload(JSON.parse(raw));}catch(e){}}
function applyUrlContext(){var params=new URLSearchParams(window.location.search);var changed=false;function cleanParam(name,limit){return String(params.get(name)||'').replace(/\s+/g,' ').trim().slice(0,limit);}function assign(key,name,limit){var value=cleanParam(name,limit);if(name==='sbdShow'&&value==='AV by Dave') return;if(value&&state[key]!==value){state[key]=value;changed=true;}}assign('showName','sbdShow',120);assign('venue','sbdVenue',120);assign('showDate','sbdDate',20);assign('operator','sbdOperator',80);var phase=cleanParam('sbdPhase',30);if(phase&&phaseExists(phase)&&phase!=='all'&&state.phase!==phase){state.phase=phase;state.filters.phase=phase;changed=true;}if(changed) saveState();}

function toolReadiness(id){return state.readiness[id]||'pending';}
function toolNote(id){return state.toolNotes[id]||'';}
function readinessLabel(value){return READINESS_LABELS[value]||READINESS_LABELS.pending;}
function readinessOptions(selected){return READINESS_VALUES.map(function(v){return '<option value="'+v+'"'+(v===selected?' selected':'')+'>'+READINESS_LABELS[v]+'</option>';}).join('');}
function readinessCounts(){var counts={pending:0,ready:0,issue:0,skipped:0};TOOLS.forEach(function(t){counts[toolReadiness(t.id)]++;});return counts;}
function savedEntriesForTool(id){var entries=[];if(!storageAvailable()) return entries;TOOL_STORAGE_KEYS.forEach(function(item){var value=localStorage.getItem(item.key);if(item.tool===id&&value!==null&&String(value).trim()){entries.push({label:item.label,key:item.key,value:String(value)});}});return entries;}
function savedToolCount(){return TOOLS.filter(function(t){return savedEntriesForTool(t.id).length>0;}).length;}
function readableStorageText(value){var raw=String(value||'');var parts=[];function walk(item){if(parts.length>120||item==null) return;if(typeof item==='string'||typeof item==='number'||typeof item==='boolean'){parts.push(String(item));return;}if(Array.isArray(item)){item.forEach(walk);return;}if(typeof item==='object'){Object.keys(item).forEach(function(key){walk(item[key]);});}}try{walk(JSON.parse(raw));}catch(e){return raw;}return parts.join(' ');}
function issueSnippet(value){var compact=readableStorageText(value).replace(/\s+/g,' ').trim();var lower=compact.toLowerCase();var hitIndex=-1;ISSUE_TERMS.some(function(term){var index=lower.indexOf(term);if(index>=0&&(hitIndex<0||index<hitIndex)){hitIndex=index;return true;}return false;});if(hitIndex<0) return '';return compact.slice(Math.max(0,hitIndex-36),hitIndex+96);}
function savedToolIssue(entries){var snippet='';entries.some(function(e){snippet=issueSnippet(e.value);return Boolean(snippet);});return snippet;}
function recommendedTools(){return (RECOMMENDED[state.phase]||[]).map(toolById).filter(Boolean);}

/* ============================================================
   UI-ONLY PREFERENCES — localStorage[av-suite-ui.v1], merge-patch,
   page-local (no other tool page reads this key). `density` is the
   pre-existing field; brand/mode/help/showCitations/onboardingSeen plus
   the isolated Toolbox pins, recents, filters, family, command recents,
   and preferred doorway all remain in this page-local key.
   ============================================================ */
function readUi(){try{return JSON.parse(localStorage.getItem(UI_KEY)||'{}')||{};}catch(e){return {};}}
function writeUi(patch){try{var cur=readUi();Object.keys(patch).forEach(function(k){cur[k]=patch[k];});localStorage.setItem(UI_KEY,JSON.stringify(cur));}catch(e){}}
function systemPrefersDark(){return Boolean(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);}
function readThemeMode(){var mode='light';try{var stored=localStorage.getItem(THEME_KEY);if(stored==='dark'||stored==='light'||stored==='system') mode=stored;}catch(e){}return mode;}

var ui=readUi();
var initialTheme=(window.__avResolveInitialTheme?window.__avResolveInitialTheme():{brand:'sbd',mode:'light',theme:'paper'});
var uiState={
  density:ui.density==='compact'?'compact':'comfortable',
  brand:initialTheme.brand,
  mode:initialTheme.mode,
  help:Boolean(ui.help),
  showCitations:ui.showCitations!==false,
  onboardingSeen:Boolean(ui.onboardingSeen),
  preferredEntry:ui.preferredEntry==='show'||ui.preferredEntry==='toolbox'?ui.preferredEntry:''
};
var toolboxState={
  pinned:cleanIds(ui.toolboxPinned).slice(0,60),
  recent:cleanIds(ui.toolboxRecent).slice(0,12),
  search:String(ui.toolboxSearch||'').slice(0,120),
  filter:TOOLBOX_FILTERS.indexOf(ui.toolboxFilter)>=0?ui.toolboxFilter:'all',
  family:familyExists(ui.toolboxFamily)?ui.toolboxFamily:'all',
  commandRecent:cleanCommandRecent(ui.toolboxCommandRecent)
};
var entryState={mode:null,chooserOpen:false,lastFocus:null};
var commandState={open:false,query:'',activeIndex:0,items:[],lastFocus:null};
var offlineState={supported:false,online:navigator.onLine!==false,worker:'Checking',cache:'Checking',cached:0,total:OFFLINE_ASSETS.length,message:'Checking offline cache.',busy:false};
var viewState={context:'show',view:'family',fam:null,openFams:{},openSubs:{}};
var obState={step:0,lastFocus:null};
var toastTimer=null;
var toastUndo=null;

function saveToolboxState(){writeUi({toolboxPinned:toolboxState.pinned,toolboxRecent:toolboxState.recent,toolboxSearch:toolboxState.search,toolboxFilter:toolboxState.filter,toolboxFamily:toolboxState.family,toolboxCommandRecent:toolboxState.commandRecent});}
function activePins(){return entryState.mode==='toolbox'?toolboxState.pinned:state.favorites;}
function activeRecents(){return entryState.mode==='toolbox'?toolboxState.recent:state.recent;}

/* ============================================================
   SMALL UTILITIES
   ============================================================ */
function escapeHtml(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function escapeAttr(value){return escapeHtml(value);}
function relativeHref(url){var path=url.pathname.replace(/^\/+/,'');return path+url.search+url.hash;}
function absoluteHref(href){return new URL(href, window.location.href).href;}
function toolHref(tool){var url=new URL(tool.href,window.location.href);if(entryState.mode==='toolbox'){SHOW_CONTEXT_PARAMS.forEach(function(name){url.searchParams.delete(name);});return relativeHref(url);}if(state.showName) url.searchParams.set('sbdShow',state.showName);if(state.venue) url.searchParams.set('sbdVenue',state.venue);if(state.showDate) url.searchParams.set('sbdDate',state.showDate);if(state.operator) url.searchParams.set('sbdOperator',state.operator);if(state.phase) url.searchParams.set('sbdPhase',state.phase);return relativeHref(url);}
function suiteLinkHref(){var url=new URL('av-suite.html',window.location.href);if(state.showName) url.searchParams.set('sbdShow',state.showName);if(state.venue) url.searchParams.set('sbdVenue',state.venue);if(state.showDate) url.searchParams.set('sbdDate',state.showDate);if(state.operator) url.searchParams.set('sbdOperator',state.operator);if(state.phase) url.searchParams.set('sbdPhase',state.phase);return relativeHref(url);}
function fileStem(){return (state.showName||'av-suite').toLowerCase().replace(/['"]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'av-suite';}
function downloadFile(filename,content,type){var blob=new Blob([content],{type:type});var url=URL.createObjectURL(blob);var link=document.createElement('a');link.href=url;link.download=filename;link.style.display='none';document.body.appendChild(link);link.click();setTimeout(function(){URL.revokeObjectURL(url);if(link.parentNode) link.parentNode.removeChild(link);},0);}
function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(text);return new Promise(function(resolve,reject){var area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.left='-9999px';document.body.appendChild(area);area.select();try{document.execCommand('copy')?resolve():reject(new Error('copy failed'));}catch(e){reject(e);}finally{if(area.parentNode) area.parentNode.removeChild(area);}});}
function signal(element,kind){if(!element) return;var cls=kind==='error'?'feedback-error':'feedback-success';element.style.transition='none';element.style.outline=kind==='error'?'2px solid var(--st-issue)':'2px solid var(--st-ready)';setTimeout(function(){element.style.outline='';},260);}
function iconSvg(paths,size){size=size||16;return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths||[]).map(function(d){return '<path d="'+d+'"/>';}).join('')+'</svg>';}

/* ============================================================
   TOAST — success/error hint with optional Undo (only rendered when
   an undo target actually exists — the mockup's toast always drew an
   Undo button even when nothing was wired to it; fixed here).
   ============================================================ */
function showHint(message,kind,undoFn){clearTimeout(toastTimer);toastUndo=undoFn||null;var toast=$('toast');var msg=$('toastMsg');var undoBtn=$('toastUndoBtn');msg.textContent=message;toast.hidden=false;undoBtn.hidden=!toastUndo;toast.style.borderColor=kind==='error'?'var(--st-issue-line)':'var(--c-neutral-400)';toastTimer=setTimeout(function(){toast.hidden=true;toastUndo=null;},2600);}
$('toastUndoBtn').addEventListener('click',function(){if(toastUndo) toastUndo();$('toast').hidden=true;clearTimeout(toastTimer);toastUndo=null;});

/* ============================================================
   THEME — brand (sbd/industry/dos) x mode (light/dark), plus the
   site-wide av-theme-mode.v1 (dark/light/system) that every AV tool
   page shares for Paper/Stage Slate.
   ============================================================ */
function resolveThemeAttr(brand,mode){if(brand==='dos') return 'dos';if(brand==='industry') return mode==='dark'?'ind-dark':'ind';return mode==='dark'?'slate':'paper';}
function applyThemeMode(mode,persist){
  if(mode!=='dark'&&mode!=='light'&&mode!=='system') mode='dark';
  document.documentElement.setAttribute('data-av-theme',mode);
  var toggle=$('themeToggle');
  if(toggle) Array.prototype.forEach.call(toggle.querySelectorAll('[data-theme-mode]'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-theme-mode')===mode));});
  if(persist){try{localStorage.setItem(THEME_KEY,mode);}catch(e){}}
  if(uiState.brand==='sbd'){
    uiState.mode=mode==='system'?(systemPrefersDark()?'dark':'light'):mode;
    applyShellTheme();
  }
}
function applyShellTheme(){
  var app=$('avApp');
  app.setAttribute('data-theme',resolveThemeAttr(uiState.brand,uiState.mode));
  var cycle=$('brandCycleBtn');
  if(cycle){cycle.querySelector('.lbl').textContent=uiState.brand==='sbd'?'SBD':(uiState.brand==='industry'?'Industry':'DOS');cycle.title=uiState.brand==='sbd'?'Showing production SYSTEM_BY_DAVE tokens — click for Industry':(uiState.brand==='industry'?'Showing the Industry skin — click for Borland DOS':'Borland-style text-mode skin — click to return to SBD');}
  var modeBtn=$('modeToggleBtn');
  if(modeBtn){
    var dos=uiState.brand==='dos';
    modeBtn.disabled=dos;
    modeBtn.title=dos?'Borland DOS has no light/dark split':(uiState.mode==='dark'?'Switch to light':'Switch to dark');
    modeBtn.innerHTML=dos
      ? '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="0"/><path d="M8 21h8M12 17v4"/></svg>'
      : (uiState.mode==='dark'
        ? '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
        : '<svg class="ic" viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/></svg>');
  }
}
function toggleMode(){
  if(uiState.brand==='dos') return;
  var next=uiState.mode==='dark'?'light':'dark';
  uiState.mode=next;
  writeUi({mode:next});
  if(uiState.brand==='sbd') applyThemeMode(next,true);
  applyShellTheme();
}
function cycleBrand(){
  uiState.brand=uiState.brand==='sbd'?'industry':(uiState.brand==='industry'?'dos':'sbd');
  if(uiState.brand==='sbd'){var m=readThemeMode();uiState.mode=m==='system'?(systemPrefersDark()?'dark':'light'):m;}
  writeUi({brand:uiState.brand});
  applyShellTheme();
}

/* ============================================================
   ADDRESSABLE ENTRY MODE — URL authority first, then the isolated
   preferred doorway. Any explicit sbd* show context always wins.
   ============================================================ */
function hasShowContext(params){return SHOW_CONTEXT_PARAMS.some(function(name){return params.has(name);});}
function explicitEntryFromLocation(){var params=new URLSearchParams(window.location.search);if(hasShowContext(params)) return 'show';var entry=params.get('entry');return entry==='show'||entry==='toolbox'||entry==='frontoffice'?entry:'';}
function resolvedEntryFromLocation(){var explicit=explicitEntryFromLocation();if(explicit) return explicit;if(window.history.state&&window.history.state.avEntry==='chooser') return '';return uiState.preferredEntry;}
function entryUrl(mode){var url=new URL(window.location.href);url.searchParams.set('entry',mode);if(mode!=='show') SHOW_CONTEXT_PARAMS.forEach(function(name){url.searchParams.delete(name);});return url.pathname+url.search+url.hash;}
function updateEntryDefaultNote(){var note=$('entryDefaultNote');if(!note) return;note.textContent=uiState.preferredEntry?(uiState.preferredEntry==='toolbox'?'Default doorway: AV Toolbox.':'Default doorway: Show Console.'):'No default doorway selected yet.';}
function openEntryChooser(){entryState.lastFocus=document.activeElement;entryState.chooserOpen=true;updateEntryDefaultNote();$('entryCloseBtn').hidden=!entryState.mode;$('entryChooser').hidden=false;setModalBackgroundInert(true);window.setTimeout(function(){var first=$('entryChooser').querySelector('[data-entry-choice]');if(first) first.focus();},0);}
function closeEntryChooser(restoreFocus){if(!entryState.chooserOpen||!entryState.mode) return;entryState.chooserOpen=false;$('entryChooser').hidden=true;setModalBackgroundInert(false);if(restoreFocus!==false&&entryState.lastFocus&&entryState.lastFocus.focus) entryState.lastFocus.focus();entryState.lastFocus=null;}
function animateWorkspace(){var regions=Array.prototype.filter.call($('avApp').querySelectorAll('[data-workspace-region]'),function(el){return !el.hidden&&getComputedStyle(el).display!=='none';});var reduced=Boolean(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);if(window.gsap&&typeof window.gsap.killTweensOf==='function'){window.gsap.killTweensOf(regions);if(reduced){window.gsap.set(regions,{clearProps:'transform,opacity'});return;}window.gsap.fromTo(regions,{opacity:0,y:12},{opacity:1,y:0,duration:.28,stagger:.04,ease:'power2.out',clearProps:'transform,opacity',overwrite:true});return;}regions.forEach(function(el){el.style.removeProperty('opacity');el.style.removeProperty('transform');});}
function applyEntryMode(mode,options){if(mode!=='show'&&mode!=='toolbox'&&mode!=='frontoffice') return;options=options||{};entryState.mode=mode==='show'?'show':'toolbox';viewState.context=mode==='frontoffice'?'office':(mode==='toolbox'?'shop':'show');$('avApp').setAttribute('data-entry',entryState.mode);if(mode==='show'&&!viewState.fam) viewState.fam=defaultFamilyForPhase();if(mode!=='show'&&!$('onboardOverlay').hidden){$('onboardOverlay').hidden=true;setModalBackgroundInert(false);obState.step=0;}renderAll();animateWorkspace();if(options.focusMain){window.setTimeout(function(){$('main-content').focus();},0);}if(mode==='show'&&options.allowOnboarding&&!uiState.onboardingSeen) window.setTimeout(openOnboarding,0);}
function chooseEntry(mode){uiState.preferredEntry=mode;writeUi({preferredEntry:mode});entryState.chooserOpen=false;$('entryChooser').hidden=true;setModalBackgroundInert(false);window.history.pushState({avEntry:mode},'',entryUrl(mode));applyEntryMode(mode,{focusMain:true,allowOnboarding:true});entryState.lastFocus=null;}
function navigateEntry(mode){if(mode!=='show'&&mode!=='toolbox') return;uiState.preferredEntry=mode;writeUi({preferredEntry:mode});window.history.pushState({avEntry:mode},'',entryUrl(mode));applyEntryMode(mode,{focusMain:true,allowOnboarding:mode==='show'});}
function handleEntryPopstate(){var mode=resolvedEntryFromLocation();if(!mode){openEntryChooser();return;}if(entryState.chooserOpen){entryState.chooserOpen=false;$('entryChooser').hidden=true;setModalBackgroundInert(false);}if(mode==='show') applyUrlContext();applyEntryMode(mode,{focusMain:true,allowOnboarding:false});}

/* ============================================================
   CORE ACTIONS — data model mutations (identical semantics to the
   previous console; still the single source of truth other tool
   pages' context dock reads and writes).
   ============================================================ */
function syncProfile(){
  state.showName=$('pfShowName').value.trim();state.venue=$('pfVenue').value;state.showDate=$('pfDate').value;state.operator=$('pfOperator').value;
  saveState();
  renderRail();renderRecs();renderTilesAndGate();
  if(viewState.view==='family') renderFamView();else renderAllView();
  renderAsideQueue();
}
function setPhase(id){
  if(!phaseExists(id)||id==='all') return;
  state.phase=id;state.filters.phase=id;saveState();
  if(!viewState.fam||viewState.context==='show'){var first=recommendedTools()[0];if(first){var fam=familyForTool(first.id);if(fam) viewState.fam=fam.id;}}
  renderAll();
  showHint('Recommended tools updated for '+phaseLabel(id)+'.');
}
function togglePin(id,announce){
  var pins=activePins();var index=pins.indexOf(id);var tool=toolById(id);if(!tool) return;
  var wasIn=index>=0;
  if(wasIn){pins.splice(index,1);} else {pins.unshift(id);}
  if(entryState.mode==='toolbox') saveToolboxState();else saveState();
  renderRail();renderMainForView();if(entryState.mode==='show') renderTilesAndGate();
  if(announce!==false) showHint(wasIn?tool.name+' unpinned.':tool.name+' pinned.',null,function(){togglePin(id,false);renderAll();});
}
function setToolReadiness(id,value){
  var tool=toolById(id);if(!tool||READINESS_VALUES.indexOf(value)<0) return;
  if(value==='pending') delete state.readiness[id];else state.readiness[id]=value;
  saveState();
  renderMainForView();renderTilesAndGate();renderRail();renderAsideQueue();
  showHint(tool.name+' marked '+readinessLabel(value).toLowerCase()+'.');
}
function setToolNote(id,value,announce){
  var tool=toolById(id);if(!tool) return;var note=cleanNote(value);
  if(note) state.toolNotes[id]=note;else delete state.toolNotes[id];
  saveState();
  if(announce){renderTilesAndGate();renderAsideQueue();showHint(note?tool.name+' note saved.':tool.name+' note cleared.');}
}
function rememberTool(id){if(!toolById(id)) return;if(entryState.mode==='toolbox'){toolboxState.recent=toolboxState.recent.filter(function(i){return i!==id;});toolboxState.recent.unshift(id);toolboxState.recent=toolboxState.recent.slice(0,12);saveToolboxState();return;}state.recent=state.recent.filter(function(i){return i!==id;});state.recent.unshift(id);state.recent=state.recent.slice(0,12);saveState();}
function openTool(id){var tool=toolById(id);if(!tool) return;rememberTool(id);window.location.href=toolHref(tool);}
function launchLine(tool){var note=toolNote(tool.id);var line=tool.name+' ['+readinessLabel(toolReadiness(tool.id))+'] | '+absoluteHref(toolHref(tool));if(note) line+=' | Note: '+note;return line;}

/* ============================================================
   RECOMMENDATION REASON ENGINE — replaces the mockup's hardcoded,
   fabricated per-phase "why"/"source" strings with real, auditable
   text generated from this show's actual readiness/notes/saved data.
   ============================================================ */
function recommendationReason(tool,index){
  var ready=toolReadiness(tool.id);var note=toolNote(tool.id);var saved=savedEntriesForTool(tool.id);
  if(ready==='issue') return {why:note?tool.name+' is marked Issue: '+note:tool.name+' is marked Issue for this show.',source:'Cross-tool · av-suite-dashboard.v1 readiness'};
  if(ready==='skipped') return {why:tool.name+' is marked Skipped for '+phaseLabel(state.phase)+'. Confirm the waiver still holds before moving on.',source:'Cross-tool · av-suite-dashboard.v1 readiness'};
  if(saved.length&&ready==='pending') return {why:tool.name+' has '+saved.length+' saved local '+(saved.length===1?'entry':'entries')+' from a previous session not yet reviewed this show.',source:'Cross-tool · '+saved[0].key};
  if(ready==='pending') return {why:tool.name+' has no readiness mark yet and sits at position '+(index+1)+' of the '+phaseLabel(state.phase)+' recommended set.',source:'Phase rule · recommended['+state.phase+']['+index+']'};
  return {why:tool.name+' is marked Ready. Recheck before the '+phaseLabel(state.phase)+' gate closes out.',source:'Cross-tool · av-suite-dashboard.v1 readiness'};
}

/* ============================================================
   PHASE GATE + REVIEW QUEUE — real, data-driven (unchanged logic
   from the previous console; only the presentation moved).
   ============================================================ */
function phaseGateItems(){return recommendedTools().map(function(tool){return {tool:tool,ready:toolReadiness(tool.id),note:toolNote(tool.id),saved:savedEntriesForTool(tool.id).length};});}
function phaseGateCounts(items){var counts={pending:0,ready:0,issue:0,skipped:0};items.forEach(function(i){counts[i.ready]++;});return counts;}
function phaseGateSummaryText(items,counts){return counts.ready+'/'+items.length+' ready, '+counts.issue+' issue, '+counts.pending+' pending, '+counts.skipped+' skipped';}
function phaseGatePercent(items,counts){return items.length?Math.round(counts.ready/items.length*100):0;}
function reviewAction(label,detail,tool,kind,action){return {label:label,detail:detail,tool:tool,kind:kind||'review',action:action||'open'};}
function reviewQueueItems(){
  var issueTools=TOOLS.filter(function(t){return toolReadiness(t.id)==='issue';});
  var noteTools=TOOLS.filter(function(t){return toolNote(t.id)&&toolReadiness(t.id)!=='issue';});
  var savedTools=TOOLS.filter(function(t){return savedEntriesForTool(t.id).length>0;});
  var recommended=recommendedTools();
  var skippedRecommended=recommended.filter(function(t){return toolReadiness(t.id)==='skipped';});
  var items=[];
  issueTools.forEach(function(t){items.push(reviewAction('Resolve issue: '+t.name,toolNote(t.id)||t.dept+' marked Issue',t,'issue','open'));});
  skippedRecommended.forEach(function(t){items.push(reviewAction('Confirm skipped: '+t.name,toolNote(t.id)||phaseLabel(state.phase)+' phase recommendation is marked Skipped',t,'skip','open'));});
  noteTools.forEach(function(t){items.push(reviewAction('Review note: '+t.name,toolNote(t.id),t,'note','open'));});
  if(savedTools.length&&savedTools.some(function(t){return toolReadiness(t.id)==='pending';})) items.push(reviewAction('Scan saved tool data',savedTools.length+' tools have saved data in this browser',null,'scan','scan'));
  recommended.forEach(function(t){if(toolReadiness(t.id)==='pending'&&!toolNote(t.id)) items.push(reviewAction('Check phase tool: '+t.name,phaseLabel(state.phase)+' phase recommendation is still pending',t,'pending','open'));});
  if(!items.length&&savedTools.length) items.push(reviewAction('Export show package',savedTools.length+' tools have saved data and no active review items',null,'ready','package'));
  if(!items.length) items.push(reviewAction('Open recommended tool',phaseLabel(state.phase)+' phase has no active review items',recommended[0]||null,'ready',recommended[0]?'open':'none'));
  return items.slice(0,6);
}
function handleReviewAction(action){if(action==='scan') scanSavedToolData();else if(action==='package') exportPackage();}

/* ============================================================
   SCAN / MARK-RECOMMENDED-READY / COPY* — ported verbatim
   ============================================================ */
function scanSavedToolData(){
  var scanned=0,ready=0,issue=0,kept=0;
  if(!storageAvailable()){showHint('Browser storage is unavailable, so saved tool data could not be scanned.','error');return;}
  TOOLS.forEach(function(tool){
    var entries=savedEntriesForTool(tool.id);var current=toolReadiness(tool.id);
    if(!entries.length) return;
    scanned++;
    var snippet=savedToolIssue(entries);
    if(snippet){if(current!=='skipped') state.readiness[tool.id]='issue';else kept++;state.toolNotes[tool.id]=cleanNote('Saved data mentions: '+snippet);issue++;return;}
    if(current==='issue'||current==='skipped'){kept++;return;}
    state.readiness[tool.id]='ready';ready++;
  });
  saveState();renderAll();
  showHint(scanned?('Scanned '+scanned+' saved tools. '+ready+' ready, '+issue+' with issue language, '+kept+' existing exceptions kept.'):'No saved AV tool data found to scan.');
}
function markRecommendedReady(){
  var before=Object.assign({},state.readiness);var changed=0;
  recommendedTools().forEach(function(tool){var current=toolReadiness(tool.id);if(current!=='issue'&&current!=='skipped'&&current!=='ready'){state.readiness[tool.id]='ready';changed++;}});
  saveState();renderAll();
  var undo=changed?function(){state.readiness=before;saveState();renderAll();showHint('Recommended readiness restored.');}:null;
  showHint(changed?changed+' recommended tools marked ready. Existing issues and skips kept.':'Recommended tools already ready, marked with issues, or skipped.',null,undo);
}
function pinRecommended(){var ids=recommendedTools().map(function(t){return t.id;});ids.reverse().forEach(function(id){if(state.favorites.indexOf(id)<0) state.favorites.unshift(id);});saveState();renderAll();showHint('Recommended set pinned.');}
function resetReadiness(){if(!window.confirm('Reset readiness for all AV by Dave tools?')) return;state.readiness={};saveState();renderAll();showHint('Suite readiness reset.');}
function markdownCell(value){var text=String(value||'TBD').replace(/\|/g,'/').replace(/\s+/g,' ').trim();return text||'TBD';}
function toolNameList(tools,limit){var max=limit||8;var names=tools.slice(0,max).map(function(t){return t.name;});if(tools.length>max) names.push('plus '+(tools.length-max)+' more');return names.length?names.join(', '):'None';}
function noteLinesFor(tools){var lines=[];tools.forEach(function(t){var n=toolNote(t.id);if(n) lines.push(t.name+': '+n);});return lines;}
function phaseHandoffLines(){
  var counts=readinessCounts();var recommended=recommendedTools();
  var issueTools=TOOLS.filter(function(t){return toolReadiness(t.id)==='issue';});
  var readyTools=TOOLS.filter(function(t){return toolReadiness(t.id)==='ready';});
  var skippedTools=TOOLS.filter(function(t){return toolReadiness(t.id)==='skipped';});
  var noteTools=TOOLS.filter(function(t){return toolNote(t.id);});
  var pendingRecommended=recommended.filter(function(t){return toolReadiness(t.id)==='pending';});
  var signalNotes=noteLinesFor(TOOLS.filter(function(t){return ['Audio','Video','Network','Power','Comms','Show Flow'].indexOf(t.dept)>=0;}));
  var clientCrewNotes=noteLinesFor(TOOLS.filter(function(t){return ['Labor','Client','Closeout'].indexOf(t.dept)>=0;}));
  var reviewItems=reviewQueueItems();var savedCount=savedToolCount();var matrixRows=[];
  var lines=['AV BY DAVE PHASE HANDOFF','','SHOW / PROJECT: '+(state.showName||'Unnamed show'),'CURRENT STATUS: '+phaseLabel(state.phase)+' phase. '+counts.ready+' ready, '+counts.issue+' issue, '+counts.skipped+' skipped, '+counts.pending+' pending.','WHAT IS WORKING: '+(readyTools.length?toolNameList(readyTools,10):'No tools marked Ready yet.'),'WHAT IS NOT WORKING: '+(issueTools.length?toolNameList(issueTools,10):'No tools marked Issue.'),'GEAR / SYSTEMS INVOLVED: Current phase recommendations: '+toolNameList(recommended,10),'SIGNAL FLOW / NETWORK / CONTROL NOTES: '+(signalNotes.length?signalNotes.join(' | '):'No signal, network, or control notes entered in AV by Dave.'),'KEY DECISIONS: Current phase is '+phaseLabel(state.phase)+'. Pinned tools: '+toolNameList(state.favorites.map(toolById).filter(Boolean),10)+'.','CLIENT / CREW NOTES: '+(clientCrewNotes.length?clientCrewNotes.join(' | '):'No client or crew notes entered in AV by Dave.'),'RISKS / GOTCHAS: '+(issueTools.length?toolNameList(issueTools,10)+' marked Issue.':(skippedTools.length?toolNameList(skippedTools,10)+' marked Skipped.':'No active issue tools marked.')),'QUESTIONS STILL OPEN: '+(pendingRecommended.length?toolNameList(pendingRecommended,10)+' still pending for '+phaseLabel(state.phase)+'.':'No pending current phase recommendations.'),'','SUMMARY TABLE','| Item | Status |','| --- | --- |','| Show | '+markdownCell(state.showName)+' |','| Venue | '+markdownCell(state.venue)+' |','| Date | '+markdownCell(state.showDate)+' |','| Operator | '+markdownCell(state.operator)+' |','| Phase | '+markdownCell(phaseLabel(state.phase))+' |','| Suite link | '+markdownCell(absoluteHref(suiteLinkHref()))+' |','| Readiness | '+counts.ready+' ready, '+counts.issue+' issue, '+counts.skipped+' skipped, '+counts.pending+' pending |','| Saved tool data | '+savedCount+' tools |','| Pinned tools | '+state.favorites.length+' tools |'];
  if(issueTools.length) matrixRows.push(['Issue tools','Hold or assign owner',issueTools.length+' tools marked Issue']);
  if(noteTools.length) matrixRows.push(['Readiness notes','Review before handoff',noteTools.length+' tools have notes']);
  if(skippedTools.length) matrixRows.push(['Skipped tools','Confirm waiver',skippedTools.length+' tools marked Skipped']);
  if(savedCount) matrixRows.push(['Saved tool data','Export show package',savedCount+' tools have saved data in this browser']);
  if(pendingRecommended.length) matrixRows.push(['Phase recommendations','Check next',pendingRecommended.length+' current phase tools still pending']);
  if(!matrixRows.length) matrixRows.push(['Current phase','Proceed','No active issue, note, skipped, or pending recommendation found']);
  lines.push('','DECISION MATRIX','| Area | Recommendation | Reason |','| --- | --- | --- |');
  matrixRows.forEach(function(row){lines.push('| '+markdownCell(row[0])+' | '+markdownCell(row[1])+' | '+markdownCell(row[2])+' |');});
  lines.push('','PRIORITIZED ACTIONS');
  reviewItems.forEach(function(item,index){lines.push((index+1)+'. '+item.label+' | '+item.detail+(item.tool?' | '+absoluteHref(toolHref(item.tool)):''));});
  lines.push('','RECOMMENDED LINKS','AV by Dave | '+absoluteHref(suiteLinkHref()));
  recommended.forEach(function(tool){lines.push(launchLine(tool));});
  lines.push('','NEXT ACTIONS: Work the numbered actions above, then refresh readiness and export the show package if another machine needs the data.');
  return lines;
}
function phaseGateLines(){
  var items=phaseGateItems();var counts=phaseGateCounts(items);
  var lines=['AV BY DAVE PHASE GATE','Show: '+state.showName,'Venue: '+state.venue,'Date: '+state.showDate,'Operator: '+state.operator,'Phase: '+phaseLabel(state.phase),'Gate: '+phaseGateSummaryText(items,counts),'Suite link: '+absoluteHref(suiteLinkHref()),'','Recommended tools:'];
  items.forEach(function(item,index){lines.push((index+1)+'. '+readinessLabel(item.ready)+' | '+item.tool.name+(item.note?' | Note: '+item.note:'')+(item.saved?' | Saved data: '+item.saved:'')+' | '+absoluteHref(toolHref(item.tool)));});
  if(!items.length) lines.push('No recommended tools mapped for this phase.');
  return lines;
}
function copyPhaseGate(btn){copyText(phaseGateLines().join('\n')).then(function(){showHint('Phase gate copied.');signal(btn);}).catch(function(){showHint('Could not copy phase gate.','error');});}
function copyPhaseHandoff(btn){copyText(phaseHandoffLines().join('\n')).then(function(){showHint('Phase handoff copied.');signal(btn);}).catch(function(){showHint('Could not copy phase handoff.','error');});}
function copySuiteLink(btn){copyText(absoluteHref(suiteLinkHref())).then(function(){showHint('Suite link copied with show profile and phase.');signal(btn);}).catch(function(){showHint('Could not copy suite link.','error');});}
function copyReviewQueue(btn){
  var counts=readinessCounts();
  var lines=['AV BY DAVE REVIEW QUEUE','Show: '+state.showName,'Venue: '+state.venue,'Date: '+state.showDate,'Operator: '+state.operator,'Phase: '+phaseLabel(state.phase),'Readiness: '+counts.ready+' ready, '+counts.issue+' issue, '+counts.skipped+' skipped','Saved tool data: '+savedToolCount()+' tools','','Prioritized actions:'];
  reviewQueueItems().forEach(function(item,index){lines.push((index+1)+'. '+item.label+' | '+item.detail+(item.tool?' | '+absoluteHref(toolHref(item.tool)):''));});
  copyText(lines.join('\n')).then(function(){showHint('Review queue copied.');signal(btn);}).catch(function(){showHint('Could not copy review queue.','error');});
}
function copyLaunchList(btn){
  var tools=recommendedTools();var counts=readinessCounts();
  var issueTools=TOOLS.filter(function(t){return toolReadiness(t.id)==='issue';});
  var noteTools=TOOLS.filter(function(t){return toolNote(t.id);});
  var lines=['AV BY DAVE LAUNCH LIST','Show: '+state.showName,'Venue: '+state.venue,'Date: '+state.showDate,'Operator: '+state.operator,'Phase: '+phaseLabel(state.phase),'Suite link: '+absoluteHref(suiteLinkHref()),'Readiness: '+counts.ready+' ready, '+counts.issue+' issue, '+counts.skipped+' skipped','Saved tool data: '+savedToolCount()+' tools','','Recommended:'];
  tools.forEach(function(t){lines.push(launchLine(t));});
  lines.push('','Pinned:');
  state.favorites.map(toolById).filter(Boolean).forEach(function(t){lines.push(launchLine(t));});
  lines.push('','Issues:');
  if(issueTools.length) issueTools.forEach(function(t){lines.push(launchLine(t));});else lines.push('None');
  lines.push('','Notes:');
  if(noteTools.length) noteTools.forEach(function(t){lines.push(t.name+' | '+toolNote(t.id));});else lines.push('None');
  copyText(lines.join('\n')).then(function(){showHint('Launch list copied with show context and notes.');signal(btn);}).catch(function(){showHint('Could not copy launch list.','error');});
}

/* ============================================================
   OFFLINE CACHE / SERVICE WORKER — ported verbatim (same cache name
   derived from REG.version, same asset manifest, same worker file).
   ============================================================ */
function offlineAvailable(){return Boolean(window.isSecureContext&&'serviceWorker' in navigator&&'caches' in window);}
function renderOfflineStatus(){
  var summary=$('offlineSummary');var detail=$('offlineDetail');
  var cacheClass=offlineState.cache==='Ready'?'is-ready':(offlineState.cache==='Error'||offlineState.cache==='Unavailable'?'is-error':'');
  var workerClass=offlineState.worker==='Ready'?'is-ready':(offlineState.worker==='Error'||offlineState.worker==='Unavailable'?'is-error':'');
  var onlineLabel=offlineState.online?'Online':'Offline';var cacheText=offlineState.cached+'/'+offlineState.total+' files';
  if(summary) summary.innerHTML='<div class="offline-pill"><span>Network</span><strong>'+onlineLabel+'</strong></div><div class="offline-pill '+workerClass+'"><span>Worker</span><strong>'+escapeHtml(offlineState.worker)+'</strong></div><div class="offline-pill '+cacheClass+'"><span>Cache</span><strong>'+escapeHtml(offlineState.cache)+'</strong></div><div class="offline-pill"><span>Files</span><strong>'+cacheText+'</strong></div>';
  if(detail) detail.textContent=offlineState.message;
  ['cacheToolsBtn','refreshCacheBtn'].forEach(function(id){if($(id)) $(id).disabled=!offlineState.supported||offlineState.busy;});
  if($('clearCacheBtn')) $('clearCacheBtn').disabled=!offlineState.supported||offlineState.busy||offlineState.cached===0;
  var badge=$('cacheBadge');var label=$('cacheBadgeLabel');
  var offlineReady=offlineState.cache==='Ready'&&Boolean(navigator.serviceWorker&&navigator.serviceWorker.controller);
  if(badge){badge.setAttribute('data-ready',String(offlineReady));badge.setAttribute('data-online',String(offlineState.online));}
  if(label) label.textContent=offlineState.online?(offlineReady?'Cached · Offline ready':(offlineState.cache==='Ready'?'Cached · Preparing offline':(offlineState.cache==='Partial'?'Cache partial':(offlineState.supported?'Not cached':'Cache unavailable')))):'Offline';
}
function setOfflineMessage(cache,message){offlineState.cache=cache;offlineState.message=message;renderOfflineStatus();}
function refreshOfflineStatus(){
  offlineState.supported=offlineAvailable();offlineState.online=navigator.onLine!==false;offlineState.total=OFFLINE_ASSETS.length;
  if(!offlineState.supported){offlineState.worker='Unavailable';offlineState.cache='Unavailable';offlineState.cached=0;offlineState.message='This browser cannot prepare the AV by Dave offline cache.';renderOfflineStatus();return Promise.resolve(false);}
  return caches.open(AV_CACHE_NAME).then(function(cache){return Promise.all(OFFLINE_ASSETS.map(function(asset){return cache.match(asset,{ignoreSearch:true}).then(function(found){return Boolean(found);}).catch(function(){return false;});}));}).then(function(matches){
    offlineState.cached=matches.filter(Boolean).length;
    offlineState.cache=offlineState.cached===offlineState.total?'Ready':(offlineState.cached?'Partial':'Not cached');
    offlineState.message=offlineState.cache==='Ready'?'AV by Dave and its tool routes are cached for offline loading.':(offlineState.cached?'Cache is partial. Use Refresh Cache before relying on it.':'Use Cache AV Tools before leaving network.');
    offlineState.busy=false;renderOfflineStatus();return offlineState.cache==='Ready';
  }).catch(function(){offlineState.cache='Error';offlineState.message='Could not read the AV by Dave cache status.';offlineState.busy=false;renderOfflineStatus();return false;});
}
function waitForOfflineControl(registration){
  if(navigator.serviceWorker.controller) return Promise.resolve();
  // Activation can finish while this document is still navigating. ready only
  // promises an active registration; ask it to claim this now-loaded client.
  return new Promise(function(resolve,reject){
    var timer=setTimeout(function(){finish(new Error('Offline worker did not take control.'));},30000);
    function finish(error){clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',controlled);if(error) reject(error);else resolve();}
    function controlled(){if(navigator.serviceWorker.controller) finish();}
    navigator.serviceWorker.addEventListener('controllerchange',controlled);
    try {registration.active.postMessage({type:'SBD_CLAIM_CLIENTS'});controlled();} catch(error){finish(error);}
  });
}
function registerOfflineWorker(){
  offlineState.supported=offlineAvailable();offlineState.online=navigator.onLine!==false;
  if(!offlineState.supported){renderOfflineStatus();return refreshOfflineStatus();}
  offlineState.worker='Registering';offlineState.message='Registering offline cache worker.';renderOfflineStatus();
  return navigator.serviceWorker.register('av-suite-worker.js',{scope:'./'}).then(function(registration){if(registration.waiting) registration.waiting.postMessage({type:'SKIP_WAITING'});return navigator.serviceWorker.ready;}).then(waitForOfflineControl).then(function(){offlineState.worker='Ready';return refreshOfflineStatus();}).catch(function(){offlineState.worker='Unavailable';offlineState.cache='Unavailable';offlineState.message='Offline cache worker could not take control. Reconnect and reload before relying on offline loading.';offlineState.busy=false;renderOfflineStatus();return false;});
}
function fetchAndCacheAsset(cache,asset){return fetch(asset,{cache:'reload'}).then(function(response){if(!response||!response.ok) throw new Error('cache failed');return cache.put(asset,response.clone());});}
function cacheAvTools(refresh,button){
  if(!offlineAvailable()){setOfflineMessage('Unavailable','This browser cannot prepare the AV by Dave offline cache.');showHint('Offline cache is unavailable in this browser.','error');return Promise.resolve(false);}
  offlineState.supported=true;offlineState.online=navigator.onLine!==false;offlineState.busy=true;
  offlineState.cache=refresh?'Refreshing':'Caching';offlineState.message=(refresh?'Refreshing':'Caching')+' AV by Dave files for offline loading.';renderOfflineStatus();
  var failed=[];
  return caches.open(AV_CACHE_NAME).then(function(cache){
    var start=refresh?caches.delete(AV_CACHE_NAME).then(function(){return caches.open(AV_CACHE_NAME);}):Promise.resolve(cache);
    return start.then(function(nextCache){
      return Promise.all(OFFLINE_ASSETS.map(function(asset){
        return fetchAndCacheAsset(nextCache,asset).then(function(){return true;}).catch(function(){failed.push(asset);return false;});
      }));
    });
  }).then(function(){return refreshOfflineStatus();}).then(function(ready){
    if(failed.length){
      offlineState.cache=offlineState.cached?'Partial':'Error';
      offlineState.message='Cached '+offlineState.cached+' of '+offlineState.total+' files. '+failed.length+' optional or unavailable file'+(failed.length===1?'':'s')+' could not be refreshed.';
      renderOfflineStatus();
      showHint('Offline cache is partial: '+failed.length+' file'+(failed.length===1?'':'s')+' unavailable.','error');
      return false;
    }
    showHint('AV tools cached for offline loading.');if(button) signal(button);return ready;
  }).catch(function(){offlineState.busy=false;offlineState.cache='Error';offlineState.message='Could not prepare the AV by Dave cache. Check the connection, then try Refresh Cache.';renderOfflineStatus();showHint('Could not prepare offline cache.','error');return false;});
}
function clearOfflineCache(button){
  if(!offlineAvailable()){setOfflineMessage('Unavailable','This browser cannot prepare the AV by Dave offline cache.');showHint('Offline cache is unavailable in this browser.','error');return Promise.resolve(false);}
  offlineState.busy=true;offlineState.cache='Clearing';offlineState.message='Clearing the AV by Dave offline cache.';renderOfflineStatus();
  return caches.delete(AV_CACHE_NAME).then(function(){offlineState.cached=0;return refreshOfflineStatus();}).then(function(){showHint('Offline cache cleared.');if(button) signal(button);return true;}).catch(function(){offlineState.busy=false;offlineState.cache='Error';offlineState.message='Could not clear the AV by Dave offline cache.';renderOfflineStatus();showHint('Could not clear offline cache.','error');return false;});
}

/* ============================================================
   TRANSFER & BACKUP — suite JSON + show package, ported verbatim.
   ============================================================ */
function exportSuite(btn){downloadFile(fileStem()+'.av-suite.json',JSON.stringify(suitePayload(),null,2),'application/json;charset=utf-8');showHint('Suite JSON exported.');signal(btn);}
function importErrorMessage(error,label){if(error instanceof SyntaxError) return label+' is not valid JSON.';if(error&&error.message==='Invalid package') return label+' has the wrong schema or is missing tool data.';if(error&&error.message==='Invalid payload') return label+' is missing valid AV by Dave state.';return 'Could not import '+label.toLowerCase()+'.';}
function importSuiteFile(file){var reader=new FileReader();reader.onload=function(){try{applySuitePayload(JSON.parse(String(reader.result||'')));saveState();renderAll();showHint('Suite JSON imported.');}catch(e){showHint(importErrorMessage(e,'Suite JSON file'),'error');}};reader.onerror=function(){showHint('Could not read that suite JSON file.','error');};reader.readAsText(file);}
function allowedPackageKey(key){return !SENSITIVE_PACKAGE_KEYS[key]&&TOOL_STORAGE_KEYS.some(function(item){return item.key===key;});}
function packageToolData(){var entries=[];if(!storageAvailable()) return entries;TOOL_STORAGE_KEYS.forEach(function(item){if(SENSITIVE_PACKAGE_KEYS[item.key]) return;var value=localStorage.getItem(item.key);if(value!==null) entries.push({tool:item.tool,label:item.label,key:item.key,value:String(value)});});return entries;}
function packagePayload(){return {schema:'system-by-dave.av-suite-package.v1',exportedAt:new Date().toISOString(),suite:suitePayload(),toolData:packageToolData()};}
function exportPackage(btn){var payload=packagePayload();downloadFile(fileStem()+'.av-show-package.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');showHint('Show package exported with '+payload.toolData.length+' saved tool '+(payload.toolData.length===1?'entry.':'entries.'));if(btn) signal(btn);}
function importPackageFile(file){var reader=new FileReader();reader.onload=function(){try{var parsed=JSON.parse(String(reader.result||''));var restored=0;if(!parsed||parsed.schema!=='system-by-dave.av-suite-package.v1'||!Array.isArray(parsed.toolData)) throw new Error('Invalid package');if(parsed.suite) applySuitePayload(parsed.suite);parsed.toolData.forEach(function(entry){if(!entry||!allowedPackageKey(entry.key)) return;localStorage.setItem(entry.key,String(entry.value||''));restored++;});saveState();renderAll();showHint('Show package imported. Restored '+restored+' saved tool '+(restored===1?'entry.':'entries.'));}catch(e){showHint(importErrorMessage(e,'Show package JSON file'),'error');}};reader.onerror=function(){showHint('Could not read that show package file.','error');};reader.readAsText(file);}
function clearPrefs(){if(!window.confirm('Clear AV by Dave saved profile, readiness, pins, and recent tools?')) return;if(storageAvailable()) localStorage.removeItem(STORAGE_KEY);state=defaultState();renderAll();showHint('Suite preferences cleared.');}

/* ============================================================
   RENDER — header
   ============================================================ */
function contextNoteText(){return viewState.context==='shop'?'Toolbox · No show attached · '+TOOLS.length+' registered tools':'Front Office · roadmap concept · no persistence';}
function renderHeader(){
  $('ctxShowBtn').setAttribute('aria-pressed',String(viewState.context==='show'));
  $('ctxShopBtn').setAttribute('aria-pressed',String(viewState.context==='shop'));
  $('ctxOfficeBtn').setAttribute('aria-pressed',String(viewState.context==='office'));
  var showCtx=viewState.context==='show';
  $('phaseStripLabel').hidden=!showCtx;
  $('phaseStrip').hidden=!showCtx;
  var note=$('ctxNote');note.hidden=showCtx;if(!showCtx) note.textContent=contextNoteText();
  $('phaseStrip').innerHTML=PHASES.map(function(p){return '<button type="button" data-phase="'+p.id+'" aria-pressed="'+String(state.phase===p.id)+'" data-on="'+(state.phase===p.id?'1':'0')+'">'+escapeHtml(p.label)+'</button>';}).join('');
  applyShellTheme();
  $('helpBtn').setAttribute('aria-pressed',String(uiState.help));
  ['hbFile','hbFams','hbProfile','hbRecs'].forEach(function(id){$(id).hidden=!uiState.help;});
}

/* ============================================================
   RENDER — rail (show file, pinned, families)
   ============================================================ */
function pinDotClass(id){if(entryState.mode==='toolbox') return '';var r=toolReadiness(id);return r==='ready'||r==='issue'||r==='skipped'?'st-'+r:'';}
function renderPinList(){
  var list=$('pinList');var count=$('pinCountOut');
  var pins=activePins();count.textContent=pins.length?(' · '+pins.length):'';
  var tools=pins.map(toolById).filter(Boolean);
  if(!tools.length){list.innerHTML='<div class="pin-empty">'+(entryState.mode==='toolbox'?'Nothing pinned in the Toolbox yet.':'Nothing pinned. Pin a tool and it lands here for the whole show.')+'</div>';return;}
  list.innerHTML=tools.map(function(t){return '<div class="pin-row"><span class="stdot '+pinDotClass(t.id)+'"></span><a href="'+escapeAttr(toolHref(t))+'" data-tool="'+t.id+'">'+escapeHtml(t.name)+'</a><button type="button" data-pin="'+t.id+'" title="Unpin '+escapeAttr(t.name)+'" aria-label="Unpin '+escapeAttr(t.name)+'"><svg class="ic" viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>';}).join('');
}
function familySubsFlat(fam){var subs=[];if(!fam.subs) return subs;fam.toolIds.forEach(function(id){(fam.subs[id]||[]).forEach(function(s){subs.push(Object.assign({toolId:id},s));});});return subs;}
function renderFamilyList(){
  var wrap=$('famList');
  wrap.innerHTML=FAMILIES.map(function(fam){
    var active=(viewState.context==='show'&&viewState.view==='family'&&viewState.fam===fam.id)||(viewState.context==='shop'&&toolboxState.family===fam.id);
    var hasSubs=fam.subs&&Object.keys(fam.subs).length;
    var open=Boolean(viewState.openFams[fam.id]);
    var subs=hasSubs?familySubsFlat(fam):[];
    var subsHtml=(hasSubs&&open)?('<div class="fam-subs">'+subs.map(function(s){return '<div class="fam-sub-row"><span class="fam-sub-dot"></span><span class="fam-sub-label">'+escapeHtml(s.label)+'</span><span class="fam-sub-kind">'+escapeHtml(s.kind)+'</span></div>';}).join('')+'</div>'):'';
    return '<div class="fam-row'+(active?' is-active':'')+'">'
      +'<span class="fam-row-tint"></span><span class="fam-row-accent"></span>'
      +'<div class="fam-row-flex">'
      +'<button type="button" class="fam-btn" data-fam-select="'+fam.id+'">'+iconSvg(fam.icon,16)+'<span class="fam-label">'+escapeHtml(fam.label)+'</span><span class="fam-n">'+fam.toolIds.length+'</span></button>'
      +(hasSubs?('<button type="button" class="fam-toggle" data-fam-toggle="'+fam.id+'" title="Expand sub-modules" aria-label="Expand sub-modules"><svg class="ic" viewBox="0 0 24 24" style="width:12px;height:12px">'+(open?'<path d="m18 15-6-6-6 6"/>':'<path d="m6 9 6 6 6-6"/>')+'</svg></button>'):'<span class="fam-spacer"></span>')
      +'</div>'+subsHtml+'</div>';
  }).join('');
  $('railAllCount').textContent=TOOLS.length;
  $('railAllBtn').classList.toggle('is-active',(viewState.context==='show'&&viewState.view==='all')||(viewState.context==='shop'&&toolboxState.filter==='all'&&toolboxState.family==='all'));
  $('railRecentBtn').classList.toggle('is-active',(viewState.context==='show'&&state.filters.pin==='recent'&&viewState.view==='all')||(viewState.context==='shop'&&toolboxState.filter==='recent'));
  $('railShopBtn').classList.toggle('is-active',viewState.context==='shop');
  $('railOfficeBtn').classList.toggle('is-active',viewState.context==='office');
}
function renderMobileFamStrip(){
  var wrap=$('mobFamStrip');
  wrap.innerHTML=FAMILIES.map(function(fam){var on=(viewState.context==='show'&&viewState.view==='family'&&viewState.fam===fam.id)||(viewState.context==='shop'&&toolboxState.family===fam.id);return '<button type="button" class="mob-fam-btn" data-fam-select="'+fam.id+'" aria-pressed="'+String(on)+'">'+escapeHtml(fam.label)+'</button>';}).join('');
}
function renderRail(){
  var wb=toolById('av-workbook');
  var link=$('railWorkbookLink');
  if(wb){link.setAttribute('href',toolHref(wb));link.setAttribute('data-tool','av-workbook');}
  renderPinList();
  renderFamilyList();
  renderMobileFamStrip();
}

/* ============================================================
   RENDER — main / show context
   ============================================================ */
function setInputValues(){
  $('pfShowName').value=state.showName;$('pfVenue').value=state.venue;$('pfDate').value=state.showDate;$('pfOperator').value=state.operator;
}
function barStyle(pct,color){var p=Math.max(0,Math.min(100,pct));return 'width:'+p+'%;background:'+color;}
function renderTilesAndGate(){
  var counts=readinessCounts();
  var gateItems=phaseGateItems();var gateCounts=phaseGateCounts(gateItems);var gatePct=phaseGatePercent(gateItems,gateCounts);
  var total=TOOLS.length;
  var tiles=[
    {cls:'tile-ready',label:'Ready',num:counts.ready,unit:'/ '+total,bar:barStyle(counts.ready/total*100,'var(--st-ready)')},
    {cls:'tile-issue',label:'Issues',num:counts.issue,unit:'/ '+total,bar:barStyle(counts.issue/total*100,'var(--st-issue)')},
    {cls:'tile-skipped',label:'Skipped',num:counts.skipped,unit:'/ '+total,bar:null},
    {cls:'tile-pinned',label:'Pinned',num:state.favorites.length,unit:'tools',bar:null},
    {cls:'tile-gate',label:phaseLabel(state.phase)+' gate',num:gatePct+'%',unit:gateCounts.ready+'/'+gateItems.length,bar:barStyle(gatePct,'var(--c-accent-700,var(--c-accent))')}
  ];
  $('tiles').innerHTML=tiles.map(function(t){return '<div class="tile bp '+t.cls+'"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i><div class="tile-label">'+t.label+'</div><div class="tile-num-row"><span class="tile-num">'+t.num+'</span><span class="tile-unit">'+t.unit+'</span></div>'+(t.bar?'<div class="tile-bar-track"><div class="tile-bar-fill" style="'+t.bar+'"></div></div>':'')+'</div>';}).join('');
  $('recPhaseChip').textContent=phaseLabel(state.phase);
}
function renderRecs(){
  var tools=recommendedTools().slice(0,3);
  $('recsGrid').innerHTML=tools.map(function(tool,index){
    var reason=recommendationReason(tool,index);
    var pinned=state.favorites.indexOf(tool.id)>=0;
    var cite=uiState.showCitations?('<div class="rec-cite"><svg class="ic" viewBox="0 0 24 24" style="width:11px;height:11px"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5"/></svg><span>'+escapeHtml(reason.source)+'</span></div>'):'';
    return '<article class="rec-card">'
      +'<div class="rec-card-top"><strong>'+escapeHtml(tool.name)+'</strong><button type="button" class="pinbtn" data-pin="'+tool.id+'" aria-pressed="'+String(pinned)+'" title="'+(pinned?'Unpin ':'Pin ')+escapeAttr(tool.name)+'"><svg class="ic" viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M12 2 9 9l-6 1 4.5 4L6 21l6-3.5L18 21l-1.5-7L21 10l-6-1z"/></svg></button></div>'
      +'<p>'+escapeHtml(reason.why)+'</p>'+cite
      +'<div class="rec-actions"><button type="button" class="primary" data-open="'+tool.id+'">Open</button><select data-readiness="'+tool.id+'" aria-label="Set '+escapeAttr(tool.name)+' readiness">'+readinessOptions(toolReadiness(tool.id))+'</select></div>'
      +'</article>';
  }).join('')||'<div class="aside-empty" style="grid-column:1/-1">No tools mapped to '+escapeHtml(phaseLabel(state.phase))+' yet.</div>';
}
function statusBadge(ready){
  if(ready==='ready') return '<span class="stpill st-ready"><svg class="ic" viewBox="0 0 24 24" style="width:10px;height:10px"><path d="m5 13 4 4L19 7"/></svg>Ready</span>';
  if(ready==='issue') return '<span class="stpill st-issue"><svg class="ic" viewBox="0 0 24 24" style="width:10px;height:10px"><path d="M12 9v4M12 17h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>Issue</span>';
  if(ready==='skipped') return '<span class="stpill st-skipped">Skipped</span>';
  return '<span class="stpill">Pending</span>';
}
function toolSubsForFamily(fam,toolId){return (fam.subs&&fam.subs[toolId])||null;}
function renderFamView(){
  var fam=familyById(viewState.fam)||FAMILIES[0];
  if(!fam) return;
  viewState.fam=fam.id;
  $('famViewLabel').textContent=fam.label;
  $('famViewCount').textContent=fam.toolIds.length+' tool'+(fam.toolIds.length===1?'':'s');
  $('famViewDepts').textContent=fam.depts;
  var tools=familyTools(fam);
  $('toolrowList').innerHTML=tools.map(function(tool){
    var ready=toolReadiness(tool.id);var pinned=state.favorites.indexOf(tool.id)>=0;
    var subs=toolSubsForFamily(fam,tool.id);
    var subsOpen=Boolean(viewState.openSubs[tool.id]);
    var subsToggle=subs?('<button type="button" class="tr-subs-toggle" data-sub-toggle="'+tool.id+'">'+subs.length+' sub-modules '+(subsOpen?'▲':'▼')+'</button>'):'';
    var subsPanel=(subs&&subsOpen)?('<div class="tr-subs-panel"><div class="tsp-label">Sub-modules</div><div class="tr-subs-grid">'+subs.map(function(s){return '<div class="tr-sub-card"><div class="tr-sub-card-top"><strong>'+escapeHtml(s.label)+'</strong><span>'+escapeHtml(s.kind)+'</span></div>'+(uiState.showCitations?'<div class="tr-sub-cite"><svg class="ic" viewBox="0 0 24 24" style="width:10px;height:10px"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5"/></svg>'+escapeHtml(s.source)+'</div>':'')+'</div>';}).join('')+'</div></div>'):'';
    return '<div class="toolrow-card">'
      +'<div data-r="toolrow"><span class="tr-stripe '+(ready==='pending'?'':'st-'+ready)+'"></span>'
      +'<div class="tr-body"><div class="tr-title-row"><a href="'+escapeAttr(toolHref(tool))+'" data-tool="'+tool.id+'" style="font-family:var(--f-head);font-size:15px;font-weight:var(--w-semi);color:var(--c-text)">'+escapeHtml(tool.name)+'</a><span class="tr-tag">'+escapeHtml(tool.tag)+'</span>'+subsToggle+'</div><div class="tr-desc">'+escapeHtml(tool.desc)+'</div><input type="text" class="tr-note" data-note="'+tool.id+'" value="'+escapeAttr(toolNote(tool.id))+'" maxlength="240" placeholder="Add a readiness note…" aria-label="Readiness note for '+escapeAttr(tool.name)+'"></div>'
      +'<div class="tr-status">'+statusBadge(ready)+'</div>'
      +'<div class="tr-actions"><button type="button" class="pinbtn" data-pin="'+tool.id+'" aria-pressed="'+String(pinned)+'" title="'+(pinned?'Unpin ':'Pin ')+escapeAttr(tool.name)+'"><svg class="ic" viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M12 2 9 9l-6 1 4.5 4L6 21l6-3.5L18 21l-1.5-7L21 10l-6-1z"/></svg></button><select data-readiness="'+tool.id+'" aria-label="Set '+escapeAttr(tool.name)+' readiness">'+readinessOptions(ready)+'</select><button type="button" class="tr-open" data-open="'+tool.id+'" title="Open '+escapeAttr(tool.name)+'" aria-label="Open '+escapeAttr(tool.name)+'"><svg class="ic" viewBox="0 0 24 24" style="width:13px;height:13px"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>'
      +'</div>'+subsPanel+'</div>';
  }).join('');
}
function haystackFor(tool){var saved=savedEntriesForTool(tool.id);return [tool.name,tool.dept,tool.tag,tool.desc,tool.phases.join(' '),toolNote(tool.id),saved.map(function(e){return e.label;}).join(' ')].join(' ').toLowerCase();}
function matchesPinFilter(tool){var ready=toolReadiness(tool.id);switch(state.filters.pin){case 'pinned':return state.favorites.indexOf(tool.id)>=0;case 'recent':return state.recent.indexOf(tool.id)>=0;case 'ready':return ready==='ready';case 'issues':return ready==='issue';case 'skipped':return ready==='skipped';case 'notes':return Boolean(toolNote(tool.id));case 'saved':return savedEntriesForTool(tool.id).length>0;default:return true;}}
function allToolsFiltered(){var q=state.filters.search.trim().toLowerCase();return TOOLS.filter(function(t){if(q&&haystackFor(t).indexOf(q)===-1) return false;return matchesPinFilter(t);});}
function renderAllView(){
  $('allSearchInput').value=state.filters.search;
  $('allSearchInput').placeholder='Search all '+TOOLS.length+' tools…';
  var visible=allToolsFiltered();
  var visibleIds={};visible.forEach(function(t){visibleIds[t.id]=true;});
  $('allViewCount').textContent=visible.length+' of '+TOOLS.length+' tools across '+FAMILIES.length+' families';
  $('allViewVersion').textContent='Registry '+(REG.version||'');
  function cardHtml(tool){var ready=toolReadiness(tool.id);var pinned=state.favorites.indexOf(tool.id)>=0;var dot=ready==='ready'||ready==='issue'?'<span class="stdot st-'+ready+'"></span>':(ready==='skipped'?'<span class="stdot st-skipped"></span>':'');return '<div class="allcard">'+dot+'<a href="'+escapeAttr(toolHref(tool))+'" data-tool="'+tool.id+'">'+escapeHtml(tool.name)+'</a><span class="ac-tag">'+escapeHtml(tool.tag)+'</span><button type="button" class="pinbtn" data-pin="'+tool.id+'" aria-pressed="'+String(pinned)+'" title="'+(pinned?'Unpin ':'Pin ')+escapeAttr(tool.name)+'"><svg class="ic" viewBox="0 0 24 24" style="width:11px;height:11px"><path d="M12 2 9 9l-6 1 4.5 4L6 21l6-3.5L18 21l-1.5-7L21 10l-6-1z"/></svg></button></div>';}
  var groupsHtml='';
  var wb=toolById('av-workbook');
  function groupHead(icon,label,count,dept){var d=escapeHtml(label);return '<div class="allgroup-head">'+(icon?iconSvg(icon,15):'')+'<h3>'+d+'</h3><span class="n">'+count+'</span><span class="d">'+escapeHtml(dept)+'</span></div>';}
  if(wb&&visibleIds[wb.id]) groupsHtml+='<div class="allgroup">'+groupHead(null,'Workbook','1 tool','Spine')+'<div data-r="allgrid">'+cardHtml(wb)+'</div></div>';
  FAMILIES.forEach(function(fam){
    var tools=familyTools(fam).filter(function(t){return visibleIds[t.id];});
    if(!tools.length) return;
    groupsHtml+='<div class="allgroup">'+groupHead(fam.icon,fam.label,tools.length,fam.depts)+'<div data-r="allgrid">'+tools.map(cardHtml).join('')+'</div></div>';
  });
  $('allGroups').innerHTML=groupsHtml||'<div class="aside-empty">No tools match the current filters.<div style="margin-top:10px"><button type="button" id="clearFiltersBtn">Clear filters</button></div></div>';
}
function clearToolFilters(){state.filters={search:'',phase:'all',dept:'all',pin:'all'};saveState();renderAllView();showHint('Tool filters cleared.');}
function renderMainForView(){
  var showCtx=viewState.context==='show';
  $('showView').hidden=!showCtx;
  $('shopOfficeView').hidden=showCtx;
  if(showCtx){
    setInputValues();
    renderTilesAndGate();
    renderRecs();
    $('famViewSection').hidden=viewState.view!=='family';
    $('allViewSection').hidden=viewState.view!=='all';
    if(viewState.view==='family') renderFamView();else renderAllView();
  } else {
    renderShopOffice();
  }
}

/* ============================================================
   RENDER — Toolbox / Front Office context. Toolbox inventory is
   derived only from the live registry; Front Office remains a clearly
   labeled roadmap concept with no persistence.
   ============================================================ */
function toolboxHaystack(tool){return [tool.name,tool.dept,tool.tag,tool.desc,(tool.phases||[]).join(' ')].join(' ').toLowerCase();}
function toolboxFilteredTools(){var query=toolboxState.search.trim().toLowerCase();var tools=TOOLS.filter(function(tool){if(query&&toolboxHaystack(tool).indexOf(query)===-1) return false;if(toolboxState.family!=='all'){var family=familyById(toolboxState.family);if(!family||family.toolIds.indexOf(tool.id)<0) return false;}if(toolboxState.filter==='featured'&&!tool.toolboxFeatured) return false;if(toolboxState.filter==='pinned'&&toolboxState.pinned.indexOf(tool.id)<0) return false;if(toolboxState.filter==='recent'&&toolboxState.recent.indexOf(tool.id)<0) return false;return true;});if(toolboxState.filter==='recent') tools.sort(function(a,b){return toolboxState.recent.indexOf(a.id)-toolboxState.recent.indexOf(b.id);});return tools;}
function toolboxCardHtml(tool){var pinned=toolboxState.pinned.indexOf(tool.id)>=0;var featured=tool.toolboxFeatured?'<span class="ac-tag">Use anytime</span>':'<span class="ac-tag">'+escapeHtml(tool.tag)+'</span>';return '<article class="toolbox-card"><div class="toolbox-card-main"><div class="toolbox-card-head"><a href="'+escapeAttr(toolHref(tool))+'" data-tool="'+tool.id+'">'+escapeHtml(tool.name)+'</a>'+featured+'</div><p>'+escapeHtml(tool.desc)+'</p></div><div class="toolbox-card-actions"><button type="button" data-pin="'+tool.id+'" aria-pressed="'+String(pinned)+'" title="'+(pinned?'Unpin ':'Pin ')+escapeAttr(tool.name)+'" aria-label="'+(pinned?'Unpin ':'Pin ')+escapeAttr(tool.name)+'"><svg class="ic" viewBox="0 0 24 24"><path d="M12 2 9 9l-6 1 4.5 4L6 21l6-3.5L18 21l-1.5-7L21 10l-6-1z"/></svg></button><button type="button" class="toolbox-open" data-open="'+tool.id+'" title="Open '+escapeAttr(tool.name)+'" aria-label="Open '+escapeAttr(tool.name)+'"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div></article>';}
function toolboxGroupHead(label,count,depts,icon){return '<div class="allgroup-head">'+(icon?iconSvg(icon,15):'')+'<h3>'+escapeHtml(label)+'</h3><span class="n">'+count+' tool'+(count===1?'':'s')+'</span><span class="d">'+escapeHtml(depts)+'</span></div>';}
function renderToolboxResults(){var tools=toolboxFilteredTools();var ids={};tools.forEach(function(tool){ids[tool.id]=true;});$('toolboxResultCount').textContent=tools.length+' of '+TOOLS.length+' registered tools';var groups='';var seen={};var workbook=toolById('av-workbook');if(toolboxState.family==='all'&&workbook&&ids[workbook.id]){seen[workbook.id]=true;groups+='<section class="toolbox-group">'+toolboxGroupHead('Workbook',1,'Spine',null)+'<div class="toolbox-grid">'+toolboxCardHtml(workbook)+'</div></section>';}FAMILIES.forEach(function(family){if(toolboxState.family!=='all'&&toolboxState.family!==family.id) return;var familyToolsVisible=familyTools(family).filter(function(tool){return ids[tool.id]&&!seen[tool.id];});familyToolsVisible.forEach(function(tool){seen[tool.id]=true;});if(familyToolsVisible.length) groups+='<section class="toolbox-group">'+toolboxGroupHead(family.label,familyToolsVisible.length,family.depts,family.icon)+'<div class="toolbox-grid">'+familyToolsVisible.map(toolboxCardHtml).join('')+'</div></section>';});var remaining=tools.filter(function(tool){return !seen[tool.id];});if(remaining.length) groups+='<section class="toolbox-group">'+toolboxGroupHead('Other',remaining.length,'Registry',null)+'<div class="toolbox-grid">'+remaining.map(toolboxCardHtml).join('')+'</div></section>';$('toolboxGroups').innerHTML=groups||'<div class="toolbox-empty">No tools match these Toolbox filters.<div style="margin-top:10px"><button type="button" id="toolboxClearBtn">Clear Toolbox filters</button></div></div>';}
function renderToolbox(){var familyOptions='<option value="all">All families</option>'+FAMILIES.map(function(family){return '<option value="'+family.id+'"'+(toolboxState.family===family.id?' selected':'')+'>'+escapeHtml(family.label)+'</option>';}).join('');$('shopOfficeView').innerHTML='<section class="ctx-hero toolbox-hero bp"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i><div><div class="toolbox-status">No show attached</div><h2>AV Toolbox</h2><p>Launch any registered AV tool cold. Toolbox search, family, pins, and recents stay in AV Suite UI preferences and never touch the saved show dashboard.</p><div class="ctx-keys"><span class="ctx-key-pill">'+TOOLS.length+' live tools</span><span class="ctx-key-pill">'+FAMILIES.length+' families</span><span class="ctx-key-pill">'+TOOLBOX_FEATURED.length+' use anytime</span></div></div><div class="toolbox-hero-actions"><button type="button" class="primary" id="toolboxWorkShowBtn">Open Show Console</button><button type="button" id="toolboxDoorwayBtn">Choose doorway</button></div></section><div class="toolbox-toolbar"><div><label class="rail-head" for="toolboxSearchInput">Search Toolbox</label><input type="search" id="toolboxSearchInput" autocomplete="off" value="'+escapeAttr(toolboxState.search)+'" placeholder="Search tools, departments, tags…"></div><div><label class="rail-head" for="toolboxFamilySelect">Family</label><select id="toolboxFamilySelect">'+familyOptions+'</select></div></div><div class="toolbox-filter-row" role="group" aria-label="Filter Toolbox"><button type="button" data-toolbox-filter="all">All tools</button><button type="button" data-toolbox-filter="featured">Use anytime</button><button type="button" data-toolbox-filter="pinned">Pinned</button><button type="button" data-toolbox-filter="recent">Recent</button><span class="fam-view-count" id="toolboxResultCount"></span></div><div id="toolboxGroups"></div>';$('toolboxWorkShowBtn').addEventListener('click',function(){navigateEntry('show');});$('toolboxDoorwayBtn').addEventListener('click',openEntryChooser);$('toolboxSearchInput').addEventListener('input',function(){toolboxState.search=this.value.slice(0,120);saveToolboxState();renderToolboxResults();});$('toolboxFamilySelect').addEventListener('change',function(){toolboxState.family=familyExists(this.value)?this.value:'all';saveToolboxState();renderRail();renderMobileFamStrip();renderToolboxResults();});Array.prototype.forEach.call($('shopOfficeView').querySelectorAll('[data-toolbox-filter]'),function(button){button.setAttribute('aria-pressed',String(button.getAttribute('data-toolbox-filter')===toolboxState.filter));button.addEventListener('click',function(){toolboxState.filter=button.getAttribute('data-toolbox-filter');saveToolboxState();renderRail();renderToolbox();});});renderToolboxResults();}

var CTX_COPY={
  office:{
    title:'Front Office — the business around the show',
    p1:'The Front Office is everything around the show rather than inside it. Who the client is, what was quoted, which venues you have been to, which crew you call, what last season’s equivalent show looked like. It is the layer a TD or owner works in between jobs — and today the suite has no room for it at all.',
    p2:'Nothing here writes to a show file either — it holds the things a show gets created from. Its state is keyed to clients, venues and templates, which is exactly the state a single-show browser-local model cannot hold. This is the context that makes a second show at the same venue cheaper than the first.',
    keys:['a client','a venue','a template'],
    shippedHead:'Exists, but trapped per-show',shippedNote:'Data that should outlive one job',
    tools:[
      {id:'site-survey',kind:'Venue',desc:'Written per-show today. The findings belong to the room and should be there the next time you load into it.',state:'rekey'},
      {id:'crew-call',kind:'People',desc:'Names, roles and rates retyped every show. The roster is a company asset, not show data.',state:'rekey'},
      {id:'change-order',kind:'Money',desc:'Scope and cost impact per show, with no client-level view of what was approved across a season.',state:'rekey'},
      {id:'client-signoff',kind:'Client',desc:'Acceptance and exceptions captured, then stranded in the show that produced them.',state:'rekey'},
      {id:'show-report',kind:'History',desc:'The best record of what happened, with nowhere to accumulate. Ten reports should be a trend.',state:'rekey'}
    ],
    propHead:'What the Front Office unlocks',
    proposed:[
      {name:'Client directory',key:'Client',desc:'Contacts, history, preferences, rates. Every show attaches to a client instead of restating one.'},
      {name:'Venue library',key:'Venue',desc:'Surveys, power, rigging and dock notes keyed to the room. A second job at the same venue starts warm.'},
      {name:'Show templates',key:'Template',desc:'Save a finished show as a starting point. The next one inherits crew, patch, gear and cues.'},
      {name:'Show archive',key:'Archive',desc:'Past show packages, searchable, importable. Where Show Reports accumulate into something you can read.'}
    ],
    close:'Every item here is keyed to a client, a venue or a template. The Toolbox makes the current show faster; the Front Office would make the next one cheaper. Splitting them matters because they have different owners — the Toolbox is for operators and the warehouse, while the Front Office would serve the TD and whoever signs the quote.',
    asideTitle:'Front office state',
    asideBody:'What a client- or venue-level layer would hold that a single browser-local show file cannot.'
  }
};
function renderShopOffice(){
  if(viewState.context==='shop'){renderToolbox();return;}
  var copy=CTX_COPY[viewState.context];if(!copy) return;
  var keysHtml=copy.keys.map(function(k){return '<span class="ctx-key-pill">Keyed to '+escapeHtml(k)+'</span>';}).join('');
  var toolsHtml=copy.tools.map(function(t){
    var tool=toolById(t.id);if(!tool) return '';
    var stateLabel=t.state==='shipped'?'Shipped':(t.state==='rekey'?'Re-key':'Regroup');
    return '<div class="ctx-list-item"><div class="cli-body"><strong>'+escapeHtml(tool.name)+'</strong><span class="cli-kind">'+escapeHtml(t.kind)+'</span><p>'+escapeHtml(t.desc)+'</p></div><span class="ctx-state '+t.state+'">'+stateLabel+'</span></div>';
  }).join('');
  var proposedHtml=copy.proposed.map(function(p){return '<div class="ctx-proposed-card bp"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i><strong>'+escapeHtml(p.name)+'</strong><span class="cpc-key">'+escapeHtml(p.key)+'</span><p>'+escapeHtml(p.desc)+'</p></div>';}).join('');
  $('shopOfficeView').innerHTML=
    '<div class="ctx-hero bp"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>'
    +'<div class="roadmap-badge">Roadmap concept · no persistence</div><h2>'+escapeHtml(copy.title)+'</h2>'
    +'<p>'+escapeHtml(copy.p1)+'</p><p>'+escapeHtml(copy.p2)+'</p>'
    +'<div class="ctx-keys">'+keysHtml+'</div></div>'
    +'<div class="fam-view-head"><h2 style="font-size:15px">'+escapeHtml(copy.shippedHead)+'</h2><span class="fam-view-count">'+escapeHtml(copy.shippedNote)+'</span></div>'
    +'<div class="ctx-list">'+toolsHtml+'</div>'
    +'<div class="fam-view-head"><h2 style="font-size:15px">'+escapeHtml(copy.propHead)+'</h2></div>'
    +'<div class="ctx-prop-grid">'+proposedHtml+'</div>'
    +'<p class="ctx-close">'+escapeHtml(copy.close)+'</p>';
}

/* ============================================================
   RENDER — aside (no-show / help / review queue+gate+recent)
   ============================================================ */
function realAsideCards(){
  return [
    {title:'Would be keyed here',accent:true,body:'Clients, venues, and past shows would live here instead of inside one browser’s local storage.'},
    {title:'Cost of the gap',accent:false,body:'A venue surveyed on one show can’t be found again from the next — every return visit starts cold.'},
    {title:'This show',accent:false,body:(state.showName||'No show named yet')+' · '+phaseLabel(state.phase)+'. Return to it any time from the Show context.'}
  ];
}
function renderAsideNoShow(){
  if(viewState.context==='shop'){
    var recent=toolboxState.recent.map(toolById).filter(Boolean).slice(0,5);
    var recentHtml=recent.length?recent.map(function(tool){return '<div class="recent-row"><a href="'+escapeAttr(toolHref(tool))+'" data-tool="'+tool.id+'">'+escapeHtml(tool.name)+'</a><button type="button" data-open="'+tool.id+'">Open</button></div>';}).join(''):'<div class="aside-empty">No recent Toolbox launches yet.</div>';
    $('asideNoShow').innerHTML='<div class="aside-title">Toolbox state</div><p class="aside-p"><strong>No show attached.</strong> These controls use <code>av-suite-ui.v1</code>, separate from the saved show.</p><div class="aside-card accent"><strong>'+TOOLS.length+' registered tools</strong><span>'+TOOLBOX_FEATURED.length+' marked Use anytime · '+toolboxState.pinned.length+' pinned · '+toolboxState.recent.length+' recent.</span></div><div class="aside-sub">Recent</div>'+recentHtml+'<button type="button" data-action="back-to-show" class="primary" style="width:100%;margin-top:8px">Open Show Console</button>';
    return;
  }
  var copy=CTX_COPY[viewState.context];if(!copy) return;
  var cards=realAsideCards().map(function(c){return '<div class="aside-card'+(c.accent?' accent':'')+'"><strong>'+escapeHtml(c.title)+'</strong><span>'+escapeHtml(c.body)+'</span></div>';}).join('');
  $('asideNoShow').innerHTML='<div class="aside-title">'+escapeHtml(copy.asideTitle)+'</div><p class="aside-p">'+escapeHtml(copy.asideBody)+'</p>'+cards+'<button type="button" data-action="back-to-show" class="primary" style="width:100%;margin-top:6px">Back to the show</button>';

}
var HELP_LEGEND=[
  {n:1,title:'Families',body:'Fourteen families organize the '+TOOLS.length+'-tool registry. Tools with modes nest underneath — expand the chevron.'},
  {n:2,title:'Show profile',body:'Set once. Every tool link carries this context in the URL and prefills on open.'},
  {n:3,title:'Workbook',body:'The show file every other tool reads and writes. It sits above the families, not inside one.'},
  {n:4,title:'Recommendations',body:'Driven by the current phase. Each card cites the rule or saved-data key that produced it, so the suggestion is auditable.'},
  {n:5,title:'Review queue',body:'Blockers, pending phase tools and saved-data risks collect here. Copy it as a handoff.'}
];
function renderAsideHelp(){
  var rows=HELP_LEGEND.map(function(r){return '<div class="help-row"><span class="hb">'+r.n+'</span><div><strong>'+escapeHtml(r.title)+'</strong><span>'+escapeHtml(r.body)+'</span></div></div>';}).join('');
  $('asideHelp').innerHTML='<div class="aside-title">Help mode<button type="button" id="closeHelpBtn" class="ghost small" style="margin-left:auto" aria-label="Close help mode">×</button></div>'
    +'<p class="aside-p">Numbered badges throughout the console point at the regions below.</p>'+rows
    +'<div class="help-links"><button type="button" id="helpHandbookBtn">Operator start pattern</button><button type="button" id="helpShortcutsBtn">Keyboard shortcuts</button></div>'
    +'<div class="help-detail" id="helpHandbookDetail" hidden><ul><li><strong>Name the show.</strong> Set show, venue, date, operator, and phase — context carries through supported tool URLs.</li><li><strong>Open recommended.</strong> The current phase surfaces the tools most likely to matter next.</li><li><strong>Mark readiness.</strong> Ready, Issue, Skipped, notes, and Scan Saved Data keep handoffs explicit.</li><li><strong>Export a package.</strong> Use Export Show Package before changing machines, browsers, or operators.</li></ul></div>'
    +'<div class="help-detail" id="helpShortcutsDetail" hidden><ul><li><span class="kbd">⌘K</span> / <span class="kbd">Ctrl K</span> — Quick Switcher</li><li><span class="kbd">↑</span> <span class="kbd">↓</span> — move selection in Quick Switcher</li><li><span class="kbd">Enter</span> — run the selected command</li><li><span class="kbd">Esc</span> — close the open panel</li></ul></div>';
  $('closeHelpBtn').addEventListener('click',function(){toggleHelp();});
  $('helpHandbookBtn').addEventListener('click',function(){var d=$('helpHandbookDetail');d.hidden=!d.hidden;});
  $('helpShortcutsBtn').addEventListener('click',function(){var d=$('helpShortcutsDetail');d.hidden=!d.hidden;});
}
function renderAsideQueue(){
  var items=phaseGateItems();var counts=phaseGateCounts(items);
  var queue=reviewQueueItems();
  var recent=state.recent.map(toolById).filter(Boolean);
  var queueHtml=queue.map(function(item,index){
    var cls=item.kind==='issue'?'priority-issue':'';
    var btn=item.action==='scan'?'<button type="button" data-review-action="scan">Scan</button>':(item.action==='package'?'<button type="button" data-review-action="package">Export</button>':(item.tool?'<button type="button" data-open="'+item.tool.id+'">Open</button>':'<button type="button" disabled>Done</button>'));
    return '<div class="queue-card '+cls+'"><div class="queue-rank">'+(index+1)+'</div><div class="queue-body"><strong>'+escapeHtml(item.label)+'</strong><span>'+escapeHtml(item.detail)+'</span></div>'+btn+'</div>';
  }).join('');
  var recentHtml=recent.length?recent.map(function(t){return '<div class="recent-row"><a href="'+escapeAttr(toolHref(t))+'" data-tool="'+t.id+'">'+escapeHtml(t.name)+'</a><button type="button" data-open="'+t.id+'">Open</button></div>';}).join(''):'<div class="aside-empty">No recent tools yet.</div>';
  $('asideQueue').innerHTML=
    '<div class="aside-title"><span class="hb">5</span>Review queue</div>'
    +'<div class="gate-line"><strong>'+escapeHtml(phaseLabel(state.phase))+' gate:</strong> '+escapeHtml(phaseGateSummaryText(items,counts))+'.</div>'
    +'<div class="aside-actions"><button type="button" id="gateCopyBtn">Copy Phase Gate</button></div>'
    +'<div class="queue-list">'+(queueHtml||'<div class="aside-empty">No active review items.</div>')+'</div>'
    +'<div class="aside-actions"><button type="button" id="queueCopyBtn">Copy Review Queue</button></div>'
    +'<div class="aside-sub">Recent</div>'
    +recentHtml;
  $('gateCopyBtn').addEventListener('click',function(){copyPhaseGate(this);});
  $('queueCopyBtn').addEventListener('click',function(){copyReviewQueue(this);});
}
function renderAside(){
  var help=$('asideHelp'),noShow=$('asideNoShow'),queue=$('asideQueue');
  if(uiState.help){help.hidden=false;noShow.hidden=true;queue.hidden=true;renderAsideHelp();}
  else if(viewState.context!=='show'){help.hidden=true;noShow.hidden=false;queue.hidden=true;renderAsideNoShow();}
  else {help.hidden=true;noShow.hidden=true;queue.hidden=false;renderAsideQueue();}
}

/* ============================================================
   VIEW / CONTEXT ACTIONS
   ============================================================ */
function defaultFamilyForPhase(){var first=recommendedTools()[0];if(first){var fam=familyForTool(first.id);if(fam) return fam.id;}return FAMILIES.length?FAMILIES[0].id:null;}
function setContext(c){if(c==='show'){navigateEntry('show');return;}if(c==='shop'){navigateEntry('toolbox');return;}if(c!=='office') return;window.history.pushState({avEntry:'frontoffice'},'',entryUrl('frontoffice'));applyEntryMode('frontoffice',{focusMain:true});}
function setView(v){viewState.context='show';viewState.view=v==='all'?'all':'family';renderHeader();renderRail();renderMainForView();renderAside();}
function selectFamily(id){if(!familyExists(id)) return;if(entryState.mode==='toolbox'){viewState.context='shop';toolboxState.family=id;saveToolboxState();renderHeader();renderRail();renderMainForView();renderAside();return;}viewState.context='show';viewState.view='family';viewState.fam=id;renderHeader();renderRail();renderMainForView();renderAside();}
function toggleFamOpen(id){viewState.openFams[id]=!viewState.openFams[id];renderFamilyList();}
function toggleSubsOpen(id){viewState.openSubs[id]=!viewState.openSubs[id];renderFamView();}
function toggleHelp(){uiState.help=!uiState.help;writeUi({help:uiState.help});renderHeader();renderAside();}
function toggleCitations(on){uiState.showCitations=on;writeUi({showCitations:on});var toggle=$('citationsToggle');if(toggle) Array.prototype.forEach.call(toggle.querySelectorAll('[data-citations]'),function(b){b.setAttribute('aria-pressed',String((b.getAttribute('data-citations')==='on')===on));});renderRecs();if(viewState.view==='family') renderFamView();}

function renderAll(){
  if(!viewState.fam||!familyExists(viewState.fam)) viewState.fam=defaultFamilyForPhase();
  $('avApp').setAttribute('data-entry',entryState.mode||'chooser');
  renderHeader();
  renderRail();
  renderMainForView();
  renderAside();
}

/* ============================================================
   ONBOARDING — real, first-visit only (persists to av-suite-ui.v1),
   reopenable from the header Setup button.
   ============================================================ */
function renderOnboardStep(){
  $('obBody').innerHTML='<p class="lead">Name this show before passing context to a tool. Set the phase, venue, operator, and offline cache from the dashboard when you need them.</p>'
    +'<div class="ob-field"><label for="obShowName">Show name</label><input id="obShowName" type="text" maxlength="120" required placeholder="e.g. Spring Gala 2026" aria-describedby="obNameError"></div>'
    +'<p id="obNameError" role="alert" hidden>Enter a show name to continue, or skip setup to browse without one.</p>';
  $('obShowName').value=state.showName;
  $('obShowName').addEventListener('input',function(){this.removeAttribute('aria-invalid');$('obNameError').hidden=true;});
}
function openOnboarding(){obState.step=1;obState.lastFocus=document.activeElement;setModalBackgroundInert(true);$('onboardOverlay').hidden=false;renderOnboardStep();setTimeout(function(){var first=$('obShowName')||$('obCloseBtn');if(first) first.focus();},0);}
function closeOnboarding(){var restoreTo=obState.lastFocus;obState.step=0;obState.lastFocus=null;$('onboardOverlay').hidden=true;setModalBackgroundInert(false);uiState.onboardingSeen=true;writeUi({onboardingSeen:true});renderAll();if(restoreTo&&restoreTo.focus) restoreTo.focus();}
function obNext(){var input=$('obShowName');var name=input.value.trim();if(!name){input.setAttribute('aria-invalid','true');$('obNameError').hidden=false;input.focus();return;}state.showName=name;saveState();closeOnboarding();}

/* ============================================================
   QUICK SWITCHER — same ranking engine as the previous console,
   extended with commands for the new family/context/theme model.
   ============================================================ */
function recordCommand(id){if(!commandIdAllowed(id)) return;if(entryState.mode==='toolbox'){toolboxState.commandRecent=toolboxState.commandRecent.filter(function(i){return i!==id;});toolboxState.commandRecent.unshift(id);toolboxState.commandRecent=toolboxState.commandRecent.slice(0,10);saveToolboxState();return;}state.commandRecent=state.commandRecent.filter(function(i){return i!==id;});state.commandRecent.unshift(id);state.commandRecent=state.commandRecent.slice(0,10);saveState();}
function commandEntry(id,title,detail,kind,run,search,priority,badge){return {id:id,title:title,detail:detail,kind:kind,run:run,search:[title,detail,kind,search||''].join(' '),priority:priority||100,badge:badge||''};}
function toolboxCommandPool(){var items=[];items.push(commandEntry('action:showShow','Open Show Console','Open the Show Console with saved profile and phase context','Action',function(){navigateEntry('show');},'attach show console',10));items.push(commandEntry('action:openDoorway','Choose doorway','Reopen the AV Suite doorway chooser','Action',openEntryChooser,'doorway default entry',12));items.push(commandEntry('action:toolboxAll','Show all tools',TOOLS.length+' registered tools across '+FAMILIES.length+' families','Filter',function(){toolboxState.filter='all';toolboxState.family='all';saveToolboxState();renderAll();},'all registry',14));items.push(commandEntry('action:toolboxFeatured','Show Use anytime',TOOLBOX_FEATURED.length+' registry-featured cold-start tools','Filter',function(){toolboxState.filter='featured';toolboxState.family='all';saveToolboxState();renderAll();},'featured anytime',16));items.push(commandEntry('action:toolboxPinned','Show pinned',toolboxState.pinned.length+' Toolbox pins','Filter',function(){toolboxState.filter='pinned';saveToolboxState();renderAll();},'pins favorites',18));items.push(commandEntry('action:toolboxRecent','Show recent',toolboxState.recent.length+' recent Toolbox launches','Filter',function(){toolboxState.filter='recent';saveToolboxState();renderAll();},'history recents',20));items.push(commandEntry('action:showOffice','Open Front Office roadmap','Conceptual only · no Front Office persistence','Roadmap',function(){setContext('office');},'clients venues templates concept',24,'Concept'));FAMILIES.forEach(function(family,index){items.push(commandEntry('family:'+family.id,'Browse family: '+family.label,family.toolIds.length+' tools · '+family.depts,'Family',function(){selectFamily(family.id);},family.label+' '+family.depts,40+index));});TOOLS.forEach(function(tool){var priority=90;var flags=[];if(tool.toolboxFeatured){priority-=28;flags.push('use anytime');}if(toolboxState.pinned.indexOf(tool.id)>=0){priority-=18;flags.push('pinned');}if(toolboxState.recent.indexOf(tool.id)>=0){priority-=12;flags.push('recent');}items.push(commandEntry('tool:'+tool.id,'Open '+tool.name,tool.dept+' | '+tool.tag+(flags.length?' | '+flags.join(', '):''),'Tool',function(){openTool(tool.id);},[tool.name,tool.dept,tool.tag,tool.desc,(tool.phases||[]).join(' ')].join(' '),priority,tool.toolboxFeatured?'Anytime':''));});return items;}
function commandPool(){
  if(entryState.mode==='toolbox') return toolboxCommandPool();
  var items=[];var counts=readinessCounts();var recommended=recommendedTools();var recommendedIds=recommended.map(function(t){return t.id;});var first=recommended[0];
  reviewQueueItems().forEach(function(item,index){items.push(commandEntry('review:'+index,item.label,item.detail,'Review',function(){handleReviewAction(item.action);if(item.tool) openTool(item.tool.id);},item.tool?item.tool.name:'',10+index));});
  if(first) items.push(commandEntry('action:openRecommended','Open recommended tool',first.name+' for '+phaseLabel(state.phase),'Action',function(){openTool(first.id);},first.dept+' '+first.tag,22));
  items.push(commandEntry('action:copyPhaseGate','Copy phase gate',phaseLabel(state.phase)+' recommended tool readiness','Action',function(){copyPhaseGate();},'phase gate checklist current recommendations',23));
  items.push(commandEntry('action:copyPhaseHandoff','Copy phase handoff',phaseLabel(state.phase)+' status packet with actions and links','Action',function(){copyPhaseHandoff();},'handoff status copy',24));
  items.push(commandEntry('action:copySuiteLink','Copy suite link','Show profile and current phase URL','Action',function(){copySuiteLink();},'suite link show profile phase URL',26));
  items.push(commandEntry('action:copyReviewQueue','Copy review queue',reviewQueueItems().length+' prioritized actions','Action',function(){copyReviewQueue();},'review queue next actions',28));
  items.push(commandEntry('action:copyLaunchList','Copy launch list',recommended.length+' current phase recommendations','Action',function(){copyLaunchList();},'launch links recommended',30));
  items.push(commandEntry('action:scanSavedData','Scan saved tool data',savedToolCount()+' tools have saved data now','Action',scanSavedToolData,'saved browser data issue scan',32));
  items.push(commandEntry('action:markRecommendedReady','Mark recommended ready',recommended.length+' current phase tools','Action',markRecommendedReady,'ready phase recommendations',34));
  items.push(commandEntry('action:showIssues','View: issues only',counts.issue+' tools marked Issue','View',function(){state.filters.pin='issues';setView('all');},'issue tools',36,'Issue'));
  items.push(commandEntry('action:showNotes','View: notes only',TOOLS.filter(function(t){return toolNote(t.id);}).length+' tools have notes','View',function(){state.filters.pin='notes';setView('all');},'notes handoff',38,'Notes'));
  items.push(commandEntry('action:pinRecommended','Pin recommended set',recommended.length+' tools for '+phaseLabel(state.phase),'Action',pinRecommended,'pin current phase',42));
  items.push(commandEntry('action:exportPackage','Export show package',packageToolData().length+' saved tool entries','Action',function(){exportPackage();},'backup transfer package',44));
  items.push(commandEntry('action:exportSuite','Export suite JSON','Profile, filters, readiness, notes, and recent commands','Action',function(){exportSuite();},'backup preferences json',46));
  items.push(commandEntry('action:cacheAvTools','Cache AV tools',offlineState.cached+'/'+offlineState.total+' files ready','Action',function(){cacheAvTools(false);},'offline cache tools network',48,offlineState.cache));
  items.push(commandEntry('action:refreshOfflineCache','Refresh offline cache','Reload the AV by Dave cache from the current site','Action',function(){cacheAvTools(true);},'offline cache refresh network',50));
  items.push(commandEntry('action:clearOfflineCache','Clear offline cache','Remove cached AV by Dave files from this browser','Action',function(){clearOfflineCache();},'offline cache clear browser',52));
  items.push(commandEntry('action:openSettings','Open operator settings','Density, theme, citations, backup, danger zone','Action',openDrawer,'settings drawer preferences',54));
  items.push(commandEntry('action:toggleHelp',uiState.help?'Turn off help mode':'Turn on help mode','Numbered legend for every panel','Action',toggleHelp,'help mode legend',56));
  items.push(commandEntry('action:openOnboarding','Reopen guided setup','Name the show, pick a phase, pin your kit, go offline-safe','Action',openOnboarding,'onboarding setup wizard',57));
  items.push(commandEntry('action:toggleCitations',uiState.showCitations?'Hide source citations':'Show source citations','Recommendation and sub-module cite lines','Action',function(){toggleCitations(!uiState.showCitations);},'citations trust sources',57));
  items.push(commandEntry('action:cycleBrand','Cycle design theme','SBD → Industry → Borland DOS','Action',cycleBrand,'theme brand industry dos sbd',59));
  items.push(commandEntry('action:showShow','Switch to Show context','Back to the current show file','Action',function(){setContext('show');},'show context',60));
  items.push(commandEntry('action:showShop','Open AV Toolbox','Every registered tool · no show attached','Action',function(){setContext('shop');},'toolbox registry no show',61));
  items.push(commandEntry('action:showOffice','Switch to Front Office','Clients, venues, templates — no show file','Action',function(){setContext('office');},'office context clients',62));
  items.push(commandEntry('action:viewAll','View: all tools','Every tool grouped by family','View',function(){setView('all');},'all tools grid registry',63));
  PHASES.forEach(function(phase,index){items.push(commandEntry('phase:'+phase.id,'Switch phase: '+phase.label,(RECOMMENDED[phase.id]||[]).length+' recommended tools','Phase',function(){setPhase(phase.id);},phase.id+' '+phase.label,66+index));});
  FAMILIES.forEach(function(fam,index){items.push(commandEntry('family:'+fam.id,'Browse family: '+fam.label,fam.toolIds.length+' tools · '+fam.depts,'Family',function(){selectFamily(fam.id);},fam.label+' '+fam.depts,80+index));});
  [['all','All tools'],['pinned','Pinned only'],['recent','Recent only'],['ready','Ready only'],['issues','Issues only'],['skipped','Skipped only'],['notes','Notes only'],['saved','Saved data only']].forEach(function(view,index){items.push(commandEntry('view:'+view[0],'View: '+view[1],'Apply tool grid filter','View',function(){state.filters.pin=view[0];setView('all');},view.join(' '),100+index));});
  TOOLS.forEach(function(tool){
    var ready=toolReadiness(tool.id);var note=toolNote(tool.id);var saved=savedEntriesForTool(tool.id).length;var priority=115;var flags=[];
    if(recommendedIds.indexOf(tool.id)>=0){priority-=38;flags.push('recommended');}
    if(ready==='issue'){priority-=34;flags.push('issue');}
    if(note){priority-=20;flags.push('note');}
    if(state.favorites.indexOf(tool.id)>=0){priority-=14;flags.push('pinned');}
    if(state.recent.indexOf(tool.id)>=0){priority-=10;flags.push('recent');}
    if(saved){priority-=8;flags.push(saved+' saved');}
    items.push(commandEntry('tool:'+tool.id,'Open '+tool.name,tool.dept+' | '+tool.tag+' | '+readinessLabel(ready)+(flags.length?' | '+flags.join(', '):''),'Tool',function(){openTool(tool.id);},[tool.name,tool.dept,tool.tag,tool.desc,tool.phases.join(' '),note,ready].join(' '),priority,readinessLabel(ready)));
  });
  return items;
}
function commandScore(command,query){
  var terms=String(query||'').toLowerCase().split(/\s+/).filter(Boolean);var text=command.search.toLowerCase();var title=command.title.toLowerCase();
  var commandRecent=entryState.mode==='toolbox'?toolboxState.commandRecent:state.commandRecent;var recentIndex=commandRecent.indexOf(command.id);var score=command.priority+(recentIndex>=0?recentIndex-60:0);
  if(!terms.length) return score;
  terms.forEach(function(term){var index=text.indexOf(term);if(index<0){score=99999;return;}score+=index;if(title.indexOf(term)===0) score-=25;});
  return score;
}
function filteredCommands(){var query=commandState.query;return commandPool().map(function(command,index){return {command:command,score:commandScore(command,query),index:index};}).filter(function(e){return e.score<99999;}).sort(function(a,b){return a.score-b.score||a.index-b.index;}).slice(0,14).map(function(e){return e.command;});}
function renderCommandPalette(){
  var input=$('commandInput');var list=$('commandList');var counts=readinessCounts();var items=filteredCommands();commandState.items=items;
  if(commandState.activeIndex>=items.length) commandState.activeIndex=Math.max(0,items.length-1);
  $('commandStatus').textContent=entryState.mode==='toolbox'?('Toolbox | '+TOOLS.length+' tools | No show attached'):(phaseLabel(state.phase)+' phase | '+counts.issue+' issue | '+reviewQueueItems().length+' next actions');
  if(input&&input.value!==commandState.query) input.value=commandState.query;
  if(!items.length){list.innerHTML='<div class="aside-empty">No matching command.</div>';input.removeAttribute('aria-activedescendant');return;}
  list.innerHTML=items.map(function(command,index){
    var active=index===commandState.activeIndex;var badge=command.badge?'<span class="cmdk-badge">'+escapeHtml(command.badge)+'</span>':'';
    return '<div id="command-option-'+index+'" class="cmdk-row '+(active?'is-active':'')+'" role="option" aria-selected="'+String(active)+'" data-command-index="'+index+'"><div class="cmdk-kind">'+escapeHtml(command.kind)+'</div><div><strong>'+escapeHtml(command.title)+'</strong><span>'+escapeHtml(command.detail)+'</span></div>'+badge+'</div>';
  }).join('');
  input.setAttribute('aria-activedescendant','command-option-'+commandState.activeIndex);
}
function openCommandPalette(){commandState.open=true;commandState.query='';commandState.activeIndex=0;commandState.lastFocus=document.activeElement;setModalBackgroundInert(true);$('commandBackdrop').hidden=false;renderCommandPalette();setTimeout(function(){$('commandInput').focus();},0);}
function closeCommandPalette(){commandState.open=false;commandState.query='';$('commandBackdrop').hidden=true;setModalBackgroundInert(false);if(commandState.lastFocus&&commandState.lastFocus.focus) commandState.lastFocus.focus();}
function moveCommandSelection(delta){if(!commandState.items.length) return;commandState.activeIndex=(commandState.activeIndex+delta+commandState.items.length)%commandState.items.length;renderCommandPalette();}
function runCommand(command){if(!command) return;recordCommand(command.id);closeCommandPalette();command.run();}

/* ============================================================
   DENSITY
   ============================================================ */
function applyDensity(mode,persist){
  var compact=mode==='compact';uiState.density=compact?'compact':'comfortable';
  $('avApp').classList.toggle('compact',compact);
  var toggle=$('densityToggle');
  if(toggle) Array.prototype.forEach.call(toggle.querySelectorAll('[data-density]'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-density')===uiState.density));});
  if(persist) writeUi({density:uiState.density});
}

/* ============================================================
   OPERATOR SETTINGS DRAWER
   ============================================================ */
var drawerLastFocus=null;
function setDrawerInteractive(active){var drawer=$('settingsDrawer');if(active) drawer.removeAttribute('inert');else drawer.setAttribute('inert','');}
function openDrawer(){
  drawerLastFocus=document.activeElement;
  setDrawerInteractive(true);
  setModalBackgroundInert(true);
  var scrim=$('drawerScrim'),drawer=$('settingsDrawer');
  scrim.hidden=false;window.requestAnimationFrame(function(){scrim.classList.add('open');drawer.classList.add('open');});
  drawer.setAttribute('aria-hidden','false');$('settingsBtn').setAttribute('aria-expanded','true');
  renderPhaseHandoffSummary();renderOfflineStatus();
  var f=drawer.querySelector('button, [href], input, select, textarea');if(f) f.focus();
}
function closeDrawer(){
  var scrim=$('drawerScrim'),drawer=$('settingsDrawer');
  /* Focus must leave the drawer before it is marked aria-hidden/inert —
     doing it after triggers a browser warning for hiding an ancestor of
     the still-focused element. blur() first guarantees focus is gone
     even when the fallback target (drawerLastFocus) is not focusable. */
  var restoreTo=(drawerLastFocus&&drawerLastFocus.focus&&!drawer.contains(drawerLastFocus))?drawerLastFocus:$('settingsBtn');
  if(drawer.contains(document.activeElement)&&document.activeElement.blur) document.activeElement.blur();
  scrim.classList.remove('open');drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');$('settingsBtn').setAttribute('aria-expanded','false');
  window.setTimeout(function(){scrim.hidden=true;},220);
  setDrawerInteractive(false);
  setModalBackgroundInert(false);
  if(restoreTo&&restoreTo.focus) restoreTo.focus();
}
function renderPhaseHandoffSummary(){var target=$('phaseHandoffSummary');if(!target) return;var counts=readinessCounts();target.innerHTML='<strong>'+phaseLabel(state.phase)+' handoff:</strong> '+counts.ready+' ready, '+counts.issue+' issue, '+counts.skipped+' skipped, '+reviewQueueItems().length+' next actions.';}

/* ============================================================
   EVENT WIRING + INIT
   ============================================================ */
function wireEvents(){
  /* header */
  $('ctxShowBtn').addEventListener('click',function(){setContext('show');});
  $('ctxShopBtn').addEventListener('click',function(){setContext('shop');});
  $('ctxOfficeBtn').addEventListener('click',function(){setContext('office');});
  $('brandCycleBtn').addEventListener('click',cycleBrand);
  $('modeToggleBtn').addEventListener('click',toggleMode);
  $('helpBtn').addEventListener('click',toggleHelp);
  $('doorwayBtn').addEventListener('click',openEntryChooser);
  $('setupBtn').addEventListener('click',openOnboarding);
  $('settingsBtn').addEventListener('click',openDrawer);
  $('searchBtn').addEventListener('click',openCommandPalette);
  $('phaseStrip').addEventListener('click',function(e){var b=e.target.closest('[data-phase]');if(b) setPhase(b.getAttribute('data-phase'));});
  $('mobFamStrip').addEventListener('click',function(e){var b=e.target.closest('[data-fam-select]');if(b) selectFamily(b.getAttribute('data-fam-select'));});

  /* rail */
  $('railRecentBtn').addEventListener('click',function(){if(entryState.mode==='toolbox'){toolboxState.filter='recent';saveToolboxState();viewState.context='shop';renderAll();return;}state.filters.pin='recent';saveState();setView('all');});
  $('railAllBtn').addEventListener('click',function(){if(entryState.mode==='toolbox'){toolboxState.filter='all';toolboxState.family='all';saveToolboxState();viewState.context='shop';renderAll();return;}state.filters.pin='all';saveState();setView('all');});
  $('railShopBtn').addEventListener('click',function(){setContext('shop');});
  $('railOfficeBtn').addEventListener('click',function(){setContext('office');});

  /* profile */
  ['pfShowName','pfVenue','pfDate','pfOperator'].forEach(function(id){$(id).addEventListener('input',syncProfile);});

  /* main */
  $('markAllReadyBtn').addEventListener('click',markRecommendedReady);
  $('allSearchInput').addEventListener('input',function(){state.filters.search=this.value;saveState();renderAllView();});

  /* global delegated actions */
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[data-tool]');if(a){rememberTool(a.getAttribute('data-tool'));}
    var open=e.target.closest('[data-open]');if(open){openTool(open.getAttribute('data-open'));return;}
    var pin=e.target.closest('[data-pin]');if(pin){togglePin(pin.getAttribute('data-pin'));return;}
    var review=e.target.closest('[data-review-action]');if(review){handleReviewAction(review.getAttribute('data-review-action'));return;}
    var famSel=e.target.closest('[data-fam-select]');if(famSel){selectFamily(famSel.getAttribute('data-fam-select'));return;}
    var famTog=e.target.closest('[data-fam-toggle]');if(famTog){toggleFamOpen(famTog.getAttribute('data-fam-toggle'));return;}
    var subTog=e.target.closest('[data-sub-toggle]');if(subTog){toggleSubsOpen(subTog.getAttribute('data-sub-toggle'));return;}
    var clearBtn=e.target.closest('#clearFiltersBtn');if(clearBtn){clearToolFilters();return;}
    var backToShow=e.target.closest('[data-action="back-to-show"]');if(backToShow){navigateEntry('show');return;}
    var toolboxClear=e.target.closest('#toolboxClearBtn');if(toolboxClear){toolboxState.search='';toolboxState.filter='all';toolboxState.family='all';saveToolboxState();renderRail();renderToolbox();return;}
  });
  document.addEventListener('change',function(e){var sel=e.target.closest('[data-readiness]');if(sel){setToolReadiness(sel.getAttribute('data-readiness'),sel.value);return;}var note=e.target.closest('[data-note]');if(note) setToolNote(note.getAttribute('data-note'),note.value,true);});
  document.addEventListener('input',function(e){var note=e.target.closest('[data-note]');if(note) setToolNote(note.getAttribute('data-note'),note.value,false);});

  /* drawer */
  $('closeSettingsBtn').addEventListener('click',closeDrawer);
  $('drawerScrim').addEventListener('click',closeDrawer);
  $('settingsDrawer').addEventListener('keydown',function(e){
    if(e.key!=='Tab'||!$('settingsDrawer').classList.contains('open')) return;
    var f=$('settingsDrawer').querySelectorAll('button:not([disabled]), [href], input:not([type="file"]), select, textarea');
    if(!f.length) return;var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  $('densityToggle').addEventListener('click',function(e){var b=e.target.closest('[data-density]');if(b) applyDensity(b.getAttribute('data-density'),true);});
  $('themeToggle').addEventListener('click',function(e){var b=e.target.closest('[data-theme-mode]');if(b) applyThemeMode(b.getAttribute('data-theme-mode'),true);});
  $('citationsToggle').addEventListener('click',function(e){var b=e.target.closest('[data-citations]');if(b) toggleCitations(b.getAttribute('data-citations')==='on');});
  $('copyPhaseHandoffBtn').addEventListener('click',function(){copyPhaseHandoff(this);});
  $('copyLaunchBtn').addEventListener('click',function(){copyLaunchList(this);});
  $('copySuiteLinkBtn').addEventListener('click',function(){copySuiteLink(this);});
  $('pinRecommendedBtn').addEventListener('click',function(){pinRecommended();signal(this);});
  $('cacheToolsBtn').addEventListener('click',function(){cacheAvTools(false,this);});
  $('refreshCacheBtn').addEventListener('click',function(){cacheAvTools(true,this);});
  $('clearCacheBtn').addEventListener('click',function(){clearOfflineCache(this);});
  $('exportSuiteBtn').addEventListener('click',function(){exportSuite(this);});
  $('importSuiteBtn').addEventListener('click',function(){$('suiteImportInput').click();});
  $('suiteImportInput').addEventListener('change',function(){var f=this.files&&this.files[0];if(f) importSuiteFile(f);this.value='';});
  $('exportPackageBtn').addEventListener('click',function(){exportPackage(this);});
  $('importPackageBtn').addEventListener('click',function(){$('packageImportInput').click();});
  $('packageImportInput').addEventListener('change',function(){var f=this.files&&this.files[0];if(f) importPackageFile(f);this.value='';});
  $('resetReadinessBtn').addEventListener('click',resetReadiness);
  $('clearPrefsBtn').addEventListener('click',clearPrefs);

  /* quick switcher */
  $('commandBackdrop').addEventListener('click',function(e){if(e.target===$('commandBackdrop')) closeCommandPalette();});
  $('commandBackdrop').addEventListener('keydown',function(e){
    var focusables=[$('commandInput'),$('closeCommandBtn')];var current=focusables.indexOf(document.activeElement);
    if(e.key!=='Tab') return;
    if(e.shiftKey&&current<=0){e.preventDefault();focusables[focusables.length-1].focus();return;}
    if(!e.shiftKey&&current===focusables.length-1){e.preventDefault();focusables[0].focus();return;}
  });
  $('commandInput').addEventListener('input',function(){commandState.query=this.value;commandState.activeIndex=0;renderCommandPalette();});
  $('commandInput').addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();moveCommandSelection(1);return;}
    if(e.key==='ArrowUp'){e.preventDefault();moveCommandSelection(-1);return;}
    if(e.key==='Enter'){e.preventDefault();runCommand(commandState.items[commandState.activeIndex]);return;}
    if(e.key==='Escape'){e.preventDefault();closeCommandPalette();}
  });
  $('commandList').addEventListener('mousemove',function(e){var row=e.target.closest('[data-command-index]');if(!row) return;var i=Number(row.getAttribute('data-command-index'));if(Number.isFinite(i)&&i!==commandState.activeIndex){commandState.activeIndex=i;renderCommandPalette();}});
  $('commandList').addEventListener('click',function(e){var row=e.target.closest('[data-command-index]');if(!row) return;var i=Number(row.getAttribute('data-command-index'));if(Number.isFinite(i)) runCommand(commandState.items[i]);});
  $('closeCommandBtn').addEventListener('click',closeCommandPalette);

  /* onboarding */
  $('obCloseBtn').addEventListener('click',closeOnboarding);
  $('obSkipBtn').addEventListener('click',closeOnboarding);
  $('obNextBtn').addEventListener('click',obNext);
  $('onboardOverlay').addEventListener('keydown',function(e){
    if(e.key!=='Tab') return;
    var dialog=$('onboardOverlay').querySelector('.ob-dialog');
    var focusables=Array.prototype.filter.call(dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'),function(el){return !el.hidden&&el.offsetParent!==null;});
    if(!focusables.length) return;
    var first=focusables[0];var last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });

  /* doorway chooser */
  $('entryChooser').addEventListener('click',function(e){var choice=e.target.closest('[data-entry-choice]');if(choice) chooseEntry(choice.getAttribute('data-entry-choice'));});
  $('entryCloseBtn').addEventListener('click',function(){closeEntryChooser(true);});
  $('entryChooser').addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();closeEntryChooser(true);return;}if(e.key!=='Tab') return;var focusables=Array.prototype.filter.call($('entryChooser').querySelectorAll('button:not([disabled])'),function(el){return !el.hidden&&el.offsetParent!==null;});if(!focusables.length) return;var first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});

  /* global keys */
  document.addEventListener('keydown',function(e){
    var key=String(e.key||'').toLowerCase();
    if((e.metaKey||e.ctrlKey)&&key==='k'){e.preventDefault();openCommandPalette();return;}
    if(e.key!=='Escape') return;
    if(commandState.open){e.preventDefault();closeCommandPalette();return;}
    if($('settingsDrawer').classList.contains('open')){e.preventDefault();closeDrawer();return;}
    if(!$('onboardOverlay').hidden){e.preventDefault();closeOnboarding();return;}
    if(entryState.chooserOpen){e.preventDefault();closeEntryChooser(true);}
  });
  window.addEventListener('online',refreshOfflineStatus);
  window.addEventListener('offline',refreshOfflineStatus);
  window.addEventListener('popstate',handleEntryPopstate);
}

function init(){
  loadState();
  var explicitEntry=explicitEntryFromLocation();
  if(explicitEntry==='show') applyUrlContext();
  var initialEntry=resolvedEntryFromLocation();
  if(!explicitEntry&&!uiState.preferredEntry){var chooserState=Object.assign({},window.history.state||{},{avEntry:'chooser'});window.history.replaceState(chooserState,'',window.location.href);initialEntry='';}
  else {var resolvedState=Object.assign({},window.history.state||{},{avEntry:initialEntry});window.history.replaceState(resolvedState,'',window.location.href);}
  viewState.fam=defaultFamilyForPhase();
  applyDensity(uiState.density,false);
  applyShellTheme();
  wireEvents();
  if(initialEntry) applyEntryMode(initialEntry,{allowOnboarding:initialEntry==='show'});else {renderAll();openEntryChooser();}
  if(!TOOLS.length) showHint('Tool registry failed to load — refresh this page.','error');
  registerOfflineWorker().then(function(){renderAll();});
}
init();

})();
