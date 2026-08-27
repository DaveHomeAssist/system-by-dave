# AV Suite Engine Mechanics Spec - 2026-07-07

## Purpose

This spec converts the structural ledger for the AV Suite into a repo-aligned
implementation roadmap. The product goal is to stop treating the suite as 33
isolated table pages and move toward a single show workbook with reusable show
data, shared grid mechanics, validation overlays, and high-pressure operator
views.

This document is grounded in the current `system-by-dave` implementation, but
the implementation is not a product constraint:

- Static GitHub Pages deployment.
- Current AV pages are mostly static HTML/CSS/JS.
- The workbook may use framework code, build tooling, package management, or a
  different app architecture if that is what the product needs.
- `js/sbd-registry.js` remains the AV tool route and storage source of truth.
- Existing standalone tool URLs must keep working during migration.
- Teleprompter and PlotForge remain out of scope for this consolidation pass.

## Current Source Of Truth

Current registry evidence from `js/sbd-registry.js`:

- Registry version: `v20260706-logistics-rooms-camera`
- Total registered tools: 38
- App-like or alias surfaces without an HTML table: 5
- Table-based workflow surfaces: 33

The 33 table-based surfaces are the consolidation target:

| Department | Current tool | Route | Future role |
| --- | --- | --- | --- |
| Playback | Playback Check | `playback-check.html` | Operational asset grid |
| Playback | Record Log | `record-log.html` | Execution log and closeout input |
| Streaming | Stream Plan | `stream-plan.html` | Video/network asset grid |
| Planning | Show Advance | `show-advance.html` | Workbook metadata and advance packet |
| Planning | Site Survey | `site-survey.html` | Room/site note template |
| Labor | Crew Call | `crew-call.html` | Crew directory grid |
| Labor | Crew Time Log | `crew-time-log.html` | Timeline ledger |
| Rooms | Room Check | `room-check.html` | Room readiness checklist |
| Rooms | Breakout Room Matrix | `breakout-room-matrix.html` | Room schedule matrix |
| Rooms | Show Task Board | `show-task-board.html` | Operations task board |
| Closeout | Show Handoff | `show-handoff.html` | Handoff packet builder |
| Closeout | Show Report | `show-report.html` | Report artifact builder |
| Client | Change Order | `change-order.html` | Financial/change ledger |
| Client | Client Sign Off | `client-signoff.html` | Signoff gate |
| Audio | Input List | `input-list.html` | Master signal source table |
| Audio | Audio Patch | `audio-patch.html` | Audio patch engine |
| Audio | Line Check | `line-check.html` | Audio verification state |
| Audio | Speaker Plan | `speaker-plan.html` | Audio deployment grid |
| Power | Power Plan | `power-plan.html` | Power balance engine |
| Network | Network Plan | `network-plan.html` | Network allocation grid and validator |
| Video | Signal Flow | `signal-flow.html` | Signal router engine |
| Video | Video Patch | `video-patch.html` | Video route grid |
| Video | Display Plan | `display-plan.html` | Display and EDID/timing inputs |
| Video | Projection Plan | `projection-plan.html` | Projection planning inputs |
| Lighting | Lighting Patch | `lighting-patch.html` | Addressed asset grid |
| Build | Cable Plan | `cable-plan.html` | Operational asset grid |
| Comms | RF Coordination | `rf-coordination.html` | RF coordination engine |
| Comms | Comms Check | `comms-check.html` | Comms matrix engine |
| Camera | Camera Shot List | `camera-shot-list.html` | Shot sequence grid |
| Logistics | Gear Prep | `gear-prep.html` | Master gear manifest |
| Logistics | Truck Pack Plan | `truck-pack.html` | Truck pack engine |
| Logistics | Load In Plan | `load-in-plan.html` | Timeline/checklist ledger |
| Logistics | Strike Plan | `strike-plan.html` | Timeline/checklist ledger |

## Normalized Engine Set

