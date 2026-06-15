"""Early-state geo tests: state tagging in the classifier + headline backfill."""
from __future__ import annotations

from hatring import geo
from hatring.classify import classify_item
from hatring.news import NewsItem

WATCH = [{"id": "newsom", "name": "Gavin Newsom", "aliases": ["Gavin Newsom", "Newsom"]}]


def _item(title):
    return NewsItem(title=title, summary="", url="http://x/" + str(hash(title)),
                    source="AP News", published="2026-06-10", query="q")


def test_tag_states_order_and_empty():
    assert geo.tag_states("rally in Iowa and New Hampshire") == ["IA", "NH"]
    assert geo.tag_states("South Carolina and Nevada swing") == ["SC", "NV"]
    assert geo.tag_states("nothing relevant here") == []
    assert geo.tag_states("") == []


def test_classify_sets_states_on_earlystate():
    c = classify_item(_item("Newsom to headline South Carolina Democratic dinner"), WATCH)
    assert "earlyState" in c.keys and c.states == ["SC"]


def test_classify_no_states_without_earlystate():
    c = classify_item(_item("Newsom files statement of candidacy for 2028"), WATCH)
    assert c.states == []


def test_backfill_early_states_from_headline():
    recs = [{"id": "a", "keys": ["earlyState"], "headline": "Big town hall in Nevada",
             "role": "x", "lastSignal": "2026-06-01"}]
    assert geo.backfill_early_states(recs) == 1
    assert recs[0]["early_states"] == {"NV": 1}
    assert recs[0]["early_states_last"]["NV"] == "2026-06-01"
    # idempotent: never overwrites existing detail
    assert geo.backfill_early_states(recs) == 0


def test_backfill_skips_records_without_earlystate_key():
    recs = [{"id": "b", "keys": ["donors"], "headline": "Iowa fundraiser", "role": "", "lastSignal": "2026-06-01"}]
    assert geo.backfill_early_states(recs) == 0
    assert "early_states" not in recs[0]
