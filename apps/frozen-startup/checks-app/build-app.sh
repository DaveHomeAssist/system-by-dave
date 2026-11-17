#!/bin/bash
# Build "Frozen Startup Checks.app" (ad-hoc signed, Apple Silicon) into the given directory.
set -euo pipefail
cd "$(dirname "$0")"
output="${1:?Provide a build output directory}"
app="$output/Frozen Startup Checks.app"
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources/web/fonts"
xcrun swiftc -swift-version 5 -O FrozenStartupChecks.swift -o "$app/Contents/MacOS/FrozenStartupChecks"
cp web/index.html web/app.js web/app.css web/base.css "$app/Contents/Resources/web/"
cp web/fonts/*.woff2 "$app/Contents/Resources/web/fonts/"
cp Info.plist "$app/Contents/Info.plist"
codesign --force --deep --sign - "$app"
codesign --verify --strict --deep "$app"
echo "$app"
