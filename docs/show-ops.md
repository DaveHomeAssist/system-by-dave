# Show Ops application brief

## Problem and outcome
An operator needs one show-scoped place to track room readiness, crew calls, open tasks and a handoff summary without switching among independent worksheets. A useful first slice is an editable local show document with a clear live status and portable JSON backup.

## Flow
Name the show, add rooms, crew and tasks, update each status, review the handoff, then explicitly save or export. A backup can be selected, previewed and confirmed before replacing the current Show Ops document. Rejected imports and failed saves leave the current document intact.

## Data and boundaries
`show-ops/index.html` owns `sbd.showOps.document.v1` and export schema `system-by-dave.show-ops.v1`. It does not modify Show Board's `sbd.showboard.*` snapshots or the independent room, crew and task worksheets. Their routes remain available from the app. The first slice did not import those separate documents or claim parity with Show Board's timeline and recovery model; route retirement is excluded. No server, credentials or new runtime dependency is required.

## Acceptance
A named show can create, edit, close and reopen room, crew and task records; save and reload; export and restore a document; preview a backup before replacement; and recover from invalid import or storage failure. Keyboard controls and layouts work at desktop and phone sizes without page scroll. The application remains useful when no legacy records exist. Integration must mark the Show Ops rail entry available and add its route to publication, offline and navigation contracts only after the scoped PR is merged.

## Publication handoff
The standalone application is published on AV by Dave, but its Rail console slot remains Planned. A compatible data import does not promote that slot or retire an original worksheet.

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
