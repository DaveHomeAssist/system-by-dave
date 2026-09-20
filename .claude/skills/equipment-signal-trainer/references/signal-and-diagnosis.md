# Signal routes and diagnosis

## Data to retain

| Object | Fields |
| --- | --- |
| Component | Stable ID, exact model when known, equipment scope |
| Endpoint | `endpoint_id`, component ID, physical label, connector, input/output/bidirectional/unknown |
| Connection | `edge_id`, origin/destination endpoint, selected function, medium, relevant format/configuration, confidence, sources |
| Observation | Tested function, location, action, expected/actual result, time, observer, configuration |
| Diagnostic node | Symptom/hypothesis, check, outcome branches, unknown branch, restoration/coordination if needed |

Keep physical attachment (`parent_id`) separate from these routes. Several function edges can share one transport ID, but should retain independent direction and check state. Assign unknown fields `null` or the project's explicit unknown value; do not fill them with plausible defaults.

## Useful discriminating checks

| Observation | What it supports | What remains unproven |
| --- | --- | --- |
| Image at a named output | Picture exists at that checkpoint under tested conditions | Later path, control, tally, comms |
| Return visible at one display | That display can show that tested source/path | Other returns, remote control, camera-ID mapping |
| Remote iris command visibly changes the intended camera | Tested control command reached that camera in this configuration | All controls, other cameras, long-term reliability |
| Speech heard in both directions | Tested two-way comms for the named endpoints | Other channels/positions |
| Receiver reports reference lock | The stated receiver reports lock in the test | Complete system timing or measured delay alignment |

These are diagnostic distinctions, not a wiring specification. Use the exact manufacturer's manual to determine how a product transports or embeds any function.

## Diagnose picture present, control absent

Preserve the working picture-path observation. Check the configured identity and supported control path, then observe a coordinated reversible command at the intended destination. Compare the observed control endpoint to the documented route. Do not conclude a missing cable, bad firmware, or broken converter without a distinguishing observation. If the return/control patch is unknown, retain multiple hypotheses and identify which endpoint must be traced.

## Verification boundaries

A current venue route requires actual endpoint evidence for that configuration. A device specification proves capability; a configuration export documents settings; a field test documents behavior. Keep these evidence types distinct. Use source links in engineering detail and omit private record contents from public operator material unless authorized.
