# Show backup page

Brief and first version, November 18, 2026. Tested in the simulator only. The four page files were
copied to the show computer's relay late on November 18 at the owner's direct instruction, as
static files with no relay restart; the page has not been accepted on the rig, and the relay there
does not yet have the crew notes route. Options marked "recommended" below are proposals; none has been
answered yet.

## Problem

During a run, the person who backs up projection sits at the lighting position, not at the
projection computer. Their job is small: watch the four lanes, close a shutter when a lane shows a
bad picture, and call the video lead for anything past that. Projctl's main console gives them
power, test patterns, lens, schedules and Setup as well. That is more reach than the job needs,
and more than is safe to hand over on a show night.

Two facts about the current rig make an honest watch page harder than it looks:

- While the playback app is open it holds the control link to the two lamp projectors (lanes A and
  D on the current rig). The relay gets no reply from them, so it cannot read or command them.
  This is the normal state during a show, not a fault.
- The lighting console triggers the playback app directly. That cue traffic does not pass through
  the relay, so the relay does not know which cue was sent or whether video followed.

## Outcome

One page, served by the same relay at `show.html`, that tells the backup operator what the relay
can vouch for right now, says plainly where it cannot, offers one safe move (a shutter per lane),
and helps them call for help with the facts in hand.

## What the page shows

### Go or no-go strip

A headline above four items. Each item has a state word as well as a colour, and opens a short
explanation of where its reading comes from and what the page cannot tell.

