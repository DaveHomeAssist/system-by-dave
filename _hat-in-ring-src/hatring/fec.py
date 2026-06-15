"""FEC OpenFEC API client — formal candidacy signals for the 2028 cycle.

Pulls presidential candidates whose cycle list includes the target year and
turns each into a structured signal:

  * has a Statement of Candidacy (Form F2) / principal committee -> 'declared'
  * registered but no F2 yet                                     -> 'exploratory'

Requires a free api.data.gov key (https://api.data.gov/signup/). DEMO_KEY works
for light testing but is heavily rate-limited.

Docs: https://api.open.fec.gov/developers/
"""
from __future__ import annotations
import os
import time
import logging
from dataclasses import dataclass
from typing import Iterator
import requests

log = logging.getLogger("hatring.fec")
BASE = "https://api.open.fec.gov/v1"

# FEC party codes -> our lane labels
PARTY = {"DEM": "Democrat", "REP": "Republican", "LIB": "Libertarian",
         "GRE": "Independent", "IND": "Independent", "NON": "Independent"}


@dataclass
class FecSignal:
    fec_id: str
    name: str            # "LASTNAME, FIRSTNAME" as FEC stores it
    party: str
    key: str             # 'declared' | 'exploratory'
    confidence: str
    headline: str
    filing_date: str | None
    committee_id: str | None

    def display_name(self) -> str:
        if "," in self.name:
            last, first = [s.strip() for s in self.name.split(",", 1)]
            return f"{first} {last}".title()
        return self.name.title()


class FecClient:
    def __init__(self, api_key: str | None = None, session: requests.Session | None = None):
        self.api_key = api_key or os.environ.get("FEC_API_KEY", "DEMO_KEY")
        self.s = session or requests.Session()
        self.s.headers.update({"User-Agent": "hat-in-ring-radar/1.0"})

    def _get(self, path: str, **params) -> dict:
        params["api_key"] = self.api_key
        for attempt in range(4):
            r = self.s.get(f"{BASE}{path}", params=params, timeout=20)
            if r.status_code == 429:               # rate limited -> back off
                wait = 2 ** attempt
                log.warning("FEC 429, backing off %ss", wait)
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        raise RuntimeError("FEC API: exhausted retries (rate limited)")

    def candidate_totals(self, fec_id: str, cycle: int = 2028) -> dict | None:
        """Compact financial totals for a candidate, or None if unavailable.

        Money is a SEPARATE seriousness axis — this never feeds scoring. Any
        error (rate limit, missing data, network) returns None so the caller
        keeps the prior artifact rather than zeroing a candidate out.
        """
        try:
            data = self._get(f"/candidate/{fec_id}/totals/",
                             cycle=cycle, per_page=1, sort="-cycle")
        except Exception as e:                       # noqa: BLE001 - never kill the run
            log.warning("FEC totals %s failed: %s", fec_id, e)
            return None
        results = data.get("results") or []
        if not results:
            return None
        t = results[0]
        return {
            "receipts": t.get("receipts"),
            "disbursements": t.get("disbursements"),
            "cash_on_hand": t.get("last_cash_on_hand_end_period"),
            "debts": t.get("last_debts_owed_by_committee"),
            "committee": t.get("committee_name"),
            "coverage_end": t.get("coverage_end_date"),
            "cycle": t.get("cycle"),
            "source": f"https://www.fec.gov/data/candidate/{fec_id}/",
        }

    def presidential_candidates(self, year: int = 2028) -> Iterator[dict]:
        """Paginate every presidential candidate whose cycles include `year`."""
        page = 1
        while True:
            # NB: do NOT pass cycle=2028 — for a future election the FEC reporting
            # cycle is still 2026, so that filter returns nothing. Filter the
            # response on election_years / active_through instead.
            data = self._get(
                "/candidates/", office="P", election_year=year,
                per_page=100, page=page, sort="name",
            )
            results = data.get("results", [])
            for row in results:
                eyears = row.get("election_years") or []
                if year in eyears or row.get("active_through") == year:
                    yield row
            pag = data.get("pagination", {})
            if page >= (pag.get("pages") or 1):
                break
            page += 1

    def signals(self, year: int = 2028) -> list[FecSignal]:
        out: list[FecSignal] = []
        for c in self.presidential_candidates(year):
            status = c.get("candidate_status")        # C=statutory candidate
            has_cmte = bool(c.get("principal_committees") or c.get("committee_id"))
            # A statutory candidate (>$5k raised/spent + F2) is "declared".
            if status == "C" or has_cmte:
                key, conf = "declared", "Very high"
                head = "Filed FEC Statement of Candidacy (Form 2)"
            else:
                key, conf = "exploratory", "High"
                head = "Registered with FEC (no Form 2 yet)"
            out.append(FecSignal(
                fec_id=c.get("candidate_id", ""),
                name=c.get("name", ""),
                party=PARTY.get(c.get("party"), "Independent"),
                key=key, confidence=conf, headline=head,
                filing_date=(c.get("first_file_date") or c.get("last_file_date")),
                committee_id=(c.get("principal_committees") or [{}])[0].get("committee_id")
                if c.get("principal_committees") else c.get("committee_id"),
            ))
        log.info("FEC: %d presidential signals for %d", len(out), year)
        return out
