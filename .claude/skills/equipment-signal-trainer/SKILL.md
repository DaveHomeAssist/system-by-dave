---
name: equipment-signal-trainer
description: Build sourced signal-path lessons and observation-based troubleshooting for interconnected equipment, separating picture, return, control, tally, intercom, reference, and power. Use for interactive signal tracing, equipment-routing instruction, and symptom decision trees.
---

# Teach and diagnose one function at a time

Build a directed route for the requested function using identified endpoints and dated configuration evidence. Keep shared physical cables separate from the functions they transport. Let the operator start with either a task or a symptom.

## Establish the route

1. Identify the rig/configuration, selected function, origin, destination, connector labels, and known intermediate devices. Reuse component IDs and add stable port/edge IDs where needed. Do not invent IPs, VLANs, channel assignments, firmware, or converter direction.
2. Classify each connection as an observed installed path, documented intended path, reported patch, inference, or unknown. Preserve contrary evidence. A generic manufacturer diagram establishes a possible architecture, not the venue's present wiring.
3. Record signal direction per function. A bidirectional transport may carry independent outbound and return services; do not draw one arrow that implies they all follow the same direction or have all been tested.
4. Include relevant format, assignment, control ID, software/configuration dependency, and conversion behavior only when sourced. Distinguish a cable's connector from the signal standard and the device's supported modes.

Use [the route and diagnostic reference](references/signal-and-diagnosis.md) and [the route template](assets/signal-route.json) for multi-hop work. A short answer can use a small endpoint table instead. Keep templates illustrative until populated from evidence.

## Teach the path

Highlight only the selected function, with concise endpoint labels and an equivalent readable step list. Offer engineering details on demand. Distinguish transport, conversion, switching, selection, display, and feedback. Label unverified sections directly in the diagram with text/line style as well as color.

Provide an expected observation at each useful checkpoint. Require separate observations for picture, return, remote control, tally, two-way comms, reference lock, and power as applicable. Seeing a picture does not prove all services on a shared transport. A return seen on one monitor does not establish which port supplies control or that every return selector works.

## Diagnose from observations

Start with exact symptom, scope, last known working condition, and any recent change already provided. Do not re-ask facts established in the session. Select a low-disruption check that distinguishes plausible causes. Each branch needs: starting condition, action, expected outcomes, what each outcome supports, next check, and an `unknown/not tested` path.

Use known-good substitution only when its signal format and relevant behavior are established. Change one meaningful variable at a time and record how to restore it. Treat power, connector handling, calibration, or show-critical routing changes according to the equipment procedure and the actual operating context. Do not turn a lesson into automatic control of live hardware or repeat irrelevant showtime warnings to an experienced operator.

Avoid conclusions beyond the observation: signal lock is not proof of correct source/content, a displayed image is not proof of shading, and a successful reset does not identify root cause. Stop when the fault is isolated or the next discriminating test needs unavailable access; state the evidence needed.

## Deliver and verify

Deliver the route/lesson or executable diagnostic tree requested, with endpoint evidence and unknowns. Exercise both successful and failed branches in simulation when building an app. Keep simulated results, field tests, and fault closure separate. Do not mark a physical system ready or a reported fault resolved from a training interaction.
