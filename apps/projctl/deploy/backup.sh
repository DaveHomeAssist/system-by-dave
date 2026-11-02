#!/usr/bin/env bash
# Nightly copy of the rig file, presets and log to a dated folder. Point DEST at a synced folder or a repo checkout.
# Cron example (02:00): 0 2 * * * /opt/projctl/deploy/backup.sh /home/pi/projctl-backups
set -euo pipefail
APP="$(cd "$(dirname "$0")/.." && pwd)"; DEST="${1:-$APP/backups}"
STAMP="$(date +%Y-%m-%d_%H%M)"; mkdir -p "$DEST/$STAMP"
cp "$APP/data/rig.json" "$DEST/$STAMP/rig.json"
[ -f "$APP/data/projctl.log" ] && cp "$APP/data/projctl.log" "$DEST/$STAMP/projctl.log"
python3 - "$APP/data/rig.json" "$DEST/$STAMP/rig.nocreds.json" <<'PY' 2>/dev/null || true
import json,sys
d=json.load(open(sys.argv[1]))
for p in d['projectors']: p.pop('password',None)
json.dump(d,open(sys.argv[2],'w'),indent=2)
PY
ls -dt "$DEST"/*/ | tail -n +31 | xargs -r rm -rf   # keep 30 snapshots
echo "backup written to $DEST/$STAMP"
