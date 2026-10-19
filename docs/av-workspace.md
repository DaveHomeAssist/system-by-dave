# AV bounded workspace foundation

The first consumers are [Throwline Stage 3D](../ProjectorThrow/Stage3D.html) and the [LED Wall Calculator](../led-wall-calculator.html). Their existing calculation models, scene intents, storage keys and canonical result nodes remain authoritative. This release does not migrate the rest of the suite.

[Workspace tokens](../design/av-workspace.tokens.json) define minimum touch size, input text size, spacing, safe insets and minimum pane width. [Shared styles](../css/av-workspace.css) and the [view controller](../js/av-workspace.js) use those tokens. Specialist palette and typography remain owned by each existing product. The pane threshold is derived from two minimum panes, rather than a separate collection of mobile breakpoints.

The page is locked to the available dynamic viewport. Safe area padding belongs to the outer shell. Visual viewport resize updates available height when browser chrome or the keyboard changes it; pinch zoom retains magnification instead of reflowing the workspace. A reduced-height portrait layout retains the active field and result banner while suppressing the spatial preview. Physical Safari keyboard, browser chrome and notch behavior still require device acceptance.

Settings use bounded column pages with Previous, Next and a page count. Each real field and its label stay together; keyboard focus reveals the containing page immediately. Resizing recomputes the pages and retains focused controls. Paging changes view state only and never clones inputs or calculation state. Overflow is clipped at the page window, not made scrollable. Large data records may still use their own contained panels.

Stage 3D keeps its set mark, installation verdict and provenance above the canvas; wide/tele distances and detailed ratio fit are in Facts. The canvas and sheets follow the measured banner height, with Setup, Place, Room and Deliver pages and a shared View, Facts and Export dock. On phones it stacks the same scene and editor. On tablets it places them side by side. Quick Start fits the viewport; the original rendering and export component remains shared.

The [LED adapter](../js/led-workspace.js) reorganizes existing nodes into Layout, Profile, Data, Power, Results and Tools. Dimensions, raster, power, cabinet count and cabinet-only mass remain visible while editing. On short landscape screens, View replaces the editor with the preview while retaining the result strip. Selecting a cabinet opens its existing inspector in Tools. Assumptions and full planning disclaimer remain reachable there; the header continues to label the product as planning estimates.

## Generated standalone consumers

Run `npm run sync:av-workspace` after editing the shared tokens or runtime. Marked inline blocks in both Throwline documents and the LED document are generated. `npm run verify:av` rejects stale output. This preserves the standalone planner's inline architecture without maintaining a second mobile implementation. The planner receives safe insets, minimum input and target sizes, and direct offline preparation; its larger layout migration remains separate work.

## Offline ownership

The existing [AV Suite worker](../av-suite-worker.js) is the sole cache owner. [Direct-entry preparation](../js/av-offline.js) waits for a controller at the published registry version and checks the current entry's required assets before reporting Offline ready. Stage 3D also checks its pinned spatial modules before that claim. A cached first visit is necessary; persistence and downloads still use each product's existing save semantics. Throwline does not silently autosave scenes.

## Verification and remaining acceptance

- `npm run test:av-workspace` runs touch-enabled Chromium device contexts at six requested phone/tablet sizes in both orientations and themes, plus three intermediate/desktop sizes (80 cases, including 320px narrow-width coverage). It checks root containment, input and label reachability, target sizes, result placement, rotation state, onboarding and theme persistence, plus a reduced-height input/result check; then independently prepares and reloads all three entries offline and edits them.
- `AV_WORKSPACE_BROWSER=webkit npm run test:av-workspace` repeats the 80 geometry, touch-event, orientation and focus cases in WebKit. Native selectors use the shared explicit touch height; intrinsic banner rows prevent stale WebKit grid sizing after rotation. WebKit desktop automation returns an internal navigation error for offline reload, so that lane remains Chromium plus physical Safari acceptance. Install only the test runtime with `npx playwright install webkit` if absent.
- `npm run probe:led-configurator -- --base=http://127.0.0.1:8000/` and the same command with `--no-webgl` cover calculation, profile, persistence, preview, fallback and cross-page handoff behavior.
- `npm run test:throwline-browser` and `npm run verify:throwline` cover the scene contract, planner, manipulation, exports, field evidence and fallback behavior.
- `AV_WORKSPACE_EVIDENCE=/absolute/output/path npm run test:av-workspace` saves screenshots and matrix JSON. `AV_WORKSPACE_BASE=https://avbydave.com/` points the same probe at the published release.

