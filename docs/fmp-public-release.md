# FMP public suite release

`/fmp/` is the FMP video operations hub. It contains the publicly reachable
camera commissioning frontend, bowl camera training, and a source-backed camera
rig explorer. `/fmpwalk/` is the separate local-first preshow venue walk.

Public page access does not grant crew roles. Camera API access still requires a
Google ID token and server-side authorization. Noindex is discovery policy, not
access control.

## Product boundaries

- `/fmp/`: choose a camera position or open Walk, Learn, and Setup.
- `/fmp/camera/...`: owner-bound drafts and explicit authenticated operational
  actions. SETUP TEST remains mandatory until live acceptance is complete.
- `/fmpwalk/`: venue route, readings, faults, photos, and report preparation.
  Browser storage is local-first; download, Gmail, and Notion actions each require
  a separate explicit confirmation.
- `/fmp/guide/`: training only. Tonight's director, stage plot, restrictions, and
  verified assignments control.
- `/fmp/rig/`: read-only 3D/photo equipment reference. It does not report live
  status or establish serial numbers, fitted state, signal health, or access.

Opening one workflow does not copy, submit, or reinterpret another workflow's
records. The old owner-only Site remains available for its origin-local drafts;
those drafts are not migrated, removed, or published.

## Managed source

Canonical app: `DaveHomeAssist/fmpwalk`. Do not hand-edit generated `fmp/` or
`fmpwalk/` files. From a clean, committed canonical checkout run:

```sh
node scripts/export-public-camera.mjs /absolute/path/to/system-by-dave
```

The exporter checks destination identity and writes two exact allowlists.
`fmp/source_provenance.json` and `fmpwalk/source_provenance.json` pin the same
canonical source commit, individual SHA-256 values, release mode, and a combined
artifact digest. Repeated generation must be byte-identical. `npm run verify:fmp`
rejects drift, extras, missing physical routes, changed release modes, remote rig
runtime dependencies, or missing public metadata. It runs in the Pages pipeline.

The FMP release includes only client modules, shells, local Three.js runtime,
allowlisted rig reference photos, and route metadata. It excludes backend code,
credentials, dated event/crew/fault snapshots, private atlas/plant records,
private documents, and source maps. Third-party audience photos are linked, not
copied. No FMP service worker or new offline cache is registered; protected API
responses are never bundled for offline use.

## Commissioning gates

1. Add the exact `https://systembydave.com` JavaScript origin to the existing FMP
   Google client. No path, new client, or browser client secret is needed. This
   origin is required independently for walk Gmail and camera Google sign-in.
2. Share the existing Events, Crew Calls, Faults, Walk Reports, and Cameras
   reference page with the dedicated FMP Walk internal Notion connection. The
   deployment token remains in Google Secret Manager. Codex connector access is
   separate.
3. Sign in with an explicitly authorized operations account. Verify context reads,
   a synthetic SETUP TEST check-in, fault photo, checkout, and exact Notion
   readback from a camera route.
4. In a separate walk acceptance, verify a reviewed synthetic report download,
   Gmail Sent receipt, Notion record, files, linked faults, and exact readback.
5. Retain SETUP TEST and partial-verification language until the applicable gates
   pass. A deployed URL, health response, or mocked browser test is not evidence
   of a successful live save or email delivery.

## Release checks and recovery

Run `npm run verify:fmp`, indexing/navigation/consistency checks, and the complete
Pages workflow. Canonical `npm run check` plus the walk, camera, and public browser
harnesses cover app behavior, routes, viewport containment, local guide assets,
themes, and zero-write loading. Verify every live route and compare the published
provenance commit/hashes after deployment.

Rollback only the FMP release commit through a normal revert/release, retaining
other site changes. Never clear Notion records, retry journals, browser drafts, or
walk photos as part of a frontend rollback.
