# Rail: implementation specification v2.1

## AV Suite Prototype v3: documented-contract alignment

**Date:** October 5, 2026  
**Project:** System by Dave / AV Video  
**Supersedes:** `2026-10-05_Rail-Implementation-Spec-v2.md` as the rail implementation brief; does not supersede the prototype or the broader console manifest.  
**Reference baseline:** `66b3d66285e6c34c8b1b7db9a087caeec0e7f670`. Recheck the implementation branch before changing code.  
**Qualification:** Aligned to the repository's explicitly v3-derived console contract, not to an independently inspected copy of the original Claude Design prototype. This is a specification, not evidence of implementation, browser testing, deployment, or visual parity.

### Source authority and alignment boundary

| Basis | What it establishes | What it does not establish |
| --- | --- | --- |
| `docs/av-console.md` at the reference baseline [S3] | Identifies **AV Suite Prototype v3** as the design source; records workspace interactions, responsive modes, persistence, theme, show chip, and application identity requirements | The original prototype's precise rail geometry, icons, default pin set/order, or complete screen states |
| `apps/shared/av-console/Workspace.tsx`, inspected responsive definitions and hook [S4] | Confirms console modes use **viewport width**: phone below 720px, tablet below 1100px, desktop otherwise | Proof that the added rail fits the existing workspace at those widths |
| Original rail plan and preceding review [S1, S2] | AV Video-only delivery slice, standalone rail, legacy compatibility, routing, storage isolation, and release safeguards | Direct prototype approval for every engineering adaptation |
| Previous specification [S5] | Starting implementation contract and review amendments retained where compatible | Authority to treat its AV Video-only default pin set as the v3 design |

**Keep two claims separate:** documented v3 behavior can be aligned from the recovered contract; exact prototype parity still requires the original reference. Do not fill missing design details with an invented “v3” layout.

### Changes from specification v2

| Area | Revision |
| --- | --- |
| Responsive alignment | Move the phone Apps transition from 680px to **below 720px**; distinguish console modes at 720/1100px from the rail's provisional labeled/compact threshold at 1440px |
| Theme | Specify **Stage Slate** for first use, with **Warm Paper** and **System** available; a stored choice wins |
| Show context | Preserve a **read-only show and phase chip** only for contextual console entry; no shared-document switching |
| Workspace | Explicitly protect the 12 × 8 grid, panel chooser/menu, layout lock, view storage, hidden-module behavior, and specialist identity |
| Defaults | Reclassify “AV Video only” as a **provisional development seed**, not an approved v3 default; exact release pins/order remain unresolved |
| Evidence | Add a source crosswalk, source-conflict handling, and distinct functional versus visual acceptance |

## 1. Goal and scope

Add a registry-driven application rail beside AV Video. It must provide focused application navigation, optional family shortcuts, discoverable external products, and read-only awareness of stored console drafts. Preserve existing application data, legacy saved-ID migration, and the bounded AV Video workspace.

**The rail owns navigation preferences only. It does not own show data, application modules, document saving, draft recovery, or console layout.**

| In scope | Out of scope |
| --- | --- |
| Standalone rail script and stylesheet; initial integration on AV Video only | Installing the rail on legacy tool pages |
| Registry console metadata, typed rail pins, and separate external entries | Building Show Control, Audio, or other unbuilt consoles |
| Toolbox `family=` browsing and external command-menu support | Rebuilding the existing Toolbox or landing-page rail |
| Same-tab and cross-tab draft indicators | Replacing application save warnings or draft recovery |
| Responsive navigation, accessibility, offline shell assets, tests, and documentation | Introducing Workbook setup, shared show requirements, or new product integrations |

The suite-wide direction remains adoption by every application, including products outside the registry, with each application retaining its own panel library and character. Related tools may join family consoles with one document and one selection, with lossless imports. These are broader product requirements in [S3], not additional applications or migrations to build in this rail slice.

The original rail plan defers Toolbox/landing-page consolidation to its manifest step 6 [S1]. The complete manifest was not recovered. Preserve that deferred scope without claiming the phase numbering has been independently confirmed. The conflicting broader sequence is recorded in section 10; the dependencies in section 8 govern this rail slice only.

## 2. Decisions and amendments

