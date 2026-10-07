# Infrastructure application brief

Infrastructure joins power circuits, network devices and cable runs into one operator workspace. The operator can plan a row, mark its field status, identify issues, save a named local plan and export a backup. Three bounded work areas show readiness and issue counts across systems.

The first slice is a static application at `/infrastructure/` with its own `sbd.infrastructure.v1` document. It supports manual records and previewed imports from the existing `power-plan.v1`, `network-plan.v1` and `cable-plan.v1` JSON shapes. Import copies every legacy record, retaining its full original fields in `sourceRecord` and the source export in `legacySources`. It never writes old keys. A failed validation or storage write leaves the current plan unchanged and offers export. Export and explicit Save are operator actions.

Out of scope: live equipment control, IP reachability tests, credentials, automatic cross-tool synchronization, and claims that a plan is electrically or network-engineering approved. The existing three tools remain usable.

Acceptance: add/edit/status records in all three areas; issue queue reflects issues; save and reload; export and import round trip; invalid imports preserve current state; legacy fixture imports retain originals; keyboard controls and viewport-locked phone/desktop layouts. Rail publication, sitemap, service worker and shared registry are separate serialized integration work.
