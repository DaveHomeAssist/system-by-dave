# Portfolio accessibility remediation rerun

**Run date:** 2026-08-13 EDT

**Completed at:** 2026-08-13T08:24:25Z

**Scope:** Production rerun of the checks affected by CurlPlan #8 and #9, Hat in Ring #4–#7, and Frontier Signals #2

**Decision:** The six WCAG A/AA release blockers and the final CurlPlan 44px hardening issue are closed and pass their affected production checks. The accessibility release gate and broader portfolio baseline are **Green in the re-tested browser scope**.

Green in this report means no failure was found in the named browser-observable checks. It is not a claim of complete WCAG conformance. Assistive-technology speech-output testing was outside this rerun.

**Machine-readable companions:** `reports/portfolio-browser-audit-remediation-2026-08-13.json` and `reports/curlplan-tab-target-verification-2026-08-13.json`

## Deployment provenance

| Product | Commit | Deployment and security evidence | Live evidence | Issue state |
| --- | --- | --- | --- | --- |
| CurlPlan | [`42dc0ed`](https://github.com/DaveHomeAssist/curl-plan/commit/42dc0ed4f33cf38d3cec894304411345dd57e608) | [Verify `31681653119`](https://github.com/DaveHomeAssist/curl-plan/actions/runs/31681653119), [Security `31681653128`](https://github.com/DaveHomeAssist/curl-plan/actions/runs/31681653128), and [Pages `31681652388`](https://github.com/DaveHomeAssist/curl-plan/actions/runs/31681652388) passed | [`/?verify=42dc0ed`](https://davehomeassist.github.io/curl-plan/?verify=42dc0ed) returned HTTP 200 with `Last-Modified: 2026-08-13T08:21:45Z` | [#8](https://github.com/DaveHomeAssist/curl-plan/issues/8) and [#9](https://github.com/DaveHomeAssist/curl-plan/issues/9) closed with production evidence |
| Hat in Ring | [`15c289a`](https://github.com/DaveHomeAssist/hatinring/commit/15c289abd59a39198c28a03239c98bd71b69f7ad) | [Security `31666886980`](https://github.com/DaveHomeAssist/hatinring/actions/runs/31666886980) and [Pages `31666886987`](https://github.com/DaveHomeAssist/hatinring/actions/runs/31666886987) passed; 208 local tests passed | [`/?verify=15c289a`](https://hatinring.com/?verify=15c289a) returned HTTP 200 with `Last-Modified: 2026-08-13T04:24:07Z` | [#4](https://github.com/DaveHomeAssist/hatinring/issues/4), [#5](https://github.com/DaveHomeAssist/hatinring/issues/5), [#6](https://github.com/DaveHomeAssist/hatinring/issues/6), and [#7](https://github.com/DaveHomeAssist/hatinring/issues/7) closed with production evidence |
| Frontier Signals | [`930269b`](https://github.com/DaveHomeAssist/frontier-signals/commit/930269b6ec7036e187f4cb43b83862acf990d4b4) | [Security `31678375326`](https://github.com/DaveHomeAssist/frontier-signals/actions/runs/31678375326) and [Pages `31678375260`](https://github.com/DaveHomeAssist/frontier-signals/actions/runs/31678375260) passed; the build and 10-page verifier passed | [`/?verify=930269b`](https://frontiersignals.io/?verify=930269b) returned HTTP 200 with `Last-Modified: 2026-08-13T07:35:45Z` | [#2](https://github.com/DaveHomeAssist/frontier-signals/issues/2) closed with production evidence |

## Affected production checks

| Product | Re-tested behavior | Production result |
| --- | --- | --- |
| CurlPlan | Hidden-state semantics, sequential focus order, opening focus, dialog Tab containment, Escape and scrim close, trigger-state synchronization, focus return, and primary-tab target sizing at 390px and 640px | Both sheets start `hidden`, inert, and `aria-hidden="true"`; closed controls are skipped; opening focus lands on Ice; Tab wraps; Escape and scrim close restore hidden/inert state and trigger focus. Passport measures 47.69 by 44px; Locker, Spiels, and Roster each measure 44 by 44px at both viewports. Keyboard order remains Passport, Locker, Spiels, Roster with a solid 3px focus outline and no horizontal overflow. **Pass.** |
| Hat in Ring | Status contrast, table action semantics, Enter/Space sorting, target sizes, WCAG text spacing, and 640/390px reflow | Exploratory white text on `#A85E16` is 4.91:1; there are 6 native sort buttons, 0 directly focusable headers, 0 focusable rows, and 41 labeled dossier buttons for 41 rows; Enter sorts ascending and Space reverses it; all 13 audited controls are at least 44px high and The Wire is 73.55 by 44px; all 41 card summaries remain unclipped with required spacing at both reflow widths; page scroll width equals viewport width. **Pass.** |
| Frontier Signals | WCAG text spacing, title wrapping, 640/390px reflow, latest-link hit areas, and visible keyboard focus | All four Latest signals titles use normal wrapping, visible overflow, and no ellipsis. The Meta title is 543px client/scroll width at the 640px test and 309px client/scroll width at the 390px test; client height equals scroll height at both widths. Page scroll width equals viewport width; latest-link targets are 95px high; the focused link retains a solid 2px outline. **Pass.** |

The shared production audit additionally found zero mobile or 200%-equivalent page overflow, zero unnamed interactive accessibility-tree nodes, and zero active animations with reduced motion requested on all three remediated products.

## Gate accounting

| Gate | Evidence | Result |
| --- | --- | --- |
| Six release-blocking issues closed | Direct GitHub issue state plus linked code, CI, deployment, and production comments | **Met** |
| Affected checks rerun under the original conditions | Keyboard/semantics for CurlPlan; keyboard/semantics/contrast/targets/spacing/reflow for Hat; spacing/reflow/targets/focus for Frontier | **Met** |
| Deployed behavior, not only local behavior, passes | Cache-busted production URLs and live browser measurements above | **Met** |
| Roadmap and canonical baseline link the closure evidence | This report is linked from both documents in the same release | **Met** |
| Portfolio 44px hardening backlog is empty | CurlPlan #9 is closed with commit, CI, Pages, issue-comment, and production-browser evidence | **Met** |

## Final state

All seven recorded issues from the five-product matrix are closed. No follow-up item from this matrix remains open; the portfolio baseline is Green in the tested browser scope.