| Item | Read from | Reads OK when | Cannot tell |
| --- | --- | --- | --- |
| Lanes lit | The relay's projector snapshot | Every lane has a current reply saying power is ON, with no alarm | Whether light reaches the surface; anything about a lane the relay has not reached |
| Outputs | `GET /api/host-displays` (the relay computer's own display report) | One display is flagged main and there is at least one more display per assigned lane, read within two minutes | Whether the playback app has a fullscreen window on each output; which display feeds which lane; whether the picture gets past the adapter and cable; whether the computer is locked |
| Cue link | Nothing yet | Never, today. It reads "Not connected" | Whether the console sent a cue or the playback app followed it |
| Show computer | The relay's five-second heartbeat | A heartbeat arrived in the last 15 seconds | Lock screen, display sleep, whether the playback app is open, which show file is loaded |

State words: **OK**, **Check by eye**, **Attention**, **No reading**. The headline is "Attention"
when any item is, otherwise "Nothing wrong reported" with a count of the items that still need the
operator's eyes. It can only read "All reported good" when all four items have a current reading,
which cannot happen while the cue link has no feed. That is deliberate: the page must not call the
rig good on the strength of the half it can see.

### Lanes

Four cards, A to D, in drawing order. A lane the relay is reading shows power (ON, OFF, WARMING,
COOLING), shutter (OPEN, CLOSED), the age of the reply and any alarm the projector reports. A lane
the relay is not reading shows **CHECK BY EYE** and the time of its last reply. The last known
power and shutter values are not shown at all, because a value from hours ago looks like a reading.

A reply counts as current for 15 seconds (three poll intervals), the same limit the relay applies
to commands. Ages are measured on the relay's clock, taken from its heartbeat, so a tablet whose
own clock is wrong cannot make a fresh reply look stale or a stale one look fresh.

In simulation the page says so in its header and at the top of every snapshot.

## What the page does

**Shutter, per lane, in two steps.** The first tap arms the move and sends nothing. The second tap,
on a Confirm button that names the lane and the direction, sends it. The confirm ignores its first
600 ms, so a double tap is not two steps. It expires after six seconds. Cancel, Escape, a timeout,
or the reading changing while armed all withdraw it. After the relay accepts the command the card
waits for the projector's own report and says "Reported CLOSED" only when that arrives; if it has
not arrived in 30 seconds the card says so and asks for a look.

A refusal shows the relay's own reason. No answer at all is worded differently: the card says the
relay did not answer and asks for a look, because the command may have left before the reply was
lost.

The control is offered only when the lane has a current reply saying power is ON. Otherwise it is
shown blocked with the reason beside it, for example "Relay can't reach it. Use the remote." The
blocked button stays reachable by keyboard so the reason can be read out.

The command is the relay's existing one, `POST /api/command` with `cmd: "shutter"` and the reviewed
target revision, so a projector that was swapped or re-addressed after the page drew it is refused
before anything is sent. The relay's own guards still apply at the write.

**Call for help with a snapshot.** One button builds a plain-text summary (time, headline, each
lane with its reply age or its gap, the other three items, Show Lock, the last move made from this
page), copies it, and shows it so it can also be selected by hand. A second control opens the
device's message composer with the text filled in. No phone number is stored in the page or the
repository; the number lives on the operator's printed card.

**Crew notes link (optional).** When the relay's private settings name an address, the page shows a
quiet "Notes" link with the caption "For notes that can wait. Not for emergencies or cue calls."
It opens in a new tab. It sits with the checks, away from the help button, and on a phone it is on
the Checks view only, so the Lanes view stays clear. With no address set, nothing of it is shown.
The page never requests the address; it is only the target of the link. Trouble during a show
stays a call for help with a snapshot.

## What it must not do

- No power, test patterns, input, lens, picture, presets, schedules, Setup, discovery or Show Lock
  control. The page source contains one write, the shutter command, and a test fails if that
  changes.
- No show file, playback app or display control of any kind.
- No group commands. One lane at a time.
- No value shown as a reading unless the relay's reply behind it is current.
- No address, name, phone number or passcode in the source.
- No request to any host other than the relay. Fonts and styles are local. The crew notes link is
  a link the operator may follow, not something the page loads or depends on.

## How Show Lock, stale and offline are respected

| Condition | Page | Relay |
| --- | --- | --- |
| Show Lock on | Shown in the header. Shutter moves stay available | Blocks power off, input, pattern, picture and lens. It has never blocked the shutter, in either direction |
| Reply older than 15 s | Lane reads CHECK BY EYE; shutter blocked both ways | Refuses Open; would still accept Close |
| Projector not reached | Lane reads CHECK BY EYE; shutter blocked | Refuses any command to it |
| Relay not answering | Every lane reads CHECK BY EYE; Show Lock reads unknown; shutters blocked | Not reachable |
| Projector reports OFF, WARMING or COOLING | Shutter blocked with that reason | Would pass it to the projector |

Where the page and the relay differ, the page is the stricter of the two. See SBP-4 and SBP-5.

## Layout

One viewport, no page scroll (WEB-2), light by default with Dark and System from the shared
appearance menu (WEB-1). A tablet or laptop shows the strip above four lane cards. Below 700 px
wide, or 520 px tall, the page shows one section at a time from a bottom rail (Lanes, Checks,
Help), with the headline always in view. A tiny or 400 percent zoomed screen shows one lane at a
time with an A to D picker. An ultrawide screen moves the strip into a side column (WEB-3).

## Interfaces and shared files

No change to the main console, sign-in page or styles. The page reads `GET /ws`,
`GET /api/host-displays`, `GET /api/crew-links` and (after a lost connection) `GET /api/state`, and
writes `POST /api/command` for the shutter only.

One new relay route, read only, for the crew notes link: `GET /api/crew-links`, behind the existing
login. It reads the private file `crew-links.json` beside the rig, in the settings folder that
survives an update (a file under `public/` would be replaced with the app):

```json
{ "notes": { "url": "https://…" } }
```

It answers `{ "notes": { "url": "…" }, "state": "configured" }`, or `notes: null` with a state of
`not-configured`, `invalid` or `unreadable`. Only `http` and `https` addresses are accepted, at most
300 characters, with no embedded credentials. The relay never opens or checks the address. The page
treats anything but a usable answer as "not configured", so it also runs on a relay without the
route. No address, host name or product name belongs in this repository; the tests use a reserved
example name.

New files: `public/show.html`, `public/show.js`, `public/show-model.js`, `public/show.css`,
`server/crew-links.js`, `test/show-backup.test.js`, `test/show-backup-browser.cjs`, this brief.

Shared files touched, four: `package.json` (the browser test is appended to `test:browser`), the
repository `CHANGELOG.md` (one entry), `scripts/verify_indexing_policy.js` (the count of tracked
routes outside the sitemap goes from 217 to 218 for this noindex page), and `server/index.js` (two
added lines: the import and the `GET /api/crew-links` route). Nothing else. Any other branch that
adds a page moves the indexing count too, so the second to merge must add one more. Another role
page that wants the same link can use the same route.

The page reuses three existing modules without changing them: `lanes.js`,
`projector-connection.js` and `status-feedback.js`.

## Cue link: what it would take

Not built. The item reads "Not connected" until all of this exists and is accepted:

1. **A source.** Something that sees the console's cue traffic. Today that is a separate capture
   tool on a different computer from the relay. Either that tool forwards each cue it logs, or the
   capture moves onto the relay computer.
2. **A way in.** A new authenticated relay route that accepts one small record per cue (cue
   reference, the capture's receive time, the source's identity), bounded and rate limited like the
   other routes. It must not ride on the existing cue ports, which are unauthenticated and carry
   commands.
3. **A reading.** The relay keeps only the last few records in memory, stamps its own receive time,
   and publishes "last cue and its age" in the snapshot. The page then shows the cue reference and
   age, and marks the item stale when the source goes quiet.
4. **The second half.** "Console sent it" is not "video followed". Proving that needs a reading from
   the playback app as well, which is a separate source and a separate acceptance.

## What this page needs from the access proposal

Roles, passcodes and network binding are proposed once, for every role page, in the
[power operator page brief](power-operator-page.md) (decisions ACCESS-1, ACCESS-2, NET-1, NET-2 and
NET-3). This page adds no second proposal. It needs the following from that one.

**Today.** One shared passcode gives a signed-in device the whole API and the main console at `/`.
This page is limited by what it offers, not by what the relay allows. Until ACCESS-1 is answered
and built, every holder of the passcode is a full operator, whichever page they open.

**The show backup row for the role table in that brief:**

| Role | Pages | API routes | Commands |
| --- | --- | --- | --- |
| Show backup | `show.html` and its assets, sign-in | `ws`; `GET api/state`; `GET api/host-displays`; `GET api/crew-links`; `POST api/command` | `shutter` only, one slot at a time, with a reviewed target. No group target |

The page uses these snapshot fields and no others: per projector `slot`, `lane`, `model`, `label`,
`driver`, `ip` and `mac` (only to tell one device from another; never shown), `controlRevision`
and `status` (power, shutter, alarms, connection); plus `lock`, `simulation`, `relay.startedAt` and
`relay.pollIntervalMs`. A reduced snapshot for this role could drop events, presets, schedules,
inputs, patterns, lens, picture, thermal and diagnostics, and replace `ip` and `mac` with any
stable device token.

**Also needed:**

1. **Landing.** A sign-in with this role lands on `show.html`. The existing `next` parameter
   already returns here after a sign-in.
2. **Reach (NET-2).** The relay must answer on the network the lighting position's device is on
   and on the house wireless network. It listens on every interface today, so this is a question
   of networks and firewalls, not of a code change. If NET-2 narrows the binding, both networks
   must stay in.
3. **Cue ports (NET-1).** Answer it before this page's device, or any other new device, joins
   those networks. A cue can close or open a shutter and power a projector on with no login.
4. **Sessions.** A relay restart ends every session and returns this page to the sign-in. On a
   show night the operator needs the passcode to hand, or sessions that survive a restart.
5. **Transport (NET-3).** On a plain `http` address the browser withholds the Clipboard API. The
   page falls back to a selection copy, so the snapshot does not depend on the answer.

## Verification

Run from `apps/projctl`, against isolated simulator relays only:

- `node --test test/show-backup.test.js`: reading rules (unreached, stale, unassigned, lost relay),
  when a shutter move is offered, each strip item and the headline, alarms, the snapshot text, the
  source limits (no address, number or host name; one write; relative routes only), serving with a
  full head, the sign-in redirect when a passcode is set, the relay rules the page relies on
  (reviewed target, shutter under Show Lock, refusal for an unreached projector), and the crew links
  settings (accepted and refused addresses; configured, not configured, invalid; behind the login).
- `node test/show-backup-browser.cjs` (part of `npm run test:browser`): a simulator relay with B
  and C lit and A and D unreachable. Covers the lane and strip readings, the two-step shutter with
  Cancel, Escape, timeout and the double-tap guard, the command body, the projector's report, a
  refusal from the relay, a command the relay never answers (the page does not claim it was not
  sent),
  Show Lock, the details dialog, the snapshot through both copy paths, keyboard focus, a display
  report fixture (enough outputs, too few), an alarm, a reply going stale while armed, a lost
  relay, a device clock ten minutes out in each direction, the return to sign-in, the crew notes
  link (hidden when not configured; shown with its caption, new-tab target and no request to its
  address when configured; hidden again on an unusable answer or a relay without the route), and
  fit (no page
  scroll, nothing outside the viewport, no card cutting its own text) at 1440×900, 1024×768,
  768×1024, 375×812, 375×667, 844×390, 320×256 and 2560×720 in both themes.
  Set `SHOW_BACKUP_SHOTS` to a folder to keep screenshots.
- A one-off axe-core pass (WCAG 2 A and AA, 2.1 AA and best practice) on the simulator found no
  violations in 26 views: four sizes, both themes, both small-screen views, an armed lane and both
  dialogs. It is not part of the committed suite, because the app has no axe-core dependency.

## Not tested

- Any real projector, any real relay computer, any venue network. No command from this page has
  reached hardware.
- The display report on the real show computer. The Outputs rule was exercised with a fixture; the
  simulator's reader is off. Whether the real report flags the control monitor as main, and how it
  looks while the computer is locked or its displays sleep, is unknown.
- Real phones and tablets, Safari and Firefox. The browser test runs Chromium only. The message
  composer link and the selection copy on a plain `http` address were not tried on a real device.
- A screen reader. Roles, names and focus order were checked in code and by keyboard in the test,
  not with assistive technology.
- A long session: hours of connection, a sleeping tablet waking, a network change.
- The crew notes link against a real notes service. Only the link itself was checked, with a
  reserved example address; nothing was opened.
- Readability in an actual dark booth.

## Open decisions

The first option in each row is the recommendation. None is answered.

| ID | Question | A (recommended) | B | C |
| --- | --- | --- | --- | --- |
| SBP-1 | Where does the help number live? | Nowhere on the page. It is on the printed card; the operator pastes the snapshot | The relay reads it from a private file beside the rig and serves it to signed-in pages. Needs a small relay change; anyone with the passcode can read it | Saved once per device in the browser by the video lead |
| SBP-2 | What counts as "outputs present"? | One main display plus at least one more display per assigned lane | A fixed expected count saved in the private rig settings | Show the count only, with no judgement |
| SBP-3 | Cue link | Leave it "Not connected" for this run | Build the feed described above | Remove the item until a feed exists |
| SBP-4 | Should Show Lock block Open from this page? | No. Keep the relay's rule: the shutter works both ways under Show Lock, as on the main console | Block Open on this page while Show Lock is on; Close stays | |
| SBP-5 | Shutter on a stale reply | Blocked both ways, as on the main console | Allow Close on a stale reply, which the relay accepts | |
| SBP-6 | How is the page found? | No link from the main console. A bookmark on the operator's device, opened once with the video lead present | A choice on the sign-in page, once roles exist | |
| SBP-7 | Lanes the relay cannot reach during a show | "Check by eye" and the handheld remote, as built | Change how the relay reaches them, so the page reads them with no change here | |
| SBP-8 | Crew notes link | Leave it unset until the notes service can be reached from the operator's device, then set the address in the relay's private settings | Set it now, so the link is in place when the service becomes reachable; until then it leads nowhere for this operator | Leave the link out of this page |

Later slices, not part of this version: a lock-screen and display-sleep reading from the relay
computer, a reading of the playback app's output windows, and the cue link.

### Handoff decisions this page depends on

These are tracked in the private control handoff brief, not in this repository. All are open. HANDOFF-4 and HANDOFF-7 do not affect this page.

| Handoff decision | Effect here |
| --- | --- |
| HANDOFF-3: how far the backup operator's reach goes | The shutter control exists because the recommended answer includes it. If the answer is "watch only", the control is removed and the rest stands |
| HANDOFF-1: how the two lamp projectors are powered and controlled | Decides SBP-7. Today they read "check by eye" |
| HANDOFF-2: whether the show computer stays awake between shows | Decides how often "Show computer: not answering" will be seen and what it means |
| HANDOFF-5: who quits and reopens the playback app around the power cycle | The page has no pre-show or post-show checklist. If the backup operator owns those steps, that is a separate slice |
| HANDOFF-6: which role page is built first | Both first versions were started together; installing either is a separate decision |

## Installing

The four page files are static and need no relay restart to serve. They were copied to the show
computer on November 18 at the owner's instruction and read back by digest; the relay answered
`show.html` with the sign-in redirect. Nobody has yet signed in and watched it against the real
rig. To remove the page, delete `show.html`, `show.js`, `show-model.js` and `show.css` from the
relay's public folder. The crew notes link needs the updated relay code and one restart, which has
not been done. The role and network questions above are still open.
