# AV Suite Theme Audit

Date: 2026-08-12
Baseline: `df5d6d6` (`main`, before the adaptive-theme migration)
Scope: the AV Suite hub plus all 44 canonical tool routes in `js/sbd-registry.js`

## Findings

1. The suite had no real color authority. Thirty-four pages repeated a near-identical dark ops palette inside page-local `<style>` blocks, four workflow pages carried a second dark palette, and six specialist products maintained independent schemes or toggles.
2. Dark was the only presentation on most tools. The hub was light-only; Gear Reference was the only canonical tool that followed `prefers-color-scheme`; Show Board, Throwline, and PixelForge had unrelated page-level preferences.
3. The layouts are more coherent than the palettes. The repeated operator shell, status cards, domain views, responsive table cards, focused inspectors, and specialist work surfaces are all worth keeping.
4. Color names mixed product meaning with paint values. `green`, `cyan`, `rust`, `sand`, `acc`, `hazard`, and `ready` often meant different things on different pages, which made global maintenance unsafe.

## Page-by-page record

“Ops dark” means the original charcoal/navy palette around `#0b0d10`, rust `#c0623a`, blue `#72b8ff`, green `#6be092`, amber `#ffd166`, and red `#ff6b6b`.

| Surface | Canonical route | Baseline color scheme | Design element worth isolating | Unified treatment |
|---|---|---|---|---|
| AV Suite hub | `/av-suite.html` | Warm paper light-only; rust actions; blue Ready | Sticky command bar, phase strip, recommended-next cards, department chips, readiness rail | Operator Core |
| AV Workbook | `/av-workbook/` | Navy/green dark-only | Workbook grid, validation engine, metric cards, tool-group launch panels | Operator Core |
| Teleprompter | `/teleprompter.html` | Charcoal/rust dark-only; separate user-controlled reader colors | Full-viewport reader, wake control, progress rail, marker rundown | Specialist Translation |
| Show Timer | `/show-timer.html` | Ops dark | Oversized timer readout, stage grid, preset and transport controls | Operator Core |
| CueForge | `/cue-sheet.html` | Ops dark | Caller deck, on-deck state, next-cue card, cue status rows | Operator Core |
| Playback Check | `/playback-check.html` | Ops dark | Selected-cue inspector, readiness progression, next-cue card | Operator Core |
| PixelForge | `/pixelforge/` | Amber/teal dark launch pages; light blue editor default with optional dark editor | Pixel mark, canvas-first editor shell, tool docks, layer stack, creative preview cards | Specialist Translation |
| Record Log | `/record-log.html` | Ops dark | Recording status cards, selected-record inspector, fast actions | Operator Core |
| Stream Plan | `/stream-plan.html` | Ops dark | Stream-path table, health/status summary, selected-output inspector | Operator Core |
| Show Advance | `/show-advance.html` | Ops dark | Advance checklist, ownership/status rows, fast-action rail | Operator Core |
| Site Survey | `/site-survey.html` | Ops dark | Survey checklist, location/detail rows, readiness summary | Operator Core |
| Crew Call | `/crew-call.html` | Ops dark | Role/person grid, call-state markers, fast-action rail | Operator Core |
| Crew Time Log | `/crew-time-log.html` | Ops dark | Time-entry grid, totals, handoff-ready summaries | Operator Core |
| Room Check | `/room-check.html` | Ops dark | Operator-first domain cards, room readiness, selected-room detail | Operator Core |
| Breakout Room Matrix | `/breakout-room-matrix.html` | Midnight dark with rust/cyan | Room matrix, blocker/readiness summary, ownership cards | Operator Core |
| Show Board | `/show-board.html` | Parchment light default plus show-level manual dark | Timeline zone blocks, live-now strip, attention board, confidence monitor | Specialist Translation |
| Show Task Board | `/show-task-board.html` | Midnight dark with rust/cyan | Priority task board, blocker states, responsibility/status matrix | Operator Core |
| Show Handoff | `/show-handoff.html` | Ops dark | Prioritized actions, decision calls, generated handoff preview | Operator Core |
| Show Report | `/show-report.html` | Ops dark | Structured closeout rows, status summary, fast actions | Operator Core |
| Change Order | `/change-order.html` | Midnight dark with rust/cyan | Cost/approval status matrix and change accountability | Operator Core |
| Client Sign Off | `/client-signoff.html` | Midnight dark with rust/cyan | Approval states, sign-off record, client-facing completion summary | Operator Core |
| Input List | `/input-list.html` | Ops dark | Selected-channel inspector and operator summary | Operator Core |
| Audio Patch | `/audio-patch.html` | Ops dark | Patch-gap states, signal-status stripes, domain cards, selected path | Operator Core |
| Line Check | `/line-check.html` | Ops dark | Check progression, selected input, status-oriented domain cards | Operator Core |
| Speaker Plan | `/speaker-plan.html` | Ops dark | Deployment rows, coverage/destination fields, selected-speaker detail | Operator Core |
| Power Plan | `/power-plan.html` | Ops dark | Load-by-source cards, circuit status, selected-circuit detail | Operator Core |
| Network Plan | `/network-plan.html` | Ops dark | Device cards, IP/VLAN detail, selected-device inspector | Operator Core |
| Signal Flow | `/signal-flow.html` | Ops dark | Node-chain visualization, joins, path status, selected-flow detail | Operator Core |
| Video Patch | `/video-patch.html` | Ops dark | Source-to-destination patch rows and selected-route inspector | Operator Core |
| Display Plan | `/display-plan.html` | Ops dark | Display assignment rows and selected-display detail | Operator Core |
| Projection Plan | `/projection-plan.html` | Ops dark | Projector/screen planning rows and selected-output detail | Operator Core |
| Throwline | `/ProjectorThrow/` | Instrument-ivory light default plus persisted charcoal/yellow dark | Constraint rail, readout cards, plan/3D drawings, gear solver, field verification | Specialist Translation |
| Lighting Patch | `/lighting-patch.html` | Ops dark | Fixture/address patch grid and selected-fixture detail | Operator Core |
| Cable Plan | `/cable-plan.html` | Ops dark | Cable logistics rows, route/status detail, fast actions | Operator Core |
| RF Coordination | `/rf-coordination.html` | Ops dark | Frequency/unit cards, coordination status, selected-unit inspector | Operator Core |
| Comms Check | `/comms-check.html` | Ops dark | Selected-assignment card, output summary, check progression | Operator Core |
| Camera Shot List | `/camera-shot-list.html` | Ops dark | Selected-shot card, output summary, shot progression | Operator Core |
| Stage Plot | `/stage-plot.html` | Ops dark | Stage canvas, tool palette, inspector, nudge grid, operator summary | Specialist Translation |
| Gear Prep | `/gear-prep.html` | Ops dark | Prep readiness cards, exceptions, selected-item inspector | Operator Core |
| Gear Reference | `/gear-reference.html` | OS-adaptive green/navy dark and monochrome light | Fixed rail, full-viewport reference stage, confidence state, technical figures | Specialist Translation |
| Truck Pack Plan | `/truck-pack.html` | Ops dark | Pack/load states, logistics rows, selected-item detail | Operator Core |
| Load In Plan | `/load-in-plan.html` | Ops dark | Sequence/ownership rows, arrival states, fast actions | Operator Core |
| Strike Plan | `/strike-plan.html` | Ops dark | Strike sequence, return states, accountability detail | Operator Core |
| AV Calculator | `/av-calculator.html` | Ops dark | Modular calculation cards, compact results, operator summary | Operator Core |
| OnTrack | `/ontrack.html` | Near-black CDJ orange/green/cyan dark-only | Hardware plate, navigation rail, inset screen, set/debrief workflow | Specialist Translation |

