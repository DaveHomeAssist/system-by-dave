#!/usr/bin/env python3
"""Validate the bundled normalized catalog contract; does not verify equipment facts."""
import argparse
import json
import sys
from pathlib import Path

CONFIDENCE = {"Confirmed", "Documented", "Reported", "Inferred", "Unknown", "Contradicted"}
GEOMETRY = {"measured", "photo_approximation", "illustrative", "unknown"}


def validate(data):
    errors = []
    if not isinstance(data, dict):
        return ["Catalog must be a JSON object"]
    for key in ("schema_version", "guide_id", "revision"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            errors.append(f"{key}: required nonempty string")
    if data.get("schema_version") != "1.0":
        errors.append("schema_version: supported value is 1.0")

    def index(key, id_key, required=False):
        rows = data.get(key, [])
        if not isinstance(rows, list):
            errors.append(f"{key}: expected array")
            return {}
        if required and not rows:
            errors.append(f"{key}: must not be empty")
        result = {}
        for i, row in enumerate(rows):
            if not isinstance(row, dict):
                errors.append(f"{key}[{i}]: expected object")
                continue
            identity = row.get(id_key)
            if not isinstance(identity, str) or not identity.strip():
                errors.append(f"{key}[{i}].{id_key}: required nonempty string")
            elif identity in result:
                errors.append(f"{key}: duplicate {id_key} {identity!r}")
            else:
                result[identity] = row
        return result

    sources = index("sources", "source_id")
    components = index("components", "component_id", required=True)
    views = index("views", "view_id")
    lessons = index("lessons", "lesson_id")

    def refs(row, key, targets, owner):
        values = row.get(key, [])
        if not isinstance(values, list):
            errors.append(f"{owner}.{key}: expected array")
            return []
        seen = set()
        for value in values:
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{owner}.{key}: reference must be nonempty string")
            elif value in seen:
                errors.append(f"{owner}.{key}: duplicate reference {value!r}")
            else:
                seen.add(value)
                if value not in targets:
                    errors.append(f"{owner}.{key}: unknown reference {value!r}")
        return values

    for sid, row in sources.items():
        for key in ("kind", "locator"):
            if not isinstance(row.get(key), str) or not row[key].strip():
                errors.append(f"source {sid}.{key}: required nonempty string")
    parents = {}
    for cid, row in components.items():
        for key in ("label", "kind"):
            if not isinstance(row.get(key), str) or not row[key].strip():
                errors.append(f"component {cid}.{key}: required nonempty string")
        confidence = row.get("confidence")
        if not isinstance(confidence, str) or confidence not in CONFIDENCE:
            errors.append(f"component {cid}: invalid confidence")
        geometry = row.get("geometry_status")
        if not isinstance(geometry, str) or geometry not in GEOMETRY:
            errors.append(f"component {cid}: invalid geometry_status")
        source_refs = refs(row, "source_ids", sources, cid)
        refs(row, "view_ids", views, cid)
        if confidence in ("Confirmed", "Documented", "Reported", "Inferred", "Contradicted") and not source_refs:
            errors.append(f"component {cid}: stated evidence requires source_ids")
        parent = row.get("parent_id")
        if parent is not None:
            if not isinstance(parent, str) or parent not in components:
                errors.append(f"component {cid}: unknown parent_id {parent!r}")
            else:
                parents[cid] = parent
    for cid in components:
        seen = set()
        current = cid
        while current in parents:
            if current in seen:
                errors.append(f"component {cid}: parent cycle")
                break
            seen.add(current)
            current = parents[current]
    for kind, rows in (("view", views), ("lesson", lessons)):
        for identity, row in rows.items():
            refs(row, "component_ids", components, f"{kind} {identity}")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("catalog", type=Path)
    args = parser.parse_args()
    try:
        errors = validate(json.loads(args.catalog.read_text(encoding="utf-8")))
    except (OSError, ValueError) as exc:
        print(json.dumps({"valid": False, "errors": [str(exc)]}))
        return 2
    print(json.dumps({"valid": not errors, "errors": errors}, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
