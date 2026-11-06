# Display and EDID readouts

These read-only resources use the same optional relay login as `/api/state`.
They do not send commands to a projector or change a computer display mode.
They add fields without changing existing status, input or command contracts.

## Projector feedback

`GET /api/display-info?slot=P4` returns the existing cached poll sample:

```json
{"slot":"P4","scope":"projector","input":{"state":"offline","value":null,"label":null,"observedAt":null},"signal":{"state":"unsupported","value":null,"observedAt":null},"edid":{"state":"unsupported","value":null,"reason":"EDID is not read by this driver."}}
```

Unknown slots return404 `{"error":"no slot"}`; a configured login returns401
without authentication. The same object is `projector.displayInfo` in snapshots
and `displayInfo` on status events, so reconnecting does not require a page reload.

Input/signal states are `reported`, `unknown`, `offline`, `unsupported` or
`unassigned`. An offline value can be last-known: use `observedAt` and never
present it as a fresh signal. A null value is unavailable, not a guessed input.
Pulse's existing optional `image.window.main.activesignal` poll is reported as
signal feedback. Panasonic/PJLink timing and all current drivers' projector EDID
reads are not implemented. This does not assert that the hardware lacks EDID.
An input selection, signal timing or stored model specification is not EDID.

## Relay-computer displays

`GET /api/host-displays` returns `scope: "relay-computer"`, `state`,
`collectedAt`, `reason` and `displays`. Each display has an ephemeral `id`, name,
connection, resolution, pixelResolution, numeric rotation when actually reported, rotationSupport, online/main/mirror flags,
manufacturerId/productId when the OS supplies them, `assignedSlot: null` and an
explicit unavailable raw-EDID result. Serial numbers, hostname and raw OS command
output are excluded. No computer output is automatically bound to an A-D lane.

On macOS this uses only `system_profiler SPDisplaysDataType -json -detailLevel basic`:
one in-flight read, an eight-second timeout, one-MiB output limit and30-second
cache. A failed read returns `state: "unavailable"` with a sanitized reason;
other platforms return `unsupported`. Simulation returns `simulation` without
querying the real host. The OS report is genuine computer-side feedback; it does
not prove what reached a projector after an adapter, cable or signal processor.
Raw EDID is not supplied by this collector and must not be fabricated from the
OS resolution or a projector database entry. Studio display acceptance remains
separate from a successful read on another relay computer.
