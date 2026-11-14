# Reconnecting saved projectors

The relay retries each saved projector independently after a cable, switch or
interface interruption. Reconnecting does not scan for a different projector,
change saved addresses or replay a power, input, shutter, pattern or lens action.
Each protocol request opens a fresh socket. A failed or cancelled read closes
its socket, including a connection that closes before sending a response.

Healthy devices are polled five seconds after the previous poll completes.
Failure retries wait 5, then 10, then at most 15 seconds (using the configured
poll interval if it is longer). A complete poll has a ten-second deadline;
optional telemetry cannot keep a failed poll alive indefinitely. Successful
feedback resets the retry delay. Unsupported optional properties remain
unavailable rather than hiding an otherwise reachable projector.

The UI keeps the last successful values visibly marked as last known and
disables controls when device feedback is absent or stale. A new successful
reply restores controls and briefly confirms recovery. Losing only the browser
WebSocket does not itself prove the physical projector reconnected.

## Status contract

Snapshots and status events include `status.connection`:

```json
{
  "state": "reconnecting",
  "lastAttemptAt": "2026-11-06T15:00:00.000Z",
  "lastSuccessAt": "2026-11-06T14:59:55.000Z",
  "lastFailureAt": "2026-11-06T15:00:05.000Z",
  "consecutiveFailures": 1,
  "error": "timeout",
  "nextRetryAt": "2026-11-06T15:00:10.000Z",
  "retryDelayMs": 5000
}
```

Initial checks use `checking`; successful feedback uses `online`; no saved
address uses `unassigned`. During an active retry, `nextRetryAt` is null.
`status.online` remains false until a successful current-target poll. Changing
a target invalidates old in-flight replies before they can update its status.

## Manual discovery is a fallback

`POST /api/discover` remains an explicit operator action under the same private
relay authentication as other configuration APIs. Background discovery no
longer changes saved IPs. The existing PJLink Class 2 broadcast is not an
exhaustive subnet scan; no broadcast reply does not prove a device is absent.
Class 1 projectors can still reconnect directly at their saved addresses.

The result retains `found` and `changed`, and adds `ok`, `updates`, `warnings`,
`method` and `exhaustive: false`. Concurrent requests share one scan. Socket
errors return an API error instead of an empty successful result. Only a unique
known MAC may update an existing address. Unknown devices, repeated MACs,
addresses already assigned elsewhere and configurations changed during the
scan require operator review; matching a model name never assigns a lane.
No new public scan endpoint or automatic command replay is provided.

Tests use simulated state and loopback-only protocol fixtures. They cover
silent/closed sockets, cancellation, deadline/backoff, independent peers,
fresh post-command reads, old-target replies and identity-safe manual discovery.
Physical cable/reboot acceptance is separate and should be done at a safe time.
