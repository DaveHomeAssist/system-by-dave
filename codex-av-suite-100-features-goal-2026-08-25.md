# Goal Prompt: AV Suite Backlog — Implement & Verify End-to-End (Codex / GPT-5.6 Ultra, Agent-Orchestrated)

This file is a self-contained goal prompt. Paste it directly into Codex, or point Codex at this
file path in the repo. It assumes no prior conversation context — everything needed is below.

---

## Who you are and where you are

You are Codex (GPT-5.6 Ultra) working inside the repository at
`/Users/daverobertson/Code/system-by-dave` — **System by Dave**, a personal workflow/tooling site
(`systembydave.com`, GitHub Pages). Read `AGENTS.md` and `CLAUDE.md` in the repo root before
touching anything — they define coding conventions, the page inventory, and the shared
architecture (`css/style.css` for shared styles, `js/sbd-registry.js` as the single source of
truth for AV tool metadata, `js/av-suite-context.js` for cross-tool show context, per-page
localStorage persistence, JSON import/export + CSV export + Print as the standard per-tool kit).

Every AV Suite tool page currently follows the same pattern: editable table, add/duplicate/delete
rows, move up/down, a status enum with a filter, keyboard shortcuts, an aggregate count strip,
JSON import/export, CSV export, Print, Copy Summary, a sample-data loader, and localStorage
persistence. You are extending specific tools with real domain logic on top of that shared shape
— not rebuilding the shape itself, except where a listed feature explicitly calls for shared
infrastructure.

## Mission

Implement, wire up, and **independently verify** every feature listed in the backlog below,
end-to-end — UI, logic, persistence, and cross-tool integration where specified — using multiple
coordinated agents. "Implemented" and "verified" are two different bars; neither one alone is
done. See Definition of Done.

This backlog comes from a live-page audit (14 of 44 AV Suite tools were opened and read; the
report is dated 2026-08-25 and is treated as ground truth for scope, but re-verify current page
state yourself before implementing — pages may have changed since the audit).

## Definition of done (per feature)

A feature is not "done" until all of the following are true:

1. **Implemented** in the correct page(s) or shared module(s), following existing conventions
   (naming, table/status patterns, localStorage keys, JSON schema shape, CSS classes).
2. **Registered** — if the feature adds a page, merges pages, or changes a tool's identity,
   `js/sbd-registry.js` is updated and `python scripts/gen_sitemap.py` is re-run.
3. **Functionally verified live**, not just read back: open the page in a real browser, exercise
   the feature with realistic input data, confirm the actual output/behavior matches the feature's
   intent, and capture evidence (screenshot, console output, or exported file content).
4. **Regression-checked**: the page's pre-existing features (add/delete/move, status filter,
   JSON import/export, CSV export, Print, Copy Summary, keyboard shortcuts) still work after your
   change. Do not trust "it compiles" — actually click through them.
5. **Committed** on a dedicated branch with a message describing the feature, not "misc fixes."

A feature marked done without live verification evidence should be treated as **not done**.

## Orchestration approach

Scale this with subagents — do not attempt all 105 items serially in one context.

- **Wave 0 — Setup**: one agent reads `AGENTS.md`, `CLAUDE.md`, `js/sbd-registry.js`, and 3–4
  representative tool pages (e.g. `audio-patch.html`, `crew-time-log.html`, `show-board.html`) to
  produce a short internal style/pattern brief other agents can work from. Do this once, share it,
  don't have every agent re-derive it.
- **Wave 1 — Cross-cutting infrastructure** (the 5 items in Section A). Most per-tool features in
  Sections B–K depend on these. Implement and verify them before fanning out. Serialize edits to
  `js/sbd-registry.js` and any new shared module — do not let two agents write it concurrently.
- **Wave 2+ — Per-tool implementation**, one agent per tool (Sections B–K), run in parallel across
  tools since they mostly touch disjoint files. Each implementer's output must include: what it
  built, how it verified each feature, and evidence.
- **Verification wave**: a separate agent (or agents) re-tests each implementer's claimed-complete
  features adversarially — do not accept an implementer's self-report. Re-open the page, try to
  break it, try edge-case inputs (empty table, huge numbers, malformed import), confirm the claim.
- **Synthesis**: a final agent reconciles everything into one status matrix (see Reporting below).

## Guardrails — stop and ask the human before proceeding

