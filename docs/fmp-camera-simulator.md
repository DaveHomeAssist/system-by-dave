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
| Bowl | 28 lower / 22 upper rows; 0.9 m run | Demo | P096 informs unequal topology only; pitch, row counts and all elevations unmeasured |
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

Layouts follow the viewport: phone below 720 px (one section at a time from the bottom rail),
tablet below 1100 px, desktop, and ultrawide from 1800 px with the settings panel docked. A phone
in Safari has about 613 pt of page height, so the phone Operate tab spends it on the picture and
the joystick: the bar holds the two accuracy flags alone (the breadcrumb already names the page,
and Help, the theme toggle and the monitor guides sit on the Settings tab), the monitor has no
head and a one-line readout (pan, tilt, zoom, state), and the joystick keeps its 150 px pad
without keyboard hints. iOS Safari draws the same CSS pixels about a tenth wider than desktop
Chromium, so every phone row keeps that much slack, the breadcrumb's current page shortens with
an ellipsis before any link does, and iOS text inflation is disabled. The browser probe measures
the phone Operate tab at 390 × 844 and 390 × 613 with widened text: the whole joystick pad and
the zoom buttons must sit above the bottom rail, and the Settings tab must expose the help, theme
and guide controls.

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
- `fmp-camera-simulator.venue` v6 (terrain, versioned structures and bowl plus per-property methods/source identifiers and separate mount-orientation/heading evidence),
- `fmp-camera-simulator.camera` v1 (published figures, operating limits, uncalibrated behaviour), and
- `fmp-camera-simulator.session` v2 (show package, speeds, pose, presets, performer, exercise settings and results).

The file's `app` field names the build that wrote it, for example
`FMP Camera Simulator 1.6.0 (build 1a2b3c4d)`; imports ignore it. Builds before 1.6.0 always
wrote `FMP Camera Simulator v1`.

