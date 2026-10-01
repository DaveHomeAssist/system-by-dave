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

The public library contains nine product or product-family sheets. Five are
authored here; four are generated as equipment-only projections of source-owned
catalogs. All nine remain available offline.

## Public and workspace boundary

AV by Dave Gear Reference is a reusable equipment library. It must not expose
FMP inventory, installed routes, camera assignments, venue observations, house
sources, or links/embeds to FMP models. This includes summaries, tags, section
content, search, print, accuracy logs and source lists. A public source file must
obey the boundary too; hiding a tab is insufficient.

Venue content belongs to the FMP workbook/workspace. There is currently no
verified FMP workspace binding in Gear Reference, so it does not load any FMP
context, even when an `sbdShow`, `sbdVenue` or arbitrary workspace query names FMP.
A future integration must resolve an explicit workspace identity and ownership,
keep venue data separate from the generic product sheet, and return through that
workspace. A display name, remembered show, referrer or query flag is not such a
binding. The source-owned FMP application and catalogs remain unchanged.

The former four camera-chain sheets now use manufacturer-backed product/family
references; unit counts, plate observations, installed paths and house procedures
are no longer public equipment facts. The Fujinon family entry deliberately does
not assign a lens SKU or zoom ratio to an unidentified unit.

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
`procedure`, `checklist`, `cards`, `accuracyLog`, `parts`. A `parts`
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
   citing an undeclared source, or a link to a workspace model.
9. Exposes workspace content, house records, operator reports or unit photographs
   in a public sheet or the public index.

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

Every catalog source must have a reviewed evidence kind in the adapter. Public
parts use manufacturer and product-photograph sources only. Unit photographs,
operator reports and house records are not published as product evidence.
Virtual routes, venue-labelled items and items without public equipment evidence
remain solely in the source catalog.

For a shared part whose description mixes product evidence and venue evidence,
the public sheet retains its product identity and public sources, marks the
description Unknown, and says it awaits equipment-only source review. It never
copies the mixed description to Parts, Open facts, or an accuracy log. Separating
the source description into independently evidenced fields can restore that
product detail later. Generic descriptions that contain venue language also fail
closed. The adapter never mutates the original catalog.

Public parts have no interactive FMP link and there is no “Kept with FMP” tab.
The release verifier checks all nine public JSON sheets and the index, including
source metadata; the browser navigation probe checks rendered sheets, obsolete
hashes, and arbitrary show/workspace query parameters. Manufacturer source links
remain available in the accuracy log.

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
