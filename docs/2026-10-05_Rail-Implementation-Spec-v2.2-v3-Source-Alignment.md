# Rail: implementation specification v2.2

## AV Suite Prototype v3: source alignment and RAIL-1B decision

**Date:** October 5, 2026

**Project:** System by Dave / AV Video

**Supersedes:** `2026-10-05_Rail-Implementation-Spec-v2.1-v3-Contract-Alignment.md` as the rail implementation brief; does not supersede the prototype or the broader console manifest.

**Reference baseline:** `66b3d66285e6c34c8b1b7db9a087caeec0e7f670`. Recheck the implementation branch before changing code.

**Prototype evidence:** The supplied `AV-Suite-v3.zip` archive was inspected directly at SHA-256 `71b72c70ab3e004fd324f98cec7ed05a2cf16d054a4c05fce74fe298c5dd5e02`; its `AV Suite Prototype v3.dc.html` and `proto-data-v3.js` establish the source rail structure described below. [S6]

**Qualification:** This revision is aligned to the recovered v3 source and the current repository contract. The prototype was not executed in a browser, so exact rendered pixels, focus behavior and interactive parity still require implementation-time comparison. This is a specification, not evidence of implementation, testing, deployment or visual parity.

**Decision record — RAIL-1B, October 5, 2026:** Dave selected the complete nine-console v3 rail order. Every console slot appears by default. A console that is not implemented in the current product is visibly and accessibly marked **Planned**, remains status-only and must not acquire a fabricated route, document, storage key or readiness claim.

### Source authority and alignment boundary

| Basis | What it establishes | What it does not establish |
| --- | --- | --- |
| Original v3 source archive [S6] | Establishes the 56px icon rail, exact nine-console order, All apps grouping, source icons, planned-console treatment, draft dots and source screen states | Browser-rendered parity, production availability, or authority to copy prototype-only placeholder behavior |
| `docs/av-console.md` at the reference baseline [S3] | Identifies **AV Suite Prototype v3** as the design source; records workspace interactions, responsive modes, persistence, theme, show chip, and application identity requirements | Proof that every prototype console exists in production |
| `apps/shared/av-console/Workspace.tsx`, inspected responsive definitions and hook [S4] | Confirms console modes use **viewport width**: phone below 720px, tablet below 1100px, desktop otherwise | Proof that the added rail fits the existing workspace at those widths |
| Original rail plan and preceding review [S1, S2] | AV Video-only delivery slice, standalone rail, legacy compatibility, routing, storage isolation, and release safeguards | Authority to represent an unbuilt console as available |
| Previous specifications [S5] | Starting implementation contract and review amendments retained where compatible | Authority to override the recorded RAIL-1B decision |

**Keep three claims separate:** source-aligned v3 structure, current-product availability, and browser-verified visual parity. The archive establishes the first; the registry and shipping source establish the second; rendered comparison establishes the third.

### Changes from specifications v2 and v2.1

| Area | Revision |
| --- | --- |
| Responsive evidence | Preserve the 720/1100 console modes; record literal v3's persistent 56px icon rail and leave the phone Apps/labeled-desktop adaptation to RAIL-2 |
| Theme | Specify **Stage Slate** for first use, with **Warm Paper** and **System** available; a stored choice wins |
| Show context | Preserve a **read-only show and phase chip** only for contextual console entry; no shared-document switching |
| Workspace | Explicitly protect the 12 × 8 grid, panel chooser/menu, layout lock, view storage, hidden-module behavior, and specialist identity |
| Defaults | Replace the provisional AV Video-only seed with the RAIL-1B nine-console order recovered from v3; mark every production-unbuilt console Planned and status-only |
| Evidence | Record the archive hash and exact source findings; retain distinct source, functional, rendered-visual and deployed acceptance |
| Open adaptations | Keep the phone Apps presentation and local rail customization as recommendations from the engineering brief, not as claims about literal v3 behavior; RAIL-2 and RAIL-3 remain open |

## 1. Goal and scope

Add a registry-driven application rail beside AV Video. It must reproduce the nine v3 console slots in their source order, distinguish available destinations from planned/status-only consoles, provide optional family shortcuts, keep external products discoverable, and expose read-only awareness of stored console drafts. Preserve existing application data, legacy saved-ID migration, and the bounded AV Video workspace.

