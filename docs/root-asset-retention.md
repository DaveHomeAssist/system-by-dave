# Root asset retention

## Problem and acceptance

A cached page or an open application can request an older hashed bundle after a
new site release. Root Pages staging copies only the current checkout. On
October 30, the previous NoteForge entry and backup chunk URLs returned 404,
while the current entry returned 200. This confirms missing historical assets;
it does not establish data loss in an actual user's open tab.

Retain the previous successful root deployment's committed asset directories in
the staged artifact, without replacing current files or resurrecting old pages.
Use GitHub deployment status as the release source, not the previous Git commit.
An isolated browser must load a lazy chunk across a simulated release switch;
new visits must still use the new page. A third release must not accumulate
assets from two prior source generations.

## Scope

The explicit inventory covers NoteForge, PixelForge, World Cup and Camera
Simulator asset directories, plus the Cheesesteaks Next static tree. It includes
nested fonts, chunks and build manifests. AV console files use stable URLs and
are outside immutable-version compatibility; their offline/update behavior is a
separate contract. Domain publishers retain their existing behavior.

Read deployment metadata only. Select a proven successful main deployment from
the github-pages environment, require its source commit to be available and an
ancestor of the candidate, then read only allowlisted Git blobs. No old HTML,
service worker, saved data or source configuration is restored. Skip removed
applications and retain the current file on any same-path collision. Reject
symlinks, unsafe paths and excessive file/byte totals. Existing private-exposure
and withdrawal gates must run on the final artifact after retention.

This changes publishing source only. It does not authorize a workflow dispatch,
merge, release, deployment, inference call or live stale-tab mutation. Live
post-deployment acceptance remains separate.

## Verification and operating limits

Run `node --test scripts/root_asset_retention.test.mjs` and
`node scripts/probe_root_asset_retention.mjs`. Both run in the existing PR and
Pages checks. The browser probe uses disposable local sites with external
requests blocked. It exercises the old-page failure before retention, repaired
lazy loading after retention, and unchanged new visits.

The publishing step runs `node scripts/root_asset_retention.mjs --stage _site`
after domain staging and before any publisher. It queries GitHub with read-only
deployment permission and a 15-second request timeout, using at most 100 recent
deployment records. Metadata errors, missing Git objects, nonancestor source,
unsafe paths or a size limit fail the workflow before publishing. An empty
complete history has no prior release to retain. Inactive status needs an
explicit prior success receipt. See GitHub's
[deployment statuses](https://docs.github.com/en/rest/deployments/statuses)
and [deployment records](https://docs.github.com/en/rest/deployments/deployments).

Only missing assets are restored, up to 10,000 files and 128 MiB total, with a
32 MiB per-file cap. The source is the previous deployment's Git tree, not the
previous output plus its retained files, so older generations do not accumulate.
This is a single prior source generation, not indefinite backward compatibility.
Same-name mutable assets retain current bytes; compatibility across a mutable
URL replacement is not promised. Removing an application from the inventory or
from current staging intentionally ends its retention. No old HTML is revived.

The source assumes managed assets are committed and match their release gates.
It does not fetch arbitrary historical files from the public web or restore
private data. Domain sites, service workers, browser caches and saved-state
migrations remain governed by their existing contracts. An already-open real
application across an actual deployment still needs live acceptance.
