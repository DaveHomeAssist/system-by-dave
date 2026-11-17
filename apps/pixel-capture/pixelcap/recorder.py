"""Listen-only Art-Net / sACN recorder for Frozen pixel evidence.

It never transmits: no ArtPoll, no ArtPollReply, no multicast join (which
would send an IGMP report), no connect(). Inputs:

  udp   bind UDP 6454 (Art-Net) and 5568 (sACN) and read what this host is sent
  pcap  read a classic pcap stream, a file or `tcpdump -U -w -` on stdin

Mirrored unicast (another device's traffic copied to this port) reaches the
host only through interface-level capture, so use the pcap input for it. A UDP
socket, even on a promiscuous interface, receives only traffic addressed to
this host. Not transmitting proves nothing about the host; see docs/runbook.md.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import platform
import queue
import selectors
import signal
import socket
import sys
import threading
import time

from . import aggregate, pcap, protocol

VERSION = "0.1.0"
PORTS = (protocol.ARTNET_PORT, protocol.SACN_PORT)


class ListenOnlySocket:
    """A UDP socket that exposes receive operations only."""

    def __init__(self, bind, port, buffer_bytes=4 << 20):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, buffer_bytes)
        except OSError:
            pass
        # Deliberately no SO_REUSEPORT: sharing a port with a show application
        # could divert datagrams meant for it.
        sock.bind((bind, port))
        sock.setblocking(False)
        self._sock = sock
        self.port = sock.getsockname()[1]

    def recvfrom(self, size=2048):
        return self._sock.recvfrom(size)

    def fileno(self):
        return self._sock.fileno()

    def close(self):
        self._sock.close()


class Stop:
    def __init__(self):
        self.flag = False
        self.reason = None

    def __call__(self, signum, _frame):
        self.flag = True
        self.reason = signal.Signals(signum).name


def parse_until(value):
    stamp = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        stamp = stamp.astimezone()
    return stamp.timestamp()


def build_parser():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", required=True, help="JSONL path (appended), or - for stdout")
    p.add_argument("--input", choices=("udp", "pcap"), default="udp")
    p.add_argument("--bind", default="127.0.0.1",
                   help="udp: address to bind (default loopback; use the lighting-network address only once approved)")
    p.add_argument("--artnet-port", type=int, default=protocol.ARTNET_PORT)
    p.add_argument("--sacn-port", type=int, default=protocol.SACN_PORT)
    p.add_argument("--no-sacn", action="store_true", help="udp: do not bind the sACN port")
    p.add_argument("--pcap", default="-", help="pcap: file path, or - for stdin")
    p.add_argument("--pcap-live", action="store_true",
                   help="pcap: the stream is live (tcpdump); tick stale/heartbeat on the wall clock")
    p.add_argument("--window", type=float, default=1.0, help="seconds per universe summary row")
    p.add_argument("--stale-after", type=float, default=2.5, help="seconds without a frame before universe_stale")
    p.add_argument("--heartbeat", type=float, default=30.0)
    p.add_argument("--duration", type=float, default=4 * 3600.0, help="seconds to run (default 4 h)")
    p.add_argument("--until", help="absolute ISO end time; overrides --duration")
    p.add_argument("--session", default=None, help="session label stored in the start row")
    p.add_argument("--allow-repo-output", action="store_true",
                   help="allow --out inside a git working tree (captures must not go in the public repo)")
    return p


def repo_root(path):
    """Return the git working tree containing path, or None."""
    here = os.path.dirname(os.path.abspath(path))
    while True:
        if os.path.exists(os.path.join(here, ".git")):
            return here
        parent = os.path.dirname(here)
        if parent == here:
            return None
        here = parent


def run_udp(args, agg, end_at, stop):
    sockets = [ListenOnlySocket(args.bind, args.artnet_port)]
    if not args.no_sacn:
        sockets.append(ListenOnlySocket(args.bind, args.sacn_port))
    selector = selectors.DefaultSelector()
    for sock in sockets:
        selector.register(sock, selectors.EVENT_READ)
    agg.start(time.time(), input="udp", bind=args.bind, ports=[s.port for s in sockets], **common_start(args, end_at))
    try:
        while not stop.flag:
            now = time.time()
            if now >= end_at:
                stop.reason = stop.reason or "duration"
                break
            timeout = min(0.25, max(0.0, end_at - now))
            for key, _ in selector.select(timeout):
                sock = key.fileobj
                while True:
                    try:
                        payload, (src_ip, src_port) = sock.recvfrom(2048)
                    except (BlockingIOError, InterruptedError):
                        break
                    agg.ingest(protocol.decode(payload), src_ip, time.time(), dst_ip=None, src_port=src_port)
            agg.tick(time.time())
    finally:
        for sock in sockets:
            selector.unregister(sock)
            sock.close()


def _pcap_events(stream):
    for stamp, linktype, frame, original in pcap.read_packets(stream, with_original=True):
        if len(frame) < original:
            yield stamp, "snaplen-truncated"  # capture loss, not show loss
            continue
        yield stamp, pcap.udp_datagram(linktype, frame)


def _ingest_datagram(agg, stamp, datagram):
    if isinstance(datagram, str):
        agg.note_skipped(datagram)
        return
    src, _sport, dst, dport, payload = datagram
    if dport not in PORTS and _sport not in PORTS:
        agg.note_skipped("other-port")
        return
    agg.ingest(protocol.decode(payload, dport), src, stamp, dst_ip=dst)


def run_pcap(args, agg, end_at, stop):
    stream = sys.stdin.buffer if args.pcap == "-" else open(args.pcap, "rb")
    try:
        if not args.pcap_live:
            started = False
            last = None
            for stamp, datagram in _pcap_events(stream):
                if not started:
                    agg.start(stamp, input="pcap", pcap=args.pcap, replay=True, **common_start(args, None))
                    started = True
                    end_at = stamp + args.duration if not args.until else end_at
                if stop.flag or stamp >= end_at:
                    stop.reason = stop.reason or "duration"
                    break
                _ingest_datagram(agg, stamp, datagram)
                last = stamp
            if not started:
                agg.start(time.time(), input="pcap", pcap=args.pcap, replay=True, empty=True, **common_start(args, None))
                last = time.time()
            stop.reason = stop.reason or "end-of-capture"
            return last
        agg.start(time.time(), input="pcap", pcap=args.pcap, replay=False, **common_start(args, end_at))
        events = queue.Queue(maxsize=100000)

        def reader():
            try:
                for item in _pcap_events(stream):
                    events.put(item)
            except Exception as error:  # surfaced in the complete row
                events.put(("error", str(error)))
            events.put(None)

        threading.Thread(target=reader, daemon=True).start()
        while not stop.flag and time.time() < end_at:
            try:
                item = events.get(timeout=0.25)
            except queue.Empty:
                agg.tick(time.time())
                continue
            if item is None:
                stop.reason = stop.reason or "end-of-capture"
                break
            if item[0] == "error":
                stop.reason = "pcap-error: " + item[1]
                break
            _ingest_datagram(agg, *item)
        stop.reason = stop.reason or "duration"
        return None
    finally:
        if stream is not sys.stdin.buffer:
            stream.close()


def common_start(args, end_at):
    return dict(recorderVersion=VERSION, host=platform.node(), pid=os.getpid(), python=platform.python_version(),
                session=args.session, plannedEndUnix=round(end_at, 3) if end_at else None,
                plannedEnd=aggregate.utc(end_at) if end_at else None,
                evidenceNote="Receipt at the capture point only; not proof that pixels lit.")


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.out != "-" and not args.allow_repo_output and repo_root(args.out):
        print("pixel-capture: refusing to write %s inside the git working tree %s; captures stay out of the "
              "repository (use --allow-repo-output only for synthetic fixtures)" % (args.out, repo_root(args.out)),
              file=sys.stderr)
        return 2
    if args.input == "udp" and args.bind not in ("127.0.0.1", "localhost"):
        print("pixel-capture: the UDP listener only receives traffic addressed to this host. It will not see "
              "mirrored unicast; use interface-level capture into --input pcap.", file=sys.stderr)
    end_at = parse_until(args.until) if args.until else time.time() + args.duration
    writer = aggregate.JsonlWriter(args.out)
    agg = aggregate.Aggregator(writer, window=args.window, stale_after=args.stale_after, heartbeat=args.heartbeat)
    stop = Stop()
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    finish_at = None
    try:
        if args.input == "udp":
            run_udp(args, agg, end_at, stop)
        else:
            finish_at = run_pcap(args, agg, end_at, stop)
    except OSError as error:
        if agg.last_heartbeat is None:
            agg.start(time.time(), input=args.input, failed=True, **common_start(args, end_at))
        stop.flag, stop.reason = True, "error: %s" % error
        print("pixel-capture: %s" % error, file=sys.stderr)
    finally:
        when = finish_at if finish_at is not None else time.time()
        interrupted = stop.reason not in ("duration", "end-of-capture")
        agg.finish(when, interrupted=interrupted, reason=stop.reason)
        writer.close()
    return 0 if not (stop.reason or "").startswith(("error", "pcap-error")) else 1


if __name__ == "__main__":
    sys.exit(main())
