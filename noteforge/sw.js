// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 1879c26ea731 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-1879c26ea731';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BCXdFheY.js","archive-view-Bx1t76FJ.css","backup-DQ2oJ_uR.js","backup-view-BznRDRZl.js","bulk-actions-view-CnZ7KgM8.js","bulk-actions-view-DU7_ZwNC.css","bulk-operations-DXO1thBo.js","calendar-view-BTO3eN1t.css","calendar-view-CWg9ValU.js","capture-C4nteN41.js","capture-service-BYMriN2g.js","clipper-view-CxzKq8P8.js","command-palette-D5p2ec2K.js","command-palette-VINLX4G4.css","daily-workflow-D76AiVYC.js","download-cHbvoDXT.js","export-D9pguAv1.js","find-replace-view-B073StGU.js","find-replace-view-l1ZWcInd.css","frontmatter-BmfXKimm.js","graph-3W6ZHGws.css","graph-Cu387j5Q.js","history-view-D93MDrIl.js","index-B762o65C.js","index-BF2zo_P-.css","index-DUH2zrfw.js","json-import-Bag6aQR3.js","knowledge-index-CLlm4MAz.js","knowledge-index-Cg_8KwDd.css","link-analysis-1ND_ZES3.js","link-tools-view-CFV457BU.js","link-tools-view-DkKgHid1.css","local-date-D7nCZqJh.js","modal-CduWBmpy.js","navigation-CpECTKlr.js","note-derived-index-CC6Q4lNx.js","outline-view-CLOZmeL0.css","outline-view-CqSB9Gmr.js","phase4-B-q5TBAJ.js","phase5-BarWqvbt.js","phase6-BNBptog1.css","phase6-BtvCnFWi.css","phase6-CjVZhpoW.js","properties-view-0Wp1co_j.js","properties-view-DMSlkeYM.css","quick-capture-view-B8QGPBTx.css","quick-capture-view-CRTG_rTS.js","reconciliation-service-DoXIBssx.js","reconciliation-view-Cf-Ah7Uy.js","recovery-TEH3oojh.css","recovery-service-9s8z5Ka1.js","revision-store-BCAgZiKB.js","saved-searches-view-CYOJ-I2S.css","saved-searches-view-ohr8gT_d.js","seed-BwJG5v3t.js","settings-view-CKkh-h7E.js","settings-view-D8B_3NBf.css","task-dashboard-view-CltVPLLD.css","task-dashboard-view-DtJWSqeE.js","task-service-B36xVgeb.js","tasks-Pjg9YOte.js","trash-view-BeOWbzLL.js","vault-BxCfXirm.js","vault-import-BCBRPaR5.js","workspace-view-C6JViLkb.js","workspace-view-DGN3BX9Z.css"];
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
