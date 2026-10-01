# Gear Reference contract

The Gear Reference publishes equipment sheets from `data/gear/`. This file
documents the vocabulary and structure those sheets use, and the invariants
`scripts/verify_gear_reference.js` enforces on every release.

It exists because the vocabulary was already being enforced in code and
explained nowhere. A reader meeting `unverified` on a sheet had no way to learn
what it claimed, and an author adding a sheet had to read the verifier to find
out which values it would accept.

## Files in scope

| File | Schema | What it is |
| --- | --- | --- |
| `data/gear/index.json` | `system-by-dave.gear-reference-index.v1` | The catalogue of sheets |
| `data/gear/<id>.json` | `system-by-dave.gear-reference-entry.v1` | One equipment sheet |
| `data/gear/figures/*.svg` | — | Schematic figures referenced by a sheet |
| `scripts/gear_equipment_adapter.js` | — | Turns an FMP equipment catalog into a sheet |

Unlike the FMP equipment catalogs, these are **not** managed artifacts. They are
authored in this repository and may be edited here directly, except the four
sheets generated from FMP catalogs (below), which are rewritten by a script.
The library currently contains the Epson X39 sheet, four FMP camera-chain
sheets (URSA Broadcast G2, Fujinon 4K zooms, camera fiber converter, studio
fiber converter) and four catalog-derived sheets (ATEM Television Studio HD8 ISO,
ATEM Camera Control Panel, BirdDog P240, PTZOptics SuperJoy G1). All nine JSON
files are part of the AV Suite offline manifest.
The FMP sheets distinguish house observations from manufacturer specifications;
an unread serial, lens plate, or converter plate remains an open field check.

## Accuracy vocabulary

Every sheet carries an `accuracy` log. Each entry names a claim on the sheet and
records how well evidence supports it. `status` is one of exactly four values:

| Value | Meaning |
| --- | --- |
| `confirmed` | The named source states this directly |
| `corrected` | The sheet previously said something else; a source overturned it, and both the old and new readings are retained |
| `unverified` | Stated on the sheet but not backed by a source that was checked |
| `estimate` | Derived or approximated, not taken from a source as written |

`corrected` is the one worth keeping. It records that the sheet was wrong and
what fixed it, rather than quietly overwriting the mistake.

Every accuracy entry must cite at least one `sourceRefs` id, and every id must
resolve to an entry in that sheet's `sources` array.

## Section types

`sections[].type` is one of: `specTable`, `table`, `figure`, `figure+table`,
`procedure`, `checklist`, `cards`, `accuracyLog`, `model`, `parts`. A `parts`
section appears only on a sheet generated from an FMP catalog.

Section ids are unique within a sheet, and every section cites at least one
source that resolves.

## Figures are schematics, not photographs

A referenced figure must exist, must be an SVG carrying `role="img"`, and must
not embed a raster image. The verifier rejects `<image>` inside a figure
specifically so a photograph cannot be passed off as a measured drawing.

## Enforced invariants

`scripts/verify_gear_reference.js` fails the release when a sheet:

1. Is not valid JSON, or its id does not match the index entry pointing at it.
2. Has no sections, no sources, or no accuracy log.
3. Repeats a section id, or uses a section type outside the list above.
4. Uses an accuracy status outside the four values above.
5. Has a section or accuracy entry with no `sourceRefs`, or one that references
   an undeclared source.
6. Names a figure that is missing, is not an SVG with image semantics, or
   embeds photography.
7. Is listed in the index without an authored sheet behind it.
8. Has a `parts` section on a sheet that is not generated from an FMP catalog, a
   part without an id, label or evidence level, a part listed twice, a part
   citing an undeclared source, or an interactive link that is not an FMP model
   page.

The Epson PowerLite X39 sheet additionally has its twelve sections pinned by id,
so a section cannot be dropped silently.

## Sheets generated from FMP catalogs

The ATEM Television Studio HD8 ISO, ATEM Camera Control Panel, BirdDog P240 and
PTZOptics SuperJoy G1 sheets are written by `npm run build:gear-from-fmp` from the
exported FMP equipment catalogs (`fmp/models/assets/`, `fmp/ptz/`). The catalog is
the only part list: the interactive model and the sheet read the same entries, and
`scripts/fmp_model_contract.js` loads the catalogs for both the release gate and
the generator. Do not edit these four JSON files by hand; change the fmp-suite
catalog (and re-export) or `scripts/gear_equipment_adapter.js`, then regenerate.
`npm run verify:gear-reference` and `npm run verify:fmp` both fail while a sheet
differs from its catalog, so a re-export that changes a catalog must regenerate
the sheets in the same pull request.

