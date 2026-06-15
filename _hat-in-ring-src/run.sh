#!/usr/bin/env bash
# Convenience runner. Loads .env if present, then runs the full pipeline.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a
python3 -m hatring.pipeline --all "$@"
