# Throwline pilot catalog contract

`ProjectorThrow/data/throwline-pilot-catalog.v1.json` holds the projector and
lens data Throwline plans from. This file documents the vocabularies that data
uses and the invariants `scripts/verify_throwline_release.js` enforces.

It exists because two evidence vocabularies were in use here and neither was
written down. The pilot catalog design spec mentions "confidence wording" but
never says what the values mean, and one of the two is not checked by any gate.

## What the catalog contains

| Array | Rows | What it is |
| --- | --- | --- |
| `manufacturers` | 4 | Manufacturer records |
| `projectors` | 4 | Audited canonical projector records, `PRJ-001`–`PRJ-004` |
| `lenses` | 13 | Lens records |
| `compatibility` | 13 | Which lens fits which projector |
| `opticalProfiles` | 12 | Throw and shift behaviour for a projector and lens together |
| `sources` | 18 | Cited documents |
| `researchExceptions` | 9 | Known unresolved questions, recorded rather than hidden |
| `projectorReferenceAppendix` | — | Raw evidence rows, **not** planning inputs |

The pilot arrays are frozen: the verifier fails if their counts change, if an ID
is missing or duplicated, or if a row differs from the frozen pilot. Any catalog
edit has to be re-pinned deliberately.

## `confidence` — not gate-enforced

Every projector, lens, compatibility and optical-profile row carries
`confidence`. Three values are in use:

| Value | Meaning |
| --- | --- |
| `official_primary` | Taken from the manufacturer's own datasheet, manual or product page |
| `needs_verification` | Recorded, but no primary source has confirmed it |
| `conflicting` | Primary sources disagree, and the disagreement has not been resolved |

**The verifier requires the field to be present but does not constrain its
value.** A typo, or a fourth value introduced by accident, passes today. Treat
this list as the intended vocabulary and keep to it; if the values are ever
gated, gate them against this table.

## `calculationState` — gate-enforced

Optical profiles that are blocked from automatic calculation carry
`calculationState`, and the verifier accepts exactly three values:

| Value | Meaning |
| --- | --- |
| `manufacturer_unspecified` | The manufacturer does not publish the figure needed |
| `conflicting` | Sources disagree on the figure |
| `partial` | Some of the needed figures exist, not all |

A profile carrying any of these must also set `automaticCalculationAllowed` to
`false`. The point is that Throwline will refuse to compute a throw rather than
computing one from a number nobody stands behind.

## The appendix is evidence, not planning data

`projectorReferenceAppendix` rows use a fixed ordered 25-field schema and are
raw research output. Two rules the verifier enforces:

- `PRJ-001` through `PRJ-004` keep their audited canonical records. Appendix
  rows covering the same projectors are evidence only and do not override them.
- No `compatibility` row and no `opticalProfile` may reference an appendix-only
  projector.

The catalog states the disposition in its own words: do not use lifecycle,
brightness, resolution, contrast, lens-system or confidence claims from the
appendix as planning inputs until field-level provenance is normalized.

## Other enforced invariants

`scripts/verify_throwline_release.js` also fails when:

1. Any `compatibility` row references a projector or lens that does not exist.
2. Any `opticalProfile` references a missing projector, lens or compatibility
   row, or names a compatibility row for a different projector or lens.
3. The count of calculation-ready profiles differs from the pinned list.
4. A page's embedded catalog snapshot is missing, invalid, or out of step with
   the catalog file.

## Relationship to the site's other evidence vocabularies

There are four, and they are different on purpose.

| Where | Field | Values |
| --- | --- | --- |
| FMP equipment catalogs | `confidence` | `Confirmed` `Documented` `Reported` `Inferred` `Unknown` `Contradicted` |
| Gear Reference | `accuracy[].status` | `confirmed` `corrected` `unverified` `estimate` |
| Throwline catalog | `confidence` | `official_primary` `needs_verification` `conflicting` |
| FMP house reference | `Confidence` | `Paper only` `Unidentified` |

Throwline's asks *how authoritative is the source behind this number*, which is
why `official_primary` names the kind of document rather than the strength of
the claim. `conflicting` here is the same idea as `Contradicted` in the FMP
catalogs.

See `docs/fmp-model-catalog-contract.md` and `docs/gear-reference-contract.md`.

## Changing a vocabulary

Add the value to the table above in the same change that introduces it in the
data, so this document and the catalog never disagree. If `confidence` is ever
gated, add the allowlist to `scripts/verify_throwline_release.js` and note here
that it is enforced.
