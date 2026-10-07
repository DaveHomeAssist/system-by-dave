# Front Office application

Static, standalone AV by Dave workspace at `/front-office/`. It owns `sbd.frontOffice.document.v1` and does not alter Show Console, CueForge, PlotForge, or specialist tool documents.

## Workflow

Add client and venue records, attach jobs, update each stage and next action, record decisions, save, export, and preview imports before replacing the open document. Forms stay unavailable until the application boots; validation failures retain entered values and the current document. The Show Advance, Change Order, Client Sign Off, and Show Handoff links open their existing independent tools; they do not pass data. Detailed tool import needs a separately verified schema adapter.

## Checks

- `node --test front-office/model.test.mjs`
- `node --check front-office/app.mjs`
- `node front-office/probe.cjs` with Playwright available and `CHROMIUM_PATH` set to an installed Chromium binary if the Playwright package and browser versions differ.

The probe uses disposable browser storage and captures `/work/front-office-desktop.png` and `/work/front-office-phone.png` when run in the Dominic container. Browser and device-local storage acceptance do not establish live publication or physical operator acceptance.

## Integration handoff

The Rail owner can change `console:front-office` from Planned to Available, give it the `front-office/` route and a console storage/draft contract only after deciding whether this first app is to be treated as a console document. The current app deliberately has no AV console workspace layout or draft key; do not claim those contracts yet. Update registry verification, Rail actions, `scripts/domain-sites.json` (AV by Dave staging), sitemap generator, worker offline assets, public navigation checks, and relevant next-steps records as one serialized integration. The `av-suite.html?entry=frontoffice` conceptual view still needs to direct into the application after integration. Published acceptance needs a live screenshot at the deployed URL.
