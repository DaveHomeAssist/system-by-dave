# Security hardening branch

These changes are source changes only. They do not configure, restart, or deploy the Studio. Regression tests have been added but have not been executed in the authoring session.

## Cue access

Web login does not authenticate OSC or text TCP cues. Existing bind/exposure defaults remain unchanged to avoid silently breaking show cues. Configure the service environment explicitly before wider access:

- `PROJCTL_OSC_ENABLED=0` disables OSC. `1` enables it (default).
- `PROJCTL_TCP_ENABLED=0` disables text TCP. `1` enables it (default).
- `PROJCTL_CUE_HOST=127.0.0.1` binds both enabled cue listeners to loopback. Use a verified local interface IP for remote show-control clients. The OSC socket is IPv4; use an IPv4 bind address when OSC is enabled.
- `PROJCTL_CUE_ALLOWLIST=127.0.0.1,192.0.2.10` accepts only the listed source IPs. Replace example addresses with verified cue senders. An unset or empty list permits all source IPs and emits a startup warning when not explicitly loopback-bound.

Allowlist entries must be literal IPs, not hostnames or CIDR ranges. Invalid configuration fails closed at startup. IPv4-mapped addresses and equivalent IPv6 representations are handled by the policy. Source restrictions are not cryptographic authentication; use firewall/network isolation. The passcode does not secure cue ports.

Cue ingress limits from the first batch remain in effect. TCP OK means receipt, not physical execution. Overload or oversize closes TCP clients; excess OSC datagrams are dropped. No automatic replay is added.

## PJLink

Outbound commands are restricted to the implemented Class 1 grammar, blocking CR/LF injection through input values. Handshakes and response class/command must match. Setters require an OK acknowledgement. Response bytes and discovery results are bounded. Optional telemetry starts unknown on every successful sample, so unsupported alarm/hour/name queries cannot inherit prior values.

## Still open

HTTP-body size/time limits and proxy-aware bounded login throttling require editing the full server/index.js. The connector returned a truncated copy; those changes are not included or claimed fixed. Pulse response validation, execution-time Show Lock guards, and Stop-lens reliability also remain open. Do not merge or deploy this branch until the complete changes are reviewed and Node/browser tests pass.

Run the focused regressions from apps/projctl with `node --test test/cue-ingress.test.js test/security-protocol.test.js`, then run `npm test` and the browser suites. Use isolated simulator settings, never the active Studio rig, for development.
