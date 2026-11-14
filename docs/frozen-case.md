# Frozen case: a recorded and monitored test case

**Date:** November 14, 2026
**Status:** Stages 1 (projection lanes in AV Video) and 2 (lens and throw in Throwline) are built and run on pull requests. Later stages wait on the decisions below.

## Brief

Dave asked on November 13, 2026: "methodically build out the frozen situation
in the avbydave app as a recorded and monitored test case".

This is how the session read that request. Dave confirmed the reading on
November 14, 2026 ("FC-D1 A, go ahead with stage 2"):

- **The Frozen situation** is the projection rig for *Frozen* at Walnut Street
  Theatre: four lanes, A to D, already published as the public reference in
  [`wst/projectors.json`](../wst/projectors.json) and
  [`wst/stage/plot.json`](../wst/stage/plot.json).
- **Built out in the app** means entered into the [AV by Dave console](av-suite-shell.md)
  through its own controls, the way an operator would, one department at a time.
  Nothing is imported or seeded.
- **Recorded** means every step leaves a journal entry, a photograph and, where
  it produces one, an exported file with its hash. The whole session is filmed.
- **Monitored** means the run watches the page while it works, runs again on
  every pull request that touches the console, and can be read back against the
  published site.

A real show finds what synthetic fixtures do not. The first run of stage 1 found
a defect in Signal Flow within fifteen steps (FC-F1 below). Stage 2 found that
Throwline cannot plan a portrait lane as drawn (FC-F5).

## The case

The probe reads its facts from the two reference files at run time. Nothing
about the rig is copied into the script, so a corrected record is a corrected
case. The facts are plan records and operator reports as published on
November 7, 2026. They are not the state of the show.

The case carries no personal names, addresses, device addresses, cue maps or
serial numbers, and adds no venue material to this repository.

## Stage 1: projection lanes in AV Video

`scripts/probe_frozen_case.mjs` runs 22 steps in one disposable browser context:

1. Open the console on an empty Workspace, clear the welcome banner, choose AV
   Video on the Rail. Opening must save nothing.
2. Name the plan and the venue. Video lead stays empty.
3. Add a projection record for each lane: screen, surface, plotted size,
   native raster, projector, lens, position, input and the record's note. Throw
   distance is entered only where the reference has one (lane D, an operator
   estimate). Lane D is entered as `issue` because its record reports the
   lens-shift limit.
4. Add one signal route per lane from the shared playback source. Format,
   connector and input stay empty: the reference records the video path as
   unknown.
5. Read the diagram: it must count five devices and four connections, and draw
   a cable to every lane.
6. Link each projection to its route and trace lane D.
7. Read the planning checks. They must be exactly the unknowns in the
   reference: every route lacks format, connector and input; A, B and C lack a
   throw distance; D carries the reported issue. Eight records, no more.
8. Save, export the plan and the destination list, reload, and read all of it
   back, including the diagram.
9. Look each projector model up in Equipment Lab, first as the rig record
   writes it, then by the catalogue spelling.

## Stage 2: lens and throw in Throwline

Eleven more steps, 23 to 33, in the same browser context. Throwline keeps its
own saved jobs and show board, so the stage also runs alone with `--stage 2`.

1. Open Throwline from the Rail. It must open inside the console as a panel
   without its page chrome.
2. Open the full page and follow its Planner link. Stage 3D offers five preset
   ratio ranges; an exact ratio is typed in the planner.
3. Look for each Frozen projector in the audited catalog, and for each lens on
   record in the older lens list.
4. Plan each lane: the plotted coverage as a free-aspect screen, the ratio from
   the reference, a 16:10 picture. A portrait lane is entered on its side,
   because the ratio is measured across the imager's long side. The planner's
   closest and farthest throw must equal ratio times width to within 0.3 inch.
   Where the reference records a throw (lane D, 38 to 39 ft), the planner must
   call it a good distance at both ends. Each lane is added to the show board
   and saved as a job.
5. Enter one portrait lane again as it is drawn, upright, and record what the
   planner says.
6. Name the show board, export it, and check the export holds the four lanes
   with their ratios and sizes.
7. Reload and read the saved jobs and the show board back.
8. Send the lane with a recorded throw to Stage 3D. The typed ratio must arrive
   as a manual estimate, never as verified.

The ratio comes from the lane record when it writes one (A, C and D). Lane B's
record names ET-DLE080 without a ratio, so the case uses the first lens the
lane names that carries one for the projector's raster: ET-DLE085, the lens on
the plot. That lens identity is disputed in the reference and stays disputed.

