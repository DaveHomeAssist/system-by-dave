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

### Deprecated values, still present in the current export

These two are accepted so the gate does not fail the shipped artifact. They are
fixed in `fmp-suite` and removed from the allowlist once a release carries the
correction.

| Value | Where | Why it is wrong |
| --- | --- | --- |
| `Published envelope / Photo approximation` | one SuperJoy component | A geometry description placed in the confidence field. The geometry belongs in `geometry_status`; the confidence field takes one vocabulary token. |

`Partial` was removed from this list once fmp-suite `338cf27` resolved it. That
component, `p240.path.video`, is now `Confirmed`: the SDI run was traced on site
rather than relabelled, and `evidence_policy.sdi_physical_route` records the
trace and who installed it. Getting the evidence is the better fix whenever it
is available.

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
3. `confidence` is a value from the table above, including the deprecated pair.
4. `geometry_status` is a value from the table above.
5. Every `source_ids` entry resolves to a source declared by that catalog.
6. A component stating evidence — any confidence other than `Unknown` — cites at
   least one source.

The gate checks structure and internal consistency. It does not check whether a
claim about the equipment is true, and it does not check rendered behaviour,
geometry accuracy, or anything about the physical rig.

## Changing the vocabulary

Add the value here with its meaning in the same change that introduces it
upstream, so the gate and the artifact stay in step. Removing a deprecated value
is a two-step: land the correction in `fmp-suite` and export it, then drop the
row and its allowlist entry here.
