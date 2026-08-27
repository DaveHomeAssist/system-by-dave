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
