# AV Suite console snapshot Rail

**Date:** October 9, 2026
**Status:** Implementation contract

## Definition of done

The nine primary Rail items live inside one console with AV Video. Selecting a Rail item recalls its console snapshot without leaving the shell. Snapshot panels are selectable, movable, resizable, replaceable, splittable, maximizable and storable through the existing console controls.

The required Rail order is:

1. AV Video
2. Audio
3. Show Control
4. Show Ops
5. Front Office
6. The Shop
7. Infrastructure
8. Lighting
9. AV Calculator

The October 9 application launcher release remains valid route and fallback delivery. It is an interim milestone rather than the final Rail experience because it navigates away from the console.

## Runtime contract

- AV Video stays native to the shared console workspace and retains its existing Video views and panels.
- Each other primary application is available as a real panel type. Its default snapshot contains one full-size application panel on the 12×8 grid.
- A Rail click dispatches a cancelable console-selection event. AV Video handles the event when its suite shell is active, recalls the matching snapshot and cancels navigation. Without a handler, the existing standalone link continues to work.
- The phone Apps dialog uses the same selection path as the desktop and tablet Rail.
- The active Rail item follows the recalled snapshot. Returning to AV Video restores the last native Video view when possible.
- Operators can add more application panels from the normal panel chooser, so a stored snapshot may combine applications for a particular workflow.
- Every hosted application keeps its existing route, schema, storage keys, Save/Export behavior and recovery rules. The outer snapshot stores panel type and geometry only; it never copies or merges application records.
- Recognized `sbdShow`, `sbdVenue`, `sbdDate`, `sbdOperator` and `sbdPhase` context is passed into hosted applications. Other query data is not forwarded.
- Every application panel provides an explicit **Open standalone** escape hatch.

## Persistence and compatibility

The optional AV Video `workspace` remains the arrangement owner for this first suite shell. The new default snapshots are added in memory for older documents and are written only after an operator stores or updates a view and explicitly saves the AV Video plan. Device-local unstored arrangements continue to use `sbd.avVideo.layout.v1`.

Application data remains independent. This slice does not alter any application document, legacy import, original-source copy, draft key, local storage key, schema or export. Existing AV Video workspaces gain any missing primary application snapshot in memory without an automatic write.

Standalone URLs remain published and directly usable. Modifier-clicking a Rail link can still open the standalone application, and pages without the suite handler retain ordinary navigation.

## Acceptance

1. Clicking each of the eight non Video Rail entries on `/av-video/` keeps the browser on `/av-video/` and renders the matching application in a console panel.
2. The selected Rail entry alone carries `aria-current="page"`; AV Video recalls a native Video view.
3. The phone Apps dialog follows the same in-console selection path.
4. An application panel can be focused, resized, moved, split, replaced, maximized and closed through the shared console controls.
5. Updating a primary snapshot, saving, and reloading restores its geometry and active Rail state.
6. Existing Video panels, layouts, recovery, documents, routes and browser probes remain compatible.
7. Rail customization, standalone navigation, show-context allowlisting, offline update behavior and all application storage remain compatible.
8. Exact-head source checks, source publication, AV destination publication, production provenance and affected asset parity pass independently. Physical touch and operator acceptance remain separate.

## Follow-on refinement

Embedding the complete applications delivers the accepted console behavior while preserving their mature data boundaries. Later, a separately scoped application may expose smaller native panel modules for mixed-console workflows. That refinement must preserve the full application panel and standalone route until its own parity and operator gates pass.
