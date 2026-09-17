# Graph Explorer Remediation Roadmap

Date: 2026-09-17
Subject repository: `DaveHomeAssist/graph-explorer` at `303b193`
Consuming surfaces: `tools.html`, `project-registry-public.js`,
`scripts/verify_public_consistency.js` in `DaveHomeAssist/system-by-dave`
Status: Red. Six shipped features are unreachable, the default camera crops
most of the graph, and first-run onboarding throws on every visit.

## Goal

Make every feature Graph Explorer already claims to ship actually reachable,
on desktop and mobile, by keyboard and by pointer, without adding a backend,
npm, or a build step.

The goal is deliberately not "add features." Every P0 and P1 item below is a
capability the product already advertises in its own README, `CLAUDE.md`, and
`graph-explorer-feature-analysis-2026-03-25.md`. This roadmap closes the gap
between what those documents claim and what the deployed page does.

## Why this exists

A browser-verified review on 2026-09-17 ran the app under headless Chromium
with the pinned D3 and Dagre bundles served locally. Twenty-one instrumented
probes produced the following reproduced defects.

| ID | Severity | Defect | Evidence |
| --- | --- | --- | --- |
| GE-01 | P0 | `showLoading()` wipes `#mapWrap`; `restoreCanvas()` rebuilds only the SVG, so `.canvas-float-toolbar` is destroyed on every load | `floatBtnCount: 0`; `mapWrap` children are `svg#map`, `div#mapEmpty` |
| GE-02 | P0 | Document click handlers dereference popovers that GE-01 removed | One background click throws `Cannot set properties of null (setting 'hidden')` twice |
| GE-03 | P0 | `fitToView` multiplies the true fit scale by 2.4 | Transform `translate(-981,-296) scale(1.449)` on untouched load; 17 of 24 node centres outside `#mapWrap` |
| GE-04 | P0 | `showCoach()` queries `#coachNext` before appending the overlay to the document | `overlayPresent: false`; `ge-onboarded-v1` never set, so it throws on every visit forever |
| GE-05 | P1 | `getInitialTheme()` accepts only `light` and `dark`, rejecting three of the five offered themes | Stored `terminal` reloads as `light`; URL rewritten to `theme=light` |
| GE-06 | P1 | `renderFocusModes()` rebuilds its buttons on every `render()` | Focus a mode, press Enter, `activeElement` becomes `BODY` |
| GE-07 | P1 | Horizontal overflow and a drawer that covers the whole canvas at phone width | `documentElement.scrollWidth` 453 against `innerWidth` 375 |
| GE-08 | P1 | `issues.html` has no skip link and no route home; its only anchor is `href="#"` | `skipLink: false`, `backLink: ["#"]` |
| GE-09 | P1 | `meta.tags` is interpolated unescaped while every sibling line in the same template uses `esc()` | Probe tag produced a live `<rect id="INJECTED">` |
| GE-10 | P2 | Five further templates interpolate presentation values into markup unescaped | `engine/core.js:29`, `index.html:1288`, `1312`-`1314`, `setupMapSelector` |
| GE-11 | P2 | Escape closes the detail drawer but focus falls to `BODY`; the closed drawer carries no `aria-hidden` | `activeElement` is `BODY` after Escape |
| GE-12 | P2 | Eighteen controls below 44 by 44; `#search` and `#layerF` measure 17px tall | Below the 24px floor in WCAG 2.2 SC 2.5.8 |
| GE-13 | P2 | Every graph node is a tab stop with no roving tabindex and no way to skip the graph | 26 node stops before the detail panel at stop 40 on a 24-node map |
| GE-14 | P2 | `downloadBlob` revokes its object URL synchronously and never appends the anchor; `exportPNG` hardcodes a dark background, has no `onerror`, and no `toBlob` null guard | `index.html:722`-`754` |
| GE-15 | P2 | A CDN failure leaves the page on "Loading…" indefinitely with no message | Observed directly when `cdnjs` was unreachable |
| GE-16 | P2 | Edge-legend inline SVGs appear as three unnamed `image` nodes in the accessibility tree | CDP full accessibility tree |

