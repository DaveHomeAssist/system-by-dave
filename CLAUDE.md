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
- Hosting: GitHub Pages from `main`, with `CNAME` preserving the custom domain

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
- `manifest.json`, `av-suite-worker.js`, and per-page manifest links provide
  installable and offline AV field use.
- GSAP is available through the package dependencies and the vendored browser
  build. Its use is governed by the motion policy in `AGENTS.md`.

## Repository map

- `index.html`, `tools.html`, and root HTML files: public directories, case
  studies, and operator tools
- `css/`: shared visual, navigation, theme, and responsive-table contracts
- `js/sbd-registry.js`: canonical AV inventory and offline manifest
- `js/sbd-nav.js`, `js/av-suite-context.js`, `js/sbd-handoff.js`: shared AV
  navigation, show context, and cross-tool handoff behavior
- `apps/av-workbook/`: React/TypeScript source for AV Workbook
- `av-workbook/`: generated AV Workbook Pages artifact
- `ProjectorThrow/`: Throwline planner and Stage 3D companion
- `depotops/`, `pixelforge/`, `noteforge/`: product-specific public surfaces;
  NoteForge is a managed release artifact synchronized from its own repository
- `data/`: authored product data such as the Gear Reference library
- `docs/`: public contracts, product boundaries, audits, and focused plans
- `scripts/`: generators, release syncs, source verifiers, and browser probes
- `.github/workflows/deploy-pages.yml`: full verification and Pages deployment
- `CHANGELOG.md`: implementation and release history

## Major systems

### Public shell and content

All public surfaces must preserve the home, parent, current-location, return,
and keyboard-focus behavior in the public shell contract. Public names, counts,
metadata, and title families are release-gated by the public content contract.

### AV by Dave

`av-suite.html` is one doorway with two addressable workspaces: Show Console at
`?entry=show` and the show-independent AV Toolbox at `?entry=toolbox`. A neutral
first visit asks the operator to choose; any explicit `sbd*` show parameter
forces Show Console. The registry drives both workspaces' tool inventory,
storage metadata, navigation, offline assets, and generated sitemap entries.
Toolbox-only pins, recents, search, and filter preferences live in
`av-suite-ui.v1` and must never mutate the show dashboard in
`av-suite-dashboard.v1`. See `docs/av-suite-doorway.md` for the complete routing
and persistence contract. `js/av-theme-mode.js` and `js/av-theme.js` apply the
operator's Warm Paper, Stage Slate, or System choice.

### Cross-tool state

`js/av-suite-context.js` carries the show profile and readiness context.
`js/sbd-handoff.js` stages confirmed, target-native import data under
`sbd.handoff.v1`. Persistent storage and exported schemas are public interfaces;
changes require compatibility and migration coverage.

### Built and managed products

AV Workbook is edited in `apps/av-workbook/` and built into `av-workbook/`.
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
- `stage-plot.html` is the PlotForge implementation; `plotforge.html` is its
  context-preserving route alias.
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
- AV inventory and storage keys: `js/sbd-registry.js`
- Sitemap membership: `scripts/gen_sitemap.py`
- AV Suite doorway and storage: `docs/av-suite-doorway.md`
- Verification commands: `package.json` and `AGENTS.md`
- Deployment gates: `.github/workflows/deploy-pages.yml`
- Recent changes: `CHANGELOG.md`

Startup sequence:

`CLAUDE.md` → `AGENTS.md` → task-relevant contract/source/tests → implement →
verify → update relevant documentation → release and read back
