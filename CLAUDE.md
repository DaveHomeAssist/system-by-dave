# CLAUDE.md: System by Dave

Orientation for Claude Code sessions working in this repo.

## Project
**System by Dave**: personal system and workflow documentation site showcasing
Notion skills, agents, widgets, and templates built by Dave Robertson.

- **Domain:** [systembydave.com](https://systembydave.com)
- **Host:** GitHub Pages with custom domain (`CNAME` = `systembydave.com`)

## Stack
- Current public pages are mostly static HTML, and many files are served
  directly.
- Shared styles in `css/style.css`.
- Each page may have an inline `<style>` block for page-specific overrides.
- Shared browser helpers may live in `js/` when multiple static AV pages need
  the same small behavior.
- `docs/public-shell-contract.md` defines the required home, parent, current,
  return, and keyboard-focus behavior for every public navigation shell.
- `docs/public-content-contract.md` defines canonical product names, title
  families, registry-backed counts, and the public consistency release gate.
- App-grade surfaces may use frameworks, bundlers, package managers, generated
  assets, or other stronger architecture when the product calls for it.
- **`js/sbd-registry.js` is the single source of truth for the AV tools**
  (names, routes, departments, phases, storage keys, recommendations, offline
  assets). The AV Suite console, `js/sbd-nav.js`, `js/av-suite-context.js`,
  and `av-suite-worker.js` consume it; `scripts/gen_sitemap.py` regenerates
  `sitemap.xml` from it. Adding a tool = one registry entry + version bump.
- `js/sbd-handoff.js`: staged cross-tool show-data handoff (`sbd.handoff.v1`);
  first pair is Crew Call → Crew Time Log.
- `manifest.json` + per-page manifest/apple-touch-icon links make the AV Suite
  installable; `av-suite-worker.js` (registered by `av-suite.html`) caches the
  suite + all tools for offline field use.

## Pages
- `index.html`: home
- `agents.html`: agents catalog (cards are deep-linked)
- `skills.html`: skills catalog
- `widgets.html`: widget previews (poster cards, not live iframes)
- `depotops/index.html`: local-first home project shopping, inventory, and tool tracking
- `av-suite.html`: AV suite launch hub
- `teleprompter.html`: AV teleprompter
- `show-timer.html`: AV show timer
- `cue-sheet.html`: Cue Sheet browser rundown and lightweight layered playback control
- `cueforge.html`: noindex boundary notice for the separate CueForge Electron app
- `playback-check.html`: AV playback checklist
- `stream-plan.html`: AV stream plan
- `record-log.html`: AV record log
- `power-plan.html`: AV power plan
- `audio-patch.html`: AV audio patch sheet
- `line-check.html`: AV line check tracker
- `room-check.html`: AV room readiness check
- `breakout-room-matrix.html`: AV breakout room matrix
- `speaker-plan.html`: AV speaker deployment plan
- `lighting-patch.html`: AV lighting patch sheet
- `display-plan.html`: AV display plan
- `projection-plan.html`: AV projection plan
- `video-patch.html`: AV video patch sheet
- `network-plan.html`: AV network plan
- `cable-plan.html`: AV cable plan
- `rf-coordination.html`: AV RF coordination sheet
- `site-survey.html`: AV site survey
- `gear-prep.html`: AV gear prep checklist
- `gear-reference.html`: offline AV gear field reference library
- `truck-pack.html`: AV truck pack plan
- `load-in-plan.html`: AV load in plan
- `strike-plan.html`: AV strike plan
- `show-advance.html`: AV show advance tracker
- `crew-call.html`: AV crew call sheet
- `crew-time-log.html`: AV crew time log
- `signal-flow.html`: AV signal flow planner
- `input-list.html`: AV input list and patch sheet
- `stage-plot.html`: PlotForge stage plot
- `plotforge.html`: PlotForge route alias
- `show-board.html`: live breakout-room turn and readiness board
- `show-handoff.html`: AV show handoff builder
- `show-report.html`: AV show report
- `show-task-board.html`: AV show task board
- `change-order.html`: AV change order log
- `client-signoff.html`: AV client sign off tracker
- `camera-shot-list.html`: AV camera shot list
- `comms-check.html`: AV comms check
- `av-calculator.html`: AV calculator
- `ontrack.html`: OnTrack DJ set intelligence (library, sets, debrief notes)
- `pixelforge/`: PixelForge editor for AV graphics and show image fixes
- `resume/index.html`: public resume page
- `resume/av/index.html`: public AV resume page
- `wedding-ops.html`: wedding ops case study
- `remote-desktop.html`: serverless WebRTC remote desktop (screen share, file
  transfer, remote view) — the working reference build of
  `remote-desktop-spec-v2-2026-07-11.md`
- `privacy-policy.html`
- `404.html`, `500.html`: error pages (with OG/Twitter meta)
- `html/sbd-brand.html`: internal brand/design reference

## Deploy
- GitHub Pages from the default branch.
- `CNAME` pins the custom domain.
- `sitemap.xml` is generated — run `python scripts/gen_sitemap.py` after content
  changes. `robots.txt` is hand-maintained.

## Recent work
- Added `remote-desktop-spec-v2-2026-07-11.md` (Remote Desktop product spec &
  implementation plan, v2) and `remote-desktop.html`, a self-contained,
  serverless WebRTC reference build: role picker (host/controller), manual
  copy-paste signaling, `getDisplayMedia` screen view, capability-scoped
  consent, a verbal Short Authentication String bound to both DTLS fingerprints
  for peer authentication, a sticky "sharing" banner + one-click kill switch, a
  chunked/hashed/no-auto-run file-transfer channel, and a normalized
  input-event protocol (visualized host-side, since browsers can't inject OS
  input). Listed on `tools.html` under Labs and in `sitemap.xml`.
- Removed dead subscribe CTA from homepage.
- Replaced live widget iframes on `widgets.html` with poster cards.
- Mobile nav primary links now stay visible at the 680px breakpoint.
- Agent cards on `agents.html` are deep-linked by id.
- `404.html` and `500.html` now carry OG + Twitter Card meta.
- `teleprompter.html` now includes expanded reader font, color,
  background, letter spacing, text shadow, reading line color, format preset,
  word spacing, text stroke, text alignment, reusable custom color swatches,
  reusable saved looks, saved script tags, pinned saved scripts, saved sort,
  saved copy, text only saved script loading, script templates, show package,
  remote, rundown controls, visible Hide controls actions in the header,
  toolbar, and editor header, compact Hide and Show labels, a remembered
  compact toolbar mode with More controls and the `A` shortcut, the `0`
  reset view recovery shortcut, and a remembered controls mode that clears the
  header, toolbar, and footer while
  leaving a small Show controls restore button in read mode and at the lower
  edge after collapsed edit reloads. The header Hide controls action stays
  visibly labeled until phone width, and the collapsed read view offsets the
  run HUD away from the restore button.
- `av-suite.html` is the AV suite launch hub with show profile fields,
  phase recommendations, search, phase and department filters, cross tool
  readiness tracking, readiness notes, operator review queue, issue and note
  focused views, pinned tools, recent tools, saved tool data badges and scan,
  current phase gate list with Copy Phase Gate, skipped recommendation
  confirmation, bulk ready actions that preserve Issue and Skipped exceptions,
  show context handoff links, phase handoff copy with a summary table decision
  matrix and numbered actions, Quick Switcher command palette, return context
  hydration, copyable launch lists, saved browser preferences, tactile button
  feedback, copyable suite profile links, suite JSON import and export, show
  package backup for known AV tool storage, offline cache readiness controls
  backed by `av-suite-worker.js`, and mobile layout containment.
- `js/av-suite-context.js` is the shared AV tool context helper. It reads
  `sbdShow`, `sbdVenue`, `sbdDate`, and `sbdOperator` URL parameters and
  fills matching show metadata fields on AV tool pages that include it. When
  context is present it also adds a compact AV Suite context dock carrying the
  same show profile values, with current tool readiness and note controls,
  compact dock mode, an inline note editor, and previous and next links for
  the current phase's recommended tools.
- `cue-sheet.html` is the AV Suite's browser-based Cue Sheet. It is separate
  from the private CueForge Electron application; `cueforge.html` is a noindex
  boundary notice and never redirects to Cue Sheet. Cue Sheet includes
  equal-size quick-add source types, Preview and Program
  monitors, audible preview transport, four persistent playback layers,
  session-local image/audio/video attachment, live capture and virtual-camera
  input, browser-playable HTTPS gateway streams, a separate multi-display
  program window, and an expandable timeline focus mode. Native NDI requires
  NDI Virtual Input / Webcam Input or a gateway; the browser does not decode
  native NDI directly. See `docs/cue-sheet-media-io.md`.
- `stage-plot.html` is rolled into the AV suite as PlotForge, with
  `plotforge.html` as a context preserving route alias and fallback card.
- `playback-check.html` tracks media playback files, destinations, audio
  routes, backups, duration, ready status, played state, issues, copyable
  summaries, print output, JSON import and export, and CSV export.
- `stream-plan.html` tracks encoders, stream types, platforms,
  destinations, servers, key labels, inputs, resolutions, bitrates, audio,
  records, backup paths, test status, stream gap warnings, copyable summaries,
  print output, JSON import and export, and CSV export.
- `record-log.html` tracks program records, camera ISOs, audio captures,
  media destinations, backups, duration, record status, issues, delivery
  status, copyable summaries, print output, JSON import and export, and CSV
  export.
- `power-plan.html` tracks circuits, power sources, room locations, load
  estimates, capacity, draw, headroom, backups, issue status, copyable
  summaries, print output, JSON import and export, and CSV export.
- `audio-patch.html` tracks console channels, sources, source types, console
  labels, stageboxes, inputs, phantom power, gain, destinations, monitor sends,
  line check status, patch gap warnings, copyable summaries, print output, JSON
  import and export, and CSV export.
- `line-check.html` tracks channels, sources, source types, locations, tech
  assignments, console labels, patch inputs, destinations, talkback checks,
  status, problems, check gap warnings, copyable summaries, print output, JSON
  import and export, and CSV export.
- `room-check.html` tracks show rooms, room checks, owners, due times,
  priorities, room readiness status, blockers, readiness gap warnings,
  copyable summaries, print output, JSON import and export, and CSV export.
- `breakout-room-matrix.html` tracks breakout rooms, tracks, sessions, start
  and end times, techs, producers, audio, video, network, power, readiness
  status, risk, blockers, copyable summaries, print output, JSON import and
  export, and CSV export.
- `speaker-plan.html` tracks speaker zones, loudspeakers, speaker types,
  processor outputs, amps, cable paths, trim, delay, coverage status, backup
  routes, issue status, copyable summaries, print output, JSON import and
  export, and CSV export.
- `lighting-patch.html` tracks fixtures, positions, modes, universes,
  addresses, channels, dimmers, colors, focus notes, patch status, duplicate
  address warnings, copyable summaries, print output, JSON import and export,
  and CSV export.
- `display-plan.html` tracks displays, display types, inputs, processors,
  resolutions, aspect ratios, refresh rates, routes, backup paths, display
  status, backup gap warnings, copyable summaries, print output, JSON import
  and export, and CSV export.
- `projection-plan.html` tracks screens, projection surfaces, sizes, aspect
  ratios, projectors, lenses, throw distances, projector positions, input
  routes, blends, backup paths, alignment status, projection gap warnings,
  copyable summaries, print output, JSON import and export, and CSV export.
- `video-patch.html` tracks video sources, source types, formats, connectors,
  switcher or router inputs, converters, destinations, route outputs, backup
  paths, test status, route gap warnings, copyable summaries, print output,
  JSON import and export, and CSV export.
- `network-plan.html` tracks show control, audio, video, comms, internet,
  IPs, VLANs, switch ports, backup paths, issue status, copyable summaries,
  print output, JSON import and export, and CSV export.
- `cable-plan.html` tracks cable types, cable names, lengths, sources,
  destinations, paths, labels, owners, pull status, trip and slack issues,
  cable gap warnings, copyable summaries, print output, JSON import and
  export, and CSV export.
- `rf-coordination.html` tracks wireless mics, IEMs, IFB, comms packs,
  receivers, frequencies, bands, channels, scan status, backup paths, issue
  status, conflict warnings, copyable summaries, print output, JSON import
  and export, and CSV export.
- `site-survey.html` tracks venue access, loading, rooms, power, rigging,
  network, safety, contacts, findings, follow ups, open items, copyable
  summaries, print output, JSON import and export, and CSV export.
- `gear-prep.html` tracks pull sheets, case IDs, quantities, departments,
  locations, owners, test status, pack status, load status, issues, open
  items, copyable summaries, print output, JSON import and export, and CSV
  export.
- `gear-reference.html` renders structured, authored per-device field sheets
  from `data/gear/`, including local SVG schematics, procedures, consumables,
  intake checks, source references, and per-claim confidence.
- `truck-pack.html` tracks cases, truck zones, load order, unload order,
  weights, owners, pack status, issues, open items, copyable summaries, print
  output, JSON import and export, and CSV export.
- `show-report.html` tracks timeline entries, issues, client requests,
  decisions, crew notes, follow ups, severity, status, report gaps, copyable
  summaries, print output, JSON import and export, and CSV export.
- `show-task-board.html` tracks show day tasks, areas, owners, priorities,
  due times, sources, blockers, status, task gap warnings, copyable
  summaries, print output, JSON import and export, and CSV export.
- `show-board.html` is the reusable timeline-first breakout-room operations board
  with turn and pinch pressure, daily room checks, issue tracking, sign-text import,
  rolling local snapshots, JSON recovery, stale-tab protection, and offline support.
- `change-order.html` tracks client change requests, areas, requesters,
  scope impact, cost, approval status, owners, due times, issue status,
  copyable summaries, print output, JSON import and export, and CSV export.
- `client-signoff.html` tracks show acceptance, deliverables, client
  approvers, signed times, exceptions, follow ups, owners, notes, copyable
  summaries, print output, JSON import and export, and CSV export.
- `load-in-plan.html` tracks trucks, docks, room destinations, departments,
  load in items, owners, due times, build status, blockers, gap warnings,
  copyable summaries, print output, JSON import and export, and CSV export.
- `strike-plan.html` tracks departments, strike items, locations, owners,
  case IDs, destinations, load out status, missing gear, issue status,
  copyable summaries, print output, JSON import and export, and CSV export.
- `show-advance.html` tracks contacts, venue access, schedule, power,
  network, audio, video, labor, deliverables, risks, open questions, owners,
  due dates, priority, status, copyable summaries, print output, JSON import
  and export, and CSV export.
- `crew-call.html` tracks departments, crew names, roles, call times,
  locations, meal breaks, release times, phone numbers, crew status, problem
  flags, copyable summaries, print output, JSON import and export, and CSV
  export.
- `crew-time-log.html` tracks departments, crew names, roles, call times,
  actual check in, meal minutes, release times, hour totals, issue status,
  copyable summaries, print output, JSON import and export, and CSV export.
- `signal-flow.html` tracks AV sources, processors, destinations, formats,
  connectors, backups, route status, issues, copyable summaries, print output,
  JSON import and export, and CSV export.
- AV tools now include `av-suite.html`, `teleprompter.html`, `show-timer.html`,
  `cue-sheet.html`, `cueforge.html`, `playback-check.html`,
  `stream-plan.html`, `record-log.html`, `power-plan.html`, `audio-patch.html`,
  `line-check.html`,
  `room-check.html`, `breakout-room-matrix.html`,
  `speaker-plan.html`,
  `lighting-patch.html`,
  `display-plan.html`,
  `projection-plan.html`,
  `video-patch.html`,
  `network-plan.html`,
  `cable-plan.html`,
  `rf-coordination.html`,
  `site-survey.html`, `gear-prep.html`, `gear-reference.html`, `truck-pack.html`, `load-in-plan.html`, `strike-plan.html`, `show-advance.html`, `crew-call.html`, `crew-time-log.html`,
  `signal-flow.html`,
  `input-list.html`, `stage-plot.html`, `plotforge.html`, `show-board.html`, `show-handoff.html`, `show-report.html`, `show-task-board.html`, `change-order.html`, `client-signoff.html`,
  `camera-shot-list.html`, `comms-check.html`, `av-calculator.html`,
  `ontrack.html`, and `pixelforge/`.

## Conventions
See `AGENTS.md` for coding conventions and the review checklist.