Two findings that a review of this shape usually reports were tested and did
not reproduce, and are therefore not scheduled as work:

- `role="img"` on `#map` does not hide the graph from assistive technology in
  Chromium. All 24 nodes are exposed as named buttons, none ignored. The markup
  is still non-conforming ARIA and carries cross-browser risk, so it is tracked
  as a Phase 4 hygiene item rather than a defect.
- `prefers-reduced-motion` is correctly implemented and covers the 13
  transitions and 3 animations.

## Constraints

These come from the subject repository's own `CLAUDE.md` and are binding on
every phase:

1. No backend, database, or server requirement.
2. No npm, no `package.json`, no build tooling.
3. No external JS or CSS dependencies beyond the pinned D3 and Dagre CDN links.
4. Do not modify `engine/validate.js` without updating every map pack that
   relies on the contract.
5. Do not remove the fallback presentation pattern; PromptLab exports depend
   on `default-presentation.json`.
6. Keep the `aria-live` announcements working.

Constraint 2 means the verification harness in Phase 0 lives outside the
repository, in a scratch directory, and is never committed.

## Phase table

| Phase | Theme | Closes | Gate |
| --- | --- | --- | --- |
| 0 | Reproducible verification harness | none | Harness reproduces GE-01 through GE-04 before any fix |
| 1 | Structural unblock | GE-01, GE-02, GE-03, GE-04 | Six toolbar features reachable; whole graph visible on load |
| 2 | Correctness and keyboard | GE-05, GE-06, GE-09 | Five themes persist; keyboard focus survives filtering |
| 3 | Mobile and navigation | GE-07, GE-08, GE-12 | No horizontal overflow at 375px; `issues.html` is not a dead end |
| 4 | Hardening | GE-10, GE-11, GE-13, GE-14, GE-15, GE-16 | Escaping sweep complete; exports and CDN failure handled |
| 5 | Documentation and registry reconciliation | doc drift, registry staleness, name collision | Docs describe actual behaviour; `system-by-dave` registry accurate |

Phases 1 through 4 run in the subject repository. Phase 5 spans both
repositories. Phase 1 must land before Phases 2 through 4, because GE-01
hides the surface the other fixes are verified against. Phases 2, 3, and 4 are
independent of each other and may be reordered or parallelised.

---

## Phase 0 — Reproducible verification harness

**Objective.** Make every defect in this roadmap reproducible on demand, so
each later phase can prove it fixed something rather than asserting it.

**Approach.** Serve the repository statically and drive it with headless
Chromium. The pinned CDN bundles must be fetched once and served locally,
because the probe environment may not reach `cdnjs`.

**Done when.** A single command prints the current values of: float button
count, `mapWrap` child list, zoom transform on untouched load, count of node
centres outside `#mapWrap`, coach overlay presence, page errors on a
background click, and the tab-order sequence.

### Prompt

```
Build a throwaway verification harness for DaveHomeAssist/graph-explorer.
Do NOT commit it — this repo forbids npm and build tooling, so the harness
lives in a scratch directory outside the working tree.

Setup:
- Serve the repo root statically (python3 -m http.server is fine).
- Fetch the two pinned CDN bundles once (d3 7.8.5, dagre 0.8.5) and use
  Playwright page.route() to fulfil cdnjs requests from those local copies.
  The probe environment may not reach cdnjs directly.

The harness must report, on an untouched load of index.html:
1. document.querySelectorAll('.float-btn').length
2. the tagName+id of each #mapWrap child
3. #zoomGroup's transform attribute
4. how many of #nodeGroup's <g> centres fall outside #mapWrap's rect
5. whether #coachOverlay exists, and localStorage['ge-onboarded-v1']
6. any pageerror raised by a single click on empty background
7. the first 40 tab stops as tag#id.class "label"
8. document.documentElement.scrollWidth vs window.innerWidth at 375px

Expected FAILING baseline (this is the bug, confirm you reproduce it):
1 → 0        2 → [svg#map, div#mapEmpty]
3 → translate(-981,-296) scale(1.449)
4 → 17 of 24
5 → false / null, plus a "setting 'onclick'" pageerror
6 → two "Cannot set properties of null (setting 'hidden')" errors
8 → 453 vs 375

Report the actual numbers you observe. Do not fix anything in this phase.
```

