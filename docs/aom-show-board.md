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

This is bounded functional regression coverage. Corrupt saved-data recovery,
concurrent-tab conflict handling, physical devices, assistive technology, actual
browser zoom and human acceptance remain separate work.
