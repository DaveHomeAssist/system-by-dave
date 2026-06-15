"""Adversarial classifier accuracy + routing battery.

Offline, deterministic, date-independent. Exercises EVERY signal key the
classifier can emit, the person-matching / discovery routing, the
source-gated confidence ceiling, and a set of adversarial cases (parody,
hedged paraphrase, unknown names, ambiguous denials).

Cases are split into three groups:

  * GOOD_*        — behaviour the current classifier gets right; these are
                    regression guards.
  * BUG_*         — documented MISclassifications. They assert the *current
                    (wrong) output* so the battery is green on today's code
                    AND pins the exact defect; each carries a comment with the
                    correct expectation. Flip the assertion the day the rule
                    is fixed.
  * GUARDRAIL_*   — routing guarantees (discovery flagging) that must hold.

Signal-key vocabulary (from scoring.WEIGHTS) the classifier is expected to
cover: declared, exploratory, consideringQuote, softConsidering, ruledOut,
earlyState, donors, staffing, mediaBlitz  — plus barred / endorsedOther which
exist in the model but, as these tests prove, the news classifier can NEVER
emit (curation-only keys).
"""
from __future__ import annotations

import pytest

from hatring.classify import classify_item
from hatring.news import NewsItem

# A representative watchlist (mirrors config.yaml ids/aliases).
WATCH = [
    {"id": "newsom", "name": "Gavin Newsom", "aliases": ["Gavin Newsom", "Newsom"]},
    {"id": "harris", "name": "Kamala Harris", "aliases": ["Kamala Harris", "Harris"]},
    {"id": "booker", "name": "Cory Booker", "aliases": ["Cory Booker", "Booker"]},
    {"id": "buttigieg", "name": "Pete Buttigieg", "aliases": ["Pete Buttigieg", "Buttigieg"]},
    {"id": "khanna", "name": "Ro Khanna", "aliases": ["Ro Khanna", "Khanna"]},
    {"id": "moore", "name": "Wes Moore", "aliases": ["Wes Moore"]},
    {"id": "vance", "name": "J.D. Vance", "aliases": ["JD Vance", "Vance"]},
    {"id": "rubio", "name": "Marco Rubio", "aliases": ["Marco Rubio", "Rubio"]},
    {"id": "trump", "name": "Donald Trump", "aliases": ["Donald Trump", "Trump"]},
    {"id": "whitmer", "name": "Gretchen Whitmer", "aliases": ["Gretchen Whitmer", "Whitmer"]},
    {"id": "pritzker", "name": "J.B. Pritzker", "aliases": ["JB Pritzker", "Pritzker"]},
    {"id": "gabbard", "name": "Tulsi Gabbard", "aliases": ["Tulsi Gabbard", "Gabbard"]},
    {"id": "bannon", "name": "Steve Bannon", "aliases": ["Steve Bannon", "Bannon"]},
]


def mk(title, source="AP News", summary="", date="2028-01-15"):
    """Deterministic NewsItem; url is stable per-title, date is pinned (no
    dependence on the real clock)."""
    return NewsItem(
        title=title,
        summary=summary,
        url="http://example/" + str(abs(hash(title))),
        source=source,
        published=date,
        query="q",
    )


def keys_of(title, **kw):
    c = classify_item(mk(title, **kw), WATCH)
    return c.keys if c else None


# ----------------------------------------------------------------------------
# GOOD: every signal key, classified correctly
# ----------------------------------------------------------------------------

@pytest.mark.parametrize("title,expected", [
    # declared
    ("Gavin Newsom announces 2028 presidential campaign", "declared"),
    ("Cory Booker files statement of candidacy for 2028", "declared"),
    ("Pete Buttigieg enters the race for the White House", "declared"),
    ("Ro Khanna declares his 2028 presidential bid", "declared"),
    # exploratory
    ("Wes Moore forms an exploratory committee for 2028", "exploratory"),
    ("Marco Rubio is testing the waters for a 2028 run", "exploratory"),
    # consideringQuote
    ("Kamala Harris seriously considering a 2028 run", "consideringQuote"),
    ("Gretchen Whitmer is weighing a presidential bid", "consideringQuote"),
    ("Cory Booker eyeing a 2028 White House run", "consideringQuote"),
    ("Ro Khanna mulling a 2028 presidential campaign", "consideringQuote"),
    # softConsidering (CLEAN phrasings that do not contain 'rule out')
    ("Newsom leaves the door open to a 2028 run", "softConsidering"),
    ("Booker: nothing off the table for 2028", "softConsidering"),
    ("Whitmer says never say never on 2028", "softConsidering"),
    ("Slotkin keeping her name in the mix for 2028", "softConsidering"),
    ("Khanna is open to a run in 2028", "softConsidering"),
    # ruledOut (UNAMBIGUOUS denials)
    ("Wes Moore says he is not running in 2028", "ruledOut"),
    ("Marco Rubio has no plans to run in 2028", "ruledOut"),
    ("Kamala Harris bows out of 2028 contention", "ruledOut"),
])
def test_good_declarative_keys(title, expected):
    assert expected in keys_of(title)


