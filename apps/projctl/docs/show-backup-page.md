# Show backup page, the power page and the shared control

Brief for the second version, November 18, 2026. The first version (a go or no-go strip, four
lanes and a guarded shutter) is on its own pull request and its four page files were copied to the
show computer's relay on November 18. This version is built and tested in the simulator only.
Nothing in it has been installed or run against a rig.

Scope set by the owner on November 18, relayed to this build: the show backup operator and the
designer can run a setup check, run a MIDI test from the console independently of that, and power
the projectors on and off and move their shutters; everyone gets diagrams and the most useful
documents close by. On where the on and off button lives, the owner's answer was that each
person's own page carries the same button. So there is one shared control and one run in the
relay, and two pages that carry them at the addresses already handed out:

| Address | For | Carries |
| --- | --- | --- |
| `show.html` | The show backup operator and the designer | The shared control (power and shutter), the setup check, the MIDI test, the documents |
| `power.html` | The power operator | The shared control (power only) and the documents |

Options marked "recommended" below are proposals. What is still open is under
[Open decisions](#open-decisions).

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

Two pages, served by the relay behind the existing sign-in, built from the same script, styles
and control. `show.html` keeps the go or no-go strip on top with four tabs under it. `power.html`
is the same shell with three tabs: Power, Night and Know.

| Tab | On | For | Sends |
| --- | --- | --- | --- |
| **Control** ("Power" on the power page) | Both | Power on, power off, shutter open and shutter close for one lane; "Turn all on" and "Turn all off" for all four; open and close for all shutters. The power page has the power rows only | `POST /api/command` (`power`, `shutter`, one lane) and the plan, start and stop of the relay's run |
| **Setup check** | `show.html` | One press: a list of pass, fail or cannot check, each with its reading | Nothing |
| **MIDI test** | `show.html` | Wait for the console's test cue and say whether it arrived | Nothing. This build never sends MIDI |
| **Night** | `power.html` | The night timeline: each lane's expected wait, its live reading, and "Safe to leave the building" only when all four read OFF | Only Stop the run, while a run is in progress |
| **Know** | Both | A short built-in list of first things to try, then diagrams and documents from a private folder on the relay computer | Nothing |

### Look (design reference, November 19)

Dave sent a static design reference for the show page through Olaf ("PR 541 DESIGN & CSS REFERENCE"). The page already had its structure (header with a Show Lock status and clock, go or no-go banner, four summary items, four lane cards), so the look was applied in place, on the existing locked shell and theme switch:

- **Power banner** in the reading's colour: ON green, warming and cooling amber, OFF red, power not reported grey. The Barco at READY is cyan with "READY · this page can wake it"; in deep standby it is grey with "ECO (or STANDBY) · this page can't wake it". A lane with no current reply keeps CONNECTING or the amber CHECK BY EYE. The words stay ON, OFF and so on.
- **Shutter pill**: OPEN green, CLOSED amber, a command sent and not yet confirmed amber with a dashed edge ("CLOSE sent, not confirmed"), not reported red on a lit lane and grey otherwise (an off unit does not report its shutter).
- **Readings as rows** (a label over each value, with dividers) on very tall cards; shorter cards keep the two-column readings. "Link" is now "Control link": the driver actually in use (PJLink, control port, Barco API, simulator).
- **Summary items** with a coloured top edge and their mark as a badge.
- **Show Lock** is a read-only status on both pages (it already was). On, it turns amber and an amber outline is drawn around the page.

Not taken from the reference: its host, lamp hours, thermal and ping rows and its fixed "NTCONTROL · TCP 1024" protocol line (the relay does not poll lamp hours, temperature or ping, the host is not needed by the show backup, and power, shutter and status go over PJLink); its dark-only charcoal palette (both themes keep the Frozen palette every Projctl page shares); its scrolling layout below 1024 px; and its lane colours (the rig's own lane colours stay). The reference allows shutter moves while a unit warms up or when power is not reported; the page still offers them only while a lane reports ON. Power buttons stay on each card: the reference shows none, but this page's power control was already agreed.

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
`projector-control.css`) draws a card per lane and one "All lanes" card. Each page mounts it with
the rows it wants: `show.html` asks for power and shutter, `power.html` for power only. It takes
the relay snapshot, a function that posts a command, and three functions for the run. It contains
no page-specific code.

**Each lane card shows** power, shutter, input, test pattern and reply age, any alarm the projector
reports, and which link carries the lane: PJLink, the control port, the Barco API or the simulator.
A lane on the control port is tagged "power untested": as reported from the rig on November 18,
the shutter over that link works there and power over it has not been sent. This build did not
verify either statement. Input and pattern are read only. They are there so a blue "no signal"
picture can be explained: a wrong input and a test pattern left on both show up as a flagged line.

A lane the relay is not reading shows **CHECK BY EYE** and the time of its last reply. Last known
values are never shown as readings. No message on either page sends anyone to a handheld remote.

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

**The way back from a dark surface.** A lit lane whose shutter reads CLOSED gets a highlighted Open
button and the line "Dark on stage: the shutter is closed. Open it here." This is the recovery when
a shutter closed from the playback app does not reopen from there.

**Refusals stay on the card.** A blocked action says why when it is tapped, and carries the reason
in its accessible name. A refusal from the relay or the projector is shown in the relay's own
words with the time, and stays until the next action on that lane. No answer at all is worded
differently from a refusal, because the command may have left before the reply was lost.

**All lanes: shutters.** Open and Close for every lane at once. The first step lists exactly which
lanes will get the command and which are skipped, with the reason for each skip. The second step
sends one command per listed lane, each with the same guards as a single-lane action.

**All lanes: power.** "Turn all on" and "Turn all off" do not send commands from the page. They
start the relay's one run, described next.

## The all-four run

One run lives in the relay (`server/power-run.js`). Every page reads the same state, so if one
person starts it, every other page shows the same progress and the same banner, and their button
waits until it ends. A second press from any page meets the run in progress and cannot start
another. The relay had no such run before; the earlier power page worked its banner out on the
page from readings.

**The words on screen**, the same on both pages:

| Where | Words |
| --- | --- |
| Buttons | **Turn all on** · **Turn all off** |
| Second step | **Confirm: turn all on (9)** · **Confirm: turn all off (9)** · **Cancel** |
| While it runs | **Turning all four on** · **Turning all four off**, with **Stop the run** |
| Banner at the end | **All four on** · **Safe to leave the building** |
| It ended without that | **Not all four on** · **Not safe to leave yet**, naming the lanes |
| It was stopped | **Run stopped** · **Run interrupted** (the relay restarted) |

**Two steps.** The first press asks the relay what a run would do now and gets back the plan and a
one-use confirm that lasts 10 seconds. The plan is shown lane by lane: power on, already ON,
waiting, or no current reply. Nothing reaches a projector. The second press starts the run in the
relay with that confirm. The confirm is bound to the direction and to the projectors it was shown
for.

**What the run does**

| Rule | Detail |
| --- | --- |
| Order | On: C, B, A, D. Off: A, D, B, C, so the two lamp units start cooling first. The off order is unchanged pending SD-1 (send all four together, or this order) |
| Read before commanding | Each unit needs a current reply. A unit already in the target state is skipped and nothing is sent to it |
| One command per unit | Never repeated, with one exception below. A second "off" to the Barco pushes it into deep standby (STANDBY or ECO), where its network is down and the morning power on cannot reach it. It reads OFF in READY and in deep standby alike, so a Barco reading OFF or cooling gets nothing |
| Fresh reads | The run asks the relay's poller for a fresh read of every unit it is waiting on every 10 seconds. A read is never a command |
| A quiet minute | Nothing is sent to a Panasonic unit for 60 seconds after it lights, and nothing at all, not even a read from the run, to a lamp unit for 60 seconds after its on command. The relay's own background poll is not paused |
| No relight too soon | A lamp unit is not powered on while cooling, nor inside 75 seconds of reading OFF. Nothing is ever sent on to a Panasonic that reads COOLING |
| Morning stagger | The second lamp unit (D) goes about 10 seconds after the first (A)'s on command is accepted. They are then watched side by side |
| Lamp watch and one retry | After its on command, a lamp unit is watched for 3 minutes. Reading COOLING inside that window means it turned itself off: the run marks a lamp fault, waits for OFF plus 75 seconds, and sends on once more. A second fault stops that unit with an alert: a service call. This is the only case where a unit gets a second command. After the watch the run reports lamp hours and the lamp error state, or says they are not reported on that link |
| No reply | A unit with no current reply inside 20 seconds gets nothing. The run goes on to the next unit. In the morning a Barco with no reply may be in deep standby, which needs a wake at the unit; the run says so |
| Sent, not confirmed | A unit that accepted its command but has not reported is shown as "sent, not confirmed", never as done |
| A refusal | Shown in the relay's own words for that lane. Not retried |
| The banner | Only when every lane's own reply reads ON (or OFF). A lamp unit counts as ON only once it has stayed on through its 3-minute watch. A unit read in its end state stays confirmed if it then stops answering, which a resting laser unit can. A Barco that ends in deep standby still reads OFF, so the night banner shows, with a line that the morning power on cannot reach it |
| Waiting for the end | Up to 5 minutes for all ON (longer while a lamp is being watched or retried), 240 seconds for all OFF. After that the run ends with the lanes it could not confirm, by name |
| Stop | Any page can stop the run. Nothing more is sent |
| A relay restart | The run is recorded beside the rig. A relay that starts and finds a run in progress marks it interrupted and sends nothing more |

The order and the waits come from the manufacturers' documents as researched for this rig (the
rig's daily order of operations, November 19, relayed to this build), and are researched, not yet
tested on a rig: the rig tests for them are planned for the first day with no shows. They were
checked against the drivers (what each driver reads as OFF, WARMING and COOLING, and that
each power command is sent once) and exercised with stand-in projectors and a fake clock. None of
it has been timed on a rig. After a relay restart the run counts each unit's state from the moment
it is first read, so it may wait up to 75 seconds it did not need to.

There is no "app closed" step, no tick and no remote step anywhere in the run or on either page.

The run's finished banner stays on screen for 15 minutes.

**Hints** (from the power page session's anticipatory plan, the two parts that still fit; built on the owner's word, November 19). A hint only highlights and explains; it never presses, arms or starts anything.

- **A suggested run.** The all-lanes card highlights one run button and says why, from B and C (the two laser units, read all day) when both have current replies and agree. B and C read OFF: "Turn all on", but not within 6 hours of an off run ending. B and C read ON and Show Lock is off: "Turn all off", but not within an hour of an on run ending (the morning check). Show Lock is on through the shows, so the off run is not suggested then. No clock is read. An address that picks the run (`#on`, `#off`) was in the plan and is not built: the address already carries the tab.
- **A summary of the finished run** under the banner, read only, with a Copy button: for example "Units off at 10:04 PM. Every lane reports OFF. C reads READY." In the morning it adds each lamp unit's hours and lamp state. Copy uses the clipboard where the page may, and otherwise selects the text for the device's own copy (plain HTTP has no clipboard). Hidden on short screens.

The rest of that plan was written for the earlier checklist page: resuming ticks and timers, the cooling timer and the one retry are already done by the relay run and the night timeline, and the tick lapse warning has no ticks to attach to.

**The Barco's raw state.** Its driver now keeps the raw Pulse state (`ready`, `standby`, `eco`,
`conditioning`, `deconditioning`, `on`) beside the mapped power, as `rawState`. The lane card shows
deep standby as a caution ("ECO. Deep standby: the morning power on cannot reach it."), and the
night timeline shows the raw word with READY as the target.