---

## Phase 1 — Structural unblock

**Objective.** Restore the six destroyed features and make the whole graph
visible on first paint.

**Changes.**

1. **GE-01.** Move `.canvas-float-toolbar` out of `#mapWrap` and make it a
   direct child of `.canvas`, placed after `.map-wrap`. Add `position:
   relative` to the `.canvas` rule at `index.html:163`. The toolbar is already
   `position: absolute; bottom: 14px; right: 14px`, and `.canvas` already has
   `overflow: hidden`, so the rendered position barely moves. This is
   preferred over teaching `restoreCanvas()` to rebuild the toolbar, because it
   removes the class of bug rather than patching one instance: nothing that
   must survive a status card should live inside the element whose `innerHTML`
   the status cards overwrite.
2. **GE-02.** Even after GE-01, guard both document-level click handlers
   (`index.html:2060`-`2064` and the export equivalent near `2140`) with a null
   check before assigning `.hidden`. Cheap, and it stops a single missing
   element from throwing on every click in the document.
3. **GE-03.** In `fitToView` (`index.html:1463`-`1465`), delete the `* 2.4`
   multiplier so `scale` starts from the real `fitScale`. Lower the clamp floor
   from `0.85` to `0.35` to match `zoom.scaleExtent`, so large maps can fit.
   Keep the upper clamp so a two-node map is not magnified absurdly.
4. **GE-04.** In `showCoach` (`index.html:2355`-`2386`), move
   `document.body.appendChild(overlay)` above the `renderStep()` call, or
   change `document.getElementById('coachNext')` to
   `overlay.querySelector('#coachNext')`. Prefer the second; it keeps the
   overlay self-contained and cannot break again if the ordering changes.

**Apply the same four fixes to `issues.html`**, which carries GE-01 through
GE-03 identically.

**Done when.** The Phase 0 harness reports 6 float buttons, a `mapWrap` that
still contains the toolbar's former siblings, a load transform whose scale is
at or below the true fit scale, zero node centres outside `#mapWrap`, a coach
overlay present on first run, and no page errors from a background click.

### Prompt

```
Fix the four P0 defects in DaveHomeAssist/graph-explorer. Apply every fix to
BOTH index.html and issues.html — issues.html carries GE-01..GE-03 identically.

GE-01 — the floating toolbar is destroyed on every page load.
  showLoading() (index.html:1066-1072) sets mapWrap.innerHTML, wiping
  .canvas-float-toolbar (markup at 609-632). restoreCanvas() (1239-1279)
  rebuilds only <svg#map> and #mapEmpty, never the toolbar. Six features are
  lost: Fit, Heatmap, Theme switch, Share, Theme editor, Export.
  FIX: move .canvas-float-toolbar out of #mapWrap so it is a direct child of
  .canvas, placed after .map-wrap. Add `position: relative` to the .canvas
  rule at index.html:163. Do NOT instead teach restoreCanvas() to rebuild it —
  the point is that nothing which must survive a status card should live inside
  the element whose innerHTML the status cards overwrite.

GE-02 — every click on the page throws two TypeErrors.
  The document click handlers at ~2060-2064 and ~2140 do
  document.getElementById('themePopover').hidden = true on elements GE-01
  removed. FIX: null-guard both before assigning .hidden. Keep this even
  after GE-01 lands.

GE-03 — fitToView over-zooms 2.4x, cropping 17 of 24 nodes off-canvas.
  index.html:1463-1465:
      const fitScale = Math.min(ww / w, wh / h);
      let scale = fitScale * 2.4;
      scale = Math.max(0.85, Math.min(2.2, scale));
  FIX: drop the * 2.4 entirely. Lower the 0.85 floor to 0.35 to match
  zoom.scaleExtent([0.35, 6]) so large maps can actually fit. Keep an upper
  clamp so a two-node map isn't magnified absurdly.

GE-04 — first-run onboarding never appears and throws on every visit.
  showCoach() (2355-2386) calls renderStep() at 2384, which does
  document.getElementById('coachNext') — but document.body.appendChild(overlay)
  is at 2386, one line later. The throw precedes appendChild, so
  ge-onboarded-v1 is never written and it fails forever.
  FIX: use overlay.querySelector('#coachNext') rather than reordering, so it
  cannot regress if the ordering changes again.

Verify with the Phase 0 harness. Required after-state:
  float buttons: 6 (was 0)
  node centres outside #mapWrap: 0 of 24 (was 17)
  pageerrors on a background click: 0 (was 2)
  #coachOverlay present on first run: true (was false)
Report before/after numbers for each. Do not start Phase 2 work.
```

