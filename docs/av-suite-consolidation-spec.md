# Revised AV Suite: consolidation specification

**Status:** Proposed product and migration specification, 2026-09-23. This document describes the target experience and delivery gates; it does not claim that the remaining workspaces are implemented. The equipment-model pilot described below is already live.

**Baseline:** `DaveHomeAssist/system-by-dave` main after the focused FMP viewer release. The registry currently lists 44 tools. The deployed AV origin is `avbydave.com`; `av-suite.html` remains the stable doorway. This spec updates the earlier [Tool Index v2](../av-tool-suite/index-v2/index.html), which mapped 25 named legacy tools as a conceptual directory. The revised scope covers all 44 current registry entries and requires working, substantial views before reducing the catalog.

## Product decision

AV by Dave should make the right capability available in the place an operator expects to work. A workspace earns its place by completing a job without sending the operator through several small forms. Equipment knowledge is reusable across shows and venues. A venue may supply a model, photo, or house observation, but it does not own the general AV workspace.

The first change in this direction is live: four Gear Reference sheets display the existing FMP 3D rig in a focused embedded view. That is an interim content bridge. The long-term reference contract is a source-owned model and evidence adapter that can render inside Gear Reference without relying on a full venue page or losing provenance.

### Goals

1. Replace a directory of thin, overlapping tools with seven useful primary workspaces: **Show Operations**, **Video**, **Audio**, **Logistics**, **Equipment Reference**, **Infrastructure**, and **Live Control**. Video is a named, immediately visible destination, not a tab inside a generic systems area.
2. Keep specialized editors and planners available in context without making them top-level competitors for the same job.
3. Let a person start with an equipment question or calculation without creating a show or selecting a venue.
4. Reuse FMP models, component notes, photographs, and source evidence inside the general reference, with clear FMP labeling where a fact is house-specific.
5. Preserve saved work, exports, links, offline fallback, and operator trust while the old pages are replaced in stages.

### Non-goals

- A single universal show record shared automatically with FMP, Throwline, PixelForge, and every browser tool.
- Moving protected FMP camera check-in, signed-in event records, or house operating instructions into AV by Dave.
- Renaming evidence statuses across FMP catalogs, Gear Reference, and Throwline to one generic value.
- Replacing Cue Sheet, Teleprompter, PixelForge, Throwline, StagePlotter, or OnTrack before their specialist behavior has a proven replacement.
- Adding a cloud account, synchronization service, or new framework solely to make the navigation look consolidated.

### Representative journeys

- **Equipment question:** An operator searches for the URSA G2, opens its sheet, selects a camera-body component in the model, reads the cited evidence, then returns to the procedure. No show or FMP profile is required. House-specific observations are labeled as such.
- **Audio build:** An A1 enters an input once, assigns its patch, marks a failed line check with a problem note, and exports a usable channel view. The same source identity remains visible through each step.
- **Video build:** A video operator opens Video directly, follows a camera or playback source through signal flow and patching to a switcher, screen, stream, or recorder, checks format and backup paths, and reaches the related equipment model from the same task. Camera, switching, display/projection, streaming, and recording remain findable within Video.
- **Truck handoff:** A technician finds a case, sees its test and pack state, places it in a truck zone, confirms its load-in destination, then accounts for it during strike. Missing or blocked gear remains visible.
- **Live show:** A show operator reaches the next cue, clock, and script from one entrance while the full-screen Cue Sheet, Timer, and Prompter controls remain dependable and directly reachable.

## Current state and constraints