The ledger names nine engines. Some map directly to current pages, and some
should be implemented as overlays across existing pages rather than new routes.

| Engine | Current route mapping | Implementation note |
| --- | --- | --- |
| Audio Patch Matrix | `input-list.html`, `audio-patch.html`, `line-check.html` | First priority. Promote Input List to the source table, Audio Patch to routing, and Line Check to verification state. |
| RF Coordinator | `rf-coordination.html` | Add guard-band, duplicate frequency, scan status, and backup state validators. |
| Video Signal Router | `signal-flow.html`, `video-patch.html`, `display-plan.html`, `projection-plan.html` | Treat as one video route model with per-view filters. |
| EDID / Timing Validator | `display-plan.html`, `projection-plan.html`, `video-patch.html` | Not a standalone current page. Add validation rules over video/display fields. |
| Rigging / Vector Load Calculator | No current non-PlotForge route | Defer unless a future rigging page is added. Do not fold into PlotForge during this pass. |
| Power Balance Ledger | `power-plan.html` | Add circuit, breaker, load, phase, and 80 percent headroom calculations. |
| Show Timing / Master Cue Engine | `show-timer.html`, `cue-sheet.html`, `show-advance.html`, `show-task-board.html` | App surface is outside the 33-table count, but the data model should feed the workbook and ROS exports. |
| Truck Pack Space Allocator | `gear-prep.html`, `truck-pack.html`, `load-in-plan.html`, `strike-plan.html` | Gear Prep becomes source manifest; Truck Pack becomes calculation and layout layer. |
| Intercom / Comms Matrix | `comms-check.html`, `rf-coordination.html` | Start with beltpack/channel allocation in Comms Check; RF remains wireless safety layer. |

## Target System Overview

The target system is a local-first workbook shell that loads the AV registry,
stores one shared show file, renders grid-backed tabs for ordinary worksheets,
and mounts specialized overlays for high-value engines.

```
[av-suite.html / av-workbook.html]
        |
        v
[SBD_REGISTRY] -> [Workbook Store] -> [Schema Registry] -> [Shared Grid]
                         |                    |                 |
                         |                    |                 v
                         |                    |          [Worksheet tabs]
                         |                    |
                         v                    v
              [Validators + Audit Log]  [Engine Overlays]
                         |                    |
                         v                    v
              [R/Y/G Status Model]     [Audio, RF, Power, Video, Truck]
                         |
                         v
            [Import, Export, Print, Handoff]
```

## Core Components

| Component | File target | Responsibility | Inputs | Outputs |
| --- | --- | --- | --- | --- |
| Registry adapter | existing `js/sbd-registry.js` | Own tool names, routes, departments, phases, storage keys, aliases, and offline assets. | Static registry object | Tool metadata and storage keys |
| Workbook store | new `js/av-workbook-store.js` | Own the shared show file, migrations, local persistence, subscriptions, and import/export. | Workbook JSON, tool imports, context params | Normalized workbook state |
| Schema registry | new `js/av-workbook-schemas.js` | Define worksheet archetypes, columns, entity bindings, validation hooks, and view filters. | Tool id, workbook state | Grid config and overlay config |
| Shared grid engine | new `js/av-grid-engine.js` | Render high-speed editable grids with keyboard navigation, paste parsing, sorting, filtering, and selection. | Schema config and row collection | Row edits and UI events |
| Workbook shell | new `av-workbook.html` or evolved `av-suite.html` | Present tabbed show workspace and route to deep links while preserving current pages. | Registry, store, schemas | Unified operator workspace |
| Engine overlays | new `js/av-engine-overlays.js` or split files once large | Render domain views for audio patch, RF, power, video, truck, comms, and timing. | Workbook state slices | Engine-specific interactions and warnings |
| Validators | new `js/av-workbook-validators.js` | Run pure validation functions and emit R/Y/G status records. | Workbook state | Status issues, warnings, blockers |
| Audit log | store module inside `av-workbook-store.js` first | Record high-consequence edits for patch, power, RF, change orders, and signoff. | Cell edits, operator initials, timestamps | Immutable audit events |
| Import/export | new `js/av-workbook-io.js` when extraction is useful | Parse clipboard, CSV, JSON; generate CSV, JSON, print views, client summaries. | User files, clipboard, workbook state | Imported rows and exported artifacts |

