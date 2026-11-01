# Cartoni Maxima 30 reference package

C02 inspection representation 1.0.0. Qualified in Ion Workbench /camera/.

## Included

- cartoni.maxima30.inspection.glb — 145 rigid meshes, 32,508 triangles, 22 embedded PNG labels.
- cartoni.maxima30.definition.json — native schema, ten stable component IDs, surface/material/texture roles, evidence and frame mapping.
- cartoni.maxima30.manifest.json — source hashes, file integrity, revisions and export settings.
- cartoni.maxima30.acceptance.json — 60 evaluated checks, qualified scope and evidence hashes.
- checklist.html / .md / .csv — the completed checklist.
- evidence/ — recorded qualification results and authored consumer renders.

## Coordinate contract

Meters, +Y up, +Z front, base contact plane at origin; root identity. A child frame converts the native -Z-forward, tilt-axis source. The explicit inverse restores Ion's native convention. Native and imported posed matrices agree within 1e-6. No mirror or inferred unit conversion is used.

## Responsibility and scope

Ion owns the procedural generator, native catalog, adapter and named consumer. The asset maintainer owns software qualification and future remediation. Dave owns any later physical equipment acceptance. The GLB is generated from the source; edit the generator, regenerate, then repeat acceptance. Source and consumer file hashes are in the manifest. Source commit, production version and live package hashes are separate release evidence.

This package is qualified for approximate inspection in the recorded Chromium SwiftShader software-rendering profile. Its 40 viewport/theme/tab cases are emulations. Actual phones, GPU workstations, physical dimensions, mounting fit, payload mass and counterbalance calibration are not certified. All control practice is local and illustrative. The other 42 family entries are unchanged. There are no waived failed checks; Q30 baking UVs and Q44 batching are N/A because neither feature is used.

The generic Panasonic body, finder, Fujinon lens, cradle, tripod and pan bars are separate context and are excluded. The integrated generic body/finder fingerprints match source version 18. No Panasonic model, switch map, connector map, mass or center of gravity is assigned.

## Materials, labels and rights

123 standard physical surfaces and 22 unlit labels. Per-mesh materials preserve selection and disposal isolation. Primitive UV overlap/repetition is intentional; labels each use a 0–1 mapping. Open decal planes have intentional boundaries. There are no bones, skins, clips, hidden variants, LODs or new batches. Textures are sRGB color; no data textures are used. Generated labels request Arial, resolved to Liberation Sans on the recorded runner, then embed PNGs at native canvas resolution. Import requires no live font or CanvasTexture generator.

Three.js r180 is MIT licensed; see ../../../vendor/THREE-LICENSE.txt. The source-owned tools use Khronos glTF-Validator 2.0.0-dev.3.10 and Playwright 1.63.0 as development-only dependencies. Geometry is independently authored. Manufacturer marks identify equipment without implying endorsement. User reference photos and manufacturer drawings are not embedded or redistributed. Cartoni control identity/function is referenced to the HM3100 manual v1.0, June 2019; layout is photo-informed and approximate.

Khronos reports zero errors/warnings and 143 informational notices: 123 retained UV channels on untextured surfaces, and 20 non-power-of-two label images. Both are intentional and work in the qualified consumer. Keep the original validation report.
