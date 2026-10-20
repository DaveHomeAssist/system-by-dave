# Infrastructure application brief

Infrastructure joins power circuits, network devices and cable runs into one operator workspace. The operator can plan a row, mark its field status, identify issues, save a named local plan and export a backup. Three bounded work areas show readiness and issue counts across systems.

The first slice is a static application at `/infrastructure/` with its own `sbd.infrastructure.v1` document. It supports manual records and previewed imports from the existing `power-plan.v1`, `network-plan.v1` and `cable-plan.v1` JSON shapes. Import copies every legacy record, retaining its full original fields in `sourceRecord` and the source export in `legacySources`. It never writes old keys. A failed validation or storage write leaves the current plan unchanged and offers export. Export and explicit Save are operator actions.

Out of scope: live equipment control, IP reachability tests, credentials, automatic cross-tool synchronization, and claims that a plan is electrically or network-engineering approved. The existing three tools remain usable.

Acceptance: add/edit/status records in all three areas; issue queue reflects issues; save and reload; export and import round trip; invalid imports preserve current state; legacy fixture imports retain originals; keyboard controls and viewport-locked phone/desktop layouts. Rail publication, sitemap, service worker and shared registry are separate serialized integration work.

## Recovery and concurrent tabs

Save compares the exact loaded browser document with current storage while holding an origin-wide Web Lock. If another tab changed the document, Save stops and directs the operator to Export, reload and review. Browsers without Web Locks retain editing and Export but disable Save. Unsupported or malformed saved documents are left in browser storage and never silently replaced. Import validates the full candidate and size limits before swapping the visible plan. Legacy issue-status notes appear in the issue queue while the untouched source record remains embedded for recovery.

## Theme

The application opts into the shared AV theme contract through `css/av-theme.css` and `js/av-theme-mode.js`. Its visible light/dark control writes the existing `av-theme-mode.v1` preference, while the application stylesheet owns layout only. The operator's stored AV theme is restored on reload. No Infrastructure document fields or legacy keys change with theme selection.

## Native working panels

The October 11 conversion applies the [accepted console direction](av-console-rollout.md)
to the existing Infrastructure workflows. An operator needs power, network, cable
and issue information visible together, with touch-sized controls and stored
arrangements rather than mutually exclusive fixed pages.

The smallest useful slice exposes six panel types: Power, Network, Cable, Issues,
Plan/Import and Backup. The three discipline panels edit their existing fields
and statuses directly; Issues selects the affected record without changing its
status. Plan/Import names the plan and reviews file imports. Backup provides
explicit Save, export, reviewed replacement and damaged-save recovery. Panels
share one document; closing a panel never deletes records. Existing field edits
remain unsaved until Save. This is planning assistance, not engineering approval.

Reuse `infrastructure/model.mjs` through a typed adapter and the unchanged shared
console engine. Native source lives in `apps/infrastructure/`; its build writes
the existing `infrastructure/` entry and assets without removing legacy source.
Retain `sbd.infrastructure.v1`, `system-by-dave.infrastructure.v1`, all record
fields, existing nonblank statuses, `sourceRecord` and `legacySources`. Original
objects survive backup round trips; this is not a claim to retain source-file
whitespace. Power Plan, Network Plan and Cable Plan keys and routes stay intact.

An optional version-1 `workspace` adds stored views without making it mandatory
for old plans. Unknown workspace versions fail closed. Unsaved recovery uses
`sbd.infrastructure.draft.v1`; unstored layout uses
`sbd.infrastructure.layout.v1`. Reuse the existing conflict-aware draft store and
Rail index. No automatic document save, recovery restore or cross-app write is
introduced. Malformed saved bytes remain untouched until a reviewed valid backup
is confirmed and their exact recovery copy is verified before explicit Save.
Save still requires Web Locks and the exact loaded-byte baseline. Export remains
available after denied storage or a conflicting tab.

File import accepts the existing three legacy formats or a full Infrastructure
backup. Preview and confirmation are separate; cancel, malformed/oversized input,
or a changed working/saved plan invalidates replacement without losing work.
The 5 MB file limit and existing record/source limits remain. The source import
does not infer safety, readiness, IP reachability or synchronization.

Standalone and actual AV Video embedded use must both work. Embedded mode uses
the host navigation while retaining Infrastructure Save and Export. Only the
five allowlisted show-context parameters appear in a read-only chip; they never
populate document fields. Both themes, keyboard layout controls, 44 px targets,
phone/tablet/desktop/short/ultrawide containment and offline reopen are required.

Acceptance retains the five existing model cases and stale-save/import browser
regressions, then adds field/status/issue parity, blank versus zero, whitespace,
all three source imports, cancel/stale preview/limits, backup/reload, unknown
workspace versions, malformed/conflicting/refused-storage recovery, layout and
stored views, independent embedded Save and offline assets. Source, generated
parity, review/CI, source/destination publication and isolated live behavior are
separate release gates. Physical touch, virtual keyboard, operator rehearsal and
real process/power interruption remain separately untested acceptance work.

No equipment control, network diagnostics, credentials, electrical/network safety
certification, synchronization, specialist capability expansion, shared-engine
redesign, other application redesign or legacy route retirement is included.
