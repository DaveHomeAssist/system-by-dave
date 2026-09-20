# Release matrix and accessibility references

## Practical environment coverage

Use the actual target environment when available. These viewport sizes are examples for finding layout defects, not device certification or mandatory fixed breakpoints.

| Environment | Representative scope | Check |
| --- | --- | --- |
| Desktop | Wide 1440x900; short 1280x720; maximized/fullscreen | Bounded canvas, reachable controls, resize, text zoom |
| Tablet | 768x1024 and landscape, touch input | Gesture/page-scroll coexistence, orientation, target selection |
| Phone | 390x844 and a narrow 320px content width | Reflow, navigation, readable panels, browser chrome |
| Keyboard | Real browser with pointer unused | Component lookup, all actions, focus return |
| Assistive technology | Actual screen reader/browser if available | Labels, relationships, updates, usable fallback |
| Renderer unavailable | WebGL disabled or context lost | Same essential instructions and component catalog |
| Offline | Fresh disconnected session; actual launch mode | No missing dependency; export revision matches |
| Deployed | Actual requested URL, refreshed session | Correct revision, route/assets, changed behavior |

Record browser/version, OS, CSS viewport, input mode, physical/emulated designation, build revision, result, and evidence. Test prioritized tasks instead of exhaustively enumerating screen dimensions. Stop optional testing once the remaining concrete risks and required gates are covered.

## Accessibility criteria

Use current official W3C text when making a conformance assessment. Checked 2026-09-20:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): keyboard access (2.1.1), visible focus (2.4.7), focus not obscured (2.4.11), text contrast (1.4.3), non-text contrast (1.4.11), text resize (1.4.4), reflow (1.4.10), name/role/value (4.1.2). Normal text generally needs 4.5:1, large text 3:1; applicable non-text UI information needs 3:1. Text resizing reaches 200%; reflow is evaluated at 320 CSS pixels width for vertically scrolling content, with specified exceptions. Do not use a 2D-diagram exception to exempt surrounding controls or instructions.
- [Target size minimum, 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): AA uses 24x24 CSS pixels or a stated exception, including qualifying spacing. Choose larger 44px targets as a practical field-use target where feasible; do not mislabel 44px as the AA minimum. The enhanced 44x44 criterion is 2.5.5 at AAA.
- [Dragging movements, 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html): provide a single-pointer alternative to dragging unless an exception applies. Keyboard access is also necessary where applicable; keyboard support alone does not satisfy the single-pointer requirement. Buttons for rotate, tilt, zoom, and selecting parts can provide alternatives.

Automated scans cover only what they actually evaluate. Do not assign a universal percentage of accessibility coverage or label the entire app compliant based on a scan. Keep focused manual tasks and their gaps explicit.

## Revision parity

Give each release a visible/retrievable guide ID and revision; tie them to the actual generated catalog and files. A matching marker alone is weak evidence if someone copied it into an older build. Compare the relevant payload and changed interaction as well. Record cached-old and freshly-fetched results separately when diagnosing stale delivery.

The manifest helper requires Python 3.9 or newer and calculates SHA-256 for files beneath a distribution directory, rejects symlinks, and reports missing, altered, and extra files during verification. It cannot evaluate external URLs, dynamic network dependencies, accessibility, or browser compatibility. Put the manifest outside the payload directory to avoid self-hashing.
