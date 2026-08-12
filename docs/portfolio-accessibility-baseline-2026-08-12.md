# Portfolio accessibility baseline

**Date:** 2026-08-12

**Target:** WCAG 2.2 Level AA

**Owner types:** QA / accessibility, frontend, product

**Evidence:** `reports/portfolio-browser-audit-2026-08-12.json`

## Result

Status is **Yellow**. The executable browser baseline is green for the checks that can be measured through Chrome DevTools Protocol, and every defect found in the first pass has an owner and was corrected before this report was finalized. A human VoiceOver and visual contrast pass remains required before the next UI release; automation does not certify WCAG conformance.

## Scope and method

The audit exercised CurlPlan web, Phillies Wire, Frontier Signals data lab, Hat in Ring, and the live canonical Frontier Signals site. Each surface was checked at a 390 by 844 mobile viewport with 4G network and 4x CPU throttling, `prefers-reduced-motion: reduce`, the first 20 keyboard focus stops, an accessibility-tree control-name scan, and a 640 CSS-pixel reflow check representing a 1280-pixel desktop viewport at 200% zoom.

This pass covers keyboard reachability indicators, programmatic control names, landmark presence, reflow, target size, and reduced-motion behavior. It does not replace VoiceOver speech-order review, human contrast inspection, cognition and language review, or complete journey testing.

## Final automated baseline

| Product | Keyboard first 20 | Named controls | 44px active targets | 200% reflow | Reduced motion | Synthetic CLS | Synthetic LCP |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| CurlPlan web | Pass | Pass | Pass | Pass | Pass | 0 | 1.068 s |
| Phillies Wire | Pass | Pass | Pass | Pass | Pass | 0 | 1.168 s |
| Frontier Signals data lab | Pass | Pass | Pass | Pass | Pass | 0 | 0.620 s |
| Hat in Ring | Pass | Pass | Pass | Pass | Pass | 0.026 | 2.668 s |
| Frontier Signals | Pass | Pass | Pass | Pass | Pass | 0 | 0.480 s |

Performance values are single-run lab measurements, not field Core Web Vitals. They are included because unexpected layout shifts and long main-thread work can directly impair accessibility.

## Defect closure

| Defect | Owner | Resolution | Verification |
| --- | --- | --- | --- |
| Phillies Wire Game Status trigger measured 39px high | Frontend | Added a 44px minimum height to accordion triggers | Re-run reports no undersized controls |
| Phillies Wire theme toggle measured 23px high | Frontend | Added 44px minimum width and height | Re-run reports no undersized controls |
| Frontier data lab focus controls measured 38px high | Frontend | Raised focus-control minimum height to 44px | Re-run reports no undersized controls |
| Hat in Ring home control measured 42px high | Frontend | Added a 44px minimum height | Re-run reports no undersized controls |

The Hat in Ring re-run also caught and closed a responsive-image binding error that requested `/96w`. The template now binds one complete `srcset` value, and the browser loads the intended 96px thumbnails.

## Required human release gate

The QA / accessibility owner must complete and record these checks before the next material UI release in each product:

1. VoiceOver on macOS Safari and iOS Safari: landmark order, control purpose, expanded state, table interpretation, dynamic updates, and escape/recovery.
2. Contrast: text, icons, focus indicators, disabled controls, status colors, and forced/high-contrast appearance where supported.
3. Keyboard-only complete core journey, including reverse traversal, dialogs, errors, and recovery from every overlay.
4. Text resizing and spacing overrides at 200%, including long labels and error messages.
5. Motion and timeout review with reduced motion enabled and no information conveyed only by animation.

Record failures as repository issues with product, route, WCAG criterion, reproduction steps, severity, owner, and release-blocking status. Critical journey failures and WCAG A/AA violations block release; cosmetic enhancements do not.
