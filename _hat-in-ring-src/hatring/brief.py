"""Daily briefing + share card — make the daily pipeline emit a shareable
"what moved" artifact.

Outputs:
  * data/briefing.json      — consumed by the dashboard "Today's Briefing" section
  * <out>/share.html        — a static, screenshot-ready share card
  * <out>/assets/share/latest.svg — a 1200x630 vector share image (for OG tags)

Raster PNG generation is intentionally NOT required: requirements.txt ships no
imaging library, so we emit SVG + HTML and document PNG as an opt-in follow-up
(mission task 2.6 / constraint 12). The OG image points at the SVG; if a future
build adds cairosvg/Pillow, rasterize latest.svg -> latest.png and repoint.
"""
from __future__ import annotations
import json
import logging
from datetime import date, timedelta
from pathlib import Path

from .scoring import enrich

log = logging.getLogger("hatring.brief")

_TIERLABEL = {5: "Declared", 4: "Exploratory", 3: "Considering",
              2: "Positioning", 1: "Floated", 0: "Inactive"}


def _esc(s: str) -> str:
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def build_briefing(records: list[dict], review_count: int, today: date) -> dict:
    enr = [enrich(r, today) for r in records]
    recent = (today - timedelta(days=14)).isoformat()
    wk = (today - timedelta(days=7)).isoformat()

    movers = sorted([r for r in enr if r.get("delta")],
                    key=lambda r: (abs(r["delta"]), r["score"]), reverse=True)[:6]
    new_filers = [r for r in enr
                  if r["tier"] >= 4 and (r.get("lastSignal", "") >= recent)]
    transitions = []
    for r in records:
        for h in r.get("history", []) or []:
            if (h.get("date") or "") >= wk and h.get("to") != h.get("from"):
                transitions.append({"name": r["name"], "from": h.get("from"),
                                    "to": h.get("to"), "date": h.get("date")})
    transitions.sort(key=lambda h: h["date"], reverse=True)

    return {
        "date": today.isoformat(),
        "movers": [{"id": r["id"], "name": r["name"], "party": r["party"],
                    "delta": r["delta"], "score": r["score"],
                    "tier": r["tier"], "statusLabel": r["statusLabel"]} for r in movers],
        "new_filers": [{"id": r["id"], "name": r["name"], "tier": r["tier"],
                        "statusLabel": r["statusLabel"]} for r in new_filers][:6],
        "transitions": transitions[:6],
        "review_count": review_count,
        "totals": {
            "tracked": len(enr),
            "formal": sum(1 for r in enr if r.get("bucket") == "formal"),
            "considering": sum(1 for r in enr if r["tier"] == 3),
        },
    }


def write_briefing(brief: dict, data_dir: Path) -> Path:
    p = data_dir / "briefing.json"
    p.write_text(json.dumps(brief, indent=2, ensure_ascii=False))
    return p


def render_share_svg(brief: dict) -> str:
    movers = brief.get("movers", [])[:3]
    rows = []
    y = 300
    for m in movers:
        d = m["delta"]
        arrow = "▲" if d > 0 else ("▼" if d < 0 else "–")
        col = "#1f9d55" if d > 0 else ("#c0392b" if d < 0 else "#9a9a9a")
        sign = "+" if d > 0 else ""
        rows.append(
            f'<text x="80" y="{y}" font-size="40" fill="#f4efe7" '
            f'font-family="Georgia,serif">{_esc(m["name"])}</text>'
            f'<text x="1120" y="{y}" font-size="40" fill="{col}" text-anchor="end" '
            f'font-family="Georgia,serif">{arrow} {sign}{d}</text>')
        y += 78
    body = "".join(rows) or ('<text x="80" y="320" font-size="38" fill="#9a9a9a" '
                             'font-family="Georgia,serif">No movement today.</text>')
    tot = brief.get("totals", {})
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Hat-in-Ring Radar daily briefing">
<rect width="1200" height="630" fill="#0f1115"/>
<rect width="1200" height="8" fill="#d23b3b"/>
<text x="80" y="120" font-size="58" fill="#f4efe7" font-family="Georgia,serif">🧭 Hat-in-Ring Radar</text>
<text x="80" y="170" font-size="28" fill="#8b929c" font-family="-apple-system,Arial,sans-serif">2028 presidential signal tracker · {_esc(brief.get("date",""))}</text>
<text x="80" y="245" font-size="30" fill="#d23b3b" font-family="-apple-system,Arial,sans-serif" letter-spacing="2">TOP MOVERS THIS WEEK</text>
{body}
<text x="80" y="585" font-size="26" fill="#8b929c" font-family="-apple-system,Arial,sans-serif">{tot.get("tracked",0)} tracked · {tot.get("formal",0)} formal · {tot.get("considering",0)} considering · systembydave.com/hat-in-ring</text>
</svg>'''


def render_share_html(brief: dict) -> str:
    items = "".join(
        f'<li><span>{_esc(m["name"])}</span>'
        f'<b class="{"up" if m["delta"]>0 else "dn" if m["delta"]<0 else "fl"}">'
        f'{"▲ +" if m["delta"]>0 else "▼ " if m["delta"]<0 else "– "}{m["delta"]}</b></li>'
        for m in brief.get("movers", [])[:6]) or "<li>No movement today.</li>"
    return f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hat-in-Ring Radar — {_esc(brief.get("date",""))} briefing</title>
<link rel="canonical" href="https://systembydave.com/hat-in-ring/">
<style>body{{margin:0;background:#0f1115;color:#f4efe7;font-family:-apple-system,Segoe UI,Arial,sans-serif;display:grid;place-items:center;min-height:100vh}}
.card{{width:min(640px,92vw);border:1px solid #2a2d33;border-radius:16px;padding:28px;background:#15171c}}
h1{{font-family:Georgia,serif;margin:0 0 4px;font-size:26px}}.sub{{color:#8b929c;margin-bottom:18px}}
ul{{list-style:none;padding:0;margin:0}}li{{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #23262d;font-size:17px}}
b.up{{color:#1f9d55}}b.dn{{color:#ff6b6b}}b.fl{{color:#8b929c}}a{{color:#6aa3ff}}</style></head>
<body><div class="card"><h1>🧭 Hat-in-Ring Radar</h1>
<div class="sub">Top movers · {_esc(brief.get("date",""))}</div>
<ul>{items}</ul>
<p class="sub" style="margin-top:18px">Live board → <a href="https://systembydave.com/hat-in-ring/">systembydave.com/hat-in-ring</a></p>
</div></body></html>'''


def write_share_assets(brief: dict, out_dir: Path) -> None:
    # Single stable filenames (no per-date copies) so the committed site repo
    # doesn't accumulate a share image per day. The OG tag points at latest.svg.
    (out_dir / "assets" / "share").mkdir(parents=True, exist_ok=True)
    (out_dir / "share.html").write_text(render_share_html(brief))
    (out_dir / "assets" / "share" / "latest.svg").write_text(render_share_svg(brief))
