# Frozen workspace and hosting plan

Proposed November 19, 2026. This plan covers a working Frozen view set inside
AV by Dave, improvements to the tools demonstrated through the Frozen case, and
a separate assessment of moving the public Frozen workspace off GPT Sites.

## References and authority

| Priority | Reference | What it governs | Provenance and limits |
| --- | --- | --- | --- |
| 1 | [AV Suite shell](av-suite-shell.md), [view storage](../apps/av-suite/src/views.ts), [panel packs](../apps/av-suite/src/packs.ts) | Single console, mixed panels, named layouts and app-owned documents | Inspected on System by Dave main at `04a4fe8f8d9888e2fcb76d46ab986cc1b0b85e5f`. The existing [AV by Dave console](https://avbydave.com/av/) is the product surface. The old nested console experiment is superseded. |
| 1 | [Frozen case](frozen-case.md), [browser probe](../scripts/probe_frozen_case.mjs), [AV Video workflow](../.github/workflows/av-video.yml) | Accepted case scope, original findings and reproducible operator steps | Stages 1 and 2 are recorded as built. FC-F1 is recorded fixed and guarded by the probe. Later stages and open decisions retain their recorded state. This plan did not rerun the case. |
| 1 | [Projection record](../wst/projectors.json), [stage plot](../wst/stage/plot.json) | Lane identities and public planning inputs | The November 7 projection record is a planning snapshot. Lane D's 38 to 39 ft throw is an estimate. A through C lack recorded throws. Lane B has a lens discrepancy between the rig record and plot. Maintain the distinction between estimates, recorded values and measurements. |
| 1 | [Equipment Lab](equipment-lab.md), [Throwline catalog contract](throwline-catalog-contract.md), Equipment Platform Compatibility Contract ECP-1.0 | Model identities, aliases, optical evidence, component IDs and ownership | ECP-1.0 is the private workspace contract, effective October 17. The pinned pilot catalog must be deliberately re-pinned if audited rows change. Get primary manufacturer evidence for the exact projector, lens, raster and mounting combination before enabling calculations. |
| 1 | [Run Review publication](../wst/hosting/review/README.md), [release receipt](../wst/hosting/deployment.json), [Run Review](https://wst.housevideo.app/run-review/) | Viewer ownership, release IDs, immutable media, legacy links and photo provenance | System by Dave owns hosting integration. The rehearsal capture project owns the viewer and evidence exporter. GitHub records the November 18 review release at Sites version 50. Sites reported latest saved version 53 on November 19 following the later navigation and favicon work. Reconcile the exact live managed revision at migration intake. |
| 2 | [Show readiness](../apps/projctl/docs/show-readiness.md), [power scheduling](../apps/projctl/docs/power-scheduling.md), private Frozen Interface Directory | Operator destinations, access modes and current action ownership | Private route inventory stays in the existing private directory. November 19 MacBook observations are scoped to that browser and network. Crew LAN access, fresh-session authentication and physical device behavior require separate checks. |
| 2 | [Domain publication](domain-sites.md), [D1 import and export](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [R2 transfer options](https://developers.cloudflare.com/r2/data-migration/), [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) | Existing AV publication and candidate portable hosting | AV by Dave is already published through the repository's domain workflow. Cloudflare offers compatible target services. Access to export the Sites-managed data, target account ownership, and hostname transfer behavior are still unverified. |

## Product shape

Use the existing AV Suite shell and its panel library. Start with
browser-local layouts and explicitly saved app documents. Create a private
working plan separately from the Frozen test case. The test still starts in
a disposable browser and enters the reference through the normal UI under
FC-D1. Any future plan import must preview its source and leave existing
documents intact until the operator accepts it.

| View | Panels and operator flow | Authority and first delivery |
| --- | --- | --- |
| Projection | Displays & Projection selects a lane. Signal Flow traces it. Inspector shows route data. Open Equipment Lab or Throwline to work the selected equipment or optical plan. | Existing AV Video panels plus one portrait-lane walkthrough. Carry lane selection inside AV Video using its existing selection model. Add reviewed cross-tool transfer only after the lane walkthrough identifies the fields worth carrying. |
| Show Ready | Show Ops Rooms, Tasks and Handoff sit together. Select a blocker, assign ownership, and confirm it appears in Handoff. Open Crew on demand. | Pick the owner of each checklist and shared task before copying real records. Show Backup and Power Checklist remain direct private launch destinations for the crew. |
| Cue Review | Show Control Cues, Notes and Call Log organize review. Open the selected firing in Run Review, then assess an inline Cue Evidence panel. | Run Review owns observed firing and photo evidence. Millumin owns show output. Keep exact cue strings, session ID and firing/event ID distinct. A review selection has no execution effect. |
| Monitor and Support | The private directory groups Projctl, Frozen Monitor, both Olaf Watch copies, Frozen MIDI Live, Messenger, Next Steps and M1/M5 Screen Sharing by task and access route. | The status owner is the original service. Retain the MacBook Olaf Watch and old MIDI address as troubleshooting entries until a working replacement or explicit retirement is recorded. Evaluate an inline read-only status panel only in a verified private environment. |

Use the shell's existing named views, layout lock, panel resizing and theme.
Desktop Projection starts with Displays & Projection alongside Signal Flow.
Maximize Signal Flow for tracing and Throwline for optical work. On a phone
use the existing compact panel navigation with a stable order. Only a view
selection may change which panels are shown. Opening a view leaves stored
documents and active hardware state intact.

## Delivery slices

| Slice | Work and owners | Acceptance and dependencies |
| --- | --- | --- |
| W0. Baseline | Reconcile the exact console and deployed WST builds. Inventory lane A through D fields and source dates. Read the current test case and verify the existing replay on an approved runner. Record a before walkthrough for lane D, one readiness blocker and one review firing. | One evidence packet contains source revisions, browser setup, screenshots or journal, and failed or skipped checks. Separate recorded case findings from newly reproduced ones. Keep the existing local directory and bookmarks available. |
| W1. First working views | Store Projection and Show Ready in the existing shell for one operator. Use private, minimum necessary records and retain each app's Save/Export path. Form a repeatable lane D task from catalog search to signal trace to planner to Stage 3D. | Arrange, lock, reload and restore the layouts. Existing saved layouts and unrelated documents match their baseline. A second theme, keyboard navigation, desktop and phone layouts work. The operator can complete the readiness walkthrough using one authoritative record. W0 precedes field changes. |
| W2. Fix the most consequential tool failure | Brief and implement FC-D6 in Throwline first. Define how portrait surface dimensions, optical image dimensions and rotation are represented. Use a typed or sourced ratio as already permitted and carry orientation to Stage 3D. Keep manual estimate labeling. | Lane D is entered as drawn, with no manual dimension swap. Planner and Stage 3D agree on orientation and effective optical dimensions. Verify landscape parity, mixed orientations, reload/export, old plans with no explicit orientation and the unsupported-renderer fallback. Software agreement does not establish installed fit. Depends on FC-D6 approval. |
| W3. Improve the next failures independently | FC-D4 normalizes search and adds evidence-backed aliases to the owning catalog. FC-D7 differentiates an unset/default zone from a user-specified infeasible zone. FC-D8 researches audited projector and lens profiles in parallel only when separately authorized. | Native names and two documented alternate spellings resolve to the same identities, with no model conflation. An unset zone requests a value and a known infeasible entered zone retains the warning. Optical rows cite exact maker references, require compatibility and raster checks, retain conflict states, and pass deliberate catalog re-pin review. FC-D9 remains a separate evidence request for A through C and the lane B lens conflict. |
| W4. Transfer one lane and review one cue | Prototype explicit, previewed AV Video to Throwline transfer for one lane. Pass source revision, stable lane/instance ID, units, orientation and provenance. Preserve per-tool IDs and dirty edits. For Cue Review, try the direct Run Review link first. Add a panel only after identifying a stable read-only data contract and the approved audience. | Unknown or stale IDs produce an explanation. No implicit save or overwrite. A repeated or decimal cue resolves to the intended session and event. The evidence panel distinguishes missing, original and rescued media and labels timing uncertainty. Inspect network behavior for private data and keep the full viewer as the fallback. |
| W5. Operator acceptance and reuse | Run the same projection, readiness and cue workflows on the release candidate. Record each observed friction point with evidence and a generic tool improvement, then rerun the workflow after the fix. | Existing Frozen regression still passes as a clean UI entry exercise. A new layout journey covers actual view usage. An operator reviews day-of-show navigation on authorized devices. Any live monitor proposal has separately approved access, source timestamps and an unreachable/stale state. |

FC-F1 is retained as a regression guard. FC-F2 maps to W3, FC-F3 and FC-F4 to
W3's optical research, FC-F5 to W2, FC-F6 to W3, and FC-R1 to the independent
measurement and provenance decision. The layout and tool fixes do not displace
the original case's future department sequence (FC-D10). Equipment Lab
service procedure work, Infrastructure, Shop/Front Office and Show Control
case extensions can wait for their own reviewed inputs and acceptance.

Documented implementation gates include `npm run typecheck:av-suite`,
`npm run build:av-suite`, `npm run test:av-suite-browser`,
`npm run test:av-canvas-menus-browser`, `npm run test:frozen-case` and
`npm run verify:throwline` where affected. Repeat the Frozen case against
AV by Dave after release. Run browser and build work on a qualified runner,
with planned desktop, narrow phone, keyboard, touch, both themes and
panel-containment checks. Follow the PR and Pages workflow for actual product
releases. Record automated, live browser, operator and venue acceptance
independently.

## Migration off GPT Sites

### Candidate and boundaries

Prefer a GitHub-owned build deployed to an owner-managed **Cloudflare Worker
with D1 and R2** while retaining `wst.housevideo.app`. The hosted workspace
already uses a Worker module with D1 `DB` and R2 `REVIEW_PHOTOS` bindings.
The Sites connector read back the `tasks` table name on November 19.
Table data, source export, target resources and provider permissions were
not inspected. Keep the AV by Dave console on its existing release pipeline.
The private tools and Macs are outside this public-hosting move.

A pure static site plus a separate API is a fallback if a Worker target is
unsuitable. It needs independent design for task writes, photo serving,
cross-origin behavior and same-origin storage. Repointing a custom hostname
before those dependencies are proven would leave behavior gaps.

Use [Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
or R2 for heavy resources if target build size, startup or file limits require it.
Preserve MIME, cache, range and response-header behavior at the existing paths.
Measure the produced package and compare it with the current
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
before choosing a staging configuration. Avoid changing framework, database
schema, viewer URL structure and hosting provider in the same cutover.

### Migration sequence

| Gate | Work | Required proof |
| --- | --- | --- |
| M0. Inventory and ownership | Pin the exact production Worker, release catalog and resource bindings. Reconcile the managed source against GitHub before packaging. Inventory canonical routes, legacy aliases, headers, assets, migrations and storage keys. Identify the DNS zone owner, target account, credential scope, and recoverable D1/R2 export routes. | Match the active deployment to source and media versions. Capture package sizes and resource counts, with a documented backup and restore path. Establish access and an approved cost envelope before creating provider resources. |
| M1. Isolated staging | Build from the reconciled source. Bind empty staging D1/R2 resources, apply the existing migrations, seed synthetic task data, and verify a media fixture. Place deployment configuration under version control with environment-specific bindings and secret references. | A clean checkout can build the Worker and reproduce assets without GPT Sites. Current shell routes, legacy cue links, task CRUD/conflict behavior, review filters and the hidden Scenic navigation pass against staging. Theme and local notes behavior pass using synthetic browser contexts. |
| M2. Data parity | Use a supported Sites/owner export for D1, or design an authorized bounded export if an exact snapshot is unavailable. Preserve task IDs, revisions, timestamps, kinds and schema. Copy only approved review objects from a verified export/backup or known allowlisted originals. Keep source hashes and object mapping in a private manifest. | Source and restored D1 schema, counts and deterministic row parity agree. All approved R2 keys, exact bytes, metadata and hashes match their manifest. Verify all published Run Review sessions and exact cue links, legacy originals/thumbnail routes, rescued replacements, and missing slots. Do not equate a destination import guide with proof of Sites export access. |
| M3. Rehearse cutover and rollback | Rehearse on a separate hostname with the production path structure. Plan single-writer handover for tasks, final snapshot/delta, TLS/DNS switch, independent browser and crew validation, and proof of the previous host's recovery path. | Preserve the production origin and storage keys so browser-local data can still be read. Prove route and evidence parity, task durability across clients, and absence of unintended controller paths or public data expansion. Establish exactly how to reconcile post-cutover writes before a rollback. |
| M4. Authorized production switch | In an approved window, pause task writes briefly, take the final delta, verify parity, change the custom domain, smoke-test and resume writes on one provider. Retain GPT Sites and backups through the observation window. | Test live canonical links, notes persistence, task conflict handling, representative and exact-media readback, and access from independent clients. If parity or the writable path fails, stop writes and follow the rehearsed rollback. Before reverting after new writes, reconcile them or keep writes paused until reconciled. Retire old resources only under separate approval after acceptance. |

The first migration deliverable is **M0**, a portability and export report.
If the existing task store cannot be exported and restored with parity,
leave production serving from GPT Sites while that dependency is resolved.
No DNS, hosting, data migration, control connection or asset upload is
authorized by this plan.

## Decisions and first work order

| Decision | Options | Recommendation |
| --- | --- | --- |
| Workspace distribution | A. Browser-local operator views. B. Authenticated team workspace. C. Public Frozen template. | A first. B after venue/Tailscale reachability and shared record ownership are proven. Treat C as FC-D5 and review its public scope independently. |
| First improvement | A. Portrait orientation, FC-D6. B. Catalog aliases, FC-D4. C. Zone validation, FC-D7. | A first because the current workaround changes the optical conclusion. Recheck the independent findings before accepting B or C into separate slices. |
| Hosting destination | A. Owner-managed Worker with D1/R2 and the existing hostname. B. Static frontend and separate API. C. Stay on Sites while export access is unresolved. | Assess A via M0. Use C while export, parity, access or rollback evidence is missing. Choose B only with a reviewed compatibility case. |

Start W0 and M0 as separate, bounded discovery passes. Use their evidence
to write the W1 workspace brief and the FC-D6 implementation brief.
Retain the same release evidence, owner and approval boundaries through
implementation. Naming decisions, task lifecycle changes, production
migration, and physical validation remain separately scoped.
