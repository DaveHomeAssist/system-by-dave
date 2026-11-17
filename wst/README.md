# Frozen workspace

## Two-session rehearsal review

The existing `/run-review/` route uses the maintained viewer from
`DaveHomeAssist/frozen-rehearsal-capture`, with both November 15 sessions,
original 1280 × 720 photos and versioned observations and scene/song candidates.
The Home card and Planning link open the same address. Video is deferred.

`hosting/scripts/integrate-review.mjs` installs a verified release and pinned
viewer into the current managed Site source without replacing its existing
D1 task API, R2 photo store or unrelated assets. The viewer source remains in
its own repository; this repository owns hosting integration and navigation.
See [the release procedure](hosting/review/README.md). Do not deploy the older
embedded Worker snapshot alone: it does not contain the current review media.

## Quiet Watch appearance and navigation

The shared appearance source is `apps/projctl/public/frozen-theme.js` and
`frozen-theme.css`. The embed generator copies these into WST and its local
controller workspace. Do not edit the copies independently. Light, Dark and
System persist as `frozen.theme.v1`; a fresh browser starts light. The Home snow
scene, documents, references, controller, login and Monitor share the choice and
surface palette. System follows the OS; an explicit mode overrides it. Old saved
preferences are read, and Monitor Deep Freeze migrates to Dark. Browser origins
keep separate saved settings; embedded views receive a bounded appearance message.

Home names operator, crew, reference and planning destinations. Live controls is
also in More. At 680px and below, Rig, Stage and More stay directly available in
the bottom navigation. The local controller copy opens its own origin, not a
visitor device's localhost. Local embedded references request an existing
controller view instead of nesting another controller frame. The standalone
handoff is included in local packages. Navigation and appearance send no hardware
commands and do not alter personal notes or shared tasks.

The dated sections below record earlier delivery context. Current slot mappings,
service configuration and commissioning status come from the installed private
rig and current operations record, not a historical example here.

## House handoff page

The Handoff route gives house crew one concise entry point for current R5 documents,
pre-show checks, show-time faults, shutdown, responsibilities and remaining confirmations.
Source basis is the House Show Operations Guide, Handoff Walkthrough and November 14
project/field reports. The page labels untested procedures and unknown assignments.
It publishes no private endpoints, credentials or assumed equipment-control sequence.
The static handoff.html is generated from the same content and works without JavaScript.
Acceptance covers direct-link and navigation access, PDF links, both themes and viewport-contained desktop/mobile layout. The source
records remain responsible for final operating acceptance and sign-off.

## Team updates and tasks

Scope requested November 14: show shared news separately from work that needs doing,
while preserving existing entries, personal notes and completion states. Acceptance
is independent creation/editing, persistent category moves, conflict handling, and
legible desktop/mobile views. Existing six news entries will move to updates; their
remaining actions become concise tasks after the new version is published.


Planning has a dedicated Team updates tab for shared news, with no completion checkbox.
Notes + tasks keeps private browser notes beside open tasks, with completed work in a
collapsed section. Existing task records default to task; the kind column is added by
migration 0001. Older clients can update records without losing their kind. Updates and
tasks can be moved between sections, and inline editing preserves drafts during refresh.

## Private controller: embed in place or open directly, November 14, 2026

