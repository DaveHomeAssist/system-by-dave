'use strict';

const VERSION = 'v20260923-shader-practice-relocation';
const CACHE_PREFIX = 'sbd-shader-practice-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const ASSETS = ['./practice.html', './shading-practice-state.js', './index.html'];
const URLS = ASSETS.map(asset => new URL(asset, self.registration.scope).href);

function canonical(value) {
  const url = new URL(value);
  url.search = '';
  url.hash = '';
  return url.href;
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.map(name => {
    if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) return caches.delete(name);
    return false;
  }))).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SBD_CLAIM_CLIENTS') event.waitUntil(self.clients.claim());
  if (event.data?.type === 'SBD_OFFLINE_VERSION' && event.ports?.[0]) {
    event.ports[0].postMessage({ version: VERSION, cache: CACHE_NAME });
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const key = canonical(event.request.url);
  if (!URLS.includes(key)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    if (event.request.mode === 'navigate') {
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(key, response.clone());
        return response;
      } catch {
        return (await cache.match(key)) || cache.match(new URL('./practice.html', self.registration.scope).href);
      }
    }
    return (await cache.match(key)) || fetch(event.request).then(response => {
      if (response.ok) cache.put(key, response.clone()).catch(() => {});
      return response;
    });
  }));
});
