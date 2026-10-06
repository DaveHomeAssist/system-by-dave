# Rail: implementation specification v2.3

## AV Suite Prototype v3: settled runtime profile

**Date:** October 5, 2026

**Status:** implementation contract

**Supersedes:** `2026-10-05_Rail-Implementation-Spec-v2.2-v3-Source-Alignment.md` for rail implementation. The v2.2 source analysis remains the evidence record.

This version records the three settled product decisions and the first bounded source slice:

- **RAIL-1B:** reproduce all nine v3 console slots in source order. Only AV Video is currently available; the other eight are visibly Planned and status-only.
- **RAIL-2A:** use a phone Apps dialog below 720 CSS pixels, a compact rail from 720 through 1439, and a labeled rail from 1440 upward.
- **RAIL-3A:** support device-local pin, unpin, reorder, and reset preferences in `sbd.rail.v1`.

The rail owns application navigation preferences only. It does not own show data, console documents, modules, draft recovery, or panel layouts.

## 1. Source authority and scope

The source crosswalk, compatibility review, archive hashes, persistence analysis, and broader acceptance requirements remain in v2.2. This specification resolves the formerly open runtime profile without changing those safeguards.

The original v3 archive establishes the nine-console order and icon source. Prototype `built` flags are not production availability claims. Current production source establishes that AV Video is the only implemented console in this set.

### Included in the first source slice

- nine console identity records and their source icons;
- the exact RAIL-1B default pin order;
- five external-product records separated from the normal tool inventory;
- exact `externalById()` lookup;
- focused registry verification;
- the resolved RAIL-2A and RAIL-3A contract recorded here.

### Explicitly deferred

- rail DOM, CSS, mounting, dialogs, and command-menu integration;
- `sbd.rail.v1` runtime reads, writes, migration, and reset behavior;
- AV Video draft-change events or indicators;
- Toolbox `family=` behavior;
- new console applications or placeholder routes;
- offline asset additions, sitemap changes, deployment, and live acceptance.

## 2. Console identity contract

The canonical source order is:

| Order | Console ID | Prototype ID | Label | Production state |
| ---: | --- | --- | --- | --- |
| 1 | `av-video` | `video` | AV Video | Available |
| 2 | `audio` | `audio` | Audio | Planned |
| 3 | `show-control` | `showcontrol` | Show Control | Planned |
| 4 | `show-ops` | `showops` | Show Ops | Planned |
| 5 | `front-office` | `office` | Front Office | Planned |
| 6 | `shop` | `shop` | The Shop | Planned |
| 7 | `infrastructure` | `infra` | Infrastructure | Planned |
| 8 | `lighting` | `lighting` | Lighting | Planned |
| 9 | `av-calculator` | `calc` | AV Calculator | Planned |

Only AV Video has a `toolId`, draft key, and layout key:

```js
{
  id: 'av-video',
  prototypeId: 'video',
  label: 'AV Video',
  availability: 'available',
  toolId: 'av-video',
  draftKey: 'sbd.avVideo.draft.v1',
  layoutKey: 'sbd.avVideo.layout.v1'
}
```

Every Planned console has identity and icon metadata only. It must not have a route, `href`, `toolId`, document/schema field, storage key, draft key, or layout key. A Planned entry must never navigate, acquire `aria-current`, or display a draft indicator.

The AV Calculator distinction is intentional: `av-calculator` remains an existing Toolbox tool, but the unified AV Calculator console is not implemented. Typed namespaces prevent the Planned console identity from falling through to the existing tool route.

## 3. Rail defaults and typed identities

Fresh or reset preferences use this exact default:

```js
[
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
```

Entry resolution dispatches by namespace before ID lookup:

| Namespace | Meaning | Example |
| --- | --- | --- |
| `console:` | Available or Planned console identity | `console:av-video` |
| `family:` | Existing Toolbox family | `family:audio` |
| `tool:` | Exact canonical registry tool | `tool:throwline` |
| `external:` | Separate product or handoff | `external:cueforge` |

Never feed console or external IDs through `normalizeToolId()`. Preserve the existing tool aliases:

- saved tool ID `cueforge` continues to normalize to Cue Sheet;
- saved tool ID `plotforge` continues to normalize to StagePlotter;
- `external:cueforge` resolves to the CueForge handoff;
- `external:plotforge` resolves to the PlotForge handoff.

## 4. External-product records

External products remain outside `tools`, the normal tool count, tool-storage transfer, and generated tool caches.

