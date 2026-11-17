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
readiness checkpoint, not continuous show monitoring. The timeout is provisional
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
- **Screenshots for review:** `checks-app/screenshots/record-streams.py`
  records real fixture streams. `capture.mjs` replays them in Playwright to
  capture each window state. Neither is shipped.

Studio installation, permissions and the five-display restart acceptance are
still separate, approved work.
