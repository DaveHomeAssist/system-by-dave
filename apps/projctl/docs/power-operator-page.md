# Power operator page brief

Status: first version built and tested in the simulator on November 18, 2026. The same
day, on the owner's instruction, the four page files were copied to the show computer's
relay; at the last check they matched commit `46ea2dc`. The relay changes in this pull
request (the crew notes read) are not there. No signed-in load, real projector, real
phone or venue network has been exercised. Decisions POWER-1 to POWER-4, ACCESS-1, ACCESS-2 and NET-1 to NET-3 are
open. The page is built on the recommended option for each and marks what depends on one.

## Problem

Daily control of a four-projector rig is being handed to several crew members with
different jobs. One of them, the power operator, turns the four projectors on each
morning and off each night and does nothing else on the rig. Today that person would use
the full operator console, which also carries shutter, test patterns, lens, presets,
schedules and setup.

Two facts make "press All off" the wrong tool for this job:

- While the playback application is open it holds the PJLink link to the two lamp
  projectors (lanes A and D), so the relay cannot read or command them. A group power
  command and a power schedule both skip a target without fresh feedback.
- The lamp projectors need about 170 seconds of fan cooling after power off before they
  can relight, and must never lose mains power while cooling. Leaving the building
  before every unit is confirmed in Standby has already happened once on this rig.

## Outcome

One small page, `power.html`, served by the same relay, that walks the power operator
through morning on or nightly off one step at a time and says plainly when it is safe to
leave. It shows only what this job needs. The checklist uses only the relay's existing
routes and changes no saved rig data. One small read-only route is added for the optional
crew notes link described below.

## Flow

The page has three tabs: **Morning on**, **Nightly off** and **Rules**. Each mode is a
five-step checklist. A step rail shows every step and its state; one step is open at a
time with its instruction and its single action. Morning on is the default view because
it can only send Power on. The open step is chosen once, from the first relay snapshot,
and after that only the operator moves it, so a second tap never lands on another step's
button.

| Step | Morning on | Nightly off |
| --- | --- | --- |
| 1 | Tick: the playback app is closed | Tick: the show is over and the playback app is quit |
| 2 | Lane C: Power on through the relay | Lane B: Power off through the relay |
| 3 | Lane B: Power on through the relay | Lane C: Power off through the relay |
| 4 | Lane A: handheld remote, then tick "lit" | Lane A: handheld remote, cooling countdown, then tick "off" |
| 5 | Lane D: handheld remote, then tick "lit" | Lane D: handheld remote, cooling countdown, then tick "off" |

### Relay lanes (B and C)

- The step shows the lane's power word from the relay's live state: ON, WARMING,
  COOLING or STANDBY, with the age of the projector's last reply.
- Power on is one tap. Power off keeps the relay's two-step confirmation: the first tap
  asks the relay for a confirmation, the button changes to "Confirm power off" for three
  seconds, and only the second tap sends the command. A repeat tap in the first 400 ms
  is ignored, as on the operator console.
- Commands carry the projector's control revision, so the relay rejects a command aimed
  at a projector whose configuration changed since the page last read it.
- The button is unavailable, with the reason in words, when: the relay connection is
  down; the projector has no fresh reply; the lane is unassigned or assigned twice;
  Show Lock is on (power off only); the unit is cooling (power on only); another
  operation is running; or step 1 is not ticked.
- A command acknowledgement is reported as "accepted", never as a new power state. The
  step completes only when a fresh relay reading shows ON (morning) or STANDBY (night).
- A stale or missing reply is shown as "No fresh reply" with the last known value
  labeled as last known. It never counts as Standby.
- A fresh reply that carries no power state reads UNKNOWN, and is never shown or counted
  as On or Standby (POWER-4).
  - Morning: Power on stays available, as it is on the operator console and as the
    relay's own guard allows, with the note "The relay cannot read this unit's power
    state. Look at it first: power on only from standby."
  - Night: the lane is confirmed by eye, exactly as a manual lane is. The main action
    becomes "Tick by eye: off", the word becomes OFF BY EYE once ticked, and Power off
    (still two steps, still under Show Lock) sits beside it for a unit that is in fact
    lit. The tick is offered whenever the lane reads UNKNOWN, not only after a power off
    this browser saw acknowledged: a reload or a sleeping phone forgets that, and someone
    else may have switched the unit off.
  - A real reading always wins. If the lane later reads ON, WARMING, COOLING or STANDBY,
    the tick is ignored. A lane with no reply at all is not a case for the tick.

