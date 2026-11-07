# Projector control readiness

## Scope

Repair input selection and motor completion feedback, expose device-supported picture
settings, and refine the operator interface with a restrained Frozen palette. Preserve
rig files, credentials, presets, slot IDs, cue addresses and existing confirmation gates.
No new dependency or runtime is required. Projctl remains the physical-command owner
under ECP-1.0 revision 1.0; no equipment catalog or cross-app schema changes are involved.

## Image shift direction correction

Mounted or mirrored installations can move the image opposite the UI shift labels.
Preserve stable Left/Right and Up/Down labels, with independent per-projector reversal
settings saved in the owning rig. Legacy rigs keep their current mapping. Only UI shift
buttons translate directions; device-native API commands, focus, zoom, Home, Stop,
readbacks and reference geometry do not change. No model-wide orientation is inferred.

Acceptance: both directions of each reversed axis send the opposite native direction,
normal slots and other lens axes remain unchanged, invalid edits are atomic, settings
survive save/reload/reset, and actual image motion is checked on the installed unit.
This is an additive private rig setting under ECP-1.0 revision 1.0; no shared equipment,
plot or execution-authority contract changes.

## Acceptance

- Input choices come from the connected Pulse projector, with selected-source readback.
- Lens controls wait for stopped motors, prevent overlapping writes, expose Stop, and
  report final position. Slow, Normal and Fast use bounded target increments, not an
  assumed equivalence between a motor step and encoder counts.
- Picture controls use the connected driver's schema and validated ranges. Unsupported
  diagnostics remain unknown. Show Lock and offline state disable writes.
- Relay loss makes stale controls unavailable. The modal contains keyboard focus and
  returns it to the initiating tool. Status updates preserve an operator's focused
  control and unsaved Setup edits.
- Both themes, small screens, keyboard operation, reduced motion, failure states and
  cue transports are checked. Simulated checks and physical hardware acceptance remain
  separate. Every required projector must be available before whole-rig readiness.
- Deployment copies only reviewed application files; private rig data is backed up and
  preserved. Restart the relay and refresh clients together, then verify the exact copy.

## Design

Use an ice-blue light theme and deep navy dark theme. A static aurora accent and a small
snowflake mark identify the show without animation behind controls. Shutter, lock,
connection and per-device results retain words and operational colors. Mobile tabs
move to a bottom rail, with long rig, Setup, log and adjustment panels scrolling locally.

## Projection lane identity

Operator cards should match drawing letters and target surfaces: A / SL Portal
(magenta, portrait), B / Top Portal (cyan, landscape), C / Stage (amber,
landscape), D / SR Portal (green, portrait). Color supports the written letter
and destination; operational status retains its existing meaning.

Add optional `lane` metadata, editable in Setup and retained in rig saves.
Sort the display by drawing letter without changing slot IDs, cue addresses,
network settings, presets or model identity. Existing rigs without lane metadata
retain their labels. Invalid or duplicate assignments must fail before any edit.
The adjustment dialog, presets and log should carry the same lane identity.
No equipment specifications or lens parameters are inferred from the drawing.

Acceptance: saved lane assignments survive reload; legacy rigs still load;
reordering cards does not redirect a command; each letter has readable contrast
in both themes and the established viewport checks pass. The home simulator may
illustrate all four lanes, but physical house-projector mapping requires operator
confirmation before applying it to the venue rig.

## Stage view brief

Operators need to identify a coverage area on their drawing and reach the matching
projector without translating drawing letters into control slots. Add a Stage tab
with front and plan views, colored coverage layers, keyboard accessible projector
buttons and the current status for each assigned lane. Clicking a projector opens
the existing adjustment dialog. Selection never sends a physical command.

The smallest slice is a local, read-only plot adapter: versioned JSON beside the
active rig supplies normalized drawing coordinates and source labels. Keep the
private drawing and its traced venue geometry out of public bundles. A missing or
invalid plot shows an explicit recovery state. The browser receives only validated
fields; arbitrary markup, URLs and network identities are not part of this format.

