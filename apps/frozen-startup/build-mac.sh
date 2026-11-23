#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
output="${1:?Provide a build output directory}"
mkdir -p "$output"
# Target macOS 14 explicitly. Without -target the tool requires the build host's macOS version or newer.
xcrun swiftc -swift-version 5 -target arm64-apple-macos14.0 mac-displays.swift -o "$output/mac-displays"
xcrun vtool -show-build "$output/mac-displays" | grep -q "minos 14.0"
codesign --force --sign - "$output/mac-displays"
codesign --verify --strict "$output/mac-displays"
"$output/mac-displays" > "$output/build-host-displays.json"