| ID | Requirement |
| --- | --- |
| V1 | Implement `js/sbd-rail.js` separately. Do not load `sbd-nav.js` into AV Video or introduce another save guard. |
| V2 | Persist rail preferences only in `sbd.rail.v1`. Keep `av-suite-ui.v1` page-local. |
| V3–V4 | Keep external products outside `tools`; preserve existing legacy alias behavior. New rail identities must be typed. |
| V5 | Inspect each console's declared draft key. Treat `sbd.consoleDrafts.v1` and change notifications only as invalidation hints. |
| V6 / R2 | Roll out to AV Video only. Retain the Toolbox's existing rail and legacy-page navigation. |
| V7 | Add an explicit, non-mutating Toolbox family-browsing contract. Do not treat `family=` as a show-setting parameter. |
| V8 | Use a desktop rail, compact icon rail, and phone Apps dialog. Align phone application navigation with the console's **below-720px** mode; never add a second phone bottom bar. |
| V9 | Register only existing consoles in `consoles`. Preserve `consolidatedInto`; do not invent ownership metadata for unbuilt consoles. |
| R1 / family destinations | Existing families remain discoverable and pinnable as **family shortcuts**, not as fabricated shipping consoles. Their inclusion in the release default set must follow the resolved design reference. |
| Default seed, provisional | Retain **AV Video only** as the development/test seed from v2. Neither this set nor the original plan's broader family set is established as the actual v3 default. Toolbox, All apps, and Customize are retained from the rail plan. |
| Alignment A1: theme | Stage Slate is first-use default; Warm Paper and System remain available; the stored theme choice always wins. [S3] |
| Alignment A2: show chip | Show and phase are read-only and appear only with show context. Consoles never exchange or replace each other's documents through navigation. [S3] |
| Alignment A3: workspace | Preserve the existing presentation engine, panel/view/module interactions, explicit Save, and device-local layout behavior. [S3] |
| Alignment A4: application identity | Shared shell does not mean a generic sheet template. Keep the active console's panel library and character; preserve specialist chrome in later integrations. [S3] |

**Default-set resolution:** Before finalizing release defaults, record the original v3 set/order or Dave's explicit choice. Do not claim the provisional seed is approved, silently pin every family, or overwrite existing user pins when the release seed changes. Missing prototype details do not prevent implementation of the independently specified compatibility and interaction work.

## 3. Registry and identity contract

Keep the registry worker-safe: no DOM access, storage reads, or browser-only side effects. Add the following metadata while retaining the existing tools, families, aliases, and storage declarations. This is a structural sketch; reuse trusted registry icon data for the indicated icon field:

```js
consoles: [{
  id: 'av-video',
  toolId: 'av-video',
  draftKey: 'sbd.avVideo.draft.v1',
  layoutKey: 'sbd.avVideo.layout.v1',
  icon: /* trusted registry icon data */
}],
rail: {
  defaultPinned: ['console:av-video'] // provisional development seed; see section 2
},
externals: [/* entries specified below */]
```

The example default is not a transcription of the v3 prototype. The release seed must be traceable to the resolution recorded in section 2; do not introduce speculative consoles to reproduce a prototype menu.

Add `externalById()` with exact external-ID lookup. New rail entry resolution must dispatch by namespace before looking up an ID:

| Namespace | Meaning | Example |
| --- | --- | --- |
| `console:` | Existing console metadata and its canonical tool route | `console:av-video` |
| `family:` | Existing family in Toolbox browsing | `family:audio` |
| `tool:` | Exact canonical registry tool ID | `tool:throwline` |
| `external:` | Separate product or handoff entry | `external:cueforge` |

Do not feed external IDs through `toolById()` or `normalizeToolId()`. Preserve those functions' existing legacy behavior; do not add a misleading comment claiming their actual call sites are restricted to migration.

### Compatibility invariants

| Input or contract | Required result |
| --- | --- |
| Old saved tool ID `cueforge` | Cue Sheet, ID `cue-sheet` |
| New rail entry `external:cueforge` | CueForge's `cueforge.html` handoff |
| Old saved tool ID `plotforge` | StagePlotter, ID `stageplotter` |
| New rail entry `external:plotforge` | PlotForge's `plotforge.html` handoff |
| Console storage metadata | Its draft and layout keys also appear in the owning tool's `storageKeys` |
| Existing tools and data-transfer declarations | No additions, removals, or reassignment solely to introduce external products |

The existing command menu must explicitly recognize, render, execute, and validate `external:` commands and their recent-command entries. Do not assume registry entries alone enable this behavior. Non-navigable status entries must not become executable commands.

### External entries

These catalog labels are retained from the supplied plan. They describe intended presentation, not verified availability or integration health.

| Product | Destination | Badge | Behavior |
| --- | --- | --- | --- |
| CueForge | `cueforge.html` | Desktop app | Open the explanatory handoff, never Cue Sheet |
| PlotForge | `plotforge.html` | Own app | Open its handoff, never StagePlotter |
| House Video / FMP | `https://housevideo.app/` | Link out | External navigation; no implied shared state |
| Arena Ops | None | API pending | Informational status card; not pinnable or clickable |
| DeckForge + Stream Deck | None | Control surface | Informational status card until a public URL is verified |

Do not invent missing destinations or use placeholder links. External products never enter the normal tool count, sitemap, tool-storage transfer, or derived tool-cache list merely because they appear in this catalog.

## 4. Rail interaction and preferences

| Region | Required behavior |
| --- | --- |
| Top | Toolbox, linking to browsing mode without show context |
| Pinned | Ordered user pins, or the registry seed when absent. Use the provisional AV Video-only seed during development; finalize release defaults under section 2. Support navigable consoles, family shortcuts, specialists, and external entries. |
| All apps | Dialog with consoles, existing families, specialist tools, and external products; distinguish entry types and status-only cards |
| Customize | Pin, unpin, reorder with buttons and the keyboard, and explicitly restore defaults |
| Current location | Mark the current destination with `aria-current="page"` wherever it is represented |

