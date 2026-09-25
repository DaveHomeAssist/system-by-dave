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

function inScope(url){
  return url.origin===self.location.origin&&url.href.indexOf(self.registration.scope)===0;
}

/* A page that was never saved for offline use gets this instead of the
   browser's own error page (REL-007). */
function offlinePage(){
  var html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    +'<meta name="robots" content="noindex"><title>Offline \u00b7 AV by Dave</title>'
    +'<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f6f1e7;color:#221c16;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}'
    +'@media (prefers-color-scheme:dark){body{background:#15181d;color:#e9eef5}a{color:#f0b35a}}'
    +'main{max-width:34rem}h1{font-size:1.5rem;margin:0 0 .5rem}a{color:#9c4a1c;font-weight:700}'
    +'ul{padding-left:1.2rem}li{margin:.35rem 0}</style></head><body><main>'
    +'<h1>You\u2019re offline</h1><p>This page isn\u2019t saved on this device, so it can\u2019t open without a connection. Your saved AV by Dave work is still here.</p>'
    +'<ul><li><a href="'+new URL('./av-suite.html?entry=show',self.registration.scope).href+'">Open the Show Console</a></li>'
    +'<li><a href="'+new URL('./av-suite.html?entry=toolbox',self.registration.scope).href+'">Open the AV Toolbox</a></li></ul>'
    +'<p>Reconnect and reload to open this page.</p></main></body></html>';
  return new Response(html,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

self.addEventListener('fetch',function(event){
  var request=event.request;
  if(!isKnownRequest(request)){
    if(request.method==='GET'&&request.mode==='navigate'&&inScope(new URL(request.url))){
      event.respondWith(fetch(request).catch(offlinePage));
    }
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(function(cache){
    if(request.mode==='navigate'){
      return fetch(request).then(function(response){
        return putClean(cache,request,response);
      }).catch(function(){
        return cachedResponse(cache,request).then(function(found){
          if(found) return found;
          var fallback=new URL(request.url).pathname===new URL('./',self.registration.scope).pathname?'./av-suite-landing2.html':'./av-suite.html';
          return cache.match(new URL(fallback,self.registration.scope).href).then(function(page){return page||offlinePage();});
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
