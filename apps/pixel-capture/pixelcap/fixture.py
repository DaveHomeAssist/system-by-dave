"""Synthetic Art-Net / sACN / MIDI fixture generator. Lab use only.

This is the only module in the package that transmits, and it refuses any
destination that is not loopback unless --allow-lab-target is given. It never
targets the venue network. Modes:

  live  send the scenario over UDP in real time and write matching MIDI JSONL
  pcap  write the scenario to a pcap file instantly (no network at all)

Scenario (seconds from start): Art-Net universes 0 and 1 at 40 Hz, sACN
universe 1 at 30 Hz; MSC GO cues 101, 102.5, 103 and 104 at 3, 6, 9 and 12 s
(102.5 is split across two MIDI rows with a realtime byte inside); level
changes on cues; a chase on Art-Net 1 until 5 s; a 5-frame sequence gap on
Art-Net 0 at 7 s; Art-Net 1 quiet from 10 to 14 s; a second sACN sender at
13-15 s; an sACN stream-terminated packet at 16 s; one ArtPoll at 1 s.
"""
from __future__ import annotations

import argparse
import ipaddress
import json
import socket
import sys
import time

from . import aggregate, msc, pcap, protocol

CID_A = bytes.fromhex("a15f1c2e00004000800000000000a1a1")
CID_B = bytes.fromhex("b25f1c2e00004000800000000000b2b2")
CUES = [(3.0, "101"), (6.0, "102.5"), (9.0, "103"), (12.0, "104")]
DURATION = 18.0


def frame(level, length=510, offset=0):
    return bytes(((level + (i if offset else 0)) & 0xFF) if i % 3 == 0 else 0 for i in range(length))


def scenario(duration=DURATION, scale=1.0):
    """Yield (t, port, src_tag, payload) in time order. src_tag 'a' or 'b'."""
    events = []
    step0 = 1 / 40.0
    seq = {"a0": 0, "a1": 0, "sa": 0, "sb": 0}

    def nxt(name, wrap_zero=False):
        seq[name] = (seq[name] + 1) % 256 if wrap_zero else (seq[name] % 255) + 1
        return seq[name]

    def level_for(t, base):
        stage = sum(1 for at, _ in CUES if t >= at)
        return (base + 40 * stage) & 0xFF

    t = 0.0
    while t < duration:
        # Art-Net 0: steady, changes on each cue, a 5-number gap at 7 s
        s = nxt("a0")
        if 7.0 <= t < 7.0 + step0:
            for _ in range(5):
                s = nxt("a0")
        events.append((t, protocol.ARTNET_PORT, "a", protocol.encode_artdmx(0, s, frame(level_for(t, 20)))))
        # Art-Net 1: chase until 5 s, then static; quiet 10-14 s
        if not (10.0 <= t < 14.0):
            chase = int(t * 40) if t < 5.0 else 0
            lvl = level_for(t, 60) if t >= 6.0 else 60
            events.append((t + 0.004, protocol.ARTNET_PORT, "a",
                           protocol.encode_artdmx(1, nxt("a1"), frame(lvl + chase, offset=chase))))
        t += step0
    t = 0.0
    while t < duration:
        if t < 15.99:
            events.append((t + 0.011, protocol.SACN_PORT, "a",
                           protocol.encode_sacn(1, nxt("sa", True), frame(level_for(t, 90), 300), CID_A, "fixture A")))
        if 13.0 <= t < 15.0:
            events.append((t + 0.017, protocol.SACN_PORT, "b",
                           protocol.encode_sacn(1, nxt("sb", True), frame(5, 300), CID_B, "fixture B", priority=90)))
        t += 1 / 30.0
    if duration > 16.05:
        events.append((16.05, protocol.SACN_PORT, "a",
                       protocol.encode_sacn(1, nxt("sa", True), frame(0, 300), CID_A, "fixture A", terminated=True)))
    if duration > 1.0:
        events.append((1.0, protocol.ARTNET_PORT, "a", protocol.encode_artpoll()))
    events.sort(key=lambda e: e[0])
    for at, port, tag, payload in events:
        yield at * scale, port, tag, payload


