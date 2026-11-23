"""Build a static HTML viewer: pixel universe activity against MIDI cue firings.

Inputs are files only (a pixel capture JSONL and a MIDI capture JSONL); the
output is one self-contained HTML page. Nothing is fetched or sent.

Clock: `--midi-clock-offset` is MIDI host minus pixel host, in seconds, the
same sense as the MIDI session's `clockOffset` (Studio minus Mac). A MIDI
firing at Studio time T is placed at T - offset on the pixel timeline. With
`--midi-session DIR` the offset is read from DIR/session.json, which is right
when the pixel recorder ran on the same Mac as the MIDI reader. Network and
phone latency are not measured; treat sub-second alignment as approximate.
"""
from __future__ import annotations

import argparse
import bisect
import html
import json
import os
import sys

from . import msc


def load_pixels(path):
    start = None
    windows, events = [], []
    with open(path, encoding="utf-8") as stream:
        for line in stream:
            try:
                row = json.loads(line)
            except ValueError:
                continue
            kind = row.get("type")
            if kind == "start" and start is None:
                start = row
            elif kind == "window":
                windows.append(row)
            elif kind in ("universe_stale", "universe_resumed", "source_added", "stream_terminated",
                          "universe_seen", "complete"):
                events.append(row)
    return start, windows, events


def associate(firings, windows, offset=0.0, after=3.0, stale_after=2.5):
    """Per firing and universe: was it live, and did its levels change after the cue?"""
    lanes = {}
    for w in windows:
        lanes.setdefault("%s:%s" % (w["protocol"], w["universe"]), []).append(w)
    for lane in lanes.values():
        lane.sort(key=lambda w: w["windowStart"])
    starts = {k: [w["windowStart"] for w in v] for k, v in lanes.items()}
    out = []
    for firing in firings:
        if firing.get("unixSeconds") is None:
            continue
        t = firing["unixSeconds"] - offset
        cells = {}
        for key, lane in lanes.items():
            span = lane[0]["windowSeconds"] if lane else 1.0
            lo = bisect.bisect_left(starts[key], t - max(after, stale_after) - span)
            hi = bisect.bisect_right(starts[key], t + after)
            near = lane[lo:hi]
            live = any(w["windowStart"] + span > t - stale_after and w["windowStart"] <= t for w in near)
            before = [w for w in near if w["windowStart"] + span > t - after and w["windowStart"] < t]
            later = [w for w in near if w["windowStart"] + span > t and w["windowStart"] < t + after]
            end = t + after
            exact = []
            ambiguous = False
            for window in later:
                if not window.get("hashChanges"):
                    continue
                first_change = window.get("firstChangeUnix")
                last_change = window.get("lastChangeUnix")
                if first_change is None or last_change is None:
                    ambiguous = True
                elif t <= first_change <= end:
                    exact.append(first_change)
                elif first_change < t <= last_change:
                    if last_change <= end:
                        exact.append(last_change)
                    elif window["hashChanges"] > 2:
                        ambiguous = True
            first = min(exact, default=None)
            cells[key] = {
                "live": live,
                "changed": first is not None,
                "changeUncertain": ambiguous,
                "firstChangeOffset": round(first - t, 3) if first is not None else None,
                "offsetApprox": ambiguous or any(
                    w.get("firstChangeUnix") is not None
                    and w["firstChangeUnix"] < t <= (w.get("lastChangeUnix") or 0) <= end
                    and w.get("hashChanges", 0) > 2 for w in later
                ),
                "changesBefore": sum(w.get("hashChanges", 0) for w in before),
                "changesAfter": sum(w.get("hashChanges", 0) for w in later),
                "packetsAfter": sum(w.get("packets", 0) for w in later),
            }
        out.append({"id": firing["id"], "key": firing["key"], "cue": firing.get("cue"), "cueList": firing.get("cueList"),
                    "command": firing.get("commandName"), "midiUnix": firing["unixSeconds"], "pixelTime": round(t, 6),
                    "utc": firing.get("utc"), "universes": cells})
    return out


