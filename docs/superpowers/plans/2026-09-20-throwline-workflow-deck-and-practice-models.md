# Throwline workflow deck and practice-model plan

## Outcome

Make Stage 3D faster to operate without changing its optical math, scene schema,
offline behavior, routes, or renderer. Replace the long control rail with four
short operator stages while the scene and its evidence state stay visible.

## Release scope

1. Add a persistent scene flight strip with the active unit, screen, set mark,
   and calculation provenance.
2. Replace the four always-open disclosures with keyboard-operable workflow
   tabs: **Setup**, **Place**, **Room**, and **Deliver**.
3. Keep only the active stage scrollable. Keep the tab rail, scene summary, and
   Back/Next controls fixed inside the sidebar.
4. Route Quick Start and Field Verify to the correct stage and live control.
5. Preserve every control ID, event path, value, URL parameter, saved-scene
   shape, import/export route, mobile sheet, and calculation gate.
6. Verify the full responsive width matrix, keyboard tab behavior, mobile Field
   Verify, reduced motion, offline reload, WebGL recovery, and no-WebGL fallback.

## Design direction

Keep Throwline's industrial optical-console language. The single new visual
move is a **flight strip**: a compact status board above the workflow tabs that
keeps the active unit and evidence state in view while controls change below.
Motion is restrained to the existing onboarding and sheet transitions.

## Acceptance

- The document remains locked to one viewport on desktop and phone.
- At 900 px, the rail is no wider than 304 px and the stage remains the dominant
  surface.
- Setup, Place, Room, and Deliver are reachable by pointer, Tab, arrow keys,
  Home, End, Back, and Next.
- Exactly one workflow panel is exposed at a time; hidden panels are removed
  from keyboard and accessibility traversal.
- Field Verify opens Deliver, reveals the measurement fields, and focuses the
  first measurement on phone widths.
- Quick Start opens Setup, Place, or Deliver and focuses the promised control.
- The browser release probe passes with and without WebGL.
- An independent post-implementation audit reports findings before merge; any
  actionable findings are patched and the full affected suite runs again.

## Multi-model demonstration direction

Build future demonstrations around a shared, synthetic signal state instead of
making each 3D model an isolated object. Models subscribe to the same practice
scene but never send commands to real equipment.

### Camera shading scope practice

Connect a virtual camera, the ATEM Camera Control Panel model, and a simulated
waveform/vectorscope surface. The learner adjusts iris, pedestal, gain, gamma,
white balance, saturation, and color phase. A generated test image and both
scopes update from the same deterministic state. Practice cards can ask the
learner to match two cameras, recover clipped highlights, set black level, or
neutralize a color cast. Results are labelled **simulation for practice**, not
measurement or calibration.

### Demonstration chains

- **Shade and match:** two virtual cameras → two control-panel strips → split
  image, waveform, parade, and vectorscope.
- **Frame and switch:** PTZ controller → camera model → switcher preview/program
  with safe, reversible practice cues.
- **Projection handoff:** Throwline scene → projector model → screen and room,
  showing how the same planned placement appears in the equipment explorer.

### Architecture guardrails

- Use one versioned, pure demo-state module with deterministic fixtures.
- Lazy-load models and scope rendering so the reference pages remain quick.
- Keep device catalogs and venue records as reference data; do not infer an
  installed signal path or hardware assignment.
- Keep network control out of the browser demonstration. A later real-device
  bridge would require its own authenticated service, explicit arming, and a
  separate commissioning gate.
- Add a replayable scenario schema so demonstrations can be tested without a
  graphics renderer and shared across equipment pages.

## Execution order

1. Implement the Stage 3D workflow deck and durable verifier assertions.
2. Run focused source and scene-state checks.
3. Run full browser acceptance with WebGL and with the 2D fallback.
4. Conduct a new independent UX, accessibility, and regression audit.
5. Patch audit findings and repeat affected checks.
6. Merge, wait for Pages deployment, and verify the live avbydave.com surface.

## Independent audit result

The post-implementation audit found one high-severity responsive defect: native
`details` sizing could place the Back/Next footer outside the clipped sidebar
at intermediate desktop heights. The repair gives the workflow content an
explicit inset inside the rail and gives the phone sheet its own zero-inset
variant. The browser matrix now asserts footer containment at every supported
desktop and phone width.

Fresh re-audit passed at 900 × 768, 1440 × 900, and 390 × 844. It confirmed one
exposed panel, complete tab keyboard behavior, Field Verify routing and focus,
internal panel scrolling, viewport containment, and an empty browser error log.
