# FMP Camera Simulator audit outcomes, September 2026

Ten audits of https://housevideo.app/camera-sim/ were written on 23–24 September 2026 against
1.6.0, 1.7.0 and the 1.7.1 tree: accessibility, code quality, data, delivery, performance,
product, QA, reliability, security and web health. This page records what happened to every
finding, so the next audit starts from here. The reports themselves are kept outside this
repository.

Outcomes: **1.8.0** fixed in this release; **1.7.x** fixed earlier (1.7.0 is #140, 1.7.1 is
#141, 1.7.2 is #142); **Dave** needs hosting or account access; **Deferred** with the reason;
**Not a defect**, with the evidence.

| Outcome | Findings |
| --- | --- |
| Fixed in 1.8.0 | 43 |
| Fixed in 1.7.0–1.7.2 | 9 |
| Resolves when the open releases merge | 2 |
| Needs Dave (edge, hosting, a measurement on a real phone) | 8 |
| Deferred, with a reason | 22 |
| Not a defect or no change needed, with the evidence | 19 |

That is all 103 rows below: 98 audit findings and 5 found outside the audit text. Several audits
raised the same issue (the edge headers four times, the font three times); each row cross-refers.
Informational rows the audits marked "keep" (CSP, no third parties, noindex, gzip, request count)
need nothing and are not listed.

## Found outside the audit text

N2 is visible in the audits' own evidence screenshots. N1 turned up when their 1024 × 720 view
was shot again in its default state: their screenshot had the venue view open, which hides it.

| ID | Finding | Outcome |
| --- | --- | --- |
| N1 | On an iPad in landscape (1024 × 768) the stacked layout left the monitor 2 px tall, in 1.6.0 and 1.7.0 alike; a 1366 × 650 laptop browser showed a 158 × 89 picture and 1280 × 600 a 69 × 39 one | **1.8.0**: the monitor keeps at least 45% of the workspace, the controls scroll inside their panel when needed, landscape tablets from 960 px use one row of controls and a one-row header. Now 294 × 165, 204 × 115 and 164 × 92; the probe checks three short sizes |
| N2 | The breadcrumb drew a vertical scrollbar wherever scrollbars always show (Windows, Linux, the audit box): `overflow-x: auto` made `overflow-y` auto too, and its 44 px links overflow the 43 px row by 1 px | **1.8.0**: `overflow-y: hidden`; the probe checks every layout |
| N3 | After #142, a venue-view WebGL context that fails to start left a silent blank panel | **1.8.0**: the panel says so; the monitor carries on |
| N4 | The 1.7.0 preset menu took no keyboard focus, and a keyboard-opened menu had no position | **1.8.0**: first action focused, Escape returns to the key, anchored under the key |
| N5 | At 1366 × 650 the venue view is too short: its hint runs under the legend | Deferred: part of the side-by-side short-screen layout recommended in `docs/fmp-camera-simulator.md` |

## Accessibility (1.6.0)

| ID | Finding | Outcome |
| --- | --- | --- |
| A1 | Control borders 1.3–2.2:1 (WCAG 1.4.11) | **1.7.1**. Checked here: `--control-border` is 3.16–3.79:1 on every light surface and 3.44–4.52:1 on every dark one |
| A2 | Venue canvas is `role="img"` but drag-orbits | **1.8.0**: stays a labelled, non-focusable image whose description names the House, Top, Side elevation, Behind camera and Lawn buttons as the keyboard route; orbit is a pointer convenience that never moves the camera |
| A3 | Zoom rocker `role="application"` outside the tab order; joystick state not exposed | **1.8.0**: the rocker is `aria-hidden` (a pointer duplicate of held T/W and E/Q; the lens meter carries the value); the joystick's description reads the current pan and tilt |
| A4 | Framing marks pass/fail by colour only | **1.8.0**: outside is dashed and hollow, inside solid and filled (the two colours are only 1.2:1 apart in luminance). The wide-shot checklist already names each mark |
| A5 | Reduced motion handled in CSS only | **1.8.0**: orbit inertia stops. Camera moves and recalls keep their real timing: they are the simulation, not decoration |
| A6 | Collapsed venue view easy to miss on tablets | Not a defect: a labelled "Show venue view" button with `aria-expanded` and `aria-controls`. N1 was the real tablet problem |
| A7 | Phone rail selection and H1 | Not a defect: the rail marks `aria-current="page"`; the phone H1 is visually hidden, not removed |
| A8 | Zoom rocker 34 px wide (AAA 2.5.5) | **1.8.0**: 44 px target, same look |
| A9 | Monitor chips drop to 9 px | Not a defect: the chips are `aria-hidden` duplicates; the readout below the picture holds the values |
| A10 | DM Sans named but never loaded | **1.8.0**: the page loads its own hashed copy of the suite's latin subset; the offline file inlines it |
| A11 | Hard-coded monitor colours; dark zoom knob 1.35:1 | **1.8.0**: `--knob` (7.3:1 on the dark track) and `--overlay-in/out` tokens. Monitor chip colours stay fixed: the monitor is a dark picture in both themes |
| A12 | No spacing, type or radius scale; parallel button classes | Deferred: a refactor with no visible defect, best done with a split of `app.css` |
| A13 | "Camera controls" region unnamed | Not a defect: the section is labelled by a visually hidden "Camera controls" heading |
| A14 | Dense controls at compact heights | **1.8.0** in part (N1); a side-by-side short-screen layout is the next step |
| A15 | `outline: none` on programmatically focused containers | Not a defect: they are not tab stops; the global `:focus-visible` ring stays |
| A16 | `body { overflow: hidden }` clips short screens | **1.8.0** differently: the page still never scrolls, the controls panel scrolls inside itself, and the probe checks Stop is reachable at 1366 × 650 |
| A17 | First paint uses the light browser-bar colour | **1.8.0**: the theme boot script sets `theme-color` too |

## Code quality (1.6.0)

| ID | Finding | Outcome |
| --- | --- | --- |
| C1 | `SimulatorStore` god object | **1.7.1**: façade over `StoreCore` and five controllers |
| C2 | One 886 KB bundle, no code splitting | Deferred by design: the offline file inlines one entry under a hash-pinned CSP; splitting needs a multi-chunk inliner. 1.7.2 already removed the second GPU context at start |
| C3 | Six venue versions parsed inline | **1.7.1**: `src/domain/migrations/venue.ts`. Checked here: v1–v2 heading promotion equals the old parse, missing provenance still reads as none |
| C4 | Unreadable backups never pruned | **1.8.0**: at most three, oldest first |
| C5 | No source maps | Deferred: the stamp identifies the source, and a deterministic rebuild of that commit with `npx vite build --config apps/fmp-camera-sim/vite.config.ts --sourcemap --outDir <scratch dir>` gives the same bundle with maps, without publishing them |
| C6 | 2,000-line stylesheet, OSD hex colours | Deferred (split); tokens in part (A11) |
| C7 | `App.tsx` owns too much | Deferred; the recovery screen sits outside it |
| C8 | Two `WebGLRenderer`s at start | **1.7.2** |
| C9 | No storage, input or UI tests | **1.8.0** in part: `storage/persist.test.ts` and six store tests; the probe covers the UI. Input unit tests and component tests deferred (no testing-library dependency) |
| C10 | `@types/react` 19 over React 18 | Deferred: the root `package.json` serves the whole site; its own change with every app's typecheck |
| C11 | Store passed through every panel | Deferred |
| C12 | DM Sans never loads | **1.8.0** (A10) |
| C13 | Restored session shows no save time | **1.8.0**: from the file's `exportedAt`, with the date when not today |
| C14 | Result ids from `Math.random()` | **1.8.0**: `crypto.randomUUID()`, with a fallback for pages opened from disk |
| C15 | `?diagnostics=1` in production | Not a defect: a read-only interface the CI probe and release checks use against the production build; documented under Observability |
| C16 | Settings modules written in different styles | Deferred |
| C17 | `legacy-v1` geometry still supported | Deferred to the next major saved-file change |

## Data and APIs (1.7.1 tree)

| ID | Finding | Outcome |
| --- | --- | --- |
| D1 | A corrupt saved session stays in place and warns on every reload | **1.8.0**: copied aside, then removed; left in place only when there is no room for the copy |
| D2 | Backups accumulate | **1.8.0** (C4) |
| D3 | Project v1 has no migrator | **1.8.0** policy in `docs/fmp-camera-simulator.md`: keep v1 while nested records change; a new project version needs a migrator |
| D4 | Camera versions hard-fail | **1.8.0** policy: additive fields with defaults inside v1; a breaking change needs a migrator first |
| D5 | `savedAt` empty after load | **1.8.0** (C13) |
| D6 | Refused import announced without detail | **1.8.0**: the status line names the first problem |
| D7 | `exportedAt` unvalidated | **1.8.0**: read only when it is a valid time, and never decides acceptance |
| D8 | `setUnit` and `setGuides` skip `parseSession` | Not a defect: both take typed values from fixed controls (a unit enum, booleans) |
| D9 | Offline copy keeps separate storage | Not a defect: the Session panel says so; the release QA list includes the offline copy |
| D10 | Live stamp behind the audited tree | Resolves when #141, #142 and this release merge |
| D14 | Transfer prefixes | Checked: `scripts/domain-sites.json` carries the `fmp` prefix for housevideo.app |

## Delivery and operations

| ID | Finding | Outcome |
| --- | --- | --- |
| O1 | No HSTS, HTTP CSP, `frame-ancestors` or `nosniff` | **Dave**: an edge (Cloudflare or similar) in front of GitHub Pages; plan in `apps/fmp-camera-sim/EDGE-HEADERS.md` |
| O2 | No staging or preview | **Dave** to decide; the pull-request probe already runs the branch build |
| O3 | No rollback runbook | **1.8.0**: "Release QA and rollback" in `docs/fmp-camera-simulator.md` |
| O4 | No CODEOWNERS | Not adopted: one owner, and the bots push as that account. GitHub cannot request review from a pull request's author, so it would add noise, or block self-merges if enforced |
| O5 | Forgotten rebuilds fail pull requests | Kept: the gate is the point. `apps/fmp-camera-sim/README.md` states the rule |
| O6 | Hashed assets cached for 10 minutes | **Dave** (edge, O1) |
| O7 | The deploy runs the whole site's checks | Deferred: one Pages root; revisit if it blocks releases |
| O10 | No README in the app folder | **1.8.0** |

## Performance

| ID | Finding | Outcome |
| --- | --- | --- |
| P1 | Two WebGL contexts at start | **1.7.2** |
| P2 | Bundle size | Deferred (C2) |
| P3 | Cache lifetime of hashed assets | **Dave** (O1) |
| P4 | Lab TBT and TTI | **Dave**: re-measure on a real phone after 1.7.2 is live; headless software GL distorts these |
| P5 | Offline file size | Deferred (C2). 1.8.0 adds 84 KB for the inlined font (993 KB) |
| P6 | LCP is the first-run tip | Not a defect: first visits only; returning visitors never see it |
| P7 | `og.png` is 311 KB | Deferred: fetched only by link previews |
| P8 | `theme-boot.js` is a separate request | Not a defect: inlining needs a CSP hash for 660 bytes |
| P9 | DM Sans | **1.8.0**: a 62.7 KB hashed font, off the script path |

## Product and UX (1.6.0)

| ID | Finding | Outcome |
| --- | --- | --- |
| U1 | No onboarding | **1.7.0**: first-run tip |
| U2 | Venue settings dense | Deferred: splitting operator defaults from the evidence editor needs Dave's design call |
| U3 | Expectation gap (focus, SuperJoy) | **1.7.0**: scope line and tip |
| U4 | Rename and clear only in Session | **1.7.0**; keyboard focus and probe coverage **1.8.0** |
| U5 | Flag count "10" unexplained | **1.8.0**: "10 dimensions not yet measured" in its name; the tooltip lists them |
| U6 | Home mistaken for safe-wide | **1.8.0**: the first Home of a visit says so |
| U7 | A tapped T or W does nothing | **1.8.0**: a tap says to hold |
| U8 | "Reduced detail" unexplained | **1.8.0**: the explanation is in its accessible name as well as its tooltip |
| U9 | "Dark mode" label does not change | Not a defect: a toggle button keeps its label and reports state with `aria-pressed`; changing the label would invert its meaning |
| U10 | Own chrome rather than the suite's | Deferred |
| U11 | `/favicon.ico` 404 | Deferred: the request is for the housevideo.app root, part of the site shell rather than the simulator |

## QA and testing

| ID | Finding | Outcome |
| --- | --- | --- |
| Q1 | Chromium only | Deferred: a scheduled WebKit smoke job is the recommended next CI step |
| Q2 | Preset menu untested | **1.8.0**: right-click rename and clear in the probe |
| Q3 | New dialogs can block the probe | **1.8.0**: rule in the doc |
| Q4 | No component tests | Deferred (C9) |
| Q5 | Rename and delete untested | **1.8.0** |
| Q6 | No release QA list | **1.8.0** |
| Q7 | Fixed sleeps | Deferred; the new checks wait on state |

## Reliability

| ID | Finding | Outcome |
| --- | --- | --- |
| R1 | No error boundary | **1.8.0**: recovery screen with reload, export and start fresh. A broken default venue still throws, as a build defect the screen reports |
| R2 | Corrupt save loop | **1.8.0** (D1) |
| R3 | WebGL restore only flips a flag | Not a defect: Three.js recreates its GPU state on `webglcontextrestored`. The probe now loses and restores the context and reads the picture back (luma variance 1816) |
| R4 | No telemetry | **1.8.0**: the no-telemetry stance and the probe-based operations are documented |
| R5 | Later save failures are silent | Not a defect: the export banner stays while saving fails and each change retries; now documented |
| R6 | Any storage event is a conflict | **1.8.0**: identical saves ignored, a removed copy is saved again, and a copy gone before loading keeps this session |
| R7 | Catch-up truncation not mentioned | Not a defect: a hidden page halts motion before the clock pauses, so resume starts at rest |
| R8 | Unbuildable venue swapped silently | **1.8.0**: set aside like an unreadable save; the store's guard now says so |
| R9 | One hashed script | Not a defect: the offline copy is the fallback |
| R10 | Edge headers | **Dave** (O1) |

## Security and privacy

| ID | Finding | Outcome |
| --- | --- | --- |
| S1 | No HTTP security headers | **Dave** (O1) |
| S2 | No `frame-ancestors` | **Dave**: a response header only |
| S3 | No referrer policy | **1.7.0** |
| S4 | Diagnostics hook | Not a defect (C15) |
| S5 | `/favicon.ico` 404 | Deferred (U11) |

## Web and product health

| ID | Finding | Outcome |
| --- | --- | --- |
| W1 | Architecture table stale | **1.8.0** |
| W2 | Live behind the tip | Resolves on merge (D10) |
| W3 | `/favicon.ico` 404 | Deferred (U11) |

## Pull requests reviewed with this release

- #141 (1.7.1): the contrast values hold (A1); the venue migrator reproduces the old parse for
  v1–v6, and the 93 existing tests pass unchanged against the split store.
- #142 (1.7.2): correct; its description still says "Changelog 1.6.1" where the commit adds
  1.7.2, and a failed venue-view context was silent (N3, fixed here).
- Merge order: #141, #142, then this release, which is stacked on both.
