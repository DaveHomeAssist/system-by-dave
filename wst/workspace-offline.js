// Keep a previously opened Notes screen available if the venue connection drops.
const cacheName = 'wst-frozen-notes-shell-v1';
const root = new URL('./', self.location.href);
const resources = ['index.html','workspace.js','workspace.css','calendar.js','frozen-theme.js',
 'frozen-theme.css','snow-splash.css','snow-splash.js','vendor/gsap.min.js'];
const allowed = new Set(resources.map(path => new URL(path, root).href));
self.addEventListener('install', event => {
 event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(resources)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
 const request = event.request;
 if (request.method !== 'GET') return;
 const url = new URL(request.url);
 const shell = request.mode === 'navigate' && (url.pathname === root.pathname || url.href === new URL('index.html',root).href);
 if (url.origin !== root.origin || (!shell && !allowed.has(url.href))) return;
 const key = shell ? new URL('index.html',root).href : url.href;
 event.respondWith((async () => {
  const cache = await caches.open(cacheName);
  try {
   const response = await fetch(request);
   if (response.ok) await cache.put(key,response.clone());
   return response;
  } catch (error) {
   const cached = await cache.match(key);
   if (cached) return cached;
   throw error;
  }
 })());
});
