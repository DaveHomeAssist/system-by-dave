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
- `cue-sheet.html` — AV cue sheet
- `playback-check.html` — AV playback checklist
- `signal-flow.html` — AV signal flow planner
- `input-list.html` — AV input list and patch sheet
- `stage-plot.html` — AV stage plot
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
  word spacing, text stroke, reusable saved looks, saved script tags, pinned
  saved scripts, saved sort, saved copy, show package, remote, and rundown
  controls.
- `playback-check.html` tracks media playback files, destinations, audio
  routes, backups, duration, ready status, played state, issues, copyable
  summaries, print output, JSON import and export, and CSV export.
- `signal-flow.html` tracks AV sources, processors, destinations, formats,
  connectors, backups, route status, issues, copyable summaries, print output,
  JSON import and export, and CSV export.
- AV tools now include `teleprompter.html`, `show-timer.html`,
  `cue-sheet.html`, `playback-check.html`, `signal-flow.html`,
  `input-list.html`, `stage-plot.html`, `show-handoff.html`,
  `camera-shot-list.html`, `comms-check.html`, and `av-calculator.html`.

## Conventions
See `AGENTS.md` for coding conventions and the review checklist.
