"""Read-only health snapshot of a pixel capture JSONL.

Reads one file. Opens no socket, starts nothing, writes nothing.
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import sys
import time


def parse_expect(spec):
    """'artnet:221-223,artnet:227,sacn:1' -> {'artnet:221', ...}"""
    keys = set()
    for part in filter(None, (p.strip() for p in (spec or "").split(","))):
        proto, _, numbers = part.partition(":")
        lo, _, hi = numbers.partition("-")
        for n in range(int(lo), int(hi or lo) + 1):
            keys.add("%s:%d" % (proto.strip().lower(), n))
    return keys


def inspect(path, now=None, heartbeat_slack=2.5, expect=None, candidates=None, capture_log=None):
    now = time.time() if now is None else now
    result = {"file": str(path), "checkedAt": round(now, 3)}
    types = collections.Counter()
    invalid = 0
    start = complete = last_heartbeat = last_row = None
    universes = {}
    events = []
    with open(path, encoding="utf-8") as stream:
        for line in stream:
            try:
                row = json.loads(line)
            except ValueError:
                invalid += 1
                continue
            kind = row.get("type", "unknown")
            types[kind] += 1
            last_row = row
            if kind == "start":
                start, complete = row, None  # a later start begins a new run in the same file
            elif kind == "complete":
                complete = row
            elif kind == "heartbeat":
                last_heartbeat = row
            key = "%s:%s" % (row.get("protocol"), row.get("universe")) if "universe" in row else None
            if kind == "window":
                u = universes.setdefault(key, {"windows": 0, "packets": 0, "seqMissing": 0, "seqGapEvents": 0,
                                               "outOfOrder": 0, "hashChanges": 0, "sources": set(),
                                               "destinations": set(), "staleEvents": 0, "maxRateHz": 0,
                                               "multipleSourceWindows": 0})
                u["windows"] += 1
                u["packets"] += row.get("packets", 0)
                u["seqMissing"] += row.get("seqMissing", 0)
                u["seqGapEvents"] += row.get("seqGapEvents", 0)
                u["outOfOrder"] += row.get("outOfOrder", 0)
                u["hashChanges"] += row.get("hashChanges", 0)
                u["sources"].update(row.get("sources", []))
                u["destinations"].update(row.get("destinations", []))
                u["maxRateHz"] = max(u["maxRateHz"], row.get("rateHz", 0))
                u["multipleSourceWindows"] += 1 if row.get("multipleSources") else 0
                u["lastWindow"] = {k: row.get(k) for k in ("utc", "rateHz", "levelHash", "lastFrameUnix",
                                                            "nonZero", "maxLevel", "length")}
            elif kind in ("universe_stale", "universe_resumed", "source_added", "stream_terminated"):
                if kind == "universe_stale" and key in universes:
                    universes[key]["staleEvents"] += 1
                events.append({k: row.get(k) for k in ("type", "utc", "protocol", "universe", "quietSeconds")})
    for u in universes.values():
        u["sources"] = sorted(u["sources"])
        u["destinations"] = sorted(u["destinations"])
    result.update(types=dict(types), invalidLines=invalid, start=start, complete=complete,
                  universes=dict(sorted(universes.items())), recentEvents=events[-20:])
    alerts = []
    if start is None:
        status = "empty"
    elif complete is not None:
        status = "complete"
        if complete.get("interrupted"):
            alerts.append("Run ended early: %s" % complete.get("reason"))
    else:
        every = start.get("heartbeatEvery", 30)
        beat = last_heartbeat or start
        age = now - beat["unixSeconds"]
        result["heartbeatAgeSeconds"] = round(age, 1)
        status = "recording" if age <= every + heartbeat_slack else "heartbeat-stale"
        if status == "heartbeat-stale":
            alerts.append("No heartbeat for %.0f s (expected every %.0f s). A running PID alone is not proof." % (age, every))
    for key, u in universes.items():
        if u["seqMissing"]:
            alerts.append("%s missed %d sequence numbers in %d gap events" % (key, u["seqMissing"], u["seqGapEvents"]))
        if len(u["sources"]) > 1:
            alerts.append("%s has %d senders: %s" % (key, len(u["sources"]), ", ".join(u["sources"])))
        if u["staleEvents"]:
            alerts.append("%s went quiet %d times" % (key, u["staleEvents"]))
    if start and start.get("input") == "udp" and not universes:
        alerts.append("No universes seen. A UDP listener only sees traffic addressed to this host; mirrored unicast "
                      "needs interface-level packet capture into --input pcap.")
    dmx_seen = any(u["packets"] for u in universes.values())
    capture = capture_health(start, last_heartbeat, capture_log)
    result["capture"] = capture
    result["protocols"] = {}
    for proto in ("artnet", "sacn"):
        packets = sum(u["packets"] for k, u in universes.items() if k.startswith(proto + ":"))
        if packets:
            result["protocols"][proto] = {"state": "present", "packets": packets}
        else:
            result["protocols"][proto] = {"state": "absent-inconclusive", "packets": 0,
                                          "note": "Not seen. Inconclusive until capture visibility is shown."}
    if expect:
        seen = set(universes)
        result["expected"] = {"missing": sorted(expect - seen, key=_order), "unexpected": sorted(seen - expect, key=_order),
                              "matched": sorted(expect & seen, key=_order),
                              "note": "A mismatch is an observation about this capture, not proof of a bad patch."}
        if result["expected"]["missing"]:
            alerts.append("Expected but not seen in this capture: %s" % ", ".join(result["expected"]["missing"]))
        if result["expected"]["unexpected"]:
            alerts.append("Seen but not listed as expected: %s" % ", ".join(result["expected"]["unexpected"]))
    if candidates:
        result["candidates"] = {}
        for name, keys in candidates:
            rows = {k: universes[k]["packets"] if k in universes else 0 for k in sorted(keys, key=_order)}
            observed = [k for k, n in rows.items() if n]
            state = ("observed" if len(observed) == len(rows) else "partly observed" if observed
                     else "not observed (inconclusive until capture visibility is shown)" if not dmx_seen
                     else "not observed")
            result["candidates"][name] = {"universes": rows, "observed": len(observed), "of": len(rows), "state": state}
        result["candidatesNote"] = ("Shows which universes were transmitted while capturing. It does not show which "
                                    "universes a decoder output listens to, or that pixels lit.")
    if capture.get("drops"):
        alerts.append("Capture dropped packets (%s). Sequence gaps are ambiguous: they may be capture or mirror loss, "
                      "not show loss." % ", ".join("%s %d" % kv for kv in sorted(capture["drops"].items())))
    elif start and start.get("input") == "pcap" and any(u["seqMissing"] for u in universes.values()) \
            and not capture.get("dropCountersKnown"):
        alerts.append("Sequence gaps seen but capture drop counters are unknown; pass --capture-log to separate "
                      "capture loss from show loss.")
    result["status"] = status
    result["alerts"] = alerts
    result["lastRow"] = last_row
    return result


DROP_LINE = re.compile(r"(\d+) packets? (captured|received by filter|dropped by kernel|dropped by interface)")


def capture_health(start, heartbeat, capture_log=None):
    """Capture-side loss: snaplen truncation from the recorder, drops from tcpdump's exit summary."""
    out = {"input": (start or {}).get("input")}
    skipped = (heartbeat or {}).get("skipped") or {}
    if skipped.get("snaplen-truncated"):
        out["snaplenTruncated"] = skipped["snaplen-truncated"]
    if capture_log:
        counts = {}
        try:
            with open(capture_log, encoding="utf-8", errors="replace") as f:
                for line in f:
                    m = DROP_LINE.search(line)
                    if m:
                        counts[m.group(2)] = int(m.group(1))
        except OSError as error:
            out["captureLogError"] = str(error)
        out["captureLog"] = counts
        out["dropCountersKnown"] = "dropped by kernel" in counts
        drops = {k: v for k, v in counts.items() if k.startswith("dropped") and v}
        if drops:
            out["drops"] = drops
    return out