### Manual lanes (A and D)

- The operator uses the handheld remote. The page never sends a command to these lanes.
- Each has a "confirmed by eye" tick: "light on the surface" in the morning, "fans
  stopped and the indicator is red" at night. A tick records the time it was made.
- A cooling countdown of 170 seconds is started by the operator when they press Off on
  the remote (or, in the morning, when a unit shuts itself off). It is labeled as the
  operator's own timer and shows a "do not cut mains power" warning while it runs. The
  tick is unavailable while a countdown runs, and starting a countdown clears that
  lane's tick, because a lane that was just switched is in transition.
- If the relay does have a fresh reply from one of these lanes (for example with the
  playback app closed), the page shows it, labeled "Relay reading". If it does not, the
  page says "Not reached by the control page" and tells the operator to go by the light
  on the surface. A lane the relay has not reached is never drawn as a reading.
- A **lamp message** slot sits on each manual lane. Its content is not known yet
  (POWER-3). It says so, and tells the operator to photograph the screen and call the
  video lead. Nothing in it is invented.

### Banner

- Nightly off: **Safe to leave the building** turns on only when every lane is either
  read as STANDBY from a fresh relay reply or carries a current "off by eye" tick. On a
  relay that reads both of its lanes, that is the original rule: B and C read STANDBY,
  A and D ticked. In every other case it reads "Not safe to leave yet" and lists what is
  missing.
- The banner says which lanes were read and which were looked at, for example "B reads
  Standby. C, A and D confirmed off by eye."
- If the relay has a fresh reading from A or D that says the unit is not in Standby,
  the banner stays off even when the lane is ticked, and names the conflict.
- Morning on: the same strip reads "All four on" when B and C read ON and A and D carry
  a current "lit" tick.

### Crew notes link (optional)

The crew has a separate place for notes and questions that can wait. When the relay knows
its address, the Rules view gains a fourth rule set, **Crew notes**, with one link.

- The address comes from private local settings only: a `crew-links.json` file beside the
  rig, shape `{ "notes": { "url": "https://…" } }`. The relay hands it to a signed-in page
  through `GET api/crew-links`. No address, host name or product name is in this
  repository, and the tests use a reserved test name.
- With no usable address the link, its rule set and its button are not shown at all, on
  the Rules tab or beside the open step on a very wide screen. The same is true on a relay
  that does not have the route. Nothing else on the page depends on it.
- The page only draws the link. It never requests, checks or frames that address.
- The link opens in a new tab with no opener, under the label "For notes that can wait.
  Not for emergencies or cue calls: phone for those."
- The relay accepts only an `http` or `https` address without credentials, 300 characters
  at most. The page applies the same rule again to whatever it is handed.
- The reader (`server/crew-links.js`) and its two lines in `server/index.js` are the same,
  byte for byte, as the ones the show backup page adds, so both role pages share one
  private setting and either pull request works on its own.

When to set the address is one question for both role pages: decision SBP-8 in the show
backup page brief. Its recommendation is to leave it unset until the operator's device can
reach the notes service. Today this page's operator cannot reach it, so the link stays
hidden.

### Ticks and timers

Ticks and countdowns live in the browser (`localStorage` key `projctl.powerPage.v1`,
versioned and validated, with an in-memory fallback when storage is unavailable). A relay
lane's "off by eye" tick is kept in the same record. A tick
is current for 30 minutes, then lapses and must be made again, so last night's tick
cannot satisfy tonight's banner. A later tick for the same lane replaces the earlier
one, and a tick can be taken back by pressing it again. A countdown is stored as its end
time, so it survives a reload. Nothing is written to the relay, the rig file or the
event log by a tick.

Reply age is judged on the relay's clock, taken from its heartbeat, so a phone with a
wrong clock does not see every lane as stale. Ticks and timers are set and read on the
same device, so its clock only has to agree with itself.

### Layout

The page never scrolls (workspace rule WEB-2), in both themes, light by default.

