# Throwline

Throwline is the offline-first projector planning surface at `/ProjectorThrow/`. Normal launches open `Stage3D.html` as the primary spatial workspace for placement, room, obstruction, multi-projector, and field-verification decisions. The detailed calculation and show-handoff planner remains available at `index.html?workspace=planner`; existing hash-based planner share links bypass the default launch switch and continue opening the planner directly. With JavaScript unavailable, `index.html` remains the self-contained fallback.

## Stage 3D architecture

- `throwline-scene-state.js` is the shared scene contract and pure geometry boundary. It normalizes imported data, applies named user intents, calculates projector geometry, detects beam obstructions, and owns provenance transitions.
- `Stage3D.html` owns the no-scroll workspace, controls, readouts, room model, placement and shift guides, persistence, and the mapping from UI events to scene intents.
- `three-d-stage.js` owns WebGL rendering, camera and export plumbing, and pointer hit-testing. Direct manipulation emits `stage-manipulation` intents; it does not calculate throw geometry.
- `vendor/three/` contains the exact local Three.js `0.184.0` modules needed by the scene and exporters. Refresh them with `npm run vendor:throwline-three` after an intentional version change.

The scene JSON uses schema version 1 and stores locally under `throwline:stage-scene:v1`. Import always normalizes and caps the scene to eight projector units and 24 obstructions.

## Calculation model

- Every transferred and stored length is feet. The planner converts before it builds a Stage 3D link; a hand-written URL carries no unit marker, so a value entered in metres is silently read as feet.
- Throw distance = projected-raster basis width × throw ratio. The wide and tele stops are exact products of the ratio range and the basis; the conservative band is 5 % inside each stop. A fixed ratio (a field stamp) collapses that band to the exact mark ± 0.01 ft instead of inverting it.
- Slider and handle edits round to 0.25 ft. The snap wide, snap tele, and snap mid controls use the `snap-distance` intent, which lands on the exact optical stop so a snapped unit can never read UNDERSHOOT or OVERSHOOT against its own envelope.
- Lens shift is judged per axis against the limit for the direction the image actually moves: a positive vertical value against the up limit, a negative value against the down limit, and lateral aim offset against the left or right limit. Combined-axis (elliptical) limits are not modeled and the readout says `limits unknown` when the transfer carried none.
- Room conflicts come from `roomConflicts()` and cover every unit, not only the active one: beyond room depth, lens above the ceiling, outside the room width, screen wider than the room, screen top above the ceiling, and a projected image that breaks the ceiling, floor, or side walls. Projector body and cart clearance behind the optical origin are not modeled.
- The planning tolerance is scene state (`tolerance`, 0–15 %, default 5) and transfers from the planner as `tolPct`. A fixed ratio, or a zoom span narrower than the margin, has no conservative interior: the readout shows the nominal mark and a ±tolerance verify band, never a safe band. A field-measured ratio is not uncertain, so it passes only at its exact mark.
- The headline verdict is `assessInstallation()`, an aggregate across every unit where the lowest severity wins: ratio fit, screen coverage (missing width or height is a failure, spill is a review), vertical and horizontal shift limits, beam obstructions, room bounds, and provenance. It reads `Needs a fix · …`, `Worth a look · …`, or `Ready — everything checks out`; a manual ratio can reach Worth a look but never Ready. The ratio-only verdict stays in the note under the set mark.
- Every operator-facing label, note, warning, and announcement in Stage 3D is written in plain language (for example `Too close — the picture can’t fill the screen`, `the light path hits Obstruction 1`, `Nothing in the way`). Internal kinds such as `undershoot` or `coverage-missing` stay stable for tests and styling.
- Obstruction collision solves the beam boundaries as linear functions of depth across the obstacle's whole z extent, so a deep object that only clips the wide end of the beam is still a collision.
- Transfer bounds equal the scene-state limits (2–200 ft screens, 1–300 ft throws); the range controls stretch to hold a transferred value instead of clamping it. Null, blank, or boolean optical values and inverted ratio ranges block calculation.
- The numerical model, readouts, verdicts, and controls hydrate before the WebGL renderer starts. If the renderer fails, the page says so and disables only the 3D view and model exports; every fact stays live and identical to a WebGL run.
- The stack and blend arrangements are illustrative layouts. Overlap percentage, per-unit crop, and edge-blend geometry are not solved.