def parse_candidates(values):
    """['upstage-A=artnet:224-226', ...] -> [('upstage-A', {...}), ...]"""
    out = []
    for value in values or []:
        name, _, spec = value.partition("=")
        if not spec:
            raise SystemExit("--candidate needs NAME=SPEC, e.g. upstage-A=artnet:224-226")
        out.append((name.strip(), parse_expect(spec)))
    return out


def _order(key):
    proto, _, number = key.partition(":")
    return proto, int(number) if number.isdigit() else -1


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("jsonl")
    p.add_argument("--at", type=float, help="evaluate heartbeat age at this unix time (default now)")
    p.add_argument("--expect", help="expected universes, e.g. artnet:221-223,artnet:227-229,artnet:200-211")
    p.add_argument("--candidate", action="append", metavar="NAME=SPEC",
                   help="a named universe range to report activity for; repeatable "
                        "(e.g. downstage=artnet:221-223 --candidate upstage-A=artnet:224-226)")
    p.add_argument("--capture-log", help="tcpdump stderr log; its exit summary gives drop counters")
    args = p.parse_args(argv)
    print(json.dumps(inspect(args.jsonl, args.at, expect=parse_expect(args.expect),
                             candidates=parse_candidates(args.candidate), capture_log=args.capture_log), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
