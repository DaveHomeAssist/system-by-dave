# Pixel capture (listen-only Art-Net / sACN)

A passive evidence recorder for Frozen's pixel data. It is modelled on the
MIDI cue capture: JSONL with a heartbeat, a read-only inspector, and a viewer
that lines pixel activity up against MIDI cue firings.

> **Status: proposed, synthetic-tested only.** See [docs/brief.md](docs/brief.md)
> for the problem, the open decisions (PX-D1 to PX-D6) and why a third host
> cannot see unicast Art-Net without a mirror port or a packet capture.

It uses the Python 3.9+ standard library only. It has no dependencies and
installs nothing.

## Never transmits

The recorder and inspector never send: no ArtPoll, no replies, no `connect`,
no multicast join (which would send IGMP) and no `SO_REUSEPORT` (which could
take datagrams meant for a show application). Tests enforce this statically
and at runtime. Only `pixelcap/fixture.py` sends, and only to loopback unless
`--allow-lab-target` is given. Never point it at a show network.

## Commands

Run these from this directory.

```bash
# Packet capture input (mirror port or the sending Mac), live:
sudo tcpdump -i en0 -U -w - 'udp port 6454 or udp port 5568' \
  | python3 -m pixelcap.recorder --input pcap --pcap - --pcap-live --out SESSION/pixels.jsonl --session SESSION_ID

# Replay a saved capture:
python3 -m pixelcap.recorder --input pcap --pcap capture.pcap --out pixels.jsonl

# UDP input (only sees traffic addressed to this host; default bind is loopback):
python3 -m pixelcap.recorder --out pixels.jsonl --bind 127.0.0.1

# Health (read-only); --expect lists the patched universes, so missing or unexpected ones are flagged:
python3 -m pixelcap.inspect_capture pixels.jsonl --expect artnet:0-3,sacn:1

# Viewer against a MIDI capture session (reads midi.jsonl and session.json clockOffset):
python3 -m pixelcap.viewer --pixels pixels.jsonl --midi-session SESSION_DIR --out pixels-viewer.html --json cues.json

# Tests and synthetic demo:
python3 -m unittest tests/test_pixelcap.py
demo/run-demo.sh /tmp/pxdemo
```

`--midi-session` assumes the pixel recorder ran on the same Mac as the MIDI
reader, because `clockOffset` there is Studio minus that Mac. Otherwise pass
`--midi-clock-offset` (MIDI host minus pixel host).

## JSONL rows

| type | when | key fields |
| --- | --- | --- |
| `start` | once | `schema`, `noTransmit: true`, input, ports, window, staleAfter, plannedEnd, host |
| `universe_seen` | first packet per universe | protocol, universe, source, destination |
| `window` | each 1 s with traffic, per universe | packets, rateHz, sources, destinations, seqGapEvents, seqMissing, outOfOrder, duplicates, lastFrameUnix, levelHash, hashChanges, first/lastChangeUnix, length, nonZero, maxLevel |
| `universe_stale` / `universe_resumed` | 2.5 s without a frame, or frames returning | lastFrameUnix, quietSeconds |
| `source_added` | a second sender for a universe | source (IP; sACN CID, name, priority) |
| `stream_terminated` | sACN terminate bit set | source |
| `heartbeat` | every 30 s | universes, active and stale lists, counters, opcode counts, skipped |
| `complete` | at exit | interrupted, reason, per-universe totals |

Sources are labelled by IP. sACN sources are labelled IP#CID-prefix, so two
senders on one host stay distinct. Full frames are never written.

## Demo receipt

`demo/receipt/` holds the synthetic output: a live loopback run plus a pcap
replay, with JSONL, inspector snapshots, cue associations and viewers. It was
produced by `demo/run-demo.sh` on a Linux runner.