Drawing coordinates are schematic reference, not calculated optical geometry or
live lens feedback. Coverage remains visible when a shutter is closed, with status
reported separately. Resolve each letter from current rig lane assignments, never
from display order or presumed house identities. Missing and ambiguous assignments
cannot open a control target. No rig, preset, cue or equipment schema changes.

Reuse the current AV by Dave theme and existing controls. Offer Throwline as an
explicit separate planning workspace, with no automatic import, shared state,
invented throw distance or control authority. ECP-1.0 revision 1.0 applies: Projctl
owns execution; this adapter consumes private plot reference only.

Acceptance: both views preserve plot orientation and colors; each click opens the
correct existing slot; layer visibility never changes hardware; polling preserves
keyboard focus; offline and Show Lock gates still apply; missing, malformed and
ambiguous data fail clearly. Verify both themes and the existing six viewports on
the isolated simulator. Physical coverage and house slot identities remain for
venue acceptance.

## Embedded Throwline 3D brief

Add an orbitable 3D reference to Stage, retaining Front, Plan, coverage toggles
and the current lane-to-slot control path. Reuse Throwline's canonical
`three-d-stage` viewer and its pinned local three.js modules. Projctl supplies
a transient model from the validated private drawing; it does not import a
Throwline job, modify either app's saved state or run catalog optical calculations.

The adapter aligns front elevation and plan coverage at lane C's reference width.
Coordinates are diagram units, y up, x audience right and z toward the balcony.
Plan projector positions and coverage edges remain authoritative drawing inputs;
mounting heights are illustrative because the supplied two-view format lacks
elevation data. State that limitation beside the viewer. Do not present throw
ratios, distances, fit verdicts, field verification or model exports.

ECP-1.0 revision 1.0: the viewer owns graphics and inert object activation;
Projctl owns private plot data, stable lane IDs, current slot mapping and every
physical command. Activation carries a context and instance ID, and only an
exact current lane can open the existing guarded dialog. Camera drags must not
activate a projector. Native lane cards provide keyboard and touch alternatives.

Keep the model lazy, render on demand, suspend while its tab is hidden, dispose
on page exit, and expose the two-dimensional views when WebGL is unavailable.
Serve a strict allowlist of canonical viewer files through the local relay;
standalone installations package those same bytes outside the public directory.
No new dependency version, network authority, rig schema or plot schema.

Acceptance: real 3D pixels, orbit/zoom/reset, colored faces and crossed throw
volumes, direct model activation and current-slot targeting, no commands from
inspection, layer/status/lock parity, no idle or hidden draws, context recovery,
dependency failure fallback, both themes and six viewport sizes. Run the
existing Throwline release/browser gates plus isolated Projctl tests. Physical
coverage and house-unit identity remain separate venue checks.

## Drawing-order numbering and Stage polish, November 7

Dave requested A=P1, B=P2, C=P3 and D=P4 and confirmed that only this control page uses the numbered addresses. The active backend is the Mac Studio. This explicit offline migration supersedes the earlier display-order-only restriction for that saved rig; editing lane metadata still never renumbers a device automatically.

PR 448 is merged with a guarded migration, set-facing Stage camera, live lane identity in reference views, and contained disclosure layouts. Dominic passed 95 unit tests and browser checks including beam framing, connected assignment updates, phone menus, history labels and zero navigation-triggered hardware writes. Public version 24 published the visual changes, retained by concurrent version 25. The simulator uses the new numbering.

Remaining: obtain working Studio access, back up its stopped rig, apply the reviewed migration and UI assets, then verify the same four physical-device identities under A/P1, B/P2, C/P3 and D/P4. Preserve projector settings, authentication, schedules, private geometry and the laptop installation. The live migration and Studio visual acceptance have not yet occurred.
