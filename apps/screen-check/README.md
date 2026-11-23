# Frozen Screen Check

A native, read-only macOS menu-bar verifier for the show's five display outputs.
It checks product identity before accepting a timing. A scaled desktop is not
accepted as proof of the signal resolution. See [the brief](BRIEF.md) and
[operator instructions](QUICK-START.txt).

## Run and install

Unzip the packaged app, move it to `/Applications` or `~/Applications`, and open
it. For an upgrade, first Quit Screen Check from its menu, replace the app, then
reopen it. Your existing profile is retained. Enable at Login registers its bundled Aqua LaunchAgent through Apple's
`SMAppService`. The app shows the actual authorization status; if approval is
needed, Open Login Settings takes the operator there. Do this under the Studio's
production account. No administrator daemon or automatic login is installed.

Checks run on launch, on demand, and after macOS screen-change and wake events.
Startup waits 12 seconds; later events debounce for two seconds, with a six-second
maximum postponement during a continuous event burst. Reads require
two matching snapshots, with bounded retries while connections change. There is no
continuous polling and no network access. Closing the window leaves its menu-bar
status visible. The on-demand and login instances share an OS-held file lock;
a second manual launch requests the existing checklist. A crash releases the
lock without deleting a PID file. Quit does not disable future login launches.

Expected settings live in
`~/Library/Application Support/Frozen Screen Check/show-profile.json`. The
bundled profile is copied only when that file is absent. Invalid changes are
reported; the app never silently replaces them or falls back to a green result.
The profile must be a regular JSON file no larger than 256 KB. The latest report
is saved atomically beside it. A failed report save preserves valid current
readings with a separate warning; an existing saved report can be older, so its
timestamp matters. Export reads the screens again after the Save dialog closes
and will not overwrite the show profile. Export includes current display
handles, model IDs, display UUIDs and serial numbers when macOS provides them;
reports remain local until the operator shares one. New reports and replacements
are created with owner-only file permissions before any content is written.
Files already exported by older versions retain their existing permissions.
Named pipes and directories cannot be loaded as profiles; a symlink to a regular
profile remains supported. The loader validates the opened file descriptor.

All four projector outputs require unscaled, progressive 1920×1200 near 60 Hz, and the operator
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
bash apps/screen-check/verify-package.sh apps/screen-check/dist/Frozen-Screen-Check-1.0.2.zip
"apps/screen-check/dist/Frozen Screen Check.app/Contents/MacOS/FrozenScreenCheck" --check-json
```

The build is Apple Silicon, macOS 13+. `SIGNING_IDENTITY` optionally selects an
available Developer ID identity; otherwise the build is ad-hoc signed for local
development. Signing alone is not notarization. A distribution artifact should
be submitted using the owner's existing notary credentials and stapled before
sharing. Do not disable Gatekeeper or remove quarantine as an install step.
Zip SHA-256, signature and packaged-app acceptance are recorded per build.
The build stages a clean bundle before replacing its output, so deleted resources
do not survive repeated builds. `BUILD-MANIFEST.txt` records source, Swift version,
SDK, target and archive checksum. A per-output lock rejects overlapping builds.
CI rebuilds with an obsolete-resource fixture and checks that it is removed.

The extracted-package gate verifies signature integrity, architecture, metadata,
bundled profile/instructions, login helper and a failing CLI invocation. Set
`REQUIRE_NOTARIZED=1` when running it on a release candidate to require stapling,
Gatekeeper acceptance and a clean source revision. Development CI is not a
notarization or installed-app acceptance result. The declared deployment target
is macOS 13; CI uses macOS 15. Minimum-version runtime acceptance must be recorded
separately. No third-party runtime packages are required.

CLI exit codes: 0 all expected settings match; 2 attention needed; 3 unable to
verify. `--profile path.json` selects an explicit profile for CLI checks. The CLI
rejects missing paths, unknown flags, duplicate flags and conflicting modes; it
never silently falls back after a malformed invocation. It does not create or
replace a profile. This verifier deliberately has no set-mode
or automatic-repair command.

## Maintainer map

| File | Responsibility |
| --- | --- |
| `Sources/CheckCore.swift` | Profile types, pure evaluation, bounded snapshot/debounce rules, presentation labels and CLI parsing |
| `Sources/MacDisplays.swift` | Read-only AppKit/CoreGraphics/IOKit observations; called on the main thread |
| `Sources/FileStore.swift` | Descriptor-validated profile loading, private atomic reports, session result/recovery and instance lock |
| `Sources/CheckModel.swift` | Observable UI state, injected verification session, event scheduling, login actions and export flow |
| `Sources/AppEnvironment.swift` | Bundle resources and app-owned locations |
| `Sources/main.swift` | SwiftUI views, AppKit application lifecycle, menu and existing-window activation |

`test.sh` runs both pure/file fixtures and injected model transitions without
writing the production profile or changing displays. UI rows expose their name,
status, target and issues as one accessibility element; unknown is distinct from
missing. Command-R checks, Command-E exports, and Command-comma opens the profile.
See the [operator troubleshooting card](TROUBLESHOOTING.md) and
[ten-area review](REVIEW-2026-11-13.md) for evidence and remaining acceptance work.

## Evidence limits

CoreGraphics reports what macOS configured. It does not establish that a dock or
extender forwarded the same timing, that a projector is receiving it, that the
shutter is open, or that Millumin has the correct mapping. Such checks belong to
the projector/control and playback tools. Check actual projector input readback
after correcting a signal issue.

An EDID emulator can keep the Mac's display connected while the projector is
off or its downstream cable is unplugged. Product IDs also cannot distinguish
two identical projectors, and this profile does not validate screen arrangement,
rotation or optical orientation. Those remain separate show checks.

## Edge-case review, 1.0.1

Reproduced on the 1.0.0 code with controlled local fixtures: a report-write error
discarded successful readings; a display change during the Save dialog could
export an older passing result; repeated display IDs could satisfy the two-unit
portal count; and a missing CLI profile path selected the default profile.
These now have regression coverage and are fixed.

Additional guards cover the OS truncating a full display-ID buffer, connections
or modes changing during a read, interlaced/stretched modes, absent scan flags,
oversized profiles and accidental export over the profile. The display reader
uses the [documented list capacity contract](https://developer.apple.com/documentation/coregraphics/cggetonlinedisplaylist(_:_:_:))
and I/O Kit mode flags; no live display setting needs to change for these tests.

Local tests cover saved-profile validation, identity/count, missing/extra outputs,
the observed 4K/1080 scaling failure, HiDPI, mirroring, inactivity, refresh,
progressive modes, read consistency, persistence failures and fresh JSON export.
Studio installation, actual five-screen matching, login, reboot,
and disconnect/reconnect are separate acceptance checks and must be performed
on that Mac before claiming production acceptance.