@pytest.mark.parametrize("title,expected", [
    ("Newsom to headline Iowa Democratic dinner", "earlyState"),
    ("Booker schedules New Hampshire town halls", "earlyState"),
    ("Newsom campaigns across South Carolina", "earlyState"),
    ("Buttigieg makes a Nevada swing", "earlyState"),
    ("Harris courts donors at a major fundraiser", "donors"),
    ("Vance forms a super PAC ahead of 2028", "donors"),
    ("Harris hires a veteran campaign manager", "staffing"),
    ("Khanna adds a veteran operative as chief strategist", "staffing"),
    ("Buttigieg launches a book tour and memoir", "mediaBlitz"),
    ("Booker does the Sunday show circuit", "mediaBlitz"),
])
def test_good_behaviour_keys(title, expected):
    assert expected in keys_of(title)


def test_no_political_signal_is_dropped():
    assert classify_item(mk("Newsom signs unrelated state budget bill"), WATCH) is None


def test_pure_denial_no_run_is_dropped_when_no_run_keyword():
    # "not thinking about 2028" carries no rule -> dropped (acceptable: nothing
    # to apply). Documents that a denial without a 'run' verb is silent.
    assert classify_item(mk("Walz says he is not thinking about 2028 at all"), WATCH) is None


# ----------------------------------------------------------------------------
# Person matching + discovery routing
# ----------------------------------------------------------------------------

def test_known_person_is_matched_not_discovery():
    c = classify_item(mk("Ro Khanna is seriously considering a 2028 run"), WATCH)
    assert c.person_id == "khanna"
    assert c.discovery is False
    assert c.matched_alias in ("Ro Khanna", "Khanna")


def test_unknown_person_routed_to_discovery():
    c = classify_item(mk("Senator Nobody McNobodyface weighing a 2028 White House run"), WATCH)
    assert c.person_id is None
    assert c.discovery is True
    # name_guess should strip the 'Senator' title and surface a usable name
    assert "Nobody" in c.name_guess and "Senator" not in c.name_guess


def test_never_heard_of_name_with_strong_signal_is_still_flagged_discovery():
    # Even a 'declared' headline about an unknown is held for review, not
    # silently injected into the live dataset.
    c = classify_item(mk("Jane Q. Public files statement of candidacy for 2028"), WATCH)
    assert "declared" in c.keys
    assert c.discovery is True and c.person_id is None


# ----------------------------------------------------------------------------
# Confidence is gated by min(source ceiling, signal strength)
# ----------------------------------------------------------------------------

def test_confidence_source_ceiling_caps_strong_signal():
    weak = classify_item(mk("Newsom files statement of candidacy", source="Some Random Blog"), WATCH)
    assert weak.confidence == "Low"          # unknown source -> Low ceiling


def test_confidence_reuters_declared_is_very_high():
    strong = classify_item(mk("Newsom files statement of candidacy", source="Reuters"), WATCH)
    assert strong.confidence == "Very high"


def test_confidence_behaviour_only_is_low_even_on_top_source():
    # earlyState alone has no declarative strength -> 'Low' regardless of source.
    c = classify_item(mk("Newsom to headline Iowa Democratic dinner", source="Reuters"), WATCH)
    assert c.confidence == "Low"


def test_confidence_softconsidering_capped_at_source():
    # softConsidering sig tier = Medium; Vanity Fair ceiling = Low -> Low wins.
    c = classify_item(mk("Newsom leaves the door open to a 2028 run", source="Vanity Fair"), WATCH)
    assert c.confidence == "Low"


# ----------------------------------------------------------------------------
# BUG: model keys the news classifier can NEVER emit (curation-only)
# ----------------------------------------------------------------------------

