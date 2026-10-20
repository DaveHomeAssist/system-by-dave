// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// d6dbbe8a6220 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-d6dbbe8a6220';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BLyUgbxz.js","archive-view-Cm1NOkv7.css","assertClassBrand-D9PkfWLR.js","backup-B2BE-zg1.js","backup-view-B4sXhfq0.js","banner-picker-BcezheVO.css","banner-picker-CJzGTRor.js","bulk-actions-view-0UGeqDIK.css","bulk-actions-view-7dN6m421.js","bulk-operations-DyvEHrrV.js","calendar-view-T7NSgih5.css","calendar-view-ckfqa6TS.js","capture-DkWgccGm.js","capture-service-C7OaLpV6.js","clipper-view-CK5IR-Gd.js","command-palette-BVO8nlqy.js","conflict-recovery-5pTlDKEn.js","conflict-view-B3xFRB0x.js","conflict-view-Cs_al3Pz.css","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-VlfYtExx.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-owZVvvsN.js","frontmatter-X9cOUntn.js","frontmatter-boundary-CJ0VwYmQ.js","graph-CZFxSLyr.css","graph-au7beIzP.js","helpers-By97PZgD.js","history-view-BkBhe-dX.css","history-view-Dh_MCr5j.js","index-CwVPnUvP.js","index-D3eivnqZ.css","json-import-DiAxneV5.js","knowledge-index-CQ_KG9mO.js","knowledge-index-DdIYVPNn.css","link-analysis-DO8txj0K.js","link-tools-view-B7sReokO.css","link-tools-view-DwqtL5Bp.js","local-date-DXNZN3DV.js","main-view-C5oj20ru.js","modal-GInwfMWv.js","navigation-BjmD78bN.js","note-derived-index-BllaeAkY.js","outline-view-BbUzMdaP.js","outline-view-CutEnGFL.css","palette-commands-DmZpOZq0.js","phase4-fp5jaNA4.js","phase5-UGjhBieT.js","phase6-B_zBIWCh.css","phase6-DxO6fXJ9.js","phase6-E_FOBrXs.css","properties-view-DHfASozU.js","quick-capture-view-CWsksfHp.js","reconciliation-service-CG1el1Wn.js","reconciliation-view-C6csfsmh.js","recovery-service-CMPaLTLU.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-DBZqLeNk.css","saved-searches-view-z-Mvls4c.js","seed-B8MfBhZq.js","settings-view-DWelmwt3.css","settings-view-Dl6nJMnD.js","storage-archive-BApFxdzC.js","storage-lease-DfmgVNMa.js","task-dashboard-view-BB9AJvui.js","task-dashboard-view-Bs_fFUUk.css","task-service-CoidYC8b.js","tasks-Dq7qV0SO.js","trash-view-2LrMhrtx.js","vault-D46doUiX.js","vault-import-DxbTk8vz.js","vault-refresh-B_XtMsHL.js","vault-refresh-Cwt-MO_v.js","wikilinks-DXyHZ6rc.js","workspace-view-D4SYRD7B.css","workspace-view-Dc-xXQGR.js","yaml-vendor-BKOgT9JP.js"];
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