Dave asked for both controller paths to work robustly. The Controls, Presets, Log and Configuration views now offer two actions side by side: **Connect this Mac** (requests the browser's local-network permission for `http://localhost:8080`, checks relay health, then embeds the private controller frame as before) and **Open local controller ↗** (`#open-controller`, a plain top-level link to `http://localhost:8080/` that is always visible and never subject to iframe or mixed-content rules). Browsers can allow the health fetch yet refuse the localhost frame (Resource Timing responseStatus 0); when no `projctl:ready` arrives within 8 seconds the frame hides, the status names the link and the link is highlighted (`data-recommended`). A failed health check does the same. Connected still requires a source/origin-validated child report; parent messages select views only and cannot issue device commands. The CSP again lists `http://localhost:8080` in `connect-src` and `frame-src`. Both paths only work on the Mac running Projctl. This replaces the November 14 documents release's link-only controller panel, which had removed the embed without a recorded decision.

## Documents publication, November 14, 2026

Planning Documents provides the current 18-page R5 handoff and five-page R5 diagrams,
reconciled with the November 14 EDID evidence and Katy's pixel-routing corrections.
The combined PDF includes linked contents, illustrated overview, five signal-flow
sheets, Crew Edition Revision 3, EDID evidence and source key. Field acceptance
remains pending. Historical R4 URLs remain available for existing links.

Public exports omit private network addresses and local source paths. The private
ZIP and original EDID/settings exports stay outside the repository and publication.
`documents/provenance.json` records source and public hashes and the transformation.

Use `node wst/embed-hosted-assets.mjs --hosted-only`, then the workspace tests,
PDF route tests and hosting build validation before publication. The public shell
keeps its localhost controller link, the in-place Connect this Mac embed and existing planning features.

# Frozen workspace

Live managed deployment: https://wst-frozen.davein4k.chatgpt.site
Primary hostname: https://wst.housevideo.app (Stage, reference and preserved schedule verified November 7, 2026).

Personal notes autosave only in this browser/origin under `wst.frozen.personal-notes.v1`, with text export and storage-failure recovery. They never enter the task API. Clearing browser site data loses local notes; notes at the temporary hostname do not automatically transfer to the custom hostname. Private cross-device notes are deferred, not a project-wide storage policy.

Team tasks are public by Dave's explicit choice: anyone opening the page can view, add, edit, complete and delete. D1 stores tasks separately. The API caps text at 500 characters, request JSON at 2KB, total tasks at 200, and writes per IP per Worker isolate at 30/minute. The isolate limiter is a modest abuse safeguard, not a global quota. Revision checks reject lost updates. No projector endpoints, existing private data or account credentials are included.

## Source and release

This GitHub directory owns the shared projector frontend and retains a generated managed source snapshot in `hosting/`. The Sites hosting repository is a deployment mirror, not a separate feature authority. `hosting/deployment.json` records the managed commit and successful deployment. Update source here first, synchronize the managed repository via the Sites helper and record the resulting receipt. Do not create another Site: reuse `.openai/hosting.json` project ID. Generated single-file Worker contains embedded frontend assets; run `node wst/embed-hosted-assets.mjs` to synchronize the generated worker from the canonical frontend, configuration and projector JSON before release. `hosting/drizzle` owns schema migrations, never apply schema changes in request handling.

Use the current Sites deployment and `hosting/deployment.json` for the published version, managed source commit and readback evidence. Versions 23 through 26 introduced the schedule, Stage reference, pixel specification and Planning calendar. Later releases added the R5 documents, team updates and standalone house handoff. These assets are retained in the canonical source and regenerated together.

The managed Worker/D1 service is separate from GitHub Pages and existing FMP services. DNS adds only the requested WST hostname; housevideo.app and walk.housevideo.app stay unchanged.

## Verification

`node --test wst/workspace.test.mjs` verifies local notes recovery/export without networking, the same-origin resource rule and the presence of the More navigation, schedule and pixel panels and the hidden new-tab button. Built Worker validation: `cd wst/hosting && bash scripts/build.sh && node scripts/validate-artifact.mjs`; `node --experimental-vm-modules wst/hosting/scripts/test-schedule.mjs` checks the embedded schedule JSON, menu, PDF MIME and exact PDF bytes. `PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/test_wst_workspace.cjs` passed on November 13, 2026 for the reconciled shell at 1440×900 and 375×812: Rig/Stage/More menus with Pixel Strips, Planning calendar (29 dates) and pixel reference (12 rows, 2 photos), and the new-tab button hidden while disconnected or after a failed health check, shown once health passes, and shown with the frame hidden after the 8 second blocked-frame timeout (popup URL `http://localhost:8080/`). Production API acceptance passed with independent clients: create/read/update, stale-write 409, oversized-text 400, cross-origin-write 403, delete and absence after deletion. All synthetic tasks removed. Walter Playwright passed live desktop/mobile containment, both themes, Eastern clock, note save/reload, separate-browser note isolation, download, and shared-task completion across two browser contexts; screenshots reviewed. Synthetic browser task removed.

## Combined Frozen entry point

Navigation includes Notes + tasks, Projector info and Projector controls. `projectors.json` is the versioned public equipment reference with assignment/lens/estimate provenance; the private rig remains controller authority. No IPs, MACs or credentials are in this reference. D lens sizing is a candidate calculation, not a calibrated optical verdict. The owner prefers coverage over reduced brightness/resolution; installed lens and physical clearance remain unverified.

`workspace-config.json` owns the future control handoff. Its default is `url: null, verified: false`, visibly Mac Studio setup pending. Set a URL only after installing and testing the theatre host and crew access. Do not substitute the current MacBook or visitor localhost. The app does not proxy commands; configuring this link does not create authentication. Actual login/access belongs to the controller. Reciprocally, the controller links back to https://wst.housevideo.app/.

## Unified public and local workspace

The controller now includes Notes + tasks and Projector info alongside Rig and Stage, loading this same frontend as generated same-origin panels from `public/workspace/`. `node wst/embed-hosted-assets.mjs` refreshes both the managed Worker assets and this local copy. Personal notes use the same key but remain browser-and-origin-specific; local controller notes and website notes do not silently sync. Dave confirmed no saved content needed migration.

The public website shows Stage / room and Controls in place. Connect this Mac explicitly requests the browser's local-network permission for `http://localhost:8080`, checks relay health, and loads the private controller frame; the always-visible Open local controller link is the direct path (see the November 14 section above). Connected requires a source/origin-validated child report with active relay connection, not iframe load. Parent messages can select only Rig or Stage; they cannot issue device commands. Denied/unavailable connection stays clearly disconnected. This does not expose a public relay and is not a verified Studio crew endpoint.

The public tasks API permits anonymous cross-origin GET/POST/OPTIONS so the local workspace uses the same shared list. This CORS change is limited to the managed task API. Existing controller API policies were not broadened. Private authenticated Studio iframe commissioning remains a separate check. Current source uses a Strict controller cookie plus a Secure partitioned embed cookie, with own-origin API and WebSocket checks. Do not claim a future protected Studio iframe is commissioned from this local test.

Verification: actual local controller panels passed desktop/mobile notes persistence across tabs, shared-list read, and projector info/Stage navigation. The public website loaded actual private Stage and Rig in place in an isolated browser with normal local-network permission explicitly granted; the denied state remains disconnected. No physical commands were sent. A temporary SSH forward bound only Walter loopback for these tests; it is not a deployed service.

### Browser permission acceptance, November 6, 2026

Local controller Notes / Info / Stage navigation passed in the owner's browser. An isolated Walter Chromium context, with local-network permission explicitly granted, displayed the actual Mac relay's Stage and Rig inside the public WST page. No browser security flags were disabled. The temporary SSH forward used for that test bound only Walter loopback and was stopped afterward.

The owner's actual desktop browser reached the new bounded failure message instead of reporting a false connection. Its local-network permission grant remains unconfirmed: native permission UI inspection was blocked by a ScreenCaptureKit capture error. Therefore in-place public-to-private control is verified for the supported granted-permission path, not commissioned in that user browser or on the future theatre Mac Studio. The same-origin local unified app remains usable without that public-to-loopback permission path. No public tunnel was deployed.

### Home entry, November 6, 2026

Dave requested a choice-first landing screen. Home is now the initial view on both the public website and non-embedded local controller, with four in-page choices: Notes + tasks, Projector info, Stage / room, and Controls. Notes remain one click away. Embedded controller frames continue opening Rig/Stage directly rather than showing a nested Home screen. This changes navigation only; no storage migration, backend restart or projector commands are involved. The user's actual local Home routes were verified; public Home routes are awaiting the final owner-browser readback. Existing local-network permission limitations remain unchanged.

Home renders that choice screen as a theme-aware snow splash (`snow-splash.css`, `snow-splash.js`, and vendored `vendor/gsap.min.js`). The aurora, falling snow and Frozen letter reveal stay inside the home panel. Destination buttons keep `data-route` and the existing `navigate()` path. The appearance choice changes Home, Notes, Rig and the other panels. Snow and the reveal pause while Home is hidden, and they do not run for `prefers-reduced-motion`. Styles and scripts are same-origin files embedded with the Worker; the CSP is unchanged.

## Six-menu shell

The canonical shell exposes My Projector Rig, 3D Stage View, Presets, Log, Configuration and Throw Calc. Production groups the secondary tools under More and also includes Tech Schedule. Home and Notes + to-dos remain separate utility choices. Rig gear, the searchable catalog and signal-flow diagrams use `apps/projctl/public/reference-view.js` / `.css` and canonical `wst/projectors.json`; the embed script copies these shared renderer bytes rather than maintaining another catalog.

Allowlisted hash routes are `#home`, `#notes`, `#rig`, `#rig/A` through `#rig/D`, optional `/controls` on rig routes, `#stage`, `#presets`, `#log`, `#configuration` and `#throw`. Unknown action-like routes fall back to Home. Private iframe messages keep `wst:show-panel` with a view name and optional A–D projector selection only. Presets, command logs, configuration and private room assets remain at the controller. Disconnected views show connection requirements instead of sample operational data. Throw Calc uses the existing public Throwline page in place, with separate planning state and no copied calculation engine.

Run `node scripts/test_wst_workspace.cjs` with existing Playwright/Chromium. This uses disposable browser contexts, intercepted task/relay fixtures and no physical device or production task writes. It verifies primary labels, Home/notes readiness and reload, lane detail routes, catalog/flow/planner navigation, disconnected state, limited child messages, full lane colors in both themes, and desktop/mobile containment. The fixture does not commission actual browser local-network permission or a future authenticated Studio iframe. The compact six-menu shell and public Stage first shipped as Site version 22. The current production receipt and the separate version 24 polish publication are in `hosting/deployment.json`.


Version 14 publication: final HTTPS HTML contains all six primary labels and the served workspace/reference JS, CSS and JSON match the accepted source bytes. Consumer installation was confirmed by the runtime owner at `25b22e65f6710caf1505557f4e30f8e3ebe04314`, with REAL health and the expanded navigation-only bridge. No new user-browser permission attempt or hardware command was part of this publication. Actual user-browser local-network permission and the authenticated theatre Studio endpoint remain separate acceptance gaps.

Plot palette update (2026-11-06): A `#ff00ff`, B `#00ffff`, C `#fbf302`, D `#00ab00`, sampled from `FROZEN_projector-plot-front-view.png` coverage outlines. Desktop/mobile light/dark color rendering and containment passed in disposable contexts. Version 15 also includes the canonical live Signal flow disconnect correction; public CSS/JS bytes and catalog data were checked against accepted source. No relay/auth or hardware changes.

## Public Stage (explicit authorization, 2026-11-06)

Dave authorized publishing the venue/model, plot and what-if planning. Stage now runs in a same-origin standalone pane without connecting to localhost. It reuses canonical Projctl Stage/Throwline components and a validated plot snapshot; the room is the existing user-provided appearance revision 3. `stage/provenance.json` records hashes and sanitization. GLB extras/generator metadata and private filesystem provenance were removed; geometry remains unchanged. Room registration is approximate, not a surveyed clearance check.

`node embed-hosted-assets.mjs` selects the canonical renderer dependencies and embeds the authorized model as gzip/base64 in the existing Worker. The Worker serves fixed public visual assets, not a proxy to the relay. Standalone planning has no sockets, hardware API calls, saved rig writes, logs, credentials, or command handlers. Scenarios are transient browser state. Notes keys and shared tasks are unchanged; actual controls/presets/log/configuration still use the private relay.

Browser acceptance: `node apps/projctl/test/wst-public-stage-browser.cjs` with the existing Playwright runtime. Uses the real packaged Worker/model and disposable browser contexts; task reads are intercepted. Checks 1440/680/375 widths, actual GLB/WebGL room load, Front/Plan, editable lens/raster scenario, no private requests, no page errors. Does not send test notes/tasks or hardware commands.

The portfolio Pages staging step replaces only its WST home and Stage entry copies with canonical redirects to this managed site. The managed HTML, same-origin viewer imports and Worker assets remain unchanged; the source repository retains the full reproducible runtime. This prevents the portfolio mirror from loading viewer modules retired from that origin.

WST and mirror-helper pull requests run the domain-cutover browser gate before merge, so managed-only imports cannot first break at the publication step.

## Stage and reference polish, November 7, 2026

The shared Stage renderer opens facing the set with all projection beams framed.
Phone planning uses one scrollable workspace; expanded room controls stay within
the drawing. The recorded A identity is Panasonic PT-DW830U. Frozen uses drawing-order
numbering A=P1, B=P2, C=P3 and D=P4; existing relays require the documented
offline migration before using the new command addresses. Connected
reference cards take current assignments from the relay, and disconnected cards
label their saved slots as recorded. Public Stage remains inspection/planning
only, with no hardware requests or rig writes.

## Compact workspace and public Stage

The canonical common header uses one row on wide desktops and two compact rows on narrower screens, with all six primary destinations directly available in two rows on phones. The production More navigation from the separate schedule update is retained. Home’s snow splash remains. Notes storage keys, exports and the shared task service are unchanged. Theme changes are sent only to the exact Stage frame origin; the viewer accepts only its actual embedding parent origin and an allowlisted theme value.

Embedded Stage suppresses its duplicate heading/backlink and uses a single planning toolbar. The selected projector’s inspector opens as a contained, scrolling overlay. The public-only room view starts with seats, walls and roof hidden, retains the cove, and separates A–D labels with leaders. Local controller defaults are preserved by optional viewer settings. Model/plot assets and the task API are unchanged; public what-if editing makes no private API or WebSocket requests.

Checked in installed Chrome with disposable contexts: 1900×950, 845×954 and 375×812, both themes, full room WebGL, Front/Plan, candidate lens/raster edits, and inspector containment. Outer content retains the compact wide layout; phones reserve two rows for directly accessible destinations. `scripts/test_wst_workspace.cjs` checks notes reload and responsive navigation; `apps/projctl/test/wst-public-stage-browser.cjs` checks actual packaged model/planning and theme propagation. Set `PLAYWRIGHT_EXECUTABLE_PATH` to use an existing installed browser.

## November 7 delivery record

PR 448 merged as `6e0753a6153868ba2b12aa32038b54bd329d3c65` after both exact-head CI checks passed. Dominic passed 95 Projctl unit tests, the operator/browser suites, and the exact version 24 managed Stage artifact at 1440, 680 and 375 pixels. The live custom domain visibly opens on the set-facing Stage camera and shows the four requested reference slots. Projector/reference/Stage asset bytes remain exact in version 25; its CSS retains the task change plus the concurrent pixel-reference addition. Tech Schedule, its PDF and backend were preserved.

The Mac Studio is the active backend. Dave subsequently clarified that a Stream Deck profile exists, superseding the initial assumption that only this page uses P1 through P4. Inspection found an installed Frozen XL profile whose letter controls resolve the current slot from relay lane assignments; isolated binding checks passed before and after the proposed renumbering. The running plugin was connected to the laptop relay, so Studio connection and physical button acceptance remain unverified. See the [readiness record](../apps/projctl/docs/show-readiness.md#drawing-order-numbering-and-stage-polish-november-7) for the connection constraint.

The November 7 renumbering proposal was not applied. Quiet Watch preserves the installed control mapping: A=P3, B=P2, C=P1 and D=P4. Keep the saved private rig and Stream Deck bindings intact. The public drawing-order labels are reference records, not authority to change controller slots.

## Navigation contract (2026-11-17)

One label per view and one view per label across the Workspace row, the Main menu, the Home cards and the Planning views. `node --test wst/navigation-contract.test.mjs` enforces it and also checks that every menu entry opens a route the router serves, that a link to another page carries the separate-page cue (`.leaves-shell` arrow plus "(separate page)" for screen readers), and that the local Projctl copy matches this directory. `npm run verify:public-navigation` runs it in CI with `workspace.test.mjs`. Collisions that wait on a decision are listed in the test's `OPEN` array with the decision's ID; the brief and decisions NAV-1 to NAV-5 are in `apps/projctl/docs/navigation-cohesion.md`. When you add or rename a menu entry, run `node wst/embed-hosted-assets.mjs` so the local copy follows.

## Run review navigation (2026-11-16)

The November 15 run review lives at `/run-review/` on the published Site only: its page, `data.json`, `context.json` and the R2-backed `originals/` route were added in Site version 38 from a managed checkout and are not in this directory or in `hosting/worker/index.js`. Home and Planning link to it by absolute URL, so the local Projctl copy also reaches the public review. Before the next Sites publication from this source, carry the version 38 run-review routes and R2 binding into the managed worker (the version 38 checkout is preserved on the 4TB T9 drive), or publishing will remove `/run-review/`. Rehearsal data and photos stay out of this public repository.
