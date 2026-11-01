// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// c33eed8db25f is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-c33eed8db25f';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Cm1NOkv7.css","archive-view-ayPcfAmA.js","assertClassBrand-D9PkfWLR.js","backup-Q5FB5HBA.js","backup-view-BFIc186p.js","banner-picker-BcezheVO.css","banner-picker-uqxKZKge.js","bulk-actions-view-0UGeqDIK.css","bulk-actions-view-BPaKfMOV.js","bulk-operations-x-6Zhvd7.js","calendar-view-ChJiAIqa.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-D5yKmbIS.js","clipper-view-CyVd9l0U.js","command-palette-BYwL111m.js","conflict-recovery-BvHuGGkX.js","conflict-view-Cs_al3Pz.css","conflict-view-DX4dfCMX.js","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-CaIqVqkL.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-CXfdmMco.js","frontmatter-BRofzmdr.js","frontmatter-boundary-CJ0VwYmQ.js","graph-CZFxSLyr.css","graph-DKrb1nsr.js","helpers-By97PZgD.js","history-view-7vkQKsrw.js","history-view-BkBhe-dX.css","index-B7I2lt2g.js","index-D3eivnqZ.css","json-import-DiAxneV5.js","knowledge-index-BCFtBOsM.js","knowledge-index-DdIYVPNn.css","link-analysis-C_lut7ln.js","link-tools-view-B7sReokO.css","link-tools-view-DbqFUnID.js","local-date-DXNZN3DV.js","main-view-C5oj20ru.js","modal-GInwfMWv.js","navigation-BjmD78bN.js","note-derived-index-BllaeAkY.js","outline-view-CutEnGFL.css","outline-view-bYtnWgZv.js","palette-commands-DImdeCv-.js","phase4-DdSPKiMb.js","phase5-YocUIZ2l.js","phase6-B_zBIWCh.css","phase6-CCv2YXY8.js","phase6-E_FOBrXs.css","properties-view-4n-2qhbb.js","quick-capture-view-CQS7xcAy.js","reconciliation-service-CaKC6isR.js","reconciliation-view-eiZWtpS9.js","recovery-service-BDB11s_U.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-D8-XcIJl.js","saved-searches-view-DBZqLeNk.css","seed-B8MfBhZq.js","settings-view--N7G1-VZ.js","settings-view-DWelmwt3.css","storage-archive-BApFxdzC.js","storage-lease-DfmgVNMa.js","task-dashboard-view-BX8b20tf.js","task-dashboard-view-Bs_fFUUk.css","task-service-DUkHyWbP.js","tasks-Dq7qV0SO.js","trash-view-ezHY3Vuk.js","vault-BYC3GQ_j.js","vault-import-BIaaJ0H_.js","vault-refresh-B_XtMsHL.js","vault-refresh-Cwt-MO_v.js","wikilinks-DXyHZ6rc.js","workspace-view-BhUhhQ_1.js","workspace-view-D4SYRD7B.css","yaml-vendor-B8Vne7s1.js"];
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
