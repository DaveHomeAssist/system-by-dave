---
name: equipment-photo-grounding
description: Identify equipment, connectors, and controls from photos and reconcile annotations with model-specific evidence. Use for equipment identification, photo labeling, or preparing a sourced component catalog for an operating guide; not for cosmetic image editing alone.
---

# Ground equipment labels in evidence

Deliver a usable identification or annotation with traceable claims. Separate what an image shows, what the product documentation specifies, and what is installed or tested in the field.

## Establish the evidence

1. Inspect the original images at useful resolution before naming parts. Inventory each view, orientation, visible markings, obstructed areas, and whether it is an original photo, edited derivative, generated illustration, or unknown-origin image. Preserve the original when making crops or annotated derivatives.
2. Identify equipment family before exact model or revision. Match readable model markings and distinctive geometry with the manufacturer's documentation. Inspect multiple views when a single angle cannot distinguish candidates. Do not infer the position of a switch from an unreadable photo.
3. Verify functions against the exact model and relevant revision. Prefer official manuals or technical drawings to reseller summaries; record the document version and page or section. If retrieval fails, retain the observation and mark the function unresolved.
4. Resolve claims individually. A visible connector can establish location without establishing its direction, protocol, enabled state, internal routing, or installed patch. A manual describes capability; a dated field observation describes the particular rig.
5. Apply the user's correction to the requested guide while retaining attribution and scope. If a correction conflicts with direct evidence or a documented operating instruction, explain the specific conflict and leave the affected operational claim unresolved. Do not turn a local correction into a rule for every product or position.

Use [the capture and evidence reference](references/capture-and-evidence.md) when deciding which additional view is needed or recording conflicting sources. Start a reusable catalog from [the evidence ledger](assets/evidence-ledger.csv) when the task involves multiple controls. For a single identification, a compact sourced answer is enough.

## Annotate without inventing

- Label only visible parts in that view. Put hidden components in a separate view or explicitly marked schematic. Never attach their name to a nearby visible shape.
- Distinguish the complete assembly from its controls. Keep onboard LCD, top handle, studio viewfinder, camera-end converter, and studio converter separate when the evidence supports those identities.
- Treat cleaned or generated images as presentation assets. Reconstructed labels, removed cables, or exposed ports are not independent confirmation of the original equipment.
- Fit component boundaries to the visible footprint. Keep text readable without painting over identifying marks. Use stable component IDs from an existing catalog when available.
- Preserve ambiguity where it matters. Name a family-level component and specify the missing evidence instead of guessing an exact model or release direction.

## Deliver and check

Return the annotated artifact or requested catalog, its source mapping, and only the gaps that affect its use. Check each changed label against its evidence, then check the orientation and component boundaries. Keep identity confidence separate from geometric accuracy and from physical readiness. Do not call a depicted control physically tested.

For a guide handoff, include `component_id`, displayed label, view/region, equipment scope, evidence state, source locator, and unresolved claim. Keep private source records in engineering detail or internal metadata when the deliverable is public. Request only the particular missing photo or record needed to resolve an operationally important ambiguity.
