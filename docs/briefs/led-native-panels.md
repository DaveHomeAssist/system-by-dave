# LED Wall Calculator native panels

Dave selected LED Wall Calculator for AV-SPECIALIST-01 on October 30, 2026.

The existing full-page specialist occupies a whole console panel. Expose its Profile, Layout, Data, Power, Results, Tools and Preview as native panels that can sit beside other AV controls. Reuse the original calculator engine and DOM, rather than copying formulas or state. Preserve the standalone page, shared calculator values, saved cabinet profiles, TXT export and power handoff. No new document schema or storage migration is required.

Compile the existing engine into the console with document queries confined to its own nodes. Keep the 3D viewer on the same source and preserve its rendering, fallback and disposal behavior. Translate old specialist layouts in memory only, without rewriting stored bytes on opening. Individual panels must support the console pager, phone switching, themes, visible focus and mixed application views.

Verify standalone/native numerical parity, cross-application storage preservation, old layout bytes, preset save/reload, summary download, cabinet selection and power handoff. Run AV Suite typecheck/build/contracts, the existing shell probe, and a dedicated browser fixture. Test phone, desktop and ultrawide. Commit and push for source review; merges, deployment, inference, physical output and human acceptance are excluded from this sprint.

Compatibility: ECP-1.0 revision 1.0 was read. The existing LED calculator remains the producer and consumer of cabinet profile identities, units and planning values. This adapter changes presentation only; it introduces no shared equipment schema, new profile authority, live route or output capability. Physical and operator acceptance remain separate.

Verification on Dominic: typecheck/build, AV contracts, all 72 console choices, seven-panel calculation parity, input reload, preset save, TXT export, legacy layout byte preservation, three native viewport shells and offline reopen passed. Phone profile and 3D preview screenshots were inspected. The viewer is loaded lazily and its generated shader chunk is included in the existing offline manifest. Source delivery and CI are separate from merge, deployment and human acceptance.
