"""Read-only health snapshot of a pixel capture JSONL.

Reads one file. Opens no socket, starts nothing, writes nothing.
"""
from __future__ import annotations

import argparse
import collections
import json
import sys
import time


def inspect(path, now=None, heartbeat_slack=2.5):
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
        alerts.append("No universes seen. A UDP listener only sees traffic addressed to it; unicast to the decoders "
                      "needs a mirror port or a packet capture on the sender.")
    result["status"] = status
    result["alerts"] = alerts
    result["lastRow"] = last_row
    return result


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("jsonl")
    p.add_argument("--at", type=float, help="evaluate heartbeat age at this unix time (default now)")
    args = p.parse_args(argv)
    print(json.dumps(inspect(args.jsonl, args.at), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
