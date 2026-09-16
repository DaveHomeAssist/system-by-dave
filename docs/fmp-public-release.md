# FMP public camera release

`/fmp/` is a publicly reachable commissioning frontend. Operational API access
still requires a Google ID token and server-side authorization. Public page
access does not grant crew roles. Noindex is discovery policy, not access control.

The existing preshow Walk link, `/fmp-index/`, and old owner-only Site are retained.
The old Site's drafts are origin-local and are not migrated, removed or published.
Only the camera workspace, public entry shell and external reference links ship in
this release. The full atlas/map and coverage planner overhaul is not yet shipped.

## Managed source

Canonical app: `DaveHomeAssist/fmpwalk`. Do not hand-edit generated `fmp/` files.
From a clean, committed canonical checkout run:

```sh
node scripts/export-public-camera.mjs /absolute/path/to/system-by-dave
```

The exporter checks destination identity and copies an explicit public allowlist.
`fmp/source_provenance.json` pins the canonical source commit, individual hashes
and combined artifact digest. Repeated generation must be byte-identical.
`npm run verify:fmp` rejects drift, extra files, missing physical routes, changed
commissioning mode or missing public metadata. It runs in the Pages pipeline.

Not exported: backend code, credentials, dated event/crew/fault snapshots, private
atlas/plant records, original photos, private documents or source maps. Third-party
seat photos are linked, not copied. No FMP service worker or new offline cache is
registered; protected API responses are never bundled for offline use.

## Commissioning gates

1. Add the exact `https://systembydave.com` JavaScript origin to the existing FMP
   Google client. No path, new client or browser client secret is needed.
2. Share the existing Events, Crew Calls, Faults, Walk Reports and Cameras reference
   page with the dedicated FMP Walk internal Notion connection. The deployment
   token remains in Google Secret Manager. Codex connector access is separate.
3. Sign in with an explicitly authorized operations account. Verify context reads,
   a synthetic SETUP TEST check-in, fault photo, checkout and exact Notion readback.
4. Retain SETUP TEST restriction until those gates pass. A deployed URL, health
   response or mocked browser test is not evidence of a successful live save.

## Release checks and recovery

Run `npm run verify:fmp`, indexing/navigation/consistency checks and the complete
Pages workflow. Canonical `npm run check` and the camera/public browser harnesses
cover app behavior, routes, viewport containment and themes. Verify live routes
and compare the published provenance/hashes after deployment.

Rollback only the FMP release commit through a normal revert/release, retaining
other site changes. Never clear Notion records, retry journals or browser drafts
as part of a frontend rollback.
