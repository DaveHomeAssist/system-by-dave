# AV Suite Upgrade Implementation Plan — 2026-07-03

## Source Audit

This plan comes from the live audit of `systembydave.com` AV Suite tools on
July 3, 2026. Teleprompter and PlotForge are intentionally out of scope for
feature work in this pass.

Current implementation snapshot: static GitHub Pages app, shared AV tool registry
in `js/sbd-registry.js`, service worker offline caching, shared mobile table
reflow helper, and per-tool browser HTML/CSS/JS pages.

## Patch Scope For This Pass

1. **Trust and source-of-truth cleanup**
   - Replace stale `40+` / `~40` AV Suite public copy with the registry-backed
     current count of 38 tools.
   - Bump the AV Suite cache version so offline installs refresh shared fixes.

2. **AV Suite hub accessibility**
   - Make the closed Operator Settings drawer inert so keyboard and assistive
     technology users cannot tab into offscreen controls.
   - Preserve existing focus return and Escape behavior when the drawer closes.

3. **Mobile operator usability**
   - Tighten the AV Suite command bar at phone width so primary actions wrap
     into a stable grid instead of clipping.
   - Improve shared fixed AV tool navigation on phones so it no longer sits on
     top of form controls without reserving page space.
   - Keep the existing responsive table card reflow and make touch/editor
     controls inside mobile cards easier to scan.

4. **Verification coverage**
   - Add a dependency-free registry/offline manifest verifier.
   - Add a dependency-free Chrome/CDP responsive probe for the hub and
     representative tools.
   - Use these scripts for local proof before commit and live proof after push.

5. **Housekeeping**
   - Update `CHANGELOG.md`.
   - Regenerate `sitemap.xml` after content changes.
   - Commit and push to `main`; GitHub Pages deploys from the pushed branch.

## Deferred Roadmap

These upgrades remain outside this patch set because they require broader
product design and data model work:

- Role presets for A1, V1, producer, IT/power, room tech, and crew lead.
- Cross-tool shared entities for rooms, contacts, crew, circuits, and devices.
- Domain-specific validators for RF conflicts, IP conflicts, power headroom,
  address conflicts, backup gaps, and missing owners.
- Client/crew-ready PDF or print packet templates.
- Full suite handoff package import/export polish beyond the existing JSON
  show package.

## Completion Gates

This pass is complete only when:

- Local git state starts clean and ends with one intentional commit.
- All local AV registry/offline checks pass.
- Responsive probe passes for the AV Suite hub and representative tools.
- `sitemap.xml` is regenerated.
- Changes are pushed to `origin/main`.
- GitHub Pages reports the new commit deployed or the live site serves the new
  content from the pushed revision.
