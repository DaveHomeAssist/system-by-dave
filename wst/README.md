# Frozen workspace

Live managed deployment: https://wst-frozen.davein4k.chatgpt.site
Requested custom hostname: https://wst.housevideo.app (DNS/TLS pending at this receipt).

Personal notes autosave only in this browser/origin under `wst.frozen.personal-notes.v1`, with text export and storage-failure recovery. They never enter the task API. Clearing browser site data loses local notes; notes at the temporary hostname do not automatically transfer to the custom hostname. Private cross-device notes are deferred, not a project-wide storage policy.

Team tasks are public by Dave's explicit choice: anyone opening the page can view, add, edit, complete and delete. D1 stores tasks separately. The API caps text at 500 characters, request JSON at 2KB, total tasks at 200, and writes per IP per Worker isolate at 30/minute. The isolate limiter is a modest abuse safeguard, not a global quota. Revision checks reject lost updates. No projector endpoints, existing private data or account credentials are included.

## Source and release

This GitHub directory retains the frontend and the exact managed source snapshot in `hosting/`. The Sites hosting repository is a deployment mirror, not a separate feature authority. `hosting/deployment.json` records the managed commit and successful deployment. Update source here first, synchronize the managed repository via the Sites helper and record the resulting receipt. Do not create another Site: reuse `.openai/hosting.json` project ID. Generated single-file Worker contains embedded frontend assets; keep these synchronized with the three files in this directory before release. `hosting/drizzle` owns schema migrations, never apply schema changes in request handling.

The managed Worker/D1 service is separate from GitHub Pages and existing FMP services. DNS adds only the requested WST hostname; housevideo.app and walk.housevideo.app stay unchanged.

## Verification

`node --test wst/workspace.test.mjs` verifies local notes recovery/export without networking. Built Worker validation: `cd wst/hosting && bash scripts/build.sh && node scripts/validate-artifact.mjs`. Production API acceptance passed with independent clients: create/read/update, stale-write 409, oversized-text 400, cross-origin-write 403, delete and absence after deletion. All synthetic tasks removed. Walter Playwright passed live desktop/mobile containment, both themes, Eastern clock, note save/reload, separate-browser note isolation, download, and shared-task completion across two browser contexts; screenshots reviewed. Synthetic browser task removed.
