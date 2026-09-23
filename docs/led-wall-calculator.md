# LED Wall Calculator

`led-wall-calculator.html` is an estimate-only cabinet planner on avbydave.com. It accepts cabinet geometry and raster, layout or target dimensions, content raster, generic processor limits, product wattage, and viewing distance. It produces build geometry, a native canvas, content-fit guidance, a generic data-port minimum, and power and viewing estimates. Actual cabinet, receiver, processor, signal, and venue specifications govern the final design.

## Input and power rules

- Numeric fields may be incomplete while the operator types. Valid drafts update the plan; an incomplete or out-of-range draft leaves the previous calculated result in place and shows `Editing`. On change or blur, the field is normalized and any correction is announced.
- The default 180 W maximum and 65 W typical cabinet values, and 650,000 pixels per port, are examples. Replace them with product specifications before sharing a plan.
- Watts remain available without power factor. Current and circuit estimates appear only after the operator enters a valid manufacturer PF from 0.1 to 1. Both single-phase and balanced three-phase calculations use it. Single-phase voltage means equipment supply voltage; balanced three-phase voltage means line-to-line voltage. Circuit counts remain planning estimates, not electrical safety approval.
- Existing `avCalculator.v1` data with a PF but without `ledPowerFactorEntered: true` is migrated to an unknown PF. This deliberately discards the old assumed 0.95 value. A newly entered valid PF and its explicit-entry flag survive reload and are cleared by Reset LED plan.
- The data-port count is a generic lower-bound estimate from pixel capacity. It does not allocate complete cabinets, verify chain topology, or confirm a selected processor's output map. Review the heaviest chain in manufacturer software.

## Workspace and saved data

At desktop widths the settings and details scroll inside their panels. At 900px and below the workspace scrolls internally; the preview precedes the primary results, then section-jump controls lead to Profile, Layout, Video / Data, Power / Viewer, and Results. The browser document remains viewport-sized. Reduced-motion users receive immediate section jumps.

Calculator values share the `avCalculator.v1` key with the six quick calculators. Product profiles use `avCalculator.ledProfiles.v1`. The LED-to-Power-Load action sends watts into the quick calculator and leaves its manufacturer PF unset. Browser storage failure leaves calculation available but disables persistence and the cross-page handoff.

## Verification

Run `npm run probe:led-configurator -- --base=http://127.0.0.1:8000/` against a local static server. The probe covers geometry, mode changes, profile round trips, input commit behavior, PF gating and migration, mobile containment, accessibility smoke checks, and Power Load handoff. The release also requires `npm run verify:av`, `npm run verify:domain-sites`, the Pages workflow, and a live browser check on avbydave.com.
