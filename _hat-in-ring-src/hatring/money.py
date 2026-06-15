"""Money Movement — FEC financial totals for tracked filers.

Kept strictly SEPARATE from momentum: money is a distinct seriousness axis and
is NEVER folded into the score (mission constraint 9). Non-filers are simply
absent from the artifact (the dashboard shows "not filed"), never zero — so a
declared filer with $0 is not conflated with someone who hasn't filed at all.

Writes data/financials.json: { candidate_id: {receipts, disbursements,
cash_on_hand, debts, committee, coverage_end, cycle, source, fetched} }.
Uses FEC_API_KEY when present; falls back to the client's DEMO_KEY behavior
(heavily rate-limited — failures are caught and the prior artifact is kept).
"""
from __future__ import annotations
import json
import logging
from datetime import date
from pathlib import Path

from .fec import FecClient

log = logging.getLogger("hatring.money")


def refresh(records: list[dict], out_path: Path, cycle: int = 2028,
            client: FecClient | None = None, today: date | None = None) -> dict:
    """Fetch totals for every record that has fec_ids; merge into the artifact.

    Returns the financials dict. Existing entries are preserved when a fetch
    fails so a transient FEC/DEMO_KEY error never blanks the panel.
    """
    client = client or FecClient()
    today = today or date.today()
    fin: dict[str, dict] = {}
    if out_path.exists():
        try:
            fin = json.loads(out_path.read_text())
        except (json.JSONDecodeError, OSError):
            fin = {}
    fetched = 0
    for r in records:
        for fid in (r.get("fec_ids") or []):
            tot = client.candidate_totals(fid, cycle=cycle)
            if tot:
                tot["fetched"] = today.isoformat()
                fin[r["id"]] = tot
                fetched += 1
                break
    out_path.write_text(json.dumps(fin, indent=2))
    log.info("money: %d/%d filer records have financials", fetched,
             sum(1 for r in records if r.get("fec_ids")))
    return fin


def attach(records: list[dict], fin_path: Path) -> int:
    """Attach `money` to records from the artifact (build-time, read-only).
    Records without an entry get no `money` key -> dashboard shows 'not filed'."""
    if not fin_path.exists():
        return 0
    try:
        fin = json.loads(fin_path.read_text())
    except (json.JSONDecodeError, OSError):
        return 0
    n = 0
    for r in records:
        m = fin.get(r["id"])
        if m:
            r["money"] = m
            n += 1
    return n
