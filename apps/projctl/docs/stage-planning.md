# Frozen Stage what-if planning

The Stage tab has a local **What-if planning** mode. It addresses a gap in the
recorded plot: operators could inspect coverage but could not compare another
lens, distance, raster size, orientation or optical position.

Planning edits live only in this browser tab. They do not write rig configuration,
change the saved plot, issue projector commands or change connected equipment.
**Live controls** remains a separate, explicitly labelled entry. Reloading or
**Reset recorded plan** discards proposed values. The loaded drawing is retained
as reference coverage behind a coloured proposal and white mapped-content outline.

The adapter uses the canonical `ProjectorThrow/throwline-scene-state.js`
`calculateProjectorGeometry` contract, including the ratio-limited actual image
size. Its existing `three-d-stage` renderer displays the proposal; it is not a
second optical calculator. Both canonical files are shipped by the relay's
explicit Throwline asset allowlist. Fields are in feet; renderer coordinates
remain metres. The selected target edge establishes the sideways axis and
perpendicular throw plane. Height is above the stage floor.

A metric plot is required. Unknown recorded lens heights remain empty until the
operator enters a proposed height. A drawing-matched initial ratio is an estimate,
not an identified installed lens. No geometry is promoted to a surveyed value.

For portrait, native raster width becomes physical height. The optical adapter
rotates the coordinate inputs before invoking Throwline, then rotates the output
footprint back into the stage frame. A displayed upward-shift percentage is in
world coordinates; it is not necessarily the projector's native vertical axis.
The model flags documented individual-axis limits for the A/D Panasonic lens candidates; it does not certify combined shift limits or remaining motor travel.

## D lens study

The D shortcuts compare user-reported 20 ft portrait height at an estimated
38.5 ft throw (within the stated 38–39 ft range), using the ET-DLE170 named in the recorded A/D plot
(official WXGA range 1.80–2.54:1; physical barrel not inspected), against proposed 26 or 28 ft rasters with 20 ft mapped content.
The recorded lens identity is documented rather than read from the physical barrel. ET-DLE150 is a candidate only; its
Panasonic-published DW830/WXGA 16:10 range is 1.36–1.98:1:
https://eu.connect.panasonic.com/sites/default/files/media/document/2024-04/et-dle150_spec_en_2.pdf

The shortcuts preserve the entered centre. A larger raster therefore raises its
top by half the height increase. To study another optical shift, edit the centre
or upward-shift percentage explicitly. No shortcut assumes additional lens travel.
Out-of-range requested sizes show the actual achievable footprint and a ratio
warning, rather than drawing a physically impossible requested size.

Mapped content is a framing aid, not a simulated media server. Unused raster can
spill light; resolution and black level need venue acceptance. Cove clearance,
rigging, tilt limits and enclosure-to-lens offsets are not certified.

## Building model boundary

The private venue model opens as an interior reference with recognised roof and
ceiling meshes hidden; the Roof toggle restores them. **Plan with this room**
explicitly adds that model to the optical planner as an **Approximate venue
alignment**, even when the source's calibrated-overlay flag remains false.
The initial room transform is translation X=0, Y=0, Z=+0.2 metres with no scale
change: the already-normalized floor is matched to stage Y0 and the model's
proscenium is used as a tentative target-plane anchor. X/Y/Z and yaw are local,
editable assumptions. No surveyed C-plane registration or clearance is implied.
A/B/C projector coordinates remain drawing-derived; D's 38–39 ft estimate is
used only by the D study shortcuts. No original model or plot is changed.

**Projectors** focuses the true-size enclosures and their 44-pixel A–D markers,
from the stage side toward the balcony. Orbit/Audience/Top remain whole-scene
views. Labels are screen-size aids and bright enclosure outlines remain visible through room geometry; physical projector and beam dimensions are not enlarged. The active scenario replaces its recorded body and moves its letter/leader to the proposed lens position; returning to Rig reference restores the recorded body and marker. Roof detection recognizes supplied cutaway names and semantic
roof/ceiling names, leaving other room meshes intact.

## Focused verification

- `node --test test/stage-scenario.test.js` checks units, portrait rotation,
  exact D ratios, mapped-content framing, impossible size handling, unknown
  heights and unchanged input objects.
- `node test/stage-planner-browser.cjs` uses only simulator fixtures, checks
  actual WebGL proposal updates, reset and lane switching, and asserts no POST/PUT/PATCH/DELETE requests from planning.
- Desktop/mobile screenshots must show the same actual renderer and bounded
  controls, with no document overflow. Tests use synthetic dimensioned geometry;
  no private venue assets are release fixtures.

The optional venue descriptor exposes only registration status and the planning-overlay flag. Other private registration metadata is stripped. The calibrated-overlay flag stays false for unregistered models. Approximate planning is a separately labelled, operator-enabled preview.

The attached front and top-down drawings label A and D raster coverage at 19 ft 11 in, C at 20 ft 3 in, and B at 18 ft 4 in. These are plotted raster-coverage dimensions, not measurements of every scenic target. Each lane has an independent scenario. The D 20 ft shortcut remains a rounded operator estimate for comparison; no revised A height is inferred.

ET-DLE170 manufacturer reference: https://eu.connect.panasonic.com/gb/en/projectors/et-dle170 (WXGA 1.80–2.54:1).

Upward-shift percentages are calculated from the achievable physical raster after the lens range constrains the requested size. The requested raster remains independently editable; a 26 ft request with a 21.39 ft achievable image uses 21.39 ft as its shift-percentage basis.
