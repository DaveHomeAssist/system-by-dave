# AV Suite shell: one console

**Date:** October 13, 2026
**Status:** Slice A delivered (direction, hold). Slice B delivered in source on 2026-10-13: the shell at `/av/`, eight panel packs, specialist embed mode, Document panels, shell probe; publication and live acceptance follow its pull request. Slice C (sheet retirement) is next. Supersedes the
[console snapshot Rail](av-suite-console-snapshot-rail.md) as the definition of
done and pauses further per-family console conversions under the
[October 9 rollout](av-console-rollout.md).

## What Dave asked for (2026-10-13)

The AV Toolbox becomes one grandMA-style console: a touch-friendly, resizable
panel workspace with every tool in the suite reachable from one Rail. The
fully featured tools (Throwline, LED Wall Calculator, Teleprompter, Show Timer,
Cue Sheet, PixelForge, StagePlotter, AV Calculator) live inside it as panels.
The legacy spreadsheet pages are retired, not hidden. A few genuinely useful
record panels remain inside the console; the standalone sheet pages and the
repeated Plan/Import + Backup panels do not.

Decisions recorded from that conversation:

1. **One shell, one engine instance.** `/av/` hosts a single shared console
   workspace. AV Video is one application inside it, not the host.
2. **Spreadsheets dead.** The 34 legacy sheet pages are replaced by redirect
   stubs into the shell, their registry entries are retired from Toolbox,
   sitemap, offline cache and public counts, and their probes are removed.
   Saved browser data under their storage keys is left in place so the
   receiving applications can still import it once.
3. **Three, not thirty-four.** Record panels that are actually a list (video
   routes, audio channels, show-control cues) stay. Everything that only
   re-rendered a sheet as a panel goes.
4. **The current `/av-video/` snapshot host is an interim, not the product.**
   It iframes eight standalone consoles inside AV Video, which produces nested
   view strips, duplicate Add panel / lock / maximize controls and two Save
   semantics on one screen. That layering is removed.

## Why the previous direction went wrong

The October 9 clarification ("expand the AV Video app across the toolset") was
implemented as "make AV Video the container". Decision 5 in
[av-console.md](av-console.md) (lossless import of every absorbed tool) plus the
boundary "every hosted application keeps its route, schema and storage keys"
made full-application iframes the path of least resistance, and the effort went
into import, backup and recovery panels for sheets Dave wants gone. Nine
separate React bundles, each running its own copy of the shared engine, were
the result. The engine itself is sound and is reused unchanged in spirit.

## Definition of done

- `https://avbydave.com/av/` opens one console. The Rail on the left lists the
  nine application identities plus the specialist tools. Selecting a Rail item
  recalls that application's views in the same workspace; it never navigates
  away and never renders a second console.
- The panel chooser offers every application's panels in one library, grouped
  by application, so a stored view can mix Video routes, Lighting fixtures and
  a Teleprompter panel side by side.
- One view strip, one Add panel, one lock, one maximize, one status line.
  Views are owned by the shell (`sbd.avSuite.workspace.v1`), device-local
  arrangement in `sbd.avSuite.layout.v1`, both exportable as a layout file.
- Each application keeps its own document, storage key, schema, validation and
  explicit Save. The shell header saves the active application; a dirty marker
  per Rail item shows which applications hold unsaved edits.
- Specialist tools render as chrome-less panels (`?sbdEmbed=panel` hides their
  public shell navigation). They keep their own documents and full-screen
  modes; the shell never copies or merges their data.
- One **Document** panel per active application replaces the per-family
  Plan/Import and Backup panels: title and metadata, Save, Export, Restore,
  and one-time import of legacy sheet data.
- Toolbox (`av-suite.html`) and `/av-video/` redirect into `/av/` preserving
  `sbd*` show context. Standalone family routes redirect to the shell with
  that application selected.
