# Front Office first application slice

Date: 2026-10-07. Owner: Front Office application.

## Problem and outcome

A TD or owner needs a durable view of clients, venues, and jobs between shows. The existing Front Office concept lists per-show tools but does not retain a client or venue record. This slice makes the handoff from inquiry to advance, change tracking, signoff, and closeout usable without claiming to replace the specialist show tools.

## Flow and smallest useful slice

Create a client and venue, create a job linked to both, set its stage and next action, and record dated updates. Review jobs by stage and open the existing Show Advance, Change Order, Client Sign Off, and Show Handoff tools when detailed documents are needed. Export a JSON backup and preview an import before an explicit replacement. Existing specialist tool storage keys are untouched.

## Data, save, and boundaries

The application owns `sbd.frontOffice.document.v1` only. A versioned document stores clients, venues, jobs, and job updates. Save is explicit; unsaved work is never silently replaced by an import. An invalid or unreadable saved document blocks writes and offers export of its original bytes. Local storage is device-local, with no account, sync, quote math, rates, signatures, or cross-tool document migration. The next version can add lossless imports from specialist tools after their formats are separately mapped and tested.

## Dependencies, risks, and acceptance

The app is a standalone static route so the Rail owner can integrate `front-office/index.html` without shared-file conflicts. Its link targets are canonical registry routes. Acceptance requires durable save/reload, invalid-import recovery without loss of originals, inert failed boot and recoverable record-limit validation, keyboard use and responsive 390px and desktop presentation. Browser, deployment, and human acceptance are separate evidence lanes.

## Show Advance one-way handoff

Front Office may review either the current same-origin `show-advance.v1` saved document or a user-selected `system-by-dave.show-advance.v1` JSON export. This is an explicit copy into one new Front Office job, not synchronization or a change to Show Advance. The existing Front Office backup-replacement import remains separate.

Preview the source show, client, venue, date, request count and status distribution. Advance requests are retained in the original source snapshot, not reclassified as Front Office updates or readiness. The operator must choose an existing client/venue or explicitly create each one, and may edit the new job name. No client/venue match or job status is inferred from names, requests or launch context. The new job starts at `Advance` with no inferred next action. Its backup carries the exact validated source JSON and import time; the UI identifies that private source data travels with the Front Office backup. An exact repeat source is rejected, while a changed source with a similar show name is disclosed as a separate copy, never merged into an existing job.

Reject unsupported schemas, malformed or excessive records, duplicate/empty source IDs and overlarge source or resulting backup. A saved Show Advance changed after preview, a Front Office document changed in another tab, or a changed in-memory Front Office document invalidates the preview. Cancel and rejection leave both working and saved Front Office data unchanged. Confirmation appends only to the in-memory document; explicit Save remains required and preserves the existing cross-tab write guard. The legacy key is read-only, and backup export/restore must retain the source snapshot byte-for-byte. No specialist route retirement, account/shared identity, remote service, output control or Rail promotion is included.

Acceptance covers local saved and exported source, existing/new identity binding, missing source metadata, exact repeat and changed-source behavior, stale preview, invalid input, cancellation, failed Save, restart/reopen and backup roundtrip with the original source key unchanged. Exercise keyboard focus, both themes and root containment at phone, short-height, desktop and ultrawide viewports. Physical/operator acceptance remains separate.
