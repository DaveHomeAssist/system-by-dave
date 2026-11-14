# Frozen Monitor

The Frozen Monitor is a six-page, read-mostly view of the Frozen projection system, served by the
projctl relay at `/monitor/` (for example `http://localhost:8080/monitor/` on the relay computer).
It implements the [Frozen Monitor design canvas](https://claude.ai/code/artifact/0281f22f-caf3-4cc2-bc4a-294697c12eb6)
(November 14, 2026) with projctl's own components: `avd/tokens.css`, `avd/bundle.css`, the
`app.css` header, tile and lane styles, and the relay's WebSocket snapshot.

## Problem and outcome

During tech and the run, the people watching projection need one place that shows what the four
projectors report now, what the records say about the rig, how cues reach Millumin and the
projectors, today's calls, and the open acceptance checks, without opening the controller and
without risking a command. The monitor gives them that place. Lighting still fires the cues and
Millumin still sends power and shutter; the monitor does not take over either job.

## Pages

| Page | Live from the relay | Recorded (dated, in `monitor-data.js`) |
| --- | --- | --- |
| Monitor (`index.html`) | Per-lane state, input, signal, shutter, reply age, intake air and heat; a lamp error when the relay reports one; the command log; health-report timing; Show Lock | Alerts from the Nov 12–13 records, the theatre checklist, lane identity, lamp notes labeled `Recorded:` with their snapshot date |
| Cues | Show Lock on the relay node; which slot each lane uses | Cue path, cue map, listener forms (from `server/osc.js`), checks |
| Rig | Addresses, controller slots, model, Show Lock, power schedules, Stop lens | Lanes, lenses, plotted rasters, acceptance grid, power notes |
| Network | Projector addresses and state, this relay's address, poll interval | Control and picture maps, device details, link health |
| Notes | Shared team tasks (public Frozen workspace service) | Documents and Notion records |
| Calendar | — | `workspace/tech-schedule.json` (the Planning calendar's file), milestones |

Where the relay has not reported a value the page says so (`Not reported`, `No reading`,
`Relay offline`); it never fills a gap with a sample. When the relay is unreachable every lane
reads `Relay offline`, Show Lock reads `unknown`, and only recorded facts remain.

## Commands

The monitor sends one command: **Stop lens** on the Rig page, for the selected lane, through
`POST /api/command` with `{ cmd: 'lens', arg: { op: 'stop' } }`. The relay rechecks the target at
the write and allows Stop under Show Lock, as in the controller. It is enabled only while the relay
is connected and that projector is replying. Every other control on the Rig page is a disabled
mirror; lens, pattern, input and power changes stay in Projctl. The header's Show Lock pill is a
status, not a switch.

## Data, storage and privacy

- Theme: `projctl.monitor.theme.v1` (`light`, `dark`, `deep-freeze`). A fresh browser follows
  Projctl's saved light or dark choice (`projctl.ui.v1`), otherwise light. Deep Freeze is a new,
  monitor-only palette in `monitor.css`.
- Personal notes use `wst.frozen.personal-notes.v1`, the key Projctl's Notes panel already uses on
  the same relay origin, so both show the same notes. They stay in that browser.
- Shared tasks use `https://wst.housevideo.app/api/tasks`, the same public list as the workspace.
  The monitor can add and complete tasks; editing and deleting stay on the shared board.
- No private network address is written into the source: this repository is public. Projector
  addresses come from the relay at run time; the Studio relay and lighting-network addresses link
  to the project hub. `test/static-serving.test.js` fails if a private address appears in
  `public/monitor/`.

## Layout

Each page carries the repository's full head (canonical, Open Graph and Twitter Card) at the relay's
local identity, `http://localhost:8080/monitor/`, with `noindex, nofollow`.

Every page is viewport-locked: the page never scrolls (WEB-2) and long panels scroll inside
themselves. Below 1100 px the columns stack inside the page body; at 680 px and below the six
sections move to a bottom rail with 44 px targets and the header compacts. Styles live in
`monitor.css` as classes so the pages run under `style-src 'self'`; there are no inline styles.

## Relay change

Requesting a folder (for example `/avd/`) used to throw inside the static handler and stop the
relay process. Folders now serve their `index.html` (so `/monitor/` works), `/monitor` redirects to
`/monitor/`, a folder without an index returns 404, and file read errors end only that response.

## Verification

- `npm test --prefix apps/projctl` includes `test/static-serving.test.js` (folder serving,
  redirects, relay survival, no inline styles, no private addresses).
- `npm run test:browser --prefix apps/projctl` includes `test/monitor-browser.cjs`: live state on
  the simulator relay, Show Lock, inspector selection, theme memory, Stop lens accepted under Show
  Lock, the picture map, notes storage, shared tasks from a fixture (no request reaches the public
  task service), the calendar, all six pages without page scroll at 1440×900, 1024×768, 680×900 and
  375×812, and the offline view.

## Not included

- No entry link inside the controller UI yet; open `/monitor/` directly.
- No new relay API. The monitor reads the existing snapshot, events and health-report summary.
- Acceptance results are not recorded here; the grids show the crew workbook's empty state.
- Physical acceptance on the theatre relay remains open until the monitor is installed with the
  next venue update and read back there.
