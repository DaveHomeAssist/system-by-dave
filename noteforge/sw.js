// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 3557aa60c749 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-3557aa60c749';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Cm1NOkv7.css","archive-view-DWfouxpI.js","assertClassBrand-D9PkfWLR.js","backup-BJpqXeop.js","backup-view-DKf1Tpay.js","banner-picker-BcezheVO.css","banner-picker-DHN2rGfa.js","bulk-actions-view-0UGeqDIK.css","bulk-actions-view-BpNFr7_E.js","bulk-operations-C0sA95Mb.js","calendar-view-HZwD5erB.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-DqXAArC_.js","clipper-view-DQpaQWKG.js","command-palette-Bpb9CU2W.js","command-palette-C1SSZ8eb.css","conflict-recovery-CUYhJ8Dp.js","conflict-view-CNR1siz0.js","conflict-view-Cs_al3Pz.css","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-CI-VYC5I.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-DYhngqjs.js","frontmatter-BReCQ5IE.js","frontmatter-boundary-CJ0VwYmQ.js","graph-BzrdAG7K.js","graph-CZFxSLyr.css","helpers-By97PZgD.js","history-view-buzcNOEV.js","index-Dd9Q-6iM.css","index-fuauy-LE.js","json-import-DiAxneV5.js","knowledge-index-CQi1uzMF.js","knowledge-index-DdIYVPNn.css","link-analysis-CNwtLhBa.js","link-tools-view-B7sReokO.css","link-tools-view-CCcNGprg.js","local-date-DXNZN3DV.js","main-view-C5oj20ru.js","modal-7HfR8HRR.js","navigation-BjmD78bN.js","note-derived-index-BllaeAkY.js","outline-view-B6bt5gFY.js","outline-view-CutEnGFL.css","palette-commands-CJV6tyop.js","phase4-BfNhUQRx.js","phase5-Dt8Rwv0e.js","phase6-B_zBIWCh.css","phase6-DJwUo5bH.js","phase6-E_FOBrXs.css","properties-view-BHfr63Es.js","properties-view-D0g7WhFw.css","quick-capture-view-CV6p5u-P.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-D71qpegY.js","reconciliation-view-bO1sFgvM.js","recovery-Fy1R3Pb4.css","recovery-service-BeR2E3Lz.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-DBZqLeNk.css","saved-searches-view-LED1vu8a.js","seed-B8MfBhZq.js","settings-view-7MA2wLWN.js","settings-view-DWelmwt3.css","storage-archive-BApFxdzC.js","storage-lease-DfmgVNMa.js","task-dashboard-view-BZ9KymmC.js","task-dashboard-view-Bs_fFUUk.css","task-service-p8nTEhWJ.js","tasks-Dq7qV0SO.js","trash-view-MysmUoP_.js","vault-3cwwaVfm.js","vault-import-CsutxdCS.js","vault-refresh-C1050FGo.js","vault-refresh-Cwt-MO_v.js","wikilinks-DXyHZ6rc.js","workspace-view-BDLJz4cS.js","workspace-view-D4SYRD7B.css","yaml-vendor-BKOgT9JP.js"];
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
