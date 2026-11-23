#!/usr/bin/env bash
# Private settings snapshot. No service changes, projector requests or automatic pruning.
set -euo pipefail
umask 077
APP="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_DEST="$APP/backups"
DATA="${PROJCTL_DATA:-$APP/data}"
LOG="$DATA/projctl.log"
SERVICE=""
if [ "$(uname)" = Darwin ] && [ "$APP" = "$HOME/Library/Application Support/Projctl/app" ]; then
  DATA="$HOME/Library/Application Support/Projctl/data"
  LOG="$HOME/Library/Application Support/Projctl/relay.log"
  DEFAULT_DEST="$HOME/Library/Application Support/Projctl/backups"
  SERVICE="$HOME/Library/LaunchAgents/com.avbydave.projctl.plist"
fi
DEST="${1:-$DEFAULT_DEST}"
python3 - "$DATA" "$DEST" "$LOG" "$SERVICE" <<'PY'
import datetime, hashlib, json, os, pathlib, shutil, sys, tempfile
source, dest, log = map(pathlib.Path, sys.argv[1:4])
service = pathlib.Path(sys.argv[4]) if sys.argv[4] else None
# Validate the authoritative file before creating a snapshot.
rig = json.loads((source / 'rig.json').read_text())
if not isinstance(rig, dict) or not all(isinstance(rig.get(k), list) for k in ('projectors', 'presets', 'events')):
    raise SystemExit('Saved rig is invalid. No backup created.')
dest.mkdir(parents=True, exist_ok=True, mode=0o700)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d_%H%M%S')
staging = pathlib.Path(tempfile.mkdtemp(prefix='.projctl-partial-', dir=dest))
files = {}
def copy_file(src, relative):
    if src.is_symlink() or not src.is_file():
        raise RuntimeError('Unexpected file type in backup source')
    target = staging / relative
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    data = src.read_bytes()
    target.write_bytes(data)
    target.chmod(0o600)
    digest = hashlib.sha256(data).hexdigest()
    if hashlib.sha256(target.read_bytes()).hexdigest() != digest:
        raise RuntimeError('Backup verification failed')
    files[str(relative)] = digest
for name in ('rig.json', 'stage-plot.json', 'venue', 'power-schedules.json', 'power-schedules.json.claims', 'health-reports.json', 'health-reports', 'software-checks.json'):
    item = source / name
    if item.is_symlink():
        raise SystemExit('Symlink in backup source. Private partial snapshot retained.')
    if not item.exists():
        continue
    if item.is_dir():
        for child in item.rglob('*'):
            if child.is_symlink():
                raise SystemExit('Symlink in backup source. Private partial snapshot retained.')
            if child.is_file():
                copy_file(child, child.relative_to(source))
    else:
        copy_file(item, pathlib.Path(name))
if log.exists():
    copy_file(log, pathlib.Path('relay.log'))
if service and service.exists():
    copy_file(service, pathlib.Path('service.plist'))
# A live snapshot preserves individual file bytes; a coordinated stopped snapshot is needed
# to establish a transaction across settings and scheduling claim files.
manifest = {'version': 1, 'kind': 'projctl-private-settings', 'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'consistency': 'live file snapshot', 'files': files}
(staging / 'BACKUP.json').write_text(json.dumps(manifest, indent=2) + '\n')
(staging / 'BACKUP.json').chmod(0o600)
final = dest / ('projctl-' + stamp + '-' + staging.name.rsplit('-', 1)[-1])
os.rename(staging, final)
print(f'Private backup verified: {final} ({len(files)} files). Keep it private and copy it off this host.')
PY
