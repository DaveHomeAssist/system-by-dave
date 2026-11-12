# projctl: Frozen at WST projector control


For managed macOS access, use `~/Applications/Open Projctl.command` or
`http://localhost:8080/`. The service starts at login and recovers after exit.
See [managed service access and recovery](deploy/RUNBOOK.md#managed-macos-access-and-recovery)
for installation, the one live settings location, logs and backups.

One workspace contains Notes + tasks, Projector info, Rig and Stage. The controller
opens a Home landing with four choices; the other tabs stay in the same page. Notes save
in this browser at this controller address, with text export. Shared team tasks
use the public Frozen workspace service at https://wst.housevideo.app/; keep
sensitive content out of that shared list. Private cross-device notes sync is
not implemented.

Stage opens the room and recorded A-D projectors together when a room model and
plot are available. Its approximate room alignment is explicitly labeled and
does not establish physical calibration or clearances. See [Stage planning](docs/stage-planning.md).

The public Frozen workspace can embed an existing private controller after an
explicit connection. This Mac connects only to a relay running on this Mac;
crew devices still need a verified theatre controller address. No public relay
is hosted by the workspace. Enable and verify PJ_PASSCODE on a crew destination
before wider exposure; the optional app login is absent when it is unset.

Spec: Frozen at WST | Projector Control App Spec.

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

## Thermal watch

A status button in the Rig tab's overview row ("D Watch · 37.0 °C", or "Air OK · tightest ...") shows
the worst state at a glance. It opens the Thermal watch panel: air temperature at each lane (A to D)
against that projector's rated maximum ambient, with headroom, peak, a 30 minute trend, and the tightest
unit (least headroom) outlined. Cards are keyed by lane, not slot number, because slot numbers have been
renumbered between rig records.

The panel is a non-modal overlay rather than a tab or a row, because the header, tab bar and Rig tab have no
spare height: a tenth tab wraps the tab bar at 1440 px, a header button wraps the header at 845 px, and a
panel above the A-D tiles squeezes the selected-projector dock to nothing at 1280 x 720. While open it
covers the Rig tab below the overview row (never the header, tabs or its button); Escape, Close or the
button dismiss it, and it stays open if you change tab. The button adds no height at 845 px and wider;
below 680 px the overview row already stacks and the Rig tab scrolls, so it adds one row there.

- **Readings.** The watch uses the [health reports](docs/health-reports.md)' read-only driver query:
  Panasonic intake air (`QTM:0`) and the Barco's outside-ambient sensor. PJLink-only projectors report
  no temperature, and the card says so. The relay takes one sample per projector about once a minute
  (`PROJCTL_THERMAL_SAMPLE_MS`, default 60000) and only while the unit is on, warming or cooling. It is
  never part of the 5-second status poll. Health reports and the watch share one reader, so the two never
  query a projector at the same time, and a report's own reading also reaches the watch.
- **Limits.** The health reports' limits, so the panel and the reports cannot disagree: Barco UDM 4K22
  40 °C, PT-RZ970 45 °C, a portrait PT-DW830 40 °C (operating instructions pp. 16 and 158, lamp unit
  ET-LAD120P/PW, under 1,400 m) and a landscape PT-DW830 45 °C. Unknown orientation uses 40 °C.
  Overrides in the private `health-reports.json` are keyed by MAC or IP so they follow the unit;
  a slot key such as `"P4": 40` still applies until it is moved. An unreadable file is shown in the
  panel and uses the lower model rating. A unit whose model is not recognised shows its temperature
  with no level.
- **Levels.** Watch is the health reports' `watchHeadroomC` (default: at or below 5 °C of headroom, including exactly 5). Hot is
  within 2 C, or half the watch margin if that is smaller, with 1 C of hysteresis before a level clears.
  Hot and the hysteresis exist only in the watch (`server/thermal.js`) and are a proposal, not a Barco or
  Panasonic specification. A reading outside -20 to 120 C is treated as no reading.
- **Freshness.** A value is current while the projector is replying and its latest sample is no older
  than three sampling intervals. Otherwise the card keeps the last sample, marked Last known, with its age.
- **Log and history.** A change of level is written to the Log tab once (source `thermal`, result `WARN`;
  recovery is `OK`), so it also appears in the next health report's event list. Eight hours of samples are
  kept in memory and are lost when the relay restarts; they also reset when a slot's driver or address
  changes. `GET /api/thermal?minutes=30&points=180` returns the series and `GET /api/thermal.csv` downloads
  the retained samples. Export the CSV after each show: two shows in a day can span more than eight hours.

This is advisory display only. It sends no command and does not replace the projector's own alarms.
Checked against the simulator and loopback protocol stand-ins; the readings on the installed projectors
are part of the health reports' open venue acceptance.

## Cues from Millumin or QLab

Send OSC to UDP 9000, or a text line to TCP 9001, on the show LAN. Do not publish
those ports, or the projector ports (PJLink 4352, Panasonic 1024, Pulse 9090),
on Tailscale Funnel or any tunnel. Same addresses either way:

    /proj/P4/shutter 1          close P4 shutter (0 opens)
    /proj/P1/power 1            power on (0 off)
    /proj/P2/input 31           select input
    /proj/all/shutter 0         every projector
    /proj/preset/preshow        recall a saved preset

Bulk cues try every slot and log failures per projector; an offline first slot does not
prevent later slots receiving the cue. Power and shutter require an explicit 0 or 1.
Cues still obey Show Lock. A TCP reply is sent after the cue runs: `OK` means every
targeted slot finished with no error (the driver's acknowledgement, not a check that
the picture on stage changed). `ERR` plus the reason means it did not. UDP has no
reply. One power-off cue is still accepted, so an existing show keeps working, until
`PROJCTL_CUE_POWER_OFF=confirm` (the same cue again within 3 s) or `off`.
`PROJCTL_CUE_ALLOWLIST` is unset on an existing install and still accepts every
source, with a startup warning. Set it to the show-control addresses; loopback is
always allowed, and an empty value allows loopback only. Malformed OSC datagrams
are ignored; OSC bundles remain unsupported.

## Layout

    server/index.js        relay: HTTP, WS, polling, presets, lock, cue input
    server/store.js        data/rig.json read and write
    server/osc.js          OSC and TCP line parsing
    server/drivers/        base.js (interface), pjlink.js, panasonic.js, pulse.js, simulator.js
    server/thermal.js      rated limits, levels, in-memory history, CSV
    public/thermal-watch.js  thermal panel and Rig overview status button
    public/                index.html, app.css, app.js

## Status of drivers

- pjlink: complete for power, shutter, input, status, light hours (where the projector answers LAMP).
- simulator: complete.
- pulse (Barco): core state, power, shutter, internal patterns, discovered inputs, bounded lens targets and supported picture ranges use the Pulse API. Optional alarm telemetry remains unknown, rather than implying a clear alarm panel.
- panasonic: PJLink handles power/shutter/input; native port 1024 handles supported patterns, lens and picture controls.

Pulse status requires a successful `system.state` query. A failed core query counts
toward offline. One missed poll keeps the last status and still accepts commands; the
second consecutive core failure marks the projector offline. Optional PJLink queries
that drop do not, by themselves, mark it offline. Name, lamp hours and the Panasonic
test-pattern query are read about once a minute. When the projector keeps the PJLink
socket open, one poll uses that one session.

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

Stage starts with an audience-facing view of the set and all projection beams.
The Stage camera returns to this framing; Projectors keeps the closer unit
inspection view. Camera changes, room cutaways and local planning leave the
recorded plot, physical dimensions and rig assignments unchanged. On phones,
the drawing and planning controls share one scrollable workspace.

Gear and signal-flow cards use the connected relay for model and slot identity,
including offline devices that still have a saved assignment. Disconnected
views label the catalog slot as recorded; duplicate or empty live lanes stay
explicit instead of borrowing a catalog assignment.

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

Saved projector addresses recover automatically after a connection interruption,
without scanning for a different unit or replaying controls. See
[reconnection and manual-discovery behavior](docs/reconnection.md) for retry
timing, stale feedback and safe acceptance checks.

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
ordinary lane edits preserve slot IDs, preset keys and OSC/TCP addresses.
The adjustment dialog, preset summaries and log retain the slot beside the lane.
Clear an existing assignment before assigning its lane to another projector.
Older rig files remain unassigned until the operator chooses their mapping.

The Frozen numbering convention and bundled simulator use A=P1, B=P2, C=P3
and D=P4. Existing saved rigs are not silently renumbered on startup. The
deliberate offline migration in [the runbook](deploy/RUNBOOK.md#align-slot-numbers-with-drawing-lanes)
keeps device settings and preset values attached to their original projector,
records previous event numbers, and requires external slot-based cues to be
reviewed before applying it. Demo assignments do not verify physical devices.

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

## Stage scenario planning

Stage offers a local What-if planning mode for independent A/B/C/D lens, throw,
raster, orientation, position and shift studies. It uses canonical Throwline
optics while retaining the loaded plot as reference. Planning changes stay in
the browser tab and send no device or settings writes. See
[planning boundaries and D lens study](docs/stage-planning.md). An unregistered
private room remains explicitly uncalibrated. Plan with this room enables a
separately labelled approximate preview with local alignment controls, roof
cutaway and visible projector markers; it does not validate registration or
clearance.

Use Projectors for the rig, Coverage for target rasters, Plan for the complete
throw layout, or Selected side for the active beam. Reset view fits the chosen
camera; ordinary scenario edits preserve it. Room layers controls Roof, Walls,
Balcony and Seats, with a projectors/beams-only view and Restore room.

Read-only [display and EDID data](docs/display-readouts.md) distinguishes cached
projector input/signal from relay-computer displays and unavailable raw EDID.
[Lens presets and login compatibility](docs/lens-presets-auth.md) documents the
forward integration of the supplied branch and its physical acceptance limits.

## Projector workspace

The six primary views are My Projector Rig, 3D Stage View, Presets, Log,
Configuration and Throw Calc. Home also opens notes/tasks and projector reference.
Select an A-D card for that projector's guarded controls and separate recorded
gear, live feedback and EDID availability. Unassigned/offline lanes remain
inspectable without enabling setters. The shared reference includes a searchable
documented projector/lens catalog and a signal-flow view that labels unknown
patches rather than inventing transport. Throw Calc embeds the existing canonical
Throwline calculator and requires access to its public host.

The public Frozen workspace uses the same reference source and can navigate an
explicitly connected private controller. It checks the controller's advertised
view capabilities, so an older controller cannot falsely show a requested pane.
Browser local-network permission and the actual theatre endpoint still require
verification; no private controller is hosted or exposed publicly by this UI.

## Operator multiview and power scheduling

My Projector Rig keeps A-D summaries visible while one selected projector owns the
lens/control dock. Current feedback, other-lane alarms and explicit command
acknowledgements remain separate. Secondary power/input/picture and reference
information are in disclosures; unassigned A never receives an implicit device.

Configuration includes [power scheduling](docs/power-scheduling.md): explicit
America/New_York days/time and fixed assigned targets, disabled saves/edits and a
separate Enable action. Nothing runs on save or page load, no show times are
supplied, and startup/sleep/missed occurrences are skipped without catch-up.
Read live status and per-target audit; acknowledgement does not prove actual
power state. Studio startup, network and physical acceptance remain separate.

## Health reports

The relay writes a projector [health report](docs/health-reports.md) 2 minutes
after the rig powers on, hourly while any unit is lit, at power off and when the
relay stops with units lit. Readings are read-only (Panasonic `QTM` temperatures,
Barco ambient and alarm state, PJLink flags); no command is sent or delayed.
Reports are saved beside the rig file and, with a private `health-reports.json`
and a Notion token on the relay machine, added as one row each to a Notion
database. `GET /api/health-reports` lists recent reports and
`POST /api/health-reports/run` takes one now.
