# ETC SmartFade 1248 inspection increment

Controlling brief: Dave's SmartFade 1248 specification 0.2, 19 October 2026.

Extend the current Ion Workbench source, preserving Ion and wing geometry, IDs, lessons and saved data. The smallest useful increment is an additive SmartFade equipment definition, individually addressable top controls and enclosure, using the existing renderer, contour selection, inspector, presets, fallback and panel bridge. No firmware emulator, network output, ECOG patch or store/recall practice is included. Physical slider positions are inspection state and are not intensity output. Practice is withheld pending model-specific semantic validation.

Source baseline: adc1e48548ded055d96c67faf3f1cd86347b5b91, README viewer 0.12, Sites version 11; projection 22 is supplied metadata, not independently refreshed. Host PR351 remains open at 6d317b7d44462aa0f7a79112e633f12aeeed9c0e, paired viewer 0.9. There is no dependency lockfile in this buildless source; vendored Three r180 is unchanged. Existing tests passed on Dominic before shared edits. Baseline images, catalog hashes and fresh-profile UI-generated saved states are under evidence/baseline. These fixtures do not replace Dave's unavailable historical saved browser data.

Flow: open existing viewer with gear=smartfade1248; select or search a physical control; inspect purpose, next action, result, failure check, warning and evidence. Overview, Top, Faders, Playback, LCD/Programming and Rear I/O use the inherited camera mechanism. Adjust faders moves physical caps only; Explore never executes a lighting command. Host owns placement, resize and close. Two independent frames own separate transforms and materials.

State: existing Ion equipment ID, keys and defaults remain unchanged. SmartFade uses equipment ID etc-smartfade-1248 and scoped named-view keys including workspace view and panel identity. Invalid scope never grants access or crosses the message origin boundary. Equipment state is rejected by the wrong adapter. No portable snapshot export is claimed.

Evidence: supplied Photo 3 establishes full top layout; Photos 1 and 2 show cap shape and key legends. They are observations of a rental unit, not dimensional CAD. Originals remain untouched; original explanatory text and procedural geometry are authored here. No manufacturer artwork/manuals are added to the distribution. Photo originals are retained outside dist for build evidence only. A photo comparison is not calibrated metrology. Rear layout, exact face angle, feet/envelope convention, cap sizes and travel remain unresolved/approximate. Rear sockets are not guessed; port identities remain textual until exact-model rear reference acceptance.

Compatibility: ECP-1.0 revision 1.0. Producer: procedural millimeter equipment/control definition with explicit 0.001 adapter into the existing meter scene. Consumer: Ion inspection renderer/panel protocol only. GLB, plot, rig, game, hardware and other consumers are unverified. Runtime instance state does not belong in the immutable definition.

Acceptance: preserve baseline Ion suites and like-for-like renders; verify physical counts, geometry/catalog correspondence, moving compound contours, state rejection/isolation, fallback, cancellation and camera presets. Test desktop, 680px, phone and emulated tablet sizes. Physical Surface/iPad, historical-state compatibility, exact rear/motion calibration, authenticated production embedding and same-device performance remain release gates. This increment cannot be called reference-accurate or release-complete while those gates remain open.

## Authorized prototype publication

Dave authorized publication on 19 October 2026 for inspection and trial, with approximate rear geometry and fader travel and open device checks. Sites version 13 is published at https://ion-workbench.davein4k.chatgpt.site/?gear=smartfade1248 (deployment appgdep_6ad6d4fcfa988191b6314424b5a7549d). AVByDave registration includes the required Ion host foundation. This prototype publication does not close the reference-accuracy, device, historical-state or performance gates above.

## Publication readback

Host PR359 merged as a740564e7fc42fff89e79bfe8b3ec3271893dd22, including the Ion foundation. Source publication run 39361577808 and AVByDave destination run 39363551116 passed; live source.json matched a740564. The refined viewer source 03823eea24cab8190d656ed262a2f2b73766d83e is published in deployment appgdep_6ad6dd5d9d1481918a77c49f55a1ec60. Curved caps, rounded grip detail, layered keys and aspect-correct labels preserve all physical IDs and motion endpoints. Four Ion rendered comparisons remain byte-identical, and SmartFade interaction/fallback/isolation checks pass on Dominic.

The actual AVByDave panel loads the private sign-in page in the observed in-app browser; OAuth content is then blocked in the cross-site frame and the host correctly reports unavailable. The authenticated full viewer works. **Embedded authentication is a known failed check in this browser**, not completed acceptance. Use Open full for trial; do not weaken sharing or pass credentials to the viewer to bypass it. Device checks and the remaining reference-accuracy gates stay open.
