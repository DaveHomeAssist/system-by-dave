# Show Ops application brief

## Problem and outcome
An operator needs one show-scoped place to track room readiness, crew calls, open tasks and a handoff summary without switching among independent worksheets. A useful first slice is an editable local show document with a clear live status and portable JSON backup.

## Flow
Name the show, add rooms, crew and tasks, update each status, review the handoff, then explicitly save or export. A backup can be selected, previewed and confirmed before replacing the current Show Ops document. Rejected imports and failed saves leave the current document intact.

## Data and boundaries
`show-ops/index.html` owns `sbd.showOps.document.v1` and export schema `system-by-dave.show-ops.v1`. It does not modify Show Board's `sbd.showboard.*` snapshots or the independent room, crew and task worksheets. Their routes remain available from the app. The first slice did not import those separate documents or claim parity with Show Board's timeline and recovery model; route retirement is excluded. No server, credentials or new runtime dependency is required.

## Acceptance
A named show can create, edit, close and reopen room, crew and task records; save and reload; export and restore a document; preview a backup before replacement; and recover from invalid import or storage failure. Keyboard controls and layouts work at desktop and phone sizes without page scroll. The application remains useful when no legacy records exist. Integration must mark the Show Ops rail entry available and add its route to publication, offline and navigation contracts only after the scoped PR is merged.

## Console workspace

The October 9 console expansion moves the existing functions into AV Video's
shared panel engine. Rooms, Crew and Tasks work side by side; Setup, Handoff and
Backup are available through the same chooser and quick buttons. Close, move,
resize, maximize and layout lock affect presentation only. Store/Update view
stages an optional version-1 `workspace` in the existing show document; explicit
Save retains it. Old backups without views still load. Unknown workspace versions
fail closed without replacing saved bytes.

Source now lives in `apps/show-ops/`. It composes the existing pure domain model
in `show-ops/model.mjs` with the shared layout validator; it does not duplicate
room, task or crew import semantics. `npm run build:show-ops` regenerates the
published entry and assets. The previous fixed-section controller remains
unreferenced source history, not another active renderer.

Recovery uses `sbd.showOps.draft.v1` and `sbd.showOps.layout.v1`. Drafts require
review before restoration, use the shared cross-tab lock protocol, and never
silently save the show. Unstored arrangements are device-local; named views
travel in exports. Source-copy operations retain those views and all source
history. Restore clears the current layout overrides so imported views are usable.

Setup's field picker switches among Name, Date, Notes and original Tools without
an ordinary form scroller. Record collections scroll inside their own panels.
At short heights the workspace presents one panel at a time; **Show** opens Save,
theme, status and recovery controls without consuming the working panel's space.

Run `npm run typecheck:show-ops`, `npm run test:show-ops`,
`npm run build:show-ops` and `npm run test:show-ops-browser`. The new console probe
owns rendered regression coverage; `show-ops/probe.cjs` documents the historical
fixed-section acceptance and is not the console's current browser command.
See [the scoped rollout and coverage assessment](av-console-rollout.md).