## The night timeline (power page)

A **Night** tab on `power.html`. One row per lane, in the order the off run sends (A, D, B, C):

| Unit | Expected wait | Read from the relay |
| --- | --- | --- |
| Lamp unit (A, D) | about 170 s of cooling | COOLING with a count from its off command, then OFF |
| Laser unit (B) | about 5 s | OFF |
| Barco laser (C) | about 30 s to READY | its raw state: DECONDITIONING, then OFF · READY, or OFF · ECO / STANDBY marked deep standby |

Above the rows: "All off, about 3 min" and "Never cut mains while a lamp unit is cooling", which
stands out while a lamp unit cools. Below them: "Safe to leave the building" only when all four
read OFF, otherwise "Not safe to leave yet" naming each lane and its reading. A lane with no reply
after its off command reads "Sent, not confirmed", never success. The waits are labelled
"researched, not yet tested on this rig". The page that starts the nightly off moves to this tab;
other pages stay where they are. The run can be stopped from here too.

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

Above the folder's list, each page has a short built-in list that does not depend on the folder.
On `show.html`: the recovery ladder for a surface that is wrong, least disruptive first, each rung
with when it is allowed:

1. Shutter (any time, mid-show too). The way back from a dark stage is here: on lane C, a shutter
   closed from the playback app may not reopen from there, so open it from Control.
