'use strict';

var CACHE_NAME='sbd-av-suite-v20260614-dockcompact';
var CACHE_PREFIX='sbd-av-suite-';
var OFFLINE_ASSETS=[
  './av-suite.html',
  './av-suite-worker.js',
  './js/av-suite-context.js',
  './svg/system_by_dave_logo_rust.svg',
  './img/card-cover-banner-wide.png',
  './teleprompter.html',
  './show-timer.html',
  './cueforge.html',
  './cue-sheet.html',
  './playback-check.html',
  './record-log.html',
  './stream-plan.html',
  './show-advance.html',
  './site-survey.html',
  './crew-call.html',
  './crew-time-log.html',
  './room-check.html',
  './breakout-room-matrix.html',
  './show-task-board.html',
  './show-handoff.html',
  './show-report.html',
  './change-order.html',
  './client-signoff.html',
  './input-list.html',
  './audio-patch.html',
  './line-check.html',
  './speaker-plan.html',
  './power-plan.html',
  './network-plan.html',
  './signal-flow.html',
  './video-patch.html',
  './display-plan.html',
  './projection-plan.html',
  './lighting-patch.html',
  './cable-plan.html',
  './rf-coordination.html',
  './comms-check.html',
  './camera-shot-list.html',
  './plotforge.html',
  './stage-plot.html',
  './gear-prep.html',
  './truck-pack.html',
  './load-in-plan.html',
  './strike-plan.html',
  './av-calculator.html'
];
var OFFLINE_URLS=OFFLINE_ASSETS.map(function(asset){return new URL(asset,self.registration.scope).href;});

function canonicalUrl(requestUrl){
  var url=new URL(requestUrl);
  url.search='';
  url.hash='';
  return url.href;
}

function isKnownRequest(request){
  var url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin) return false;
  return OFFLINE_URLS.indexOf(canonicalUrl(request.url))>=0;
}

function putClean(cache,request,response){
  if(!response||!response.ok||response.type==='opaque') return response;
  cache.put(canonicalUrl(request.url),response.clone()).catch(function(){});
  return response;
}

function cachedResponse(cache,request){
  return cache.match(canonicalUrl(request.url)).then(function(found){
    return found||cache.match(request,{ignoreSearch:true});
  });
}

self.addEventListener('install',function(event){
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache){
    return cache.addAll(OFFLINE_ASSETS);
  }).then(function(){
    return self.skipWaiting();
  }));
});

self.addEventListener('activate',function(event){
  event.waitUntil(caches.keys().then(function(names){
    return Promise.all(names.map(function(name){
      if(name.indexOf(CACHE_PREFIX)===0&&name!==CACHE_NAME) return caches.delete(name);
      return Promise.resolve(false);
    }));
  }).then(function(){
    return self.clients.claim();
  }));
});

self.addEventListener('message',function(event){
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',function(event){
  var request=event.request;
  if(!isKnownRequest(request)) return;
  event.respondWith(caches.open(CACHE_NAME).then(function(cache){
    if(request.mode==='navigate'){
      return fetch(request).then(function(response){
        return putClean(cache,request,response);
      }).catch(function(){
        return cachedResponse(cache,request).then(function(found){
          return found||cache.match(new URL('./av-suite.html',self.registration.scope).href);
        });
      });
    }
    return cachedResponse(cache,request).then(function(found){
      if(found) return found;
      return fetch(request).then(function(response){
        return putClean(cache,request,response);
      });
    });
  }));
});
