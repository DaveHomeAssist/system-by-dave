# Frozen Startup

Build a portable startup coordinator for the five-display projection computer.
The operator needs correct display identities, desktop modes and layout before
Millumin opens, followed by an explicit show-night readiness check.

This offline release consumes version 1 JSON profiles and observations. It
resolves physical connections independently of transient display IDs, waits for
stable observations, requests restoration, verifies the result and checks
Millumin routing. It produces a private receipt and a concise operator message.
A fixture bridge exercises the entire sequence without contacting equipment.

A deployment bridge is an explicit local executable implementing the documented
protocol. Studio integration, BetterDisplay version qualification and supported
Millumin routing readback remain commissioning work. The package installs no
login item. It contains no projector power, shutter or cue client. Its only
network use is the read-only mid-show watch, which asks the Projctl relay three
fixed questions (see README, "Mid-show watch").

Readiness requires current computer checks and this run's operator observations
of all four surfaces, the intended show, opening look, removed test cards and
reviewed warnings. A restart invalidates those observations. A warm check reads
configuration without restoring or launching applications. Failure retains a
receipt and requires an explicit retry. No continuous repair runs during shows.

ECP-1.0 revision 1.0 applies to the adapter boundary. This package owns only its
profile and receipt schema. It does not alter Screen Check or Projctl schemas.
Private hardware identities, show paths and production profiles stay outside the
public repository. Example data is synthetic. Verification covers missing,
duplicate, extra and changed display identities, partial failures, timeout,
stale evidence, warm operation and readiness. Native and physical acceptance
require separately authorized Studio testing.

Startup recovery may retry the approved display layout once when readback
shows drift and all five physical identities settle again. Warm checks remain
read-only. The receipt records retry attempts and the UI attributes failures to
the check that actually failed. Millumin routing changes remain manual.
