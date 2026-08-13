# Portfolio accessibility baseline

**Date:** 2026-08-12 ET / 2026-08-13 UTC

**Target:** WCAG 2.2 Level AA plus the portfolio's 44 by 44 CSS-pixel active-target baseline

**Owner types:** QA / accessibility, frontend, product

**Evidence:** `reports/portfolio-browser-audit-2026-08-12.json` and `reports/portfolio-qa-matrix-2026-08-12.md`

## Result

Status is **Red**. The expanded five-product QA matrix completed at 2026-08-13T03:40:20Z and recorded seven owned GitHub issues. Six issues contain release-blocking WCAG A/AA failures across CurlPlan, Hat in Ring, and Frontier Signals; one CurlPlan issue is non-blocking 44px target hardening.

Phillies Wire and the Frontier Signals data lab are Green within the tested browser scope. Green here means no failure was found in the named checks, not that complete WCAG conformance has been certified.

## Scope and method

The run exercised CurlPlan web, Phillies Wire, Frontier Signals data lab, Hat in Ring, and the live canonical Frontier Signals site. Screen-reader testing was excluded. The executed matrix covered:

1. Full forward and reverse keyboard traversal.
2. Representative core-journey activation with state verification.
3. Programmatic names, labels, landmarks, table/action semantics, relationships, duplicate IDs, and hidden focus targets.
4. Desktop and 390 by 844 mobile screenshot review.
5. 640 CSS-pixel reflow, representing 200% zoom on a 1280-pixel desktop surface.
6. WCAG 1.4.12 line, letter, word, and paragraph spacing overrides.
7. Computed text contrast plus visual review for gradient and image-backed regions.
8. Active-target measurements at desktop, reflow, and mobile widths.
9. Reduced-motion emulation and active-animation inspection.

The browser was Google Chrome 151.0.7922.109 on macOS 26.6. Automation and screenshot review do not replace cognition, language, or user-research testing.

## Product baseline

| Product | Keyboard and journey | Reflow and spacing | Contrast | Targets and semantics | Status |
| --- | --- | --- | --- | --- | --- |
| CurlPlan web | Demo entry and tab navigation pass; closed Appearance controls incorrectly enter the initial focus order | No overflow or new text clipping | Pass in tested states | Four demo tabs miss 44px; closed dialogs are not inert or hidden | **Red** |
| Phillies Wire | 20 active stops, reverse traversal, accordion, theme, and copy feedback pass | Pass; only intentionally hidden helper text was flagged | Pass | Pass | **Green in scope** |
| Frontier Signals data lab | 37 active stops, reverse traversal, and Enter/Space desk changes pass | Pass | Pass | Pass | **Green in scope** |
| Hat in Ring | View changes work, but 47 table action stops lack explicit action semantics | A card summary clips under required spacing | `Exploratory` badge fails at 4.22:1 | `The Wire` misses AA minimum; 12 more controls miss 44px | **Red** |
| Frontier Signals | 34 active stops, reverse traversal, and Disclosures navigation pass | One latest-signal title becomes newly clipped under required spacing | Pass | Pass | **Red** |

Every product remained free of page-level horizontal overflow at desktop, 200% reflow, and mobile widths. Every tested product reported zero active animations with reduced motion requested. The browser accessibility-tree scan found no unnamed interactive roles.

## Defects and owners

| Product | Issue | Blocking status | Owner |
| --- | --- | --- | --- |
| CurlPlan | [#8 Closed sheets remain in the keyboard focus order](https://github.com/DaveHomeAssist/curl-plan/issues/8) | **Release blocker** | DaveHomeAssist / frontend |
| CurlPlan | [#9 Post-demo tabs miss the 44px portfolio target](https://github.com/DaveHomeAssist/curl-plan/issues/9) | P2 hardening | DaveHomeAssist / frontend |
| Hat in Ring | [#4 Exploratory badge contrast is 4.22:1](https://github.com/DaveHomeAssist/hatinring/issues/4) | **Release blocker** | DaveHomeAssist / frontend |
| Hat in Ring | [#5 Sortable headers and candidate rows lack explicit action roles](https://github.com/DaveHomeAssist/hatinring/issues/5) | **Release blocker** | DaveHomeAssist / frontend |
| Hat in Ring | [#6 Compact controls miss AA and portfolio target sizes](https://github.com/DaveHomeAssist/hatinring/issues/6) | **Release blocker** for `The Wire`; remaining targets are P2 | DaveHomeAssist / frontend |
| Hat in Ring | [#7 Card summaries clip under required text spacing](https://github.com/DaveHomeAssist/hatinring/issues/7) | **Release blocker** | DaveHomeAssist / frontend |
| Frontier Signals | [#2 Latest-signal title clips under required text spacing](https://github.com/DaveHomeAssist/frontier-signals/issues/2) | **Release blocker** | DaveHomeAssist / frontend |

## Verified passes

- All five live product URLs returned HTTP 200 before the run.
- Every representative keyboard journey changed the expected route, view, pressed state, expanded state, theme, or copy feedback.
- Full traversal reached the document boundary and reversed to the last focusable item on every product.
- No unnamed interactive accessibility-tree nodes were found.
- No duplicate IDs, unlabeled form fields, invalid `aria-controls` references, or page-level overflow were found.
- No newly clipped visible text was found under required spacing in CurlPlan, Phillies Wire, or the Frontier Signals data lab.
- No active animation remained when reduced motion was requested.

## Release gate

The next material UI release must not mark the portfolio accessibility initiative Green until:

1. The six release-blocking issues are closed with linked code and deployment evidence.
2. The affected product checks are re-run using the same viewport, keyboard, spacing, contrast, target, and reduced-motion conditions.
3. The deployed fixes pass, not only a local working copy.
4. The updated matrix and issue closure evidence are linked from the roadmap and canonical status run.

The non-blocking CurlPlan 44px issue remains required by the portfolio standard but does not alone hold the WCAG AA release gate Red.
