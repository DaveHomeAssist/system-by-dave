"""Merge classified signals + FEC signals into the candidate dataset.

Responsibilities:
  * dedupe incoming signals against an append-only audit log (signals.jsonl)
    keyed by (person, signal_key, url) so re-running is idempotent;
  * apply new signal keys to the matching record, advancing lastSignal,
    headline and quote when the incoming signal is stronger/newer;
  * record a status-history entry whenever the tier changes;
  * recompute the 7-day delta from momentum snapshots;
  * auto-create records for new FEC filers not yet tracked;
  * route unmatched news (discovery) to a review queue instead of polluting
    the live dataset.

Human-curated fields (why, role, bucket overrides) are never overwritten by
automation — automation only *adds* keys and refreshes the latest signal.
"""
from __future__ import annotations
import hashlib
import json
import logging
import re
from datetime import date, timedelta
from pathlib import Path

from .scoring import momentum as _momentum, derive_status as _status

log = logging.getLogger("hatring.merge")

_KEY_STRENGTH = {"declared": 5, "exploratory": 4, "consideringQuote": 3,
                 "ruledOut": 3, "softConsidering": 2, "barred": 6}

_DOWNGRADE_KEYS = {"ruledOut", "barred"}


def review_rid(name: str, url: str, keys) -> str:
    """Stable id for a review-queue item so it dedups across pipeline runs."""
    basis = f"{name}|{url}|{','.join(sorted(keys or []))}"
    return hashlib.sha1(basis.encode("utf-8")).hexdigest()[:12]


def _review_kind(item: dict) -> str:
    if item.get("fec_id"):
        return "fec"
    if item.get("note") or (_DOWNGRADE_KEYS & set(item.get("keys") or [])):
        return "denial"
    return "discovery"


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s or "unnamed"


def _sig_id(person_id: str, key: str, url: str) -> str:
    return f"{person_id}|{key}|{url}"