The first Stage 3D visit opens a three-pass Quick Start route through screen sizing, projector placement, and inspection/field verification. Choosing a step closes the dialog, opens the live adjustment surface, focuses the corresponding control, and briefly marks its control group. Completion is remembered under `throwline:stage-onboarding:v1`; the header Quick Start control always reopens the route.

## Lens catalog

`data/throwline-pilot-catalog.v1.json` is the single catalog source; `npm run sync:throwline-catalog` copies it into both pages. The 2026-09-04 verification pass made ten profiles calculation-ready (Panasonic PT-RQ50K with ET-D3QW300, ET-D3QS400, ET-D3QT500, ET-D3QT600, ET-D3QT700, ET-D3QT800; Epson Pro L30000UNL with ELPLM12 and ELPLX03; Sony VPL-GTZ380 with VPLL-Z8008 and VPLL-Z8014). The rule, recorded in `meta.verificationPass`: a profile is calculation-ready only when a document on the maker's own domain, read in full, lists projection distance beside projected image width (or states distance over width) and distance ÷ width reproduces the published ratio within 2 %. Each ready profile carries `verificationEvidence` (source, excerpt, method, cross-checks), `basisAspect`, and `aspectVariants` with the maker's width-based ratio for every picture shape it published, plus the maker's distance formula where given. `resolveProfileRatio()` in the scene contract picks the variant that matches the chosen picture shape; any other shape blocks with a plain-language reason. The two Barco UDX-4K32 profiles stay paused: Barco's site blocks automated reading, the TLD+ 0.37 family label disagrees with Barco's 0.42:1 WQXGA value, and no readable Barco document states the width basis. Projector rows carry maker-published body dimensions and weight; lens rows carry lens protrusion and per-lens shift limits for the next updates. The release verifier pins the catalog arrays, requires the evidence fields on every ready profile, and requires a reason on every blocked one.

## Provenance rules

- Manual ratios are labeled `MANUAL ESTIMATE`. A valid result may say `Fits the ratio you entered`; it must never claim verified safety. Blocked inputs read `CAN’T CALCULATE YET` with a plain-language reason.
- Exact calculation-eligible catalog inputs are labeled `MANUFACTURER VERIFIED`, and only for the picture shapes the maker published; other shapes read `CAN’T CALCULATE YET` with the covered shapes listed.
- A measured distance and image width can be stamped `FIELD VERIFIED` for the current job only. The stamp certifies the throw ratio; the planned raster basis is kept, so the corrected mark is ratio × basis exactly as the planner reports it. Any driving geometry edit, including snapping to that corrected mark, invalidates the stamp and returns the unit to manual-estimate status.
- A URL is not a stamp. A `mode=field_verified` transfer is honored only when it carries the measured throw and image width (`md`, `mw` in feet) that agree with `ratio` within 0.5 % and a parseable `stamp` timestamp; the planner adds these automatically. A transfer with a ratio but no evidence opens as a `MANUAL ESTIMATE` that asks for an on-site re-stamp, and a transfer with neither is blocked.
- Partial, conflicting, legacy, unspecified, or invalid inputs fail closed and suppress optical geometry.

## Verification

Run `npm run verify:throwline`. This checks the embedded catalog, scene-state unit tests, locally vendored Three.js assets, offline registry, Stage 3D workspace contract, metadata, and release documentation.

Run `npm run probe:throwline-stage` for the browser-level regression probe. It serves the repository, drives `Stage3D.html` in headless Chrome, and checks the audited production link, exact-stop snapping, field-transfer URL trust, field-stamp calibration, direction-aware shift limits, and room-boundary conflicts against the rendered readouts. Pass `--chrome=` for a non-default browser binary, `--base=` to reuse a running static server, and `--no-webgl` to run the same assertions with WebGL disabled, which proves the degraded renderer path reports identical facts.

Browser release checks cover desktop and phone no-scroll containment, first-run onboarding and its remembered/reopen flows, WebGL readiness, exclusive mobile sheets, direct manipulation, scene save and restore, obstruction collision alerts, multi-projector layouts, and field-stamp invalidation.
