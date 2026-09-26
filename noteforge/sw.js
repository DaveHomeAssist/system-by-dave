// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 6963d3624f76 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-6963d3624f76';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Bx1t76FJ.css","archive-view-qrLTgpVp.js","backup-BeC9uZAm.js","backup-view-BF6ZS_VS.js","bulk-actions-view-D3a-4xGS.js","bulk-actions-view-DU7_ZwNC.css","bulk-operations-DigDngyo.js","calendar-view-PrvdoiZV.js","calendar-view-uXSsRDsG.css","capture-BFYSVW-U.js","capture-service-BKxB60NJ.js","clipper-view-BiUTetqi.js","command-palette-ByIKOIm9.js","command-palette-VINLX4G4.css","daily-workflow-CL1mp1py.js","download-cHbvoDXT.js","export-2fiDOWi7.js","find-replace-view-CWbFq742.js","find-replace-view-l1ZWcInd.css","frontmatter-2MoGEFyo.js","graph-3W6ZHGws.css","graph-C3v1LJWi.js","history-view-JVZpsBVl.js","index-D3JBTzHo.js","index-DODLcpxP.css","index-Od1htdfF.js","json-import-Bag6aQR3.js","knowledge-index-Bgtf9RUH.js","knowledge-index-Cg_8KwDd.css","link-analysis-Bedh7TUn.js","link-tools-view-8flSU41u.js","link-tools-view-DkKgHid1.css","local-date-D7nCZqJh.js","modal-B8ijVa9e.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-5B1LK2Lo.js","outline-view-CLOZmeL0.css","phase4-_UoMkqDY.js","phase5-BCe_5ViX.js","phase6-BNBptog1.css","phase6-CMd7CTYv.js","phase6-rQ8g05RI.css","properties-view-D6pm71Uh.js","properties-view-DMSlkeYM.css","quick-capture-view-B8QGPBTx.css","quick-capture-view-DPBXpm70.js","reconciliation-service-s0-RtLml.js","reconciliation-view-DOJsaUsR.js","recovery-TEH3oojh.css","recovery-service-CJsvStfY.js","revision-store-ffIRIBbq.js","saved-searches-view-B6lvDkpx.js","saved-searches-view-ljHrPWiN.css","seed-BwJG5v3t.js","settings-view-BJESrdmm.js","task-dashboard-view-BD44Bydr.js","task-dashboard-view-DQ1L1Zvr.css","task-service-B--JHFwM.js","tasks-mvF0xJT8.js","trash-view-Dp_KxFrB.js","vault-DIWQcEwu.js","vault-import-D2gYrsc1.js","workspace-view-DGN3BX9Z.css","workspace-view-TiD0C-Mm.js"];
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
