# projctl: Frozen at WST projector control

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

The acceptance scope and remaining physical checks are in [Show readiness](docs/show-readiness.md).

## Drawing lanes

Setup has an optional Drawing lane selector: A / SL Portal, B / Top Portal,
C / Stage, D / SR Portal. Cards sort by drawing letter and show the matching
magenta, cyan, amber or green accent plus orientation. Labels remain editable;
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
The 3D adapter aligns the two drawings at lane C's reference width in diagram
units, not calibrated meters. Mounting heights are illustrative, and scenery
depth is not inferred. No catalog calculation, Throwline job import or model
export is performed. WebGL failure leaves Front, Plan and the controls usable.

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
`ProjectorThrow/` viewer. Before copying Projctl to another machine, run
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
