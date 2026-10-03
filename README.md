# System by Dave

The source for [systembydave.com](https://systembydave.com) — a personal site
documenting the Notion skills, agents, widgets, and templates I build and use.

## Stack

- Current public pages are mostly static HTML
- Shared stylesheet: `css/style.css`
- JavaScript where needed
- App-grade surfaces may use framework code, package tooling, or generated
  assets when that is the right product architecture
- The canonical AV registry currently contains **46 browser tools**; public
  count copy is release-gated against `js/sbd-registry.js`
- Hosted on GitHub Pages with a custom domain (`CNAME`)

## AV Video

[AV Video](https://avbydave.com/av-video/) combines an interactive Signal Flow canvas and Video Patch in one independent application. Source lives in `apps/av-video/`; `npm run build:av-video` regenerates the committed `av-video/` artifact. Use `npm run typecheck:av-video`, `npm run test:av-video` and `npm run test:av-video-browser` to verify it. See [the workflow and data contract](docs/av-video.md).

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
| `fmp-index/index.html` | Retired FMP working index: noindex redirect to the `/fmp/` hub, keeping query and hash |
| `fmp/` | Managed FMP video operations hub, camera commissioning, bowl training, and rig reference; authenticated camera API remains SETUP TEST only; [release and sync contract](docs/fmp-public-release.md) |
| `fmpwalk/` | Managed local-first preshow venue walk; configured for walk.housevideo.app with destination verification before cutover; explicit download, Gmail, and Notion actions; no silent writes |
| `afterbreak/index.html` | Pier 68 run of show: private crew timeline, bar, promo, gear, crew, and open items; noindex |
| `av-suite.html?entry=show` | Show Console for show-attached AV operations |
| `av-suite.html?entry=toolbox` | Show-independent AV Toolbox directory |
| `docs/av-suite-development-assets-index.md` | AV Suite source, spec, migration, release, and historical-asset authority map |
| `av-calculator.html` | Six quick AV calculations and a copyable field summary on avbydave.com |
| `led-wall-calculator.html` | Viewport LED wall planner with cabinet preview, mobile results and section jumps, manufacturer-PF-gated current estimates, and a Power Load handoff on avbydave.com; [operator and verification notes](docs/led-wall-calculator.md) |
| `av-suite-landing2.html` | Source for the avbydave.com home page, staged as `/` on that domain |
| `av-suite-landing.html` | Retired previous landing; a noindex redirect to the current AV by Dave home (UX-005) |
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
domain is set in `CNAME`. After changing an indexable page or route, run
`python3 scripts/gen_sitemap.py`; do not edit the generated `sitemap.xml`
directly.

### housevideo.app, walk.housevideo.app and avbydave.com

The FMP suite and AV by Dave are also published on their own domains. The
Pages workflow stages them with `scripts/stage_domain_sites.mjs` and pushes each
to its repository (`DaveHomeAssist/housevideo`, `DaveHomeAssist/housevideo-walk`,
`DaveHomeAssist/avbydave`) with that repository's deploy key. The walk destination
must pass the infrastructure and auth gates in `docs/domain-sites.md` before any
old-origin redirects deploy. Check the staged sites locally with:

```bash
npm run verify:domain-sites
```

The AV domain root is the show-first Show Console and Toolbox landing page. Its
source is `av-suite-landing2.html`; the staging script publishes it as `/`, while
`av-suite.html` remains the stable operator doorway. The previous landing was
retired (UX-005); `/av-suite-landing.html` now redirects to the current home.

`docs/domain-sites.md` covers the page lists, saved-data transfer, and the
cutover checklist.

### FMP Camera Simulator

The catwalk PTZ trainer at `housevideo.app/camera-sim/` is edited in
`apps/fmp-camera-sim/` and built into the committed `camera-sim/` folder,
including its standalone offline HTML. Rebuild and check it with:

```bash
npm run typecheck:camera-sim
npm run test:camera-sim
npm run build:camera-sim
npm run test:camera-sim-browser
```

CI fails if `camera-sim/` does not match a fresh build. See
`docs/fmp-camera-simulator.md`.

### Camera Shading Practice

`shader/practice.html` is an offline, deterministic camera-shading simulation
published on housevideo.app with the Shader reference. Its engine, renderer,
controller, offline worker, state compatibility and coaching model are
described in [`docs/shader-practice.md`](docs/shader-practice.md). Check it
with:

```bash
npm run verify:shader-practice
npm run test:shader-practice-browser
```

### Philly Cheesesteak Heatmap

The heatmap at `/cheesesteaks/` is a static export of the private
`DaveHomeAssist/philly-cheesesteak-heatmap` repository. Build it there with
`npm run build:static` (base path `/cheesesteaks`), then copy it in:

```bash
npm run sync:cheesesteaks -- /absolute/path/to/philly-cheesesteak-heatmap
npm run verify:indexing
npm run verify:public-navigation
```

The sync replaces `cheesesteaks/`, drops the export's own 404 pages (Pages serves
only the root `404.html`), and records the source commit in
`cheesesteaks/SOURCE.txt`. Do not hand-edit `cheesesteaks/`.

### NoteForge canonical release

NoteForge is built in its own repository and committed here as the canonical
`/noteforge/` production artifact. After its exact source commit passes CI,
build it with Node.js 22 and sync that verified `dist/` without introducing a
cross-repository deploy credential:

```bash
npm run sync:noteforge -- --source /absolute/path/to/noteforge/dist --source-commit <40-character-commit>
npm run verify:noteforge
npm run test:noteforge-shell-browser
```

The sync command accepts only a clean NoteForge checkout whose `HEAD` matches
the supplied commit. It preserves the System by Dave breadcrumb and public
navigation, removes only previously recorded build artifacts, and writes
`noteforge/source_provenance.json` with deterministic artifact hashes.
The host shell offsets the mobile toolbar below its breadcrumb even when
NoteForge inserts a skip link between them. The browser probe checks real theme
clicks and persistence, both skip links, focus and viewport clearance at 390px,
680px and desktop in both themes and reduced-motion preferences. It runs on
relevant pull requests and before Pages deployment. Set `CHROME_CHANNEL=chrome`
to use installed Chrome and `NOTEFORGE_CAPTURE_DIR` to save screenshots and results.

## Portfolio governance

- [Portfolio product roadmap — August 2026](docs/portfolio-product-roadmap-2026-08-10.md)

## Contributing

This is a personal site, but see `AGENTS.md` for the conventions any
contributor (human or agent) should follow.

### AV workspace foundation

The first bounded workspace consumers are Throwline Stage 3D and LED Wall Calculator. See [architecture, generated sources and device acceptance](docs/av-workspace.md). Run `npm run sync:av-workspace` to regenerate the shared inline blocks, `npm run verify:av` to check them, and `npm run test:av-workspace` for the touch viewport and offline matrix.
