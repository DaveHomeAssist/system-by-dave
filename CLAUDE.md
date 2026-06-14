# CLAUDE.md — System by Dave

Orientation for Claude Code sessions working in this repo.

## Project
**System by Dave** — personal system and workflow documentation site showcasing
Notion skills, agents, widgets, and templates built by Dave Robertson.

- **Domain:** [systembydave.com](https://systembydave.com)
- **Host:** GitHub Pages with custom domain (`CNAME` = `systembydave.com`)

## Stack
- Static HTML — **no build step**, files are served directly.
- Shared styles in `css/style.css`.
- Each page may have an inline `<style>` block for page-specific overrides.
- Vanilla JS only (no frameworks, no bundlers).

## Pages
- `index.html` — home
- `agents.html` — agents catalog (cards are deep-linked)
- `skills.html` — skills catalog
- `widgets.html` — widget previews (poster cards, not live iframes)
- `teleprompter.html` — AV teleprompter
- `show-timer.html` — AV show timer
- `cue-sheet.html` — CueForge cue sheet and run of show control
- `cueforge.html` — CueForge route alias
- `playback-check.html` — AV playback checklist
- `stream-plan.html` — AV stream plan
- `record-log.html` — AV record log
- `power-plan.html` — AV power plan
- `audio-patch.html` — AV audio patch sheet
- `line-check.html`: AV line check tracker
- `room-check.html`: AV room readiness check
- `speaker-plan.html` — AV speaker deployment plan
- `lighting-patch.html` — AV lighting patch sheet
- `display-plan.html` — AV display plan
- `projection-plan.html` — AV projection plan
- `video-patch.html` — AV video patch sheet
- `network-plan.html` — AV network plan
- `cable-plan.html` — AV cable plan
- `rf-coordination.html`: AV RF coordination sheet
- `gear-prep.html`: AV gear prep checklist
- `load-in-plan.html`: AV load in plan
- `strike-plan.html`: AV strike plan
- `show-advance.html`: AV show advance tracker
- `crew-call.html`: AV crew call sheet
- `signal-flow.html` — AV signal flow planner
- `input-list.html` — AV input list and patch sheet
- `stage-plot.html` — PlotForge stage plot
- `plotforge.html` — PlotForge route alias
- `show-handoff.html` — AV show handoff builder
- `camera-shot-list.html` — AV camera shot list
- `comms-check.html` — AV comms check
- `av-calculator.html` — AV calculator
- `resume/index.html` — public resume page
- `wedding-ops.html` — wedding ops case study
- `privacy-policy.html`
- `404.html`, `500.html` — error pages (with OG/Twitter meta)
- `html/sbd-brand.html` — internal brand/design reference

## Deploy
- GitHub Pages from the default branch.
- `CNAME` pins the custom domain.
- `sitemap.xml` and `robots.txt` are hand-maintained — bump `lastmod` on content changes.

## Recent work
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
  remote, rundown controls, a visible toolbar Hide controls action, compact
  Hide and Show labels, and a remembered controls mode that clears the header,
  toolbar, and footer while leaving a small Show controls restore button.
- `cue-sheet.html` is rolled into the AV suite as CueForge, with
  `cueforge.html` as a route alias.
- `stage-plot.html` is rolled into the AV suite as PlotForge, with
  `plotforge.html` as a route alias.
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
- `gear-prep.html` tracks pull sheets, case IDs, quantities, departments,
  locations, owners, test status, pack status, load status, issues, open
  items, copyable summaries, print output, JSON import and export, and CSV
  export.
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
- `signal-flow.html` tracks AV sources, processors, destinations, formats,
  connectors, backups, route status, issues, copyable summaries, print output,
  JSON import and export, and CSV export.
- AV tools now include `teleprompter.html`, `show-timer.html`,
  `cue-sheet.html`, `cueforge.html`, `playback-check.html`,
  `stream-plan.html`, `record-log.html`, `power-plan.html`, `audio-patch.html`,
  `line-check.html`,
  `room-check.html`,
  `speaker-plan.html`,
  `lighting-patch.html`,
  `display-plan.html`,
  `projection-plan.html`,
  `video-patch.html`,
  `network-plan.html`,
  `cable-plan.html`,
  `rf-coordination.html`,
  `gear-prep.html`, `load-in-plan.html`, `strike-plan.html`, `show-advance.html`, `crew-call.html`,
  `signal-flow.html`,
  `input-list.html`, `stage-plot.html`, `plotforge.html`, `show-handoff.html`,
  `camera-shot-list.html`, `comms-check.html`, and `av-calculator.html`.

## Conventions
See `AGENTS.md` for coding conventions and the review checklist.