| Finding | Current source | Design consequence |
| --- | --- | --- |
| Show Console and Toolbox are two addressable modes of `av-suite.html`; their saved preferences and show dashboard are separate. | [Doorway contract](av-suite-doorway.md), `js/av-suite/app.js` | Keep the stable doorway and the show-independent Toolbox boundary. |
| The registry lists 44 tools and 59 registered local-storage keys. | `js/sbd-registry.js` | Use the registry to drive navigation and cutover, but audit storage outside it. |
| AV Workbook has typed show, people, room, gear, signal, patch, line-check, power, RF, video, task, and audit entities. Its editable tabs are currently Overview, Crew Call, Room Check, and Engines. | `apps/av-workbook/src/types.ts`, `App.tsx`, `EngineDashboard.tsx` | Reuse its validated show data where appropriate; build real editing and task views before replacing legacy pages. |
| The legacy audio importer reads Input List, Audio Patch, and Line Check, and its mapping is repeat-safe. It writes immediately; workbook JSON import also saves immediately. | `legacyAudioImport.ts`, `legacyAudioImport.test.ts`, `App.tsx` | Add preview, backup, confirmation, and field-parity checks before inviting users to migrate. |
| Show Board stores an index, show records, and snapshots under `sbd.showboard.*` despite an empty registry `storageKeys` entry. The domain-transfer policy does include that prefix. | `show-board.html`, `scripts/domain-sites.json` | Inventory and test it directly; do not treat an empty registry entry as no saved data. |
| Workbook uses IndexedDB `system-by-dave-av-workbook`; the AV domain-transfer policy currently lists `PixelForge` but not that database. | `apps/av-workbook/src/store.ts`, `scripts/domain-sites.json` | Audit and repair transfer coverage before any route retirement or claim of lossless migration. |
| Gear Reference authors five JSON sheets and uses a focused FMP model iframe on four of them; the written sheets remain available offline. | [Gear contract](gear-reference-contract.md), `gear-reference.html` | Make the model and source relationship a first-class reference contract; retain a useful no-network view. |
| FMP model catalogs and rig content are managed exports from `fmp-suite`, with stable component IDs and distinct evidence vocabularies. | [Model contract](fmp-model-catalog-contract.md), [release contract](fmp-public-release.md) | Publish from the owning source and map identifiers explicitly rather than copying or rewriting models in AV by Dave. |

## Information architecture

The stable `av-suite.html` doorway continues to offer **Show Console** and **Toolbox**. A show context is optional. Toolbox is the entrance for equipment lookup, calculations, and specialist tools without show data; the neutral first-visit choice and saved entry preference remain as documented in the current doorway contract. The Show Console presents the current phase, open issues, and workspace entry points for show-attached work. It must not imply that launching a tool or following a venue link has merged records.

Primary navigation contains seven plainly named workspaces, with **Video** visible without opening a generic category or search. On desktop, the selected workspace has a bounded main area, local task tabs, and an optional detail or evidence inspector. On mobile, primary destinations remain visible as labeled controls in a wrapped grid or compact list, without a hidden-only menu; local tabs scroll within the active workspace. A capability search finds tasks such as “trace a camera,” “check a line,” “find converter source,” or “pack a case,” not just page names. A result opens the relevant workspace and task view directly.

Each task view must have a shareable URL, with Back and Forward restoring the selected workspace and task. URL state may select a view or offer show context, but may not silently save or replace user data. The exact new route names belong to the implementation stage; existing public routes remain valid throughout migration.

| Primary workspace | Job completed there | Local views |
| --- | --- | --- |
| **Show Operations** | Prepare and run a show, rooms, crew, issues, and handoff | Advance, Rooms, Crew, Tasks, Closeout |
| **Video** | Plan, connect, test, and operate the complete video chain | Cameras, Playback, Switching & Routes, Displays & Projection, Stream & Record, Issues |
| **Audio** | Carry sources through patching, line check, PA, wireless, and comms | Inputs, Patch, Line Check, Speakers, RF & Comms |
| **Logistics** | Track gear and cases from prep through strike | Prep, Pack, Load In, Cable, Strike |
| **Equipment Reference** | Identify, inspect, and troubleshoot a device | Search, Sheet, Model, Components, Evidence, Procedures |
| **Infrastructure** | Plan and verify power, network, and lighting distribution | Power, Network, Lighting |
| **Live Control** | Reach cue, timer, and script controls quickly during a show | Run view plus dedicated full-screen controls where needed |

A contextual **Specialist tools** launcher remains available from Toolbox and the relevant workspace. It is not another grid of empty wrappers. A specialist tool opens with a return path to the originating task and only receives supported context; its own data stays under its existing contract.

### Full registry disposition

Every current registry ID has one primary home below. A home is a navigation and task ownership decision, not authorization to delete its present route or saved data.