| External ID | Label | Kind | Destination | Badge |
| --- | --- | --- | --- | --- |
| `cueforge` | CueForge | Handoff | `https://systembydave.com/cueforge.html` | Desktop app |
| `plotforge` | PlotForge | Handoff | `plotforge.html` | Own app |
| `housevideo` | House Video / FMP | Handoff | `https://housevideo.app/` | Link out |
| `arenaops` | Arena Ops | Status | None | API pending |
| `deckforge` | DeckForge + Stream Deck | Status | None | Control surface |

`externalById()` performs exact external-ID lookup only and returns `null` for unknown IDs. Handoffs have verified destinations. Status records have no destination and must not become clickable or pinnable. External navigation receives no source show context or source hash.

## 5. RAIL-2A responsive profile

The production profile is settled as follows:

| Viewport width | Rail presentation | Existing console presentation |
| --- | --- | --- |
| 1440px and above | Labeled left rail | Desktop full grid |
| 1100–1439px | Compact icon rail with accessible names | Desktop full grid in the remaining region |
| 720–1099px | Compact icon rail with accessible names | Tablet two-panel mode |
| Below 720px | No left rail; an Apps control opens the application dialog | Phone single-panel mode with the existing bottom panel switcher |

The rail uses viewport-width breakpoints. Do not silently change the shared console mode calculation to container width. At 1100px, desktop mode still applies and must remain usable inside the reduced region.

The 720px phone transition and 1440px labeled transition are accepted product adaptations. Literal v3's persistent 56px icon rail remains source evidence, not the selected phone behavior. Interactive controls retain at least a 44 by 44 CSS-pixel target at every size; short viewport height is handled with rail scrolling, not undersized targets.

The top Apps control changes applications. The existing bottom phone switcher changes panels inside the active console. Do not merge or duplicate those responsibilities.

Minimum responsive fixtures for the runtime slice are 375×667, 667×375, 680×700, 681×700, 719×700, 720×700, 1099×600, 1100×600, 1439×700, 1440×700, and 3440×1440.

## 6. RAIL-3A local customization

Rail preferences are device-local under `sbd.rail.v1`:

```json
{
  "version": 1,
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

The runtime slice must provide keyboard-operable pin, unpin, reorder, and reset actions. Existing valid preferences win over changed defaults. Reset explicitly restores the current nine-console RAIL-1B order.

Known Planned console IDs remain in their stored positions. Unknown IDs are suppressed from rendering but retained in relative order after visible entries when an explicit customization is saved. Deduplicate without alias coercion. An unreadable payload or unsupported version requires explicit reset; ordinary rendering must not overwrite it.

Only explicit customization writes `sbd.rail.v1`. Opening dialogs, reading rail state, rendering Planned entries, checking draft state, or navigating must not write preferences. Never migrate or synchronize Toolbox favorites from `av-suite-ui.v1`.

## 7. Runtime boundaries

- Keep rail code worker-safe where it touches the registry.
- Keep rail DOM outside the AV Video React root and preserve `min-width:0` and `min-height:0` for the remaining workspace.
- Preserve the 12-column by 8-row console model, layout lock, selected records, focused panel, modules, views, undo state, and live state while rail UI opens or reflows.
- Internal destinations may receive only recognized `sbdShow`, `sbdVenue`, `sbdDate`, `sbdOperator`, and `sbdPhase` parameters.
- Toolbox/family and external destinations receive no show context.
- Draft indicators read the console's declared direct draft key and never write or repair console data.
- A rail failure must not blank or block AV Video or its breadcrumb.

## 8. Verification contract

The registry slice must assert:

- nine unique console IDs and unique prototype IDs in exact source order;
- AV Video as the only Available console;
- no actionable metadata on the eight Planned consoles;
- exact RAIL-1B default pin order;
- AV Video draft/layout keys match its existing tool storage metadata;
- five exact external records and exact `externalById()` behavior;
- CueForge/Cue Sheet and PlotForge/StagePlotter legacy boundaries remain intact;
- existing tool, storage-key, base-asset, and offline-asset counts do not change;
- no sitemap or external-host precache expansion.

Later runtime verification must cover the responsive fixtures, keyboard order, visible focus, 44px targets, 200% zoom, reduced motion, preference reload/reset/failure behavior, Planned status semantics, route context isolation, and unchanged AV Video document state.

### Standalone runtime source boundary

Sequence step 2 is implemented as an unmounted source layer in `js/sbd-rail.js` and `css/sbd-rail.css`. The runtime exports exact typed-reference resolution, `sbd.rail.v1` reads, and explicit `pin`, `unpin`, `move`, and `reset` operations. It does not inspect storage or the DOM when loaded and does not mount itself.

The preference parser renders defaults without writing when the key is absent. It preserves known Planned entries in order, suppresses unresolved or non-pinnable entries, and retains only unresolved references after visible entries on the next explicit successful edit. Known non-pinnable records are dropped by that explicit edit. Duplicate references are removed by exact string identity without invoking tool aliases. Unreadable or unsupported payloads remain untouched until explicit reset.

The standalone renderer uses native links and buttons, a non-interactive Planned treatment, visible and screen-reader-readable status text, a focusable bounded scroll region, 44px targets, a phone Apps trigger below 720px, compact presentation from 720 through 1439px, and labeled presentation from 1440px upward. Production mounting, cache changes, and live acceptance remain later steps.

### Standalone dialogs, routing, and draft invalidation boundary

Sequence step 3 is implemented as an unmounted source layer in `js/sbd-rail-dialogs.js` and `css/sbd-rail-dialogs.css`. It provides bounded native dialogs for All apps and Customize, focus trapping and trigger-focus return, keyboard pin/unpin/reorder/reset controls, and explicit session-only failure feedback. Opening, closing, catalog rendering, route resolution, and draft reads do not write `sbd.rail.v1` or application storage.

The shared typed route builder resolves registry-relative paths against an explicit suite base. It forwards only `sbdShow`, `sbdVenue`, `sbdDate`, `sbdOperator`, and `sbdPhase` from the supplied source URL to eligible same-origin console/tool routes. Toolbox, family and external routes receive no source context or source hash; status-only and Planned entries remain non-navigable.

Draft indicators validate each console's declared direct key and supported envelope without reading the advisory index or parsing the application document. The observer re-reads on `sbd:console-draft-change`, native storage events, storage clear, and page restoration. AV Video's existing draft session emits the same-page invalidation after each attempted write or clear; the event never claims persistence success and does not change its locking, conflict, save, restore, discard, or failure behavior.

### Toolbox family and external command boundary

Sequence step 4 is implemented in the existing Toolbox application. A recognized `family=` value in resolved Toolbox mode creates an effective view with empty search and the All filter without writing either `av-suite-ui.v1` or the saved-show payload. Unknown families use the persisted Toolbox fallback; recognized show context and Front Office retain precedence. Popstate recomputes the effective family from the current URL, while an explicit Toolbox control action adopts the visible family and resumes the existing page-local persistence behavior.

The quick switcher now validates, renders, executes, and records exact `external:` command IDs for registry handoffs with safe HTTP(S) destinations. External routes are built without source show parameters or hashes. Status-only externals do not enter the command pool or valid recent-command state. Existing `tool:cueforge` and `tool:plotforge` compatibility remains unchanged and continues to resolve to Cue Sheet and StagePlotter.

## 9. Implementation sequence

1. **Complete in this source slice:** add identities, default pins, external records, exact lookup, and focused verifier coverage. Defer the cache-version bump until the rail runtime and offline assets are introduced together.
2. **Implemented in the stacked standalone-runtime review slice:** rail renderer and preference parser, without production mounting.
3. **Implemented in the stacked standalone-dialog review slice:** All apps and Customize dialogs, typed route resolution, and AV Video draft invalidation, without production mounting.
4. **Implemented in the stacked Toolbox integration review slice:** non-mutating `family=` effective state and exact external quick-switcher commands.
5. Mount the selected RAIL-2A profile around AV Video and rebuild production assets.
6. Add rail assets to the offline set, add browser probes, and run the full AV verification matrix.
7. Merge, deploy, verify the live revision, and obtain rendered and operator acceptance.

No step creates an unbuilt console. Planned entries remain status-only until a separate console implementation brief, source, route, persistence contract, and verification exist.

## 10. Source basis

- `docs/2026-10-05_Rail-Implementation-Spec-v2.2-v3-Source-Alignment.md` — reviewed source analysis and compatibility contract.
- `AV-Suite-v3.zip` — supplied v3 source archive, SHA-256 `71b72c70ab3e004fd324f98cec7ed05a2cf16d054a4c05fce74fe298c5dd5e02`.
- `proto-data-v3.js` from that archive — SHA-256 `a4c93ec4b13fdb6091a757c5d02753d9ef032b0392de8e80f8159d3839f60449`.
- `AV Suite Prototype v3.dc.html` from that archive — SHA-256 `9a8251c4c0ac382bedec5af9e374c0fd18bf9183412f07fc6334999d384e01ab`.
- `js/sbd-registry.js` — current production inventory and compatibility authority.

This specification resolves RAIL-1, RAIL-2, and RAIL-3. Remaining work is implementation and evidence, not an open product choice.