**The rail owns navigation preferences only. It does not own show data, application modules, document saving, draft recovery, or console layout.**

| In scope | Out of scope |
| --- | --- |
| Standalone rail script and stylesheet; initial integration on AV Video only | Installing the rail on legacy tool pages |
| Registry console metadata, typed rail pins, nine source-ordered console slots, and separate external entries | Building Audio, Show Control, or any other unbuilt console |
| Toolbox `family=` browsing and external command-menu support | Rebuilding the existing Toolbox or landing-page rail |
| Same-tab and cross-tab draft indicators | Replacing application save warnings or draft recovery |
| Responsive navigation, accessibility, offline shell assets, tests, and documentation | Introducing Workbook setup, shared show requirements, or new product integrations |

The suite-wide direction remains adoption by every application, including products outside the registry, with each application retaining its own panel library and character. Related tools may join family consoles with one document and one selection, with lossless imports. These are broader product requirements in [S3], not additional applications or migrations to build in this rail slice. A planned rail slot communicates direction only; it is not a console implementation, route, document or readiness claim.

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
| V8 / Open RAIL-2 | The engineering recommendation remains a desktop rail, compact icon rail, and phone Apps dialog aligned to the console's **below-720px** mode. Literal v3 instead keeps a 56px icon rail at every width. Resolve this choice before implementation; never add a second phone bottom bar. |
| V9 / RAIL-1B | Register all nine v3 console identities in source order. Only current production consoles may be navigable; every other identity is `planned`, status-only and free of fabricated ownership, route, storage or availability metadata. Preserve `consolidatedInto`. |
| R1 / family destinations | Existing families remain discoverable and pinnable as **family shortcuts**, not as fabricated shipping consoles. Families are not part of the RAIL-1B release default set. |
| RAIL-1B / default order | After fixed Toolbox, use **AV Video → Audio → Show Control → Show Ops → Front Office → The Shop → Infrastructure → Lighting → AV Calculator**, followed by fixed All apps and Customize. At the reference baseline only AV Video is available; the other eight slots are Planned. |
| Open RAIL-3 | Literal v3 has a fixed rail and a placeholder Customize toast. The engineering recommendation remains local pin/unpin/reorder/reset in `sbd.rail.v1`. Resolve this choice before implementation. |
| Alignment A1: theme | Stage Slate is first-use default; Warm Paper and System remain available; the stored theme choice always wins. [S3] |
| Alignment A2: show chip | Show and phase are read-only and appear only with show context. Consoles never exchange or replace each other's documents through navigation. [S3] |
| Alignment A3: workspace | Preserve the existing presentation engine, panel/view/module interactions, explicit Save, and device-local layout behavior. [S3] |
| Alignment A4: application identity | Shared shell does not mean a generic sheet template. Keep the active console's panel library and character; preserve specialist chrome in later integrations. [S3] |

**Default-set resolution:** RAIL-1B resolves the fresh/default console set and order. It does not approve placeholder routes or claim that planned consoles are built. Existing valid user preferences still win and must not be overwritten when registry defaults change. Reset defaults explicitly restores the current RAIL-1B order. RAIL-2 and RAIL-3 remain decisions needed before implementation.

## 3. Registry and identity contract

Keep the registry worker-safe: no DOM access, storage reads, or browser-only side effects. Add the following metadata while retaining the existing tools, families, aliases, and storage declarations. This is a structural sketch; reuse trusted registry icon data for the indicated icon field:

