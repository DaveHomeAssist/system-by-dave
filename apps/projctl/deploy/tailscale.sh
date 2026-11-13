#!/usr/bin/env bash
# Expose the relay through Tailscale. serve = tailnet only (your devices). funnel = public internet (needs PJ_PASSCODE set).
# Usage: deploy/tailscale.sh serve|funnel|off [port]
set -euo pipefail
MODE="${1:-serve}"; PORT="${2:-8080}"
TS="$(command -v tailscale || echo /Applications/Tailscale.app/Contents/MacOS/Tailscale)"
[ -x "$TS" ] || { echo "Tailscale is not installed. https://tailscale.com/download"; exit 1; }
case "$MODE" in
  serve)  "$TS" serve --bg "http://127.0.0.1:$PORT"; echo "Tailnet only. URL:"; "$TS" serve status | head -3 ;;
  funnel) node "$(dirname "$0")/share-guard.js" "$PORT"
          "$TS" funnel --bg "http://127.0.0.1:$PORT"; echo "Public web UI only. Cue and projector ports are not published. URL:"; "$TS" funnel status | head -3 ;;
  off)    "$TS" serve reset; "$TS" funnel reset 2>/dev/null || true; echo "Serve and funnel off." ;;
  *) echo "usage: $0 serve|funnel|off [port]"; exit 1 ;;
esac