Emulation does not establish physical iOS keyboard avoidance, address-bar transitions, notch/home-indicator clearance, daylight readability, or real operator acceptance. Those remain explicit device checks. This foundation is not a claim that every control across the suite has passed WCAG AA.


## AV Calculator viewport pilot

[AV Calculator](../av-calculator.html) preserves the existing calculation engine, `avCalculator.v1` values and incoming card hashes. Its [view adapter](../js/av-calculator-viewport.js) organizes the six calculations and operator summary into keyboard tabs, with a labeled bottom task selector on phones. Bounded field pages retain real input nodes; they do not turn forms into scrolling panels. Only the complete generated summary is a long scroll panel. Wide displays additionally show the summary beside the current calculation. Show-context controls retain their original event handlers in an optional Show context view. Neither task switching nor layout writes readiness or document data.

The calculator opts into the embedded navigation slot while providing Home, Toolbox, current task, a deterministic show-context return, and the first-focus skip link. Save guards still run. Other consumers keep their current behavior until an application adapter explicitly adopts the shell.

Verification: `node scripts/probe_calculator_viewport.cjs` against a local server at port 4173; `VIEWPORT_BROWSER=webkit` selects WebKit and excludes offline reload, which remains a Chromium check. `VIEWPORT_BASE` names another origin. The reusable viewport skill checker uses [the calculator adapter](../scripts/viewport_calculator_adapter.cjs) to exercise every field page, real theme control, readiness and the permitted summary scroll region. The October 3 local matrix passed 188/188 pages per engine in both themes at 1440×900, 375×812, 844×390, 320×256 and 3840×1080. A separate 680px layout pass, PF-required error state, summary export, print expansion, reload, navigation and offline checks passed. These are automated source checks; deployment and physical acceptance are separate gates recorded in the requested candidate report.


## Explicit shell migration

[`AVViewport`](../js/av-viewport.js) extracts the pilot's measured field pagination and semantic task navigation. An adapter supplies real nodes and decides which content is a task or a genuinely long panel. The helper owns no application documents, storage migrations or readiness state. It retains focused fields while recalculating page boundaries, uses roving tabs and a labeled task selector, and preserves unrelated URL parameters. Existing hash contracts can opt into hash routing; new adapters use `taskView` without replacing specialist hashes.

[`sbd-nav.js`](../js/sbd-nav.js) supports `data-sbd-nav="embedded"` with a `[data-sbd-nav-slot]` supplied before its deferred initialization. It mounts compact Home (`/`) and AV by Dave (`av/`) links inside that slot. [`av-viewport.css`](../css/av-viewport.css) styles those controls without adding a floating block or body clearance. The adapter supplies current location and any show-context operating view; the original show dock handlers remain authoritative. Existing default consumers retain the full legacy bar, and `data-sbd-nav="off"` remains a specialist opt-out. Save guards run in all three modes.

Run [`probe_viewport_navigation.cjs`](../scripts/probe_viewport_navigation.cjs) to compare every current registry consumer's navigation links, runtime errors and save-guard presence against the pre-extraction script. Existing page overflow in unmigrated applications is recorded separately; this extraction does not claim a catalog-wide layout redesign.

The extraction passed 92 navigation comparisons (46 registry consumers × desktop/phone), with no changed legacy link contracts, save-guard presence or new runtime errors. The same sweep observed 78 pre-existing page-overflow cases in the baseline with show context; those remain outside the shared extraction. Both Chromium and WebKit repeated 188/188 calculator field pages after extraction.


## Show Operations task views

The [worksheet adapter](../js/av-worksheet-viewport.js) moves each existing field, action and table into Setup, Records, Find / Add, Selected, Status and Outputs. Room Check and Breakout Room Matrix retain their derived Operator cards in a bounded list. Show Handoff has Setup, Notes, Actions, Decisions, Status and Outputs. Show context remains a separate task view with its original readiness, note and return handlers. URLs use the additive `taskView` query; document storage and schemas are unchanged.

