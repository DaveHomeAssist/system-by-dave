---
name: interactive-equipment-explorer
description: Build or extend clickable equipment diagrams and rotatable 3D trainers with stable component IDs, whole-part highlighting, articulated controls, and usable text/photo alternatives. Use for interactive equipment guides, component explorers, or instructional rig models.
---

# Build an equipment explorer

Build the requested diagram or trainer around a component catalog that remains useful without the renderer. Keep the user's chosen medium and existing application architecture unless a specific limitation requires a change.

## Choose the representation

Inspect source photos and the current artifact before modeling. Use photos for exact markings and observed configuration; use a schematic for relationships; use 3D for spatial relationships, hidden sides, and movement. Support switching when it helps the task. Do not require 3D for a simple identification request. Treat edited/generated photos as illustrations unless backed by original evidence.

Separate model identity, dimensions, component placement, and movement limits into distinct evidence claims. Preserve confirmed facts while marking unknown geometry illustrative. Do not invent CAD tolerances or make an approximate control position look field verified.

## Establish the component contract

Reuse existing IDs. For new components, assign unique durable `component_id` values independent of array order, display numbering, translated labels, mesh names, and camera angle. Repeated physical controls need separate IDs. Store aliases explicitly; do not silently rename IDs when wording changes. For a mistaken identity, preserve an old link only if it can be mapped unambiguously, otherwise explain the remap.

Read [the component contract](references/component-contract.md) for catalog fields and scene behavior. Adapt [the small catalog example](assets/component-catalog.json) to the existing app instead of imposing a migration. Validate normalized catalog references with `python3 scripts/validate_catalog.py CATALOG.json` from this skill directory. The validator checks structure, not truth, geometry, or browser behavior.

## Build interaction around complete parts

- Maintain a stable component-to-region/mesh-group mapping. A click on a child surface should resolve to its logical component. Highlight its complete visible geometry; restore original materials on deselection without recoloring neighboring parts that share materials.
- Prefer visible surface hits. For tiny or occluded controls provide a close-up, search result, or component list. Enlarge hit areas only where they cannot silently select an adjacent part. Make hidden-through-shell inspection an explicit mode.
- Parent articulated geometry, labels, selection bounds, and attached detail to the same transform. Rotate about the evidenced hinge/joint. Preserve relative placement of attached controls and model a cable bend approximately when precise mechanics are unknown.
- Compute framing from current transformed bounds. Reframe after opening a door, rotating a connector, switching assemblies, or resizing. Keep selection synchronized across photo, model, lesson, search, and deep link.
- Provide native controls for selection, rotate, tilt, zoom, reset, and articulation. Make essential instructions reachable without pointer precision or WebGL. Respect reduced motion; keep focused controls visible; avoid announcing every animation frame.
- Bound the desktop viewer to available height. Allow normal page flow on narrow screens. Define touch gestures locally so operating the model does not trap page scrolling. Preserve usable controls in fullscreen and after orientation changes.

## Verify the requested behavior

Check representative large, small, overlapping, and moving components in an actual rendered browser when available. Test keyboard/list selection and invalid deep links. Verify the requested offline mode without network, including assets and libraries. Distinguish automated catalog checks from rendered interaction checks and physical-device checks. Report unavailable tests precisely and retain a useful text/photo fallback.

Deliver the working artifact, component catalog/revision, and material accuracy limits. Do not equate number of meshes or successful source tests with usable training. Use a separate release workflow when publication is requested; this skill alone grants no deployment authorization.
