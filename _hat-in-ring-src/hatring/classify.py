"""Signal classifier — turns a news headline into structured signal keys.

Deterministic by default (regex rules, no API key, fully testable). If
ANTHROPIC_API_KEY is set and use_llm=True, an LLM pass can adjudicate items the
rules flag as ambiguous (off by default; see classify_llm()).

Each classified item maps to:
  * one or more signal keys understood by scoring.py
  * a matched watchlist person id (or None -> candidate-discovery review)
  * a confidence, gated by source reliability AND signal strength
"""
from __future__ import annotations
import os
import re
import logging
from dataclasses import dataclass, field

from . import geo

log = logging.getLogger("hatring.classify")

# Ordered rules: (signal_key, compiled regex). First strong match sets status.
RULES: list[tuple[str, re.Pattern]] = [
    # NB: the verbs that aren't self-evidently about candidacy (announce/launch/declare/
    # kick off/mount/begin) MUST be anchored to a candidacy noun, else "launches a PAC" or
    # "announces a book tour" false-fires Declared (tier 5) onto the live board with no
    # review gate. "files statement of candidacy" / "enters the race" stand alone.
    ("declared", re.compile(r"\b(files? (a )?statement of candidacy|enters the race|(announces?|launch(es|ed)?|declares?|kicks? off|mounts?|begins?)( (a|his|her|their))?( 2028)?( presidential| white house)? (bid|campaign|run for president|run|candidacy))\b", re.I)),
    ("exploratory", re.compile(r"\b(exploratory committee|testing[- ]the[- ]waters|forms? an exploratory)\b", re.I)),
    ("consideringQuote", re.compile(r"\b(seriously (considering|weighing|thinking)|(consider(ing)?|weighing|mulling|ey(e|es|eing)|exploring|pursuing) a (2028 )?(presidential |white house )?(run|bid|campaign)|thinking about (it|running|a run|a 2028)|will (consider|look at) (it|that))\b", re.I)),
    # NB: every OPEN "rule out" phrasing (won't / wouldn't / refuses to / can't rule
    # anything out) lives here AND trips ruledOut's bare "rule out"; classify_item drops
    # the spurious ruledOut when softConsidering also fired (M1). The (2028 )? slot lets
    # "open to a 2028 run" match (M5).
    ("softConsidering", re.compile(r"\b(not?(t)? ruling (it )?out|won'?t rule (it )?out|would(n'?t)? rule (it )?out|refuses? to rule (it )?out|can'?t rule (it|anything|that) out|never say never|nothing off the table|leaves? (the )?door open|open to (a |the )?(2028 )?(presidential )?(run|bid|idea|campaign)|hasn'?t ruled out|doesn'?t rule out|keeping (his|her|their) name|keeps? (his|her|their) options)\b", re.I)),
    ("ruledOut", re.compile(r"\b(not running|won'?t run|rules? out|ruled out|no plans to run|will not (run|seek)|takes? (himself|herself) out|bows? out|not seeking)\b", re.I)),
]

# Hedged / second-hand paraphrase markers: a "considering" signal wrapped in these
# is hearsay, not a firm on-record quote, so it is demoted to softConsidering (M6).
HEDGE = re.compile(r"\b(sources?\s+say|reportedly|rumou?r|speculat|allies?\s+(say|suggest)|may be (mulling|considering|weighing|eyeing|exploring)|could be (mulling|considering|weighing)|is said to|believed to|hinted|reports?\s+suggest)\b", re.I)

# Parody / satire: never auto-apply to the live board — force the item to review.
_SATIRE_SOURCES = {"The Onion", "Babylon Bee", "The Babylon Bee", "ClickHole",
                   "Reductress", "The Hard Times", "Hard Drive"}
_SATIRE_RX = re.compile(r"\b(the onion|babylon bee|clickhole|reductress|the hard times|hard drive|satire|parody|spoof)\b", re.I)
BEHAVIOUR: list[tuple[str, re.Pattern]] = [
    ("earlyState", re.compile(r"\b(Iowa|New Hampshire|South Carolina|Nevada)\b")),
    ("donors", re.compile(r"\b(fundrais(er|ing)|donors?|bundlers?|super ?PAC|leadership PAC|PAC)\b", re.I)),
    ("staffing", re.compile(r"\b(hires?|campaign manager|chief strategist|consultants?|staffs? up|adds? (a |an )?(veteran|operative))\b", re.I)),
    ("mediaBlitz", re.compile(r"\b(Sunday show|podcast|book tour|memoir|media (tour|blitz)|sit-down interview)\b", re.I)),
]

STRENGTH = {"declared": 5, "exploratory": 4, "consideringQuote": 3,
            "ruledOut": 3, "softConsidering": 2}


def _min_conf(a: str, b: str) -> str:
    order = ["Noise", "Low", "Medium", "High", "Very high"]
    return order[min(order.index(a), order.index(b))]


@dataclass
class Classified:
    person_id: str | None
    name_guess: str
    keys: list[str]
    confidence: str
    headline: str
    url: str
    source: str
    date: str
    quote: str = ""
    matched_alias: str | None = None
    discovery: bool = False           # True -> name not on watchlist
    tags: list[str] = field(default_factory=list)
    states: list[str] = field(default_factory=list)   # early-state codes (IA/NH/SC/NV)


