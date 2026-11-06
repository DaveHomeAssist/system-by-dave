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