def test_bug_barred_is_unclassifiable():
    """'barred' is a scoring.WEIGHTS key but has NO classify rule.

    CORRECT behaviour: a clear '22nd Amendment / constitutionally ineligible'
    headline about Trump should yield the 'barred' key.
    ACTUAL (asserted): no rule matches -> item DROPPED entirely (None).
    """
    assert classify_item(mk("Donald Trump is barred by the 22nd Amendment for 2028"), WATCH) is None
    assert classify_item(mk("Trump constitutionally ineligible to run in 2028"), WATCH) is None


def test_bug_endorsedother_is_unclassifiable():
    """'endorsedOther' (-20 penalty) is in WEIGHTS but has no classify rule.

    CORRECT: 'Rubio endorses Vance' should yield 'endorsedOther'.
    ACTUAL: dropped (None).
    """
    assert classify_item(mk("Marco Rubio endorses J.D. Vance for 2028"), WATCH) is None


# ----------------------------------------------------------------------------
# BUG: ruledOut regex collides with 'rule out' inside soft phrasings
# ----------------------------------------------------------------------------

def test_bug_wont_rule_out_collides_with_ruledout():
    """'won't rule out' MEANS the person is OPEN (softConsidering).

    CORRECT: keys == ['softConsidering'] (or at least NOT ruledOut).
    ACTUAL (asserted): the 'rules? out' rule also fires, attaching 'ruledOut'.
    Downstream derive_status() then ranks ruledOut first -> status 'Ruled out',
    the exact OPPOSITE meaning. (Merge's DOWNGRADES guard saves *watchlisted*
    records by routing ruledOut to review, but a discovery item is mislabeled.)
    """
    c = classify_item(mk("Vance won't rule out a 2028 run"), WATCH)
    assert c.keys == ["softConsidering"]   # M1 FIXED: open posture, spurious ruledOut dropped


def test_bug_refuses_to_rule_out_is_pure_false_ruledout():
    """'refuses to rule out' is an OPEN posture (matches Bannon's seed quote).

    CORRECT: softConsidering.
    ACTUAL (asserted): softConsidering regex does NOT cover 'refuses to', so
    ONLY 'ruledOut' fires -> total semantic inversion (open candidate scored
    as having quit).  This is a false NEGATIVE on softConsidering AND a false
    POSITIVE on ruledOut simultaneously.
    """
    c = classify_item(mk("Steve Bannon refuses to rule out a 2028 run"), WATCH)
    assert c.keys == ["softConsidering"]   # M1 FIXED: 'refuses to rule out' is an OPEN posture


def test_bug_open_to_a_YEAR_run_is_dropped():
    """'open to a 2028 run' is an OPEN posture (softConsidering).

    CORRECT: softConsidering.
    ACTUAL (asserted): the softConsidering rule expects 'open to (a|the)?
    (run|bid|idea)' with no slot for a year between 'a' and 'run', so a year
    inserted ('a 2028 run') breaks the match -> item DROPPED. Phrasing-fragile
    false negative.
    """
    assert "softConsidering" in classify_item(mk("Khanna is open to a 2028 run"), WATCH).keys  # M5 FIXED: year slot
    # control: the same intent WITHOUT the year still classifies
    assert "softConsidering" in classify_item(mk("Khanna is open to a run in 2028"), WATCH).keys


def test_bug_cant_rule_anything_out_is_dropped():
    """'can't rule anything out' is Pritzker's literal curated quote (an OPEN
    posture).

    CORRECT: softConsidering.
    ACTUAL (asserted): no rule matches 'rule ANYTHING out' -> item DROPPED.
    A real 'considering' signal is silently lost (false negative).
    """
    assert "softConsidering" in classify_item(mk("Pritzker: I can't rule anything out for 2028"), WATCH).keys  # M5 FIXED


# ----------------------------------------------------------------------------
# BUG: 'declared' regex over-fires on launch/announce of NON-candidacy things
# ----------------------------------------------------------------------------

def test_bug_launches_pac_misread_as_declared():
    """'launches a leadership PAC' is a DONOR/PAC behavioural signal, not a
    formal candidacy.

    CORRECT: keys == ['donors'].
    ACTUAL (asserted): the 'launch(es)' alternative in the declared rule fires,
    so 'declared' (tier 5, momentum +40) is attached to a mere PAC launch.
    """
    c = classify_item(mk("Vance launches a leadership PAC and courts donors"), WATCH)
    assert "declared" not in c.keys      # H2 FIXED: a PAC launch is not a candidacy
    assert "donors" in c.keys


