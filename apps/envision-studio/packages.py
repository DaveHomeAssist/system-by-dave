"""Portable, versioned projects and export bundles."""

import hashlib
import io
import json
import re
import zipfile

from layout import FONT, validate
from store import need, pack, string, uid

LIMIT = 96 * 1024 * 1024


def stem(name, limit=95):
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "-", name).strip()[:limit].rstrip(". ") or "Envision"
    return (
        "_" + name
        if re.match(r"^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)", name, re.I)
        else name
    )


def bundle(files):
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=1) as z:
        for name, data in files.items():
            z.writestr(name, data)
    return out.getvalue()


def portable(store, c, p):
    pid = p["id"]
    versions = []
    hashes = set()

    def collect(value):
        if isinstance(value, dict):
            for val in value.values():
                collect(val)
        elif isinstance(value, list):
            for val in value:
                collect(val)
        elif isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value):
            if c.execute("SELECT 1 FROM links WHERE project=? AND hash=?", (pid, value)).fetchone():
                hashes.add(value)

    collect(p["data"])
    for row in c.execute("SELECT * FROM versions WHERE project=? ORDER BY created", (pid,)):
        v = dict(row)
        v["recipe"] = json.loads(v["recipe"])
        versions.append(v)
        hashes.add(v["hash"])
        collect(v["recipe"])
    files = {}
    size = 0
    for h in hashes:
        path = store.media / h
        size += path.stat().st_size
        need(size < LIMIT - 2_000_000, "This project exceeds the portable package budget.", 422)
        files["media/" + h] = path.read_bytes()
    files["manifest.json"] = pack(
        {
            "format": "envision-project-1",
            "data": p["data"],
            "versions": versions,
            "fontSha256": hashlib.sha256(FONT.read_bytes()).hexdigest(),
        }
    ).encode()
    files["fonts/DejaVuSans-Bold.ttf"] = FONT.read_bytes()
    license_file = FONT.parents[3] / "doc" / "fonts-dejavu-core" / "copyright"
    if license_file.is_file():
        files["fonts/LICENSE"] = license_file.read_bytes()
    return bundle(files)


def restore(store, c, pid, raw):
    need(len(raw) <= LIMIT, "Package is too large.")
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            infos = z.infolist()
            names = [i.filename for i in infos]
            need(
                len(infos) <= 512
                and len(names) == len(set(names))
                and sum(i.file_size for i in infos) <= LIMIT,
                "Invalid or oversized package.",
            )
            need(
                all(
                    n in {"manifest.json", "fonts/DejaVuSans-Bold.ttf", "fonts/LICENSE"}
                    or re.fullmatch(r"media/[a-f0-9]{64}", n)
                    for n in names
                ),
                "Unexpected archive entry.",
            )
            m = json.loads(z.read("manifest.json"))
            need(
                isinstance(m, dict) and m.get("format") == "envision-project-1",
                "Unsupported project format.",
            )
            font_hash = hashlib.sha256(FONT.read_bytes()).hexdigest()
            need(
                m.get("fontSha256") == font_hash
                and hashlib.sha256(z.read("fonts/DejaVuSans-Bold.ttf")).hexdigest() == font_hash,
                "Project requires a different renderer font.",
                422,
            )
            source_files = {s["importFile"]["hash"] for s in m["data"]["stages"] if "importFile" in s}
            for n in names:
                if n.startswith("media/"):
                    data = z.read(n)
                    need(hashlib.sha256(data).hexdigest() == n[6:], "Media checksum failed.")
                    if n[6:] in source_files:
                        original = json.loads(data)
                        need(isinstance(original, dict) and original.get("format") in
                             ("nnc-layout-1", "envision-brief-1"), "Unknown imported source.")
                        store.blob(c, pid, data, "application/json")
                    else:
                        store.image(c, pid, data)
            versions = m["versions"]
            need(isinstance(versions, list) and len(versions) <= 500, "Invalid version list.")
            old_ids = [v["id"] for v in versions]
            need(len(set(old_ids)) == len(old_ids), "Duplicate artwork version.")
            ids = {key: uid() for key in old_ids}
            for v in versions:
                store.owned(c, pid, v["hash"])
                parent = v.get("parent")
                need(not parent or parent in ids, "Missing parent artwork.")
                recipe = v["recipe"]
                need(isinstance(recipe, dict), "Invalid artwork recipe.")
                for h in recipe.get("refs", {}).values():
                    store.owned(c, pid, h)
                if recipe.get("mask"):
                    store.owned(c, pid, recipe["mask"])
                if recipe.get("parent"):
                    recipe["parent"] = ids.get(recipe["parent"])
                c.execute(
                    "INSERT INTO versions VALUES(?,?,?,?,?,?,?,?,?)",
                    (
                        ids[v["id"]],
                        pid,
                        v["hash"],
                        string(v["label"], 200),
                        string(v["role"], 40),
                        ids.get(parent),
                        pack(v["recipe"]),
                        int(bool(v.get("favorite"))),
                        v["created"],
                    ),
                )
            d = m["data"]
            if d.get("selected"):
                need(d["selected"] in ids, "Selected artwork is absent.")
                d["selected"] = ids[d["selected"]]
            return validate(store, c, pid, d)
    except (
        AttributeError,
        KeyError,
        ValueError,
        TypeError,
        zipfile.BadZipFile,
        RuntimeError,
    ) as exc:
        from store import Fault

        raise Fault("Invalid editable package.") from exc
