# Rail: implementation specification v2

**Date:** October 5, 2026  
**Project:** System by Dave / AV Video  
**Supersedes:** `2026-10-05_Rail-Implementation-Plan.txt`  
**Basis:** The supplied plan and its preceding code-informed review. `main` at `66b3d66` is the reviewed baseline, not a claim about the branch at implementation time.  
**Qualification:** Specification only. Implementation, browser behavior, visual alignment, real-device touch, and deployment remain unverified. Requirements below incorporate the review amendments; they do not represent separate evidence of product approval or execution.

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

The broader Toolbox/landing-page consolidation remains deferred to the source plan's manifest step 6. This specification neither verifies nor expands that separate manifest.

## 2. Decisions and amendments

| ID | Requirement |
| --- | --- |
| V1 | Implement `js/sbd-rail.js` separately. Do not load `sbd-nav.js` into AV Video or introduce another save guard. |
| V2 | Persist rail preferences only in `sbd.rail.v1`. Keep `av-suite-ui.v1` page-local. |
| V3–V4 | Keep external products outside `tools`; preserve existing legacy alias behavior. New rail identities must be typed. |
| V5 | Inspect each console's declared draft key. Treat `sbd.consoleDrafts.v1` and change notifications only as invalidation hints. |
| V6 / R2 | Roll out to AV Video only. Retain the Toolbox's existing rail and legacy-page navigation. |
| V7 | Add an explicit, non-mutating Toolbox family-browsing contract. Do not treat `family=` as a show-setting parameter. |
| V8 | Use a desktop rail, compact icon rail, and phone Apps dialog. Never add a second phone bottom bar. |
| V9 | Register only existing consoles in `consoles`. Preserve `consolidatedInto`; do not invent ownership metadata for unbuilt consoles. |
| R1 amendment | Families are discoverable destinations and optional pins, not automatically pinned substitutes for unbuilt consoles. |
| Default amendment | On fresh storage, pin **AV Video only**. Toolbox, All apps, and Customize remain fixed navigation controls. |

