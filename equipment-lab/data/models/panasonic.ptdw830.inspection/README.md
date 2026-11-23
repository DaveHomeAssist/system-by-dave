# Panasonic PT-DW830 inspection package

P02 inspection representation 1.0.0. Not qualified: no reference checklist, consumer acceptance or physical comparison has been done.

This package centres on lamp and air filter access. The lamp unit cover opens, each lamp unit pulls out and the air filter case slides out, each as a named state, and Panasonic's replacement steps are carried with the parts they concern.

## Included

- panasonic.ptdw830.inspection.glb — 492 rigid meshes, 22,514 triangles, 43 embedded PNG labels. Exported closed.
- panasonic.ptdw830.definition.json — 60 stable component IDs with purpose, action and what supports each placement; four joints, five states and two procedures; frame, dimensions, views, surfaces, materials and open questions.
- panasonic.ptdw830.manifest.json — file integrity, generator and runtime hashes, export settings.
- preview.jpg — library still, 720 by 411, on the light Equipment Lab stage.
- evidence/ — glTF validation, geometry counts, the reload comparison, the state check and fourteen stills rendered from the reloaded GLB: eight views, two on the dark stage, and one for each open state.

## Coordinate contract

Metres, +Y up, +Z front (lens side). Origin: foot contact plane under the centre of the cabinet; root identity. The model was authored in this frame, so no conversion applies.
Left and right follow Panasonic: stand behind the projector and face the screen. The terminal side is the right side, at -X. The cabinet is 513 mm deep, so its rear face is at Z -0.2565.

## Joints and states

A node moves with a joint when its glTF extras carry `joint` with that joint's name. `rig.joints` in the definition gives each joint.

| Joint | Kind | Range | Nodes |
| --- | --- | --- | --- |
| `lampCover` | Hinge about a vertical axis at the left end of the rear face | 0 to 100 degrees | 46 |
| `lampUnit1` | Slide to the rear | 0 to 210 mm | 18 |
| `lampUnit2` | Slide to the rear | 0 to 210 mm | 18 |
| `filterCase` | Slide to the rear | 0 to 170 mm | 58 |

To apply a state, take each tagged node's exported transform and, for a hinge, rotate it about the joint's axis through its pivot by the state's value; for a slide, move it along the axis by the value. Right-hand rule, metres. Nodes without a tag do not move.

States, under `native.states`: `closed`, `coverOpen`, `lampUnit1Out`, `lampUnit2Out`, `filterCaseOut`. Each names the view that shows it. A component that is hidden when the projector is closed names the state that shows it.

The cover carries the larger exhaust port, its fans, its fixing screw and the window of the rear remote receiver, so all of those move with it and keep their own component IDs.

## Procedures

`native.procedures` holds two ordered lists: replacing a lamp unit, and removing, cleaning and attaching the air filters. Each step names its part and its state. Each list carries Panasonic's warnings and the pages it comes from.

They summarise Panasonic's procedure so that a reader can find the parts. They do not replace the operating instructions. Panasonic recommends that a qualified technician replace the lamp unit. The lamp is hot for at least an hour after use, is made of glass and contains mercury.

## What is supported and what is not

Panasonic prints 498 x 200 x 513 mm for the cabinet with the feet at their shortest, 43 mm more for the supplied standard zoom lens, 18.3 kg with that lens, feet 442 mm apart across and 432 mm front to back, and the lens centre 115.5 mm above the floor. The drawn cabinet measures 498 x 200 x 513 mm.

Its operating instructions name every part drawn here and the face it sits on, the 13 controls of this model, its terminals, six M6 ceiling mount holes, and the lamp and air filter parts with their procedures.

Positions rest on three levels of support, and each part states its own:

- The front and the terminal side use positions measured on Panasonic's CAD outline for the sibling PT-RZ970 series. The PT-DW830 illustrations agree with them within about 3 mm when both are measured from the front face.
- The rear, the left side and the bottom are scaled from the PT-DW830 illustrations, each set to its printed dimensions. Panasonic's spec file says its dimension illustration is not drawn to scale.
- Inside the lamp bay, positions are read from two small perspective drawings. Which part is where, how many there are and which way they move are Panasonic's. Sizes, depths and exact positions are approximate. The depth of the bay, the 100 degree opening of the cover, the cover staying on its hinge and the travel of each slide are assumptions.

The control panel and terminal pages of the manual cover three models. Its SDI button and SDI IN terminal are marked for the PT-DZ870 only, so neither is a part here and both positions are drawn blank. What a PT-DW830 carries there is not established.

The definition lists each open question under `evidence.unknowns`. No photograph or physical unit was used.

## Responsibility and scope

Equipment Lab owns the generator, the catalog and this package. The GLB is generated; edit the generator, rebuild, then repeat any acceptance. Dave owns any later physical acceptance.
Inspection with service states. Selecting a part or choosing a state operates nothing, and the package simulates no power, lamp, fan, indicator, menu, signal, optical result or network control. A drawn port does not make a projector reachable or controllable.
No ceiling bracket, frame, flight case, cable, screen, tool or venue record is included. No lamp internals are drawn: each lamp unit is an outer housing.

## Materials, labels and rights

449 standard physical surfaces and 43 unlit labels. Surfaces share 22 materials by finish; each label has its own. There are no bones, skins, clips, hidden variants or levels of detail. Label textures are sRGB colour at power-of-two sizes; untextured surfaces carry no UV set.
Labels are generated text in Arial, resolved to Liberation Sans on the recorded runner, and embedded as PNG. They follow the names in the operating instructions and do not copy the panel printing. The numbers 1 and 2 on the lamp units are generated tags, not product markings.

Three.js r184 is MIT licensed. Geometry is independently authored. The manufacturer's name and model identify the equipment without implying endorsement. No manufacturer drawing, CAD geometry, manual page, photograph or artwork is embedded or redistributed.

Khronos glTF-Validator 2.0.0-dev.3.10 reports no errors, warnings, informational notices or hints. The stills use the three lights of the Equipment Lab inspector in Chromium with SwiftShader software rendering; no GPU, phone or installed consumer has been checked.
