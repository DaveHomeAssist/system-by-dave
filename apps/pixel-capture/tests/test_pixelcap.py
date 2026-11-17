"""Tests for the Frozen pixel capture. Synthetic data on loopback only."""
from __future__ import annotations

import ast
import io
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pixelcap import aggregate, fixture, inspect_capture, msc, pcap, protocol, recorder, viewer  # noqa: E402

PKG = ROOT / "pixelcap"


def read_rows(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def free_udp_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class ProtocolTests(unittest.TestCase):
    def test_artdmx_roundtrip_and_port_address(self):
        data = bytes(range(10))
        pkt = protocol.decode(protocol.encode_artdmx(0x123, 7, data))
        self.assertEqual(pkt["kind"], "dmx")
        self.assertEqual(pkt["universe"], 0x123)
        self.assertEqual(pkt["sequence"], 7)
        self.assertEqual(pkt["data"], data)

    def test_artdmx_pads_odd_length(self):
        pkt = protocol.decode(protocol.encode_artdmx(1, 1, b"\x01\x02\x03"))
        self.assertEqual(len(pkt["data"]), 4)

    def test_artpoll_is_other_not_dmx(self):
        pkt = protocol.decode(protocol.encode_artpoll())
        self.assertEqual((pkt["kind"], pkt["opcode"]), ("other", "ArtPoll"))

    def test_malformed_never_raises(self):
        good = protocol.encode_artdmx(0, 1, bytes(16))
        for bad in (b"", b"Art-Net\x00", good[:17], good[:16] + b"\x02\x00" + good[18:], b"\x00" * 200):
            protocol.decode(bad)
        self.assertEqual(protocol.decode(good[:16] + b"\x02\x00" + good[18:])["kind"], "malformed")

    def test_sacn_roundtrip(self):
        cid = bytes(range(16))
        pkt = protocol.decode(protocol.encode_sacn(42, 200, b"\x05" * 20, cid, "Millumin?", priority=120))
        self.assertEqual((pkt["universe"], pkt["sequence"], pkt["priority"]), (42, 200, 120))
        self.assertEqual(pkt["sourceName"], "Millumin?")
        self.assertEqual(pkt["cid"], cid.hex())
        self.assertEqual(pkt["data"], b"\x05" * 20)
        self.assertFalse(pkt["terminated"])
        self.assertTrue(protocol.decode(protocol.encode_sacn(1, 1, b"", cid, terminated=True))["terminated"])

    def test_artnet_sequence_rules(self):
        step = protocol.artnet_sequence_step
        self.assertEqual(step(255, 1), ("ok", 0))      # wraps 255 -> 1, never 0
        self.assertEqual(step(10, 11), ("ok", 0))
        self.assertEqual(step(10, 16), ("gap", 5))
        self.assertEqual(step(250, 3), ("gap", 7))
        self.assertEqual(step(10, 9)[0], "out_of_order")
        self.assertEqual(step(10, 10)[0], "duplicate")
        self.assertEqual(step(0, 5)[0], "disabled")
        self.assertEqual(step(5, 0)[0], "disabled")

    def test_sacn_sequence_rules(self):
        step = protocol.sacn_sequence_step
        self.assertEqual(step(255, 0), ("ok", 0))
        self.assertEqual(step(254, 2), ("gap", 3))
        self.assertEqual(step(10, 5)[0], "out_of_order")
        self.assertEqual(step(100, 10)[0], "reset")

    def test_level_hash_is_short_and_sensitive(self):
        a, b = bytes(512), bytes(511) + b"\x01"
        self.assertEqual(len(protocol.level_hash(a)), 16)
        self.assertNotEqual(protocol.level_hash(a), protocol.level_hash(b))
        self.assertNotEqual(protocol.level_hash(bytes(2)), protocol.level_hash(bytes(4)))


class AggregatorTests(unittest.TestCase):
    def setUp(self):
        self.out = aggregate.MemoryWriter()
        self.agg = aggregate.Aggregator(self.out, window=1.0, stale_after=2.5, heartbeat=30)
        self.agg.start(1000.0)

    def feed(self, t, universe=0, seq=1, level=0, src="10.0.0.10"):
        self.agg.ingest(protocol.decode(protocol.encode_artdmx(universe, seq, bytes([level]) * 8)), src, t)

    def types(self):
        return [r["type"] for r in self.out.rows]

    def test_window_summary_rate_gaps_and_hash(self):
        seq = 0
        for i in range(40):
            seq = seq % 255 + 1
            if i == 20:
                seq += 3
            self.feed(1000.0 + i * 0.025, seq=seq, level=1 if i < 30 else 9)
        self.agg.tick(1001.01)
        win = [r for r in self.out.rows if r["type"] == "window"][0]
        self.assertEqual(win["packets"], 40)
        self.assertEqual(win["rateHz"], 40.0)
        self.assertEqual((win["seqGapEvents"], win["seqMissing"]), (1, 3))
        self.assertEqual(win["hashChanges"], 1)
        self.assertAlmostEqual(win["firstChangeUnix"], 1000.75, places=3)
        self.assertEqual(win["sources"], ["10.0.0.10"])
        self.assertEqual((win["nonZero"], win["maxLevel"], win["length"]), (8, 9, 8))

    def test_no_full_frames_are_logged(self):
        for i in range(50):
            self.agg.ingest(protocol.decode(protocol.encode_artdmx(0, i % 255 + 1, bytes(range(256)) * 2)), "1.2.3.4",
                            1000 + i * 0.03)
        self.agg.finish(1003)
        for row in self.out.rows:
            text = json.dumps(row)
            self.assertLess(len(text), 1500, row["type"])
            for value in row.values():
                self.assertFalse(isinstance(value, list) and len(value) > 32)

    def test_stale_and_resume(self):
        self.feed(1000.0)
        self.agg.tick(1002.0)
        self.assertNotIn("universe_stale", self.types())
        self.agg.tick(1002.6)
        self.assertIn("universe_stale", self.types())
        self.feed(1004.0, seq=2)
        resumed = [r for r in self.out.rows if r["type"] == "universe_resumed"][0]
        self.assertAlmostEqual(resumed["quietSeconds"], 4.0)

    def test_second_sender_flagged(self):
        self.feed(1000.0, src="10.0.0.10")
        self.feed(1000.1, src="10.0.0.99")
        self.agg.tick(1001.0)
        self.assertIn("source_added", self.types())
        win = [r for r in self.out.rows if r["type"] == "window"][0]
        self.assertTrue(win["multipleSources"])
        self.assertEqual(win["sources"], ["10.0.0.10", "10.0.0.99"])

    def test_sequences_tracked_per_sender(self):
        for i in range(10):
            self.feed(1000 + i * 0.02, seq=i + 1, src="10.0.0.1")
            self.feed(1000 + i * 0.02 + 0.01, seq=100 + i, src="10.0.0.2")
        self.agg.tick(1001.0)
        win = [r for r in self.out.rows if r["type"] == "window"][0]
        self.assertEqual(win["seqMissing"], 0)

    def test_heartbeat_and_complete(self):
        self.feed(1000.0)
        self.agg.tick(1031.0)
        self.assertIn("heartbeat", self.types())
        done = self.agg.finish(1032.0, interrupted=True, reason="SIGINT")
        self.assertEqual(done["interrupted"], 1)
        self.assertEqual(done["universes"]["artnet:0"]["packets"], 1)


class PcapTests(unittest.TestCase):
    def roundtrip(self, linktype, vlan=None):
        buf = io.BytesIO()
        pcap.write_header(buf, linktype)
        payload = protocol.encode_artdmx(3, 1, bytes(4))
        pcap.write_udp(buf, 1234.5, "10.0.0.10", "10.0.0.50", 6454, 6454, payload, linktype, vlan)
        buf.seek(0)
        ((stamp, link, frame),) = list(pcap.read_packets(buf))
        self.assertAlmostEqual(stamp, 1234.5)
        return pcap.udp_datagram(link, frame), payload

    def test_ethernet_null_raw_and_vlan(self):
        for link, vlan in ((pcap.LINK_ETHERNET, None), (pcap.LINK_ETHERNET, 51), (pcap.LINK_NULL, None),
                           (pcap.LINK_RAW, None)):
            (src, sport, dst, dport, body), payload = self.roundtrip(link, vlan)
            self.assertEqual((src, dst, dport), ("10.0.0.10", "10.0.0.50", 6454))
            self.assertEqual(body, payload)

    def test_rejects_pcapng(self):
        with self.assertRaises(pcap.PcapError):
            list(pcap.read_packets(io.BytesIO(b"\x0a\x0d\x0d\x0a" + bytes(40))))

    def test_replay_records_destinations(self):
        with tempfile.TemporaryDirectory() as tmp:
            cap, out = os.path.join(tmp, "s.pcap"), os.path.join(tmp, "p.jsonl")
            with open(cap, "wb") as f:
                pcap.write_header(f)
                for i in range(30):
                    pcap.write_udp(f, 50.0 + i / 30, "10.0.0.10", "10.0.0.50", 6454, 6454,
                                   protocol.encode_artdmx(0, i + 1, bytes(8)))
                pcap.write_udp(f, 51.5, "10.0.0.10", "10.0.0.50", 50000, 9999, b"noise")
            self.assertEqual(recorder.main(["--input", "pcap", "--pcap", cap, "--out", out]), 0)
            rows = read_rows(out)
            win = [r for r in rows if r["type"] == "window"][0]
            self.assertEqual(win["destinations"], ["10.0.0.50"])
            self.assertEqual(rows[-1]["type"], "complete")
            self.assertEqual(rows[-1]["reason"], "end-of-capture")
            beat = [r for r in rows if r["type"] == "heartbeat"][-1]
            self.assertEqual(beat["skipped"], {"other-port": 1})


class NoTransmitTests(unittest.TestCase):
    SEND_NAMES = {"send", "sendto", "sendall", "sendmsg", "sendfile", "connect", "connect_ex",
                  "IP_ADD_MEMBERSHIP", "IP_MULTICAST_IF", "SO_REUSEPORT", "SO_BROADCAST"}

    def test_recorder_modules_never_reference_transmit_calls(self):
        for name in ("recorder.py", "aggregate.py", "protocol.py", "pcap.py", "inspect_capture.py", "viewer.py", "msc.py"):
            tree = ast.parse((PKG / name).read_text())
            used = {n.attr for n in ast.walk(tree) if isinstance(n, ast.Attribute)}
            used |= {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
            self.assertFalse(used & self.SEND_NAMES, "%s references %s" % (name, used & self.SEND_NAMES))

    def test_listen_only_socket_has_no_send(self):
        sock = recorder.ListenOnlySocket("127.0.0.1", 0)
        try:
            for name in ("send", "sendto", "sendall", "sendmsg", "connect"):
                self.assertFalse(hasattr(sock, name))
        finally:
            sock.close()

    def test_live_capture_never_sends_even_when_polled(self):
        """Run the recorder in-process with every send path patched to fail, while a
        separate process sends the fixture (including an ArtPoll) to it."""
        art, sacn = free_udp_port(), free_udp_port()
        calls = []

        def boom(*args, **kwargs):
            calls.append(args)
            raise AssertionError("recorder attempted to transmit")

        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "live.jsonl")
            args = recorder.build_parser().parse_args(["--out", out, "--artnet-port", str(art), "--sacn-port",
                                                        str(sacn), "--duration", "4"])
            writer = aggregate.JsonlWriter(out)
            agg = aggregate.Aggregator(writer, heartbeat=1.0)
            stop = recorder.Stop()
            patches = [mock.patch.object(socket.socket, n, boom) for n in ("send", "sendto", "sendall", "sendmsg",
                                                                           "connect", "connect_ex")]
            for p in patches:
                p.start()
            try:
                sender = subprocess.Popen([sys.executable, "-I", "-c",
                                           "import sys;sys.path.insert(0,%r);from pixelcap import fixture;"
                                           "fixture.main(['live','--artnet-port','%d','--sacn-port','%d',"
                                           "'--duration','3'])" % (str(ROOT), art, sacn)],
                                          stdout=subprocess.DEVNULL)
                recorder.run_udp(args, agg, time.time() + 4.0, stop)
                agg.finish(time.time(), reason=stop.reason)
                writer.close()
            finally:
                for p in patches:
                    p.stop()
            sender.wait(10)
            self.assertEqual(calls, [])
            rows = read_rows(out)
            self.assertTrue(rows[0]["noTransmit"])
            beat = [r for r in rows if r["type"] == "heartbeat"][-1]
            self.assertEqual(beat["opcodes"].get("artnet:ArtPoll"), 1)
            keys = {"%s:%s" % (r["protocol"], r["universe"]) for r in rows if r["type"] == "window"}
            self.assertEqual(keys, {"artnet:0", "artnet:1", "sacn:1"})


class LiveLoopbackTests(unittest.TestCase):
    def test_recorder_cli_and_fixture_processes(self):
        art, sacn = free_udp_port(), free_udp_port()
        with tempfile.TemporaryDirectory() as tmp:
            out, midi = os.path.join(tmp, "p.jsonl"), os.path.join(tmp, "m.jsonl")
            env = dict(os.environ, PYTHONPATH=str(ROOT))
            rec = subprocess.Popen([sys.executable, "-m", "pixelcap.recorder", "--out", out, "--artnet-port", str(art),
                                    "--sacn-port", str(sacn), "--duration", "30", "--heartbeat", "1"], env=env, cwd=tmp)
            time.sleep(0.5)
            subprocess.run([sys.executable, "-m", "pixelcap.fixture", "live", "--artnet-port", str(art),
                            "--sacn-port", str(sacn), "--duration", "8", "--midi-out", midi], env=env, cwd=tmp,
                           check=True, stdout=subprocess.DEVNULL)
            time.sleep(3.0)
            mid = inspect_capture.inspect(out)
            self.assertEqual(mid["status"], "recording")
            rec.send_signal(subprocess.signal.SIGINT)
            self.assertEqual(rec.wait(10), 0)
            report = inspect_capture.inspect(out)
            self.assertEqual(report["status"], "complete")
            self.assertEqual(report["complete"]["reason"], "SIGINT")
            self.assertEqual(report["universes"]["artnet:0"]["seqMissing"], 5)
            self.assertGreater(report["universes"]["artnet:0"]["maxRateHz"], 30)
            page, data = viewer.build(out, midi)
            self.assertEqual([c["cue"] for c in data["cues"]], ["101", "102.5"])
            first = data["cues"][0]["universes"]["artnet:0"]
            self.assertTrue(first["live"] and first["changed"])
            self.assertLess(first["firstChangeOffset"], 0.2)

    def test_port_in_use_fails_cleanly(self):
        hold = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        hold.bind(("127.0.0.1", 0))
        port = hold.getsockname()[1]
        try:
            with tempfile.TemporaryDirectory() as tmp:
                out = os.path.join(tmp, "p.jsonl")
                code = recorder.main(["--out", out, "--artnet-port", str(port), "--no-sacn", "--duration", "1"])
                rows = read_rows(out)
            # SO_REUSEADDR on macOS may allow the bind; either way the run must end with a complete row
            self.assertEqual(rows[-1]["type"], "complete")
            if code:
                self.assertTrue(rows[-1]["reason"].startswith("error"))
        finally:
            hold.close()


class InspectorTests(unittest.TestCase):
    def write(self, rows):
        f = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
        for r in rows:
            f.write((r if isinstance(r, str) else json.dumps(r)) + "\n")
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def test_heartbeat_age_drives_status(self):
        path = self.write([{"type": "start", "unixSeconds": 100.0, "heartbeatEvery": 30, "input": "udp"},
                           {"type": "heartbeat", "unixSeconds": 130.0}, "not json"])
        self.assertEqual(inspect_capture.inspect(path, now=150)["status"], "recording")
        stale = inspect_capture.inspect(path, now=200)
        self.assertEqual(stale["status"], "heartbeat-stale")
        self.assertEqual(stale["invalidLines"], 1)
        self.assertTrue(any("unicast" in a for a in stale["alerts"]))

    def test_expected_universes(self):
        rows = [{"type": "start", "unixSeconds": 1.0}]
        for u in (221, 222, 223, 224):
            rows.append({"type": "window", "protocol": "artnet", "universe": u, "packets": 1, "unixSeconds": 2.0})
        report = inspect_capture.inspect(self.write(rows), now=3,
                                         expect=inspect_capture.parse_expect("artnet:221-223, artnet:227-229"))
        self.assertEqual(report["expected"]["missing"], ["artnet:227", "artnet:228", "artnet:229"])
        self.assertEqual(report["expected"]["unexpected"], ["artnet:224"])
        self.assertEqual(len(report["expected"]["matched"]), 3)

    def test_inspector_opens_no_sockets(self):
        path = self.write([{"type": "start", "unixSeconds": 1.0}])
        with mock.patch.object(socket, "socket", side_effect=AssertionError("socket opened")):
            inspect_capture.inspect(path, now=2)


class MscAndViewerTests(unittest.TestCase):
    def test_split_sysex_realtime_and_decimal(self):
        raw = msc.encode_go("12.5", "1", device=3)
        rows = [{"type": "midi", "direction": "incoming", "endpoint": 1, "utc": "u1", "unixSeconds": 10.0,
                 "hex": raw[:5].hex()},
                {"type": "midi", "direction": "incoming", "endpoint": 1, "utc": "u1", "unixSeconds": 10.001,
                 "hex": "f8" + raw[5:].hex()},
                {"type": "midi", "direction": "incoming", "endpoint": 1, "utc": "u2", "unixSeconds": 11.0,
                 "hex": raw.hex(" ")},
                {"type": "midi", "direction": "incoming", "endpoint": 1, "utc": "u2", "unixSeconds": 11.0,
                 "hex": raw.hex(" ")}]
        fired = list(msc.firings(rows))
        self.assertEqual([f["cue"] for f in fired], ["12.5", "12.5", "12.5"])
        self.assertEqual(fired[0]["unixSeconds"], 10.0)
        self.assertTrue(fired[2]["key"].endswith("|2"))  # repeat firing keeps its own identity
        self.assertEqual(len({f["id"] for f in fired}), 3)

    def test_firing_id_matches_capture_scheme(self):
        raw = bytes.fromhex("f07f030201013434310031f7")
        row = {"type": "midi", "direction": "incoming", "endpoint": 2179095, "utc": "2026-11-16T01:10:59Z",
               "unixSeconds": 1794791459.888229, "hex": raw.hex()}
        (f,) = msc.firings([row])
        self.assertEqual(f["id"], "0464ba2c5061995505c03159")  # cue 441 in the Nov 15 session markers

    def test_viewer_offset_and_escaping(self):
        with tempfile.TemporaryDirectory() as tmp:
            cap, out, midi = (os.path.join(tmp, n) for n in ("f.pcap", "p.jsonl", "m.jsonl"))
            fixture.main(["pcap", "--pcap-out", cap, "--midi-out", midi])
            recorder.main(["--input", "pcap", "--pcap", cap, "--out", out])
            _, aligned = viewer.build(out, midi, offset=0.0)
            _, shifted = viewer.build(out, midi, offset=-20.0)  # MIDI clock 20 s behind: cues land after capture
            self.assertTrue(aligned["cues"][0]["universes"]["artnet:0"]["changed"])
            self.assertFalse(any(c["universes"]["artnet:0"]["live"] for c in shifted["cues"]))
            # artnet:1 runs a chase before cue 101: changes before and after
            chase = aligned["cues"][0]["universes"]["artnet:1"]
            self.assertGreater(chase["changesBefore"], 50)
            # cue 104 lands while artnet:1 is quiet; sacn:1 has two senders flipping levels
            last = aligned["cues"][-1]["universes"]
            self.assertGreater(last["sacn:1"]["changesAfter"], 50)
            page, _ = viewer.build(out, midi, title="<x>")
            self.assertIn("&lt;x&gt;", page)

    def test_real_session_shape_if_present(self):
        # Set PIXELCAP_MIDI_JSONL to a real MIDI capture to check the decoder against it.
        session = os.environ.get("PIXELCAP_MIDI_JSONL")
        if not session or not os.path.exists(session):
            self.skipTest("PIXELCAP_MIDI_JSONL not set on this host")
        go = [f for f in msc.firings(msc.read_jsonl(session)) if f["command"] == 1]
        self.assertEqual(len(go), int(os.environ.get("PIXELCAP_EXPECT_GO", "417")))


class FixtureSafetyTests(unittest.TestCase):
    def test_refuses_non_loopback(self):
        for target in ("10.0.0.50", "192.168.1.20", "8.8.8.8"):
            with self.assertRaises(SystemExit):
                fixture.check_target(target, False)
        with self.assertRaises(SystemExit):
            fixture.check_target("8.8.8.8", True)
        fixture.check_target("127.0.0.1", False)


if __name__ == "__main__":
    unittest.main()
