'use strict';

// Offline cache for Camera Shading Practice. Every listed file is fetched from
// the network first and saved, so an online visit always gets one consistent
// release; the saved copies serve the page when the network is unavailable.
const VERSION = 'v20260923-shader-practice-console-2';
const CACHE_PREFIX = 'sbd-shader-practice-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const ASSETS = [
  './practice.html',
  './practice.css',
  './practice-theme.js',
  './shading-practice-state.js',
  './practice-render.js',
  './practice-app.js',
  './index.html',
  '../css/fonts.css',
  '../css/style.css',
  '../css/sbd-public-nav.css'
];
const URLS = ASSETS.map(asset => new URL(asset, self.registration.scope).href);
const NETWORK_TIMEOUT = 4000;

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

function fromNetwork(request, cache, key) {
  return fetch(request).then(response => {
    if (response.ok) cache.put(key, response.clone()).catch(() => {});
    return response;
  });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const key = canonical(event.request.url);
  if (!URLS.includes(key)) return;
  const opened = caches.open(CACHE_NAME);
  const network = opened.then(cache => fromNetwork(event.request, cache, key));
  // Keep the worker alive until the saved copy is refreshed.
  event.waitUntil(network.then(() => undefined, () => undefined));
  event.respondWith((async () => {
    const cache = await opened;
    const cached = await cache.match(key);
    if (!cached) {
      try {
        return await network;
      } catch {
        if (event.request.mode === 'navigate') {
          const page = await cache.match(new URL('./practice.html', self.registration.scope).href);
          if (page) return page;
        }
        return Response.error();
      }
    }
    // A slow network or a server error falls back to the saved copy; a good
    // response still refreshes it. Redirects and removals pass through.
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), NETWORK_TIMEOUT));
    try {
      const response = await Promise.race([network, timeout]);
      return response && response.status < 500 ? response : cached;
    } catch {
      return cached;
    }
  })());
});