def test_bug_announces_book_tour_misread_as_declared():
    """'announces a book tour' is a media-blitz signal, not a candidacy.

    CORRECT: ['mediaBlitz'].
    ACTUAL (asserted): 'announces' fires the declared rule.
    """
    c = classify_item(mk("Buttigieg announces a national book tour and podcast"), WATCH)
    assert "declared" not in c.keys      # H2 FIXED: a book tour is not a candidacy
    assert "mediaBlitz" in c.keys


# ----------------------------------------------------------------------------
# BUG: PARODY / satire about a WATCHLISTED person is confidently mislabeled
# ----------------------------------------------------------------------------

def test_bug_parody_on_watchlisted_person_not_flagged():
    """A joke headline about a real watchlist person is taken literally.

    CORRECT: a parody marker ('Satire:', 'The Onion') should suppress the
    signal or force review.
    ACTUAL (asserted): classified 'declared', matched to the real person,
    discovery=False, confidence 'Very high' on a high-reliability source. The
    merge layer then promotes the live record to DECLARED with NO review.
    There is no parody guardrail anywhere in the classify path.
    """
    c = classify_item(mk("Satire: Gavin Newsom announces 2028 bid from the moon",
                         source="Reuters"), WATCH)
    assert c.keys == ["declared"]
    assert c.person_id == "newsom"
    assert c.discovery is True            # PARODY FIXED: forced to review, never auto-applied
    assert c.confidence == "Noise"


def test_bug_parody_unknown_name_only_saved_by_discovery():
    """A parody about a NON-watchlisted joke name is mislabeled 'declared' too,
    but is (incidentally) caught by discovery routing because the name is
    unknown — NOT because parody was detected."""
    c = classify_item(mk("The Onion: Abraham Lincoln announces shock 2028 bid"), WATCH)
    # H2 FIXED: the un-anchored "announces ... bid" no longer fires 'declared'.
    # (A real parody/satire guardrail is still a separate, open improvement.)
    assert c is None or "declared" not in c.keys


# ----------------------------------------------------------------------------
# BUG: hedged paraphrase classified with full 'considering' confidence
# ----------------------------------------------------------------------------

def test_bug_hedged_paraphrase_classified_as_firm_considering():
    """'allies suggest he MAY be mulling' is a hedged, second-hand paraphrase.

    CORRECT: should be down-weighted vs a direct quote, or flagged.
    ACTUAL (asserted): 'mulling a ... run' fires consideringQuote at full
    strength; the hedging ('sources say', 'may', 'allies suggest') is ignored.
    """
    c = classify_item(mk("Sources say Newsom may be mulling a 2028 run, allies suggest",
                         source="Politico"), WATCH)
    assert c.keys == ["softConsidering"]   # M6 FIXED: hedged hearsay demoted from tier 3
    assert c.confidence == "Medium"


# ----------------------------------------------------------------------------
# BUG: ambiguous denial ('won't rule out ... but no plans') gets BOTH keys
# ----------------------------------------------------------------------------

def test_bug_ambiguous_denial_gets_contradictory_keys():
    """'won't rule out 2028 but has no current plans to run' is genuinely
    ambiguous.

    ACTUAL (asserted): fires ruledOut ('rule out' substring + 'no plans to
    run') AND softConsidering ('won't rule out'). The classifier emits a
    contradictory key set rather than flagging low-confidence / review at the
    classify level. (Containment exists only downstream in merge.)
    """
    c = classify_item(mk("Cruz won't rule out 2028 but has no current plans to run"), WATCH)
    assert "ruledOut" not in c.keys and "softConsidering" in c.keys  # M1 FIXED: open wins


# ----------------------------------------------------------------------------
# GUARDRAIL: short-surname alias matching is greedy (false-positive person id)
# ----------------------------------------------------------------------------

def test_bug_short_alias_matches_wrong_person():
    """The 'Harris' surname alias matches an unrelated 'Mike Harris'.

    CORRECT: an unrelated person should be discovery, not bound to Kamala.
    ACTUAL (asserted): a real signal headline about a different 'Mike Harris'
    is bound to person_id 'harris' (Kamala) on the bare surname, so the wrong
    record is updated and the item never reaches discovery review.
    """
    c = classify_item(mk("Mike Harris is seriously considering a 2028 run for city council"), WATCH)
    assert c.person_id is None           # M4 FIXED: 'Mike Harris' is not Kamala Harris
    assert c.discovery is True