---

## Phase 2 — Correctness and keyboard

**Objective.** Make the theme system honest, stop destroying keyboard focus,
and close the one dataset-controlled injection path.

**Changes.**

1. **GE-05.** `getInitialTheme()` (`index.html:1367`-`1370`) tests
   `=== 'light' || === 'dark'` against both the URL parameter and the stored
   value. Replace both tests with a membership check against the known theme
   set. `THEME_ICONS` at `1375` already enumerates all five ids and is the
   natural source of truth, which also means adding a sixth theme later
   requires one edit instead of three.
2. **GE-06.** `renderFocusModes()` is called from `render()` and rebuilds its
   buttons every time, so activating one by keyboard destroys the element that
   had focus. Build the buttons once when a map pack loads, and have `render()`
   only toggle the `active` class. `updatePathBar()` rebuilds
   `#pathTargetSelect` on every render for the same reason and should be given
   the same treatment.
3. **GE-09.** `index.html:1717` interpolates `tags` into the node template
   unescaped while every sibling line uses `esc()`. Wrap the tag values. The
   equivalent line in `issues.html` is `1559`.

**Done when.** Selecting Terminal, reloading, and landing on Terminal. Focusing
a focus-mode button, pressing Enter, and still having focus on that button. A
map pack whose `meta.tags` contains `</text><rect/>` rendering as text.

### Prompt

```
Fix the three P1 defects in DaveHomeAssist/graph-explorer. Phase 1 must
already be merged. Apply to both index.html and issues.html where applicable.

GE-05 — three of five themes silently fail to persist.
  The theme popover offers dark, light, instrument, deepsea, terminal
  (index.html:615-619). Selecting one writes it to localStorage (2054) and to
  the URL (944). But getInitialTheme() at 1367-1370 tests
  `=== 'light' || === 'dark'` against both the URL param and the stored value,
  so instrument/deepsea/terminal are rejected on read and fall through to
  prefers-color-scheme. Worse, writeStateToUrl then rewrites the URL to the
  fallback, destroying the share link too.
  VERIFY FIRST: localStorage['graph-explorer-theme']='terminal', reload with
  no URL param — observe data-theme become 'light'.
  FIX: replace both equality tests with a membership check against the known
  theme set. THEME_ICONS at 1375 already enumerates all five ids — use it as
  the source of truth so adding a sixth theme is one edit, not three.

GE-06 — activating a focus mode by keyboard drops focus to <body>.
  renderFocusModes() (1585-1602) is called from render() and rebuilds its
  buttons every time, destroying the focused element.
  VERIFY FIRST: focus the "Software Stack" button, press Enter, check
  document.activeElement — it is BODY.
  FIX: build the buttons once per map-pack load; have render() only toggle the
  `active` class. updatePathBar() rebuilds #pathTargetSelect every render for
  the same reason — give it the same treatment (rebuild only when the node set
  changes, not on every render).

GE-09 — dataset-controlled markup injection through meta.tags.
  index.html:1717 (issues.html:1559):
      <text class="n-meta" x="13" y="78">${tags.slice(0,2).map(t=>'#'+t).join('  ')}</text>
  Every sibling line in this template uses esc(); this one does not. A tag of
  `</text><rect id="INJECTED" width="10" height="10"/><text>` creates real DOM.
  FIX: escape each tag value.

Verify each fix against its "VERIFY FIRST" reproduction and report before/after.
```

---

## Phase 3 — Mobile and navigation

**Objective.** Make the phone experience usable and stop `issues.html` being a
dead end.

**Changes.**

