# [SPEC] FMP Open Issues Plan

October 1, 2026. Source: a read-only survey of fmp-suite and system-by-dave (open
PRs and issues, seven days of CI, the October 1 live hygiene probe, audit and
release docs, TODO comments, the audit-bot branches and the iCloud FMP folder),
with the two highest-impact claims rechecked by hand. Every item has a verdict.
Owners: **fmp-suite** means fix the canonical source and re-export; **sbd** means
this repository; **Dave** means a console, credential or hardware step that an
agent cannot do.

## Status, October 1

| # | Status |
| --- | --- |
| A1 | Fixed in source: fmp-suite #39 (merged `5684a13`), shipped by the system-by-dave #179 release export. A follow-up fixed two cases Codex review found: a rig change (a select fires `input` before `change`) and a finished walk |
| A2 | Done in system-by-dave #181: S1 checks only the `/fmp/` return, as the public-shell contract exempts FMP pages from the home link |
| A3 | Done: fmp-suite #36 gave the four reference pages an icon, and system-by-dave #185 gives `switcher/`, `shader/` and `ursa-broadcast-g2/` one. A root `/favicon.ico` is no longer needed; the two instant-redirect pages are left as they are |
| A4 | Fixed in source: fmp-suite #39 exports `/fmp/walk/`, and fmp-suite #42 adds its full head metadata. The system-by-dave #179 release export ships it and adds it to `verify_fmp_release.js` |
| A5 | Code done in fmp-suite #39: `davehomeassist.github.io` left the backend default and docs. It goes live after a backend redeploy and removal from the Google client (Dave). The ChatGPT Site origin is C4 |
| A6 | Done in system-by-dave #181 |
| A7 | Done in system-by-dave #185: L3 reports a 403 or 429 from a browser-checked host as unverified (grey), never as a pass, and the overall light can then be Grey but not Green. A 404 or 5xx still warns. Unit-tested |
| A8 | Done: system-by-dave #185 resolved camera-sim audit rows D10 and W2; fmp-suite #41 records an outcome for every walk UX audit recommendation (`docs/walk-ux-audit-outcomes.md`) and for the operator reference review |
| B2 | Fixed in source: fmp-suite #40 (merged), shipped by the system-by-dave #179 release export. Hash routes for the walk (`#/walk/<stop>`, `#/faults`, `#/report`) with Back, reload and deep links; the first Back closes an open fault sheet |
| B3 | Done: system-by-dave #187, a weekly WebKit smoke for the Camera Simulator. Its first CI run rendered with WebGL on iPhone 13 and iPad Pro 11 emulation (8/8) |
| B4 | In review: fmp-suite #43, a sticky Pass/Flag/Skip bar above the nav |
| B6 | Partly in review: fmp-suite #43 ties every reading label to its field. Segmented controls for yes/no and level readings remain |
| B7 | In review: fmp-suite #44, Display mode after the zones, a sticky Start walk (it sat at y=1435 on a 390x844 phone) and a distinct Required style |
| B8 | In review: fmp-suite #43, `--dim` at 4.5:1 on all card surfaces in both modes (Night measured 2.84:1), 44px targets, heading levels, status emoji hidden from screen readers |
| B9 | In review: fmp-suite #45, preview first, Send as the one primary action, a global disabled style, Retry Notion only after a failure. Moving Clear and start over to Setup follows #44 |

## Phase A: small fixes, no hardware

