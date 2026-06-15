"""Adversarial guardrail tests for the merge trust model.

These cover the human-in-the-loop guarantees the pipeline claims:
  * idempotency (re-running applies nothing new AND leaves the dataset stable)
  * curated-field protection (human fields survive automation)
  * denial/downgrade routing to review instead of flipping a tier
  * FEC autocreate gating
  * status-history bookkeeping
  * delta recomputed from before/after momentum

Tests are fully offline/deterministic (fixed `today`, in-tmp audit logs, no
network, no dependence on the wall clock).

Confirmed defects are encoded as ``xfail(strict=True)``: they pass today by
*documenting* the broken behaviour and will fail loudly (XPASS) the moment the
guardrail is fixed, forcing the assertion to be tightened.
"""
import json
import tempfile
from datetime import date
from pathlib import Path

import pytest

from hatring.merge import Dataset, _load_jsonl
from hatring.classify import Classified
from hatring.fec import FecSignal
from hatring.scoring import derive_status, momentum

TODAY = date(2026, 6, 12)


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def news(pid, keys, headline, *, quote="", date_="2026-06-10",
         discovery=False, url=None, name=None):
    return Classified(
        person_id=pid, name_guess=name or pid or "Someone", keys=list(keys),
        confidence="High", headline=headline,
        url=url or ("http://example/" + headline.replace(" ", "_")),
        source="AP News", date=date_, quote=quote, discovery=discovery,
    )


def record(**over):
    base = {
        "id": "person", "name": "Test Person", "party": "Democrat",
        "role": "Senator", "bucket": "considering", "keys": ["softConsidering"],
        "conf": "Medium", "delta": 0, "lastSignal": "2026-04-06",
        "headline": "old headline", "why": "WHY-SENTINEL",
        "quote": "QUOTE-SENTINEL", "tags": [],
    }
    base.update(over)
    return base


def fec(fec_id, key, *, name="DOE, JANE", party="Republican",
        committee_id="C0001", filing_date="2026-06-01"):
    return FecSignal(
        fec_id=fec_id, name=name, party=party, key=key,
        confidence="Very high", headline="FEC filing",
        filing_date=filing_date, committee_id=committee_id,
    )


@pytest.fixture
def audit(tmp_path):
    return tmp_path / "signals.jsonl"


# --------------------------------------------------------------------------- #
# IDEMPOTENCY
# --------------------------------------------------------------------------- #
def test_idempotent_keys_not_reapplied(audit):
    n = news("person", ["consideringQuote"], "considering a 2028 run")
    Dataset([record()], today=TODAY).update([n], [], audit)
    ds2 = Dataset([record()], today=TODAY)
    ds2.update([n], [], audit)
    # second run sees the sid in the audit log and skips it
    assert "consideringQuote" not in ds2.by_id["person"]["keys"]


def test_idempotent_audit_log_no_duplicate_sids(audit):
    n = news("person", ["consideringQuote"], "considering")
    Dataset([record()], today=TODAY).update([n], [], audit)
    sids_after_1 = _load_jsonl(audit)
    Dataset([record()], today=TODAY).update([n], [], audit)
    sids_after_2 = _load_jsonl(audit)
    # the set of sids is unchanged; no duplicate key written
    assert sids_after_1 == sids_after_2
    lines = [l for l in audit.read_text().splitlines() if l.strip()]
    assert len(lines) == len(sids_after_2), "duplicate sid rows appended on rerun"


@pytest.mark.xfail(strict=True, reason=(
    "BUG: delta is recomputed as after-before each run. On the second (no-op) "
    "run nothing applies, so before==after and delta resets to 0 even though "
    "run 1 set it to a non-zero momentum jump. The dataset is therefore NOT "
    "stable on the 2nd run for any record that moved on run 1."))
def test_idempotent_dataset_stable_on_second_run(audit):
    # a stale record that a fresh signal makes recent (momentum jumps)
    rec = record(keys=["softConsidering"], lastSignal="2026-01-01")
    n = news("person", ["consideringQuote"], "considering",
             date_="2026-06-10")
    ds1 = Dataset([rec], today=TODAY)
    ds1.update([n], [], audit)
    snap1 = json.dumps(ds1.records, sort_keys=True)

    ds2 = Dataset([json.loads(json.dumps(r)) for r in ds1.records], today=TODAY)
    ds2.update([n], [], audit)
    snap2 = json.dumps(ds2.records, sort_keys=True)
    assert snap1 == snap2, "record mutated on a no-op rerun (delta reset)"


