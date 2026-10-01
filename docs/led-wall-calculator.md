# LED Wall Calculator

`led-wall-calculator.html` is an estimate-only cabinet planner on avbydave.com. It accepts cabinet geometry and raster, layout or target dimensions, content raster, generic processor limits, product wattage, and viewing distance. It produces build geometry, a native canvas, content-fit guidance, an automatic whole-cabinet data-chain plan, and power and viewing estimates. Actual cabinet, receiver, processor, signal, and venue specifications govern the final design.

## Input and power rules

- Numeric fields may be incomplete while the operator types. Valid drafts update the plan; an incomplete or out-of-range draft leaves the previous calculated result in place and shows `Editing`. On change or blur, the field is normalized and any correction is announced.
- The default 180 W maximum and 65 W typical cabinet values, and 650,000 pixels per port, are examples. Replace them with product specifications before sharing a plan.
- Watts remain available without power factor. Current and circuit estimates appear only after the operator enters a valid manufacturer PF from 0.1 to 1. Both single-phase and balanced three-phase calculations use it. Single-phase voltage means equipment supply voltage; balanced three-phase voltage means line-to-line voltage. Circuit counts remain planning estimates, not electrical safety approval.
- Existing `avCalculator.v1` data with a PF but without `ledPowerFactorEntered: true` is migrated to an unknown PF. This deliberately discards the old assumed 0.95 value. A newly entered valid PF and its explicit-entry flag survive reload and are cleared by Reset LED plan.
- The even-pixel port count remains a generic lower bound. The displayed chain count packs complete cabinets in a row-serpentine planning order using the adjusted pixels-per-port capacity. It flags a cabinet that cannot fit one port and a chain count above the entered processor port count. The color map is schematic: it does not prove cable direction, output assignment, receiver compatibility, or processor performance. Review the heaviest chain in manufacturer software.

## Workspace and saved data

At desktop widths the settings and details scroll inside their panels. At 900px and below the workspace scrolls internally; the preview precedes the primary results, then section-jump controls lead to Profile, Layout, Video / Data, Power / Viewer, and Results. The browser document remains viewport-sized. Reduced-motion users receive immediate section jumps.

The preview renders a 3D wall with schematic cabinet depth using the same pinned three.js release as Throwline. Drag or touch to orbit, pinch or scroll to zoom, and use arrow keys after focusing the model. Tap a cabinet face or enter its row and column to inspect its planned port and native pixel area. Front and Isometric restore known views; reduced-motion settings make those changes immediate. The renderer draws only when geometry, plan, selection, view, or size changes. If WebGL is unavailable or its context is lost, the cabinet grid and row/column inspector remain available. Cabinet depth is illustrative and is not a rigging dimension.

Calculator values share the `avCalculator.v1` key with the six quick calculators. Product profiles use `avCalculator.ledProfiles.v1`; profiles can now retain an operator-supplied manufacturer specification URL and cabinet weight. Existing profiles without those fields continue to load with both blank. A supplied URL is provenance, not automatic verification. The LED-to-Power-Load action sends watts into the quick calculator and leaves its manufacturer PF unset. Browser storage failure leaves calculation available but disables persistence and the cross-page handoff.

## Verification

Run `npm run probe:led-configurator -- --base=http://127.0.0.1:8000/` against a local static server, then repeat with `--no-webgl` to verify the fallback. The probe covers the 3D model, cabinet selection, whole-cabinet chain limits, pointer and keyboard orbit, reduced-motion presets, geometry, mode changes, profile round trips, input commit behavior, PF gating and migration, mobile containment at 375×812, accessibility smoke checks, and Power Load handoff. The release also requires `npm run verify:av`, `npm run verify:domain-sites`, the Pages workflow, and a live browser check on avbydave.com.
The `LED wall browser` pull-request workflow runs both probe modes before merge, so the production Pages workflow does not first discover a browser regression after merging.
The probe waits for the 3D module to report ready or fallback, so the same command can verify the public URL despite normal network loading time.
