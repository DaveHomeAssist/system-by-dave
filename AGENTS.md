# AGENTS.md — Conventions for agents working on this repo

Read `CLAUDE.md` first for project orientation. This file is the rulebook.

## Golden rules

1. **No build step.** Files under the repo root are served as-is by GitHub
   Pages. Do not introduce bundlers, transpilers, or package managers.
2. **Shared styles live in `css/style.css`.** Any style that could be reused
   belongs there. Page-specific overrides go in a single inline `<style>`
   block in that page's `<head>`.
3. **Vanilla only.** No frameworks, no runtime dependencies.

## HTML conventions

- Every user-facing page (`index`, `agents`, `skills`, `widgets`,
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