```js
consoles: [
  {
    id: 'av-video',
    prototypeId: 'video',
    label: 'AV Video',
    availability: 'available',
    toolId: 'av-video',
    draftKey: 'sbd.avVideo.draft.v1',
    layoutKey: 'sbd.avVideo.layout.v1',
    icon: /* trusted registry icon data */
  },
  {id: 'audio', prototypeId: 'audio', label: 'Audio', availability: 'planned', icon: /* trusted source icon */},
  {id: 'show-control', prototypeId: 'showcontrol', label: 'Show Control', availability: 'planned', icon: /* trusted source icon */},
  {id: 'show-ops', prototypeId: 'showops', label: 'Show Ops', availability: 'planned', icon: /* trusted source icon */},
  {id: 'front-office', prototypeId: 'office', label: 'Front Office', availability: 'planned', icon: /* trusted source icon */},
  {id: 'shop', prototypeId: 'shop', label: 'The Shop', availability: 'planned', icon: /* trusted source icon */},
  {id: 'infrastructure', prototypeId: 'infra', label: 'Infrastructure', availability: 'planned', icon: /* trusted source icon */},
  {id: 'lighting', prototypeId: 'lighting', label: 'Lighting', availability: 'planned', icon: /* trusted source icon */},
  {id: 'av-calculator', prototypeId: 'calc', label: 'AV Calculator', availability: 'planned', icon: /* trusted source icon */}
],
rail: {
  defaultPinned: [
    'console:av-video',
    'console:audio',
    'console:show-control',
    'console:show-ops',
    'console:front-office',
    'console:shop',
    'console:infrastructure',
    'console:lighting',
    'console:av-calculator'
  ]
},
externals: [/* entries specified below */]
```

This is the RAIL-1B source order. `prototypeId` preserves traceability to [S6]; the public console `id` uses durable product naming. A `planned` console has no `toolId`, route, draft/layout key or document contract until its own implementation brief defines them. Prototype `built` flags describe what the design prototype simulated, not what production currently ships.

Add `externalById()` with exact external-ID lookup. New rail entry resolution must dispatch by namespace before looking up an ID:

| Namespace | Meaning | Example |
| --- | --- | --- |
| `console:` | Available or planned console metadata; only available consoles have canonical routes | `console:av-video` |
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
| Planned console identity | Resolves exactly to its planned/status-only metadata; never falls through to a tool alias or route |
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
| Pinned | Ordered user pins, or the nine-console RAIL-1B seed when absent. Planned consoles occupy their source position and are unmistakably status-only. If RAIL-3 selects customization, also support family shortcuts, specialists and eligible external entries. |
| All apps | Dialog with available and Planned consoles, existing families, specialist tools, and external products; distinguish entry types and status-only cards |
| Customize | Open RAIL-3: either implement local pin/unpin/reorder/reset with keyboard alternatives, or retain a clearly labeled future-status entry matching literal v3. Do not ship an unexplained dead control. |
| Current location | Mark the current destination with `aria-current="page"` wherever it is represented |

Do not duplicate AV Video as both a console and a specialist. Existing consolidated tools may remain accessible through their existing routes, but must not be advertised as new independent consoles. Do not remove their legacy entries or saved data.

Unpinning affects navigation visibility only. It does not disable modules, delete drafts, clear layouts, or remove All apps access. An intentionally empty pin list is valid; do not silently restore AV Video after the user unpins it.

Each planned slot must expose its full label and “Planned” state to sighted, keyboard and screen-reader users. It must not use `aria-current`, carry a draft indicator or navigate. If it is focusable to disclose status, that disclosure is non-mutating and returns focus; do not use a dead link or a destination-looking button with no explanation. At the reference baseline, AV Video is the only available console in the RAIL-1B set.

Keep the interaction levels distinct: **the rail changes application/destination; panel buttons bring a panel forward; views recall arrangements; modules control panel availability.** Pinning is not enabling a module, opening All apps is not opening the panel chooser, and choosing a family shortcut is not evidence that a unified family console exists. Preserve the panel/view terminology in [S3].

### `sbd.rail.v1`

If RAIL-3 selects local customization, use this versioned payload. The example contains the resolved RAIL-1B default order:

```json
{
  "v": 1,
  "pinned": [
    "console:av-video",
    "console:audio",
    "console:show-control",
    "console:show-ops",
    "console:front-office",
    "console:shop",
    "console:infrastructure",
    "console:lighting",
    "console:av-calculator"
  ]
}
```

| Storage condition | Behavior |
| --- | --- |
| Key absent | Render registry defaults; do not write simply because the page loaded |
| Supported, valid payload | Render the user's ordered pins; preserve an empty array |
| Duplicate IDs | Render each entry once |
| Known planned console IDs | Render in their stored position with Planned status; do not suppress or alias-coerce them |
| Unknown or unavailable IDs | Suppress unresolved entries without alias coercion; preserve them across ordinary preference edits for compatibility |
| Malformed JSON, invalid shape, or unknown version | Use session defaults and explain that stored preferences could not be read; do not overwrite the payload automatically |
| Save failure | Keep the session's selected arrangement and visibly report that it was not saved |
| Restore defaults | Explicitly replace preferences with the current registry defaults |

