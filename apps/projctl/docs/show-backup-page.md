# Show backup page

Brief for the second version, November 18, 2026. The first version (a go or no-go strip, four
lanes and a guarded shutter) is on its own pull request and its four page files were copied to the
show computer's relay on November 18. This version is built and tested in the simulator only.
Nothing in it has been installed or run against a rig.

The page is now for two people who share it: the **show backup operator** at the lighting
position and the **designer**. Scope set by the owner on November 18: both can run a setup check,
run a MIDI test from the console independently of that, and power the projectors on and off and
move their shutters; both get diagrams and the most useful documents close by. The same on and off
control is to appear on every role page.

Options marked "recommended" below are proposals. The defaults this build uses where the owner has
not answered are listed under [Open decisions](#open-decisions).

## Problem

During a run the people backing up projection are not at the projection computer. The first
version let them watch and close a shutter. Three gaps showed up straight away:

- **They could not bring the rig up or down.** Power stayed with the video lead and the main
  console, which also carries test patterns, lens, schedules and Setup: more than is safe to hand
  over.
- **Nobody could tell whether a console cue reached the show computer.** The lighting console
  triggers the playback app directly over MIDI Show Control. That traffic does not pass through the
  relay, so "the cue did nothing" could not be split into "it never arrived" and "it arrived and
  playback ignored it".
- **The documents that explain the rig were somewhere else.** Signal flow, recovery steps and the
  cue list lived in files on other machines.

Two facts about the rig still shape what the page may claim:

- While the playback app is open it holds the PJLink link to the two lamp projectors. The relay
  now reads and commands those two on the projector's control port instead (see
  [the control-port brief](panasonic-control-port.md)). That link is new: power and shutter over it
  have been tested against stand-in servers, not yet proven on a rig.
- A cue that arrives is not a picture that follows. The page can see the first and not the second.

## Outcome

One page, served by the relay at `show.html` behind the existing sign-in, with the go or no-go
strip always on top and four tabs under it:

| Tab | For | Sends |
| --- | --- | --- |
| **Control** | Power on, power off, shutter open and shutter close, per lane and for all lanes | `POST /api/command`, `power` and `shutter` only |
| **Setup check** | One press: a list of pass, fail or cannot check, each with its reading | Nothing |
| **MIDI test** | Wait for the console's test cue and say whether it arrived | Nothing. This build never sends MIDI |
| **Know** | Diagrams and documents from a private folder on the relay computer | Nothing |

## Go or no-go strip

A headline and four items, on every tab. Each item has a state word and a mark as well as a
colour, and opens a short explanation of where its reading comes from and what the page cannot
tell.

| Item | Read from | Reads OK when | Cannot tell |
| --- | --- | --- | --- |
| Lanes lit | The relay's projector snapshot | Every lane has a current reply saying power is ON, with no alarm | Whether light reaches the surface |
| Outputs | `GET /api/host-displays` | One display is flagged main and there is at least one more per assigned lane, read within two minutes | Whether the playback app has a fullscreen window on each output; which display feeds which lane |
| Cue link | `GET /api/cue-feed` (the listen-only observer) | The listener's heartbeat is current. The item also shows the last cue received and its time | Whether the playback app followed the cue |
| Show computer | The relay's five-second heartbeat | A heartbeat arrived in the last 15 seconds | Lock screen, display sleep, whether the playback app is open |

State words: **OK**, **Check by eye**, **Attention**, **No reading**. With no cue feed configured
the cue item reads "Not connected", as before, and the headline cannot read "All reported good".

## Control

One shared component (`projector-control.js`, `projector-control-model.js`,
`projector-control.css`) draws a card per lane and one "All lanes" card. Another role page can
mount the same component: it takes the relay snapshot and a function that posts a command, and it
contains no page-specific code.

**Each lane card shows** power, shutter, input, test pattern and reply age, any alarm the projector
reports, and which link carries the lane: PJLink, the control port, the Barco API or the simulator.
A lane on the control port is tagged "unproven" until the rig acceptance steps in the control-port
brief pass. Input and pattern are read only. They are there so a blue "no signal" picture can be
explained: a wrong input and a test pattern left on both show up as a flagged line.

A lane the relay is not reading shows **CHECK BY EYE** and the time of its last reply. Last known
values are never shown as readings.

**Four actions per lane**, each in two steps:

