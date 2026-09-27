// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 191f62bd7a36 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-191f62bd7a36';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-BeBXEXej.js","archive-view-Cm1NOkv7.css","backup-DmAVSVrV.js","backup-view-B8o5ndeT.js","bulk-actions-view-5TD8wUi9.js","bulk-actions-view-B3NhpQBT.css","bulk-operations-DP0-CLZz.js","calendar-view-D9E7aljV.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-CeGyBi5H.js","clipper-view-C6NHWfwp.js","command-palette-CG-SuSpc.css","command-palette-D_kFSWoy.js","daily-workflow-Bwsz74w7.js","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-D5TkGWrr.js","frontmatter-Bs-ro2lI.js","frontmatter-boundary-CJ0VwYmQ.js","graph-CZFxSLyr.css","graph-CuCucII7.js","helpers-By97PZgD.js","history-view-2iB0YLoF.js","index-BZLMChVo.css","index-aqJCyjpf.js","json-import-DiAxneV5.js","knowledge-index-DdIYVPNn.css","knowledge-index-DqYtwX6w.js","link-analysis-C1Mtl9xZ.js","link-tools-view-B7sReokO.css","link-tools-view-BUtkEPfx.js","local-date-DXNZN3DV.js","modal-DkzN1AFg.js","navigation-BuQO3Rc4.js","note-derived-index-BPQieu5S.js","outline-view-BjOzAeN4.css","outline-view-DzVzWZ3_.js","phase4-JJv_plVb.js","phase5-CzMkYUTL.js","phase6-B_zBIWCh.css","phase6-C0iZATbZ.js","phase6-E_FOBrXs.css","properties-view-BKsaC36g.js","properties-view-D0g7WhFw.css","quick-capture-view-C7oqTRc0.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-CJmcAAK-.js","reconciliation-view-DftHsYR-.js","recovery-Fy1R3Pb4.css","recovery-service-DDuAu2eN.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-RYDhVluY.js","seed-BH2Vx5Bx.js","settings-view-DR42Zgo4.js","settings-view-DWelmwt3.css","task-dashboard-view-BQnTkYJB.js","task-dashboard-view-Bs_fFUUk.css","task-service-jg0CIAYi.js","tasks-Dq7qV0SO.js","trash-view-BxDuBTLd.js","vault-B5K0KVsj.js","vault-import-CXh5SVth.js","wikilinks-BN88x-kc.js","workspace-view-B2xi6xgO.css","workspace-view-DAn0_b9c.js","yaml-vendor-wEas4CYs.js"];
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
