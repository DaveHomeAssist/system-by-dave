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

## Splash library

The standalone route without an `equipment` parameter opens a splash library:
a discipline rail, collection filters, search and a card grid of every catalog
entry, with a sheet for the selected entry. Every link that names `equipment`
opens the existing workspace unchanged, so deep links, native AV panels, saved
arrangements and the ten head control IDs are untouched. The title links back
to the library from the workspace.

The sheet opens the Equipment Lab 3D inspector for entries whose representation
is a GLB, and the existing viewer for everything else, with the workspace
reference as a secondary link. Disciplines, previews and the reference flag are
host presentation data in `apps/equipment-lab/src/splash.ts` because the shared
catalog does not carry them. Practice and generic flags and assembly grouping
derive from catalog role, geometry confidence and viewer link.

Previews in `/equipment-lab/previews/` are renders of approximate models, listed
with source revision and hash in its `manifest.json`. Ion and the fader wing
have no render and show a pending state. The sixteen NNC renders were regenerated from approved No Nonsense source
`3cfdc6e1c76872336cc217237e29834af834e342` on 6 November 2026, on the
light Equipment Lab stage. The manifest records each source file hash. The camera bench captures are
cropped from viewer screenshots and still show a viewer label.

Not yet built: the in-workspace Library presentation, a jump palette and
recently opened entries. Dave reviewed the preview and approved its release on
2 November 2026.

## Release 1.1.0 and the projector package

