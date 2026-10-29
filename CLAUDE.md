# CLAUDE.md: System by Dave

Project orientation for coding sessions in this repository. Read this file to
understand the product and architecture, then read `AGENTS.md` for the execution
contract.

## Project

**System by Dave** is Dave Robertson's public portfolio and operating-system
site for AV workflows, Notion systems, agents, utilities, and product
handoffs.

- Production: [systembydave.com](https://systembydave.com)
- Repository: `DaveHomeAssist/system-by-dave`
- Hosting: GitHub Pages from `main`, with `CNAME` preserving the custom domain.
  The FMP suite and AV by Dave are also published from here to housevideo.app
  and avbydave.com (`docs/domain-sites.md`).

## Architecture

- The public site is primarily static HTML served directly from the repository
  root. Static pages can stay simple; app-grade surfaces may use framework
  source, package tooling, generated assets, or a stronger architecture when
  the product behavior justifies it.
- `css/style.css` owns the light cream/rust marketing system.
  `css/sbd-public-nav.css` owns shared public-shell navigation, and
  `css/av-theme.css` owns the Warm Paper and Stage Slate AV palettes. Product
  layouts may remain local while consuming those shared contracts.
- `js/sbd-registry.js` is the single source of truth for AV tool names, routes,
  departments, phases, storage keys, recommendations, aliases, and offline
  assets. AV navigation, context, handoff, console, and service-worker code
  consume it.
- `scripts/gen_sitemap.py` generates `sitemap.xml` from its static-page list
  plus the AV registry. `robots.txt` remains hand-maintained.
- `docs/public-shell-contract.md` defines the required public navigation and
  keyboard escape cues. `docs/public-content-contract.md` defines canonical
  product names, title families, registry-backed counts, and the public-copy
  release gate.
- `scripts/domain-sites.json` lists the pages published on housevideo.app and
  avbydave.com (AV by Dave pages come from the registry).
  `scripts/stage_domain_sites.mjs` stages and checks those sites, and the Pages
  workflow pushes them to their own repositories with per-repository deploy keys.
- `manifest.json`, `av-suite-worker.js`, and per-page manifest links provide
  installable and offline AV field use.
- GSAP is available through the package dependencies and the vendored browser
  build. Its use is governed by the motion policy in `AGENTS.md`.
- three.js is pinned to one release (r184) across Throwline and the FMP pages;
  the version and viewer-lifecycle policy lives in fmp-suite
  `docs/three-policy.md` and is summarized in `AGENTS.md`.

## Repository map

- `index.html`, `tools.html`, and root HTML files: public directories, case
  studies, and operator tools
- `css/`: shared visual, navigation, theme, and responsive-table contracts
- `js/sbd-registry.js`: canonical AV inventory and offline manifest
- `js/sbd-nav.js`, `js/av-suite-context.js`, `js/sbd-handoff.js`: shared AV
  navigation, show context, and cross-tool handoff behavior
- `apps/shared/av-console/`: shared panel-console workspace used by AV consoles (`docs/av-console.md`)
- `apps/av-suite/`: React/TypeScript source for the AV Suite shell; `av/` is its
  generated artifact (one console; `docs/av-suite-shell.md`)
- `apps/<family>/src/pack.tsx`: each application's panel pack (contract in
  `apps/shared/av-console/pack.ts`), mounted by the shell and by the
  application's own standalone route
- `apps/av-workbook/`: React/TypeScript source for AV Workbook
- `av-workbook/`: noindex redirect to Toolbox; no editor artifact
- `apps/fmp-camera-sim/`: React/TypeScript/Three.js source for the FMP Camera
  Simulator; `camera-sim/` is its generated artifact (published on housevideo.app)
- `ProjectorThrow/`: Throwline planner and Stage 3D companion
- `depotops/`, `pixelforge/`, `noteforge/`: product-specific public surfaces;
  NoteForge is a managed release artifact synchronized from its own repository
