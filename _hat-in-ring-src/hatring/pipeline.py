"""Hat-in-Ring Radar ingest pipeline (CLI).

  fetch (FEC + news)  ->  classify  ->  merge into dataset  ->  rebuild HTML

Idempotent: signal dedup is tracked in data/signals.jsonl, so re-running only
applies genuinely new signals. Designed to run unattended (cron / GitHub
Actions) or by hand.

Usage:
  python -m hatring.pipeline --all
  python -m hatring.pipeline --news --build          # skip FEC
  python -m hatring.pipeline --offline --fixtures tests/fixtures   # no network
  python -m hatring.pipeline --build                 # rebuild HTML only
"""
from __future__ import annotations
import argparse
import json
import logging
import sys
from datetime import date
from pathlib import Path

import yaml

from . import fec as fecmod
from . import news as newsmod
from . import classify as clf
from . import series as seriesmod
from . import money as moneymod
from . import brief as briefmod
from .merge import Dataset, review_rid, _review_kind
from .build import render

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
TEMPLATES = ROOT / "templates"

log = logging.getLogger("hatring")


def _load_config() -> dict:
    return yaml.safe_load((ROOT / "config.yaml").read_text())


def _load_dataset(cfg) -> list[dict]:
    cand = DATA / "candidates.json"
    seed = DATA / "seed.json"
    src = cand if cand.exists() else seed
    return json.loads(src.read_text())


def _attach_watchlist_fec_ids(records, cfg):
    """Seed fec_ids onto records from config so FEC matching is deterministic."""
    cfgmap = {c["id"]: c for c in cfg.get("watchlist", [])}
    for r in records:
        c = cfgmap.get(r["id"])
        if c and c.get("fec_ids"):
            r.setdefault("fec_ids", [])
            for fid in c["fec_ids"]:
                if fid not in r["fec_ids"]:
                    r["fec_ids"].append(fid)


def _safe_load(path, default, want_type):
    """Load JSON, returning `default` on a missing / corrupt / wrong-type file
    (logging a warning) instead of crashing the whole pipeline run."""
    if not path.exists():
        return default
    try:
        val = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        log.warning("review: %s is unreadable (%s); treating as empty", path.name, e)
        return default
    if not isinstance(val, want_type):
        log.warning("review: %s is not a %s; treating as empty", path.name, want_type.__name__)
        return default
    return val


def reconcile_review(ds, today) -> bool:
    """Persist the review queue across runs and apply human decisions.

    The queue is the human-in-the-loop control, so it must NOT be lost between
    daily runs (the previous behaviour). We:
      * load the prior queue + the resolved-set, backfilling rid/kind on legacy items;
      * union it with this run's new review items, deduped by rid, dropping anything
        already resolved;
      * consume data/review_decisions.json ([{rid, action}]): `confirm` applies the
        item to the dataset, `dismiss` just drops it; both mark the rid resolved so it
        never resurfaces (idempotent — re-submitting the same decisions is a no-op).

    Returns True if a confirmed decision mutated the dataset (so candidates.json is
    rewritten). Always rewrites review_queue.json + review_resolved.json.
    """
    qpath = DATA / "review_queue.json"
    rpath = DATA / "review_resolved.json"
    dpath = DATA / "review_decisions.json"

    # Fail SAFE on a corrupt/hand-edited file (review_decisions.json is committed by
    # humans) — log and treat as empty rather than crashing the whole unattended run.
    prior = _safe_load(qpath, [], list)
    resolved = set(_safe_load(rpath, [], list))
    decisions = _safe_load(dpath, [], list)

    for it in prior:                       # backfill ids on legacy/hand-written items
        if isinstance(it, dict):
            it.setdefault("rid", review_rid(it.get("name", ""), it.get("url", ""), it.get("keys")))
            it.setdefault("kind", _review_kind(it))

    union: dict[str, dict] = {}
    for it in prior + ds.review:
        if not isinstance(it, dict):
            continue
        rid = it.get("rid")
        if rid and rid not in resolved:
            union.setdefault(rid, it)      # prior copy wins on duplicate

    mutated = False
    consumed = False
    for d in decisions:
        if not isinstance(d, dict):
            continue
        rid, action = d.get("rid"), d.get("action")
        if not rid or rid in resolved or action not in ("confirm", "dismiss"):
            continue
        consumed = True
        if action == "confirm":
            item = union.get(rid)
            valid = (item is not None and isinstance(item.get("keys"), list)
                     and item.get("keys") and (item.get("name") or "").strip())
            if not valid:
                # H2: can't apply (gone, or missing name/keys) -> DON'T resolve; keep
                # it queued so the human can fix or dismiss it instead of losing it.
                log.warning("review: cannot confirm %s (missing/invalid item); left queued", rid)
                continue
            if ds.apply_review_item(item):
                mutated = True
        resolved.add(rid)                  # confirmed-and-applied, or dismissed
        union.pop(rid, None)

    DATA.mkdir(exist_ok=True)
    qpath.write_text(json.dumps(list(union.values()), indent=2, ensure_ascii=False))
    rpath.write_text(json.dumps(sorted(resolved), indent=2))
    # M4: decisions are single-use — empty the inbox once consumed so a stale committed
    # "confirm" can't silently re-fire on a future item that reuses the same content rid.
    if consumed:
        dpath.write_text("[]\n")
    log.info("review: %d queued, %d resolved (total)", len(union), len(resolved))
    return mutated


