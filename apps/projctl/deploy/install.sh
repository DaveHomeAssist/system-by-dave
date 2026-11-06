#!/usr/bin/env bash
# Install projctl as a service on the venue box. macOS (launchd) or Linux (systemd).
# Usage: deploy/install.sh [--passcode CODE] [--port 8080]
# Run from the projctl folder you want to install (this folder is copied to the install path).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PASSCODE=""; PORT=8080
while [ $# -gt 0 ]; do case "$1" in --passcode) PASSCODE="$2"; shift 2;; --port) PORT="$2"; shift 2;; *) echo "unknown arg $1"; exit 1;; esac; done
command -v node >/dev/null || { echo "node is not installed. macOS: brew install node. Debian/Pi: sudo apt install nodejs npm"; exit 1; }
NODE="$(command -v node)"
# Bundle before copying the app away from its canonical repository. A packaged
# standalone copy can refresh from its own runtime without a sibling checkout.
if [ -f "$HERE/../../ProjectorThrow/three-d-stage.js" ]; then
  (cd "$HERE" && npm run bundle:throwline)
elif [ -f "$HERE/runtime/throwline/three-d-stage.js" ]; then
  (cd "$HERE" && npm run bundle:throwline -- "$HERE/runtime/throwline")
else
  echo "Throwline runtime missing. Run npm run bundle:throwline in the source checkout before installing."
  exit 1
fi
if [ -z "$PASSCODE" ]; then read -r -s -p "Passcode for the web UI (blank = open, LAN only): " PASSCODE; echo; fi

if [ "$(uname)" = "Darwin" ]; then
  [ -f "$HERE/data/rig.json" ] || cp "$HERE/data/rig.example.json" "$HERE/data/rig.json"
  (cd "$HERE" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
  PJ_PASSCODE="$PASSCODE" PROJCTL_PORT="$PORT" node "$HERE/deploy/install-service.js" "$HERE"

else
  APP="/opt/projctl"; USER_NAME="${SUDO_USER:-$USER}"
  sudo mkdir -p "$APP"; sudo rsync -a --exclude node_modules --exclude '.git' "$HERE"/ "$APP"/; sudo chown -R "$USER_NAME" "$APP"
  (cd "$APP" && npm ci --omit=dev 2>/dev/null || npm install --omit=dev)
  [ -f "$APP/data/rig.json" ] || cp "$APP/data/rig.example.json" "$APP/data/rig.json"
  printf 'PORT=%s\nPJ_PASSCODE=%s\n' "$PORT" "$PASSCODE" > "$APP/data/projctl.env"; chmod 600 "$APP/data/projctl.env"
  sed -e "s#__NODE__#$NODE#g" -e "s#__APP__#$APP#g" -e "s#__USER__#$USER_NAME#g" "$HERE/deploy/projctl.service" | sudo tee /etc/systemd/system/projctl.service >/dev/null
  sudo systemctl daemon-reload; sudo systemctl enable --now projctl
  echo "projctl installed at $APP, running under systemd. Logs: journalctl -u projctl -f"
fi
echo "Open http://localhost:$PORT on this box. Then deploy/tailscale.sh serve to reach it from your phone."
