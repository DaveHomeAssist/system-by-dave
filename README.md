# System by Dave

The source for [systembydave.com](https://systembydave.com) — a personal site
documenting the Notion skills, agents, widgets, and templates I build and use.

## Stack

- Current public pages are mostly static HTML
- Shared stylesheet: `css/style.css`
- JavaScript where needed
- App-grade surfaces may use framework code, package tooling, or generated
  assets when that is the right product architecture
- Hosted on GitHub Pages with a custom domain (`CNAME`)

## Local development

No toolchain required. Any static file server works:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open <http://localhost:8000>.

For static pages, edit HTML/CSS directly and refresh. For app-grade surfaces,
use the tooling selected for that surface.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home |
| `agents.html` | Agents catalog |
| `skills.html` | Skills catalog |
| `widgets.html` | Widget gallery |
| `pixelforge/` | PixelForge editor |
| `resume/index.html` | Public resume |
| `resume/av/index.html` | Public AV resume |
| `wedding-ops.html` | Wedding ops case study |
| `privacy-policy.html` | Privacy policy |
| `404.html` / `500.html` | Error pages |
| `html/sbd-brand.html` | Internal brand reference |

## Deploy

Pushes to the default branch deploy automatically via GitHub Pages. The custom
domain is set in `CNAME`. Update `sitemap.xml` (`lastmod`) whenever page
content changes.

## Contributing

This is a personal site, but see `AGENTS.md` for the conventions any
contributor (human or agent) should follow.
