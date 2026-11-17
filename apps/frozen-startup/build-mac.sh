#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
output="${1:?Provide a build output directory}"
mkdir -p "$output"
xcrun swiftc -swift-version 5 mac-displays.swift -o "$output/mac-displays"
codesign --force --sign - "$output/mac-displays"
codesign --verify --strict "$output/mac-displays"
"$output/mac-displays" > "$output/build-host-displays.json"
