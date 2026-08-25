# Throwline Projector Reference Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the supplied 13-projector appendix as offline reference evidence without changing the four audited projectors, exact compatibility, optical profiles, selectors, or any calculation path.

**Architecture:** Add a provenance-bearing `projectorReferenceAppendix` object to the canonical catalog. Its 13 raw rows are embedded in both Throwline pages by the existing sync script but are deliberately ignored by runtime selectors and planning inputs. Strengthen the release verifier so the audited pilot arrays are content-frozen and the nine reference-only IDs cannot enter compatibility or optical profiles.

**Tech Stack:** Static JSON, dependency-free CommonJS verification and sync scripts, self-contained browser HTML, GitHub Pages.

---

### Task 1: Add the failing quarantine contract

**Files:**
- Modify: `scripts/verify_throwline_release.js`
- Test: `scripts/verify_throwline_release.js`

- [ ] **Step 1: Define immutable pilot and appendix expectations**

Add constants for the supplied attachment SHA-256, the 13 reference IDs, the nine non-canonical IDs, and these canonical array fingerprints:

```js
const APPENDIX_SHA256 = '8afbcad015b0b4ce5d5a2904dac7d5d60d259cc8547940e97224e2656527a674';
const PILOT_ARRAY_SHA256 = {
  projectors: 'a8d02aac67d21ea571f0b0cf0d8735887e36325b0cc7e31fae846b7f5f8eea59',
  lenses: '710a30622899fdd1ef2c9e491298e4fb718f0e06d811585f29d7bb1e237f44e4',
  compatibility: '97e740b4c48ea9913119256a7ea5268f2754ddf98c485daee540aaca604b4085',
  opticalProfiles: 'ebf6e13760a75eb173a9ca76b012da613300b5df36dac08cd71b10f56a750142',
};
```

- [ ] **Step 2: Add verifier assertions**

Require `projectorReferenceAppendix.catalogRole === 'user_supplied_reference_only'`, `automaticPlanningInputsAllowed === false`, the exact source hash, 13 unique IDs and canonical keys, exact overlap IDs `PRJ-001` through `PRJ-004`, exact new IDs `PRJ-005` through `PRJ-013`, existing manufacturer resolution, and zero compatibility/profile references to the nine new IDs. Hash the four canonical arrays with `node:crypto` and reject any mutation.

- [ ] **Step 3: Run the verifier and observe the expected failure**

Run:

```powershell
npm run verify:throwline
```

Expected: FAIL because `projectorReferenceAppendix` does not exist yet.

- [ ] **Step 4: Commit the red contract**

```powershell
git add scripts/verify_throwline_release.js
git commit -m "test: quarantine Throwline projector references"
```

### Task 2: Add the raw reference appendix

**Files:**
- Modify: `ProjectorThrow/data/throwline-pilot-catalog.v1.json`
- Test: `scripts/verify_throwline_release.js`

- [ ] **Step 1: Add appendix provenance and all 13 rows**

Add this top-level shape while preserving the existing pilot arrays byte-for-byte:

```json
"projectorReferenceAppendix": {
  "catalogRole": "user_supplied_reference_only",
  "automaticPlanningInputsAllowed": false,
  "sourceAttachment": "pasted-text.txt",
  "sourceSha256": "8afbcad015b0b4ce5d5a2904dac7d5d60d259cc8547940e97224e2656527a674",
  "receivedOn": "2026-08-24",
  "overlapPolicy": "PRJ-001 through PRJ-004 retain the audited canonical records; appendix rows are raw evidence only.",
  "reviewDisposition": "Do not use lifecycle, brightness, resolution, contrast, lens-system, or confidence claims as planning inputs until field-level provenance is normalized.",
  "rows": []
}
```

Populate `rows` with the 13 supplied records, map the 25 named TSV columns as strings, and discard only the unnamed trailing TSV column. Preserve the supplied values exactly, including the blank `PRJ-008.contrast_ratio` and the unresolved free-text `EXC-007` reference.

- [ ] **Step 2: Run the focused verifier before embedding**

Run:

```powershell
node scripts/verify_throwline_release.js
```

Expected: FAIL only for the two stale embedded catalog snapshots, with no appendix, provenance, immutability, or optical-join contract failures.

- [ ] **Step 3: Commit the canonical appendix**

```powershell
git add ProjectorThrow/data/throwline-pilot-catalog.v1.json
git commit -m "data: add quarantined projector reference appendix"
```

### Task 3: Embed and document the reference data

**Files:**
- Modify: `ProjectorThrow/index.html`
- Modify: `ProjectorThrow/Stage3D.html`
- Modify: `CHANGELOG.md`
- Test: `scripts/sync_throwline_catalog.js`

- [ ] **Step 1: Regenerate both embedded snapshots**

Run:

```powershell
npm run sync:throwline-catalog
```

Expected: both Throwline HTML files update from the canonical JSON.

- [ ] **Step 2: Document the quarantine boundary**

Add a changelog entry stating that the 13-row appendix is embedded reference evidence, the four audited canonical projector records are unchanged, nine new IDs have no compatibility or optical profiles, and no appendix field can drive planning inputs.

- [ ] **Step 3: Run focused green verification**

Run:

```powershell
npm run verify:throwline
```

Expected: PASS with current embedded snapshots and zero calculation-ready profiles.

- [ ] **Step 4: Commit generated snapshots and release notes**

```powershell
git add ProjectorThrow/index.html ProjectorThrow/Stage3D.html CHANGELOG.md
git commit -m "build: embed projector reference appendix"
```

### Task 4: Verify, merge, deploy, and smoke-test

**Files:**
- Verify only: repository and public GitHub Pages deployment

- [ ] **Step 1: Run the complete local quality gates**

Run the Throwline and AV contracts, typecheck, all 15 workbook tests, workbook build, dependency audit, and generated-file checks. Confirm the worktree is clean after restoring any platform-only generated-file churn.

- [ ] **Step 2: Merge to local main and re-run release gates**

Fast-forward `main` from the clean feature branch, verify on the merged result, and confirm `HEAD` is the intended release commit.

- [ ] **Step 3: Push and monitor GitHub Pages**

Push `main`, watch the matching Actions run to a successful Pages deployment, and record the workflow URL and deployed commit.

- [ ] **Step 4: Smoke-test production**

Confirm both public Throwline URLs return HTTP 200, the supplied legacy URL remains `CALCULATION BLOCKED`, Stage 3D still suppresses optical geometry, embedded appendix provenance is present, and browser console errors remain zero.

- [ ] **Step 5: Clean up**

Remove browser artifacts, delete the merged feature worktree and branch, confirm local `main` equals `origin/main`, and capture any durable data-governance finding.
