// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 199805597e61 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-199805597e61';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-4Dy7Iqsg.js","archive-view-Bx1t76FJ.css","backup-DJHV1OxB.js","backup-view-rQ1vaElL.js","bulk-actions-view-DU7_ZwNC.css","bulk-actions-view-Dl0Td4qg.js","bulk-operations-BZatOyUC.js","calendar-view-BhiCh8Vb.js","calendar-view-uXSsRDsG.css","capture-BFYSVW-U.js","capture-service-CPcBs9Wo.js","clipper-view-CdaxROWr.js","command-palette-BnziCRjt.js","command-palette-VINLX4G4.css","daily-workflow-okR1UbtL.js","download-cHbvoDXT.js","export-DDrkXvcu.js","find-replace-view-CTzfAQ81.js","find-replace-view-l1ZWcInd.css","frontmatter-iWQ4Z5G6.js","graph-3W6ZHGws.css","graph-BlJTd4Qf.js","history-view-Dpba-4xp.js","index-BfNy4TFN.js","index-DAMU3QUT.css","index-Od1htdfF.js","json-import-Bag6aQR3.js","knowledge-index-B-rKTgKW.js","knowledge-index-Cg_8KwDd.css","link-analysis-S7ACg12T.js","link-tools-view-DkKgHid1.css","link-tools-view-DsV-7W63.js","local-date-D7nCZqJh.js","modal-B8ijVa9e.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-CLOZmeL0.css","outline-view-fs-i7PnV.js","phase4-BUjAN5n_.js","phase5-C1ZZMuhx.js","phase6-BNBptog1.css","phase6-Bd_PUrNZ.js","phase6-rQ8g05RI.css","properties-view-BO4gto-7.js","properties-view-DMSlkeYM.css","quick-capture-view-B8QGPBTx.css","quick-capture-view-C2cRSE0K.js","reconciliation-service-BKGD68rh.js","reconciliation-view-CrpCtPuf.js","recovery-TEH3oojh.css","recovery-service-CODMv3Mb.js","revision-store-ffIRIBbq.js","saved-searches-view-Crf8ODx-.js","saved-searches-view-ljHrPWiN.css","seed-BwJG5v3t.js","settings-view-QektJTwb.js","task-dashboard-view-DQ1L1Zvr.css","task-dashboard-view-XzZCYmrF.js","task-service-10Qionl-.js","tasks-mvF0xJT8.js","trash-view-CQCXeUcg.js","vault-C6iUF4xk.js","vault-import-Cwtw7WPl.js","workspace-view-BpDMtWse.js","workspace-view-DGN3BX9Z.css"];
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
