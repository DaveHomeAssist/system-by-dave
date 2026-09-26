// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 5366919116ce is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-5366919116ce';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BOipdH0J.js","archive-view-Bx1t76FJ.css","backup-CH12cCXG.js","backup-view-BE_YMUhp.js","bulk-actions-view-CaUjfpVe.js","bulk-actions-view-DU7_ZwNC.css","bulk-operations-B_45fe0A.js","calendar-view-S5ap2fFc.js","calendar-view-uXSsRDsG.css","capture-BFYSVW-U.js","capture-service-D9msJk1f.js","clipper-view-ClQdQiw6.js","command-palette-DCobg8Hj.js","daily-workflow-C3-7LujA.js","download-cHbvoDXT.js","export-95fNdvEb.js","find-replace-view-BTVhOmxr.js","find-replace-view-l1ZWcInd.css","frontmatter-DDIz9QCs.js","graph-3W6ZHGws.css","graph-DVOxNlrL.js","history-view-BI-H38Sy.js","index-DZIoNl3p.js","index-F8mr7ArO.css","index-Od1htdfF.js","json-import-Bag6aQR3.js","knowledge-index-Cg_8KwDd.css","knowledge-index-Dfgo8x2D.js","link-analysis-CQKI0ngK.js","link-tools-view-BxUDfB0s.js","link-tools-view-DkKgHid1.css","local-date-D7nCZqJh.js","modal-B8ijVa9e.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-CE1_fkzm.js","outline-view-CLOZmeL0.css","phase4-C6QU9_s1.js","phase5-NMSkgQIu.js","phase6-BdEw2Hus.css","phase6-BeNjggw8.js","phase6-rQ8g05RI.css","properties-view-BkiSTny4.js","properties-view-DMSlkeYM.css","quick-capture-view-B8QGPBTx.css","quick-capture-view-Bj76xFXV.js","reconciliation-service-zERBLoUj.js","reconciliation-view-SCfMJ3rx.js","recovery-TEH3oojh.css","recovery-service-mFvMnIE1.js","revision-store-ffIRIBbq.js","saved-searches-view-D2D94nQl.js","saved-searches-view-ljHrPWiN.css","seed-BwJG5v3t.js","settings-view-BU9SF_Ib.js","task-dashboard-view-B7yVLb8W.js","task-dashboard-view-DQ1L1Zvr.css","task-service-C3vWstS5.js","tasks-mvF0xJT8.js","trash-view-3U26evao.js","vault-CruTr1hn.js","vault-import-Bf_dz6Cx.js","workspace-view-4_YxkuSp.js","workspace-view-DGN3BX9Z.css"];
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
