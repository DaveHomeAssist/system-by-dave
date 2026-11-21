# Frozen Startup

Offline development package, version 0.3.0. Python 3.9 or newer, standard library only.

Run the demonstration from the repository root:

```sh
python3 apps/frozen-startup/startup.py --profile apps/frozen-startup/example-profile.json --fixture apps/frozen-startup/example-snapshot.json --receipt /tmp/frozen-startup-demo.json
```

The demonstration uses synthetic displays. It performs no machine operations.
The resulting receipt identifies fixture execution. Keep it separate from
production acceptance evidence.

Run regression checks:

```sh
python3 -B -m unittest discover -s apps/frozen-startup -p 'test_*.py' -v
```

Build a portable source package (add the compiled mac-displays path as a second argument to include the native executable):

```sh
python3 apps/frozen-startup/package.py /tmp/frozen-startup-package
```

## Mac application adapter

The Mac adapter is selected explicitly with `--bridge /absolute/path`.
The executable receives one JSON request on stdin and emits one JSON response
on stdout. Every request has `schemaVersion: 1`, `action` and `payload`.
Responses have `ok: true` and `result`, or `ok: false`. Calls time out after
45 seconds. There is no shell evaluation. The bridge is trusted local code.
This release supplies an offline bridge and a native Mac adapter tested with
Millumin 5.14.l on the development Mac. The native adapter reads the Output
setup sheet and CoreGraphics output windows. The Studio remains a separate
installation and physical acceptance target.

| Action | Request | Required behavior |
| --- | --- | --- |
| capabilities | Empty payload | Report whether complete startup integration is available |
| observe | Empty payload | Read current displays and Millumin state in the example snapshot shape |
| restore | Explicit display IDs, connectors, identities and modes | Revalidate identities, restore modes, atomically arrange all displays and verify success |
| openShow | Approved path/hash and current control display ID | Verify the file hash, open once, place controls on the operator display, preserve show geometry and cues |
| fullscreen | Empty payload | Enable the already verified Millumin outputs once |

`openShow` never contains requested routes. The observation must independently
report the actual canvas assignments. Millumin's documented script functions
include openProject and enterFullscreen, but a supported route readback or
assignment API has not been established. Missing route feedback blocks output.
No bridge should guess display names, rewrite show archives or report requested
values as observations.

Observation adapters must return only stable configuration fields. Exclude
poll timestamps and telemetry that changes on every sample. Include logical
size, pixel size, refresh, rotation, origin, main, mirror and source color mode.
Connector identity must come from current native enumeration; names and runtime
IDs alone are insufficient. Mode values describe macOS output configuration.
Actual receiver timing remains separate projector evidence.

The schema is demonstrated by the two example JSON files. Production profile
creation is an explicit commissioning step using the retained approved baseline.
The examples contain no production host, address, serial number or show path.

## Startup and warm checks

Startup waits for three identical observations. It preserves a desktop that
already matches the approved profile. If the layout needs restoration and
readback still differs after settling, it may apply the approved layout once
more after all five physical display identities settle again. The receipt
records the retry. An explicit bridge error stops the run. Startup verifies
the approved show and its routing before enabling fullscreen. An operator can
retry after correcting a persistent fault.

`--warm` reads and checks an already-running system. It issues only `observe`.
The helper exits after its check. It does not rearrange displays during a show.
Each receipt directory has an OS-held lock to prevent overlapping helper runs.
Choose one receipt directory for a commissioned installation.

## Show-night readiness

A computer pass produces `computerReady: true` and `showNightReady: false`.
After the agreed safe visual test, the operator supplies a JSON evidence file
with the receipt's `runID`, their `operator` name and all five Boolean fields:
`surfacesAtoD`, `approvedShow`, `testCardsRemoved`, `openingLookRestored`,
`warningsReviewed`. Acknowledging warnings requires the crew's agreed response.
It does not clear device faults.

Verify that evidence against the same receipt and a fresh observation:

```sh
python3 apps/frozen-startup/startup.py --profile apps/frozen-startup/example-profile.json --fixture apps/frozen-startup/example-snapshot.json --receipt /tmp/frozen-startup-demo.json --verify-ready --crew-evidence /tmp/frozen-crew-check.json
```

