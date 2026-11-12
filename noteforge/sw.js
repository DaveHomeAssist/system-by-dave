// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// c0ae7977db95 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-c0ae7977db95';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Cm1NOkv7.css","archive-view-z9t6Ygh_.js","assertClassBrand-D9PkfWLR.js","backup-C-gWDQmi.js","backup-view-mVkd0gCL.js","banner-picker-BcezheVO.css","banner-picker-PiKodcX2.js","bulk-actions-view-0UGeqDIK.css","bulk-actions-view-Egawu49i.js","bulk-operations-C0awfBxz.js","calendar-view-DS8IKgo1.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-DZJhjIuL.js","clipper-view-C1DPIOX4.js","command-palette-BELr6ksV.js","conflict-recovery-Cp3ae3uy.js","conflict-view-Cs_al3Pz.css","conflict-view-qQcyTcao.js","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-qG-ax1kq.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-B6ODFPKM.js","frontmatter-BlM0rQNx.js","frontmatter-boundary-CJ0VwYmQ.js","graph-BqEf2c-A.js","graph-CZFxSLyr.css","helpers-By97PZgD.js","history-view-BkBhe-dX.css","history-view-DnEbJEee.js","index-CPDRH_cG.js","index-D3eivnqZ.css","json-import-yShTjfFu.js","knowledge-index-C1rkZpbA.js","knowledge-index-DdIYVPNn.css","link-analysis-m48MLYzf.js","link-tools-view-B7sReokO.css","link-tools-view-CpF_EtI7.js","local-date-DXNZN3DV.js","main-view-C5oj20ru.js","modal-GInwfMWv.js","navigation-BjmD78bN.js","note-derived-index-BllaeAkY.js","outline-view-CUfkz-ad.js","outline-view-CutEnGFL.css","palette-commands-cBklmoli.js","phase4-70mA-0Lb.js","phase5-CA_UnpSl.js","phase6-B_zBIWCh.css","phase6-BaUB5UJw.js","phase6-E_FOBrXs.css","properties-view-BQcBFVXW.js","quick-capture-view-DfWdJuK2.js","reconciliation-service-vhen9lA0.js","reconciliation-view-BREOdWQ2.js","recovery-service-joC2x5h3.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-C8I9PpjQ.js","saved-searches-view-DBZqLeNk.css","seed-B8MfBhZq.js","settings-view-BhME3r69.js","settings-view-DWelmwt3.css","storage-archive-BApFxdzC.js","storage-lease-DfmgVNMa.js","task-dashboard-view-Bs_fFUUk.css","task-dashboard-view-lrTLZjNC.js","task-service-BU-gosb5.js","tasks-Dq7qV0SO.js","trash-view-AOInaPM7.js","vault-import-CookI_OZ.js","vault-pyxex_pH.js","vault-refresh-B_XtMsHL.js","vault-refresh-Cwt-MO_v.js","wikilinks-DXyHZ6rc.js","workspace-view-D4SYRD7B.css","workspace-view-DBfu6hPi.js","yaml-vendor-B8Vne7s1.js"];
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
    // Only the app's own start page may become the offline shell. Any other
    // in-scope file opened directly (icon.svg, sitemap.xml, the manifest) is a
    // successful same-origin navigation too; stored under SHELL it would be
    // what the next offline launch shows instead of the app.
    const isShell = url.pathname === BASE || url.pathname === BASE + 'index.html';
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only cache a good shell — never store a 5xx/404 error page as the
          // offline fallback.
          if (isShell && res && res.ok && res.type === 'basic') {
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
