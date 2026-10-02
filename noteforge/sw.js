// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 0b1b4b98f916 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-0b1b4b98f916';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Bf9uu0QX.js","archive-view-Cm1NOkv7.css","backup-view-pYhyoZkf.js","backup-wBXcj48A.js","banner-picker-BcezheVO.css","banner-picker-DEQuERLU.js","bulk-actions-view-B3NhpQBT.css","bulk-actions-view-Cbs46OwU.js","bulk-operations-CU9qOfhd.js","calendar-view-DGG7BuDb.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-C04k65JR.js","clipper-view-Bo1BGnOZ.js","command-palette-C1SSZ8eb.css","command-palette-CaEucnsx.js","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-zhw9b6OM.js","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-CrVHpC_W.js","frontmatter-KIx6w54j.js","frontmatter-boundary-CJ0VwYmQ.js","graph-Bq8gE1ef.js","graph-CZFxSLyr.css","helpers-By97PZgD.js","history-view-D9eI33-T.js","index-BMobeziz.css","index-SQu_r0Um.js","json-import-DiAxneV5.js","knowledge-index-DB7lw-yG.js","knowledge-index-DdIYVPNn.css","link-analysis-BekRVhve.js","link-tools-view-B7sReokO.css","link-tools-view-Cy1ELPFa.js","local-date-DXNZN3DV.js","main-view-DCeAJbZ2.js","modal-BYp5Q_pj.js","navigation-BuQO3Rc4.js","note-derived-index-4HbFR9dt.js","outline-view-CtI3jY1X.js","outline-view-CutEnGFL.css","palette-commands-bdnA5ptg.js","phase4-DfCPxuoE.js","phase5-DjQDu2Ao.js","phase6-B_zBIWCh.css","phase6-E_FOBrXs.css","phase6-IYraVLxZ.js","properties-view-ClUp2pje.js","properties-view-D0g7WhFw.css","quick-capture-view-BkU7Tfan.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-CuOK-lkU.js","reconciliation-view-DQ96iQGv.js","recovery-Fy1R3Pb4.css","recovery-service-C6_K8OCl.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-BCSMrG5f.js","seed-BH2Vx5Bx.js","settings-view-C2oTywue.js","settings-view-DWelmwt3.css","task-dashboard-view-B3p2vYRD.js","task-dashboard-view-Bs_fFUUk.css","task-service-CWZF_VbR.js","tasks-Dq7qV0SO.js","trash-view-C3jvHeFy.js","vault-XnJ8hbyJ.js","vault-import-02u4tSw5.js","wikilinks-BN88x-kc.js","workspace-view-BB3-Ft5Z.js","workspace-view-DuwYlSe0.css","yaml-vendor-wEas4CYs.js"];
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
