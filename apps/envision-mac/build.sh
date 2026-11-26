#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
output=${1:-dist}
mkdir -p "$output"
output=$(cd "$output" && pwd)
if ! mkdir "$output/.envision-build-lock"; then
  echo "Another build is using this destination." >&2
  exit 1
fi
stage=$(mktemp -d "$output/.envision-build.XXXXXX")
app="$stage/Envision Studio.app"
cleanup() {
  if [[ -d "$stage/previous.app" && ! -e "$output/Envision Studio.app" ]]; then
    mv "$stage/previous.app" "$output/Envision Studio.app"
  fi
  rm -rf "$stage"
  rmdir "$output/.envision-build-lock"
}
trap cleanup EXIT
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" "$stage/Envision.iconset"
cp Resources/Info.plist "$app/Contents/Info.plist"
cp Resources/Refraction.png "$app/Contents/Resources/"
cp -R Resources/Comparison "$app/Contents/Resources/"
revision=$(git rev-parse HEAD)
if [[ -n "$(git status --porcelain -- .)" ]]; then revision="$revision-dev"; fi
/usr/libexec/PlistBuddy -c "Add :EnvisionSourceRevision string $revision" "$app/Contents/Info.plist"
xcrun swiftc -swift-version 5 -Osize -target arm64-apple-macos13.0 Sources/*.swift -o "$app/Contents/MacOS/EnvisionStudio"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" Resources/Aperture.png --out "$stage/Envision.iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size*2))
  sips -z "$double" "$double" Resources/Aperture.png --out "$stage/Envision.iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$stage/Envision.iconset" -o "$app/Contents/Resources/Envision.icns"
codesign --force --options runtime --sign "${SIGNING_IDENTITY:--}" "$app"
codesign --verify --strict "$app"
version=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")
archive="Envision-Studio-$version-macOS-arm64.zip"
ditto -c -k --sequesterRsrc --keepParent "$app" "$stage/$archive"
mkdir "$stage/verify"
ditto -x -k "$stage/$archive" "$stage/verify"
codesign --verify --strict "$stage/verify/Envision Studio.app"
cmp "$app/Contents/MacOS/EnvisionStudio" "$stage/verify/Envision Studio.app/Contents/MacOS/EnvisionStudio"
if [[ -e "$output/Envision Studio.app" ]]; then
  test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$output/Envision Studio.app/Contents/Info.plist")" = "com.systembydave.envision.studio"
  mv "$output/Envision Studio.app" "$stage/previous.app"
fi
mv "$app" "$output/Envision Studio.app"
mv "$stage/$archive" "$output/$archive"
printf 'Source %s\n' "$revision"
shasum -a 256 "$output/$archive"
