# AV Suite shell: one console

**Date:** October 13, 2026
**Status:** Slice A delivered (direction, hold). Slice B delivered in source on 2026-10-13: the shell at `/av/`, eight panel packs, specialist embed mode, Document panels, shell probe; publication and live acceptance follow its pull request. Slice C delivered in source on 2026-10-13: the console is the avbydave.com home and opens on an empty Workspace view; `av-suite.html`, both landing pages, the historical tool index and the 34 sheet pages are redirect stubs; the Toolbox code, Toolbox families and their probes are removed. The eight original family routes now redirect to `/av/?app=<pack>`; retained builds stay in ignored `apps/<family>/dist/` for source regression tests. On 2026-10-15 Dave confirmed the specialist panels stay (see the October 15 ruling below). Supersedes the
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

**October 15 ruling (Dave, 2026-10-15).** The "October 14 clarification" that
removed whole-application tiles, including the seven specialist panels, from
the shared chooser was a Codex session's own decision, not Dave's; Dave
confirmed it on 2026-10-15 when it was surfaced. The 2026-10-13 direction
stands, with the native work kept:

- Native department panels wherever a pack exists. AV Calculator stays the
  native nine-panel pack from October 14; its former app tile is still shown
  as native controls inside its saved bounds without rewriting stored bytes.
- The seven specialists without a pack (Throwline, LED Wall Calculator,
  Teleprompter, Show Timer, Cue Sheet, PixelForge, StagePlotter) are offered
  again as chrome-less panels of their own pages under a **Tools** group, with
  a default view each and "Open full" to the standalone route. A specialist
  leaves the chooser only when it gains a native pack, as the Calculator did.
- Saved views remain unchanged until the operator explicitly stores or updates
  a view; a slot whose type the console no longer knows is retained with a
  notice and never blocks adding native panels.

### October 14 completion: individual panels

Dave's acceptance is any individual panel from any department selectable from
the same menu at any time. The remaining correction uses the existing console
design, not a second workspace or whole-application tiles: Calculator's seven
existing controls become a native pack; the shared chooser uses each pack's
complete library, irrespective of optional Video module visibility. Video
module flags continue to control planning checks, not access to panels here.

The Calculator engine, formulas, field sets, autosave keys and standalone
route remain unchanged. Its DOM queries and CSS are scoped to its own controls.
Previous shell Calculator tiles expand in memory within their saved bounds
(Audio Delay alone in a small tile); saved layout bytes remain unchanged until
an explicit layout action. Other department documents are never migrated.
Verify native mixed Calculator, Audio, Video and Lighting panels, replace/add,
shared state, view save/reload, legacy layouts, export and palette/viewport
containment before release. No new dependencies, hardware control or redesign.

- `https://avbydave.com/av/` opens one console. The Rail on the left lists the
  nine original application identities plus Equipment Lab and specialist tool links. Selecting a department
  recalls its views in the same workspace and never renders a second console.
- The panel chooser offers every application's panels in one library, grouped
  by application, so a stored view can mix Video routes, Lighting fixtures and
  Calculator controls side by side, plus a Tools group for the specialists
  that have no native pack yet. Since October 29 it works in two steps: pick an
  application, Tools or Gear 3D from the tiles, then pick a panel from that
  group's list, which replaces the tiles (see the October 29 section below).
- One view strip, one Add panel, one lock, one maximize, one status line.
  Views are owned by the shell (`sbd.avSuite.workspace.v1`), device-local
  arrangement in `sbd.avSuite.layout.v1`, both exportable as a layout file.
- Each application keeps its own document, storage key, schema, validation and
  explicit Save. The shell header saves the active application; a dirty marker
  per Rail item shows which applications hold unsaved edits.
- Specialist tools run as chrome-less panels of their own pages
  (`?sbdEmbed=panel`) until each has a native pack; "Open full" reaches the
  standalone route. Their documents and full-screen modes remain unchanged.
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
apps/<family>/src/App.tsx retained source regression host around the same hook;
                          ignored dist output is never published
