"""Decode MIDI Show Control firings from the Studio observer's MIDI JSONL.

Mirrors the capture's rules: assemble SysEx per direction and endpoint, skip
realtime bytes, close at F7, require F0 7F <device> 02. Cue strings stay
literal (decimals kept). Repeated identical firings get an occurrence count,
and a firing ID is the first 24 hex of SHA-256 over
"utc|direction|endpoint|hex|occurrence", matching the photo association.
"""
from __future__ import annotations

import collections
import hashlib
import json

COMMANDS = {1: "GO", 2: "STOP", 3: "RESUME", 4: "TIMED_GO", 5: "LOAD", 6: "SET", 7: "FIRE", 8: "ALL_OFF",
            9: "RESTORE", 10: "RESET", 11: "GO_OFF"}


def parse_msc(raw: bytes):
    if len(raw) < 6 or raw[0] != 0xF0 or raw[1] != 0x7F or raw[3] != 0x02 or raw[-1] != 0xF7:
        return None
    command = raw[5]
    fields = raw[6:-1].split(b"\x00")
    text = [f.decode("ascii", "replace") for f in fields]
    return {"device": raw[2], "format": raw[4], "command": command, "commandName": COMMANDS.get(command, str(command)),
            "cue": text[0] if text and text[0] else None,
            "cueList": text[1] if len(text) > 1 and text[1] else None,
            "cuePath": text[2] if len(text) > 2 and text[2] else None}


def firings(rows):
    """Yield decoded MSC firings from observer rows, in file order."""
    buffers = {}
    occurrences = collections.Counter()
    for row in rows:
        if row.get("type") != "midi" or not row.get("hex"):
            continue
        key = (row.get("direction"), row.get("endpoint"))
        try:
            data = bytes.fromhex(row["hex"])
        except ValueError:
            continue
        for byte in data:
            if byte >= 0xF8:
                continue  # realtime bytes may interleave with SysEx
            if byte == 0xF0:
                buffers[key] = bytearray([byte])
                buffers[key + ("row",)] = row
                continue
            buf = buffers.get(key)
            if buf is None:
                continue
            if byte & 0x80 and byte != 0xF7:
                buffers.pop(key, None)  # a status byte aborts the SysEx
                continue
            buf.append(byte)
            if byte == 0xF7:
                raw = bytes(buf)
                buffers.pop(key, None)
                first = buffers.pop(key + ("row",), row)
                decoded = parse_msc(raw)
                if decoded is None:
                    continue
                hex_text = raw.hex(" ")
                base = "%s|%s|%s|%s" % (first.get("utc"), first.get("direction"), first.get("endpoint"), hex_text)
                occurrences[base] += 1
                ident = "%s|%d" % (base, occurrences[base])
                decoded.update(unixSeconds=first.get("unixSeconds"), utc=first.get("utc"),
                               direction=first.get("direction"), endpoint=first.get("endpoint"),
                               name=first.get("name"), hex=hex_text, key=ident,
                               id=hashlib.sha256(ident.encode()).hexdigest()[:24])
                yield decoded


def read_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as stream:
        for line in stream:
            try:
                rows.append(json.loads(line))
            except ValueError:
                continue
    return rows


def encode_go(cue: str, cue_list: str = "1", device: int = 0x7F, fmt: int = 0x01) -> bytes:
    """Fixture helper: an MSC GO SysEx."""
    return bytes([0xF0, 0x7F, device, 0x02, fmt, 0x01]) + cue.encode() + b"\x00" + cue_list.encode() + b"\xF7"
