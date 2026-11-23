# OnTrack keyboard and viewport repair

## Scope

The retained public navigation audit identifies a missing first-focus skip
link on OnTrack. Its library rows and debrief list also require a pointer,
and its mobile shell expands past the viewport. This slice repairs OnTrack
only, preserving its independent route and existing DJ workflow.

Users enter the workspace from a skip link, switch between Library, Sets,
Debrief and Data, open a track with the keyboard, and return from its dialog
to the same track. Mobile navigation sits below the workspace. Long track,
set and note collections scroll inside bounded panels. Light is the fresh
default; an explicit shared AV theme preference remains respected, and a
visible control switches light/dark without clearing application data. Existing
show context opens in a modal dialog so its controls do not cover mobile views.

The smallest slice changes presentation and keyboard access, with no new
dependencies, native console conversion, recommendations, audio playback,
deployment or physical-output work. The `ontrack_v1` saved shape, XML/text
parsers and version 1 JSON backup remain unchanged. Theme preference uses
the existing `av-theme-mode.v1` key.

## Acceptance

- First Tab reaches a visible skip link; activating it focuses the workspace.
- Track details, sorting and debrief track selection work with a keyboard.
- Dialog Escape and Tab containment work; closing restores track focus even
  after saving a note rerenders the library.
- Light/dark switching and reload preserve notes, tags, sets and imports.
- Desktop, 680px, narrow phone, landscape, short stress and ultrawide layouts keep the
  document within the viewport and every control reachable.
- JSON export/import and reload retain synthetic records; XML and text imports
  still populate the same model. Reduced motion and print remain usable.

Browser emulation does not establish physical phone keyboard, assistive
technology or operator acceptance. Production remains a separate delivery gate.

## Verification commands

Run `npm run test:ontrack-browser` against the checked-out source. The probe
uses disposable local records at 1440x900, 680x900, 375x812, 844x390,
320x256 and 3840x1080 in both themes. Set `CHROME_CHANNEL` or `CHROME_BIN`
when the runner supplies its own browser; `ONTRACK_OUTPUT` optionally saves
screenshots outside the repository. A 320x256 stress viewport does not prove
actual 400 percent browser zoom or physical keyboard behavior.

Also run `npm run verify:public-navigation`, `npm run verify:public-consistency`,
`npm run verify:av` and `npm run probe:import-xss -- --no-sandbox`.
The existing AV workspace pull-request workflow includes the OnTrack probe.
The static application needs no generated bundle or build step.
