# FMP public suite release

`/fmp/` is the FMP video operations hub. It contains the publicly reachable
camera commissioning frontend, bowl camera training, and a source-backed camera
rig explorer. `/fmpwalk/` is the separate local-first preshow venue walk.

Public page access does not grant crew roles. Camera API access still requires a
Google ID token and server-side authorization. Noindex is discovery policy, not
access control.

## Product boundaries

- `/fmp/`: choose a camera position or open House, Walk, Learn, and Setup. Each
  tab is addressable as `/fmp/#cameras`, `#house`, `#walk`, `#learn`, or `#setup`.
- `/fmp/house/`: dated house-video reference, display inventory, bowl schematic,
  rack views and visitor map. Source conflicts stay visible; there is no live
  monitoring connection or operational write action.
- `/fmp/camera/...`: owner-bound drafts and explicit authenticated operational
  actions. SETUP TEST remains mandatory until live acceptance is complete.
- `/fmpwalk/`: venue route, readings, faults, photos, and report preparation.
  Browser storage is local-first; download, Gmail, and Notion actions each require
  a separate explicit confirmation.
- `/fmp/guide/`: training only. Tonight's director, stage plot, restrictions, and
  verified assignments control.
- `/fmp/rig/`: read-only 3D/photo equipment reference. It does not report live
  status or establish serial numbers, fitted state, signal health, or access.
- `/fmp/gear/`, `/fmp/build/`, `/fmp/ptz/`: camera equipment, camera build and
  strike, and catwalk PTZ references translated from Notion records. Dated
  evidence stays visible; roles replace names; no network addresses.
- `/fmp-index/`: retired. It redirects to `/fmp/`, keeping query and hash.

No public FMP page links a Notion page. Crews and tour engineers have no Notion
account, so anything they need from Notion becomes its own page in the suite. The
walk's explicit Save to Notion receipt opens the walker's own record and is the one
exception. `npm run verify:fmp` and the hygiene probe's S3 check enforce this.

Opening one workflow does not copy, submit, or reinterpret another workflow's
records. The old owner-only Site remains available for its origin-local drafts;
those drafts are not migrated, removed, or published.

## Managed source

Canonical app: `DaveHomeAssist/fmpwalk`. Do not hand-edit generated `fmp/` or
`fmpwalk/` files. From a clean, committed canonical checkout run:

```sh
node scripts/export-public-camera.mjs /absolute/path/to/system-by-dave
```

The exporter checks destination identity and writes two exact allowlists.
`fmp/source_provenance.json` and `fmpwalk/source_provenance.json` pin the same
canonical source commit, individual SHA-256 values, release mode, and a combined
artifact digest. Repeated generation must be byte-identical. `npm run verify:fmp`
rejects drift, extras, missing physical routes, changed release modes, remote rig
runtime dependencies, or missing public metadata. It runs in the Pages pipeline.

The exporter refuses to run from a commit that does not contain the currently
released source commit, so a branch cut before a release cannot overwrite it.
Rebase onto canonical `main` before exporting. It removes a retired file only when
the previous provenance lists it.

`npm run verify:fmp` also enforces these public release rules. The exporter and
canonical `tests/public-release.test.js` enforce the same rules before export:

- **No personal contact details.** No phone number, `tel:` link, or email address
  other than the report sender appears in any released file. Contacts and ticket
  routing details stay in Notion, behind sign-in. Failures name the file and a
  count, never the value.
- **No `<base>` on any page.** Every `href="#…"` target must exist in the same
  file, so skip links stay on the page. Camera pages load their assets through
  depth-relative paths.
- **Walk routes leave `/fmpwalk/`.** The walk's camera link and its legacy
  `?camera=N` and `?position=` redirect use `/fmp/camera/`.
- **Content-hash tokens.** Every `?v=` token is the first 16 hex digits of the
  SHA-256 of the released file it loads.
- **Counts come from the catalog.** Camera pages carry `data-rig-components`, and
  every "N components" or "N parts" claim must equal the rig catalog size.
- **One export.** `fmp` and `fmpwalk` pin the same source commit.

The FMP release includes only client modules, shells, local Three.js runtime,
allowlisted rig reference photos, and route metadata. It excludes backend code,
credentials, dated event/crew/fault snapshots, private atlas/plant records,
private documents, and source maps. Third-party audience photos are linked, not
copied. No FMP service worker or new offline cache is registered; protected API
responses are never bundled for offline use.

## housevideo.app

housevideo.app is the canonical home of the exported suite, the `/fmp-index/`
and `/fmp-walk/` redirects, and the `/switcher/`, `/shader/` and `/backfocus/` references, with
unchanged paths (`docs/domain-sites.md`). It was cut over on 2026-09-18 from
fmpwalk `a5d262c`. The systembydave.com addresses are redirect stubs that offer
to move saved walk and camera data (browser storage and walk photos) before
redirecting. The Google client and the `fmp-walk-notion` backend
(`FMP_ALLOWED_ORIGINS`) allow `https://housevideo.app`; keep
`https://systembydave.com` in both while old drafts may still be moved. Run gates 3 and 4
below on housevideo.app.

## Commissioning gates

1. Add the exact `https://systembydave.com` JavaScript origin to the existing FMP
   Google client. No path, new client, or browser client secret is needed. This
   origin is required independently for walk Gmail and camera Google sign-in.
2. Share the existing Events, Crew Calls, Faults, Walk Reports, and Cameras
   reference page with the dedicated FMP Walk internal Notion connection. The
   deployment token remains in Google Secret Manager. Codex connector access is
   separate.