2. Input (before a show). Read it on Control; tell the video lead if it is flagged.
3. Power cycle that one projector (before a show), respecting cooling and the relight wait.
4. Relaunch the playback app (before a show, all four on, only after any approved change is saved).
5. Restart the show computer (only on the video lead's word).

Then what CHECK BY EYE means, and where to look when a cue did nothing. On `power.html`: how the
page works, the night timeline, the things never to do, and what to do when something is wrong
(including a lamp fault and deep standby).

**Holds.** A manifest entry of kind `notice` carries a short hold instead of a file, for example
"no playback app quit or relaunch until the approved show file change is saved". It shows above
the list for its audience until its optional `until` time, and the Know tab carries a mark while
one is shown. Date-specific holds go in the private folder's manifest, never in the page:

```json
{ "kind": "notice", "label": "Hold", "text": "No playback app quit or relaunch until the approved change is saved.", "audience": ["show-backup"], "until": "2026-11-19T17:00:00-05:00" }
```

## Private settings

One new private file beside the rig, `host-paths.json`, in the settings folder that survives an
update. Every key is optional and each value is an absolute path on the relay computer:

```json
{ "cueObserver": "/path/to/observer.jsonl or folder", "knowFolder": "/path/to/folder", "hostChecks": "/path/to/report.json" }
```

No path, host name or file from a real venue belongs in this repository. The samples and the test
fixtures are invented.

## Sign-in

The existing passcode stays. The owner's latest word on sign-in, as relayed on November 18, was to
keep the passcode, so the signed-in path is the one the crew uses and the one tested hardest: sign
in, then the control, the setup check, the MIDI test and the documents, on a phone. A relay
restart ends every session; the page then goes to the sign-in and returns to the same page and tab
afterwards. If that happens during a run, the page shows "Run interrupted" after signing in.

A relay with no passcode set still serves both pages; that path is not the target.

Everyone uses the one passcode. The relay records each command and its time, not who sent it, and
each page says so beside its title and in every confirm prompt. Until role passcodes exist
(ACCESS-1 in the [power operator page brief](power-operator-page.md)) the same passcode also
opens the main console.

## The power page

`power.html` keeps its address. It is now the same shell as `show.html` with three tabs: **Power**
(the shared control with the power rows only), **Night** (the night timeline) and **Know**. On a phone it opens on the all-lanes
card, where the one on and off button is. The earlier version of this page was a step-by-step
checklist with ticks, timers, an "app closed" step and handheld remote steps for the two lamp
projectors. All of that is gone: the order and the waits are inside the run. Its Know tab starts
with how the page works, the things never to do, and what to do when something is wrong.

## Dropped from this build

- **Call for help with a snapshot**, and with it any contact line. The owner asked for it to be
  left out of this build. The snapshot text and the message link are gone from the source.
- Nothing else was removed. The crew notes link stays.

## What it must not do

- No input, test pattern, lens, picture, preset, schedule, Setup, discovery or Show Lock control.
  The page sources write four routes and no others: `api/command` (for `power` and `shutter`
  only) and the plan, start and stop of the run. A test fails if that changes.
- No MIDI output of any kind. No show file, playback app or display control.
- No value shown as a reading unless the relay's reply behind it is current.
- No address, name, phone number or passcode in the source.
- No request to any host other than the relay.
- No "app closed" step, no ticks, and no steps that send anyone to a handheld remote.

## How Show Lock, stale and offline are respected

| Condition | Pages | Relay |
| --- | --- | --- |
| Show Lock on | Power off is locked, for one lane and for "Turn all off", with the reason shown. Power on, "Turn all on" and every shutter stay available. On `show.html` the MIDI test and the setup check are locked too | Blocks power off, input, pattern, picture and lens. Allows shutter both ways and power on. Refuses an off run and stops one under way |
| Reply older than 15 s | Lane reads CHECK BY EYE; all four actions blocked | Refuses everything except shutter close |
| Projector not reached | Lane reads CHECK BY EYE; actions blocked | Refuses any command to it. The run sends it nothing |
| Relay not answering | Every lane reads CHECK BY EYE; Show Lock reads unknown; everything blocked | Not reachable |
| Projector reports COOLING | Power on blocked with that reason | Refuses power on. The run waits for it to finish |
| A run is in progress | Power for one lane and both run buttons are blocked on every page. Shutters stay available | Refuses a second run |

**A gap this leaves.** Show Lock blocks "Turn all off", and neither page can turn Show Lock off.
Someone has to turn it off after the show, from the main console, before the nightly off will
run. See SBP-17.

## Layout

One viewport, no page scroll (WEB-2), light by default with Dark and System from the shared
appearance menu (WEB-1). Tabs sit along the top on a tablet or laptop and in a bottom rail on a
phone. While a run is in progress, and for 15 minutes after it ends, its banner sits above the
cards on the Control tab of every page. The strip stays above every tab. On a phone or a short screen the Control tab shows one
card at a time, chosen with an A, B, C, D, All picker that also carries each lane's state, and the
MIDI test keeps its result, steps and button on the card and moves the longer explanation behind
"What this means". Four panels scroll inside themselves, because their content is inherently long:
the setup check results, the recent MIDI messages, the Know list and the Know viewer. An ultrawide
screen gives each tab real columns: the all-lanes card beside the four lanes, the cue feed beside
the test, and a wider documents list (WEB-3).

## Interfaces and shared files

The pages read `GET /ws`, `GET /api/host-displays`, `GET /api/crew-links`, `GET /api/cue-feed`,
`GET /api/host-checks`, `GET /api/know`, `GET /api/know/file`, `GET /api/power-run` and (after a
lost connection) `GET /api/state`. They write `POST /api/command` and the three run routes.

New relay routes, all behind the existing sign-in:

| Route | Does |
| --- | --- |
| `GET /api/cue-feed` | Listener state, heartbeat age, sources, the last cue and the most recent messages with a running sequence number |
| `GET /api/host-checks` | The three host checks with `pass`, `fail` or `cannot-check`, a reading and a time |
| `GET /api/know?audience=…` | The validated manifest entries for those audiences |
| `GET /api/know/file?f=…` | One file named in the manifest |
| `GET /api/power-run` | The run every page shares: in progress, or how the last one ended |
| `POST /api/power-run/plan` | What a run would do now, lane by lane, with a one-use confirm. Sends nothing to a projector |
| `POST /api/power-run/start` | Starts the reviewed run. Refused while one is in progress |
| `POST /api/power-run/stop` | Ends the run. Nothing more is sent |

The relay also sends a `powerRun` message on its existing socket whenever the run changes. The run
sends power through the relay's own guarded power command, so the relay's freshness, cooling and
Show Lock rules apply to every unit, and each command is in the relay's event log with the source
`run`.

New files: `public/projector-control.js`, `projector-control-model.js`, `projector-control.css`,
`public/show-know.js`; `server/host-paths.js`, `cue-feed.js`, `host-checks.js`, `know-folder.js`,
`power-run.js`, `show-routes.js`; `samples/know/`; `test/power-run.test.js`, `cue-feed.test.js`,
`know-folder.test.js`, `host-checks.test.js`, `projector-control.test.js`. Changed:
`public/show.html`, `show.js`, `show-model.js`, `show.css`, `test/show-backup.test.js`,
`test/show-backup-browser.cjs`, this brief.

Replaced from the power operator page's branch: `public/power.html` is rewritten as the shared
shell. `public/power.js`, `power-model.js`, `power.css`, `test/power-operator.test.js` and
`test/power-operator-browser.cjs` are removed, because the page they drove and tested no longer
exists; `test/show-backup-browser.cjs` and `test/show-backup.test.js` cover `power.html` now.

Shared files touched: `server/index.js` (three added lines: one import, one line that builds the
route handler and hands the run the relay's own functions, one line that calls the handler after
the sign-in check), the repository `CHANGELOG.md`, and `scripts/verify_indexing_policy.js` (the
count of tracked routes outside the sitemap is 219: the two role pages).

**Stacking.** This branch sits on the first version's branch and contains two more branches by
merge: the control-port driver (the Control tab shows which link carries a lane) and the power
operator page (its page is replaced here).

## What these pages need from the access proposal

Roles, passcodes and network binding are proposed once, for every role page, in the
[power operator page brief](power-operator-page.md) (ACCESS-1, ACCESS-2, NET-1, NET-2, NET-3). The
rows for these pages in that role table are now:

| Role | Pages | API routes | Commands |
| --- | --- | --- | --- |
| Show backup and designer | `show.html` and its assets, sign-in | `ws`; `GET api/state`, `api/host-displays`, `api/crew-links`, `api/cue-feed`, `api/host-checks`, `api/know`, `api/know/file`, `api/power-run`; `POST api/command`, `api/power-run/plan`, `api/power-run/start`, `api/power-run/stop` | `power` and `shutter`, one slot at a time, with a reviewed target; the run |
| Power operator | `power.html` and its assets, sign-in | `ws`; `GET api/state`, `api/host-displays`, `api/crew-links`, `api/cue-feed`, `api/know`, `api/know/file`, `api/power-run`; `POST api/command`, the three run routes | `power` only, one slot at a time, with a reviewed target; the run |

Still needed from that proposal: a landing page per role, reach on each person's network (NET-2),
an answer on the unauthenticated cue ports before new devices join those networks (NET-1), and
sessions that survive a relay restart or a passcode to hand.

## Verification

Run from `apps/projctl`, against isolated simulator relays, stand-in projectors and fixture files
only.

- `node --test test/power-run.test.js`: the order in each direction, one unit at a time, the banner
  only when all four report the end state, units already in state skipped, the 60 second quiet
  after a Panasonic lights, no relight while cooling or inside 75 seconds, a unit with no reply, a
  refused command never retried, a second press meeting the run in progress, stop, Show Lock, the
  one-use confirm bound to direction and projectors, a unit that stops answering after its end
  state, the record beside the rig and a restart mid-run, and one full on and off run through a
  simulator relay over HTTP, behind the sign-in.
- `node --test test/projector-control.test.js`: when each of the four actions is offered, every
  block reason, the Show Lock rule, the all-lanes target and skip lists, link names and the "power
  untested" tag.
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
  state, the setup check lines in each state, the MIDI test steps, the limits on both pages'
  sources (four write routes, `power` and `shutter` only, no address or contact, no "app closed"
  or remote wording), serving of both pages, the sign-in redirect, and the relay rules the pages
  rely on.
- `node test/show-backup-browser.cjs` (part of `npm run test:browser`): the four tabs by pointer
  and keyboard with the tab kept in the address; every per-lane action including the relay's
  power-off confirmation; the run started from `show.html` and watched from `power.html`, the
  second page's button waiting, both banners, then the off run started from `power.html`; the run
  banner in every state from a scripted relay, and Stop; Show Lock; refusals that stay on the
  card; a reply going stale while armed; a lost relay; the MIDI test against an observer file the
  test appends to; the setup check; the Know tab with the sample set; the crew notes link; an
  older relay without the new routes; **the signed-in path on a phone** (sign in, run, setup
  check, documents, then `power.html` in the same session); **a relay restart in the middle of a
  run** (the page goes to the sign-in and shows "Run interrupted" afterwards); and fit at
  1440×900, 1024×768, 768×1024, 375×812, 375×667, 844×390, 320×256 and 2560×720 on every tab of
  both pages in both themes, with an armed lane, a reviewed run, a finished run's banner, setup
  results, a waiting, passed and cleared MIDI test, and an open diagram and document.
  Set `SHOW_BACKUP_SHOTS` to a folder to keep screenshots.

Results for this version are in the pull request.

## Not proven on a rig

- **The run.** Its order and waits have run only against stand-in projectors with a fake clock and
  against the simulator. No run has commanded a real projector. The waits, the 10 second stagger,
  the 3 minute lamp watch with one retry, and the Barco's deep standby behaviour are researched, not
  yet tested on the rig (the rig tests are planned for the first day with no shows).
- **The Barco's raw state** on the real driver. Read from the Pulse API as before; the new field has
  only run against fixtures and the simulator.
- **Power over the control port** (the two lamp projectors while the playback app is open). As
  reported from the rig on November 18, the shutter over that link works. Power off to all four was
  sent from a page at the end of that night and accepted, with A and D then on the control port
  link by the relay's own report (relayed from the orchestrator's reading of the relay's event list;
  the link used is not recorded). This build verified none of it.