The [Show Board adapter](../js/av-board-viewport.js) preserves the specialist timeline and its show, room, session, issue, snapshot and conflict model. Setup and dialogs use field pages. Timeline, Live / Next, Issues, Turns, Controls and Recovery remain separate tasks; Sessions exposes full timing and status for narrow timeline graphics. Ultrawide operation keeps Live / Next beside the timeline. Conflicts reveal the existing recovery controls. Dialog focus stays inside the dialog, and Escape preserves its existing return behavior.

Only record tables, generated record decks, session/issue/snapshot lists and freeform note/document text have bounded scrolling. Ordinary forms and navigation use field pages. Print expands task pages and substitutes complete text values for inputs, selects and textareas; the existing table remains the canonical print representation of duplicate Operator cards. No stores or documents are merged.

With this checkout served on port 4173, run `node scripts/probe_worksheet_viewport.cjs` (`VIEWPORT_ROUTES` accepts comma separated registry ids), `node scripts/probe_show_board_viewport.cjs`, and repeat with `VIEWPORT_BROWSER=webkit`. `VIEWPORT_BASE` selects a deployed origin. The reusable viewport checker uses `scripts/viewport_worksheet_adapter.cjs` or `scripts/viewport_board_adapter.cjs`; `WEB2_SAMPLE=1` loads worksheet samples, and `BOARD_POPULATED=1 BOARD_DIALOGS=1` exercises a controlled multi-room session fixture and dialogs. Matrix evidence and release status remain in the existing Viewport Refactor Candidates report; local tests alone do not establish deployment or device acceptance.


## Logistics task views

Gear Prep, Truck Pack Plan, Load In Plan, Strike Plan and Cable Plan share the worksheet interface conventions while retaining separate documents and storage. Their record tasks are named Prep, Pack, Load In, Strike and Cable. Selected details, status, original outputs and available Operator cards remain independently reachable. No cross-tool record mapping or document migration is introduced.

The Exceptions view reads a shallow copy of records selected by the owning tool's existing `prepCheck` / `hasGap` validation. It includes exceptions outside active search/status/category filters. Opening one explicitly clears those filters and selects the original record through existing handlers. This read-only projection never writes quantities, identity, status or reference data. `probe_logistics_exceptions.cjs` verifies filter-independent reachability, original selection and copy isolation; the existing worksheet functional/matrix adapters cover all five registry ids.


## StagePlotter canvas workspace

The [StagePlotter adapter](../js/av-stage-viewport.js) provides Canvas, Tools, Selected, Setup, Items, Outputs and Status views. A 1120×630 drawing coordinate surface preserves the original 16:9 aspect and percent-based geometry while a view transform fits it to the available screen. Fit, zoom and pan are transient interface state; they never rewrite `stage-plot.v1` or the legacy `system-by-dave.plotforge.v1` export. Pointer geometry still uses the transformed surface bounds. Original item dragging and keyboard nudges remain available; Pan mode redirects arrows and drag gestures to the view. Task navigation consumes its own arrow keys before the plot model sees them.

The drawing is intentionally a clipped spatial view at magnification. Its scaled labels are accompanied by complete item labels/coordinates in Items, all properties in Selected, and the original operator summary. The viewport checker documents that narrow geometric exclusion; `probe_stage_viewport.cjs` separately tests drawing placement, mouse/Chromium touch emulation, view zoom/pan, keyboard behavior, geometry/identity round trips, rejected imports, save/reload and print. Run it on port 4183 (`VIEWPORT_BASE` overrides), then with `VIEWPORT_BROWSER=webkit`. Physical touch accuracy and operator acceptance remain separate.


## Embedded navigation revalidation — 2026-10-18

AVV-13 was revalidated against source and published provenance
`885a3ab42d621aef7923dbcc5979f2fd1cc301f1`. The earlier finding's
`av-suite.html?entry=toolbox` target is superseded: the current embedded branch
of `js/sbd-nav.js` emits Home (`/`) and AV by Dave (`av/`).

The current opted-in HTML consumers are all at the site root:

| Consumer | Expected and resolved console destination |
| --- | --- |
| `av-calculator.html` | `https://avbydave.com/av/` |
| `cue-sheet.html` | `https://avbydave.com/av/` |
| `stage-plot.html` | `https://avbydave.com/av/` |

