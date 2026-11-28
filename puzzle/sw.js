// Service worker for the hosted Cross-Pollinate export.
// Page loads go to the network first, so a new puzzle or fix shows up at once. The cached
// copy is only the fallback when the network is down or slower than `patience`.
// The build stamps the cache name, so every release installs a fresh worker and cache.
const CACHE = 'cross-pollinate-ca7080b78def';
const BASE = new URL('./', self.location).pathname;
const PRECACHE = ["", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"].map(path => BASE + path);
const patience = 6000;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // Other System by Dave tools share this origin. Remove only this game's older caches.
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('cross-pollinate-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

function page(event) {
  const fresh = caches.open(CACHE).then(async cache => {
    const response = await fetch(event.request);
    if (response.ok) await cache.put(BASE, response.clone());
    return response;
  });
  event.waitUntil(fresh.catch(() => undefined));
  return caches.match(BASE).then(saved => {
    if (!saved) return fresh;
    const slow = new Promise(resolve => setTimeout(() => resolve(saved.clone()), patience));
    return Promise.race([fresh.catch(() => saved.clone()), slow]);
  });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(event));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then(saved => saved ?? fetch(request)));
});
