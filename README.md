# System by Dave

The source for [systembydave.com](https://systembydave.com) — a personal site
documenting the Notion skills, agents, widgets, and templates I build and use.

## Stack

- Static HTML, no build step
- Shared stylesheet: `css/style.css`
- Vanilla JS where needed
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

Edit HTML/CSS directly — changes are visible on refresh.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home |
| `agents.html` | Agents catalog |
| `skills.html` | Skills catalog |
| `widgets.html` | Widget gallery |
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