| Action | Offered when the current reply says | First step | Second step |
| --- | --- | --- | --- |
| Power on | Power OFF | Arms on the page, sends nothing | Confirm inside 6 seconds |
| Power off | Power ON or WARMING | Asks the relay, which checks the target and returns a one-use confirmation. Nothing reaches the projector | Confirm inside the relay's 3 seconds |
| Shutter open | Power ON and shutter CLOSED or not reported | Arms on the page | Confirm inside 6 seconds |
| Shutter close | Power ON and shutter OPEN or not reported | Arms on the page | Confirm inside 6 seconds |

The confirm ignores its first 600 ms, so a double tap is not two steps. Cancel, Escape, a timeout
or the reading changing while armed all withdraw it. Every command carries the reviewed target
revision, so a projector that was swapped or re-addressed after the page drew it is refused before
anything is sent. After the relay accepts a command the card waits for the projector's own report
and says "Reported …" only when that arrives.

**Refusals stay on the card.** A blocked action says why when it is tapped, and carries the reason
in its accessible name. A refusal
from the relay or the projector is shown in the relay's own words with the time, and stays until
the next action on that lane. No answer at all is worded differently from a refusal, because the
command may have left before the reply was lost.

**All lanes.** The same four actions for every lane at once. The first step lists exactly which
lanes will get the command and which are skipped, with the reason for each skip. The second step
sends one command per listed lane, each with the same guards as a single-lane action. The result
is reported per lane. There is no group target in what the page sends.

## Setup check

One button. It runs the list below against what the relay holds at that moment and shows each line
as **pass**, **fail** or **cannot check**, always with the reading. A line with no rule to judge it
against (which link carries a lane, the Show Lock state) is shown as a plain reading and counted in
neither column. A guess is never shown as a pass.

| Line | Pass when | Cannot check when |
| --- | --- | --- |
| Relay | Heartbeat inside 15 seconds | Never: no heartbeat is a fail |
| Lane reachable (per lane) | The relay holds a current reply | No projector is assigned |
| Lane power | Reads ON | The lane is not reachable or power is not reported |
| Lane input | Equals the rig's preferred input | Not reported (the control port does not report it) or no preferred input resolves |
| Lane shutter | Reads OPEN | Not reported |
| Lane test pattern | Reads off | Not reported, or the driver has no pattern reading |
| Lane link | Reading only | |
| Displays | One main display and at least one more per assigned lane; the reading lists count, main, order and modes | The reader is off (simulation), unsupported or failed |
| Cue listener | Heartbeat inside 90 seconds | No observer file is configured |
| Show Lock | Reading only | |
| Playback app running with its fullscreen outputs | A host check provider says so | No provider is configured (today) |
| MIDI interface present | A host check provider says so | No provider is configured (today) |
| Computer awake and unlocked | A host check provider says so | No provider is configured (today) |

The last three are things the relay cannot see yet. `server/host-checks.js` defines a small
provider interface for them: a provider is an object with an `id` and a `read()` that returns
`pass` or `fail` with a reading and a time. One provider ships, a report-file reader: a helper on
the relay computer writes a small JSON report, and the relay reads it and treats a report older
than two minutes as "cannot check". No helper exists yet, so all three lines read "cannot check".

## MIDI test

Nothing in this build sends MIDI. The test watches for a cue the operator fires from the console.

1. The operator taps **Start MIDI test**. The page notes the newest message the listener has seen.
2. It waits up to 30 seconds for a Show Control GO for cue **999** that is newer than that.
3. **Pass:** it shows the time and the source the cue arrived from, and reminds the operator that
   an arrival is not a picture: if nothing appeared on the surfaces, look at the playback app.
4. **Timeout:** nothing arrived, so the fault is on the console side: the console's cue, the
   cable, or the MIDI interface.
5. After a pass it waits up to 60 seconds for the clear cue **999.5** and says whether it came.

"Last cue received" is shown at all times while the feed exists, on this tab and in the strip.

**Source of truth.** A listen-only observer on the relay computer appends JSON lines to a file.
The relay reads that file from a path in its private settings; the path is absent by default, and
then this tab and the strip item say "not connected". Row shapes the reader accepts:

```json
{"type":"midi","hex":"f07f03","length":3,"direction":"incoming","name":"<source name>","endpoint":2666519,"unixSeconds":1795049476.12,"utc":"…"}
{"type":"heartbeat","unixSeconds":1795049480.0,"sources":2,"destinations":2}
{"type":"source_added","name":"<source name>","unixSeconds":1795049400.0}
```

