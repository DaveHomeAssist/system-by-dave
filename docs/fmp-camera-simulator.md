# FMP Camera Simulator

A browser trainer that places a virtual BirdDog P240 at the FMP catwalk position (Camera 4).
Operating the on-screen SuperJoy-style controls moves the camera and lens, and the monitor shows
the virtual stage as that camera sees it. It is for practising framing, movement and presets. It
does not connect to a real camera or controller.

- Route: `/camera-sim/` on housevideo.app (noindex). The systembydave.com copy becomes a redirect
  stub at cutover, like the other FMP siblings (`docs/domain-sites.md`).
- Source: `apps/fmp-camera-sim/` (React, TypeScript, Three.js, Vite). Built output is committed in
  `camera-sim/`: `index.html`, hashed `assets/`, `theme-boot.js` and the standalone
  `fmp-camera-simulator-offline.html`.
- Why not `fmp/`: `fmp/` is a managed export from `DaveHomeAssist/fmp-suite` with an exact file
  list (`docs/fmp-public-release.md`). The simulator lives beside `/shader/` and `/switcher/` and
  links into the suite. The Catwalk PTZ guide, the 3D SuperJoy guide and the P240 model stay
  unchanged.

## Architecture

| Layer | Files | Responsibility |
| --- | --- | --- |
| Domain records | `src/domain/venue.ts`, `camera.ts`, `session.ts`, `project.ts` | Versioned venue, camera and session records; validation with field paths; lens model and speed tables |
| PTZ simulation | `src/sim/ptz.ts` | Owns camera state. Fixed 240 Hz step on its own clock, independent of rendering |
| Framing | `src/sim/framing.ts` | Stage coordinates, camera frame and projection shared by the evaluator, overlay and renderer |
| Performer | `src/sim/performer.ts` | Mark or repeatable path as a pure function of simulation time |
| Exercises | `src/exercises/*.ts` | Wide shot, follow and save/recall evaluators, sampled 30 times per simulated second |
| Store | `src/app/store.ts` | Ties simulation, performer, exercises, presets and autosave together; React subscribes to discrete state |
| Input adapter | `src/input/*.ts` | Keyboard, joystick, zoom rocker and hold buttons become one commanded deflection |
| Renderer | `src/render/*.ts` | One Three.js scene drawn by two renderers: the monitor (the simulated P240) and the orbiting venue view |
| Interface | `src/ui/*.tsx` | Panels, controls, settings, exercises, session import/export |

The simulation owns camera state and Three.js only reads it. Inputs are applied at their event
timestamps, so identical input over identical elapsed time produces identical motion at any
render rate; `src/sim/ptz.test.ts` proves exact equality at 24, 30, 60, 144 Hz and jittered frames.

## Coordinates

