# Rig acceptance suite

## Brief

Operators need a repeatable, resumable record of display recovery, cueing,
preset recall, temperatures and shutdown. A passing software test cannot
establish physical acceptance. The smallest useful slice is a Python 3 command
line runner with private evidence files, saved progress and a Markdown report.
It reuses Frozen Screen Check and the relay's existing read endpoints.

The runner has no equipment command endpoint, EDID writer, MIDI sender or reboot
command. Operators perform approved actions in the owning application during a
released test window. Every disruptive observation needs a recorded release.
Every lane needs its own result. Previous failed attempts remain in the journal.
The overall result passes only when every required check passes.

ECP-1.0 revision 1.0 applies. This tool consumes existing relay snapshots and
Screen Check JSON. It introduces only its own version 1 evidence journal and
does not change either producer, device identities, show data or control routes.
Keep venue addresses, cue maps and evidence local. The synthetic FROZEN-1200
package remains separately owned and unchanged.

## Running

Python 3.9 or newer is required. Open Terminal on the production computer and
run `python3 suite.py menu` from the supplied acceptance folder. On first use,
choose a new results folder, the active relay URL, and the operator name.
The default results location is `~/Documents/Frozen Acceptance`.

The menu initializes a new run or resumes the selected run. It can capture
read-only evidence, record a released window, record a result, and rebuild the
report. Save and reopen the same results folder after restarting the Studio.
All paths are prompted and accept spaces. Report generation also runs after
each saved result. Ctrl-C exits without losing previously saved events.

The equivalent noninteractive commands are shown by `python3 suite.py --help`.
`init`, `capture`, `release`, `record`, `attach` and `report` require an explicit
`--run` directory. Authentication uses `PROJCTL_COOKIE` from the environment
when required. It is never written to the journal or report. Relay URL userinfo,
query strings and fragments are rejected.

## Required sequence

1. Capture `baseline`. Attach the original raw EDIDs, existing override files,
   BetterDisplay configuration export, and show-file backup. Record the
   `backup` result and physical lane/port/Millumin mapping before any change.
2. Use Screen Check on the Studio. Record the released window first, then label
   captures exactly `reboot before` / `reboot after`, `standby before` /
   `standby after`, `usb before` / `usb after`, or `hdmi before` / `hdmi after`.
   A MacBook display report describes the MacBook, even if its relay controls
   the Studio's projectors. The capture records its actual hostname and OS.
3. The window record includes the releaser's name, scope and expiry. Allowed
   events are MIDI, PJLink action, preset recall, shutdown, reboot, standby,
   USB reconnect and HDMI reconnect. Release is checked at result entry time.
4. Test MIDI and PJLink through the agreed show route. Record exact messages,
   ports, channels, cue numbers, destination and responses. Capture after each.
   Independent Millumin commands may not produce a relay power-off report.
5. Recall each agreed preset/look, witness the image, restore the show preset
   and record that restoration. Include the saved preset identity in evidence.
6. Check temperatures while lit. The runner reads report summaries only.
   A manual report can be requested in the owning relay, then captured here.
   Attach the full JSON/Markdown report from its saved location, and verify the
   expected units, readings, timestamps and faults. Record any active lamp or
   other fault as a failure or unresolved finding.
7. Exercise shutdown, wait for the device's actual cooling/standby indication,
   then the approved startup. Record exact order, elapsed time and states.
   Verify the real `power-off` or `relay-stop` report trigger and its timestamps.
   A manually generated report alone cannot pass `shutdown-report`.
8. Separately test Studio reboot/login, standby/wake, USB reconnect and HDMI
   reconnect. Capture before and after each. Require automatic recovery to
   four unscaled progressive 1920x1200 outputs and the 1920x1080 control screen,
   accepted refresh rates, original layout/rotation and correct show mapping.
   Both portal identities require a physical mapping witness. A manual repair
   is a failed automatic-recovery test. Record the failure, repair and retest.
9. Verify BetterDisplay login startup and protection settings on all projector
   outputs. Record the ATEN model, physical location, learned source and LED
   state per lane. Record retention independently of software protection.
10. Reopen the shutdown report and confirm its expected destination. Attach
    delivery/readback evidence. Finish with an operator sign-off on the show
    state. Rebuild `report.md` and retain the entire results folder.

Temperature passes require a report from this run with all four units reached
and zero flagged units. Shutdown-report passes require a current `power-off`
or `relay-stop` report. Delivery passes require a current shutdown report with
the relay's Notion publication state and URL, plus the operator's readback.
Attach full report files as well as snapshots to retain individual temperatures.

Use `not_tested` when a stage is deferred. `fail` and `not_tested` keep the
overall report from passing. A recorded pass is an operator attestation with
linked evidence, never inferred from an HTTP response or a file's existence.

## Evidence and recovery

Snapshots contain `/api/health`, `/api/state`, `/api/health-reports`, and each
slot's cached `/api/display-info`. These are read-only GET requests. Collection
failures remain visible. A local Screen Check CLI invocation uses its explicit
production profile when available; missing executables and profiles are errors.
The runner does not use the relay host's desktop as Studio display evidence.
API fields whose names indicate credentials are redacted before saving.

Each attachment is copied with a SHA-256 hash. Journal entries are append-only,
written atomically under a per-run lock. Concurrent writers are rejected.
Copy the entire folder for handoff. Do not edit `run.json` during a run.
Keep machine configuration backups private and inspect attachments for secrets.

If an event fails, stop the sequence, record the failure, restore the captured
configuration through BetterDisplay/Millumin, and capture the recovered state.
Use the separately prepared EDID handoff for override rollback. A later pass
supersedes the result in the summary while retaining earlier failures.

## Verification

Run `python3 -m unittest discover -s apps/projctl/tools/acceptance -p 'test_*.py'`.
Tests use a temporary local fixture server and fake Screen Check. They must
exercise missing evidence, expired release, simulation, interrupted writes,
resume, credential redaction and GET-only collection. Venue, macOS executable,
actual cueing and physical recovery acceptance remain separate live checks.