1. **GE-07.** At 375px, `documentElement.scrollWidth` is 453. `.toolbar` and
   `.canvas` sit at `x: 18` with `width: 435`. Find the fixed-width or
   `min-width` constraint that prevents them shrinking and let them reflow.
2. **GE-07, second half.** The detail drawer auto-opens over the entire canvas
   because `loadMapPack` selects `nodes[0]` (`index.html:1207`). On a phone the
   user therefore lands on a detail panel for a node they never chose, with the
   graph completely hidden. Either do not auto-select on narrow viewports, or
   keep the auto-selection but leave the drawer closed until the user picks a
   node. The second is preferable; the selection still drives the initial
   highlight without stealing the screen.
3. **GE-08.** Give `issues.html` the same `.skip-link` that `index.html:553`
   carries, and replace its `href="#"` anchor with a real route back to
   `index.html`.
4. **GE-12.** Raise the toolbar control heights. `#search` and `#layerF`
   currently measure 17px. The WCAG 2.2 SC 2.5.8 floor is 24px; `system-by-dave`
   house standard is 44px. Target 44px, which also fixes the 24px focus-mode
   buttons.

**Done when.** No horizontal scroll at 375px, the graph is visible on a phone
without dismissing anything, `issues.html` has a skip link and a way home, and
no persistent control measures below 44 by 44.

### Prompt

```
Fix the mobile and navigation defects in DaveHomeAssist/graph-explorer.
Phase 1 must already be merged.

GE-07a — horizontal overflow at phone width.
  At a 375px viewport, document.documentElement.scrollWidth is 453.
  .toolbar and .canvas both sit at x:18 with width:435. Find the fixed-width
  or min-width constraint stopping them shrinking and let them reflow.
  Done when scrollWidth === innerWidth at 375px.

GE-07b — the detail drawer hides the entire graph on a phone.
  loadMapPack sets state.selectedId = nodes[0]?.id (index.html:1207), which
  opens the detail drawer on load. At 375px the drawer covers the whole canvas,
  so a phone user lands on details for a node they never picked and never sees
  the graph.
  FIX: keep the auto-selection (it drives the initial highlight) but leave the
  drawer CLOSED until the user actually picks a node. Do not special-case by
  viewport width if you can avoid it — closed-until-chosen is the better
  default on desktop too.

GE-08 — issues.html is a dead end.
  It has no skip link (index.html:553 has one) and its only anchor is
  href="#". Add the same .skip-link, and give it a real route back to
  index.html.

GE-12 — touch targets below the accessible minimum.
  18 controls measure under 44x44. #search and #layerF are 17px tall; the
  focus-mode buttons are 24px. WCAG 2.2 SC 2.5.8 floors at 24px; the
  system-by-dave house standard is 44px. Target 44px for persistent controls.

Verify at 375x812 and 680x800. Report scrollWidth vs innerWidth at both, and
the count of controls still under 44x44.
```

---

## Phase 4 — Hardening

**Objective.** Close the remaining escaping gaps, make exports trustworthy, and
fail visibly instead of silently.

**Changes.**

1. **GE-10.** Escaping sweep. `engine/core.js:29` interpolates option values
   into an attribute unescaped; `setupEdgeLegend` (`1312`-`1314`) escapes
   nothing; `setupLegend` (`1288`) escapes the label but not the colour;
   `setupMapSelector` escapes the title but not the value; the node template
   interpolates `col` and `heatCol` into attributes. These are
   presentation-pack controlled rather than dataset controlled, so they rank
   below GE-09, but the inconsistency is the real problem: a reader cannot tell
   which values are trusted.
2. **GE-11.** Return focus to the invoking node when the detail drawer closes,
   and set `aria-hidden` on the closed drawer.
3. **GE-13.** Adopt a roving tabindex in `#nodeGroup` so the graph is one tab
   stop with arrow-key traversal inside it, or add a skip-past-graph control.
   On the 24-node sample this costs 26 tab stops; it scales linearly with map
   size and the `ecosystem-issues` pack is far larger.
4. **GE-14.** Defer `URL.revokeObjectURL` past the click, append the anchor
   before clicking, read the actual theme background in `exportPNG` instead of
   hardcoding `#070b12`, add `img.onerror`, and null-check the `toBlob`
   callback.