Dave asked on 9 November 2026 for a Barco 4K22 in the library and on 12 November
to show it on avbydave.com. The shared repository registered it as P01 Barco
UDM-4K22 in release 1.1.0. [Its brief](https://github.com/DaveHomeAssist/equipment-lab/blob/main/docs/BARCO_UDM_4K22.md)
owns the model's scope, sources and open decisions. This section covers the host.

The inspector had been written for one package: its path, asset ID, ten head
IDs, view presets, orbit limits and copy were fixed to C02, and the import
accepted exactly 43 entries. Any catalog entry whose representation is a GLB now
opens in the same inspector.

- **Import.** `scripts/equipment_lab_release.mjs` accepts release 1.1.0: the
  43-entry family plus the additions that release names, here P01. It also
  checks that every native package in the catalog is allowlisted and agrees with
  its own manifest. A release the script does not name is still refused.
- **Package registry.** `apps/equipment-lab/src/model.ts` holds, per package,
  the item list, the default item, the view presets and the orbit limits. The
  item list is bundled so it survives a missing WebGL context or package. The
  path and manifest name come from the catalog row.
- **Viewer.** One mount serves one package. Each package gets the same manifest,
  hash, frame, ID and label checks. P01 has six views, including the connector
  side and a top view.
- **Panels.** The inspector lists P01's 26 parts by assembly and says what
  supports where each is drawn. Practice states that P01 has no practice mode
  and shows the operating note for the selected part. Reference shows scope,
  downloads, Barco's documents and what is not established.
- **Splash.** P01 sits under Video and projection with the preview from its
  package. That tab was Video & PTZ until 12 November 2026, when Dave asked for
  the rename. Counts derive from the catalog.
- **Offline.** P01's manifest, definition and GLB join the offline set under
  cache generation `v20261112-equipment-lab-projector`.

Unchanged: C02's ten IDs, deep links, copy and behavior, the other 42 entries,
routes and saved arrangements. The discipline label is unchanged; that choice
is open as P01-D4 in the shared brief.

P01 is approximate and not qualified. Barco publishes the body size, the mass
and the face that carries each part; the rest is approximate or assumed, and
the package lists each open question. The page says so on the card, in the
inspector and in Reference.

Rollback: revert the host commit. That restores the 1.0.0 copy, which the
import still recognizes as a previous release.

## Small screens

Recorded on 13 November 2026. Two layout defects predated release 1.1.0 and
affected C02 and P01 alike. The page itself did not scroll, so every viewport
check passed.

- **Phone held sideways (844 x 390).** The page chooses the console's phone
  presentation under 500 px tall. At 720 px and wider the shared console
  stylesheet still applied its rule for a switcher inside the view strip
  (`flex-basis:100%`), which in the shell's column claimed the full height. The
  switcher was 272 px tall and the panel body had no height. The shared sheet
  now keeps the phone switcher a bar at any width
  ([console workspace](av-console.md)).
- **320 px wide.** The page's one grid column grew to the width of the four
  switcher labels, 53 px past the screen. It now stays the width of the screen,
  and the header, view strip and switcher fit inside it.

The model inspector lays out by the size of its own panel, through a container
query on the panel. The same inspector is a phone screen on the page, half a
tablet inside the AV console and any cell on a desktop, so the size of the
screen says little about the room it has.

| Panel | Layout |
| --- | --- |
| 420 px tall or more | Heading, picture, view buttons, hint, item list, as before. |
| Under 420 px tall | The hint and the collection line go. The picture keeps a floor of 96 to 120 px. |
| Under 340 px tall and 360 px wide or more | The picture sits beside the item list at the full height of the panel. |
| Under 480 px wide, and the side column above | The view buttons stay on one scrolling row. |

Whatever still cannot fit scrolls inside the inspector. In the side-by-side
layout the picture stays in place while the list scrolls. The row of view
buttons fades at its trailing edge while more buttons follow, and a focused
button scrolls fully into view. View buttons keep 44 px targets on short
screens, where they were 32 px. Entries without a native model keep their copy
panel.

Measured in emulated Chromium, the same in light and dark and for C02 and P01
unless a row names one:

| Screen | Where | Picture before | Picture now |
| --- | --- | --- | --- |
| 844 x 390 | Page | 760 x 20 | 448 x 194 |
| 844 x 390 | AV console | 385 x 93 | 195 x 212 |
| 320 x 568 | Page | 313 x 45, clipped at the right edge | 260 x 120 |
| 320 x 568 | AV console | 308 x 45, hint over the item list | 308 x 98 |
| 390 x 844 | Page, P01 | 330 x 187 | 330 x 236 |
| 390 x 844 | Page, C02 | 330 x 307 | 330 x 307 |

Unchanged: IDs, deep links, copy, the catalog, the release import and saved
arrangements. Desktop and tablet renderings match the previous build, apart
from P01's view buttons on panels narrower than 480 px. Cache generation is
`v20261113-console-phone-panels`.

Limits: these are emulated sizes, not devices. A phone's own toolbars leave less
height than 390 px; at 844 x 340 the picture is 448 x 144. At 320 x 256 the
header, view strip and switcher leave the panel no room, as before. No physical
phone or WebKit browser was checked.

Rollback: revert the host commit. No data, package or storage changes with it.

## Verification record

The candidate was built and checked on Dominic with Node 24 and Chromium.
The native viewer preserves ten controls and loads all 22 label textures. The
Equipment Lab probe checks 43 entries, model picking, 61 layout cases, WebGL
fallback and three invalid-package cases. The AV shell probe checks all 66
menu choices and existing mixed-panel saves and reloads. Source package hashes
remain unchanged. Publication and live acceptance are separate release gates.

The supplemental consumer check confirms no idle drawing, cleanup and reload
under synthetic page lifecycle events, real WebGL context-loss fallback with
ten retained controls, and a prepared offline reload with all 22 textures.
This does not qualify physical devices or an unprepared first offline visit.
[Pull request 369](https://github.com/DaveHomeAssist/system-by-dave/pull/369)
records host delivery; the shared repository migration record owns subsequent
release evidence and the remaining family work.

Release 1.1.0 was built and checked on 12 November 2026 in a cloud session with
Node 22 and Chromium on SwiftShader, pinned to shared revision
`27561a2bb5a27be756df38315a6389aa2235aa17`. Rebuilding untouched `main` there
reproduced the committed Equipment Lab and suite bundles byte for byte. The
probe checks 44 entries and, for C02 and P01 alike, the deep link, every listed
item, each view, model picking, an unknown-item link, the native AV route, the
splash handoff, the WebGL fallback, a deliberate context loss and four
invalid-package cases. It covers 135 layout cases and logs no error or `THREE.*`
message other than the one line three.js writes for each deliberate loss. C02
keeps ten controls and 22 textures; P01 loads 26 parts and 14 textures. The
suite shell, canvas menu, audio flow, bounded workspace, Throwline and offline
transition probes pass.

A supplemental check of P01 confirms keyboard selection in the part list, a
visible focus ring and 44 px targets on the view buttons, a tap selection under
touch emulation, no idle drawing, and a prepared offline reload inside the suite
with all 26 parts and 14 textures. It also measured two limits that `main`
already has for C02 and that this release leaves alone: in phone landscape
(844 x 390) the console's panel area collapses to about 20 px, and at 320 px
wide the inspector is clipped at the right edge. On a phone held upright P01's
six view buttons take two rows, which leaves its picture 187 px tall at
390 x 844 where C02 has 307. All three were addressed on 13 November 2026;
see Small screens.

P01 opens on the local keypad rather than the body. Selecting the body
highlights the whole projector, which would show a black unit in the highlight
colour on first sight.

[Pull request 456](https://github.com/DaveHomeAssist/system-by-dave/pull/456)
records host delivery. Publication and live acceptance are separate release
gates, and the shared repository's record owns that evidence. No GPU, physical
phone, WebKit browser or physical projector was checked.

The small-screen change was built and checked on 13 November 2026 in a cloud
session with Node 22 and Chromium on SwiftShader, on host base
`90444e26ad28a2752c1191bd43650b43580a6fd2`. Rebuilding untouched `main` there
again reproduced the committed bundles byte for byte. The measurements of the
previous build and the screenshot comparisons used
`efb7883f75d2216ce8cce5ab66bcd332b17c9909`; the base differs from it only in
the splash tab label of pull request 464. The probe adds 320 x 568
to its sizes and the AV console route at 844 x 390 and 320 x 568. At every size
except 320 x 256 it asserts that the page frame and its controls are on screen,
the switcher is a bar, each open panel has a body, the picture is at least
120 px tall on a sideways phone, no part of the inspector covers another, and
every control can be brought into the panel and is the thing under its own
centre. It covers 163 layout cases and 104 panel checks and logs no error. Run
unchanged against the previous build it fails in 40 of those 104 states, all at
the two phone sizes, and passes the other 64. It also passes when the system
font is DejaVu Sans, FreeSans or Carlito instead of Inter, which stands in for
the fonts other machines and phones use; with the widest of them the page title
shortens at 320 px.

Every gate in `.github/workflows/av-video.yml` passes there, with the workspace
probe in Chromium, the theme and viewport contracts, the LED wall probes, the
public contracts and the domain cutover checks. Screenshots of the other nine
packs inside the console, the eight retained family builds and the standalone
Calculator match the previous build at five sizes, apart from Show Control's
clock. A supplemental check covers keyboard travel through the scrolling view
buttons, the picture staying in place while the list scrolls, a tap selection
under touch emulation in landscape, the unknown-item notice, entries without a
native model and print layout. No physical phone, WebKit browser or GPU was
checked; the WebKit run of the workspace probe is left to CI.
