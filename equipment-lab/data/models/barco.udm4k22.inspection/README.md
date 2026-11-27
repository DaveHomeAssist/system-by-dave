# Barco UDM-4K22 inspection package

P01 inspection representation 1.0.0. Not qualified: no reference checklist, consumer acceptance or physical comparison has been done.

## Included

- barco.udm4k22.inspection.glb — 199 rigid meshes, 15,892 triangles, 14 embedded PNG labels.
- barco.udm4k22.definition.json — 26 stable component IDs with purpose, action and what supports each placement; frame, dimensions, views, surfaces, materials and open questions.
- barco.udm4k22.manifest.json — file integrity, generator and runtime hashes, export settings.
- preview.jpg — library still, 720 by 411, on the light Equipment Lab stage.
- evidence/ — glTF validation, geometry counts, the reload comparison and eight stills rendered from the reloaded GLB.

## Coordinate contract

Metres, +Y up, +Z front (lens side). Origin: foot contact plane under the centre of the published envelope; root identity. The model was authored in this frame, so no conversion applies.
Left and right follow Barco: stand behind the projector and face the screen. The input and communication side is the right side, at -X.

## What is supported and what is not

Barco publishes a body of 540 x 725 x 339 mm and 48 kg. The drawn body matches that envelope; the lens extends beyond it.
Barco documents place three filtered air inlets on the top, front and right side, one air outlet at the rear, the input and communication module on the right side, the mains input at the rear, and infrared receivers at the front below the lens holder, at the rear beside the mains input and inside the input and communication module.
The connectors and their functions follow Barco's lists for the communication panel and the Quad Combo input board.

Everything else is approximate or assumed: the size and place of each part on its face, the keypad, the order of the connectors, four corner feet, a centred lens holder and the lens itself. The lens stands in for the TLD+ family and is not a specific lens. Carrying handles, optional antennas, optional input boards and the optional distance meter are not drawn. The definition lists each open question under `evidence.unknowns`.

The published width and length are swapped between Barco's product page and its specification sheet; the product-page order is used. The 223 mm lens-centre height comes from the installation manual, whose excerpt does not say what the figure measures.

Barco's site could not be opened while this package was authored. Published values were read through search excerpts of the Barco documents named in the definition and have not been checked against the primary files. No drawing, photograph or physical unit was used.

## Responsibility and scope

Equipment Lab owns the generator, the catalog and this package. The GLB is generated; edit the generator, rebuild, then repeat any acceptance. Dave owns any later physical acceptance.
Inspection only. Selecting a part operates nothing, and the package simulates no menu, signal, optical result or network control. A drawn port does not make a projector reachable or controllable.
No stand, rigging frame, flight case, cable, screen or venue record is included.

## Materials, labels and rights

185 standard physical surfaces and 14 unlit labels, each with its own material so selection and disposal stay isolated per mesh. There are no bones, skins, clips, hidden variants or levels of detail. Label textures are sRGB colour at power-of-two sizes; untextured surfaces carry no UV set.
Labels are generated text in Arial, resolved to Liberation Sans on the recorded runner, and embedded as PNG. They help find parts and do not copy the panel printing. The LCD shows placeholder field names, not a real screen.

Three.js r184 is MIT licensed. Geometry is independently authored. The manufacturer's name and model identify the equipment without implying endorsement. No manufacturer drawing, photograph or artwork is embedded or redistributed.

Khronos glTF-Validator 2.0.0-dev.3.10 reports no errors, warnings, informational notices or hints. The stills use the three lights of the Equipment Lab inspector in Chromium with SwiftShader software rendering; no GPU, phone or installed consumer has been checked.
