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

## Conventions
See `AGENTS.md` for coding conventions and the review checklist.
