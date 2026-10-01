# AV Suite consolidation: Stage 2 (Video) phase plan

**State:** Prepared 2026-09-29. Increment 2.0a (shared safety) done 2026-10-01; increments 2.0b to 2.5 not started. Source snapshot `DaveHomeAssist/system-by-dave` `origin/main` at `c21ce22`, registry `v20260925-landing-retire`. This plan turns Stage 2 of the [consolidation specification](av-suite-consolidation-spec.md) into ordered increments with entry and exit gates. It does not claim that any Video workspace behavior is live. Line citations refer to the snapshot commit.

## Where the program stands

- **Stage 1 (equipment pilot)** shipped as an interim bridge: four Gear Reference sheets show the focused FMP model.
- **Stage 0 (inventory)** remains open across all 45 tools. The [Stage 0 record](av-suite-consolidation-stage0.md) lists its gates. This plan closes the Stage 0 gates for the Video slice only.
- **Stage 2 (Video)** started in code with increment 2.0a (2026-10-01), which fixed the shared show-context, card-view, navigation and Workbook load defects. No Video workspace exists yet. Commit `77ae0eb` had changed only the specification, doorway contract, and changelog.

The Video slice is the eight tools the specification assigns to Video (`signal-flow`, `video-patch`, `display-plan`, `projection-plan`, `stream-plan`, `record-log`, `camera-shot-list`, `playback-check`) plus `led-wall-calculator`, whose home was undecided.

## Decisions for this phase

These are recommendations made on 2026-09-29 while preparing the phase, from the source audit below. They are not recorded decisions by Dave, and he may override any row. Each is reversible at the listed cost.

| # | Decision | Reason | Reversal cost |
| --- | --- | --- | --- |
| D1 | **Close Stage 0 for the Video slice, not all 45 tools, before building Video.** Shared-code defects are fixed suite-wide because the fix lives in one file. | The migration contract applies tool by tool. Waiting for every tool would stall Stage 2, while the defects below corrupt the exact data a Video import would read. | Low |
| D2 | **Build the Video workspace inside the AV Workbook app** (`apps/av-workbook/`) on its typed IndexedDB store, reached by its own URL. | The Workbook already has Zod validation, a blank first run, the reviewable URL-context offer, and the preview, backup, and stale-rejection import pattern. The eight legacy pages share no engine (they are inline copies of a template used by 33 root pages), so a new static page would add a ninth schema. The specification already recommends the Workbook for show-attached entities. | Medium |
| D3 | **Use a chain-centric typed model with lossless import.** Records keep each legacy status verbatim and store a derived readiness class. Free text stays text, and structured hints are stored beside the original text, never in place of it. Every imported record carries provenance. | Legacy vocabularies conflict: "backup" is a status, a type, and a free-text path in different tools. Formats and durations are free text that cannot be parsed without loss. | Medium |
| D4 | **Legacy pages remain independent editors of their own keys.** The Video workspace never writes a legacy key. Import copies data after a preview. A repeat import replaces only records that a previous import created. | This avoids two silent writers for one record and keeps the old route as the rollback path. | Low |
| D5 | **Ship a Workbook load guard before any model extension.** A workbook that the running app cannot fully represent opens read-only. The app never saves over it and never repoints the active workbook to a blank one. | `validateWorkbook` requires the literal `v1` schema (`workbookSchema.ts:14`). On any load failure, `loadActiveWorkbook` saves a new blank workbook and repoints the active ID (`store.ts:38-54`). An older cached app would therefore strip new Video arrays on its next save or abandon a newer workbook. | Low |
| D6 | **LED Wall Calculator is a contextual specialist.** It is launched from Video › Displays & Projection and remains in Calculators. It is not a Video record type. | It holds one scenario, reads and writes no show data, and persists only its working state (`avCalculator.v1`) and a profile library. Its only integration is the Power Load handoff to AV Calculator. | Low |
| D7 | **Video becomes a primary destination button** in the `av-suite.html` header and Toolbox that opens the Video workspace. `av-suite.html` keeps its two modes, and the rule that an `sbd*` parameter forces Show Console stays for that page. Show context reaches Video as the Workbook's reviewable offer. | This follows the Front Office precedent without breaking the doorway rule, which `verify_av_suite.js:155` and `probe_av_suite_responsive.js:303` assert. | Low |
| D8 | **Video does not write `av-suite-dashboard.v1` readiness.** It shows derived issues only. Console readiness authority stays open until Stage 7, as the specification records. | This keeps a single writer. | None |

