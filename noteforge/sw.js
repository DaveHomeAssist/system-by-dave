// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 204da496ccb6 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-204da496ccb6';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BsjGWlqZ.js","archive-view-Bx1t76FJ.css","backup-BXV8vV0o.js","backup-view-Bcj1mbj8.js","bulk-actions-view-BCvpCkcX.js","bulk-actions-view-DU7_ZwNC.css","bulk-operations-ByCFMGTO.js","calendar-view-DG5-xcYF.js","calendar-view-uXSsRDsG.css","capture-C4nteN41.js","capture-service-g_WdqTsP.js","clipper-view-RpXR3UEn.js","command-palette-VINLX4G4.css","command-palette-n1mdBHp3.js","daily-workflow-reJnkwmL.js","download-cHbvoDXT.js","export-BeMUVu1C.js","find-replace-view-BOuuUz-F.js","find-replace-view-l1ZWcInd.css","frontmatter-DWrnLB2O.js","graph-3W6ZHGws.css","graph-CHQ6puk_.js","history-view-Bb79xXey.js","index-BF2zo_P-.css","index-CAHbhHZn.js","index-DUH2zrfw.js","json-import-Bag6aQR3.js","knowledge-index-Cg_8KwDd.css","knowledge-index-D4gGQ0yQ.js","link-analysis-wvDQ0Byb.js","link-tools-view-DkKgHid1.css","link-tools-view-Uw-7cSV1.js","local-date-D7nCZqJh.js","modal-CduWBmpy.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-C0tvRT_b.js","outline-view-CLOZmeL0.css","phase4-ZTQqyZbN.js","phase5-MyS2Dzgx.js","phase6-BNBptog1.css","phase6-DI3y3sfV.js","phase6-rQ8g05RI.css","properties-view-BQV6VGk4.js","properties-view-DMSlkeYM.css","quick-capture-view-B8QGPBTx.css","quick-capture-view-DWBazT_m.js","reconciliation-service-B_zwjy-q.js","reconciliation-view-D33MGrCV.js","recovery-TEH3oojh.css","recovery-service-DfjZpRvE.js","revision-store-BCAgZiKB.js","saved-searches-view-C1Uk0Zth.js","saved-searches-view-ljHrPWiN.css","seed-BwJG5v3t.js","settings-view-BgcIJpGf.js","settings-view-D8B_3NBf.css","task-dashboard-view-BbAB30Gt.js","task-dashboard-view-DQ1L1Zvr.css","task-service-BvDEszZU.js","tasks-Pjg9YOte.js","trash-view-TiZ3CMr6.js","vault-DSqyuULS.js","vault-import-9KT1-y2x.js","workspace-view-D5h_Owpq.js","workspace-view-DGN3BX9Z.css"];
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