```

**Pack contract.** `usePack(host) → { id, label, library, defaultViews,
render(type, panel), quick, title, subtitle, dirty, save(), exportDoc(),
status, recovery: { offer, restore, discard, errors }, document: ReactNode,
dialogs: ReactNode }`. `host` provides `show(type)` and `notify(text, error?)`.
Panel types are namespaced `<app>:<type>` by the shell; packs keep their own
short names. Theme, compact-height handling and `beforeunload` are shell
concerns and leave the packs.

**Specialist panels.** `SPECIALISTS` in `packs.ts` lists the tools without a
native pack. `specialistLibrary()` offers each as a `tool:<id>` panel in the
Tools group, `defaultViews()` gives each a full-size default view, and the
shell renders the panel as an iframe of the tool's own route with the show
context forwarded and `sbdEmbed=panel` set, so the page hides its navigation
and mounts no console of its own. AV Calculator is a native pack: its existing
engine is compiled into the suite and its DOM-adopting bridge supplies
individual controls. It is not an embedded specialist application.

**Rail.** `js/sbd-rail-mount.js` is reused. The shell handles
`sbd:rail-console-select` for every native department and dispatches
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
4. Every department chooser entry renders an individual native panel with no
   iframe. Every Tools entry renders its tool's page as a chrome-less panel
   with "Open full" to the standalone route. Saved layout bytes remain
   unchanged on opening.
5. Phone (under 720px) shows one panel with the shell's panel switcher; tablet
   shows two across; desktop the 12×8 grid. No page scrolling at 375, 680,
   1024×690, 1100, 1440 and 3440 widths in both palettes.
6. After slice C, every retired route answers with a redirect stub, is absent
   from Toolbox, sitemap, offline assets and public counts, and
   `verify:public-consistency` passes with the new counts.

## Gear panel candidate (October 17, 2026)

The chooser adds a Gear 3D group with original ETC Ion and Universal 2×20
views. `?gear=ion` or `?gear=wing` requests the panel in the current workspace.
The original Ion Workbench remains owner-private at its existing Site origin.
Only that origin is added to frame-src. A frame load alone never reports ready: a
versioned, source-window and exact-origin checked message handshake is required.
A missing handshake offers Open full and Retry so authentication or an embedding
policy failure cannot appear to be an empty working model. No credentials or
show context are sent to the viewer.

Panel snapshots are device-local under `sbd.avSuite.gear.v1:<view,panel>`: camera,
selected component, inspector and practice levels. Existing show documents and
workspace schemas are unchanged. Layout exports preserve the gear panel type and
arrangement; camera snapshots are not yet included in exported layouts. This is
an explicit follow-up, not a portable-state claim.

The viewer is remote and online-only; its assets are not added to the AV offline
cache. Host code does not bundle another Three.js release. The two apps retain
separate rendering realms. The candidate requires actual authenticated embedding
acceptance at avbydave.com plus the usual responsive/browser/release gates before
merge. A signed-in top-level Ion page does not prove third-party-frame access.

Adapter source: Ion Workbench revision 0.9, `panel-host.js`, `panel-contract.js` and
`panel-host.css`. Copy these three files together when upgrading the contract.

### SmartFade 1248 candidate (19 October 2026)

The additive `gear:smartfade1248` panel (and independent `gear:smartfade1248-second` choice) and `?gear=smartfade1248` launch use the
same private Ion Site and origin/source/session-bound panel host. Existing Ion
and wing URLs, equipment identity and saved-state keys are retained. SmartFade
snapshots use equipment `etc-smartfade-1248` and a separate equipment/view/panel
key. Its scoped view and panel IDs are sent as opaque viewer namespace parameters,
without show context or credentials. The viewer must contain the SmartFade
adapter before this host candidate can be released.

This is a prototype inspection model: 24 main plus four auxiliary sliders,
separate bump/function keys and a wheel/LCD/SD opening. Physical slider position
is not simulated output. Rear socket placement, exact travel, historical Ion
bookmarks, Surface/iPad touch and authenticated production embedding remain
unverified. No practice emulation, live output or portable snapshot export is
claimed. This candidate is stacked on PR351 and cannot merge ahead of its parent
or bypass its authenticated/device release gates.

The existing workspace focuses an already-open panel type. Two explicit SmartFade instance choices therefore provide simultaneous independent desks without changing shared layout behavior. Both use the same canonical equipment ID; neither assigns an ECOG patch or simulated output.

## Equipment Lab, 26 October 2026

Option A adds the tenth native pack: Equipment library, Model inspector,
Equipment practice and Equipment reference. The same implementation serves
`/equipment-lab/`. The shared catalog contains 43 confirmed entries. The Cartoni
GLB is the first native representation; other entries retain their existing
viewers during migration. See [the module brief](equipment-lab.md).

## Family route cutover, October 29, 2026

Dave selected the existing redirect option: `/av-video/`, `/av-audio/`,
`/show-control/`, `/show-ops/`, `/front-office/`, `/the-shop/`,
`/infrastructure/` and `/av-lighting/` redirect to `/av/?app=<pack>`.
The stubs allow only the five shared show-context parameters, cap each at
200 characters and drop unrelated queries and fragments. Meta refresh and a
visible link provide a JavaScript-free fallback. Pack source, saved keys and
import/export contracts remain owned by each application. Calculator and the
newer Equipment Lab routes are outside this eight-route cutover.

Public family probes use `scripts/av-family-probe.mjs` against the shared
console. They check every default view, a real edit, explicit isolated Save,
export, reload, two palettes and desktop, breakpoint, phone and ultrawide
containment. `npm run test:av-routes-browser` checks the empty Workspace, nine
original Rail identities, Throwline panel and all 34 sheet plus eight family
redirects. Set `AV_ROUTES_BASE=https://avbydave.com` to check the published root.

The detailed previous host regressions are retained behind
`npm run test:av-retained-browser`. Build all eight applications first. This
runner serves their ignored `apps/<family>/dist/` output as disposable fixtures
and invokes the original import, recovery, data and layout checks with
`AV_RETAINED_HOST=1`. These fixtures establish source compatibility, not public
standalone availability. The Pages pipeline excludes all `dist` directories,
and the release verifier rejects a standalone bundle replacing any route stub.

## Two-step chooser, 29 October 2026

Dave marked up the Add panel menu: pick from the group tiles, then get that
group's panels, with the other tiles gone. With twelve tiles above the list,
only the first two panels of a group fitted (Front Office showed Jobs and
Clients of its five).

- The chooser opens on search and the twelve tiles. The active application's
  tile is marked; nothing is preselected.
- Picking a tile replaces the tiles with **Back**, the group name, every panel
  in that group and the placement preview. Back or Escape returns to the tiles.
- The chooser may use the height below where it opened, and only the panel
  list scrolls, so every panel of the longest group (AV Video, ten) stays
  reachable without the chooser or the page scrolling.
- The engine is shared, so the retained family hosts (`npm run
  test:av-retained-browser`) get the same two steps over their Common,
  Planning and Utilities categories.

Panel types, views, layouts and saved documents are unchanged.
