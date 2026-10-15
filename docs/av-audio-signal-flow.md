# Audio signal flow

## Brief — October 15, 2026

Operators need to trace mixer, crossover, amplifier and speaker connections without
mistaking a line input for a loudspeaker input. Audio's channel and speaker tables
do not express these connections. Add a native Signal flow panel and view in both
Audio and the shared AV console, with explicit devices and directed connections.

The smallest useful slice is an editable diagram, a keyboard accessible connection
list, upstream/downstream tracing, and a reviewed starter for powered tops with
passive subs. Blue labelled lines carry line level; orange labelled lines carry
speaker level; unknown levels remain grey. Dashed routes and visible text retain
unconfirmed routing. Colour is never the only identifier. Powered speakers include
their internal amplifier; an external amp feeds passive speakers only.

Flow is an optional versioned field of the existing Audio v1 document. Existing
channels, speakers, original imports, storage key and explicit Save/Export/restore
remain intact. Free-text table records are not automatically interpreted as wiring.
The starter is explicitly hypothetical and requires confirmation; it does not set
models, sub quantity, crossover frequency, slope or amplifier mode. Device/connection
editing never edits the separate planning tables. Deleting a device removes its
attached connections only after confirmation.

Exclude automatic hardware discovery/control, acoustic prediction, impedance/load
approval, pinout inference, a new global show database and redesign of other packs.
No new dependencies. Diagram paths are illustrative logical routing, not cable
lengths or verified physical wiring. Mains power is outside the audio graph.

Acceptance: create/edit/trace mixer to crossover to amp to passive sub; keep powered
tops on line feeds; reject known speaker-to-line and line-to-passive mismatches;
retain unknowns; save/reload/export/import roundtrip; old v1 documents still load;
chooser composition works; diagram and equivalent readable routes work in narrow
and short panels, light/dark palettes and keyboard use. Tests and release evidence
remain separate from physical wiring verification and operator acceptance.

## Operator use

Open Audio → Signal flow, or select Audio / Signal flow from the shared panel
chooser. Add devices and connections or review the template. Select a device in
the trace selector or activate its diagram card to follow its upstream and
downstream paths. Connections exposes full names, connector/pin text, evidence
and edit controls; blank ports and quantities display as unconfirmed. A powered
speaker's external output represents its line link, never an amplified output.
Parallel passive links should be drawn from the amp and described in connection
notes; the model does not approve loads or model passive output ports.

Apply edits updates the unsaved plan; use the existing Save and Export controls.
Import an Audio JSON backup through Document to restore the graph and tables.
Old plans open without a graph and are not seeded automatically. A previous app
build cannot preserve the newly added optional graph when saving: reload updated
builds before editing a graph-bearing plan and retain an exported backup.

The diagram scrolls inside its panel at narrow sizes. Connections provides a
readable card view without shrinking the diagram's text. In extremely short
standalone windows use Full screen focused panel to recover working space;
Escape returns to the page. The shared console retains its existing Focus mode.

Verification commands: `npm run typecheck:av-audio`, `npm run test:av-audio`,
`npm run typecheck:av-suite`, both builds, `npm run test:av-audio-flow-browser`,
`npm run test:av-suite-browser`, `npm run verify:av`, `npm run verify:domain-sites`.
The browser probe uses isolated data and never loads a customer's private plan.
