"""Render the self-contained dashboard HTML from candidates.json.

The pipeline is the source of truth: it injects the merged dataset as the JS
SEED constant and stamps the build date (which drives the dashboard's recency
maths). Output is a single hostable .html file with no external data deps.
"""
from __future__ import annotations
import json
import logging
import re
import shutil
from datetime import date, datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

log = logging.getLogger("hatring.build")

# fields the dashboard never needs (keep the payload lean & avoid leaking internals)
_DROP = {"history", "fec_ids"}

# where pulled candidate portraits live, relative to the repo root
_ASSET_DIR = Path("assets") / "candidates"


def _attach_images(records: list[dict], repo_root: Path) -> None:
    """Set each record's `img` to its lead portrait (a repo-relative path).

    Source of truth is assets/candidates/_index.json (written by the image
    puller); a record only gets `img` if its lead file is present on disk, so
    candidates with no pulled image simply render without an avatar.
    """
    index_path = repo_root / _ASSET_DIR / "_index.json"
    if not index_path.exists():
        return
    leads = {row["id"]: row["files"][0]
             for row in json.loads(index_path.read_text())
             if row.get("files")}
    for r in records:
        rel = leads.get(r.get("id"))
        if rel and (repo_root / rel).exists():
            r["img"] = rel


def _copy_assets(records: list[dict], repo_root: Path, out_dir: Path) -> int:
    """Stage each referenced portrait next to the output so Pages serves it.

    The Pages artifact is only the output dir (e.g. public/), so images must be
    copied alongside index.html at the same relative path the SEED references.
    """
    copied = 0
    for r in records:
        rel = r.get("img")
        if not rel:
            continue
        src, dst = repo_root / rel, out_dir / rel
        if src.exists() and src.resolve() != dst.resolve():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1
    return copied


def _public(records: list[dict]) -> list[dict]:
    out = []
    for r in records:
        out.append({k: v for k, v in r.items() if k not in _DROP})
    return out


def _js_literal(obj) -> str:
    """Serialize to a JS literal that's safe to inject into an inline <script>.

    Jinja autoescape is off for the JS payload, so a value containing "</script>"
    (e.g. a hostile ingested headline) could break out. Escaping "<" plus the JS
    line/paragraph separators closes that — all three round-trip identically through
    the JS string parser. sort_keys keeps the output byte-stable.
    """
    s = json.dumps(obj, ensure_ascii=False, sort_keys=True)
    bs = chr(92)  # literal backslash, built at runtime so the u-escape stays 6 chars
    return (s.replace("<", bs + "u003c")
             .replace(chr(0x2028), bs + "u2028")
             .replace(chr(0x2029), bs + "u2029"))


def render(candidates_path: Path, template_dir: Path, out_path: Path,
           built: date | None = None) -> Path:
    built = built or date.today()
    candidates_path = Path(candidates_path)
    records = json.loads(candidates_path.read_text())
    # candidates.json lives in data/, so the repo root is its parent's parent.
    repo_root = candidates_path.parent.parent
    _attach_images(records, repo_root)  # adds `img` to records that have a portrait
    # The review queue lives next to candidates.json; inline it so the dashboard's
    # review screen has data with no external fetch. Absent file -> empty queue.
    review_path = candidates_path.parent / "review_queue.json"
    review = json.loads(review_path.read_text()) if review_path.exists() else []
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=select_autoescape(enabled_extensions=()),  # we inject JS/JSON, not HTML
    )
    tmpl = env.get_template("dashboard.html.j2")
    html = tmpl.render(
        seed_json=_js_literal(_public(records)),
        review_json=_js_literal(review),
        # Anchor with Z so the browser parses the build stamp as UTC; otherwise it is
        # read in the viewer's local TZ and daysSince() can flip the 30/90-day recency
        # bands at date-line offsets, diverging from the Python scoring engine.
        generated_at=json.dumps(built.isoformat() + "T12:00:00Z"),
        generated_at_human=datetime.now().strftime("%b %d %Y %H:%M"),
        as_of=built.strftime("%B %-d, %Y"),
    )
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)  # e.g. public/ for the Pages artifact
    out_path.write_text(html)
    imgs = _copy_assets(records, repo_root, out_path.parent)  # stage portraits beside index.html
    log.info("build: wrote %s (%d records, %d imgs, %d bytes)", out_path, len(records), imgs, len(html))
    return out_path
