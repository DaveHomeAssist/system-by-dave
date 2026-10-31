# AOM show board

The standalone `aom-show-board.html` route retains its room timeline, daily
pre-checks, issue notes, turn list, text import and photo transcription preview.

## Policy and viewport repair

The page previously had no content security policy and extended beyond the
viewport. The smallest repair moves the existing script into a same-origin
file, restricts resources to the files, Google Fonts and transcription endpoint
already used, and exposes Timeline, Live, Turns and Tools as bounded views.
Desktop navigation is above the content or beside it on ultrawide screens;
phone navigation sits below it. Light remains the default with a visible theme
toggle. Print includes all views. Without JavaScript an explicit notice explains
that the board cannot load or edit saved data.

Keyboard users can operate view tabs, room controls and session blocks. Dialogs
keep focus inside, support Escape and return focus to the invoking control.
The long timeline and turn list scroll inside their own containers.

The existing `aom_show_board_v15` storage key, default data, daily check reset,
text parsing and scan request/confirmation shapes are preserved. Views are
selected through URL fragments without changing saved board data. No framework,
service worker, credential, API gateway or production deployment is introduced.

The resource policy permits the existing Anthropic messages endpoint. This is
not a claim that authentication or live transcription works on the public host.
All automated scan checks intercept a synthetic response; no inference is run.
Inline styles remain allowed for generated timeline geometry. A meta policy
cannot supply response-header framing protection.

## Verification

Run `node scripts/probe_aom_show_board.mjs`. The probe serves the checkout on
loopback, stubs fonts and all external traffic, uses disposable browser storage,
and checks views, editing, reload, pasted-text preview and mocked photo import.
It also checks focus, containment, print, no JavaScript and deliberate content
policy violations. Run it inside a network-disabled container for an independent
barrier against external requests.

## Failed saved-data reads

Problem: malformed saved JSON previously fell back to sample data silently. A
later theme edit autosaved that sample over the original bytes. A disposable
browser fixture reproduced the overwrite before the repair.

On a read, parse or structural validation failure, the board now displays a
persistent warning and disables all writes to its existing saved key. The
sample remains usable as a temporary view. Recovery offers an exact-text
recovery file when the original text was readable, and an explicit reload to
retry the saved board. Reload discards temporary sample edits. Missing storage
still starts a new board; unreadable storage does not count as missing.
The new download uses `system-by-dave.aom-recovery.v1` with `storageKey` and
`raw` fields. JSON string encoding preserves every original string code unit,
including malformed Unicode. It is a recovery container, not a board import.

Write rejection preserves the previous saved value and keeps failure feedback
visible. A later successful save may clear that feedback. This does not add
transactions or change the existing 250ms save debounce.

Run `node scripts/probe_aom_storage.mjs` for isolated localStorage and artifact
storage fixtures: malformed/empty/invalid shape, read rejection, exact original
export, explicit retry, valid reload and rejected writes. Structural validation
fails closed for unrecognized data rather than silently dropping fields. No
historical format migration is specified or claimed. Concurrent tabs, process
termination during debounce, storage-engine corruption recovery, physical
devices, assistive technology and human acceptance remain unverified.

## Clipboard receipts

Copy text reports success only after the clipboard API resolves or the legacy
copy command returns true. Failure offers a selected, read-only snapshot for
manual copying. Snapshot text is assigned as a textarea value, never markup.
An outstanding permission request disables duplicate copies; a delayed failure
keeps any newly opened editor intact instead of replacing it with recovery.
The button retains Copy failed so the operator can retry after closing the editor.

Run `node scripts/probe_aom_clipboard.mjs` for real isolated Chromium clipboard
write/read parity, simulated modern and legacy success, absent/rejected/throwing
clipboard paths, exact Unicode and markup-like text preservation, delayed failure,
focus restoration and 12 layout cases.
The disposable Chromium fixture reproduced a false Copied receipt before the
repair. Synthetic permission responses do not prove native operating-system
clipboard or physical-device acceptance.
