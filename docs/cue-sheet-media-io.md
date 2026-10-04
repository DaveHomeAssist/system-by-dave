# Cue Sheet Media I/O

Cue Sheet is the browser-native rundown and lightweight layered playback surface in System by Dave. It adds Preview, Program, four playback layers, local media, live browser inputs, and a separate output window without claiming to be the separate CueForge Electron application.

## Supported inputs

| Input | Cue Sheet path | Boundary |
| --- | --- | --- |
| Local video, audio, or image | Quick add a matching cue, then attach the file | The file and object URL last for the current browser session. The cue metadata persists, but the operator must reconnect the file after reload. |
| UVC capture card | Detect Inputs, choose the video and optional audio device, then Connect Input | Requires HTTPS or localhost, browser permission, and a capture device that appears through `MediaDevices`. |
| NDI Virtual Input / Webcam Input | Select the NDI-created virtual camera under Capture card / virtual input | The NDI desktop tool performs native NDI receive and exposes a browser camera. Cue Sheet does not decode native NDI packets. |
| NDI gateway | Attach the gateway's browser-playable HTTPS media URL | The gateway must emit a format the current browser can play. Native HLS support varies; a raw `ndi://` address is not supported. |
| Text or color | Quick add Text or Color | Generated locally and available immediately without a file. |

## Program monitoring

Open Program Window creates a same-origin output window and mirrors every visible live layer, including opacity and mute state. When the Screen Details API is available and permission is granted, Detect Displays lists the attached displays and Cue Sheet opens the window at the selected display's available bounds. Otherwise the operator opens the window and drags it to the required monitor.

Browser and operating-system window policy remains authoritative. Popups must be allowed, and the operator may still need to enter fullscreen from the output display.

## Playback and persistence

- Cue rows, layer settings, active layer assignments, search/filter state, and timeline focus mode remain under `cueSheet.v1` for backward-compatible browser storage.
- JSON export uses `system-by-dave.cue-sheet.v2` and includes layers and active assignments. Cue Sheet continues to import older row-only exports, including the historical `system-by-dave.cueforge.v1` format.

## Product boundary

- **Cue Sheet** is this browser tool at `/cue-sheet.html`, registered as `cue-sheet`, with browser state under `cueSheet.v1`.
- **CueForge** is a separate private Electron desktop application with its own runtime, engine, and hardware integrations.
- `/cueforge.html` is a noindex boundary notice and must not redirect to Cue Sheet.
- Local file objects, capture streams, and device permission are deliberately not serialized.
- Preview audio starts only from an operator action and follows the Preview mute and level controls. Each Program layer has an independent mute state.

## Verification boundary

The automated probe validates media attachment with local PNG and WAV fixtures, Preview and Program rendering, audible preview state, layer persistence, timeline focus, responsive containment, accessible names/targets, and contrast. Physical capture-card signal, real NDI software or gateway output, popup policy, display placement, and the final audio path must be checked with the show computer and venue hardware.

## Viewport operation

Setup, Edit and Operate are focused tasks. Edit tools, quick add, Preview, Program, Playback, Connections, Layers, On deck and Status keep their original controls and handlers. Operate keeps current program cue details, the next cue and the Go Live / Take Next Cue controls available together. Ultrawide operation adds Preview and Program alongside those controls. The compact task selector is at the bottom on phones.

Switching tasks changes visibility without replacing media nodes or writing the cue document. The existing F/Expand Timeline preference still selects the Edit workspace; Escape restores Operate. Theme choice is explicit and persists independently of cue documents. Print expands task pages and complete field values. No local file, stream or document migration is introduced.

Run `node scripts/probe_cue_viewport.cjs` against a checkout on port 4179, and repeat with `VIEWPORT_BROWSER=webkit`; `VIEWPORT_BASE` selects another origin. The probe uses synthetic silence and `scripts/fixtures/viewport-blue.mp4` (12 seconds of blue video and silent audio, generated with FFmpeg) to verify media continuity, output-window content, export/import, save/reload, shortcuts and print. Hardware capture, real NDI, external display placement and venue audio remain physical acceptance checks. The reusable checker uses `scripts/viewport_cue_adapter.cjs`.