| # | Issue | Evidence | Verdict and fix | Owner | Size |
| --- | --- | --- | --- | --- | --- |
| A1 | Changing date, show, operator or configuration in the walk's Setup sends the walker back to stop 1 | fmp-suite `index.html`: every Setup field's `change` handler sets `S.idx = 0` | **Fix.** Reset the position only when the route (configuration) changes, and then keep the current stop by id when it still exists. Add a walk browser check | fmp-suite | S |
| A2 | Hygiene probe S1 warns on every FMP page for "no home link" | `scripts/fmp_hygiene_probe.js` requires `href="/"`; `scripts/verify_public_navigation.js` deliberately exempts FMP pages because `/fmp/` is their home | **Fix the probe**, not the pages: require only the `/fmp/` return, matching the verifier | sbd | S |
| A3 | `/favicon.ico` 404 on `/fmp/gear/` and three other pages | Probe W1/W2 | **Done.** fmp-suite #36 gave the build, gear, house and ptz pages an icon link, and system-by-dave #185 gave `switcher/`, `shader/` and `ursa-broadcast-g2/` one, so no checked page requests `/favicon.ico`. A root `/favicon.ico` is not needed; the two instant-redirect pages are left without an icon | fmp-suite, sbd | S |
| A4 | `/fmp/walk/` returns 404; the 404 page offers `/fmp/` and `/`, not the walk | Probe R2; baseline H10 "partly fixed" | **Fix.** Export `fmp/walk/index.html` as a redirect to `https://walk.housevideo.app/fmpwalk/` (keep query and hash, like the retired `/fmp-index/`) and add it to both allowlists. A typed address should not dead-end on show night | fmp-suite exporter, sbd verifiers | S |
| A5 | The camera backend still accepts two retired origins | Preflight answers `davehomeassist.github.io` and the old ChatGPT Site; `backend/server.js` default list; README keeps github.io "while the source deployment is available", but that deployment now returns 404 | **Retire both.** Its stated condition is met. Remove them from the `server.js` default and the docs (code, S). Removing them from Cloud Run `FMP_ALLOWED_ORIGINS` and the Google client is a console step | fmp-suite, then Dave | S |
| A6 | Docs disagree on whether the hub launches the walk | No: `docs/fmp-public-release.md` and fmp-suite `docs/fmp-suite-architecture.md`. Yes: fmp-suite `README.md` and `public-site/index.html` | **Fix the stale side** after reading the live hub. Coordinate with #36, which edits the same README | fmp-suite, sbd | S |
| A7 | House links to aviewfrommyseat.com return 403 to the probe | Probe L3; baseline H17 "manual browser check only". Checked in a real browser on October 1: the seating chart and the GA pit photo load; the section 202 photo showed the site's Cloudflare "Quick security check" first | **Keep the links; fix the probe.** Mark the host as bot-protected so L3 reports grey, not warn, and note the browser check in the baseline | sbd | S |
| A8 | Two reviews have no recorded outcomes, and two audit rows are stale | Walk UX audit (iCloud); fmp-suite `docs/operator-reference-review.md`; camera-sim audit doc rows D10/W2 still say "resolves on merge" after the merges | **Record outcomes** in an outcome table, as the camera-sim audit doc does. Mark D10/W2 resolved with the merge PRs | fmp-suite, sbd | S |

## Phase B: walk and CI work

