"""Consistent catalog/media snapshot and verified restore into a new directory."""

import argparse
import hashlib
import json
import os
import re
import shutil
import sqlite3
import tempfile
import zipfile
from contextlib import closing
from pathlib import Path


def digest(file):
    h = hashlib.sha256()
    for b in iter(lambda: file.read(1024 * 1024), b""):
        h.update(b)
    return h.hexdigest()


def snapshot(root, dest):
    with tempfile.TemporaryDirectory(dir=dest.parent) as tmp:
        db = Path(tmp) / "studio.sqlite"
        with (
            closing(sqlite3.connect(root / "studio.sqlite")) as source,
            closing(sqlite3.connect(db)) as saved,
        ):
            source.backup(saved)
            saved.execute("DELETE FROM workers")
            saved.execute(
                "UPDATE jobs SET state='queued',lease=NULL,expires=NULL,worker=NULL WHERE state='running'"
            )
            saved.execute("UPDATE jobs SET lease=NULL,expires=NULL")
            saved.execute("UPDATE exports SET state='queued' WHERE state='running'")
            saved.commit()
            saved.execute("PRAGMA journal_mode=DELETE")
            saved.execute("VACUUM")
            hashes = [r[0] for r in saved.execute("SELECT hash FROM media ORDER BY hash")]
        paths = {h: root / "media" / h for h in hashes}
        size = db.stat().st_size + sum(p.stat().st_size for p in paths.values())
        if shutil.disk_usage(dest.parent).free < size + 512 * 1024**2:
            raise ValueError("Free space for a complete backup first.")
        with db.open("rb") as f:
            db_hash = digest(f)
        with zipfile.ZipFile(dest, "w", zipfile.ZIP_STORED, allowZip64=True) as z:
            z.writestr(
                "backup.json",
                json.dumps(
                    {"format": "envision-backup-1", "dbSha256": db_hash, "mediaCount": len(hashes)}
                ),
            )
            z.write(db, "studio.sqlite")
            for h, p in paths.items():
                z.write(p, "media/" + h)


def verify(archive, destination=None):
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if len(names) != len(set(names)) or not all(
            n in ("backup.json", "studio.sqlite") or re.fullmatch(r"media/[0-9a-f]{64}", n)
            for n in names
        ):
            raise ValueError("Unexpected backup entries.")
        if z.getinfo("backup.json").file_size > 16384:
            raise ValueError("Invalid backup manifest.")
        meta = json.loads(z.read("backup.json"))
        if meta.get("format") != "envision-backup-1":
            raise ValueError("Unsupported backup.")
        hashes = {n[6:] for n in names if n.startswith("media/")}
        if len(hashes) != meta["mediaCount"]:
            raise ValueError("Incomplete backup.")
        for name in ["studio.sqlite", *sorted(n for n in names if n.startswith("media/"))]:
            with z.open(name) as inp:
                if digest(inp) != (meta["dbSha256"] if name == "studio.sqlite" else name[6:]):
                    raise ValueError("Backup checksum mismatch.")
        if destination:
            target = Path(destination)
            if target.exists():
                raise ValueError("Restore requires a new destination directory.")
            if (
                shutil.disk_usage(target.parent).free
                < sum(i.file_size for i in z.infolist()) + 512 * 1024**2
            ):
                raise ValueError("Insufficient restore space.")
            with tempfile.TemporaryDirectory(dir=target.parent) as tmp:
                staged = Path(tmp) / "restored"
                (staged / "media").mkdir(parents=True)
                for name in names:
                    if name == "backup.json":
                        continue
                    with z.open(name) as src, (staged / name).open("xb") as dst:
                        shutil.copyfileobj(src, dst)
                with closing(sqlite3.connect(staged / "studio.sqlite")) as c:
                    if c.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                        raise ValueError("Catalog is damaged.")
                    if {r[0] for r in c.execute("SELECT hash FROM media")} != hashes:
                        raise ValueError("Catalog media mismatch.")
                os.rename(staged, target)
        return meta


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("archive", type=Path)
    p.add_argument("--restore", type=Path)
    args = p.parse_args()
    print(json.dumps(verify(args.archive, args.restore)))
