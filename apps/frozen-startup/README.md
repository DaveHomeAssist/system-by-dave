# Frozen Startup

Offline development package, version 0.2.0. Python 3.9 or newer, standard library only.

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

Build a portable source package:

```sh
python3 apps/frozen-startup/package.py /tmp/frozen-startup-package
```

## Deployment bridge

A commissioned bridge is selected explicitly with `--bridge /absolute/path`.
The executable receives one JSON request on stdin and emits one JSON response
on stdout. Every request has `schemaVersion: 1`, `action` and `payload`.
Responses have `ok: true` and `result`, or `ok: false`. Calls time out after
15 seconds. There is no shell evaluation. The bridge is trusted local code.
This release supplies the offline bridge and a partial native Mac adapter.
The native adapter reports startup capability as unavailable, so the coordinator
stops before changing any display. Millumin integration needs completion.

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

Startup waits for three identical observations, restores the approved desktop,
waits for verified configuration, opens the show, checks its routing and enables
fullscreen. Each settling stage has a 60-second deadline. A failed command or
check stops the sequence and writes a receipt. Partial changes are recorded by
the failed stage; restoration is not silently claimed or retried indefinitely.
An operator can explicitly retry after correcting the fault.

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

## Mac adapter development status

The package now includes a native CoreGraphics display reader and atomic layout
transaction, BetterDisplay connector-based mode restoration, and a bounded
read-only Millumin accessibility inspector. Build the native tool with
`bash apps/frozen-startup/build-mac.sh /tmp/frozen-mac-build` on a Mac.
Set `FROZEN_NATIVE_DISPLAY_TOOL=/tmp/frozen-mac-build/mac-displays` when testing
the adapter from source. A source archive includes the build script, not a
preinstalled binary or login item.

The native reader was compiled and observed the development Mac. Restoration
commands have fixture coverage only. Millumin's real accessibility structure,
active-document identity and output-window ownership remain unqualified.
The adapter can verify an already-open approved document. Automatic show
opening, control-window repositioning and fullscreen verification remain
unimplemented, so fullscreen requests fail in this adapter. The package is a development artifact and must not be installed as an
automatic Studio startup task. The missing integration is recorded explicitly
instead of treating a saved-file assignment as live routing proof.
