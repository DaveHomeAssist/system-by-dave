# Front Office application

AV by Dave workspace at `/front-office/`, built from `apps/front-office/` with the existing shared console engine. It owns `sbd.frontOffice.document.v1` and does not alter AV Video, Show Console, CueForge, PlotForge, or specialist tool documents.

## Workflow

Add client and venue records, attach jobs, update each stage and next action, record decisions, save, export, and preview imports before replacing the open document. Forms stay unavailable until the application boots; validation failures retain entered values and the current document. The Show Advance, Change Order, Client Sign Off, and Show Handoff links open their existing independent tools.

The Advance import panel offers a separate, one-way Show Advance copy. Review the current same-origin `show-advance.v1` document or choose a v1 JSON export, inspect its request count/statuses, choose existing or new client and venue identities, then confirm one new `Advance` job. This does not edit Show Advance or auto-save Front Office. Its exact source JSON stays in the Front Office backup and can be exported from the job; treat backups as containing private show details. Repeated sources are rejected. A changed source creates a separate job, not an update or sync. Other specialist tools do not pass data.

## Layout and theme

Jobs, Clients, Venues, Job updates, Advance import and Backup are working panels. Arrange, maximize, lock and store named views with the shared AV console engine. Long records scroll inside labelled panels; the page stays fixed. Phone and short-height modes show one panel with a persistent panel switcher. Inside AV Video, duplicate navigation is omitted and Front Office still saves independently. Host show context is read-only and never binds client or venue identity.

The shared `av-theme-mode.v1` preference is applied before rendering. A fresh visit follows the accepted suite-wide Stage Slate default; saved Light, Dark or System wins. The visible toggle switches light/dark. The old fixed-editor source remains available for history but is not the served entry.

## Save and recovery

Existing v1 backups stay valid without migration. Optional `workspace: {version: 1, views: [...]}` stores presentation only; unsupported versions reject without replacing current records. `sbd.frontOffice.draft.v1` and `sbd.frontOffice.layout.v1` are separate console-local recovery and device-layout keys. Recovery is offered, never silently applied. Explicit Save uses Web Locks, checks the saved baseline and verifies the written bytes. A failed save leaves working records exportable. Replacing an unreadable original first preserves and verifies its exact bytes under a unique `sbd.frontOffice.recovery.*` key.

Form input survives panel switches, close/reopen and job selection while the tab stays open. Add or Update applies it to working records; Save/export/replacement refuses unfinished forms so input is not silently omitted. Drafts protect applied records, not unapplied form text; leaving with either warns. Backup-file import retains the existing 2 MB cap, while valid existing browser documents are not retroactively capped. Show Advance sources retain their existing 1 MB cap.

## Checks

- `npm run typecheck:front-office`
- `npm run test:front-office` — original model tests plus native compatibility/storage tests
- `npm run build:front-office` — generates the public entry and assets; never hand-edit bundles
- `npm run test:front-office-browser` — disposable synthetic storage, all panel workflows, preserved imports, pending forms, saved views, recovery, both themes at nine sizes, offline and actual AV Video embedding
- `npm run verify:av`, `npm run verify:indexing`, `npm run verify:domain-sites`, `npm run test:domain-cutover`

Use `OFFICE_CHROME` or `CHROME_CHANNEL` for the qualified runner browser, `OFFICE_OUTPUT` for evidence, and `OFFICE_BASE` for isolated live acceptance. The old fixed-editor probes remain historical and are superseded by the native probe; their old tab selectors do not describe this UI. Browser and device-local storage acceptance do not establish publication, physical touch, virtual-keyboard, interruption/power-loss or operator acceptance.

## Integration handoff

The Rail already exposes `console:front-office` as Available. Registry metadata now identifies its draft/layout keys and native offline assets; availability is not full specialist parity. The shared domain staging includes the existing public directory. This conversion does not take ownership of the separate Toolbox/website review branch or retire specialist routes. Release evidence belongs in the existing AV console rollout and next-steps projection; source, CI, publication, live behavior and human acceptance remain separate gates.