- **Any other command from these pages on real hardware.** Power and shutter have run only against
  the simulator from these pages.
- **The MIDI test end to end.** The reader was tested with fixture files built to the row format
  above. It has not read a file written by the real observer, and no console has fired cue 999
  into it.
- **The Know tab with the real bundle in a browser.** Only the invented samples were shown.
- **The display report on the real show computer**, real phones and tablets, Safari and Firefox,
  a screen reader, a long session, and readability in a dark booth.

## Open decisions

The first option in each row is the recommendation and is what this build does.

| ID | Question | A (recommended, built) | B | C |
| --- | --- | --- | --- | --- |
| SBP-11 | Should the setup check and the MIDI test lock under Show Lock? | Yes, both, on `show.html` | Leave the setup check available, since it sends nothing | Leave both available |
| SBP-12 | Setup check contents and expected states | The list above: power ON, shutter OPEN, preferred input, pattern off, the displays rule | Expected states saved per show in the private rig settings | Readings only, no pass or fail |
| SBP-13 | Test cue numbers and waits | Cue 999 inside 30 seconds, clear cue 999.5 inside 60 | Numbers and waits read from the private settings | |
| SBP-14 | The "power untested" tag on control-port lanes | Keep it until a watched power test over that link passes, then remove it in code | Drop it now | |
| SBP-15 | Host checks (playback app, MIDI interface, awake and unlocked) | Leave them "cannot check" until a helper is written and accepted | Build the helper next | Remove the three lines until then |
| SBP-16 | Who sees which Know items | `show.html` lists everything marked for the show backup operator or the designer; `power.html` lists what is marked for the power operator | Filter `show.html` by a role chosen on the page | |
| SBP-17 | Show Lock and the nightly off. Show Lock blocks "Turn all off", and neither page can turn Show Lock off | Someone turns Show Lock off from the main console after the show; the pages say why off is locked | Give `show.html` a guarded Show Lock control | Let "Turn all off" run under Show Lock after a stronger confirm |
| SBP-18 | Does the designer need a page at an address of their own? | No. `show.html` serves both, as the handoff sheets print it | A second address with the same content | |
| SBP-20 | The off order inside the run | Unchanged (A, D, B, C) until SD-1 is answered | All four together (the shutdown procedure's recommendation, as relayed), or keep this order |
| SBP-21 | A shutter close step before the nightly off | Not built: the research lists closing all four shutters first, but the off order was not to change | Add "close all four and read them back" as the run's first step |
| SBP-19 | The run's waits (60 s quiet, 75 s relight, 10 s stagger, 3-minute lamp watch with one retry, the 5 minute and 240 s limits) | As built, from the manuals as relayed | Tune them after a watched run on the rig | |

Answered or changed:

| ID | Question | State |
| --- | --- | --- |
| SBP-1 | Where does the help number live? | Not needed in this build: the help control was dropped on the owner's word (November 18) |
| SBP-2 | What counts as "outputs present"? | Open. Same rule, now also a setup check line |
| SBP-3 | Cue link | Built as a listen-only feed, awaiting a rig test. Shows "Not connected" until the observer path is set |
| SBP-4 | Should Show Lock block Open from this page? | Open. Still the relay's rule: shutters work both ways under Show Lock |
| SBP-5 | Actions on a stale reply | Open. Blocked, as on the main console |
| SBP-6 | How is the page found? | The two addresses are on the handoff sheets |
| SBP-7 | Lanes the relay cannot reach during a show | Changed by the control-port driver. Shutter reported working on the rig; power untested |
| SBP-8 | Crew notes link | Open. Unset by default |
| SBP-9 | One page or two? | Answered by the owner (November 18, relayed): each person's page carries the same button. Built as one shared control on `show.html` and `power.html` |
| SBP-10 | Sign-in | Answered by the owner (November 18, relayed): keep the passcode |

Later slices, not part of this version: a MIDI test the relay injects over the network, and a
helper for the three host checks.

## Installing

Not installed. This version needs the updated relay code (the new routes and the run) and one
relay restart, so it cannot go in as static files the way the first version did. Installing waits
for a window outside a show and the owner's word. Until then the show computer keeps the first
versions of both pages. When this version goes in, the two addresses stay the same and the
handoff sheets need new step text only: the button and banner words are in the table under
"The all-four run".
