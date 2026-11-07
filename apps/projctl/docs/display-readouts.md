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
EDID result. Raw OS command output and OS serial fields are excluded.
The increment below adds hostname and explicitly exportable raw EDID. No computer output is automatically bound to an A-D lane.

The original metadata collector uses `system_profiler SPDisplaysDataType -json -detailLevel basic`:
one in-flight read, an eight-second timeout, one-MiB output limit and30-second
cache. A failed read returns `state: "unavailable"` with a sanitized reason;
other platforms return `unsupported`. Simulation returns `simulation` without
querying the real host. The OS report is genuine computer-side feedback; it does
not prove what reached a projector after an adapter, cable or signal processor.
EDID must not be fabricated from OS resolution or a projector database entry.
The IORegistry increment below provides actual bytes where available. Studio display acceptance remains
separate from a successful read on another relay computer.

## EDID capture increment (2026-11-07)

The first implementation adds a read-only IORegistry probe alongside the OS
report. It validates EDID headers, complete block counts and all checksums,
retains raw bytes and a SHA-256 fingerprint, and decodes EDID 1.x identity and
base-block progressive detailed timings. It does **not** claim a complete mode
list: standard/established timings, interlaced timings, CTA/DisplayID modes,
audio and HDR decoding remain future work. Format reference:
https://github.com/torvalds/linux/blob/master/include/drm/drm_edid.h

The user opens Signal, EDID & gear → Relay computer displays → Read displays &
EDID. Active output is shown separately from advertised timings. Source-facing
EDID can describe an intermediate KVM or converter. Duplicate vendor/product
IDs withhold automatic association; no A–D lane is inferred from enumeration.

The response now includes `host`, `edidRead`, and `edidRecords`. A unique
vendor/product match attaches a decoded record to a display. IORegistry failure
does not erase valid OS display metadata. The bounded registry read is four
seconds/four MiB; both reads run concurrently under the existing 30-second cache.
Some Apple Silicon outputs expose no IODisplayConnect EDID. `not-exposed` means
this collector found no bytes, **not** that the output is disconnected.

Save comparison baseline stores a versioned display-set signature in this
browser, scoped to the relay hostname. It detects changed metadata, EDID and
missing displays regardless of enumeration order. It is not a persistent
physical-port identity or a shared run baseline. Export downloads the complete
report, including raw EDID, which may encode device serial identifiers. Nothing
is uploaded. The authenticated API boundary remains unchanged.

Acceptance: valid/invalid/checksum/extension fixtures; ambiguous associations;
order-independent baseline and missing/changed output detection; display panel
at desktop and phone sizes. Studio/adapter capture and verified output-to-lane
mapping require a live hardware pass. This increment follows ECP-1.0 revision
1.0: observed source data remains separate from equipment definitions and
physical controls; existing projector status and rig schemas are unchanged.
