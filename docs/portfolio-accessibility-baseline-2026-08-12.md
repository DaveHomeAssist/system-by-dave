# Portfolio accessibility baseline

**Date:** 2026-08-12 ET / 2026-08-13 UTC

**Target:** WCAG 2.2 Level AA plus the portfolio's 44 by 44 CSS-pixel active-target baseline

**Owner types:** QA / accessibility, frontend, product

**Evidence:** `reports/portfolio-browser-audit-2026-08-12.json`, `reports/portfolio-qa-matrix-2026-08-12.md`, `reports/portfolio-browser-audit-remediation-2026-08-13.json`, `reports/curlplan-tab-target-verification-2026-08-13.json`, and `reports/portfolio-accessibility-remediation-2026-08-13.md`

## Result

Status is **Green in the tested browser scope**. The expanded five-product QA matrix completed at 2026-08-13T03:40:20Z and recorded seven owned GitHub issues. All seven are now remediated, deployed, closed with production evidence, and rerun against their affected production checks. CurlPlan #9, the final non-blocking 44px target-hardening item, closed after all four primary demo tabs measured at least 44 by 44 CSS pixels at both 390px and 640px.

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
| CurlPlan web | Closed-sheet controls are skipped; opening focus, Tab containment, Escape/scrim close, trigger focus return, and primary tab order pass | No overflow or new text clipping at 390px or 640px | Pass in tested states | Dialog state and focus semantics pass; Passport is 47.69 by 44px and Locker, Spiels, and Roster are 44 by 44px at both target viewports | **Green in re-tested scope** |
| Phillies Wire | 20 active stops, reverse traversal, accordion, theme, and copy feedback pass | Pass; only intentionally hidden helper text was flagged | Pass | Pass | **Green in scope** |
| Frontier Signals data lab | 37 active stops, reverse traversal, and Enter/Space desk changes pass | Pass | Pass | Pass | **Green in scope** |
| Hat in Ring | Native sort buttons and one explicit dossier action per row pass; Enter/Space sorting passes | All 41 card summaries remain visible with required spacing at 640/390px | `Exploratory` badge passes at 4.91:1 | All 13 audited controls are at least 44px high; The Wire is 73.55 by 44px | **Green in re-tested scope** |
| Frontier Signals | Existing traversal and Disclosures journey pass; latest-link focus remains visible | All Latest signals titles wrap without clipping or page overflow at 640/390px | Pass | Latest-link targets are 95px high | **Green in re-tested scope** |

Every product remained free of page-level horizontal overflow at desktop, 200% reflow, and mobile widths. Every tested product reported zero active animations with reduced motion requested. The browser accessibility-tree scan found no unnamed interactive roles.

## Defects and owners

| Product | Issue | Blocking status | Owner |
| --- | --- | --- | --- |
| CurlPlan | [#8 Closed sheets remain in the keyboard focus order](https://github.com/DaveHomeAssist/curl-plan/issues/8) | **Closed; production pass** | DaveHomeAssist / frontend |
| CurlPlan | [#9 Post-demo tabs miss the 44px portfolio target](https://github.com/DaveHomeAssist/curl-plan/issues/9) | **Closed; production pass** | DaveHomeAssist / frontend |
| Hat in Ring | [#4 Exploratory badge contrast is 4.22:1](https://github.com/DaveHomeAssist/hatinring/issues/4) | **Closed; production pass** | DaveHomeAssist / frontend |
| Hat in Ring | [#5 Sortable headers and candidate rows lack explicit action roles](https://github.com/DaveHomeAssist/hatinring/issues/5) | **Closed; production pass** | DaveHomeAssist / frontend |
| Hat in Ring | [#6 Compact controls miss AA and portfolio target sizes](https://github.com/DaveHomeAssist/hatinring/issues/6) | **Closed; production pass** | DaveHomeAssist / frontend |
| Hat in Ring | [#7 Card summaries clip under required text spacing](https://github.com/DaveHomeAssist/hatinring/issues/7) | **Closed; production pass** | DaveHomeAssist / frontend |
| Frontier Signals | [#2 Latest-signal title clips under required text spacing](https://github.com/DaveHomeAssist/frontier-signals/issues/2) | **Closed; production pass** | DaveHomeAssist / frontend |

## Verified passes

- All five live product URLs returned HTTP 200 before the run.
- Every representative keyboard journey changed the expected route, view, pressed state, expanded state, theme, or copy feedback.
- Full traversal reached the document boundary and reversed to the last focusable item on every product.
- No unnamed interactive accessibility-tree nodes were found.
- No duplicate IDs, unlabeled form fields, invalid `aria-controls` references, or page-level overflow were found.
- No newly clipped visible text was found under required spacing in CurlPlan, Phillies Wire, or the Frontier Signals data lab.
- No active animation remained when reduced motion was requested.

## Release gate

The four release-gate conditions below were satisfied on 2026-08-13. Detailed provenance and measurements are in `reports/portfolio-accessibility-remediation-2026-08-13.md`.

1. The six release-blocking issues are closed with linked code and deployment evidence.
2. The affected product checks are re-run using the same viewport, keyboard, spacing, contrast, target, and reduced-motion conditions.
3. The deployed fixes pass, not only a local working copy.
4. The updated matrix and issue closure evidence are linked from the roadmap and canonical status run.

The non-blocking CurlPlan 44px hardening issue is also closed with deployed production evidence. No recorded accessibility issue from this matrix remains open, so the broader portfolio target baseline is Green in the tested browser scope.
