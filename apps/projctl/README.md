# projctl: Frozen at WST projector control


For managed macOS access, use `~/Applications/Open Projctl.command` or
`http://localhost:8080/`. The service starts at login and recovers after exit.
See [managed service access and recovery](deploy/RUNBOOK.md#managed-macos-access-and-recovery)
for installation, the one live settings location, logs and backups.

One relay, one web page, four projectors. Spec: Frozen at WST | Projector Control App Spec.

## Run

    npm install
    npm start            # real drivers, reads data/rig.json
    npm run sim          # simulator mode, no projectors needed, reads data/rig.sim.json

Open http://<relay-ip>:8080 on any phone or laptop on the same network.

Ports: 8080 HTTP and WebSocket, 9000 OSC (UDP), 9001 text cues (TCP), 4352 PJLink search (UDP, outbound).
Env overrides: PORT, OSC_PORT, TCP_PORT, POLL_MS, RIG.

## First run on the real rig

1. Setup tab: set each projector's driver (panasonic, pulse, or pjlink), MAC, and current IP. Save.
2. Rig tab: the tile goes live within 10 s once the relay can reach the projector.
3. Set the rig how you want it, Presets tab, name it, Save current rig.

With DHCP the relay re-finds projectors by MAC every 60 s using PJLink class 2 search. The Find projectors button does it on demand.

## Power off and Show Lock

Tap All projectors → Power off twice within three seconds. The first tap lists the reachable
targets; the second sends one command to each of those targets and reports each result.
An offline slot does not block the others. A projector that comes online after the first tap
is skipped until a new confirmation, as is a slot whose connection settings changed.
Individual power-off uses the same two-tap confirmation. Expired or reused confirmations
require another first tap. Changing Show Lock clears pending confirmations.

“Command accepted” means the driver acknowledged the request. Watch the reported tile state
change through Cooling to Standby before removing power. Show Lock blocks power off, input,
test patterns, lens movement and picture changes; shutter and read-only status remain available.

## Cues from Millumin or QLab

Send OSC to UDP 9000, or a text line to TCP 9001. Same addresses either way:

    /proj/P4/shutter 1          close P4 shutter (0 opens)
    /proj/P1/power 1            power on (0 off)
    /proj/P2/input 31           select input
    /proj/all/shutter 0         every projector
    /proj/preset/preshow        recall a saved preset

Bulk cues try every slot and log failures per projector; an offline first slot does not
prevent later slots receiving the cue. Power and shutter require an explicit 0 or 1.
Cues and preset recall retain their deliberate-action behavior without the UI double tap,
and still obey Show Lock. TCP `OK` acknowledges line receipt only; use the Log and reported
tile states to check execution. Malformed OSC datagrams are ignored; OSC bundles remain unsupported.

## Layout

    server/index.js        relay: HTTP, WS, polling, presets, lock, cue input
    server/store.js        data/rig.json read and write
    server/osc.js          OSC and TCP line parsing
    server/drivers/        base.js (interface), pjlink.js, panasonic.js, pulse.js, simulator.js
    public/                index.html, app.css, app.js

## Status of drivers

- pjlink: complete for power, shutter, input, status, light hours (where the projector answers LAMP).
- simulator: complete.
- pulse (Barco): core state, power, shutter, internal patterns, discovered inputs, bounded lens targets and supported picture ranges use the Pulse API. Optional alarm telemetry remains unknown, rather than implying a clear alarm panel.
- panasonic: PJLink handles power/shutter/input; native port 1024 handles supported patterns, lens and picture controls.

Pulse status requires a successful `system.state` query. Failed core queries count toward the
relay's offline policy; unsupported optional properties remain unknown rather than preventing
an otherwise reachable projector from reporting status.

## Verify changes

From this directory, `npm ci` then `npm test` runs isolated simulator, loopback protocol and
confirmation regressions. `npm run test:browser` additionally uses the repository's Playwright
installation and Chromium to exercise the real controls at desktop, 680px and phone widths
in both themes. Set `CHROMIUM_PATH` only to use an existing browser binary. Tests use temporary
rig files and ephemeral ports, and never connect to physical projectors. CI runs both suites.

Compatibility: ECP-1.0 revision 1.0; Projctl remains the physical-command owner. Rig files,
slot IDs and cue addresses retain their existing formats. The bulk HTTP first-tap response
now includes `all.confirm` and `all.targets`; individual responses retain their slot key.
Confirmation tokens are opaque, one-use and bound to the requested scope and connection
settings. Restart the relay and reload clients together when updating the server/UI.
Physical projector acceptance remains separate from simulator verification.

## Frozen control desk

Fresh browsers use the light ice theme; the visible theme button retains an operator's choice.
Small screens place view tabs at the bottom. Adjustment dialogs contain keyboard focus and
return it to the originating tile on close. Setup edits survive incoming status snapshots,
and command history can be searched by slot, command or result.

Barco input choices come from `image.source.list`, including the device's exact source names.
Picture controls come from writable `image` metadata and use its actual ranges and increments.
Lens taps use bounded encoder targets: Slow 128, Normal 512 and Fast 2048, limited to device
travel. Slow is the default. The relay waits for stopped feedback, blocks overlapping
movement, and refreshes position before replying. Stop lens remains available under Show Lock.
An acknowledged request still needs the expected physical result checked on the actual rig.

Shift button labels describe image movement from the audience's view. Setup can reverse
Left / right and Up / down independently for each installed projector. These optional
`reverseH` / `reverseV` booleans persist with the rig; older rigs default to normal.
They change only the UI shift-button mapping. Focus, zoom, Home, Stop, API directions,
encoder readbacks, cues, presets and drawing geometry retain their existing meaning.
Check a small movement on the actual installation before selecting a reversal; mounting
and mirror arrangements differ even between projectors of the same model.

The acceptance scope and remaining physical checks are in [Show readiness](docs/show-readiness.md).

## Building model

Stage includes a Building view when a private venue bundle is present in
`data/venue/` beside the active rig (`VENUE_MODEL` overrides the directory).
It works with or without a stage plot. Room, Drawing and LiDAR remain separate
layers in their shared metric coordinates; large layers load on demand. The
existing 3D/Front/Plan drawing views remain available when a plot is present.
Only the existing lane cards open projector controls; inspecting geometry sends
no commands and never changes saved rig assignments. A preview is shown if 3D
cannot start and the bundle includes one. See [the bundle contract](docs/venue-model.md)
for provenance, limits and installation. Private model assets are not published.

Run `npm run bundle:throwline` before copying a standalone installation; this
includes the pinned local GLB loader as well as the viewer. The additional
`npm run test:venue-browser` checks model loading, mobile layout, rendering
lifecycle and drawing coexistence using synthetic geometry.

To prepare a synchronized update from a clean source checkout, run
`node scripts/package-update.js /path/to/new-output /path/to/private-venue`.
Omit the last argument for a code-only update. The resulting directory has a
source commit/model version manifest and file checksums, without a saved rig.
For the managed Mac service, run `node deploy/install-service.js` followed by
the existing installation path. The installer handles the verified relay,
backups and restart; use **Open Projctl.command** in `~/Applications` afterward.
Live settings stay in Application Support and are not replaced by package data.
For an older, manually managed installation, **Update Existing Projctl.command**
remains available with `PROJCTL_UPDATE_TARGET` set to that installation. Stop
that legacy relay first. See the runbook for the recommended managed migration.

## Preferred input

HDMI is the preferred input for every device and future lane assignment.
**Reset to HDMI** is an explicit operator action, not an automatic action on
startup or reconnect. Current input readback remains separate from that target.
The relay resolves HDMI from each device's available input labels, so different
models may use different protocol values. Ambiguous HDMI ports or missing
metadata require an explicit choice in Other inputs. Show Lock, unavailable
devices and active lens movement retain their normal input-change protection.
The all-device reset reports successful and skipped targets independently.

## Drawing lane assignments

Setup has an optional Drawing lane selector: A / SL Portal, B / Top Portal,
C / Stage, D / SR Portal. Rig always shows A, B, C and D in that order, with
an explicit placeholder when a lane has no unique device. Unassigned devices
remain available in a separate expandable section. Rig and Stage cards use
the drawing identity and model; relay IDs remain in Setup and control details.
Cards show the matching magenta, cyan, amber or green accent plus orientation. Labels remain editable;
slot IDs (P1 through P4), preset keys and OSC/TCP addresses never change.
The adjustment dialog, preset summaries and log retain the slot beside the lane.
Clear an existing assignment before assigning its lane to another projector.
Older rig files remain unassigned until the operator chooses their mapping.

The bundled simulator illustrates P2=A, P4=B, P1=C and P3=D. These demo
assignments do not migrate or verify physical house-projector identities.

## Stage view

The Stage tab reads a private plot from `stage-plot.json` beside the active rig
file. Set `STAGE_PLOT` to use a different local path. The plot stays outside the
public directory and Git; the authenticated `GET /api/stage-plot` endpoint serves
only validated drawing fields. Reload the page after changing the file. Missing
or invalid files show an explicit message and leave the Rig controls available.

Stage opens in an embedded Throwline 3D reference with orbit, zoom, audience and
overhead cameras. Click a projector model or its letter to open its current
controls; dragging only moves the camera. Native lane cards remain available for
keyboard and touch operation. Front and Plan retain the original drawing views.
The 3D adapter accepts optional metric measurements in the private plot. These
set drawing scale, exact supplied lens offsets, mounting heights and manufacturer
enclosure sizes. Portrait bodies rotate their dimensions; labels remain separate
click targets. Unknown heights remain unknown and open in Top view with plan
rays, rather than fabricated 3D cones. The unregistered scenic elevation stays
in Front, and no mounting rail is invented. See [Measured stage reference](docs/measured-stage.md)
for the data and evidence boundary. Legacy drawings keep diagram scale.
No catalog calculation, Throwline job import or model export is performed.
WebGL failure leaves Front, Plan and the controls usable.

Front and Plan use the drawing's own coordinates and orientation. Coverage
buttons toggle reference layers only. Projector buttons and the adjacent cards
open the existing lens, pattern and picture dialog for the lane's current slot.
The view reports power and shutter separately: closing a shutter does not erase
the drawing. Disconnected, offline, unassigned or ambiguous lanes cannot open
controls. Show Lock still applies in the dialog. Simulator status is labeled.

The Open Throwline link opens the full planner separately on AV by Dave. It does not transfer
plot data, calibrate geometry, alter a saved Throwline scene or send commands.
The Stage view is a drawing reference, not optical calculation or live beam tracking.

The source checkout serves an exact allowlist from the canonical
`ProjectorThrow/` viewer and injects its local import map into the relay's HTML
response. The published static copy has no local runtime or private plot.
Before copying Projctl to another machine, run
`npm run bundle:throwline` inside `apps/projctl`; this packages the pinned viewer
into ignored `runtime/throwline/` with a SHA-256 manifest. The service installer
does this automatically. Copy the runtime with the app and refresh it from the
canonical source on updates. `THROWLINE_ASSETS` can select an explicit local
runtime directory. No external CDN or new dependency version is required.

### Local plot format

Version 1 has `title`, `source`, and `views.front` / `views.plan`. Each view contains
`caption`, `outline` (arrays of polyline points), `labels` (`at` point and `text`),
and `lanes` keyed A through D. Each lane supplies a `coverage` polygon, a
`projector` point, a readable `note`, and an optional `control` point for a
spaced button with a leader line back to the projector. Front views may use
coverage keys in place of physical projector positions. Coordinates use a
1000 by 600 drawing canvas, with origin at the upper left. They are not feet or
meters. Preserve drawing dimensions as labeled notes rather than inferring optics.

Files are limited to 64 KB. Coordinates must be finite and within the canvas;
strings are limited to 160 characters. Unsupported versions and missing lanes
are rejected. Unknown fields are discarded, including any slot, command or
network address. The synthetic example in `test/stage-fixture.js` illustrates the
format without publishing venue data. Keep the original plot as the authority.
