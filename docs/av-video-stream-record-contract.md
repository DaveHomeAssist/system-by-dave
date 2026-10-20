# Stream and Record preparation contract

Item: **AVV-SR-DESIGN-1**, the independent design portion of Stage 2.1–2.3.
Reviewed base: `4561f20a4ed854fdb807a5439d2867427885f670` (2026-10-18).
Scope: typed rows, invented fixtures and acceptance design only. Stream/Record
runtime remains gated by **AVV-STREAM-KEY-1** in the
[credential decision](av-video-stream-record-credential-decision.md).

## Problem and smallest slice

The [Video field matrix](av-suite-consolidation-stage2-video.md) names two
remaining families, while the application supports six. Prepare their field
contract without changing the live document. The current legacy URLs are
redirect stubs following PR #340; they are not current producer applications.
Field names, export schemas and collection names were checked against the
last producer source before `64f2ccf` retired those pages. Historical warning-only
Stream behavior describes that source, not a present working legacy editor.

The design module and fixtures under `apps/av-video/src/contracts/` are consumed
only by tests. No application entry point imports them. Zod validates prospective
row shape only; it supplies **no credential screening or acceptance policy**.
Passing these tests does not enable a Stream import or establish safe sharing.

## Field and identity contract

| Family | Original key / export schema | Collection | Typed text fields in original CSV order |
| --- | --- | --- | --- |
| Stream Plan | `sbd.streamPlan.v1` / `system-by-dave.stream-plan.v1` | `items` | encoder, type, platform, destination, server, keyLabel, input, resolution, bitrate, audio, record, backup, status, notes |
| Record Log | `record-log.v1` / `system-by-dave.record-log.v1` | `records` | record, source, type, format, resolution, audio, media, status, duration, backup, notes |

Prospective working rows add `id`, `origin` and `routeId`, consistent with the
existing sequence model. Preserve source IDs in the accepted raw original;
working IDs must not merge unrelated rows merely because their labels match.
An explicit route link never supplies missing stream/record data automatically.
No shared equipment, people or cross-application identity is introduced.

Preset statuses and types are suggestions, not coercion rules. Working fields
remain text so blank, custom and historical values survive. Duration is verbatim
text, including `2m30s`, `01:02:03:04`, `TBD`, `45 min` and whitespace. Do not
normalize it into seconds or infer a completed recording from a filled field.

Original JSON, extra row fields, metadata, array order and text spacing must
retain a provenance home. The typed working row is not a replacement for the
original payload. Stream metadata includes `showName`, `client`, `venue`,
`showDate`, `streamTech`, `producer`, `handoffTo`; Record uses `showName`, `venue`,
`showDate`, `recordOp`, `producer`, `audioLead`, `handoffTo`. Names remain text;
do not infer roles or merge people.

## Later operator flow and acceptance cases

These are requirements for the later implementation, not implemented journeys:

| Case | Required observable result |
| --- | --- |
| Preview / cancel | Identify one family, show counts and proposed changes; cancel leaves memory, saved baseline and originals unchanged. |
| Confirm / repeat | Confirm a fresh preview once; stale previews and exact-repeat imports cannot overwrite newer edits. Preserve all source rows, including over the historical 180/250 UI caps. |
| Order / status | Preserve source order, duration text and custom statuses; reorder and status actions record operator intent without controlling a provider or recorder. |
| Restore | Old six-family documents open with no write; later compatible backups restore all accepted fields, originals, ordering and hidden data. |
| Optional module | Hiding a panel retains records, route links and stored panel definitions; re-enable returns them. Full backup retains hidden data. |
| Invalid candidate | Malformed, mixed or ambiguous families and nontext known fields fail atomically; do not partially import or silently normalize. |
| Credential boundaries | After AVV-STREAM-KEY-1 is answered, test its selected policy across preview, apply, edit, Save, restore, draft/conflict recovery, JSON/CSV, summary and handoff. Never use real credentials. |

The synthetic fixtures include complete metadata, safe planning labels,
unmapped objects, blank/custom values, exact whitespace and duration variants.
They do not decide how to handle credential-shaped values. Such policy tests
belong to the later authorized implementation.

## Preservation and verification boundary

The six import families, `sbd.avVideo.v1`, schema string, recovery, routes,
module defaults and generated application assets stay unchanged. This slice
does not define a new application schema or migrate a saved document. No
Stream/Record editor, adapter, validator wiring, export, provider/device action,
new specialist pack or family-route decision is included.

Run existing `typecheck:av-video` and `test:av-video`; the latter discovers these
contract tests. Build Video and confirm committed JS/CSS remain byte-identical.
Require the normal applicable PR and publication gates separately. Physical,
operator, connected-output and interruption acceptance remain open. No browser
journey is needed to claim this test-only contract; no runtime capability is
claimed by its merge or publication.
