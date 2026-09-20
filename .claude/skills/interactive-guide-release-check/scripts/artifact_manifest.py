#!/usr/bin/env python3
"""Create or verify a local distribution manifest. No browser, network, or deployment."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path, PurePosixPath


def inventory(directory):
    if directory.is_symlink():
        raise ValueError("Distribution root must not be a symlink")
    root = directory.resolve()
    if not root.is_dir():
        raise ValueError("Distribution root must be a directory")
    files = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Symlink is unsupported: {path.relative_to(root)}")
        if not path.is_file():
            continue
        digest = hashlib.sha256()
        size = 0
        with path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(block)
                size += len(block)
        name = path.relative_to(root).as_posix()
        files[name] = {"path": name, "size": size, "sha256": digest.hexdigest()}
    if not files:
        raise ValueError("Distribution directory contains no files")
    return files


def read_manifest(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("schema_version") != "1.0":
        raise ValueError("Unsupported manifest schema")
    for key in ("guide_id", "revision"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f"Manifest requires {key}")
    rows = data.get("files")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Manifest requires a nonempty files array")
    result = {}
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid manifest file record")
        name = row.get("path")
        if not isinstance(name, str) or not name or "\\" in name:
            raise ValueError("Invalid manifest path")
        part = PurePosixPath(name)
        if part.is_absolute() or ".." in part.parts or part.as_posix() != name or name in result:
            raise ValueError(f"Unsafe or duplicate manifest path: {name}")
        sha = row.get("sha256")
        if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{64}", sha):
            raise ValueError(f"Invalid SHA-256: {name}")
        if type(row.get("size")) is not int or row["size"] < 0:
            raise ValueError(f"Invalid file size: {name}")
        result[name] = row
    return data, result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create")
    create.add_argument("directory", type=Path)
    create.add_argument("--guide-id", required=True)
    create.add_argument("--revision", required=True)
    create.add_argument("--out", required=True, type=Path)
    verify = sub.add_parser("verify")
    verify.add_argument("directory", type=Path)
    verify.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.command == "create":
            if not args.guide_id.strip() or not args.revision.strip():
                raise ValueError("guide-id and revision must be nonempty")
            if args.out.is_symlink():
                raise ValueError("Manifest output must not be a symlink")
            root = args.directory.resolve()
            if args.out.resolve().is_relative_to(root):
                raise ValueError("Place the manifest outside the distribution directory")
            rows = inventory(args.directory)
            payload = {"schema_version": "1.0", "guide_id": args.guide_id,
                       "revision": args.revision, "files": list(rows.values())}
            args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
            print(json.dumps({"created": str(args.out), "file_count": len(rows)}))
            return 0
        data, expected = read_manifest(args.manifest)
        actual = inventory(args.directory)
        missing = sorted(expected.keys() - actual.keys())
        extra = sorted(actual.keys() - expected.keys())
        changed = sorted(name for name in expected.keys() & actual.keys()
                         if expected[name]["sha256"] != actual[name]["sha256"]
                         or expected[name]["size"] != actual[name]["size"])
        valid = not (missing or extra or changed)
        print(json.dumps({"valid": valid, "guide_id": data["guide_id"], "revision": data["revision"],
                          "missing": missing, "changed": changed, "extra": extra}, indent=2))
        return 0 if valid else 1
    except (OSError, ValueError) as exc:
        print(json.dumps({"valid": False, "error": str(exc)}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
