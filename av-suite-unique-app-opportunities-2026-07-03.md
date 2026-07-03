# AV Suite Unique App Opportunities — 2026-07-03

## Purpose

This pass responds to the concern that too many AV Suite tools feel like
spreadsheets. The current suite is useful, but the dominant pattern is a
table-first workbench with filters, export buttons, and a side inspector. The
next upgrade pass should keep the reliable data layer while giving each tool a
domain-shaped primary surface.

## Current Evidence

- 34 of 37 non-PlotForge AV tool surfaces currently contain an HTML table.
- Most table tools share the same interaction shape: show metadata, stats,
  search/filter controls, editable rows, selected item preview, print, JSON,
  and CSV.
- The strongest outliers are already more memorable: Teleprompter is a reader,
  Show Timer is a clock, and AV Calculator is a set of calculator cards.
- CueForge is a good first target because the table is still valuable for
  editing, but the live use case is actually cue calling and sequence control.

## Design Direction

The goal is not to remove tables. The goal is to stop making the table the only
mental model.

Each AV tool should have:

1. **A domain-shaped primary view** for the job being done in the room.
2. **A table/editor fallback** for batch edits, import/export, and print.
3. **A status surface** that reflects the real operator question:
   - What is next?
   - What is blocked?
   - What has no owner?
   - What is unsafe or unverified?
   - What must be handed off?

## Priority App Concepts

### CueForge

Current problem: CueForge is a cue sheet, but the first working surface is still
an editable table. That is good for setup, but not distinctive for show mode.

Opportunity:
- Add a caller deck showing the next open cues as large cards.
- Keep the table as the detail editor.
- Make Take Next Cue, Done, Hold, Issue, and selected cue state drive both the
  deck and the table.
- Future step: add a true show mode with current, standby, next five, and issue
  strip.

### Signal Flow

Current problem: a route list is visual by nature, but the app is row-based.

Opportunity:
- Add a left-to-right signal chain view: source, processing, transport,
  destination, backup.
- Highlight broken routes, missing backups, and untested links as gaps in the
  chain.
- Keep the table for exact connector, format, and notes fields.

### Audio Patch / Input List / Line Check

Current problem: these are console and stagebox workflows, but they read like
data-entry sheets.

Opportunity:
- Add a console-strip view with channel tiles grouped by source type.
- Add stagebox blocks with input numbers and phantom/line-check indicators.
- Add a line-check mode that advances through channels one by one.

### Power Plan

Current problem: power safety is about capacity and headroom, not just rows.

Opportunity:
- Add circuit load meters and phase/leg cards.
- Surface overloaded circuits, missing backup power, and low headroom before
  the table.
- Keep row editing for circuit labels and locations.

### Network Plan

Current problem: VLANs, switch ports, and IPs are spatial/route concepts.

Opportunity:
- Add a network map grouped by show control, audio, video, comms, and internet.
- Show IP conflicts and missing backups as badge-level warnings.
- Keep table editing for precise IP/VLAN/port records.

### RF Coordination

Current problem: RF work is spectrum-based, but the tool is table-based.

Opportunity:
- Add a frequency lane view with wireless mics, IEMs, IFB, and comms packs.
- Highlight conflicts, unscanned channels, and missing backups.
- Keep table editing for receiver and pack details.

### Truck Pack / Load In / Strike

Current problem: these tools are about physical movement and sequence.

Opportunity:
- Add truck-zone and dock-lane boards.
- Add load order stacks and strike destination lanes.
- Keep table editing for case IDs, weights, owners, and notes.

### Room Check / Breakout Matrix / Show Task Board

Current problem: room tools should feel like operations boards, not sheets.

Opportunity:
- Add room cards by venue area, risk, and readiness.
- Add blocked-room and no-owner lanes.
- Keep table editing for schedule and room metadata.

### Camera Shot List

Current problem: shot calling is sequence and framing, not just row data.

Opportunity:
- Add shot cards grouped by camera and show segment.
- Add a current/next shot rail similar to CueForge.
- Keep the table for export and bulk editing.

## CueForge Patch In This Pass

This pass adds the first concrete example of the pattern:

- A Caller Deck appears above the CueForge table.
- It shows the next five open cues as operator cards.
- Cards carry cue position, status, action, time/type/owner metadata, and notes.
- Clicking a card selects and scrolls the matching table row.
- The deck updates when cues are edited, selected, marked done, cleared,
  imported, or advanced.

## Verification

New smoke coverage:

- `node scripts/probe_cueforge.js --base=http://127.0.0.1:8000/`
- `node scripts/probe_cueforge.js --base=https://systembydave.com/` after the
  caller deck is deployed.

Coverage includes:

- `cueforge.html` routing to `cue-sheet.html`
- AV Suite context query preservation and show title hydration
- sample load
- add/edit/filter/duplicate/move/delete
- Take Next Cue
- Caller Deck rendering and advancement
- JSON export
- CSV export
- JSON import
- localStorage persistence
- 390px mobile overflow and clipped-focusable checks

## Recommended Next Slices

1. Build a true CueForge show mode: current cue, standby cue, next stack,
   issue strip, and large operator buttons.
2. Convert Signal Flow into a route-chain view backed by the existing table.
3. Convert Audio Patch/Input List into console-strip and stagebox views.
4. Convert Power Plan into load meters and headroom warnings.
5. Convert Truck Pack into truck-zone/load-order boards.

## Guardrails

- Keep the table/export layer because it is useful for print, import, CSV, and
  detailed editing.
- Add one domain-shaped surface per tool instead of redesigning every tool at
  once.
- Keep the AV Suite registry as the route/storage source of truth.
- Bump the registry cache version when cached tool pages change.
- Run the AV Suite verifier, responsive probe, and the CueForge smoke probe
  before considering the pass complete.
