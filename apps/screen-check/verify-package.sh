#!/bin/bash
set -euo pipefail
if [[ $# -ne 1 || ! -f "$1" ]]; then
  printf 'Usage: bash verify-package.sh /path/to/Frozen-Screen-Check-version.zip\n' >&2
  exit 1
fi
archive="$1"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
# The artifact must contain exactly the app tree, without traversal paths.
unzip -Z1 "$archive" > "$scratch/entries"
if grep -Ev '^Frozen Screen Check\.app(/|$)' "$scratch/entries" || grep -E '(^|/)\.\.(/|$)' "$scratch/entries"; then
  printf 'Unexpected archive path.\n' >&2; exit 1
fi
ditto -x -k "$archive" "$scratch"
app="$scratch/Frozen Screen Check.app"
info="$app/Contents/Info.plist"
binary="$app/Contents/MacOS/FrozenScreenCheck"
helper="$app/Contents/Library/LaunchAgents/com.systembydave.frozen-screen-check.plist"
codesign --verify --strict "$app"
[[ "$(lipo -archs "$binary")" == "arm64" ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print :LSMinimumSystemVersion' "$info")" == "13.0" ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$info")" == "com.systembydave.frozen-screen-check" ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print :BundleProgram' "$helper")" == "Contents/MacOS/FrozenScreenCheck" ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print :ProgramArguments:1' "$helper")" == "--login" ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print :LimitLoadToSessionType' "$helper")" == "Aqua" ]]
[[ -n "$(/usr/libexec/PlistBuddy -c 'Print :SourceRevision' "$info")" ]]
test -s "$app/Contents/Resources/show-profile.json"
test -s "$app/Contents/Resources/QUICK-START.txt"
plutil -lint "$info" "$helper" >/dev/null
code=0
"$binary" --check-json --profile "$scratch/absent.json" > "$scratch/out" 2> "$scratch/error" || code=$?
[[ "$code" == 3 && ! -s "$scratch/out" && -s "$scratch/error" ]]
if [[ "${REQUIRE_NOTARIZED:-0}" == 1 ]]; then
  [[ "$(/usr/libexec/PlistBuddy -c 'Print :SourceRevision' "$info")" != *-dirty ]]
  xcrun stapler validate "$app"
  spctl --assess --type execute --verbose=2 "$app"
fi
printf 'PASS: extracted package integrity and CLI contract (notarization required: %s)\n' "${REQUIRE_NOTARIZED:-0}"