- **Do not delete or silently redirect an existing page/route.** Three items below explicitly
  propose merging or deleting a tool (Projection Plan → Throwline, Input List → Audio Patch, Room
  Check → Show Board). Build the *target* tool's improved behavior first, then propose the merge
  explicitly and pause for Dave's confirmation before removing the old page, changing its URL, or
  dropping it from the registry/sitemap/nav. Never do this silently as a side effect of "cleanup."
- **No backend, no accounts, no server.** This suite is static, client-side, offline-first
  (service-worker cached). Features that sound like they need a server — "shared show state,"
  "cross-show availability," "live conflict watch" — must be designed as client-side/localStorage
  mechanisms or explicit file export/import, consistent with how every other tool persists data.
  If a feature genuinely cannot work without a backend, stop and flag it rather than inventing one.
- **All import/parsing is local and offline.** Rider PDFs, Lightwright exports, WWB scans, console
  show files, DXF/floorplan files — parse them client-side. Never send user data to an external
  service, never fetch a remote endpoint to "look up" something (e.g. TV allotment tables) unless
  Dave has explicitly approved a specific external data source and it's cached for offline use.
- **Do not touch pages outside this backlog** unless a change is a direct, necessary consequence
  of a cross-cutting item (e.g., adding a shared-state read to a tool named in Section A).
- **Branch discipline**: work on a dedicated feature branch (e.g. `av-suite-100-features`). Commit
  per feature or small feature group with clear messages. Do not push to `main` or open a PR for
  merge without Dave's review — this branch touches dozens of files and several tools.
- **No secrets, no telemetry, no analytics additions.**

## Known unknowns to resolve early, not assume

- `client-signoff.html` exists per the current page inventory in `CLAUDE.md` (the audit report
  guessed wrong slugs and got 404s). Confirm the real file before treating it as "missing."
- Section J (Projection Plan) and Section K (Input List) were **not verified live** in the source
  audit — they're inferred from the tool index. Re-read the actual current pages before assuming
  the gap described is accurate.

## Addendum (2026-08-25, post-initial-draft): corrections from follow-up source audit

The original scope-defining audit read 14 tools live. A follow-up pass read local source directly
for `av-workbook/` (+ its `apps/av-workbook` source project), `ProjectorThrow/` (Throwline), and 8
more tools (Speaker Plan, Video Patch, Signal Flow, Network Plan, Cable Plan, Site Survey, Change
Order, Client Sign Off). Two corrections and one new-scope flag came out of it — read these before
starting Section A and Section J:

- **Section A item 1 (shared show state) is corrected below.** `av-workbook/` is a real React +
  TypeScript + Vite app (not a static-HTML tool) backed by IndexedDB (Dexie) and Zod validation,
  with a genuine cross-entity data model (`apps/av-workbook/src/types.ts`: rooms, crew, gear,
  signal sources, patch records, line checks, power circuits, RF channels, video routes, tasks,
  audit events, issues) and real validators (`apps/av-workbook/src/validators.ts`: power headroom
  thresholds, RF frequency-collision/guard-band checks, audio phantom-power/split-fan checks,
  truck-zone weight caps). It already does a **one-way, manual** import from 3 tools — Input List,
  Audio Patch, Line Check — via `apps/av-workbook/src/legacyAudioImport.ts`, triggered by a button,
  reading their real localStorage keys (`input-list.v1`, `audio-patch.v1`, `line-check.v1`). No
  other tool reads or writes it. **Do not build a new shared-state layer from scratch** — extend
  this one: generalize the legacy-import mechanism to more tools, and add write-back paths where a
  tool below asks to "populate from" or "feed" shared state.
- **Section J items 87, 88, and 91 are already implemented in Throwline** (`ProjectorThrow/`), not
  missing — see the corrected item text below. Item 89 (blend geometry) is confirmed genuinely
  absent across the whole suite and still needs building.
- **New weak tools surfaced that are out of the original 105-item scope**: Signal Flow
  (`signal-flow.html`) and Network Plan (`network-plan.html`) have a larger name-to-function gap
  than several tools already in Sections B–K — both track exactly the fields (route, IP, VLAN)
  that would need real logic and validate none of it; their unusually large file sizes (1400+
  lines vs. ~350 for peers) are almost entirely un-minified formatting, not extra features.
  Speaker Plan, Video Patch, Cable Plan, and Site Survey are the same table template with relabeled
  columns and no domain math. Change Order and Client Sign Off are comparatively strong (real
  dollar aggregation in Change Order; state-conditional validation in Client Sign Off). **These are
  not yet backlog items** — this file's scope stays the original 105 items unless Dave explicitly
  asks to add a Section L for them. Do not silently expand scope to cover them.