3. Sign in with an explicitly authorized operations account. Verify context reads,
   a synthetic SETUP TEST check-in, fault photo, checkout, and exact Notion
   readback from a camera route.
4. In a separate walk acceptance, verify a reviewed synthetic report download,
   Gmail Sent receipt, Notion record, files, linked faults, and exact readback.
5. Retain SETUP TEST and partial-verification language until the applicable gates
   pass. A deployed URL, health response, or mocked browser test is not evidence
   of a successful live save or email delivery.

## Theme

The FMP suite has one theme preference, `fmpTheme` (`light`, `dark`, or `auto`),
shared with the preshow walk. The managed `fmp/theme.js` applies it in the head of
the hub, camera, house, guide, gear, build, ptz and rig pages. A
first visit is light regardless of the system setting (WEB-1); `auto` follows the
system. Earlier rig (`fmpRigTheme`) and guide (`fmpcam-theme`) choices move into
`fmpTheme` once. FMP pages never read or write the AV Suite-wide
`av-theme-mode.v1`. Every page shows a toggle; on camera pages it moves from the
top bar to the status row on phones and landscape phones. `npm run verify:fmp`
enforces the head script, the shared key, the light default, and the index toggle.

## Release checks and recovery

Run `npm run verify:fmp`, indexing/navigation/consistency checks, and the complete
Pages workflow. Canonical `npm run check` plus the walk, camera, and public browser
harnesses cover app behavior, routes, viewport containment, local guide assets,
themes, and zero-write loading. Verify every live route and compare the published
provenance commit/hashes after deployment.

Rollback only the FMP release commit through a normal revert/release, retaining
other site changes. Never clear Notion records, retry journals, browser drafts, or
walk photos as part of a frontend rollback.

## Rig explorer layout update — September 17, 2026

The managed rig now includes 112 components, camera-body and ND controls, and
tripod control lessons. At normal desktop, tablet and phone portrait sizes the
rig is a viewport-height workspace. Desktop keeps the model beside a scrolling
information panel; phones keep the model above it with Component, Tripod lessons
and Help tabs. **Expand reading** hides the model until **Show model** restores it.
Short screens and very narrow widths fall back to normal document reflow, and
ultrawide screens widen the model while instructions keep a readable measure.
Selection links such as `?equipment=rig&part=nd-filter` open a component
directly. The skip link focuses the Component panel, which carries
`tabindex="0"` so keyboard users can reach and scroll it. Native component selection, visible keyboard focus,
44px controls, non-drag rotation/tilt/zoom buttons, optional touch gestures and
reduced-motion behavior provide alternate ways to operate the model. The rig
uses the suite theme preference below and the local Three.js runtime.

The new body-control photograph is an allowlisted WebP reference. No operational
records, backend changes, new storage keys or service worker are part of this
release. Geometry/input tests and contrast checks are distinct from browser or
physical-device acceptance; see the canonical source's release notes and tests.

## House video integration | September 17, 2026

The merged source [fmpwalk #3](https://github.com/DaveHomeAssist/fmpwalk/pull/3)
adds `/fmp/house/` and the House hub tab. This release was exported from canonical
main commit `d565abd64b1383441147b169af20c2a93322f165`; the release manifests record
its exact file hashes. The two generic model references live at `/switcher/` and
`/shader/` in this repository and are indexable. The House route stays noindex.

Source conflicts remain visible: 151 CSV rows versus the dashboard's 152 claim,
37 unresolved lobby rows, different G2 camera identities, and disputed AMX signal
direction. The visitor map supplies zone context, not equipment coordinates.
Protected workflows, credentials and draft storage are unchanged.

Validation: 55 source tests, the managed-release and public shell/indexing checks,
and browser interactions at six viewport sizes. Browser coverage includes deep
links and history, inventory filters and conflict details, modal focus, rack
front/rear/evidence views, shared theme, CSV/map and no-JavaScript references. No
browser-console errors were observed. Rack checks and authenticated commissioning
remain separate from this read-only reference release.

The exported file digests match the reviewed source; the provenance now records
its canonical merge commit. The GitHub Pages workflow and exact live-route and
provenance readback remain the release acceptance gates. Future changes must be
exported from clean canonical source; do not edit managed files or provenance by
hand.

## Notion pages replaced with HTML | September 18, 2026

Exported fmpwalk `9012646`. The suite no longer links Notion:

- `/fmp/gear/` replaces the four camera gear records (URSA G2 body, Fujinon lenses,
  Camera Fiber Converter, Studio Fiber Converter). The rig's 53 citations now open
  its sections (`#g2`, `#lens`, `#camera-converter`, `#studio-converter`), and its
  back-focus citation opens `/backfocus/`.
- `/fmp/build/` and `/fmp/ptz/` replace the Cam Ops and PTZ Ops SOPs. The camera
  References panel opens them and `/backfocus/`. The signed-in backend registry
  still names Notion pages, so the public camera overrides it, and its receipts
  name the Crew Call instead of linking to it.
- Learn lists each reference once. The three audience seat views moved to the
  House venue section, and the hub no longer links `/fmp-index/`.
- `/fmp-index/` became a redirect. Its personal pages (walk records, email groups,
  project instructions, logs) were not translated; its venue records already live
  in House, Camera equipment and the rig.

The Notion pages themselves are unchanged and remain the system of record for the
backend. Validation: 59 canonical tests; the hub, public, camera, house and walk
browser suites; `verify:fmp`, `verify:public-navigation`, `verify:indexing`,
`verify:public-consistency` and `verify:domain-sites`; and the hygiene probe
against a local build (S3 pass, no new warnings).