def _load_jsonl(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {json.loads(l)["sid"] for l in path.read_text().splitlines() if l.strip()}


def _append_jsonl(path: Path, rows: list[dict]) -> None:
    with path.open("a") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")


def _strength(keys) -> int:
    return max((_KEY_STRENGTH.get(k, 1) for k in keys), default=0)


class Dataset:
    def __init__(self, records: list[dict], today: date | None = None):
        self.records = records
        self.by_id = {r["id"]: r for r in records}
        self.today = today or date.today()
        self.review: list[dict] = []      # discovery items needing a human

    # ---- snapshots for delta -------------------------------------------
    def _snapshot(self) -> dict[str, int]:
        return {r["id"]: _momentum(r.get("keys", []), r["lastSignal"], self.today)
                for r in self.records}

    # ---- applying one classified news signal ---------------------------
    def apply_news(self, c) -> bool:
        if c.discovery or not c.person_id or c.person_id not in self.by_id:
            self.review.append({"name": c.name_guess, "headline": c.headline,
                                 "url": c.url, "source": c.source,
                                 "date": c.date, "keys": c.keys})
            return False
        rec = self.by_id[c.person_id]
        changed = False
        before_tier = _status(rec.get("keys", []))[0]
        # High-impact downgrades (explicit denials / ineligibility) are NOT applied
        # automatically — one ambiguously-worded headline shouldn't nuke a record.
        # They go to review for human confirmation (the spec's "source conflict").
        DOWNGRADES = {"ruledOut", "barred"}
        if DOWNGRADES & set(c.keys):
            self.review.append({"name": rec["name"], "headline": c.headline,
                                "url": c.url, "source": c.source, "date": c.date,
                                "keys": [k for k in c.keys if k in DOWNGRADES],
                                "note": "denial/downgrade — confirm before applying"})
        for k in c.keys:
            if k in DOWNGRADES:
                continue
            if k not in rec["keys"]:
                rec["keys"].append(k)
                changed = True
        # Early-state activity tally (Big Board). Automation-ADDED activity data,
        # not a curated field, so it's safe to accumulate. Idempotent: update()
        # only calls apply_news for signals not already in the dedup log.
        if "earlyState" in c.keys and getattr(c, "states", None):
            es = rec.setdefault("early_states", {})
            last = rec.setdefault("early_states_last", {})
            for stt in c.states:
                es[stt] = es.get(stt, 0) + 1
                last[stt] = c.date
                changed = True
        # refresh "latest signal" if this item is newer
        if c.date >= rec.get("lastSignal", "0000-00-00"):
            rec["lastSignal"] = c.date
            rec["headline"] = c.headline
            if c.quote:
                rec["quote"] = c.quote
            changed = True
        after_tier = _status(rec.get("keys", []))[0]
        if after_tier != before_tier:
            rec.setdefault("history", []).append(
                {"date": c.date, "from": before_tier, "to": after_tier,
                 "reason": c.headline})
        return changed

    # ---- applying one FEC signal (authoritative) -----------------------
    def apply_fec(self, sig, autocreate: bool = False) -> bool:
        rec = None
        for r in self.records:
            if sig.fec_id and sig.fec_id in (r.get("fec_ids") or []):
                rec = r
                break
        if rec is None:                       # match by name as fallback
            dn = sig.display_name().lower()
            rec = next((r for r in self.records if r["name"].lower() == dn), None)
        fdate = (sig.filing_date or self.today.isoformat())[:10]
        if rec is None and not autocreate:
            # Unknown FEC filer — the registry is full of perennial/nuisance
            # candidates. Only surface ones that cleared a real bar (a registered
            # principal committee); drop the rest as noise. Matched watchlist
            # people always apply, regardless of committee status.
            if sig.committee_id:
                self.review.append({"name": sig.display_name(), "headline": sig.headline,
                                    "url": f"https://www.fec.gov/data/candidate/{sig.fec_id}/",
                                    "source": "FEC", "date": fdate,
                                    "keys": [sig.key], "fec_id": sig.fec_id})
            return False
        if rec is None:                       # brand-new filer -> create
            rec = {
                "id": "fec-" + sig.fec_id.lower(),
                "name": sig.display_name(), "party": sig.party,
                "role": "FEC-registered candidate", "bucket": "formal",
                "keys": [sig.key], "conf": sig.confidence, "delta": 0,
                "lastSignal": fdate, "headline": sig.headline,
                "why": "Surfaced from FEC filings; not yet curated.",
                "quote": "", "tags": ["FEC", sig.fec_id],
                "fec_ids": [sig.fec_id],
            }
            self.records.append(rec)
            self.by_id[rec["id"]] = rec
            log.info("FEC: new filer %s (%s)", rec["name"], sig.fec_id)
            return True
        # known person: ensure FEC id + declarative key recorded
        rec.setdefault("fec_ids", [])
        if sig.fec_id and sig.fec_id not in rec["fec_ids"]:
            rec["fec_ids"].append(sig.fec_id)
        changed = False
        if sig.key not in rec["keys"]:
            before = _status(rec["keys"])[0]
            rec["keys"].append(sig.key)
            after = _status(rec["keys"])[0]
            if after != before:
                rec.setdefault("history", []).append(
                    {"date": fdate, "from": before, "to": after,
                     "reason": sig.headline})
            rec["conf"] = sig.confidence
            changed = True
        return changed

    # ---- orchestrated update ------------------------------------------
    def update(self, classified: list, fec_signals: list, audit: Path,
               fec_autocreate: bool = False):
        before = self._snapshot()
        seen = _load_jsonl(audit)
        fresh_rows: list[dict] = []

        for sig in fec_signals:
            sid = _sig_id(sig.fec_id, sig.key, "fec")
            if sid in seen:
                continue
            if self.apply_fec(sig, autocreate=fec_autocreate):
                fresh_rows.append({"sid": sid, "type": "fec",
                                   "fec_id": sig.fec_id, "key": sig.key})

        applied = 0
        for c in classified:
            sid = _sig_id(c.person_id or c.name_guess, ",".join(c.keys), c.url)
            if sid in seen:
                continue
            ok = self.apply_news(c)
            fresh_rows.append({"sid": sid, "type": "news", "url": c.url,
                               "person": c.person_id, "keys": c.keys,
                               "applied": ok})
            applied += int(ok)

        # recompute deltas from momentum movement
        after = self._snapshot()
        for r in self.records:
            r["delta"] = after.get(r["id"], 0) - before.get(r["id"], 0)

        _append_jsonl(audit, fresh_rows)
        # Stamp every review item with a stable id + kind so the queue can be
        # persisted and deduped across runs (see pipeline.reconcile_review).
        for item in self.review:
            item.setdefault("rid", review_rid(item.get("name", ""),
                                              item.get("url", ""), item.get("keys")))
            item.setdefault("kind", _review_kind(item))
        log.info("merge: %d news applied, %d new audit rows, %d review-queue",
                 applied, len(fresh_rows), len(self.review))
        return self

    # ---- applying a human-confirmed review item ------------------------
    def apply_review_item(self, item: dict) -> bool:
        """Apply a review item a human CONFIRMED: add its keys to the named
        person (creating a minimal record if they're not tracked yet). This is
        the only path by which a denial/downgrade or a discovery reaches the
        live dataset — it never happens automatically."""
        name = (item.get("name") or "").strip()
        raw_keys = item.get("keys")
        keys = list(raw_keys) if isinstance(raw_keys, list) else []   # never char-explode a string
        if not name or not keys:
            return False
        rec = next((r for r in self.records if r["name"].lower() == name.lower()), None)
        if rec is None:
            # Derive the id from the collision-resistant rid, not a name slug
            # (distinct names can slug-collide -> duplicate ids); guard uniqueness.
            base = "rev-" + (item.get("rid") or _slug(name))
            new_id, n = base, 2
            while new_id in self.by_id:
                new_id, n = f"{base}-{n}", n + 1
            rec = {
                "id": new_id,
                "name": name,
                "party": item.get("party", "Independent"),
                "role": item.get("role", "Confirmed from review queue"),
                "bucket": "out" if (_DOWNGRADE_KEYS & set(keys)) else "soft",
                "keys": [], "conf": item.get("conf", "Medium"), "delta": 0,
                "lastSignal": (item.get("date") or self.today.isoformat())[:10],
                "headline": (item.get("headline") or "").strip() or "Confirmed from review queue",
                "why": "Confirmed from the review queue.",
                "quote": "", "tags": [t for t in [item.get("source")] if t],
            }
            if item.get("fec_id"):
                rec["fec_ids"] = [item["fec_id"]]
            self.records.append(rec)
            self.by_id[rec["id"]] = rec
        before_tier = _status(rec.get("keys", []))[0]
        changed = False
        for k in keys:
            if k not in rec["keys"]:
                rec["keys"].append(k)
                changed = True
        # A confirmed denial/downgrade must also move bucket so the dashboard's
        # bucket-driven stats/filter/feed agree with the now-lowered tier.
        if changed and (_DOWNGRADE_KEYS & set(keys)):
            rec["bucket"] = "out"
        after_tier = _status(rec.get("keys", []))[0]
        if changed and after_tier != before_tier:
            rec.setdefault("history", []).append(
                {"date": (item.get("date") or self.today.isoformat())[:10],
                 "from": before_tier, "to": after_tier,
                 "reason": "confirmed from review: " + item.get("headline", "")})
        return changed
