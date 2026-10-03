/* One cache owner per AV origin. Readiness means control AND this entry's assets exist. */
(function(global){
  'use strict';
  const root=document.documentElement;
  const isThrowline=location.pathname.includes('/ProjectorThrow/');
  const base=new URL(isThrowline?'../':'./',location.href);
  let badge;
  function report(state,text){root.dataset.workspaceOffline=state;if(badge)badge.textContent=text;}
  async function prepare(){
    if(!isSecureContext||!('serviceWorker' in navigator)||!('caches' in global)){report('unavailable','Offline cache unavailable');return false;}
    report('preparing','Preparing offline use');
    try{
      const registration=await navigator.serviceWorker.register(new URL('av-suite-worker.js',base));
      await navigator.serviceWorker.ready;
      const ready=async()=>{
        const controller=navigator.serviceWorker.controller;if(!controller)return false;
        const info=await new Promise(resolve=>{
          const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();resolve(null);},2000);
          channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
          controller.postMessage({type:'SBD_OFFLINE_VERSION'},[channel.port2]);
        });
        if(!info||info.version!==global.AVWorkspaceVersion)return false;
        const assets=[new URL(location.pathname+(location.pathname.endsWith('/')?'index.html':''),location.origin).href,...[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(el=>el.src||el.href)];
        if(isThrowline)assets.push(new URL('ProjectorThrow/throwline-scene-state.js',base).href);
        else assets.push(...['data/led-cabinet-catalog.v1.json','ProjectorThrow/vendor/three/three.module.min.js','ProjectorThrow/vendor/three/three.core.min.js','ProjectorThrow/vendor/three/addons/controls/OrbitControls.js'].map(path=>new URL(path,base).href));
        const cache=await caches.open(info.cache);
        const matches=await Promise.all(assets.filter(url=>new URL(url).origin===location.origin).map(url=>cache.match(url,{ignoreSearch:true})));
        if(matches.some(item=>!item))return false;
        report('ready','Offline ready');return true;
      };
      if(await ready())return true;
      registration.active?.postMessage({type:'SBD_CLAIM_CLIENTS'});
      return await new Promise(resolve=>{
        const timer=setTimeout(()=>finish(false),45000);
        const poll=setInterval(async()=>{try{if(await ready())finish(true);}catch{finish(false);}},1000);
        function finish(ok){clearTimeout(timer);clearInterval(poll);if(!ok)report('partial','Offline not ready — stay online');resolve(ok);}
      });
    }catch(error){report('error','Offline unavailable — keep connection');return false;}
  }
  global.AVOffline={prepare};
  function start(){badge=document.getElementById('workspaceOffline');if(badge)prepare();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
