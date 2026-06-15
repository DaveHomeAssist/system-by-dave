"""Daily-briefing tests: empty / minimal / normal datasets + share-asset output."""
from __future__ import annotations
from datetime import date

from hatring import brief

TODAY = date(2026, 6, 15)


def _rec(rid, keys, last, delta=0, history=None, name=None):
    r = {"id": rid, "name": name or rid.title(), "party": "Democrat", "role": "r",
         "bucket": "considering", "keys": keys, "conf": "High", "delta": delta,
         "lastSignal": last, "headline": "h", "why": "w", "quote": "", "tags": []}
    if history:
        r["history"] = history
    return r


def test_briefing_empty_dataset():
    b = brief.build_briefing([], 0, TODAY)
    assert b["movers"] == [] and b["new_filers"] == [] and b["transitions"] == []
    assert b["totals"]["tracked"] == 0 and b["date"] == TODAY.isoformat()


def test_briefing_minimal():
    b = brief.build_briefing([_rec("a", ["donors"], "2026-06-14")], 0, TODAY)
    assert b["totals"]["tracked"] == 1 and isinstance(b["movers"], list)


def test_briefing_normal_movers_filers_transitions():
    recs = [
        _rec("a", ["consideringQuote"], "2026-06-14", delta=12),
        _rec("b", ["declared"], "2026-06-10", delta=0),
        _rec("c", ["softConsidering"], "2026-06-13", delta=-5,
             history=[{"date": "2026-06-13", "from": 0, "to": 1}]),
    ]
    b = brief.build_briefing(recs, 2, TODAY)
    assert "a" in [m["id"] for m in b["movers"]]            # carries a delta
    assert any(f["id"] == "b" for f in b["new_filers"])     # declared + recent
    assert any(t["name"] == "C" for t in b["transitions"])  # status change within 7d
    assert b["review_count"] == 2


def test_share_assets_written(tmp_path):
    b = brief.build_briefing([_rec("a", ["donors"], "2026-06-14", delta=4)], 0, TODAY)
    brief.write_share_assets(b, tmp_path)
    assert (tmp_path / "share.html").exists()
    svg = (tmp_path / "assets" / "share" / "latest.svg").read_text()
    assert svg.lstrip().startswith("<svg") and "1200" in svg and "630" in svg


def test_share_svg_escapes_hostile_name():
    b = brief.build_briefing([_rec("x", ["donors"], "2026-06-14", delta=4,
                                   name="<script>alert(1)</script>")], 0, TODAY)
    svg = brief.render_share_svg(b)
    assert "<script>" not in svg and "&lt;script&gt;" in svg
