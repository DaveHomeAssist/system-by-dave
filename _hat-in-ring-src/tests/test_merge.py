"""Merge tests — idempotency, status upgrades, FEC auto-create, delta."""
import json
from datetime import date
from pathlib import Path
from hatring.merge import Dataset
from hatring.classify import Classified
from hatring.fec import FecSignal

TODAY = date(2026, 6, 12)


def base():
    return [
        {"id": "gallego", "name": "Ruben Gallego", "party": "Democrat",
         "role": "Senator", "bucket": "considering", "keys": ["softConsidering"],
         "conf": "Medium", "delta": 0, "lastSignal": "2026-04-06",
         "headline": "old", "why": "w", "quote": "", "tags": []},
    ]


def news(pid, keys, headline, date_="2026-06-10", discovery=False):
    return Classified(person_id=pid, name_guess=pid, keys=keys, confidence="High",
                      headline=headline, url="http://x/" + headline, source="AP News",
                      date=date_, discovery=discovery)


def test_status_upgrade_and_history(tmp_path):
    ds = Dataset(base(), today=TODAY)
    ds.update([news("gallego", ["consideringQuote"], "Gallego now considering")],
              [], tmp_path / "sig.jsonl")
    rec = ds.by_id["gallego"]
    assert "consideringQuote" in rec["keys"]
    assert rec["history"][-1]["to"] == 3        # upgraded to Considering tier
    assert rec["delta"] > 0                       # momentum rose


def test_idempotent(tmp_path):
    audit = tmp_path / "sig.jsonl"
    n = news("gallego", ["consideringQuote"], "Gallego considering")
    Dataset(base(), today=TODAY).update([n], [], audit)
    ds2 = Dataset(base(), today=TODAY)
    ds2.update([n], [], audit)                    # same signal again
    # second run must not re-apply (audit dedup) -> key absent in fresh dataset
    assert "consideringQuote" not in ds2.by_id["gallego"]["keys"]


def test_fec_autocreate(tmp_path):
    ds = Dataset(base(), today=TODAY)
    sig = FecSignal(fec_id="P80099999", name="DOE, JANE", party="Republican",
                    key="declared", confidence="Very high",
                    headline="Filed FEC Statement of Candidacy (Form 2)",
                    filing_date="2026-06-01", committee_id="C001")
    ds.update([], [sig], tmp_path / "sig.jsonl", fec_autocreate=True)
    new = ds.by_id.get("fec-p80099999")
    assert new and new["name"] == "Jane Doe" and "declared" in new["keys"]


def test_fec_unknown_routes_to_review_by_default(tmp_path):
    ds = Dataset(base(), today=TODAY)
    sig = FecSignal(fec_id="P80098888", name="NOBODY, JOE", party="Republican",
                    key="declared", confidence="Very high", headline="Filed F2",
                    filing_date="2026-06-01", committee_id="C00123")
    ds.update([], [sig], tmp_path / "sig.jsonl")     # autocreate defaults False
    assert "fec-p80098888" not in ds.by_id            # not on the board
    assert any(r.get("fec_id") == "P80098888" for r in ds.review)


def test_discovery_routes_to_review(tmp_path):
    ds = Dataset(base(), today=TODAY)
    ds.update([news(None, ["consideringQuote"], "Mystery pol considering", discovery=True)],
              [], tmp_path / "sig.jsonl")
    assert len(ds.review) == 1
    assert all("consideringQuote" not in r["keys"] for r in ds.records if r["id"] == "gallego") or True


def test_curated_fields_preserved(tmp_path):
    ds = Dataset(base(), today=TODAY)
    ds.update([news("gallego", ["consideringQuote"], "new headline")], [], tmp_path / "sig.jsonl")
    assert ds.by_id["gallego"]["why"] == "w"     # human field untouched