One Show Control message arrives as several consecutive `midi` rows whose `hex` fragments join
into `f0 7f <device> 02 <format> <command> <cue ascii> 00 <list ascii> f7`. Command `01` is GO.

The reader (`server/cue-feed.js`) handles:

- **Fragments.** Rows are joined per endpoint from `f0` to `f7`. An unfinished message is dropped
  when a new one starts, when it grows past 512 bytes, or when the file changes.
- **A stale file.** No row for 90 seconds means "listener stopped", which is not the same as "no
  cue". A test cannot start while the listener is stopped.
- **A truncated last line.** A line without its newline is held and finished on the next read. A
  complete line that is not valid JSON is counted and skipped.
- **Rotation.** The setting may name a file or a folder. For a folder the reader follows the
  newest `.jsonl`, `.ndjson` or `.log` file in it. A file that is replaced or shrinks is read again
  from its start. Only the last 256 KB of a file is read on first sight.
- Only `incoming` rows count. Outgoing rows and non Show Control messages are ignored.

## Know

A list of diagrams and documents with a viewer beside it. The relay serves them from a private
folder on the relay computer, named by a path in its private settings, to signed-in devices only.
The folder holds a `manifest.json`:

```json
[{ "title": "Signal flow", "file": "signal-flow.svg", "kind": "diagram", "audience": ["show-backup", "designer"], "order": 1 }]
```

- `kind` is `diagram` or `doc`. `audience` is any of `show-backup`, `designer`, `power`. This page
  asks for the first two.
- Only files named in the manifest are served, only from inside the folder (after resolving
  symbolic links), and only these types: `svg`, `png`, `pdf`, `md`, `txt`, `json`. A path with `..`,
  a leading `/`, a backslash or a hidden segment is refused. Files over 25 MB are refused.
- Files are served with `nosniff` and a locked-down content policy, so an SVG cannot run script.
- **Diagrams** (`svg`, `png`) open large in the tab with zoom in, zoom out, fit and actual size,
  and pan by dragging or scrolling inside the viewer. **Documents** (`md`, `txt`, `json`) are shown
  as plain readable text; nothing in them is run as markup. A `pdf` opens in a new tab in the
  browser's own viewer.
- With no folder configured the tab says so. In simulation it shows the invented sample set in
  `apps/projctl/samples/know/`, labelled as samples.

The optional crew notes link from the first version now lives on this tab, with the same caption:
for notes that can wait, not for emergencies or cue calls.

## Private settings

One new private file beside the rig, `host-paths.json`, in the settings folder that survives an
update. Every key is optional and each value is an absolute path on the relay computer:

```json
{ "cueObserver": "/path/to/observer.jsonl or folder", "knowFolder": "/path/to/folder", "hostChecks": "/path/to/report.json" }
```

No path, host name or file from a real venue belongs in this repository. The samples and the test
fixtures are invented.

## Shared sign-in

Both people use the one existing passcode. The relay records each command and its time, not who
sent it, and the page says so beside its title. Until role passcodes exist (ACCESS-1 in the
[power operator page brief](power-operator-page.md)) the same passcode also opens the main console.

## Dropped from this build

- **Call for help with a snapshot**, and with it any contact line. The owner asked for it to be
  left out of this build. The snapshot text and the message link are gone from the source.
- Nothing else was removed. The crew notes link stays.

## What it must not do

- No input, test pattern, lens, picture, preset, schedule, Setup, discovery or Show Lock control.
  The page source contains one write route, `api/command`, used for `power` and `shutter` only, and
  a test fails if that changes.
- No MIDI output of any kind. No show file, playback app or display control.
- No value shown as a reading unless the relay's reply behind it is current.
- No address, name, phone number or passcode in the source.
- No request to any host other than the relay.

## How Show Lock, stale and offline are respected

| Condition | Page | Relay |
| --- | --- | --- |
| Show Lock on | Per-lane shutters stay available. Power, every "All lanes" action, the MIDI test and the setup check are locked, each with the reason shown | Blocks power off, input, pattern, picture and lens. Allows shutter both ways and power on |
| Reply older than 15 s | Lane reads CHECK BY EYE; all four actions blocked | Refuses everything except shutter close |
| Projector not reached | Lane reads CHECK BY EYE; actions blocked | Refuses any command to it |
| Relay not answering | Every lane reads CHECK BY EYE; Show Lock reads unknown; everything blocked | Not reachable |
| Projector reports COOLING | Power on blocked with that reason | Refuses power on |

Where the page and the relay differ, the page is the stricter of the two.

## Layout