| Home | Current registry IDs | Count | Target treatment |
| --- | --- | ---: | --- |
| Show Operations | `av-workbook`, `show-advance`, `site-survey`, `crew-call`, `crew-time-log`, `room-check`, `breakout-room-matrix`, `show-board`, `show-task-board`, `show-handoff`, `show-report`, `change-order`, `client-signoff` | 13 | Consolidate planning, rooms, crew, tasks, and closeout in editable show views. Preserve Show Board's live timeline until parity is proven. |
| Video | `signal-flow`, `video-patch`, `display-plan`, `projection-plan`, `stream-plan`, `record-log`, `camera-shot-list`, `playback-check` | 8 | Direct primary destination for the full camera, switching, routing, playback, display, projection, stream, and record chain. |
| Audio | `input-list`, `audio-patch`, `line-check`, `speaker-plan`, `rf-coordination`, `comms-check` | 6 | One source/channel flow through patch and check, with PA and wireless/comms views. |
| Infrastructure | `power-plan`, `network-plan`, `lighting-patch` | 3 | Power and network share location/context; lighting remains a substantial specialist view. |
| Logistics | `gear-prep`, `truck-pack`, `load-in-plan`, `strike-plan`, `cable-plan` | 5 | Shared item/case identity and phase views; show-specific state. |
| Equipment Reference | `gear-reference` | 1 | Show-independent authored reference with managed model/evidence adapters. |
| Live Control | `teleprompter`, `show-timer`, `cue-sheet` | 3 | Fast common launch/run context; keep full specialist controls until timing, keyboard, export, and remote behavior match. |
| Contextual specialists | `pixelforge`, `throwline`, `stageplotter`, `av-calculator`, `ontrack` | 5 | Retain focused applications and deep-link from relevant workspaces. |
| **Total** |  | **44** | |

`av-tool-suite/index-v2/` remains a historical concept page until this specification is implemented. Do not present it as a second live operating suite.

## Workspace behavior contracts

### Equipment Reference

- Search by device, model, part, connector, symptom, procedure, and source. An authored sheet opens without a show context.
- A model panel selects the sheet's mapped component and exposes the model, part-specific notes, photos, and source locators in the same reading flow. The current focused FMP iframe satisfies the first pilot, but a later adapter must support more source-owned models without embedding venue navigation.
- Distinguish **manufacturer specification**, **FMP house observation**, **inference**, and **open field check** in the content. Keep the original Gear Reference accuracy log and the source catalog's confidence/geometry terms visible in their own contexts.
- Stable sheet ID, model ID, component ID, source ID, and source revision form the mapping. Missing component or unavailable model shows a useful sheet and explicit availability message, never an empty panel or a false identification.
- The authored text, tables, and schematics remain usable offline. A model needs an explicit offline packaging decision and provenance check before the UI promises offline 3D.
- Gear Prep may link an item to a sheet but does not become the owner of general device knowledge.

### Video

Video opens directly from the primary navigation, from Toolbox without a show, and from Show Console with an optional show context. Its local views cover cameras and shots, playback, switching and signal routes, displays and projection, streaming, recording, and faults. A route connects source, processor or switcher, patch point, destination, format, backup, and test result. A source may fan out to screens, stream, and record destinations; those branches retain their own verification states. A diagram must not imply that an untested physical path is verified. Throwline launches from projection with the projector and screen context it actually supports. A camera, lens, or converter opens its Equipment Reference sheet and component model in context without making Video a venue-specific app.

### Audio

A source can be followed from input list to patch to line check without retyping identity. The view preserves all existing fields, check results, problem notes, print/export, and operator attribution. RF and comms keep their distinct frequency and assignment safety checks; they are local views, not squeezed into an audio channel row.

### Infrastructure

Power and network have room and device references, capacity or addressing checks, backup path, owner, issue, and verification status. Lighting Patch keeps fixture/universe/address workflows as a real view, with no forced power or network field mapping. Infrastructure is a labeled primary destination; relevant power/network details may also appear as context in Video, Audio, and Show Operations without creating duplicate records.

### Logistics

