/* System by Dave — AV application rail runtime.
   Consumers supply a registry, storage, container, and callbacks. */
(function(root){
  'use strict';

  var STORAGE_KEY='sbd.rail.v1';
  var PREFERENCE_VERSION=1;
  var REFERENCE_PATTERN=/^(console|tool|external):[^:]+$/;
  var STATIC_ICONS={
    toolbox:['M2 7h20v13H2z','M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2','M2 12h20','M10 12v3h4v-3'],
    all:['M3.4 3.4h3.2v3.2H3.4z','M10.4 3.4h3.2v3.2h-3.2z','M17.4 3.4h3.2v3.2h-3.2z','M3.4 10.4h3.2v3.2H3.4z','M10.4 10.4h3.2v3.2h-3.2z','M17.4 10.4h3.2v3.2h-3.2z','M3.4 17.4h3.2v3.2H3.4z','M10.4 17.4h3.2v3.2h-3.2z','M17.4 17.4h3.2v3.2h-3.2z'],
    customize:['M4 21v-7','M4 10V3','M12 21v-9','M12 8V3','M20 21v-5','M20 12V3','M2 14h4','M10 8h4','M18 16h4'],
    tool:['M4 4h16v16H4z','M8 9h8','M8 13h5'],
    external:['M10 5H5v14h14v-5','M13 3h8v8','M21 3 11 13'],
    throwline:['M3 5h18v10H3z','M8 19h8','M12 15v4','M9 9h6'],
    ledwall:['M3 3h8v8H3z','M13 3h8v8h-8z','M3 13h8v8H3z','M13 13h8v8h-8z'],
    flow:['M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z','M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z','M18 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z','M8.5 6.5l7 4','M8.5 17.5l7-4'],
    book:['M4 19.5A2.5 2.5 0 0 1 6.5 17H20','M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
    teleprompter:['M3 6h18v10H3z','M8 20h8','M12 16v4','M7 10h10','M7 13h6'],
    clock:['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M12 6v6l4 2'],
    list:['M8 6h13','M8 12h13','M8 18h13','M3 6h.01','M3 12h.01','M3 18h.01'],
    pixelforge:['M3 3h7v7H3z','M14 3h7v7h-7z','M3 14h7v7H3z','M17 14v7','M14 17h7'],
    floorplan:['M3 3h18v18H3z','M3 9h18','M9 9v12'],
    bookOpen:['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z','M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
    sync:['M3 12a9 9 0 0 1 15.5-6.4L21 8','M21 3v5h-5','M21 12a9 9 0 0 1-15.5 6.4L3 16','M8 16H3v5'],
    search:['M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z','m21 21-4.3-4.3'],
    signal:['M5 12.55a11 11 0 0 1 14.08 0','M8.53 16.11a6 6 0 0 1 6.95 0','M12 20h.01']
  };

  function iconPaths(icon,fallback){
    if(Array.isArray(icon)&&icon.length) return icon.slice();
    if(typeof icon==='string'&&Array.isArray(STATIC_ICONS[icon])&&STATIC_ICONS[icon].length) return STATIC_ICONS[icon].slice();
    return (fallback||STATIC_ICONS.tool).slice();
  }

  function guideEntryShape(guide){
    return {
      ref:'guide:'+guide.id,
      namespace:'guide',
      id:guide.id,
      label:guide.name,
      icon:iconPaths(guide.icon,guide.external?STATIC_ICONS.external:STATIC_ICONS.tool),
      availability:'available',
      pinnable:false,
      navigable:true,
      href:guide.href,
      external:!!guide.external,
      source:guide
    };
  }

  function registryOrDefault(registry){return registry||root.SBD_REGISTRY||{};}

  function defaultPinned(registry){
    registry=registryOrDefault(registry);
    return registry.rail&&Array.isArray(registry.rail.defaultPinned)?registry.rail.defaultPinned.slice():[];
  }

  function dedupe(references){
    var seen=Object.create(null);
    var result=[];
    references.forEach(function(reference){
      if(seen[reference]) return;
      seen[reference]=true;
      result.push(reference);
    });
    return result;
  }

  function exactById(list,id){
    list=Array.isArray(list)?list:[];
    for(var i=0;i<list.length;i++){if(list[i]&&list[i].id===id) return list[i];}
    return null;
  }

  function resolveRef(reference,registry){
    registry=registryOrDefault(registry);
    reference=String(reference||'');
    if(!REFERENCE_PATTERN.test(reference)) return null;
    var separator=reference.indexOf(':');
    var namespace=reference.slice(0,separator);
    var id=reference.slice(separator+1);
    var item=null;
    var tool=null;

    if(namespace==='console'){
      item=exactById(registry.consoles,id);
      if(!item) return null;
      tool=item.toolId?exactById(registry.tools,item.toolId):null;
      return {
        ref:reference,
        namespace:namespace,
        id:id,
        label:item.label,
        icon:Array.isArray(item.icon)?item.icon.slice():[],
        availability:item.availability,
        pinnable:true,
        navigable:item.availability==='available'&&!!(tool&&tool.href),
        href:item.availability==='available'&&tool?tool.href:null,
        source:item
      };
    }

    if(namespace==='tool'){
      tool=exactById(registry.tools,id);
      if(!tool) return null;
      return {ref:reference,namespace:namespace,id:id,label:tool.name,icon:iconPaths(tool.icon,STATIC_ICONS.tool),availability:'available',pinnable:true,navigable:!!tool.href,href:tool.href||null,source:tool};
    }

    if(namespace==='external'){
      item=typeof registry.externalById==='function'?registry.externalById(id):exactById(registry.externals,id);
      if(!item||item.id!==id) return null;
      return {
        ref:reference,
        namespace:namespace,
        id:id,
        label:item.label,
        icon:Array.isArray(item.icon)&&item.icon.length?item.icon.slice():STATIC_ICONS.external.slice(),
        availability:item.kind==='handoff'?'available':'status',
        pinnable:item.kind==='handoff'&&!!item.destination,
        navigable:item.kind==='handoff'&&!!item.destination,
        href:item.destination||null,
        badge:item.badge||'',
        source:item
      };
    }

    return null;
  }

  function stateFromPinned(status,pinned,registry,extra){
    var visible=[];
    var suppressed=[];
    var rejected=[];
    pinned.forEach(function(reference){
      var entry=resolveRef(reference,registry);
      if(entry&&entry.pinnable) visible.push(reference);
      else if(entry) rejected.push(reference);
      else suppressed.push(reference);
    });
    var state={
      status:status,
      version:PREFERENCE_VERSION,
      pinned:pinned.slice(),
      visibleRefs:visible,
      suppressedRefs:suppressed,
      rejectedRefs:rejected,
      resetRequired:false,
      message:''
    };
    if(extra){Object.keys(extra).forEach(function(key){state[key]=extra[key];});}
    return state;
  }

  function fallbackState(status,registry,raw,message,resetRequired){
    return stateFromPinned(status,defaultPinned(registry),registry,{
      raw:raw,
      message:message,
      resetRequired:!!resetRequired
    });
  }

  function parsePreferences(raw,registry){
    registry=registryOrDefault(registry);
    if(raw===null||typeof raw==='undefined') return fallbackState('default',registry,null,'',false);

    var parsed;
    try{parsed=JSON.parse(String(raw));}
    catch(error){return fallbackState('unreadable',registry,String(raw),'Rail preferences could not be read. Reset is required before customization.',true);}

    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||parsed.version!==PREFERENCE_VERSION){
      return fallbackState('unsupported',registry,String(raw),'This rail preference version is not supported. Reset is required before customization.',true);
    }
    if(!Array.isArray(parsed.pinned)||parsed.pinned.some(function(reference){return typeof reference!=='string'||!REFERENCE_PATTERN.test(reference);})){
      return fallbackState('unreadable',registry,String(raw),'Rail preferences contain invalid entries. Reset is required before customization.',true);
    }
    return stateFromPinned('saved',dedupe(parsed.pinned),registry,{raw:String(raw),message:''});
  }

  function createPreferenceStore(options){
    options=options||{};
    var registry=registryOrDefault(options.registry);
    var storage=options.storage;
    var sessionState=null;
    if(typeof storage==='undefined'){
      try{storage=root.localStorage||null;}catch(error){storage=null;}
    }

    function read(){
      if(sessionState) return sessionState;
      if(!storage||typeof storage.getItem!=='function') return fallbackState('unavailable',registry,null,'Rail preferences are unavailable in this browser.',false);
      try{return parsePreferences(storage.getItem(STORAGE_KEY),registry);}
      catch(error){return fallbackState('unavailable',registry,null,'Rail preferences are unavailable in this browser.',false);}
    }

    function writePinned(pinned,previous){
      var payload={version:PREFERENCE_VERSION,pinned:dedupe(pinned)};
      var raw=JSON.stringify(payload);
      var attempted=stateFromPinned('unsaved',payload.pinned,registry,{
        raw:raw,
        message:'Rail preferences could not be saved. This arrangement is available for this session only.',
        persisted:false
      });
      try{
        if(!storage||typeof storage.setItem!=='function') throw new Error('Storage unavailable');
        storage.setItem(STORAGE_KEY,raw);
        sessionState=parsePreferences(raw,registry);
        return {ok:true,changed:true,state:sessionState};
      }catch(error){
        sessionState=attempted;
        return {ok:false,changed:true,code:'storage-error',message:attempted.message,state:sessionState,previousState:previous};
      }
    }

    function editableState(){
      var state=read();
      if(state.resetRequired) return {ok:false,changed:false,code:'reset-required',message:state.message,state:state};
      if(state.status==='unavailable') return {ok:false,changed:false,code:'storage-unavailable',message:state.message,state:state};
      return {ok:true,state:state};
    }

    function orderedWithSuppressed(visible,suppressed){return dedupe(visible.concat(suppressed));}

    function pin(reference,index){
      var current=editableState();
      if(!current.ok) return current;
      var entry=resolveRef(reference,registry);
      if(!entry||!entry.pinnable) return {ok:false,changed:false,code:'not-pinnable',message:'That rail entry cannot be pinned.',state:current.state};
      var visible=current.state.visibleRefs.slice();
      if(visible.indexOf(reference)!==-1) return {ok:true,changed:false,state:current.state};
      if(typeof index==='undefined') index=visible.length;
      if(!Number.isInteger(index)||index<0||index>visible.length) return {ok:false,changed:false,code:'invalid-index',message:'The requested pin position is invalid.',state:current.state};
      visible.splice(index,0,reference);
      return writePinned(orderedWithSuppressed(visible,current.state.suppressedRefs),current.state);
    }

    function unpin(reference){
      var current=editableState();
      if(!current.ok) return current;
      var visible=current.state.visibleRefs.slice();
      var index=visible.indexOf(reference);
      if(index===-1) return {ok:true,changed:false,state:current.state};
      visible.splice(index,1);
      return writePinned(orderedWithSuppressed(visible,current.state.suppressedRefs),current.state);
    }

    function move(reference,index){
      var current=editableState();
      if(!current.ok) return current;
      var visible=current.state.visibleRefs.slice();
      var from=visible.indexOf(reference);
      if(from===-1) return {ok:false,changed:false,code:'not-pinned',message:'That rail entry is not pinned.',state:current.state};
      if(!Number.isInteger(index)||index<0||index>=visible.length) return {ok:false,changed:false,code:'invalid-index',message:'The requested rail position is invalid.',state:current.state};
      if(from===index) return {ok:true,changed:false,state:current.state};
      visible.splice(from,1);
      visible.splice(index,0,reference);
      return writePinned(orderedWithSuppressed(visible,current.state.suppressedRefs),current.state);
    }

    function reset(){return writePinned(defaultPinned(registry),read());}

    return {key:STORAGE_KEY,version:PREFERENCE_VERSION,read:read,pin:pin,unpin:unpin,move:move,reset:reset,resolve:function(reference){return resolveRef(reference,registry);}};
  }

  function svgIcon(documentRef,paths){
    var svg=documentRef.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('class','sbd-rail__icon');
    (paths||[]).forEach(function(data){
      var path=documentRef.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',data);
      svg.appendChild(path);
    });
    return svg;
  }

  function labelSpan(documentRef,label){
    var span=documentRef.createElement('span');
    span.className='sbd-rail__label';
    span.textContent=label;
    return span;
  }

  function actionButton(documentRef,label,icon,handler,className){
    var button=documentRef.createElement('button');
    button.type='button';
    button.className='sbd-rail__action '+className;
    button.setAttribute('data-label',label);
    button.setAttribute('title',label);
    button.appendChild(svgIcon(documentRef,icon));
    button.appendChild(labelSpan(documentRef,label));
    if(typeof handler==='function') button.addEventListener('click',handler);
    else button.disabled=true;
    return button;
  }

  function railEntry(documentRef,entry,currentRef,onNavigate,resolveHref){
    var planned=entry.namespace==='console'&&entry.availability==='planned';
    var element=documentRef.createElement(planned?'div':'a');
    element.className='sbd-rail__entry'+(planned?' is-planned':'');
    element.setAttribute('data-rail-ref',entry.ref);
    element.setAttribute('data-label',entry.label+(planned?' — Planned':''));
    element.setAttribute('title',entry.label+(planned?' — Planned':''));
    element.appendChild(svgIcon(documentRef,entry.icon));
    element.appendChild(labelSpan(documentRef,entry.label));

    if(planned){
      element.setAttribute('tabindex','0');
      element.setAttribute('role','note');
      element.setAttribute('aria-label',entry.label+'. Planned.');
      element.setAttribute('data-status','planned');
      var shortStatus=documentRef.createElement('span');
      shortStatus.className='sbd-rail__status-short';
      shortStatus.setAttribute('aria-hidden','true');
      shortStatus.textContent='P';
      element.appendChild(shortStatus);
      var status=documentRef.createElement('span');
      status.className='sbd-rail__status';
      status.textContent='Planned';
      element.appendChild(status);
      return element;
    }

    var href=typeof resolveHref==='function'?resolveHref(entry):entry.href;
    element.setAttribute('href',href||entry.href);
    if(entry.namespace==='external'||entry.external) element.setAttribute('rel','noopener noreferrer');
    if(entry.external) element.setAttribute('target','_blank');
    if(entry.ref===currentRef) element.setAttribute('aria-current','page');
    if(typeof onNavigate==='function') element.addEventListener('click',function(event){onNavigate(entry,event);});
    return element;
  }

  function sectionHeading(documentRef,label){
    var heading=documentRef.createElement('h2');
    heading.className='sbd-rail__heading';
    heading.textContent=label;
    return heading;
  }

  function entryBlurb(documentRef,element,blurb,badge){
    if(blurb){
      var small=documentRef.createElement('small');
      small.className='sbd-rail__blurb';
      small.textContent=blurb;
      var children=element.children||[];
      for(var i=0;i<children.length;i++){
        if(String(children[i].className||'').indexOf('sbd-rail__label')!==-1){children[i].appendChild(small);break;}
      }
    }
    if(badge){
      var mark=documentRef.createElement('span');
      mark.className='sbd-rail__badge';
      mark.textContent=badge;
      element.appendChild(mark);
      var currentTitle=element.getAttribute('title')||element.getAttribute('data-label')||'';
      element.setAttribute('title',currentTitle?currentTitle+' · '+badge:badge);
      var aria=element.getAttribute('aria-label');
      if(aria&&aria.indexOf(badge)===-1) element.setAttribute('aria-label',aria+' · '+badge);
    }
    return element;
  }

  function panelButton(documentRef,item,onOpenPanel){
    var button=documentRef.createElement('button');
    button.type='button';
    button.className='sbd-rail__entry sbd-rail__entry--featured';
    button.setAttribute('data-rail-ref','panel:'+item.type);
    button.setAttribute('data-label',item.label);
    button.appendChild(svgIcon(documentRef,iconPaths(item.icon,STATIC_ICONS.tool)));
    button.appendChild(labelSpan(documentRef,item.label));
    entryBlurb(documentRef,button,item.blurb,'');
    button.addEventListener('click',function(){
      if(typeof onOpenPanel==='function') onOpenPanel(item.type);
    });
    return button;
  }

  function rememberRecent(storage,key,item){
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||!key||!item||!item.ref) return;
    var parsed={version:1,items:[]};
    try{parsed=JSON.parse(storage.getItem(key)||'{"version":1,"items":[]}');}catch(error){parsed={version:1,items:[]};}
    var items=Array.isArray(parsed.items)?parsed.items.filter(function(entry){return entry&&entry.ref&&entry.ref!==item.ref;}):[];
    items.unshift({ref:item.ref,label:item.label,detail:item.detail||''});
    try{storage.setItem(key,JSON.stringify({version:1,items:items.slice(0,3)}));}catch(error){/* Recent is optional. */}
  }

  function readRecent(storage,key){
    if(!storage||typeof storage.getItem!=='function'||!key) return [];
    try{
      var parsed=JSON.parse(storage.getItem(key)||'');
      return parsed&&Array.isArray(parsed.items)?parsed.items.slice(0,3):[];
    }catch(error){return [];}
  }

  function searchHits(registry,query,panels){
    var q=String(query||'').trim().toLowerCase();
    if(q.length<1) return [];
    var hits=[];
    var seen={};
    function add(hit){
      var key=hit.ref||hit.type||hit.label;
      if(seen[key]) return;
      var hay=[hit.label,hit.blurb,hit.keywords].join(' ').toLowerCase();
      if(hay.indexOf(q)===-1) return;
      seen[key]=true;
      hits.push(hit);
    }
    (panels||[]).forEach(function(panel){
      add({kind:'panel',type:panel.type,ref:'panel:'+panel.type,label:panel.name,blurb:panel.app||panel.description||'',keywords:[panel.keywords,panel.description,panel.app].join(' ')});
    });
    (registry.guides||[]).forEach(function(guide){
      add({kind:'guide',ref:'guide:'+guide.id,label:guide.name,blurb:guide.blurb||'Opens page',keywords:(guide.keywords||[]).join(' '),href:guide.href,external:!!guide.external,badge:guide.badge||''});
    });
    (registry.tools||[]).forEach(function(tool){
      if(tool.retired) return;
      add({kind:'tool',ref:'tool:'+tool.id,label:tool.name,blurb:tool.desc||'',keywords:(tool.keywords||[]).join(' '),href:tool.href});
    });
    (registry.consoles||[]).forEach(function(item){
      add({kind:'console',ref:'console:'+item.id,label:item.label,blurb:'',keywords:item.label,href:null});
    });
    return hits.slice(0,12);
  }

  function render(container,options){
    options=options||{};
    if(!container||typeof container.replaceChildren!=='function') throw new Error('SBD_RAIL.render requires a container element.');
    var documentRef=container.ownerDocument||root.document;
    if(!documentRef||typeof documentRef.createElement!=='function') throw new Error('SBD_RAIL.render requires a document.');
    var registry=registryOrDefault(options.registry);
    var state=options.state||(options.preferenceStore&&options.preferenceStore.read())||fallbackState('default',registry,null,'',false);

    var shell=documentRef.createElement('div');
    shell.className='sbd-rail-shell';
    shell.setAttribute('data-preference-status',state.status);

    var launcher=actionButton(documentRef,'Apps',STATIC_ICONS.all,options.onAllApps,'sbd-rail-launcher');
    launcher.setAttribute('aria-haspopup','dialog');
    if(options.appsDialogId) launcher.setAttribute('aria-controls',options.appsDialogId);
    shell.appendChild(launcher);

    var nav=documentRef.createElement('nav');
    nav.className='sbd-rail';
    nav.setAttribute('aria-label','Applications');
    nav.setAttribute('data-web2-scroll','');
    nav.setAttribute('tabindex','0');

    var search=documentRef.createElement('form');
    search.className='sbd-rail__search';
    search.setAttribute('role','search');
    var searchInput=documentRef.createElement('input');
    searchInput.type='search';
    searchInput.className='sbd-rail__search-input';
    searchInput.setAttribute('aria-label','Search tools, panels, guides');
    searchInput.placeholder='Search tools, panels, guides';
    var searchHint=documentRef.createElement('kbd');
    searchHint.textContent='/';
    var searchList=documentRef.createElement('div');
    searchList.className='sbd-rail__search-results';
    searchList.hidden=true;
    search.appendChild(searchInput);
    search.appendChild(searchHint);
    search.addEventListener('submit',function(event){if(event&&event.preventDefault) event.preventDefault();});
    nav.appendChild(search);
    nav.appendChild(searchList);

    var toolbox=documentRef.createElement('a');
    toolbox.className='sbd-rail__action sbd-rail__toolbox';
    toolbox.setAttribute('href',options.toolboxHref||'av/');
    toolbox.setAttribute('data-label','Workspace');
    toolbox.setAttribute('title','Workspace');
    toolbox.setAttribute('data-rail-ref','toolbox');
    if(options.currentRef==='toolbox') toolbox.setAttribute('aria-current','page');
    toolbox.appendChild(svgIcon(documentRef,STATIC_ICONS.toolbox));
    toolbox.appendChild(labelSpan(documentRef,'Workspace'));
    /* Inside the AV Suite shell the Workspace entry recalls the empty view in place. */
    if(typeof options.onNavigate==='function') toolbox.addEventListener('click',function(event){options.onNavigate({ref:'toolbox',namespace:'toolbox',id:'toolbox',label:'Workspace',href:toolbox.getAttribute('href')},event);});
    nav.appendChild(toolbox);

    var byRef={};
    var menu=registry.menu||{};
    var pinned=state.visibleRefs.slice();
    var customized=state.status==='saved'||state.status==='unsaved';
    function placed(reference){return !!byRef[reference];}
    function addEntry(parent,entry,extra){
      if(!entry) return null;
      var element=railEntry(documentRef,entry,options.currentRef,options.onNavigate,options.resolveHref);
      if(extra&&extra.blurb) entryBlurb(documentRef,element,extra.blurb,extra.badge||'');
      if(extra&&extra.featured) element.className+=' sbd-rail__entry--featured';
      parent.appendChild(element);
      byRef[entry.ref]=element;
      return element;
    }
    function addResolved(parent,reference,extra){
      if(placed(reference)) return byRef[reference];
      return addEntry(parent,resolveRef(reference,registry),extra);
    }
    function section(title,collapsed){
      var block=documentRef.createElement(collapsed?'details':'section');
      block.className='sbd-rail__section';
      if(collapsed){
        var summary=documentRef.createElement('summary');
        summary.className='sbd-rail__heading';
        summary.textContent=title;
        block.appendChild(summary);
      }else block.appendChild(sectionHeading(documentRef,title));
      nav.appendChild(block);
      return block;
    }
    var shortRail=false;
    try{shortRail=!!(root.matchMedia&&root.matchMedia('(max-height: 800px)').matches);}catch(error){shortRail=false;}

    var featuredBlock=section('Featured',false);
    (registry.featured||[]).forEach(function(item){
      if(item.kind==='panel'){
        var button=panelButton(documentRef,{type:item.type,label:item.label,blurb:item.blurb,icon:item.icon},options.onOpenPanel);
        featuredBlock.appendChild(button);
        byRef['panel:'+item.type]=button;
        return;
      }
      var reference=item.kind==='guide'?'guide:'+item.id:(item.kind==='tool'?'tool:':'console:')+item.id;
      if(item.kind==='guide'){
        var guide=registry.guideById?registry.guideById(item.id):null;
        if(!guide) return;
        addEntry(featuredBlock,guideEntryShape(guide),{blurb:item.blurb||guide.blurb,badge:guide.badge||'',featured:true});
        return;
      }
      addResolved(featuredBlock,reference,{blurb:item.blurb,featured:true});
    });

    var departments=section('Departments',false);
    var departmentIds=customized?pinned.filter(function(reference){return reference.indexOf('console:')===0;}).map(function(reference){return reference.slice(8);}):(menu.departments||[]);
    if(!customized) departmentIds=(menu.departments||[]).slice();
    else departmentIds=departmentIds.filter(function(id){return (menu.departments||[]).indexOf(id)!==-1;});
    departmentIds.forEach(function(id){addResolved(departments,'console:'+id);});

    var showTools=section('Show tools',shortRail);
    (menu.showTools||[]).forEach(function(id){addResolved(showTools,id.indexOf(':')===-1?'tool:'+id:id);});

    var reference=section('Reference',shortRail);
    (menu.reference||[]).forEach(function(item){
      addResolved(reference,(item.kind==='tool'?'tool:':'console:')+item.id,{blurb:item.blurb||''});
    });

    var learn=section('Learn',shortRail);
    (menu.learn||[]).forEach(function(id){
      var guide=registry.guideById?registry.guideById(id):null;
      if(!guide) return;
      addEntry(learn,guideEntryShape(guide),{blurb:guide.blurb,badge:guide.badge||''});
    });

    var extras=pinned.filter(function(reference){return !placed(reference);});
    if(extras.length){
      var pinnedBlock=section('Pinned',false);
      extras.forEach(function(reference){addResolved(pinnedBlock,reference);});
    }

    var renderedEntries=[];
    pinned.forEach(function(reference){if(byRef[reference]) renderedEntries.push(byRef[reference]);});

    function paintSearch(query){
      var hits=searchHits(registry,query,root.SBD_PANEL_INDEX||[]);
      searchList.replaceChildren();
      if(!hits.length){searchList.hidden=true;return;}
      hits.forEach(function(hit){
        var row=documentRef.createElement('button');
        row.type='button';
        row.className='sbd-rail__search-hit';
        row.textContent=hit.label+(hit.blurb?' — '+hit.blurb:'');
        row.addEventListener('click',function(){
          searchList.hidden=true;
          searchInput.value='';
          if(hit.kind==='panel'&&typeof options.onOpenPanel==='function'){options.onOpenPanel(hit.type);return;}
          if(hit.kind==='guide'&&hit.href){
            if(hit.external) root.open?root.open(hit.href,'_blank','noopener'):(root.location.href=hit.href);
            else if(root.location) root.location.href=typeof options.resolveHref==='function'?(options.resolveHref({ref:hit.ref,namespace:'guide',href:hit.href})||hit.href):hit.href;
            return;
          }
          var entry=resolveRef(hit.ref,registry);
          if(entry&&typeof options.onNavigate==='function') options.onNavigate(entry,{preventDefault:function(){},button:0});
        });
        searchList.appendChild(row);
      });
      searchList.hidden=false;
    }
    searchInput.addEventListener('input',function(){paintSearch(searchInput.value);});
    function slashFocus(event){
      if(!event||event.key!=='/'||event.metaKey||event.ctrlKey||event.altKey) return;
      var target=event.target;
      var tag=target&&target.tagName?String(target.tagName).toLowerCase():'';
      if(tag==='input'||tag==='textarea'||(target&&target.isContentEditable)) return;
      if(event.preventDefault) event.preventDefault();
      searchInput.focus();
    }
    if(documentRef.addEventListener) documentRef.addEventListener('keydown',slashFocus);

    if(state.message){
      var notice=documentRef.createElement('div');
      notice.className='sbd-rail__notice';
      notice.setAttribute('role','status');
      var message=documentRef.createElement('p');
      message.textContent=state.message;
      notice.appendChild(message);
      if(state.resetRequired&&typeof options.onResetPreferences==='function'){
        var reset=documentRef.createElement('button');
        reset.type='button';
        reset.className='sbd-rail__reset';
        reset.textContent='Reset rail';
        reset.addEventListener('click',options.onResetPreferences);
        notice.appendChild(reset);
      }
      nav.appendChild(notice);
    }

    var footer=documentRef.createElement('div');
    footer.className='sbd-rail__footer';
    var allAppsButton=actionButton(documentRef,'All apps',STATIC_ICONS.all,options.onAllApps,'sbd-rail__all');
    var customizeButton=actionButton(documentRef,'Customize',STATIC_ICONS.customize,options.onCustomize,'sbd-rail__customize');
    footer.appendChild(allAppsButton);
    footer.appendChild(customizeButton);
    nav.appendChild(footer);
    shell.appendChild(nav);
    container.replaceChildren(shell);

    return {
      state:state,
      shell:shell,
      launcher:launcher,
      rail:nav,
      entries:renderedEntries,
      allAppsButton:allAppsButton,
      customizeButton:customizeButton,
      destroy:function(){
        if(documentRef.removeEventListener) documentRef.removeEventListener('keydown',slashFocus);
        container.replaceChildren();
      }
    };
  }

  root.SBD_RAIL={
    version:'sbd.rail.runtime.v1',
    storageKey:STORAGE_KEY,
    preferenceVersion:PREFERENCE_VERSION,
    parsePreferences:parsePreferences,
    resolveRef:resolveRef,
    createPreferenceStore:createPreferenceStore,
    searchHits:searchHits,
    readRecent:readRecent,
    rememberRecent:rememberRecent,
    render:render
  };
})(typeof self!=='undefined'?self:this);
