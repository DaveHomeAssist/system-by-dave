#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
    printf '%s\n' 'Python 3 is required. This launcher does not install software.'
    exit 1
fi
python3 suite.py menu