Only explicit pin, unpin, reorder, or reset actions persist rail preferences. For ordinary edits, preserve planned and unresolved IDs in their existing order after the visible actionable pins; deduplicate the resulting stored list. Replacing an unreadable or unsupported payload requires an explicit reset, not an incidental customization write. Do not migrate or synchronize Toolbox favorites into the new key automatically.

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

**Open RAIL-2:** literal v3 keeps a 56px icon rail at every viewport and visually reduces each rail button from 44px to 36px when viewport height is below 700px. That short-height source behavior is evidence, not authorization to violate the production accessibility contract: implementation must preserve at least a 44 × 44 CSS-pixel interactive area and use intentional rail scrolling when height is constrained. The v2.1 engineering recommendation replaces the rail with an Apps dialog below 720px and adds a labeled desktop treatment. The table below is the recommended integration profile, not a description of literal v3, and is not implementation-authorized until RAIL-2 is resolved.

| Viewport width in CSS pixels | Rail presentation | Existing console presentation |
| --- | --- | --- |
| 1440 and above | Labeled left rail | Desktop: full 12 × 8 grid |
| 1100–1439 | Compact icon rail with accessible names and discoverable labels | Desktop: full grid, fitted inside the remaining console region |
| 720–1099 | Compact icon rail with accessible names and discoverable labels | Tablet: two panels across in reading order |
| Below 720 | No left rail; Apps button in the existing top navigation opens the application dialog | Phone: one panel with the existing **labeled bottom panel switcher** |

**Source distinction:** The 720px and 1100px console boundaries come from [S3], [S4] and [S6]. The prototype rail itself does not change at those widths. Aligning the rail's phone transition with 720px is an integration adaptation. The 1440px labeled/compact threshold comes from the original rail plan [S1], not v3 source.

Do not silently convert the shared console mode calculation to container width. At the reviewed baseline, removing rail width from the workspace does **not** change the mode chosen from `window.innerWidth`. Fit and test the allocated region accordingly, especially at 1100px. Any proposed change to the shared mode algorithm needs a separately reviewed compatibility amendment.

Retain Home / Toolbox / AV Video breadcrumbs and the existing phone panel switcher. The top Apps control selects applications; the bottom panel switcher selects panels inside the current console. Do not replace one with the other or introduce a second bottom bar.

Keep rail DOM outside React's root. Give the console the remaining measured width and height with `min-width:0` and `min-height:0`; replace incompatible fixed viewport assumptions rather than clipping their consequences. Keep the console's original 12-column, 8-row model. Scope rail styles and handlers to avoid altering application controls or shortcuts.

Page-level overflow must remain bounded. Existing panel, pinned-list, and dialog scrolling is permitted where intentional. When many entries are pinned, the pin region may scroll independently, while Toolbox, All apps, and Customize remain reachable. A hidden scrollbar is not evidence that content fits. A narrower presentation must not rewrite the desktop arrangement.

### 7.2 Theme and visual hierarchy

The first-use theme is **Stage Slate (dark)**. **Warm Paper (light)** and **System** remain available, and an operator's stored choice always wins. Use the existing shared theme resolution and `css/av-theme.css` tokens; do not give the rail an independent brand/theme preference or reset existing choices. [S3]

Preserve the v3-derived focus hierarchy: the focused panel has a stronger border and AV Video's **Signal Flow** is the lit, brightest panel surface. The rail must not replace the console with a generic dashboard or obscure its active-workspace focus. [S3]

Use the recovered source icons and shared theme tokens while developing. Literal v3 uses a 56px icon rail, 44px buttons, a 4px gap and 8px/6px rail padding; below 700px viewport height its visual button boxes become 36px. Do not reproduce that undersized interaction target: keep the production target at least 44 × 44 CSS pixels and scroll the rail instead. Any labeled rail or phone Apps dialog is an explicit adaptation under RAIL-2, not a v3 measurement. Do not expand this PR into retheming unrelated applications; verify that AV Video and the rail respect the shared choice.

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

Dialogs require appropriate initial focus, contained Tab navigation, Escape dismissal, background isolation, and focus return to their trigger. Do not stack competing shell dialogs or interfere with an application-owned dialog. Avoid nested links and unlabeled icon controls. These detailed shell-dialog requirements are retained engineering safeguards from v2; prototype source presence does not prove its rendered focus behavior.

