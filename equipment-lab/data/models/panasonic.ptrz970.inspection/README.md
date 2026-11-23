# Panasonic PT-RZ970 inspection package

P03 inspection representation 1.0.0. Not qualified: no reference checklist, consumer acceptance or physical comparison has been done.

## Included

- panasonic.ptrz970.inspection.glb — 277 rigid meshes, 16,256 triangles, 38 embedded PNG labels.
- panasonic.ptrz970.definition.json — 45 stable component IDs with purpose, action and what supports each placement; frame, dimensions, views, surfaces, materials and open questions.
- panasonic.ptrz970.manifest.json — file integrity, generator and runtime hashes, export settings.
- preview.jpg — library still, 720 by 411, on the light Equipment Lab stage.
- evidence/ — glTF validation, geometry counts, the reload comparison and nine stills rendered from the reloaded GLB: seven views, and two on the dark stage.

## Coordinate contract

Metres, +Y up, +Z front (lens side). Origin: foot contact plane under the centre of the cabinet; root identity. The model was authored in this frame, so no conversion applies.
Left and right follow Panasonic: stand behind the projector and face the screen. The terminal side is the right side, at -X. The cabinet is 538 mm deep, so its front face is at Z 0.269.

## What is supported and what is not

Panasonic prints 498 x 200 x 538 mm for the cabinet with the feet at their shortest, 43 mm more for the supplied standard zoom lens, 23.2 kg with that lens, feet 442 mm apart across and 457 mm front to back, and the lens centre on the centreline, 115.5 mm above the floor. The drawn cabinet measures 498 x 200 x 538 mm.

Its operating instructions name every part drawn here and the face it sits on, the 14 controls, the terminals and five M6 ceiling mount holes.

The position of each part within its face is measured from Panasonic's CAD outline for the PT-RZ970 series, six views with dimensions, at about one millimetre per reading. Each part gives its position in the definition. The outline prints the five mount hole positions, and those are used as printed.

Two things in the outline are followed even though they are unexpected. The right rear foot is drawn about 25 mm forward of the left rear foot. And the outline's front view prints the indicator legends of the lamp models; the operating instructions for the PT-RZ970 decide the names here, and they call the fifth indicator position not used. It is drawn unlit as part of the body.

Everything else is a stand-in: surface shape, finish, connector bodies, the mains inlet, the switch and the lens. Ribbed bars low on both sides, the earthing warning label, three logos on the top cover and most detail of the base are not drawn. The definition lists each open question under `evidence.unknowns`. No photograph or physical unit was used.

The outline covers seven models. A detail that differs on the PT-RZ970 alone would not show.

## Responsibility and scope

Equipment Lab owns the generator, the catalog and this package. The GLB is generated; edit the generator, rebuild, then repeat any acceptance. Dave owns any later physical acceptance.
Inspection only. Selecting a part operates nothing, and the package simulates no menu, signal, optical result or network control. A drawn port does not make a projector reachable or controllable.
No ceiling bracket, frame, flight case, cable, screen or venue record is included.

## Materials, labels and rights

239 standard physical surfaces and 38 unlit labels. Surfaces share 18 materials by finish; each label has its own. There are no bones, skins, clips, hidden variants or levels of detail. Label textures are sRGB colour at power-of-two sizes; untextured surfaces carry no UV set.
Labels are generated text in Arial, resolved to Liberation Sans on the recorded runner, and embedded as PNG. They follow the names in the operating instructions and do not copy the panel printing.

Three.js r184 is MIT licensed. Geometry is independently authored. The manufacturer's name and model identify the equipment without implying endorsement. No manufacturer drawing, CAD geometry, manual page, photograph or artwork is embedded or redistributed.

Khronos glTF-Validator 2.0.0-dev.3.10 reports no errors, warnings, informational notices or hints. The stills use the three lights of the Equipment Lab inspector in Chromium with SwiftShader software rendering; no GPU, phone or installed consumer has been checked.
