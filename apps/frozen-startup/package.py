#!/usr/bin/env python3
"""Build a deterministic, explicit-allowlist offline source package."""
import hashlib
from pathlib import Path
import sys
import zipfile

FILES = ('startup.py', 'README.md', 'BRIEF.md', 'test_startup.py',
         'example-profile.json', 'example-snapshot.json', 'package.py',
         'mac_bridge.py', 'mac-displays.swift', 'millumin-readback.js', 'test_mac_bridge.py', 'build-mac.sh', 'LOCAL-ACCEPTANCE.md')


def build(destination, native=None):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / 'Frozen-Startup-0.3.0.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as out:
        for name in FILES:
            entry = zipfile.ZipInfo('Frozen Startup/' + name, date_time=(2026, 11, 15, 0, 0, 0))
            entry.external_attr = (0o100755 if name in ('mac_bridge.py', 'build-mac.sh', 'LOCAL-ACCEPTANCE.md') else 0o100644) << 16
            out.writestr(entry, Path(__file__).with_name(name).read_bytes())
        if native is not None:
            entry = zipfile.ZipInfo('Frozen Startup/mac-displays', date_time=(2026, 11, 15, 0, 0, 0))
            entry.external_attr = 0o100755 << 16
            out.writestr(entry, Path(native).read_bytes())
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix('.zip.sha256').write_text(checksum + '  ' + archive.name + '\n')
    with zipfile.ZipFile(archive) as source:
        if source.testzip() is not None:
            raise RuntimeError('Package integrity check failed.')
    print(checksum, archive)


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