## The record

Each run writes one folder:

| File | What it holds |
| --- | --- |
| `journal.jsonl` | One event per line (`system-by-dave.frozen-case.journal.v1`): run started, each step started and finished, each finding, run finished |
| `summary.json` | The same run as one document, with the checks the case expected |
| `steps/NN-name.png` | The page after each step, with its SHA-256 in the journal |
| `exports/` | The saved plan, the exported plan, the destination CSV and the Throwline show, with hashes |
| `film/session.webm` | The session, filmed at the page's own size |

A step is `passed`, `flagged` (it passed and a monitor saw something) or
`failed`. A failed step that does not spoil what follows lets the journey go
on, so one defect does not hide the next. The run exits non-zero when any step
failed. Things worth knowing that are not failures are recorded as findings.

## Monitors

Between steps the run collects page errors, console errors, failed requests,
responses of 400 and above, which saved keys changed, and whether the page
scrolls. A step names the saved keys it may change. Drafts kept for recovery
and the console's device-local layout key may always change. Anything else
flags the step. The Throwline planner is a scrolling page by design, so a
scrolling document is not flagged there.

The run adds one thing to the page: a pointer for the film, because a headless
browser draws none. It takes no part in layout or input.

## Running it

```bash
npm run test:frozen-case
```

Read the published site back:

```bash
FROZEN_CASE_BASE=https://avbydave.com npm run test:frozen-case
```

Run one stage on its own:

```bash
node scripts/probe_frozen_case.mjs --stage 2
```

Film it at operator pace and caption the film (needs ffmpeg and Pillow):

```bash
node scripts/probe_frozen_case.mjs /tmp/frozen-run --film
```

```bash
python3 scripts/frozen_case_film.py /tmp/frozen-run /tmp/frozen-case.mp4
```

The record goes to `FROZEN_CASE_OUT`, or a `frozen-case` folder in the temp
directory. The [Verify AV Video workflow](../.github/workflows/av-video.yml)
runs the case on pull requests that touch the console, Throwline, the probe or
the reference, and keeps the record as a workflow artifact for 30 days. Films are
not committed.

## Findings

| ID | State | Finding |
| --- | --- | --- |
| FC-F1 | Fixed November 14, 2026 | Signal Flow did not draw the newest cable. After a route's source and destination were typed in Route details, the diagram counted the connection and left it undrawn until the page was reloaded. Four routes showed "4 connections" and three cables. Naming a source or destination renames a cable's ports without resizing the device, and the diagram was never told to read the ports again. `apps/av-video/src/FlowCanvas.tsx` now asks for that whenever a device's ports change. Step 5 guards it. |
| FC-F2 | Open | Equipment Lab finds nothing for "Panasonic PT-DW830U" or "Barco UDM 4K22", the spellings the rig record uses. "PT-DW830" and "UDM-4K22" work. The search needs the catalogue's exact spelling. See FC-D4. |
| FC-F3 | Open | Throwline's audited catalog holds none of the Frozen projectors. Every lane is planned from a ratio typed by hand and reads as a manual estimate. See FC-D8. |
| FC-F4 | Open | Throwline's older lens list shows ET-DLE170 at 1.710–2.410:1, the WUXGA figure, and labels it so. The lane record gives 1.80–2.54:1 for the WXGA PT-DW830. Picking the lens by name plans a throw about 5% short. See FC-D8. |
| FC-F5 | Open | Throwline has no portrait mounting. Entered as plotted (12 ft 5 in wide by 19 ft 11 in high), lane D reads 57 ft 4 in to 80 ft 11 in and the recorded 38 to 39 ft reads "too close". It reads 35 ft 10 in to 50 ft 7 in, and the recorded throw reads "good distance", only when the picture is entered on its side. Two of the four lanes are portrait. See FC-D6. |
| FC-F6 | Open | Throwline marks lane C "Fix before you hang it: no projector and lens in the catalog can reach the placement zone you entered", and the show board shows STOP. No zone was entered. The solver's default 20 ft to 30 ft zone raises it; moving the zone clears it. See FC-D7. |
| FC-R1 | Open, a question about the records | At lane D's recorded 38 to 39 ft, the lenses on record would throw 38 ft 11 in to 49 ft 10 in for lane B (plotted 29 ft 5 in) and 40 ft 10 in to 54 ft 11 in for lane C (plotted 32 ft 5 in). All four are plotted in the same recess. Either B and C sit closer, or their rasters overfill the plotted coverage. The reference has no throw for A, B or C. See FC-D9. |

