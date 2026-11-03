#!/bin/bash
# Delivered beside the app source. Update code/model only; never copy a rig.
set -euo pipefail
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SOURCE_DIR/server/index.js" ]; then
  echo 'Use this launcher from a packaged Projctl update folder.'; exit 1
fi
TARGET_DIR="${PROJCTL_UPDATE_TARGET:-$HOME/Desktop/projctl}"
if [ ! -f "$TARGET_DIR/server/index.js" ]; then
  echo "Existing Projctl not found at $TARGET_DIR. No files changed."
  echo 'Move your existing projctl folder to Desktop, then run this update again.'; exit 1
fi
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
if [ "$TARGET_DIR" = "$SOURCE_DIR" ]; then echo 'This is the update folder, not your existing installation.'; exit 1; fi
if command -v lsof >/dev/null && lsof -nP -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
  echo 'Stop the existing relay with Stop Projctl first, then reopen this update.'
  echo 'No files changed.'; exit 1
fi
command -v npm >/dev/null || { echo 'Node/npm is required, as for the existing relay.'; exit 1; }
# Resolve/install the packaged dependency before changing the installed code.
(cd "$SOURCE_DIR" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
BACKUP_DIR="$(mktemp -d "${TARGET_DIR}.backup-XXXXXXXX")"
chmod 700 "$BACKUP_DIR"
for item in server public runtime scripts docs package.json package-lock.json README.md DELIVERY.json node_modules; do
  [ ! -e "$TARGET_DIR/$item" ] || cp -Rp "$TARGET_DIR/$item" "$BACKUP_DIR/"
done
if [ -d "$TARGET_DIR/data" ]; then cp -Rp "$TARGET_DIR/data" "$BACKUP_DIR/"; fi
for item in server public runtime scripts docs package.json package-lock.json README.md DELIVERY.json node_modules; do
  [ ! -e "$SOURCE_DIR/$item" ] || cp -Rp "$SOURCE_DIR/$item" "$TARGET_DIR/"
done
if [ -d "$SOURCE_DIR/data/venue" ]; then
  mkdir -p "$TARGET_DIR/data"
  cp -Rp "$SOURCE_DIR/data/venue" "$TARGET_DIR/data/"
fi
echo "Updated $TARGET_DIR"
echo "Backup: $BACKUP_DIR"
echo 'Rig settings, presets, stage plot and existing launchers were preserved.'
echo 'Start Projctl using your existing launcher, then reload the browser and open Stage → Building.'
