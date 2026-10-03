# LED Wall Calculator

`led-wall-calculator.html` is an estimate-only cabinet planner on avbydave.com. It accepts cabinet geometry and raster, layout or target dimensions, content raster, generic processor limits, product wattage, and viewing distance. It produces build geometry, a native canvas, content-fit guidance, an automatic whole-cabinet data-chain plan, and power and viewing estimates. Actual cabinet, receiver, processor, signal, and venue specifications govern the final design.

## Input and power rules

- Numeric fields may be incomplete while the operator types. Valid drafts update the plan; an incomplete or out-of-range draft leaves the previous calculated result in place and shows `Editing`. On change or blur, the field is normalized and any correction is announced.
- A cabinet smaller than one pixel at the entered pitch is flagged as an invalid product combination. The pitch-derived raster remains at least one pixel per axis so downstream pixel and processor figures stay finite, but the operator must correct the source inputs before using the plan. Typical cabinet watts above maximum cabinet watts are also flagged without changing either entered rating.
- The default 180 W maximum and 65 W typical cabinet values, and 650,000 pixels per port, are examples. Replace them with product specifications before sharing a plan.
- `data/led-cabinet-catalog.v1.json` supplies six manufacturer planning profiles from dated ROE and Absen specifications. The selector groups them separately from user-saved profiles. Choosing one updates only cabinet-specific inputs and clears unknown power factor, receiver limits, and power-link counts; layout, supply voltage, and processor settings remain operator choices. The source revision, derived-watts basis, tolerance or conflict notes, and manufacturer link appear beside the profile. The catalog is included in the offline asset list; a failed load leaves custom and saved profiles usable.
- Absen's stated W/m² values are multiplied by the exact cabinet area to populate watts per cabinet. Its ±15% tolerance is shown, not silently treated as a verified peak. Some older ROE documents disagree with the selected source, so the installed cabinet revision must be confirmed before using its weight or power in a show plan.
- Cabinet-only mass is displayed in the Power / Viewing / Assumptions panel. It excludes support hardware, cables, ballast, wind, and the supporting structure. Catalog support notes are conditional references, not a hanging or ground-stack approval. The catalog does not fill power factor, product home-run count, receiver limits, or processor capacity without matching evidence.
- Watts remain available without power factor. Current and circuit estimates appear only after the operator enters a valid manufacturer PF from 0.1 to 1. Both single-phase and balanced three-phase calculations use it. Single-phase voltage means equipment supply voltage; balanced three-phase voltage means line-to-line voltage. Circuit counts remain planning estimates, not electrical safety approval.
- Existing `avCalculator.v1` data with a PF but without `ledPowerFactorEntered: true` is migrated to an unknown PF. This deliberately discards the old assumed 0.95 value. A newly entered valid PF and its explicit-entry flag survive reload and are cleared by Reset LED plan.
- The even-pixel port count remains a generic lower bound. The displayed chain count packs complete cabinets in a row-serpentine planning order using the adjusted pixels-per-port capacity. It flags a cabinet that cannot fit one port and a chain count above the entered processor port count. The color map is schematic: it does not prove cable direction, output assignment, receiver compatibility, or processor performance. Review the heaviest chain in manufacturer software.

## Workspace and saved data

At desktop widths the settings and details scroll inside their panels. Product, Layout, Video / Data, and Power / Viewing Distance settings have keyboard-operable disclosure headers. Product starts open; the other groups start closed and can be opened independently without clearing values. At 900px and below the workspace scrolls internally and a sticky section rail sits above the preview. Its five buttons open the requested group or jump to Results. The browser document remains viewport-sized. Reduced-motion users receive immediate section jumps.

The preview renders a 3D wall with schematic cabinet depth using the same pinned three.js release as Throwline. Drag or touch to orbit, pinch or scroll to zoom, and use arrow keys after focusing the model. Expand Inspect cabinet to enter a row and column; tapping a cabinet face opens the inspector and shows its planned port and native pixel area. Front and Isometric restore known views; reduced-motion settings make those changes immediate. The renderer draws only when geometry, plan, selection, view, or size changes. If WebGL is unavailable or its context is lost, the cabinet grid and row/column inspector remain available. Cabinet depth is illustrative and is not a rigging dimension.

Calculator values share the `avCalculator.v1` key with the six quick calculators. Product profiles use `avCalculator.ledProfiles.v1`; profiles can retain an operator-supplied manufacturer specification URL, cabinet weight, and explicitly entered power factor. Legacy saved profiles without PF evidence clear that value on load. A supplied URL is provenance, not automatic verification. The selected manufacturer catalog ID persists in calculator state and is cleared when a cabinet-specific value is edited. The LED-to-Power-Load action sends watts into the quick calculator and leaves its manufacturer PF unset. Browser storage failure leaves calculation available but disables persistence and the cross-page handoff.

The shared AV Suite service worker refreshes scripts and styles on an online visit and falls back to cached copies when the network request fails. This prevents a returning browser from combining fresh calculator markup with an older cached script after the updated worker has taken control.

## Five representative operator walkthroughs

These are simulated task walkthroughs against the rendered application, not five recruited user interviews. They were checked at phone and tablet widths during the October 2, 2026 polish pass.

| Task | Observed friction | Response and check |
| --- | --- | --- |
| Choose a sourced cabinet | The profile selector was buried below the preview on narrow screens. | Profile is the first visible section shortcut and opens by default. Selecting a ROE profile updated pitch and source notes. |
| Size a cabinet array | Layout controls were deep in one long settings panel. | Layout is a separate disclosure; its shortcut opens and focuses it. Editing width and height updated the wall and raster. |
| Plan video and data | Processor assumptions competed with every other field. | Data is its own disclosure. Editing utilization updated the planned chain count while retaining the generic estimate label. |
| Review power | Power factor and circuit caveats were far below the fold. | Power is directly reachable from the section rail. Current and circuit counts stayed pending until a manufacturer PF was entered. |
| Hand off a plan | Phone actions wrapped unevenly, and the download control consumed a full row. | Four actions use a two-column phone layout with 44px targets. Copy Summary produced the expected plan text and success status. |

The remaining acceptance gap is observation with actual operators on their devices; these walkthroughs establish interaction and layout behavior, not human preference or field suitability.

## Verification

Run `npm run probe:led-configurator -- --base=http://127.0.0.1:8000/` against a local static server, then repeat with `--no-webgl` to verify the fallback. The probe covers the 3D model, cabinet selection, whole-cabinet chain limits, pointer and keyboard orbit, reduced-motion presets, geometry, mode changes, profile round trips, input commit behavior, PF gating and migration, section disclosures, accessibility smoke checks, and Power Load handoff. Its viewport matrix checks page containment, stage width, and control sizes at phone, portrait and landscape tablet, desktop, and ultrawide sizes. Visually inspect those proportions as well. The release also requires `npm run verify:av`, `npm run verify:domain-sites`, the Pages workflow, and a live browser check on avbydave.com.
The `LED wall browser` pull-request workflow runs both probe modes before merge, so the production Pages workflow does not first discover a browser regression after merging.
The probe waits for the 3D module to report ready or fallback, so the same command can verify the public URL despite normal network loading time.
