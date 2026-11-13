#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
output="${1:-dist}"
mkdir -p "$output"
output="$(cd "$output" && pwd)"
if [[ -n "${NOTARY_PROFILE:-}" && "${SIGNING_IDENTITY:--}" == "-" ]]; then
  printf 'NOTARY_PROFILE requires a Developer ID SIGNING_IDENTITY.\n' >&2
  exit 1
fi
if ! mkdir "$output/.build-lock" 2>/dev/null; then
  printf 'Build output is locked: %s/.build-lock\n' "$output" >&2
  exit 1
fi
staging=""
cleanup() {
  if [[ -n "$staging" && ! -e "$output/Frozen Screen Check.app" && -d "$staging/previous.app" ]]; then
    mv "$staging/previous.app" "$output/Frozen Screen Check.app"
  fi
  if [[ -n "$staging" ]]; then rm -rf "$staging"; fi
  rmdir "$output/.build-lock"
}
trap cleanup EXIT
staging="$(mktemp -d "$output/.screen-check-build.XXXXXX")"
app="$staging/Frozen Screen Check.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" "$app/Contents/Library/LaunchAgents"
xcrun swiftc -swift-version 5 -O -target arm64-apple-macos13.0 \
  Sources/*.swift \
  -o "$app/Contents/MacOS/FrozenScreenCheck"
cp Resources/Info.plist "$app/Contents/Info.plist"
cp Resources/show-profile.json "$app/Contents/Resources/"
cp Resources/com.systembydave.frozen-screen-check.plist "$app/Contents/Library/LaunchAgents/"
cp QUICK-START.txt "$app/Contents/Resources/QUICK-START.txt"
iconset="$staging/AppIcon.iconset"
mkdir -p "$iconset"
xcrun swift Resources/make-icon.swift "$staging/icon-1024.png"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$staging/icon-1024.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" "$staging/icon-1024.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$app/Contents/Resources/AppIcon.icns"
revision="$(git rev-parse --short=12 HEAD)"
if [[ -n "$(git status --porcelain -- Sources Resources build.sh QUICK-START.txt)" ]]; then revision="$revision-dirty"; fi
/usr/libexec/PlistBuddy -c "Add :SourceRevision string $revision" "$app/Contents/Info.plist"
# A caller supplies its own identity; no personal signing identity is committed.
if [[ "${SIGNING_IDENTITY:--}" == "-" ]]; then
  codesign --force --sign - "$app"
else
  codesign --force --options runtime --timestamp --sign "$SIGNING_IDENTITY" "$app"
fi
codesign --verify --strict --verbose=2 "$app"
version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")"
archive="$staging/Frozen-Screen-Check-$version.zip"
ditto -c -k --keepParent "$app" "$archive"
if [[ -n "${NOTARY_PROFILE:-}" ]]; then
  xcrun notarytool submit "$archive" --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$app"
  xcrun stapler validate "$app"
  ditto -c -k --keepParent "$app" "$archive"
fi
bash verify-package.sh "$archive"
{
  printf 'Frozen Screen Check %s\nSource revision: %s\nTarget: arm64-apple-macos13.0\n' "$version" "$revision"
  xcrun swiftc --version 2>&1
  printf 'Build SDK: '; xcrun --show-sdk-version
  shasum -a 256 "$archive" | sed "s|$staging/||"
} > "$staging/BUILD-MANIFEST.txt"
# Replace only after compilation, signing and the extracted-package gate pass.
if [[ -e "$output/Frozen Screen Check.app" ]]; then mv "$output/Frozen Screen Check.app" "$staging/previous.app"; fi
mv "$app" "$output/Frozen Screen Check.app"
mv "$archive" "$output/Frozen-Screen-Check-$version.zip"
mv "$staging/BUILD-MANIFEST.txt" "$output/BUILD-MANIFEST.txt"
cp QUICK-START.txt "$output/READ ME.txt"
cat "$output/BUILD-MANIFEST.txt"
printf '\nBuilt %s\n' "$output/Frozen Screen Check.app"
