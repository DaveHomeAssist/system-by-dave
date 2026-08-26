# Throwline Pilot Catalog Safety Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the pilot projector/lens workbook as an exact offline catalog while preventing every pilot and unmatched legacy record from silently driving automatic throw calculations.

**Architecture:** Store the normalized workbook data in a canonical versioned JSON file, inject synchronized snapshots into the self-contained planner and Stage 3D companion, and route all automatic math through one eligibility decision. Exact official profiles remain searchable with evidence while manual and job-scoped field calibration are the only calculation paths until an exact approved image-width profile is added.

**Tech Stack:** Static HTML/CSS, browser JavaScript, JSON, dependency-free Node.js scripts, existing release verifiers, Playwright CLI, GitHub Actions and GitHub Pages.

---

## File map

- Create `ProjectorThrow/data/throwline-pilot-catalog.v1.json`: canonical normalized workbook data and authority metadata.
- Create `scripts/sync_throwline_catalog.js`: inject and check bounded inline catalog snapshots.
- Modify `ProjectorThrow/index.html`: exact catalog selection, centralized eligibility, gated calculations, manual and field modes, migration, evidence UI.
- Modify `ProjectorThrow/Stage3D.html`: synchronized catalog snapshot, gated optical geometry, manual-demo labeling, validated transfer state.
- Modify `scripts/verify_throwline_release.js`: data integrity, synchronization, runtime policy, migration, and UI contracts.
- Modify `package.json`: add catalog sync/check commands to the existing verification workflow.
- Modify `CHANGELOG.md`: document the limited-beta catalog and safety cutover.

### Task 1: Canonical pilot catalog and integrity contracts

**Files:**
- Create: `ProjectorThrow/data/throwline-pilot-catalog.v1.json`
- Modify: `scripts/verify_throwline_release.js`

- [ ] **Step 1: Add failing catalog assertions**

Add a JSON reader and contracts before the catalog exists:

```js
const catalog = readJson('ProjectorThrow/data/throwline-pilot-catalog.v1.json');
assert.equal(catalog.schemaVersion, 1);
assert.equal(catalog.meta.sourceWorkbookSha256, '4a70b2b553df12beee1373592e251e30ed1d84257304848b9c32cbc1e3ea818d');
assert.deepEqual(catalog.meta.counts, {
  manufacturers: 5, projectors: 4, lenses: 13, compatibility: 13,
  opticalProfiles: 8, sources: 13, researchExceptions: 6
});
assert.equal(catalog.meta.calculationReadyCount, 0);
```

Validate unique IDs, compatibility/profile foreign keys, finite ordered ratios, and require every pilot profile to have `calculationState !== 'verified_image_width'` and `automaticCalculationAllowed === false`.

- [ ] **Step 2: Run the focused verifier and witness failure**

Run: `npm run verify:throwline`

Expected: FAIL because `throwline-pilot-catalog.v1.json` does not exist.

- [ ] **Step 3: Normalize the workbook into canonical JSON**

Create the catalog with this top-level shape and preserve every populated workbook field:

```json
{
  "schemaVersion": 1,
  "meta": {
    "catalogId": "throwline-pilot-2026-08-24",
    "authorityPolicy": "deep-research-2026-08-25",
    "sourceWorkbook": "Throwline_Projector_Lens_Database_Pilot.xlsx",
    "sourceWorkbookSha256": "4a70b2b553df12beee1373592e251e30ed1d84257304848b9c32cbc1e3ea818d",
    "verifiedOn": "2026-08-24",
    "calculationReadyCount": 0,
    "counts": {}
  },
  "manufacturers": [],
  "projectors": [],
  "lenses": [],
  "compatibility": [],
  "opticalProfiles": [],
  "sources": [],
  "researchExceptions": []
}
```

Map workbook quality to `manufacturer_unspecified`, `conflicting`, or `partial`. Preserve workbook `throw_ratio_basis` as `reportedThrowRatioBasis`; set `automaticCalculationAllowed` to `false` on all eight profiles.