One viewport, no page scroll (WEB-2), light by default with Dark and System from the shared
appearance menu (WEB-1). Tabs sit along the top on a tablet or laptop and in a bottom rail on a
phone. The strip stays above every tab. On a phone or a short screen the Control tab shows one
card at a time, chosen with an A, B, C, D, All picker that also carries each lane's state, and the
MIDI test keeps its result, steps and button on the card and moves the longer explanation behind
"What this means". Four panels scroll inside themselves, because their content is inherently long:
the setup check results, the recent MIDI messages, the Know list and the Know viewer. An ultrawide
screen gives each tab real columns: the all-lanes card beside the four lanes, the cue feed beside
the test, and a wider documents list (WEB-3).

## Interfaces and shared files

The page reads `GET /ws`, `GET /api/host-displays`, `GET /api/crew-links`, `GET /api/cue-feed`,
`GET /api/host-checks`, `GET /api/know`, `GET /api/know/file` and (after a lost connection)
`GET /api/state`, and writes `POST /api/command`.

New relay routes, all read only and behind the existing sign-in:

| Route | Answers |
| --- | --- |
| `GET /api/cue-feed` | Listener state, heartbeat age, sources, the last cue and the most recent messages with a running sequence number |
| `GET /api/host-checks` | The three host checks with `pass`, `fail` or `cannot-check`, a reading and a time |
| `GET /api/know?audience=…` | The validated manifest entries for those audiences |
| `GET /api/know/file?f=…` | One file named in the manifest |

New files: `public/projector-control.js`, `projector-control-model.js`, `projector-control.css`,
`public/show-know.js`; `server/host-paths.js`, `cue-feed.js`, `host-checks.js`, `know-folder.js`,
`show-routes.js`; `samples/know/`; `test/cue-feed.test.js`, `know-folder.test.js`,
`host-checks.test.js`, `projector-control.test.js`. Changed: `public/show.html`, `show.js`,
`show-model.js`, `show.css`, `test/show-backup.test.js`, `test/show-backup-browser.cjs`, this brief.

Shared files touched: `server/index.js` (three added lines: one import, one line that builds the
route handler, one line that calls it after the sign-in check) and the repository `CHANGELOG.md`
(one entry). `package.json` and the indexing count are unchanged from the first version, because
no page was added.

**Stacking.** This branch sits on the first version's branch and also contains the control-port
driver branch, merged in, because the Control tab shows which link carries a lane.

## What this page needs from the access proposal

Roles, passcodes and network binding are proposed once, for every role page, in the
[power operator page brief](power-operator-page.md) (ACCESS-1, ACCESS-2, NET-1, NET-2, NET-3). The
row for this page in that role table is now:

| Role | Pages | API routes | Commands |
| --- | --- | --- | --- |
| Show backup and designer | `show.html` and its assets, sign-in | `ws`; `GET api/state`, `api/host-displays`, `api/crew-links`, `api/cue-feed`, `api/host-checks`, `api/know`, `api/know/file`; `POST api/command` | `power` and `shutter` only, one slot at a time, with a reviewed target. No group target |

Still needed from that proposal: a landing page per role, reach on the lighting position's network
and the house wireless network (NET-2), an answer on the unauthenticated cue ports before new
devices join those networks (NET-1), and sessions that survive a relay restart or a passcode to
hand.

## Verification

Run from `apps/projctl`, against isolated simulator relays only.

- `node --test test/projector-control.test.js`: when each of the four actions is offered, every
  block reason, the Show Lock policy, the all-lanes target and skip lists, link names and the
  "unproven" tag.
- `node --test test/cue-feed.test.js`: Show Control parsing, fragments joined per endpoint,
  interleaved endpoints, an abandoned fragment, a truncated last line finished on the next read, a
  malformed line, a stale file, rotation to a new file in a folder, a replaced file, outgoing rows
  ignored, and the settings states.
- `node --test test/know-folder.test.js`: manifest validation, audience filtering, order, the type
  allowlist, traversal and hidden-segment refusals, a symbolic link pointing outside the folder,
  the size limit, and the response headers.
- `node --test test/host-checks.test.js`: "cannot check" with no provider, a report-file provider
  passing and failing, a stale report, a malformed report and a provider that throws.
- `node --test test/show-backup.test.js`: the strip and headline, the cue item in each listener
  state, the setup check lines in each state, the MIDI test steps (pass, timeout, clear, clear not
  seen, a cue older than the start ignored, a listener that stops mid-test), source limits (one
  write route, `power` and `shutter` only, no address or contact, relative routes), serving, the
  sign-in redirect, and the relay rules the page relies on.