def build(pixels_path, midi_path=None, offset=0.0, after=3.0, title="Frozen pixel capture", go_only=True):
    start, windows, events = load_pixels(pixels_path)
    stale_after = (start or {}).get("staleAfter", 2.5)
    firings = list(msc.firings(msc.read_jsonl(midi_path))) if midi_path else []
    if go_only:
        firings = [f for f in firings if f.get("command") == 1]
    cues = associate(firings, windows, offset=offset, after=after, stale_after=stale_after)
    lanes = sorted({"%s:%s" % (w["protocol"], w["universe"]) for w in windows},
                   key=lambda k: (k.split(":")[0], int(k.split(":")[1])))
    slim = [{"k": "%s:%s" % (w["protocol"], w["universe"]), "s": w["windowStart"], "d": w["windowSeconds"],
             "r": w["rateHz"], "h": w.get("hashChanges", 0), "g": w.get("seqMissing", 0),
             "m": 1 if w.get("multipleSources") else 0, "z": w.get("nonZero"), "x": w.get("maxLevel"),
             "src": w.get("sources")} for w in windows]
    data = {"title": title, "start": start, "lanes": lanes, "windows": slim,
            "events": [{k: e.get(k) for k in ("type", "unixSeconds", "utc", "protocol", "universe", "quietSeconds")}
                       for e in events],
            "cues": cues, "offset": offset, "after": after, "midiFile": os.path.basename(midi_path) if midi_path else None,
            "pixelFile": os.path.basename(pixels_path)}
    blob = json.dumps(data, separators=(",", ":")).replace("</", "<\\/")
    return TEMPLATE.replace("__TITLE__", html.escape(title)).replace("__DATA__", blob), data


