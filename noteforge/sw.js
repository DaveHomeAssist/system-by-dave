// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// a9b0346dcaaf is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-a9b0346dcaaf';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BKAcHAsE.js","archive-view-Cm1NOkv7.css","backup-D-y8sLQH.js","backup-view-CVaCXYe2.js","bulk-actions-view-B3NhpQBT.css","bulk-actions-view-bELSJu1Z.js","bulk-operations-SDdKB3sc.js","calendar-view-BO6GeRvS.js","calendar-view-BgfVlBp4.css","capture-DkWgccGm.js","capture-service-BHyYsLYO.js","clipper-view-BlJRbHsR.js","command-palette-CG-SuSpc.css","command-palette-Dyipd-nJ.js","daily-workflow-Bwsz74w7.js","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-Bjgn6Zt1.css","find-replace-view-UAnyb5ZK.js","frontmatter-Bcx3XVm4.js","frontmatter-boundary-CJ0VwYmQ.js","graph-CZFxSLyr.css","graph-OmGB0mQL.js","helpers-By97PZgD.js","history-view-BeKSp_yf.js","index-CkPJMZ2S.js","index-DKNiWq96.css","json-import-DiAxneV5.js","knowledge-index-DdIYVPNn.css","knowledge-index-z3f3z3GA.js","link-analysis-LMXDj6H7.js","link-tools-view-6i2G8xGb.js","link-tools-view-CVHj6D93.css","local-date-DXNZN3DV.js","modal-BKfRux8_.js","navigation-BuQO3Rc4.js","note-derived-index-CScak0h0.js","outline-view-BZQ132kc.js","outline-view-BjOzAeN4.css","phase4-DU4OeRRP.js","phase5-C3ZxhLgu.js","phase6-CqlQH5e-.css","phase6-Cr2lmv9i.js","phase6-E_FOBrXs.css","properties-view-D0g7WhFw.css","properties-view-JEi-CFJY.js","quick-capture-view-27TN-RVZ.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-DW8eYNJ2.js","reconciliation-view-DrFFyEw_.js","recovery-Fy1R3Pb4.css","recovery-service-Djw6C0og.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-B87ZDQnQ.js","seed-BH2Vx5Bx.js","settings-view-Blxc0Nwq.js","settings-view-DWelmwt3.css","task-dashboard-view-B8YoUXbG.js","task-dashboard-view-Bs_fFUUk.css","task-service-Cx1PHXCJ.js","tasks-Dq7qV0SO.js","trash-view-B7-XwYPG.js","vault-C1UVrSid.js","vault-import-CBYkDk72.js","wikilinks-BN88x-kc.js","workspace-view-BkjZj4VO.css","workspace-view-BsW5Yca3.js","yaml-vendor-wEas4CYs.js"];
const CORE = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'icon.svg',
  ...BUILD_ASSETS.map((asset) => BASE + 'assets/' + asset),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // The canonical app shares an origin with other System by Dave tools.
      // Prune only stale NoteForge caches; deleting every other origin cache
      // would break offline state owned by those sibling applications.
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('noteforge-') && key !== CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return; // leave cross-origin to the network

  // Navigations: network-first so updates land, cached shell for offline launch.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only cache a good shell — never store a 5xx/404 error page as the
          // offline fallback.
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(SHELL).then((r) => r || caches.match(BASE + 'index.html')))
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    // Static hosts/dev previews may add `Vary: Origin`; module requests carry
    // an Origin header while install-time precache requests may not. These are
    // already same-origin, immutable hashed assets, so ignore that response
    // variance or a fully populated cache can still miss while offline.
    caches.match(req, { ignoreVary: true }).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