---

## Backlog

### Section A — Cross-cutting infrastructure (implement first; everything below depends on these)

1. **Shared show state — extend `av-workbook`, do not build a new layer.** `av-workbook/` (source:
   `apps/av-workbook/`) already has a real, validated cross-entity data model (rooms, crew, gear,
   signal sources, patch records, line checks, power circuits, RF channels, video routes, tasks,
   audit events, issues — see `apps/av-workbook/src/types.ts`) in IndexedDB with Zod validation,
   plus real validators for power, RF, audio, and logistics. It currently only imports one-way,
   manually, from 3 tools (Input List, Audio Patch, Line Check) via
   `apps/av-workbook/src/legacyAudioImport.ts`. Generalize that import mechanism to the other tools
   named in Sections B–K below (Lighting Patch, Power Plan, Gear Prep, Load In Plan, Truck Pack
   Plan, Crew Call, Site Survey, etc.), and add write-back where a feature below asks a tool to
   "populate from" or "feed" shared state, so the relationship becomes genuinely bidirectional
   instead of one-way ingest. This is the prerequisite for most "populate from X" / "one shared
   case list" / "collapse into Y" items below.
2. **Real-format import.** The suite currently imports only its own JSON. Add parsers (client-side,
   offline) for at least: a rider/input-list PDF or text export, a Lightwright CSV export, a
   console show-file/scene export (pick one desk format, e.g. X32/Wing), and a generic CSV mapping
   importer other tools can reuse. Build this as a shared, reusable import module, not one-off code
   per tool.
3. **Validation as a first-class pattern.** Power Plan's 80%-capacity rule is currently the only
   documented validation rule in the suite. Add a small shared validation utility (range checks,
   duplicate/collision checks, capacity checks) and apply it everywhere a tool holds an address, a
   channel, a frequency, or a load (see Sections B, C, D, H).
4. **Document generation as output.** Show Handoff is the only tool that generates a narrative
   document instead of a table. Extract its document-generation approach into a reusable pattern
   and apply it to Show Report (Section F) and Client Sign Off.
5. **Derived time / scheduling utilities.** Show Board derives stack positions, tight-turn flags,
   and pinch bands from a threshold. Extract this into a reusable time/threshold utility other
   tools with a Due/time field can use (Load In Plan, Room Check, Gear Prep).

### Section B — RF Coordination (`rf-coordination.html`)

6. Intermodulation calculation: compute 2-Tx 3rd/5th order and 3-Tx 3rd order products across the
   active frequency set; flag any product landing inside a guard band of an in-use frequency,
   naming the transmitters responsible.
7. Scan import: read a Wireless Workbench / IAS / Shure scan export and render the venue's
   measured RF floor behind the frequency list.
8. TV allotment overlay: local/cached DTV channel table by postal code, rendered as exclusion
   bands.
9. Solver mode: given a channel count + band + scan, return a compatible frequency set (not just
   collision counting after the fact).
10. Per-model guard-band device library (QLX-D, Axient, Sennheiser EW, etc.) driving the solver.
11. Deployment geometry: tie packs/receivers to Stage Plot positions; flag long body-pack runs.
12. Battery runtime projection: device model + start time + call length → swap countdown per pack.
13. Walk-test log: record dropout timestamp + location against a channel.
14. Receiver-format export (WWB/WSM), not just CSV.
15. Live conflict watch: show-day view flagging any frequency added mid-show against the solved
    set (client-side, current-session only — no server push required).

### Section C — Lighting Patch (`lighting-patch.html`)

16. Fixture library with real per-mode DMX footprints.
17. Auto-patch: sequential address assignment across universes, skipping occupied ranges.
18. Next-free-address indicator per universe with an occupancy bar.
19. True footprint-overlap detection (range overlap, not just equal-address matching), naming the
    colliding channels.
20. Lightwright / Eos patch import with reconciliation diff (adds/drops/moves) — uses the Section
    A.2 import module.
21. Universe capacity meter (512 channels, used vs. free, fit-check for a pending add).
22. Node/output mapping (sACN/ArtNet universe → node port).
23. Load rollup feeding Power Plan directly (Section A.1 shared state) instead of retyped there.
24. Position tie to Stage Plot (shared coordinate, not a text note).
25. Patch-change diff / addendum sheet generator for mid-show rig changes.

### Section D — Audio Patch (`audio-patch.html`)

