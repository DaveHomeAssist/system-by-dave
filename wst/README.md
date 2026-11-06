# Frozen workspace frontend

Follow-on source slice for `wst.housevideo.app`. No domain or hosted backend is configured by this change.

Personal notes autosave only in this browser's `wst.frozen.personal-notes.v1` localStorage key. The visible notice explains device/origin scope, clearing-site-data loss and text export. They are never uploaded. Private cross-device synchronization is deferred, not a project-wide storage policy.

Team tasks are explicitly not connected. Do not label browser-local task data as shared. Dave's current access decision is that anyone opening the page may view and update shared tasks without sign-in. Do not add existing private notes or expose the projector controller.

Smallest hosted follow-up: deploy the same frontend and a public task API with Sites Worker/D1, preserving this repository as source and recording the exact deployment source. D1 tasks need ID, text, completion, revision and timestamps; enforce text/body limits, bounded result count, write rate limit and optimistic revision checks. No personal-notes API. Apply schema migrations outside request handling. The Sites custom-domain tool returns the CNAME and validation records for the existing Namecheap DNS owner; no apex or other housevideo routes need changing.

Verify API persistence across visitors, conflict behavior, malformed/oversized requests and write throttling before calling team tasks complete. Then confirm public domain HTTPS and browser rendering. Local verification: `node --test wst/workspace.test.mjs`. Browser layout and actual downloads remain to be verified.