- Phone upright: header, banner, a row of five step pills, the open step, and the three
  tabs in a bottom rail.
- Desktop: tabs under the header, the steps as a list on the left, the open step beside
  it. From 1700 px wide the rules sit in a third column instead of behind their tab.
- Short screens (620 px of height or less: a phone on its side, a small phone with its
  browser bars, heavy zoom): header and tabs fold into a side rail, and the instruction
  text and tools open as a sheet from a Details button. The state word, the reason a
  button is unavailable and the action stay on the card.
- Below 340 px of height the step rail and the banner detail are not drawn. Back and Next
  still reach every step and each step shows its own state.
- Rules shows three rule sets side by side when there is room and one at a time, picked
  by three buttons, when there is not.

## Must not do

- No shutter, test pattern, input, lens, preset, schedule, Show Lock, setup or discovery
  control, and no group "all" command.
- No power off in Morning on, and no power on in Nightly off.
- No command of any kind to lanes A and D.
- No new relay endpoint for power or state, no change to authentication and no change to
  which network interfaces the relay listens on. The one added route only reads the
  optional crew notes address.
- No request to the crew notes address, and no link to it unless the relay's private
  settings hold one.
- No optimistic state: nothing is shown as on, cooling or Standby unless a fresh relay
  reading says so, and nothing the operator ticked is shown as a relay reading.
- No external font, script, style or network request. Every URL is relative.

## Rules, data and API effects

- Reads: `GET api/state` (session check), the existing `ws` snapshot, status, busy and
  heartbeat messages, and `GET api/crew-links` once per connection for the optional link.
- Writes: `POST api/command` with `{slot, cmd:'power', arg, confirm, expectedTargets}`
  for one slot at a time. No other route.
- Files: `public/power.html`, `power.js` (page), `power-model.js` (state rules, no
  DOM) and `power.css`. They reuse the shared theme, tokens, lane names and
  reply-freshness modules and change none of them.
- Relay: `server/crew-links.js` (new, shared with the show backup page) and two added
  lines in `server/index.js`: its import and the `api/crew-links` route. The route sits
  behind the existing login and never opens the address it returns.
- The page is served by the relay's existing static handler, behind the existing
  login. A signed-out visit redirects to the sign-in page and returns to `power.html`.
- `power.html` is one more tracked page outside the sitemap, so the count in
  `scripts/verify_indexing_policy.js` rises by one. It carries `noindex, nofollow`.
- Until role access exists (ACCESS-1) this page is a narrower view, not a narrower
  permission: the same session can still open the full console.
- Equipment contract ECP-1.0 revision 1.0: Projctl stays the owner of every physical
  command. The page adds no equipment data, schema or execution path.

## Dependencies and risks

- **POWER-1** decides which lanes are manual. The split is three constants at the top of
  `public/power-model.js` (`RELAY_LANES`, `MANUAL_LANES`, `STEPS`).
- **POWER-2** decides whether step 1 exists and who closes the playback app.
- **POWER-3** blocks the lamp message helper.
- **Relay version.** A relay whose Barco driver predates the standby mapping of
  November 17, 2026 (`CHANGELOG.md`, "Projctl Barco standby power state") reports that
  unit as UNKNOWN once it settles into network standby. On such a relay this page can
  still power the lane and never shows STANDBY for it; at night the operator confirms it
  off by eye and the banner says so. Updating the relay turns that lane back into a
  reading. The page does not guess.
- The 170 second figure is the cooling time recorded for the lamp units. It is a
  guide for the operator's eyes, not a measurement.
- The page trusts the operator's ticks for A and D. A wrong tick gives a wrong banner.
- A phone that sleeps pauses the page. On wake it reconnects and redraws from a new
  snapshot, and countdowns resume from their stored end time.
- The relay serves plain HTTP on the local network (NET-3).

## Verification