What the case had to work around. These are gaps to weigh, not defects:

- A projection record has no orientation field. Portrait is written into
  Surface and Aspect ratio.
- Nothing records where a fact comes from: plot, operator estimate or
  measurement. It all goes in the notes.
- A disputed lens (lane B: ET-DLE080 on the rig record, 085 on the plot) and a
  candidate lens (lane D) can only be notes.
- Projector and lens are free text. Nothing links a record to its Equipment Lab
  entry or to Throwline.
- In the Routing view the Patch panel says "or create a route here" and offers
  no control. The route is added from Diagram, Devices.
- Nothing carries a lane from AV Video into Throwline or back. Size, lens and
  throw are typed again, and a throw worked out in Throwline does not reach the
  projection record.
- The console's Throwline panel shows Stage 3D, which has no typed ratio. The
  planner that has one is two links away: Open full, then Planner.

## Stages ahead

Each stage extends the same journey and this document, and records its own
findings. Order is decision FC-D10.

| Stage | Department | The case would enter |
| --- | --- | --- |
| 3 | Equipment Lab | The service procedures as journeys: lamp unit and air filter on the PT-DW830, step by step through the model's states |
| 4 | Infrastructure | Power and control paths, as far as the public reference records them |
| 5 | Show Ops, The Shop, Front Office | The published tech schedule, gear preparation and the job |
| 6 | Show Control | Cue and preset records, once a public-safe source exists |

## Decisions for Dave

- **FC-D2. Where is it monitored?** A, recommended and current: on pull
  requests that touch the console, plus a read-back against avbydave.com after
  each release. B: also gate the Pages deployment on it. C: also run it nightly
  against the live site. C is a scheduled job and needs your approval.
- **FC-D10. Which stage after Throwline?** A, recommended: stage 3, the
  PT-DW830 lamp and filter procedures in Equipment Lab. B: stage 4,
  infrastructure. C: another order.
- **FC-D4. How should Equipment Lab find a model by the name on a rig record?**
  A, recommended: the search ignores case, spaces and hyphens and matches
  catalogue aliases such as regional variants, with aliases owned by the shared
  catalog. B: normalise in this host only. C: leave it.
- **FC-D5. Should the case be visible in the product?** A, recommended: no. It
  stays a test. B: offer "Load the Frozen case" as a demo plan in the console.
  B is a new public surface; the November 6 authorization covered the WST site.

- **FC-D6. Portrait lanes in Throwline (FC-F5).** A, recommended: add a
  portrait mounting choice to the planner and carry it into Stage 3D, so a lane
  is entered as drawn. It needs its own brief. B: keep the planner as it is and
  say in it that a portrait picture is entered on its side. C: leave it.
- **FC-D7. The solver's default zone (FC-F6).** A, recommended: raise "fix
  before you hang it" only once the operator has set a placement zone; until
  then the solver shows its result without marking the output. B: keep the
  check and reword it. C: leave it.
- **FC-D8. Frozen models in Throwline's audited catalog (FC-F3, FC-F4).** A,
  recommended: add the PT-DW830, PT-RZ970 and UDM-4K22 with the lenses on
  record as audited rows from maker data, under the catalog contract. It is a
  research task, and Barco's site is not reachable from a cloud session. B:
  leave them as typed ratios.
- **FC-D9. Throws for lanes A, B and C (FC-R1).** A, recommended: measure or
  estimate each and add `throwDistance` to those lanes in
  `wst/projectors.json`. The case then checks each against its lens, as it does
  lane D. B: leave them unknown.

Decisions taken:

- **FC-D1**, November 14, 2026: A. Dave: "FC-D1 A, go ahead with stage 2".
- **FC-D3**, which stage next, November 14, 2026: A, stage 2, Throwline, by
  the same message.

## Boundaries

- No hardware is addressed. No relay, projector, playback or control endpoint
  is contacted.
- Chromium only, headless, on SwiftShader. No physical phone, tablet, touch or
  operator acceptance is claimed.
- The run uses a disposable browser context and never touches a real saved plan.
- A passing run shows the console can hold and report this case. It does not
  show that the rig is ready.
- Stage 2 checks Throwline's arithmetic against the ratios and sizes in the
  reference. It does not check those ratios against maker data, and it measures
  nothing in the room.