26. Collision detection at entry: duplicate console input or stagebox input, flagged live.
27. Stagebox capacity model (e.g. SB16 = 16 inputs; block the 17th).
28. Console file import (X32/Wing scene, DiGiCo session, or Yamaha channel CSV) with diff against
    the plan — uses Section A.2.
29. Phantom-safety check: flag phantom-on rows with ribbon mics or line-level sources, driven by a
    source-type device library.
30. Gain sanity range per source type, flagging out-of-range gain.
31. Populate from Input List (shared channel data via Section A.1, once Section K resolves the
    Input List relationship).
32. Split tracking: broadcast/record/monitor split routing per channel with transformer-vs-active.
33. Cable-run length derived from Stage Plot stagebox position, feeding Cable Plan.
34. Console-ready export in the desk's native import format, plus a proper printed patch sheet.
35. One-button handoff generating Line Check rows (channel/source/location prefilled).

### Section E — Stage Plot (`stage-plot.html`)

36. Real-world scale: room dimensions sourced from Site Survey; positions in feet/metres.
37. Cable path routing: drawn run → length + slack allowance → pushed into Cable Plan as a row.
38. Speaker coverage overlay: dispersion cones per loudspeaker model with overlap/gap rendering.
39. Delay-ring calculation: milliseconds from mains based on real distance + temperature (reuse the
    AV Calculator formula).
40. Camera sightline cones from lens field-of-view at each camera position.
41. Screen sightline check: first-row viewing angle, last-row image-height ratio, pass/fail.
42. Rigging layer: load-bearing points with weight per point, rolled up against Site Survey rigging
    capacity.
43. Real AV/lighting symbol library replacing labeled rectangles.
44. Print to scale with title block, scale bar, legend.
45. Floorplan underlay: import a venue DXF or floorplan image to trace over.

### Section F — Room Check (`room-check.html`)

46. Merge proposal into Show Board as its checklist layer — **build first, get explicit approval
    before removing/redirecting `room-check.html`** (see Guardrails).
47. Per-room-type templates (breakout, general session, registration desk).
48. Photo evidence attached per check (local storage, not uploaded anywhere).
49. Timestamp + initials on every state change (audit trail).
50. Auto-generated checks derived from Audio/Video/Lighting Patch and Network Plan (Section A.1).
51. Blocker escalation: flagging a blocker creates a Show Task Board row with owner/due carried
    over.
52. Turn timer tied to Show Board's schedule (Section A.5 time utility).
53. Dark-room "punch" mode: large touch targets, one-thumb operation, legible at low brightness,
    fully offline.
54. QR-per-room deep link landing directly on that room's checks.
55. Per-room sign-off capture feeding Client Sign Off.

### Section G — Show Report (`show-report.html`)

56. Generate from existing data (Show Task Board, Change Order, Record Log, Crew Time Log, Room
    Check) instead of manual retyping — uses Section A.1 + A.4.
57. Live timeline built from timestamps as the show runs, viewable before end-of-show.
58. Written severity-level definitions applied consistently.
59. Two report cuts (client-facing, internal) generated from one dataset.
60. Branded PDF export with a real title block and identity, not a browser print stylesheet.
61. Photo/screenshot attachment per incident.
62. Cross-show recurrence detection (same venue, repeated issue type) — requires a persisted
    history across shows, not just the current session.
63. Change-order value rollup pulled from Change Order.
64. Follow-ups exported as tasks with owner/date into Show Task Board.
65. Post-show email body generator (draft only — do not send; see global send-message guardrails).

### Section H — Load In Plan (`load-in-plan.html`)

66. Shared case list with Gear Prep, Truck Pack Plan, and Strike Plan (Section A.1) — a case exists
    once and moves through states.
67. Real state machine: pulled → tested → packed → loaded → arrived → delivered → built → struck →
    returned, replacing the independent per-tool status enums.
68. Dock/elevator scheduling from Site Survey constraints (dock count, elevator size, freight
    window).
69. Backward sequencing: derive unload order from build order, load order from unload order,
    detecting contradictions between independently-typed orders.
70. Weight/cube rollup per truck zone against real truck capacity.
71. Real clock tracking: ETA/door time against the venue's loading window with time-remaining
    (Section A.5).
72. Barcode/QR-per-case scan to advance state.
73. Crew tie to Crew Call (shared labor number, not two independent lists).
74. Missing-case detection at every state-machine boundary.
75. Truck-pack photo captured at load-in, referenced at strike for reverse-loading.

### Section I — Gear Prep (`gear-prep.html`)

