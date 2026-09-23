# Camera Shading Practice

`shader/practice.html` (live at `https://housevideo.app/shader/practice.html`) is
an offline training console for shading two simulated cameras. Every picture,
scope trace, score and coaching line is a pure function of the practice state.
Nothing on the page reads, measures or controls real equipment, and the page
keeps three statements visible in every layout: **SIMULATION FOR PRACTICE**,
**Generated practice signal · not a measurement**, and **Nothing here reads or
controls real equipment.**

## Product boundary

The console belongs to Camera Control & Shading (`/shader/`) in FMP Video
Operations. It is not part of Throwline, Stage 3D, the AV registry or Throwline
navigation. `ProjectorThrow/practice.html` stays a noindex compatibility
redirect to the Shader route, and old Throwline practice exports still import.

## Files

| File | Responsibility |
| --- | --- |
| `shader/shading-practice-state.js` | Deterministic engine (UMD; also loaded by the node tests). Scenarios, control ranges, frame generation, analysis, scoring, coaching, faults, demonstrations, import and export. |
| `shader/practice-render.js` | Canvas drawing of letterboxed 16:9 pictures, the wipe, and the four scopes. It only draws engine analyses. |
| `shader/practice-app.js` | Controller: DOM, layouts, input, undo/redo, share and files, autosave, offline registration. |
| `shader/practice.css` | ShowConsole styling. Prep Light is the default theme and Show Dark the working theme; scope glass is dark in both. |
| `shader/practice-theme.js` | Applies the saved theme before first paint. |
| `shader/practice-worker.js` | Dedicated offline cache for the console, the parent reference, and its stylesheets. |

The page loads only these same-origin files. Its CSP allows no inline script or
style, no network connections (`connect-src 'none'`), and no plugins.

## Workflow and layouts

The console follows one loop: choose an exercise, inspect the reference and
target, select the target camera, adjust, compare scopes, score, review the
debrief, then replay or share. Desktop shows three columns (exercise, score and
demonstration tabs; multiviewer and scopes; camera control). Laptop widths
(900–1279 px) add camera control to the side tabs. Below 900 px a task rail
switches Shade, Scopes, Exercise, Score and Demo views; in Shade the pictures
stay pinned while the control list scrolls, and tablets put the controls beside
the pictures. At 1920 px and wider the monitors and scopes take separate
columns, and a first visit opens all four scopes.

Simulated tally is fixed per exercise: the reference camera is on simulated
program (SIM PGM, red) and the target on simulated preview (SIM PVW, green).
Amber marks only the camera under control and keyboard focus.

Only the target camera is adjustable (the demonstrated camera during a
demonstration). The reference can be selected for inspection, but its
controls are hidden and refused, so moving the reference can never score an
exercise and its exact settings never give away the answer.

## State and compatibility

Exports use `kind: shader-camera-practice-session`, schema
`shader.camera-practice.v1`, `schemaVersion: 1`. The console added optional
fields that version-1 readers ignore, so older cached pages still open newer
files:

| Field | Contents | Bound |
| --- | --- | --- |
| `view` | `compare` (`side`, `wipe`, `reference`, `target`), `wipe` position, `scopeLayout` (`single`, `quad`), `freeze` (a stored reference still) | enumerated values; wipe 0.05–0.95 |
| `checks` | scored checks: running number and both cameras' controls | last 20 |
| `injectionRecords` | each fault with the control values it replaced, so it can be reverted | last 12 |
| `demo` | title, focus control, compare-with, current index, steps (label, note, controls, scope, compare), and the practice state to restore | 24 steps; labels 60, notes 280, title 80 characters |

`splitView` is still written, derived from `view.compare`. Imports accept the
current schema and `throwline.camera-practice.v1`, reject anything else, cap
input at 400,000 characters, ignore prototype keys, and strip control and
bidirectional-override characters from text. Imported text is rendered with
`textContent` only.

Exercise scores are unchanged from the pre-console engine; the engine tests pin
golden scores for every exercise.

## Links and storage

- `?scenario=&seed=&camera=&scope=&split=&compare=&layout=` opens an exercise
  from its start. `?demo=<control>&step=<n>` opens a guided sweep.
- `#state=<base64url JSON>` reproduces an exact session, including checks and
  any demonstration.
- Link parameters are one-time inputs: after loading, the session is saved and
  the address returns to the plain route, so a reload continues the work.
- `localStorage`: `shader.practice.theme.v1` (the legacy
  `throwline.practice.theme.v1` is still read) and `shader.practice.session.v1`.
  `sessionStorage`: `shader.practice.reloaded`, used once during a cache update.
  Every access tolerates blocked storage.

## Coaching

- Live progress shows a status word per objective: CRIT far, WARN close, OK
  inside its window. Exact target values are never shown.
- The next correction moves each control of the target camera in both directions
  until a continuous match error stops falling, keeps the candidates within half
  of the best available score gain, and names the one that serves the earliest
  objective in the exercise's teaching order. It reports an objective, a control
  and a direction, never a value. Following it completes every exercise in the
  engine tests.
- A debrief compares the latest check with the previous one (or the exercise
  start). Each changed control is replayed alone to report what it helped or
  hurt, as a percentage closer or farther for each objective.
- Signal alerts list clipping, crushed blacks, high gain, and a moved reference,
  CRIT before WARN.

## Offline behavior

The worker fetches every listed file from the network first and saves it, and
serves saved copies when the network is unavailable or slower than four
seconds. The engine, renderer, controller and worker share one release
identifier (`BUILD`); if an older cache serves a mismatched file, the page waits
for the updated worker and reloads once.

## Verification

```bash
npm run verify:shader-practice        # engine tests and source release gate
npm run test:shader-practice-browser  # CDP browser probe
```

The browser probe covers the six reference viewports in both themes,
keyboard-only use with visible focus, contrast, 44 px targets, reduced motion,
offline reload, exact handoff, legacy and invalid imports, and the storage,
clipboard, canvas, service-worker and no-JavaScript failure paths.