Each catalog source has an evidence kind in the adapter (manufacturer, product
photograph, photograph of the FMP unit, supplied reference, FMP record, operator
report). A new catalog source stops the build until it is classified. The kinds
decide what the sheet shows:

- **Parts** lists every catalog component with its label, description, catalog
  evidence level (the catalog vocabulary, not this sheet's accuracy vocabulary)
  and sources, grouped by catalog category. Each part's *Inspect in 3D* link opens
  the interactive model at `#part=<component_id>`. Geometry and placement notes
  stay with the interactive model.
- **Kept with FMP** holds what is not an equipment fact: `virtual_route`
  components (signal routes between FMP devices), components whose only sources
  are FMP records or operator reports, and a pointer to the catalog's venue fields
  (`venue`, `evidence_policy`). Venue values such as addresses and firmware are
  never copied onto a sheet.
- A part that cites an FMP record or operator report alongside equipment sources
  is listed and flagged *Cites FMP evidence*; its description may carry behaviour
  observed on the FMP unit or an FMP-specific note.
- **Open facts** lists parts the catalog marks `Unknown` or `Contradicted`, the
  flagged parts, and gaps in the catalog itself: connectors are described in text,
  with no structured connector fields, so the sheet does not tabulate connector
  specifications.

The accuracy log states which listed parts cite a manufacturer source
(`confirmed`) and which rest on photographs or a supplied reference
(`unverified`). The sheet does not depend on housevideo.app: the part list is in
the sheet file and works offline, and only the interactive model needs a
connection. These four model pages have no embed mode yet, so the sheet links to
them rather than framing them as the rig sheets do.

## Four vocabularies, deliberately

This is not the only evidence field on the site, and the others are different on
purpose. Do not unify them without deciding what each would lose.

| Where | Field | Values |
| --- | --- | --- |
| FMP equipment catalogs | `confidence` | `Confirmed` `Documented` `Reported` `Inferred` `Unknown` `Contradicted` |
| Gear Reference | `accuracy[].status` | `confirmed` `corrected` `unverified` `estimate` |
| Throwline catalog | `confidence` | `official_primary` `needs_verification` `conflicting` |
| FMP house reference | `Confidence` | `Paper only` `Unidentified` |

They answer different questions. The catalog vocabulary asks *what kind of
evidence supports this claim*. The Gear Reference asks *how well checked is this
line on this sheet*, which is why it has `corrected` and the catalogs do not.
The house reference asks *has this position been found in the building*.

Note that `confirmed` here and `Confirmed` in the catalogs are close but not
identical: the catalog value is about evidence for a claim at a scope and date,
while this one means a named source states it directly. Case is the quickest
signal of which document you are reading.

See `docs/fmp-model-catalog-contract.md` for the catalog vocabulary and the
house reference mapping, and `docs/throwline-catalog-contract.md` for Throwline's.

## Changing the vocabulary

Add a value here with its meaning in the same change that adds it to
`ALLOWED_STATUSES` in `scripts/verify_gear_reference.js`, so the gate and this
document never disagree.

## Interactive FMP models

A `model` section embeds the existing House Video rig explorer for the four FMP camera-chain sheets. Its `model.url` is restricted to the public rig route with a known equipment and component selection. The rig, component notes, photos, and source evidence remain owned and published by `fmp-suite`; Gear Reference does not duplicate or rewrite them. The iframe uses the focused embed mode and matches the AV theme. It needs a connection to housevideo.app, while the authored sheet stays available offline. On screens wider than 680px the frame stays at least 660px tall, because the rig switches to its short-screen layout (an 18rem model strip above a scrolling page) when its frame is under 640px; phones keep the shorter frame and that layout. Gear Reference keeps its own accuracy vocabulary; the embedded explorer displays the FMP evidence in its original context.

## Navigation clearance

The page stays within the viewport, with long sheet content scrolling inside
the selected panel. Previous and Next section controls remain above the shared
tool navigation. The shared navigation measures its clearance with or without
show context, including after resize; the sheet reserves that measured space
instead of assuming a fixed mobile navigation height.

On phones, an expanded show dock is bounded to 20% of the viewport and its
controls scroll inside it. With no saved preference, Gear Reference starts with
the compact show dock on phones; an existing saved preference still wins.
`npm run test:av-nav-browser` checks section-button hit targets,
minimum content space, page containment, actual section changes, resize, and both
dock modes at representative phone, breakpoint, desktop and ultrawide sizes.
