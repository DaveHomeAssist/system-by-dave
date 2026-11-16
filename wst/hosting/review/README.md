# Rehearsal review publication

Canonical navigation and hosting integration live in System by Dave. The
viewer and evidence exporter live in `DaveHomeAssist/frozen-rehearsal-capture`.
The selected WST Site is `appgprj_6aed67f5df688191acf3e2641138818a`, with the existing
`DB` D1 and `REVIEW_PHOTOS` R2 bindings. Preserve its public audience and routes.

## Release procedure

1. Open the current managed source through the Sites source helper. Claim both
   checkouts and preserve unrelated changes. Do not deploy the older generated
   Worker snapshot from this repository over the current managed source.
2. Run the Frozen repository's `tools/build-review-release.mjs` on a qualified
   runner with read-only evidence inputs. Keep outputs and originals outside
   Git. Review `verification.json`, including unresolved context differences.
3. Test the viewer, build `viewer/dist/rehearsal-review.html`, and record its
   committed SHA. Pin the current context/source snapshot in the release.
4. Run `node wst/hosting/scripts/integrate-review.mjs MANAGED VIEWER RELEASE media`
   to add only checksum-allowlisted media routes. The prior viewer stays live.
   Add a temporary secret `REVIEW_UPLOAD_TOKEN` through Sites, then publish
   the helper's pushed and packaged source with the same Site ID.
5. On the runner, run `python3 wst/hosting/scripts/transfer-review.py RELEASE`.
   Supply the temporary token only through its hidden prompt. This uploads
   missing afternoon originals and reads back all 1,644 public originals.
   It rejects a conflicting stored hash and never deletes or rewrites evidence.
6. Remove `REVIEW_UPLOAD_TOKEN` through Sites. Run the installer with `active`
   to replace only the review viewer, activate both manifests and apply the
   canonical Home/Planning navigation. An optional fifth argument selects the
   canonical `wst` directory when the runner has a different layout.
7. Test the packaged Worker, existing task service with synthetic fixtures,
   preserved non-review assets, source checks and responsive browser behavior.
   Use the source helper to commit, push and package the exact source; save and
   publish that version. Verify the public hostname, not only the Sites alias.
8. Record source SHAs, Site version/deployment, release ID, image readback and
   test results in `hosting/deployment.json` and the existing Viewer Spec.

The catalog is uncached; release manifests and original photos have immutable
URLs. Legacy evening photo and `#cue=` links remain usable. Viewer note keys
remain unchanged and local to each browser/session. Context is a published
snapshot with provenance and confidence, not live two-way Notion/Sheets sync.
Unassigned cues and missing or stale images remain explicit.

## Verification

- `node --test wst/hosting/review/handler.test.mjs`
- `node --test wst/workspace.test.mjs`
- `node scripts/test_wst_workspace.cjs` with the qualified cached browser runtime
- `npm run test:frozen-case` and the required public-navigation/consistency gates
- Managed source: build, `scripts/test-review.mjs`, `scripts/test-entries.mjs`,
  and `node --experimental-vm-modules scripts/test-schedule.mjs`
- Frozen source: `FRC_AFTERNOON_ZIP=... npm test`, `npm run build`, and
  `FRC_RELEASE_DIR=... node viewer/test/hosted-browser.cjs`. Set
  `FRC_REVIEW_BASE=https://wst.housevideo.app/run-review/` for live acceptance.
  These browser notes are synthetic and remain only in disposable contexts.

`REVIEW_BASELINE_WORKER` lets managed preservation tests use a separately
retained baseline when the runner has no Git history. The baseline for this
integration is the deployed managed commit `ee20d6068b1ebcdeb99aa6df3e1fa7261baa49e3`.
Never label an unavailable archive fixture or unrun browser check as passed.
