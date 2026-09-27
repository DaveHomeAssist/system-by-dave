// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// c7243565860b is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-c7243565860b';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-CFjzTYsl.js","archive-view-Cm1NOkv7.css","backup-D4K8_gNr.js","backup-view-Ba2JeoxL.js","bulk-actions-view-B3NhpQBT.css","bulk-actions-view-Bcs6pdYB.js","bulk-operations-CwZr4jjN.js","calendar-view-T7NSgih5.css","calendar-view-o-heutSR.js","capture-DkWgccGm.js","capture-service-B7Cajzb8.js","clipper-view-B2rgmZEH.js","command-palette-C1SSZ8eb.css","command-palette-Cy_gvO0Q.js","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-rQrfzPKP.js","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-hsbVETFE.js","frontmatter-boundary-CJ0VwYmQ.js","frontmatter-k6ekrUhX.js","graph-CZFxSLyr.css","graph-DXJMPGMm.js","helpers-By97PZgD.js","history-view-wyM-Q6Qu.js","index-CPhzUx-j.css","index-D1p3U1Y1.js","json-import-DiAxneV5.js","knowledge-index-CJhTU6VF.js","knowledge-index-DdIYVPNn.css","link-analysis-CokdAB33.js","link-tools-view-B7sReokO.css","link-tools-view-DhobMpFC.js","local-date-DXNZN3DV.js","main-view-srQdReds.js","modal-DIyZkW5u.js","navigation-BuQO3Rc4.js","note-derived-index-CwbfhIeJ.js","outline-view-CutEnGFL.css","outline-view-WAdQQ8Ph.js","phase4-BWwOcIfs.js","phase5-BuWT0jyt.js","phase6-B_zBIWCh.css","phase6-BrpGtN3v.js","phase6-E_FOBrXs.css","properties-view-D0g7WhFw.css","properties-view-DX_vBSlX.js","quick-capture-view-DWJUcvBL.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-h9hl8MGN.js","reconciliation-view-Gefa0yAc.js","recovery-Fy1R3Pb4.css","recovery-service-Bqrqa-7Q.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-CbLb9aL9.js","seed-BH2Vx5Bx.js","settings-view-DDOf1NRJ.js","settings-view-DWelmwt3.css","task-dashboard-view-Bs_fFUUk.css","task-dashboard-view-CiPXcsU7.js","task-service-AH_3uxg8.js","tasks-Dq7qV0SO.js","trash-view-BcQu9d_x.js","vault--aYJpxV-.js","vault-import-ds_HSIiZ.js","wikilinks-BN88x-kc.js","workspace-view-DCT7gtWh.js","workspace-view-DuwYlSe0.css","yaml-vendor-wEas4CYs.js"];
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
