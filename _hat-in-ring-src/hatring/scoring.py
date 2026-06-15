"""Status + momentum scoring engine.

This is the Python source of truth for the model and is kept in exact parity
with the JavaScript engine embedded in templates/dashboard.html.j2. Both axes:

  * STATUS TIER  - the furthest *verifiable step* a person has taken
                   (Declared > Exploratory > Considering > Positioning >
                   Floated > Inactive). No stacking: the single highest
                   declarative signal wins.
  * MOMENTUM     - weighted sum of behavioural activity + a continuous
                   recency term, capped 0-100.

tests/test_scoring.py asserts the numbers here match the values produced by
the dashboard JS (Newsom 60, Vance 30, Trump 0, Greaney 30).
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Iterable

# weight, human label  (mirrors WEIGHTS in the template)
WEIGHTS: dict[str, tuple[int, str]] = {
    "declared":         (40,  "Formal FEC candidacy / launch"),
    "exploratory":      (30,  "Exploratory committee"),
    "consideringQuote": (20,  'Direct "considering" quote'),
    "softConsidering":  (12,  'Soft / "not ruling out" quote'),
    "earlyState":       (10,  "Early-state travel (IA/NH/SC/NV)"),
    "donors":           (10,  "Donor meetings / PAC activity"),
    "staffing":         (10,  "Campaign staffing / consultants"),
    "mediaBlitz":       (5,   "National media blitz"),
    "endorsedOther":    (-20, "Endorsed another likely candidate"),
    "ruledOut":         (-40, "Explicitly ruled out"),
    "barred":           (-100, "Constitutionally ineligible"),
}

TIERS = {
    5: "Declared", 4: "Exploratory", 3: "Considering",
    2: "Positioning", 1: "Floated", 0: "Inactive",
}

# declarative signals, highest first (status axis takes the first present)
_DECLARATIVE = ["declared", "exploratory", "consideringQuote", "softConsidering"]
_BEHAVIOURAL = ["earlyState", "donors", "staffing", "mediaBlitz"]
_PENALTIES = ["endorsedOther", "ruledOut", "barred"]


def _to_date(d) -> date:
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    return datetime.strptime(str(d)[:10], "%Y-%m-%d").date()


def days_since(signal_date, today: date | None = None) -> int:
    today = today or date.today()
    return (today - _to_date(signal_date)).days


def recency_term(signal_date, today: date | None = None):
    """Continuous recency: +5 if <=30d, 0 in 30-90d window, -10 if stale."""
    n = days_since(signal_date, today)
    if n <= 30:
        return (5, f"Recency boost (signal {n}d ago)")
    if n > 90:
        return (-10, f"Stale (no signal {n}d)")
    return None


def derive_status(keys: Iterable[str]) -> tuple[int, str]:
    keys = set(keys)
    if "barred" in keys:
        return 0, "Ineligible (22nd Amdt)"
    if "ruledOut" in keys:
        return 0, "Ruled out"
    if "declared" in keys:
        return 5, "Declared"
    if "exploratory" in keys:
        return 4, "Exploratory"
    if "consideringQuote" in keys:
        return 3, "Actively considering"
    if keys & set(_BEHAVIOURAL):
        return 2, "Positioning"
    if "softConsidering" in keys:
        return 1, "Floated / not ruling out"
    return 0, "Inactive"


def breakdown(keys: Iterable[str], last_signal, today: date | None = None):
    """Itemised (label, weight) list explaining the momentum score."""
    keys = list(keys)
    items: list[tuple[str, int]] = []
    top = next((k for k in _DECLARATIVE if k in keys), None)
    if top:
        items.append((WEIGHTS[top][1], WEIGHTS[top][0]))
    for k in _BEHAVIOURAL:
        if k in keys:
            items.append((WEIGHTS[k][1], WEIGHTS[k][0]))
    r = recency_term(last_signal, today)
    if r:
        items.append((r[1], r[0]))
    for k in _PENALTIES:
        if k in keys:
            items.append((WEIGHTS[k][1], WEIGHTS[k][0]))
    return items


def momentum(keys: Iterable[str], last_signal, today: date | None = None) -> int:
    total = sum(w for _, w in breakdown(keys, last_signal, today))
    return max(0, min(100, total))


def enrich(record: dict, today: date | None = None) -> dict:
    tier, label = derive_status(record.get("keys", []))
    out = dict(record)
    out["tier"] = tier
    out["statusLabel"] = label
    out["score"] = momentum(record.get("keys", []), record["lastSignal"], today)
    return out
