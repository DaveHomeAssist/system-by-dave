// Keep a previously opened Notes screen available if the venue connection drops.
const cacheName = 'wst-frozen-notes-shell-nav-20261120';
const root = new URL('./', self.location.href);
const resources = ['index.html','workspace.js','workspace.css','calendar.js','frozen-theme.js',
 'frozen-theme.css','snow-splash.css','snow-splash.js','vendor/gsap.min.js'];
const navigation = ['workspace-navigation.js','workspace-navigation.css','opening-night.js'];
const allowed = new Set([...resources,...navigation].map(path => new URL(path, root).href));
self.addEventListener('install', event => {
 event.waitUntil(caches.open(cacheName).then(async cache => {
  await cache.addAll(resources);
  const shell = await cache.match(new URL('index.html',root).href);
  if ((await shell.text()).includes('data-wst-header')) await cache.addAll(navigation);
 }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('wst-frozen-notes-shell-')&&key!==cacheName)await caches.delete(key);await self.clients.claim();})()));
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
