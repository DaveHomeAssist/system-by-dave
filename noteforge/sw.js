// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 869454d23e46 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-869454d23e46';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-B5KqzDIS.js","archive-view-Cm1NOkv7.css","backup-hk0wd5S5.js","backup-view-DRmacAEA.js","banner-picker-BcezheVO.css","banner-picker-CYlaEw51.js","bulk-actions-view-0UGeqDIK.css","bulk-actions-view-DLpKaBjo.js","bulk-operations-CfZV0HIw.js","calendar-view-Dl5KH4ST.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-I9UAocWc.js","clipper-view-CWxvfrZ3.js","command-palette-BvduzQuu.js","command-palette-C1SSZ8eb.css","conflict-recovery-C5NbID_z.js","conflict-view-Cs_al3Pz.css","conflict-view-DU_Jn08C.js","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-Cw3qbool.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-xoAWVrUL.js","frontmatter-D4QXO9eE.js","frontmatter-boundary-CJ0VwYmQ.js","graph-CZFxSLyr.css","graph-DKY6h4mL.js","helpers-By97PZgD.js","history-view-C-_KvrEf.js","index-56_kkTG1.js","index-DsB5O57t.css","json-import-DiAxneV5.js","knowledge-index-Cmc__Pkv.js","knowledge-index-DdIYVPNn.css","link-analysis-b37wgz8S.js","link-tools-view-B7sReokO.css","link-tools-view-DvZOvNC1.js","local-date-DXNZN3DV.js","main-view-cai9DEgh.js","modal-Dh5iDrC4.js","navigation-BjmD78bN.js","note-derived-index-c9OLo2gB.js","outline-view-CutEnGFL.css","outline-view-D7C__U_R.js","palette-commands-DBIWOFpZ.js","phase4-B8bW97n1.js","phase5-ZxKE8DR2.js","phase6-B_zBIWCh.css","phase6-DdZs4Im7.js","phase6-E_FOBrXs.css","properties-view-D0g7WhFw.css","properties-view-UIPUquja.js","quick-capture-view-B-jCODq0.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-Bwn7dB3y.js","reconciliation-view-BTA2PmJw.js","recovery-Fy1R3Pb4.css","recovery-service-DhYiWPKs.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-Crxg0FsR.js","seed-BH2Vx5Bx.js","settings-view-Cknljxj5.js","settings-view-DWelmwt3.css","storage-archive-BApFxdzC.js","storage-lease-DfmgVNMa.js","task-dashboard-view-BW-13Iqw.js","task-dashboard-view-Bs_fFUUk.css","task-service-DQdc4Yb7.js","tasks-Dq7qV0SO.js","trash-view-Bl7er1ur.js","vault-BuOCRowd.js","vault-import-CG_qIChp.js","vault-refresh-BtJ4suli.js","vault-refresh-Cwt-MO_v.js","wikilinks-BN88x-kc.js","workspace-view-BycAFUxF.js","workspace-view-DuwYlSe0.css","yaml-vendor-wEas4CYs.js"];
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
