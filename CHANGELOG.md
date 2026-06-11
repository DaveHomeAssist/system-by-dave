# Changelog

## 2026-06-11

* Added a private, unlisted prototype page at `/youtube-pipeline.html` for the Notion based YouTube Pipeline. The page is marked `noindex, nofollow`, blocked in `robots.txt`, and kept out of `sitemap.xml` because it still requires the Claude artifact host APIs for live data and writes.
* Added `youtube-pipeline-regression-2026-06-11.js` plus `youtube-pipeline-production-plan-2026-06-11.md` beside the prototype so the data loss guard and remaining production gates are visible in repo.

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
