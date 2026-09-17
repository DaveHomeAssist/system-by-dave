# FMP hygiene baseline — 2026-09-17

First run of [`docs/fmp-hygiene-routine.md`](../docs/fmp-hygiene-routine.md).
This report covers the public website and the navigation and architecture
evidence only. Notion findings are recorded in the Notion audit
`AUD | FMP | Suite Hygiene | 2026-09-17`. So are the probe's privacy result
and any other finding that needs private detail.

**Traffic light: 🔴**

- **Probe:** 4 fail, 13 warn, 15 pass.
- **Released source:** `DaveHomeAssist/fmpwalk` `ce48b231518e`, which is also canonical `main`.
- **Gates:** `verify:fmp`, `verify:public-navigation`, `verify:indexing` and `verify:public-consistency` all pass. None of them covers the failures below.

## What is healthy

- **Routes:** all 11 published routes return 200.
- **Release parity:** live provenance and all 48 managed files match `main` byte for byte, and both releases pin the same commit.
- **Indexing:** noindex, robots, and sitemap exclusion hold for every FMP page.
- **Backend:** the API health check responds, and unsigned requests are rejected with 401.
- **Rendering:** no horizontal overflow at 390px or 1440px, and the rig renders its 3D canvas.

## Findings register

| ID | Sev | Finding | Evidence | Owner | Fix |
| --- | --- | --- | --- | --- | --- |
| H1 | P0 | The walk's **Open camera operations** button and its legacy `?camera=N` / `?position=` redirect lead to 404 | Probe L1: `/fmpwalk/` → `/fmpwalk/camera/` (404). The exporter copies `./camera/`, which only resolves in the canonical layout | fmpwalk | Point both at `/fmp/camera/` in the public export; resolve every walk href in `verify:fmp` |
| H2 | P1 | Skip links on all five camera pages leave the page for `/fmp/` | Probe L4: `<base href>` resolves `#startup` and `#screenTitle` against `/fmp/` | fmpwalk | Drop `<base>` and export root-relative asset paths, or focus the target in script |
| H3 | P1 | `404.html` recovery links and styles break below the site root | Probe R3: "Back home", "All tools", CSS, and logo resolve under the missing path | system-by-dave | Use root-absolute `/`, `/tools.html`, `/css/…`, `/svg/…` |
| H4 | P1 | The legacy GitHub Pages origin still serves the full suite, and its camera page lacks the SETUP TEST guard | Probe R4 | fmpwalk | Replace with a moved notice, then remove the origin from client and backend allowlists |
| H5 | P1 | The walk and the guide have no home link, and the walk has no `h1` | Probe S1, W4 | fmpwalk | Add home links and an `h1` |
| H6 | P1 | The navigation verifier accepts any link to `/fmp/` as the return path, so FMP shell gaps pass CI | `scripts/verify_public_navigation.js` `/fmp/` exemption | system-by-dave | Replace it with explicit FMP entries that check home, parent, and skip target |
| H7 | P2 | Theme is inconsistent: the hub, camera pages, and index default to dark, and the suite uses four theme keys | Probe W6. `js/av-theme-mode.js` defaults to dark. The hub select writes the AV Suite-wide key | fmpwalk + system-by-dave | Light default with one FMP key, and a toggle on camera pages and the index |
| H8 | P2 | Cache-bust tokens are wrong or static | Probe P3: walk modules load `mail.js` with the hub copy's hash; camera modules use date tokens | fmpwalk | Have the exporter stamp content hashes into every import |
| H9 | P2 | Rig count drift: the camera reference card says 72 parts; the catalog has 112 | Probe C1 | fmpwalk | Derive the count from the catalog |
| H10 | P2 | `/fmp-walk` and `/fmp/walk/` return 404 | Probe R2 | system-by-dave | Add a noindex redirect page and a robots entry; update the indexing count |
| H11 | P2 | Two entry points with circular parents: the hub's parent is `/fmp-index/`, and the index's parent is AV Suite | `fmp/index.html` breadcrumb, `fmp-index/index.html` | fmpwalk + system-by-dave | Make `/fmp/` the canonical entry, with the index as its records directory |
| H12 | P2 | `verify_fmp_release.js` does not compare the two source commits, checks the skip link by class name only, and hand-copies allowlists shared with the exporter | Script review | system-by-dave + fmpwalk | Share one manifest; assert commit equality and skip-target existence |
| H13 | P2 | Previous private Site links have no retirement date | Probe L2 | fmpwalk | Set a drain-and-remove date for draft recovery |
| H14 | P3 | Walk jump controls are 12×16px; guide tabs and the guide theme toggle are under 44px | Probe W5 | fmpwalk | Enlarge the targets |
| H15 | P3 | Walk requests a missing `/favicon.ico`; rig logs two Three.js deprecation warnings | Probe W1, W2 | fmpwalk | Add an icon link; update the shadow map and environment settings |
| H16 | P3 | Three allowlisted rig photos are never referenced | Release allowlist review | fmpwalk | Remove them from the export |
| H17 | P3 | External seating references return 403 to automated requests | Probe L3 | — | Manual browser check only |

## In flight

The canonical checkout has uncommitted rig work in progress: a responsive
workspace, tabs, and deep links. When it is released, re-run the probe and
Area 2 checks A4 and A8. `docs/fmp-public-release.md` and `CHANGELOG.md` will
then describe the previous rig layout.
