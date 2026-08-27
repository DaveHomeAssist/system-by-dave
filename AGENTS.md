# AGENTS.md — System by Dave execution contract

Read `CLAUDE.md` first for project orientation. This file defines how agents
change, verify, document, and release this repository.

## Instruction precedence

This file does not override platform instructions or an applicable parent
workspace contract. Within this repository, use the following order:

1. Platform and workspace instructions
2. This `AGENTS.md` repository contract
3. Explicit task requirements that do not conflict with the above
4. `CLAUDE.md` architecture and task-specific documentation
5. Existing implementation patterns as evidence of current behavior

If instructions, documentation, generated data, and implementation disagree,
investigate the discrepancy. Do not silently rewrite working behavior merely
to make stale documentation true.

## Golden rules

1. **Use the release authority.** `DaveHomeAssist/system-by-dave` `main` is the
   production source. Reconcile the exact remote commit before editing; use an
   isolated clean worktree when another checkout is dirty, stale, or divergent.
2. **Build for the product.** GitHub Pages and the current static surfaces are
   implementation details, not limits. Use static HTML for simple pages and
   app-grade source, packages, or generated assets when the behavior warrants
   them.
3. **Change canonical sources.** Update registries, generators, application
   source, or managed-release inputs rather than patching their consumers or
   generated artifacts independently.
4. **Preserve public contracts and user data.** Routes, product names, storage
   keys, import/export schemas, offline behavior, and handoff shapes remain
   stable unless the task explicitly changes them. Add migrations and
   compatibility coverage when persistence changes.
5. **Update relevant documentation.** Documentation is relevant when a change
   affects architecture, public behavior or claims, operator workflow,
   verification commands, or release history. Do not create documentation
   churn for implementation details already captured by code and tests.

## Product boundaries

- **Cue Sheet** is the System by Dave browser tool at `cue-sheet.html`. Its
  registry id is `cue-sheet`, its persisted browser key is `cueSheet.v1`, and
  its current export schema is `system-by-dave.cue-sheet.v2`.
- **CueForge** is a separate private Electron desktop application in the
  `DaveHomeAssist/cueforge` repository. Do not use CueForge as a name, route
  alias, registry id, schema, probe name, or description for Cue Sheet.
- `cueforge.html` is a noindex product-boundary notice. It must never redirect
  or canonicalize to `cue-sheet.html`.

## Source-of-truth map

- **AV tool inventory:** `js/sbd-registry.js` owns tool names, routes,
  departments, phases, storage keys, recommendations, aliases, and offline
  assets. Consumers must not maintain competing inventories.
- **Indexable routes:** `scripts/gen_sitemap.py` owns the static route list and
  adds indexable AV routes from the registry. Run it; do not hand-edit
  `sitemap.xml`.
- **Public shell and naming:** `docs/public-shell-contract.md` and
  `docs/public-content-contract.md` own navigation behavior, canonical names,
  title families, and checked public counts.
- **AV Workbook:** edit `apps/av-workbook/`; regenerate `av-workbook/` with the
  package build.
- **NoteForge:** synchronize the verified external build with
  `npm run sync:noteforge`; do not hand-edit managed artifact files.
- **Throwline catalog:** use `npm run sync:throwline-catalog` and
  `npm run verify:throwline`.
- **History:** record material behavior, architecture, content, or layout
  changes in `CHANGELOG.md`. Keep feature ledgers out of `CLAUDE.md`.

## HTML and public-shell conventions

- Every user-facing HTML page needs a full `<head>` with title, description,
  canonical URL, theme color, Open Graph metadata, Twitter Card metadata, and
  a page-appropriate Content Security Policy.
- Indexable static routes belong in `STATIC_PAGES` in
  `scripts/gen_sitemap.py`; indexable AV tools belong in the registry. Routes
  intentionally excluded from search need an explicit `noindex` policy and
  must remain out of the sitemap.
- `html/sbd-brand.html` is an internal noindex design document, but still needs
  an explicit indexing policy.
- Public navigation must satisfy `docs/public-shell-contract.md`, including a
  deterministic same-origin return and a first-focus skip link.
- External links use `rel="noopener noreferrer"`; use `target="_blank"` only
  when a new tab is intentional.

## CSS, responsive, accessibility, and motion

