/* System by Dave — production mount for the shared application Rail. */
(function(root){
  'use strict';

  var CONSOLE_SELECT_EVENT='sbd:rail-console-select';
  var CONSOLE_ACTIVE_EVENT='sbd:console-snapshot-active';

  function eventTrigger(event){
    return event&&(event.currentTarget||event.target)||null;
  }

  function safeStorage(){
    try{return root.localStorage||null;}
    catch(error){return null;}
  }

  function mount(options){
    options=options||{};
    var documentRef=options.document||root.document;
    var host=options.host||(documentRef&&documentRef.querySelector('[data-sbd-rail-host]'));
    var dialogHost=options.dialogHost||(documentRef&&documentRef.querySelector('[data-sbd-rail-dialogs]'));
    var rail=options.rail||root.SBD_RAIL;
    var dialogs=options.dialogs||root.SBD_RAIL_DIALOGS;
    var registry=options.registry||root.SBD_REGISTRY;

    if(!host) return {ok:false,code:'host-missing'};
    if(!dialogHost||!rail||!dialogs||!registry){
      host.setAttribute('data-rail-state','unavailable');
      return {ok:false,code:'dependency-missing'};
    }

    var currentRef=options.currentRef||host.getAttribute('data-current-ref')||'';
    var sourceUrl=options.sourceUrl||(root.location&&root.location.href)||'';
    var baseUrl=options.baseUrl;
    if(!baseUrl){
      try{baseUrl=new URL('/',sourceUrl).href;}
      catch(error){baseUrl='/';}
    }
    var storage=Object.prototype.hasOwnProperty.call(options,'storage')?options.storage:safeStorage();
    var eventTarget=options.eventTarget||root;
    var store=rail.createPreferenceStore({registry:registry,storage:storage});
    var rendered=null;
    var controller=null;

    function route(reference){
      return dialogs.resolveRoute(reference,{registry:registry,baseUrl:baseUrl,sourceUrl:sourceUrl});
    }

    function resolvedHref(entry){
      var result=route(entry.ref);
      return result.ok?result.href:entry.href;
    }

    function selectionEvent(entry){
      var detail={ref:entry.ref,consoleId:entry.id,href:resolvedHref(entry)};
      if(typeof root.CustomEvent==='function') return new root.CustomEvent(CONSOLE_SELECT_EVENT,{detail:detail,cancelable:true});
      if(documentRef&&typeof documentRef.createEvent==='function'){
        var event=documentRef.createEvent('CustomEvent');
        event.initCustomEvent(CONSOLE_SELECT_EVENT,false,true,detail);
        return event;
      }
      return null;
    }

    function setCurrent(reference,state){
      if(reference===currentRef) return;
      currentRef=reference;
      host.setAttribute('data-current-ref',reference);
      if(rendered) renderRail(state||rendered.state);
    }

    function navigate(entry,event){
      if(!entry||entry.namespace!=='console'||!eventTarget||typeof eventTarget.dispatchEvent!=='function') return;
      if(event&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||(typeof event.button==='number'&&event.button!==0))) return;
      var signal=selectionEvent(entry);
      if(!signal) return;
      var continueNavigation=eventTarget.dispatchEvent(signal);
      if(continueNavigation&&!signal.defaultPrevented) return;
      if(event&&typeof event.preventDefault==='function') event.preventDefault();
      setCurrent(entry.ref);
      if(controller&&typeof controller.closeAllApps==='function') controller.closeAllApps();
    }

    function activeSnapshot(event){
      var reference=event&&event.detail&&event.detail.ref;
      var entry=typeof reference==='string'?rail.resolveRef(reference,registry):null;
      if(entry&&entry.namespace==='console') setCurrent(reference);
    }

    function renderRail(state){
      rendered=rail.render(host,{
        registry:registry,
        preferenceStore:store,
        state:state,
        currentRef:currentRef,
        toolboxHref:(function(){var result=route('toolbox');return result.ok?result.href:'/av-suite.html?entry=toolbox';}()),
        resolveHref:resolvedHref,
        onNavigate:navigate,
        appsDialogId:'sbdRailAllApps',
        onAllApps:function(event){controller.openAllApps(eventTrigger(event));},
        onCustomize:function(event){controller.openCustomize(eventTrigger(event));},
        onResetPreferences:function(){
          var result=store.reset();
          renderRail(result.state);
          if(rendered&&rendered.rail&&typeof rendered.rail.focus==='function') rendered.rail.focus();
        }
      });
      host.setAttribute('data-rail-state','ready');
      return rendered;
    }

    try{
      controller=dialogs.create({
        container:dialogHost,
        registry:registry,
        preferenceStore:store,
        draftStorage:storage,
        eventTarget:eventTarget,
        currentRef:currentRef,
        baseUrl:baseUrl,
        sourceUrl:sourceUrl,
        idPrefix:'sbdRail',
        onNavigate:navigate,
        onPreferencesChange:function(result){
          var previous=rendered;
          var previousTrigger=controller&&typeof controller.getCustomizeTrigger==='function'?controller.getCustomizeTrigger():null;
          renderRail(result&&result.state);
          var nextTrigger=rendered.customizeButton;
          if(previous&&previousTrigger===previous.launcher) nextTrigger=rendered.launcher;
          else if(previous&&previousTrigger===previous.allAppsButton) nextTrigger=rendered.allAppsButton;
          controller.setCustomizeTrigger(nextTrigger);
        }
      });
      if(eventTarget&&typeof eventTarget.addEventListener==='function') eventTarget.addEventListener(CONSOLE_ACTIVE_EVENT,activeSnapshot);
      renderRail();
      return {
        ok:true,
        store:store,
        controller:controller,
        rendered:function(){return rendered;},
        destroy:function(){
          if(eventTarget&&typeof eventTarget.removeEventListener==='function') eventTarget.removeEventListener(CONSOLE_ACTIVE_EVENT,activeSnapshot);
          if(controller) controller.destroy();
          if(rendered) rendered.destroy();
          host.removeAttribute('data-rail-state');
        }
      };
    }catch(error){
      if(eventTarget&&typeof eventTarget.removeEventListener==='function') eventTarget.removeEventListener(CONSOLE_ACTIVE_EVENT,activeSnapshot);
      if(controller&&typeof controller.destroy==='function') controller.destroy();
      host.setAttribute('data-rail-state','unavailable');
      if(root.console&&typeof root.console.error==='function') root.console.error('Application Rail unavailable.',error);
      return {ok:false,code:'mount-failed',error:error};
    }
  }

  function autoMount(){
    if(root.__SBD_RAIL_INSTANCE__) return root.__SBD_RAIL_INSTANCE__;
    var instance=mount();
    if(instance.ok) root.__SBD_RAIL_INSTANCE__=instance;
    return instance;
  }

  root.SBD_RAIL_MOUNT={version:'sbd.rail.mount.v1',mount:mount,autoMount:autoMount};
  if(root.document){
    if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',autoMount,{once:true});
    else autoMount();
  }
})(typeof self!=='undefined'?self:this);
