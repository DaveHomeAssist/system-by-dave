// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// d19e9f0d0811 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-d19e9f0d0811';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BAWPxSnV.js","archive-view-Cm1NOkv7.css","backup-qBvz8XSy.js","backup-view-CZwSJ1he.js","bulk-actions-view-B3NhpQBT.css","bulk-actions-view-mvUxaFRu.js","bulk-operations-neqspDup.js","calendar-view-Bx0EPXA3.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-CEsrsqif.js","clipper-view-BlBzIwqR.js","command-palette-CG-SuSpc.css","command-palette-DIuLEt6J.js","daily-workflow-Bwsz74w7.js","dialogs-C_2P6x8y.js","dialogs-DLAR0zTJ.css","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-CVxXp4Ng.js","frontmatter-COL98htA.js","frontmatter-boundary-CJ0VwYmQ.js","graph-B-ujWhh8.js","graph-CZFxSLyr.css","helpers-By97PZgD.js","history-view-CVgBAzGp.js","index-DfTM9sMt.css","index-Oin_eKu4.js","json-import-DiAxneV5.js","knowledge-index--zC3QSun.js","knowledge-index-DdIYVPNn.css","link-analysis-CZoy1_Ip.js","link-tools-view-B7sReokO.css","link-tools-view-D9UYHFaU.js","local-date-DXNZN3DV.js","modal-CbI5pIEv.js","navigation-BuQO3Rc4.js","note-derived-index-CUqgRApo.js","outline-view-BjOzAeN4.css","outline-view-CR9hD-es.js","phase4-CoaWUM4S.js","phase5-BacLVDnR.js","phase6-9ec6bnTu.js","phase6-B_zBIWCh.css","phase6-E_FOBrXs.css","properties-view-CBAoP5Jl.js","properties-view-D0g7WhFw.css","quick-capture-view-X5TCyAGZ.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-BkRDssaX.js","reconciliation-view-61bZVg0G.js","recovery-Fy1R3Pb4.css","recovery-service-G64n_nzG.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-C6JXI8JU.js","seed-BH2Vx5Bx.js","settings-view-DWelmwt3.css","settings-view-dq1K_pY3.js","task-dashboard-view-Bs_fFUUk.css","task-dashboard-view-D-vBNfVQ.js","task-service-BJqRjJ5C.js","tasks-Dq7qV0SO.js","trash-view-C1wAS3HD.js","vault-DbeIniYV.js","vault-import-CbyqmbB6.js","wikilinks-BN88x-kc.js","workspace-view-B2xi6xgO.css","workspace-view-DNaevj8I.js","yaml-vendor-wEas4CYs.js"];
const CORE = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'icon.svg',
  BASE + 'icons.svg',
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