TEMPLATE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>__TITLE__</title>
<style>
:root{--bg:#f6f3ee;--panel:#fffdf9;--ink:#1d1b18;--muted:#6b645a;--line:#ddd5c8;--live:#2f7d5b;--change:#2563eb;
--stale:#c0392b;--gap:#d97706;--cue:#7c3aed;--multi:#be185d}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121417;--panel:#1b1e23;--ink:#ecebe8;
--muted:#9aa0a8;--line:#2d323a;--live:#4ade80;--change:#60a5fa;--stale:#f87171;--gap:#fbbf24;--cue:#c4b5fd;--multi:#f472b6}}
:root[data-theme="dark"]{--bg:#121417;--panel:#1b1e23;--ink:#ecebe8;--muted:#9aa0a8;--line:#2d323a;--live:#4ade80;
--change:#60a5fa;--stale:#f87171;--gap:#fbbf24;--cue:#c4b5fd;--multi:#f472b6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,-apple-system,sans-serif}
header{padding:16px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:12px;align-items:baseline}
h1{font-size:18px;margin:0}.muted{color:var(--muted)}.stat{font-variant-numeric:tabular-nums}
main{padding:16px;display:grid;gap:16px;max-width:1400px;margin:0 auto}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;min-width:0}
.tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
button,select{font:inherit;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:4px 10px;cursor:pointer}
button[aria-pressed="true"]{border-color:var(--cue);color:var(--cue)}
.scroll{overflow-x:auto;overflow-y:hidden}svg text{fill:var(--ink);font-size:11px}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px}.legend i{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:4px;vertical-align:-2px}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{border-bottom:1px solid var(--line);padding:4px 8px;text-align:left;white-space:nowrap}
th{position:sticky;top:0;background:var(--panel)}.tablewrap{max-height:60vh;overflow:auto}
.cue{font-weight:700;font-size:15px}.ok{color:var(--live)}.chg{color:var(--change);font-weight:600}.bad{color:var(--stale)}
tr.sel{outline:2px solid var(--cue)}
.note{font-size:12px;color:var(--muted)}
@media (max-width:640px){header,main{padding:12px 16px}}
</style></head><body>
<header><h1>__TITLE__</h1><span class="muted" id="meta"></span>
<span style="margin-left:auto"><button id="theme" type="button">Theme</button></span></header>
<main>
<section class="card"><div class="tools"><strong>Timeline</strong>
<button type="button" data-z="1" aria-pressed="true">Fit</button><button type="button" data-z="4">×4</button>
<button type="button" data-z="16">×16</button><button type="button" data-z="64">×64</button>
<span class="legend"><span><i style="background:var(--live)"></i>frames (opacity = rate)</span>
<span><i style="background:var(--change)"></i>level change</span><span><i style="background:var(--gap)"></i>sequence gap</span>
<span><i style="background:var(--stale)"></i>quiet</span><span><i style="background:var(--multi)"></i>2+ senders</span>
<span><i style="background:var(--cue)"></i>MIDI GO</span></span></div>
<div class="scroll" id="scroll"><svg id="tl" role="img" aria-label="Universe activity timeline"></svg></div>
<p class="note" id="clocknote"></p></section>
<section class="card"><div class="tools"><strong>Cues against universes</strong><span class="muted" id="cuecount"></span></div>
<div class="tablewrap"><table id="cues"></table></div>
<p class="note">“changed” means the frame’s level hash differed within the window after the cue. Packet receipt at the capture point is not proof that pixels lit, and a changing hash is not proof of a visible change. Compare “before” and “after” change counts: a running effect changes in both.</p></section>
</main>
<script>
const D=__DATA__;
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const fmt=t=>new Date(t*1000).toISOString().slice(11,23);
try{const th=localStorage.getItem("pxTheme");if(th)document.documentElement.dataset.theme=th}catch(e){}
$("#theme").onclick=()=>{const r=document.documentElement;const cur=r.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
r.dataset.theme=cur==="dark"?"light":"dark";try{localStorage.setItem("pxTheme",r.dataset.theme)}catch(e){}};
const W=D.windows, lanes=D.lanes;
let t0=Infinity,t1=-Infinity;for(const w of W){t0=Math.min(t0,w.s);t1=Math.max(t1,w.s+w.d)}
for(const c of D.cues){t0=Math.min(t0,c.pixelTime);t1=Math.max(t1,c.pixelTime+1)}
if(!isFinite(t0)){t0=0;t1=1}
const st=D.start||{};
$("#meta").textContent=`${D.pixelFile}${D.midiFile?" + "+D.midiFile:""} · ${lanes.length} universes · ${D.cues.length} cues · ${fmt(t0)}–${fmt(t1)} UTC · host ${st.host||"?"} · input ${st.input||"?"}`;
$("#clocknote").textContent=`MIDI times shifted by ${(-D.offset).toFixed(3)} s (MIDI host minus pixel host = ${D.offset.toFixed(3)} s). Network and transport latency are unmeasured; treat sub-second alignment as approximate.`;
let zoom=1, sel=null;
function draw(){
  const svg=$("#tl"), view=$("#scroll").clientWidth||900, lw=110, laneH=26, top=22;
  const width=Math.max(view,lw+(view-lw)*zoom), h=top+lanes.length*laneH+8;
  const x=t=>lw+(t-t0)/(t1-t0||1)*(width-lw-10);
  const parts=[`<rect x="0" y="0" width="${width}" height="${h}" fill="transparent"/>`];
  lanes.forEach((k,i)=>{const y=top+i*laneH;parts.push(`<text x="4" y="${y+16}">${k}</text><line x1="${lw}" x2="${width}" y1="${y+laneH-2}" y2="${y+laneH-2}" stroke="var(--line)"/>`)});
  const maxR=W.reduce((max,w)=>Math.max(max,w.r),1);
  for(const w of W){const i=lanes.indexOf(w.k),y=top+i*laneH,x0=x(w.s),x1=Math.max(x0+1,x(w.s+w.d));
    parts.push(`<rect x="${x0}" y="${y+3}" width="${x1-x0}" height="${laneH-8}" fill="var(${w.m?"--multi":"--live"})" opacity="${(0.25+0.75*w.r/maxR).toFixed(2)}"><title>${w.k} ${fmt(w.s)} · ${w.r} Hz · ${w.h} changes · ${w.g} missing · nonzero ${w.z} · max ${w.x} · ${esc((w.src||[]).join(", "))}</title></rect>`);
    if(w.h)parts.push(`<rect x="${x0}" y="${y+laneH-7}" width="${x1-x0}" height="3" fill="var(--change)"/>`);
    if(w.g)parts.push(`<rect x="${x0}" y="${y}" width="${Math.max(2,x1-x0)}" height="3" fill="var(--gap)"><title>${w.g} missing sequence numbers</title></rect>`)}
  const open={};for(const e of D.events){const k=e.protocol+":"+e.universe;
    if(e.type==="universe_stale")open[k]=e.unixSeconds-(e.quietSeconds||0);
    if(e.type==="universe_resumed"&&open[k]!=null){const i=lanes.indexOf(k);if(i>=0)parts.push(`<rect x="${x(open[k])}" y="${top+i*laneH+3}" width="${Math.max(2,x(e.unixSeconds)-x(open[k]))}" height="${laneH-8}" fill="var(--stale)" opacity=".55"><title>${k} quiet ${e.quietSeconds}s</title></rect>`);delete open[k]}}
  for(const k in open){const i=lanes.indexOf(k);if(i>=0)parts.push(`<rect x="${x(open[k])}" y="${top+i*laneH+3}" width="${Math.max(2,x(t1)-x(open[k]))}" height="${laneH-8}" fill="var(--stale)" opacity=".55"/>`)}
  D.cues.forEach((c,n)=>{const cx=x(c.pixelTime);parts.push(`<g data-n="${n}" style="cursor:pointer"><line x1="${cx}" x2="${cx}" y1="12" y2="${h-6}" stroke="var(--cue)" stroke-width="${sel===n?3:1.2}"/><text x="${cx+2}" y="12" style="fill:var(--cue)">${esc(c.cue??"?")}</text><title>Cue ${esc(c.cue)} · ${esc(c.utc)}</title></g>`)});
  svg.setAttribute("width",width);svg.setAttribute("height",h);svg.setAttribute("viewBox",`0 0 ${width} ${h}`);svg.innerHTML=parts.join("");
  svg.querySelectorAll("g[data-n]").forEach(g=>g.onclick=()=>pick(+g.dataset.n,true));
}
function cell(u){if(!u)return'<td class="muted">no data</td>';
  if(!u.live&&!u.packetsAfter)return'<td class="bad">quiet</td>';
  const s=u.changed?`<span class="chg">changed${u.firstChangeOffset!=null?" +"+u.firstChangeOffset.toFixed(2)+"s"+(u.offsetApprox?"≈":""):""}</span>`:u.changeUncertain?'<span class="chg">change timing uncertain</span>':'<span class="ok">live, no change</span>';
  return`<td title="changes before ${u.changesBefore} / after ${u.changesAfter}; packets after ${u.packetsAfter}">${s} <span class="muted">${u.changesBefore}→${u.changesAfter}</span></td>`}
