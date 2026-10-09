# AV Suite console expansion

## Accepted product target

On October 9 Dave clarified that AV Video is the interaction model to expand
across the toolset: functional, touch friendly panels in a configurable workspace.
The subsequent direct instruction to resume lifts the reassessment pause.
Tools must be usable inside their console, with arrangements, maximize, layout
lock and saved views. A link to a standalone page does not establish this parity.

Source baseline: `57aa5d281e4f086417a3cfec305bb59df14dd371`.
The [console contract](av-console.md) and [registry inventory](av-suite-consolidation-inventory.md)
remain authoritative. The original v3 archive is unavailable for fresh visual
comparison; [the recorded source analysis](2026-10-05_Rail-Implementation-Spec-v2.2-v3-Source-Alignment.md)
is historical evidence, not a new prototype render.

## Reuse and coverage assessment

This maps all 52 registry entries, including the eight family application entries.
The destination column describes implementation sequencing, not verified legacy
feature parity or authorization to remove any route.

| Destination | Existing tools and specialist boundaries | Current source and missing work |
| --- | --- | --- |
| AV Video | AV Video, Signal Flow, Video Patch, Display Plan, Projection Plan, Camera Shot List, Playback Check, Record Log, Stream Plan; Throwline and LED Wall Calculator retain specialist controls | Ten real panel types use the shared engine. Preserve route/selection model, graph and sequence renderers. Stream/Record remain absent; streaming credential policy is unresolved. Specialist capabilities are not absorbed merely by linking them. |
| Audio | Audio, Input List, Audio Patch, Line Check, Speaker Plan, RF Coordination, Comms Check | Already uses the same shared engine with five panels and one channel model. Earlier claims that it was only a standalone fixed page were incorrect. Needs full legacy field/action parity, RF/Comms panel semantics, Rail/recovery integration and operator proof. |
| Show Control | Show Control, Cue Sheet, Show Timer, Teleprompter | Fixed Run/Log/Import views. Reuse call log and safe CueForge snapshot model. Real cue/media playback, timer outputs and teleprompter controls need their own panel integrations; a call log does not replace CueForge execution. |
| Show Ops | Show Ops, Room Check, Crew Call, Crew Time Log, Breakout Room Matrix, Show Board, Show Task Board, Show Handoff, Show Report | Fixed sections already edit rooms, crew and tasks and retain reviewed source copies. Convert those actual functions first. Timekeeping, breakout/timeline behavior and report workflows remain additional capabilities, not covered by a source snapshot. |
| Front Office | Front Office, Show Advance, Site Survey, Change Order, Client Sign Off | Reuse client/venue/job model and reviewed advance import. Convert current editor into panels, then implement missing survey, approval, scope and signoff behavior. |
| The Shop | The Shop, Gear Prep, Gear Reference, Truck Pack Plan, Load In Plan, Strike Plan | Reuse phase worklist and quantity guards. Panelize worklist and details, then establish complete truck/order/reference and phase parity. |
| Infrastructure | Infrastructure, Power Plan, Network Plan, Cable Plan | Reuse independent records and issue model; replace fixed navigation with discipline panels and issue context. Preserve advisory versus safety boundaries. |
| Lighting | Lighting, Lighting Patch | Reuse fixture model, patch/focus controls and safe PlotForge manifest intake. Convert editor to functional panels; PlotForge remains the separate full plot product. |
| AV Calculator | AV Calculator | Six calculations and field sets exist in the standalone calculator; shared console panel adoption remains unimplemented. |
| Specialists outside the nine families | StagePlotter, PixelForge, OnTrack | Preserve their distinct graphics/layout/music workflows. Panel adoption needs its own capability assessment; do not force these into generic records. |

The shared engine already provides a 12 by 8 nonoverlapping grid, add/change/close,
move/size/split, maximize, named views, layout lock, keyboard paths and responsive
presentation. Its draft module already provides conflict-aware recovery and
device-local layouts. Reuse these mechanisms; do not create a second panel engine.
Each application still owns its records, selection, validation and explicit Save.

### Corrections and limits

- Main now contains the separately delivered [nine-link Rail launcher](av-rail-application-launcher.md).
  Its `available` state means launchable, not complete console adoption. Preserve
  that newer release rather than reverting to the earlier eight Planned labels.
- At the source baseline only AV Video and Audio imported the shared workspace.
  This candidate adds Show Ops; the other five family applications still use
  fixed views and the calculator is a specialist layout.
- Exact raw import retention protects source evidence but does not prove that all
  original fields and operator actions are usable in the receiving console.
- Source, automated browser, CI, deployment and physical touch acceptance are
  separate gates. No whole-suite completion date follows from the page count.

## First implementation: Show Ops functional panels

**Problem:** Operators cannot keep room readiness, crew and tasks visible together
or save arrangements using the interaction model already established by AV Video.

**Flow:** Open Show Ops from the Rail, work in Rooms/Crew/Tasks panels, bring up
Setup/Handoff/Backup as needed, resize or maximize a panel, store a named view,
explicitly Save, and reopen the same show without losing records or provenance.

**Owned scope:** New React source in `apps/show-ops/`, existing pure
`show-ops/model.mjs` reused through a typed adapter, generated `show-ops/` entry
and assets, focused tests/probes, affected registry/offline/build integration,
this brief and the existing next-steps projection. No dependency addition.

**Persistence:** Keep `sbd.showOps.document.v1` and
`system-by-dave.show-ops.v1`. Optional `workspace` contains shared version-1 view
data. Old backups remain valid; unknown workspace versions fail closed. Preserve
exact Room Check/Task Board/Crew Call sources, preview/stale-source guards and
their deliberately distinct statuses. New draft/layout keys are console-local;
closing panels never deletes records. Save remains explicit and checks its
original saved-byte baseline; Export stays available on storage failure.

**Exclusions:** No Crew Time Log import, new domain workflow, global show database,
cross-console synchronization, Stream/Record credential decision, old Show Console
retirement, legacy tool deletion, or assertion of whole-toolset parity.

**Acceptance:**

1. Rooms, Crew and Tasks operate side by side against the same document; Handoff
   updates from those records. Setup and the three reviewed import workflows work.
2. Add/close/change, move/size, maximize, layout lock and named views use the
   unchanged shared runtime. Save/export/reload preserve records and stored views.
3. Old backups, exact source bytes, malformed/unknown versions, stale previews,
   another-tab edits and injected storage errors retain their safe boundaries.
4. Draft recovery is offered, not silently applied; layout-only changes never
   save the show. Rail navigation and context do not overwrite document identity.
5. Keyboard and touch-sized controls remain reachable in both palettes at phone,
   tablet, desktop, short-height and ultrawide sizes, without root scrolling.
6. Run model and adapter tests, typecheck/build, focused browser and recovery
   checks, AV inventory/offline/public/domain gates, then exact-head CI/review,
   source and destination publication and isolated live checks. Physical touch
   and operator acceptance remain explicitly open.

**Order after this slice:** Finish Audio console continuity, convert the remaining
fixed family workspaces using their existing models, then close missing legacy
capabilities and specialist integrations. Do not spend subsequent slices only on
imports while leaving the shared workspace absent.

**Estimate boundary:** This is a bounded first console migration, not a whole-suite
rewrite in one release. Remaining effort is driven by distinct operator workflows
and save compatibility across the inventory; estimate those after this migration
provides measured integration and verification effort. No unresolved product
choice blocks this first slice. Legacy retirement and streaming secrets affect
only their later dependent work.