Each supplies one navigation slot, includes the shared script and has no
`base` element. Calculator's bridge moves its existing slot into the native
header. `css/av-viewport.css` styles the embedded links; it does not resolve
URLs. Specialist pages embedded with `sbdEmbed=panel` suppress the shared nav,
so that mode does not add a new subdirectory navigation consumer.

Independent checks in this pass covered source inventory, published-file
parity and six standard URL-resolution cases: the plain URL and a synthetic
show-context/hash URL for each current route. All resolve Home to the site
root and AV by Dave to `/av/`. The three HTML files, navigation script,
viewport stylesheet and console index byte-match the reviewed source;
`/av/` serves that index, and production `source.json` names the reviewed
revision. No present destination defect was found, and no runtime repair was
made.

The previously recorded root-route browser comparisons remain historical
reported evidence. This pass did not repeat that browser sweep, run a new
click test, simulate a hypothetical subdirectory adopter or establish
physical-device, screen-reader or older-iPad acceptance.

AVV-13 remains only a future adoption gate: before a subdirectory route opts
into this navigation, define its intended base and destination resolution and
verify navigation, show-context, save-guard and embedded-panel compatibility.
This record does not authorize or implement that adoption. The later AVV-06
visibility revalidation and repair are recorded below; no minimum-OS policy
decision follows from either review.


## Visibility API compatibility — 2026-10-18

AVV-06 was reproduced at source/live
`ba164f9487e7b921dbb04c22a92be2e547d1377b`: removing only
`Element.checkVisibility` in disposable browser contexts causes a `TypeError`
in the current standalone Calculator and LED paging paths. This proves a
reachable JavaScript feature-absence failure, not a failure observed on an
actual older iPad.

`AVViewport.isVisible` and `AVWorkspace.isVisible` now feature-detect the
method. Browsers providing it retain their native zero-option check. The
fallback checks associated layout boxes and hidden ancestor contents in the
current light-DOM panels. It deliberately does not substitute opacity,
`visibility:hidden` or `offsetParent` tests for the native default. The
[CSSOM View default check](https://drafts.csswg.org/cssom-view/#dom-element-checkvisibility)
provides the semantics; this repair does not set a minimum supported OS or
install a global prototype polyfill.

Current callers include the standalone Calculator bridge, the suite's compiled
native Calculator, Cue Sheet, StagePlotter, LED and Stage 3D. The active Cue
Sheet and StagePlotter callbacks use the shared guard. The older board,
worksheet and calculator viewport adapters have no current published HTML or
native-pack script consumer; they remain unadopted and unchanged. This is not
blanket compatibility approval for those dormant adapters.

The focused regression is `node scripts/probe_av_visibility.mjs`, also called
by the existing workspace browser probe. `AV_WORKSPACE_BROWSER=webkit` selects
WebKit, `AV_WORKSPACE_BASE` selects a deployed origin, and
`AV_VISIBILITY_EVIDENCE` records the result and screenshots. The standalone
Chromium launch honors `CHROME_CHANNEL` and defaults to installed Chrome,
matching the existing workspace probe; managed runners can select
`CHROME_CHANNEL=chromium` for their bundled browser. It compares eleven
box states for both helpers with native and missing API, verifies native
zero-option delegation, paginates to focused fields without changing values,
and checks five current routes in both API states. The shared-console case
opens the existing native Calculator on desktop and then narrows to phone
width; StagePlotter uses its existing narrow-screen view selector.

Dominic passes the focused Chromium and WebKit checks, AV verification and
26 Rail/worker tests, Throwline verification and 47 tests, shared-runtime
synchronization, the native suite build and diff checks. The initial new-test
selector/readiness failures and the cache-pin mismatch are retained separately
from the corrected checks; no failed gate was waived. Exact-head CI, merge,
publication and production readback remain separate release evidence.

The existing offline cache generation advances to
`v20261018-visibility-compatibility`, with the registry, worker update, generated
workspace copies, Stage 3D readiness pin and generation assertions aligned.
There is no CSS, calculation, schema, document key, imported source, saved-data
or dependency change. Physical devices, older OS/browser combinations,
screen-reader use, touch ergonomics, installed returning-client transitions and
operator acceptance remain open under AVV-14 and the existing acceptance
records. Stream/Record credentials and other product choices are unchanged.
