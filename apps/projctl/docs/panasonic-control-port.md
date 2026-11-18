# Panasonic control-port fallback

Brief, November 18, 2026. Built and tested against stand-in servers. Not installed on a relay
computer. No power or shutter command has been sent to a real projector over this path.

## Problem

Some projectors answer one PJLink client at a time. When another controller (a playback app, for
example) holds that link, the relay gets no PJLink reply, so the projector reads as unreachable:
no power or shutter reading, no shutter or power command, no health report, and group actions and
power schedules skip it. On the current rig this is the normal state of the two lamp projectors for
the whole of every show.

The relay's Panasonic driver already uses the projector's own control port (TCP 1024) for test
patterns, lens, picture settings and temperature. Only power, shutter, input and alarm status go
through PJLink.

## Outcome

A Panasonic projector whose PJLink link is held elsewhere is still read and commanded by the relay
for power and shutter, over the control port. The other controller keeps PJLink. Nothing changes
for a projector whose PJLink answers.

## How it works

- **PJLink first.** While PJLink answers, status and commands are exactly as before.
- **Fallback.** When a PJLink status read fails and the control port answers, the driver reads power
  (`QPW`) and shutter (`QSH`) there, and marks the status `controlLink: "control-port"`.
- **Commands follow the link.** While on the control port, power is `PON` / `POF` and shutter is
  `OSH:1` / `OSH:0`. A command is sent once, on one link, after the relay's usual write guard.
- **Warming and cooling.** The lamp control status query (`Q$S`) separates warming and cooling from
  on and off. A model that refuses the query is not asked again, and on and off still stand.
- **Back to PJLink.** Every five minutes the driver reads the control port first, so feedback stays
  fresh, then tries PJLink once. If it answers, status and commands return to PJLink.
- **Neither link answers.** The poll fails as it does today. No old reading is returned.

## What is not read on the control port

Input, the PJLink alarm summary, light hours and the projector name come back as not reported
(`null`) while the control port is the status link. They are never guessed or carried over. Input
selection stays a PJLink command, so "Reset to HDMI" on such a projector fails with the PJLink
error until PJLink is free. Web diagnostics and temperature are unaffected.

## Rules, data and interfaces

- No rig, preset, schedule or cue format change. No new setting: the fallback is automatic.
- Status gains one informational field, `controlLink` (`"pjlink"` or `"control-port"`). No page
  needs it. Existing pages show the readings as they would for any reachable projector.
- `panasonicDriver` gains test-only options (`pjlinkPort`, `pjlinkRetryMs`, `now`).
- Show Lock, stale-reply, offline and reviewed-target guards are unchanged; they sit above the
  driver.
- ECP-1.0 revision 1.0: Projctl remains the owner of physical commands. No equipment catalog or
  cross-app schema is involved.

## Evidence

- November 18, 2026, 5:05 PM: with the playback app running and holding PJLink, one read-only intake
  temperature query to a PT-DW830U through the installed driver was answered on the control port in
  112 ms. This shows the control port is reachable while PJLink is held.
- The shutter commands (`OSH`, `QSH`, 0 open and 1 closed) are listed for the PT-DW830 series in
  its operating instructions. `PON`, `POF` and `QPW` (000 standby, 001 on) are Panasonic's standard
  power commands. `Q$S` was not confirmed for this model, which is why it is optional in the driver.

## Verification

`node --test test/panasonic-control-port.test.js`, against stand-in PJLink and control-port
servers: unchanged behaviour when PJLink answers; fallback when PJLink is held or silent; commands
sent once on the control port after the guard; a refused guard writes nothing; warming, cooling and
off; a refused lamp query asked once; unrecognised replies read as unknown; the five-minute PJLink
retry and the return to PJLink; and a failed poll when neither link answers.

## Not tested

- Any real projector beyond the one temperature query above. `QPW`, `QSH`, `Q$S`, `PON`, `POF` and
  `OSH` have not been sent to the rig's projectors by this driver.
- How a real projector refuses a second PJLink client (closing at once, or staying silent). Both
  were simulated.
- A laser Panasonic on this path. It normally answers PJLink, so it normally never takes it.

## Acceptance on a rig, in order

1. With the other controller holding PJLink, the read queries only: the relay shows the projector's
   power and shutter and they match what is seen.
2. One shutter close and open from the relay, watched on the surface, outside a show.
3. One power off and on, watched, outside a show, with the usual cooling wait.
4. The other controller's own commands to that projector still work afterwards.

## Open decisions

| ID | Question | A (recommended) | B |
| --- | --- | --- | --- |
| PCP-1 | When is this installed? | In a released window outside a show, with one relay restart, then the acceptance steps above | Not for this run; keep the handheld remote for those projectors |
| PCP-2 | Should group power off include projectors on the control port? | Yes, once step 3 of acceptance has passed | No; keep them out of group power for this run |