5. **GE-15.** Detect a failed D3 or Dagre load and render an explicit error
   through the existing `showError` path instead of leaving "Loading…" forever.
6. **GE-16.** Mark the edge-legend inline SVGs `aria-hidden="true"`.
7. **Hygiene.** Reconsider `role="img"` on `#map`. Chromium exposes the node
   buttons anyway, so this is not an observed break, but a container with 24
   interactive children is not an image and other engines may prune it.

### Prompt

```
Harden DaveHomeAssist/graph-explorer. Phases 1-3 should already be merged.
These are P2 items — none is a hard break, so prefer minimal, consistent edits.

GE-10 — escaping sweep. These interpolate into markup without esc():
  engine/core.js:29      `value="${v}"` in populateSelect
  index.html:1288        `background:${item.color}` in setupLegend
  index.html:1312-1314   `${name}`, `stroke="${s.stroke}"`, dasharray
  setupMapSelector       `value="${m.id}"` (title IS escaped — inconsistent)
  node template          fill="${col}", stroke="${heatCol}"
  These are presentation-pack controlled, not dataset controlled, so they rank
  below the already-fixed GE-09. The real defect is the inconsistency: a reader
  cannot tell which values are trusted. Make it uniform.

GE-11 — focus is lost when the detail drawer closes.
  Escape closes it, but document.activeElement becomes BODY. Return focus to
  the node that opened it. Also set aria-hidden on the closed drawer (it
  currently has none).

GE-13 — the graph is N tab stops with no escape.
  All 24 nodes are tabbable; the detail panel is tab stop 40. This scales
  linearly and the ecosystem-issues pack is much larger. Adopt a roving
  tabindex in #nodeGroup (one tab stop, arrow keys inside) or add a
  skip-past-graph control.

GE-14 — export robustness (index.html:722-754).
  downloadBlob revokes its object URL synchronously after .click() and never
  appends the anchor — fragile outside Chromium. exportPNG hardcodes
  ctx.fillStyle='#070b12', so a PNG exported from the Light theme gets a dark
  background; it also has no img.onerror and no null check on the toBlob
  callback.

GE-15 — silent death on CDN failure.
  If cdnjs is unreachable, the module throws "d3 is not defined" and the page
  sits on "Loading…" forever with no message. Detect a missing D3 or Dagre and
  route it through the existing showError path.

GE-16 — three unnamed image nodes in the accessibility tree.
  The edge-legend inline SVGs (index.html:1314) need aria-hidden="true".

HYGIENE — #map carries role="img" with 24 interactive children. Chromium
exposes the node buttons anyway (verified: 38 AX buttons, 0 ignored), so this
is NOT an observed break — do not report it as one. But a container with
interactive children is not an image and other engines may prune it. Consider
role="application" or "group", and re-verify the AX tree after changing it.
```

---

## Phase 5 — Documentation and registry reconciliation

**Objective.** Make the documentation describe the software, and make
`system-by-dave`'s published claims about Graph Explorer accurate.

**Changes in `DaveHomeAssist/graph-explorer`.**

1. `CLAUDE.md` and `README.md` both state there is no localStorage and no
   persistence between sessions. The app uses four keys: `ge-map-states-v1`,
   `ge-path-history-v1`, `graph-explorer-theme`, and `ge-onboarded-v1`. Correct
   the claim and document the keys, since they are a compatibility surface.
2. `graph-explorer-feature-analysis-2026-03-25.md` marks Export, the theme
   system, and D3 fit as Complete. All three were unreachable. Re-date the
   document against post-Phase-1 behaviour rather than editing the 2026-03-25
   snapshot in place.
3. Add GE-01 through GE-16 to the `CLAUDE.md` issue tracker table with their
   resolved status, matching the existing `001`-`007` convention.

**Changes in `DaveHomeAssist/system-by-dave`.**

4. `project-registry-public.js:500`-`514` is stale: `lastRemoteUpdate` reads
   `2026-04-18` against an actual `2026-07-11`, `files` reads 32 against an
   actual 36, `stack` reads `["HTML"]`, and `purpose` is the placeholder
   `"graph explorer project"`.
