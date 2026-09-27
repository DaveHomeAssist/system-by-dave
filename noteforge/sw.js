// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// bc3e4ad42df3 is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-bc3e4ad42df3';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Cm1NOkv7.css","archive-view-DfROWApS.js","backup-BV4LZcm-.js","backup-view-BmYjAMy3.js","bulk-actions-view-B3NhpQBT.css","bulk-actions-view-CJ0Acc9o.js","bulk-operations-CxF9WqKy.js","calendar-view-CZyvoFTG.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-DPcbf2wj.js","clipper-view-BMmnSPDR.js","command-palette-CG-SuSpc.css","command-palette-nfrvNBl9.js","daily-workflow-Bwsz74w7.js","dialogs-CM3h9Tlo.js","dialogs-DuXFLbpJ.css","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-D5PM_zOo.js","frontmatter-Yh1C_owi.js","frontmatter-boundary-CJ0VwYmQ.js","graph-Bx6hR_Mk.js","graph-CZFxSLyr.css","helpers-By97PZgD.js","history-view-DQzuQ9TA.js","index-CDLevr9k.css","index-CnEXnNI8.js","json-import-DiAxneV5.js","knowledge-index-BYQDpi-n.js","knowledge-index-DdIYVPNn.css","link-analysis-DIwzM2vx.js","link-tools-view-B7sReokO.css","link-tools-view-cbtNulge.js","local-date-DXNZN3DV.js","modal-BTxY33Bs.js","navigation-BuQO3Rc4.js","note-derived-index-C6jLHNWw.js","outline-view-Bm6Vn3ce.js","outline-view-CutEnGFL.css","phase4-DkLK9-BE.js","phase5-lyGCVJ0M.js","phase6-B5IP2uyH.js","phase6-B_zBIWCh.css","phase6-E_FOBrXs.css","properties-view-CD9rzDfD.js","properties-view-D0g7WhFw.css","quick-capture-view-C-HDrYbs.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-DqYOswFn.js","reconciliation-view-Do4s8inZ.js","recovery-Fy1R3Pb4.css","recovery-service-CzYaqcmM.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-D0G3pKfk.js","seed-BH2Vx5Bx.js","settings-view-CxxNb8KQ.js","settings-view-DWelmwt3.css","task-dashboard-view-Bs_fFUUk.css","task-dashboard-view-cfO2z3SO.js","task-service-DRur3Qgg.js","tasks-Dq7qV0SO.js","trash-view-tcCKbYLB.js","vault-DsL-AXYd.js","vault-import-CWsm_455.js","wikilinks-BN88x-kc.js","workspace-view-BNuEqZBK.js","workspace-view-DuwYlSe0.css","yaml-vendor-wEas4CYs.js"];
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
