"""Decode Art-Net and sACN (E1.31) datagrams.

Pure functions over bytes. Nothing here opens a socket. Decoders return a
dict for a recognised packet and None for anything else; malformed input never
raises.
"""
from __future__ import annotations

import hashlib
import struct

ARTNET_PORT = 6454
SACN_PORT = 5568

ARTNET_ID = b"Art-Net\x00"
OP_POLL = 0x2000
OP_POLL_REPLY = 0x2100
OP_DMX = 0x5000
OP_NZS = 0x5100
OP_SYNC = 0x5200
OPCODE_NAMES = {
    OP_POLL: "ArtPoll",
    OP_POLL_REPLY: "ArtPollReply",
    OP_DMX: "ArtDmx",
    OP_NZS: "ArtNzs",
    OP_SYNC: "ArtSync",
    0x6000: "ArtAddress",
    0x7000: "ArtInput",
    0x8000: "ArtTodRequest",
    0x8100: "ArtTodData",
    0x8300: "ArtRdm",
    0x9700: "ArtTimeCode",
    0xF800: "ArtIpProg",
}

ACN_ID = b"ASC-E1.17\x00\x00\x00"
VECTOR_ROOT_DATA = 0x00000004
VECTOR_ROOT_EXTENDED = 0x00000008
VECTOR_FRAMING_DATA = 0x00000002
VECTOR_DMP_SET = 0x02


def level_hash(data: bytes) -> str:
    """Short, stable fingerprint of a frame's levels. Never the levels."""
    return hashlib.sha256(len(data).to_bytes(2, "big") + bytes(data)).hexdigest()[:16]


def level_summary(data: bytes) -> dict:
    nonzero = len(data) - data.count(0)
    return {"length": len(data), "nonZero": nonzero, "maxLevel": max(data) if data else 0}


def decode_artnet(payload: bytes):
    """Return a dict for an Art-Net datagram, or None if it is not Art-Net."""
    if len(payload) < 10 or payload[:8] != ARTNET_ID:
        return None
    opcode = struct.unpack_from("<H", payload, 8)[0]
    name = OPCODE_NAMES.get(opcode, "0x%04x" % opcode)
    if opcode not in (OP_DMX, OP_NZS):
        return {"protocol": "artnet", "kind": "other", "opcode": name}
    if len(payload) < 18:
        return {"protocol": "artnet", "kind": "malformed", "opcode": name, "reason": "short header"}
    sequence = payload[12]
    start_code = 0 if opcode == OP_DMX else payload[13]
    sub_uni = payload[14]
    net = payload[15] & 0x7F
    length = struct.unpack_from(">H", payload, 16)[0]
    data = payload[18:18 + length]
    if length < 2 or length > 512 or len(data) != length:
        return {"protocol": "artnet", "kind": "malformed", "opcode": name, "reason": "bad length"}
    return {
        "protocol": "artnet",
        "kind": "dmx",
        "opcode": name,
        "universe": (net << 8) | sub_uni,
        "sequence": sequence,
        "startCode": start_code,
        "data": bytes(data),
    }


def decode_sacn(payload: bytes):
    """Return a dict for an E1.31 datagram, or None if it is not E1.31."""
    if len(payload) < 38 or payload[4:16] != ACN_ID:
        return None
    root_vector = struct.unpack_from(">I", payload, 18)[0]
    cid = payload[22:38].hex()
    if root_vector == VECTOR_ROOT_EXTENDED:
        return {"protocol": "sacn", "kind": "other", "opcode": "extended", "cid": cid}
    if root_vector != VECTOR_ROOT_DATA:
        return {"protocol": "sacn", "kind": "other", "opcode": "root 0x%x" % root_vector, "cid": cid}
    if len(payload) < 126:
        return {"protocol": "sacn", "kind": "malformed", "reason": "short data packet", "cid": cid}
    framing_vector = struct.unpack_from(">I", payload, 40)[0]
    if framing_vector != VECTOR_FRAMING_DATA or payload[117] != VECTOR_DMP_SET:
        return {"protocol": "sacn", "kind": "malformed", "reason": "bad vector", "cid": cid}
    source_name = payload[44:108].split(b"\x00", 1)[0].decode("utf-8", "replace")
    priority = payload[108]
    sequence = payload[111]
    options = payload[112]
    universe = struct.unpack_from(">H", payload, 113)[0]
    count = struct.unpack_from(">H", payload, 123)[0]
    values = payload[125:125 + count]
    if count < 1 or count > 513 or len(values) != count:
        return {"protocol": "sacn", "kind": "malformed", "reason": "bad property count", "cid": cid}
    return {
        "protocol": "sacn",
        "kind": "dmx",
        "opcode": "data",
        "universe": universe,
        "sequence": sequence,
        "startCode": values[0],
        "data": bytes(values[1:]),
        "cid": cid,
        "sourceName": source_name,
        "priority": priority,
        "preview": bool(options & 0x80),
        "terminated": bool(options & 0x40),
    }


