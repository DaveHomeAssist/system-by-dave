# Projector operator console

## Outcome

The default view exposes shutter, power, test patterns, Clear pattern and Reset to HDMI for each A to D projector. Diagnostics, lens controls, configuration, schedules, references and planning remain available through secondary controls.

Each card keeps the lane, surface, model, current power/shutter/input/pattern and connection freshness visible. Desktop shows the four cards together. Tablets and phones select one lane at a time with persistent A to D navigation. Both themes use the existing design tokens.

## Command behavior

Shutter actions state the requested position. Power off retains the relay's existing two-step confirmation and ignores a rapid repeat during its first 400 ms. Cooling, offline, stale and show-lock states keep their existing command guards.

Clear pattern sends the model's pattern-off command and checks fresh reported state. Reset to HDMI clears the test pattern, selects the configured HDMI input or the unique HDMI input reported by the device, and checks fresh feedback for both. PJLink-only devices without internal pattern control keep HDMI reset available; only the input is sent and verified, and unsupported pattern controls are disabled. Missing or ambiguous HDMI metadata produces an explicit error. Each projector has independent operation feedback, and concurrent output recovery actions on the same projector are blocked until the current action finishes. Partial failure preserves the successful step and reports the remaining problem.

## Verification

Verify every main action in the simulator, including model-specific pattern codes and named HDMI sources. Exercise command failure, stale feedback, disconnection, show lock and target identity changes. Check desktop, tablet, phone and ultrawide layouts, both themes, keyboard focus and viewport containment. Real projector acceptance requires explicit operator commands and visual confirmation of the projected output.

## Installed relay compatibility

The installed relay has newer polling and thermal sampling than main. Deploy only the reviewed UI assets, leaving that backend and its managed rig configuration in place. The existing thermal view is retained under Tools and reads optional thermal data when the relay supplies it. It shows missing readings explicitly on relays without that capability.

UI-only deployment records the reviewed source commit and the digest of each of these assets: `app.js`, `index.html`, `workspace-bridge.js`, `operator-console.js`, `operator-console.css`, `output-recovery.js`, `thermal-watch.js` and `thermal-watch.css`. Build a candidate public directory by preserving the installed public directory and overlaying those assets. Verify that candidate with the installed backend in simulation before replacing the live public directory. Keep the prior directory as the rollback copy. The relay process and managed data do not need to restart for this UI-only update. Reload the browser, verify served digests, and record the UI and backend revisions separately.