Do not duplicate AV Video as both a console and a specialist. Existing consolidated tools may remain accessible through their existing routes, but must not be advertised as new independent consoles. Do not remove their legacy entries or saved data.

Unpinning affects navigation visibility only. It does not disable modules, delete drafts, clear layouts, or remove All apps access. An intentionally empty pin list is valid; do not silently restore AV Video after the user unpins it.

Keep the interaction levels distinct: **the rail changes application/destination; panel buttons bring a panel forward; views recall arrangements; modules control panel availability.** Pinning is not enabling a module, opening All apps is not opening the panel chooser, and choosing a family shortcut is not evidence that a unified family console exists. Preserve the panel/view terminology in [S3].

### `sbd.rail.v1`

Use this versioned payload. The example contains the provisional development seed, not a confirmed prototype default:

```json
{
  "v": 1,
  "pinned": ["console:av-video"]
}
```

| Storage condition | Behavior |
| --- | --- |
| Key absent | Render registry defaults; do not write simply because the page loaded |
| Supported, valid payload | Render the user's ordered pins; preserve an empty array |
| Duplicate IDs | Render each entry once |
| Unknown or unavailable IDs | Suppress unresolved entries without alias coercion; preserve them across ordinary preference edits for compatibility |
| Malformed JSON, invalid shape, or unknown version | Use session defaults and explain that stored preferences could not be read; do not overwrite the payload automatically |
| Save failure | Keep the session's selected arrangement and visibly report that it was not saved |
| Restore defaults | Explicitly replace preferences with the current registry defaults |

Only explicit pin, unpin, reorder, or reset actions persist rail preferences. For ordinary edits, preserve unresolved IDs in their existing order after the visible pins; deduplicate the resulting stored list. Replacing an unreadable or unsupported payload requires an explicit reset, not an incidental customization write. Do not migrate or synchronize Toolbox favorites into the new key automatically.

The rail must not write to saved-show keys, application documents, draft keys, draft indexes, or console layout keys. Opening a dialog, reading state, or rendering indicators must not save anything.

## 5. Navigation, read-only show context, and Toolbox `family=`

### Show and phase chip

The v3-derived decision is a **read-only show and phase chip**, present only when a console is opened with show context. It is not a mandatory show picker or a mechanism for loading another application's data. [S3]

| Entry or action | Required behavior |
| --- | --- |
| Standalone AV Video entry without show context | Remain fully usable without a show chip or a requirement to create/select a show |
| Contextual AV Video entry | Show the supplied, validated show/phase information read-only; absent fields must not be fabricated from another console's document |
| Open the rail or a shell dialog | Leave the chip, saved show, console document, and selection unchanged |
| Navigate to an eligible internal console | Carry the permitted URL context, not the originating console's document, records, layout, or module settings |
| Browse Toolbox/family or open an external entry | Apply the destination-specific URL rules below; do not persist context as a side effect |

The chip remains console-owned UI, outside the rail's preference state. Preserve it where already implemented; where integration work is needed, render it without changing save/import semantics. Keep user-controlled data insertion safe. Exact chip styling and placement are not established by the recovered prototype-derived text and must not be labeled pixel-matched.

### Destination-specific context rules

| Destination | Rule |
| --- | --- |
| Internal canonical tool or console | Forward only the recognized source URL parameters: `sbdShow`, `sbdVenue`, `sbdDate`, `sbdOperator`, `sbdPhase` |
| Toolbox or family browsing | Do not forward show parameters; do not change the saved show |
| External product or handoff | Do not append source query parameters, show context, or source hash |
| Status-only entry | No navigation |

Preserve destination-defined query parameters and hashes when composing internal links. Never populate missing URL context from saved show data. Resolve registry-relative paths against the explicit suite/deployment base, not the current `/av-video/` directory. Validate destination protocols and construct links through one shared rail URL builder.

Classify external handoffs by entry type even when their first URL is local. `plotforge.html` must not receive show parameters from the rail and then forward them to its external destination. Apply the same routing policy to external command-menu actions. Do not broaden this PR into an unrelated rewrite of all public handoff behavior.

### Family browsing contract

Canonical generated link:

```text
av-suite.html?entry=toolbox&family=audio
```

| Condition | Result |
| --- | --- |
| Known family, resolved Toolbox mode, no show context | Display that family |
| Valid family plus saved search or pinned/recent filters | For this visit, show the requested family with empty search and the All filter so unrelated saved filters cannot hide it |
| Unknown family | Ignore the parameter and use normal Toolbox browsing fallback |
| Any recognized show-context parameter present | Preserve the existing Show-mode precedence; ignore the browsing-only family override |
| Show or Front Office mode | Do not apply the Toolbox-only override |
| Browser Back/Forward | Recompute effective browsing state from the URL without saving show or rail state |

Keep URL overrides separate from persisted Toolbox preferences. URL parsing and automatic renders must not save the override. Explicit user changes to Toolbox controls retain their existing page-local persistence behavior.

