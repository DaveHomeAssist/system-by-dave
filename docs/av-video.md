# AV Video

[Open AV Video](https://avbydave.com/av-video/) from [Toolbox](https://avbydave.com/av-suite.html?entry=toolbox).

Signal Flow is an interactive device-and-connection canvas backed by the same routes as Video Patch. Create or edit a route in either view: source, destination, processor, format, connector, input, converter, status, backup and notes stay together. Checks show missing fields and reported issues without changing the operator's status or claiming that a physical signal has been tested. No show setup or Workbook is required.

## Application Rail

AV Video is mounted beside the shared AV application Rail. The Rail lists the exact nine-console v3 order: AV Video is available; Audio, Show Control, Show Ops, Front Office, The Shop, Infrastructure, Lighting and AV Calculator are visibly **Planned** and do not navigate. Planned console identities do not imply an application, route, document or storage contract.

Below 720 CSS pixels, **Apps** opens the application dialog and the existing bottom control continues to switch panels inside AV Video. From 720–1439 pixels the Rail is a compact icon column; at 1440 pixels and above it shows labels. AV Video still chooses phone, tablet and desktop workspace modes from the viewport width, not the remaining content width.

**All apps** resolves typed console, Toolbox-family, specialist-tool and external destinations. Recognized show context is carried only to eligible same-origin consoles and tools; Toolbox, family and external destinations do not receive it. **Customize** stores device-local pin order under `sbd.rail.v1` only after an explicit pin, unpin, move or reset. Opening or rendering the Rail does not write preferences, repair drafts or change the active AV Video plan.

The Rail assets are part of the AV Suite offline manifest. A returning installation still depends on the normal service-worker update cycle before the new cache generation controls that client.

## Canvas clarity

Cables use orthogonal obstacle routing in both the canvas and exported SVG. They route around devices, including after dragging; enclosed ports show an Arrange warning instead of a false connection through overlapping equipment. Arrowheads stop before the target port so the device cannot cover them. HDMI is dashed and SDI is solid; compact connector labels and accessible full signal descriptions replace repeated long cable labels. The selected route shows its source format once above the canvas; different explicit formats can label individual cables when there is room.

Source format and connector describe the first cable only. Patch details provide explicit converter and processor output port, connector and format, plus destination input. Missing output details stay unknown: the device name does not prove conversion behavior. Older backups load with blank output fields, preserving existing route values and original imports. The sample names switcher outputs AUX 1 and AUX 2, and connects recorder/encoder routes to the shared switcher.

A reported issue belongs to a route, not every device on it. Its path stays red when selected, and one clickable banner states the affected device count and that the failed step is unconfirmed. It opens Checks. Operator statuses such as tested are preserved and labelled as operator reports, never live telemetry. Record tester, time and scope in Operator notes; no test provenance is invented.

The desktop header includes plan identity and the canvas toolbar includes route controls. New-port handles appear on hover, keyboard focus, selection and touch devices; keyboard connection remains available in device details.

## Displays & Projection

The **Displays** tab adds editable display and projection records to the same saved Video document. Add a display for its type, input, processor, resolution, aspect and refresh, or a projection record for screen, surface, size, projector, lens, throw distance, position and blend. Both retain route references, backups, original status and notes. Enter dimensions with units; no optical calculation or physical verification is inferred.

Select **Linked route** to connect a record to an existing signal route. Matching destination names or legacy route references suggest candidates but never create links automatically. **Trace linked route** selects the existing path on the canvas. Route renames keep the stable link; removing a route leaves a visible, repairable missing-link check. Linking never copies or overwrites timing, equipment or status fields. Destination and route statuses remain separate operator reports.

Display Plan and Projection Plan JSON exports and browser sheets have preview/cancel/apply imports. Every known row field is editable; metadata, original IDs and extra fields remain in the verbatim original source, available through **Export original**. Similar imported records stay separate. Imports preserve all source keys, reject duplicate sources and reject browser sources changed after preview. Unlabelled files must have recognizable rows; empty legacy files should use their exported schema or Import saved action. The older projection `throw` alias is retained as editable `throwDistance`.

**Export CSV** includes all destination records and fields, including backup details. The header **Export** remains a complete restorable JSON plan. Undo/redo, explicit Save, stale-tab protection and offline save/reload apply to these records. Older AV Video documents load with an empty destination list. Displays is enabled initially and can be disabled in Project; its data remains in backups, its checks are excluded while disabled, and a disabled-module deep link opens Project without enabling it.

Throwline and LED Wall Calculator remain separate planners accessible from the destination list. These are navigation links with no implicit data transfer; save before leaving. Legacy Display Plan and Projection Plan pages remain available, including their print and summary workflows. This release does not retire them or claim full eight-tool/operator acceptance.

## Cameras and Playback

**Cameras** keeps ordered shots with number, cue, camera, type, subject, framing,
movement, preset, status and notes. **Take next** marks the first untaken shot
in the full list as taken, even if a filter hides it. **Playback** keeps cue,
file, type, duration, aspect, audio, destination, status, backup and notes.
**Mark next ready played** marks the first ready cue in the full list as played;
it never advances a pending cue. Neither action sends hardware commands or
plays a media file. Undo reverses a mark like any other plan edit.

Both panels support search/status filters, add, duplicate, move up/down and
confirmed removal. New records are inserted after the selected record.
Imported unknown statuses and duration strings remain verbatim. Link a route
explicitly to trace its signal path; names never merge identities automatically.
Planning checks report missing camera/subject or file/destination, reported
problems and deleted route links, without asserting physical readiness.

Project can disable either module. Hidden records and panel definitions remain
in Save and JSON Export; their checks are omitted. Re-enable to recover them.
`?view=cameras` and `?view=playback` open the corresponding panel, or Project
with guidance when the module is disabled. Older saved workspaces gain reachable
views in memory; opening them does not save or rewrite the original layout.

Import Camera Shot List (`camera-shot-list.v1`) and Playback Check
(`playback-check.v1`) from JSON files or this site's saved sheets. Preview and
confirm before appending. All source metadata (including camera `date` versus
playback `showDate`), IDs and extra fields remain in **Export original**.
Each panel's CSV includes all records, family fields and explicit route links;
full JSON Export is the restorable backup. Original legacy pages remain
independent and usable, including their printing and summary workflows.

## Working with a plan

- Add devices or try the sample. Drag equipment to arrange it and connect an output port to an input. A keyboard alternative is available in the selected device panel. Both actions create real editable routes in Patch. New equipment avoids overlap with an existing saved layout.
- The selected route highlights immediately; **All routes** clears the highlight. Select a cable or a route to trace its path. Shared devices appear once, with incoming feeds and branching outputs. Zoom, pan, Fit View and the optional overview let you navigate larger systems. Double-click a device to rename it across all connected routes; use **Edit route** for a single route.
- **Export diagram** downloads a standalone SVG for handoff. Save and JSON export retain both routing data and equipment positions. On a phone, **Back to diagram** returns from the editor to the canvas.
- The workspace is a panel console ([contract](av-console.md)). The **Routing**, **Projection**, **Troubleshooting** and **Project** views arrange Signal Flow, Patch, Inspector, Displays & Projection, Checks and Project side by side, all on the same data. The **Signal flow**, **Patch**, **Displays**, **Checks** and **Project** buttons bring a panel forward. **Edit route** or a route card opens the Inspector, and a check opens the affected record.
- **Show** view: Signal Flow, **Multiview** and **Switcher bus**.
  - The bus reads the plan. A route's Processor is a switcher; its Switcher / device input values become program and preview keys, and its outputs become AUX pickers.
  - **Cut** swaps preview and program. Outputs named Program or PGM follow program. Every other output stays **Not assigned** until you pick a source; nothing is inferred from a name.
  - Multiview shows program, preview and each destination with the source it carries. Tap a tile to trace its route.
  - Bus selections are live state for this visit. They never edit or dirty the plan, survive every layout change, and do not control hardware.
- Tap empty space or **Add panel** to place another panel, arrange panels from their menus or, when unlocked, by dragging, then **Store** or **Update** the view. Stored views travel in the plan and its JSON backup; they are kept by **Save** like any other edit. Older plans open with the default views. On a phone, one panel shows at a time with a bottom switcher.
- Use **Project** to name the plan, enter optional venue/lead details, and turn patch, displays, cameras, playback, checks or backup modules off. Disabled controls and search fields disappear; their data stays in a full export. Patch checks run only when the patch module is enabled. These preferences belong to the saved plan.
- Format and connector dropdowns render inside the webpage and stay within its viewport, avoiding native menu placement on the wrong display in embedded browsers. Arrow keys, Home/End and typing find an option; Enter selects, Escape cancels, and Tab closes without changing the value.
- **Undo / Redo** restores up to 80 edits during this visit, including device moves, connections, route deletion, imports and module switches. Typing in one field is grouped until focus leaves it. Use Cmd/Ctrl Z and Cmd/Ctrl Shift Z (or Ctrl Y) outside text fields; text fields keep native typing undo. Save does not clear history; reloading does.
- Choose a **Format / EDID timing** and **Connector** from the preset menus. Format choices distinguish 59.94 from 60 and include HD, UHD and common computer rasters. These are planned timings, not EDID binaries or hardware programming. Imported connector/format text stays intact even when it is outside the menus.
- **Custom / LED wall** accepts pixel width, height and frame rate. **Use saved LED wall** reads the native raster from the existing LED Wall Calculator on this origin, including cabinet rotation and whole-cabinet rounding for layout, target-size and target-raster modes. It applies only the selected route format, can be undone, and never writes calculator data. The processor still needs to accept that native raster.
- Unsaved edits are also kept as a draft on this device. If you leave without saving, the next visit offers **Restore draft** or **Discard draft**; nothing is applied until you choose. The current view and unstored panel arrangements come back automatically.
- **Save** keeps the current plan in this browser and on this site. It does not sync to another device. **Export** downloads a complete JSON backup, including data in hidden modules and original imports.
- **Import JSON file** accepts an AV Video backup or a Signal Flow / Video Patch / Display Plan / Projection Plan / Camera Shot List / Playback Check export. **Import saved…** reads the earlier sheet's storage on the current site. Preview route counts and contents before applying. Legacy imports append records; a full Video backup replaces the current plan after explicit confirmation, with an export-current action available.

Imports preserve configured plan titles and metadata, even before the first route or destination exists. Only a pristine default plan receiving records adopts source metadata; empty imports never rename it. Importing does not alter the earlier sheets. Every original payload, metadata field, row ID and extra field remains in a verbatim source copy, downloadable independently. Editable route fields preserve blanks, text and original statuses. Identical imports are refused, including after edits. Similar routes from different sources remain separate rather than guessing identity. Rows are not truncated to legacy limits. Browser-source changes after preview cancel the operation.

## Implementation contract

Source: `apps/av-video/` (React/TypeScript, existing Vite/Zod dependencies). [React Flow](https://reactflow.dev/) supplies the core diagram viewport, device dragging, port connections, keyboard support and overview; this is a deliberate dependency for the app's central workflow. Generated artifact: `av-video/`. The registry owns its launch, storage and offline assets. The new localStorage key is `sbd.avVideo.v1`; document schema is `system-by-dave.av-video.v1`. The app neither reads nor writes Workbook stores. Exact matching device names share one diagram node; distinct physical units need distinct names. This groups visual devices without merging imported route records. Native documents add backward-compatible defaults for layout, unused devices and source-output names; earlier AV Video JSON remains readable. One app-owned current document is a deliberate first-slice default; cross-application identities and automatic legacy merging are not introduced.

Explicit save compares the loaded raw value against current storage before writing. Unknown/malformed stored documents block saving; storage or quota errors keep the draft available for export. Opening the app never writes a plan. A stale tab must export its draft and reload. Module changes, imports, resets and edits remain unsaved until Save; leaving an unsaved draft triggers the browser's leave warning.

Signal Flow and Video Patch legacy URLs and storage contracts remain usable. Their Toolbox cards are consolidated into AV Video, and the shared Video navigation prioritizes the new application. Other Video tools remain separately accessible: streaming and recording consolidation remains planned. Cameras and Playback now have native records and previewed imports. Displays and projection are implemented with legacy compatibility; human acceptance remains open.

## Verification

`npm run typecheck:av-video`, `npm run test:av-video`, `npm run build:av-video`, and `npm run test:av-video-browser` run in release CI. The browser probes check device dragging and reload, shared-device rename, port dragging, keyboard connection, route tracing, patch parity, standalone SVG export, zoom and overview, plus shared edits, save/reload, import cancel/confirmation, original-source preservation, full backup round trips, duplicate/stale imports, stale tabs, unreadable storage, module visibility, Toolbox launch, offline editing/reload and viewport containment at 375, 680, 1440 and 3440 pixels in light/dark modes. Set `CHROME_CHANNEL=chrome` to use installed Chrome; set `AV_VIDEO_BASE` to read back a deployment in an isolated test browser context. The destination probe additionally checks display/projection imports, route linking/tracing/removal, CSV, hidden-module recovery, old-backup compatibility, keyboard navigation and offline destination edits. Technical checks do not substitute for venue/operator acceptance.

Preset references: [Blackmagic video standards](https://www.blackmagicdesign.com/products/atemtelevisionstudio/techspecs) and [Extron EDID timing tables](https://media.extron.com/public/download/files/userman/dtp_t_hwp_uwp_D_series_68-2547-01_H.pdf). These inform useful planning choices, not a claim that every device supports every format.

The sequence probe checks camera/playback import parity, ordering and status actions, route links, CSV/full backups, recovery, module retention, keyboard and responsive themes, and offline edits. Run it through `npm run test:av-video-browser`.

### Application Rail returning-client transition evidence, October 7

`npm run test:av-offline-transition` replays the successfully published pre-Rail revision `adf1f1eda565b51b13d42b08968ca081e0f547a7` (deployment `37433638295`) and the exact reviewed Rail runtime `55bec1afdd3b9e8e14f5a7ac3ed0a0caef858915` on one isolated origin. One persistent Chromium context installs and is controlled by cache `sbd-av-suite-v20261005-video-sequences`, creates and saves a real sample AV Video plan, then loads the network-first Rail UI while that older worker still controls the page and unpins Audio through the real Customize dialog. The registration then updates to `sbd-av-suite-v20261007-av-video-rail`, removes the old cache, precaches all seven checked Rail/AV assets and reopens the same contextual AV Video URL offline. The saved `sbd.avVideo.v1` document and `sbd.rail.v1` preference remain byte-identical; the Rail retains the five typed show fields and drops the unrelated `private` parameter.

Walter passed this protocol on exact detached old/new Git trees. The fixture exercises a genuine worker install, control, update, `controllerchange`, cache replacement and offline navigation in one browser context; it does not modify production, Dave's browser profile or real saved data. It is automated Chromium evidence, not physical-device or operator acceptance.

### Cameras/Playback release evidence, October 5

[PR #268](https://github.com/DaveHomeAssist/system-by-dave/pull/268) and the compatible dependency repair [#271](https://github.com/DaveHomeAssist/system-by-dave/pull/271) published at `338ea85d3162a55e30a0c40f07955e2390ad46c2`. [Source publication](https://github.com/DaveHomeAssist/system-by-dave/actions/runs/37403101951) and [AV destination publication](https://github.com/DaveHomeAssist/avbydave/actions/runs/37404940165) succeeded. The earlier audit failure in run `37400441588` remains historical evidence; the high-severity gate was preserved.

Walter's isolated live sequence probe passed imports and field parity, actions/order, undo/redo, CSV/full backup, draft recovery, hidden modules, keyboard controls, both themes, responsive boundaries and offline Save/reload. The published source and JS/CSS matched before and after the probe. This closes automated delivery acceptance for Cameras/Playback; physical/operator acceptance and the remaining Video modules stay open.
