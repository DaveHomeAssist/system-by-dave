# Portfolio accessibility remediation rerun

**Run date:** 2026-08-13 EDT

**Completed at:** 2026-08-13T07:47:35Z

**Scope:** Production rerun of the checks affected by CurlPlan #8, Hat in Ring #4–#7, and Frontier Signals #2

**Decision:** The six WCAG A/AA release blockers are closed and pass their affected production checks. The accessibility release gate is **Green in the re-tested browser scope**. The broader portfolio baseline remains **Amber** because [CurlPlan #9](https://github.com/DaveHomeAssist/curl-plan/issues/9), a non-blocking 44px target-hardening issue, is still open.

Green in this report means no failure was found in the named browser-observable checks. It is not a claim of complete WCAG conformance. Assistive-technology speech-output testing was outside this rerun.

**Machine-readable companion:** `reports/portfolio-browser-audit-remediation-2026-08-13.json`

## Deployment provenance

| Product | Commit | Deployment and security evidence | Live evidence | Issue state |
| --- | --- | --- | --- | --- |
| CurlPlan | [`b089f71`](https://github.com/DaveHomeAssist/curl-plan/commit/b089f712195baf113ecb8a259789917e0a53750b) | [Verify `31666333351`](https://github.com/DaveHomeAssist/curl-plan/actions/runs/31666333351), [Security `31666333337`](https://github.com/DaveHomeAssist/curl-plan/actions/runs/31666333337), and [Pages `31666332779`](https://github.com/DaveHomeAssist/curl-plan/actions/runs/31666332779) passed | [`/?verify=b089f71`](https://davehomeassist.github.io/curl-plan/?verify=b089f71) returned HTTP 200 with `Last-Modified: 2026-08-13T04:13:51Z` | [#8](https://github.com/DaveHomeAssist/curl-plan/issues/8) closed with production evidence |
| Hat in Ring | [`15c289a`](https://github.com/DaveHomeAssist/hatinring/commit/15c289abd59a39198c28a03239c98bd71b69f7ad) | [Security `31666886980`](https://github.com/DaveHomeAssist/hatinring/actions/runs/31666886980) and [Pages `31666886987`](https://github.com/DaveHomeAssist/hatinring/actions/runs/31666886987) passed; 208 local tests passed | [`/?verify=15c289a`](https://hatinring.com/?verify=15c289a) returned HTTP 200 with `Last-Modified: 2026-08-13T04:24:07Z` | [#4](https://github.com/DaveHomeAssist/hatinring/issues/4), [#5](https://github.com/DaveHomeAssist/hatinring/issues/5), [#6](https://github.com/DaveHomeAssist/hatinring/issues/6), and [#7](https://github.com/DaveHomeAssist/hatinring/issues/7) closed with production evidence |
| Frontier Signals | [`930269b`](https://github.com/DaveHomeAssist/frontier-signals/commit/930269b6ec7036e187f4cb43b83862acf990d4b4) | [Security `31678375326`](https://github.com/DaveHomeAssist/frontier-signals/actions/runs/31678375326) and [Pages `31678375260`](https://github.com/DaveHomeAssist/frontier-signals/actions/runs/31678375260) passed; the build and 10-page verifier passed | [`/?verify=930269b`](https://frontiersignals.io/?verify=930269b) returned HTTP 200 with `Last-Modified: 2026-08-13T07:35:45Z` | [#2](https://github.com/DaveHomeAssist/frontier-signals/issues/2) closed with production evidence |

## Affected production checks

| Product | Re-tested behavior | Production result |
| --- | --- | --- |
| CurlPlan | Hidden-state semantics, sequential focus order, opening focus, dialog Tab containment, Escape and scrim close, trigger-state synchronization, and focus return | Both sheets start `hidden`, inert, and `aria-hidden="true"`; closed controls are skipped; opening focus lands on Ice; Tab wraps; Escape and scrim close restore hidden/inert state and trigger focus; the Appearance trigger is 44 by 44px. **Pass.** |
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
| Portfolio 44px hardening backlog is empty | CurlPlan #9 remains open and non-blocking | **Not met — Amber follow-up** |

## Next action

Close CurlPlan #9 with a deployed 44px tab-target check. This is P2 hardening and does not re-close the WCAG A/AA release gate.
