# Davai reference navigation

The generated reference has a skip link after the breadcrumb, so the first Tab
lands on publisher navigation. Its light-only scrolling document also needs the
workspace viewport contract applied when this surface changes.

The smallest shared repair belongs in `build_site.py`: first-focus skip to a
focusable main landmark, visible persistent light/dark control, a bounded long
reference panel, and persistent primary page navigation. Desktop uses a side
rail, compact screens use a top rail, and phones use a bottom rail. Secondary
memory-layer links remain available in a native disclosure. Wide layouts use
additional columns for the layer directory while retaining readable text.

Preserve every page, diagram, code sample, URL and fragment, native links,
no-JavaScript content/navigation and printable reference. The theme and per-route
reading position use new namespaced keys and tolerate unavailable storage.
No application data, inference, deployment or hardware integration is introduced.

Acceptance: all fourteen routes retain their content and first-focus skip link;
check keyboard navigation, both themes and reload, fragment links, no-JavaScript
navigation, print, reduced motion, and root containment at desktop, 680px,
phone, landscape, short-screen and ultrawide sizes. Verify generator parity and
public navigation/content contracts. Physical devices and assistive technology
remain separate acceptance work.

## Candidate verification

Dominic, using the existing Playwright 1.63.0 Chromium container: generator
parity, public navigation and public consistency pass. The browser probe covers
all fourteen routes at 1440x900, 680x900, 375x812, 844x390, 320x256 and 3840x1080
in both themes, keyboard skip and layer disclosure, page navigation and Back,
`#layers`, reading-position reload, print layout, no JavaScript and blocked
storage. Original main content is unchanged apart from whitespace; the footer
now belongs to the bounded reference panel. No browser page or console errors.

Run `python3 build_site.py` to regenerate the committed pages, stylesheet,
reference script and ZIP. Run `npm run verify:davai`,
`npm run verify:public-navigation`, `npm run verify:public-consistency` and
`npm run test:davai-browser`. `CHROME_CHANNEL` takes precedence over `CHROME_BIN`;
otherwise the probe uses the installed Playwright browser. `DAVAI_OUTPUT` enables
optional screenshots outside tracked source.

These are candidate checks. Merge, deployment, physical-device behavior,
assistive-technology acceptance and actual browser zoom are separate gates.