# --------------------------------------------------------------------------- #
# CURATED-FIELD PROTECTION
# --------------------------------------------------------------------------- #
def test_curated_why_role_bucket_survive_news(audit):
    ds = Dataset([record()], today=TODAY)
    ds.update([news("person", ["consideringQuote"], "auto headline",
                    quote="auto quote")], [], audit)
    g = ds.by_id["person"]
    assert g["why"] == "WHY-SENTINEL"
    assert g["role"] == "Senator"
    assert g["bucket"] == "considering"


def test_curated_why_survives_fec(audit):
    rec = record(name="Jane Doe", keys=["softConsidering"])
    ds = Dataset([rec], today=TODAY)
    ds.update([], [fec("P0DOE", "declared", name="DOE, JANE", party="Democrat")],
              audit)
    assert ds.by_id["person"]["why"] == "WHY-SENTINEL"


def test_curated_quote_not_clobbered_by_empty_incoming(audit):
    # an incoming item with no quote must never blank a curated quote
    ds = Dataset([record(quote="HUMAN-QUOTE", lastSignal="2026-04-01")],
                 today=TODAY)
    ds.update([news("person", ["earlyState"], "auto headline",
                    quote="", date_="2026-06-10")], [], audit)
    assert ds.by_id["person"]["quote"] == "HUMAN-QUOTE"


@pytest.mark.xfail(strict=True, reason=(
    "BUG/TRUST-GAP: a hand-written `quote` is overwritten whenever a newer "
    "(>= lastSignal) news item carries its own quote. The task's trust model "
    "lists `quote` as a curated, protected field; merge.py only protects "
    "why/role/bucket. The same applies to `headline`."))
def test_curated_quote_survives_newer_news(audit):
    ds = Dataset([record(quote="HUMAN-QUOTE", headline="HUMAN-HEADLINE",
                         lastSignal="2026-04-01")], today=TODAY)
    ds.update([news("person", ["earlyState"], "auto RSS headline",
                    quote="auto RSS quote", date_="2026-06-10")], [], audit)
    assert ds.by_id["person"]["quote"] == "HUMAN-QUOTE"


# --------------------------------------------------------------------------- #
# DENIAL / DOWNGRADE
# --------------------------------------------------------------------------- #
def test_news_ruledout_does_not_flip_tier_and_goes_to_review(audit):
    rec = record(keys=["consideringQuote"], lastSignal="2026-04-01")  # tier 3
    ds = Dataset([rec], today=TODAY)
    before = derive_status(ds.by_id["person"]["keys"])[0]
    ds.update([news("person", ["ruledOut"], "person rules out a 2028 run")],
              [], audit)
    after = derive_status(ds.by_id["person"]["keys"])[0]
    assert before == after == 3, "denial must not change the tier"
    assert "ruledOut" not in ds.by_id["person"]["keys"]
    assert any(r.get("note", "").startswith("denial") for r in ds.review)


def test_news_barred_does_not_flip_tier_and_goes_to_review(audit):
    rec = record(keys=["declared"], lastSignal="2026-04-01")  # tier 5
    ds = Dataset([rec], today=TODAY)
    ds.update([news("person", ["barred"], "person is constitutionally barred")],
              [], audit)
    assert "barred" not in ds.by_id["person"]["keys"]
    assert derive_status(ds.by_id["person"]["keys"])[0] == 5
    assert any("barred" in r.get("keys", []) for r in ds.review)


@pytest.mark.xfail(strict=True, reason=(
    "BUG: apply_fec applies the signal `key` directly with NO downgrade gate, "
    "unlike apply_news. A 'barred'/'ruledOut' key arriving on the FEC channel "
    "(crafted fixture, future fec.py change, or bad upstream data) silently "
    "flips a Declared record to Inactive with no review-queue entry. "
    "Reproduced end-to-end via a crafted fec_signals.json fixture."))
def test_fec_downgrade_is_gated_to_review(audit):
    rec = record(name="Jane Doe", keys=["declared"], lastSignal="2026-05-01")
    ds = Dataset([rec], today=TODAY)
    before = derive_status(ds.by_id["person"]["keys"])[0]
    ds.update([], [fec("P0DOE", "barred", name="DOE, JANE", party="Democrat")],
              audit)
    after = derive_status(ds.by_id["person"]["keys"])[0]
    # desired guardrail: FEC downgrade does not silently flip the tier
    assert before == after, "FEC downgrade flipped tier with no human review"


