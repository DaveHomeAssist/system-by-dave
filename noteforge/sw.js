// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 4e57dfce17bc is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-4e57dfce17bc';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Bx1t76FJ.css","archive-view-S83RAc5n.js","backup-DBT_Rzyk.js","backup-view-D-NHwwgo.js","bulk-actions-view-DU7_ZwNC.css","bulk-actions-view-DunRy-z2.js","bulk-operations-CtjRyVGc.js","calendar-view-DxjJzFlV.js","calendar-view-uXSsRDsG.css","capture-BFYSVW-U.js","capture-service-B0cMMTKY.js","clipper-view-CadSc3HI.js","command-palette-Bqn9nxgm.js","daily-workflow-NwYMBFHB.js","download-cHbvoDXT.js","export-CQTA9aVl.js","find-replace-view-BAS3Zj8Y.js","find-replace-view-l1ZWcInd.css","frontmatter-CcXAZHU6.js","graph-3W6ZHGws.css","graph-xkyBfg6G.js","history-view-BhC6hGJI.js","index-C9X9iXpA.js","index-F8mr7ArO.css","index-Od1htdfF.js","json-import-Bag6aQR3.js","knowledge-index-BU1sODP5.js","knowledge-index-Cg_8KwDd.css","link-analysis-CS9k0Eiq.js","link-tools-view-B46YB13V.js","link-tools-view-DkKgHid1.css","local-date-D7nCZqJh.js","modal-B8ijVa9e.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-CLOZmeL0.css","outline-view-DheWjGwP.js","phase4-BxBfWhHh.js","phase5-Lzb6qmQ4.js","phase6-BdEw2Hus.css","phase6-CBthqZUs.js","phase6-rQ8g05RI.css","properties-view-CaWUdgM2.js","properties-view-DMSlkeYM.css","quick-capture-view-B8QGPBTx.css","quick-capture-view-DBVzNSuH.js","reconciliation-service-B9LYSygI.js","reconciliation-view-BeaGQy6c.js","recovery-TEH3oojh.css","recovery-service-BrStENK8.js","revision-store-ffIRIBbq.js","saved-searches-view-CVQBorZJ.js","saved-searches-view-ljHrPWiN.css","seed-BwJG5v3t.js","settings-view-DYAxZ_UA.js","task-dashboard-view-BXz5_rJ2.js","task-dashboard-view-DQ1L1Zvr.css","task-service-CE3qfM84.js","tasks-mvF0xJT8.js","trash-view-Dcj7PP83.js","vault-fL_XDcnm.js","vault-import-DdN9Yt5S.js","workspace-view-BhE8bVVw.js","workspace-view-DGN3BX9Z.css"];
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
