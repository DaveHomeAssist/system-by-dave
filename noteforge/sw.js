// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 83dc2cd829f0 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-83dc2cd829f0';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-CDrVkqCO.js","archive-view-Cm1NOkv7.css","backup-BdgpAMUu.js","backup-view-CU4VT-rC.js","banner-picker-BcezheVO.css","banner-picker-CqMOIQ2t.js","bulk-actions-view-0UGeqDIK.css","bulk-actions-view-Wh7n7-u_.js","bulk-operations-BOUB2gs8.js","calendar-view-CCHljOiW.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-Dm5r-keq.js","clipper-view-D_BGUV6p.js","command-palette-C1SSZ8eb.css","command-palette-C262tdMu.js","conflict-recovery-B269hoGa.js","conflict-view-BRM01voR.js","conflict-view-Cs_al3Pz.css","daily-workflow-Bwsz74w7.js","dialogs-1B_oYb1m.js","dialogs-CHpve8H-.css","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-gX2BIyxF.js","frontmatter-BlN6IakX.js","frontmatter-boundary-CJ0VwYmQ.js","graph-CZFxSLyr.css","graph-hGd7M71e.js","helpers-By97PZgD.js","history-view-DSW6qi_a.js","index-DsB5O57t.css","index-e4aifkn0.js","json-import-DiAxneV5.js","knowledge-index-DdIYVPNn.css","knowledge-index-g2YFzpaB.js","link-analysis-1JXLoQTy.js","link-tools-view-B7sReokO.css","link-tools-view-qgrTAKkA.js","local-date-DXNZN3DV.js","main-view-Cds4zoRB.js","modal-Cly70wBI.js","navigation-BjmD78bN.js","note-derived-index-EnY7tQtT.js","outline-view-CutEnGFL.css","outline-view-Cvxk2w2a.js","palette-commands-BeyAal1u.js","phase4-C0HGXFgC.js","phase5-CTjIQ_p2.js","phase6-B-8LLloZ.js","phase6-B_zBIWCh.css","phase6-E_FOBrXs.css","properties-view-D0g7WhFw.css","properties-view-DhxI7V8i.js","quick-capture-view-CXjnrZux.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-CRxduoLT.js","reconciliation-view-CUJMER4E.js","recovery-Fy1R3Pb4.css","recovery-service-djtfmNKt.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-byjHMbY1.js","seed-BH2Vx5Bx.js","settings-view-BAUeiaGa.js","settings-view-DWelmwt3.css","storage-archive-BApFxdzC.js","storage-lease-DfmgVNMa.js","task-dashboard-view-Bs_fFUUk.css","task-dashboard-view-DVjN7C1M.js","task-service-B0HFcYYT.js","tasks-Dq7qV0SO.js","trash-view-BaKESpWX.js","vault-GJv-6dyF.js","vault-import-Dd2qDtli.js","vault-refresh-7Izhz5yK.js","vault-refresh-Cwt-MO_v.js","wikilinks-BN88x-kc.js","workspace-view-B0qYDvBd.js","workspace-view-DuwYlSe0.css","yaml-vendor-wEas4CYs.js"];
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
