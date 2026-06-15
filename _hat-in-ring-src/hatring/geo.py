"""Early-state geography helpers (IA / NH / SC / NV).

Single source of truth for the four early nominating states so the classifier
(state tagging) and the build step (backfilling `early_states` from existing
headlines) agree. No external geo service — the dashboard renders the four
states as static SVG, so we only ever need state codes + display names.
"""
from __future__ import annotations
import re

# code -> (display name, regex of how it appears in headlines)
EARLY_STATES = {
    "IA": ("Iowa", re.compile(r"\bIowa\b")),
    "NH": ("New Hampshire", re.compile(r"\bNew Hampshire\b")),
    "SC": ("South Carolina", re.compile(r"\bSouth Carolina\b")),
    "NV": ("Nevada", re.compile(r"\bNevada\b")),
}
STATE_NAME = {code: name for code, (name, _) in EARLY_STATES.items()}


def tag_states(text: str) -> list[str]:
    """Return the early-state codes mentioned in `text` (order: IA,NH,SC,NV)."""
    if not text:
        return []
    return [code for code, (_, rx) in EARLY_STATES.items() if rx.search(text)]


def backfill_early_states(records) -> int:
    """Populate `early_states` {code: count} from a record's existing headline
    when it carries the `earlyState` key but has no per-state detail yet (the
    state wasn't captured when the signal was first ingested). Forward-looking
    ingest fills this precisely; this just makes pre-existing records demoable.
    Returns the number of records backfilled. Never overwrites existing detail.
    """
    n = 0
    for r in records:
        if "earlyState" not in (r.get("keys") or []):
            continue
        if r.get("early_states"):
            continue
        states = tag_states(" ".join(str(r.get(f, "")) for f in ("headline", "role")))
        if states:
            r["early_states"] = {s: 1 for s in states}
            r.setdefault("early_states_last", {})
            for s in states:
                r["early_states_last"][s] = r.get("lastSignal", "")
            n += 1
    return n