The rail must never generate contradictory `entry=toolbox` links containing show-context parameters. Both the fixed Toolbox link and the retained Toolbox breadcrumb follow this rule. Verify saved-show storage byte-for-byte before and after browsing initialization and family navigation.

## 6. Draft-indicator contract

**Indicator meaning:** “A stored unsaved draft is present for this console in this browser.”

It does not mean every current keystroke has been saved, a write succeeded, the application is clean, or the document is guaranteed recoverable. A draft offer from an earlier visit may legitimately produce a dot before the current document is edited.

Read the console's declared draft key directly. Validate JSON and the supported envelope: version, matching console ID, timestamp, baseline, and document presence. Leave full document validation and recovery to the console's existing parser; do not duplicate or weaken it in the rail.

| Event or condition | Required behavior |
| --- | --- |
| Initial load or return to the page | Read actual registered draft keys |
| Same-tab edit, save, or discard | Re-read after the application's draft-storage operation |
| Another tab changes a draft | Refresh the affected console through native storage events |
| Storage cleared | Refresh all registered console indicators |
| Missing or stale index | Continue using actual draft keys |
| Failed write | Do not create a new dot from the event alone |
| Failed removal | Retain the dot if the stored draft remains |
| Malformed, mismatched, unsupported, or inaccessible draft state | Do not claim a valid draft or a clean state; expose a distinct readable “Draft state unavailable” indication without a new global save warning |
| Unpinning or navigating | Do not save, clear, restore, or migrate application drafts |

Add an explicit same-page invalidation event or adapter at AV Video's draft-write/clear call paths. For this implementation, use `sbd:console-draft-change` with `{ consoleId: 'av-video' }`. The event reports that state should be re-read, not that persistence succeeded. Dispatch after the operation attempt; retain existing save guards and draft timing.

Use native storage events for other tabs, and refresh on page restoration. Do not rely on storage events alone for same-tab behavior. Do not monkey-patch `Storage.prototype`. Do not turn the rail into a second recovery interface.

### Preserve the three persistence boundaries

| State | v3-derived behavior to preserve [S3] | Rail responsibility |
| --- | --- | --- |
| Saved console document, including stored views | Save remains explicit. Store as new view and Update are undoable document edits that remain unsaved until Save. | No writes; no automatic Save on navigation |
| Unsaved document draft | A differing prior draft is offered with Restore draft / Discard draft, never applied silently; the offer identifies a changed saved baseline. Restore yields an ordinary unsaved edit. Saving or returning to saved state clears through the console's lifecycle. | Read the declared key and report stored-draft presence only |
| Device-local layout | Current view, unstored arrangements, and lock restore silently and persist only after changes; they do not write the plan. | No writes, resets, or conversion into document drafts |

The source contract says malformed draft/layout entries are ignored by the console. Preserve that behavior. The rail's separate unavailable-state label is a retained engineering safeguard from v2, not permission to repair/delete the source entry or introduce another global warning. The direct-key read and advisory-index rule refine implementation reliability without changing the console's recovery contract.

## 7. Layout, theme, workspace preservation, and accessibility

### 7.1 Responsive shell and console modes

| Viewport width in CSS pixels | Rail presentation | Existing console presentation |
| --- | --- | --- |
| 1440 and above | Labeled left rail | Desktop: full 12 × 8 grid |
| 1100–1439 | Compact icon rail with accessible names and discoverable labels | Desktop: full grid, fitted inside the remaining console region |
| 720–1099 | Compact icon rail with accessible names and discoverable labels | Tablet: two panels across in reading order |
| Below 720 | No left rail; Apps button in the existing top navigation opens the application dialog | Phone: one panel with the existing **labeled bottom panel switcher** |

**Source distinction:** The 720px and 1100px console boundaries come from [S3] and are confirmed by `modeFor(window.innerWidth)` in [S4]. Aligning the rail's phone transition with 720px is this revision's explicit integration adaptation. The 1440px labeled/compact rail threshold is retained from the original rail plan [S1]; it is not an independently measured prototype value.

Do not silently convert the shared console mode calculation to container width. At the reviewed baseline, removing rail width from the workspace does **not** change the mode chosen from `window.innerWidth`. Fit and test the allocated region accordingly, especially at 1100px. Any proposed change to the shared mode algorithm needs a separately reviewed compatibility amendment.

Retain Home / Toolbox / AV Video breadcrumbs and the existing phone panel switcher. The top Apps control selects applications; the bottom panel switcher selects panels inside the current console. Do not replace one with the other or introduce a second bottom bar.

Keep rail DOM outside React's root. Give the console the remaining measured width and height with `min-width:0` and `min-height:0`; replace incompatible fixed viewport assumptions rather than clipping their consequences. Keep the console's original 12-column, 8-row model. Scope rail styles and handlers to avoid altering application controls or shortcuts.