The stage origin is the centre of the downstage edge (DSE) at deck height. Stage records use
`right` (toward stage right, the performer's right), `upstage` (negative is in the house) and
`height` (above the deck), all in metres. The interface defaults to feet. From the catwalk,
stage right is house left and appears on the left of the Camera 4 picture.

## Venue evidence (defaults)

| Dimension | Default | Evidence | Source note |
| --- | --- | --- | --- |
| Camera to downstage edge | 110 ft | Estimated | Reported as 100–120 ft; basis not established |
| Distance basis | Horizontal | Demo value | Line of sight is supported; the camera height is removed to place the camera |
| Stage depth | 61 ft | Estimated | Revised rotated Stage & Pit plan interpretation; boundaries remain provisional. The 75 ft video-office inference is an explicit alternative |
| Stage width | 113 ft | Estimated | Revised rotated Stage & Pit plan interpretation; performance deck boundaries are not certified |
| Camera height above stage | 35 ft | Demo value | Unknown until measured |
| Camera lateral offset | 0 ft | Demo value | Centred placement is an assumption |
| Mount | Inverted, pan 0° on centreline | Mixed evidence | P100 shows the installed camera hanging inverted. Heading, support dimensions and firmware flip settings remain unknown; the orientation is photo-confirmed, while heading evidence stays Demo |
| Deck height, pit depth | 5 ft, 12 ft | Demo value | Drawing only; the pit and barricade change per show |

The cable route (catwalk to ceiling to video office, SDI to ATEM Input 4) is reference text and is
never used as optical distance. The seating bowl follows public seating guides: 100-level sections
100–104 and 200-level sections 200–204, with the pit in front of 101–103. The bowl, stage house,
backline and pit rail are schematic, not venue CAD.

The **Approximate venue** flag stays visible until every critical item (distance, basis, height,
lateral offset, width, depth, mount orientation and pan-zero heading) is measured or confirmed. Invalid geometry is rejected
with the offending field named, and the last valid venue stays in use.

## Camera model

Published P240 figures ([BirdDog P240 technical specifications](https://birddog.tv/p240-techspecs/), checked 2026-09-23):
pan ±175°, tilt +90° to −30°, manual speed 0.05–100°/s pan and 0.05–50°/s tilt (zoom adaptive),
preset speed up to 150°/s, 4.4–88.4 mm lens, horizontal field of view 70.2° to 4.1°, 128 presets.

Uncalibrated behaviour, editable under Camera and flagged **Uncalibrated camera** everywhere:

- Lens position maps to a field of view that interpolates geometrically between the published
  wide and tele figures, exact at both ends. Tele Convert is modelled as a fixed 2× crop (unverified).
- Speed levels 1–8 are the trainer's teaching scale (as in the 3D SuperJoy guide), geometric from
  level 1 to the published maximum at level 8.
- Deflection passes a deadband and a power response curve; acceleration and stopping times shape
  the feel; zoom-adaptive sensitivity scales pan/tilt speed with frame width.
- Presets store camera identity, pan, tilt and lens. Recall eases toward the pose
  (smoothstep by default), with a minimum duration. The preset speed level sets pan/tilt travel,
  and zoom runs at full speed. Manual input interrupts a recall at once.
- Limits are hard stops; an inverted mount mirrors the tilt travel.

## Operating

| Action | Keyboard | Pointer / touch |
| --- | --- | --- |
| Pan / tilt | Arrows or WASD (Shift full, Alt fine) | Joystick |
| Zoom | E or + (tele), Q or − (wide) | T/W hold buttons, zoom rocker |
| Recall preset | 1–9 | Preset keys |
| Store preset | Shift + 1–9 (twice to replace) | Store, then a preset key |
| Home | H | Home |
| Stop | Space or Esc | Stop |
| Speeds | `[` `]` pan/tilt, Shift+`[` `]` zoom, `,` `.` preset | − / + |
| Expand monitor | F | Expand monitor |

Releasing a control, losing window focus or a cancelled touch stops commanded motion. A hidden
page halts all motion at once and stops the simulation clock. HOME is the camera function (pan 0°,
tilt 0°, full wide), not the FMP safe-wide show preset.

## Exercises

Thresholds are training settings in the Exercises panel, not professional standards.

| Exercise | Completion |
| --- | --- |
| Establish a wide shot | Starts from home. Both DSE corners and head height (2 m) above USR, USC and USL inside the safe area (90%), downstage edge at least 55% of frame width, held still for 1 s |
| Follow a performer | One loop of the performer's path after a countdown. Reports time on target (chest inside the target box at 25–90% of frame height), mean and RMS framing error and time out of frame; passes at 70% on target |
| Save and recall two shots | Two distinct shots in two slots, move away, then recall both within 0.1° pan/tilt and 0.005 lens travel. Interrupted recalls earn no credit |

## Persistence

The session autosaves to browser storage under `fmpCameraSim.v1` (the `fmp` prefix carries it
through the housevideo.app saved-data transfer). Export/import uses one JSON file:

- `fmp-camera-simulator.project` v1, containing
- `fmp-camera-simulator.venue` v3 (per-property methods/source identifiers and separate mount-orientation/heading evidence),
- `fmp-camera-simulator.camera` v1 (published figures, operating limits, uncalibrated behaviour), and
- `fmp-camera-simulator.session` v1 (speeds, pose, presets, performer, exercise settings and results).

Version-1 venue imports migrate to v3 with `reference.geometryRevision: "legacy-v1"`; all existing dimensions, heading, orientation and presets remain unchanged. New profiles use `photo-review-2026-09`. Venue settings offer a before/after preview and explicit Apply/Cancel for the two provisional stage profiles. Applying updates only stage width/depth and mount orientation, retaining camera coordinates and stored presets. Current tilt can clamp to changed mount limits. Versions 1 and 2 keep their numeric settings and copy the former combined mount evidence into the new independent heading record, without inventing photo evidence. Old simulator versions cannot read newly exported venue v3 files.

The overview camera model uses physical scale. Its label identifies the small camera; monitor output never contains the overview model. Support geometry is schematic. Upright operator video does not claim the real camera has E-Flip enabled.

Imports are validated completely before anything changes; unsupported versions, invalid
dimensions, malformed presets and foreign camera identities are rejected with field paths, and the
open session is kept. An unreadable saved session is kept under `fmpCameraSim.v1.unreadable`.
If storage fails, the session keeps working and a banner offers JSON export.

## Failure behaviour

- No WebGL: the monitor and venue view explain the failure instead of drawing; controls and
  readouts keep working. A lost graphics context stops motion and says the picture is paused.
- Slow devices lose venue-view detail first (lower resolution, then fewer frames) before the
  monitor, and the simulation speed never depends on frame rate.
- The standalone offline file inlines everything behind a hash-locked CSP and runs from disk with
  networking off. Its saved data is separate from the hosted page.

## Build and verify

```bash
npm run typecheck:camera-sim
npm run test:camera-sim
npm run build:camera-sim          # Vite build + scripts/build_camera_sim_offline.mjs
npm run test:camera-sim-browser   # Playwright acceptance probe (CHROME_CHANNEL=chrome to use Chrome)
npm run dev:camera-sim            # local dev server
```

The build is deterministic; CI rebuilds and fails if `camera-sim/` differs from the source
(`.github/workflows/camera-sim.yml` on pull requests, `deploy-pages.yml` on main).

## Acceptance evidence

| Gate | Evidence |
| --- | --- |
| One camera state drives the model, cone and monitor | Probe reads back the Three.js monitor camera, P240 head and cone axis; `render/p240Model.test.ts`, `sim/framing.test.ts` |
| Equivalent motion at different render rates | `sim/ptz.test.ts` render-rate test |
| Stop, interruption, limits, focus loss | `sim/ptz.test.ts`; probe keyboard, blur and hidden-page checks |
| Presets within tolerance | `sim/ptz.test.ts`, `exercises/exercises.test.ts`; probe keyboard, mouse and touch recalls |
| Venue dimensions change framing | `sim/framing.test.ts`; probe venue edit and rejection |
| Exercises complete and reset | `exercises/exercises.test.ts`; probe runs all three and resets |
| Keyboard, mouse and tablet touch | Probe, including CDP touch drag and cancel on a 768 px tablet |
| Export/import round trip | `domain/domain.test.ts`; probe export, edit, import, re-export |
| Offline artifact with networking off | Probe opens the file with the context offline |
| Estimates and uncalibrated behaviour stay visible | Header flags and monitor chips in every layout and in expanded view |

## Not in v1

Photorealistic scenery, camera menus, exposure/focus emulation, multiple cameras, a physical
SuperJoy and the optional 3D SuperJoy control surface are later work. Next steps: link the
simulator from the FMP hub and Catwalk PTZ guide in `fmp-suite`; measure the critical venue
dimensions; calibrate speeds, stopping and preset travel against Camera 4; then prototype a local
VISCA-to-WebSocket bridge for the physical SuperJoy.

## Venue realism delivery sequence

The profile foundation follows the merged v1 baseline (`d800c2c`, PR #116). This first increment
covers provisional stage profiles, explicit upgrades, version-1 preservation, inverted mount
orientation and physical model scale. It does not yet supply surveyed venue geometry.

Remaining implementation packages, in order:

1. Extend the venue schema with configurable sectors, terrain, structures and display records.
   Per-property evidence references and separate orientation/heading records are now delivered.
2. Replace schematic bowl strips with individual teal seats, aisles and box bands; add a
   side-elevation pitch inspector. Current 9.46°/25.02° row slopes remain unverified.
3. Add the pavilion shell, major obstructions, irregular lawn terrain and lawn reference view.
4. Add independent flanking displays, optional show wall, feed routing, bounded delay and
   portable offline media handling. Confirm physical screen inventory before adding lawn screens.
5. Add measured camera calibration where evidence exists, occlusion-aware exercises and shot feedback.
6. Finish lighting, materials and crowd detail, then measure performance on physical devices.

The private reference photographs remain outside the deployed application. Camera height,
actual bowl pitch, lawn contours, display dimensions and pan-zero require field evidence.


### Evidence editing and published hardware

Venue v3 accepts optional provenance on each dimension, distance basis, mount orientation and
pan-zero heading: `method` plus up to 16 `sourceIds` of at most 160 characters each. Source notes
retain the observation/measurement description; source identifiers refer to the operator's
reference log. Unknown methods, malformed references and missing v3 heading records reject the
whole import before it replaces the active session. Methods never promote evidence status.
Changing a value in Venue settings resets its evidence to Demo/operator entry and clears source
identifiers; the previous note remains available for reference. A verified operator can then
assign the new evidence and sources. Numeric unit conversions within floating-point tolerance
do not withdraw the claim.

The new default records P100 as evidence of inverted physical mounting only. Lens height,
pan-zero heading, firmware Flip/Mirror and camera behaviour remain independent and unverified.
The explicit photo-profile upgrade preserves existing heading evidence and camera coordinates.

Camera settings display manufacturer body envelope (163 × 199 × 231 mm in published order),
mass (2.395 kg), sensor (1/2.5-inch CMOS, 8.5 MP), aperture (f/2.0–f/3.8), and 12 VDC/PoE+
power reference (22.5 W during simultaneous PTZ). These immutable catalog facts use the existing
BirdDog technical-spec source. They do not change calibrated optics, locate the lens pivot, or
constitute rigging capacity. The camera export schema remains v1.
