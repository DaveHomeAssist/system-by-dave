# FMP equipment model catalog contract

The FMP interactive equipment models each carry a component catalog. This file
defines the evidence vocabulary those catalogs use and the invariants
`scripts/fmp_model_contract.js` enforces on every release.

The catalogs themselves are managed artifacts exported from
`DaveHomeAssist/fmp-suite` (see `docs/fmp-public-release.md`). Do not hand-edit
them here. This contract is the gate they are checked against, so drift is
caught at release time no matter which side introduced it.

## Catalogs in scope

| Model | Catalog location | Components |
| --- | --- | --- |
| ATEM Television Studio HD8 ISO | `fmp/models/assets/atem-hd8-iso-1.js` (`ATEM.catalog`) | 227 |
| ATEM Camera Control Panel | `fmp/models/assets/ccu4-catalog.json` | 140 |
| SuperJoy G1 | inline in `fmp/ptz/SuperJoy-G1-Interactive-Guide.html` (`SuperJoy.catalog`) | 67 |
| BirdDog P240 | `fmp/models/assets/p240-catalog.json` | 24 |

Component counts are the current export; the contract reads them from the
catalogs rather than pinning a number here.

`p240` and `ccu4` additionally publish their catalog inline in the page; the
contract already asserts the inline copy and the release JSON are identical.

## What this contract does not cover

The vocabulary below governs the four equipment catalogs above. It is not the
only `confidence` field on the FMP site, and the other one is deliberately
different.

`fmp/house/house-data.js` (`fmp.house-reference.v1`, 151 display positions)
carries its own `Confidence` column with two values, `Paper only` and
`Unidentified`. Neither is in the vocabulary below, and neither should be
changed to fit it: `Paper only` says specifically that a position appears on a
paper list and has not been found in the building, which is more than
`Documented` conveys. Forcing it into this vocabulary would lose that.

For a reader moving between the two, the rough mapping is:

| House reference | Nearest catalog value | What is lost in translation |
| --- | --- | --- |
| `Paper only` | `Documented` | Which record, and that nobody has confirmed it on site |
| `Unidentified` | `Unknown` | That a position is expected to exist but has not been matched to a device |

`scripts/fmp_model_contract.js` reads only the four equipment catalogs, so the
house reference is out of its reach by design. If that ever changes, translate
deliberately rather than letting a gate rewrite the house vocabulary.

## Required catalog fields

Each catalog declares `schema_version`, `guide_id`, `revision`, and `model`.
Each component declares `component_id`, `label`, `confidence`,
`geometry_status`, and `source_ids`.

`component_id` is stable and independent of array order, display numbering, and
mesh names. It is the identity other surfaces deep-link and cite, so it is not
renamed when wording changes.

## Confidence vocabulary

What kind of evidence supports the claim. Identity confidence is separate from
geometric accuracy, which `geometry_status` carries, and from physical
readiness, which no catalog asserts.

| Value | Meaning |
| --- | --- |
| `Confirmed` | Direct evidence for this claim, at this scope and date |
| `Documented` | Stated in a named manual or maintained record, without field verification of the installed state |
| `Reported` | Attributed to a person, with date and context where known |
| `Inferred` | Reasoned from stated evidence, with the inference explained |
| `Unknown` | Insufficient evidence |
| `Contradicted` | Credible sources disagree; both locators and the needed resolution are retained |

The table above is the whole vocabulary. No value is grandfathered and no
catalog is exempt.

Two earlier exports needed exemptions, and both were resolved by correcting the
artifact rather than widening the gate. `Partial` left the list when fmp-suite
`a374f7a` traced the `p240.path.video` SDI run on site and made it `Confirmed`.
`Published envelope / Photo approximation` left it when fmp-suite `5931c51`
moved that SuperJoy chassis wording to `geometry_status` and `limits`, where
geometry belongs, leaving `Documented` in the confidence field. Getting the
evidence, or putting the claim in the right field, beats tolerating the value.

## Geometry vocabulary

How the component's position and shape were established. These values are
deliberately more specific than a plain measured/approximate split, because the
type of a part and the position of a part are frequently established by
different evidence.

| Value | Meaning |
| --- | --- |
| `documented_geometry` | Dimensions or placement taken from manufacturer drawings or specifications |
| `documented_motion` | Movement range taken from manufacturer documentation |
| `documented_type_photo_grounded` | Part type from documentation, position confirmed against a photograph |
| `documented_type_approximate_position` | Part type from documentation, position approximated |
| `documented_type_unverified_position` | Part type from documentation, position not verified |
| `photo_grounded` | Type and position both established from a photograph |
| `photo_approximation` | Reconstructed from photographs, not measured |
| `illustrative` | Shown to convey a relationship; not an accuracy claim |
| `virtual_route` | Not physical geometry. A signal relationship drawn between endpoints, whose physical cable route is not asserted |

`virtual_route` components carry a `limits` string forbidding their promotion to
a confirmed cable route. Keep that in place.

## Enforced invariants

`scripts/fmp_model_contract.js` fails the release when any catalog breaks one of
these. It runs inside `npm run verify:fmp` and the live hygiene probe.

1. Required top-level and per-component fields are present and non-empty.
2. `component_id` is unique within its catalog.
3. `confidence` is a value from the table above.
4. `geometry_status` is a value from the table above.
5. Every `source_ids` entry resolves to a source declared by that catalog.
6. A component stating evidence — any confidence other than `Unknown` — cites at
   least one source.

The gate checks structure and internal consistency. It does not check whether a
claim about the equipment is true, and it does not check rendered behaviour,
geometry accuracy, or anything about the physical rig.

## Changing the vocabulary

Add the value here with its meaning in the same change that introduces it
upstream, so the gate and the artifact stay in step.

Retiring a value is a two-step, because the gate and the artifact land in
different repositories: correct it in `fmp-suite` and export, then drop the row
here. Do both in one change to this repository — the export and the gate travel
together, so `verify:fmp` never sees a half-applied correction.