Readiness expires after 15 minutes and is invalidated by a configuration change,
a different run, missing crew evidence or an incorrect show/routing. This is a
readiness checkpoint. Continuous watching during the show is the separate
[mid-show watch](#mid-show-watch-read-only). The timeout is provisional
until the crew commissioning walkthrough establishes the operational value.

For show-night integration, run the warm check on a running system or startup
after the normal account login. Crew then performs the agreed visual test,
removes test cards, restores the opening look and reports ready to stage
management. A failure identifies the affected check. Coordinate recovery with
lighting and audio through the existing house procedure. Projector power,
shutters, MIDI, playback cues and shutdown remain with their existing operators.

## Acceptance before installation

- Capture and approve the real profile and validate the native bridge.
- Verify the installed BetterDisplay version, account startup and permissions.
- Establish supported Millumin routing observation and show identity checks.
- Test two restarts with zero manual corrections and correct physical images.
- Test delayed/missing displays, changed IDs, partial restoration and retry.
- Witness the visual check, opening reset and current A projector-control route.
- Archive the prior startup settings and a rollback procedure before enabling a login item.

Manufacturer references: [BetterDisplay CLI](https://betterdisplay.pro/guide/integration/cli-examples/),
[Millumin scripts](https://help.millumin.com/docs/connect/scripts/).

## Native Mac integration

Build with `bash apps/frozen-startup/build-mac.sh /tmp/frozen-mac-build`.
Use `FROZEN_NATIVE_DISPLAY_TOOL=/tmp/frozen-mac-build/mac-displays` when running
the source adapter. The packaged native executable belongs beside mac_bridge.py.
The local runtime needs Python 3, BetterDisplay CLI enabled, Millumin 5.14.l and
macOS Accessibility permission for the invoking process. Fullscreen window
verification may require Screen Recording permission. Missing permission or
unknown UI shape prevents readiness.

The adapter opens the Output setup sheet, reads each canvas by selecting its
row, and restores the previously selected row. It closes a sheet it opened.
This briefly changes editor focus. All assigned canvases must have exactly one
output. Multiple-output canvases stop verification rather than guessing.
Display names match native and BetterDisplay aliases only when unambiguous.
Extra assigned canvases appear in the route comparison and prevent a match.

Fullscreen is confirmed using visible Millumin-owned layer-1000 windows whose
bounds cover the assigned display. The checkbox alone does not pass. Local
acceptance exercised fullscreen off/on/off and no-assignment false-positive
rejection on the built-in screen. Four physical projector destinations and
Studio permissions still require installation acceptance.

The adapter opens the specified show only when no other document is open,
checks its hash, moves the control window and checks actual assignments. A
wrong route blocks startup for operator correction. It never rewrites a show
archive or automatically changes canvas assignments. Automatic recovery relies
on Millumin restoring the saved routes after the desktop has settled.

Show hash describes the saved file. It cannot establish unsaved in-memory
content. Start from the approved saved project for startup acceptance. The
operator's approved-show confirmation remains part of show-night readiness.

## Startup System Checks window (0.4.0 development)

`checks-app/` adds a native macOS window that runs these checks visibly at login.
The window has no equipment control of its own. All machine work still goes
through `startup.py` and its configured bridge.

- **Check stream:** `--events -` writes one JSON line per event to stdout, using
  schema `frozen-startup.check-stream.v1`. Event types are `run`, `check`
  (RUNNING, PASS, FAIL or NOT RUN, with expected, observed and next action),
  `displays`, `result`, `readiness` and `unavailable`. `--events PATH` appends
  to a file instead. The receipt is unchanged and is still written for every run.
- **Window:** `Frozen Startup Checks.app` is a Swift AppKit and WKWebView
  shell. It hosts the live UI in `checks-app/web/`, adapted from the offline
  preview with its simulated scenarios removed.
  - It reads `~/Library/Application Support/FrozenStartup/checks-app.json` (see
    `checks-app.example.json`), runs a check at launch and offers an explicit Retry.
  - It records the crew check (operator name plus the five confirmations) and
    then runs `--verify-ready`.
  - It opens only on the primary (BenQ) display and moves back there if dragged
    away. After READY it collapses to a banner showing the expiry time, and it
    expands again when readiness expires.
- **Build:** `bash apps/frozen-startup/checks-app/build-app.sh /tmp/frozen-checks-app`
  produces an ad-hoc signed app.
- **Login trigger:** `com.avbydave.frozen-startup-checks.plist.example` opens
  the app at login. Per the install plan, it is installed only for restart 2.
- **Screenshots and fit checks for review:** `checks-app/screenshots/record-streams.py`
  records real fixture streams. `capture.mjs` replays them in Playwright to
  capture each window state. `measure.mjs` fails if any state scrolls at the
  window's page size (1280 × 832). None of these is shipped.

### Run the window

1. Build it: `bash apps/frozen-startup/checks-app/build-app.sh /tmp/frozen-checks-app`.
2. Write a configuration from `checks-app.example.json`, with absolute paths and
   exactly one of `bridge` or `fixture`:
   - `fixture` with `example-snapshot.json` runs an offline demonstration that
     performs no machine operations.
   - `bridge` with the commissioned `mac_bridge.py` and the reviewed production
     profile is for the Studio only.
   - `mode` is `startup` (restore, open the show, then enable fullscreen) or
     `warm` (observe only).
3. Open it: `open "/tmp/frozen-checks-app/Frozen Startup Checks.app"`. It reads
   `~/Library/Application Support/FrozenStartup/checks-app.json` by default.
   `--config PATH` or `FROZEN_CHECKS_CONFIG` selects another file.
4. In the window:
   - **Retry check** reruns after a fault is corrected.
   - **Open crew check** records the operator name and the five confirmations,
     then verifies readiness against a fresh observation.
   - **Show checks** and **Hide checks** switch between the READY banner and the
     full view.
   - **Run check again** appears when readiness expires or is refused.
   - Closing the window quits the app.

Each run writes `run-<time>.json` (the receipt) and, after a crew check,
`run-<time>.crew.json` in `receiptDirectory`.

### Login agent (restart 2 only)

Restart 1 of the install plan opens the app by hand. Only after it passes:

1. Copy `com.avbydave.frozen-startup-checks.plist.example` to
   `~/Library/LaunchAgents/com.avbydave.frozen-startup-checks.plist`, and
   replace `INSTALL_DIR` with the commissioned install folder.
2. Check that no other startup path opens Millumin. The earlier
   `com.avbydave.frozen-millumin-autostart` agent stays disabled.
3. Restart and log in. The window should open on the BenQ within two minutes.

To remove the login agent, run
`launchctl bootout gui/$(id -u)/com.avbydave.frozen-startup-checks`, then move
the plist out of `~/Library/LaunchAgents`.

Studio installation, permissions and the five-display restart acceptance are
still separate, approved work.

## Mid-show watch (read only)

Development, offline. Studio installation and acceptance are separate, approved work (Phases 3 to 5 of the
mid-show checks brief; see [what only the rig can prove](#what-only-the-rig-can-prove)).

After the computer checks pass, the checks app starts `startup.py --watch`. About every 60 seconds it reads the
Mac, judges the reading, shows the result and sends a small status report to the Projctl relay, where the Frozen
Monitor's Rig page shows one tile per Mac. It watches and alerts. It never changes anything.

```sh
python3 apps/frozen-startup/startup.py --profile apps/frozen-startup/example-profile.json --fixture apps/frozen-startup/example-snapshot.json --receipt /tmp/frozen-watch-demo/watch.json --watch --max-cycles 1 --events -
```

Run a startup check into the same folder first so the watch has its baseline; the fixture never reports to a relay.

### What it checks

| Check | Reads | Fault when |
| --- | --- | --- |
| Displays | The native display helper (`mac-displays watch`): identity, resolution, refresh, position | A display is missing, inactive or changed identity, or its mode differs from the approved profile |
| Millumin process | Process list: pid and start time | Not running, more than one, or not the same process as at startup |
| Show file | Size and modified time, and a SHA-256 only when either changed | Missing. **A save is reported as `CHANGED`, not a fault**, so a planned save does not turn the Mac red |
| Sleep and keep-awake | `pmset -g assertions` | The named keep-awake process is not holding sleep off |
| Disk, thermal, memory | Free space, `pmset -g therm`, `kern.memorystatus_vm_pressure_level` | Below `minFreeDiskGB`, thermal throttling, critical pressure (elevated pressure is a `WARN` note) |
| Media folder | Path exists and is readable | Missing or unreadable |
| Projctl relay | `GET /api/health` | Not answering, or not the Projctl relay |
| Projector power and shutter | `GET /api/mac-status/projectors` (M5 profile only) | A listed lane has no projector, or is not replying; power is a fault only if `expectPower` is set; shutter is reported, never a fault |
| Pixel output | Interface state and one ping to each listed controller (m1 profile; a stub until the profile enables it) | Interface down, or a controller does not answer. It never sends pixel data |

Statuses are `PASS`, `FAIL`, `CHANGED`, `WARN` and `NOT CONFIGURED`. Only `FAIL` is a fault and makes the overall
state `fault`. A check the profile does not switch on says `NOT CONFIGURED`; it is never shown as a pass, and an
unreadable reading is a `FAIL`, never a pass.

### What it never does

Enforced in code and covered by tests, not just by convention:

- No Millumin readback. `millumin-readback.js` brings Millumin to the front and opens its Output setup sheet; watch
  mode cannot reach it (`mac_bridge.watch_observe` never calls `millumin_ui`).
- No BetterDisplay at all, so no mode change either. Identity and mode come from the native display helper.
- No OSC or any message to Millumin, and no projector or pixel command. The watch process has no `subprocess` or
  `socket` import, and its only requests to the relay are `GET /api/health`, `GET /api/mac-status/projectors` and
  `POST /api/mac-status` (`watch.HTTP_REQUESTS`).
- No relaunch, no repair, no restore, no window or focus change.

How: `watch.ReadOnlyBridge` hands the loop only the bridge actions `capabilities` and `watch`; the bridge's `watch`
action runs programs only through `read_command`, which refuses anything outside `WATCH_PROGRAMS` with arguments
outside the listed shapes. `test_watch.py` and `test_mac_bridge.py` check this at runtime and in the source.

### Baseline

When startup reaches computer-ready it captures a baseline: which display is which lane, each display's identity,
the Millumin pid and start time, and the show file's hash, in `watch-baseline.json` beside the receipts. It
belongs to one boot; a restart ends it. Without one (a Mac whose startup is not commissioned yet), the first watch
reading becomes the baseline and the window says so ("same process as at the first watch reading"). Displays that
share one identity, such as four identical projector outputs, cannot be told apart without a startup baseline, so
that check fails with "Run the startup check first."

### Profile: every check is profile driven

A profile may carry a `watch` block. A check runs only when the profile switches it on; defaults are in
`watch.watch_config`. The `watch` block is not part of the profile digest, so editing the interval or the relay
address does not invalidate a receipt or a crew confirmation.

```json
"watch": {
  "host": "m5",
  "hostName": "Production's Mac Studio (2)",
  "intervalSeconds": 60,
  "mediaFolder": "/absolute/path/to/media",
  "keepAwake": { "process": "caffeinate" },
  "relay": { "url": "http://127.0.0.1:8080" },
  "report": { "tokenFile": "/absolute/path/to/status-token" },
  "projectors": { "lanes": ["A", "B", "C", "D"], "expectPower": null }
}
```

[`example-m1-profile.json`](example-m1-profile.json) is the m1 (Millumin pixel strips) with every value a clearly marked
`REPLACE-` placeholder, because the m1 has not been inspected. Watch mode refuses to start while any placeholder
remains and lists them. Its `pixelOutput` stub ships `"enabled": false`. Startup checks for a non-projector role are
refused with a clear message until the m1's own startup checks are commissioned (Phase 2 and 4).

### Status reports and the window

Reports go to the Projctl relay's `POST /api/mac-status` with a write-only status token read from `watch.report.tokenFile`
(owner-only permissions required). The contract, limits and what the relay will not do are in
[the relay's Mac status doc](../projctl/docs/mac-status.md). A startup run reports `running` and then `ok` or `fault`; the
watch reports each cycle. An offline fixture never reports.

The checks window shows a banner above everything else: **green** `WATCHING · ALL CLEAR`, or **red**
`FAULT · <check names>` with what was observed, `WATCH STOPPED` if the process dies (the app restarts it up to five
times), or `WATCH NOT UPDATING` if a cycle is overdue. It also says whether the last report reached the relay.
The banner is read only: it has no button that checks, repairs or sends. The window's `config` takes `"watch": false`
to switch watching off; exit code 4 means the profile has no `watch` block and 3 means the profile or bridge is unusable.

### What only the rig can prove

Everything above is proven offline (fixtures, a local stand-in relay and the simulator relay). These need the Studio
and the m1 in a downtime window and are **not** proven by this change:

- The native display helper's vendor, model and serial match the identities the approved profile was captured with
  (BetterDisplay reports its own). The watch compares against the baseline the helper itself captured at startup, so
  this does not block it, but it needs one real run to confirm.
- A real `pmset`/`sysctl`/`ps` reading on the Studio's macOS 27.0, including the keep-awake process name.
- A watch run through a full rehearsal with no focus change, no sheet opening and no command sent.
- A test fault (one output unplugged) turning the Mac's tile red within two minutes and back to green after.
- The relay release (Phase 5): the status token, the Rig page and the relay restart.
- The m1: its profile, its startup checks, its pixel controllers and Remote Login.
