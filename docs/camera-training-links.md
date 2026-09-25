# Camera training links

The FMP camera training tools link into each other, and into the managed FMP explorers, by part
id. This page is the contract for those links. `npm run test:camera-training-links`
(`scripts/camera_training_links.test.mjs`) reads each link target from the source that renders
it and fails when a part, demo, scenario or exercise it names no longer exists, or when a link is
missing from this page.

| Tool | Route | Source |
| --- | --- | --- |
| Camera Simulator (Camera 4, BirdDog P240) | `/camera-sim/` | `apps/fmp-camera-sim/` |
| Camera Shading Practice | `/shader/practice.html` | `shader/` |
| Camera control & shading reference | `/shader/` | `shader/index.html` |
| Rig explorer (Cameras 1–3, URSA Broadcast G2) | `/fmp/rig/` | `DaveHomeAssist/fmp-suite`, exported to `fmp/` |
| Shader panel explorer (ATEM Camera Control Panel) | `/fmp/models/ccu4.html` | `fmp-suite`, exported |
| P240 explorer | `/fmp/models/p240.html` | `fmp-suite`, exported |

Wording rule: the shader panel shades Cameras 1–3 only. Camera 4 (the P240) has no SDI input and
is set from its own menus, so no link or label says the shader panel controls it.

## Links into each tool

| Link | Opens | Notes |
| --- | --- | --- |
| `/camera-sim/?exercise=wide`, `/camera-sim/?exercise=follow`, `/camera-sim/?exercise=recall` | That simulator exercise, started once | The parameter is dropped after use; other parameters stay. An unknown value is ignored with a status-line message. |
| `/shader/practice.html?demo=iris` (also `?demo=pedestal`, `?demo=gain`, `?demo=whiteBalance`, and any practice control) | A guided sweep of that control | Existing behaviour (`docs/shader-practice.md`). |
| `/shader/practice.html?scenario=match-cameras` | The match-two-cameras exercise | Any scenario id works. |
| `/fmp/rig/?equipment=rig&part=<id>` | The rig explorer at one part | A valid part decides the equipment; an unknown part is announced. |
| `/fmp/models/ccu4.html#part=<id>` | The shader panel explorer at one control | Read on load and on hash change. |
| `/fmp/models/p240.html#part=<id>` | The P240 explorer at one part | Same mechanism. |

## Links out of the Camera Simulator

In the Session panel (hosted page: root paths; offline file: `https://housevideo.app` plus the
path, through `suiteHref`).

| Link | Label |
| --- | --- |
| `/fmp/ptz/` | Catwalk PTZ operating guide |
| `/fmp/ptz/SuperJoy-G1-Interactive-Guide.html` | 3D SuperJoy G1 guide |
| `/fmp/models/p240.html#part=p240.lens` | BirdDog P240 3D model, opened at the lens |
| `/fmp/` | FMP Video Operations |
| `/shader/practice.html` | Other cameras: exposure and colour, Shading practice |
| `/fmp/rig/?equipment=rig&part=body` | Other cameras: URSA camera rig explorer |

## Links out of Shading Practice

"On the kit" sits under the control list and follows the selected control. Short laptop screens
(900 px wide or more, 700 px tall or less) hide it along with the control notes.

| Control | Shader panel (`/fmp/models/ccu4.html#part=…`) | Kind | Camera (`/fmp/rig/?equipment=rig&part=…`) |
| --- | --- | --- | --- |
| Iris | `ccu4.ch1.joystick` (lean) | Physical | `part=iris-mode` (the lens iris switch must be on A) |
| Pedestal | `ccu4.ch1.joystick` (ring: master black) | Physical | none |
| Gain | `ccu4.ch1.gain` | Physical | `part=body-gain` |
| Gamma | `ccu4.ch1.flare` (hold BLACK/FLARE, turn the black knobs) | Physical | none |
| White balance | `ccu4.ch1.wb` | Physical | `part=body-wb` |
| Saturation | `ccu4.ch1.lcd` (channel LCD soft knob) | LCD menu | none |
| Colour phase | `ccu4.ch1.lcd` (hue soft knob) | LCD menu | none |

Related references also link `/camera-sim/` ("Camera Simulator · Camera 4 framing"), next to
`index.html` and `/fmp/`. The shading reference (`/shader/`) links `/camera-sim/` beside its rig
and back-focus links.

## Suggestions and the training record

Shading practice and the simulator each suggest a next step from one record on the device:
`fmpTraining.v1` in `localStorage`, written and read by `shader/fmp-training.js` (Shading practice
loads it as a script; the simulator bundles it, and its release fingerprint includes it). The key
starts with `fmp`, so the housevideo.app saved-data transfer carries it (`docs/domain-sites.md`).

