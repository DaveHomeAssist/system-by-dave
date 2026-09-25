# FMP Camera Simulator changelog

Release history of the simulator at https://housevideo.app/camera-sim/ and its standalone
offline file, newest first. The top entry is the running version: `npm run build:camera-sim`
embeds it, with a fingerprint of the shipped source, in Help, in the page and offline file
(`<meta name="fmp-camera-sim-version">`) and in exported projects.

Every change that alters the published build (`camera-sim/`) adds an entry above the last one;
the simulator's pull-request check fails without it. Headings read
`## <major>.<minor>.<patch> — <YYYY-MM-DD> — <title>` and each entry has at least one `- ` bullet.
Minor versions add features or change a saved-file format; patch versions fix or polish. A
"Saved files" line marks a new export format, which older builds cannot read.

Versions 1.0.0 to 1.5.3 were numbered after the fact from their merged pull requests.

## 1.11.2 — 2026-09-25 — Readable scope line

- The header's scope line ("Framing, zoom, and presets only — not SuperJoy or focus") drops its 0.78 opacity and uses the full muted ink: it measured 3.97:1 on the light surface, and is now 6.7:1.

## 1.11.1 — 2026-09-25 — Wide shot starts tight; Clear results asks first

- "Establish a wide shot" now starts on a tight shot of downstage right (6° field of view on the downstage-right mark) instead of the camera's home pose. On the provisional 113 ft stage, home already framed the whole downstage edge (73% fill, every marker inside), so the exercise completed after its one-second hold with no input. Tests check that the starting shot fails on every stage profile and that the exercise waits for the operator.
- Clear results in Exercises now asks first, as Reset session does: Clear all results or Keep them (focused; Escape also keeps them and leaves the panel open, and the camera still stops), with the count and "cannot be undone". Keeping returns focus to the button; clearing moves it to the Results heading.

## 1.11.0 — 2026-09-25 — Next steps from this device's training record

- Exercises marks the first exercise this session has not passed: Next, or Try again after a miss. Once all three have passed, it suggests the next Shading practice exercise this device has not passed, with a dismiss button that holds for two weeks.
- An unnamed preset shows a name read from the shot: Wide when the whole downstage edge is in frame; otherwise Mid or Tight with the stage mark nearest the middle of the frame (for example "Tight · DSL"), or Off stage with its pan. Rename starts from that name, selected, and Session shows it as the name field's hint. Nothing is stored until the operator keeps it.
- Finished exercises are also recorded in the training record shared with Shading practice (`fmpTraining.v1`, exercise ids and minute timestamps only, on this device), so each tool can suggest the other's next step. Session gains Continue in Shading practice and a Suggestions setting: On, Quiet (the Next marks only) or Off (records nothing and clears the record), with Forget training history. The session and its results are unchanged by any of these.

## 1.10.0 — 2026-09-25 — Links to the other cameras and into exercises

- `?exercise=wide`, `?exercise=follow` or `?exercise=recall` starts that exercise when the page opens, so the FMP guides can link straight to one. The link is used once: the address then drops it (other parameters stay) and a reload continues the session. A value that names no exercise is refused in the status line.
- Session has an Other cameras section: Shading practice for exposure and colour, and the URSA camera rig explorer, for Cameras 1–3. It says Camera 4 is set from its own menus, not the shader panel. The BirdDog P240 model link now opens at the lens.
- Every link is listed in `docs/camera-training-links.md`, and `npm run test:camera-training-links` checks each target against the catalog that owns it.

## 1.9.0 — 2026-09-24 — Controls beside the monitor

- A larger picture on landscape screens. Stacked over the controls, the 16:9 picture was height-bound: an 11-inch iPad in Chrome (1180 × 685) showed it at 232 × 130 in a 779 px wide panel. With the venue view collapsed, landscape screens from 960 px wide and at least 4:3 now put the controls in a column beside the monitor, and the picture takes the width left of them: 558 × 314 on that iPad, 402 × 226 on a 1024 px iPad in Safari (was 248 × 139) and 608 × 342 in a 1366 × 650 laptop browser (was 204 × 115).
- Desktop windows under 900 px tall start with the venue view collapsed, as tablets do. Showing it puts it back beside the monitor, with the controls below.
- Expand monitor (F) now enlarges the picture on desktops: at 1440 × 900 it goes from 602 to 818 px wide, where stacking had left it the same size.
- Beside the monitor, the keyboard hints and speed figures wrap to keep the controls column narrow, the presets' hint shares their heading's line, and the readout drops its copy of the speed levels to stay on one line. Desktop windows up to 800 px tall use the one-row header that landscape tablets already had.