Page-level overflow must remain bounded. Existing panel, pinned-list, and dialog scrolling is permitted where intentional. When many entries are pinned, the pin region may scroll independently, while Toolbox, All apps, and Customize remain reachable. A hidden scrollbar is not evidence that content fits. A narrower presentation must not rewrite the desktop arrangement.

### 7.2 Theme and visual hierarchy

The first-use theme is **Stage Slate (dark)**. **Warm Paper (light)** and **System** remain available, and an operator's stored choice always wins. Use the existing shared theme resolution and `css/av-theme.css` tokens; do not give the rail an independent brand/theme preference or reset existing choices. [S3]

Preserve the v3-derived focus hierarchy: the focused panel has a stronger border and AV Video's **Signal Flow** is the lit, brightest panel surface. The rail must not replace the console with a generic dashboard or obscure its active-workspace focus. [S3]

Use trusted existing icon assets and theme tokens while developing. Exact rail width, spacing, typography, icon treatment, chip position, and dialog composition require the original prototype or an explicitly accepted adaptation. Do not invent token values and describe them as v3 measurements. Do not expand this PR into retheming unrelated applications; verify that AV Video and the rail respect the shared choice.

### 7.3 Preserve the v3 console interaction contract

These are integration invariants, not a request to rebuild the shared engine. The reference contract is [S3].

| Surface | Behavior the rail integration must preserve |
| --- | --- |
| Ownership | Each console supplies its own panel library, default/stored views, and renderer. The shared engine owns presentation only; console content, selection, records, validation, and saving remain console-owned. |
| Workspace | A 12 × 8 snapping grid; no panel overlap; panel minimum sizes respected; long content scrolls inside panels, not the page. |
| Add panel | Empty-space tap or Add panel opens the chooser near the target. Keep search, Common / Planning / Utilities, labeled choices, and placement preview. Unlocked desktop empty-space dragging draws the rectangle. No space offers Replace, Split, or New view; nothing is silently covered. |
| Panel menu | Preserve Change panel, Move and size through explicit grid commands, Split side by side / top and bottom, Maximize / Restore, and Close panel. Closing removes the view, never records or module availability. |
| Layout lock | Visible lock state. Title-bar dragging and corner resizing work only on unlocked desktop layout; explicit menu commands remain available when locked. |
| Panel buttons | Bring an existing panel forward, open a stored view that contains it, or place it in free space. Retain AV Video's Signal flow, Patch, Displays, Checks, and Project labels and established link behavior. |
| Views | Store as new view and Update copy the live arrangement into the plan as undoable unsaved document edits. Save remains explicit. Rename, Duplicate, and Delete do not touch records; Revert restores the stored arrangement. View data contains panel types and positions, not application records. |
| Modules | Disabling hides module panels without removing them from stored views. Keep the hidden-panel count; re-enabling restores them. Recalling a view or navigating the rail must never enable a module. |
| Document compatibility | Plans without `workspace` use default views. Unsupported workspace versions fail validation rather than being rewritten. Invalid overlap/out-of-range panels are filtered for display without mutating saved data. |
| Narrow presentation | Tablet reading order and the phone panel switcher remain usable. Resizing, opening Apps, and pinning do not rewrite stored desktop coordinates. |
| Application identity | Preserve AV Video's own content and character. In later specialist integrations, retain scoped chrome; Throwline's flight strip, verdict, and provenance ladder must not become hideable by workspace layout. No specialist integration is added in this PR. |

While remaining in the current console, rail customization, opening/closing shell dialogs, and responsive reflow must not reset console selection, current view, layout lock, panel focus, or application live state. Focus may temporarily enter a dialog and must return appropriately; it must not trigger a document or view mutation. Navigating away retains the console's normal unload, saved-document, and recovery semantics. Do not persist or transfer visit-only live state merely to simulate seamless application switching.

### 7.4 Accessibility and failure isolation

All actionable targets must be at least 44 × 44 CSS pixels. Draft information must have an accessible text equivalent. Pin and reorder actions must work without dragging. Moving an item must retain useful focus and announce the resulting order without stealing focus elsewhere. Respect reduced motion. [S1, S3]

Dialogs require appropriate initial focus, contained Tab navigation, Escape dismissal, background isolation, and focus return to their trigger. Do not stack competing shell dialogs or interfere with an application-owned dialog. Avoid nested links and unlabeled icon controls. These detailed shell-dialog requirements are retained engineering safeguards from v2, not a claim about every behavior of the unseen prototype.

Build DOM with element creation, `textContent`, and validated attributes, not interpolated user HTML. Registry icons must come from trusted static data.

If the rail or registry fails to initialize, AV Video and its breadcrumb remain usable. Do not allow an empty rail slot, uncaught rail exception, or rail-only storage failure to blank or block the console. No additional save guard is introduced.

## 8. Implementation sequence

