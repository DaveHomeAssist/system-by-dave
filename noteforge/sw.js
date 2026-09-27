// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 38e950aea450 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-38e950aea450';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Cm1NOkv7.css","archive-view-Cr-I2pgU.js","backup-DyNl2tFb.js","backup-view-DiJXl2Db.js","bulk-actions-view-B3NhpQBT.css","bulk-actions-view-xLWGMrT3.js","bulk-operations-DXV52thn.js","calendar-view-BKabyUKc.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-D1WKATiO.js","clipper-view-C6b-wAoQ.js","command-palette-CG-SuSpc.css","command-palette-_Z3ZSEIo.js","daily-workflow-Bwsz74w7.js","dialogs-DApc46-e.js","dialogs-DuXFLbpJ.css","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-B1VSi95Q.js","find-replace-view-B6E-lIfQ.css","frontmatter-DWJamszr.js","frontmatter-boundary-CJ0VwYmQ.js","graph-BuAQJbuV.js","graph-CZFxSLyr.css","helpers-By97PZgD.js","history-view-BJMj6_vY.js","index-CDZY9Pio.js","index-DXAfpqsZ.css","json-import-DiAxneV5.js","knowledge-index-DYp0wfEp.js","knowledge-index-DdIYVPNn.css","link-analysis-BwS9kNEe.js","link-tools-view-B7sReokO.css","link-tools-view-C9dMEfW9.js","local-date-DXNZN3DV.js","modal-CNfruWMq.js","navigation-BuQO3Rc4.js","note-derived-index-6WhG4HqQ.js","outline-view-C1zs0P_2.js","outline-view-CutEnGFL.css","phase4-CnQT4Trt.js","phase5-DRqmncHu.js","phase6-B_zBIWCh.css","phase6-E_FOBrXs.css","phase6-PYVBCV6y.js","properties-view-C9g3VkjZ.js","properties-view-D0g7WhFw.css","quick-capture-view-C5szbXR_.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-D8IfwlHc.js","reconciliation-view-Ca8m3xdJ.js","recovery-Fy1R3Pb4.css","recovery-service-CusNGDoR.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-DnbeaWg7.js","seed-BH2Vx5Bx.js","settings-view-C6F_1Yhx.js","settings-view-DWelmwt3.css","task-dashboard-view-BhABTpT_.js","task-dashboard-view-Bs_fFUUk.css","task-service-BpNI7-fp.js","tasks-Dq7qV0SO.js","trash-view-B4fZp1T-.js","vault-DhAwuQHY.js","vault-import-DHCDx8wm.js","wikilinks-BN88x-kc.js","workspace-view-BeU5ifB9.js","workspace-view-DuwYlSe0.css","yaml-vendor-wEas4CYs.js"];
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