Build DOM with element creation, `textContent`, and validated attributes, not interpolated user HTML. Registry icons must come from trusted static data.

If the rail or registry fails to initialize, AV Video and its breadcrumb remain usable. Do not allow an empty rail slot, uncaught rail exception, or rail-only storage failure to blank or block the console. No additional save guard is introduced.

## 8. Implementation sequence

| Step | Work | Primary files / surfaces | Completion condition |
| --- | --- | --- | --- |
| 0 | Resolve RAIL-2 responsive presentation and RAIL-3 customization; record answers without reopening RAIL-1B | This brief and the existing decision record | Implementation profile has no hidden prototype/adaptation ambiguity |
| 1 | Recheck the starting commit and repository instructions; preserve [S6] provenance; implement nine console identities, RAIL-1B typed seed, external metadata, exact external lookup, and version bump | `js/sbd-registry.js`; reference record in rail documentation | Exact source order retained; planned identities remain status-only; aliases preserved; metadata remains worker-safe |
| 2 | Add registry, identity, preference, and cache-invariant checks | `scripts/verify_av_suite.js` and appropriate existing tests | Legacy and new typed identities resolve independently |
| 3 | Implement rail rendering, resolved RAIL-3 behavior, routing/dialogs, Planned states and draft readout; wire AV Video's same-page draft invalidation | `js/sbd-rail.js`, `css/sbd-rail.css`, `apps/av-video/src/App.tsx`; shared draft helper only if needed without changing storage semantics | Nine slots render in source order; planned entries never navigate; interaction and draft contracts pass |
| 4 | Implement Toolbox `family=` effective-state handling and explicit external command support | `js/av-suite/app.js`, doorway documentation | Browsing is predictable and non-mutating |
| 5 | Mount the rail using the resolved RAIL-2 profile; preserve breadcrumbs and workspace behavior; verify shared theme and contextual read-only chip, adding bounded chip integration only where missing; rebuild production assets | `apps/av-video/index.html`, `apps/av-video/src/styles.css`, `apps/av-video/src/App.tsx` where needed, rebuilt `av-video/` | Console remains usable in every shell mode; section 7 invariants retained without changing the shared mode algorithm |
| 6 | Add rail assets to `BASE_ASSETS`; run existing workspace sync; update Stage3D cache pin and regenerate inventory | Registry, `sync:av-workspace`, existing Stage3D/cache/inventory surfaces | Only expected asset-list changes; no external-host precache |
| 7 | Add `scripts/probe_av_rail.mjs`; connect it to browser gates and existing CI workflows; run existing console, Video, graph, Displays, alias, and typecheck coverage | `scripts/`, `package.json`, existing `av-video.yml` and `deploy-pages.yml` | Acceptance matrix and existing gates pass at the same reviewed head; include 719/720 and 1099/1100 boundaries |
| 8 | Update contracts, source crosswalk, and changelog; record release default resolution and any accepted visual adaptations | `docs/av-console.md`, public-shell contract and verifier, `docs/av-suite-doorway.md`, `CLAUDE.md`, CHANGELOG | Scope, identities, persistence, context, v3-derived behavior, and unresolved/accepted deviations are distinguishable |
| 9 | Open PR, independently review the diff and browser evidence, satisfy gates, merge under existing permissions, verify deployment | PR/checks, deployed AV Video, `source.json` | Reviewed commit and release evidence agree |

**Rail-slice dependencies:** Step 0 precedes implementation. Step 1 precedes steps 2–5. Steps 3 and 4 may proceed in parallel. Step 5 requires step 3; step 6 follows creation/build of all assets; step 7 exercises steps 3–6. Documentation must be complete before release. Nothing in this rail slice depends on implementing a planned console. This local dependency graph does not settle the broader manifest-order discrepancy in section 10.

## 9. Acceptance gates and Definition of Done

### Required gate set

Retain the source plan's gates: `verify:av`, `verify:public-navigation`, `verify:public-consistency`, `verify:domain-sites`, `test:av-video`, `test:av-video-browser` including the rail probe, and `probe_cue_sheet`. Resolve their actual invocation from repository scripts rather than inventing new command names.

