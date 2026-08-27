# Public shell contract

Every public System by Dave route must give a visitor five reliable orientation and escape cues. The presentation may change to suit the product, but the behavior may not.

## Required cues

1. **System home** — a visible link to `/` or an equivalent same-origin home path.
2. **Parent destination** — the nearest useful catalog or operating surface, such as Tools, Notion, AV Suite, or the main Throwline app.
3. **Current location** — the page name is visible and identified as current through `aria-current="page"`, a page heading, or an equally explicit shell label.
4. **Deterministic return** — navigation uses a real URL. Public shells must not depend on browser-history Back behavior.
5. **Keyboard focus** — the first focusable element is a visible-on-focus skip link to the page's application workspace or primary content. Its target uses `tabindex="-1"` when it is not naturally focusable.

## Approved shell variants

- **Shared site header** — marketing, directory, Notion, Prompt Lab, privacy, profile, and systems resume routes use `.sbd-site-header`.
- **Static site return** — standalone products use `.sbd-site-return` with System by Dave, a parent destination, and the current page.
- **AV operator shell** — registry-backed AV tools use the AV Suite operator bar and deterministic suite/phase links.
- **Custom compact shell** — DepotOps, AV Tool Suite index v2, Throwline, and Throwline Stage 3D may retain product-specific chrome when all five required cues are present.

## Responsive and focus behavior

- At and below 680 px, primary destinations remain directly available; they must not disappear behind a hamburger-only control.
- Navigation controls and skip links meet a 44 by 44 CSS-pixel target where they are persistently visible.
- Focus indicators remain visible against every supported theme.
- Skip links precede all other focusable body content and identify the destination in product-specific language.
- Motion does not delay navigation, capture focus, or override `prefers-reduced-motion`.

## Verification

`npm run verify:public-navigation` checks shared headers, deterministic returns, required standalone skip links, focusable targets, and custom-shell destinations. Rendered keyboard testing remains part of release QA because source checks cannot prove stacking, clipping, or theme contrast.
