# Throwline Stage 3D Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver all three releases from the Throwline Stage 3D UX and visual audit with static, browser, responsive, theme, keyboard, accessibility, and lifecycle verification.

**Execution status (2026-08-24): Complete.** All three phases were delivered with witnessed red-green release contracts, the full automated verification suite, and desktop, tablet, and phone browser acceptance checks.

**Architecture:** Keep projection math and model composition in `ProjectorThrow/Stage3D.html`, keep reusable rendering/lifecycle behavior in `ProjectorThrow/three-d-stage.js`, and add only shared verification-mode/range presentation to `ProjectorThrow/index.html`. Extend the existing Node release verifier before each implementation phase so every new contract has a witnessed red-green cycle.

**Tech Stack:** Static HTML/CSS, modern browser JavaScript, Three.js r184 via the existing pinned import map, Node.js release-verification scripts, Playwright CLI browser verification.

---

## File map

- Modify `ProjectorThrow/Stage3D.html`: projection state geometry, camera toolbar, mobile order, Field Verify, scene summary, theme-aware materials, and resource replacement.
- Modify `ProjectorThrow/three-d-stage.js`: progressive controls help, invalidation rendering, visibility handling, capture path, and disposal lifecycle.
- Modify `ProjectorThrow/index.html`: Field Verify presentation and range-bar non-color contrast.
- Modify `scripts/verify_throwline_release.js`: all static release and accessibility contracts.
- Modify `CHANGELOG.md`: three-phase Throwline release note.
- Create `docs/superpowers/specs/2026-08-24-throwline-stage3d-audit-design.md`: approved design.
- Create `docs/superpowers/plans/2026-08-24-throwline-stage3d-audit.md`: this execution plan.

### Phase 1: Communicate projection state

**Files:**
- Modify: `scripts/verify_throwline_release.js`
- Modify: `ProjectorThrow/Stage3D.html`
- Modify: `ProjectorThrow/three-d-stage.js`

- [ ] **Step 1: Add failing release contracts**

Add assertions for five ordered Stage 3D cameras (`three`, `side`, `front`, `top`, `op`), named `beam_volume`, `beam_edges`, `optical_centerline`, `projected_image`, `spill_left`, `spill_right`, and `missing_coverage` scene parts, `data-projection-state`, and the accessible `sceneSummary` region.

- [ ] **Step 2: Run the focused verifier and witness failure**

Run: `npm run verify:throwline`

Expected: FAIL with missing front-camera and projection-geometry contract messages.

- [ ] **Step 3: Implement state-aware optical geometry**

Build a projection group that always includes an amber volume, four structural edge rays, an optical centerline, and a projected-image plane. Add red left/right or top/bottom spill planes when the image exceeds screen bounds and red missing-coverage planes when it falls short. Derive all geometry and copy from the same `projectionState` object.

- [ ] **Step 4: Implement theme and camera behavior**

Add a visible front preset, update keyboard shortcuts to 1–5, preserve Reset, and update scene materials on `throwline-theme-change`. Dark mode uses brighter edge and volume opacity plus lifted charcoal chassis/frame/deck colors; light mode keeps the restrained paper treatment.

- [ ] **Step 5: Run phase verification**

Run: `npm run verify:throwline && node --check ProjectorThrow/three-d-stage.js`

Expected: PASS; JavaScript syntax exit code 0.

- [ ] **Step 6: Commit Phase 1**

```powershell
git add -- ProjectorThrow/Stage3D.html ProjectorThrow/three-d-stage.js scripts/verify_throwline_release.js
git commit -m "feat: clarify Throwline projection states"
```

### Phase 2: Improve field and mobile workflow

**Files:**
- Modify: `scripts/verify_throwline_release.js`
- Modify: `ProjectorThrow/Stage3D.html`
- Modify: `ProjectorThrow/three-d-stage.js`
- Modify: `ProjectorThrow/index.html`

- [ ] **Step 1: Add failing mobile and verification-mode contracts**

Assert Stage 3D has native `details` adjustment controls, `fieldVerifyToggle`, a camera/layer scene toolbar, a `controlsHelp` trigger, first-interaction help dismissal, and 44-pixel phone targets. Assert both Stage 3D and the offline main app expose `data-field-verify` state and visible Field Verify controls.

- [ ] **Step 2: Run the focused verifier and witness failure**

