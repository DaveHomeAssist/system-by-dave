# Local Millumin acceptance

November 15, 2026. Millumin 5.14.l on the development Mac, using a disposable
copy of an existing four-canvas project. Studio remained disconnected.

- Read actual AXDocument path and verified saved-file hash.
- Selected each canvas row through Accessibility and read its display popup.
- Detected A assigned to the built-in screen and B/C/D unassigned.
- Closed the disposable document, reopened it through the adapter and verified
  the same path. Positioned the control window at 40,40 and read it back.
- Tested fullscreen off, on and off again. ON required a visible Millumin-owned
  layer-1000 window covering the assigned screen. OFF had no matching window.
- Enabled Fullscreen with every canvas unassigned. Verification stayed false.
- Preserved the source project. Changes were confined to the disposable copy.

The local license is trial-expired, so its output watermark is expected.
This establishes local API/UI integration on one attached display. It does not
establish Studio permissions, five-display recovery, cue behavior or physical
projector acceptance. Native parsing intentionally rejects unsupported
multi-output canvas layouts and ambiguous display names.
