"""News ingestion via Google News RSS (no API key required).

For each tracked person we run an alias-scoped query plus a few broad
"who's running" queries to catch names not yet on the watchlist. Returns
raw NewsItem records; classification happens in classify.py.

Google News RSS is a public, unauthenticated endpoint. Be polite: the
pipeline throttles requests and caches by URL via the signals audit log.
"""
from __future__ import annotations
import logging
import re
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone
import feedparser

_TAGS = re.compile(r"<[^>]+>")

log = logging.getLogger("hatring.news")
RSS = "https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"

# Source reliability -> base confidence ceiling for a derived signal.
RELIABILITY = {
    "Associated Press": "Very high", "AP News": "Very high", "Reuters": "Very high",
    "The Wall Street Journal": "High", "The Washington Post": "High",
    "The New York Times": "High", "Politico": "High", "NBC News": "High",
    "ABC News": "High", "CBS News": "High", "CNN": "High", "Axios": "High",
    "The Hill": "Medium", "Time": "Medium", "C-SPAN": "Medium",
    "Vanity Fair": "Low", "New York Post": "Low",
}
DEFAULT_CONFIDENCE = "Low"   # unknown / local / blog outlets


@dataclass
class NewsItem:
    title: str
    summary: str
    url: str
    source: str
    published: str          # ISO date (YYYY-MM-DD)
    query: str

    @property
    def confidence_ceiling(self) -> str:
        return RELIABILITY.get(self.source, DEFAULT_CONFIDENCE)


def _published_iso(entry) -> str:
    t = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if t:
        return datetime(*t[:6], tzinfo=timezone.utc).date().isoformat()
    return datetime.now(timezone.utc).date().isoformat()


def fetch_query(query: str, limit: int = 25) -> list[NewsItem]:
    url = RSS.format(q=urllib.parse.quote(query))
    feed = feedparser.parse(url)
    items: list[NewsItem] = []
    for e in feed.entries[:limit]:
        # Google News titles end with " - Source"
        title = e.get("title", "")
        source = ""
        src_obj = e.get("source")
        if src_obj and getattr(src_obj, "title", None):
            source = src_obj.title
        elif " - " in title:
            title, source = title.rsplit(" - ", 1)
        # Strip any HTML from BOTH title and summary. Title becomes the candidate
        # headline rendered into the dashboard, so an un-stripped tag here is the
        # realistic stored-XSS delivery vector (defense-in-depth with render escaping).
        title = _TAGS.sub(" ", title)
        summary = _TAGS.sub(" ", e.get("summary", "")).strip()
        items.append(NewsItem(
            title=title.strip(),
            summary=summary,
            url=e.get("link", ""),
            source=source.strip(),
            published=_published_iso(e),
            query=query,
        ))
    log.info("news: %-48s -> %d items", query[:48], len(items))
    return items


def fetch_all(watchlist: list[dict], broad_queries: list[str],
              throttle: float = 1.0, per_person_limit: int = 12) -> list[NewsItem]:
    """One scoped query per tracked person + the broad discovery queries."""
    seen: set[str] = set()
    out: list[NewsItem] = []
    queries: list[str] = []
    for person in watchlist:
        alias = (person.get("aliases") or [person["name"]])[0]
        queries.append(f'"{alias}" 2028 president')
    queries.extend(broad_queries)

    for q in queries:
        for item in fetch_query(q, limit=per_person_limit):
            if item.url and item.url not in seen:
                seen.add(item.url)
                out.append(item)
        time.sleep(throttle)
    log.info("news: %d unique items across %d queries", len(out), len(queries))
    return out
