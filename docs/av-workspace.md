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
- `npm run probe:led-configurator -- --base=http://127.0.0.1:8000/` and the same command with `--no-webgl` cover calculation, profile, persistence, preview, fallback and cross-page handoff behavior.
- `npm run test:throwline-browser` and `npm run verify:throwline` cover the scene contract, planner, manipulation, exports, field evidence and fallback behavior.
- `AV_WORKSPACE_EVIDENCE=/absolute/output/path npm run test:av-workspace` saves screenshots and matrix JSON. `AV_WORKSPACE_BASE=https://avbydave.com/` points the same probe at the published release.

Emulation does not establish physical iOS keyboard avoidance, address-bar transitions, notch/home-indicator clearance, daylight readability, or real operator acceptance. Those remain explicit device checks. This foundation is not a claim that every control across the suite has passed WCAG AA.