- `data/`: authored product data such as the Gear Reference library
- `docs/`: public contracts, product boundaries, audits, and focused plans
- `scripts/`: generators, release syncs, source verifiers, and browser probes
- `.github/workflows/deploy-pages.yml`: full verification and Pages deployment
- `.github/workflows/noteforge-sync.yml` and `noteforge-drift.yml`: NoteForge
  canonical release sync (on NoteForge's `noteforge-release` dispatch) and the
  nightly drift check against NoteForge `main`
- `CHANGELOG.md`: implementation and release history

## Major systems

### Public shell and content

All public surfaces must preserve the home, parent, current-location, return,
and keyboard-focus behavior in the public shell contract. Public names, counts,
metadata, and title families are release-gated by the public content contract.

### AV by Dave

AV by Dave is one console. The shell at `/av/` (`apps/av-suite/`, built into
`av/`) opens on an empty Workspace view; the Rail recalls each application's
views in place, the chooser lists every department's individual native panels,
and specialist tools retain standalone links rather than whole-app tiles. On
avbydave.com the shell is also the home page (`scripts/domain-sites.json`
`landingPage`). `av-suite.html` (the former Toolbox and Show Console doorway),
the two landing pages and the 34 legacy sheet pages are noindex redirect stubs
into the console; their registry entries carry `retired:'<pack>'`, keep their
storage keys for data transfer and one-time import, and leave the offline
suite, sitemap and public counts (`verify:av` checks the stubs). Shell views
live in `sbd.avSuite.workspace.v1`; each application keeps its own document and
explicit Save. See `docs/av-suite-shell.md`. `js/av-theme-mode.js` and
`js/av-theme.js` apply the operator's Warm Paper, Stage Slate, or System choice.

The [AV Suite shell brief](docs/av-suite-shell.md) (2026-10-13) is the current
direction, amended October 14: one `/av/` console, ten native department packs,
no whole-app tiles, standalone specialist links, and legacy sheet pages retired. Do not start further
per-family console conversions outside that brief. The earlier
[consolidation plan](docs/av-suite-consolidation-spec.md) set the
previous direction: Toolbox as default, focused applications with optional
modules, independently launchable Unified Video, and public Workbook withdrawal
while retaining its concept for possible redesign. AV Video now combines Signal Flow and Video Patch at `/av-video/`, with app-owned data and optional patch, displays/projection, cameras, playback, checks and backup modules. Cameras and Playback add ordered shot/cue records and previewed legacy imports with original-source retention. Displays & Projection records link explicitly to routes and import the legacy Display Plan / Projection Plan sheets without changing their originals. The remaining application consolidation is target work. See `docs/av-video.md`. Workbook is not a
required host or database for new applications. Dave clarified on 2026-10-02
that its withdrawal needs no recovery notice, dedicated export flow, transition
period or migration project; do not factor assumed Workbook adoption into scope.
Read the remaining consequential choice gates before implementation; decide
routine engineering details autonomously.

### Cross-tool state

`js/av-suite-context.js` carries the show profile and readiness context.
`js/sbd-handoff.js` stages confirmed, target-native import data under
`sbd.handoff.v1`. Persistent storage and exported schemas are public interfaces;
changes require compatibility and migration coverage. On housevideo.app,
`shader/fmp-training.js` keeps FMP camera-training progress shared by Shading
practice and the Camera Simulator under `fmpTraining.v1`
(`docs/camera-training-links.md`).

### Built and managed products

AV Workbook source is retained in `apps/av-workbook/` and builds into its ignored
`dist/` for verification. Neither source nor editor bundles are published.
`av-workbook.html` and `av-workbook/` return directly to Toolbox without touching saved data.
The FMP Camera Simulator is edited in `apps/fmp-camera-sim/` and built into
`camera-sim/` (plus its standalone offline HTML) with `npm run build:camera-sim`;
it sits beside `/shader/` rather than in the managed `fmp/` export. Its release log,
`apps/fmp-camera-sim/CHANGELOG.md`, supplies the version the build embeds, and every
change to `camera-sim/` needs a new entry there.
NoteForge is built in its own repository and synchronized through
`scripts/sync_noteforge_release.js`; do not hand-edit its managed artifact.
Throwline's catalog is synchronized and verified through its dedicated scripts.

## Important boundaries and exceptions

- **Cue Sheet** is the browser tool at `cue-sheet.html`, with registry id
  `cue-sheet`, storage key `cueSheet.v1`, and export schema
  `system-by-dave.cue-sheet.v2`.
- **CueForge** is a separate private Electron application in
  `DaveHomeAssist/cueforge`. `cueforge.html` is a noindex boundary notice and
  must not redirect or canonicalize to Cue Sheet.
- **StagePlotter** is the lightweight room-layout tool at `stage-plot.html`,
  with registry id `stageplotter` and preserved storage key `stage-plot.v1`.
- **PlotForge** is the separate full lighting-plot application in
  `DaveHomeAssist/plotforge`; `plotforge.html` is its noindex handoff to the
  deployed app and must not alias StagePlotter.
- Throwline and PixelForge keep specialist product tokens and chrome while
  satisfying the shared public-shell contract.
- `html/sbd-brand.html` is an internal, noindex design reference rather than a
  public product page.

## Current architectural state

- Public navigation and public content contracts are active release gates.
- AV inventory, storage metadata, offline assets, and tool sitemap entries are
  registry-backed; do not copy the full inventory into this file.
- Cue Sheet and CueForge are separate products, with the boundary enforced in
  copy, routing, registry data, and verification.
- Recent feature details and historical capability inventories belong in
  `CHANGELOG.md`, focused product docs, and tests rather than here.

## Where to look next

- Public navigation behavior: `docs/public-shell-contract.md`
- Public naming and metadata: `docs/public-content-contract.md`
- Cue Sheet media and native NDI boundary: `docs/cue-sheet-media-io.md`
- FMP Camera Simulator architecture, evidence and gates: `docs/fmp-camera-simulator.md`; what
  happened to each finding of the September 2026 audits: `docs/fmp-camera-simulator-audit-2026-09.md`
- Camera Shading Practice console and its state contract: `docs/shader-practice.md`
- Links between the camera training tools and the FMP explorers: `docs/camera-training-links.md`
- AV inventory and storage keys: `js/sbd-registry.js`
- Sitemap membership: `scripts/gen_sitemap.py`
- AV Suite doorway (retired 2026-10-13; history): `docs/av-suite-doorway.md`
- AV Suite shell (one console): `docs/av-suite-shell.md`
- Verification commands: `package.json` and `AGENTS.md`
- Other domains (housevideo.app, avbydave.com), saved-data transfer and
  cutover: `docs/domain-sites.md`
- FMP release and hygiene: `docs/fmp-public-release.md` and
  `docs/fmp-hygiene-routine.md`
- Deployment gates: `.github/workflows/deploy-pages.yml`
- Recent changes: `CHANGELOG.md`

Startup sequence:

`CLAUDE.md` → `AGENTS.md` → task-relevant contract/source/tests → implement →
verify → update relevant documentation → merge when green → release and read back

Merging is automatic: once a pull request's checks pass with no conflict and no
review thread waiting, merge it without asking, unless Dave says otherwise
(`AGENTS.md` golden rule 6).
