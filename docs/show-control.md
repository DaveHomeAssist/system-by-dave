# Show Control application brief

## Operator problem and smallest useful slice

A caller needs a focused next-cue desk during a show, with a visible clock, hold state, cue notes and a recoverable run record. Show Control copies a reviewed Cue Sheet rundown into its own document, then records cue progress and a time-stamped event log. It also accepts its own JSON backup. The source Cue Sheet, Show Timer and Teleprompter remain independent and unchanged. Canonical CueForge (`DaveHomeAssist/cueforge` at inspected `faf8792`) is the maintained executable cue and Show Mode product; its schema-7 show files, output arm, Panic and native routing must not be recreated in this browser desk. Show Control links to the existing CueForge handoff and claims only human call tracking. PlotForge is a separate lighting-plot product and has no cue-control data contract here.

## Flow and data

Open `/show-control/`, start an empty run or preview the saved local Cue Sheet, review count and title, then confirm the copy. Select a cue, call **Go**, **Hold**, or **Resume**, add a note, and explicitly save. Export a backup before replacing a run. Imports are previewed before replacement. Invalid input cannot replace the current run. The dedicated tools open in separate tabs for playback, timer and script controls; this desk does not pretend to synchronize their live state or control devices.

The application owns `sbd.showControl.v1`, schema `system-by-dave.show-control.v1`. Every save checks the previously read bytes to avoid silently overwriting another tab. A failed write leaves the current document in memory for export. Local Cue Sheet import reads `cueSheet.v1`; it never writes that key. Imported rows retain the original row fields in `sourceRow`, with Show Control IDs and run state kept separately. Backups retain those fields and the event log.

## Dependencies, exclusions and acceptance

The app is standalone static HTML, CSS and JavaScript, with no new runtime dependency. Shared Rail metadata, navigation, sitemap, domain staging and offline assets are integration work owned by the Rail/release lane. Acceptance for this slice: load/save/reload, progress and hold flow, rejected import preserving saved bytes, Cue Sheet original preservation, keyboard access, light/dark toggle, page-scroll checks at 1440×900 and 375×812, and candidate browser screenshots. Hardware triggering, remote outputs, live timer synchronization and teleprompter editing are excluded.