def run(args):
    cfg = _load_config()
    today = date.fromisoformat(args.today) if args.today else date.today()
    records = _load_dataset(cfg)
    _attach_watchlist_fec_ids(records, cfg)
    watchlist = cfg.get("watchlist", [{"id": r["id"], "name": r["name"]} for r in records])
    # ensure every dataset record is matchable even if not in config
    have = {w["id"] for w in watchlist}
    for r in records:
        if r["id"] not in have:
            watchlist.append({"id": r["id"], "name": r["name"],
                              "aliases": [r["name"]]})

    ds = Dataset(records, today=today)

    fec_signals, news_items = [], []
    if args.offline:
        fx = Path(args.fixtures)
        if (args.fec or args.all) and (fx / "fec_signals.json").exists():
            raw = json.loads((fx / "fec_signals.json").read_text())
            fec_signals = [fecmod.FecSignal(**r) for r in raw]
        if (args.news or args.all) and (fx / "news_items.json").exists():
            raw = json.loads((fx / "news_items.json").read_text())
            news_items = [newsmod.NewsItem(**r) for r in raw]
    else:
        if args.fec or args.all:
            try:
                fec_signals = fecmod.FecClient().signals(cfg.get("cycle", 2028))
            except Exception as e:                       # never let one source kill the run
                log.error("FEC fetch failed: %s", e)
        if args.news or args.all:
            try:
                news_items = newsmod.fetch_all(
                    watchlist, cfg.get("broad_queries", []),
                    throttle=cfg.get("news_throttle", 1.0))
            except Exception as e:
                log.error("news fetch failed: %s", e)

    classified = clf.classify_batch(news_items, watchlist) if news_items else []

    ingest_mode = bool(args.fec or args.news or args.all)
    dataset_dirty = False
    if fec_signals or classified:
        ds.update(classified, fec_signals, DATA / "signals.jsonl",
                  fec_autocreate=cfg.get("fec_autocreate", False))
        dataset_dirty = True

    if ingest_mode:
        # Always reconcile the review queue (persist across runs + apply any pending
        # human decisions), even when no new signals were fetched this run.
        if reconcile_review(ds, today):
            dataset_dirty = True
        DATA.mkdir(exist_ok=True)
        if dataset_dirty or not (DATA / "candidates.json").exists():
            (DATA / "candidates.json").write_text(json.dumps(ds.records, indent=2, ensure_ascii=False))
            log.info("dataset: %d records written", len(ds.records))
        else:
            log.info("dataset unchanged")

        # Momentum trajectory: one snapshot per day so the series accumulates
        # (momentum has no historical record in signals.jsonl). Idempotent per date.
        seriesmod.record_snapshot(ds.records, today, DATA / "momentum_snapshots.jsonl")

        # Money movement (a SEPARATE axis — never folded into momentum). FEC-only,
        # skipped offline, and wrapped so a rate-limited DEMO_KEY never kills the run.
        if (args.fec or args.all) and not args.offline:
            try:
                moneymod.refresh(ds.records, DATA / "financials.json",
                                 cycle=cfg.get("cycle", 2028), today=today)
            except Exception as e:                       # noqa: BLE001
                log.error("money refresh failed: %s", e)

        # Daily briefing artifact (committed; build.py recomputes for the live page).
        try:
            pending = [x for x in _safe_load(DATA / "review_queue.json", [], list)
                       if isinstance(x, dict)]
            briefmod.write_briefing(
                briefmod.build_briefing(ds.records, len(pending), today), DATA)
        except Exception as e:                           # noqa: BLE001
            log.error("briefing failed: %s", e)

    if args.build or args.all:
        out = Path(args.out) if args.out else DATA / "dashboard.html"
        render(DATA / "candidates.json" if (DATA / "candidates.json").exists() else DATA / "seed.json",
               TEMPLATES, out, built=today)
        print(f"built dashboard -> {out}")


def main(argv=None):
    p = argparse.ArgumentParser(prog="hatring.pipeline", description=__doc__)
    p.add_argument("--all", action="store_true", help="FEC + news + build")
    p.add_argument("--fec", action="store_true", help="ingest FEC filings")
    p.add_argument("--news", action="store_true", help="ingest news RSS")
    p.add_argument("--build", action="store_true", help="rebuild dashboard HTML")
    p.add_argument("--offline", action="store_true", help="use fixtures, no network")
    p.add_argument("--fixtures", default="tests/fixtures")
    p.add_argument("--out", help="dashboard output path")
    p.add_argument("--today", help="override 'today' (YYYY-MM-DD) for recency maths")
    p.add_argument("-v", "--verbose", action="store_true")
    a = p.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if a.verbose else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s")
    if not any([a.all, a.fec, a.news, a.build]):
        p.error("nothing to do: pass --all, or some of --fec/--news/--build")
    run(a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