## Stage 0 Video-slice source audit

Four read-only source audits of the nine pages, the Workbook, the doorway shell, the registry, and the verification scripts were run on 2026-09-29. The defects below are confirmed from source. Items marked *reproduced* were exercised with the page's own functions; browser reproduction of the rest is part of increment 2.0.

| ID | Defect | Where | Effect |
| --- | --- | --- | --- |
| V0-1 | The operator hint cascades into other fields. `firstExisting` uses `.some(setInput)`, and `setInput` returns false when the value already matches, so an unchanged field counts as missing. | `js/av-suite-context.js:150-152, 266-287` | Repeat visits with the same `sbdOperator` write the name into Playback Check `audioLead` and then `tdName` (*reproduced*), into Signal Flow `audioLead` and `tdName`, and into Record Log `audioLead` and `producer`, saving each one. Stream Plan fills `producer`, because `streamTech` is not a candidate. Video Patch, Projection Plan, and Camera Shot List have no operator target. Fixed in 2.0a. |
| V0-2 | Samples are seeded on first launch, and the existing CI rule misses them. | `signal-flow.html:830`, `record-log.html:797`, `camera-shot-list.html:980`; outside Video: `breakout-room-matrix.html:311`, `network-plan.html:798`, `power-plan.html:800`, `rf-coordination.html:801`. The rule at `verify_av_suite.js:198-208` matches only `sampleCues` and `sampleItems`. | A show-context fill then saves the samples under the real show name (confirmed for Camera Shot List; same path in Signal Flow and Record Log). Camera Shot List restores its samples whenever the list is empty, so it cannot hold an empty list. |
| V0-3 | Unreadable saved data is silently replaced. | Signal Flow `841-850`, Record Log `807-819`, Camera Shot List `962-964`, Video Patch `295`, and the Display, Projection, and Stream plans | A parse failure loads defaults or samples, and the next save overwrites the original with no copy. The show dashboard already keeps `.unreadable` (`av-suite-context.js:413`). |
| V0-4 | Normalization on load rewrites stored values. | `video-patch.html:294` (blank source becomes "Source", blank format "1080p59.94"); Projection Plan (blank screen becomes "Screen", aspect "16:9"); Stream Plan (blank encoder becomes "Encoder"); `playback-check.html:853` and `record-log.html:1310-1335` (durations); `camera-shot-list.html:933-937` | Gaps disappear on reload. Durations lose data (*reproduced*: `2m30s`→`00:02`, `01:02:03:04`→`01:02:03`, `TBD`→`00:00`, `45 min`→`00:45`). Cleared shot fields come back. |
| V0-5 | Single-key shortcuts ignore modifier keys. | For example, `playback-check.html:1341-1349`; the same pattern appears on all eight Video pages. | Cmd/Ctrl+P runs Play Next, marks a problem, or marks a row patched instead of printing. Cmd/Ctrl+R and D are also intercepted. About 40 root pages with keydown handlers show no modifier check. |
| V0-6 | Legacy JSON import replaces all data with no preview or confirmation. | The import function on all eight pages | Video Patch and the Display, Projection, and Stream plans accept any file that has an `items[]` array, so another tool's export converts silently. Camera Shot List's Load Sample replaces everything without confirmation. |
| V0-7 | Stream keys can leak. | `stream-plan.html:271, 296` | The page asks for a key label, but nothing stops a raw key from travelling in JSON, CSV, and the show package. |
| V0-8 | Domain card views match only `.html` paths and also print. | `js/av-domain-views.js:184-190`; `css/av-domain-views.css` has no print rule | There is no card view on extensionless URLs, and the card deck prints beside the table. Fixed in 2.0a. |
| V0-9 | Navigation groups the tools inconsistently. | `js/sbd-registry.js:89` | Signal Flow sits in the Audio navigation group although its department and console family are Video. Because `locate()` takes the first match, previous/next runs through Graphics for Display and Projection. Fixed in 2.0a for Signal Flow, which is now first in the Video group; Display Plan and Projection Plan still resolve to Graphics first. |
| V0-10 | LED Wall Calculator's working state is under another tool's key. | `js/av-calculator.js:4`; registry `:68-69` | Its working state lives in `avCalculator.v1`, which is declared only under AV Calculator. The inventory row shows only the profile key, and the cross-tab guard watches only profiles. Transfer is covered because the key is declared elsewhere. The preparation pull request records `avCalculator.v1` as a known exception in the generated inventory. |
| V0-11 | No behavior tests cover the Video pages. | `package.json`, `.github/workflows/deploy-pages.yml` | No script tests storage, import, export, CSV columns, or shortcuts for any of the eight. `probe_av_domain_views.js`, `probe_av_themes.js`, `probe_av_suite_responsive.js`, and `probe_led_wall_configurator.js` are not in CI, and the domain-views probe depends on V0-2's samples. |
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

