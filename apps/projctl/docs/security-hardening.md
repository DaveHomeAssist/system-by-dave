# Security hardening

These changes are source changes only. They do not configure, restart, or deploy the Studio. The focused regressions listed at the end pass in isolated simulator relays. The full Node suite (`npm test`, 119 tests in 32 files) passed on 2026-11-10 at `58f3e1b`. Pull-request CI runs the Node and browser suites on Linux. Physical projectors are a separate acceptance step.

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

## HTTP and login

`server/http-security.js` owns these limits; `server/index.js` applies them.

- JSON request bodies are limited to 64 KiB (login: 4 KiB), counted while streaming, so chunked bodies cannot bypass a declared length. A body must arrive within 10 s. Oversized bodies return 413, stalled bodies 408, and both close the connection. Malformed JSON, invalid UTF-8 and non-object JSON return 400 instead of 500. An empty body is still `{}`.
- The HTTP server allows 15 s for request headers and 30 s for the complete request. These bound how long a client may take to send a request, not how long the relay spends answering it (lens moves and polls are unaffected).
- WebSocket frames from browsers are capped at 64 KiB. The UI never sends any.
- `X-Forwarded-For` and `X-Forwarded-Proto` count only when the TCP peer is a trusted proxy. `PROJCTL_TRUSTED_PROXIES` lists literal proxy IPs (comma-separated, no hostnames or CIDR). The default, `127.0.0.1,::1`, covers `deploy/tailscale.sh serve|funnel`, which forwards from loopback, so whatever forwarding headers Tailscale supplies are honored exactly as before; direct LAN clients can no longer spoof them. Which headers Tailscale sends has not been verified on the Studio box. Set it to an empty value to ignore forwarding headers entirely; then every proxied client shares the proxy's lockout and cookies are never marked `Secure` behind a proxy. Invalid values stop startup.
- The client address is the nearest untrusted hop in `X-Forwarded-For`, so a spoofed leftmost entry cannot pick a fresh lockout bucket. A malformed chain is attributed to the proxy itself.
- Failed logins back off exponentially (2 s, 4 s … 60 s) per client, as before. Records are forgotten 15 minutes after their lockout ends. The table holds at most 1,024 clients: idle records are evicted oldest first and active lockouts are never evicted. If every slot holds an active lockout, new clients share one overflow lockout instead of escaping the limit.
- The lockout is checked before the body is read and again after it arrives, so a parallel attempt that fails while a slow body is in flight still blocks it.

## Still open

Pulse response validation, execution-time Show Lock guards, Stop-lens reliability, preset semantics, persistence failure handling and Panasonic numeric validation remain open. Merging publishes source only. Installing on the Studio is a separate step for a safe show window: confirm the cue environment and `PROJCTL_TRUSTED_PROXIES` there first.

Run the focused regressions from apps/projctl with `node --test test/cue-ingress.test.js test/security-protocol.test.js test/http-security.test.js test/venue-model.test.js`, then run `npm test` and the browser suites. Use isolated simulator settings, never the active Studio rig, for development.