Also run the existing `npm run typecheck:av-video` documented in [S3]. The existing browser gate must continue to exercise `scripts/probe_av_console.mjs`; the new rail probe supplements rather than replaces the console, graph, and Displays coverage.

Add explicit PlotForge legacy/external coverage alongside the CueForge coverage. Do not obtain a passing result by repeatedly rerunning an unexplained failure. Investigate, fix or establish the cause, and record the evidence.

### Acceptance matrix

| Area | Mandatory assertions |
| --- | --- |
| Defaults and discovery | Fresh storage renders the exact RAIL-1B order. AV Video is available; the other eight entries are clearly Planned/status-only at the reference baseline. Existing families remain discoverable without pretending to be shipping consoles. |
| Preferences | If RAIL-3 selects customization: pin, unpin, reorder, reset-to-RAIL-1B, empty pins, malformed storage, unknown versions/IDs, duplicates, reload, and save failure follow the contract |
| Identity | All nine console IDs resolve independently; planned console IDs never alias or navigate. Both legacy aliases and both new external products resolve to their distinct intended destinations |
| Routing | Nested-page links use the suite base; internal destination query/hash survives; Toolbox and external links receive no show context; test actual handoff destinations |
| Family browsing | Known/unknown families, saved filters, Show precedence, Front Office isolation, and Back/Forward behave as specified |
| Theme and hierarchy | First use resolves Stage Slate; stored Warm Paper/System/Stage Slate choices win; rail follows the same theme. Focused-panel border and Signal Flow lit-panel hierarchy remain intact. |
| Show chip | No context means no required chip or show setup. Contextual entry shows supplied show/phase read-only. Rail actions do not alter show state or swap documents. |
| State isolation | In-page rail actions leave saved show, video document, modules, draft/index, layout, undo state, selection, and live application state unchanged, except for existing console-owned lifecycle effects. Navigation retains existing unload/recovery semantics and transfers no live application state. |
| Drafts | Initial, same-tab, cross-tab, save/discard, stale index, malformed draft, failed write/removal, blocked storage, and page restoration are covered |
| Accessibility | Keyboard-only use, focus management, spoken draft and Planned states, target sizes, reduced motion, and dialog dismissal/return all work; status-only entries are not deceptive controls |
| Console interactions | Preserve the grid, chooser, panel buttons/menus, lock, Store/Update/Save, module-hidden panels, compatible document loading, and phone panel switcher described in section 7. |
| Layout | Assert no unintended page overflow and no clipped, covered, or unreachable controls in the actual allocated console region; exercise many pins, internal scrolling, and resize without rewriting desktop arrangements. |
| Design evidence | Exact visuals and release seed/order must cite the original v3 reference or be explicitly documented as an accepted adaptation. Functional tests alone cannot certify visual parity. |
| Failure isolation | Missing rail/registry and rail preference-storage errors do not prevent application editing or existing navigation |
| Offline | Test fresh caching and an existing service-worker session; shell navigation remains usable without claiming remote products are available |
| Deployment | Deployed `source.json` identifies the expected released commit, and the deployed page loads and exercises the actual new rail assets |

Use deterministic fixtures for state-isolation tests so expected draft housekeeping does not obscure rail-originated writes. Observe both stored values and write attempts where practical.

**Minimum viewport fixtures:** 375×667, 667×375, 680×700, 681×700, **719×700, 720×700, 1099×600, 1100×600**, 1439×700, 1440×700, and 3440×1440. Retain 680/681 as regressions. Apply the resolved RAIL-2 expectation at 719/720 and 1439/1440 rather than assuming the recommended adaptation was selected. Test both sides of the documented 720/1100 console boundaries. Exercise long labels, all nine default slots, all supported theme choices, and 200% zoom separately.

At 1100px, assert both the selected desktop mode and usable controls inside the reduced console width. Do not pass a test by clipping content, falsifying the viewport fixture, or rewriting stored arrangements. Theme and read-only-chip tests must observe storage writes as well as rendered output.

### Offline and public invariants

The expected asset-path set delta is exactly `./js/sbd-rail.js` and `./css/sbd-rail.css`. Existing asset contents, cache versions, build hashes, and generated inventory may change. No external-host URL or additional handoff page is automatically added through `externals`. A different path-set delta requires an explicit reviewed amendment.

