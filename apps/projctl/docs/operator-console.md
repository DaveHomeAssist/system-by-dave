# Projector operator console

## Outcome

The default view exposes shutter, power, test patterns, Clear pattern and Reset to HDMI for each A to D projector. Diagnostics, lens controls, configuration, schedules, references and planning remain available through secondary controls.

Each card keeps the lane, surface, model, current power/shutter/input/pattern and connection freshness visible. Power state uses prominent uppercase text. Warnings and faults use labeled high-contrast banners and matching card borders. Wide desktops show four columns. Medium screens from 681 to 1279 pixels wide and at least 700 pixels tall show a two by two grid. Phones and short medium screens select one lane at a time with persistent A to D navigation. Both themes use the existing design tokens. All Projectors is a permanent tab beside Controls. Its group actions open a target review with Cancel and Confirm; opening or cancelling that review sends no command. Changed targets or safety state require a fresh confirmation. Group power off retains the relay's additional confirmation. Group Clear and HDMI recovery report verified results for each device.

## Command behavior

Shutter actions state the requested position. Power off retains the relay's existing two-step confirmation and ignores a rapid repeat during its first 400 ms. Cooling, offline, stale and show-lock states keep their existing command guards.

Clear pattern sends the model's pattern-off command and checks fresh reported state. Reset to HDMI clears the test pattern, selects the configured HDMI input or the unique HDMI input reported by the device, and checks fresh feedback for both. PJLink-only devices without internal pattern control keep HDMI reset available; only the input is sent and verified, and unsupported pattern controls are disabled. Missing or ambiguous HDMI metadata produces an explicit error. Each projector has independent operation feedback, and concurrent output recovery actions on the same projector are blocked until the current action finishes. Partial failure preserves the successful step and reports the remaining problem.

## Verification

Verify every main action in the simulator, including model-specific pattern codes and named HDMI sources. Exercise command failure, stale feedback, disconnection, show lock and target identity changes. Check desktop, tablet, phone and ultrawide layouts, both themes, keyboard focus and viewport containment. Real projector acceptance requires explicit operator commands and visual confirmation of the projected output.

## Installed relay compatibility

The installed relay has newer polling and thermal sampling than main. Preserve those capabilities while applying the reviewed command-binding module and minimal index/store edits described below. The existing thermal view is retained under Tools and reads optional thermal data when the relay supplies it. It shows missing readings explicitly on relays without that capability.

Deployment records the reviewed source commit, retained backend base and digests of the changed files. Overlay `app.js`, `index.html`, `workspace-bridge.js`, `operator-console.js`, `operator-console.css`, `output-recovery.js`, `thermal-watch.js`, `thermal-watch.css`, `all-projectors.js`, `workspace-navigation.js`, `operator-preferences.js` and `operator-intent.js` onto a copy of the installed public directory. Apply the reviewed backend changes to that candidate. Verify it in simulation before replacing the managed app, retain the prior app as a rollback copy, and restart the relay once. Reload the browser and verify served digests, target-binding capability and saved rig configuration.

## Group control acceptance

Dave requested a permanent All Projectors tab and confirmation before every group command. Opening the tab or a command review, cancelling, or pressing Escape must send no command. The review names the action and target projectors. A changed target list or safety state requires another review. Group power off keeps the relay's short-lived target confirmation; repeated clicks cannot bypass it. Clear and HDMI recovery show a result for each projector, including unsupported or unreachable units.

## Anticipatory controls and reviewed targets

The operator can enable optional next-action hints, remember a lane and view, favorite native patterns by model, and set a preset-name template. Preferences stay in a validated versioned local record, with a reset control and a session fallback when storage is unavailable. Suggestions highlight existing controls and are dismissible. Every device action still requires an intentional button press, and every group action still requires target review.

Browser commands carry opaque target revisions from the relay snapshot. The relay rejects a stale revision or changed group before sending, and rechecks each target during sequential batches. Legacy direct API and cue callers retain their existing behavior. UI and relay must be deployed together for this binding capability.

Acceptance includes target replacement after confirmation, 681px power-state containment, active nonquick patterns, preserved authentication errors, default HDMI mapping, storage denial/malformed data, model-scoped favorites, preference reload/reset, and hints without command dispatch.

The backend overlay consists of `server/command-binding.js` plus the reviewed target-revision checks in `server/index.js` and factory input-map changes in `server/store.js`. Test the retained backend in simulation with `PROJCTL_OPEN=1`, using a temporary rig and ephemeral ports. Live verification reads state and exercises interface navigation and confirmation cancellation.

The Panasonic factory input labels follow the manufacturer PJLink tables, with 31 DVI-D, 32 HDMI, 33 DIGITAL LINK, and 34 SDI on the RZ970. Existing saved input metadata stays intact. [DW830 family manual](https://eu.connect.panasonic.com/sites/default/files/media/document/2014-09/PT-DZ870-PT-DW830-PT-DX100%20Operating%20Instructions.pdf), [RZ970 manual](https://eu.connect.panasonic.com/sites/default/files/media/document/2025-08/rz970_manual_en.pdf).
