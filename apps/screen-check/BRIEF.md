# Frozen Screen Check

## Outcome
Give the show operator a small native macOS checklist at login and on demand.
Verify the identity, count, actual output pixels, desktop dimensions, refresh
rate and extended-display state of the expected displays. Never report a scaled
1080p desktop carried over a 4K output as a correct 1200-line show output.

## First useful slice
One menu-bar app, one compact checklist, Check Now, exportable JSON and native
login-service registration. Recheck after screen changes and wake, with a short
settling delay. No polling loop, network dependency, projector commands, mode
changes, login password storage or automatic repair. Normal login is the first
supported check after boot; FileVault and pre-login screens are outside scope.

The initial profile reflects the production Mac's November 8, 2026 readback:
two PT-DW830U outputs, one PT-RZ970 output, and one UDM-4K output each at
1920×1200 / 60 Hz, and an operator monitor at 1920×1080 / 60 Hz. These are Mac
signal requirements, not claims about a projector's physical imaging resolution.
The two DW830U units share a model identifier and are verified as a pair; the app
does not infer A/D assignment from unstable macOS display numbers. The operator
can edit the local versioned profile when the approved show setup changes.

## Acceptance
- A valid identity match precedes a resolution pass; names alone never match.
- Missing, additional, mirrored, scaled, wrong-rate and unreadable outputs do
  not pass. Unknown refresh rate is explicit. 59.94/59.95 and 60 Hz are accepted.
- Both members of the identical-model pair must be present and correct.
- Bad profile edits show an error, with no silent fallback to a passing profile.
- Login registration reflects the actual macOS approval state. Automatic
  checks do not steal focus during a show; login opens the checklist after a
  settling period only if attention is needed. Launching on demand opens it.
- The packaged Apple Silicon app launches, exports and reopens on macOS;
  Studio installation, login/reboot and real five-display checks remain a
  separate hardware acceptance lane until exercised there.

## Compatibility
ECP-1.0 revision 1.0: this is a read-only consumer of macOS display observations.
The profile owns its expected output policy; neither it nor imported observations
modify Projctl, Millumin, the equipment catalog or hardware. Matching uses
manufacturer/product IDs, not collection order. Unknowns are preserved.