## Data Ownership

The workbook store becomes the source of truth for cross-tool primitives. Tool
pages can still keep local state during migration, but the workbook model must
own the shared entities.

```json
{
  "schema": "system-by-dave.av-workbook.v1",
  "workbookId": "uuid",
  "savedAt": "2026-07-07T00:00:00.000Z",
  "show": {
    "showId": "uuid-2026-ballroom-gs",
    "showName": "Corporate Keynote 2026",
    "targetDate": "2026-07-07",
    "venue": "",
    "globalStatus": "draft",
    "masterTimecodeFormat": "29.97_NDF"
  },
  "operators": [],
  "rooms": [],
  "hardware": [],
  "signalSources": [],
  "patchRecords": [],
  "lineChecks": [],
  "videoRoutes": [],
  "displayEndpoints": [],
  "powerCircuits": [],
  "rfChannels": [],
  "commsRoutes": [],
  "gearManifest": [],
  "truckZones": [],
  "tasks": [],
  "changeOrders": [],
  "showReportEntries": [],
  "auditEvents": []
}
```

### Enter Once Rules

- Room names are entered in `rooms` and referenced by `roomId` everywhere else.
- Input List creates `signalSources`.
- Audio Patch creates `patchRecords` that reference `signalSourceId`.
- Line Check creates verification state against `patchRecordId` or `signalSourceId`.
- Gear Prep creates `hardware` and `gearManifest` records.
- Truck Pack, Load In, Strike, Power, and Show Report reference gear records
  rather than copying free text.
- Show Advance and Show Task Board reference rooms, operators, and tasks.
- Change Order and Client Sign Off create high-consequence audit events.

## Worksheet Archetypes

The 24 lower-depth worksheet flows should collapse into five reusable grid
archetypes. Current pages become schema configurations, not bespoke table code.

| Archetype | Current routes | Standard columns |
| --- | --- | --- |
| Crew directory | `crew-call.html`, portions of `show-advance.html`, future vendor/contact views | Name, role, department, phone, email, call time, rate, status |
| Checklist | `room-check.html`, `site-survey.html`, `client-signoff.html`, portions of `show-handoff.html` | Item, category, room, owner, due, status, verified by, notes |
| Financial/change ledger | `change-order.html`, damaged gear/RMA future slice, freight future slice | Item, id, cost, impact, authorized by, timestamp, status, notes |
| Timeline ledger | `crew-time-log.html`, `load-in-plan.html`, `strike-plan.html`, `show-task-board.html`, `record-log.html` | Event, start, end, owner, location, status, blocker, notes |
| Operational assets | `playback-check.html`, `stream-plan.html`, `camera-shot-list.html`, `cable-plan.html`, `gear-prep.html`, `lighting-patch.html` | Asset id, description, category, room, source, destination, specs, owner, status |

## Grid Engine Mechanics

Minimum mechanics required before broad page migration:

- Arrow keys move between editable cells.
- Enter commits a cell edit and moves down.
- Tab commits and moves right.
- Escape cancels the active edit.
- Shift plus arrow expands selection.
- Paste accepts tab-delimited clipboard data from Excel or Google Sheets.
- Header matching maps pasted columns into known schema fields.
- Unknown pasted columns are preserved in a notes or extras bucket, not thrown away.
- Multi-row status changes operate without modal dialogs.
- Global search filters rows within 100 ms for current worksheet sizes.
- Sort state and visible columns persist per workbook and per view.
- Edits write to local storage immediately, then notify subscribed views.

## Validation Mechanics

Validators must be pure functions over workbook state. They should not read or
write DOM directly.