| # | Issue | Evidence | Verdict and fix | Owner | Size |
| --- | --- | --- | --- | --- | --- |
| B1 | The walk's stop rail has 28 targets about 13 px wide. Below 1000 px it is the only way to jump to a stop | Probe W5; baseline H14 open | **Fix.** Make the rail a non-interactive progress graphic, and add a 44 px "Route (n/N)" sheet on phones listing stops by name | fmp-suite | M |
| B2 | The walk has no history routing. Back leaves the app and a deep link opens at the start | No `pushState`, `popstate` or `hashchange` in the walk | **Fix.** Hash routes such as `#/walk/<stop>`, with `go()` on `popstate`. Keeps the walk's local-first storage unchanged | fmp-suite | M |
| B3 | Camera Simulator CI is Chromium-only, but field devices are iPads and iPhones | Camera-sim audit Q1, "recommended next CI step" | **Do it.** A scheduled WebKit smoke job in `camera-sim.yml`, not a per-PR gate at first | sbd | M |
| B4 | Pass, Flag and Skip scroll out of reach on phones and iPad landscape | Walk UX audit #1: `.pf` has no sticky rule | **Fix.** A sticky action bar inside the walk card | fmp-suite | S |
| B5 | Recording a result is not the main path: Next is the filled button and advances without a result; the end card has no not-walked count; Save fault does not advance | Audit #2, partly done in #32 | **Fix.** Pass becomes primary, the end card shows a not-walked count with a jump, Save fault advances | fmp-suite | M |
| B6 | Yes/no and level/suspect/off readings are free text, and their labels are not associated | Audit #6 | **Fix.** Segmented controls and `for` on every label | fmp-suite | M |
| B7 | Setup hierarchy: Display mode precedes zones, Start walk is not sticky, Required chips look like On chips | Audit #8, partly done in #33 | **Fix.** Sticky Start, a distinct Required style, Display mode after zones | fmp-suite | S |
| B8 | Contrast and targets: `--dim` is 4.06:1 (Day) and 3.19:1 (Night), nav labels use it, chips are 40 px, fault delete and sheet Cancel are small; heading levels skip | Audit #9 and its shorter list | **Fix.** Raise `--dim` to 4.5:1 in both modes, 44 px targets, correct heading levels, fix the night-default CSS comment | fmp-suite | M |
| B9 | Report tab: the preview sits below the send actions, three primary buttons compete, Retry Notion always shows, Clear and start over lives on Report | Audit #10, partly done in #32 | **Fix.** Check, then send: preview first, one primary action, Retry only after a failure, Clear moves to Setup; check the Google Identity console noise while there | fmp-suite | M |


## Phase C: needs Dave or hardware

| # | Issue | Verdict |
| --- | --- | --- |
| C1 | Commissioning gates 1 to 4 in `docs/fmp-public-release.md` are still pending: the Google client listing `walk.housevideo.app` (1), sharing the Events, Crew Calls, Faults, Walk Reports and Cameras reference page with the FMP Walk Notion connection (2), a signed-in synthetic SETUP TEST camera save with exact Notion readback (3), and a separate walk acceptance with Gmail Sent receipt and Notion readback (4) | **Dave**, in order: check the Google Console origin list (gate 1), share the five Notion pages with the connection (gate 2), then run gates 3 and 4 signed in, and record the date in `docs/fmp-public-release.md`. Agents cannot sign in |
| C2 | Camera Simulator device baseline (X8/X9), monitor delay and Camera 4 timing | **Dave**, one iPad session with `?diagnostics=1`; the venue timing needs a site visit |
| C3 | The rig changes of September 29 and October 1 (touch rotation default; scroll and pinch zoom) were tested by emulation only | **Dave**, two minutes: drag and pinch on an iPhone and an iPad; scroll, Shift+scroll and trackpad pinch on the Mac in Safari and Chrome |
| C4 | The camera backend still accepts the old ChatGPT Site origin. That Site still answers behind its owner gate, and the release contract says pending work remains recoverable there | **Dave** confirms no pending work remains on the old Site; then remove the origin from the `backend/server.js` default, the Google client and `docs/notion-setup.md`, and redeploy the backend |
| C5 | fmp-suite's `Verify FMP suite` check runs on every pull request but is not required on `main`, so a red build can still merge | **Dave**: make it a required status check in the fmp-suite repository settings (operator reference review outcome) |


## Closed without work

- **NoteForge drift:** resolved. `noteforge/` pins NoteForge `main` and the drift check is green; the earlier failures came from a NoteForge commit that failed its own verify.
- **Walk UX audit #5 (offline service worker):** declined. The release contract registers no FMP service worker (`docs/fmp-public-release.md`); the walk is local-first without one.
- **Audit-bot branches:** none remain, and their PRs are merged with outcomes recorded.
- **Camera-sim "Not doing" and "Deferred" rows, hand-copied allowlists (H12), and demo or unmeasured venue dimensions:** already accepted with reasons in their own documents.

## Order and verification

Phase A first, one pull request per owner repository, then re-export and run
`npm run verify:fmp`, the browser suites and `npm run hygiene:fmp` after deploy.
The A2 and A7 probe changes should leave the probe green apart from items that
are still genuinely open. Phase B items each get their own pull request with a
browser check. Phase C items are tracked here until Dave records a date.
