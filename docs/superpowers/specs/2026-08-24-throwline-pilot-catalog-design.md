# Throwline Pilot Catalog Safety Cutover

## Status

Approved in conversation on 2026-08-24. This specification governs the first import from `Throwline_Projector_Lens_Database_Pilot.xlsx` and makes the later deep-research report the authority for calculation eligibility.

## Goal

Import the pilot workbook as an exact, source-linked projector and lens catalog without allowing any workbook or legacy record to silently perform width-based throw calculations unless an exact profile is explicitly approved for that basis.

Throwline must remain useful offline. Gated official records stay searchable and informative, custom/manual simulation remains available with explicit warnings, field measurement remains available, and existing saved jobs and URLs fail safe instead of silently changing meaning.

## Source disposition

### Pilot workbook

The supplied workbook contains:

- 5 manufacturer records
- 4 projector records
- 13 lens records
- 13 exact compatibility records
- 8 optical profiles
- 13 source records
- 6 research exceptions

Its foreign keys are complete, IDs are unique, and it contains no formulas. It contains no Christie projector or lens profile.

### Authority conflict

Four workbook profiles describe an image-width basis: three Panasonic PT-RQ50K profiles and one Epson Pro L30000UNL profile. The newer deep-research report states that only 45 exact Christie profiles in the completed research build are currently approved for automatic image-width calculations. The user selected the report as the global safety authority.

Therefore:

- all eight pilot profiles are calculation-blocked;
- every current broad built-in lens row is calculation-blocked unless it is later matched to an exact approved profile;
- current broad Christie rows are also blocked because the pilot does not contain the 45 exact approved Christie profiles;
- workbook basis text is retained verbatim as evidence but does not grant eligibility;
- no ratio is discarded, estimated, averaged, or silently corrected.

## Safety model

Every selectable ratio source has one calculation state:

| State | Meaning | Automatic throw math | Solver/finder | Source badge |
|---|---|---:|---:|---|
| `verified_image_width` | Exact profile is on the approved image-width allowlist | Yes | Yes | Verified |
| `manufacturer_unspecified` | Official numeric ratio, denominator not approved | No | No | Official, gated |
| `conflicting` | Official evidence conflicts | No | No | Conflict |
| `partial` | Compatibility or optics are incomplete | No | No | Partial |
| `legacy_unverified` | Existing broad family row lacks exact approved mapping | No | No | Legacy reference |
| `manual` | Operator entered a custom ratio | Yes, as simulation | No by default | Manual, unverified |
| `field_verified` | Current job has a valid measured distance and image width | Yes for that job only | No catalog promotion | Field calibrated |

Only `verified_image_width`, `manual`, and `field_verified` can produce throw geometry. Manual results must never receive a manufacturer-verified badge. Field verification applies only to the current job and never mutates catalog eligibility.

## Catalog architecture

### Canonical normalized source

Add `ProjectorThrow/data/throwline-pilot-catalog.v1.json` containing normalized arrays for manufacturers, projectors, lenses, compatibility rows, optical profiles, sources, and research exceptions. Preserve the workbook IDs and raw evidence fields. Add catalog metadata containing:

- schema version;
- source workbook filename;
- source workbook SHA-256;
- source verification date;
- authority policy identifier;
- record counts;
- calculation-ready count, which is zero for this pilot.

The local workbook itself is not committed. The normalized JSON is the reviewable source artifact.

### Offline embedding

The main planner must remain a single self-contained offline HTML file. Add a dependency-free Node script, `scripts/sync_throwline_catalog.js`, which injects the canonical JSON into a bounded `application/json` block in `ProjectorThrow/index.html`. The Stage 3D companion receives the same policy snapshot so direct-open behavior cannot bypass the gate.

The sync script supports `--check`. CI and the release verifier fail if either embedded snapshot differs from the canonical JSON. The runtime validates schema version and counts before exposing catalog records.

### Runtime boundaries

Keep catalog parsing and eligibility decisions separate from presentation and calculation:

1. `parseCatalog()` validates the embedded payload and creates immutable maps by ID.
2. `eligibleProfile(profile)` returns a calculation state and reason; it never performs math.
3. `resolveSelection(projectorId, lensId)` returns exact compatibility, profiles, evidence, and exceptions.
4. `readState()` receives only an approved calculation input or an explicit manual/field input.
5. Solver, finder, readout, drawing, Stage 3D, summaries, and exports consume the same eligibility result.

No renderer or UI component may independently infer eligibility from manufacturer name, confidence wording, ratio text, or aspect ratio.

## Planner experience

### Exact selection

The Projector & Lens section adds an exact-projector selector backed by the catalog. The lens selector shows only officially compatible lenses for that exact projector. Each choice exposes:

- manufacturer and exact model;
- raw official throw-ratio range;
- supported aspect or condition text;
- data-quality and calculation state;
- source link and verification date;
- applicable exception warnings.

Legacy broad family rows remain available under a clearly labeled reference group, but selecting them does not populate calculation inputs.

### Gated selection

Selecting a gated profile:

