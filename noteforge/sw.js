// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// fa54da08407a is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-fa54da08407a';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BCA9va-W.js","archive-view-Bx1t76FJ.css","backup-B8dIfNV2.js","backup-view-PqwdiG9h.js","bulk-actions-view-BIPjWm64.js","bulk-actions-view-DU7_ZwNC.css","bulk-operations-Dhq-Yreq.js","calendar-view-48vGy53u.js","calendar-view-uXSsRDsG.css","capture-C4nteN41.js","capture-service-D1Vqo9Za.js","clipper-view-M7y4rlcj.js","command-palette-CMHsdXGU.js","command-palette-VINLX4G4.css","daily-workflow-qBMIAYxF.js","download-cHbvoDXT.js","export-DEDoQWj7.js","find-replace-view-C-h_VNoW.js","find-replace-view-l1ZWcInd.css","frontmatter-BepvwWGW.js","graph-3W6ZHGws.css","graph-BvL9F9l4.js","history-view-ophjGzCy.js","index-BF2zo_P-.css","index-C-GdvDJE.js","index-Od1htdfF.js","json-import-Bag6aQR3.js","knowledge-index-Cg_8KwDd.css","knowledge-index-pG-1pKUK.js","link-analysis-BwwapbZi.js","link-tools-view-Bhvy4VwT.js","link-tools-view-DkKgHid1.css","local-date-D7nCZqJh.js","modal-CduWBmpy.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-Blukp-FW.js","outline-view-CLOZmeL0.css","phase4-BOQLhvzD.js","phase5-CleCvn1F.js","phase6-3QKghEI7.js","phase6-BNBptog1.css","phase6-rQ8g05RI.css","properties-view-C5_VWB5O.js","properties-view-DMSlkeYM.css","quick-capture-view-10CHcdFm.js","quick-capture-view-B8QGPBTx.css","reconciliation-service-8Tg-dVYZ.js","reconciliation-view-Ck0cN22S.js","recovery-TEH3oojh.css","recovery-service-BRMnuHR4.js","revision-store-BCAgZiKB.js","saved-searches-view-B_-hBpan.js","saved-searches-view-ljHrPWiN.css","seed-BwJG5v3t.js","settings-view-D8B_3NBf.css","settings-view-IJxuuq7o.js","task-dashboard-view-CavTLb9X.js","task-dashboard-view-DQ1L1Zvr.css","task-service-By1lG0Ma.js","tasks-Pjg9YOte.js","trash-view-C-m4nme6.js","vault-D8zRL4sA.js","vault-import-CkdVqBB-.js","workspace-view-DGN3BX9Z.css","workspace-view-mHKQXcXM.js"];
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