## Unified contract

The suite now has two palettes, both owned by `css/av-theme.css`:

- **Warm Paper** for light systems: ivory surfaces, charcoal text, rust actions, blue focus/Ready, green success, amber warning, red issue.
- **Stage Slate** for dark systems: charcoal/navy surfaces, warm white text, brighter rust actions, blue focus/Ready, and the same semantic status ordering.

Rules:

1. Initial appearance follows `prefers-color-scheme`; no tool may ship a different persistent startup theme.
2. Layout, density, typography, and product-specific work surfaces remain local.
3. Functional colors remain local only when their meaning is intrinsic: teleprompter reader colors, stage zones, cable/status legends, PixelForge canvas colors, and Throwline measurement bands.
4. Shared controls, surfaces, focus rings, status roles, tables, responsive cards, and System by Dave navigation consume the common tokens.
5. A tool may offer a session-only view override, but the next load returns to the operating-system preference.

## Isolated primitives

- `css/av-theme.css`: palette authority, legacy token bridge, shared control/surface states, responsive touch targets, and shared navigation treatment.
- `css/responsive-tables.css`: mobile row-to-card transformation.
- `css/av-domain-views.css`: operator-first cards above dense tables.
- `js/av-theme.js`: system-preference bridge for compiled specialist applications that store their own view preference.
- Page-local CSS: layout and genuinely product-specific visuals only.

## Verification contract

`scripts/verify_av_themes.js` treats the registry as the route source of truth and fails when a canonical tool omits theme metadata, the shared opt-in, or the shared stylesheet/import. `scripts/probe_av_themes.js` exercises both emulated `light` and `dark` preferences on every route, checks the shared tokens and specialist adapters, scans visible rendered text against WCAG contrast thresholds, and rejects horizontal overflow at phone and desktop widths.