Run: `npm run verify:throwline`

Expected: FAIL with missing Field Verify, progressive controls help, and mobile hierarchy contracts.

- [ ] **Step 3: Rebuild the phone hierarchy**

Use semantic DOM and mobile grid areas so the phone order is compact header, set-mark/status, Adjust disclosure, viewport, camera/layer controls, exports, and facts. Keep the desktop sidebar layout intact. Move secondary navigation into a compact More disclosure on phone while retaining the offline main-app link.

- [ ] **Step 4: Add Field Verify to both surfaces**

Stage 3D verification mode hides exports, explanatory notes, and secondary facts while retaining operational controls and values. The offline planner mode reduces nonessential fieldsets/cards via a document `data-field-verify` attribute without changing schema-4 calculation data.

- [ ] **Step 5: Add progressive help and accessibility behavior**

Show `Drag to orbit · Pinch to zoom` until the first orbit/zoom interaction, then collapse it to a persistent `Controls` button. Keep the full mouse, touch, and keyboard instructions in a toggleable help surface. Preserve visible focus and at least 44 × 44 CSS-pixel touch targets.

- [ ] **Step 6: Run phase verification**

Run: `npm run verify:throwline && npm run verify:av`

Expected: both commands PASS.

- [ ] **Step 7: Commit Phase 2**

```powershell
git add -- ProjectorThrow/Stage3D.html ProjectorThrow/three-d-stage.js ProjectorThrow/index.html scripts/verify_throwline_release.js
git commit -m "feat: prioritize Throwline field workflow"
```

### Phase 3: Harden, polish, and verify the release

**Files:**
- Modify: `scripts/verify_throwline_release.js`
- Modify: `ProjectorThrow/Stage3D.html`
- Modify: `ProjectorThrow/three-d-stage.js`
- Modify: `ProjectorThrow/index.html`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add failing lifecycle and polish contracts**

Assert replacement resources call a disposal helper, the custom element listens for `visibilitychange`, renderer creation omits `preserveDrawingBuffer`, a capture method explicitly renders before returning the canvas, reduced-motion media exists, range bars include non-color texture/ticks, and the changelog names the Stage 3D audit release.

- [ ] **Step 2: Run the focused verifier and witness failure**

Run: `npm run verify:throwline`

Expected: FAIL with lifecycle, capture, reduced-motion, and release-note contract messages.

- [ ] **Step 3: Implement resource ownership and render invalidation**

Dispose removed geometries and unique materials. Add document visibility gating and request-based rendering for resize, control, model, camera, theme, and capture changes. Continue frames only while damping or auto-rotation remains active. Remove global `preserveDrawingBuffer` and expose `captureCanvas()` that forces an immediate frame.

- [ ] **Step 4: Finish visual and accessibility polish**

Increase range separation with borders, ticks, and patterns; keep blue reserved for shift/optical information; add reduced-motion rules; and verify dark-scene object separation without changing the Throwline palette.

- [ ] **Step 5: Update the release note**

Add one dated CHANGELOG entry describing state-aware beam/spill geometry, front/reset cameras, mobile answer-first hierarchy, Field Verify, progressive help, WCAG AA cues, and visibility-aware rendering.

- [ ] **Step 6: Run complete automated verification**

Run: `npm run verify:throwline && npm run verify:av && node --check ProjectorThrow/three-d-stage.js`

Expected: all commands PASS with exit code 0.

- [ ] **Step 7: Run browser acceptance checks**

Serve the worktree locally and use Playwright CLI at 1180 × 820, 1024 × 768, and 390 × 844. Check safe light/dark, overshoot, undershoot, front/side/top/reset cameras, Field Verify on both pages, first-use Controls help, keyboard-only focus/shortcuts, and console errors. Save screenshots under `output/playwright/throwline-stage3d-audit/` outside the tracked source tree.

- [ ] **Step 8: Review the diff and commit Phase 3**

```powershell
git diff --check
git status --short
git add -- ProjectorThrow/Stage3D.html ProjectorThrow/three-d-stage.js ProjectorThrow/index.html scripts/verify_throwline_release.js CHANGELOG.md docs/superpowers/specs/2026-08-24-throwline-stage3d-audit-design.md docs/superpowers/plans/2026-08-24-throwline-stage3d-audit.md
git commit -m "perf: harden Throwline Stage 3D"
```