function table(){const head=`<tr><th>Cue</th><th>List</th><th>UTC (MIDI)</th>${lanes.map(k=>`<th>${k}</th>`).join("")}</tr>`;
  $("#cues").innerHTML=head+D.cues.map((c,n)=>`<tr data-n="${n}"><td class="cue">${esc(c.cue??"?")}</td><td>${esc(c.cueList)}</td><td>${(c.utc||"").slice(11)}</td>${lanes.map(k=>cell(c.universes[k])).join("")}</tr>`).join("");
  $("#cues").querySelectorAll("tr[data-n]").forEach(r=>r.onclick=()=>pick(+r.dataset.n,false));
  $("#cuecount").textContent=`${D.cues.length} GO firings · window +${D.after}s`}
function pick(n,scroll){sel=n;document.querySelectorAll("tr.sel").forEach(r=>r.classList.remove("sel"));const r=document.querySelector(`tr[data-n="${n}"]`);if(r){r.classList.add("sel");if(scroll)r.scrollIntoView({block:"nearest"})}draw()}
document.querySelectorAll("button[data-z]").forEach(b=>b.onclick=()=>{zoom=+b.dataset.z;document.querySelectorAll("button[data-z]").forEach(o=>o.setAttribute("aria-pressed",o===b));draw()});
addEventListener("resize",draw);table();draw();
</script></body></html>
"""


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--pixels", required=True, help="pixel capture JSONL")
    p.add_argument("--midi", help="MIDI capture JSONL (Studio observer format)")
    p.add_argument("--midi-session", help="MIDI session directory: uses midi.jsonl and session.json clockOffset")
    p.add_argument("--midi-clock-offset", type=float, help="MIDI host minus pixel host, seconds")
    p.add_argument("--after", type=float, default=3.0, help="seconds after each cue to look for level changes")
    p.add_argument("--all-commands", action="store_true", help="include non-GO MSC commands")
    p.add_argument("--title", default="Frozen pixel capture")
    p.add_argument("--out", required=True)
    p.add_argument("--json", help="also write the cue association as JSON")
    args = p.parse_args(argv)
    midi, offset = args.midi, 0.0
    if args.midi_session:
        midi = midi or os.path.join(args.midi_session, "midi.jsonl")
        try:
            with open(os.path.join(args.midi_session, "session.json"), encoding="utf-8") as f:
                offset = float(json.load(f).get("clockOffset") or 0.0)
        except (OSError, ValueError):
            pass
    if args.midi_clock_offset is not None:
        offset = args.midi_clock_offset
    page, data = build(args.pixels, midi, offset=offset, after=args.after, title=args.title,
                       go_only=not args.all_commands)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(page)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump({"offset": offset, "after": args.after, "lanes": data["lanes"], "cues": data["cues"]}, f, indent=1)
    print(json.dumps({"out": args.out, "universes": len(data["lanes"]), "cues": len(data["cues"]), "offset": offset}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
