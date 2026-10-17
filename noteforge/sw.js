// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 3d33de8ebf36 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-3d33de8ebf36';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BLYgwMSG.js","archive-view-Cm1NOkv7.css","assertClassBrand-D9PkfWLR.js","backup-D_BImXxb.js","backup-view-jfmOFleS.js","banner-picker-BcezheVO.css","banner-picker-CBsfffKw.js","bulk-actions-view-0UGeqDIK.css","bulk-actions-view-6J5pyDLg.js","bulk-operations-xX2f75eE.js","calendar-view-DJYltgAg.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-B3zwHDtQ.js","clipper-view-C7gMw4O0.js","command-palette-C1SSZ8eb.css","command-palette-CaJTaz9Q.js","conflict-recovery-CSgyrZ0t.js","conflict-view-Cs_al3Pz.css","conflict-view-DLPqKmsP.js","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-DyDSU00h.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-KoAEF3Uo.js","frontmatter-7JCe7eP8.js","frontmatter-boundary-CJ0VwYmQ.js","graph-BdtiYL_N.js","graph-CZFxSLyr.css","helpers-By97PZgD.js","history-view-BoyQDRWl.js","index-B2mHyZJv.js","index-DsB5O57t.css","json-import-DiAxneV5.js","knowledge-index-DHrkTdIf.js","knowledge-index-DdIYVPNn.css","link-analysis-DxtBg0hM.js","link-tools-view-B7sReokO.css","link-tools-view-Bu2hkjUO.js","local-date-DXNZN3DV.js","main-view-C5oj20ru.js","modal-D5GfQmxS.js","navigation-BjmD78bN.js","note-derived-index-BllaeAkY.js","outline-view-CAls587Q.js","outline-view-CutEnGFL.css","palette-commands-BNXMi5xi.js","phase4-D27brfgm.js","phase5-CNs0W0Hl.js","phase6-B_zBIWCh.css","phase6-ByG089RP.js","phase6-E_FOBrXs.css","properties-view-D0g7WhFw.css","properties-view-Lp2I8hkN.js","quick-capture-view-JSX_keza.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-CSVU5NtM.js","reconciliation-view-DozUfb2N.js","recovery-Fy1R3Pb4.css","recovery-service-CmKF-e8y.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-CIRPNCN0.js","seed-BH2Vx5Bx.js","settings-view-CDuQ1DIr.js","settings-view-DWelmwt3.css","storage-archive-BApFxdzC.js","storage-lease-DfmgVNMa.js","task-dashboard-view-Bs_fFUUk.css","task-dashboard-view-DyKrqnb1.js","task-service-BQYNWqTi.js","tasks-Dq7qV0SO.js","trash-view-Db4LrQqm.js","vault-BX6Lwr4R.js","vault-import-DEvjxVKT.js","vault-refresh-Bu0mqbcG.js","vault-refresh-Cwt-MO_v.js","wikilinks-DXyHZ6rc.js","workspace-view-DEokuXav.js","workspace-view-DuwYlSe0.css","yaml-vendor-BKOgT9JP.js"];
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
