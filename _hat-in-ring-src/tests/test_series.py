"""Momentum-trajectory tests: snapshot accumulation, series shape + bounding,
slope computation, retention pruning. Deterministic (pinned dates, tmp paths)."""
from __future__ import annotations
import json
from datetime import date, timedelta
from pathlib import Path

from hatring import series

TODAY = date(2026, 6, 15)


def _rec(rid, keys, last, history=None):
    r = {"id": rid, "keys": keys, "lastSignal": last}
    if history:
        r["history"] = history
    return r


def test_record_snapshot_idempotent_per_date(tmp_path):
    p = tmp_path / "snap.jsonl"
    recs = [_rec("a", ["consideringQuote"], "2026-06-10")]
    assert series.record_snapshot(recs, TODAY, p) == 1
    assert series.record_snapshot(recs, TODAY, p) == 0      # same date -> no dup
    rows = [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
    assert len(rows) == 1 and rows[0]["id"] == "a" and rows[0]["d"] == TODAY.isoformat()
    assert isinstance(rows[0]["s"], int) and isinstance(rows[0]["t"], int)


def test_attach_series_shape_and_bounded(tmp_path):
    p = tmp_path / "snap.jsonl"
    recs = [_rec("a", ["consideringQuote", "earlyState"], "2026-06-12",
                 history=[{"date": "2026-05-01", "from": 1, "to": 3}])]
    series.attach(recs, TODAY, p)
    s = recs[0]["series"]
    assert isinstance(s, list) and 1 <= len(s) <= series.MAX_POINTS
    for pt in s:
        assert "d" in pt and set(pt) <= {"d", "s", "t"}
    assert isinstance(recs[0]["slope7"], int) and isinstance(recs[0]["slope30"], int)


def test_slope_zero_without_history(tmp_path):
    p = tmp_path / "snap.jsonl"
    recs = [_rec("a", ["donors"], "2026-06-14")]
    series.attach(recs, TODAY, p)
    assert recs[0]["slope7"] == 0 and recs[0]["slope30"] == 0   # single point


def test_slope_positive_when_momentum_rose(tmp_path):
    p = tmp_path / "snap.jsonl"
    p.write_text(json.dumps({"d": "2026-06-01", "id": "a", "s": 10, "t": 2}) + "\n")
    recs = [_rec("a", ["consideringQuote", "earlyState", "donors", "staffing", "mediaBlitz"],
                 "2026-06-14")]
    series.attach(recs, TODAY, p)     # today's point ~60 vs the seeded 10
    assert recs[0]["slope7"] > 0 and recs[0]["slope30"] > 0


def test_no_payload_blowup_downsamples(tmp_path):
    p = tmp_path / "snap.jsonl"
    rows = [json.dumps({"d": (date(2026, 1, 1) + timedelta(days=i)).isoformat(),
                        "id": "a", "s": i % 100, "t": 2}) for i in range(120)]
    p.write_text("\n".join(rows) + "\n")
    recs = [_rec("a", ["donors"], "2026-06-14")]
    series.attach(recs, TODAY, p)
    assert len(recs[0]["series"]) <= series.MAX_POINTS    # bounded regardless of input size


def test_record_snapshot_prunes_old_rows(tmp_path):
    p = tmp_path / "snap.jsonl"
    p.write_text(json.dumps({"d": "2025-01-01", "id": "a", "s": 5, "t": 1}) + "\n")
    recs = [_rec("a", ["donors"], "2026-06-14")]
    series.record_snapshot(recs, TODAY, p)
    cutoff = (TODAY - timedelta(days=series.RETAIN_DAYS)).isoformat()
    rows = [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
    assert rows and all(r["d"] >= cutoff for r in rows)   # ancient row dropped
