---
name: equipment-correction-propagation
description: Apply an equipment identity, control, placement, wiring, or behavior correction consistently across a guide's source data, diagrams, lessons, search, exports, and authorized published copies. Use when one corrected fact has multiple dependent representations.
---

# Propagate an equipment correction

Treat the correction as a scoped change to claims and their dependents. Preserve unrelated content and history. Update every affected authorized surface without silently claiming that unavailable or unpublished copies changed.

## Establish the change

Read the latest artifact and canonical records relevant to the corrected claim. State old claim, replacement, affected rig/model/view, attribution, date if known, and evidence. Accept explicit user corrections for the representation; surface a specific unresolved conflict before turning it into operational instructions. Do not infer a new function or route from a naming correction.

Distinguish label correction, mistaken identity, geometry/attachment correction, function correction, and field configuration change. They have different downstream effects. A new patch may be time-scoped rather than invalidating a historical observation.

## Map affected surfaces

Use the dependency checklist in [correction scope and closure](references/correction-workflow.md). Search by stable ID, old label, aliases, source locator, and distinctive claim wording. Inspect matches in context. Include geometry, animation parents, hit regions, deep links, accessible names, alt text, operator notes, engineering detail, lessons, answer keys, translations when present, export templates, revision metadata, and authorized publication targets.

Start [a correction record](assets/correction-record.json) when several surfaces are involved. Record each surface as `changed`, `verified`, `pending`, `blocked`, or `not_applicable`, with evidence. Existing equivalent issue tracking is sufficient; do not create duplicate backlogs.

## Apply at the source

Change the canonical fact once and regenerate dependents where the project supports it. Do not create a parallel data authority merely to use this workflow. If no shared catalog exists, edit the affected surfaces directly and record their dependency for future corrections.

Retain stable IDs when the identity is unchanged. When a previous ID denotes the wrong component, evaluate old deep links and aliases individually: migrate unambiguous references; retire or disambiguate misleading ones. Do not alias two different physical components together to make tests pass.

Preserve source images. Update derivative annotations separately; do not overwrite evidence to make it match a correction. Keep historical logs explicitly dated; add a superseding note when appropriate rather than rewriting what was observed then.

For mechanical corrections, update attachment hierarchy, articulation pivots, selection grouping, and framing as well as the visible mesh. For function corrections, update expected outcomes, troubleshooting branches, and lesson scoring.

## Verify and close

Run focused checks on the affected relationship and nearby controls. Search for superseded claims again, classifying intentional historical references separately from stale current instructions. A zero text-match result alone does not prove a geometry or behavior correction.

Generate new offline copies and inspect the exported result. Preserve release authorization from the session; publish only within that scope. After an authorized release, verify the actual URL/revision and corrected behavior. If a target is inaccessible, finish local work and identify that remaining gap without implying deployment.

Return a compact change summary: corrected fact, surfaces updated, checks performed, and outstanding targets. Keep source, exported, and deployed completion separate. Do not broaden a single guide correction into venue-wide record edits without authorization.
