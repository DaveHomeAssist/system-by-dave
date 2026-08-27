# System by Dave

The source for [systembydave.com](https://systembydave.com) — a personal site
documenting the Notion skills, agents, widgets, and templates I build and use.

## Stack

- Current public pages are mostly static HTML
- Shared stylesheet: `css/style.css`
- JavaScript where needed
- App-grade surfaces may use framework code, package tooling, or generated
  assets when that is the right product architecture
- The canonical AV registry currently contains **44 browser tools**; public
  count copy is release-gated against `js/sbd-registry.js`
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
| `depotops/index.html` | Local-first project shopping, inventory, and tool tracking |
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

### NoteForge canonical release

NoteForge is built in its own repository and committed here as the canonical
`/noteforge/` production artifact. After its exact source commit passes CI,
build it with Node.js 22 and sync that verified `dist/` without introducing a
cross-repository deploy credential:

```bash
npm run sync:noteforge -- --source /absolute/path/to/noteforge/dist --source-commit <40-character-commit>
npm run verify:noteforge
```

The sync command accepts only a clean NoteForge checkout whose `HEAD` matches
the supplied commit. It preserves the System by Dave breadcrumb and public
navigation, removes only previously recorded build artifacts, and writes
`noteforge/source_provenance.json` with deterministic artifact hashes.

## Portfolio governance

- [Portfolio product roadmap — August 2026](docs/portfolio-product-roadmap-2026-08-10.md)

## Contributing

This is a personal site, but see `AGENTS.md` for the conventions any
contributor (human or agent) should follow.
