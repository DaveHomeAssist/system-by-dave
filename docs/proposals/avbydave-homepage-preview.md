# AV by Dave — public homepage preview

Source of truth: `DaveHomeAssist/system-by-dave`. This proposal does **not** change the existing `avbydave.com/` console or any user storage.

## Purpose
Add a public-facing homepage for AV by Dave, including engineering services, a practical tool catalog, brief experience categories, and a contact route. The existing operational console stays at `/av/` once a future cutover is approved.

## Brand and contact
- Brand: **AV by Dave**; site: `avbydave.com`
- Email: `avbydave@gmail.com` (not the personal Gmail address)
- Parent site: `systembydave.com`
- Design: Stage Slate, brand green, simple high-contrast typographic layout

## Tool references
- Throwline: `https://avbydave.com/ProjectorThrow/`
- PixelForge: `https://avbydave.com/pixelforge/`
- PlotForge: `https://avbydave.com/plotforge.html` (registry alias)
- NoteForge: `https://systembydave.com/noteforge/`
- Existing AV Console: `https://avbydave.com/av/`

## Deferred
- Run Review remains in the Frozen workspace; it is intentionally not linked publicly until approved.
- Confirm live endpoint reachability, asset ownership, noindex/canonical/OG metadata, and any cross-domain redirects. External fetch from this session could not confirm current production behavior.

## Future cutover checklist
1. Reconcile current open release/deployment blockers (#361 and #362) before homepage publication.
2. Preserve `/av/` as the operational console with saved-workspace behavior intact.
3. Update `scripts/domain-sites.json` `landingPage`, and revise the `verify_av_suite.js` assertion that currently requires `av/index.html` to be the homepage.
4. Update documentation, sitemap/canonical/social metadata and root routes as needed.
5. Run `npm run verify:av`, `npm run verify:domain-sites`, `npm run verify:public-navigation`, `npm run verify:public-consistency`, keyboard/mobile/browser checks, and release acceptance.
6. Verify `https://avbydave.com/`, `/av/`, asset paths, link redirects, and `source.json` **after** deployment; do not infer success from a passing build or HTTP 200 alone.

This PR is a reviewable design proposal, not a deployment approval.
