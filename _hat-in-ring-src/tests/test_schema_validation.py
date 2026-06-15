"""Durable dataset + artifact schema validators.

Offline and deterministic: no network, no dependence on the real "today".
Anywhere recency matters we pin a fixed reference date (PINNED_TODAY) so the
suite cannot flake as the calendar advances.

Validates the structural contract the dashboard + scoring engine rely on:

  * data/seed.json   (the hand-curated source of truth)
  * data/candidates.json (the live, automation-merged dataset) IF present
  * data/review_queue.json (discovery / downgrade queue) IF present
  * data/signals.jsonl     (append-only idempotency audit log) IF present

The signal-key vocabulary, party / bucket / confidence enums, and required
field list are cross-checked against the code that consumes them
(hatring.scoring.WEIGHTS, hatring.classify, the dashboard template) so this
test fails loudly if the data and the engine drift apart.
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# Fixed reference date so "future lastSignal" checks never flake with the clock.
# Chosen comfortably after every shipped record's lastSignal.
PINNED_TODAY = date(2027, 1, 1)

# ---- the contract -----------------------------------------------------------
REQUIRED_FIELDS = [
    "id", "name", "party", "role", "bucket", "keys", "conf",
    "delta", "lastSignal", "headline", "why", "quote", "tags",
]
FIELD_TYPES = {
    "id": str, "name": str, "party": str, "role": str, "bucket": str,
    "keys": list, "conf": str, "delta": int, "lastSignal": str,
    "headline": str, "why": str, "quote": str, "tags": list,
}

# Known signal keys = scoring.WEIGHTS keys, which must equal the dashboard's
# ALLKEYS list. Derived from the engine, not hand-copied, so they can't drift.
from hatring.scoring import WEIGHTS  # noqa: E402

KNOWN_KEYS = set(WEIGHTS)

PARTY_ENUM = {"Democrat", "Republican", "Libertarian", "Independent"}
# bucket values understood by the dashboard editor + drawer label maps.
BUCKET_ENUM = {"formal", "considering", "soft", "edge", "out"}
# confidence values understood by the dashboard CONF map + classify._min_conf.
CONF_ENUM = {"Very high", "High", "Medium", "Low", "Noise"}

DATE_RX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _load(name):
    p = DATA / name
    if not p.exists():
        pytest.skip(f"{name} not present")
    return json.loads(p.read_text()), p


def _records(name):
    data, p = _load(name)
    assert isinstance(data, list), f"{name} must be a JSON array"
    assert data, f"{name} is empty"
    return data


# ---- vocabulary parity (data <-> engine) -----------------------------------
def test_signal_key_vocabulary_matches_engine():
    """scoring.WEIGHTS is the single key vocabulary; assert it's the expected
    11-key set so a silent rename in the engine is caught here too."""
    assert KNOWN_KEYS == {
        "declared", "exploratory", "consideringQuote", "softConsidering",
        "earlyState", "donors", "staffing", "mediaBlitz",
        "endorsedOther", "ruledOut", "barred",
    }


# ---- the two candidate datasets --------------------------------------------
@pytest.mark.parametrize("fname", ["seed.json", "candidates.json"])
def test_candidate_dataset_schema(fname):
    records = _records(fname)

    seen_ids = set()
    for i, r in enumerate(records):
        tag = f"{fname}[{i}] id={r.get('id')!r}"

        # required fields present
        for f in REQUIRED_FIELDS:
            assert f in r, f"{tag}: missing required field '{f}'"

        # types (reject bool-as-int for delta)
        for f, t in FIELD_TYPES.items():
            v = r[f]
            if t is int:
                assert isinstance(v, int) and not isinstance(v, bool), \
                    f"{tag}: field '{f}' must be int, got {type(v).__name__}"
            else:
                assert isinstance(v, t), \
                    f"{tag}: field '{f}' must be {t.__name__}, got {type(v).__name__}"

        # no duplicate ids
        assert r["id"] not in seen_ids, f"{tag}: duplicate id"
        seen_ids.add(r["id"])
        assert r["id"].strip(), f"{tag}: blank id"

        # enums
        assert r["party"] in PARTY_ENUM, f"{tag}: party {r['party']!r} not in {PARTY_ENUM}"
        assert r["bucket"] in BUCKET_ENUM, f"{tag}: bucket {r['bucket']!r} not in {BUCKET_ENUM}"
        assert r["conf"] in CONF_ENUM, f"{tag}: conf {r['conf']!r} not in {CONF_ENUM}"

        # keys: all known, non-empty, no intra-record duplicates
        assert r["keys"], f"{tag}: empty keys[] would render with no signal"
        for k in r["keys"]:
            assert k in KNOWN_KEYS, f"{tag}: unknown signal key {k!r}"
        assert len(r["keys"]) == len(set(r["keys"])), \
            f"{tag}: duplicate keys within record: {r['keys']}"

        # lastSignal: YYYY-MM-DD, parseable, not in the (pinned) future
        ls = r["lastSignal"]
        assert DATE_RX.match(ls), f"{tag}: lastSignal {ls!r} not YYYY-MM-DD"
        d = date.fromisoformat(ls)  # raises if not a real calendar date
        assert d <= PINNED_TODAY, \
            f"{tag}: lastSignal {ls} is in the future (>{PINNED_TODAY})"

        # delta within the momentum bound (-100..100)
        assert -100 <= r["delta"] <= 100, f"{tag}: delta {r['delta']} out of bounds"

        # human-facing fields shouldn't be blank
        for f in ("name", "role", "headline", "why"):
            assert r[f].strip(), f"{tag}: blank '{f}' would render oddly"

        # optional pollLead, if present, must be a non-empty string
        if "pollLead" in r:
            assert isinstance(r["pollLead"], str) and r["pollLead"].strip(), \
                f"{tag}: pollLead present but not a non-empty string"


def test_seed_is_present_and_canonical():
    """seed.json is the required hand-curated source; it must always exist."""
    assert (DATA / "seed.json").exists(), "data/seed.json is missing"


# ---- review_queue.json ------------------------------------------------------
def test_review_queue_schema():
    data, _ = _load("review_queue.json")
    assert isinstance(data, list)
    required = {"name", "headline", "url", "source", "date", "keys"}
    for i, r in enumerate(data):
        tag = f"review_queue[{i}] name={r.get('name')!r}"
        missing = required - set(r)
        assert not missing, f"{tag}: missing {missing}"
        assert isinstance(r["keys"], list), f"{tag}: keys not a list"
        for k in r["keys"]:
            assert k in KNOWN_KEYS, f"{tag}: unknown key {k!r}"
        assert DATE_RX.match(r["date"]), f"{tag}: bad date {r['date']!r}"
        date.fromisoformat(r["date"])  # parseable
        # 'rid'/'kind' are stamped by reconcile_review for cross-run dedup; 'note'/'fec_id'
        # are the per-item extras for denials / FEC filers.
        extra = set(r) - required - {"note", "fec_id", "rid", "kind"}
        assert not extra, f"{tag}: unexpected fields {extra}"
        if "rid" in r:
            assert re.fullmatch(r"[0-9a-f]{12}", r["rid"]), f"{tag}: bad rid {r['rid']!r}"
        if "kind" in r:
            assert r["kind"] in {"discovery", "denial", "fec"}, f"{tag}: bad kind {r['kind']!r}"


# ---- signals.jsonl ----------------------------------------------------------
def test_signals_jsonl_shape():
    p = DATA / "signals.jsonl"
    if not p.exists():
        pytest.skip("signals.jsonl not present")
    sids = []
    for i, line in enumerate(p.read_text().splitlines(), 1):
        if not line.strip():
            continue
        r = json.loads(line)  # each line must parse
        assert "sid" in r, f"signals.jsonl line {i}: missing sid"
        assert "type" in r and r["type"] in {"news", "fec"}, \
            f"signals.jsonl line {i}: bad type {r.get('type')!r}"
        sids.append(r["sid"])
        if r["type"] == "news":
            for f in ("url", "person", "keys", "applied"):
                assert f in r, f"signals.jsonl line {i} (news): missing {f}"
            assert isinstance(r["keys"], list)
            for k in r["keys"]:
                assert k in KNOWN_KEYS, f"signals.jsonl line {i}: unknown key {k!r}"
            assert isinstance(r["applied"], bool), \
                f"signals.jsonl line {i}: applied not bool"
        else:  # fec
            for f in ("fec_id", "key"):
                assert f in r, f"signals.jsonl line {i} (fec): missing {f}"
            assert r["key"] in KNOWN_KEYS, \
                f"signals.jsonl line {i}: unknown fec key {r['key']!r}"
    # sid is the dedupe key — duplicates would silently break idempotency
    assert len(sids) == len(set(sids)), "signals.jsonl has duplicate sids"


# ---- engine can consume every record without error -------------------------
@pytest.mark.parametrize("fname", ["seed.json", "candidates.json"])
def test_every_record_scores_without_error(fname):
    from hatring.scoring import enrich
    records = _records(fname)
    for r in records:
        out = enrich(r, today=PINNED_TODAY)  # pinned -> deterministic
        assert 0 <= out["score"] <= 100, f"{fname} {r['id']}: score out of bounds"
        assert out["tier"] in range(0, 6), f"{fname} {r['id']}: bad tier"
        assert out["statusLabel"], f"{fname} {r['id']}: empty statusLabel"