- [ ] **Step 4: Run catalog integrity verification**

Run: `npm run verify:throwline`

Expected: PASS for catalog counts, uniqueness, foreign keys, ratios, and eligibility.

- [ ] **Step 5: Commit the canonical catalog**

```powershell
git add -- ProjectorThrow/data/throwline-pilot-catalog.v1.json scripts/verify_throwline_release.js
git commit -m "data: add gated Throwline pilot catalog"
```

### Task 2: Deterministic offline embedding

**Files:**
- Create: `scripts/sync_throwline_catalog.js`
- Modify: `ProjectorThrow/index.html`
- Modify: `ProjectorThrow/Stage3D.html`
- Modify: `scripts/verify_throwline_release.js`
- Modify: `package.json`

- [ ] **Step 1: Add failing snapshot synchronization contracts**

Require both HTML files to contain these exact markers:

```html
<!-- THROWLINE_CATALOG_START -->
<script id="throwlineCatalog" type="application/json">...</script>
<!-- THROWLINE_CATALOG_END -->
```

Require `npm run check:throwline-catalog` to exit nonzero when either payload differs from the canonical JSON.

- [ ] **Step 2: Run the focused verifier and witness failure**

Run: `npm run verify:throwline`

Expected: FAIL with missing catalog snapshot and sync-command messages.

- [ ] **Step 3: Implement the dependency-free synchronization script**

Implement `scripts/sync_throwline_catalog.js` with `fs.readFileSync`, stable `JSON.stringify(catalog)`, marker replacement, and `--check` mode:

```js
const check = process.argv.includes('--check');
const payload = JSON.stringify(JSON.parse(fs.readFileSync(source, 'utf8')))
  .replace(/</g, '\\u003c');
const block = `<!-- THROWLINE_CATALOG_START -->\n<script id="throwlineCatalog" type="application/json">${payload}</script>\n<!-- THROWLINE_CATALOG_END -->`;
```

In check mode, report every stale target and exit 1 without writing. In sync mode, update only the bounded marker block.

- [ ] **Step 4: Add initial marker blocks and package commands**

Add:

```json
"sync:throwline-catalog": "node scripts/sync_throwline_catalog.js",
"check:throwline-catalog": "node scripts/sync_throwline_catalog.js --check"
```

Run the sync command, then make `verify:throwline` execute the check before the release verifier.

- [ ] **Step 5: Verify idempotence and stale detection**

Run twice:

```powershell
npm run sync:throwline-catalog
npm run check:throwline-catalog
git diff --exit-code -- ProjectorThrow/index.html ProjectorThrow/Stage3D.html
```

Expected: first sync writes snapshots, second check passes, and a subsequent sync produces no diff.

- [ ] **Step 6: Commit offline embedding**

```powershell
git add -- ProjectorThrow/index.html ProjectorThrow/Stage3D.html scripts/sync_throwline_catalog.js scripts/verify_throwline_release.js package.json
git commit -m "build: embed Throwline pilot catalog"
```

### Task 3: Planner eligibility and exact catalog selection

**Files:**
- Modify: `ProjectorThrow/index.html`
- Modify: `scripts/verify_throwline_release.js`

- [ ] **Step 1: Add failing centralized-policy contracts**

Assert the planner defines and uses these boundaries:

```js
function parseCatalog() {}
function eligibleProfile(profile) {}
function resolveCatalogSelection(projectorId, lensId) {}
function calculationInputFor(state) {}
```

Require exact-projector and evidence UI IDs, a calculation-blocked status, legacy mapping, and forbid brand-name or confidence-string checks inside `eligibleProfile`.

- [ ] **Step 2: Run the verifier and witness failure**

Run: `npm run verify:throwline`

Expected: FAIL for missing eligibility boundaries and exact catalog controls.

- [ ] **Step 3: Parse and validate the embedded catalog**

Parse `#throwlineCatalog`, validate schema version/counts, freeze catalog arrays and ID maps, and return a fail-closed result:

```js
function eligibleProfile(profile) {
  if (!profile) return { state: 'manual', automatic: false, reason: 'Custom ratio requires manual input.' };
  if (profile.automaticCalculationAllowed === true && profile.calculationState === 'verified_image_width') {
    return { state: 'verified_image_width', automatic: true, reason: 'Exact image-width basis approved.' };
  }
  return { state: profile.calculationState || 'manufacturer_unspecified', automatic: false, reason: profile.calculationGateReason };
}
```

- [ ] **Step 4: Add exact projector, compatible lens, and evidence controls**

Populate projectors by manufacturer, filter lenses through exact compatibility rows, and render raw ratio, reported basis, quality, source, verification date, and related exception messages. Keep legacy families in a `Legacy reference · calculation blocked` group.

- [ ] **Step 5: Gate automatic state construction**

Return one of three calculation inputs:

```js
{ mode: 'verified', min, max, profileId }
{ mode: 'manual', min, max }
{ mode: 'field_verified', min: observedRatio, max: observedRatio }
```

For a gated source-backed selection, return `null`, leave raw evidence visible, clear automatic ratio inputs, suppress throw/readout/zoom/placement geometry, and keep independent brightness and field forms available.

- [ ] **Step 6: Gate solver, finder, summaries, and exports**

Filter automatic candidates with `eligibleProfile(profile).automatic`. Label every manual result `MANUAL · UNVERIFIED`, every job-scoped measured result `FIELD CALIBRATED`, and every blocked official selection with its gate reason.

- [ ] **Step 7: Verify planner contracts**

Run: `npm run verify:throwline && npm run verify:av`

Expected: both PASS.

- [ ] **Step 8: Commit planner cutover**

```powershell
git add -- ProjectorThrow/index.html scripts/verify_throwline_release.js
git commit -m "feat: gate Throwline catalog calculations"
```

### Task 4: Saved-state and field-calibration migration

**Files:**
- Modify: `ProjectorThrow/index.html`
- Modify: `scripts/verify_throwline_release.js`

- [ ] **Step 1: Add failing migration contracts**

Require schema-4 load behavior to distinguish source-backed legacy selections from custom ratios. Add verifier fixtures showing:

```js
migrate({ lensId: 'legacy-known', trA: 1.1, trB: 1.7 }).mode === 'blocked'
migrate({ lensId: '', trA: 1.1, trB: 1.7 }).mode === 'manual'
```

Require field calibration to stay job-scoped and require a valid stamp before becoming a calculation input.

- [ ] **Step 2: Run the verifier and witness failure**

Run: `npm run verify:throwline`

Expected: FAIL for missing fail-safe migration and field-calibration eligibility.

- [ ] **Step 3: Implement fail-safe migration**

Resolve known old built-in IDs to `legacy_unverified`, ignore stored `a`/`z` as automatic inputs when a source-backed lens is gated, announce the migration, and preserve the original saved object until the user saves again. Treat ratio-only URLs as manual simulations.

- [ ] **Step 4: Implement job-scoped field calibration**

Require positive actual distance and image width plus the existing field stamp. Use the observed ratio only in current calculation state, label it `FIELD CALIBRATED`, serialize measurements with the job, and never update catalog/profile data.

- [ ] **Step 5: Verify migration and field behavior**

Run: `npm run verify:throwline`

Expected: PASS for blocked legacy selections, manual ratio-only URLs, and stamped field calibration.

- [ ] **Step 6: Commit migration**

```powershell
git add -- ProjectorThrow/index.html scripts/verify_throwline_release.js
git commit -m "fix: migrate Throwline jobs through safety gate"
```

### Task 5: Stage 3D policy parity

**Files:**
- Modify: `ProjectorThrow/Stage3D.html`
- Modify: `scripts/verify_throwline_release.js`

- [ ] **Step 1: Add failing Stage 3D policy contracts**

Require Stage 3D to validate catalog/profile IDs, expose calculation mode, label direct-open as manual simulation, and use one `opticalGeometryAllowed()` decision before creating beam, projected-image, spill, or missing-coverage objects.

