# Front Office application

Static, standalone AV by Dave workspace at `/front-office/`. It owns `sbd.frontOffice.document.v1` and does not alter Show Console, CueForge, PlotForge, or specialist tool documents.

## Workflow

Add client and venue records, attach jobs, update each stage and next action, record decisions, save, export, and preview imports before replacing the open document. Forms stay unavailable until the application boots; validation failures retain entered values and the current document. The Show Advance, Change Order, Client Sign Off, and Show Handoff links open their existing independent tools.

The Jobs tab also offers a separate, one-way Show Advance copy. Review the current same-origin `show-advance.v1` document or choose a v1 JSON export, inspect its request count/statuses, choose existing or new client and venue identities, then confirm one new `Advance` job. This does not edit Show Advance or auto-save Front Office. Its exact source JSON stays in the Front Office backup and can be exported from the job; treat backups as containing private show details. Repeated sources are rejected. A changed source creates a separate job, not an update or sync. Other specialist tools do not pass data.

## Layout and theme

Front Office has a viewport-locked shell with Clients, Venues and Jobs tabs. Long records scroll within the selected labelled panel; the page stays fixed. A fresh visit starts in Warm Paper, while the visible toggle saves Light, Dark or System under the existing `av-theme-mode.v1` preference. `theme-init.js` applies that choice before the styles load. The document key and specialist tool storage are unchanged.

## Checks

- `node --test front-office/model.test.mjs`
- `node --check front-office/app.mjs`
- `node --check front-office/advance-probe.cjs`
- `node front-office/advance-probe.cjs` with Playwright and Edge, or `CHROME_CHANNEL` / `CHROMIUM_PATH`; checks saved/file review, cancellation, stale guards, explicit binding, unsaved copy, save/reopen, backup roundtrip, malformed/repeated source rejection and five viewports
- `node front-office/layout-probe.cjs` with Playwright and `CHROMIUM_PATH`; checks five viewport sizes, both themes, contrast, keyboard tabs, and internal long-list scroll
- `node front-office/probe.cjs` with Playwright available and `CHROMIUM_PATH` set to an installed Chromium binary if the Playwright package and browser versions differ.

The probes use disposable browser storage and save candidate screenshots beside the probe scripts on the runner. Browser and device-local storage acceptance do not establish live publication or physical operator acceptance.

## Integration handoff

The Rail owner can change `console:front-office` from Planned to Available, give it the `front-office/` route and a console storage/draft contract only after deciding whether this first app is to be treated as a console document. The current app deliberately has no AV console workspace layout or draft key; do not claim those contracts yet. Update registry verification, Rail actions, `scripts/domain-sites.json` (AV by Dave staging), sitemap generator, worker offline assets, public navigation checks, and relevant next-steps records as one serialized integration. The `av-suite.html?entry=frontoffice` conceptual view still needs to direct into the application after integration. Published acceptance needs a live screenshot at the deployed URL.
