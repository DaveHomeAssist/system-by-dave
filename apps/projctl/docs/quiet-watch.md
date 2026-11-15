# Quiet Watch hardening brief

## Operator problem

A reachable relay is not proof of a current projector reading. Cached fields, missing pattern responses and late command responses can mislead the operator. Malformed browser traffic must not take the relay down.

## Intended outcome

The operator can distinguish fresh reports, last-known information and unavailable fields without issuing a command. The relay remains available when a browser sends malformed or unauthorized requests. A visible release identity makes the installed version verifiable.

## Audience and navigation

Apply the same clarity across Home, the shared workspace, Controller, Monitor and login. Crew need reference, schedule, notes and clear access guidance. Operators need fast status and deliberate controls. Maintenance needs diagnostics and configuration without obscuring the show view. Preserve routes, browser notes, task data, projector identities and existing visual tokens.

## Smallest useful slice

- Preserve the controller and configuration in a verified recovery archive before live changes.
- Reproduce current feedback and ingress defects against simulation and loopback fixtures.
- Correct only demonstrated status, command-ordering and ingress defects.
- Make the recovery package identifiable and verifiable; preserve installed workspace authentication behavior.
- Review and refine Controls and Monitor readability at desktop, tablet, phone and ultrawide sizes in both themes.

Opening a view, changing theme and reconnecting must remain inert. A command acknowledgement must not imply a confirmed physical result. Unknown values stay unknown, and last-known values carry that label.

## Security and ease of use

Prioritize realistic show risks: stale feedback, accidental or repeated commands, target confusion, browser failures and unavailable recovery access. Keep existing quick access and authentication. No new login prompts, role system, network restriction or credential change is part of this work. Browser origin validation and bounded malformed-traffic handling must preserve ordinary browser, embedded-workspace and native-client flows.

## Compatibility and boundaries

ECP-1.0 revision 1.0 applies. Projctl retains command ownership. Slot IDs, lane identities, private rig files, cue routes and existing persistence formats remain stable. Authentication and optional workspace embedding must be preserved. Additive release metadata is allowed; no private rig or credentials enter this repository.

No redesign of protocol drivers, new dependency, new schedule or automatic power action is required. Tests run against isolated simulation and loopback servers. Physical image acceptance is separate and is not inferred from protocol feedback.

## Acceptance

- Recovery archive can be read and its off-host digest matches the original.
- Malformed requests and WebSocket frames cannot crash the relay.
- Cross-origin browser command requests cannot use the controller's credentials.
- Missing or stale telemetry never displays as an affirmative current state.
- A late HTTP command reply cannot overwrite a newer WebSocket reading.
- Controls remain usable, contained and keyboard accessible in both themes at required viewports.
- Version identity agrees across package, health API and the operator interface.
- All relevant unit, protocol and browser regressions pass; no test reaches physical projector addresses.
- The primary dashboard fits one screen. House state takes priority; Activity, Today and Health have deliberate views, bounded rows and concise labels. Detailed records open on demand.

## Efficiency candidates

Measure before implementing: reduce duplicate DOM work on heartbeats, back off disconnected browser reconnections, and report response freshness separately from relay liveness. Preserve the existing one-reader-per-projector telemetry queue and avoid extra device polling for UI animation.

## Monitoring dashboard integration

Health opens a read-only Software checks dialog from `projctl.test-report.v1` receipts produced by `scripts/test-report.js`. Each receipt identifies the release, full source commit, execution environment, runner, finish time and every executed check. Failed and timed-out checks remain visible. Deployment, live readback, physical output and human acceptance stay separate. A passing simulation receipt must never make the live system appear verified.

The relay reads `software-checks.json` beside its saved rig and compares the receipt with the installed `DELIVERY.json` source commit. Only an exact match can show Checks passed. Other receipts remain dated package records. Missing receipts add no dashboard control; malformed receipts show a review message. The dialog paginates the recorded checks and cannot run tests or send equipment commands. Keep private receipts with operational records; the API omits runner identity, private rig data, credentials and raw logs. Receipt delivery is an explicit release step, not an automatic test schedule.

After completing isolated checks and committing their exact source:

```sh
node scripts/test-report.js results.json report.json FULL_SOURCE_COMMIT isolated-runner
```

`results.json` contains `{ "name": "suite name", "code": 0, "seconds": 12.3 }` entries. Include unsuccessful checks; do not omit them to obtain a passing report. A receipt covers only its listed checks, not every possible journey.