- [ ] **Step 2: Run the verifier and witness failure**

Run: `npm run verify:throwline`

Expected: FAIL for missing Stage 3D policy parity.

- [ ] **Step 3: Implement gated scene behavior**

For gated profiles, preserve screen, projector, room, cameras, placement controls, and non-optical export while removing optical geometry and replacing fit verdicts with the gate reason. Direct-open remains functional as `MANUAL SIMULATION` and never shows a manufacturer-verified badge.

- [ ] **Step 4: Validate planner transfer state**

Transfer exact projector/profile IDs and calculation mode in the URL. Re-resolve IDs against the embedded snapshot and reject a query that claims verified mode for an ineligible profile.

- [ ] **Step 5: Verify Stage 3D contracts and syntax**

Run:

```powershell
npm run verify:throwline
node --check ProjectorThrow/three-d-stage.js
```

Expected: PASS and syntax exit code 0.

- [ ] **Step 6: Commit Stage 3D parity**

```powershell
git add -- ProjectorThrow/Stage3D.html scripts/verify_throwline_release.js
git commit -m "feat: enforce Throwline gate in Stage 3D"
```

### Task 6: Release documentation and complete verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `scripts/verify_throwline_release.js`
- Modify: `sitemap.xml` only if regeneration changes it

- [ ] **Step 1: Add the release note contract and witness failure**

Require the changelog to name the pilot catalog, exact compatibility, calculation gate, manual simulation, field calibration, migration, and Stage 3D suppression behavior. Run `npm run verify:throwline` and confirm it fails before updating the changelog.

- [ ] **Step 2: Add the dated release entry**

Document record counts, zero calculation-ready pilot profiles, the authority override, and the fact that official raw ratios remain visible without automatic math.

- [ ] **Step 3: Run the complete local verification matrix**

Run:

```powershell
npm run sync:throwline-catalog
npm run check:throwline-catalog
npm run verify:throwline
npm run verify:av
npm run verify:gear-reference
npm run verify:indexing
npm run verify:portfolio-schemas
npm run verify:public-navigation
npm run verify:noteforge
npm run typecheck:av-workbook
npm run test:av-workbook
npm run build:av-workbook
npm audit --audit-level=high
python scripts/gen_sitemap.py
git diff --exit-code -- av-workbook sitemap.xml
git diff --check
```

Expected: all commands PASS and generated files are current.

- [ ] **Step 4: Run browser acceptance**

Use Playwright CLI at desktop and 390 x 844 in light and dark themes. Verify gated exact selection, legacy URL migration, manual simulation, stamped field calibration, solver exclusion, evidence/source disclosure, Stage 3D optical suppression, direct manual demo, keyboard/focus behavior, no overflow, and zero console errors.

- [ ] **Step 5: Commit the release**

```powershell
git add -- CHANGELOG.md scripts/verify_throwline_release.js sitemap.xml
git commit -m "docs: release Throwline pilot catalog"
```

### Task 7: Integrate and deploy

- [ ] **Step 1: Verify the feature branch is clean and review commits**

Run: `git status --short --branch && git log --oneline main..HEAD`

Expected: clean branch containing the design, plan, catalog, runtime, migration, Stage 3D, and release commits.

- [ ] **Step 2: Fast-forward local main and verify again**

Update local `main`, fast-forward merge the feature branch, and rerun `npm run verify:throwline && npm run verify:av && npm run check:throwline-catalog`.

- [ ] **Step 3: Push main and monitor GitHub Pages**

Push `origin/main`, watch `.github/workflows/deploy-pages.yml` to successful completion, and inspect failed logs before any corrective change if the run does not pass.

- [ ] **Step 4: Production smoke test**

Use cache-busted production URLs for `/ProjectorThrow/` and `/ProjectorThrow/Stage3D.html`. Confirm the catalog ID, calculation gate, manual/field state labels, mobile width, touch targets, and zero console errors.

- [ ] **Step 5: Remove the merged feature branch and temporary worktree**

Delete only the fully merged local feature branch and its exact registered worktree path after production verification passes.
