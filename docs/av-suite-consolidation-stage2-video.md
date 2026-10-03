# AV Suite consolidation: Stage 2 (Video) phase plan

**Decision revision:** 2026-10-01. Unified Video is a focused application launched directly from Toolbox, independent of AV Workbook. The [maintained specification](av-suite-consolidation-spec.md) carries Dave's settled Toolbox, application, module and Workbook-withdrawal decisions. The former D2 recommendation and Workbook v2 execution brief are superseded; do not ask for their approval or implement them as the next phase.

**Evidence boundary:** The September 29 source audit below used `c21ce22`; its line citations and defects are historical evidence with subsequent fixes noted. Increments 2.0a and 2.0b and bounded 2.0c slices are in current source at `238f2ed`. Remaining suite safety work is open. The first independent route-and-patch slice of 2.1–2.4 is now implemented in `apps/av-video/` and built to `/av-video/`; see [the implemented contract](av-video.md). The October 3 Displays & Projection slice adds app-owned destination records, explicit route links, scoped checks and previewed imports from Display Plan and Projection Plan. Destination field, persistence, responsive and offline browser gates run alongside the existing route probes. Cameras/Playback and Stream/Record remain the next implementation slices. Full eight-tool Stage 2 acceptance and human acceptance remain open.

## Where the program stands

- **Equipment pilot history:** the focused FMP model bridge shipped and was subsequently withdrawn from public Gear Reference. Public reference is equipment-only; venue content needs an explicit workspace binding, without a Workbook prerequisite.
- **Stage 0 (inventory)** remains open across all 45 tools. The [Stage 0 record](av-suite-consolidation-stage0.md) lists its gates. This plan scopes future migration gates to the Video slice; the shipped legacy-page checks do not close offline, import field-parity or operator-acceptance gates.
- **Stage 2 (Video)** started in code with increments 2.0a and 2.0b (2026-10-01), which fixed the shared show-context, card-view, navigation and Workbook load defects and the eight Video pages' data-safety defects. A follow-up to 2.0a (PR #188) made the Workbook fail closed when browser storage fails. Increment 2.0c extends the page fixes to the rest of the suite. The October 2 route-and-patch application now provides a real combined workspace. Commit `77ae0eb` had changed only the specification, doorway contract, and changelog.

The Video slice is the eight tools the specification assigns to Video (`signal-flow`, `video-patch`, `display-plan`, `projection-plan`, `stream-plan`, `record-log`, `camera-shot-list`, `playback-check`) plus the independently launchable `led-wall-calculator`, linked contextually from Displays & Projection.

## Decisions for this phase

