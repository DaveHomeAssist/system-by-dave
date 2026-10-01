# [SPEC] FMP Open Issues Plan

October 1, 2026. Source: a read-only survey of fmp-suite and system-by-dave (open
PRs and issues, seven days of CI, the October 1 live hygiene probe, audit and
release docs, TODO comments, the audit-bot branches and the iCloud FMP folder),
with the two highest-impact claims rechecked by hand. Every item has a verdict.
Owners: **fmp-suite** means fix the canonical source and re-export; **sbd** means
this repository; **Dave** means a console, credential or hardware step that an
agent cannot do.

## Phase A: small fixes, no hardware

| # | Issue | Evidence | Verdict and fix | Owner | Size |
| --- | --- | --- | --- | --- | --- |
| A1 | Changing date, show, operator or configuration in the walk's Setup sends the walker back to stop 1 | fmp-suite `index.html`: every Setup field's `change` handler sets `S.idx = 0` | **Fix.** Reset the position only when the route (configuration) changes, and then keep the current stop by id when it still exists. Add a walk browser check | fmp-suite | S |
| A2 | Hygiene probe S1 warns on every FMP page for "no home link" | `scripts/fmp_hygiene_probe.js` requires `href="/"`; `scripts/verify_public_navigation.js` deliberately exempts FMP pages because `/fmp/` is their home | **Fix the probe**, not the pages: require only the `/fmp/` return, matching the verifier | sbd | S |
| A3 | `/favicon.ico` 404 on `/fmp/gear/` and three other pages | Probe W1/W2 | **Mostly done by fmp-suite #36** (merged as `3c5819c` on October 1), which gives the build, gear, house and ptz pages an icon link; it reaches housevideo.app with the next re-export. Still to do: serve a root `/favicon.ico` on housevideo.app through the domain-sites assets for pages and tools that never declare one | fmp-suite (done), sbd | S |
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

## Phase C: needs Dave or hardware

| # | Issue | Verdict |
| --- | --- | --- |
| C1 | Commissioning gates 1 to 4 in `docs/fmp-public-release.md` are still pending: the Google client listing `walk.housevideo.app` (1), sharing the Events, Crew Calls, Faults, Walk Reports and Cameras reference page with the FMP Walk Notion connection (2), a signed-in synthetic SETUP TEST camera save with exact Notion readback (3), and a separate walk acceptance with Gmail Sent receipt and Notion readback (4) | **Dave**, in order: check the Google Console origin list (gate 1), share the five Notion pages with the connection (gate 2), then run gates 3 and 4 signed in, and record the date in `docs/fmp-public-release.md`. Agents cannot sign in |
| C2 | Camera Simulator device baseline (X8/X9), monitor delay and Camera 4 timing | **Dave**, one iPad session with `?diagnostics=1`; the venue timing needs a site visit |
| C3 | The rig changes of September 29 and October 1 (touch rotation default; scroll and pinch zoom) were tested by emulation only | **Dave**, two minutes: drag and pinch on an iPhone and an iPad; scroll, Shift+scroll and trackpad pinch on the Mac in Safari and Chrome |

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
