# Frozen workspace

Live managed deployment: https://wst-frozen.davein4k.chatgpt.site
Primary hostname: https://wst.housevideo.app (DNS, TLS and live API verified November 6, 2026).

Personal notes autosave only in this browser/origin under `wst.frozen.personal-notes.v1`, with text export and storage-failure recovery. They never enter the task API. Clearing browser site data loses local notes; notes at the temporary hostname do not automatically transfer to the custom hostname. Private cross-device notes are deferred, not a project-wide storage policy.

Team tasks are public by Dave's explicit choice: anyone opening the page can view, add, edit, complete and delete. D1 stores tasks separately. The API caps text at 500 characters, request JSON at 2KB, total tasks at 200, and writes per IP per Worker isolate at 30/minute. The isolate limiter is a modest abuse safeguard, not a global quota. Revision checks reject lost updates. No projector endpoints, existing private data or account credentials are included.

## Source and release

This GitHub directory retains the frontend and the exact managed source snapshot in `hosting/`. The Sites hosting repository is a deployment mirror, not a separate feature authority. `hosting/deployment.json` records the managed commit and successful deployment. Update source here first, synchronize the managed repository via the Sites helper and record the resulting receipt. Do not create another Site: reuse `.openai/hosting.json` project ID. Generated single-file Worker contains embedded frontend assets; run `node wst/embed-hosted-assets.mjs` to synchronize the generated worker from the canonical frontend, configuration and projector JSON before release. `hosting/drizzle` owns schema migrations, never apply schema changes in request handling.

The managed Worker/D1 service is separate from GitHub Pages and existing FMP services. DNS adds only the requested WST hostname; housevideo.app and walk.housevideo.app stay unchanged.

## Verification

`node --test wst/workspace.test.mjs` verifies local notes recovery/export without networking. Built Worker validation: `cd wst/hosting && bash scripts/build.sh && node scripts/validate-artifact.mjs`. Production API acceptance passed with independent clients: create/read/update, stale-write 409, oversized-text 400, cross-origin-write 403, delete and absence after deletion. All synthetic tasks removed. Walter Playwright passed live desktop/mobile containment, both themes, Eastern clock, note save/reload, separate-browser note isolation, download, and shared-task completion across two browser contexts; screenshots reviewed. Synthetic browser task removed.

## Combined Frozen entry point

Navigation includes Notes + tasks, Projector info and Projector controls. `projectors.json` is the versioned public equipment reference with assignment/lens/estimate provenance; the private rig remains controller authority. No IPs, MACs or credentials are in this reference. D lens sizing is a candidate calculation, not a calibrated optical verdict. The owner prefers coverage over reduced brightness/resolution; installed lens and physical clearance remain unverified.

`workspace-config.json` owns the future control handoff. Its default is `url: null, verified: false`, visibly Mac Studio setup pending. Set a URL only after installing and testing the theatre host and crew access. Do not substitute the current MacBook or visitor localhost. The app does not proxy commands; configuring this link does not create authentication. Actual login/access belongs to the controller. Reciprocally, the controller links back to https://wst.housevideo.app/.