| Step | Work | Primary files / surfaces | Completion condition |
| --- | --- | --- | --- |
| 1 | Recheck the starting commit and repository instructions; capture design-source provenance and unresolved defaults; implement console/external metadata, typed seed, exact external lookup, and version bump | `js/sbd-registry.js`; reference record in rail documentation | Existing aliases preserved; metadata remains worker-safe; provisional versus resolved design choices identifiable |
| 2 | Add registry, identity, preference, and cache-invariant checks | `scripts/verify_av_suite.js` and appropriate existing tests | Legacy and new typed identities resolve independently |
| 3 | Implement rail rendering, preferences, routing, dialogs, and draft readout; wire AV Video's same-page draft invalidation | `js/sbd-rail.js`, `css/sbd-rail.css`, `apps/av-video/src/App.tsx`; shared draft helper only if needed without changing storage semantics | All interaction and draft contracts implemented |
| 4 | Implement Toolbox `family=` effective-state handling and explicit external command support | `js/av-suite/app.js`, doorway documentation | Browsing is predictable and non-mutating |
| 5 | Mount the rail; align phone transition with the console at 720px; preserve breadcrumbs and workspace behavior; verify shared theme and contextual read-only chip, adding bounded chip integration only where missing; rebuild production assets | `apps/av-video/index.html`, `apps/av-video/src/styles.css`, `apps/av-video/src/App.tsx` where needed, rebuilt `av-video/` | Console remains usable in every shell mode; section 7 invariants retained without changing the shared mode algorithm |
| 6 | Add rail assets to `BASE_ASSETS`; run existing workspace sync; update Stage3D cache pin and regenerate inventory | Registry, `sync:av-workspace`, existing Stage3D/cache/inventory surfaces | Only expected asset-list changes; no external-host precache |
| 7 | Add `scripts/probe_av_rail.mjs`; connect it to browser gates and existing CI workflows; run existing console, Video, graph, Displays, alias, and typecheck coverage | `scripts/`, `package.json`, existing `av-video.yml` and `deploy-pages.yml` | Acceptance matrix and existing gates pass at the same reviewed head; include 719/720 and 1099/1100 boundaries |
| 8 | Update contracts, source crosswalk, and changelog; record release default resolution and any accepted visual adaptations | `docs/av-console.md`, public-shell contract and verifier, `docs/av-suite-doorway.md`, `CLAUDE.md`, CHANGELOG | Scope, identities, persistence, context, v3-derived behavior, and unresolved/accepted deviations are distinguishable |
| 9 | Open PR, independently review the diff and browser evidence, satisfy gates, merge under existing permissions, verify deployment | PR/checks, deployed AV Video, `source.json` | Reviewed commit and release evidence agree |

**Rail-slice dependencies:** Step 1 precedes steps 2–5. Steps 3 and 4 may proceed in parallel. Step 5 requires step 3; step 6 follows creation/build of all assets; step 7 exercises steps 3–6. Documentation must be complete before release. Nothing in this rail slice depends on an unbuilt console. This local dependency graph does not settle the broader manifest-order discrepancy in section 10.

## 9. Acceptance gates and Definition of Done

### Required gate set

Retain the source plan's gates: `verify:av`, `verify:public-navigation`, `verify:public-consistency`, `verify:domain-sites`, `test:av-video`, `test:av-video-browser` including the rail probe, and `probe_cue_sheet`. Resolve their actual invocation from repository scripts rather than inventing new command names.

Also run the existing `npm run typecheck:av-video` documented in [S3]. The existing browser gate must continue to exercise `scripts/probe_av_console.mjs`; the new rail probe supplements rather than replaces the console, graph, and Displays coverage.

Add explicit PlotForge legacy/external coverage alongside the CueForge coverage. Do not obtain a passing result by repeatedly rerunning an unexplained failure. Investigate, fix or establish the cause, and record the evidence.

### Acceptance matrix

| Area | Mandatory assertions |
| --- | --- |
| Defaults and discovery | Fresh storage matches the resolved release seed/order and its recorded design basis; development fixtures identify the provisional seed. Existing families are discoverable and pinnable without pretending to be shipping consoles. |
| Preferences | Pin, unpin, reorder, reset, empty pins, malformed storage, unknown versions/IDs, duplicates, reload, and save failure follow the contract |
| Identity | Both legacy aliases and both new external products resolve to their distinct intended destinations |
| Routing | Nested-page links use the suite base; internal destination query/hash survives; Toolbox and external links receive no show context; test actual handoff destinations |
| Family browsing | Known/unknown families, saved filters, Show precedence, Front Office isolation, and Back/Forward behave as specified |
| Theme and hierarchy | First use resolves Stage Slate; stored Warm Paper/System/Stage Slate choices win; rail follows the same theme. Focused-panel border and Signal Flow lit-panel hierarchy remain intact. |
| Show chip | No context means no required chip or show setup. Contextual entry shows supplied show/phase read-only. Rail actions do not alter show state or swap documents. |
| State isolation | In-page rail actions leave saved show, video document, modules, draft/index, layout, undo state, selection, and live application state unchanged, except for existing console-owned lifecycle effects. Navigation retains existing unload/recovery semantics and transfers no live application state. |
| Drafts | Initial, same-tab, cross-tab, save/discard, stale index, malformed draft, failed write/removal, blocked storage, and page restoration are covered |
| Accessibility | Keyboard-only use, focus management, spoken draft state, target sizes, reduced motion, and dialog dismissal/return all work |
| Console interactions | Preserve the grid, chooser, panel buttons/menus, lock, Store/Update/Save, module-hidden panels, compatible document loading, and phone panel switcher described in section 7. |
| Layout | Assert no unintended page overflow and no clipped, covered, or unreachable controls in the actual allocated console region; exercise many pins, internal scrolling, and resize without rewriting desktop arrangements. |
| Design evidence | Exact visuals and release seed/order must cite the original v3 reference or be explicitly documented as an accepted adaptation. Functional tests alone cannot certify visual parity. |
| Failure isolation | Missing rail/registry and rail preference-storage errors do not prevent application editing or existing navigation |
| Offline | Test fresh caching and an existing service-worker session; shell navigation remains usable without claiming remote products are available |
| Deployment | Deployed `source.json` identifies the expected released commit, and the deployed page loads and exercises the actual new rail assets |

