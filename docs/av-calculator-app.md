# AV Calculator application slice

## Skip-link revalidation — 2026-10-18

**AVV-05: superseded for the current standalone Calculator.** Reviewed source
and production both name `a38a9a8ab41b89289a50c4d4f5359bb8bc1cefbb`.
This is a finding closure, not a runtime repair or full accessibility acceptance.

The historical risk came from `AVViewport.tabs().fromLocation()`: an unknown
hash falls back to the first tab. The current native Calculator uses
`apps/av-calculator/src/App.tsx` instead. Its hash handler selects a panel only
when the hash matches a known library type; `#main-content` does not select
another task. Its bridge uses `AVViewport.paginate`, not `AVViewport.tabs`.
The old helper's behavior remains outside this finding's verified route.

Dominic ran a focused live Chromium probe with Playwright 1.63.0 in disposable
contexts at 1440×900 and 375×812. First Tab reached **Skip to calculators**.
For each size, open `/av-calculator.html#storageCard` (Video view) and
`/av-calculator.html#powerCard` (Power view), use Shift+Tab to reach the skip
link, then Enter. All four cases changed the hash to `#main-content`, focused
that main element, preserved the selected view and visible panels, and left
the complete synthetic browser storage snapshot byte-identical. No page errors
were observed; desktop and phone screenshots were inspected.

The live Calculator bundle SHA-256 was
`383a5e8fe1347cd962fd76cc5b7706c540f3273fdbb2e7caf4bd61ed32fd9f6a`;
the shared viewport helper was
`3ad4c2eb54518dd7e4a1578d70b8f90d16aa8a5cfb19251d28d66a0222213d21`.
Both matched the reviewed source. No runtime, saved values, layout, route or
test suite changed. The fixture used no existing browser profile or user data.
Physical keyboard/device and screen-reader acceptance remain separate;
AVV-06 compatibility, AVV-13 navigation and all product choices remain open.

## Native panel workspace brief — 2026-10-12

The accepted product direction is AV Video's configurable touch workspace
across the toolset. Calculator currently provides a single tabbed task at a
time. Replace its navigation shell with the shared console workspace so an
operator can arrange Audio Delay, Projection, Record Storage, Power Load,
Voltage Drop and SPL Distance alongside Operator Summary. Preserve the
existing live controls, calculation engine, normalization, field sets and
public route; these are working panels, not links or preview tiles.

The smallest useful slice adds default Audio, Video, Power and Summary views,
Add/Close/Replace, move/resize, maximize, keyboard menu operations and stored
named views. Phone and short-height layouts show one panel with a bottom
panel rail. Inputs/results paginate within each panel; the inherently long
summary and imported-value review may scroll within their bounds. The
existing explicit Field sets dialog remains available from the header
(and the Controls dialog on short screens). Show context remains an optional separate working panel.

Use the existing React/shared-console dependencies. A small DOM adapter moves
the original control nodes into leaf panels, retaining their listeners and
keeping inactive controls in a hidden parking area. This avoids duplicating
the calculator maths or changing the shared LED persistence contract.
The calculation engine remains the owner of `avCalculator.v1`; values still
autosave. Named field sets remain `avCalculator.fieldSets.v1`. Device-local
views and live arrangements use separate versioned keys and cannot write
calculator values, LED profiles, host documents or show identity. Store/Update
View commits view changes explicitly; other layout edits remain preferences.
Unreadable new view data must be retained rather than silently replaced.

Dependencies/risks: both calculator routes share the old working key and the
old engine has existing last-writer/invalid-data normalization semantics;
this layout slice is not a durability redesign. Verify no formula changes,
no lost LED fields, no duplicated DOM controls/listeners and no pagination
that hides an error or traps keyboard focus. Existing safety warnings must
remain accessible. Do not change the LED planner UI, add live electrical
control, infer manufacturer power factor, add sync, or claim field acceptance.

Observable acceptance: all six calculations and their boundary warnings;
field-set save/recall/import/export and rejected inputs; values survive panel
close/reopen, view edits and reload; independent host Save; stored arrangements
survive reload without writing values; both themes, keyboard, touch targets,
print, deep links, offline and actual AV Video embedding; desktop, 680px,
phone, short height and ultrawide containment. Source/model, browser, CI,
publication, exact live assets and physical/operator acceptance remain
separate proof stages.

AV Calculator is the canonical maintained quick-calculation route at
`/av-calculator.html`. The six calculation models and `avCalculator.v1` working
values remain authoritative. LED Wall Calculator remains its own directly
launchable specialist at `/led-wall-calculator.html`; its profiles and working
values are not folded into this application's field sets. PlotForge and CueForge
remain separate products and supply no calculator data contract.

## Operator problem and useful slice

An operator can calculate six field estimates and copy or download the combined
summary, but cannot switch between two jobs without overwriting the current
working values. Add named field sets for the six calculators. Save captures the
currently visible inputs, recall applies one complete set, and export produces
one portable JSON file. Import previews the name and values and requires an
explicit apply action. Bad imports leave the current inputs and saved sets
untouched. The original browser key and calculation formulas stay intact.

## Flow and data

The existing route remains the entry point. Its header opens a bounded
Field sets dialog with Save, Recall, Export, Import and Delete. The new
`avCalculator.fieldSets.v1` key contains a versioned array of named input
sets (up to 100). It never writes show context, LED profiles, Rail preferences or another
application's document. Import is limited to the exported schema and its own
known input keys. Restoring a set updates the existing working key through the
calculator's current validation and recalculation path. Imported numeric values
must match the source input's range and step before the set can be added. The
preview lists every labeled input and value before Apply; a rejected file or a
full library leaves existing sets and working values unchanged.

## Exclusions and acceptance

This slice does not claim electrical, acoustic, or projector safety; all
results remain planning estimates requiring equipment and venue verification.
It does not add cloud sync, account identity, or automatic cross-tool imports.

Acceptance requires two independently saved sets to survive reload, a recalled
set to recalculate all six outputs, a round-trip JSON export/import, and a
malformed or unknown-version import to preserve current work. Desktop and
phone must keep a viewport-contained keyboard path, visible focus and a
recoverable error message. Source tests, rendered screenshots and live
deployment evidence are separate gates.
