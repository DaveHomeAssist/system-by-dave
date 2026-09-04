# Throwline

Throwline is the offline-first projector planning surface at `/ProjectorThrow/`. Normal launches open `Stage3D.html` as the primary spatial workspace for placement, room, obstruction, multi-projector, and field-verification decisions. The detailed calculation and show-handoff planner remains available at `index.html?workspace=planner`; existing hash-based planner share links bypass the default launch switch and continue opening the planner directly. With JavaScript unavailable, `index.html` remains the self-contained fallback.

## Stage 3D architecture

- `throwline-scene-state.js` is the shared scene contract and pure geometry boundary. It normalizes imported data, applies named user intents, calculates projector geometry, detects beam obstructions, and owns provenance transitions.
- `Stage3D.html` owns the no-scroll workspace, controls, readouts, room model, placement and shift guides, persistence, and the mapping from UI events to scene intents.
- `three-d-stage.js` owns WebGL rendering, camera and export plumbing, and pointer hit-testing. Direct manipulation emits `stage-manipulation` intents; it does not calculate throw geometry.
- `vendor/three/` contains the exact local Three.js `0.184.0` modules needed by the scene and exporters. Refresh them with `npm run vendor:throwline-three` after an intentional version change.

The scene JSON uses schema version 1 and stores locally under `throwline:stage-scene:v1`. Import always normalizes and caps the scene to eight projector units and 24 obstructions.

The first Stage 3D visit opens a three-pass Quick Start route through screen sizing, projector placement, and inspection/field verification. Choosing a step closes the dialog, opens the live adjustment surface, focuses the corresponding control, and briefly marks its control group. Completion is remembered under `throwline:stage-onboarding:v1`; the header Quick Start control always reopens the route.

## Provenance rules

- Manual ratios are labeled `MANUAL ESTIMATE`. A valid result may say `FITS SUPPLIED RANGE`; it must never claim verified safety.
- Exact calculation-eligible catalog inputs are labeled `MANUFACTURER VERIFIED`.
- A measured distance and image width can be stamped `FIELD VERIFIED` for the current job only. Any driving geometry edit invalidates that stamp and returns the unit to manual-estimate status.
- Partial, conflicting, legacy, unspecified, or invalid inputs fail closed and suppress optical geometry.

## Verification

Run `npm run verify:throwline`. This checks the embedded catalog, scene-state unit tests, locally vendored Three.js assets, offline registry, Stage 3D workspace contract, metadata, and release documentation.

Browser release checks cover desktop and phone no-scroll containment, first-run onboarding and its remembered/reopen flows, WebGL readiness, exclusive mobile sheets, direct manipulation, scene save and restore, obstruction collision alerts, multi-projector layouts, and field-stamp invalidation.
