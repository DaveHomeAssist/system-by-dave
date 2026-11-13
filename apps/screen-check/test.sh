#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
testdir="$(mktemp -d)"
trap 'rm -rf "$testdir"' EXIT
xcrun swiftc -swift-version 5 Sources/CheckCore.swift Tests/main.swift -o "$testdir/screen-check-tests"
"$testdir/screen-check-tests" Resources/show-profile.json
plutil -lint Resources/Info.plist Resources/com.systembydave.frozen-screen-check.plist
if rg 'CG(DisplaySet|ConfigureDisplay|CompleteDisplayConfiguration)|property\.set|URLSession' Sources; then
  printf 'Unexpected display mutation or network API in read-only checker.\n' >&2
  exit 1
fi
