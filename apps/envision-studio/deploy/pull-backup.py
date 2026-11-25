"""Owner-device daily backup. Runs independently of the GPU worker identity."""

import argparse
import datetime
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from backup import verify


def pull(origin, directory):
    directory.mkdir(parents=True, exist_ok=True)
    today = datetime.date.today().isoformat()
    dest = directory / f"envision-{today}.zip"
    if dest.exists():
        verify(dest)
        return dest
    reserve = 3 * 1024**3
    free = shutil.disk_usage(directory).free
    if free < reserve:
        raise ValueError("Backup volume needs 3 GiB of headroom.")
    with tempfile.TemporaryDirectory(dir=directory) as tmp:
        partial = Path(tmp) / "studio.zip"
        subprocess.run(
            [
                "curl.exe",
                "--disable",
                "--fail",
                "--silent",
                "--show-error",
                "--proto",
                "=https",
                "--max-filesize",
                str(free - reserve),
                "--max-time",
                "900",
                "--output",
                str(partial),
                origin.rstrip("/") + "/api/v1/owner-backup",
            ],
            check=True,
        )
        verify(partial)
        os.rename(partial, dest)
    # Only rotate self-named, dated, verified studio snapshots.
    copies = sorted(directory.glob("envision-????-??-??.zip"))
    for old in copies[:-7]:
        try:
            datetime.date.fromisoformat(old.stem.removeprefix("envision-"))
        except ValueError:
            continue
        old.unlink()
    return dest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    cfg = json.loads(parser.parse_args().config.read_text(encoding="utf-8-sig"))
    print(pull(cfg["origin"], Path(cfg["state"]).parent / "backups"))
