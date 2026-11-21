# Show Mac status reports

Each show Mac's checks app ([Frozen Startup](../../frozen-startup/README.md)) sends a small status report
to this relay about once a minute. The relay keeps the latest report per Mac in memory, and the Frozen
Monitor's [Rig page](frozen-monitor.md) shows one tile per Mac: green, red or stale, the last report time
and the failing check by name. This page is the contract for that endpoint.

Status: built offline and tested on the simulator (Phase 1). **Not installed on the Studio.** It reaches the
venue in the relay release of Phase 5, in a downtime window with the relay restart (see
[Install](#install)).

## What it does and does not do

- A report is **stored, never acted on.** Accepting one writes to an in-memory table and nothing else: no
  projector command, no event in the command log, no Show Lock change. `test/mac-status-relay.test.js`
  proves this on the simulator.
- The Rig page tiles only read. A fault is a red tile and nothing more: no sound, no notification, nothing
  on the projectors (decision MF-2, option A).
- The relay holds reports in memory. A relay restart clears them; the tiles read "No report" until each
  Mac's next report, at most a minute later.
- The stale window is three minutes by the relay's own clock (`PROJCTL_MAC_STALE_MS`, default 180000). A
  Mac with a wrong clock cannot look fresh: the relay stamps arrival, and shows the Mac's own report time
  beside a clock-skew note when they differ by more than two minutes.

## Routes

| Route | Who may call it | What it does |
| --- | --- | --- |
| `POST /api/mac-status` | The status token, or a signed-in session | Validates and stores one report. Body is JSON, at most 16 KiB. |
| `GET /api/mac-status` | A signed-in session only | The latest report per Mac, with age and stale flag. The Rig page reads this every ten seconds. |
| `GET /api/mac-status/projectors` | The status token, or a signed-in session | Per projector: slot, lane, online, replying now, power, shutter, last reply time. No address, credential or serial. The M5's own check reads this. |

Every route sits on the relay's existing listener, so it answers only where the relay already answers
(the tailnet and the venue LAN). It adds no listener and no port. The browser origin check on `/api/` still
applies: a page from another origin gets 403 even with the token.

## Credentials: the status token

`PROJCTL_STATUS_TOKEN` is a separate, write-only credential for the show Macs, so the controller passcode
never has to be copied onto them. It is at least 24 characters with no spaces, and it opens exactly the two
routes marked above. It does not open the controller, the API, the Monitor pages, `GET /api/mac-status` or
anything else. A wrong token backs off per client (its own throttle, apart from passcode sign-in). A token
that is too short is ignored with a log line; it never stops the relay.

Without a passcode the relay is open on the LAN as before, and reports are accepted without a token.

Each Mac keeps the token in a file readable only by its owner (`chmod 600`); the checks app refuses a
token file with wider permissions and says why in its window. The profile names the file, never the token.

## Report schema

`frozen-startup.status-report.v1`. Strict: unknown fields are refused, and what is stored is exactly what was
checked. The example the tests use is [`test/fixtures/status-report.example.json`](../test/fixtures/status-report.example.json);
the Mac side's tests check that what it builds matches it.

| Field | Type | Notes |
| --- | --- | --- |
| `schema` | string | `frozen-startup.status-report.v1` |
| `host` | string | Short lowercase label, for example `m5` or `m1`. At most eight Macs are kept. |
| `hostName`, `role` | string, optional | Display name (80 characters) and a label such as `projectors` or `pixel-strips`. |
| `phase` | `startup` or `watch` | |
| `state` | `running`, `ok` or `fault` | `ok` cannot include a failing check; `fault` must name one. |
| `reportedAt` | ISO 8601 | The Mac's own time. |
| `execution` | `mac` or `offline fixture` | A relay outside practice mode refuses `offline fixture`, so a demonstration cannot appear as a Mac. |
| `runID`, `cycle`, `intervalSeconds` | optional | Run identity, watch cycle number, and the Mac's check interval. |
| `checks` | 1 to 24 objects | `id`, `label`, `status`, `observed` (240 characters). |
| `message` | string, optional | One short line. |

Check `status` is `PASS`, `FAIL`, `CHANGED`, `WARN`, `NOT CONFIGURED`, `NOT RUN` or `RUNNING`. Only `FAIL`
is a fault. `CHANGED` is how a saved show file is reported ("changed", not a fault) and `WARN` is a note such
as elevated memory pressure; both show as a quiet line on a green tile. `NOT CONFIGURED` means the profile
does not switch that check on; it is never shown as a pass.

## Install

Nothing here is installed by this change. In the relay release (Phase 5, the Studio downtime window):

1. Create a random token of at least 24 characters. Save it, `chmod 600`, on each reporting Mac, and name the
   file in that Mac's Frozen Startup profile (`watch.report.tokenFile`).
2. Set `PROJCTL_STATUS_TOKEN` in the relay service's environment and restart the relay (outside a show).
3. Read back `/monitor/rig.html` from the venue network: both tiles say "No report", then go green as each
   Mac's checks app reports.

Using the tailnet address for the m1's `watch.relay.url` keeps its token inside Tailscale's encrypted tunnel.
The venue LAN carries plain HTTP.

## Related open questions (Projctl board)

This endpoint rides the relay's existing exposure and does not widen it. These decisions stay open and
interact with it; this change does not answer them:

- **NET-2** (which networks the Projctl web page answers on). Reports answer wherever the page does. If NET-2
  binds the web server to named interfaces, the Macs' `relay.url` must be one of them.
- **NET-3** (whether plain HTTP is acceptable on the crew networks). The token travels in clear text on the
  venue LAN. Over the tailnet it is encrypted. Option A of NET-3 is compatible; option B (HTTPS) would need
  the Macs to trust the certificate.
- **CUE-1** (the cue ports accept commands from any device, with no sign-in). Unrelated to reports, which
  trigger nothing, but a device that can reach the relay can reach the cue ports as well, so the status token
  is not the weakest control on the relay.

Decisions this change was built to the recommended option for: **MF-1 A** (each Mac reports to this relay;
the Rig page only displays), **MF-2 A** (red tile only), **MF-3 A** (pixel output: interface up and a ping to
each controller, never data). Two smaller choices made along the way are listed in the pull request: a
write-only status token instead of the passcode (MF-4), and whether projector power is a fault or only
reported (MF-5).