5. `tools.html:164` names the standalone app "Graph Explorer" while
   `widgets.html:109` and `notion.html:189` point a card named "Workspace Map"
   at `NotionWidgets/graph-explorer.html`. Two different products share a slug.
   `scripts/verify_public_consistency.js:180` gates only the widget URL, so
   nothing catches the collision. Add a check that asserts the two destinations
   stay distinct, per the naming rules in `docs/public-content-contract.md`.

### Prompt

```
Reconcile Graph Explorer's documentation and its system-by-dave registry entry.
Run this after Phases 1-4 have landed, so the docs describe the fixed build.

In DaveHomeAssist/graph-explorer:
1. CLAUDE.md ("No localStorage or persistence between sessions" / "State is
   ephemeral") and README.md ("no persistence") are both false. The app uses
   four keys: ge-map-states-v1, ge-path-history-v1, graph-explorer-theme,
   ge-onboarded-v1. Correct both files and document the keys — they are a
   compatibility surface.
2. graph-explorer-feature-analysis-2026-03-25.md marks Export, Theme system,
   and D3 pan/zoom/fit as "Complete" when all three were unreachable. Do NOT
   edit the 2026-03-25 snapshot in place — it is a dated record. Add a new
   dated analysis reflecting post-remediation behaviour.
3. Add GE-01..GE-16 to the CLAUDE.md issue tracker table with resolved status,
   matching the existing 001-007 row convention.

In DaveHomeAssist/system-by-dave (branch claude/happy-hypatia-vc7h4q):
4. project-registry-public.js:500-514 is stale. Actual values at 303b193:
   lastRemoteUpdate 2026-07-11 (reads 2026-04-18), files 36 (reads 32),
   stack is HTML + JavaScript + JSON (reads ["HTML"]), and purpose is the
   generated placeholder "graph explorer project". Check whether this file is
   generated before hand-editing it — if it is, fix the generator.
5. tools.html:164 calls the standalone app "Graph Explorer" while
   widgets.html:109 and notion.html:189 point a card named "Workspace Map" at
   NotionWidgets/graph-explorer.html — two different products on one slug.
   scripts/verify_public_consistency.js:180 gates only the widget URL, so the
   collision is unguarded. Add a check asserting the destinations stay
   distinct, following docs/public-content-contract.md.

Run `npm run verify` (or the repo's documented gate) before pushing.
```

---

## Risk register

| Risk | Phase | Mitigation |
| --- | --- | --- |
| Moving the toolbar changes its visual position | 1 | It is bottom-anchored and `.canvas` already clips; screenshot before and after at 1440 and 375 |
| Removing the 2.4 multiplier makes small maps look sparse | 1 | Keep the upper clamp; check the 2-node and 43-node packs, not just `notion-workspace` |
| Building focus modes once breaks presentation-driven mode switching | 2 | Rebuild on map-pack load, not never; test switching between packs with different `focusModes` |
| Closing the drawer by default is read as a regression | 3 | It is a deliberate default change; note it in the changelog rather than burying it |
| Roving tabindex conflicts with the existing node keydown handler | 4 | `handleNodeKeydown` is already bound in `restoreCanvas`; extend it rather than adding a second listener |
| Registry file is generated, not authored | 5 | Check for a generator before hand-editing; the repository contract requires changing canonical sources |

## Definition of done

The roadmap is complete when all of the following hold on the deployed page:

1. All six floating toolbar features are reachable after a normal page load.
2. A default load frames the entire graph; no node centre falls outside the
   canvas.
3. A background click raises no page errors.
4. First-run onboarding appears once and never again.
5. All five offered themes survive a reload and a share link round-trip.
6. Keyboard focus survives every filter and focus-mode interaction.
7. No horizontal scroll at 375px, and the graph is visible without dismissing
   anything.
8. `issues.html` has a skip link and a route home.
9. No persistent control measures below 44 by 44.
10. Every value interpolated into markup is escaped, or is provably a literal.
11. A CDN failure produces a visible error, not an indefinite "Loading…".
12. `CLAUDE.md`, `README.md`, and the `system-by-dave` registry entry describe
    the software as it actually behaves.
