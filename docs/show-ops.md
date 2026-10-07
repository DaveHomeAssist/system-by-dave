# Show Ops application brief

## Problem and outcome
An operator needs one show-scoped place to track room readiness, crew calls, open tasks and a handoff summary without switching among independent worksheets. A useful first slice is an editable local show document with a clear live status and portable JSON backup.

## Flow
Name the show, add rooms, crew and tasks, update each status, review the handoff, then explicitly save or export. A backup can be selected, previewed and confirmed before replacing the current Show Ops document. Rejected imports and failed saves leave the current document intact.

## Data and boundaries
`show-ops/index.html` owns `sbd.showOps.document.v1` and export schema `system-by-dave.show-ops.v1`. It does not modify Show Board's `sbd.showboard.*` snapshots or the independent room, crew and task worksheets. Their routes remain available from the app. This slice does not claim a lossless import of those separate documents or parity with Show Board's timeline and recovery model; route retirement is excluded. No server, credentials or new runtime dependency is required.

## Acceptance
A named show can create, edit, close and reopen room, crew and task records; save and reload; export and restore a document; preview a backup before replacement; and recover from invalid import or storage failure. Keyboard controls and layouts work at desktop and phone sizes without page scroll. The application remains useful when no legacy records exist. Integration must mark the Show Ops rail entry available and add its route to publication, offline and navigation contracts only after the scoped PR is merged.

## Publication handoff
The scoped branch is deliberately `noindex` and canonicalized to the source origin until the Rail owner serializes registry, domain staging, sitemap and offline publication. That integration must switch the canonical and Open Graph URL to the verified published origin and remove `noindex`. The global indexing gate counts out-of-sitemap routes and cannot pass on this app-only branch; it needs the shared registration in the Rail integration.

## Theme contract
The application consumes `css/av-theme.css` and `js/av-theme-mode.js` with `data-av-tool="show-ops"`. Its visible toggle writes the shared `av-theme-mode.v1` preference, while all palette and contrast tokens come from the canonical AV light and dark themes. Show documents and their save key remain independent of theme preferences.
