# Projector control readiness

## Scope

Repair input selection and motor completion feedback, expose device-supported picture
settings, and refine the operator interface with a restrained Frozen palette. Preserve
rig files, credentials, presets, slot IDs, cue addresses and existing confirmation gates.
No new dependency or runtime is required. Projctl remains the physical-command owner
under ECP-1.0 revision 1.0; no equipment catalog or cross-app schema changes are involved.

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