- `test/power-operator.test.js` (Node, simulator relay): the page and its assets are
  served with a full head and a content security policy that allows no inline script or
  style; a signed-out request redirects to sign in and returns to the page; the source
  holds no absolute URL, outside host or private network address, calls only `api/state`
  and `api/command`, and sends only `power`; the relay behaviour the page relies on, for
  the exact request it sends (two-step power off, Show Lock, a stale target revision,
  the cooling guard, a lane with no reply); the crew notes read (not configured,
  configured and signed in, refused when signed out, an unusable address); and the state
  rules in `power-model.js` (lane readings, both step kinds, an unread power state and
  its by-eye tick at night, tick lapse, the countdown, the banner and what it says was
  read or looked at, which crew notes addresses are accepted).
- `test/power-operator-browser.cjs` (Chromium, simulator relay, lanes A and D made
  unreachable as at the venue): both checklists end to end on a phone; every request the
  page sent; the playback tick gate; the two-step confirmation, its lapse and the
  ignored rapid repeat; Show Lock; a lane that stops replying; a manual lane the relay
  reaches and disputes; the countdown across a reload; tick lapse; the banner turning on
  and going off again; a device clock ten minutes fast; keyboard tab navigation, visible
  focus and history; both themes; sign-in and return; the crew notes link when
  configured (label, new tab, no opener, and no request to the address by the page) and
  when not configured (nothing shown, also for an address the page must refuse and for a
  relay without the route); a relay lane rewritten to reply with no power state (UNKNOWN,
  power still offered after the playback tick, the command sent, never shown as On or
  Standby; at night the two-step power off beside the tick, the by-eye tick, the banner
  turning on with "B reads Standby. C, A and D confirmed off by eye." and off again when
  the tick is taken back); and no page scroll, nothing outside its panel and no cut text
  at 375 by 812, 375 by 635, 1440 by 900, 844 by 390, 320 by 256 and 3840 by 1080, with
  the longest strings and the crew notes rule set on screen.
- Not covered by any test: real projectors, the real PJLink conflict with the playback
  app, a real handheld remote, real cooling time, a real phone browser, the venue
  networks, and the installed show computer.

Acceptance on the rig needs the video lead present: one morning on and one nightly off
walked through with the operator, with each physical state checked by eye.

## Open decisions

The first option is the recommendation. The page is built on it.

| ID | Question | A (recommended) | B | C | Answer unlocks |
| --- | --- | --- | --- | --- | --- |
| POWER-1 | How are lamp lanes A and D powered? | Handheld remote, confirmed by eye on this page. B and C through the relay. No build needed. | Quit the playback app first, then the relay for all four. Makes all four lanes relay steps. | Teach the relay to reach A and D on the maker's own control port. One flow for all four, but needs a build and an install. | Whether A and D stay manual steps |
| POWER-2 | Who closes and reopens the playback app around the power cycle? | The show backup. The power operator only ticks that it is closed, and the relay power buttons wait for that tick. | The power operator does it. The step becomes an instruction, not a check. | The playback app stays open overnight. Step 1 is removed. Needs a dark-day test that outputs survive a power cycle. | Step 1 wording, or its removal |
| POWER-3 | What does the lamp message helper say? | Record the message, the right answer and the reason on a supervised power-on, then fill the slot. | Leave the slot as "photograph it and call" for the whole run. | | The helper content |
| POWER-4 | A relay lane replies but with no power state (UNKNOWN). What may the operator do? | Power stays available with a "look at it first" note, and at night the lane is confirmed off by eye like a manual lane, with the banner naming it as looked at. Never shown as On or Standby. Built this way on November 18 after the owner asked for the standby case to work without a relay update. | Power only, no tick: the banner stays off for that lane until the relay is updated. | Block power and send the operator to the video lead. Safest on paper, but on a relay that cannot name a unit's standby the lane could never be powered on from this page. | Whether the by-eye tick for a relay lane stays once the relay can read that unit |

Needed now: POWER-1 and POWER-2, before the operator's walk-through. POWER-3 needs the
supervised power-on first. POWER-4 matters only on a relay that reports UNKNOWN for a
replying unit; updating that relay removes the case. Its shape was this session's to
choose and waits for the owner's confirmation.

## Role access proposal

This section covers every role-scoped page on the relay (this page and the show backup
page). It is a proposal. Nothing here is built.

### Today

- One passcode (`PROJCTL_PASSWORD`, or the `PJ_PASSCODE` fallback) yields one session
  value. Every page, every API route and the WebSocket accept that one session.
- Any file in `public/` is served to any signed-in browser. A role page limits what a
  person sees, not what their session may do.
