"""Classifier tests — headline -> signal keys + person match + confidence."""
from hatring.classify import classify_item
from hatring.news import NewsItem

WATCH = [
    {"id": "newsom", "name": "Gavin Newsom", "aliases": ["Gavin Newsom", "Newsom"]},
    {"id": "khanna", "name": "Ro Khanna", "aliases": ["Ro Khanna", "Khanna"]},
    {"id": "moore", "name": "Wes Moore", "aliases": ["Wes Moore"]},
]


def item(title, source="AP News", summary="", date="2026-06-10"):
    return NewsItem(title=title, summary=summary, url="http://x/" + str(hash(title)),
                    source=source, published=date, query="q")


def test_declared():
    c = classify_item(item("Jane Doe files statement of candidacy for 2028"), WATCH)
    assert "declared" in c.keys


def test_considering_matches_person():
    c = classify_item(item("Ro Khanna says he is seriously considering a 2028 run"), WATCH)
    assert c.person_id == "khanna" and "consideringQuote" in c.keys


def test_soft_not_ruling_out():
    c = classify_item(item("Gavin Newsom is not ruling out a 2028 bid"), WATCH)
    assert c.person_id == "newsom" and "softConsidering" in c.keys


def test_ruled_out():
    c = classify_item(item("Wes Moore says he is not running in 2028"), WATCH)
    assert "ruledOut" in c.keys


def test_behaviour_early_state():
    c = classify_item(item("Newsom to headline Iowa Democratic dinner"), WATCH)
    assert "earlyState" in c.keys


def test_unmatched_is_discovery():
    c = classify_item(item("Senator Nobody weighing a 2028 White House run"), WATCH)
    assert c.discovery is True and c.person_id is None


def test_no_signal_dropped():
    assert classify_item(item("Newsom signs unrelated state budget bill"), WATCH) is None


def test_confidence_gated_by_source():
    strong = classify_item(item("X files statement of candidacy", source="Reuters"), WATCH)
    weak = classify_item(item("X files statement of candidacy", source="Some Blog"), WATCH)
    assert weak.confidence == "Low"          # unknown source capped low
    assert strong.confidence == "Very high"  # Reuters + strong signal


# ---- false-positive regressions: bare "announces"/"launches" must NOT declare ----
# These are the exact cases seen live on the board (Landrieu #2 "Declared", Yang
# "Declared"): a non-candidacy announce/launch tripped the declared rule. The
# declared verb must be anchored to a candidacy noun.

def test_announces_non_candidacy_is_not_declared():
    c = classify_item(item("Mitch Landrieu announces new infrastructure tour"), WATCH)
    assert c is None or "declared" not in c.keys

def test_launches_non_candidacy_is_not_declared():
    c = classify_item(item("Andrew Yang launches a mobile network for families"), WATCH)
    assert c is None or "declared" not in c.keys

def test_real_campaign_launch_still_declares():
    c = classify_item(item("Mitch Landrieu launches 2028 presidential campaign"), WATCH)
    assert "declared" in c.keys                     # genuine declaration still fires

def test_files_statement_still_declares():
    c = classify_item(item("Andrew Yang files statement of candidacy with the FEC"), WATCH)
    assert "declared" in c.keys
