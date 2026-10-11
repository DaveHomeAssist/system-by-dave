# Show Control application brief

## Native console panels — October 9 implementation slice

**Authority and baseline:** Dave's accepted whole-toolset touch workspace direction;
the [console rollout](av-console-rollout.md) and [shared contract](av-console.md).
Original baseline `4740b934660e672634e1d009329555a365920076`; resumed October 11
against `ab0e3f5324c216a19e94014f2a809f0562b508ca`, preserving the intervening
unrelated publication. The published application
snapshot and standalone route remain available; neither proves native panel parity.

**Problem and flow:** A caller must see the next cue, rundown, operator notes and
call history together. Open Show Control, select a cue, record Go/Hold/Resume,
bring up Setup/Import or Backup, arrange panels and store a named view. Explicit
Save retains the run and stored arrangements. Closing a panel never changes a cue,
hold state or event. Calls remain human log entries, not output commands.

**Owned smallest slice:** On Deck, Cues, Notes, Call Log, Setup/Import and Backup
rendered with the existing shared engine. Typed application source belongs in
`apps/show-control/`; the existing pure calling/import model remains authoritative.
Own the generated entry/assets, adapter and recovery code, focused tests/probe,
necessary build/offline/indexing integration and this application's records. No
new dependency or shared-engine redesign. Show Ops and other application source
stay untouched.

**Data and compatibility:** Preserve `sbd.showControl.v1` and
`system-by-dave.show-control.v1`, prior backups, cue position/Hold/events and exact
safe source rows/provenance. Optional version-1 workspace data is validated at the
console boundary and retained on Save/export/restore; unknown versions fail closed.
Per-console draft and device-layout keys use the existing guarded recovery engine.
Unstored layout never saves the run. Preserve unreadable-byte export before explicit
replacement, stale-tab guards, import preview/cancel and read-only allowlisted show
context. Do not silently merge source data or turn a calling snapshot into execution.

**Acceptance:** Model and adapter fixtures cover old/new backups and rejected
versions. Browser fixtures cover all six panels, Go/Hold/Resume, closed-panel state
preservation, named views, Save/export/reload, offline reopen, exact selected-list
imports, canceled replacement, stale tabs/previews, unavailable or refused storage,
draft restore/discard and the existing damaged-save recovery flow. Check standalone
and real AV Video embedding with independent Save, keyboard/focus, both themes,
phone/tablet/desktop/short-height/ultrawide containment and reachable controls.
Require generated parity, current-head CI/review, both publications and isolated
live readback before technical delivery. Use synthetic disposable data only.

**Exclusions and release limits:** No playback, native hardware triggers, timers,
teleprompter controls, credentials, cross-application synchronization, Rail status
promotion or rework of Show Ops. Physical touch/virtual keyboards/operator rehearsal
and full process-restart/power-loss durability remain separate unverified gates;
they do not block this independently testable source slice. Rollback is a reviewed
source revert and normal publication, preserving saved data and exported backups;
never clear user storage or silently downgrade an unknown workspace.

## Operator problem and smallest useful slice

A caller needs a focused next-cue desk during a show, with a visible clock, hold state, cue notes and a recoverable run record. Show Control copies a reviewed Cue Sheet rundown into its own document, then records cue progress and a time-stamped event log. It also accepts its own JSON backup. The source Cue Sheet, Show Timer and Teleprompter remain independent and unchanged. Canonical CueForge (`DaveHomeAssist/cueforge` at inspected `faf8792`) is the maintained executable cue and Show Mode product; its schema-7 show files, output arm, Panic and native routing must not be recreated in this browser desk. Show Control links to the existing CueForge handoff and claims only human call tracking. PlotForge is a separate lighting-plot product and has no cue-control data contract here.

## Flow and data

