# Frozen case: a recorded and monitored test case

**Date:** November 14, 2026
**Status:** Stage 1 (projection lanes in AV Video) is built and runs on pull requests. Later stages wait on the decisions below.

## Brief

Dave asked on November 13, 2026: "methodically build out the frozen situation
in the avbydave app as a recorded and monitored test case".

This is how the session read that request. It is an interpretation, recorded as
decision FC-D1, not Dave's wording:

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
a defect in Signal Flow within fifteen steps (FC-F1 below).

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

## The record

Each run writes one folder:

| File | What it holds |
| --- | --- |
| `journal.jsonl` | One event per line (`system-by-dave.frozen-case.journal.v1`): run started, each step started and finished, each finding, run finished |
| `summary.json` | The same run as one document, with the checks the case expected |
| `steps/NN-name.png` | The page after each step, with its SHA-256 in the journal |
| `exports/` | The saved plan, the exported plan and the destination CSV, with hashes |
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
flags the step.

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

Film it at operator pace and caption the film (needs ffmpeg and Pillow):

```bash
node scripts/probe_frozen_case.mjs /tmp/frozen-run --film
```

```bash
python3 scripts/frozen_case_film.py /tmp/frozen-run /tmp/frozen-case.mp4
```

The record goes to `FROZEN_CASE_OUT`, or a `frozen-case` folder in the temp
directory. The [Verify AV Video workflow](../.github/workflows/av-video.yml)
runs the case on pull requests that touch the console, the probe or the
reference, and keeps the record as a workflow artifact for 30 days. Films are
not committed.

## Findings

| ID | State | Finding |
| --- | --- | --- |
| FC-F1 | Fixed November 14, 2026 | Signal Flow did not draw the newest cable. After a route's source and destination were typed in Route details, the diagram counted the connection and left it undrawn until the page was reloaded. Four routes showed "4 connections" and three cables. Naming a source or destination renames a cable's ports without resizing the device, and the diagram was never told to read the ports again. `apps/av-video/src/FlowCanvas.tsx` now asks for that whenever a device's ports change. Step 5 guards it. |
| FC-F2 | Open | Equipment Lab finds nothing for "Panasonic PT-DW830U" or "Barco UDM 4K22", the spellings the rig record uses. "PT-DW830" and "UDM-4K22" work. The search needs the catalogue's exact spelling. See FC-D4. |

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

## Stages ahead

Each stage extends the same journey and this document, and records its own
findings. Order is decision FC-D3.

| Stage | Department | The case would enter |
| --- | --- | --- |
| 2 | Throwline | Each lane's projector, lens and throw against its plotted coverage, starting with lane D, the only lane with a throw distance on record |
| 3 | Equipment Lab | The service procedures as journeys: lamp unit and air filter on the PT-DW830, step by step through the model's states |
| 4 | Infrastructure | Power and control paths, as far as the public reference records them |
| 5 | Show Ops, The Shop, Front Office | The published tech schedule, gear preparation and the job |
| 6 | Show Control | Cue and preset records, once a public-safe source exists |

## Decisions for Dave

- **FC-D1. Is this the test case you meant?** A, recommended: yes, as built
  here. B: something else; describe it and the probe is reshaped.
- **FC-D2. Where is it monitored?** A, recommended and current: on pull
  requests that touch the console, plus a read-back against avbydave.com after
  each release. B: also gate the Pages deployment on it. C: also run it nightly
  against the live site. C is a scheduled job and needs your approval.
- **FC-D3. Which stage next?** A, recommended: stage 2, Throwline, because lens
  and throw are where the rig has open questions. B: stage 3, the lamp and
  filter procedures. C: another order.
- **FC-D4. How should Equipment Lab find a model by the name on a rig record?**
  A, recommended: the search ignores case, spaces and hyphens and matches
  catalogue aliases such as regional variants, with aliases owned by the shared
  catalog. B: normalise in this host only. C: leave it.
- **FC-D5. Should the case be visible in the product?** A, recommended: no. It
  stays a test. B: offer "Load the Frozen case" as a demo plan in the console.
  B is a new public surface; the November 6 authorization covered the WST site.

## Boundaries

- No hardware is addressed. No relay, projector, playback or control endpoint
  is contacted.
- Chromium only, headless, on SwiftShader. No physical phone, tablet, touch or
  operator acceptance is claimed.
- The run uses a disposable browser context and never touches a real saved plan.
- A passing run shows the console can hold and report this case. It does not
  show that the rig is ready.