**What the Workbook holds today:**
- `VideoRoute` has `id`, `source`, `processor`, `destination`, `resolution`, `frameRate`, optional `converter` and `backup`, and a `WorkbookStatus` (`types.ts:129-139`). There is no editor.
- `validateVideo` checks only for a missing backup and for 4K without a converter (`validators.ts:164-189`).
- There are no Display, Projector, Encoder, Recording, Shot, or Playback entities.
- `ShowProfile` has no client or handoff field.

**Shared identity problems:**
- One device can appear in several tools with no shared ID. An LED wall can be a Video Patch `display` row, a Display Plan `led-wall` row, and a Projection Plan `led` surface.
- Record destinations appear as Signal Flow's `record` system, a Video Patch `record` type, a Stream Plan `record`/`archive` type, and every Record Log row.

## Draft Video model (finalized in 2.1)

- **Endpoints** are the devices and points in the chain: camera, playback, graphics, switcher, router, processor, converter, encoder, recorder, display, projector, LED wall, confidence, monitor, platform, and other. Each can reference a room, a hardware record, and a Gear Reference sheet.
- **Routes** connect a source endpoint to a destination endpoint through ordered hops, with format, connector, port/input text, backup text or backup route, and status. The existing `videoRoutes` records need an explicit migration; they must not be revalidated into a new shape silently.
- **Task records** are per family: display surfaces (Display and Projection together), stream outputs, recordings, camera shots, and playback cues. Each keeps its legacy fields and its verbatim status set.
- **Derived readiness** is computed by one pure function that maps each family's statuses to open, ready, issue, spare, or done. It drives counts and the Issues view and is never stored as a second status.
- **Provenance** on imported records records the tool, storage key, source row ID, source hash, import time, importer version, and every unmapped field verbatim. The inspector shows it, and nothing is folded silently into notes.
- **People:** tool metadata names become operator rows with a role only after the operator confirms them in the preview. Template placeholders such as "Video Engineer", "Producer", and "Next operator" are excluded, and a name is never replaced with a position code.
- **Endpoint matching** across tools is suggested in the import preview by normalized label and applied only when the operator confirms it. For example, "Camera 1" and "Cam 1" are never merged automatically.

## Increments

Each increment is a separate pull request that merges only when every check is green. No increment retires a route, renames a storage key or export schema, or writes a legacy key from the Workbook.

