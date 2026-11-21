# Offline projector check planner

First source slice for the accepted projector camera check. The planner is part
of Projctl, but is not imported by the relay, drivers or operator pages. There is
no installation, equipment access or control path in this change.

## Operator outcome

Review a proposed morning or picture check before an eventual released test.
Startup proposals follow C, B, A, D, preserve already-on units, and describe the
quiet, lamp relight and floor geometry waits. The operator supplies the existing
test card. Diagnostic lamp faults stop the affected lane without retries.

From the package directory:

```sh
node scripts/check-plan.js samples/check-snapshot.json
node --test test/check-plan.test.js
```

The JSON output is always `offline: true`, `executable: false` and
`showReady: false`. Global blockers and per-lane reasons must be displayed in a
future interface. A proposed start is a planning suggestion, never permission
to send it. No timestamps in this sample represent installed equipment.

## Input contract

`projctl.check-snapshot.v1` uses epoch milliseconds for `nowMs`, `observedAtMs`,
`stateSinceMs` and `lastStartAtMs`. Freshness is bounded to 15 seconds. Power is
`on`, `off`, `warming` or `cooling`. Lamp lanes need an explicit `lampError: 0`.
Missing elapsed times remain unknown. Cooling/warming requires a new observed
state rather than a guessed completion time. A 75 second lamp relight exclusion
starts from confirmed off. Quiet waits are independent of geometry waits.

The provisional synthetic profile uses 20 minutes of floor warmup and 60 seconds
of Panasonic quiet time. It has not been physically qualified. Waits are minimum
constraints relative to their named events, not predicted completion timestamps.
They can overlap; they are not added into a falsely precise ETA. Existing
power-run automatic lamp retry remains untouched and is not reused here.

## Accepted scope and later gates

The accepted choices are Projctl integration, manual test-card enablement and
no diagnostic restrike. This first version builds only the offline planner.
Future work is the shared operation lease, bounded camera reader, isolated
surface comparisons, interruption journal, explicit restoration and UI.
No deployment or installation is included. Device feedback, optical response,
source routing, geometry and human acceptance need separate evidence.

ECP-1.0 revision 1.0 applies: lane identity is stable, equipment state remains
reported evidence, and execution ownership remains with the existing runtime.
This additive report schema does not change rig definitions or driver APIs.

## Saved optical evidence

`server/shutter-evidence.js` adds a pure saved-frame evaluator consumed by the
private local Check Desk workbench. `projctl.shutter-input.v1` includes stable
lane identity, a profile, baseline, three `openFrames` and three `closedFrames`.
Decoded RGB frames carry ordered distinct IDs/timestamps, view/exposure
revisions and explicit visibility qualification. Target and control masks are
disjoint pixel-index arrays. The target must brighten on open and return near
baseline on close while the control region stays stable. Thresholds and maximum
evidence span are supplied by the qualified profile. Outputs are candidates,
with device response, routing, restoration and show readiness unverified.

No driver, relay route, packaging change or browser page is added to Projctl.
The workbench builder embeds this source by explicit path and records its hash;
there is no second maintained evaluator implementation. Camera files are decoded
locally by the consumer, not acquired from a network. Test with
`node --test test/shutter-evidence.test.js`. Physical profiles remain unqualified.