```json
{
  "schema": "fmp.training.v1",
  "prefs": { "suggestions": "on", "dismissed": { "practice.next.set-black-level": "2026-09-25T06:00Z" } },
  "last": { "tool": "practice", "step": "recover-highlights", "at": "2026-09-25T06:04Z" },
  "practice": { "recover-highlights": { "passed": false, "best": 72, "checks": 3, "at": "2026-09-25T06:04Z" } },
  "sim": { "follow": { "passed": false, "tries": 1, "at": "2026-09-25T05:58Z" } }
}
```

- **What it holds.** Exercise ids from `STEPS` in the module (Shading practice's four scenarios
  and the simulator's three exercises, in teaching order), whether each has passed, the best
  score or the number of tries, and minute timestamps. No names, free text or device identity.
  Anything else in the key is dropped when it is read.
- **Who writes.** Shading practice records each scored check (not during a demonstration); the
  simulator records each finished exercise. Each tool's own saved session and results stay the
  source of truth; the record is never used to rebuild them, and they never rebuild it.
- **Limits.** At most 4 KB. Steps not touched for 90 days are dropped on the next write, a
  dismissal lasts 14 days, and at most 20 are kept.
- **Levels.** On shows everything below. Quiet keeps the marks (the next control, exercise
  badges, Next and Try again) and the preset names, but no Next or Continue links. Off records
  nothing, clears the record and hides all of it; turning it back on starts clean. Forget training history removes the
  record and keeps a Quiet or Off choice. Both tools offer these under Suggestions.
- **Failure.** Blocked or full storage falls back to the page's memory; no tool fails because of
  the record. The simulator's offline file keeps its own record, as it keeps its own session.

| Tool | Suggestion | Built from |
| --- | --- | --- |
| Shading practice | NEXT marks the control the last check's next correction names, until any control moves | The engine's `debrief.next`; not stored |
| Shading practice | PASSED or BEST n on each exercise | `practice` |
| Shading practice | Next: the first exercise not passed, once the open one has passed; then the simulator's | `practice`, `sim`; links `/camera-sim/?exercise=<id>` |
| Shading practice | Continue in the Camera Simulator, once it has been used | `sim`; links `/camera-sim/?exercise=<id>` |
| Shading practice | First visit follows the FMP theme (`fmpTheme`) until the console saves its own | `fmpTheme` |
| Camera Simulator | Next or Try again on the first exercise this session has not passed | The session's own results |
| Camera Simulator | Next: Shading practice, once all three exercises have passed | `practice`; links `/shader/practice.html?scenario=<id>` |
| Camera Simulator | Continue in Shading practice, once it has been used | `practice`; links `/shader/practice.html` |
| Camera Simulator | An unnamed preset shows a name read from the shot (Wide, Mid or Tight with a stage mark, or Off stage) | The venue model; stored only if the operator keeps it in Rename |

`npm run test:camera-training-links` checks that `STEPS` matches both tools' ids and titles and
that every `?scenario=` it can build exists.

## Links out of the FMP pages

These are made in `DaveHomeAssist/fmp-suite` and reach this repository through its exporter
(`fmp/` is managed; do not hand-edit it). The test reads the exported bytes. Links are
root-relative, since the FMP pages and both tools are published together on housevideo.app.

| From | Parts or place | To |
| --- | --- | --- |
| Rig explorer (`practice` in `fmp/rig/fmp-guide-data.js`) | `iris`, `iris-mode`, `push-auto`, `door-iris`, `fiber-camera-controls` | `/shader/practice.html?demo=iris` |
| Rig explorer | `body-gain` | `/shader/practice.html?demo=gain` |
| Rig explorer | `body-wb`, `body-auto-wb` | `/shader/practice.html?demo=whiteBalance` |
| Rig explorer | `nd-filter` | `/shader/#nd` (Shading practice has no ND) |
| Shader panel explorer (`PRACTICE` in `fmp/models/assets/ccu4-0.js`) | Whole device | `/shader/practice.html?scenario=match-cameras` |
| Shader panel explorer | `joystick`, `gain`, `flare`, `wb` on channels 1–3 | `?demo=iris`, `?demo=gain`, `?demo=gamma`, `?demo=whiteBalance` |
| P240 explorer (`fmp/models/assets/p240-0.js`) | Whole device, `p240.lens`, `p240.pan-axis`, `p240.tilt-axis` | `/camera-sim/` |
| Bowl camera guide | Preshow k3 "Match the cameras" | `/shader/practice.html?scenario=match-cameras` |
| FMP hub, Learn tab | `SHADE` | `/shader/practice.html` (root-relative: the hub's absolute-link allowlist refuses new absolute links) |
| FMP hub, Learn tab | `CCU`, "Camera control & shading" | `/shader/` |

Channel 4 of the shader panel has no link: it is labelled 4 PTZ but drives the P240. The LCD
has none either: its soft knobs reach two practice controls (saturation and colour phase), so
no single sweep fits. Shading practice's own "On the kit" list still points at it for both.