| Validator | Inputs | R/Y/G rules |
| --- | --- | --- |
| Audio patch | Signal sources, patch records, line checks | Red: duplicate hard target without explicit split; Yellow: missing owner, unchecked line, phantom risk; Green: patched and checked |
| RF coordination | RF channels, room, band, scan state | Red: duplicate frequency or guard-band conflict; Yellow: unscanned or no backup; Green: scanned and conflict free |
| Power balance | Circuits, draw, breaker, phase | Red: over 80 percent breaker load or major phase imbalance; Yellow: over 75 percent load or missing source label; Green: under threshold with backup noted |
| Video timing | Sources, destinations, resolution, frame rate, HDCP, converter | Red: incompatible route with no converter; Yellow: mismatch requiring scaler; Green: native or validated conversion |
| Truck pack | Gear cases, dimensions, weight, truck zone, load order | Red: zone over capacity; Yellow: missing dimensions or destination; Green: packed with order and owner |
| Comms matrix | Packs, roles, channels, party lines | Red: duplicate assignment conflict; Yellow: untested line or missing spare; Green: checked route |
| Signoff | Required gates, owners, audit events | Red: blocking issue; Yellow: missing initials/timestamp; Green: signed off |

Validation output shape:

```json
{
  "id": "issue-uuid",
  "severity": "red",
  "category": "audio",
  "entityType": "patchRecord",
  "entityId": "patch-01",
  "message": "Input 12 is assigned to two hard targets without a split record.",
  "ownerRole": "A1",
  "createdAt": "2026-07-07T00:00:00.000Z"
}
```

## State Gates

Use consistent state values across all workbook tabs:

- `draft`
- `ready_for_review`
- `ready_for_show`
- `line_check_verified`
- `signed_off`
- `issue`
- `archived`

High-consequence records require initials and timestamp on transition:

- Audio patch records
- RF records
- Power circuits
- Change orders
- Client signoff rows
- Any future rigging/load calculation records

## Persistence Mechanics

Phase 1 can use `localStorage` because the current tools already depend on it.
The storage contract should be isolated behind `av-workbook-store.js` so Phase 2
can move larger records to IndexedDB without changing UI code.

Storage keys:

- `system-by-dave.av-workbook.active.v1`: pointer to the active workbook id.
- `system-by-dave.av-workbook.<id>.v1`: serialized workbook for small shows.
- `system-by-dave.av-workbook.index.v1`: list of saved workbooks and metadata.

IndexedDB trigger:

- Add IndexedDB when workbook JSON regularly exceeds practical localStorage
  size or when large import/export payloads become common.
- Keep JSON export available as the portable backup format.

## Import And Export Mechanics

Import priority:

1. Clipboard paste from spreadsheets into the active grid.
2. CSV import with header matching.
3. JSON workbook import.
4. Legacy per-tool JSON import adapters.

Export priority:

1. JSON workbook backup.
2. CSV per tab.
3. Print styles for operator packets.
4. Client summary print view.
5. Later: browser-native print-to-PDF templates.

No server-side PDF generator should be introduced in this repo.

## Migration Plan

### Phase 0 - Ledger Normalization

Deliverables:

- Keep this spec as the normalized source for the consolidation pass.
- Confirm the 33 table-based current routes remain the migration target.
- Decide whether the first workbook shell is a new `av-workbook.html` route or
  an evolved mode inside `av-suite.html`.

Exit criteria:

- Target routes and initial engine order are agreed.
- No current standalone URLs are removed.

### Phase 1 - Workbook Store And Schema Registry

Deliverables:

- Add `js/av-workbook-store.js`.
- Add `js/av-workbook-schemas.js`.
- Add workbook JSON schema and migration helpers.
- Add source adapters for Input List, Audio Patch, Line Check, Power Plan, RF,
  Gear Prep, and Truck Pack.

Exit criteria:

- A workbook can be created, saved, reloaded, exported, and imported.
- Show metadata enters once and hydrates at least three current tools.

### Phase 2 - Shared Grid Engine