The product direction below carries the October 1 request forward. Routine engineering defaults are explicitly distinguished from product choices still open in the [maintained plan](av-suite-consolidation-spec.md#consequential-choices-before-affected-implementation). Do not reopen settled decisions from the September recommendations.

| ID | Current direction | Authority or treatment |
| --- | --- | --- |
| D1 | Close migration gates for the Video slice before cutting over its workflows; shared-code safety fixes apply wherever needed. | Engineering sequencing; other applications do not block independent Video work. |
| D2 | **Unified Video is a focused application, independent of Workbook.** It has its own direct launch from Toolbox and does not require Workbook's UI, runtime or database. | Settled product boundary, Dave 2026-10-01. Replaces the recommendation to build inside `apps/av-workbook/`. Reuse code only where it preserves independence. |
| D3 | Use a chain-oriented typed model with lossless import. Keep original text/statuses, derived readiness and source provenance separately. | Engineering default justified by the field matrix. No separate approval of a validation library or schema implementation is needed. Cross-app document identity remains a consequential gate. |
| D4 | Legacy pages remain independent writers of their existing keys. New imports are previewed copies; repeat import never silently overwrites newer app edits. | Data-preservation contract. |
| D5 | Preserve the delivered Workbook load/save safeguards and apply equivalent fail-closed behavior to any new app store. | Completed safety work remains valuable; a Workbook schema extension is no longer a Video prerequisite. |
| D6 | LED Wall Calculator stays a focused specialist launched directly and from Displays & Projection. | Engineering navigation default; preserve its own state and documented Power Load handoff. |
| D7 | Toolbox is the default entrance and Video is directly visible. Video opens without show setup, with optional validated show context and optional modules. | Settled product boundary. The current doorway's explicit show-context compatibility remains documented; an old saved preference does not defeat the new neutral Toolbox default. |
| D8 | Video derives scoped issues locally and does not write `av-suite-dashboard.v1` readiness. | Preserve one writer until the consequential readiness-authority choice is resolved. |

## Stage 0 Video-slice source audit

Four read-only source audits of the nine pages, the Workbook, the doorway shell, the registry, and the verification scripts were run on 2026-09-29. The defects below are confirmed from source. Items marked *reproduced* were exercised with the page's own functions; browser reproduction of the rest is part of increment 2.0.

| ID | Defect | Where | Effect |
| --- | --- | --- | --- |
| V0-1 | The operator hint cascades into other fields. `firstExisting` uses `.some(setInput)`, and `setInput` returns false when the value already matches, so an unchanged field counts as missing. | `js/av-suite-context.js:150-152, 266-287` | Repeat visits with the same `sbdOperator` write the name into Playback Check `audioLead` and then `tdName` (*reproduced*), into Signal Flow `audioLead` and `tdName`, and into Record Log `audioLead` and `producer`, saving each one. Stream Plan fills `producer`, because `streamTech` is not a candidate. Video Patch, Projection Plan, and Camera Shot List have no operator target. Fixed in 2.0a. |
| V0-2 | Samples are seeded on first launch, and the existing CI rule misses them. | `signal-flow.html:830`, `record-log.html:797`, `camera-shot-list.html:980`; outside Video: `breakout-room-matrix.html:311`, `network-plan.html:798`, `power-plan.html:800`, `rf-coordination.html:801`. The rule at `verify_av_suite.js:198-208` matches only `sampleCues` and `sampleItems`. | A show-context fill then saves the samples under the real show name (confirmed for Camera Shot List; same path in Signal Flow and Record Log). Camera Shot List restores its samples whenever the list is empty, so it cannot hold an empty list. Fixed in 2.0b. Input List and StagePlotter still seed on first launch, on an empty list and on a parse failure (`input-list.html:1011`, `stage-plot.html:1227`), in a form the widened rule misses: `rows = sampleRows.map(normalizeRow)` after an early return. That is 2.0c. |
| V0-3 | Unreadable saved data is silently replaced. | Signal Flow `841-850`, Record Log `807-819`, Camera Shot List `962-964`, Video Patch `295`, and the Display, Projection, and Stream plans | A parse failure loads defaults or samples, and the next save overwrites the original with no copy. The show dashboard already keeps `.unreadable` (`av-suite-context.js:413`). Fixed in 2.0b on the eight Video pages. If `<key>.unreadable` already holds a different copy, a page stops saving and offers no way out except Export (`signal-flow.html:864-881`). About 28 other tool pages parse saved data with no `.unreadable` copy (a source-signal count). Both are 2.0c. |
| V0-4 | Normalization on load rewrites stored values. | `video-patch.html:294` (blank source becomes "Source", blank format "1080p59.94"); Projection Plan (blank screen becomes "Screen", aspect "16:9"); Stream Plan (blank encoder becomes "Encoder"); `playback-check.html:853` and `record-log.html:1310-1335` (durations); `camera-shot-list.html:933-937` | Gaps disappear on reload. Durations lose data (*reproduced*: `2m30s`→`00:02`, `01:02:03:04`→`01:02:03`, `TBD`→`00:00`, `45 min`→`00:45`). Cleared shot fields come back. Fixed in 2.0b for blanks, durations and cleared fields. The 2.0c lossless-load slice keeps all stored rows and known text fields, including long spacing and duration strings. Add and Duplicate now block at each page's old row cap while retaining over-cap saved rows. Video Patch, Projection Plan and Stream Plan also flattened multi-line notes and cut them at 260 characters on load and on every edit (`cleanLong`); a follow-up to 2.0b fixes the notes. |
| V0-5 | Single-key shortcuts ignore modifier keys. | For example, `playback-check.html:1341-1349`; the same pattern appears on all eight Video pages. | Cmd/Ctrl+P runs Play Next, marks a problem, or marks a row patched instead of printing. Cmd/Ctrl+R and D are also intercepted. About 40 root pages with keydown handlers show no modifier check. Fixed in 2.0b on the eight Video pages. 23 other tool pages have single-letter shortcuts with no modifier check; for example, Cmd+P marks a Truck Pack case planned, Cmd+S marks it staged and Cmd+D duplicates it (`truck-pack.html:343`). That is 2.0c. |
| V0-6 | Legacy JSON import replaces all data with no preview or confirmation. | The import function on all eight pages | Video Patch and the Display, Projection, and Stream plans accept any file that has an `items[]` array, so another tool's export converts silently. Camera Shot List's Load Sample replaces everything without confirmation. Fixed in 2.0b. |
| V0-7 | Stream keys can leak. | `stream-plan.html:271, 296` | The page asks for a key label, but nothing stops a raw key from travelling in JSON, CSV, and the show package. Mitigated in 2.0b with a visible warning; a raw key is not blocked. |
| V0-8 | Domain card views match only `.html` paths and also print. | `js/av-domain-views.js:184-190`; `css/av-domain-views.css` has no print rule | There is no card view on extensionless URLs, and the card deck prints beside the table. Fixed in 2.0a. |
| V0-9 | Navigation groups the tools inconsistently. | `js/sbd-registry.js:89` | Signal Flow sits in the Audio navigation group although its department and console family are Video. Because `locate()` takes the first match, previous/next runs through Graphics for Display and Projection. Fixed in 2.0a for Signal Flow, which is now first in the Video group; Display Plan and Projection Plan now resolve to Video, with browser coverage in the 2.0c navigation slice. |
| V0-10 | LED Wall Calculator's working state is under another tool's key. | `js/av-calculator.js:4`; registry `:68-69` | Its working state lives in `avCalculator.v1`, which is declared only under AV Calculator. The inventory row shows only the profile key, and the cross-tab guard watches only profiles. Transfer is covered because the key is declared elsewhere. The preparation pull request records `avCalculator.v1` as a known exception in the generated inventory. |
| V0-11 | Video browser gates were incomplete. | `package.json`, `.github/workflows/deploy-pages.yml` | The eight Video pages gained storage, import, export, CSV and shortcut coverage in 2.0b. The domain-views, responsive and LED configurator probes join Pages CI in the 2.0c navigation slice; the theme probe joins Pages CI in the second slice after its Chrome launch uses the same software WebGL flags as the Throwline browser probe. |
| V0-12 | The Workbook abandons a workbook it cannot load. | `apps/av-workbook/src/store.ts:38-54` | A validation failure creates a blank workbook and repoints the active ID. The unreadable record stays in IndexedDB with no way to reach it from the interface. Fixed in 2.0a. |

### Field matrix for the Video import

This matrix is the acceptance list for increment 2.2. Every field listed must have a typed home or a verbatim provenance entry. Row fields appear in each tool's CSV column order.

| Tool | Key, schema, cap, ID prefix | Row fields | Status values | Show metadata |
| --- | --- | --- | --- | --- |
| Signal Flow | `signal-flow.v1`; schema written, never read; 250 routes; `route-` | route, system, source, format, connector, processor, destination, status, backup, notes. system: video, audio, control, network, record, comms, power, other. format: SDI, HDMI, Dante, Analog audio, AES, NDI, IP, DMX, GPIO, AC, Other. connector: BNC, HDMI, XLR, TRS, RJ45, Fiber LC, Edison, PowerCON, USB C, Phoenix, Other | verified, pending, issue, backup | showName, venue, showDate, videoLead, audioLead, networkLead, tdName |
| Video Patch | `sbd.videoPatch.v1`; no stored schema (export `system-by-dave.video-patch.v1`); 180 items; `video-` | source, type, format, connector, input, converter, destination, route, backup, status, notes. type: camera, slides, playback, record, stream, display, utility, other | planned, patched, routed, tested, ready, issue, spare | showName, client, venue, showDate, v1, videoEngineer, handoffTo |
| Display Plan | `display-plan.v1`; schema stored; 300 items; `display-` | display, type, input, processor, resolution, aspect, refresh, route, backup, status, notes. type: led-wall, projection, confidence, monitor, lobby, stream, record, timer, backup, other | planned, cabled, routed, tested, ready, issue, backup | showName, client, venue, showDate, lead, processor, handoffTo |
| Projection Plan | `sbd.projectionPlan.v1`; no stored schema; 180 items; `projection-`; legacy `throw` read as `throwDistance` | screen, surface, size, aspect, projector, lens, throwDistance, position, input, route, blend, backup, status, notes. surface: front, rear, led, blend, confidence, overflow, other | planned, rigged, focused, lined, tested, ready, issue, spare | showName, client, venue, showDate, v1, projectionLead, handoffTo |
| Stream Plan | `sbd.streamPlan.v1`; no stored schema; 180 items; `stream-` | encoder, type, platform, destination, server, keyLabel, input, resolution, bitrate, audio, record, backup, status, notes. type: primary, backup, record, simulcast, social, monitor, archive, other | planned, configured, sending, tested, ready, issue, backup | showName, client, venue, showDate, streamTech, producer, handoffTo |
| Record Log | `record-log.v1`; schema written, never read; 250 records; `record-` | record, source, type, format, resolution, audio, media, status, duration, backup, notes. type: program, iso, slides, audio, stream, backup, other. format: ProRes, H.264, H.265, WAV, MP4, MOV, MKV, Other. resolution: 1080p, 4K, 720p, audio only, mixed, other. audio: embedded, separate, program, matrix, multitrack, none | armed, rolling, stopped, issue, delivered | showName, venue, showDate, recordOp, producer, audioLead, handoffTo |
| Camera Shot List | `camera-shot-list.v1`; no `savedAt`; selection not saved; 300 shots; `shot-`; CSV headers are labels | number, cue, camera, type, subject, framing, movement, preset, status, notes. Only status is an enumeration. | ready, hold, problem, taken | showName, venue, date (not showDate), director, td |
| Playback Check | `playback-check.v1`; 200 cues; `cue-` | cue, file, type, duration, aspect, audio, destination, status, backup, notes. type: video, audio, slide, image, walk in, sting, other. aspect: 16:9, 9:16, 4:3, 1:1, 21:9, audio only, mixed. audio: embedded, separate, none, voiceover, house music, click | ready, pending, issue, played | showName, venue, showDate, playbackOp, tdName, audioLead |
| LED Wall Calculator | Working state in `avCalculator.v1`, shared with AV Calculator; `avCalculator.ledProfiles.v1` holds up to 20 profiles of 13 values | No rows (single scenario) | — | None |

**Workbook at the September 29 audit (reference only, not the Video host):**
- `VideoRoute` has `id`, `source`, `processor`, `destination`, `resolution`, `frameRate`, optional `converter` and `backup`, and a `WorkbookStatus` (`types.ts:129-139`). There is no editor.
- `validateVideo` checks only for a missing backup and for 4K without a converter (`validators.ts:164-189`).
- There are no Display, Projector, Encoder, Recording, Shot, or Playback entities.
- `ShowProfile` has no client or handoff field.

**Shared identity problems:**
- One device can appear in several tools with no shared ID. An LED wall can be a Video Patch `display` row, a Display Plan `led-wall` row, and a Projection Plan `led` surface.
- Record destinations appear as Signal Flow's `record` system, a Video Patch `record` type, a Stream Plan `record`/`archive` type, and every Record Log row.

## Draft Video model (finalized in 2.1)

- **Endpoints** are the devices and points in the chain: camera, playback, graphics, switcher, router, processor, converter, encoder, recorder, display, projector, LED wall, confidence, monitor, platform, and other. Each can reference a room, a hardware record, and a Gear Reference sheet.
- **Routes** connect a source endpoint to a destination endpoint through ordered hops, with format, connector, port/input text, backup text or backup route, and status. Existing Workbook `videoRoutes` remain untouched. Any future supported import from them is a separately previewed copy with field coverage, not an automatic Workbook schema migration.
- **Task records** are per family: display surfaces (Display and Projection together), stream outputs, recordings, camera shots, and playback cues. Each keeps its legacy fields and its verbatim status set.
- **Derived readiness** is computed by one pure function that maps each family's statuses to open, ready, issue, spare, or done. It drives counts and the Issues view and is never stored as a second status.
- **Provenance** on imported records records the tool, storage key, source row ID, source hash, import time, importer version, and every unmapped field verbatim. The inspector shows it, and nothing is folded silently into notes.
- **People:** tool metadata names become operator rows with a role only after the operator confirms them in the preview. Template placeholders such as "Video Engineer", "Producer", and "Next operator" are excluded, and a name is never replaced with a position code.
- **Endpoint matching** across tools is suggested in the import preview by normalized label and applied only when the operator confirms it. For example, "Camera 1" and "Cam 1" are never merged automatically.

## Increments

Each increment is a separate pull request that merges only when every check is green. Video increments do not retire legacy routes, rename existing keys/export schemas, or let the new app write legacy or Workbook records. Per Dave on October 2, the separate public Workbook withdrawal has no dedicated recovery or migration gate; retain its concept/source without planning around assumed users.

| Increment | Deliverable | Exit gate |
| --- | --- | --- |
| **2.0a Shared safety** | **Done 2026-10-01.** Fixes V0-1, V0-8, V0-9 and V0-12 (the Workbook load guard, D5). Adds a context-fill browser probe to CI. | Repeating the same context three times changes only one field per page. A newer, unknown-key, or invalid workbook opens read-only, with no IndexedDB write and the active ID unchanged. Registry version, Stage 3D pin, and inventory agree. |
| **2.0b Video page safety and proof** | **Done 2026-10-01.** Fixes V0-2 through V0-7 on the eight Video pages, plus V0-2 on the four non-Video pages that the widened seed check will catch. Adds a Video legacy behavior probe to CI. | For each of the eight pages: a synthetic fixture with every field survives reload unchanged; JSON export round-trips; CSV headers match the matrix; print hides the page chrome; Cmd/Ctrl+P is not intercepted; first launch writes nothing; unreadable data is preserved; a foreign file is rejected; replacing existing rows needs confirmation. Stage 0 gates for the Video slice are then closed in the Stage 0 record. |
| **2.0c Suite-wide legacy safety** | In progress 2026-10-01: navigation and three browser probes delivered in a bounded first slice; the remaining safety work is open; Workbook theme follows the Suite and the fourth browser probe joins CI in a second slice; lossless Video load lands in a third slice. Independent of 2.1. Extends the 2.0b fixes to the rest of the suite and closes what 2.0b left open: the modifier guard on 23 tool pages (V0-5), unreadable-data preservation on the remaining pages and a way out when a second unreadable value arrives (V0-3), seeding on Input List and StagePlotter (V0-2), lossless load on the Video pages (V0-4), Display Plan and Projection Plan navigation (V0-9), the four probes outside CI (V0-11), and the Workbook's dark-only theme (workspace rule WEB-1; resolved in the second 2.0c slice). The remaining work is split into reviewable pull requests. | Cmd/Ctrl+P is not intercepted on any tool page. No tool page saves over a value it could not parse, and a second unreadable value has a way out. Input List and StagePlotter start empty. Reloading a Video page keeps every stored character and row. Display Plan and Projection Plan step through Video. The four probes run in the Pages workflow. The Workbook follows the suite theme, light by default. |
| **2.1 Independent Video foundation** | Resolve the cross-app document-identity gate, then implement app-owned typed entities, validation, fail-closed persistence and the draft chain model. Select source structure and reusable code autonomously. | Every matrix field has a typed or verbatim provenance home. Save/reload, schema compatibility, backup and stale-tab behavior pass. Launch, edit and export work without Workbook installed or opened; its data stays byte-identical. |
| **2.2 Legacy Video import** | Reviewable imports for all eight keys with counts, unmapped fields, suggested endpoint matches, backup, confirmation, stale-preview rejection and repeat-import conflict handling. | Unit fixtures and a real browser preview/cancel/apply/repeat/restore journey preserve every legacy key and newer destination edit. |
| **2.3 Focused views and optional modules** | Resolve the initial module preset/preference scope, then build Switching & Routes and the Cameras, Playback, Displays & Projection, Stream & Record and scoped Issues views. Use the shared experience and independent app boundary. | Representative video chains retain status, backup and export details. Disable/reload/deep-link/export/re-enable preserves data and reduces clutter; active operations remain reachable. Specialist launches pass only supported fields. |
| **2.4 Toolbox launch and compatibility** | Integrate the independent Video route into default Toolbox discovery and app return navigation. Coordinate with the specification's earlier Toolbox-default release; do not recreate a chooser or Workbook launch dependency. | Video is visible without search at phone, 680px, desktop and 32:9. Neutral entry opens Toolbox, explicit Show Console/legacy show-context links still work, Back/Forward restore app/task, and rollback retains saved work. |
| **2.5 Stage 2 acceptance** | Verify remote, CI, destination deployment and rendered journeys; record a separate operator trial and update the plan. | All eight legacy capabilities and compatible routes remain available. App independence, module behavior, data/field parity and recovery gates pass. Human acceptance is recorded separately from technical proof. |

Increments 2.1–2.5 follow these revised gates. The former Workbook v2 implementation brief is withdrawn. Select route names, packages, source layout and storage mechanics during implementation without asking again about the settled application boundary. Resolve only the dependent product choices recorded in the maintained specification.

The following 2.0 briefs retain the safety-work history. Check current source and the increment table before using them; completed slices are not new work orders and their old references to future Workbook work are superseded.

## Execution brief: 2.0a

```text
EXECUTE — AV Suite Stage 2.0a: shared context and Workbook safety

SOURCE: DaveHomeAssist/system-by-dave origin/main. Read docs/av-suite-consolidation-stage2-video.md
(defects V0-1, V0-8, V0-9, V0-12 and decision D5) before editing. Use an isolated worktree,
branch <agent>/av-video-2-0a-shared-safety, and the .agent-claim protocol.

CHANGE
1. js/av-suite-context.js: fill each context field into exactly one target per page. Use an element
   carrying data-sbd-context="operator" (likewise showName, venue, showDate) if one exists; otherwise
   the FIRST EXISTING candidate id. If that target already holds the value, stop. Never fall through
   to another field. Mark operator targets only where today's first choice is already the intended
   field (signal-flow #videoLead, record-log #recordOp, playback-check #playbackOp, display-plan #lead),
   and mark stream-plan #streamTech. Video Patch, Projection Plan and Camera Shot List stay without
   an operator target.
2. apps/av-workbook/src/store.ts and App.tsx: when the active record (or fallback JSON) has a schema
   other than system-by-dave.av-workbook.v1, has keys the schema would drop (reuse importWorkbook's
   unsupported-field walk), or fails validation, open it READ-ONLY with a notice. Offer "Download
   this workbook" (the raw stored record) and an explicit "Start a new blank workbook", which leaves
   the old record in IndexedDB. Do not save, put or repoint the active id on load. Rebuild av-workbook/.
3. js/av-domain-views.js: match the page by basename with or without ".html". Hide .av-domain-view
   in print (css/av-domain-views.css).
4. js/sbd-registry.js: move signal-flow from the Audio navDepartments group to the Video group. Bump
   the registry version. Update ProjectorThrow/Stage3D.html to the new version. Regenerate the
   inventory with node scripts/report_av_consolidation_inventory.mjs.
5. Add scripts/probe_av_context_fill.mjs plus npm script test:av-context-fill-browser, and run it in
   .github/workflows/deploy-pages.yml beside the other AV browser probes. Open playback-check,
   signal-flow, record-log and stream-plan three times with the same sbdShow/sbdOperator. Assert that
   only the marked target holds the operator and that no other name field changed in storage. Assert
   that Video Patch and Camera Shot List get no operator write.

MUST NOT (blocking)
- Rename any storage key, export schema, route or registry id. Change any legacy page's data shape.
- Change the Workbook data model or schema string (that is 2.1).
- Write to IndexedDB or the active-id key while loading an unreadable, newer or unknown-key workbook.
- Hand-edit av-workbook/ or sitemap.xml. Regenerate them.

VALIDATION (all must pass before merge)
- git diff --check; npm run verify:av; npm run verify:throwline
- npm run typecheck:av-workbook; npm run test:av-workbook (add vitest cases: newer schema, unknown
  top-level key, invalid record, fallback JSON → no put, active id unchanged); npm run build:av-workbook
  with no diff after rebuild
- npm run test:av-context-fill-browser; npm run test:av-save-safety-browser; npm run test:av-nav-browser;
  npm run test:av-suite-import-browser; npm run test:domain-cutover; npm run verify:domain-sites
- Browser check of the read-only notice at 390px, 680px and desktop in both themes

DELIVERY: CHANGELOG entry; docs/av-suite-consolidation-stage0.md and this plan's 2.0a row updated
with evidence. PR, merge when green, confirm the Pages run, read back avbydave.com/signal-flow.html
and /av-workbook/.
```

## Execution brief: 2.0b

```text
EXECUTE — AV Suite Stage 2.0b: Video legacy page safety and behavior proof

SOURCE: origin/main after 2.0a has merged. Read docs/av-suite-consolidation-stage2-video.md
(V0-2 to V0-7, V0-11 and the field matrix). Use an isolated worktree, branch
<agent>/av-video-2-0b-legacy-safety, and the .agent-claim protocol.

PAGES: signal-flow, video-patch, display-plan, projection-plan, stream-plan, record-log,
camera-shot-list, playback-check. Seed fix only (item 1): breakout-room-matrix, network-plan,
power-plan, rf-coordination.

CHANGE
1. No auto-seed: first launch, a missing array and an empty array all load an empty list. Samples
   load only through Load Sample, which confirms when rows exist (add that confirmation to
   camera-shot-list). Widen the verify_av_suite.js auto-seed patterns to catch
   "sample<Name>.map(clone<Name>)" fallbacks and "if(!x.length) x = sample…" forms. Update
   probe_av_domain_views.js to load samples explicitly.
2. Unreadable storage: when the key's value does not parse, keep the raw string under
   "<key>.unreadable" and do not overwrite an existing copy that differs. Say so in the page status
   line and start empty. Never save over the unreadable value before that copy exists.
3. Load normalization must not invent or destroy values:
   - Video Patch, Projection Plan and Stream Plan keep blank fields blank on load. Placeholder text
     applies only to newly added rows.
   - Playback Check and Record Log keep duration text they cannot parse as typed, flagged
     "unrecognized duration" in the row, and preserve HH:MM:SS:FF frames. Parseable forms keep
     today's meaning.
   - Camera Shot List keeps cleared camera, type and subject blank, and keeps an empty list empty.
4. Shortcuts: single-key handlers return early when metaKey, ctrlKey or altKey is set. Add a
   verify_av_suite.js source check for these eight pages.
5. Import: reject a file whose "schema" names a different tool. When rows exist, confirm before
   replacing and state both counts. Cancel leaves storage byte-identical.
6. Stream Plan: show a non-blocking warning in the row and in Copy Summary when keyLabel looks like a
   raw key (20 or more characters with no whitespace, or matching /live_|sk_|key=|rtmps?:\/\//i).
7. Add scripts/probe_av_video_legacy.mjs plus npm script test:av-video-legacy-browser, and run it in
   deploy-pages.yml. For each of the eight pages, using a synthetic fixture with every matrix field
   populated (including blanks and odd durations):
   - reload gives identical stored fields;
   - JSON export has the schema string and round-trips through import;
   - the CSV header equals the matrix order;
   - print emulation hides the toolbar, side panel and card deck;
   - a Cmd/Ctrl+P keydown is not default-prevented;
   - an empty profile writes nothing until the first edit;
   - an unreadable value is preserved;
   - a foreign-tool file is rejected;
   - a dismissed replace-confirm leaves storage unchanged.

MUST NOT (blocking)
- Rename keys, export schema strings, CSV column names or order, routes or registry ids.
- Change the meaning of an existing parseable value.
- Touch the Workbook (that is 2.1 and 2.2).
- Delete sample data definitions (Load Sample must still work).

VALIDATION (all must pass before merge)
- git diff --check; npm run verify:av; npm run test:av-video-legacy-browser;
  npm run test:av-context-fill-browser; npm run test:av-save-safety-browser; npm run test:av-nav-browser
- node scripts/probe_av_domain_views.js passes with explicit sample loading
- Keyboard, print preview and the 390px/680px/1280px layout checked on the eight pages in both themes

DELIVERY: CHANGELOG entry. Mark the Video-slice Stage 0 gates closed in
docs/av-suite-consolidation-stage0.md with this evidence, and update this plan's 2.0b row. PR, merge
when green, confirm the Pages run, read back two changed pages on avbydave.com.
```

## Execution brief: 2.0c

```text
EXECUTE — AV Suite Stage 2.0c: suite-wide legacy safety and CI coverage

SOURCE: origin/main after PR #188 has merged. PR B also requires the 2.0b notes follow-up (Video
Patch, Projection Plan and Stream Plan stop passing notes through cleanLong) to have merged; if it
has not, PR B includes that fix. Read docs/av-suite-consolidation-stage2-video.md
(V0-2 to V0-5, V0-9, V0-11 and the 2.0c row). Use an isolated worktree, branch
<agent>/av-video-2-0c-suite-safety, and the .agent-claim protocol. Two pull requests: A (pages)
and B (navigation, CI, Workbook theme, Video load). Either may merge first.

PR A — legacy page safety
1. Shared helper js/av-legacy-safety.js, loaded before each page's inline script and listed in the
   registry's offline assets:
   - isPlainKey(event): false when metaKey, ctrlKey or altKey is set.
   - keepUnreadable(key, raw, label): the 2.0b rule (copy to "<key>.unreadable" unless a different
     copy is already there; otherwise stop saving), returning {saving, message}.
   Move the eight Video pages onto it only if test:av-video-legacy-browser passes unchanged.
2. Shortcuts: every single-key handler on the 23 pages in V0-5 returns early unless
   isPlainKey(event). Extend the verify_av_suite.js modifier check from the eight Video pages to
   every registry page with a keydown handler.
3. Unreadable data: every tool page that parses a saved value calls keepUnreadable before anything
   can save, says so in its status line, and starts empty. Add a verify_av_suite.js source check:
   a page that JSON-parses a declared key references keepUnreadable.
4. Second unreadable value: when "<key>.unreadable" already holds a different copy, the status
   line offers Download both copies (one JSON file holding both raw strings, labelled) and then
   Keep the newer copy instead, which replaces the kept copy only after that download and a
   confirm. Until then the page does not save, as today.
5. Seeding: Input List and StagePlotter start empty on first launch, on an empty list and on a
   parse failure. Samples load only through Load Sample, which confirms when rows exist. Widen the
   verify_av_suite.js seed rule to catch "x = sample<Name>.map(normalize<Name>)" after an early
   return.
6. Browser proof (extend probe_av_video_legacy.mjs or add probe_av_legacy_safety.mjs, in the Pages
   workflow): on every changed page, a Cmd/Ctrl+P keydown is not default-prevented and changes no
   row; an unreadable value is preserved; a second unreadable value blocks saving until the
   operator acts; first launch writes nothing on Input List and StagePlotter.

PR B — navigation, CI, Workbook theme and Video load
7. Navigation (V0-9): locate() in js/sbd-nav.js prefers the group that matches the tool's registry
   department and falls back to the first match, so Display Plan and Projection Plan step through
   Video. test:av-nav-browser asserts both.
8. CI (V0-11): run probe_av_domain_views.js, probe_av_themes.js, probe_av_suite_responsive.js and
   probe_led_wall_configurator.js in deploy-pages.yml. If one fails on main, fix the page or the
   probe's stale expectation first; never weaken an assertion to pass.
9. Workbook theme (WEB-1): remove data-av-theme-lock="dark" so the Workbook follows the suite's
   Warm Paper, Stage Slate or System choice through js/av-theme-mode.js, light by default. Touch
   apps/av-workbook/index.html and styles.css (then rebuild) and the two checks that encode the
   lock: remove av-workbook from lockedDarkTargets in scripts/probe_av_themes.js and from
   LOCKED_THEME_ROUTES in scripts/verify_av_themes.js (with its dark-lock assertion), so both
   check the Workbook's light and dark identities like every other tool. No store, schema or
   model change (that is 2.1).
10. Video load (V0-4): the eight Video pages keep stored text and rows exactly as stored on load
    (no trim, whitespace collapse or length cut; no row dropped past the cap). This includes notes:
    the 2.0b notes follow-up fixes them on Video Patch, Projection Plan and Stream Plan, and PR B
    does not merge until it has (see SOURCE). Caps apply while
    typing and when adding rows; a page holding more rows than its cap says so and blocks adding.
    Add an over-cap fixture to test:av-video-legacy-browser, with a multi-line note longer than
    260 characters on all eight pages.
11. Rendered checks (PR A): the recovery controls from item 4 are checked at desktop width, 680px
    and a narrow phone (390px) in both themes: they stay inside the status area, follow the
    keyboard order, show visible focus and keep 44px touch targets.

MUST NOT (blocking)
- Rename keys, export schema strings, CSV column names or order, routes or registry ids.
- Change the meaning of an existing parseable value or of any plain-key shortcut.
- Touch the Workbook's store, schema or model.
- Add any storage key other than "<key>.unreadable", which the AV by Dave transfer already carries
  (revision 3).

VALIDATION (all must pass before merge)
- git diff --check; npm run verify:av; npm run verify:domain-sites; npm run test:domain-cutover
- npm run test:av-video-legacy-browser; npm run test:av-context-fill-browser;
  npm run test:av-save-safety-browser; npm run test:av-nav-browser; the four probes in item 8
- Registry version bumped; Stage 3D pin and the inventory (--check) agree

DELIVERY: CHANGELOG entry per pull request. Update the V0-2 to V0-5, V0-9 and V0-11 rows, this
plan's 2.0c row, and the Video-slice browser proof in docs/av-suite-consolidation-stage0.md (its
check count, and the limits note once item 10 lands). Read the Codex review before merging; merge when green; confirm the Pages run;
read back two changed pages on avbydave.com.
```

## Increment 2.1 entry gate and engineering contract

Before implementing persistence, surface the consequential choice of independent app documents versus a shared project identity. The recommended first release uses app-owned Video documents and explicit handoffs. This choice cannot reintroduce Workbook as a required host. The module preset/preference-scope choice gates 2.3, not the field audit or independent safety work.

After the dependent product choice is recorded, implement the independent application foundation using current source and repository conventions. Reuse validation, preview, backup and recovery code where appropriate; select libraries and paths autonomously. Keep all legacy fields/statuses and provenance, compute scoped readiness rather than storing a competing status, and require explicit user confirmation before imports or destructive replacement.

Persistence must preserve newer/unknown records, refuse stale saves, keep recoverable backups, report storage failures honestly and leave unsaved edits exportable. Choose concurrency and fallback mechanisms after inspecting the selected store, then test deterministic competing writes and recovery. Do not mandate Workbook schema `v2`, its active ID, or its database as part of this contract.

Historical review of [PR #193](https://github.com/DaveHomeAssist/system-by-dave/pull/193) identified cross-store fallback concurrency and retained-version backup questions for the former Workbook proposal. Keep those findings as reusable engineering risks. They are not questions Dave must answer before designing an independent Video application, and they do not authorize a Workbook migration.

Validation covers field-matrix completeness, save/reload, exports, schema compatibility, stale-tab refusal, cancelled/repeated import, storage failure and no writes to legacy/Workbook stores. Run the relevant repository checks and full current-head CI before merge; then verify destination source revision and real browser behavior. Product and operator acceptance remain separate.

## Risks carried into the phase

- **Operator data already written.** Earlier visits may already have put operator names into `audioLead`, `tdName`, or `producer`. Import 2.2 must surface these in the preview; it must not assume they are correct.
- **Stored samples.** Sample rows may already be saved under real show names. The import preview labels rows that match the built-in samples exactly, and the operator decides whether to import them.
- **Offline cache.** A new app or public withdrawal must update registry assets, version consumers, staged artifacts and caches together. Retire Workbook editor assets from current caches without adding a dedicated recovery path or deleting browser data. Successful Pages deployment alone does not prove updated cache behavior.
- **Different running meaning.** Play Next takes only `ready` cues, while Take Next also takes `hold` and `problem` shots. The P key means Play Next in one tool and "mark problem" in the other. Increment 2.3 must choose one explicit behavior per view and show it to the operator.