# --------------------------------------------------------------------------- #
# FEC AUTOCREATE GATING  (fec_autocreate defaults False)
# --------------------------------------------------------------------------- #
def test_fec_unknown_no_committee_is_dropped(audit):
    ds = Dataset([record(id="other")], today=TODAY)
    ds.update([], [fec("P0NOCMTE", "exploratory", name="GHOST, A",
                       committee_id=None)], audit)
    assert "fec-p0nocmte" not in ds.by_id          # not on the board
    assert not any(r.get("fec_id") == "P0NOCMTE" for r in ds.review)  # not in review


def test_fec_unknown_with_committee_goes_to_review(audit):
    ds = Dataset([record(id="other")], today=TODAY)
    ds.update([], [fec("P0HASCMTE", "declared", name="REAL, B",
                       committee_id="C00777")], audit)
    assert "fec-p0hascmte" not in ds.by_id
    assert any(r.get("fec_id") == "P0HASCMTE" for r in ds.review)


def test_fec_autocreate_true_creates_record(audit):
    ds = Dataset([record(id="other")], today=TODAY)
    # FEC stores "LASTNAME, FIRSTNAME"; display_name() flips to "First Last"
    ds.update([], [fec("P0NEW", "declared", name="SMITH, JOHN",
                       committee_id="C001")], audit, fec_autocreate=True)
    new = ds.by_id.get("fec-p0new")
    assert new and new["name"] == "John Smith" and "declared" in new["keys"]


def test_fec_watchlisted_match_applies_regardless_of_committee(audit):
    rec = record(id="known", name="Known Person", keys=["softConsidering"])
    rec["fec_ids"] = ["P0KNOWN"]
    ds = Dataset([rec], today=TODAY)
    # committee None, autocreate False -> still applies because it is matched
    ds.update([], [fec("P0KNOWN", "declared", name="PERSON, KNOWN",
                       committee_id=None)], audit)
    assert "declared" in ds.by_id["known"]["keys"]


# --------------------------------------------------------------------------- #
# STATUS HISTORY
# --------------------------------------------------------------------------- #
def test_status_history_appends_from_to_reason(audit):
    rec = record(keys=["softConsidering"], lastSignal="2026-04-01")  # tier 1
    ds = Dataset([rec], today=TODAY)
    ds.update([news("person", ["declared"], "person launches a 2028 campaign")],
              [], audit)
    h = ds.by_id["person"].get("history", [])
    assert h, "no history entry recorded on a tier change"
    last = h[-1]
    assert last["from"] == 1 and last["to"] == 5
    assert last["reason"] == "person launches a 2028 campaign"
    assert "date" in last


def test_no_history_entry_when_tier_unchanged(audit):
    # adding a purely behavioural key (earlyState) keeps tier at Positioning/etc
    rec = record(keys=["earlyState"], lastSignal="2026-04-01")  # tier 2
    ds = Dataset([rec], today=TODAY)
    ds.update([news("person", ["donors"], "person holds a fundraiser")],
              [], audit)
    assert ds.by_id["person"].get("history", []) == []


# --------------------------------------------------------------------------- #
# DELTA
# --------------------------------------------------------------------------- #
def test_delta_equals_momentum_movement(audit):
    rec = record(keys=["softConsidering"], lastSignal="2026-01-01")  # stale/low
    before_m = momentum(rec["keys"], rec["lastSignal"], TODAY)
    ds = Dataset([rec], today=TODAY)
    ds.update([news("person", ["declared"], "person declares",
                    date_="2026-06-10")], [], audit)
    g = ds.by_id["person"]
    after_m = momentum(g["keys"], g["lastSignal"], TODAY)
    assert g["delta"] == after_m - before_m
    assert g["delta"] > 0


# --------------------------------------------------------------------------- #
# REVIEW-QUEUE DURABILITY (human-in-the-loop)
# --------------------------------------------------------------------------- #
def test_merge_produces_review_per_run_pipeline_persists(audit):
    """M3 is fixed at the PIPELINE layer, not here. The merge layer (re)produces
    review items only for signals that are new this run — on a rerun the same sid
    is audit-deduped, so apply_news is skipped and nothing is re-queued. That's
    intentional; ``pipeline.reconcile_review`` is what persists the queue across
    runs (proven in tests/test_review_queue.py). This test pins the merge-layer
    contract so the two layers stay decoupled."""
    denial = news("person", ["ruledOut"], "person rules out a 2028 run")
    ds1 = Dataset([record(keys=["consideringQuote"])], today=TODAY)
    ds1.update([denial], [], audit)
    assert len(ds1.review) == 1                      # queued on first run

    ds2 = Dataset([record(keys=["consideringQuote"])], today=TODAY)
    ds2.update([denial], [], audit)                  # same sid already in audit
    assert ds2.review == []                          # not re-produced — pipeline persists it
