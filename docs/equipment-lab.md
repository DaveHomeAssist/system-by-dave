# Equipment Lab module brief

Decision: Option A approved by Dave on 26 October 2026.
Contract: ECP-1.0 revision 1.0.

## Problem and outcome

The confirmed 43 equipment and accessory entries are spread between Ion,
FMP and NNC. Operators need one searchable library and reusable model packages.
Equipment Lab becomes the model catalog owner and the home for adopted packages.
A standalone route at https://avbydave.com/equipment-lab/ and individual native
AV workspace panels use the same application implementation and release.

## Delivery phases

1. Establish the private shared repository, register all 43 entries, preserve
   source provenance and explicit native IDs, and record per-entry migration state.
2. Publish Library, Model Inspector, Practice and Reference as native panels.
   Load the Cartoni Maxima 30 GLB package through the AV consumer. Keep existing
   viewers reachable for entries whose native adapters have not migrated.
3. Extract the remaining procedural factories in family-sized increments,
   reconcile the unpublished NNC branch, adapt renderer differences and replace
   legacy publishers with deterministic shared-package exports. Preserve old routes.
4. Qualify each representation separately against the accepted reference checklist.

The first release completes phases 1 and 2. Phases 3 and 4 remain explicit work.

## Flow

Find equipment by name or family, select a model, inspect its controls and sources,
open the existing practice where supported, and download a qualified package.
Selection is inert. Changing equipment does not operate hardware or change a show.
The Cartoni inspector works without embedding an entire external application.
The reference and component list remain available when WebGL is unavailable.

## Boundaries

Preserve all existing semantic control IDs, routes, stored state and unknown fields.
The Panasonic body stays generic. The exact photographed Fujinon suffix stays unknown.
Do not turn 43 logical entries into 43 standalone GLBs or imply all are qualified.
NNC material on its unmerged working branch is a preserved migration input, not
an approved replacement for a released consumer. Original source history remains.
No operational records, hardware APIs, accounts, billing or new backend are added.

## Data and release

The shared catalog wraps native identity with the confirmed inventory row ID,
source revision, geometry/catalog paths, legacy viewer and migration status.
The Cartoni package preserves its original GLB, semantic JSON and ten head IDs.
The host imports only allowlisted public files from a clean committed source and
records hashes plus the exact shared-repository revision. It serves those files
on its own origin, without runtime access to the private source repository.
Application selection is transient URL state. Existing save keys remain untouched.

## Risks and acceptance

Reconcile Ion r180 and AV/FMP r184 at the actual GLB consumer; importing must
preserve materials, labels, scale, orientation and all ten control identities.
Verify exactly 43 unique inventory entries, provenance hashes, valid package
references, no private paths in the public release and unchanged GLB bytes.
Verify native AV chooser availability, standalone deep links, keyboard selection,
light/dark, phone/desktop/ultrawide containment, WebGL fallback, disposal and errors.
Check source, CI, merge, deployment and live behavior separately. Physical accuracy
and real-device acceptance remain separate evidence.

## Rollback

Revert the host integration commit to restore the prior AV build. The new module
is additive; existing URLs and source repositories remain available. Pin the last
valid shared release rather than replacing an invalid package or remapping IDs.

## Design coordination

Dave reported concurrent Claude work on a splash page and model menu prototype
on 26 October 2026. That scratchpad design remains owned by Claude. This slice
owns the shared catalog, model packages, native panel interfaces and delivery.
The functional library is an integration surface for the approved design; no
claim of splash-design acceptance is made.

## Splash and menu integration contract

The catalog is served at `/equipment-lab/data/catalog.json` and uses
`inventoryId` for stable selection. The native panel uses `choose(entry)` to
show the inspector and preserves `equipment` and `component` in the URL.
The source interface is `apps/equipment-lab/src/pack.tsx`; the standalone shell
is `apps/equipment-lab/src/App.tsx`. Model loading and control picking remain
in `Viewer.tsx`. Keep the ten head control IDs unchanged.

Cards may add genuine model renders when available. A catalog row is not proof
of a rendered preview or known part count. Preserve explicit pending states.
Claude's prototype can replace the functional Library presentation without
changing the shared model package, native panel IDs or saved AV arrangements.

## Verification record

The candidate was built and checked on Dominic with Node 24 and Chromium.
The native viewer preserves ten controls and loads all 22 label textures. The
Equipment Lab probe checks 43 entries, model picking, 61 layout cases, WebGL
fallback and three invalid-package cases. The AV shell probe checks all 66
menu choices and existing mixed-panel saves and reloads. Source package hashes
remain unchanged. Publication and live acceptance are separate release gates.
