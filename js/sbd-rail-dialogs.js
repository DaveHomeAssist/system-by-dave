/* System by Dave — AV rail dialogs, routing, and draft awareness.
   This module does not mount itself or write application data. */
(function(root){
  'use strict';

  var DRAFT_CHANGE_EVENT='sbd:console-draft-change';
  var CONTEXT_PARAMS=['sbdShow','sbdVenue','sbdDate','sbdOperator','sbdPhase'];
  var ALLOWED_DRAFT_FIELDS={v:true,console:true,at:true,baseline:true,doc:true};

  function railRuntime(){
    if(!root.SBD_RAIL) throw new Error('SBD_RAIL_DIALOGS requires SBD_RAIL.');
    return root.SBD_RAIL;
  }

  function registryOrDefault(registry){return registry||root.SBD_REGISTRY||{};}

  function array(value){return Array.isArray(value)?value:[];}

  function routeBase(options){
    options=options||{};
    var source=options.sourceUrl;
    if(!source&&root.location) source=root.location.href;
    source=source||'https://systembydave.invalid/';
    try{return new URL(options.baseUrl||'/',source);}
    catch(error){return null;}
  }

  function sourceContext(sourceUrl,base){
    var context={};
    if(!sourceUrl) return context;
    try{
      var source=new URL(sourceUrl,base);
      CONTEXT_PARAMS.forEach(function(name){
        if(source.searchParams.has(name)) context[name]=source.searchParams.get(name);
      });
    }catch(error){/* Invalid source context is ignored rather than fabricated. */}
    return context;
  }

  function toolboxEntry(){
    return {ref:'toolbox',namespace:'toolbox',id:'toolbox',label:'Toolbox',availability:'available',pinnable:false,navigable:true,href:'av-suite.html?entry=toolbox'};
  }

  function resolveRoute(reference,options){
    options=options||{};
    var registry=registryOrDefault(options.registry);
    var entry=reference==='toolbox'?toolboxEntry():railRuntime().resolveRef(reference,registry);
    if(!entry) return {ok:false,code:'unknown-reference',reference:reference};
    if(!entry.navigable||!entry.href) return {ok:false,code:'not-navigable',reference:reference,entry:entry};

    var base=routeBase(options);
    if(!base) return {ok:false,code:'invalid-base',reference:reference,entry:entry};
    var url;
    try{url=new URL(entry.href,base);}
    catch(error){return {ok:false,code:'invalid-destination',reference:reference,entry:entry};}
    if(url.protocol!=='http:'&&url.protocol!=='https:') return {ok:false,code:'unsafe-protocol',reference:reference,entry:entry};

    var internal=(entry.namespace==='console'||entry.namespace==='tool')&&url.origin===base.origin;
    if(internal){
      var context=sourceContext(options.sourceUrl,base);
      CONTEXT_PARAMS.forEach(function(name){
        if(Object.prototype.hasOwnProperty.call(context,name)) url.searchParams.set(name,context[name]);
      });
    }
    return {ok:true,code:'resolved',reference:reference,entry:entry,href:url.href,internal:internal};
  }

  function draftConsole(reference,registry){
    var entry=railRuntime().resolveRef(reference,registry);
    return entry&&entry.namespace==='console'?entry:null;
  }

  function validDraftEnvelope(value,consoleId){
    if(!value||typeof value!=='object'||Array.isArray(value)) return false;
    var keys=Object.keys(value);
    if(keys.length!==5||keys.some(function(key){return !ALLOWED_DRAFT_FIELDS[key];})) return false;
    if(value.v!==1||value.console!==consoleId) return false;
    if(typeof value.at!=='string'||!value.at||!Number.isFinite(Date.parse(value.at))) return false;
    if(value.baseline!==null&&typeof value.baseline!=='string') return false;
    return Object.prototype.hasOwnProperty.call(value,'doc');
  }

  function readDraftState(reference,options){
    options=options||{};
    var registry=registryOrDefault(options.registry);
    var entry=draftConsole(reference,registry);
    if(!entry||!entry.source||!entry.source.draftKey){
      return {reference:reference,status:'not-applicable',label:'No draft indicator',draftKey:null};
    }
    var storage=options.storage;
    if(!storage||typeof storage.getItem!=='function'){
      return {reference:reference,status:'unavailable',label:'Draft state unavailable',draftKey:entry.source.draftKey};
    }
    try{
      var raw=storage.getItem(entry.source.draftKey);
      if(raw===null) return {reference:reference,status:'none',label:'No stored draft',draftKey:entry.source.draftKey};
      var parsed=JSON.parse(raw);
      if(!validDraftEnvelope(parsed,entry.id)) throw new Error('Unsupported draft envelope');
      return {reference:reference,status:'present',label:'Unsaved draft',draftKey:entry.source.draftKey,at:parsed.at};
    }catch(error){
      return {reference:reference,status:'unavailable',label:'Draft state unavailable',draftKey:entry.source.draftKey};
    }
  }

  function createDraftObserver(options){
    options=options||{};
    var registry=registryOrDefault(options.registry);
    var target=options.eventTarget||root;
    var callback=typeof options.onChange==='function'?options.onChange:function(){};
    var references=array(registry.consoles).filter(function(item){return !!item.draftKey;}).map(function(item){return 'console:'+item.id;});
    var keyToReference={};
    references.forEach(function(reference){
      var entry=draftConsole(reference,registry);
      if(entry&&entry.source.draftKey) keyToReference[entry.source.draftKey]=reference;
    });

    function refresh(reference){
      if(reference){
        var state=readDraftState(reference,{registry:registry,storage:options.storage});
        callback(reference,state);
        return state;
      }
      var states={};
      references.forEach(function(item){states[item]=refresh(item);});
      return states;
    }

    function onDraftChange(event){
      var consoleId=event&&event.detail&&event.detail.consoleId;
      var reference='console:'+consoleId;
      if(typeof consoleId==='string'&&references.indexOf(reference)!==-1) refresh(reference);
    }

    function onStorage(event){
      if(!event||event.key===null){refresh();return;}
      if(keyToReference[event.key]) refresh(keyToReference[event.key]);
    }

    function onPageShow(){refresh();}

    if(target&&typeof target.addEventListener==='function'){
      target.addEventListener(DRAFT_CHANGE_EVENT,onDraftChange);
      target.addEventListener('storage',onStorage);
      target.addEventListener('pageshow',onPageShow);
    }
    if(options.initial!==false) refresh();

    return {
      eventName:DRAFT_CHANGE_EVENT,
      read:function(reference){return readDraftState(reference,{registry:registry,storage:options.storage});},
      refresh:refresh,
      destroy:function(){
        if(target&&typeof target.removeEventListener==='function'){
          target.removeEventListener(DRAFT_CHANGE_EVENT,onDraftChange);
          target.removeEventListener('storage',onStorage);
          target.removeEventListener('pageshow',onPageShow);
        }
      }
    };
  }

  function textElement(documentRef,tag,className,text){
    var element=documentRef.createElement(tag);
    if(className) element.className=className;
    element.textContent=text;
    return element;
  }

  function catalog(registry){
    registry=registryOrDefault(registry);
    var consoleTools={};
    array(registry.consoles).forEach(function(item){if(item.toolId) consoleTools[item.toolId]=true;});
    return [
      {id:'consoles',label:'Consoles',entries:array(registry.consoles).map(function(item){return railRuntime().resolveRef('console:'+item.id,registry);}).filter(Boolean)},
      {id:'families',label:'Toolbox families',entries:array(registry.consoleFamilies).map(function(item){return railRuntime().resolveRef('family:'+item.id,registry);}).filter(Boolean)},
      {id:'tools',label:'Specialist tools',entries:array(registry.tools).filter(function(item){return !consoleTools[item.id];}).map(function(item){return railRuntime().resolveRef('tool:'+item.id,registry);}).filter(Boolean)},
      {id:'externals',label:'External products',entries:array(registry.externals).map(function(item){return railRuntime().resolveRef('external:'+item.id,registry);}).filter(Boolean)}
    ];
  }

  function entryType(entry){
    if(entry.namespace==='console') return entry.availability==='planned'?'Planned console':'Console';
    if(entry.namespace==='family') return 'Family';
    if(entry.namespace==='tool') return 'Tool';
    return entry.navigable?'External handoff':'Status only';
  }

  function collectFocusable(element,result){
    result=result||[];
    array(element.children).forEach(function(child){
      var tag=String(child.tagName||'').toLowerCase();
      var tabindex=typeof child.getAttribute==='function'?child.getAttribute('tabindex'):null;
      var href=typeof child.getAttribute==='function'?child.getAttribute('href'):null;
      if(!child.disabled&&tabindex!=='-1'&&(tag==='button'||(tag==='a'&&!!href)||tabindex==='0')) result.push(child);
      collectFocusable(child,result);
    });
    return result;
  }

  function focusElement(element){if(element&&typeof element.focus==='function') element.focus();}

  function dialogShell(documentRef,id,title){
    var dialog=documentRef.createElement('dialog');
    dialog.className='sbd-rail-dialog';
    dialog.setAttribute('id',id);
    dialog.setAttribute('aria-labelledby',id+'Title');
    dialog.setAttribute('aria-modal','true');
    dialog.hidden=true;

    var header=documentRef.createElement('header');
    header.className='sbd-rail-dialog__header';
    var heading=textElement(documentRef,'h2','sbd-rail-dialog__title',title);
    heading.setAttribute('id',id+'Title');
    var close=documentRef.createElement('button');
    close.type='button';
    close.className='sbd-rail-dialog__close';
    close.setAttribute('aria-label','Close '+title);
    close.textContent='Close';
    header.appendChild(heading);
    header.appendChild(close);

    var body=documentRef.createElement('div');
    body.className='sbd-rail-dialog__body';
    body.setAttribute('data-web2-scroll','');
    body.setAttribute('tabindex','0');
    body.setAttribute('aria-label',title+' contents');
    var status=documentRef.createElement('div');
    status.className='sbd-rail-dialog__message';
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    dialog.appendChild(header);
    dialog.appendChild(status);
    dialog.appendChild(body);

    var trigger=null;
    function finishClose(){
      dialog.hidden=true;
      dialog.removeAttribute('open');
      if(trigger&&typeof trigger.setAttribute==='function') trigger.setAttribute('aria-expanded','false');
      focusElement(trigger);
      trigger=null;
    }
    function hide(){
      if(dialog.hidden) return;
      if(typeof dialog.close==='function'&&dialog.hasAttribute('open')) dialog.close();
      else finishClose();
    }
    function show(source){
      trigger=source||null;
      if(trigger&&typeof trigger.setAttribute==='function') trigger.setAttribute('aria-expanded','true');
      dialog.hidden=false;
      if(typeof dialog.showModal==='function'){
        try{dialog.showModal();}catch(error){dialog.setAttribute('open','');}
      }else dialog.setAttribute('open','');
      focusElement(close);
    }
    close.addEventListener('click',hide);
    dialog.addEventListener('close',finishClose);
    dialog.addEventListener('cancel',function(event){if(event&&typeof event.preventDefault==='function') event.preventDefault();hide();});
    dialog.addEventListener('keydown',function(event){
      if(event.key==='Escape'){if(typeof event.preventDefault==='function') event.preventDefault();hide();return;}
      if(event.key!=='Tab') return;
      var focusable=collectFocusable(dialog);
      if(!focusable.length) return;
      var active=documentRef.activeElement;
      var index=focusable.indexOf(active);
      var next=event.shiftKey?(index<=0?focusable.length-1:index-1):(index===-1||index===focusable.length-1?0:index+1);
      if(typeof event.preventDefault==='function') event.preventDefault();
      focusElement(focusable[next]);
    });
    return {
      dialog:dialog,
      body:body,
      status:status,
      show:show,
      hide:hide,
      closeButton:close,
      setTrigger:function(source){trigger=source||null;}
    };
  }

  function createDraftSlot(documentRef,entry,draftTargets){
    if(entry.namespace!=='console'||!entry.source||!entry.source.draftKey) return null;
    var slot=textElement(documentRef,'span','sbd-rail-dialog__draft','');
    slot.hidden=true;
    draftTargets[entry.ref]=draftTargets[entry.ref]||[];
    draftTargets[entry.ref].push(slot);
    return slot;
  }

  function applyDraftState(reference,state,draftTargets){
    array(draftTargets[reference]).forEach(function(slot){
      slot.setAttribute('data-draft-status',state.status);
      if(state.status==='present'){
        slot.hidden=false;
        slot.textContent='Unsaved draft';
      }else if(state.status==='unavailable'){
        slot.hidden=false;
        slot.textContent='Draft state unavailable';
      }else{
        slot.hidden=true;
        slot.textContent='';
      }
    });
  }

  function createDialogs(options){
    options=options||{};
    var container=options.container;
    if(!container||typeof container.appendChild!=='function') throw new Error('SBD_RAIL_DIALOGS.create requires a container element.');
    var documentRef=container.ownerDocument||root.document;
    if(!documentRef||typeof documentRef.createElement!=='function') throw new Error('SBD_RAIL_DIALOGS.create requires a document.');
    var registry=registryOrDefault(options.registry);
    var store=options.preferenceStore||null;
    var sections=catalog(registry);
    var prefix=options.idPrefix||'sbdRail';
    var draftTargets={};
    var allApps=dialogShell(documentRef,prefix+'AllApps','All apps');
    var customize=dialogShell(documentRef,prefix+'Customize','Customize rail');
    container.appendChild(allApps.dialog);
    container.appendChild(customize.dialog);

    function routeOptions(){return {registry:registry,baseUrl:options.baseUrl,sourceUrl:options.sourceUrl};}

    function allAppsCard(entry){
      var route=resolveRoute(entry.ref,routeOptions());
      var card=documentRef.createElement(route.ok?'a':'div');
      card.className='sbd-rail-dialog__card'+(route.ok?'':' is-status');
      card.setAttribute('data-rail-ref',entry.ref);
      card.setAttribute('data-entry-type',entryType(entry));
      if(route.ok){
        card.setAttribute('href',route.href);
        if(entry.namespace==='external') card.setAttribute('rel','noopener noreferrer');
        if(entry.ref===options.currentRef) card.setAttribute('aria-current','page');
        if(typeof options.onNavigate==='function') card.addEventListener('click',function(event){options.onNavigate(entry,event);});
      }else{
        card.setAttribute('tabindex','0');
        card.setAttribute('role','note');
        card.setAttribute('aria-label',entry.label+'. '+entryType(entry)+'.');
      }
      card.appendChild(textElement(documentRef,'strong','sbd-rail-dialog__card-title',entry.label));
      card.appendChild(textElement(documentRef,'span','sbd-rail-dialog__type',entryType(entry)));
      if(entry.badge) card.appendChild(textElement(documentRef,'span','sbd-rail-dialog__badge',entry.badge));
      var draftSlot=createDraftSlot(documentRef,entry,draftTargets);
      if(draftSlot) card.appendChild(draftSlot);
      return card;
    }

    function renderAllApps(){
      var fragment=[];
      sections.forEach(function(sectionData){
        var section=documentRef.createElement('section');
        var title=textElement(documentRef,'h3','sbd-rail-dialog__section-title',sectionData.label);
        title.setAttribute('id',prefix+sectionData.id+'Title');
        section.setAttribute('aria-labelledby',title.getAttribute('id'));
        var grid=documentRef.createElement('div');
        grid.className='sbd-rail-dialog__grid';
        sectionData.entries.forEach(function(entry){grid.appendChild(allAppsCard(entry));});
        section.appendChild(title);
        section.appendChild(grid);
        fragment.push(section);
      });
      allApps.body.replaceChildren.apply(allApps.body,fragment);
    }

    function pinnableEntries(){
      var result=[];
      sections.forEach(function(sectionData){sectionData.entries.forEach(function(entry){if(entry.pinnable) result.push(entry);});});
      return result;
    }

    function actionButton(label,action,reference,disabled,handler){
      var button=documentRef.createElement('button');
      button.type='button';
      button.className='sbd-rail-dialog__action';
      button.textContent=label;
      button.setAttribute('data-action',action);
      button.setAttribute('data-rail-ref',reference);
      button.disabled=!!disabled;
      if(!button.disabled) button.addEventListener('click',handler);
      return button;
    }

    function runPreference(action,reference,index,nextAction){
      if(!store||typeof store[action]!=='function') return;
      var result=action==='move'?store.move(reference,index):store[action](reference);
      var state=result&&result.state?result.state:store.read();
      var statusMessage='No preference change was needed.';
      if(!result.ok){
        statusMessage=result.message||'Rail preferences could not be updated.';
      }else if(result.changed&&action==='move'){
        var visibleRefs=array(state&&state.visibleRefs);
        var position=visibleRefs.indexOf(reference);
        var movedEntry=railRuntime().resolveRef(reference,registry);
        statusMessage=(movedEntry?movedEntry.label:reference)+' moved to position '+(position+1)+' of '+visibleRefs.length+'.';
      }else if(result.changed){
        statusMessage='Rail preferences updated.';
      }
      customize.status.textContent=statusMessage;
      renderCustomize(state);
      if(typeof options.onPreferencesChange==='function') options.onPreferencesChange(result);
      var focusAction=nextAction||(result.ok&&action==='unpin'?'pin':result.ok&&action==='pin'?'unpin':action);
      var focusTarget=findAction(customize.body,reference,focusAction);
      if(focusTarget&&focusTarget.disabled) focusTarget=null;
      focusElement(focusTarget||findItem(customize.body,reference));
    }

    function findAction(element,reference,action){
      var found=null;
      array(element.children).forEach(function(child){
        if(found) return;
        if(typeof child.getAttribute==='function'&&child.getAttribute('data-rail-ref')===reference&&child.getAttribute('data-action')===action) found=child;
        if(!found) found=findAction(child,reference,action);
      });
      return found;
    }

    function findItem(element,reference){
      var found=null;
      array(element.children).forEach(function(child){
        if(found) return;
        if(String(child.tagName||'').toLowerCase()==='li'&&typeof child.getAttribute==='function'&&child.getAttribute('data-rail-ref')===reference) found=child;
        if(!found) found=findItem(child,reference);
      });
      return found;
    }

    function renderCustomize(providedState){
      var state=providedState||(store&&typeof store.read==='function'?store.read():null);
      var pinned=state?array(state.visibleRefs):[];
      var entries=pinnableEntries();
      var byRef={};
      entries.forEach(function(entry){byRef[entry.ref]=entry;});
      var ordered=[];
      pinned.forEach(function(reference){if(byRef[reference]) ordered.push(byRef[reference]);});
      entries.forEach(function(entry){if(pinned.indexOf(entry.ref)===-1) ordered.push(entry);});

      var list=documentRef.createElement('ol');
      list.className='sbd-rail-dialog__customize-list';
      ordered.forEach(function(entry){
        var item=documentRef.createElement('li');
        item.className='sbd-rail-dialog__customize-item';
        item.setAttribute('data-rail-ref',entry.ref);
        item.setAttribute('tabindex','-1');
        var copy=documentRef.createElement('div');
        copy.className='sbd-rail-dialog__customize-copy';
        copy.appendChild(textElement(documentRef,'strong','',entry.label));
        copy.appendChild(textElement(documentRef,'span','sbd-rail-dialog__type',entryType(entry)));
        var controls=documentRef.createElement('div');
        controls.className='sbd-rail-dialog__customize-actions';
        var currentIndex=pinned.indexOf(entry.ref);
        if(currentIndex===-1){
          controls.appendChild(actionButton('Pin','pin',entry.ref,!store,function(){runPreference('pin',entry.ref);}));
        }else{
          controls.appendChild(actionButton('Move up','move-up',entry.ref,currentIndex===0,function(){runPreference('move',entry.ref,currentIndex-1,'move-up');}));
          controls.appendChild(actionButton('Move down','move-down',entry.ref,currentIndex===pinned.length-1,function(){runPreference('move',entry.ref,currentIndex+1,'move-down');}));
          controls.appendChild(actionButton('Unpin','unpin',entry.ref,false,function(){runPreference('unpin',entry.ref);}));
        }
        item.appendChild(copy);
        item.appendChild(controls);
        list.appendChild(item);
      });

      var reset=actionButton('Restore defaults','reset','defaults',!store,function(){runPreference('reset','defaults');});
      reset.className+=' sbd-rail-dialog__reset';
      var content=[list,reset];
      if(state&&state.resetRequired){
        var warning=textElement(documentRef,'p','sbd-rail-dialog__warning',state.message);
        warning.setAttribute('role','alert');
        content.unshift(warning);
      }
      customize.body.replaceChildren.apply(customize.body,content);
    }

    renderAllApps();
    renderCustomize();
    var draftObserver=createDraftObserver({
      registry:registry,
      storage:options.draftStorage,
      eventTarget:options.eventTarget||root,
      onChange:function(reference,state){applyDraftState(reference,state,draftTargets);}
    });

    return {
      allAppsDialog:allApps.dialog,
      customizeDialog:customize.dialog,
      openAllApps:function(trigger){allApps.status.textContent='';draftObserver.refresh();allApps.show(trigger);},
      openCustomize:function(trigger){customize.status.textContent='';renderCustomize();customize.show(trigger);},
      closeAllApps:allApps.hide,
      closeCustomize:customize.hide,
      setAllAppsTrigger:allApps.setTrigger,
      setCustomizeTrigger:customize.setTrigger,
      refresh:function(){renderCustomize();return draftObserver.refresh();},
      destroy:function(){
        draftObserver.destroy();
        allApps.hide();
        customize.hide();
        if(typeof container.removeChild==='function'){
          if(allApps.dialog.parentNode===container) container.removeChild(allApps.dialog);
          if(customize.dialog.parentNode===container) container.removeChild(customize.dialog);
        }
      }
    };
  }

  root.SBD_RAIL_DIALOGS={
    version:'sbd.rail.dialogs.v1',
    draftEventName:DRAFT_CHANGE_EVENT,
    resolveRoute:resolveRoute,
    readDraftState:readDraftState,
    createDraftObserver:createDraftObserver,
    create:createDialogs
  };
})(typeof self!=='undefined'?self:this);
