# AV Video

[Open AV Video](https://avbydave.com/av-video/) from [Toolbox](https://avbydave.com/av-suite.html?entry=toolbox).

Signal Flow and Video Patch now share one route list. Create or edit a route in either view: source, destination, processor, format, connector, input, converter, status, backup and notes stay together. Checks show missing fields and reported issues without changing the operator's status or claiming that a physical signal has been tested. No show setup or Workbook is required.

## Working with a plan

- Add routes or try the sample. Select a route to edit; on a phone, use **Back to routes** to return to the list.
- Switch between **Signal flow** and **Patch** to see the same data in different views. **Checks** opens routes needing attention.
- Use **Project** to name the plan, enter optional venue/lead details, and turn patch, checks or backup modules off. Disabled controls and search fields disappear; their data stays in a full export. Patch checks run only when the patch module is enabled. These preferences belong to the saved plan.
- **Save** keeps the current plan in this browser and on this site. It does not sync to another device. **Export** downloads a complete JSON backup, including data in hidden modules and original imports.
- **Import JSON file** accepts an AV Video backup or a Signal Flow / Video Patch export. **Import saved…** reads the earlier sheet's storage on the current site. Preview route counts and contents before applying. Legacy imports append; a full Video backup replaces the current plan after explicit confirmation, with an export-current action available.

Importing does not alter the earlier sheets. Every original payload, metadata field, row ID and extra field remains in a verbatim source copy, downloadable independently. Editable route fields preserve blanks, text and original statuses. Identical imports are refused, including after edits. Similar routes from different sources remain separate rather than guessing identity. Rows are not truncated to legacy limits. Browser-source changes after preview cancel the operation.

## Implementation contract

Source: `apps/av-video/` (React/TypeScript, existing Vite/Zod dependencies). Generated artifact: `av-video/`. The registry owns its launch, storage and offline assets. The new localStorage key is `sbd.avVideo.v1`; document schema is `system-by-dave.av-video.v1`. The app neither reads nor writes Workbook stores. One app-owned current document is a deliberate first-slice default; cross-application identities and automatic legacy merging are not introduced.

Explicit save compares the loaded raw value against current storage before writing. Unknown/malformed stored documents block saving; storage or quota errors keep the draft available for export. Opening the app never writes a plan. A stale tab must export its draft and reload. Module changes, imports, resets and edits remain unsaved until Save; leaving an unsaved draft triggers the browser's leave warning.

Signal Flow and Video Patch legacy URLs and storage contracts remain usable. Their Toolbox cards are consolidated into AV Video, and the shared Video navigation prioritizes the new application. Other Video tools remain separately accessible: this slice does not claim display/projection, camera sheets, playback, streaming or recording consolidation is complete.

## Verification

`npm run typecheck:av-video`, `npm run test:av-video`, `npm run build:av-video`, and `npm run test:av-video-browser` run in release CI. The browser probe checks shared edits, save/reload, import cancel/confirmation, original-source preservation, full backup round trips, duplicate/stale imports, stale tabs, unreadable storage, module visibility, Toolbox launch, offline editing/reload and viewport containment at 375, 680, 1440 and 3440 pixels in light/dark modes. Set `CHROME_CHANNEL=chrome` to use installed Chrome; set `AV_VIDEO_BASE` to read back a deployment in an isolated test browser context. Technical checks do not substitute for venue/operator acceptance.