| Increment | Deliverable | Exit gate |
| --- | --- | --- |
| **2.0a Shared safety** | **Done 2026-10-01.** Fixes V0-1, V0-8, V0-9 and V0-12 (the Workbook load guard, D5). Adds a context-fill browser probe to CI. | Repeating the same context three times changes only one field per page. A newer, unknown-key, or invalid workbook opens read-only, with no IndexedDB write and the active ID unchanged. Registry version, Stage 3D pin, and inventory agree. |
| **2.0b Video page safety and proof** | Fixes V0-2 through V0-7 on the eight Video pages, plus V0-2 on the four non-Video pages that the widened seed check will catch. Adds a Video legacy behavior probe to CI. | For each of the eight pages: a synthetic fixture with every field survives reload unchanged; JSON export round-trips; CSV headers match the matrix; print hides the page chrome; Cmd/Ctrl+P is not intercepted; first launch writes nothing; unreadable data is preserved; a foreign file is rejected; replacing existing rows needs confirmation. Stage 0 gates for the Video slice are then closed in the Stage 0 record. |
| **2.1 Video model** | Typed Video entities, Zod schema, validators, and migration of existing `videoRoutes`, following the draft above. Schema bump only after 2.0a has deployed. | Every matrix field has a typed home or a provenance entry. Migration tests cover the existing workbook shapes. An older cached app, or a tab left open on 2.0a, meets the 2.0a guard rather than stripping data. |
| **2.2 Legacy Video import** | One reviewable import covering all eight keys: preview with counts, unmapped fields, and suggested endpoint matches; backup download; explicit confirmation; stale-preview rejection; idempotent repeat import. | Unit tests per tool with the 2.0b fixtures. A browser test clicks through preview, cancel, apply, repeat import, and restore from backup. Legacy keys are byte-identical afterwards. |
| **2.3 Video views** | Editable Switching & Routes first (the chain backbone), then Displays & Projection, Stream & Record, Cameras, Playback, and Issues. Each view has a shareable URL, and Back/Forward restore it. The run-mode rules of Play Next and Take Next are reproduced or explicitly replaced with operator-visible behavior. | Camera-to-screen, camera-to-stream/record, and playback-to-display paths keep status, backup, and export details. Gear Reference opens from an endpoint. Throwline and LED Wall Calculator launch from Displays & Projection with only the fields they document. |
| **2.4 Doorway entry** | Video button in the `av-suite.html` header and Toolbox (D7), behind one reversible switch. Doorway contract and registry updated. | Video is visible without search at 390px, 680px, 1280px, and 32:9. The `sbd*` rule for `av-suite.html` still passes. Removing the switch restores the previous doorway. |
| **2.5 Stage 2 acceptance** | Release readback on `avbydave.com`, an operator trial, and a specification status update. | The specification's Stage 2 exit gate. All eight legacy routes remain directly reachable. Operator acceptance is recorded separately from technical proof. |

Increments 2.1 through 2.5 get their own execution briefs once the previous increment has merged. Model and view work benefits from review of the shipped guard and probe.

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

## Risks carried into the phase

- **Operator data already written.** Earlier visits may already have put operator names into `audioLead`, `tdName`, or `producer`. Import 2.2 must surface these in the preview; it must not assume they are correct.
- **Stored samples.** Sample rows may already be saved under real show names. The import preview labels rows that match the built-in samples exactly, and the operator decides whether to import them.
- **Offline cache.** Workbook bundles have fixed file names. Every Workbook change needs the registry version bump so that `av-suite-worker.js` replaces the cache (`av-suite-worker.js:8-10`).
- **Different running meaning.** Play Next takes only `ready` cues, while Take Next also takes `hold` and `problem` shots. The P key means Play Next in one tool and "mark problem" in the other. Increment 2.3 must choose one explicit behavior per view and show it to the operator.