Tool count, sitemap membership, legacy routes, and tool-storage transfer membership remain unchanged. A cached handoff page is not evidence its remote product works offline; display that distinction honestly.

### Done when

The rail implementation is complete only when RAIL-2 and RAIL-3 are resolved, the contracts and tests above pass, the independent review is resolved, documentation is updated, the PR is merged, and deployed AV Video is verified against the expected commit. The exact RAIL-1B order, visible Planned states, draft indicators, external handoffs, resolved responsive/customization behavior, shared theme, and contextual read-only chip must be exercised on the deployed page, not inferred solely from `source.json`.

For a **v3 source-alignment sign-off**, attach the archive hash, source crosswalk and implementation comparison for the exact RAIL-1B order and any accepted adaptations. For **visual parity**, also attach rendered side-by-side evidence; source inspection alone is insufficient. Passing CI must not silently decide RAIL-2, RAIL-3 or a visual deviation. This evidence requirement does not erase or relax any compatibility, merge or deployment gate.

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
| Prototype source versus rendered parity | [S6] recovers exact source order, icon markup and rail geometry, but was not executed in a browser. Require rendered comparison before a pixel-parity claim. |
| Planned slots imply false readiness | RAIL-1B keeps all nine slots, but only current production consoles may navigate. Mark the other eight Planned/status-only at the baseline and assert zero fabricated routes, documents or storage. |
| Literal v3 versus product adaptations | Resolve RAIL-2 and RAIL-3 before implementation; record whether phone navigation and customization follow literal v3 or the engineering recommendations. |
| Broader manifest and missing research notes | The recovered prototype data labels itself “manifest v2” and supplies app order/steps, but it does not settle the conflicting broader delivery sequence or replace missing research notes. |
| Viewport modes versus remaining console width | The shared hook uses viewport width, not allocated width. Keep that distinction explicit and test the squeezed desktop grid at 1100px. |
| DeckForge public URL and actual external-product availability | Remain unverified; retain status-only behavior where no destination is provided |
| Browser, real-device touch, and deployment evidence | Produced during implementation/release, not by this specification |

### Broader sequence conflict: do not silently reconcile

The original rail plan's final step says this rail work unblocks manifest step 2, the next AV Video panels [S1]. The recovered console document lists those panels second and the rail/theme/draft-store work third [S3]. The complete governing manifest was not inspected, so these cannot be asserted as one verified sequence.

This specification defines the bounded rail slice and its technical dependencies only. It neither schedules the remaining consoles nor reverses the manifest. Record the discrepancy for roadmap reconciliation without treating it as a dependency on unbuilt features.

## 11. v3 alignment crosswalk

| Topic | Recovered v3 source and repository contract [S3, S4, S6] | Specification treatment | Evidence still needed |
| --- | --- | --- | --- |
| Shared system | grandMA-style panel host; Hog-style sizing, lock, and stored-view conventions | Retain shared engine and explicit interaction semantics, not a new generic dashboard | Browser regression evidence after integration |
| Theme | v3 source defaults to Stage Slate and toggles to Warm Paper; current repository contract also supports System and stored choice | Section 7.2 retains current production compatibility | Rendered rail styling in all three production modes |
| Show context | v3 source always seeds a show and displays a read-only app chip; repository contract permits standalone use without context | Section 5 follows the current product contract and treats context-only display as an explicit safety adaptation | Contextual and standalone browser tests |
| Workspace | 12 × 8, no overlap, panel minimums, panel scrolling | Section 7.3 preservation contract | Actual fit with rail at all fixtures |
| Responsive modes | Console: phone below 720, tablet below 1100, desktop otherwise. Source rail: persistent 56px icon column; visual buttons 36px below 700px height, otherwise 44px. | RAIL-2 must choose the persistent source rail or the recommended phone Apps/labeled desktop adaptation; either profile retains a 44 × 44 production target | Resolved decision and viewport comparison |
| Save and recovery | Explicit Save; offered draft recovery; silently restored local layout | Separate document, draft, and layout boundaries in section 6 | Lifecycle tests, including failure cases |
| Panel/view/module separation | Close hides view; module disable retains stored panels; view recall does not enable modules | Rail never takes ownership of these actions | Integration regressions and state-isolation evidence |
| Specialist identity | Distinct panel libraries and character; protected Throwline chrome | Preserve as broader design direction without expanding this PR | Future specialist-specific reference and integration tests |
| Default rail contents | Toolbox; nine consoles in the RAIL-1B order; All apps; Customize. Specialists and externals live under All apps. | Exact source order is resolved; current-unbuilt consoles are Planned/status-only | Implementation and deployed-state assertions |
| Rail-specific visuals | 56px source rail, source icon SVGs, 4px gap, 8px/6px padding, 44px or short-height 36px visual button boxes | Reuse source evidence; label any RAIL-2 adaptation; never reduce the production interactive target below 44 × 44 | Rendered side-by-side review |
| Registry and routing safeguards | Not specified by the recovered prototype-derived document | Retain typed IDs, separate externals, safe context policy, and direct-key draft reads from the engineering review | Current-head regression tests, not visual inference |

