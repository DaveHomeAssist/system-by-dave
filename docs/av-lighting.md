# AV Lighting application

## Brief

Operators need one focused place to prepare a fixture patch, find address conflicts, track focus and hand off the current plan. The smallest useful slice is a local Lighting document with fixture records, status and focus editing, address checks, explicit save, JSON export, and previewed import from the saved Lighting Patch key or its JSON export. It stays independent of the existing `lighting-patch.v1` document, which is read only. No hardware control, fixture library, cue programming, or inferred channel footprint is included.

The new document key is `sbd.avLighting.v1`, schema `system-by-dave.av-lighting.v1`. Legacy imports accept the `lighting-patch.v1` shape and keep every recognized fixture field. Invalid JSON or unsupported shapes leave the document unchanged. An unreadable saved plan blocks Save until its exact bytes are copied and verified under a timestamped recovery key. Unsaved edits trigger a browser leave warning. Operators can export before replacement. Address checking flags repeated starting addresses within a universe; it does not claim footprint overlap detection.

The workspace consumes the maintained Warm Paper and Stage Slate AV palettes and the shared `av-theme-mode.v1` choice.

Acceptance: add and edit a fixture, save and reload, import a legacy fixture only after preview and confirmation, reject an invalid import without mutation, view warning counts, and use the interface by keyboard at phone and desktop sizes. Rail registration, offline caching, sitemap and domain publication are owned by the integration lane.

## PlotForge interop manifest handoff

PlotForge remains the full lighting-plot product. A Lighting operator can open it separately, export its `plotforge-interop-manifest` JSON (schemaVersion 1), then review that file in this smaller patch/focus workspace. The import is a deliberate, one-way copy, not live synchronization or a replacement for PlotForge's `.plot` document. No PlotForge storage, file, hardware output, or other-origin data is written.

The smallest useful handoff maps only fixture identity, position, profile/mode, channel, partial DMX assignment, color, dimmer, focus coordinates, and clearly equivalent statuses. PlotForge `needs_work` is shown as a mapped Lighting issue; any unknown future status is visibly downgraded to planned. The preview names mapping limits: Lighting checks duplicate starting addresses only, not PlotForge's footprint-aware ranges, and does not operate geometry, GDTF profiles, circuiting, gobo, layered notes, comment pins, or DMX output. The entire source manifest travels in the Lighting backup as provenance; Lighting edits do not synchronize back to it.

Before replacement, validate the manifest marker/version, fixture count, unique IDs and source size; report malformed, unsupported and oversized files without changing the working or saved plan. Preview the candidate count, original source and status mapping, require explicit confirmation, and retain the prior plan until the operator saves. Export remains available if local storage cannot save. An AV Lighting backup containing the source snapshot must survive reload and export/import unchanged. Legacy Lighting Patch import remains supported and its original key stays untouched. Browser acceptance covers these cases at desktop and phone widths with keyboard and page-containment checks. Physical and operator acceptance remains open.

## Native working panels

**Operator outcome:** Use the same configurable workspace as AV Video to keep a
fixture list and its full inspector visible together, bring up focus work or plan
transfer, and retain useful arrangements. This is functional panel adoption, not
a launcher or a claim of PlotForge parity.

**Smallest slice and flow:** Five working panels: Fixtures, Fixture details,
Focus, Plan/Import and Backup. Select or add a fixture, edit all twelve existing
fields, review duplicate starting-address warnings, change focus/status, then
explicitly Save. Search, count summaries, confirmed removal, show metadata,
legacy/PlotForge preview and JSON backup remain available. Move, size, maximize,
lock and store named views through the existing shared console engine. The
standalone route and AV Video embedded mode operate on the same independent
Lighting document; embedded mode omits duplicate navigation.

**Data contract:** Keep `sbd.avLighting.v1`, its existing schema, fixture IDs,
recognized fields, status normalization and legacy duplicate-ID handling.
Extract the current pure normalization, PlotForge mapping and duplicate-start
logic from `av-lighting/lighting.js` into a testable model rather than inventing
new semantics. Preserve the complete parsed PlotForge source, including unmapped
fields, through edits and backups. Retain the 12 MB file and 1.5-million-character
manifest limits. Optional version-1 workspace data adds presentation without
requiring an old-backup migration; unsupported workspace versions fail closed.

**Save and recovery:** Add console-local draft/layout keys using the existing
shared recovery protocol. Edits update working records, not the saved document.
Explicit Save checks and verifies the saved-byte baseline under Web Locks;
export remains available on failure. Preserve and verify unreadable original
bytes before replacement. Imports review a candidate, require confirmation, and
reject stale source, working-document or saved-baseline changes; canceled and
rejected imports preserve both plans. Read-only host context does not populate
or replace show identity. Closing a panel does not delete fixture records.

**Dependencies and risks:** Reuse shared workspace/recovery and existing build
dependencies; no new engine or service. Key risks are changed normalization,
selection drift during edits, loss of source-only PlotForge data, stale imports,
short-height hidden controls and accidental saves during layout changes.

**Exclusions:** No fixture footprint inference, DMX/hardware output, geometry,
GDTF engine, cue programming, synchronization, automatic identity binding,
specialist route retirement or safety/operator approval. Duplicate starting
addresses are not full footprint overlap detection.

**Acceptance:** Model tests compare old/new document fixtures and all mapping
boundaries. Isolated browser checks cover every field, status/focus/search,
confirmed removal, normalized duplicate starts/spares, both import families,
malformed/oversized/stale/canceled inputs, exact retained source-object content,
old backups, explicit Save/reload/export, draft/original recovery and tab/storage
failures. Verify named views, keyboard focus, 44px controls, both themes at the
established nine sizes, offline reopening and actual AV Video embedding. Require
generated-output parity, exact-head CI, both publications and isolated live
acceptance. Physical devices, virtual keyboards, power loss and operator
acceptance remain separate.

### Implementation and verification

`apps/av-lighting/` now owns the React application and builds the existing
`av-lighting/` route. The extracted `av-lighting/model.mjs` keeps the prior
normalization, ID repair, PlotForge mapping and duplicate-start semantics;
two Node tests compare it directly with the retained original editor functions.
Ten native model tests cover optional views, limits, source retention and guarded
save/recovery. No new dependency or shared workspace engine change is required.

Run `npm run typecheck:av-lighting`, `npm run test:av-lighting`,
`npm run build:av-lighting` and `npm run test:av-lighting-browser`.
The historical `node av-lighting/probe.cjs` entry forwards to the native HTTP
probe. Synthetic isolated contexts are used locally and against an explicit
`LIGHTING_BASE`; `LIGHTING_OUTPUT` selects the evidence directory and
`LIGHTING_CHROME` selects an installed browser. Existing `CHROME_CHANNEL` is
also supported. Both PR and publication workflows rebuild, exercise the panels
and verify the committed generated output.

The document key/schema and legacy key stay unchanged. New device-local keys
are `sbd.avLighting.draft.v1` and `sbd.avLighting.layout.v1`. The legacy key is
read only. Save preserves verified original bytes before replacing an unreadable
document; when startup reads return no bytes, the app refuses an original-backup
download rather than claiming an empty file is the original. Imported source
objects may contain private notes, so exported backups should be handled safely.

Source/model/build checks are candidate evidence, not publication or operator
acceptance. Follow the existing AV consolidation projection for exact revision,
browser, CI, publication and live proof; the entire specialist toolset is not
declared complete by this five-panel conversion.