## Publication handoff
The separate Rail launcher release (#312) made the existing application route
available. This means launchable, not whole-console or physical acceptance.
The shared-console slice must pass its own build, browser, CI, publication and
live gates. Original tools remain available; timekeeping, breakout scheduling,
Show Board timeline and full specialist parity are outside this conversion.

## Theme contract
The application consumes `css/av-theme.css` and `js/av-theme-mode.js` with `data-av-tool="show-ops"`. Its visible toggle writes the shared `av-theme-mode.v1` preference, while all palette and contrast tokens come from the canonical AV light and dark themes. Show documents and their save key remain independent of theme preferences.

## Room Check v1 copy slice

Problem and outcome: a room operator can complete checks in Room Check but must retype them in Show Ops. Add a one-way reviewed copy of the current `room-check.v1` browser record or an exported `system-by-dave.room-check.v1` JSON file into Show Ops room readiness. The source schema has show/date/venue/room metadata and checks with area, owner, due, priority, status, blocker and notes. Reject malformed, future, oversized or ambiguous source records; never normalize an unknown status into a ready verdict.

Flow: open Backup, choose the saved Room Check or a JSON file, inspect the exact show/date binding and every source check, select the checks to copy, then confirm. A named source show and date must match any existing Show Ops show/date; an empty target field is visibly filled on confirmation. A mismatch blocks the copy. Confirmation appends selected checks as unsaved Show Ops edits; Save remains a separate action. All copied target statuses begin as **Needs check**, even when Room Check says ready or checked, because its seven statuses are not Show Ops readiness decisions. Keep the original status and all original fields visible beside the editable target row and in the backup. Cancel, a changed saved source, a changed target, repeated source items, invalid input or a failed Save leaves both saved documents intact.

Data: the existing Show Ops v1 document accepts optional Room Check source snapshots and exact original JSON text; older v1 backups still load. New source metadata is bounded and validated on restore. The source browser key and source file are read-only. There is no producer-side routed handoff, background sync, universal module management, Show Board timeline import, client-facing output, control action or Rail promotion. A source update is not silently merged over an earlier copy.

Acceptance: model tests cover source schema/status validation, duplicate and stale detection, show/date conflicts, selected-row copying, source-byte backup/reopen and compatibility with older v1 backups. Synthetic browser checks cover saved/file preview, selection, cancel, changed source/target, explicit Save, failed Save, export/restore, keyboard/theme and viewport containment. Run AV/offline/domain checks and exact-head CI, then verify source and AV destination publication and live synthetic behavior. Physical operator and device acceptance remain separate.

## Show Task Board v1 active-task copy slice

Problem and outcome: the Show Task Board owns show-day tasks with area, owner, priority, due time, status, blocker and notes, but Show Ops requires re-entry to include them in its operating handoff. Provide a reviewed one-way copy from saved `show-task-board.v1` data or an exported `system-by-dave.show-task-board.v1` JSON file. Neither source is modified, and a Show Ops task is a new operating copy, not a synchronized or identical record.

Flow: inspect a named source show/date and its active tasks, select rows, then confirm. The producer itself treats every status except `done`, `canceled` and `deferred` as open; only those active rows are eligible in this slice. A nonempty Show Ops show/date must match. An empty target show/date is filled only on confirmation. Each selected copy starts as an unsaved **Open** Show Ops task for operator review, regardless of its producer status. Its original status, blocker, priority, owner, due time, area, source and notes remain visible as original fields. Save is a separate action. The original JSON bytes and bounded source snapshots remain in portable Show Ops backups; older backups still load.

Smallest useful slice and exclusions: saved/file preview, selection, explicit copy, safe duplicate/stale rejection, Save/export/restore. No producer-side route, reverse write, automatic status mapping, merge over earlier copies, Show Board timeline parity, client output, credential import, control effect, universal management or Rail promotion. Unknown fields, malformed/future schema, ambiguous item IDs and oversized sources are rejected rather than normalized. Failed or canceled operations leave both saved documents unchanged.

Acceptance: model tests cover source validation, the producer's active predicate, show/date mismatch, duplicate item identity, bounded provenance, old-backup compatibility and selected unsaved copy. Synthetic browser checks cover saved/file preview, cancel, stale source/target, confirmation, Save, export/restore, light/dark and affected viewports. Run AV/domain/offline contracts, exact-head CI, source and AV destination publication and isolated live behavior. Physical-device and operator acceptance, the private board projection and any explicit Rail promotion remain separate gates. Use a qualified runner; Dominic stays unloaded until its power supply is checked.

## Crew Call v1 active-crew copy slice

Problem and outcome: Crew Call owns department, name, role, call, location, meal, release, phone, status and notes. Show Ops has crew rows but no reviewed route from that canonical source, so operators must retype them. Add a one-way copy from the saved `crew-call.v1` record or exported `system-by-dave.crew-call.v1` JSON. Keep Crew Call independently usable and unchanged.

Flow: in Backup, review a named source show/date, venue, each eligible crew member and the source status; select rows and confirm. Wrapped members are excluded as no longer active, with the excluded count visible. A nonempty Show Ops show/date must match; an empty field is filled only after confirmation. Selected copies enter Show Ops as unsaved **Called** rows for operator review, even when the original says confirmed, checked-in, on-site or problem. These statuses are not equivalent attendance verdicts. The original status and all source fields remain available in a disclosure on the copied row, alongside editable Show Ops details. Save remains separate. Exported backups include original JSON bytes, including phone numbers; keep backups private.

Data and safety: accept only bounded, well-formed Crew Call v1 saved/exported shapes with unique stable item IDs, known departments/statuses, a named show and valid date. Reject malformed, future, oversized, ambiguous or repeated items; never silently normalize unknown values. Preserve bounded source history and exact original JSON in Show Ops v1 backups; older backups without that history still load. Re-preview before confirmation if the saved source or target changed, including another-tab edits. Canceled/failed copies do not mutate either saved record. A changed source is not silently merged over a copied row.

Smallest useful slice and exclusions: saved/file preview, selected one-way copy, explicit Save/export/restore and source visibility. No producer-side route, background sync, reverse write, automatic attendance mapping, duplicate-person reconciliation across sources, client-facing contact output, payroll/time-log action, notification, credential import, Rail promotion or original-route retirement. This work does not settle shared identity, universal module management, physical/operator acceptance or the private board sync gap.

Acceptance: model tests cover strict producer shape, wrapped exclusion, show/date conflicts, repeated/stale copy, byte and field retention, backup/reopen, source-history caps and older v1 backups. Synthetic browser checks cover saved/file preview, cancellation, changed source/target, confirmation, separate Save, export/restore, rejected inputs, themes and narrow/desktop viewport containment. Run the applicable AV/domain/offline and exact-head CI gates, then verify source and AV destination publication and isolated live behavior. A physical crew operator must separately accept the intended device and handoff journey before any explicit Rail promotion.
