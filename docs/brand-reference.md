# Brand reference

`html/sbd-brand.html` remains an internal noindex reference. The seven original
section bodies and SVG artwork are retained. This change does not establish a
new brand palette or revise the March 2026 reference content.

The reading shell defaults to light, exposes a dark theme, and groups the
reference into keyboard tabs. All opens the complete reference for reading or
browser find. A bounded reference panel scrolls without moving the document.
Without JavaScript every section remains readable in that same panel. Printing
expands every section. Session-only reading preferences use the isolated
`sbd.brand-reference.v1` key; denied storage leaves navigation usable.

The meta content policy precedes all loads. It allows only local scripts and
images, the existing Google Fonts stylesheet/font origins, and inline styles
needed by the existing specimen swatches. Connections, inline scripts, objects,
base URL changes and form submissions are denied. This is defense in depth,
not authentication or a claim that the document is private. A meta policy does
not provide the response-header-only frame-ancestors protection.

Reference: [MDN content policy directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

Run `node scripts/probe_brand_reference.mjs` using the repository Playwright
installation. The isolated browser fixture checks section access at six sizes
in both themes, keyboard/history behavior, session preferences, print, no-JS
access, blocked storage and intentional policy rejection. Font requests are
stubbed to keep this fixture offline; font-provider availability and exact
remote typography are separate from this offline evidence. Set
`BRAND_LIVE_FONTS=1` for a separate run that loads the existing Google font
origins and asserts a loaded Syne font. Set `BRAND_SCREENSHOT` to
an optional output path outside source for a phone screenshot.

No API, inference, hardware, deployment or real user data is used by this probe.
