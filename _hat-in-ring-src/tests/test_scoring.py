"""Scoring parity tests — these numbers must match the dashboard JS engine."""
from datetime import date
from hatring.scoring import derive_status, momentum, enrich

TODAY = date(2026, 6, 12)   # the build date the JS values were captured at


def test_newsom_considering_60():
    keys = ["consideringQuote", "earlyState", "donors", "staffing", "mediaBlitz"]
    assert derive_status(keys) == (3, "Actively considering")
    assert momentum(keys, "2026-05-28", TODAY) == 60   # 20+10+10+10+5+5 recency


def test_vance_positioning_30_despite_poll_lead():
    keys = ["donors", "staffing", "mediaBlitz"]
    assert derive_status(keys)[0] == 2                  # Positioning, not Considering
    assert momentum(keys, "2026-06-03", TODAY) == 30    # 10+10+5+5 recency


def test_trump_barred_zero():
    assert derive_status(["barred"]) == (0, "Ineligible (22nd Amdt)")
    assert momentum(["barred"], "2026-05-01", TODAY) == 0


def test_greaney_declared_but_stale():
    # declared (+40) but last signal >90d ago triggers -10 staleness, capped path
    assert derive_status(["declared"])[0] == 5
    assert momentum(["declared"], "2026-02-15", TODAY) == 30


def test_momentum_bounds_and_max():
    # single declarative (no stacking) + all behaviour + recency = realistic max 80
    keys = ["declared", "earlyState", "donors", "staffing", "mediaBlitz"]
    s = momentum(keys, "2026-06-10", TODAY)
    assert s == 80 and 0 <= s <= 100


def test_status_no_stacking():
    # having both a quote and a declaration -> status is Declared, not summed twice
    assert derive_status(["declared", "consideringQuote"])[0] == 5


def test_enrich_shape():
    rec = {"id": "x", "keys": ["consideringQuote"], "lastSignal": "2026-06-01"}
    e = enrich(rec, TODAY)
    assert e["tier"] == 3 and e["score"] > 0 and e["statusLabel"]
