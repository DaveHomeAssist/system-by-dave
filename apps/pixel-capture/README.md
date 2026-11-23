# Pixel capture (listen-only Art-Net / sACN)

A passive evidence recorder for Frozen's pixel data. It is modelled on the
MIDI cue capture: JSONL with a heartbeat, a read-only inspector, and a viewer
that lines pixel activity up against MIDI cue firings.

> **Status: proposed, synthetic-tested only.** See [docs/brief.md](docs/brief.md)
> for the problem, the decisions (PX-D2 decided 2026-11-17; the others open) and
> why a third host cannot see unicast Art-Net without a mirror port or a packet
> capture. [docs/runbook.md](docs/runbook.md) has the pre-run checklist, the
> host-level no-transmit setup and drop handling.

It uses the Python 3.9+ standard library only. It has no dependencies and
installs nothing.

## Never transmits

The recorder and inspector never send: no ArtPoll, no replies, no `connect`,
no multicast join (which would send IGMP) and no `SO_REUSEPORT` (which could
take datagrams meant for a show application). Tests enforce this statically
and at runtime. Only `pixelcap/fixture.py` sends, and only to loopback unless
`--allow-lab-target` is given. Never point it at a show network.

The recorder never sending does not make the **host** silent. See the runbook
for the capture-adapter setup and the silence check. Real captures stay out of
this public repository: `--out` inside a git working tree is refused, and
`.gitignore` excludes capture files.

## Commands

Run these from this directory.

```bash
# Mirror-port capture (PX-D2 A; follow docs/runbook.md first). Interface-level capture into the pcap input:
sudo tcpdump -i <capture-if> -p -n -U -s 0 -w - 'udp port 6454 or udp port 5568' 2> SESSION/tcpdump.log \
  | python3 -m pixelcap.recorder --input pcap --pcap - --pcap-live --out SESSION/pixels.jsonl --session SESSION_ID

# Replay a saved capture:
python3 -m pixelcap.recorder --input pcap --pcap capture.pcap --out pixels.jsonl

# UDP input: only traffic addressed to this host. Never for mirrored unicast. Default bind is loopback:
python3 -m pixelcap.recorder --out pixels.jsonl --bind 127.0.0.1

# Health (read-only); --expect lists the patched universes, so missing or unexpected ones are flagged:
python3 -m pixelcap.inspect_capture pixels.jsonl --expect artnet:0-3,sacn:1
# Activity per candidate range, plus capture drop counters from the tcpdump log:
python3 -m pixelcap.inspect_capture pixels.jsonl --capture-log tcpdump.log --candidate low=artnet:0-1 --candidate high=artnet:2-3

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