An item or case can move through pull, test, pack, truck zone, unload, destination, and strike. Each step records only the fields it owns. The operator can see what is missing, blocked, or unaccounted for by case and destination. A general gear sheet can be opened from an item; reading the sheet never changes the show's prep status.

### Show Operations

Advance and site findings feed room, crew, task, and handoff views when the user explicitly attaches them to a show. Show Board's live room-turn timeline, snapshots, and recovery behavior remain available until a new view demonstrates parity. Client-facing signoff and change-order exports retain explicit confirmation and provenance.

### Live Control

The Show Console should offer one fast “run the show” entrance with next cue, clock, script access, and current issues. Cue Sheet, Show Timer, and Teleprompter keep their dedicated views while their time-sensitive controls remain distinct. Combining them into a single runtime is a separate acceptance gate covering keyboard control, focus, remote mode, timing, display outputs, print/export, and failure recovery.

## Data and integration boundaries

1. **Reference content:** Authored `data/gear/` sheets belong to System by Dave. FMP models and evidence belong to `fmp-suite` and enter AV by Dave through a versioned published adapter/export. Throwline catalogs retain their own owner and evidence terms.
2. **Show work:** AV Workbook may become the local source for typed show entities in consolidated editable views. Its existing IndexedDB is a starting point, not proof that every old field or show draft is represented. No workspace may silently replace active workbook data from URL context or an import.
3. **Console state:** `av-suite-dashboard.v1` remains a separate show profile/readiness store during migration; `av-suite-ui.v1` remains a preference store. A later change may derive readiness from workspace data only after its source, conflict rule, and rollback are specified. Avoid two silent writers for one status.
4. **Handoffs:** Use the confirmed, target-native `sbd.handoff.v1` flow for cross-tool transfers. `sbdShow`, `sbdVenue`, `sbdDate`, `sbdOperator`, and `sbdPhase` are launch hints, not identity proof or permission to overwrite a saved show. A camera assignment never goes in `sbdOperator`.
5. **Specialists:** PixelForge, Throwline, StagePlotter, OnTrack, and the full live controls continue to own their specialist state. A contextual launch can pass only fields the receiving tool documents and validates.
6. **Origins:** `avbydave.com` and `housevideo.app` cannot share localStorage or IndexedDB. Cross-origin content must use published assets or an explicit read-only embed; saved user work moves only through a visible, confirmed transfer.

## Migration contract for each legacy tool

Before reducing a legacy tool's prominence or retiring its route:

1. Inventory its route, deep links, schema, localStorage keys and prefixes, IndexedDB stores, exports, print output, offline assets, field labels, status semantics, and keyboard behavior. Include stores omitted from the registry. Use synthetic fixtures; do not copy personal user data into the repository.
2. Provide a preflight showing source, target show, records and fields to import, unmapped values, conflicts, and expected result. Offer a downloadable backup before the first write.
3. Require explicit confirmation for an import or replacement. Assign stable source IDs and record source key/schema/hash and importer version so a repeat import is predictable. Never silently delete or overwrite a newer target edit.
4. Verify counts **and** meaningful fields/statuses after writing. Keep the old source intact, preserve the old URL, and make a failed or partial transfer recoverable.
5. Offer an operator-visible comparison and rollback. A rollback may restore navigation and reopen the legacy page; it must not require deleting newly saved work.
6. Only then move the primary navigation to the consolidated task. Keep compatibility routes and export/import paths until documented usage and operator acceptance justify retirement.

The Audio importer is the pilot for this contract. Its current repeat-safe mapping is useful, but it still needs a preview, backup, explicit confirmation, unmapped-field report, and editable input/patch/check views. The AV Workbook JSON import also needs a pre-save review. Verify Show Board's existing prefix transfer against real schema fixtures and add AV Workbook IndexedDB coverage before any “all data moved” statement.

## Release sequence

