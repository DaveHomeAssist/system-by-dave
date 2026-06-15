"""Security regression tests for the render + ingest path.

The pipeline ingests live news headlines into candidate fields and renders them
into a self-contained HTML file (Jinja autoescape is deliberately OFF for the
JS/JSON payload). Two sinks must stay closed:

  C1 — the SEED is injected as a raw JS literal; a field containing "</script>"
       must not break out of the inline <script>.
  H1 — render functions interpolate fields into innerHTML; HTML metacharacters
       must be escaped so a payload like <img src=x onerror=...> can't execute.

Plus M10 — news.py must strip HTML tags from the title (the XSS source), like
it already does for the summary.
"""
from __future__ import annotations
import json
import shutil
import subprocess
from datetime import date
from pathlib import Path

import pytest

from hatring.build import render
from hatring import news

ROOT = Path(__file__).resolve().parent.parent
SMOKE = Path(__file__).resolve().parent / "dashboard_smoke.js"

HOSTILE = [{
    "id": "evil",
    "name": "<img src=x onerror=document.title='PWN'>",
    "party": "Democrat",
    "role": "</script><script>document.title='PWN2'</script>",
    "bucket": "considering",
    "keys": ["consideringQuote", "donors"],
    "conf": "Medium",
    "delta": 0,
    "lastSignal": "2026-06-10",
    "headline": "Newsom weighing a run </script><script>alert('XSS')</script>",
    "why": "\"><b>escape me</b>",
    "quote": "<svg onload=alert(1)>",
    "tags": ["<i>tag</i>"],
}]


def _render_hostile(tmp_path) -> str:
    cj = tmp_path / "candidates.json"
    cj.write_text(json.dumps(HOSTILE))
    out = tmp_path / "index.html"
    render(cj, ROOT / "templates", out, built=date(2026, 6, 13))
    return out.read_text()


def test_seed_has_no_script_breakout(tmp_path):
    """C1: '<' in any candidate field is escaped so '</script>' can't close the SEED."""
    html = _render_hostile(tmp_path)
    seed = html[html.index("const SEED ="):html.index("/* ---------- persistence")]
    assert "</script" not in seed.lower(), "raw </script> survived into the SEED literal"
    assert "\\u003c" in seed, "expected '<' to be escaped as \\u003c in the SEED"
    # Two structural </script> closers: the head JSON-LD block + the dashboard
    # script. The escaped SEED adds none (its "<" became <), which is the point.
    assert html.lower().count("</script>") == 2


RENDER_CHECK = Path(__file__).resolve().parent / "xss_render_check.js"


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_h1_render_escapes_hostile_fields(tmp_path):
    """H1: actually run the dashboard render and assert hostile fields come out
    HTML-escaped in the generated board/feed innerHTML — not as live tags.

    (Static-HTML grepping is wrong here: the SEED legitimately holds the raw field
    text with only '<' escaped for C1; the H1 escaping happens at render time.)
    """
    cj = tmp_path / "candidates.json"
    cj.write_text(json.dumps(HOSTILE))
    out = tmp_path / "index.html"
    render(cj, ROOT / "templates", out, built=date(2026, 6, 13))
    res = subprocess.run(["node", str(RENDER_CHECK), str(out)], capture_output=True, text=True, timeout=60)
    assert res.returncode == 0, f"H1 render escaping failed:\n{res.stdout}\n{res.stderr}"
    assert "PASS" in res.stdout


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_hostile_dashboard_still_parses_and_renders(tmp_path):
    """The escaped build must remain valid JS and render the (single) record."""
    cj = tmp_path / "candidates.json"
    cj.write_text(json.dumps(HOSTILE))
    out = tmp_path / "index.html"
    render(cj, ROOT / "templates", out, built=date(2026, 6, 13))
    res = subprocess.run(["node", str(SMOKE), str(out)], capture_output=True, text=True, timeout=60)
    assert res.returncode == 0, f"hostile build broke rendering:\n{res.stdout}\n{res.stderr}"
    assert "PASS" in res.stdout


def test_news_title_is_html_stripped():
    """M10: a tag in a Google-News title is stripped at ingest (defense in depth)."""
    class _Src:
        title = "Politico"

    class _Entry(dict):
        def __init__(self, **kw):
            super().__init__(**kw)

        def get(self, k, default=None):
            return super().get(k, default)

    entry = _Entry(
        title="Booker eyes 2028 <img src=x onerror=alert(1)> - Politico",
        summary="<b>body</b>",
        link="https://example.com/a",
        source=_Src(),
    )
    import feedparser  # noqa: F401  (ensure dep present)
    # Drive fetch_query's per-entry logic via a stub feed.
    parsed = type("F", (), {"entries": [entry]})()
    orig = news.feedparser.parse
    news.feedparser.parse = lambda *a, **k: parsed
    try:
        items = news.fetch_query("q", limit=5)
    finally:
        news.feedparser.parse = orig
    assert items, "expected one item"
    assert "<img" not in items[0].title and "onerror" not in items[0].title