76. Persistent inventory/asset list surviving across shows (not a fresh pull sheet each time).
77. Generated pull sheet derived from Audio/Lighting/Video Patch and Cable Plan (Section A.1).
78. Cross-show availability flagging (asset already committed to another job this week) — requires
    the persisted asset history from #76.
79. Test history per asset (date + result), surfacing repeat failures before they ship.
80. Spares/consumables rules per department (e.g. 10% spare cable, 2 spare lamps).
81. Case contents as a packing list with rolled-up weight, feeding Truck Pack Plan.
82. Serial/asset-tag capture feeding a maintenance/warranty record.
83. Sub-rental flagging: vendor, cost, return date.
84. Packed-case photos becoming the strike return checklist.
85. Prep progress against the load-in clock (time remaining, not just a row count).

### Section J — Projection Plan (`projection-plan.html`) — unverified live, re-check before building

86. Evaluate merge into Throwline (shared tag, overlapping throw-distance math). **Do not delete
    or redirect `projection-plan.html` without explicit approval** — propose after building. This
    guardrail is confirmed correct: Throwline and Projection Plan currently share zero code and
    have no cross-reference despite the domain overlap.
87. **Already built in Throwline, currently inert — do not rebuild.** `ProjectorThrow/`'s
    `solveGear()` is a real lens-recommendation solver with throw-zone/safe-zone/zoom-edge
    scoring, and its catalog (`ProjectorThrow/data/throwline-pilot-catalog.v1.json`) has real
    manufacturer-sourced entries — but every optical profile currently has
    `automaticCalculationAllowed: false` (0 of 8 pass the `calculationState ===
    "verified_image_width"` gate), so it returns "CALCULATION BLOCKED" instead of a number. The
    gate is a deliberate, CI-enforced data-quality mechanism (SHA-256-pinned catalog, a dedicated
    `scripts/verify_throwline_release.js`) — do not weaken or bypass it. If this item still needs
    work, it's sourcing/verifying more manufacturer specs to the required standard, not writing
    solver code.
88. **Already built and working in Throwline** — `brightnessFor()` computes effective lumens,
    foot-lamberts vs. a target, and solves minimum redundant-unit count on failure. No code work
    needed here; only relevant if the merge in #86 is approved and this logic needs to move.
89. **Confirmed genuinely missing everywhere in the suite, including Throwline.** Blend geometry:
    overlap pixel count + total canvas resolution for edge-blended multi-projector setups. Still
    needs building.
90. Stack/convergence plan: offset and alignment order for doubled projectors. Not found in
    Throwline — verify it's still missing before building.
91. **Already built in Throwline** — `readState()` computes vertical lens-shift percentage and
    checks it against a shift envelope (`shiftGuard`), flagging an unreachable position. No code
    work needed here; only relevant if the merge in #86 is approved.
92. Rigging weight rolled into the Stage Plot rigging layer (Section E.42).
93. Alignment checklist with referenced test patterns and per-screen sign-off.
94. Sightline check: first-row image height vs. last-row legibility for actual deck text size.
95. Backup-path failover procedure handed to Cue Sheet as a cue.

### Section K — Input List (`input-list.html`) — unverified live, re-check before building

96. Evaluate collapsing into Audio Patch as the single source of channel truth. **Do not delete or
    redirect `input-list.html` without explicit approval** — propose after building.
97. If it stays: becomes the upstream source of channel truth feeding Audio Patch/Line Check
    (Section A.1), eliminating retyping.
98. Rider ingest: parse a band/vendor input-list PDF into rows (uses Section A.2 import module) —
    treat as the highest-value import in the whole suite.
99. Mic/DI library: model, polar pattern, phantom requirement, stand type per source.
100. Stand/accessory rollup (booms, shorts, DIs, clips) computed from the source list.
101. Source templates (five-piece band, six-person panel, keynote lectern) inserting a block of
    rows at once.
102. Capacity validation against console/stagebox fill at planning time (Section A.3).
103. Monitor-send requirements per input feeding a monitor mix plan.
104. Multitrack record assignment feeding Record Log (no duplicate ISO list).
105. Print output formatted as a real input list a visiting engineer would expect.

---

## Reporting requirement

Produce a status matrix covering all 105 items above with, per item: **Done / Partial / Blocked /
Deferred**, a one-line description of what was verified and how (link to screenshot/log/exported
file), and for anything not Done, why. Call out explicitly:

- Every guardrail decision point that needs Dave's sign-off (the three merge proposals).
- Any feature you judged infeasible as a pure static/client-side implementation, and why.
- The final branch name and a diff-stat summary, ready for human review before any PR/merge.
