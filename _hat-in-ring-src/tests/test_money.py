"""Money-movement tests: fetch/merge artifact, build-time attach, FEC parsing,
and the hard invariant that money NEVER enters the momentum score."""
from __future__ import annotations
import json
from datetime import date

from hatring import money
from hatring.fec import FecClient


class _FakeClient:
    def __init__(self, totals):
        self._t = totals

    def candidate_totals(self, fid, cycle=2028):
        return self._t.get(fid)


def test_refresh_only_filers_and_stamps(tmp_path):
    out = tmp_path / "financials.json"
    recs = [{"id": "a", "fec_ids": ["P1"]}, {"id": "b"}]   # b has no fec_ids
    fc = _FakeClient({"P1": {"receipts": 1000, "disbursements": 500}})
    fin = money.refresh(recs, out, client=fc, today=date(2026, 6, 15))
    assert "a" in fin and "b" not in fin                  # non-filer absent, not zero
    assert fin["a"]["receipts"] == 1000 and fin["a"]["fetched"] == "2026-06-15"
    assert json.loads(out.read_text())["a"]["receipts"] == 1000


def test_refresh_preserves_prior_on_fetch_miss(tmp_path):
    out = tmp_path / "financials.json"
    out.write_text(json.dumps({"a": {"receipts": 999}}))
    fin = money.refresh([{"id": "a", "fec_ids": ["P1"]}], out, client=_FakeClient({}))
    assert fin["a"]["receipts"] == 999                    # transient miss keeps prior


def test_attach_sets_money_only_for_known(tmp_path):
    fin = tmp_path / "financials.json"
    fin.write_text(json.dumps({"a": {"receipts": 5}}))
    recs = [{"id": "a"}, {"id": "b"}]
    assert money.attach(recs, fin) == 1
    assert recs[0]["money"] == {"receipts": 5} and "money" not in recs[1]


def test_candidate_totals_parses(monkeypatch):
    fc = FecClient(api_key="X")
    monkeypatch.setattr(fc, "_get", lambda path, **kw: {"results": [{
        "receipts": 10.0, "disbursements": 4.0, "last_cash_on_hand_end_period": 6.0,
        "last_debts_owed_by_committee": 1.0, "committee_name": "Cmte",
        "coverage_end_date": "2026-03-31", "cycle": 2028}]})
    t = fc.candidate_totals("P00")
    assert t["receipts"] == 10.0 and t["cash_on_hand"] == 6.0 and t["committee"] == "Cmte"


def test_candidate_totals_none_on_empty(monkeypatch):
    fc = FecClient(api_key="X")
    monkeypatch.setattr(fc, "_get", lambda path, **kw: {"results": []})
    assert fc.candidate_totals("P00") is None


def test_candidate_totals_none_on_error(monkeypatch):
    fc = FecClient(api_key="X")
    def boom(path, **kw):
        raise RuntimeError("rate limited")
    monkeypatch.setattr(fc, "_get", boom)
    assert fc.candidate_totals("P00") is None       # never raises -> run survives


def test_money_never_enters_scoring():
    from hatring.scoring import WEIGHTS
    for k in ("money", "receipts", "disbursements", "cash_on_hand"):
        assert k not in WEIGHTS