## Source basis

**[S1] Original rail plan.** `2026-10-05_Rail-Implementation-Plan.txt`, supplied October 5, 2026. Relevant sections: V1–V10; nine Steps; External entries; Risks; choices R1/R2; Done when; Not checked. The plan's claim to have checked v3 data is the author's claim, not a substitute for independently inspecting that prototype.

**[S2] Preceding code-informed review.** Review in this conversation against `66b3d66285e6c34c8b1b7db9a087caeec0e7f670`. Retain its compatibility findings, destination-specific context policy, draft invalidation, namespace separation, and stronger acceptance checks. Its AV Video-only default recommendation is not promoted to an approved v3 requirement.

**[S3] Recovered v3-derived console contract, read in full.** `DaveHomeAssist/system-by-dave`, `docs/av-console.md`, pinned baseline above. Relevant headings: opening design-source statement; What is shared and what is not; Interaction contract; Persistence; Decisions; Verification. It explicitly identifies *AV Suite Prototype v3* as the design source and records the October 5 decisions.

Source URL: `https://github.com/DaveHomeAssist/system-by-dave/blob/66b3d66285e6c34c8b1b7db9a087caeec0e7f670/docs/av-console.md`

**[S4] Responsive implementation, relevant opening section inspected.** Same repository/baseline, `apps/shared/av-console/Workspace.tsx`. `modeFor(width)` uses `<720` / `<1100`; `useConsoleWorkspace` initializes and updates mode from `window.innerWidth`. This inspection establishes the baseline mode contract, not full-file review or browser verification.

Source URL: `https://github.com/DaveHomeAssist/system-by-dave/blob/66b3d66285e6c34c8b1b7db9a087caeec0e7f670/apps/shared/av-console/Workspace.tsx`

**[S5] Previous implementation specifications, read in full.** `2026-10-05_Rail-Implementation-Spec-v2.md` and `2026-10-05_Rail-Implementation-Spec-v2.1-v3-Contract-Alignment.md`. This revision retains their compatibility, safe-routing, draft-lifecycle, offline and release detail while replacing provisional defaults and stale prototype-availability claims.

**[S6] Original AV Suite Prototype v3 source archive, read directly.** Archive SHA-256: `71b72c70ab3e004fd324f98cec7ed05a2cf16d054a4c05fce74fe298c5dd5e02`. Relevant members: `AV Suite Prototype v3.dc.html` (SHA-256 `9a8251c4c0ac382bedec5af9e374c0fd18bf9183412f07fc6334999d384e01ab`) and `proto-data-v3.js` (SHA-256 `a4c93ec4b13fdb6091a757c5d02753d9ef032b0392de8e80f8159d3839f60449`). These establish source structure, order, geometry, icons and prototype behavior. The included thumbnail was not uniquely attributable to the v3 screen, and the prototype was not browser-executed during this review.

**Earlier reviewed code references:** `js/sbd-registry.js`; `js/av-suite/app.js`; `js/sbd-nav.js`; `plotforge.html`; `apps/av-video/index.html`; `apps/av-video/src/App.tsx`; `apps/av-video/src/styles.css`; `apps/shared/av-console/drafts.ts`. These remain references from the preceding review, not newly verified current-branch assertions.

**Still not recovered or verified:** a separate complete governing delivery manifest, the lost research notes, and browser-rendered interaction/visual comparison of the v3 source. The original v3 source itself is recovered. No statement in this specification should be read as proof of implementation or rendered parity.
