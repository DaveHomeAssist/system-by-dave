# Throwline spatial commissioning and practice-suite plan

## Outcome

Turn Stage 3D from a calculation viewer into an operator-ready planning,
commissioning, handoff, and demonstration surface. Add scope practice as a
separate deterministic training page that shares one synthetic camera state and
never presents generated data as measurement or device control.


## Product boundary correction

Camera shading practice belongs to the existing Camera Control & Shading reference at `housevideo.app/shader/`. Throwline retains work packages 1 through 4 for projector planning and commissioning. The practice engine, UI, offline worker, tests, and browser gate are owned and released by Shader; Throwline contains no practice navigation, registry entry, or offline asset. The former Throwline URL is a noindex compatibility redirect only.

## Work packages

1. Add pointer and keyboard manipulation for projector marks and room
   obstructions. Add dimensioned plan, elevation, and perspective callouts.
2. Calculate per-unit screen coverage, exact combined coverage, adjacent blend
   overlap, configured overlap adequacy, and stack mismatch. Keep brightness
   outside the geometry model.
3. Record planned versus measured commissioning geometry, verifier evidence,
   focus/alignment notes, selective staleness, and supersession. Export CSV and
   a standalone printable handoff with exact scene data.
4. Add named scenario checkpoints with comparison, undo, and redo. Keep JSON as
   the portable scene format and embed complete state in the handoff.
5. Add two-camera shading practice with iris, pedestal, gain, gamma, white
   balance, saturation, and phase; generated pictures; waveform, RGB parade,
   vectorscope, and histogram; scored drills; deterministic replay; and exact
   URL/JSON handoff.
6. Expand the unit, release, browser, responsive, offline, accessibility, and
   export gates. Run a separate post-implementation audit, patch every
   actionable finding, and repeat affected tests before merge.

## Guardrails

- `throwline-scene-state.js` owns geometry and evidence semantics. The renderer
  emits serializable intents and never calculates throw, coverage, or overlap.
- A blend is adequate only against an operator-entered processor range.
  Geometry does not establish brightness.
- Commissioning writes require every measurement, the verifier, and a real
  timestamp. Edits mark only affected evidence stale; no record is silently
  deleted.
- Practice pictures, scopes, and scores are deterministic synthetic values.
  The page makes no network connections and controls no hardware.
- Keep scene schema v1 imports, existing routes, control IDs, offline behavior,
  and no-WebGL calculation/fallback behavior working.

## Acceptance

- A pointer or keyboard operation changes the same scene intent as its form
  control, with selection feedback, snapping, fine steps, and accessible status.
- Plan/elevation views expose throw, screen, offsets, heights, obstruction size,
  and nearest body clearance where available.
- Stack/blend reports match pure-state unit tests and never state a lumen gain.
- Commissioning records survive JSON normalization, show planned/measured
  deltas, become selectively stale, export to CSV, and appear in the standalone
  handoff.
- Named versions save, undo, redo, and travel in the handoff package.
- Camera-match practice improves through the visible controls, every scope
  renders, troubleshooting can replay, and the exact state reproduces from a
  full-state link.
- Stage 3D passes WebGL and no-WebGL browser acceptance; Scope Practice passes
  phone, tablet, desktop, and ultrawide containment with no browser errors.
- The independent audit reports no unpatched high or medium findings.

## Execution record

- Implemented the six work packages in an isolated worktree; the shading package was subsequently moved to Shader to correct product ownership.
- Added 47 scene-state tests and 12 deterministic practice-state tests to the
  release gate, 59 state tests in total.
- Added browser acceptance for commissioning/handoff downloads, layout math,
  direct manipulation, dimension callouts, demo history, camera matching,
  scopes, exact handoff, and responsive containment.
- Ran an independent post-implementation audit. Patched its direct-manipulation
  finding by fitting preset cameras to live scene bounds, separating projected
  handle hit targets, and adding a real browser pointer-drag assertion. Also
  corrected test-count documentation and removed the temporary audit probe.
- Patched the audit cycle's navigation, scope fidelity, fault injection,
  commissioning atomicity, offline, accessibility, contrast, CSV injection,
  storage-denial, mobile containment, and focus-timing findings. Re-ran the
  affected release, public, AV, domain, WebGL, no-WebGL, practice, and security
  gates before delivery.
