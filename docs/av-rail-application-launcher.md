# AV Rail application launcher

**Date:** October 9, 2026
**Status:** Delivered interim milestone

**Final Rail experience:** This launcher slice is superseded as the definition of done by the [AV Suite console snapshot Rail](av-suite-console-snapshot-rail.md). Its published routes and navigation contract remain the standalone fallback.

## Problem

The Rail shows the complete nine-application order, but only AV Video opens from it. Audio, Show Control, Show Ops, Front Office, The Shop, Infrastructure, Lighting and AV Calculator are published primary applications with verified routes, yet their Rail entries remain status-only and are duplicated under Specialist tools in All apps. An operator sees working products presented as unavailable.

## Expected outcome

The Rail acts as the primary application launcher. Every published primary application opens from its named Rail entry, preserves validated show context, remains customizable through `sbd.rail.v1`, and appears once in All apps. Availability means the route is published and usable; physical-device, operator and deeper workflow acceptance remain separate evidence gates.

## Smallest useful slice

- Map the eight published application identities to their existing canonical registry tools.
- Preserve the nine-item order, icons, local pin order, responsive presentation and navigation context allowlist.
- Remove mapped primary applications from the duplicate Specialist tools section through the existing catalog derivation.
- Advance the offline cache generation so returning clients receive the registry change.
- Keep all application documents, schemas, storage keys and legacy routes unchanged.

## Exclusions

- No application data transfer, synchronization or universal document management.
- No new console workspace, draft store, module system or route.
- No field, physical-device or operator acceptance claim.
- No retirement of legacy specialist tools.

## Acceptance

1. All nine default Rail entries are links to their canonical published routes.
2. Only AV Video carries `aria-current` on the AV Video page.
3. All apps lists nine Consoles and does not repeat mapped primary applications under Specialist tools.
4. Valid show context reaches internal application routes; private or unknown parameters do not.
5. Pin, unpin, reorder, reset, corrupt-preference recovery and offline cache behavior remain compatible.
6. The affected source, browser, publication and live navigation checks pass independently; physical/operator acceptance remains open.
