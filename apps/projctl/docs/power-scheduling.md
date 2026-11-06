# Power scheduling

Schedules are private operational settings in `power-schedules.json`, beside the
active rig, with durable occurrence claims in `power-schedules.json.claims/`.
They do not rewrite the rig or its credentials, assignments, inputs or presets.
No real schedule is supplied by the application.

Use an explicit name, assigned projector slots, on/off action, weekdays
(Sunday=0 through Saturday=6), `HH:mm` and `America/New_York`. Saving or editing
always disables the schedule. Enabling is a separate explicit action and does
not execute a command immediately. Overlapping enabled schedules for the same
target/day/time are rejected. Targets are fixed and identity-checked; assignment
changes require review and resaving. Newly assigned devices are never added to
an existing group implicitly.

An enabled schedule is advance authorization for that power action, subject to
current feedback and safety guards. Power off still respects Show Lock; power on
retains existing Show Lock semantics. Offline, stale-feedback, busy, cooling or
changed targets are skipped. An acknowledgement is a command response, not proof
that a projector completed its power transition. Check live telemetry and image.

The relay claims an occurrence durably before dispatch. A schedule fires at most
once per local date; repeated fall-DST times use the first occurrence only, and
nonexistent spring-DST times are skipped. New activation never catches up the
current or an older minute. Startup, interrupted claims, delayed ticks or sleep
produce skipped/interrupted audit records, without replaying overdue power off
or retrying failed targets. A backward clock pauses scheduling until the last
observed time. The normal dispatch window is three seconds; queued targets that
become late are skipped. The supervisor is a login service: computer sleep,
login/reboot, network and hardware acceptance still need testing on the actual
crew machine.

API (same authentication as controller state):

- `GET /api/power-schedules`: engine status, timezone, schedules, next-run and
  next-planned timestamps, target-change flags, last runs and bounded audit.
- `POST /api/power-schedules/save`: `{id?,name,slots,action,days,time,timeZone}`.
  The result is disabled; `enabled:true` in a save is rejected.
- `POST /api/power-schedules/enable`: `{id,enabled:boolean}`.
- `POST /api/power-schedules/delete`: `{id}`.

CRUD responses return the full view. Snapshots contain `powerSchedules`; live
changes broadcast `{type:'powerSchedules',schedules:view}`. Audit outcomes include
claimed, acknowledged, skipped, failed, partial and interrupted. Settings changes
also appear in the separate scheduling audit. Missing/unreadable scheduling
storage disables this feature while retaining controller access; no raw saved
JSON fragments are logged. No immediate power command is sent by saving, enabling, editing, loading the
page or installing the software; an explicitly enabled schedule may act at its
future due time if every safety guard passes.
