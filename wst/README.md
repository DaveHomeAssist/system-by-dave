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

## Unified public and local workspace

The controller now includes Notes + tasks and Projector info alongside Rig and Stage, loading this same frontend as generated same-origin panels from `public/workspace/`. `node wst/embed-hosted-assets.mjs` refreshes both the managed Worker assets and this local copy. Personal notes use the same key but remain browser-and-origin-specific; local controller notes and website notes do not silently sync. Dave confirmed no saved content needed migration.

The public website shows Stage / room and Controls in place. Connect this Mac explicitly requests the browser's local-network permission for `http://localhost:8080`, checks relay health, and loads the private controller frame. Connected requires a source/origin-validated child report with active relay connection, not iframe load. Parent messages can select only Rig or Stage; they cannot issue device commands. Denied/unavailable connection stays clearly disconnected. This does not expose a public relay and is not a verified Studio crew endpoint.

The public tasks API permits anonymous cross-origin GET/POST/OPTIONS so the local workspace uses the same shared list. This CORS change is limited to the managed task API. Existing controller API policies were not broadened. Private authenticated Studio iframe behavior remains unverified: current controller cookies use SameSite=Lax, and the current MacBook has no passcode configured. Do not claim a future protected Studio iframe is commissioned from this local test.

Verification: actual local controller panels passed desktop/mobile notes persistence across tabs, shared-list read, and projector info/Stage navigation. The public website loaded actual private Stage and Rig in place in an isolated browser with normal local-network permission explicitly granted; the denied state remains disconnected. No physical commands were sent. A temporary SSH forward bound only Walter loopback for these tests; it is not a deployed service.

### Browser permission acceptance, November 6, 2026

Local controller Notes / Info / Stage navigation passed in the owner's browser. An isolated Walter Chromium context, with local-network permission explicitly granted, displayed the actual Mac relay's Stage and Rig inside the public WST page. No browser security flags were disabled. The temporary SSH forward used for that test bound only Walter loopback and was stopped afterward.

The owner's actual desktop browser reached the new bounded failure message instead of reporting a false connection. Its local-network permission grant remains unconfirmed: native permission UI inspection was blocked by a ScreenCaptureKit capture error. Therefore in-place public-to-private control is verified for the supported granted-permission path, not commissioned in that user browser or on the future theatre Mac Studio. The same-origin local unified app remains usable without that public-to-loopback permission path. No public tunnel was deployed.

### Home entry, November 6, 2026

Dave requested a choice-first landing screen. Home is now the initial view on both the public website and non-embedded local controller, with four in-page choices: Notes + tasks, Projector info, Stage / room, and Controls. Notes remain one click away. Embedded controller frames continue opening Rig/Stage directly rather than showing a nested Home screen. This changes navigation only; no storage migration, backend restart or projector commands are involved. The user's actual local Home routes were verified; public Home routes are awaiting the final owner-browser readback. Existing local-network permission limitations remain unchanged.

## Six-menu shell

The public shell's primary navigation is My Projector Rig, 3D Stage View, Presets, Log, Configuration and Throw Calc. Home and Notes + to-dos remain separate utility choices. Rig gear, the searchable catalog and signal-flow diagrams use `apps/projctl/public/reference-view.js` / `.css` and canonical `wst/projectors.json`; the embed script copies these shared renderer bytes rather than maintaining another catalog.

Allowlisted hash routes are `#home`, `#notes`, `#rig`, `#rig/A` through `#rig/D`, optional `/controls` on rig routes, `#stage`, `#presets`, `#log`, `#configuration` and `#throw`. Unknown action-like routes fall back to Home. Private iframe messages keep `wst:show-panel` with a view name and optional A–D projector selection only. Presets, command logs, configuration and private room assets remain at the controller. Disconnected views show connection requirements instead of sample operational data. Throw Calc uses the existing public Throwline page in place, with separate planning state and no copied calculation engine.

Run `node scripts/test_wst_workspace.cjs` with existing Playwright/Chromium. This uses disposable browser contexts, intercepted task/relay fixtures and no physical device or production task writes. It verifies primary labels, Home/notes readiness and reload, lane detail routes, catalog/flow/planner navigation, disconnected state, limited child messages, full lane colors in both themes, and desktop/mobile containment. The fixture does not commission actual browser local-network permission or a future authenticated Studio iframe. The accepted six-menu shell is published as Site version 14; `hosting/deployment.json` records its exact managed source and successful deployment.


Version 14 publication: final HTTPS HTML contains all six primary labels and the served workspace/reference JS, CSS and JSON match the accepted source bytes. Consumer installation was confirmed by the runtime owner at `25b22e65f6710caf1505557f4e30f8e3ebe04314`, with REAL health and the expanded navigation-only bridge. No new user-browser permission attempt or hardware command was part of this publication. Actual user-browser local-network permission and the authenticated theatre Studio endpoint remain separate acceptance gaps.
