#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
build=$(mktemp -d "${TMPDIR:-/tmp}/envision-comparison-test.XXXXXX")
trap 'rm -rf "$build"' EXIT
xcrun swiftc -swift-version 5 -target arm64-apple-macos13.0 Sources/ComparisonStorage.swift Sources/StudioClient.swift Sources/Workspace.swift Tests/ComparisonChecks.swift -o "$build/compare-checks"
"$build/compare-checks" Resources/Comparison