_TITLES = {"Senator", "Sen", "Sen.", "Gov", "Gov.", "Governor", "Rep", "Rep.",
           "Representative", "President", "Secretary", "Mayor", "Former", "The",
           "A", "Congressman", "Congresswoman", "Vice"}


def _guess_name(title: str) -> str:
    """Best-effort proper-name extraction for the discovery review queue."""
    for run in re.findall(r"(?:[A-Z][a-zA-Z.'-]+ )+[A-Z][a-zA-Z.'-]+", title):
        words = [w for w in run.split() if w not in _TITLES]
        if len(words) >= 2:
            return " ".join(words[:3])
    return title.split(" - ")[0][:40]


def _match_person(text: str, watchlist: list[dict]):
    """Return (id, alias) for the first watchlist person whose alias appears.

    A bare single-token surname alias (e.g. "Harris") only matches if it is NOT
    immediately preceded by a different capitalized first name — so "Mike Harris"
    does not bind to Kamala Harris (M4). A title ("Gov.", "Sen.") or the person's
    own first name before the surname is fine; sentence-initial use is allowed.
    """
    for p in watchlist:
        first = p["name"].split()[0]
        for alias in (p.get("aliases") or [p["name"]]):
            for m in re.finditer(r"\b" + re.escape(alias) + r"\b", text, re.I):
                if " " not in alias:                       # bare surname / single token
                    prev = re.search(r"([A-Z][a-zA-Z.'\-]+)\s+$", text[:m.start()])
                    if prev and prev.group(1) not in _TITLES and prev.group(1).lower() != first.lower():
                        continue                            # different person, same surname
                return p["id"], alias
    return None, None


def classify_item(item, watchlist: list[dict]) -> Classified | None:
    text = f"{item.title}. {item.summary}"
    keys: list[str] = []
    for key, rx in RULES:
        if rx.search(text):
            keys.append(key)
    for key, rx in BEHAVIOUR:
        if rx.search(text):
            keys.append(key)

    # M1: an OPEN "won't / can't / refuses to rule out" reads as softConsidering,
    # not a denial — drop the spurious ruledOut that the bare "rule out" substring
    # tripped, so the status is not inverted to its opposite.
    if "softConsidering" in keys and "ruledOut" in keys:
        keys = [k for k in keys if k != "ruledOut"]
    # M6: a hedged / second-hand "considering" paraphrase is hearsay, not a firm
    # on-record quote — demote it from consideringQuote (tier 3) to softConsidering.
    if "consideringQuote" in keys and HEDGE.search(text):
        keys = ["softConsidering" if k == "consideringQuote" else k for k in keys]
    keys = list(dict.fromkeys(keys))                # dedup, preserve order
    if not keys:
        return None                                 # no political signal -> drop

    # strongest remaining declarative drives confidence (RULES are strength-ordered)
    declarative = next((k for k, _ in RULES if k in keys), None)
    sig_conf = {5: "Very high", 4: "High", 3: "High", 2: "Medium"}.get(
        STRENGTH.get(declarative, 0), "Low")
    confidence = _min_conf(item.confidence_ceiling, sig_conf)

    pid, alias = _match_person(text, watchlist)
    # Parody/satire never auto-applies to the live board: force it to review
    # (discovery) and cap confidence to Noise, even for a matched watchlist person.
    satire = bool(_SATIRE_RX.search(text)) or item.source in _SATIRE_SOURCES
    if satire:
        confidence = "Noise"
    # Early-state geo tagging: when the earlyState signal fired, capture WHICH
    # of IA/NH/SC/NV the headline names so the Early-State Big Board can attribute
    # activity. Empty when earlyState didn't fire (or no state named).
    states = geo.tag_states(text) if "earlyState" in keys else []
    return Classified(
        person_id=pid,
        name_guess=alias or _guess_name(item.title),
        # Total order (strength desc, then name) so the key list — and the dedup sid
        # derived from it — is identical across processes regardless of PYTHONHASHSEED.
        keys=sorted(set(keys), key=lambda k: (-STRENGTH.get(k, 0), k)),
        confidence=confidence,
        headline=item.title.strip(),
        url=item.url, source=item.source, date=item.published,
        matched_alias=alias, discovery=(pid is None) or satire,
        tags=[item.source] if item.source else [],
        states=states,
    )


def classify_batch(items, watchlist) -> list[Classified]:
    out = [c for c in (classify_item(i, watchlist) for i in items) if c]
    log.info("classify: %d/%d items carried a signal (%d unmatched/discovery)",
             len(out), len(items), sum(1 for c in out if c.discovery))
    return out


# ---- optional LLM adjudication (disabled unless explicitly enabled) --------
def classify_llm(items, watchlist):
    """Hook for an Anthropic-API pass over ambiguous items.

    Intentionally a thin, documented stub: enabling it is a deliberate choice
    that adds a paid dependency. The deterministic path above is the supported,
    tested default. Implement by batching item text to the Messages API with a
    JSON-schema'd tool call returning {person, keys[], confidence, quote}.
    """
    raise NotImplementedError(
        "LLM classification is an opt-in upgrade. Set ANTHROPIC_API_KEY and "
        "implement the Messages-API call here; the rules engine is the default."
    )


def llm_available() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))