Open `/show-control/`, start an empty run, preview the saved local Cue Sheet or its JSON export, or select a CueForge `.cueforge` show file. For CueForge, choose one cue list from the version-7 file. Review its exact safe cue identities and the current run impact, then explicitly confirm replacement when the current run is active or dirty. Select a cue, record a **Go**, **Hold**, or **Resume** call, add a note, and explicitly save. Export a backup before replacing a run. Imports are previewed before replacement. Invalid input cannot replace the current run. These calls are human log entries, never CueForge engine commands. The dedicated tools open in separate tabs for playback, timer and script controls; this desk does not synchronize their live state or control devices.

The application owns `sbd.showControl.v1`, schema `system-by-dave.show-control.v1`. Every save checks the previously read bytes to avoid silently overwriting another tab. A failed write leaves the current document in memory for export. Multiple visible import confirmations each retain the exact validated preview they display. Unreadable saved text is never overwritten automatically: Setup offers a download of the original value, then enables an explicit confirmed replacement that rechecks for another tab's changes. If storage cannot be read, calling controls remain disabled. Before JavaScript boots, controls are disabled with a visible loading/failure message and a no-JavaScript fallback. Local Cue Sheet import reads `cueSheet.v1`; it never writes that key. Imported rows retain the original row fields in `sourceRow`, with Show Control IDs and run state kept separately. Backups retain those fields and the event log. The CueForge adapter reads the documented UTF-8 JSON `.cueforge` version-7 format from an operator-selected file. It copies only one list's cue ID, number, name, type and notes into a calling snapshot. Patch, triggers, media paths, settings and runtime arming are not stored. The original CueForge file remains untouched and is still required to run that show in CueForge. There is no supported browser-to-Electron live bridge or automatic synchronization in the inspected source.

### Selected-list integrity repair (2026-10-08)

Problem: two CueForge lists with the same ID can both appear in the picker, but selecting either ID copies the first list. That can make the caller's record differ from the list they reviewed. The smallest safe change is consumer-only: reject empty or duplicate list IDs and empty or duplicate cue IDs before offering a preview; retain only the existing safe cue fields and list/timestamp provenance in memory and backups. The selected-list preview must show every copied cue's safe identity and the current run's title, cue progress, hold, event and unsaved-change impact. Replacing an active or dirty run requires an explicit confirmation immediately before the copy. Rejection or cancellation leaves both the in-memory run and saved bytes unchanged.

Acceptance: valid schema-7 files with distinct IDs copy the selected list exactly; ambiguous or malformed IDs are rejected; the preview changes with list selection and remains readable at phone and desktop sizes; canceled replacement preserves the prior run; save, export and restore retain the safe source rows and provenance without settings, patch, triggers or media paths. This repair does not retain a full native file, write to CueForge, add a live bridge, arm outputs or change Cue Sheet imports. A changed upstream schema or a need for additional native data requires a separate decision.

## Dependencies, exclusions and acceptance

The console uses the repository's existing React/TypeScript and Vite tooling,
with no new dependency. Source lives in `apps/show-control/`; `npm run
build:show-control` generates the static entry and assets in `show-control/`
without removing the existing pure model or legacy assets. It opts into the
existing `css/av-theme.css` tokens and `av-theme-mode.v1` preference, retaining a
prior Show Control-only light/dark choice when no shared preference exists.
Shared Rail metadata, navigation, sitemap, domain staging and offline assets
remain integration work owned by this release lane. Hardware triggering,
remote outputs, live timer synchronization and teleprompter editing are excluded.

Verification commands: `npm run typecheck:show-control`, `npm run
test:show-control`, `npm run build:show-control`, and `npm run
test:show-control-browser`. The browser gate uses synthetic isolated contexts,
not an operator's profile. `SHOW_CONTROL_BASE` selects an already published
origin, `SHOW_CONTROL_OUTPUT` selects a private evidence directory and
`CHROME_CHANNEL` selects an installed browser channel. These checks do not
establish physical device, virtual keyboard, power-loss or operator acceptance.
