# AV Calculator application slice

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

The existing route remains the entry point. Its Summary view opens a bounded
Field sets dialog with Save, Recall, Export, Import and Delete. The new
`avCalculator.fieldSets.v1` key contains a versioned array of named input
sets. It never writes show context, LED profiles, Rail preferences or another
application's document. Import is limited to the exported schema and its own
known input keys. Restoring a set updates the existing working key through the
calculator's current validation and recalculation path.

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
