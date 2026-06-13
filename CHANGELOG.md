# Changelog

## 2026-06-13

* Tightened `/teleprompter.html` mobile formatting controls so the toolbar scrolls inside its own rail on phone widths, keeps the editor usable, and gives color swatches larger touch targets.
* Added `/stage-plot.html`, a browser based AV stage plot tool with draggable room layout items, sample stage plot, exact position controls, nudge controls, snap to grid, print output, JSON import and export, copyable operator summary, and remembered browser state. Linked it from the homepage AV Tools section, added it to the Products footer, and added it to `sitemap.xml`.
* Added `/input-list.html`, a browser based AV input list and patch sheet with show metadata, sample channels, editable patch rows, line check status, filters, selected channel controls, print output, JSON import and export, CSV export, copyable operator summary, and remembered browser state. Linked it from the homepage AV Tools section, added it to the Products footer, and added it to `sitemap.xml`.
* Expanded `/teleprompter.html` formatting and saved-script controls: added more reader fonts, font weight, expanded text color swatches, custom text color, reader background palettes, custom reader background color, and a Save as action for keeping multiple browser saved-script versions.
* Added `/av-calculator.html`, a browser based AV calculator with audio delay, projection throw, record storage, and power load checks, saved browser values, copyable operator summary, and text export. Linked it from the homepage AV Tools section, added it to the Products footer, and added it to `sitemap.xml`.
* Added `/cue-sheet.html`, a browser based AV cue sheet for run of show work with starter cues, editable cue rows, selected and next cue controls, status tracking, keyboard shortcuts, print output, JSON import and export, CSV export, and remembered browser state. Linked it from the homepage AV Tools section, added it to the Products footer, and added it to `sitemap.xml`.
* Added `/show-timer.html`, a stage friendly AV show timer with countdown, count up, clock mode, presets, custom duration parsing, quick time adjustments, warning and overrun states, keyboard controls, stage view, and remembered browser preferences. Linked it from the homepage AV Tools section, added it to the Products footer, and added it to `sitemap.xml`.
* Reworded `/widgets.html` public copy to describe current URL parameter configuration without permanence framing and replaced external demo iframes with static preview panels so the page has no third party runtime errors.
* Added a live next cue readout to `/teleprompter.html`: the run HUD and remote now show the next marker, estimated time until cue, and clock time when a show start is set.
* Added show start scheduling to `/teleprompter.html`: operators can set a show start time or use Now, see the planned end time in the run HUD and remote, and view estimated clock times for each marker in the rundown.
* Added a timed marker rundown to `/teleprompter.html`: operators can open a rundown dialog showing each marker's estimated start time, segment duration, line number, progress position, and jump control.
* Added a target pace readout to `/teleprompter.html`: when a target runtime is set, the run HUD and remote now show whether the current speed is on target, fast, or slow against that duration.
* Added target runtime fitting to `/teleprompter.html`: operators can enter a run time such as `02:00`, fit scroll speed to that target, persist the target in saved scripts and show packages, and see it in the script run metadata.
* Added portable show packages to `/teleprompter.html`: operators can export the current script, formatting, and saved-script library to JSON and import it on another browser session with duplicate-safe saved-script merging.
* Added a companion remote control mode to `/teleprompter.html`: the reader window can open a separate remote window for play, cue, restart, speed, marker, step, read mode, and edit mode commands with live reader status sync.
* Added operator marker navigation to `/teleprompter.html`: markdown headings, bracket cues, and divider cues now become jump markers with a marker dropdown, previous and next controls, keyboard shortcuts, and a live marker readout in the run monitor.
* Added pro run controls to `/teleprompter.html`: a 3-second Cue + Play leader, live elapsed and remaining run time, progress percentage, progress rail, and script word-count/run-rate readout.
* Expanded `/teleprompter.html` formatting and script management: added reader font family choices, text color swatches, and a local saved-scripts library with Save, Load, Delete, and per-script formatting snapshots.
* Added lightweight anticipatory UX to `/teleprompter.html`: context-aware next-action highlights, short dynamic hints, smarter title-based Save filenames, last-mode restore, and local-only preference metadata in `localStorage`.
* Added an unlisted, noindex **Prompt Browser** page at `/prompt-browser.html` for the full local prompt library browser. The page includes ranked search, review queue, fill-in mode, saved views, import/export state, and local-only browser state. It is blocked in `robots.txt` and kept out of `sitemap.xml` and site navigation because the embedded library includes internal working prompts.
* Added tactile microinteractions to `/teleprompter.html`: pressed and hover button states, control confirmation pulses, inline file save/load success and error feedback, paused-reader drag resistance with snap release, and reduced-motion fallbacks.

