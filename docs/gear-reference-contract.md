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

Unlike the FMP equipment catalogs, these are **not** managed artifacts. They are
authored in this repository and may be edited here directly.

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
`procedure`, `checklist`, `cards`, `accuracyLog`.

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

The Epson PowerLite X39 sheet additionally has its twelve sections pinned by id,
so a section cannot be dropped silently.

## Three vocabularies, deliberately

This is not the only evidence field on the site, and the others are different on
purpose. Do not unify them without deciding what each would lose.

| Where | Field | Values |
| --- | --- | --- |
| FMP equipment catalogs | `confidence` | `Confirmed` `Documented` `Reported` `Inferred` `Unknown` `Contradicted` |
| Gear Reference | `accuracy[].status` | `confirmed` `corrected` `unverified` `estimate` |
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
house reference mapping.

## Changing the vocabulary

Add a value here with its meaning in the same change that adds it to
`ALLOWED_STATUSES` in `scripts/verify_gear_reference.js`, so the gate and this
document never disagree.