def decode(payload: bytes, dst_port: int | None = None):
    """Decode by content; the port only breaks ties."""
    if payload[:8] == ARTNET_ID:
        return decode_artnet(payload)
    if payload[4:16] == ACN_ID:
        return decode_sacn(payload)
    return None


# Sequence handling -----------------------------------------------------------

def artnet_sequence_step(last: int, new: int):
    """Classify an Art-Net sequence step. Returns (status, missing).

    Art-Net counts 1..255 and wraps to 1; 0 means sequencing is disabled.
    """
    if new == 0 or last == 0:
        return "disabled", 0
    diff = (new - last) % 255
    if diff == 1:
        return "ok", 0
    if diff == 0:
        return "duplicate", 0
    if diff > 235:  # a small step backwards
        return "out_of_order", 0
    return "gap", diff - 1


def sacn_sequence_step(last: int, new: int):
    """Classify an E1.31 sequence step per section 6.7.2. Returns (status, missing)."""
    diff = (new - last + 128) % 256 - 128  # signed 8-bit difference
    if diff == 1:
        return "ok", 0
    if diff == 0:
        return "duplicate", 0
    if -20 < diff < 0:
        return "out_of_order", 0
    if diff > 1:
        return "gap", diff - 1
    return "reset", 0  # a large jump backwards: E1.31 accepts it as a new run


# Fixture encoders (used only by the synthetic generator and tests) ----------

def encode_artdmx(universe: int, sequence: int, data: bytes, physical: int = 0) -> bytes:
    if len(data) % 2:
        data = data + b"\x00"
    return (ARTNET_ID + struct.pack("<H", OP_DMX) + struct.pack(">H", 14)
            + bytes([sequence & 0xFF, physical, universe & 0xFF, (universe >> 8) & 0x7F])
            + struct.pack(">H", len(data)) + data)


def encode_artpoll() -> bytes:
    return ARTNET_ID + struct.pack("<H", OP_POLL) + struct.pack(">H", 14) + b"\x00\x00"


def encode_sacn(universe: int, sequence: int, data: bytes, cid: bytes, source_name: str = "fixture",
                priority: int = 100, terminated: bool = False) -> bytes:
    values = b"\x00" + data
    dmp_len = 10 + len(values)
    framing_len = 77 + dmp_len
    root_len = 22 + framing_len
    name = source_name.encode("utf-8")[:63].ljust(64, b"\x00")
    options = 0x40 if terminated else 0
    return (struct.pack(">HH", 0x0010, 0) + ACN_ID
            + struct.pack(">H", 0x7000 | root_len) + struct.pack(">I", VECTOR_ROOT_DATA) + cid[:16].ljust(16, b"\x00")
            + struct.pack(">H", 0x7000 | framing_len) + struct.pack(">I", VECTOR_FRAMING_DATA) + name
            + bytes([priority]) + struct.pack(">H", 0) + bytes([sequence & 0xFF, options])
            + struct.pack(">H", universe)
            + struct.pack(">H", 0x7000 | dmp_len) + bytes([VECTOR_DMP_SET, 0xA1])
            + struct.pack(">HHH", 0, 1, len(values)) + values)
