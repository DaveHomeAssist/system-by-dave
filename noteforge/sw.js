// Service worker for offline launch. The build injects every emitted hashed
// asset so first-use lazy recovery views work offline; navigations remain
// network-first and same-origin runtime assets are stale-while-revalidate. Cross-origin requests
// (e.g. external banner images) are never touched, matching the app's CSP/privacy
// posture. Registered only in production (see src/app/pwa.js).

// 5f81c3266acd is replaced at build time (vite.config.js) with a per-build id so
// the SW bytes change every deploy — that's what makes the browser install the new
// worker, re-run install/activate, and delete the previous cache. In dev the SW is
// never registered (see src/app/pwa.js), so the literal placeholder is harmless.
const CACHE = 'noteforge-5f81c3266acd';
// Base path this SW is scoped to (e.g. "/noteforge/" on GitHub Pages, "/" at
// root). Derived from the SW's own URL so the same file works under any deploy path.
const BASE = new URL('./', self.location).pathname;
const SHELL = BASE; // app-shell / start URL
const BUILD_ASSETS = ["archive-view-Cm1NOkv7.css","archive-view-Dp6BHFJy.js","backup-NbGIR59o.js","backup-view-NGVtsGpR.js","bulk-actions-view-B3NhpQBT.css","bulk-actions-view-n5LsPfeX.js","bulk-operations-eG_Zc65y.js","calendar-view-C7c10U1K.js","calendar-view-T7NSgih5.css","capture-DkWgccGm.js","capture-service-DeOgwKx3.js","clipper-view-2ZdGLtfZ.js","command-palette-C1SSZ8eb.css","command-palette-qKRQlyJ-.js","daily-workflow-Bwsz74w7.js","dialogs-CHpve8H-.css","dialogs-kLbbjYgy.js","download-E-F2btsZ.js","export-Cso0gQ5C.js","find-replace-view-B6E-lIfQ.css","find-replace-view-CcMBTSG3.js","frontmatter-CPlU9N2T.js","frontmatter-boundary-CJ0VwYmQ.js","graph-CZFxSLyr.css","graph-Dv7hX2dr.js","helpers-By97PZgD.js","history-view-DUqMv_Lw.js","index-CJMnCYRQ.js","index-Dy3_Zour.css","json-import-DiAxneV5.js","knowledge-index-DdIYVPNn.css","knowledge-index-StTkf70X.js","link-analysis-CzWcnZiS.js","link-tools-view-B7sReokO.css","link-tools-view-BVw3oiOH.js","local-date-DXNZN3DV.js","main-view-DBoVI5tI.js","modal-BwguDYj4.js","navigation-BuQO3Rc4.js","note-derived-index-DX4IIHag.js","outline-view-CutEnGFL.css","outline-view-We1lwD-c.js","phase4-D6VJC3TF.js","phase5-B5jg9Hi7.js","phase6-B_zBIWCh.css","phase6-CFjZB3ex.js","phase6-E_FOBrXs.css","properties-view-Cxis6UDm.js","properties-view-D0g7WhFw.css","quick-capture-view-BPr-4T_-.js","quick-capture-view-w-AMm3AZ.css","reconciliation-service-BPWyS54u.js","reconciliation-view-e9IEyo8y.js","recovery-Fy1R3Pb4.css","recovery-service-BIRHtAvI.js","revision-store-C9zVhpI4.js","rolldown-runtime-DK3Fl9T5.js","saved-searches-view-B4ugYZ0r.css","saved-searches-view-CsA3nom2.js","seed-BH2Vx5Bx.js","settings-view-CASHwUic.js","settings-view-DWelmwt3.css","task-dashboard-view-Bs_fFUUk.css","task-dashboard-view-DVsneivz.js","task-service-qp23AM_P.js","tasks-Dq7qV0SO.js","trash-view-BLKkxTne.js","vault-STqt3APd.js","vault-import-DnncNXNw.js","wikilinks-BN88x-kc.js","workspace-view-DuwYlSe0.css","workspace-view-DvfcbYtf.js","yaml-vendor-wEas4CYs.js"];
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
