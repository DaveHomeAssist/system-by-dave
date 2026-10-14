# Individual AV panels

Direct user requirement, October 13, 2026: any individual panel from any department must be selectable from the same menu at any time. Whole applications inside tiles do not satisfy this requirement. Keep the existing design and saved data.

Implementation boundary: retain the existing console grid, chooser, move/resize/replace/maximize and named views. Publish each existing department panel under a namespaced type. Mount one native React controller per used department and render its panel bodies directly into the shared grid, without iframes or nested consoles. All panels belonging to a department share its existing state, explicit Save, imports, export and recovery logic. Closing a panel or switching views must not discard that state. Department controls remain accessible from every panel.

Preservation: no new record schema, storage-key rename, silent record migration, default-data replacement or cross-department save. Existing application snapshots are expanded for display only; original stored bytes remain unchanged until the user explicitly stores/saves a view. Standalone applications remain available. Preserve the original Calculator engine and values rather than introducing different formulas.

Acceptance: one searchable menu contains individual panels from all nine departments; mix Audio, Video, Lighting and remaining departments in one view, replace a panel across departments, edit shared departmental records from multiple panels, close/reopen without losing edits, explicitly save and reload records and mixed arrangements, verify old saved documents and snapshot layouts, exercise both themes and desktop/phone/short/ultrawide containment. No whole-app iframe is accepted as a panel. Exact-head source checks, browser acceptance, CI, publication and live proof are separate gates.

Prior Speaker-status PR337 remains separate, with its first standalone probe correction preserved at e91ba6e. This integration starts at production94b1ce7 and does not silently include the unreleased Speaker-status feature.
