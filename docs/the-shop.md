# The Shop application brief

The Shop gives an AV shop lead one operational worklist from prep through pack, load in and strike. Existing Gear Prep, Truck Pack Plan, Load In Plan and Strike Plan remain independently usable and retain their original browser data. This application takes explicit, reviewed copies of their records into its own plan; it never writes legacy keys.

The smallest useful flow is: name a plan, add work, copy a source plan or import its exported JSON, review the staged records, save, assign ownership and blockers, advance each record through the four phases, filter the queue, and export or restore a Shop backup. Import is a preview until confirmed. A failed or malformed import leaves the saved plan unchanged. The source name, source id and original record are retained on each copied row for provenance and lossless re-export.

`sbd.shop.v1` stores `{schema:'system-by-dave.shop.v1', name, items}`. Each item has an application id, title, case, department, owner, location, destination, notes, blocker, phase, status, source and original. Save is explicit; failed storage writes retain the unsaved in-memory plan and offer JSON export. An existing invalid or future-version document is never overwritten; its original bytes can be exported for recovery. Legacy import keys are read only.

This slice excludes automatic two-way synchronization, gear inventory mutation, hardware control, and duplicate identity resolution across legacy plans. Copies from distinct tools remain distinct rows until the operator consolidates them. Gear Reference stays a separate read-only source. CueForge and PlotForge are maintained specialist products with separate ownership and no Shop data contract.

Acceptance: fresh add/edit/save/reload, import preview and cancel, malformed import recovery, original legacy key byte parity, export, desktop and phone keyboard operation, light/dark toggle, and no page scroll at 1440×900 and 375×812. The Rail owner must separately add `console:shop` route `/the-shop/`, context rules, offline assets and public navigation. Merge/deployment and live behavior require serialized integration.
