# Projector details controls

Status: brief and first slice, November 13, 2026. Dave chose Projector details as the place where the reviewed control-canvas layout opens.

## Problem

Dave liked the control layout reviewed as a design canvas: a large lens pad with a clear Stop, picture thumbnails for test patterns, visible heat warnings and a session timer. Those controls do not need to stay on screen. The default Controls view must keep its compact A to D cards, and the extra controls must appear only when an operator deliberately opens a projector.

## Outcome

Details for any projector opens one control surface:

1. **Lens**: larger shift pad, focus and zoom with minus and plus signs, per-axis step size and a full-width Stop lens button. The commands, guards, arrow-key arming and presets stay as they are in the lens workspace.
2. **Test patterns**: every pattern the model reports, shown as a picture tile with its name, plus Clear pattern. The current pattern is marked. Favorites from Preferences come first.
3. **Heat**: this projector's air reading, rated limit and level, or an explicit "No reading" when the relay does not supply thermal data.
4. **Session timer**: a browser stopwatch with Start, Pause and a two-tap Reset. It is shared by every projector's details and kept in this browser.

Heat warnings also appear without opening anything, but only when they matter: a card chip and a header pill show when any projector reports Watch or Hot. Choosing the pill opens Thermal watch.

## Flow

Controls → Details on a card → control surface for that lane → lane buttons or Close details. The card itself is unchanged except for the conditional heat chip.

## Smallest useful slice

The four panels above in the existing details dialog, the conditional heat chip and pill, and pattern thumbnails in the full pattern list under More.

## Exclusions

- No new projector commands, no change to command guards, confirmation, Show Lock or target binding.
- No lens memory slots. Rig lens presets remain the stored-position feature.
- No projector-on or break countdown timers. The relay does not report power-on time.
- No change to the default card layout, group actions or the All Projectors tab.
- No backend change. Thermal readings remain optional relay data.

## Data and interface effects

- New browser key `projctl.sessionTimer.v1` holds `{version, running, startedAt, elapsedMs}`. Invalid or unavailable storage falls back to a session-only timer. No existing key changes.
- Pattern commands use the existing `pattern` command with the same disabled conditions as the full pattern list.
- New public files: `details-controls.js`, `details-controls.css`, `pattern-thumbs.js`, `heat-notice.js` and `session-timer.js`. They join the deployment overlay list in [the operator console](operator-console.md).

## Risks

- The details dialog grows wider on large screens; short and narrow screens keep a single scrolling column inside the dialog.
- Thumbnails are drawn from pattern names. An unrecognized name gets a neutral frame rather than a guessed picture.
- Thermal data exists only on relays that sample it. The simulator does not, so acceptance injects readings in the browser test.

## Acceptance

- Details shows the four panels for an assigned projector; an unassigned lane shows that controls are unavailable.
- A pattern tile sends the pattern command and marks the reported pattern; Clear pattern verifies as on the card. Tiles are disabled under Show Lock, when offline and while the lens moves.
- Stop lens is visible and at least 48 px tall when the driver supports Stop.
- With a Watch or Hot reading, the card chip and header pill appear; with OK, missing or stale readings they do not. The pill opens Thermal watch.
- The session timer starts, pauses, survives a reload, and resets only after a second tap within three seconds.
- No page scroll at 1440×900, 1024×768, 681×800, 390×844 and 844×390, both themes; the dialog body may scroll inside itself on short screens.
