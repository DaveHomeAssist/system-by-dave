# AV console workspace

The console workspace is the grandMA-style panel host that AV by Dave consoles share. You tap empty space, choose a panel, work in that space, and store the arrangement as a named view. Window sizing, layout lock and stored views follow Hog-style conventions. The design source is the Claude Design prototype *AV Suite Prototype v3*, built from the [unified console manifest](#decisions).

AV Video is the first console. The engine lives in [`apps/shared/av-console/`](../apps/shared/av-console/):

- `layout.ts` holds the pure grid model: fit, suggest, trim, nudge and split, plus the view operations and the persisted `workspace` shape. Its tests are in `layout.test.ts`.
- `Workspace.tsx` holds `useConsoleWorkspace` (live arrangement state) and `ConsoleWorkspace` (view strip, panel buttons, grid, chooser, menus, pointer and keyboard paths).
- `console.css` holds the shell styles on the `css/av-theme.css` tokens.

## What is shared and what is not

A console supplies four things:
- **Its panel library:** type, name, category, description, minimum size, optional module, and whether it is the lit panel.
- **Its default views.**
- **Its stored views:** these live inside the console's own document.
- **A renderer** for each panel type.

The engine owns presentation only. It never reads or writes records. Panel content, selection, records, validation and saving stay with the console. Specialist consoles (Throwline, CueForge-style live surfaces) may scope their own tokens and chrome inside `.console-shell`.

## Interaction contract

- **Workspace.** A 12 × 8 snapping grid. Panels never overlap and respect their minimum size. Long content scrolls inside its panel; the page never scrolls.
- **Add panel.**
  - Tapping empty space, or pressing **Add panel**, opens the chooser near that spot. It has search, the Common / Planning / Utilities categories, large labelled choices, and a preview of the space the panel will take.
  - With the layout unlocked, dragging across empty space draws the rectangle first.
  - When nothing fits, the chooser offers **Replace**, **Split** or **New view**. It never covers a panel silently.
- **Panel menu.** Change panel, Move and size (explicit grid commands), Split side by side / top and bottom, Maximize / Restore, and Close panel.
  - Dragging uses the title bar; resizing uses the corner handle. Both work only while unlocked on a desktop layout.
  - Close removes the view of the data. It never deletes records or turns off a module.
- **Layout lock.** Lock stops dragging and resizing. Menu commands still work, and the lock state is always visible.
- **Panel buttons.** These bring a panel forward. They focus it in the current view, open the stored view that holds it, or place it in free space. AV Video keeps its earlier labels (Signal flow, Patch, Displays, Checks, Project) and adds Cameras and Playback so existing links and habits still land on the same work.
- **Views.**
  - **Store as new view** and **Update** copy the live arrangement into the plan. They are document edits: undoable, shown as unsaved, and kept only by **Save**.
  - **Rename**, **Duplicate** and **Delete** never touch records. **Revert** returns to the stored arrangement.
  - A view stores panel types and positions only.
- **Modules.** Disabling a module hides its panels without removing them from stored views. A notice says how many are hidden. Re-enabling the module brings them back. Recalling a view never enables a module.
- **Focus.** The focused panel has a stronger border. The lit panel (AV Video: Signal Flow) is the brightest surface.
- **Keyboard and accessibility.** Every layout operation has a keyboard path. Escape closes a menu or chooser and returns focus to its trigger. Controls are at least 44 × 44 CSS pixels. Reduced motion is honoured.
- **Responsive.**
  - Desktop: the full grid.
  - Tablet (under 1100px): two panels across, in reading order.
  - Phone (under 720px): one panel, with a labelled bottom panel switcher.
  - The desktop arrangement is never rewritten by a narrower presentation.

## Persistence

`workspace` is optional in the console's document (`{ version: 1, views: [{ id, name, panels: [{ id, type, x, y, w, h }] }] }`):
- Older plans have none and open with the console's default views.
- An unknown version fails validation, so the plan is protected instead of rewritten.
- Overlapping or out-of-range panels in a damaged view are dropped at display time; the stored data is left alone.

Drafts and layout (`apps/shared/av-console/drafts.ts`):

- **Unsaved record edits.** A console keeps these under its own draft key (AV Video: `sbd.avVideo.draft.v1`), never in its saved document.
  - On the next visit a draft that differs from the saved plan is **offered**, with Restore draft and Discard draft. It is never applied silently, and the offer says when the saved plan has changed since.
  - A restored draft is an ordinary unsaved edit, so Save stays explicit.
  - Saving, or returning to the saved state, clears the draft.
- **Unstored layout.** The current view, unstored arrangements and the lock are device-local interface state (AV Video: `sbd.avVideo.layout.v1`). They are restored silently, written only after a change, and never write the plan.
- **Draft index.** `sbd.consoleDrafts.v1` lists which consoles hold drafts, for the suite rail's draft dots.

Unreadable or malformed recovery entries are preserved. Invalid cached layout geometry is filtered for display without rewriting the saved plan or original cache. Unknown or disabled panel types retain their definitions. Opening an unchanged workspace does not write its layout.

### Recovery hardening acceptance (2026-10-05)

The baseline at `66b3d66285e6c34c8b1b7db9a087caeec0e7f670` suppressed write/removal failures, allowed tabs to overwrite or clear one another's recovery draft, and rendered unsanitized cached geometry. The regression probe reproduces these failures before the correction.

- Draft mutations compare the exact initially read or last-owned draft bytes under an origin-wide Web Lock. A clean visit never owns or clears another tab's draft. A stale write, restore or discard stops automatic mutations and directs the operator to Export, then reload and review. No document merge or automatic conflict winner is chosen.
- Browsers without Web Locks keep explicit Save and Export; automatic draft mutations fail closed with a visible warning. Already-open older application versions do not participate in the new lock protocol; reload all AV Video tabs after upgrading.
- Failed draft writes, removals, layout writes and advisory-index updates are reported distinctly in the existing status footer. Failed removal retains the draft offer and index. Failed index updates do not claim the underlying draft failed. Editing and Export remain usable.
- Restore cannot replace current unsaved edits. Until an earlier offer is resolved, new edits remain in memory with an explicit recovery warning.
- Saved document and export schemas and all three existing recovery/layout keys remain unchanged. Recovery is device-local, not a substitute for exported backups.

`probe_av_console_recovery.mjs` covers injected storage failures, malformed geometry, competing tabs, stale discard, clean-tab cleanup, explicit Save, reload, export, keyboard recovery, both palettes and the 720/1100px responsive boundaries. Physical touch and operator acceptance remain separate.

## Decisions

Recorded on 2026-10-05 from Dave's review of the console manifest:

1. **Theme.** Stage Slate (dark) is the first-use default across AV by Dave. Warm Paper (light) and System stay available, and an operator's stored choice always wins. The default is set in `js/av-theme-mode.js`, `js/av-suite-context.js`, the Toolbox bootstrap, the AV home and AV Calculator.
2. **Drafts.** Each console gets its own draft key, separate from its saved document, plus a rail draft index. Save stays explicit.
3. **Show chip.** Show and phase appear read-only, only when a console is opened with show context. Consoles never swap each other's data.
4. **Scope.** Every application adopts the system, including products outside the registry, each with its own panel library and character. No generic sheet template.
5. **Unification.** Related tools join family consoles with one document and one selection. Every absorbed tool's data imports losslessly.

The console order follows the manifest:
1. AV Video, with its Switcher bus and Multiview live panels (this release).
2. Cameras and Playback are implemented in the October 5 slice with ordered records and lossless imports; Stream and Record remain next. Delivery evidence lives in the existing Video next-steps record.
3. The rail, the Stage Slate default and the draft store.
4. Show Control and Audio.
5. The remaining family consoles and specialists. Throwline keeps its flight strip, verdict and provenance ladder as chrome the layout cannot hide.

## Verification

- `npm run test:av-video` runs the engine and model unit tests.
- `npm run typecheck:av-video` covers the shared engine through AV Video.
- `npm run test:av-video-browser` includes `scripts/probe_av_console.mjs`, which covers:
  - default views and panel buttons;
  - the chooser by keyboard;
  - menus and Escape focus return;
  - move and size;
  - storing, updating, renaming and deleting views through Save and reload;
  - module-hidden panels;
  - maximize and restore;
  - lock;
  - the phone switcher.

The existing AV Video, graph and Displays probes run against the panel workspace as well.

Automated checks don't establish physical touch behaviour or operator acceptance.
