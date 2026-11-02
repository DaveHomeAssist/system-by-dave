#!/usr/bin/env bash
# Remove the projctl service (keeps the app folder and data so you can archive them first).
set -euo pipefail
if [ "$(uname)" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/com.avbydave.projctl.plist"
  launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true; rm -f "$PLIST"
  echo "LaunchAgent removed. App folder left at $HOME/projctl (delete it after backing up data/)."
else
  sudo systemctl disable --now projctl 2>/dev/null || true; sudo rm -f /etc/systemd/system/projctl.service; sudo systemctl daemon-reload
  echo "systemd unit removed. App folder left at /opt/projctl (delete it after backing up data/)."
fi
command -v tailscale >/dev/null && { tailscale serve reset 2>/dev/null || true; tailscale funnel reset 2>/dev/null || true; echo "Tailscale serve/funnel reset."; }