- The 34 legacy sheet pages are redirect stubs (noindex) into the owning
  application. Registry entries carry `retired` and `replacedBy`; Toolbox,
  sitemap, offline cache, public counts and the domain staging exclude them.

## Architecture

```
apps/av-suite/            one Vite app → av/
  src/App.tsx             shell: Rail mount, header, single ConsoleWorkspace,
                          view ownership, Document panel, status line
  src/packs.ts            registry of packs and their namespaced libraries
apps/shared/av-console/
  pack.ts                 Pack contract (below)
  Workspace.tsx           unchanged engine; chooser gains per-application groups
apps/<family>/src/pack.tsx
                          useXPack(host): the application's state, document,
                          recovery and render(type) — everything its App()
                          held except the workspace and page chrome
apps/<family>/src/App.tsx thin standalone host around the same hook, retained
                          only until its route redirects to the shell
```

**Pack contract.** `usePack(host) → { id, label, library, defaultViews,
render(type, panel), quick, title, subtitle, dirty, save(), exportDoc(),
status, recovery: { offer, restore, discard, errors }, document: ReactNode,
dialogs: ReactNode }`. `host` provides `show(type)` and `notify(text, error?)`.
Panel types are namespaced `<app>:<type>` by the shell; packs keep their own
short names. Theme, compact-height handling and `beforeunload` are shell
concerns and leave the packs.

**Specialist panels.** `shell` renders `<iframe src="<route>?sbdEmbed=panel">`
with an **Open full** action. `js/av-theme-mode.js` sets
`html[data-sbd-embed]` from the query; `css/av-theme.css` hides the public
shell navigation under it. AV Calculator's DOM-adopting bridge stays on its
page; the shell embeds the plain calculator the same way.

**Rail.** `js/sbd-rail-mount.js` is reused. The shell handles
`sbd:rail-console-select` for every identity and dispatches
`sbd:console-snapshot-active` as the active view changes. Specialist entries
are added to the Rail catalog as pinnable items.

## Slices

| # | Slice | Owned scope | Gate |
| --- | --- | --- | --- |
| A | Direction and hold | this brief, supersede notes, next-steps record, CHANGELOG | docs only |
| B | Shell with all packs | `apps/av-suite/`, `av/`, pack conversions for Video, Audio, Show Control, Show Ops, Front Office, The Shop, Infrastructure, Lighting; specialist embed mode; Document panel; shell probe; registry `av` route; offline assets; domain staging | typecheck, unit, build parity, shell browser probe, existing family probes, `verify:av`, `verify:public-navigation`, `verify:public-consistency`, `verify:domain-sites` |
| C | Retire the sheets | 34 stubs, registry `retired`, Toolbox and `/av-video/` redirects, probe removal, sitemap, counts, docs | same gates plus `test:domain-cutover` |

Slice C follows B so every stub has a destination. B may land with the family
standalone routes still live; they redirect in C.

## Exclusions

- No new data model shared across applications; documents stay per
  application.
- No Stream/Record runtime, credential handling or hardware control.
- No change to CueForge, PlotForge, House Video or OnTrack boundaries.
- No physical-device or operator acceptance claim from automated checks.

## Acceptance

1. On `/av/`, selecting each Rail identity keeps the URL on `/av/`, swaps the
   view strip to that application's views and shows exactly one set of console
   controls.
2. A stored view containing panels from two applications survives Save,
   reload and layout export/import.
3. Each application's Save writes only its own storage key; Export produces
   the same schema as before; existing saved documents open unchanged.
4. Every specialist tool opens as a panel without its public navigation and
   has a working **Open full** action.
5. Phone (under 720px) shows one panel with the shell's panel switcher; tablet
   shows two across; desktop the 12×8 grid. No page scrolling at 375, 680,
   1024×690, 1100, 1440 and 3440 widths in both palettes.
6. After slice C, every retired route answers with a redirect stub, is absent
   from Toolbox, sitemap, offline assets and public counts, and
   `verify:public-consistency` passes with the new counts.
