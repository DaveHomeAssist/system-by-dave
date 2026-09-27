// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// f921894fdc48 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-f921894fdc48';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Bx1t76FJ.css","archive-view-CMiq-T6B.js","backup-DtzDsQhZ.js","backup-view-4HdRznRy.js","bulk-actions-view-BELmChun.js","bulk-actions-view-DU7_ZwNC.css","bulk-operations-vfjSik0o.js","calendar-view-BTO3eN1t.css","calendar-view-CPlHt0ow.js","capture-C4nteN41.js","capture-service-D7b0hqeh.js","clipper-view-CbCFk3dA.js","command-palette-Dz8jsUjt.js","command-palette-VINLX4G4.css","daily-workflow-CceknJqF.js","download-cHbvoDXT.js","export-D2sDyHRa.js","find-replace-view-iACftLKJ.js","find-replace-view-l1ZWcInd.css","frontmatter-t8GaXTvT.js","graph-3W6ZHGws.css","graph-CVsX-_Z6.js","history-view-CnJpx-2K.js","index-BF2zo_P-.css","index-BlSoC4C_.js","index-DUH2zrfw.js","json-import-Bag6aQR3.js","knowledge-index-Cg_8KwDd.css","knowledge-index-CpnjagdZ.js","link-analysis-ChwT1_R_.js","link-tools-view-C0FLM4mZ.js","link-tools-view-DkKgHid1.css","local-date-D7nCZqJh.js","modal-CduWBmpy.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-B3d10vkL.js","outline-view-CLOZmeL0.css","phase4-CLSmxthb.js","phase5-D8lFV-xY.js","phase6--qzvjXVg.js","phase6-BNBptog1.css","phase6-BtvCnFWi.css","properties-view-B7IZIp0N.js","properties-view-DMSlkeYM.css","quick-capture-view-B8QGPBTx.css","quick-capture-view-DGdd6HVr.js","reconciliation-service-_sVEs5aZ.js","reconciliation-view-H9XnjvAf.js","recovery-TEH3oojh.css","recovery-service-BDsxTJNd.js","revision-store-BCAgZiKB.js","saved-searches-view-CYOJ-I2S.css","saved-searches-view-DS508DU8.js","seed-BwJG5v3t.js","settings-view-C543NJj2.js","settings-view-D8B_3NBf.css","task-dashboard-view-CltVPLLD.css","task-dashboard-view-DBVSlHXz.js","task-service-CSWqM6Nz.js","tasks-Pjg9YOte.js","trash-view-DYvub0tm.js","vault-D_1NZJq6.js","vault-import-DA8GWE-S.js","workspace-view-Clhrz1uT.js","workspace-view-DGN3BX9Z.css"];
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
