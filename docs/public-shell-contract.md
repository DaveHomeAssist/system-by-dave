# Public shell contract

Every public System by Dave route must give a visitor five reliable orientation and escape cues. The presentation may change to suit the product, but the behavior may not.

## Required cues

1. **System home** — a visible link to the page's own site home. On systembydave.com that is `/`. On a site listed in `scripts/domain-sites.json` that has cut over, it is that site's declared `home`, because those pages are served from a client domain where systembydave.com is not the system the reader is in. A page that *is* its site's declared home satisfies this cue by being it.
2. **Parent destination** — the nearest useful catalog or operating surface, such as Tools, Notion, AV Suite, or the main Throwline app.
3. **Current location** — the page name is visible and identified as current through `aria-current="page"`, a page heading, or an equally explicit shell label.
4. **Deterministic return** — navigation uses a real URL. Public shells must not depend on browser-history Back behavior.
5. **Keyboard focus** — the first focusable element is a visible-on-focus skip link to the page's application workspace or primary content. Its target uses `tabindex="-1"` when it is not naturally focusable.

## Approved shell variants

- **Shared site header** — marketing, directory, Notion, Prompt Lab, privacy, profile, and systems resume routes use `.sbd-site-header`.
- **Static site return** — standalone products use `.sbd-site-return` with System by Dave, a parent destination, and the current page.
- **AV operator shell** — registry-backed AV tools use the AV Suite operator bar and deterministic suite/phase links.
- **Custom compact shell** — DepotOps, AV Tool Suite index v2, Throwline, and Throwline Stage 3D may retain product-specific chrome when all five required cues are present.
- **FMP operations shell** — the `/fmp/` hub, the camera, house, guide, gear, build, ptz, rig and equipment model routes, and `/fmpwalk/` keep product chrome exported from `DaveHomeAssist/fmp-suite`. `/fmp-index/`, maintained here, is a redirect to the hub. Every page except the hub links to `/fmp/`, which is both its parent and, on housevideo.app, that site's home. The hub is that home. The first focusable element is a skip link whose target is on the same document, and pages that use `<base>` must still resolve the skip link to their own URL. These pages carry no System by Dave home link: housevideo.app is a client operating surface and fmp-suite `338cf27` struck the publisher branding deliberately. Fix gaps at the exporter, never by hand-editing `fmp/` or `fmpwalk/`.
- **Pages on another domain** — pages listed in `scripts/domain-sites.json` are also served from housevideo.app or avbydave.com. Home is that site's declared `home`, not systembydave.com. A page may still link System by Dave, and any systembydave.com-only destination it does link is absolute (`https://systembydave.com/`); `npm run verify:domain-sites` fails on a relative one. A publisher link is no longer required to satisfy the home cue, so a client surface can carry none.

## Error and alias pages

- `404.html` is served at whatever path was requested, so its links, styles, icon, and scripts use root-absolute URLs (`/`, `/tools.html`, `/css/…`).
- Typed-address aliases such as `/fmp-walk/` are noindex redirect pages. They carry a real link to the target, home, and the parent hub for visitors without JavaScript or meta refresh.

## Responsive and focus behavior

- At and below 680 px, primary destinations remain directly available; they must not disappear behind a hamburger-only control.
- Navigation controls and skip links meet a 44 by 44 CSS-pixel target where they are persistently visible.
- Focus indicators remain visible against every supported theme.
- Skip links precede all other focusable body content and identify the destination in product-specific language.
- Motion does not delay navigation, capture focus, or override `prefers-reduced-motion`.

## Verification

`npm run verify:public-navigation` checks shared headers, deterministic returns, required standalone skip links, focusable targets, custom-shell destinations, root-absolute `404.html` references, and every FMP page listed in `FMP_SHELL_PAGES`. Home paths come from `homePathsFor` in `scripts/domain_sites_lib.js`, which reads each site's declared `home`, so no gate hard-codes a domain. An FMP page must pass the home, parent, and skip-target checks. An HTML page under `fmp/` or `fmpwalk/` without an explicit entry fails.

`FMP_KNOWN_SHELL_GAPS` records the FMP gaps found in the 2026-09-17 hygiene baseline, and the verifier prints each one as a warning. Any gap not on that list fails. So does a listed gap that no longer occurs, which means the `fmpwalk` export that fixes a gap must remove its entry in the same commit. Rendered keyboard testing remains part of release QA because source checks cannot prove stacking, clipping, or theme contrast.
