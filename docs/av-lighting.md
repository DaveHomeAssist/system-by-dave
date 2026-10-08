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
