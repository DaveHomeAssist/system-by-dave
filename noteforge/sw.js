// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 334a8ab7ee5c is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-334a8ab7ee5c';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Bx1t76FJ.css","archive-view-DZD9oUdL.js","backup-DrkKoEa1.js","backup-view-BG0cvL0b.js","bulk-actions-view-DU7_ZwNC.css","bulk-actions-view-DWFZNKkV.js","bulk-operations-CdQgIkvn.js","calendar-view-BTO3eN1t.css","calendar-view-Cuh18GPY.js","capture-C4nteN41.js","capture-service-BPge-uRu.js","clipper-view-mzZPYj2U.js","command-palette-DefxxqXD.js","command-palette-VINLX4G4.css","daily-workflow-C-e3Yqlm.js","download-cHbvoDXT.js","export-UP4yiFKd.js","find-replace-view-T2NUEDvg.js","find-replace-view-l1ZWcInd.css","frontmatter-kgmfl76D.js","graph-3W6ZHGws.css","graph-DaNCrA5V.js","history-view-CfKQapE1.js","index-BF2zo_P-.css","index-BuPfyFGl.js","index-DUH2zrfw.js","json-import-Bag6aQR3.js","knowledge-index-C7CBYtSp.js","knowledge-index-Cg_8KwDd.css","link-analysis-Bcsp0Dyt.js","link-tools-view-DkKgHid1.css","link-tools-view-kmvEKL01.js","local-date-D7nCZqJh.js","modal-CduWBmpy.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-CLOZmeL0.css","outline-view-YH7qZEQ1.js","phase4-Bio6VxNJ.js","phase5-14ZwqkXX.js","phase6-BNBptog1.css","phase6-Bq_lcnPi.js","phase6-BtvCnFWi.css","properties-view-DMSlkeYM.css","properties-view-Dnbt7EyW.js","quick-capture-view-0Ccy7xuY.js","quick-capture-view-B8QGPBTx.css","reconciliation-service-CfOCJc5A.js","reconciliation-view-mVeGv-bG.js","recovery-TEH3oojh.css","recovery-service-1vLxo3EI.js","revision-store-BCAgZiKB.js","saved-searches-view-CYOJ-I2S.css","saved-searches-view-_d8ukEFZ.js","seed-BwJG5v3t.js","settings-view-CB8pzEcB.js","settings-view-D8B_3NBf.css","task-dashboard-view-CltVPLLD.css","task-dashboard-view-DKW18YFB.js","task-service-qayzYMPc.js","tasks-Pjg9YOte.js","trash-view-CH30tujh.js","vault-DXPrpHyT.js","vault-import-C8mz_kwE.js","workspace-view-DGN3BX9Z.css","workspace-view-DdriTxro.js"];
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
