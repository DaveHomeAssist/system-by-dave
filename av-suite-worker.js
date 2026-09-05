'use strict';

/* Offline cache worker for the AV Suite. The asset manifest and cache version
   come from js/sbd-registry.js — the single source of truth for tools. Bump
   SBD_REGISTRY.version whenever a tool or shared asset changes. */
importScripts('./js/sbd-registry.js');

var CACHE_PREFIX='sbd-av-suite-';
var CACHE_NAME=CACHE_PREFIX+self.SBD_REGISTRY.version;
var OFFLINE_ASSETS=self.SBD_REGISTRY.offlineAssets();
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
  if(event.data&&event.data.type==='SBD_OFFLINE_VERSION'&&event.ports&&event.ports[0]){
    event.ports[0].postMessage({version:self.SBD_REGISTRY.version,cache:CACHE_NAME});
  }
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