| Stage | Deliverable | Exit gate |
| --- | --- | --- |
| 0. Inventory | Feature, route, storage, origin, export, and offline matrix for all 44 entries; fix inventory gaps. | Every saved store has a tested backup/recovery path; unresolved mappings are listed. |
| 1. Equipment pilot | Four FMP camera-chain sheets use the existing model and evidence; Show Console bridge uses valid context. **Shipped as an interim bridge.** | Live component selection, source provenance, no-network fallback, responsive/keyboard checks. |
| 2. Video | Direct Video entry and editable camera, playback, route/switching, display/projection, stream, and record views. | All eight Video registry capabilities stay directly reachable; representative camera-to-screen, camera-to-stream/record, and playback-to-display paths retain status, backup, and export details. |
| 3. Audio | Editable sources, patches, line checks, PA, RF/comms task views and safe imports. | Field/status/export parity for the first three audio pages; repeat import and rollback pass. |
| 4. Logistics | One case/item flow across prep, pack, load in, cable, and strike. | Counts and status transitions reconcile with each legacy page; lost-item and partial-pack scenarios pass. |
| 5. Infrastructure | Power, network, and lighting views with explicit technical checks. | Each specialist's distinct fields, checks, and exports remain usable. |
| 6. Show Operations | Advance, rooms, crew, tasks, and closeout views with explicit show attachment. | Show Board timeline/snapshot recovery and client outputs meet parity before route retirement. |
| 7. Navigation cutover | Seven primary workspaces, capability search, contextual specialists, compatibility URLs. | All 44 capabilities have a tested reachable home; operator trial and live-domain verification pass. |

A stage is shipped independently, behind a reversible navigation change. Do not wait for all 44 tools to be rewritten before making the completed workspace useful. Do not replace a functional page with a shell of links and call that consolidation.

## Acceptance criteria

- A new visitor can open Equipment Reference, inspect an authored sheet, and reach its source evidence without choosing a venue or show. The written reference works when House Video is unavailable.
- A new visitor can identify and open **Video** from the primary navigation without using search, opening Systems, or selecting a venue. The Video workspace covers camera, switching/routing, playback, display/projection, stream, and record work in one coherent flow.
- A show operator can complete input → patch → line check and prep → pack → load in → strike from their respective workspace without re-entering the same item identity. Saved status survives reload and import retry.
- Each migrated workflow preserves its original meaningful fields, problem states, exports, print behavior, and deep links or documents an explicit operator-approved replacement.
- No URL hint, import, legacy migration, or cross-origin transfer silently overwrites an active show, changes a person's name to a position code, or reports a partial write as complete.
- All 44 current capabilities remain discoverable by task search and reachable from no more than two navigation actions on desktop and mobile. Primary navigation exposes seven labeled workspaces, including Video, with contextual specialist launchers.
- At 390, 680, 1280, and a representative 32:9 viewport, primary destinations remain visible, local panes scroll independently where practical, focus is visible, and there is no unintended horizontal overflow. Light, dark, reduced-motion, keyboard, and no-network paths are verified.
- Registry, sitemap, offline manifest, domain staging, public shell, generated Workbook artifact, CI, Pages deployment, and actual rendered `avbydave.com` and `housevideo.app` surfaces agree before release is called complete. Human operator acceptance remains a separate gate.

## Decisions to validate during implementation

- **Recommended:** retain the two doorway modes and seven primary workspaces, with Video immediately visible. Revisit the grouping after an operator trial, not because a new route is easier to code.
- **Recommended:** use AV Workbook's existing typed store for show-attached entities once field parity is established. Keep show-independent reference content outside it.
- **Recommended:** retain the current online FMP model bridge with offline sheet fallback until a versioned, source-owned same-origin content package can be built and maintained. Do not promise offline model access before that release gate.
- **Open:** whether Show Console readiness should remain manually maintained or become derived per workspace. Define one authority and conflict behavior before changing it.

## Source map

- Current routes and keys: `js/sbd-registry.js`; doorway behavior: [AV Suite Doorway](av-suite-doorway.md).
- Workbook entities, storage, and importer: `apps/av-workbook/src/types.ts`, `store.ts`, `App.tsx`, and `legacyAudioImport.ts`.
- Equipment and evidence: [Gear Reference](gear-reference-contract.md), [FMP model catalog](fmp-model-catalog-contract.md), [FMP public release](fmp-public-release.md).
- Domain transfer and publication: [Domain sites](domain-sites.md), `scripts/domain-sites.json`.
- Public naming and navigation: [Content contract](public-content-contract.md), [Shell contract](public-shell-contract.md).
