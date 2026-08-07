# AGENTS.md — Conventions for agents working on this repo

Read `CLAUDE.md` first for project orientation. This file is the rulebook.

## Golden rules

1. **No build step.** Files under the repo root are served as-is by GitHub
   Pages. Do not introduce bundlers, transpilers, or package managers.
2. **Shared styles live in `css/`.** Marketing and doc pages use
   `css/style.css` (the light cream/rust system). AV tool pages use
   `css/av-tool.css` (the dark tool tokens). The two are deliberately
   separate — do not merge them. Any style that could be reused belongs in
   one of them; page-specific overrides go in a single inline `<style>`
   block in that page's `<head>`, after the stylesheet link.
3. **Vanilla only.** No frameworks, no runtime dependencies.

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
  `show-advance`, `crew-call`, `crew-time-log`, `signal-flow`, `stage-plot`, `plotforge`, `show-handoff`, `show-report`, `show-task-board`, `change-order`, `client-signoff`,
  `camera-shot-list`, `comms-check`, `av-calculator`, `resume`,
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

- Design tokens live in the `:root` block of `css/style.css` (marketing
  pages) or `css/av-tool.css` (AV tool pages). Use the CSS custom properties
  rather than hard-coded values.
- An AV tool page links `css/av-tool.css` and then redeclares only the tokens
  it genuinely needs to differ on. A page-local `:root` full of values
  identical to the shared file is duplication — delete it.
- Two pages are intentionally not linked to `css/av-tool.css`, and should
  stay that way:
  - `av-suite.html` is the suite **hub**, not a tool. It has its own
    complete warm design system (72 tokens — warm dark ground, elevation
    steps, text tiers, rust accent, a semantic status set, type scale,
    spacing rhythm, radius and motion scales) and is meant to look
    different from the tools it launches.
  - `teleprompter.html` deviates on every core token it defines, so the
    shared file would remove nothing.
- Mobile breakpoint is **680px**. The mobile nav must keep the primary links
  visible at that breakpoint — do not collapse them into a hamburger-only menu.

## JS conventions

- Inline `<script>` only where needed. No module bundling.
- Prefer progressive enhancement — pages must render correctly with JS off.

## SEO / housekeeping

- `sitemap.xml` and `robots.txt` are hand-maintained. Update `<lastmod>` in
  `sitemap.xml` for any page whose content you change.
- Keep `CHANGELOG.md` meaningful — note material content or layout changes.

## Review checklist (before commit)

- [ ] Page renders at desktop and at the 680px breakpoint.
- [ ] OG + Twitter meta present on user-facing pages.
- [ ] CSP meta present on user-facing pages.
- [ ] External links have `rel="noopener noreferrer"`.
- [ ] `sitemap.xml` `lastmod` bumped if content changed.
- [ ] No new runtime dependencies introduced.