## 1.8.0 — 2026-09-24 — Audit fixes: recovery, short screens, access

- Short screens keep a picture. On an iPad in landscape (1024 × 768) the stacked layout left the monitor 2 px tall, and a 1366 × 650 laptop browser showed a 158 × 89 thumbnail. On desktop and landscape tablets the monitor now keeps at least 45% of the workspace, the controls scroll inside their panel only when needed, and landscape tablets from 960 px use one row of controls and a one-row header.
- A failure while starting or drawing the interface shows a recovery screen instead of a blank page: reload, export the saved session as stored, or set it aside and start fresh.
- A saved session that cannot be restored is kept as a copy and then cleared, so reloads stop warning; at most three copies are kept. Session shows when a restored session was last saved.
- Another tab clearing the saved session, or saving an identical one, no longer raises a conflict, and loading the other tab's copy after it has gone keeps this session instead of a blank one.
- The page loads DM Sans, the FMP suite's face, from its own copy (inlined in the offline file), so every device measures the same text. The breadcrumb no longer draws a stray vertical scrollbar where scrollbars always show.
- Accessibility: framing marks show pass and fail by shape (solid or dashed) as well as colour; the dark-theme zoom knob has 7:1 contrast; the pointer-only zoom rocker is hidden from assistive technology and has a 44 px target; the joystick's description reads the current pan and tilt; the venue view names its keyboard route; the accuracy flag says what its count means; the preset menu takes keyboard focus; orbit inertia stops with reduced motion; a dark visit starts with a dark browser bar.
- Guidance: a quick tap on T or W says they are held; the first Home of a visit says Home is not the FMP safe-wide shot; a refused import names its first problem in the status line.
- If the venue view's own graphics context cannot start, its panel says so while the monitor carries on.

## 1.7.2 — 2026-09-24 — Defer venue WebGL until shown

- The venue overview no longer creates a second `WebGLRenderer` at startup. The monitor still starts immediately; the overview GPU context is created on the first frame where the venue panel is visible (desktop shown, or phone Venue tab). Collapsed venue / Operate-only phone sessions keep one WebGL context.

## 1.7.1 — 2026-09-24 — Control-border contrast and store split

- Added `--control-border*` theme tokens (≥3:1 vs adjacent surfaces for WCAG 1.4.11) and wired them to buttons, flags, fields, joystick, zoom track, side panel, dimension editors and Help.
- Extracted venue schema migrators (`src/domain/migrations/`) and split SimulatorStore into focused controllers under `src/app/store/` (persistence, operating, settings, exercises, clock) behind the same public façade.
- Left edge-header/onboarding work and the Three.js venue renderer alone (other remediation lanes). Offline build still ships one JS module: multi-chunk splitting waits on an offline inliner that can hash-pin dynamic imports.

## 1.7.0 — 2026-09-24 — First-run tip and Operate-pad preset actions

- First visit opens a three-step quick-start tip (move, zoom, store). Skip or finish writes `fmpCameraSim.onboarding.v1` so it stays dismissed.
- Operate preset pad: right-click or long-press a filled slot to rename or clear it (uses the existing session rename/delete APIs).
- Header scope line: framing, zoom, and presets only — not SuperJoy or focus.
- Page referrer meta set to `strict-origin-when-cross-origin` for parity with `/fmp/`.
- Documented how to add HSTS, CSP (with `frame-ancestors`), and related headers at the hosting edge (GitHub Pages cannot emit them).

## 1.6.0 — 2026-09-23 — Release log and version stamp

