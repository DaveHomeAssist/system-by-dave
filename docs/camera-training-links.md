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

## Planned in fmp-suite (PR B)

These go in `DaveHomeAssist/fmp-suite` and reach this repository through its exporter. The test
already checks that their targets exist.

| From | Parts | To |
| --- | --- | --- |
| Rig explorer | `iris`, `iris-mode`, `push-auto`, `door-iris`, `fiber-camera-controls` | `/shader/practice.html?demo=iris` |
| Rig explorer | `body-gain` | `/shader/practice.html?demo=gain` |
| Rig explorer | `body-wb`, `body-auto-wb` | `/shader/practice.html?demo=whiteBalance` |
| Rig explorer | `nd-filter` | `/shader/#nd` (Shading practice has no ND) |
| Shader panel explorer | joystick, gain, flare, wb | the matching `?demo=` |
| Bowl camera guide | preshow k3 "Match the cameras" | `/shader/practice.html?scenario=match-cameras` |
| FMP hub, Learn tab | — | `/shader/practice.html` (root-relative: the hub's absolute-link allowlist refuses new absolute links) |
