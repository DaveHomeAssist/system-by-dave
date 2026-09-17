---
description: State the Graph Explorer remediation goal, then report which phase gates are actually met
argument-hint: "[phase number, or 'status', or a new goal statement]"
---

# /goal — Graph Explorer remediation

## North star

> Make every feature Graph Explorer already claims to ship actually reachable —
> on desktop and mobile, by keyboard and by pointer — without adding a backend,
> npm, or a build step.

This is a **closing-the-gap** goal, not a feature goal. Every scheduled item is
a capability the product already advertises in its own `README.md`,
`CLAUDE.md`, and `graph-explorer-feature-analysis-2026-03-25.md`. Nothing here
asks for new surface area.

**Source of truth:** `docs/graph-explorer-remediation-roadmap-2026-09-17.md`
**Subject repo:** `DaveHomeAssist/graph-explorer` (baseline `303b193`)
**Consuming repo:** `DaveHomeAssist/system-by-dave`

## Binding constraints

From the subject repository's own `CLAUDE.md`. These override convenience:

1. No backend, database, or server requirement.
2. No npm, no `package.json`, no build tooling.
3. No dependencies beyond the pinned D3 and Dagre CDN links.
4. Do not change `engine/validate.js` without updating every map pack.
5. Do not remove the `default-presentation.json` fallback — PromptLab depends on it.
6. Do not break the `aria-live` announcements.

## Phase gates

| Phase | Theme | Gate |
| --- | --- | --- |
| 0 | Verification harness | Reproduces GE-01..GE-04 before any fix |
| 1 | Structural unblock | Six toolbar features reachable; whole graph visible on load |
| 2 | Correctness and keyboard | Five themes persist; focus survives filtering |
| 3 | Mobile and navigation | No overflow at 375px; `issues.html` is not a dead end |
| 4 | Hardening | Escaping uniform; exports and CDN failure handled |
| 5 | Docs and registry | Docs describe actual behaviour; registry accurate |

Phase 1 blocks 2–4, because GE-01 hides the surface the others are verified
against. Phases 2, 3, and 4 are mutually independent.

## Definition of done

1. All six floating toolbar features reachable after a normal page load.
2. Default load frames the whole graph; no node centre outside the canvas.
3. A background click raises no page errors.
4. First-run onboarding appears once, and never again.
5. All five themes survive a reload and a share-link round-trip.
6. Keyboard focus survives every filter and focus-mode interaction.
7. No horizontal scroll at 375px; graph visible without dismissing anything.
8. `issues.html` has a skip link and a route home.
9. No persistent control below 44 by 44.
10. Every value interpolated into markup is escaped, or provably a literal.
11. CDN failure produces a visible error, not an indefinite "Loading…".
12. `CLAUDE.md`, `README.md`, and the `system-by-dave` registry entry describe
    the software as it actually behaves.

---

## What to do with `$ARGUMENTS`

**No argument, or `status`** — Report progress honestly:

1. Read the roadmap doc for the full defect table (GE-01..GE-16).
2. Determine the current state of the subject repo. If it is not checked out,
   say so rather than guessing.
3. For each of the 12 done-criteria, mark it **met**, **not met**, or
   **unverified**. Prefer *unverified* over *met* unless you actually observed
   it this session — a criterion inferred from reading code is unverified.
4. Name the next unmet gate and the single next action.

**A phase number (`0`–`5`)** — Print that phase's prompt from the roadmap doc
verbatim, ready to paste into a fresh session, plus its done-when condition.
Do not begin the work unless separately asked.

**Anything else** — Treat it as a proposed revision to the north star. Do not
silently adopt it: show the current goal beside the proposed one, say what the
change would add or drop, and ask before editing this file.

## Standing rule

Do not report a criterion as met on the strength of a code change alone.
Every P0 and P1 item in this roadmap was found by running the page, and several
plausible-looking findings did **not** reproduce when tested. Verify in a
browser, then report the observed numbers.
