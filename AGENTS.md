# AGENTS.md — Conventions for agents working on this repo

Read `CLAUDE.md` first for project orientation. This file is the rulebook.

## Golden rules

1. **Product-first architecture.** The current public site is served by GitHub
   Pages, but that is an implementation detail, not a product constraint.
   Build tooling, frameworks, and package managers are allowed when they are
   the right way to build an app-quality surface.
2. **Shared styles live in `css/style.css`.** Any style that could be reused
   belongs there. Page-specific overrides go in a single inline `<style>`
   block in that page's `<head>`.
3. **Use the right tool for the surface.** Static pages can stay simple.
   App-grade workflows may use framework code, shared packages, or generated
   assets when the added complexity is justified by the product behavior.

## HTML conventions

- Every user-facing page (`index`, `agents`, `skills`, `widgets`,
  `av-suite`, `teleprompter`, `show-timer`, `cue-sheet`, `cueforge`, `input-list`,
  `playback-check`, `stream-plan`, `record-log`, `power-plan`, `audio-patch`,
  `line-check`,
  `room-check`,
  `breakout-room-matrix`,
  `speaker-plan`,
  `lighting-patch`,
  `display-plan`, `projection-plan`, `video-patch`,
  `network-plan`, `cable-plan`, `rf-coordination`, `site-survey`, `gear-prep`, `truck-pack`, `load-in-plan`, `strike-plan`,
  `show-advance`, `crew-call`, `crew-time-log`, `signal-flow`, `stage-plot`, `plotforge`, `show-board`, `show-handoff`, `show-report`, `show-task-board`, `change-order`, `client-signoff`,
  `camera-shot-list`, `comms-check`, `av-calculator`, `depotops`, `ontrack`, `resume`,
  `wedding-ops`, `privacy-policy`, `404`, `500`) must have:
  - A full `<head>` with `<title>`, `<meta name="description">`, canonical
    link, and theme color.
  - Open Graph meta (`og:type`, `og:title`, `og:description`, `og:url`,
    `og:image`).
  - Twitter Card meta (`twitter:card`, `twitter:title`, `twitter:description`,
    `twitter:image`).
  - A `Content-Security-Policy` meta tag.
- `html/sbd-brand.html` is an internal design doc and is exempt from the
  meta/CSP requirements.
- All external links must use `rel="noopener noreferrer"` (and `target="_blank"`
  when opening in a new tab).

## CSS conventions

- Design tokens live in the `:root` block of `css/style.css` (colors, fonts,
  shadows). Use the CSS custom properties rather than hard-coded values.
- Mobile breakpoint is **680px**. The mobile nav must keep the primary links
  visible at that breakpoint — do not collapse them into a hamburger-only menu.

## JS conventions

- Inline `<script>` only where needed. No module bundling.
- Prefer progressive enhancement — pages must render correctly with JS off.

## AV tool registry (single source of truth)

- **`js/sbd-registry.js` owns the AV tool list**: names, routes, departments,
  phases, per-tool `localStorage` keys, per-phase recommendations, aliases, and
  the offline asset manifest. The AV Suite console, `js/sbd-nav.js`,
  `js/av-suite-context.js`, and `av-suite-worker.js` all consume it.
- **Adding a tool:** add one entry to `tools` (plus its id in `navDepartments`
  if it belongs in the universal nav), bump `SBD_REGISTRY.version` so the
  service-worker cache rolls, then run `python scripts/gen_sitemap.py`.
- **Include order on tool pages:** `js/sbd-registry.js` →
  (`js/sbd-handoff.js` when the page sends/receives handoffs, loaded before the
  tool's inline script) → `js/av-suite-context.js` → `js/sbd-nav.js` (defer).
- **Cross-tool handoffs** use `js/sbd-handoff.js` (`sbd.handoff.v1`): stage the
  target tool's own import-JSON shape, navigate with
  `SBD_HANDOFF.carryContext()`, and let the target's `normalizeState()` import
  it behind a confirm prompt.

## SEO / housekeeping

- `sitemap.xml` is generated: run `python scripts/gen_sitemap.py` after content
  changes (tool URLs come from the registry; lastmod from git). `robots.txt`
  stays hand-maintained.
- Keep `CHANGELOG.md` meaningful — note material content or layout changes.

## Review checklist (before commit)

- [ ] Page renders at desktop and at the 680px breakpoint.
- [ ] OG + Twitter meta present on user-facing pages.
- [ ] CSP meta present on user-facing pages.
- [ ] External links have `rel="noopener noreferrer"`.
- [ ] `sitemap.xml` `lastmod` bumped if content changed.
- [ ] New runtime dependencies, if any, are intentional and justified by the
      app surface.
