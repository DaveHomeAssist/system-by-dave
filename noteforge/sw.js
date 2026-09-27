// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 175918fe0df7 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-175918fe0df7';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-CX0GCA54.js","archive-view-Cm1NOkv7.css","backup-guWd_X4k.js","backup-view-BsC-oyeX.js","bulk-actions-view-B3NhpQBT.css","bulk-actions-view-_JU5NZV-.js","bulk-operations-BF_WH7pa.js","calendar-view-BLhozUZm.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-qVB8j4l8.js","clipper-view-Bln2aeXZ.js","command-palette-CG-SuSpc.css","command-palette-NwOZbLCH.js","daily-workflow-Bwsz74w7.js","dialogs-DuXFLbpJ.css","dialogs-i4XYvMgX.js","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-BBHaiPBx.js","frontmatter-C_XRfL3d.js","frontmatter-boundary-CJ0VwYmQ.js","graph-C6Xxuvvh.js","graph-CZFxSLyr.css","helpers-By97PZgD.js","history-view-BPn9dOhK.js","index-BDwz3yC4.css","index-DQj6Cs_3.js","json-import-DiAxneV5.js","knowledge-index-Cxpvvafu.js","knowledge-index-DdIYVPNn.css","link-analysis-BoOlmUUo.js","link-tools-view-2sNDlm2U.js","link-tools-view-B7sReokO.css","local-date-DXNZN3DV.js","modal-DZl7EaVv.js","navigation-BuQO3Rc4.js","note-derived-index-DkklnVSa.js","outline-view-BSTnhZVq.js","outline-view-BjOzAeN4.css","phase4-DLQiOu2t.js","phase5-DIajMUPc.js","phase6-9QoZ_js3.js","phase6-B_zBIWCh.css","phase6-E_FOBrXs.css","properties-view-A73m22ks.js","properties-view-D0g7WhFw.css","quick-capture-view-rOEuCKfa.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-DWAAV-xg.js","reconciliation-view-BN3rlfv6.js","recovery-Fy1R3Pb4.css","recovery-service-t9UOpGuj.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-C6VVv8D7.js","seed-BH2Vx5Bx.js","settings-view-BZZQxEQY.js","settings-view-DWelmwt3.css","task-dashboard-view-Bs_fFUUk.css","task-dashboard-view-DZH5Ao-p.js","task-service-Bx3gZb28.js","tasks-Dq7qV0SO.js","trash-view-sMpmsYL_.js","vault-CnK_zY8O.js","vault-import-B97idPfk.js","wikilinks-BN88x-kc.js","workspace-view-BSgcJ-Jk.js","workspace-view-DuwYlSe0.css","yaml-vendor-wEas4CYs.js"];
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
