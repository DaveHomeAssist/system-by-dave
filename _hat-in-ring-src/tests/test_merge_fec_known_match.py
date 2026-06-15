"""Coverage for the known-filer FEC apply path (hatring/merge.py:140-154).

The existing merge suite only exercises FEC signals for *unknown* filers
(auto-create + review-routing). The branch that matters most operationally —
an FEC filing that matches a person *already on the board* — was untested:

  * match by an existing fec_id, or fall back to a case-insensitive name match;
  * append the FEC id if not present;
  * add the declarative key (declared/exploratory) and bump confidence;
  * record a status-history entry when (and only when) the tier changes;
  * be a no-op (changed=False) when the key is already present.

All offline and date-pinned (today=2026-06-13); no network.
"""
from __future__ import annotations
from datetime import date

from hatring.merge import Dataset
from hatring.fec import FecSignal

TODAY = date(2026, 6, 13)


def _rec(**over):
    base = {
        "id": "gallego", "name": "Ruben Gallego", "party": "Democrat",
        "role": "Senator", "bucket": "considering", "keys": ["consideringQuote"],
        "conf": "Medium", "delta": 0, "lastSignal": "2026-05-01",
        "headline": "old", "why": "w", "quote": "", "tags": [],
    }
    base.update(over)
    return base


def _sig(**over):
    base = dict(fec_id="P80000001", name="GALLEGO, RUBEN", party="Democrat",
                key="declared", confidence="Very high",
                headline="Filed FEC Statement of Candidacy (Form 2)",
                filing_date="2026-06-05", committee_id="C001")
    base.update(over)
    return FecSignal(**base)


def test_fec_matches_existing_record_by_fec_id(tmp_path):
    rec = _rec(fec_ids=["P80000001"])
    ds = Dataset([rec], today=TODAY)
    changed = ds.apply_fec(_sig())
    assert changed is True
    r = ds.by_id["gallego"]
    assert "declared" in r["keys"], r["keys"]
    assert r["conf"] == "Very high", "confidence must be upgraded to the FEC ceiling"
    # tier rose 3 (Considering) -> 5 (Declared): a history row must be recorded.
    assert r["history"][-1] == {"date": "2026-06-05", "from": 3, "to": 5,
                                "reason": "Filed FEC Statement of Candidacy (Form 2)"}
    # The human is NOT asked to confirm an authoritative FEC filing.
    assert ds.review == []


def test_fec_matches_existing_record_by_name_fallback(tmp_path):
    # No fec_ids on the record -> match must fall through to the name comparison
    # (merge.py:109-111), then seed the fec_id onto the record (merge.py:140-142).
    rec = _rec(id="x", name="Jane Roe", keys=["softConsidering"], conf="Low")
    ds = Dataset([rec], today=TODAY)
    changed = ds.apply_fec(_sig(fec_id="P80000002", name="ROE, JANE",
                                key="exploratory", confidence="High",
                                headline="Registered with FEC (no Form 2 yet)",
                                committee_id=None))
    assert changed is True
    r = ds.by_id["x"]
    assert r["fec_ids"] == ["P80000002"], "fec_id must be seeded onto the matched record"
    assert "exploratory" in r["keys"]
    assert r["history"][-1]["from"] == 1 and r["history"][-1]["to"] == 4


def test_fec_known_record_duplicate_key_is_noop(tmp_path):
    # Record already carries the incoming key -> no change, no new history, no
    # confidence churn (exercises the `if sig.key not in rec["keys"]` False arm).
    rec = _rec(fec_ids=["P80000001"], keys=["declared"], conf="High")
    ds = Dataset([rec], today=TODAY)
    changed = ds.apply_fec(_sig(key="declared"))
    assert changed is False
    r = ds.by_id["gallego"]
    assert r["keys"] == ["declared"]
    assert "history" not in r
    assert r["conf"] == "High", "no key change must not churn confidence"


def test_fec_known_record_adds_key_without_tier_change_skips_history(tmp_path):
    # Add a declarative key that does NOT raise the status tier: exploratory on a
    # record already 'declared' keeps tier 5, so NO history row should be written
    # even though the key set changed (covers the `if after != before` False arm).
    rec = _rec(fec_ids=["P80000001"], keys=["declared"], conf="High")
    ds = Dataset([rec], today=TODAY)
    changed = ds.apply_fec(_sig(key="exploratory", confidence="Very high"))
    assert changed is True
    r = ds.by_id["gallego"]
    assert "exploratory" in r["keys"] and "declared" in r["keys"]
    assert r["conf"] == "Very high"
    assert "history" not in r, "tier was unchanged -> no history entry"