- displays the official ratio as read-only evidence;
- clears or disables automatic ratio inputs;
- shows `CALCULATION BLOCKED · BASIS UNVERIFIED`, `CONFLICT`, or `PARTIAL` as appropriate;
- suppresses automatic set marks, zoom envelopes, placement verdicts, source-verified status, and lens-solver participation;
- keeps screen, brightness, inventory, source, exception, and field-measurement workflows available where independent of throw math;
- provides a direct link to the primary source when available.

The user may switch to Custom throw ratio and enter values manually. That is a new explicit manual simulation, not an override of the catalog record.

### Manual and field modes

Custom ratio inputs continue to calculate, but all relevant results, summaries, drawings, saved jobs, and exports say `MANUAL · UNVERIFIED`. Manual entries are excluded from the manufacturer-sourced finder unless stored in the existing custom library and explicitly requested.

Actual optical distance divided by measured image width remains valid field evidence. Once both values are valid and the operator stamps the field check, the current job may use the measured ratio as `FIELD CALIBRATED`. This does not alter the selected catalog profile or make it solver-eligible.

### Saved state migration

Schema-4 URLs and saved jobs continue to load. Migration rules are fail-safe:

- a known exact catalog selection resolves normally but remains gated unless eligible;
- an old built-in lens ID resolves to a `legacy_unverified` reference record;
- stored `a` and `z` ratio parameters are ignored as automatic inputs when paired with a gated source-backed lens;
- a URL with no source-backed lens selection may load its numeric ratios as manual simulation;
- the UI announces when a legacy saved selection has been gated;
- migration never rewrites or deletes the original saved job without an explicit save.

## Stage 3D behavior

Stage 3D uses the same calculation state as the planner.

- `verified_image_width`, `manual`, and `field_verified` states may render projection geometry.
- Gated source-backed states render the screen, projector, room, cameras, and placement controls, but suppress beam volume, projected-image boundary, spill/missing-coverage geometry, and fit verdicts derived from the ratio.
- The HUD displays the raw official ratio and the gate reason.
- Direct-open demo mode is explicitly `MANUAL SIMULATION`; it must not claim manufacturer verification.
- URL transfer from the planner includes the calculation state and exact profile IDs. Stage 3D validates them against its embedded snapshot instead of trusting query text.
- OBJ/GLB export remains available for non-optical scene objects in a gated state; exports must not include fabricated beam geometry.

## Error handling

If the embedded catalog is missing, malformed, out of sync, or uses an unsupported schema version:

- source-backed selectors fail closed;
- manual mode remains available;
- a persistent catalog-unavailable notice appears;
- solver and source-verified claims remain disabled;
- no stored job or catalog data is deleted.

Broken source URLs do not unlock calculations. A source fetch is never required at runtime because the planner remains offline-capable.

## Verification strategy

### Data contracts

Extend `scripts/verify_throwline_release.js` or add a focused verifier that checks:

- expected record counts and workbook fingerprint;
- unique IDs and all foreign keys;
- exact compatibility joins;
- finite, positive, ordered raw ratios;
- declared quality and calculation states;
- zero calculation-ready pilot profiles;
- conflicts and partial records cannot become eligible;
- embedded catalog snapshots match the canonical JSON;
- legacy rows are `legacy_unverified`;
- only the centralized eligibility function grants automatic math.

### Behavioral contracts

Add failing tests before implementation for:

- gated pilot selection does not populate automatic ratio inputs;
- gated legacy URL does not calculate;
- manual ratio mode calculates and labels every output unverified;
- field-calibrated mode is job-scoped;
- solver and finder exclude gated records;
- source and exception details remain accessible;
- gated Stage 3D suppresses optical geometry;
- direct Stage 3D demo is labeled manual;
- old jobs and hashes load without data loss;
- invalid catalog payload fails closed.

### Browser acceptance

Verify desktop and 390-pixel phone layouts in light and dark themes. Exercise exact projector/lens selection, gated profile evidence, manual simulation, field calibration, saved-job migration, Stage 3D transfer, keyboard navigation, screen-reader status updates, touch targets, overflow, and console errors.

### Release verification

The complete release must pass Throwline, AV suite, theme, syntax, generated-file, security, and GitHub Pages checks. Production smoke tests must confirm the gate on both the main planner and Stage 3D.

## Out of scope

- Claiming the pilot workbook is the completed 156-profile build.
- Reconstructing the missing Christie 45-profile allowlist from broad legacy rows.
- Estimating denominator semantics from manufacturer naming conventions.
- Fetching or scraping manufacturer sites at runtime.
- Changing catalog eligibility from the browser.
- Deleting the legacy library or saved user data.
- Importing the unresolved `sandbox:/mnt/data` links from the report.

## Acceptance criteria

The feature is complete when the pilot catalog is available offline with exact compatibility and evidence, no pilot or unmatched legacy record can silently drive automatic throw math, manual and field workflows remain explicit and usable, Stage 3D follows the same policy, old saved state fails safe, all automated and browser checks pass, and the deployed production site exposes no calculation path that bypasses the centralized eligibility decision.
