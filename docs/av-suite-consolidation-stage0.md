# AV Suite consolidation: Stage 0 inventory and migration safety

**State:** Started, 2026-09-23. The release sequence and acceptance criteria remain in the [consolidation specification](av-suite-consolidation-spec.md). No legacy route or saved record has been retired.

## Current source snapshot

The canonical `js/sbd-registry.js` currently has 45 tools and 60 declared local-storage keys. The proposal's 44-tool/59-key table describes its earlier baseline. `led-wall-calculator` is the added tool; it remains directly reachable at `led-wall-calculator.html` while its eventual Video or contextual-specialist home is evaluated. The registry remains the inventory source; this document records audit exceptions and proof rather than copying its full tool list.

All AV registry routes are published from `DaveHomeAssist/system-by-dave` to `avbydave.com` by `scripts/domain-sites.json` and `scripts/stage_domain_sites.mjs`. `av-suite.html` remains the stable Show Console and Toolbox doorway, and `av-suite-landing2.html` supplies the domain root. No workspace may treat URL show hints as permission to change a saved workbook.

## First repaired gap: Workbook data at the old origin

AV Workbook stores records in IndexedDB `system-by-dave-av-workbook`, object store `workbooks`, keyed by `workbookId`. Its active ID and fallback JSON live under `system-by-dave.av-workbook.active.v1` and `system-by-dave.av-workbook.fallback.v1`. The AV domain transfer policy previously included those local-storage keys through the registry but omitted the IndexedDB database. Stage 0 adds the database explicitly so the existing, confirmed cross-origin transfer and downloadable backup can carry it. The transfer decision is revision 2; an old completed or skipped decision is revisited because it was made before Workbook IndexedDB was in scope.

Synthetic browser acceptance now covers a workbook with a show, signal source, patch, failed line check, and problem note. It checks the direct move, source retention, backup restore, repeat import, and preservation of a newer destination record. The transfer copies existing records; it does not merge workbook entities or silently select an imported workbook over a destination active ID.

## Open Stage 0 gates

- Complete the registry-derived feature, route, storage, origin, export, print, keyboard, and offline matrix for all 45 current tools. Inspect keys, prefixes, and databases that the registry omits; Show Board's `sbd.showboard.*` records and snapshots need real-schema fixtures.
- Audit every saved store's backup and recovery path, including cases where a destination already has a blank or edited Workbook. A record copied into IndexedDB is not proof that the active Workbook will switch to it.
- Add pre-save preview, backup, field mapping, conflict reporting, and explicit confirmation to the legacy Audio importer and Workbook JSON importer before inviting an operator to migrate a show.
- Keep every old route and specialist state contract available until field and export parity, browser proof, and operator acceptance are recorded for its replacement.

These gates are pending. The Stage 0 exit criterion and the later workspace stages are not yet complete.
