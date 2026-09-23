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
  return url.pathname===new URL('./',self.registration.scope).pathname
    || OFFLINE_URLS.indexOf(canonicalUrl(request.url))>=0;
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

var CRITICAL_ASSETS=[
  './av-suite-landing.html',
  './css/av-landing.css',
  './js/av-landing.js',
  './av-suite-landing2.html',
  './css/av-landing-alt.css',
  './js/av-landing-alt.js',
  './av-suite.html',
  './css/av-suite.css',
  './js/av-suite/theme-bootstrap.js',
  './js/av-suite/modal-controller.js',
  './js/av-suite/app.js',
  './js/sbd-registry.js',
  './css/sbd-public-nav.css',
  './css/av-theme.css',
  './js/vendor/gsap.min.js',
  './svg/system_by_dave_logo_rust.svg',
  './manifest.json',
  './fonts/dm-sans.woff2',
  './fonts/dm-serif-display.woff2',
  './fonts/dm-serif-display-italic.woff2',
  './fonts/jetbrains-mono.woff2'
];
var OPTIONAL_ASSETS=OFFLINE_ASSETS.filter(function(asset){return CRITICAL_ASSETS.indexOf(asset)<0;});

function cacheOptionalAssets(cache){
  return Promise.all(OPTIONAL_ASSETS.map(function(asset){
    return cache.add(asset).then(function(){return {asset:asset,ok:true};}).catch(function(){return {asset:asset,ok:false};});
  }));
}

self.addEventListener('install',function(event){
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache){
    return cache.addAll(CRITICAL_ASSETS).then(function(){
      return cacheOptionalAssets(cache);
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
          var fallback=new URL(request.url).pathname===new URL('./',self.registration.scope).pathname?'./av-suite-landing.html':'./av-suite.html';
          return cache.match(new URL(fallback,self.registration.scope).href);
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