Deliverables:

- Add `js/av-grid-engine.js`.
- Add `css/av-grid-engine.css`.
- Implement inline edit, keyboard navigation, paste, search, sort, visible
  columns, row selection, and status updates.
- Prove the grid against one low-risk worksheet first.

Best first candidate:

- `crew-call.html` or `room-check.html`, because each is valuable but does not
  require specialized calculations.

Exit criteria:

- The chosen page keeps JSON, CSV, print, local persistence, mobile layout, and
  existing route behavior.
- Inline cell edit persists without modal flow.

### Phase 3 - Audio Patch Engine

Deliverables:

- Promote `input-list.html` rows into `signalSources`.
- Promote `audio-patch.html` rows into `patchRecords`.
- Promote `line-check.html` rows into verification state.
- Add audio validation rules and R/Y/G issue strip.
- Add a console/stagebox operator view above the grid.

Exit criteria:

- Duplicate hard targets flag red.
- Phantom power risk flags yellow or red depending source type.
- Line check state flows into patch readiness and show report summary.

### Phase 4 - Power And RF Engines

Deliverables:

- Power Plan load, breaker, phase, and headroom calculations.
- RF Coordination duplicate frequency, guard-band, scan, and backup validation.
- Shared status issue model across both pages.

Exit criteria:

- Over-threshold power rows produce deterministic red status.
- RF conflicts produce deterministic red status.
- Both engines work offline after reload.

### Phase 5 - Logistics Workbook Flow

Deliverables:

- Gear Prep becomes master gear manifest.
- Truck Pack calculates zone capacity and load order.
- Load In and Strike consume the same gear and room records.
- Show Report consumes unresolved logistics issues.

Exit criteria:

- A case entered once in Gear Prep appears in Truck Pack, Load In, Strike, and
  Show Report without retyping.

### Phase 6 - Workbook Shell

Deliverables:

- Add or evolve a unified workbook view with tabs for Overview, Audio, Video,
  Power, RF/Comms, Rooms, Labor, Logistics, and Closeout.
- Keep existing tool pages as direct links.
- Add route-preserving links from workbook tabs to the legacy pages while
  migration remains incomplete.

Exit criteria:

- A user can open one workbook, switch between tabs, and keep shared show state
  without re-entering metadata.

## Verification Plan

Local verification should use the repo's current static-site pattern:

- `node --check js/av-workbook-store.js`
- `node --check js/av-workbook-schemas.js`
- `node --check js/av-grid-engine.js`
- `python3 scripts/gen_sitemap.py` only when public routes change.
- Existing AV verifier/probes should be extended instead of replaced.
- Browser smoke checks must cover desktop and the 680px mobile breakpoint.

Live verification after deploy should continue using:

- GitHub Pages deploy state.
- Live registry fetch from `https://systembydave.com/js/sbd-registry.js`.
- Live route checks for migrated pages.

## Decisions Locked By This Spec

- Do not treat the current static implementation as a ceiling. Frameworks,
  package managers, build tooling, and generated assets are allowed when the
  workbook needs them.
- Do not delete existing tool routes during consolidation.
- Do not build dedicated UI for pure data sinks.
- Do not create new standalone conceptual routes for EDID, rigging, or vendor
  ledgers until they map to a real registry decision.
- Use shared data and overlays first; page deletion can happen only after the
  workbook proves better on actual operator tasks.

## Open Product Decisions

- Should the workbook shell be a new `av-workbook.html` route, or should
  `av-suite.html` become the workbook shell?
- Which page should be the first shared-grid migration: Crew Call or Room Check?
- Should Show Timer and Cue Sheet stay as separate app surfaces while syncing
  timing/cue data into the workbook, or should they become tabs inside the
  workbook later?
- What is the minimum audit requirement for local-only static storage: operator
  initials, browser device id, or both?
- Should rigging remain deferred, or should a non-PlotForge rigging calculator
  be added to the AV Suite registry in a later pass?
