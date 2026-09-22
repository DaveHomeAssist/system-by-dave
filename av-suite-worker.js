'use strict';

/* Offline cache worker for the AV Suite. The asset manifest and cache version
   come from js/sbd-registry.js — the single source of truth for tools. Bump
   SBD_REGISTRY.version whenever a tool or shared asset changes. */
importScripts('./js/sbd-registry.js');

var CACHE_PREFIX='sbd-av-suite-';
var CACHE_NAME=CACHE_PREFIX+self.SBD_REGISTRY.version;
var OFFLINE_ASSETS=self.SBD_REGISTRY.offlineAssets();
var SHELL_ASSETS=(self.SBD_REGISTRY.baseAssets||[]).slice();
var OFFLINE_URLS=OFFLINE_ASSETS.map(function(asset){return new URL(asset,self.registration.scope).href;});
var SUITE_URL=new URL('./av-suite.html',self.registration.scope).href;

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

function isSuiteNavigation(request){
  var dest=canonicalUrl(request.url);
  if(dest===SUITE_URL) return true;
  var url=new URL(request.url);
  var path=url.pathname.replace(/\/+$/,'')||'/';
  var scopePath=new URL('./',self.registration.scope).pathname.replace(/\/+$/,'')||'/';
  return path===scopePath||path===scopePath+'/av-suite.html';
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

function addAsset(cache,asset){
  return cache.add(asset).then(function(){return {asset:asset,ok:true};}).catch(function(){
    return {asset:asset,ok:false};
  });
}

function offlineToolFallback(){
  var body='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline — AV by Dave</title><style>body{font:15px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;margin:32px;color:#14181c;background:#f4f0e8}a{color:#9e432b}</style></head><body><p>This AV tool page is not in the offline cache.</p><p>Open AV Suite while online and use Cache AV Tools, then retry this page.</p><p><a href="./av-suite.html">Back to AV Suite</a></p></body></html>';
  return new Response(body,{status:503,statusText:'Offline',headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

self.addEventListener('install',function(event){
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache){
    var shell=SHELL_ASSETS.length?SHELL_ASSETS:['./av-suite.html','./av-suite-worker.js','./js/sbd-registry.js'];
    var shellSet={};
    shell.forEach(function(asset){shellSet[asset]=true;});
    var optional=OFFLINE_ASSETS.filter(function(asset){return !shellSet[asset];});
    return cache.addAll(shell).then(function(){
      return Promise.all(optional.map(function(asset){return addAsset(cache,asset);}));
    });
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
  if(event.data&&event.data.type==='SBD_CLAIM_CLIENTS'&&event.origin===self.location.origin
    &&event.source&&event.source.type==='window'&&event.source.url.indexOf(self.registration.scope)===0){
    // A navigation that was not execution-ready during activation was skipped
    // by clients.claim(). The loaded page can now safely request control.
    event.waitUntil(self.clients.claim());
  }
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
          if(found) return found;
          if(isSuiteNavigation(request)) return cache.match(SUITE_URL);
          return offlineToolFallback();
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
