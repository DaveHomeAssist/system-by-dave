# Frozen Screen Check

A native, read-only macOS menu-bar verifier for the show's five display outputs.
It checks product identity before accepting a timing. A scaled desktop is not
accepted as proof of the signal resolution. See [the brief](BRIEF.md) and
[operator instructions](QUICK-START.txt).

## Run and install

Unzip the packaged app, move it to `/Applications` or `~/Applications`, and open
it. Enable at Login registers its bundled Aqua LaunchAgent through Apple's
`SMAppService`. The app shows the actual authorization status; if approval is
needed, Open Login Settings takes the operator there. Do this under the Studio's
production account. No administrator daemon or automatic login is installed.

Checks run on launch, on demand, and after macOS screen-change and wake events.
Startup waits 12 seconds; later events debounce for two seconds. There is no
continuous polling and no network access. Closing the window leaves its menu-bar
status visible. The on-demand instance and the login instance share a single
bundle identity. Quit does not disable future login launches.

Expected settings live in
`~/Library/Application Support/Frozen Screen Check/show-profile.json`. The
bundled profile is copied only when that file is absent. Invalid changes are
reported; the app never silently replaces them or falls back to a green result.
The latest report is saved atomically beside it. Export includes current display
handles, model IDs, display UUIDs and serial numbers when macOS provides them;
reports remain local until the operator shares one.

All four projector outputs require unscaled 1920×1200 near 60 Hz, and the operator
monitor requires unscaled 1920×1080 near 60 Hz. The seed profile is based on a
November 8, 2026 production readback, not on projector panel resolution. Recheck
the profile after a deliberate hardware or show change. The identical portal
models are one group with expected count two; runtime display IDs are never used
to invent stable A/D assignments. Unknown extra screens also require review.

## Build and verify

On macOS with Command Line Tools:

```sh
bash apps/screen-check/test.sh
bash apps/screen-check/build.sh
"apps/screen-check/dist/Frozen Screen Check.app/Contents/MacOS/FrozenScreenCheck" --check-json
```

The build is Apple Silicon, macOS 13+. `SIGNING_IDENTITY` optionally selects an
available Developer ID identity; otherwise the build is ad-hoc signed for local
development. Signing alone is not notarization. A distribution artifact should
be submitted using the owner's existing notary credentials and stapled before
sharing. Do not disable Gatekeeper or remove quarantine as an install step.
Zip SHA-256, signature and packaged-app acceptance are recorded per build.

CLI exit codes: 0 all expected settings match; 2 attention needed; 3 unable to
verify. `--profile path.json` selects an explicit profile for CLI checks. The CLI
does not create or replace a profile. This verifier deliberately has no set-mode
or automatic-repair command.

## Evidence limits

CoreGraphics reports what macOS configured. It does not establish that a dock or
extender forwarded the same timing, that a projector is receiving it, that the
shutter is open, or that Millumin has the correct mapping. Such checks belong to
the projector/control and playback tools. Check actual projector input readback
after correcting a signal issue.

Local tests cover saved-profile validation, identity/count, missing/extra outputs,
the observed 4K/1080 scaling failure, HiDPI, mirroring, inactivity, refresh and
JSON export. Studio installation, actual five-screen matching, login, reboot,
and disconnect/reconnect are separate acceptance checks and must be performed
on that Mac before claiming production acceptance.
