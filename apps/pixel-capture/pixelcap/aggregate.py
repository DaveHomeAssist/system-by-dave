"""Turn decoded packets into compact per-universe JSONL evidence.

The aggregator is clock-agnostic: every call carries the event time, so the
same code serves a live socket (wall clock) and a pcap replay (capture
timestamps). It writes summaries only. Full frames never leave this module.
"""
from __future__ import annotations

import collections
import datetime as dt
import json
import math
import os

from . import protocol

SCHEMA = "frozen-pixel-capture/1"


def utc(seconds: float) -> str:
    stamp = dt.datetime.fromtimestamp(seconds, dt.timezone.utc)
    return stamp.strftime("%Y-%m-%dT%H:%M:%S.") + "%03dZ" % (stamp.microsecond // 1000)


class JsonlWriter:
    """Append-only JSONL with a flush per row, like the MIDI observer."""

    def __init__(self, path):
        self.path = path
        self.rows = 0
        self._stream = open(path, "a", encoding="utf-8") if path != "-" else None

    def write(self, row: dict):
        line = json.dumps(row, separators=(",", ":"), sort_keys=False)
        if self._stream is None:
            print(line, flush=True)
        else:
            self._stream.write(line + "\n")
            self._stream.flush()
        self.rows += 1

    def sync(self):
        if self._stream is not None:
            os.fsync(self._stream.fileno())

    def close(self):
        if self._stream is not None:
            self._stream.flush()
            os.fsync(self._stream.fileno())
            self._stream.close()
            self._stream = None


class MemoryWriter:
    def __init__(self):
        self.rows = []

    def write(self, row):
        self.rows.append(row)

    def sync(self):
        pass

    def close(self):
        pass


class Universe:
    def __init__(self, protocol_name, number, now):
        self.protocol = protocol_name
        self.number = number
        self.first_seen = now
        self.last_frame = None
        self.last_hash = None
        self.last_summary = None
        self.stale = False
        self.total_packets = 0
        self.total_missing = 0
        self.sources = {}          # identity -> {"ip":..., ...}
        self.last_sequence = {}    # identity -> int
        self.reset_window(None)

    def reset_window(self, start):
        self.window_start = start
        self.packets = 0
        self.window_sources = set()
        self.window_dests = set()
        self.missing = 0
        self.gap_events = 0
        self.out_of_order = 0
        self.duplicates = 0
        self.resets = 0
        self.hash_changes = 0
        self.first_change = None
        self.last_change = None
        self.start_codes = collections.Counter()

    @property
    def key(self):
        return "%s:%d" % (self.protocol, self.number)


class Aggregator:
    def __init__(self, writer, window=1.0, stale_after=2.5, heartbeat=30.0):
        self.writer = writer
        self.window = float(window)
        self.stale_after = float(stale_after)
        self.heartbeat_every = float(heartbeat)
        self.universes = {}
        self.counters = collections.Counter()
        self.opcodes = collections.Counter()
        self.skipped = collections.Counter()
        self.last_heartbeat = None
        self.last_event = None

    # Rows ---------------------------------------------------------------
    def _row(self, kind, now, **fields):
        row = {"type": kind, "unixSeconds": round(now, 6), "utc": utc(now)}
        row.update(fields)
        self.writer.write(row)
        return row

    def start(self, now, **fields):
        self.last_heartbeat = now
        self.last_event = now
        return self._row("start", now, schema=SCHEMA, noTransmit=True, window=self.window,
                         staleAfter=self.stale_after, heartbeatEvery=self.heartbeat_every, **fields)

    def note_skipped(self, reason):
        self.skipped[reason] += 1

    # Ingest -------------------------------------------------------------
    def ingest(self, packet, src_ip, now, dst_ip=None, src_port=None):
        """Account for one decoded packet (output of protocol.decode)."""
        self.tick(now)
        self.last_event = now
        if packet is None:
            self.counters["unrecognised"] += 1
            return
        proto = packet["protocol"]
        self.opcodes["%s:%s" % (proto, packet.get("opcode"))] += 1
        if packet["kind"] == "malformed":
            self.counters["malformed"] += 1
            return
        if packet["kind"] != "dmx":
            self.counters["otherOpcode"] += 1
            return
        self.counters["dmx"] += 1
        key = (proto, packet["universe"])
        uni = self.universes.get(key)
        if uni is None:
            uni = self.universes[key] = Universe(proto, packet["universe"], now)
            self._row("universe_seen", now, protocol=proto, universe=uni.number, source=src_ip, destination=dst_ip)
        start = math.floor(now / self.window) * self.window
        if uni.window_start is None:
            uni.reset_window(start)

        identity = src_ip if proto == "artnet" else "%s/%s" % (src_ip, packet.get("cid"))
        if identity not in uni.sources:
            info = {"ip": src_ip, "label": src_ip}
            if proto == "sacn":
                info.update(cid=packet.get("cid"), name=packet.get("sourceName"), priority=packet.get("priority"),
                            label="%s#%s" % (src_ip, (packet.get("cid") or "")[:8]))
            uni.sources[identity] = info
            if len(uni.sources) > 1:
                self._row("source_added", now, protocol=proto, universe=uni.number, source=info,
                          knownSources=len(uni.sources), note="More than one sender for this universe")
        uni.window_sources.add(identity)
        if dst_ip:
            uni.window_dests.add(dst_ip)

        if packet["startCode"] != 0:
            uni.start_codes[packet["startCode"]] += 1
            uni.packets += 1
            uni.total_packets += 1
            return  # alternate start codes (RDM, text) are not levels

        step = protocol.artnet_sequence_step if proto == "artnet" else protocol.sacn_sequence_step
        last = uni.last_sequence.get(identity)
        if last is not None:
            status, missing = step(last, packet["sequence"])
            if status == "gap":
                uni.gap_events += 1
                uni.missing += missing
                uni.total_missing += missing
            elif status == "out_of_order":
                uni.out_of_order += 1
            elif status == "duplicate":
                uni.duplicates += 1
            elif status == "reset":
                uni.resets += 1
        uni.last_sequence[identity] = packet["sequence"]

        uni.packets += 1
        uni.total_packets += 1
        digest = protocol.level_hash(packet["data"])
        if uni.last_hash is not None and digest != uni.last_hash:
            uni.hash_changes += 1
            uni.first_change = now if uni.first_change is None else uni.first_change
            uni.last_change = now
        uni.last_hash = digest
        uni.last_summary = protocol.level_summary(packet["data"])
        if uni.stale:
            self._row("universe_resumed", now, protocol=proto, universe=uni.number,
                      quietSeconds=round(now - uni.last_frame, 3) if uni.last_frame else None)
            uni.stale = False
        uni.last_frame = now
        if proto == "sacn" and packet.get("terminated"):
            self._row("stream_terminated", now, protocol=proto, universe=uni.number, source=uni.sources[identity])

    # Time ---------------------------------------------------------------
    def tick(self, now):
        for uni in self.universes.values():
            if uni.window_start is not None and now >= uni.window_start + self.window:
                self._flush_window(uni)
            if not uni.stale and uni.last_frame is not None and now - uni.last_frame >= self.stale_after:
                uni.stale = True
                self._row("universe_stale", now, protocol=uni.protocol, universe=uni.number,
                          lastFrameUnix=round(uni.last_frame, 6), quietSeconds=round(now - uni.last_frame, 3),
                          lastLevelHash=uni.last_hash)
        if self.last_heartbeat is not None and now - self.last_heartbeat >= self.heartbeat_every:
            self.heartbeat(now)

    def _flush_window(self, uni):
        if uni.packets:
            fields = dict(
                protocol=uni.protocol, universe=uni.number, windowStart=round(uni.window_start, 6),
                windowSeconds=self.window, packets=uni.packets, rateHz=round(uni.packets / self.window, 2),
                sources=sorted(uni.sources[i]["label"] for i in uni.window_sources),
                destinations=sorted(uni.window_dests), seqGapEvents=uni.gap_events, seqMissing=uni.missing,
                outOfOrder=uni.out_of_order, duplicates=uni.duplicates, seqResets=uni.resets,
                lastFrameUnix=round(uni.last_frame, 6) if uni.last_frame else None,
                levelHash=uni.last_hash, hashChanges=uni.hash_changes,
                firstChangeUnix=round(uni.first_change, 6) if uni.first_change else None,
                lastChangeUnix=round(uni.last_change, 6) if uni.last_change else None,
            )
            if len(uni.window_sources) > 1:
                fields["multipleSources"] = True
            if uni.last_summary:
                fields.update(uni.last_summary)
            if uni.start_codes:
                fields["altStartCodes"] = {"0x%02x" % k: v for k, v in sorted(uni.start_codes.items())}
            self._row("window", uni.window_start + self.window, **fields)
        uni.reset_window(None)

    def heartbeat(self, now):
        self.last_heartbeat = now
        active = sum(1 for u in self.universes.values() if u.last_frame and not u.stale)
        row = self._row("heartbeat", now, universes=len(self.universes), activeUniverses=active,
                        staleUniverses=sorted(u.key for u in self.universes.values() if u.stale),
                        counters=dict(self.counters), opcodes=dict(self.opcodes), skipped=dict(self.skipped))
        self.writer.sync()
        return row

    def finish(self, now, interrupted=False, reason=None):
        for uni in self.universes.values():
            if uni.window_start is not None:
                self._flush_window(uni)
        self.heartbeat(now)
        totals = {u.key: {"packets": u.total_packets, "seqMissing": u.total_missing,
                          "sources": sorted(s["label"] for s in u.sources.values())}
                  for u in sorted(self.universes.values(), key=lambda u: (u.protocol, u.number))}
        return self._row("complete", now, interrupted=1 if interrupted else 0, reason=reason,
                         counters=dict(self.counters), universes=totals)
