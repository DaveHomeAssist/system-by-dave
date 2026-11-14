# Measured stage reference

Problem: the drawing adapter places oversized generic projectors at one inferred
height, so adjacent bodies appear to intersect. Its diagram units cannot support
physical clearance claims.

The correction adds optional metric calibration to the private version 1 plot.
Existing drawing-only imports remain supported. The owner is Projctl; the
consumer is its Throwline inspection adapter. ECP-1.0 revision 1.0 applies.
Model selection remains inert and lane IDs remain separate from command slots.
Private plot dimensions and venue files stay outside the public repository.

Acceptance:

- Use metres consistently for calibrated coverage, drawing references, projector
  positions and manufacturer enclosure dimensions.
- Preserve declared lens-center offsets instead of estimating them from icons.
- Preserve unknown heights as unknown. A plan presentation may use a clearly
  labeled layout plane; it must not imply a surveyed elevation or clearance.
- Use an independent manufacturer enclosure envelope for each projector, with
  portrait rotation and an explicit position datum. Do not scale bodies for
  clickability. Letter markers and adjacent buttons provide usable targets.
- Remove invented mounting rails and avoid coincident duplicate scenic planes.
- Keep enclosure footprints separate from intentionally overlapping coverage.
  Missing lens datums or heights prevent physical clearance certification.
- Validate finite units, dimensions, scale and per-lane metadata. Keep uncalibrated
  legacy diagrams functional. Verify metric distances, body bounds, selection,
  responsive layout, render lifecycle and the private installed view.

This reference does not model optical lens shift, lens internals, rigging,
structural loading or surveyed lens-to-enclosure offsets unless supplied.
Manufacturer dimensions describe the enclosure envelope, not a detailed CAD
asset. Mount heights, exact lens datum and local physical acceptance may remain
open even when the drawing implementation passes its checks.

## Optional private plot metadata

`measurements` has `version: 1`, `units: "metres"`, a source description,
`referenceWidth` and `referenceHeight` for lane C, and one `projectors` entry
per A/B/C/D. Each entry has `model`, exact supplied horizontal lens offset `x`,
`y` (height above stage floor) and `z` (depth from C target plane), each with
explicit null for an unknown height or drawing-derived depth. `body` contains
manufacturer width, height and depth in metres before portrait rotation.
`portrait` is Boolean; `yaw` is degrees about Y, or null to aim in plan.
`dimensionsSource` and `positionSource` retain provenance.

A null z uses plan geometry calibrated to C width; it remains drawing-derived.
A null y opens Top view and positions the marker on the labeled plan plane,
with no volumetric throw. The enclosure's front-center datum is schematic.
Lens assemblies and their offsets require separate measured geometry.
The adapter reports source dimensions in the lane cards and never claims
that a dimensioned drawing is a survey or a collision-free installation.
