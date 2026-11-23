# Frozen navigation and cohesion

November 20 workspace release: Dave requested one canonical navigation system
across the hosted pages, an opening night countdown in Home slot six, and a
refreshed GSAP treatment. The implemented hosted shell is defined by
`wst/hosting/navigation/model.mjs` and the scoped acceptance brief in
`wst/NAVIGATION_BRIEF.md`. It uses one ordered menu, with Handoff opening the
in-workspace view and the standalone handoff retaining its direct URL. The
controller tools remain initially hidden on the public workspace.
`wst/navigation-contract.test.mjs` now checks that compiled shell, route coverage
and parity of the local controller source inputs. The older four-menu contract
and its Handoff collision exceptions are replaced for this hosted release. The
controller and Monitor proposals below remain historical context and separate
scope; this change does not resolve or alter their task records.

Brief for the menus of the Frozen crew surfaces: the published workspace
(`wst/`, also served by Projctl at `/workspace/`), the standalone handoff page,
the Rehearsal Review page, the Projctl controller and Frozen Monitor.

Status, 2026-11-17: slice 1 is built. Slices 2 and 3 wait on NAV-1 to NAV-4 below.
Approving this brief does not approve a publication; the workspace is published
from the managed Sites checkout, not from a merge here.

## Problem

A crew member meets four menus in the workspace (Workspace, Main menu, Home
cards, Planning views) and three more surfaces with their own menus. The same
view carries different names, and one name opens different things:

| What it is | Workspace | Projctl controller | Frozen Monitor |
| --- | --- | --- | --- |
| Projector control | Live controls (was also "Operator controls") | Controls | — |
| Equipment reference | My Projector Rig | Gear & signal flow | Rig (a different page) |
| Shared tasks | Notes + tasks | Notes + tasks | Notes (a different page) |
| Tech schedule | Calendar, under Planning; the view is headed "Tech Schedule" | — | Calendar (a different page) |
| Crew handoff | "Handoff" opens the standalone page from the top row and the in-app view from Planning; Home calls the in-app view "House handoff" | — | — |

The 2026-11-16 site review scored information architecture and navigation 5/10
for these reasons. Nothing checked the menus, so each new entry could add another name.

## Outcome

One label per view and one view per label, on every Frozen surface, checked by a test.
A crew member who learns a name on one page finds the same name on the next.
Existing hash routes, storage keys and page addresses do not change.

## Slices

1. **One label per view in the workspace (this change).**
   - The Home card "Operator controls" becomes "Live controls", the name the More menu and the README already use.
   - Both Run review links carry the same separate-page cue: a visible arrow and the words "(separate page)" for screen readers.
   - `wst/navigation-contract.test.mjs` reads the four menus from `wst/index.html` and fails on a second name for a view, a reused label, a link to another page without the cue, a menu entry the router does not serve, or a local Projctl copy that differs from the published source. It runs in CI through `npm run verify:public-navigation`.
   - The three Handoff collisions stay and are listed in the test as waiting on NAV-2.
2. **Regroup the workspace menus** as NAV-1 decides, and settle Handoff as NAV-2 decides. No route changes.
3. **Carry the same labels to the shared menu** on the handoff page, Projctl and Monitor (drafts #514 and #515), with one label list checked by the same contract (NAV-4), and apply NAV-3 to the controller entries.

## Not included

- Publishing to `wst.housevideo.app`. The Rehearsal Review page and its back link live in the managed hosting source, so its back link cannot be changed here.
- The shared task service. Public team tasks are an existing explicit choice recorded in `wst/README.md`.
- Renaming Frozen Monitor pages or controller tabs (a later milestone, NAV-5).
- Any relay, projector, storage or API change. Navigation sends no hardware commands.

## Decisions

Each stays Open until answered. Recommendations are not approvals.

### NAV-1 — How should the workspace menus be grouped? (needed now; unlocks slice 2)

- **A. Three groups from Home (recommended).** Show day: Handoff, Calendar, Notes + tasks, Team updates. Review: Run review, Documents. Rig: My Projector Rig, 3D Stage View, Pixel Strips, Throw Calc, then the controller entries. One way into each view. Cost: entries move, so all four menus and the browser tests change.
- **B. Keep today's six controls** (Home, Handoff, Planning, My Projector Rig, 3D Stage View, More) and only fix names. Least change; drafts #514 and #515 assume it. Cost: three ways into Calendar remain, and More keeps mixing reference pages with controls.
- **C. Wait for the independent review** requested on 2026-11-17 before choosing.

### NAV-2 — Which Handoff is the main one? (needed with slice 2)

- **A. The in-app view (recommended).** Every "Handoff" entry opens it; the standalone page stays as the script-free copy, reached by the existing "Standalone handoff" link and still opened from the top row when scripts are off.
- **B. The standalone page.** Every "Handoff" entry opens `/handoff.html`, as drafts #514 and #515 assume; the in-app copy leaves the menus.
- **C. Keep both, named apart:** "Handoff" in the app and "Handoff page ↗" for the standalone copy.

### NAV-3 — Who sees the controller entries on the public site? (needed with slice 3)

Live controls, Presets, Log and Configuration need a controller on the visitor's own machine; on the public site they can only show how to connect.

- **A. One entry (recommended).** The public site lists Live controls only, which explains how to connect; Presets, Log and Configuration appear once a controller is connected, and always on the local Projctl copy.
- **B. Keep all four listed for everyone.**

### NAV-4 — What happens to the shared-menu drafts #514 and #515? (needed before slice 3)

- **A. Split and rebase (recommended).** Land the snowflake icons on their own; rebase the shared menu onto the NAV-1 grouping so its labels come from one list the contract checks.
- **B. Land both as they are,** then regroup.
- **C. Close them** and rebuild the shared menu after slice 2.

### NAV-5 — Should Monitor's Rig, Notes and Calendar be renamed or merged with the workspace views of the same name? (later milestone)

No recommendation yet. It needs the Monitor page owners' view of what each page is for.

## Acceptance

- Slice 1: `npm run verify:public-navigation` passes, including the contract test; `node scripts/test_wst_workspace.cjs` passes at 1440×900 and 375×812 with no page scroll; the Home cards still fit above the bottom menu at 375 px; no console errors; both themes.
- Slices 2 and 3: the contract's open list is empty, every hash route in `wst/README.md` still resolves, and the same label opens the same view from every Frozen surface.

## Risks

- Crews have learned the current entries. Slices 2 and 3 should ship with a short note in Team updates.
- The hosted worker snapshot in `wst/hosting/` is refreshed at publication. A publication from this source must first carry over the routes that exist only in the managed checkout (see `wst/README.md`, "Run review navigation").
- Drafts #514 and #515 edit the same pages. Slice 1 touches different lines; slices 2 and 3 will conflict unless NAV-4 is settled first.
