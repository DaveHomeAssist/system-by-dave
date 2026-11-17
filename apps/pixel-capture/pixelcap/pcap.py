"""Read classic pcap streams (a file, or `tcpdump -w -` on stdin).

Reading a capture is passive. This module only parses bytes; it never opens
a network interface itself. Supported link types: Ethernet (with 802.1Q
tags), BSD loopback/NULL, Linux cooked (SLL, SLL2) and raw IPv4.
"""
from __future__ import annotations

import socket
import struct

LINK_NULL = 0
LINK_ETHERNET = 1
LINK_RAW = 101
LINK_LOOP = 108
LINK_SLL = 113
LINK_SLL2 = 276
LINK_RAW_ALT = 12


class PcapError(ValueError):
    pass


def _read_exact(stream, size):
    chunks = []
    remaining = size
    while remaining:
        chunk = stream.read(remaining)
        if not chunk:
            break
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def read_packets(stream):
    """Yield (timestamp, linktype, frame bytes) from a pcap stream."""
    header = _read_exact(stream, 24)
    if len(header) < 24:
        raise PcapError("missing pcap global header")
    magic = header[:4]
    if magic == b"\xd4\xc3\xb2\xa1":
        endian, scale = "<", 1e-6
    elif magic == b"\xa1\xb2\xc3\xd4":
        endian, scale = ">", 1e-6
    elif magic == b"\x4d\x3c\xb2\xa1":
        endian, scale = "<", 1e-9
    elif magic == b"\xa1\xb2\x3c\x4d":
        endian, scale = ">", 1e-9
    else:
        raise PcapError("not a classic pcap stream (pcapng is not supported; use tcpdump -w)")
    linktype = struct.unpack(endian + "I", header[20:24])[0] & 0x0FFFFFFF
    record = struct.Struct(endian + "IIII")
    while True:
        head = _read_exact(stream, 16)
        if len(head) < 16:
            return
        seconds, fraction, included, _original = record.unpack(head)
        frame = _read_exact(stream, included)
        if len(frame) < included:
            return
        yield seconds + fraction * scale, linktype, frame


def _ip_payload(linktype, frame):
    if linktype == LINK_ETHERNET:
        offset, ethertype = 14, struct.unpack_from(">H", frame, 12)[0] if len(frame) >= 14 else 0
        while ethertype in (0x8100, 0x88A8) and len(frame) >= offset + 4:
            ethertype = struct.unpack_from(">H", frame, offset + 2)[0]
            offset += 4
        return frame[offset:] if ethertype == 0x0800 else None
    if linktype in (LINK_NULL, LINK_LOOP):
        if len(frame) < 4:
            return None
        family_le = struct.unpack_from("<I", frame, 0)[0]
        family_be = struct.unpack_from(">I", frame, 0)[0]
        return frame[4:] if 2 in (family_le, family_be) else None
    if linktype == LINK_SLL:
        return frame[16:] if len(frame) >= 16 and struct.unpack_from(">H", frame, 14)[0] == 0x0800 else None
    if linktype == LINK_SLL2:
        return frame[20:] if len(frame) >= 20 and struct.unpack_from(">H", frame, 0)[0] == 0x0800 else None
    if linktype in (LINK_RAW, LINK_RAW_ALT):
        return frame if frame and frame[0] >> 4 == 4 else None
    return None


def udp_datagram(linktype, frame):
    """Return (src_ip, src_port, dst_ip, dst_port, payload) or a reason string."""
    ip = _ip_payload(linktype, frame)
    if ip is None or len(ip) < 20 or ip[0] >> 4 != 4:
        return "not-ipv4"
    ihl = (ip[0] & 0x0F) * 4
    if ip[9] != 17:
        return "not-udp"
    flags_fragment = struct.unpack_from(">H", ip, 6)[0]
    if flags_fragment & 0x3FFF:
        return "ip-fragment"
    if len(ip) < ihl + 8:
        return "truncated"
    src = socket.inet_ntoa(ip[12:16])
    dst = socket.inet_ntoa(ip[16:20])
    src_port, dst_port, udp_length = struct.unpack_from(">HHH", ip, ihl)
    payload = ip[ihl + 8: ihl + udp_length]
    if len(payload) < udp_length - 8:
        return "truncated"
    return src, src_port, dst, dst_port, payload


def write_header(stream, linktype=LINK_ETHERNET, snaplen=65535):
    """Fixture helper: write a little-endian microsecond pcap header."""
    stream.write(struct.pack("<IHHiIII", 0xA1B2C3D4, 2, 4, 0, 0, snaplen, linktype))


def write_udp(stream, timestamp, src, dst, src_port, dst_port, payload, linktype=LINK_ETHERNET, vlan=None):
    """Fixture helper: append one IPv4/UDP frame."""
    udp = struct.pack(">HHHH", src_port, dst_port, 8 + len(payload), 0) + payload
    ip = struct.pack(">BBHHHBBH4s4s", 0x45, 0, 20 + len(udp), 0, 0, 64, 17, 0,
                     socket.inet_aton(src), socket.inet_aton(dst)) + udp
    if linktype == LINK_ETHERNET:
        tag = struct.pack(">HH", 0x8100, vlan) if vlan is not None else b""
        frame = b"\x02\x00\x00\x00\x00\x01" + b"\x02\x00\x00\x00\x00\x02" + tag + b"\x08\x00" + ip
    elif linktype == LINK_NULL:
        frame = struct.pack("<I", 2) + ip
    else:
        frame = ip
    seconds = int(timestamp)
    micros = int(round((timestamp - seconds) * 1e6))
    stream.write(struct.pack("<IIII", seconds, micros, len(frame), len(frame)) + frame)
