# Projector health reports

Status: brief accepted 2026-11-12; first slice implemented on the
`claude/projctl-health-reports` branch. Venue acceptance is still open.

## Problem

Projector temperatures, fan and alarm flags were checked by hand after the
2026-11-11 performance. Nothing records them during a show, so a unit running
close to its ambient limit is only noticed if someone happens to look.

## Outcome

The relay writes a health report on its own:

- **Power on:** 2 minutes after the first projector is seen lit (on or warming),
  so units switched on together land in one report. Any source counts: the
  controller, a preset, a schedule, OSC or the front panel.
- **Hourly:** on the hour while any projector is lit. An hourly report is skipped
  when another report finished in the previous 15 minutes.
- **Power off:** when a power-off command is about to be sent, the relay reads
  every reachable unit at that moment. The off command is never delayed. A batch
  power-off (all units, a preset or a schedule) produces one report.
- **Relay stop:** when the relay is stopping while a unit is lit, it writes a
  final report, capped at 6 seconds.
- **Manual:** `POST /api/health-reports/run` for acceptance checks.

Each report is saved on the relay machine and, when configured, added as one row
in a Notion database.

## Decisions (answered 2026-11-12)

| ID | Question | Answer |
| --- | --- | --- |
| HR-D1 | How reports reach Notion | The relay posts directly through the Notion API with an integration token stored on the relay machine. Local copies are kept when Notion is unreachable and retried later. |
| HR-D2 | What "before shutdown" means | Readings start at projector power-off, without delaying the command; plus a final report when the relay stops. |
| HR-D3 | Cadence | Power-on report, then hourly only while a projector is lit. |
| HR-D4 | Notion layout | One database row per report. |

## Report contents

- Title: `<title prefix> | YYYY-MM-DD HH:mm | <Kind>` in America/New_York time.
- Check window: when the readings started and finished.
- Findings: units flagged for temperature, fan or alarm; the unit with the least
  headroom; PJLink "other" or lamp, cover and filter warnings; units not reached.
- Follow-up: one line per thing to check, or "None".
- Page body: a unit table (slot, lane, model, address, power, intake or ambient
  temperature, rated limit, headroom, internal temperatures, flags, light hours,
  last contact) and the controller events since the previous report.

Slots are internal relay IDs. Every row also names lane, model and address,
because production paperwork numbers the projectors differently.

### Readings (read-only)

| Driver | Readings |
| --- | --- |
| Panasonic native | `QTM:0` (intake air), `QTM:1`, `QTM:2` (internal; sensor names unconfirmed). Replies are `°C/°F` pairs. PJLink `ERST` flags come from the normal poll. |
| Barco Pulse | `environment.temperature.ambient_outside.value` and `environment.alarmstate`. |
| PJLink only | `ERST` flags from the normal poll; no temperatures. |

Readings are taken only when a report runs, never on the 5-second status poll.
Each unit's reading is limited to 12 seconds; a unit that does not answer is
listed as not read.

### Flags and limits

- **Flag:** PJLink temperature or fan status above 0, or a Barco alarm state
  other than `Ok`.
- **Watch:** headroom (rated maximum ambient minus the intake or ambient
  reading) at or below `watchHeadroomC`, default 5 °C.
- Rated ambient defaults by model: Barco UDM 4K22 40 °C, Panasonic PT-RZ970
  45 °C, PT-DW830 series 45 °C. Override per slot in the settings file, for
  example 40 °C for units hung in portrait.

## Settings

`health-reports.json` beside the active rig file. It is private and not
supplied by the application. Without it, reports are still saved locally.

```json
{
  "enabled": true,
  "titlePrefix": "Frozen | Projectors | Health Log",
  "notion": { "databaseId": "<database id>" },
  "ratedAmbientC": { "P3": 40, "P4": 40 },
  "watchHeadroomC": 5
}
```

The Notion token is never stored in this file or logged. The relay reads it from
the `PROJCTL_NOTION_TOKEN` environment variable or, on macOS, from the login
Keychain item with service `projctl-notion` and account `health-reports`. Create
a Notion internal integration, share the database with it, then store the token
once on the relay machine:

```bash
security add-generic-password -U -s projctl-notion -a health-reports -w
```

The database needs the properties `Log` (title), `Check window` (date),
`Findings` (text) and `Follow-up` (text).

## Storage and API

- Reports are saved as JSON and Markdown in `health-reports/` beside the rig
  file. The newest 500 are kept.
- A report whose Notion write fails with a network error, a rate limit or a
  server error, or with no token yet, stays pending and is retried every 10
  minutes for up to 7 days.
  Other refusals, such as a wrong database or a missing share, are recorded as
  failed and need fixing in Notion.
- `GET /api/health-reports`: engine state, Notion configuration state, next
  hourly time and the 20 newest report summaries.
- `POST /api/health-reports/run`: takes a manual report now and returns its
  summary.
- Both use the same authentication as controller state.

## Smallest useful slice (this change)

Triggers, readings for the three drivers, local reports, the Notion writer with
retry, the two API routes and tests. No operator-page panel.

## Exclusions

- No full Barco sensor sweep (laser banks, DMD, FPGAs, fans); only ambient and
  alarm state.
- No temperature trend logging between reports, and no alerting.
- No settings changes on any projector. No power command is sent or delayed.
- No operator-page panel; reports are read in Notion or the saved files.

## Dependencies

- A Notion integration with access to the target database, and its token stored
  on the relay machine.
- Internet access from the relay machine for Notion. The projector network has
  no internet, so this depends on the venue uplink still open in the remote
  access brief. Until then, reports are kept locally and retried.

## Risks

- Panasonic units may refuse `QTM` in standby or cooling; those readings show as
  not read.
- The 40 °C portrait limit for the PT-DW830U is not confirmed from the operating
  instructions.
- A relay restarted while units are lit takes its first hourly report on the
  next hour; it does not write a power-on report for units already lit.

## Acceptance

1. With all units off, no automatic report is written.
2. Power on from the controller: one power-on report about 2 minutes later lists
   all four units with intake or ambient temperatures, limits and headroom.
3. On the hour with units lit: one hourly report.
4. Power off all units: one power-off report whose readings were taken as the
   command was sent; the units still power off without added delay.
5. With Notion configured, each report appears as one row in the database with
   title, check window, findings and follow-up filled in, and the unit table in
   the page body. With venue internet down, rows appear after it returns.
