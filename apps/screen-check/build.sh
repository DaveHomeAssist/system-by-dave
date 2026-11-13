#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
output="${1:-dist}"
mkdir -p "$output"
output="$(cd "$output" && pwd)"
app="$output/Frozen Screen Check.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" "$app/Contents/Library/LaunchAgents"
xcrun swiftc -swift-version 5 -O -target arm64-apple-macos13.0 \
  Sources/CheckCore.swift Sources/MacDisplays.swift Sources/main.swift \
  -o "$app/Contents/MacOS/FrozenScreenCheck"
cp Resources/Info.plist "$app/Contents/Info.plist"
cp Resources/show-profile.json "$app/Contents/Resources/"
cp Resources/com.systembydave.frozen-screen-check.plist "$app/Contents/Library/LaunchAgents/"
iconset="$output/AppIcon.iconset"
mkdir -p "$iconset"
xcrun swift Resources/make-icon.swift "$output/icon-1024.png"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$output/icon-1024.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" "$output/icon-1024.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$app/Contents/Resources/AppIcon.icns"
revision="$(git rev-parse --short=12 HEAD)"
/usr/libexec/PlistBuddy -c "Add :SourceRevision string $revision" "$app/Contents/Info.plist"
# A caller supplies its own identity; no personal signing identity is committed.
if [[ "${SIGNING_IDENTITY:--}" == "-" ]]; then
  codesign --force --sign - "$app"
else
  codesign --force --options runtime --timestamp --sign "$SIGNING_IDENTITY" "$app"
fi
codesign --verify --strict --verbose=2 "$app"
cp QUICK-START.txt "$output/READ ME.txt"
ditto -c -k --keepParent "$app" "$output/Frozen-Screen-Check-1.0.0.zip"
if [[ -n "${NOTARY_PROFILE:-}" ]]; then
  xcrun notarytool submit "$output/Frozen-Screen-Check-1.0.0.zip" --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$app"
  xcrun stapler validate "$app"
  ditto -c -k --keepParent "$app" "$output/Frozen-Screen-Check-1.0.0.zip"
fi
shasum -a 256 "$output/Frozen-Screen-Check-1.0.0.zip"
printf '\nBuilt %s\n' "$app"
