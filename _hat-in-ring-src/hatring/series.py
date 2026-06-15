"""Momentum trajectory — accumulate daily snapshots and expose a compact public
`series` per candidate so the dashboard shows a trend, not just a snapshot.

Momentum has no historical record in signals.jsonl (those audit rows carry no
date or score), so we ACCUMULATE forward: one snapshot per candidate per
pipeline run, in data/momentum_snapshots.jsonl. Tier points are additionally
backfilled from each record's status `history` (dated tier transitions). Until
snapshots accumulate, slopes are 0 and the sparkline is the single current
point — a graceful empty state, not an error.

The series is DERIVED and attached at build time; it is never written into
candidates.json (keeps the persisted dataset clean and curated-field-safe).
"""
from __future__ import annotations
import json
from datetime import date, timedelta
from pathlib import Path

from .scoring import momentum as _momentum, derive_status as _status

RETAIN_DAYS = 180          # bound the committed snapshot file
MAX_POINTS = 16            # downsample the public series so the payload stays lean


def _today_point(rec: dict, today: date) -> dict:
    keys = rec.get("keys", [])
    return {"d": today.isoformat(),
            "s": _momentum(keys, rec.get("lastSignal", today.isoformat()), today),
            "t": _status(keys)[0]}


def load_snapshots(path: Path) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        out.setdefault(row["id"], []).append(
            {"d": row["d"], "s": row.get("s"), "t": row.get("t")})
    return out


def record_snapshot(records: list[dict], today: date, path: Path) -> int:
    """Append today's {d,id,s,t} for each record, once per date; prune to
    RETAIN_DAYS so the committed file stays bounded. Returns rows written."""
    existing = load_snapshots(path)
    have_today = {cid for cid, pts in existing.items()
                  if any(p["d"] == today.isoformat() for p in pts)}
    new_rows = [{"d": p["d"], "id": r["id"], "s": p["s"], "t": p["t"]}
                for r in records
                if r["id"] not in have_today
                for p in [_today_point(r, today)]]
    cutoff = (today - timedelta(days=RETAIN_DAYS)).isoformat()
    kept: list[dict] = []
    if path.exists():
        for line in path.read_text().splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("d", "") >= cutoff:
                kept.append(row)
    kept.extend(new_rows)
    path.write_text("".join(json.dumps(r) + "\n" for r in kept))
    return len(new_rows)


def _history_points(rec: dict) -> list[dict]:
    pts = []
    for h in rec.get("history", []) or []:
        d = (h.get("date") or "")[:10]
        if d:
            pts.append({"d": d, "s": None, "t": h.get("to")})
    return pts


def _downsample(points: list[dict], n: int = MAX_POINTS) -> list[dict]:
    if len(points) <= n:
        return points
    step = (len(points) - 1) / (n - 1)
    idx = sorted(set([round(i * step) for i in range(n)] + [len(points) - 1]))
    return [points[i] for i in idx]


def _slope(points: list[dict], today: date, days: int) -> int:
    """score(now) − score(nearest scored point ≥ `days` old). 0 if insufficient."""
    scored = [p for p in points if isinstance(p.get("s"), (int, float))]
    if len(scored) < 2:
        return 0
    now = scored[-1]
    cutoff = (today - timedelta(days=days)).isoformat()
    past = [p for p in scored if p["d"] <= cutoff]
    base = past[-1] if past else scored[0]
    return int(now["s"] - base["s"])


def attach(records: list[dict], today: date, path: Path) -> None:
    """Set `series` (compact, downsampled), `slope7`, `slope30` on each record.

    Sources, merged by date (a scored snapshot wins over a tier-only history
    point on the same date): persisted snapshots + status-history tier points +
    a synthesized current point so a sparkline always has the latest value.
    """
    snaps = load_snapshots(path)
    for r in records:
        pts = list(snaps.get(r["id"], [])) + _history_points(r)
        tp = _today_point(r, today)
        if not any(p["d"] == tp["d"] and p.get("s") is not None for p in pts):
            pts.append(tp)
        bydate: dict[str, dict] = {}
        for p in sorted(pts, key=lambda x: (x["d"], x.get("s") is None)):
            cur = bydate.get(p["d"])
            if cur is None or (cur.get("s") is None and p.get("s") is not None):
                bydate[p["d"]] = p
        ordered = [bydate[d] for d in sorted(bydate)]
        r["series"] = _downsample(ordered)
        r["slope7"] = _slope(ordered, today, 7)
        r["slope30"] = _slope(ordered, today, 30)
