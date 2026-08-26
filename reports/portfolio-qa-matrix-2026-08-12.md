# Five-product accessibility QA matrix

**Run date:** 2026-08-12 ET / 2026-08-13 UTC

**Completed at:** 2026-08-13T03:40:20Z

**Target:** WCAG 2.2 Level AA plus the portfolio's 44 by 44 CSS-pixel active-target baseline

**Original run status:** Red — the matrix completed, seven owned defects were recorded, and six issues contained release-blocking WCAG A/AA failures.

**Remediation status (2026-08-13):** Amber — all six release blockers are closed and pass their affected production reruns. The release gate is Green in the re-tested browser scope; CurlPlan #9 remains open as non-blocking 44px hardening. See `reports/portfolio-accessibility-remediation-2026-08-13.md`.

## Scope

| Product | Tested route |
| --- | --- |
| CurlPlan web | https://davehomeassist.github.io/curl-plan/ |
| Phillies Wire | https://phillieswire.com/ |
| Frontier Signals data lab | https://davehomeassist.github.io/frontier-signals-pipeline/ |
| Hat in Ring | https://hatinring.com/ |
| Frontier Signals | https://frontiersignals.io/ |

Screen-reader testing was excluded from this run. The matrix covers browser-observable keyboard, semantic, visual, responsive, spacing, target-size, and motion behavior; it does not certify complete WCAG conformance.

## Environment and method

- Google Chrome 151.0.7922.109 on macOS 26.6.
- Desktop viewport: 1280 by 900 CSS pixels.
- Mobile viewport: 390 by 844 CSS pixels.
- Reflow viewport: 640 CSS pixels, representing a 1280-pixel desktop surface at 200% zoom.
- Full forward traversal through every sequential focus stop, then reverse traversal from the document boundary.
- Keyboard activation of each product's representative core journey.
- DOM and browser accessibility-tree checks for names, labels, landmarks, duplicate IDs, relationships, hidden focus targets, and interactive semantics.
- WCAG 1.4.12 spacing override: 1.5 line height, 0.12em letter spacing, 0.16em word spacing, and 2em paragraph spacing.
- Computed sRGB text-contrast sampling plus desktop and mobile screenshot review for gradients and image-backed regions.
- `prefers-reduced-motion: reduce` with active-animation inspection after load.
- Horizontal overflow and active-target measurements at desktop, 200% reflow, and mobile widths.

## Result matrix

| Product | Keyboard and journey | Semantics | 200% reflow and spacing | Contrast | Targets | Motion | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CurlPlan web | Demo entry and primary-tab navigation pass; reverse traversal works, but seven closed-sheet controls enter the initial focus order | Names and landmarks pass; closed dialogs are not inert or hidden | No page overflow and no newly clipped text | No failure found in computed or screenshot review | Four post-demo tabs are 39–52 by 41px, below the 44px portfolio gate | Pass | **Red** |
| Phillies Wire | 20 active stops traverse in both directions; accordion, theme, and copy-link actions pass | Pass | No page overflow or visible content loss; two flagged elements are intentionally visually hidden helpers | Pass; a 4.0:1 chevron is decorative and redundant with `aria-expanded` | Pass | Pass | **Green in tested scope** |
| Frontier Signals data lab | 37 active stops traverse in both directions; Enter and Space switch desk focus correctly | Pass | No page overflow or newly clipped text | Pass | Pass | Pass | **Green in tested scope** |
| Hat in Ring | 74 active stops traverse and representative view changes work | Fail: 6 sortable headers and 41 candidate rows are actionable but expose only table semantics | Page reflow passes; a two-line card summary grows from 38px to 75px and clips under required spacing | Fail: white `Exploratory` text on `#B26A1C` is 4.22:1 | 13 desktop controls miss 44px; `The Wire` is 74 by 19px and misses AA minimum | Pass | **Red** |
| Frontier Signals | 34 active stops traverse in both directions; Disclosures navigation passes | Pass | Page reflow passes; one latest-signal title becomes newly clipped at 543px client width versus 553px content width | Pass | Pass | Pass | **Red** |

Green means no failure was found in the named test scope. It is not a claim of complete WCAG conformance.

## Core journey evidence

| Product | Keyboard journey | Result |
| --- | --- | --- |
| CurlPlan web | Signed-out landing → Explore the demo → Spiels tab | Pass after demo entry; closed-sheet focus defect recorded separately |
| Phillies Wire | Game Status collapse → dark-theme toggle → Copy link | Pass; state and visible feedback changed for every action |
| Frontier Signals data lab | Quantum → Chips with Enter → Power with Space | Pass; pressed and active state changed correctly |
| Hat in Ring | The Field → Dossiers → The Field → Cards | Pass; URL/view state changed correctly |
| Frontier Signals | Home → Disclosures | Pass; route changed to `/disclosures/` |

## Owned defects

| Product | Defect | Criterion or gate | Disposition |
| --- | --- | --- | --- |
| CurlPlan | [Closed sheets remain in the keyboard focus order](https://github.com/DaveHomeAssist/curl-plan/issues/8) | WCAG 2.4.3 and 4.1.2 | **Release blocker** |
| CurlPlan | [Post-demo tabs miss the 44px portfolio target](https://github.com/DaveHomeAssist/curl-plan/issues/9) | Portfolio 44px gate | P2 hardening |
| Hat in Ring | [`Exploratory` badge contrast is 4.22:1](https://github.com/DaveHomeAssist/hatinring/issues/4) | WCAG 1.4.3 | **Release blocker** |
| Hat in Ring | [Sortable headers and candidate rows do not expose their action roles](https://github.com/DaveHomeAssist/hatinring/issues/5) | WCAG 2.4.3 and 4.1.2 | **Release blocker** |
| Hat in Ring | [`The Wire` is 74 by 19px; 12 more controls miss the portfolio target](https://github.com/DaveHomeAssist/hatinring/issues/6) | WCAG 2.5.8 plus portfolio 44px gate | **Release blocker** for the AA failure; P2 for the remaining targets |
| Hat in Ring | [Card summaries clip under required text spacing](https://github.com/DaveHomeAssist/hatinring/issues/7) | WCAG 1.4.12 | **Release blocker** |
| Frontier Signals | [A latest-signal title clips under required text spacing](https://github.com/DaveHomeAssist/frontier-signals/issues/2) | WCAG 1.4.12 | **Release blocker** |

All seven issues are assigned to `DaveHomeAssist` and include reproduction steps, evidence, acceptance criteria, and blocking disposition.

## Release decision

The six release-blocking issues are closed and the same affected checks pass against the deployed fixes. The release gate is Green in the re-tested browser scope. CurlPlan issue 9 remains open as non-blocking hardening, so the broader portfolio target baseline is Amber until its deployed 44px check passes.