- Show Lock and the two-step power off are the only guards between a signed-in browser
  and a power off.

### Proposed

Role passcodes checked by the relay, with a default-deny allowlist per role:

| Role | Pages | API routes | Commands |
| --- | --- | --- | --- |
| Full (existing passcode) | All | All | All, as today |
| Power | `power.html` and its assets, sign-in | `GET api/state` reduced to lane, power, connection and lock fields; `POST api/command`; `ws` | `power` only, one slot at a time, on the lanes named for the role |
| Show backup | Defined in the show backup page brief | Same mechanism | Same mechanism |

- Each role has its own passcode variable. A role with no variable set does not exist.
- A role session is a different cookie value from the full session, so revoking one
  role (changing its variable and restarting) leaves the others signed in.
- Role sign-in lands on the role's page. A role session asking for anything outside its
  row gets a 403 for an API route and its own page for a navigation.
- The event log records the role with each command.
- Tests: for each role, every route outside the row is refused, including the
  WebSocket messages a role should not receive.

| ID | Question | A (recommended) | B | C |
| --- | --- | --- | --- | --- |
| ACCESS-1 | How are roles separated? | Per-role passcodes with relay-enforced allowlists, as above. Removes the shared login. Needs a build, tests and an install. | Keep one shared passcode. Role pages stay a convenience. No build. Anyone with the passcode can do everything. | A separate listener per role on its own port. Separation by address instead of by login. More moving parts and nothing stops a person opening another port. |
| ACCESS-2 | What may the power role read? | Lane, power, connection and Show Lock only. | The full state snapshot, read only. Simpler to build, shows more than the job needs. | |

ACCESS-1 is needed before the passcode is given to more people. If it stays at B for
this run, hand the passcode over in person and treat every holder as a full operator.

## Network exposure proposal

Also for both pages. A proposal; nothing here is changed.

### Today, from the source

- The web server calls `listen(PORT)` with no host, so the page answers on every
  network interface the host has. `PORT` (default 8080) is the only setting.
- OSC (UDP, `OSC_PORT`, default 9000) and text TCP (`TCP_PORT`, default 9001) cue
  listeners also bind every interface unless `PROJCTL_CUE_HOST` names one address, and
  accept every source unless `PROJCTL_CUE_ALLOWLIST` lists literal addresses. The
  passcode does not protect them. A cue can power a projector off; only Show Lock
  blocks that.
- The page is served over plain HTTP on the local network. HTTPS exists only through
  the tailnet proxy.
- Whether the installed relay actually answers on each network it is attached to has
  not been checked. That depends on the host's firewall and each network's client
  isolation, not only on the relay.

| ID | Question | A (recommended) | B | C |
| --- | --- | --- | --- | --- |
| NET-1 | What limits the cue ports before more people join these networks? | Set `PROJCTL_CUE_ALLOWLIST` to the verified cue senders, and `PROJCTL_CUE_HOST` to the one interface they use. Settings only, then a restart in a released window. | Turn off whichever cue listener nothing uses (`PROJCTL_OSC_ENABLED=0` or `PROJCTL_TCP_ENABLED=0`). | Leave them open and rely on Show Lock. |
| NET-2 | Which networks should the web page answer on? | Keep every interface for this run, verify by hand which networks reach it, and rely on the passcode. No build. | Add a setting that binds the web server to named interface addresses only. Needs a build and an install. | A host firewall rule on the show computer. No build, but a system setting only the owner should change. |
| NET-3 | Is plain HTTP acceptable on the crew's networks? | Yes on the closed production networks. On shared house Wi-Fi, give out only a role passcode (ACCESS-1) so a captured passcode cannot do more than that role. | Serve HTTPS on the local network too. Needs certificates on every phone. | Treat house Wi-Fi as untrusted and do not use it for control. |

NET-1 can be answered and applied without any build. NET-2 and NET-3 depend on which
network each person will really use, which is not recorded yet.

## Exclusions

Role passcodes, interface binding, cue port changes, a lamp message helper with real
content, any change to the playback application, power schedules, installing or
restarting the relay, anything on the show backup page, and the crew notes service
itself: this page links to it when told where it is and does nothing else with it.