These defaults resolve the source plan's open implementation choices for this revision. Do not label them as separately signed off by Dave.

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
  defaultPinned: ['console:av-video']
},
externals: [/* entries specified below */]
```

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
| Pinned | AV Video by default; user-selected navigable consoles, families, specialists, or external entries thereafter |
| All apps | Dialog with consoles, existing families, specialist tools, and external products; distinguish entry types and status-only cards |
| Customize | Pin, unpin, reorder with buttons and the keyboard, and explicitly restore defaults |
| Current location | Mark the current destination with `aria-current="page"` wherever it is represented |

Do not duplicate AV Video as both a console and a specialist. Existing consolidated tools may remain accessible through their existing routes, but must not be advertised as new independent consoles. Do not remove their legacy entries or saved data.

Unpinning affects navigation visibility only. It does not disable modules, delete drafts, clear layouts, or remove All apps access. An intentionally empty pin list is valid; do not silently restore AV Video after the user unpins it.

### `sbd.rail.v1`

Use this versioned payload:

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

## 5. Navigation and Toolbox `family=`

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

## 7. Layout, accessibility, and failure isolation

| Viewport width in CSS pixels | Shell behavior |
| --- | --- |
| 1440 and above | Labeled left rail |
| 681–1439 | Compact icon rail with accessible names and discoverable labels |
| 680 and below | No left rail; Apps button in the existing top navigation opens the app dialog |

Retain Home / Toolbox / AV Video breadcrumbs and the existing phone panel switcher. Use the existing theme tokens and respect reduced motion. No pixel-perfect correspondence with the unavailable v3 prototype is claimed.

Keep rail DOM outside React's root. Give the console the remaining measured width and height with `min-width:0` and `min-height:0`; replace incompatible fixed viewport assumptions rather than clipping their consequences. Scope rail styles and handlers to avoid altering application controls or shortcuts.

Page-level overflow must remain bounded. Existing panel, pinned-list, and dialog scrolling is permitted where intentional. When many entries are pinned, the pin region may scroll independently, while Toolbox, All apps, and Customize remain reachable. A hidden scrollbar is not evidence that content fits.

All actionable targets must be at least 44 × 44 CSS pixels. Draft information must have an accessible text equivalent. Pin and reorder actions must work without dragging. Moving an item must retain useful focus and announce the resulting order without stealing focus elsewhere.

Dialogs require appropriate initial focus, contained Tab navigation, Escape dismissal, background isolation, and focus return to their trigger. Do not stack competing shell dialogs or interfere with an application-owned dialog. Avoid nested links and unlabeled icon controls.

Build DOM with element creation, `textContent`, and validated attributes, not interpolated user HTML. Registry icons must come from trusted static data.

If the rail or registry fails to initialize, AV Video and its breadcrumb remain usable. Do not allow an empty rail slot, uncaught rail exception, or rail-only storage failure to blank or block the console.

## 8. Implementation sequence

| Step | Work | Primary files / surfaces | Completion condition |
| --- | --- | --- | --- |
| 1 | Recheck the starting commit and repository instructions; implement console/external metadata, typed defaults, exact external lookup, and version bump | `js/sbd-registry.js` | Existing aliases preserved; metadata remains worker-safe |
| 2 | Add registry, identity, preference, and cache-invariant checks | `scripts/verify_av_suite.js` and appropriate existing tests | Legacy and new typed identities resolve independently |
| 3 | Implement rail rendering, preferences, routing, dialogs, and draft readout; wire AV Video's same-page draft invalidation | `js/sbd-rail.js`, `css/sbd-rail.css`, `apps/av-video/src/App.tsx`; shared draft helper only if needed without changing storage semantics | All interaction and draft contracts implemented |
| 4 | Implement Toolbox `family=` effective-state handling and explicit external command support | `js/av-suite/app.js`, doorway documentation | Browsing is predictable and non-mutating |
| 5 | Mount the rail and responsive shell in AV Video; retain breadcrumbs and rebuild production assets | `apps/av-video/index.html`, `apps/av-video/src/styles.css`, rebuilt `av-video/` | Console remains usable in every shell mode |
| 6 | Add rail assets to `BASE_ASSETS`; run existing workspace sync; update Stage3D cache pin and regenerate inventory | Registry, `sync:av-workspace`, existing Stage3D/cache/inventory surfaces | Only expected asset-list changes; no external-host precache |
| 7 | Add `scripts/probe_av_rail.mjs`; connect it to browser gates and existing CI workflows; run regression suites | `scripts/`, `package.json`, existing `av-video.yml` and `deploy-pages.yml` | Acceptance matrix and existing gates pass at the same reviewed head |
| 8 | Update contracts, source map, and changelog | `docs/av-console.md`, public-shell contract and verifier, `docs/av-suite-doorway.md`, `CLAUDE.md`, CHANGELOG | Scope, identities, persistence, context, and remaining limitations documented |
| 9 | Open PR, independently review the diff and browser evidence, satisfy gates, merge under existing permissions, verify deployment | PR/checks, deployed AV Video, `source.json` | Reviewed commit and release evidence agree |

**Dependencies:** Step 1 precedes steps 2–5. Steps 3 and 4 may proceed in parallel. Step 5 requires step 3; step 6 follows creation/build of all assets; step 7 exercises steps 3–6. Documentation must be complete before release. Nothing depends on an unbuilt console.

## 9. Acceptance gates and Definition of Done

### Required gate set

Retain the source plan's gates: `verify:av`, `verify:public-navigation`, `verify:public-consistency`, `verify:domain-sites`, `test:av-video`, `test:av-video-browser` including the rail probe, and `probe_cue_sheet`. Resolve their actual invocation from repository scripts rather than inventing new command names.

Add explicit PlotForge legacy/external coverage alongside the CueForge coverage. Do not obtain a passing result by repeatedly rerunning an unexplained failure. Investigate, fix or establish the cause, and record the evidence.

### Acceptance matrix

| Area | Mandatory assertions |
| --- | --- |
| Defaults and discovery | Fresh storage shows only AV Video pinned; existing families are discoverable and pinnable; no unbuilt consoles appear |
| Preferences | Pin, unpin, reorder, reset, empty pins, malformed storage, unknown versions/IDs, duplicates, reload, and save failure follow the contract |
| Identity | Both legacy aliases and both new external products resolve to their distinct intended destinations |
| Routing | Nested-page links use the suite base; internal destination query/hash survives; Toolbox and external links receive no show context; test actual handoff destinations |
| Family browsing | Known/unknown families, saved filters, Show precedence, Front Office isolation, and Back/Forward behave as specified |
| State isolation | Rail actions leave saved show, video document, modules, draft/index, layout, and undo state unchanged, except for existing console-owned lifecycle effects |
| Drafts | Initial, same-tab, cross-tab, save/discard, stale index, malformed draft, failed write/removal, blocked storage, and page restoration are covered |
| Accessibility | Keyboard-only use, focus management, spoken draft state, target sizes, reduced motion, and dialog dismissal/return all work |
| Layout | Assert no unintended page overflow and no clipped, covered, or unreachable controls; exercise many pins and intentional internal scrolling |
| Failure isolation | Missing rail/registry and rail preference-storage errors do not prevent application editing or existing navigation |
| Offline | Test fresh caching and an existing service-worker session; shell navigation remains usable without claiming remote products are available |
| Deployment | Deployed `source.json` identifies the expected released commit, and the deployed page loads and exercises the actual new rail assets |

Use deterministic fixtures for state-isolation tests so expected draft housekeeping does not obscure rail-originated writes. Observe both stored values and write attempts where practical.

**Minimum viewport fixtures:** 375×667, 667×375, 680×700, 681×700, 1100×600, 1439×700, 1440×700, and 3440×1440. These cover the original width targets, phone landscape, short desktop height, and both sides of rail-mode boundaries. Exercise long labels, many pins, light/dark themes, and 200% zoom separately.

### Offline and public invariants

The expected asset-path set delta is exactly `./js/sbd-rail.js` and `./css/sbd-rail.css`. Existing asset contents, cache versions, build hashes, and generated inventory may change. No external-host URL or additional handoff page is automatically added through `externals`. A different path-set delta requires an explicit reviewed amendment.

Tool count, sitemap membership, legacy routes, and tool-storage transfer membership remain unchanged. A cached handoff page is not evidence its remote product works offline; display that distinction honestly.

### Done when

The work is complete only when the contracts and tests above pass, the independent review is resolved, documentation is updated, the PR is merged, and deployed AV Video is verified against the expected commit. Default pins, draft indicators, correct external handoffs, and phone Apps behavior must be exercised on the deployed page, not inferred solely from `source.json`.

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
| v2 manifest, v3 prototype, and missing research notes | Referenced by the source plan but not independently re-inspected for this revision; do not assert parity or compliance with unseen material |
| DeckForge public URL and actual external-product availability | Remain unverified; retain status-only behavior where no destination is provided |
| Browser, real-device touch, and deployment evidence | Produced during implementation/release, not by this specification |

## Source basis

**S1.** `2026-10-05_Rail-Implementation-Plan.txt`, supplied October 5, 2026: original V1–V10 findings, nine implementation steps, external catalog, risks, choices R1/R2, and acceptance gates.

**S2.** Preceding code-informed review in this conversation: reviewed baseline `66b3d66285e6c34c8b1b7db9a087caeec0e7f670`; amendments concerning default pins, destination-specific context, draft lifecycle notifications, typed identity, and acceptance precision.

**Reviewed code references:** `js/sbd-registry.js`; `js/av-suite/app.js`; `js/sbd-nav.js`; `plotforge.html`; `apps/av-video/index.html`; `apps/av-video/src/App.tsx`; `apps/av-video/src/styles.css`; `apps/shared/av-console/drafts.ts`. These are baseline references from the preceding review, not newly verified current-branch assertions.