## 2026-06-12

* Added `/teleprompter.html`, a self contained teleprompter page with editable script text, smooth auto scrolling, keyboard controls, mirror mode, fullscreen, manual save and load file controls, and a starter sample script for first load.

## 2026-06-11

* Added a public-safe **Project Registry** at `/project-registry.html` with searchable/filterable metadata for 52 public DaveHomeAssist repositories. Private repos, local filesystem paths, dirty worktree counts, and internal triage notes remain excluded from the published data set. Added the page to the homepage Resources footer and `sitemap.xml`.
* Launched a public **Prompt Library** browser at `/prompts/` — a self-contained, zero-dependency page (vanilla JS) with 228 curated, copy-ready prompts: instant search, faceted filters (collection/area/pack/format/platform), and one-click copy. Public-safe subset (internal/operational prompts, Notion IDs, and flagged drafts excluded). Added to `sitemap.xml`.
* Upgraded `/prompts/` with five features (smoke-tested headless, zero console errors): `{{variable}}` fill-in with live preview + remembered values, relevance-ranked search with match highlighting, per-prompt permalinks (`#p=id`) + shareable view-links, `j`/`k` result navigation plus a ⌘/Ctrl-K command palette, and full keyboard/ARIA accessibility (live regions, focus-visible rings, reduced-motion). Plus per-group counts in the facet dropdowns.
* Linked `/prompts/` (nav + Products footer) and `/profile/` (Connect footer) from the homepage so both routes are reachable, not just listed in `sitemap.xml`.

* Added a private, unlisted prototype page at `/youtube-pipeline.html` for the Notion based YouTube Pipeline. The page is marked `noindex, nofollow`, blocked in `robots.txt`, and kept out of `sitemap.xml` because it still requires the Claude artifact host APIs for live data and writes.
* Added `youtube-pipeline-regression-2026-06-11.js` plus `youtube-pipeline-production-plan-2026-06-11.md` beside the prototype so the data loss guard and remaining production gates are visible in repo.
* Hardened `/youtube-pipeline.html` for public static hosting: added host capability gating, explicit database ID validation, safer local draft storage, a clear local drafts action, and MCP request timeouts.

## 2026-06-10

- Added a private, unlisted sub-page at `/flooring-contract-review.html` — a plain-English review of the Robertson family flooring contract (12 priority-ranked issues, annotated full-contract view, ready-to-send email). Self-contained page (own inline styles/JS, system fonts).
- Marked the page `noindex, nofollow` and added a `robots.txt` Disallow; deliberately kept it out of `sitemap.xml` and the site nav, since it contains personal details and is meant to be shared by link only.
- Content update on `/flooring-contract-review.html` after new info: the selected floor is now identified (EF Legendary / Dreamweaver, color 6005 Orthodox, 5.2 mm / 20 mil SPC). Reframed Issue 2 (and annotated comment #2) from "product missing" to "identified, but reconcile the spec" and flagged the contract's 22 mil vs the product's 20 mil. Added a "Selected floor" header tile, a manufacturer-warranty note to Issue 4, a "Second opinion / alternate bid" card (Getz estimate Fri Jun 12), and a material-vs-labor split (≈$2.59 material / ≈$3.85 labor of the $6.44/sq ft) to the pricing section. Edits made in both views; toggle/filter/copy and print/mobile styles unchanged.

## 2026-05-05

- Added the Davai memory architecture static reference bundle at `/systembydave/`, including seven layer pages, routing, lifecycle, INDEX.md, sync, voice, and implementation guides.
- Added generated Davai diagrams, storyboard scripts, a standalone upload zip, and `build_site.py` for rebuilding the bundle.
- Added `/systembydave/` URLs to the root sitemap and advertised the section sitemap from `robots.txt`.

## 2026-05-04

- Added a public resume page at `/resume/` with System by Dave styling, a signal-flow visual, responsive layout, print styles, and reduced-motion support.
- Fixed self-hosted font URLs in `css/fonts.css` so pages load fonts from the root `fonts/` directory.
- Added the resume route to `sitemap.xml`.

## 2026-03-31

- Replaced the `widgets.html` preview placeholders with live lazy-loaded iframe embeds for Project Status Dashboard, Quest Log, Client Approval Hub, and Workspace Map.
- Adjusted the homepage `Sort Inbox` product card image crop to anchor the artwork at the top of the frame so the illustration is not clipped.
- Verified the updated homepage and widgets page were published successfully on GitHub Pages.
