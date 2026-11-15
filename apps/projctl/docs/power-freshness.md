# Power Freshness 1

## Problem and acceptance

A status poll can receive valid current power and then lose its later optional
telemetry. Previously that later error discarded the power reply and left the
operator with an older state. Preserve validated power and completed fields,
while keeping failed, missing or invalid fields explicitly unknown/stale.
Missing or invalid core power must still fail. Cancellation, target replacement,
command follow-up and recovery must not publish an obsolete observation.

## Reconciliation

This release incorporates the remaining Power Freshness Candidate 1 behavior
into the current canonical source. Existing independent PJLink power reads,
standby handling and whole-poll serialization are retained. The current
fieldFeedback UI, command-progress behavior and Panasonic web diagnostics are
preserved rather than replaced with the older candidate UI. The existing
telemetry queue still coordinates status and health reads; no broad queue around
all Panasonic public methods is introduced.

PJLink publishes each validated reply to an optional onPartial callback. Pulse
validates its response envelope and recognized power state, then publishes
completed optional fields before capability discovery. Panasonic forwards those
snapshots and adds a valid native pattern reply when available. Failed optional
fields remain null/unknown and are listed in stale. Fresh successful polls replace
that list. No setter is retried by this path.

The poller may retain a validated snapshot only for its poll deadline. Other
errors, a changed target and a stopped poller cannot promote it. A retained power
observation can precede poll completion by up to the existing 10-second deadline;
there is no independent field timestamp or polling interval change. Optional
transport failure does not mark the whole projector offline after current power
has been observed. Pulse partial lens data stays unknown; capability discovery
may finish on a later poll.

## Verification

Run in an isolated checkout and network namespace with only loopback available:

```sh
npm test --prefix apps/projctl
npm run test:browser --prefix apps/projctl
npm run test:venue-browser --prefix apps/projctl
```

The test command runs the standard Node suite, then socket-power.test.mjs
separately because its Panasonic fixture owns loopback port 4352. Cases include
optional timeout/connection loss, retained fields, missing/invalid core,
standby transitions, cancellation, cleanup, recovery and no command replay.
The browser suites retain current field honesty and command-progress behavior.
Simulation is software evidence, not physical projector acceptance.

## Deployment gate

Use the committed source with scripts/package-update.js, then verify its
DELIVERY.json through scripts/verify-update.js. Preserve the generated Throwline
runtime and identify the package by release name, full source commit and SHA-256.
The package contains no live rig, credential or environment configuration.

Preparation does not authorize deployment. Activation requires a separately
approved controller maintenance window using the managed-service runbook,
with saved settings, rollback backup and post-start version/health readback.
Physical power/shutter testing is a separate explicit action. Do not start a
second relay while preparing the package.

ECP-1.0 revision 1.0 applies. Rig schemas, slot/lane identity, control authority,
existing settings and cue routes remain unchanged.
