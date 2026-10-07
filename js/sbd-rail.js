/* System by Dave — AV application rail runtime.
   Consumers supply a registry, storage, container, and callbacks. */
(function(root){
  'use strict';

  var STORAGE_KEY='sbd.rail.v1';
  var PREFERENCE_VERSION=1;
  var REFERENCE_PATTERN=/^(console|family|tool|external):[^:]+$/;
  var STATIC_ICONS={
    toolbox:['M2 7h20v13H2z','M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2','M2 12h20','M10 12v3h4v-3'],
    all:['M3.4 3.4h3.2v3.2H3.4z','M10.4 3.4h3.2v3.2h-3.2z','M17.4 3.4h3.2v3.2h-3.2z','M3.4 10.4h3.2v3.2H3.4z','M10.4 10.4h3.2v3.2h-3.2z','M17.4 10.4h3.2v3.2h-3.2z','M3.4 17.4h3.2v3.2H3.4z','M10.4 17.4h3.2v3.2h-3.2z','M17.4 17.4h3.2v3.2h-3.2z'],
    customize:['M4 21v-7','M4 10V3','M12 21v-9','M12 8V3','M20 21v-5','M20 12V3','M2 14h4','M10 8h4','M18 16h4'],
    tool:['M4 4h16v16H4z','M8 9h8','M8 13h5'],
    external:['M10 5H5v14h14v-5','M13 3h8v8','M21 3 11 13']
  };

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

  function toolboxFamilyHref(id){
    return 'av-suite.html?entry=toolbox&family='+encodeURIComponent(id);
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

    if(namespace==='family'){
      item=exactById(registry.consoleFamilies,id);
      if(!item) return null;
      return {ref:reference,namespace:namespace,id:id,label:item.label,icon:(item.icon||[]).slice(),availability:'available',pinnable:true,navigable:true,href:toolboxFamilyHref(id),source:item};
    }

    if(namespace==='tool'){
      tool=exactById(registry.tools,id);
      if(!tool) return null;
      return {ref:reference,namespace:namespace,id:id,label:tool.name,icon:STATIC_ICONS.tool.slice(),availability:'available',pinnable:true,navigable:!!tool.href,href:tool.href||null,source:tool};
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
    if(entry.namespace==='external') element.setAttribute('rel','noopener noreferrer');
    if(entry.ref===currentRef) element.setAttribute('aria-current','page');
    if(typeof onNavigate==='function') element.addEventListener('click',function(event){onNavigate(entry,event);});
    return element;
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

    var toolbox=documentRef.createElement('a');
    toolbox.className='sbd-rail__action sbd-rail__toolbox';
    toolbox.setAttribute('href',options.toolboxHref||'av-suite.html?entry=toolbox');
    toolbox.setAttribute('data-label','Toolbox');
    toolbox.setAttribute('title','Toolbox');
    if(options.currentRef==='toolbox') toolbox.setAttribute('aria-current','page');
    toolbox.appendChild(svgIcon(documentRef,STATIC_ICONS.toolbox));
    toolbox.appendChild(labelSpan(documentRef,'Toolbox'));
    nav.appendChild(toolbox);

    var list=documentRef.createElement('ol');
    list.className='sbd-rail__list';
    var renderedEntries=[];
    state.visibleRefs.forEach(function(reference){
      var entry=resolveRef(reference,registry);
      if(!entry||!entry.pinnable) return;
      var item=documentRef.createElement('li');
      var element=railEntry(documentRef,entry,options.currentRef,options.onNavigate,options.resolveHref);
      item.appendChild(element);
      list.appendChild(item);
      renderedEntries.push(element);
    });
    nav.appendChild(list);

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
      destroy:function(){container.replaceChildren();}
    };
  }

  root.SBD_RAIL={
    version:'sbd.rail.runtime.v1',
    storageKey:STORAGE_KEY,
    preferenceVersion:PREFERENCE_VERSION,
    parsePreferences:parsePreferences,
    resolveRef:resolveRef,
    createPreferenceStore:createPreferenceStore,
    render:render
  };
})(typeof self!=='undefined'?self:this);
