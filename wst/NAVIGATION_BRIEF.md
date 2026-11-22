# Frozen workspace navigation and opening night

Dave requested one canonical, logical navigation system across every page, an
opening night countdown in the sixth Home slot, and refreshed GSAP motion on
November 20, 2026.

## Outcome

Crew can move between the same destinations in the same order from the workspace,
Handoff, Run review, standalone Stage and Scenic pages. A single navigation model
owns labels, order, URLs and current-page identity. Page-specific controls remain
next to their content. The shared header retains a Home link, page finder,
appearance control and Eastern time.

The route order is Home, Handoff, Calendar, Run review, Rig, Stage view, Pixels,
Notes, Updates, Documents, Scenic, Throw calculator. Legacy hash links and saved
notes remain compatible. Primary destinations remain directly available on phone
screens in a horizontally scrollable navigation rail.

Home keeps its five existing destinations and gains a sixth opening-night card.
The target is November 25, 2026 at 7:00 p.m. America/New_York, confirmed against
the workspace schedule and Walnut Street Theatre's published Mainstage schedule:
https://www.walnutstreettheatre.org/season/mainstage.2026.schedule.php
Show an absolute date beside the countdown. At zero, display an opening-night
message rather than negative values. A failed script still leaves the date visible.

## Motion

Use the existing vendored GSAP for a coordinated ice-letter entrance, a crystal
reveal, six-card stagger and short page transitions. Keep all controls immediately
usable. Pause motion when Home or the document is hidden. Reduced motion and a
missing GSAP library leave every title, card and destination visible and usable.

## Boundaries

Preserve page content, capture media, exact cue identifiers, storage keys, task
write guards, controller behavior, Site identity and audience. No equipment access,
data migration or new external library is needed. Native Sites uses its current
production source as the preservation base; shared implementation belongs here.

## Acceptance

- Every HTML page has the same navigation order, labels and destinations.
- Active page, back/forward, legacy hashes, finder and keyboard focus work.
- Handoff, Run review, Calendar, Rig, Stage, Pixels, Notes, Updates, Documents,
  Scenic and Throw calculator remain reachable.
- The sixth Home card counts down to the exact Eastern opening instant and has
  a useful no-script and expired state.
- Desktop, 680px, narrow phone and ultrawide layouts contain their page; only
  content panels and the navigation rail scroll.
- Reduced motion works without hidden controls, page errors or continuous draws.
- Relevant source tests, built-page navigation checks and browser checks pass
  before the existing Site is published and its live header is read back.