- `node test/show-backup-browser.cjs` (part of `npm run test:browser`): the four tabs by pointer
  and keyboard with the tab kept in the address, every per-lane action including the relay's
  power-off confirmation, the all-lanes review and per-lane results, Show Lock, refusals that stay
  on the card, a reply going stale while armed, a lost relay, the MIDI test against an observer
  file the test appends to, the setup check, the Know tab with the sample set (diagram zoom, a
  document as text, a refused path), the crew notes link, an older relay without the new routes,
  and fit at 1440×900, 1024×768, 768×1024, 375×812, 375×667, 844×390, 320×256 and 2560×720 on every
  tab in both themes, with an armed lane, an armed all-lanes action, setup results, a waiting,
  passed and cleared MIDI test, and an open diagram and document.
  Set `SHOW_BACKUP_SHOTS` to a folder to keep screenshots.

Results for this version are in the pull request.

## Not proven on a rig

- **Any command from this page on real hardware.** Power on, power off and both shutter moves have
  run only against the simulator.
- **The control-port link under command.** The relay has read the two lamp projectors over it; no
  power or shutter command has been sent to them that way with someone watching the surface.
- **The MIDI test end to end.** The reader was tested with fixture files built to the row format
  above. It has not read a file written by the real observer, and no console has fired cue 999
  into it.
- **The Know tab with the real bundle.** Only the invented samples were shown.
- **The display report on the real show computer**, real phones and tablets, Safari and Firefox,
  a screen reader, a long session, and readability in a dark booth.

## Open decisions

The first option in each row is the recommendation and is what this build does. None of the new
ones is answered.

| ID | Question | A (recommended, built) | B | C |
| --- | --- | --- | --- | --- |
| SBP-9 | One page or two? | One shared page for the show backup operator and the designer | A page each, sharing the components | One page with a role switch that hides tabs |
| SBP-10 | Sign-in | The existing shared passcode, with the on-page note that actions are not attributed. The owner's latest word on sign-in, as relayed on November 18, was to keep the passcode | Wait for role passcodes (ACCESS-1) before installing | |
| SBP-11 | What Show Lock locks here | Power, every all-lanes action, the MIDI test and the setup check. Per-lane shutters stay available | Also allow "close all shutters" under Show Lock, as the fastest safe move | Also allow the setup check, since it sends nothing |
| SBP-12 | Setup check contents and expected states | The list above: power ON, shutter OPEN, preferred input, pattern off, the displays rule | Expected states saved per show in the private rig settings | Readings only, no pass or fail |
| SBP-13 | Test cue numbers and waits | Cue 999 inside 30 seconds, clear cue 999.5 inside 60 | Numbers and waits read from the private settings | |
| SBP-14 | The "unproven" tag on control-port lanes | Keep it until the control-port rig acceptance steps pass, then remove it in code | Drop it now | |
| SBP-15 | Host checks (playback app, MIDI interface, awake and unlocked) | Leave them "cannot check" until a helper is written and accepted | Build the helper next | Remove the three lines until then |
| SBP-16 | Who sees which Know items | Both people see everything marked for either audience | Filter by a role chosen on the page | |

Earlier decisions:

| ID | Question | State |
| --- | --- | --- |
| SBP-1 | Where does the help number live? | Not needed in this build: the help control was dropped on the owner's word (November 18) |
| SBP-2 | What counts as "outputs present"? | Open. Same rule, now also a setup check line |
| SBP-3 | Cue link | Built as a listen-only feed, awaiting a rig test. Shows "Not connected" until the observer path is set |
| SBP-4 | Should Show Lock block Open from this page? | Open. Still the relay's rule: shutters work both ways under Show Lock |
| SBP-5 | Actions on a stale reply | Open. Blocked, as on the main console |
| SBP-6 | How is the page found? | Open. A bookmark on each person's device |
| SBP-7 | Lanes the relay cannot reach during a show | Changed by the control-port driver. Unproven under command |
| SBP-8 | Crew notes link | Open. Unset by default |

Later slices, not part of this version: a MIDI test the relay injects over the network, a helper
for the three host checks, and adoption of the control component by the power operator page.

## Installing

Not installed. This version needs the updated relay code (the four new routes) and one relay
restart, so it cannot go in as static files the way the first version did. Installing waits for a
window outside a show and the owner's word. Until then the show computer keeps the first version.