- Added this release log. Each build carries its version and a source fingerprint: Help shows them, the page and the offline file carry them in a `fmp-camera-sim-version` meta tag, and exported projects record them in `app`, which previously always read "FMP Camera Simulator v1".
- A pull request that changes the published build without a new entry here now fails its checks.

## 1.5.3 — 2026-09-23 — Social card

- The page has its own 1200 × 630 Open Graph card: a real frame from the simulator with a title band, regenerated by `scripts/make_camera_sim_og.mjs`.
- PR #136, merge `9a6397f`.

## 1.5.2 — 2026-09-23 — Phone Operate tab fits a Safari screen

- On phones the bar shows only the accuracy flags, the monitor drops its head and uses a one-line readout, and the joystick loses its keyboard hints, so the picture and the whole joystick fit in Safari's roughly 613 pt page.
- Help, the theme toggle and the monitor guides moved to the phone Settings tab.
- PR #135, merge `79f3e8d`.

## 1.5.1 — 2026-09-23 — LED wall evidence and phone header

- The two flanking LED walls are recorded as confirmed present and the four lawn delay walls as inferred, from the operator's report. Sizes and positions stay demo values.
- The phone header keeps its two rows when iOS draws text wider, the breadcrumb shortens instead of clipping, and iOS text inflation is off.
- PR #134, merge `1e4a2f0`.

## 1.5.0 — 2026-09-23 — Lawn and exterior

- Added editable provisional lawn terrain joined to the pavilion, surface-following paths, fence and poles, and a Lawn overview view.
- The catwalk and stage opening stay visible in the overview cutaway, and the LED walls no longer share lit materials with other fixtures.
- Saved files: venue v6.
- PR #132, merge `6a8a8ca`. PR #133 then linked the FMP hub and Catwalk PTZ guide to the simulator; it changed FMP pages only.

## 1.4.0 — 2026-09-23 — Pavilion, FOH and LED walls

- Added the pavilion roof, rear facade, primary steel and catwalk, house fixtures, the FOH mix platform, six house LED walls and a replaceable touring show package. The overview cutaway leaves the camera's obstructions in place.
- LED pixel space (1600 × 900) and pitch (10 mm sides, 8 mm delays) are kept separate from the unmeasured physical wall sizes.
- Saved files: venue v5, session v2.
- PR #129, merge `eb7088b`.

## 1.3.0 — 2026-09-23 — Sectional bowl and pitch inspector

- Replaced the seating strips with sectors of individual teal seats, concrete treads, aisles and a box band, and added a side-elevation pitch inspector driven by the same solver as the scene.
- The starting slopes (9.46° lower level, 25.02° upper level) remain unverified.
- Saved files: venue v4.
- PR #128, merge `d135c1e`.

## 1.2.0 — 2026-09-23 — Evidence for each dimension

- Venue dimensions, the distance basis, mount orientation and pan-zero heading each record how they are known and their sources. The photographed mount orientation no longer implies a verified heading.
- Camera settings list the published P240 body, mass, sensor, aperture and power figures without changing the simulated optics.
- Saved files: venue v3.
- PR #121, merge `74c46c7`.

## 1.1.0 — 2026-09-23 — Stage profiles and inverted mount

- New sessions use a provisional 113 × 61 ft stage, with 113 × 75 ft selectable behind a preview with Apply and Cancel. Existing sessions keep their geometry and presets.
- The camera hangs inverted, as photographed, and is drawn at physical scale.
- Saved files: venue v2.
- PR #119, merge `2070857`.

## 1.0.0 — 2026-09-23 — First release

- A virtual BirdDog P240 at the FMP catwalk position: live 16:9 monitor, orbiting venue view with the viewing cone, and joystick, zoom, speed, Home and preset controls by keyboard, mouse and touch.
- A 240 Hz PTZ simulation independent of the frame rate, with published travel limits, eased preset recall that manual input interrupts, and stops on release, focus loss or a hidden page.
- Editable, evidence-tagged venue geometry; three guided exercises; versioned export and import; autosave; a standalone offline file.
- Saved files: venue v1, session v1, camera v1, project v1.
- PR #116, merge `d800c2c`.