Use deterministic fixtures for state-isolation tests so expected draft housekeeping does not obscure rail-originated writes. Observe both stored values and write attempts where practical.

**Minimum viewport fixtures:** 375×667, 667×375, 680×700, 681×700, **719×700, 720×700, 1099×600, 1100×600**, 1439×700, 1440×700, and 3440×1440. Retain 680/681 as regressions, but both now use the phone Apps presentation. Test both sides of the documented 720/1100 console boundaries and retained 1440 rail threshold. Exercise long labels, many pins, all supported theme choices, and 200% zoom separately.

At 1100px, assert both the selected desktop mode and usable controls inside the reduced console width. Do not pass a test by clipping content, falsifying the viewport fixture, or rewriting stored arrangements. Theme and read-only-chip tests must observe storage writes as well as rendered output.

### Offline and public invariants

The expected asset-path set delta is exactly `./js/sbd-rail.js` and `./css/sbd-rail.css`. Existing asset contents, cache versions, build hashes, and generated inventory may change. No external-host URL or additional handoff page is automatically added through `externals`. A different path-set delta requires an explicit reviewed amendment.

Tool count, sitemap membership, legacy routes, and tool-storage transfer membership remain unchanged. A cached handoff page is not evidence its remote product works offline; display that distinction honestly.

### Done when

The rail implementation is complete only when the contracts and tests above pass, the independent review is resolved, documentation is updated, the PR is merged, and deployed AV Video is verified against the expected commit. Release default pins, draft indicators, external handoffs, phone Apps behavior, shared theme, and the contextual read-only chip must be exercised on the deployed page, not inferred solely from `source.json`.

For a **direct v3-alignment sign-off**, also attach the identifiable original prototype reference and the comparison evidence for exact visuals and defaults. Until then, report the narrower claim: **aligned to the documented v3-derived console contract**. A release based on provisional/default or visual adaptations requires those deviations to be explicitly resolved or accepted; passing CI must not silently decide them. This evidence requirement does not erase or relax any original compatibility, merge, or deployment gate.

Record any unperformed manual validation separately. Desktop emulation does not establish real-device touch behavior; do not claim that testing occurred unless it did.

## 10. Risks and unresolved evidence

| Risk / evidence gap | Handling |
| --- | --- |
| Rail consumes console width or short-window height | Compact mode, bounded pin region, measured workspace sizing, and visibility assertions |
| Family navigation accidentally enters or saves Show mode | Context-free generated links; explicit precedence and byte-level storage tests |
| Same-page draft dot becomes stale | Application invalidation adapter plus direct storage reread |
| Local handoff leaks show context externally | Type-based URL policy and final-destination tests |
| New identities collide with legacy aliases | Namespace-first resolution and independent regression cases |
| Public-shell verifier rejects the new navigation | Preserve breadcrumbs; extend the contract and verifier together |
| Existing bounded-workspace gate instability reported by the source plan | Investigate failures rather than hide them with repeated reruns |
| Two navigation rails exist in different surfaces | Document the AV Video application rail versus the existing Toolbox rail; do not consolidate them in this PR |
| Original v3 prototype and exact rail design | The explicitly v3-derived repository contract was inspected; the original Claude Design prototype was not located in the sources searched. Exact geometry, icons, chip placement, default pins/order, and visual screen states remain unresolved. |
| Broader manifest and missing research notes | The full v2 manifest was not recovered. Preserve known scope without inventing its remaining requirements or treating missing notes as implementation proof. |
| Provisional default seed mistaken for product direction | AV Video-only remains a development seed, not evidence of v3 approval. Resolve release defaults against the actual reference or an explicit user decision. |
| Viewport modes versus remaining console width | The shared hook uses viewport width, not allocated width. Keep that distinction explicit and test the squeezed desktop grid at 1100px. |
| DeckForge public URL and actual external-product availability | Remain unverified; retain status-only behavior where no destination is provided |
| Browser, real-device touch, and deployment evidence | Produced during implementation/release, not by this specification |

### Broader sequence conflict: do not silently reconcile