- Marketing and document-page styles shared across routes belong in
  `css/style.css`. Shared public navigation belongs in
  `css/sbd-public-nav.css`. AV palette authority belongs in
  `css/av-theme.css`; specialist product layout and operational color meaning
  may remain local.
- Static page-specific overrides go in one inline `<style>` block after shared
  styles. App-grade products may use their source-level stylesheet structure.
- Use existing tokens instead of duplicating hard-coded palette values.
- At 680px and below, primary destinations remain directly available; do not
  hide them behind a hamburger-only menu. Persistent controls target at least
  44 by 44 CSS pixels and retain visible focus in every supported theme.
- Use CSS transitions or the Web Animations API for simple motion. Use the
  existing GSAP dependency for coordinated sequences, scroll choreography,
  FLIP layout changes, or runtime playback control—not as a default for one-off
  effects. Prefer the installed package or `js/vendor/gsap.min.js`; do not add
  a new CDN dependency.
- Every nonessential animation must have a complete
  `prefers-reduced-motion` bypass. Animate transform and opacity where
  possible, clean up timelines/listeners, and do not let motion delay
  navigation, capture focus, or compete with CSS transitions on the same
  property.

## JavaScript, applications, and persistence

- Static pages may use inline scripts for genuinely page-local behavior.
  Reusable browser behavior belongs in `js/`. App-grade surfaces may use the
  repository's package and build tooling.
- Document content, navigation, safety warnings, and recovery instructions
  remain available without JavaScript. Application-only behavior may require
  JavaScript but must fail clearly rather than render a misleading surface.
- Load shared prerequisites before the code that calls them. In particular,
  load `js/sbd-handoff.js` before a page script that stages or consumes a
  handoff, and load `js/sbd-registry.js` before registry consumers such as
  `js/av-suite-context.js` and `js/sbd-nav.js`.
- Cross-tool handoffs use `js/sbd-handoff.js` (`sbd.handoff.v1`). Stage the
  target tool's own normalized import shape, carry show context, and require
  confirmation before import.
- Persistence changes must normalize invalid values, migrate existing saved
  state, preserve compatible imports/exports, and test reload behavior. Never
  turn an estimate or advisory output into a safety verdict.

## Documentation policy

- `CLAUDE.md` describes stable architecture, boundaries, major systems, and
  pointers. It is not a changelog or complete page inventory.
- `README.md` is the human entry point and must carry current setup, build, and
  deployment instructions.
- Focused behavior belongs in `docs/`; material release history belongs in
  `CHANGELOG.md`; canonical inventories belong in code or generators.
- Update only documentation affected by the change, then read it back with the
  implementation to catch contradictions.

## Verification matrix

Run the smallest relevant local set first, then require the complete GitHub
Pages workflow before a production claim.

- **All changes:** `git diff --check` and review the complete diff.
- **Sitemap or public-route changes:** `python3 scripts/gen_sitemap.py`,
  `npm run verify:indexing`, and confirm no unexpected generated diff.
- **Public shell or public copy:** `npm run verify:public-navigation` and
  `npm run verify:public-consistency`.
- **AV registry, tools, themes, or offline assets:** `npm run verify:av`; add
  the relevant Gear Reference or browser probe when affected.
- **AV Workbook:** `npm run typecheck:av-workbook`,
  `npm run test:av-workbook`, and `npm run build:av-workbook`.
- **Throwline:** `npm run verify:throwline`.
- **NoteForge artifact:** `npm run verify:noteforge`.
- **Rendered UI changes:** verify desktop, the 680px breakpoint, and a narrow
  phone; check keyboard order, visible focus, reduced motion, containment,
  touch targets, and unexpected browser-console errors.
- **Persistence changes:** verify migration, save, reload, reset, import, and
  export behavior against existing stored shapes.

## Definition of Done

- [ ] Requested behavior works and affected existing behavior still works.
- [ ] Canonical sources and generated artifacts are synchronized.
- [ ] Relevant source checks, tests, builds, and rendered checks pass.
- [ ] Public metadata, shell, indexing, accessibility, persistence, and motion
      contracts remain satisfied where applicable.
- [ ] Relevant documentation and `CHANGELOG.md` are current without duplicated
      inventories or history.
- [ ] The diff contains no accidental edits, secrets, or unexplained churn.
- [ ] The change is committed and pushed; required CI passes; the authorized
      merge/deploy completes; the exact live surface is read back.