Version-1 venue imports migrate to v6 with `reference.geometryRevision: "legacy-v1"`; all existing dimensions, heading, orientation and presets remain unchanged. New profiles use `photo-review-2026-09`. Venue settings offer a before/after preview and explicit Apply/Cancel for the two provisional stage profiles. Applying updates only stage width/depth and mount orientation, retaining camera coordinates and stored presets. Current tilt can clamp to changed mount limits. Versions 1 and 2 keep their numeric settings and copy the former combined mount evidence into the new independent heading record, without inventing photo evidence. Older simulator versions reject newly exported venue v6 files, preventing silent loss of structures and bowl configuration. Version-3 records retain their independent heading evidence.

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
npm run verify:camera-sim-release -- --base origin/main   # release log, version stamp, new-entry rule
npm run dev:camera-sim            # local dev server
```

The build is deterministic; CI rebuilds and fails if `camera-sim/` differs from the source
(`.github/workflows/camera-sim.yml` on pull requests, `deploy-pages.yml` on main).

### Releases and the version stamp

`apps/fmp-camera-sim/CHANGELOG.md` is the simulator's release log, newest entry first. Its top
entry is the running version. `scripts/camera_sim_release.mjs` reads it and adds an 8-character
fingerprint of the shipped source (the app's `src/` without tests, `index.html`, `public/`, the
Vite config and the offline builder). The build embeds the pair as `<version>+<build>` in a
`fmp-camera-sim-version` meta tag on the page and in the offline file, shows it at the foot of
Help, and writes it into exported projects' `app` field. To tell whether an offline copy is
current, compare its Help line with the live page's.

Any change that alters `camera-sim/` needs a new entry above the last one: a minor version for a
feature or a new saved-file format, a patch version for a fix or polish. The pull-request
workflow runs `npm run verify:camera-sim-release -- --base <base commit>`, which fails when
`camera-sim/` changed but the log's top version is not newer than the base's. It also checks the
log's format and that both built pages carry the current stamp; the Pages deploy repeats those
two checks.

The stamp names a source fingerprint rather than a git commit. The build is committed with its
source, so it cannot contain the hash of the commit it lands in, and CI's rebuild-and-compare
check would reject a build that did. Each log entry names its pull request and merge commit
instead.

The page's social card (`og:image`, `camera-sim/og.png`, 1200 × 630) is a real frame from the
simulator: `node scripts/make_camera_sim_og.mjs` serves the committed build, drives the virtual
P240 to a repeatable pose with the app's keyboard controls, captures the monitor and composes
the title band with the site's DM Sans into `apps/fmp-camera-sim/public/og.png`. Regenerate it
after venue or rendering changes, then rebuild so the published copy follows.

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

1. Configurable pavilion structures, obstructions, FOH and physical LED walls are implemented in Phase 2B.
2. Phase 2C adds terrain records, irregular lawn geometry and the Lawn reference view.
3. The sectional bowl and pitch inspector are implemented in Phase 2A; their dimensions and
   initial 9.46°/25.02° slopes remain unverified. Per-property evidence is retained throughout.
4. Add feed routing, bounded delay and portable offline media handling to the independent physical displays.
5. Add measured camera calibration where evidence exists, occlusion-aware exercises and shot feedback.
6. Finish lighting, materials and crowd detail, then measure performance on physical devices.

The private reference photographs remain outside the deployed application. Camera height,
actual bowl pitch, lawn contours, display dimensions and pan-zero require field evidence.


### Evidence editing and published hardware

Venue v6 accepts optional provenance on each dimension, distance basis, mount orientation and
pan-zero heading: `method` plus up to 16 `sourceIds` of at most 160 characters each. Source notes
retain the observation/measurement description; source identifiers refer to the operator's
reference log. Unknown methods, malformed references and missing v3/v4/v5/v6 heading records reject the
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


## Phase 2A: sectional bowl and pitch

Venue v4 contains an independently versioned `bowl` v1 record. Missing records in legacy
imports receive the documented demo bowl; saved dimensions, camera settings and presets are
not changed. Sectors store evidence-wrapped level, arc bounds, row count, row run, aisle gap,
seat pitch and piecewise row/elevation control points. The cross aisle stores insertion row,
width, elevation step and railing height. Invalid records report their exact field path and
are rejected before replacing the active project.

P096 supplies unequal-sector and box-band topology, not metric measurements. All starting
angles, row counts, runs, elevations and furniture dimensions remain Demo. The starting
lower/upper runs and rises reproduce 28 × 0.15 m and 22 × 0.42 m over 0.9 m rows: approximately
9.46° and 25.02°, expressly unverified. Bowl evidence also keeps Approximate venue visible.

`solveBowl` is the shared metre-space source for treads, instanced teal seats and the Venue
settings side-elevation inspector. Changing row run or elevation points updates both geometry
and the displayed run/rise/grade/angle. Cross-aisle width and elevation are reported separately
from seating slope. Filled fascia and landing geometry join independently configured sectors
to the upper level; these are provisional architectural assumptions. Section labels are
restricted to overview layer 1. The Side elevation overview preset does not move the PTZ.

This increment adds the bowl only. Pavilion shell, obstructions and lawn terrain follow in
separate Phase 2B/2C releases. The subsequent operator request adds physical LED walls and FOH to Phase 2B; media routing and calibration remain later work.


## Phase 2B: pavilion, fixtures, FOH and LED walls

Venue v5 adds `structures` v1 and session v2 adds `showPackage` v1. Older venue/session
files receive defaults without changing existing dimensions, pose or presets. Shell parameters
and fixture enablement, position, size and yaw have independent evidence records. Missing yaw
in early structure records defaults to a provisional zero. Invalid fields reject atomically by path.

| Element | Evidence | Geometry status |
| --- | --- | --- |
| Roof envelope, curved rear bays, primary steel, stage opening and catwalk | P002, P064, P079 silhouettes | Demo dimensions, not surveyed |
| Ceiling fans, rails and display supports | Photo presence and relationships | Demo position and size |
| FOH mix platform | Seating plan locates Mix at the front of section 202 behind the box band | Demo footprint and position; seat clearance follows that footprint |
| Stage Right / Stage Left walls | Operator confirmed the 10 mm flanking walls; P034 and P064/P079 show them | Presence Confirmed; independent Demo width, height, location and rotation |
| D1, D2, D3, D4 lawn delay walls | Operator confirmed delay walls at 8 mm; the count of four and each position come from the house reference inventory | Presence Inferred; independent Demo width, height, location and rotation. Confirm the physical delay-wall count and positions before adding display inventory or media routing |
| LED pixel space | Operator: 1600 × 900 | Confirmed pixel space; canvas versus native resolution unresolved |
| LED pitch | Operator correction: sides 10 mm, delays 8 mm | Confirmed; supersedes earlier 7 mm delay reference |
| Touring PA, legs, truss, backline and optional touring wall | Demo concert package | Replaceable session equipment, not permanent venue geometry |

Pixel space and pitch never imply physical wall dimensions. Rendered colour bars are a demo
pattern, not an active house feed. Physical widths/heights remain configurable in metres.
FOH height is clearance above the highest local seating tread; its deck and consoles face the
stage. Seats leave a clearance around its rotated footprint. Delay supports and rear-floor join
remain provisional until the terrain increment.

`buildStructures` owns separate shell, house-fixture and show groups. Physical meshes are tagged
as occluders and batched by material. The roof remains an independent ray target. Shell cutaway
changes overview layer 2 only: the monitor always sees the physical shell. Fixture labels stay on
overview layer 1. Clearing or replacing a show package changes neither venue records nor PTZ
pose, geometry, dimensions or stored presets. Exercise scoring is unchanged; geometric occlusion
feedback, media inputs, calibration and detailed visual finish are not delivered by this increment.


## Phase 2C: lawn and exterior

Venue v6 adds an independent terrain v1 record. Older files receive Demo defaults while keeping saved dimensions, camera pose and presets. Boundary depth stations define irregular left/right edges; longitudinal and cross-lawn samples shape the height field. Front elevation, concourse width, paths, fence and pole coordinates retain separate evidence wrappers. All defaults remain unmeasured assumptions informed by P093/P095. Site-scale embankment context is not used as lawn rise.

`solveTerrain` supplies the exact triangles and barycentric `surfaceHeightAt` query used by the builder. Its first strip joins the pavilion rear floor to the lawn front, including differing datums. Paths sample the surface; fence posts and poles follow it. Out-of-bound objects are omitted. Distant trees are generic context, not surveyed inventory. The five overview presets never alter PTZ pose.

The terrain editor uses metres and normalized sample positions (0–1). Sample depths must increase; invalid imports retain the current project. Mesh-derived terrain diagnostics and browser tests verify that edits actually change the rendered surface. Grass, concrete circulation and fixtures remain separate from camera mechanics.

Review follow-ups: catwalk and stage opening now remain visible in default overview cutaway, with a restored Catwalk label. LED emissive materials have a separate cache identity from ordinary materials. Wall presence now carries the operator's report as evidence: the two flanking walls are Confirmed, the four delay walls are Inferred (the operator confirmed delay walls exist; their count and positions are unverified), and the new defaults apply only to new sessions and to imports without a structures record — saved fixtures keep their own evidence and are never promoted or disabled. Pixel-space metadata remains independent of physical wall size.

Phase 3 media routing and field calibration remain separate work. Physical wall placement, terrain contours and every exterior dimension remain provisional.
