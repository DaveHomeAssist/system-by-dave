# Lens presets and login compatibility

This integrates the relevant backend changes from user-supplied
`feat/projctl-lens-presets-auth`, commit
`cf0ce5b42d8c7323fc80c907ae2bd05f7f351055`, onto the managed-service app.
It does not replace current installers, settings, project files or hosting with
the older branch's deployment examples. The public WST hostname already hosts
the workspace; do not repoint it to an unprotected controller.

A driver reports `capabilities.lensRecall` only when it implements absolute
recall. Pulse can save finite per-axis encoder positions; Panasonic jog control
does not imply absolute recall support and those positions are not stored.
Saving a lens-bearing preset reads cached feedback and does not move motors.

The first `POST /api/preset/recall` with `{name}` returns a bounded confirmation
and supported/unsupported axes without moving a lens. A second request with
`{name,confirmLens}` consumes that token and checks the original device identity.
Show Lock, offline and busy protections still apply. A lens-bearing preset recalls
lens positions only; legacy presets without stored lens axes retain their prior
power/input/shutter behavior. Position match, unknown/mismatch and motor-stopped
feedback are separate results. A failed post-recall poll reports unknown position/motor feedback; retained last-known values never verify the completed movement. Re-hanging still requires alignment/focus checks.

Compound Pulse recall validates all requested axes and travel limits before its
first target, rejects invalid axes/values, and requests stop on all involved axes
if a later target send fails. Motion completion remains bounded and Stop cancels
queued writes. These safeguards are fixture-tested; no physical acceptance is
implied and installation never recalls a preset automatically.

`PROJCTL_PASSWORD` enables the existing login; `PJ_PASSCODE` remains a supported
fallback. Existing service authentication is preserved unless an operator
explicitly supplies a password variable. An explicit update replaces the other
alias so it cannot silently override the chosen password. No secret is included
in source, launchers or public receipts.

HTTP and WebSocket use the same session. Cookies are HttpOnly, SameSite=Strict,
Secure when trusted deployment supplies HTTPS forwarding, expire after90 days
and are invalidated by a relay restart. Rate limiting includes Retry-After.
This does not itself create a tunnel, DNS entry, public endpoint or membership.
Cross-site iframe authentication and the actual Studio crew endpoint require
separate verification; Strict cookies must not be advertised as working inside
a public cross-site iframe. Same-origin local workspace tabs remain available.

`capabilities.lensJog` declares implemented axes, speeds, mode, Stop support and
position-readback support without querying a projector. Pulse and simulation use
bounded steps (slow/normal/fast: 128/512/2048 native units); Panasonic uses its
three native jog speeds, with no Stop or absolute-position readback implemented.
PJLink reports unsupported with empty axes/speeds, even though its driver exposes
a method that throws NotSupported. The legacy `capabilities.lens` flag follows
these implemented jog axes. Metadata does not establish current motor availability;
connection, busy, lock and command/readback guards still apply.


Selecting an assigned projector opens its lens workspace. Fine/Normal/Coarse
select the supported native increments or jog speeds; they are not a duration or
an absolute distance. Arrow keys affect shift only after explicit Enable arrow
keys and while the dedicated keyboard area has focus. One press sends one jog;
auto-repeat is ignored. Release requests Stop only when supported and a move is
pending. Escape, blur, hidden page, target changes, disconnection, offline state
or Show Lock disarm keyboard control. Ordinary edits elsewhere do not move a lens.
Panasonic exposes no Stop button because that driver implements native jogs only.

Button acknowledgement describes the command response, never an optimistic power,
shutter or lens state. A fresh confirmed shutter reading exposes its opposite
action only; unknown/stale/offline telemetry retains both explicit choices with
existing guards. Group shutter choices remain explicit. Saving/recalling from the
lens panel is a **rig preset** action: review its summary and explicitly confirm
all involved targets, rather than assuming it moves only the selected projector.
