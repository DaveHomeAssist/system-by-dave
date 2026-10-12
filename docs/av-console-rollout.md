# AV Suite console expansion

## Accepted product target

On October 9 Dave clarified that AV Video is the interaction model to expand
across the toolset: functional, touch friendly panels in a configurable workspace.
The subsequent direct instruction to resume lifts the reassessment pause.
Tools must be usable inside their console, with arrangements, maximize, layout
lock and saved views. A link to a standalone page does not establish this parity.

Source baseline: `57aa5d281e4f086417a3cfec305bb59df14dd371`.
Integration baseline: `9c992ff2ab393efb3918d6878b4813452a07d916` (PR #314),
which adds full application snapshots inside AV Video. Preserve that host;
Show Ops now exposes its six functional panels inside its application snapshot
as well as at its standalone route. Embedded mode omits duplicate navigation,
while Show Ops Save continues to affect only its own document.
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
| Show Control | Show Control, Cue Sheet, Show Timer, Teleprompter | Native On Deck, Cues, Notes, Call Log, Setup/Import and Backup published through PR #323 at `7ca404b`; standalone and embedded live browser checks passed. Real cue/media playback, timer outputs and teleprompter controls need their own panel integrations; a call log does not replace CueForge execution. |
| Show Ops | Show Ops, Room Check, Crew Call, Crew Time Log, Breakout Room Matrix, Show Board, Show Task Board, Show Handoff, Show Report | Six native panels delivered in PR #315: Rooms, Crew, Tasks, Setup, Handoff and Backup retain reviewed source copies. Timekeeping, breakout/timeline behavior and report workflows remain additional capabilities, not covered by a source snapshot. |
| Front Office | Front Office, Show Advance, Site Survey, Change Order, Client Sign Off | Jobs, Clients, Venues, Job updates, Advance import and Backup merged through PR #328 at `c6ed44c`, using the existing engine/model and [brief](front-office-brief.md). Seventeen model tests, nine Duncan browser groups and all seven follow-up exact-head checks pass. Read-denial export and publication-gate corrections are merged; final publication/live proof remains in progress. Survey, approval, scope and signoff behavior remain additional work. |
| The Shop | The Shop, Gear Prep, Gear Reference, Truck Pack Plan, Load In Plan, Strike Plan | Four native working panels delivered through PR #324: Worklist, Item inspector, Plan/Import and Backup. Preserve phase worklist, quantity guards and reviewed source copies. Complete truck/order/reference and phase parity remains additional work. |
| Infrastructure | Infrastructure, Power Plan, Network Plan, Cable Plan | Six native panels published through PR #325 at `0d08fc5`: Power, Network, Cable, Issues, Plan/Import and Backup. Nine exact-head checks, both publications, eight isolated live browser groups and eight-asset parity pass, including both themes/nine sizes, saved views, recovery, offline and actual AV Video embedding. Physical/operator and safety approval are not claimed. |
| Lighting | Lighting, Lighting Patch | Five native-panel candidate: Fixtures, Fixture details, Focus, Plan/Import and Backup. Original normalization/PlotForge mapping retained, independent explicit Save, draft/layout recovery and stored views. Twelve model tests, typecheck, build, 23 Rail/worker checks and nine Duncan browser groups pass, including nine sizes/two themes, offline and actual embedding. Exact-head CI/publication/live proof remain separate. PlotForge remains the separate full plot product. |
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
- At the original source baseline only AV Video and Audio imported the shared
  workspace. Show Ops followed in PR #315; the October 11 Show Control candidate
  adds six native calling panels, published in PR #323. Shop adds four native
  panels through PR #324. Infrastructure has six panels published and verified
  live through PR #325. Front Office has native panels merged, with release closure in progress;
  Lighting's native candidate is under verification; the calculator remains a specialist layout.
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

### Next bounded conversion: Show Control

The [Show Control brief](show-control.md) owns its six native working panels,
existing v1 save compatibility, exact safe imports, recovery and independent
standalone/AV Video embedded acceptance. This is a calling desk, not a CueForge
engine, timer or teleprompter replacement. No shared-engine change or Rail status
promotion is part of this conversion. Source/test/publication/live evidence and
physical/operator gaps remain independently recorded in the existing projection.

**Estimate boundary:** This is a bounded first console migration, not a whole-suite
rewrite in one release. Remaining effort is driven by distinct operator workflows
and save compatibility across the inventory; estimate those after this migration
provides measured integration and verification effort. No unresolved product
choice blocks this first slice. Legacy retirement and streaming secrets affect
only their later dependent work.