The original rail plan's final step says this rail work unblocks manifest step 2, the next AV Video panels [S1]. The recovered console document lists those panels second and the rail/theme/draft-store work third [S3]. The complete governing manifest was not inspected, so these cannot be asserted as one verified sequence.

This specification defines the bounded rail slice and its technical dependencies only. It neither schedules the remaining consoles nor reverses the manifest. Record the discrepancy for roadmap reconciliation without treating it as a dependency on unbuilt features.

## 11. v3 alignment crosswalk

| Topic | Recovered v3-derived contract [S3, S4] | Specification treatment | Evidence still needed |
| --- | --- | --- | --- |
| Shared system | grandMA-style panel host; Hog-style sizing, lock, and stored-view conventions | Retain shared engine and explicit interaction semantics, not a new generic dashboard | Browser regression evidence after integration |
| Theme | Stage Slate first use; Warm Paper/System; stored choice wins | Section 7.2 and theme gate | Prototype-specific exact rail styling |
| Show context | Read-only show/phase only with context; no document swapping | Section 5; routing safety retained separately | Exact visual chip position and style |
| Workspace | 12 × 8, no overlap, panel minimums, panel scrolling | Section 7.3 preservation contract | Actual fit with rail at all fixtures |
| Responsive modes | Phone below 720; tablet below 1100; desktop otherwise; viewport-based hook | Align Apps transition at 720; preserve tablet/desktop model | Original rail-specific geometry; 1440 threshold remains a sourced implementation accommodation |
| Save and recovery | Explicit Save; offered draft recovery; silently restored local layout | Separate document, draft, and layout boundaries in section 6 | Lifecycle tests, including failure cases |
| Panel/view/module separation | Close hides view; module disable retains stored panels; view recall does not enable modules | Rail never takes ownership of these actions | Integration regressions and state-isolation evidence |
| Specialist identity | Distinct panel libraries and character; protected Throwline chrome | Preserve as broader design direction without expanding this PR | Future specialist-specific reference and integration tests |
| Default rail contents | No exact default pin set/order stated in recovered console contract | Development seed only; release set is explicitly unresolved | Original prototype data/export or Dave's explicit selection |
| Rail-specific visuals | Original prototype not inspected | No fabricated pixel values or visual-parity assertion | Identifiable v3 export/screenshots and side-by-side review |
| Registry and routing safeguards | Not specified by the recovered prototype-derived document | Retain typed IDs, separate externals, safe context policy, and direct-key draft reads from the engineering review | Current-head regression tests, not visual inference |

## Source basis

**[S1] Original rail plan.** `2026-10-05_Rail-Implementation-Plan.txt`, supplied October 5, 2026. Relevant sections: V1–V10; nine Steps; External entries; Risks; choices R1/R2; Done when; Not checked. The plan's claim to have checked v3 data is the author's claim, not a substitute for independently inspecting that prototype.

**[S2] Preceding code-informed review.** Review in this conversation against `66b3d66285e6c34c8b1b7db9a087caeec0e7f670`. Retain its compatibility findings, destination-specific context policy, draft invalidation, namespace separation, and stronger acceptance checks. Its AV Video-only default recommendation is not promoted to an approved v3 requirement.

**[S3] Recovered v3-derived console contract, read in full.** `DaveHomeAssist/system-by-dave`, `docs/av-console.md`, pinned baseline above. Relevant headings: opening design-source statement; What is shared and what is not; Interaction contract; Persistence; Decisions; Verification. It explicitly identifies *AV Suite Prototype v3* as the design source and records the October 5 decisions.

Source URL: `https://github.com/DaveHomeAssist/system-by-dave/blob/66b3d66285e6c34c8b1b7db9a087caeec0e7f670/docs/av-console.md`

**[S4] Responsive implementation, relevant opening section inspected.** Same repository/baseline, `apps/shared/av-console/Workspace.tsx`. `modeFor(width)` uses `<720` / `<1100`; `useConsoleWorkspace` initializes and updates mode from `window.innerWidth`. This inspection establishes the baseline mode contract, not full-file review or browser verification.

Source URL: `https://github.com/DaveHomeAssist/system-by-dave/blob/66b3d66285e6c34c8b1b7db9a087caeec0e7f670/apps/shared/av-console/Workspace.tsx`

**[S5] Previous implementation specification, read in full.** `2026-10-05_Rail-Implementation-Spec-v2.md`. This revision retains its scope, identity, preference, safe-routing, draft-lifecycle, offline, and release detail while making source-derived design behavior and unresolved prototype details explicit.

**Earlier reviewed code references:** `js/sbd-registry.js`; `js/av-suite/app.js`; `js/sbd-nav.js`; `plotforge.html`; `apps/av-video/index.html`; `apps/av-video/src/App.tsx`; `apps/av-video/src/styles.css`; `apps/shared/av-console/drafts.ts`. These remain references from the preceding review, not newly verified current-branch assertions.

**Not recovered:** the original Claude Design *AV Suite Prototype v3* export/data/screens, the complete v2 manifest, and the lost research notes. No statement in this specification should be read as proof that those missing artifacts were inspected.