def midi_rows(base, duration=DURATION):
    """Studio-observer-format MIDI rows for CUES, starting at unix time `base`."""
    rows = [{"type": "start", "unixSeconds": base, "utc": aggregate.utc(base)[:19] + "Z", "noOutputPort": True,
             "synthetic": True, "durationSeconds": DURATION}]
    for at, cue in CUES:
        if at >= duration:
            continue
        raw = msc.encode_go(cue, "1", device=0x03)
        stamp = base + at
        utc = aggregate.utc(stamp)[:19] + "Z"
        common = {"type": "midi", "direction": "incoming", "endpoint": 990001, "name": "fixture"}
        if cue == "102.5":
            first, second = raw[:7], b"\xF8" + raw[7:]  # split, with a realtime byte inside
            rows.append(dict(common, unixSeconds=stamp, utc=utc, length=len(first), hex=first.hex()))
            rows.append(dict(common, unixSeconds=stamp + 0.001, utc=utc, length=len(second), hex=second.hex()))
        else:
            rows.append(dict(common, unixSeconds=stamp, utc=utc, length=len(raw), hex=raw.hex(" ")))
    end = base + duration
    rows.append({"type": "complete", "unixSeconds": end, "utc": aggregate.utc(end)[:19] + "Z", "interrupted": 0,
                 "synthetic": True})
    return rows


def check_target(target, allow_lab):
    address = ipaddress.ip_address(target)
    if address.is_loopback:
        return
    if allow_lab and address.is_private:
        print("fixture: sending to lab target %s. Never use the venue lighting network." % target, file=sys.stderr)
        return
    raise SystemExit("fixture: refusing non-loopback target %s (lab use needs --allow-lab-target)" % target)


def run_live(args):
    check_target(args.target, args.allow_lab_target)
    ports = {protocol.ARTNET_PORT: args.artnet_port, protocol.SACN_PORT: args.sacn_port}
    send_a = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    send_b = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    base = time.time() + 0.2
    if args.midi_out:
        with open(args.midi_out, "w", encoding="utf-8") as f:
            for row in midi_rows(base, args.duration):
                f.write(json.dumps(row) + "\n")
    sent = 0
    for at, port, tag, payload in scenario(args.duration, args.scale):
        delay = base + at - time.time()
        if delay > 0:
            time.sleep(delay)
        (send_b if tag == "b" else send_a).sendto(payload, (args.target, ports[port]))
        sent += 1
    send_a.close()
    send_b.close()
    print(json.dumps({"mode": "live", "target": args.target, "sent": sent, "base": base}))


def run_pcap(args, base=1794787200.0):
    """Write the scenario as Ethernet/IPv4/UDP frames from 10.0.0.10 (A) and 10.0.0.11 (B)."""
    with open(args.pcap_out, "wb") as f:
        pcap.write_header(f)
        count = 0
        for at, port, tag, payload in scenario(args.duration, args.scale):
            src = "10.0.0.11" if tag == "b" else "10.0.0.10"
            dst = "10.0.0.50" if port == protocol.ARTNET_PORT else "239.255.0.1"
            if payload[8:10] == b"\x00\x20":  # ArtPoll goes to broadcast
                dst = "10.0.0.255"
            pcap.write_udp(f, base + at, src, dst, 6454 if port == protocol.ARTNET_PORT else 50000, port, payload)
            count += 1
    if args.midi_out:
        with open(args.midi_out, "w", encoding="utf-8") as f:
            for row in midi_rows(base, args.duration):
                f.write(json.dumps(row) + "\n")
    print(json.dumps({"mode": "pcap", "out": args.pcap_out, "frames": count, "base": base}))


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("mode", choices=("live", "pcap"))
    p.add_argument("--target", default="127.0.0.1")
    p.add_argument("--allow-lab-target", action="store_true")
    p.add_argument("--artnet-port", type=int, default=protocol.ARTNET_PORT)
    p.add_argument("--sacn-port", type=int, default=protocol.SACN_PORT)
    p.add_argument("--duration", type=float, default=DURATION)
    p.add_argument("--scale", type=float, default=1.0, help="time scale (live mode)")
    p.add_argument("--midi-out", help="write synthetic MIDI capture JSONL here")
    p.add_argument("--pcap-out", help="pcap mode: output file")
    args = p.parse_args(argv)
    if args.mode == "pcap":
        if not args.pcap_out:
            p.error("pcap mode needs --pcap-out")
        run_pcap(args)
    else:
        run_live(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
