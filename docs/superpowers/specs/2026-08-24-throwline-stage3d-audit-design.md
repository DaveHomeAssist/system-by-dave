# Throwline Stage 3D Audit Design

## Objective

Bring the Stage 3D companion up to the operational clarity of Throwline SHOW 2.0 while preserving its technical-paperwork aesthetic, offline fallback, calculation contracts, and export workflows.

The supplied UX and visual audit is the approved product brief. Work is organized into the three releases named in that audit and delivered as one feature branch.

## Product direction

Throwline remains an industrial field tool: warm paper surfaces, ink-like framing, amber optical geometry, green safe states, red failures, tabular numerals, and terse AV vocabulary. The 3D scene is evidence for the set mark, not a decorative hero. Every state must be understandable from both text and geometry.

## Phase 1 — Communicate projection state

- Replace the single translucent cone mesh with a projection system containing a low-opacity volume, high-contrast boundary rays, an optical centerline, and a projected-image plane.
- Use theme-aware scene materials. Dark mode receives a luminous amber volume and stronger edge rays; light mode receives restrained amber fill and brown/amber structure.
- Clip the normal projected-image plane to the physical screen. Overshoot adds red spill regions outside the screen; undershoot adds red missing-coverage regions inside the screen.
- Add a front camera preset to the existing three-quarter, side, top, and operator presets. Keep Reset visible and preserve keyboard access.
- Make the scene state self-describing through mesh names and a synchronized accessible text summary.

## Phase 2 — Improve field and mobile workflow

- On phone, present the compact header, set-mark/status card, an accessible Adjust disclosure, the viewport, camera/layer controls, export actions, and detailed facts in that order.
- Add a sticky Field Verify switch to Stage 3D. Verify mode suppresses explanatory and export content while retaining set mark, safe range, status, lens, optical height, screen/image dimensions, controls, and the bounded visual.
- Add a matching Field Verify switch to the offline main planner using CSS state reduction, without changing its calculation or storage schema.
- Convert the persistent gesture sentence into first-use help that dismisses after the first successful interaction and remains available through a Controls button.
- Preserve 44 × 44 CSS pixel touch targets and logical DOM/tab order.

## Phase 3 — Harden and polish

- Dispose replaced screen, room, projection, and cart resources after each model rebuild; fully dispose renderer, controls, scene resources, and listeners when the custom element is intentionally destroyed.
- Replace continuous rendering with invalidation-driven rendering. Render on model, control, resize, theme, camera, or visibility changes; pause while the document is hidden and continue animation only while damping or auto-rotation requires it.
- Remove global `preserveDrawingBuffer`; add a capture-safe render method that renders immediately before a screenshot consumer reads the canvas.
- Improve dark-scene separation with theme-aware light colors/intensities and charcoal object materials.
- Increase range-bar contrast and add non-color texture/ticks. Formalize blue as optical adjustment/information only.
- Respect `prefers-reduced-motion` for interface transitions and camera changes.
- Keep pinned unpkg modules and the existing actionable offline fallback in this release; self-hosting is intentionally deferred because it changes the dependency/distribution model and requires vendoring Three.js.

## Architecture

`ProjectorThrow/Stage3D.html` remains the page-level owner of projection calculations, model construction, state classification, responsive hierarchy, and theme tokens. `ProjectorThrow/three-d-stage.js` remains the reusable WebGL shell and owns rendering lifecycle, interaction help, accessibility semantics, and exports. `ProjectorThrow/index.html` receives only the shared Field Verify and range-bar presentation changes. `scripts/verify_throwline_release.js` is expanded first in each phase to encode release contracts.

No new runtime dependency or build step is introduced. Browser behavior remains modern plain JavaScript with the existing pinned Three.js import map.

## State model

The page derives one projection state on every rebuild:

- `safe`: within the conservative planning band.
- `near-limit`: inside the lens range but outside the safe band.
- `overshoot`: past the tele stop; projected image is larger than the screen.
- `undershoot`: before the wide stop; projected image is smaller than the screen.
- `shift-limit`: vertical shift exceeds the declared constraint.

Copy, HUD color, range marker, projected-image treatment, spill/missing geometry, and assistive summary all consume the same derived state.

## Accessibility contract

WCAG 2.2 AA is the target. Native buttons, `details`/`summary`, labels, visible focus, live status text, explicit state words, 44-pixel touch targets, reduced-motion handling, and a concise scene summary provide keyboard, touch, low-vision, color-independent, and screen-reader support. Automated checks are supplemented with keyboard and responsive browser verification.

## Verification

- Static release contracts: `npm run verify:throwline`.
- Broader AV regression: `npm run verify:av`.
- Syntax checks: `node --check ProjectorThrow/three-d-stage.js` and module-script extraction/check for `Stage3D.html`.
- Browser checks at tablet landscape and phone portrait in both themes, including safe, overshoot, undershoot, camera reset, Field Verify, and keyboard flows.
- Console must remain free of page errors in the verified scenarios.

