# Brief: passive pixel capture for Frozen (Art-Net / sACN)

Status: **proposed**. Built and tested on synthetic data only. Not installed
anywhere, and nothing has listened on a show network. PX-D2 was decided on
2026-11-17. PX-D1 and PX-D3 to PX-D6 stay **Open** until Dave answers them.
The operating steps for the decided path are in [runbook.md](runbook.md).

This public brief leaves out venue addresses, people and private paths. The
private board card `frozen-rehearsal-capture` holds those.

## Problem

The deck and portal pixel strips get their data from Millumin on the playback
Mac. Art-Net goes out through the lighting switch to the pixel decoders.
Nothing records that traffic. The projector monitor covers projectors only, so
a pixel fault is noticed only when someone sees it on stage. Afterwards nobody
can tell whether the data stopped, came from the wrong sender, skipped frames
or never changed on a cue.

MIDI cues already have a passive capture: an observer with no output port that
writes JSONL with a heartbeat, a read-only health inspector, and a viewer that
lines cues up with phone stills. This brief adds the same kind of evidence for
pixel data.

## Outcome

For any show or rehearsal, a timestamped record that answers these questions
for each universe:

- Was data arriving at the capture point, and at what rate?
- Who sent it (source IP, and for sACN the CID, name and priority), and where
  did it go (destination IP, where the capture can see it)?
- Were frames lost or reordered (Art-Net and E1.31 sequence numbers)?
- When did the last frame arrive, and when did the universe go quiet or come
  back?
- Did the levels change, and when? This is answered by a 16-hex level hash and
  nonzero/max counts, never by storing the frames themselves.

A viewer then puts every MIDI GO firing from the MIDI capture beside this data:
for each cue and universe it shows whether the universe was live, whether its
levels changed within N seconds after the cue, and the change counts before
and after the cue (a running chase changes in both).

## Evidence rules (mirrored from the MIDI capture)

- Receipt at the capture point proves that packets arrived there. It does not
  prove the decoder output them or that the pixels lit. A changing hash does not
  prove a visible change.
- A quiet universe is a fact to record. Whether it is a fault depends on the
  cue. Never infer show state from silence.
- An advancing heartbeat (every 30 s) is the proof that the recorder is alive.
  A PID or an open port is not.
- Firings are keyed by session plus firing identity, never by cue number alone.
  Cue strings stay literal (decimals kept), and repeated firings keep their own
  IDs. The viewer reproduces the MIDI capture's firing IDs exactly (it was
  checked against the Nov 15 run: 417 GO firings, and the ID for cue 441
  matches).
- Clocks: MIDI times are shifted by `clockOffset` (MIDI host minus pixel host).
  Transport latency is not measured, so sub-second alignment is approximate.
- Testing uses synthetic packets on loopback or a pcap file only. The recorder
  never transmits.

## The visibility problem

**A third host on the lighting network will not see the pixel data as it is
sent today.** Millumin sends Art-Net **unicast** to the decoders. A switch
delivers unicast only to the destination port. A laptop plugged into the
lighting switch (or Dominic) would see broadcast ArtPoll traffic and nothing
else.

Running on the sending Mac does not fix this by itself either. **A UDP socket
on the sender never receives that machine's own outbound unicast.** Only a
packet capture can see it: BPF via `tcpdump`, which needs root or the BPF
group. The capture is passive, but it is still software running on the show
machine.

So there are only three ways to see the data:

1. **A mirrored port on the lighting switch** (Luminex supports port
   mirroring), copying the playback Mac's port or the decoders' ports to a
   capture port. The recorder runs on a separate laptop and reads it with
   `tcpdump -U -w - | recorder --input pcap --pcap-live`. Nothing changes on
   the show Mac or in the show traffic.
2. **A packet capture on the playback Mac** (`tcpdump` piped into the recorder
   in pcap mode). No network change, but it adds a root-level process to the
   show machine.
3. **Change the show output** to Art-Net broadcast or sACN multicast so that
   any host can listen. This changes show configuration and loads every port
   (or needs IGMP snooping). It is listed for completeness and not recommended.

The recorder's `udp` input only fits traffic that is actually addressed to the
listening host, such as broadcast or a future dedicated copy. **Do not use it
for mirrored unicast.** A mirrored frame is still addressed to the decoder, so
the laptop's stack drops it before any socket sees it, even in promiscuous
mode. Only interface-level capture (tcpdump/BPF) into `--input pcap` sees it.
The `udp` input does not join multicast groups, because that sends IGMP
reports.

## Decisions for Dave (Open)

| ID | Question | Options | Recommendation | Unlocks |
| --- | --- | --- | --- | --- |
| PX-D1 | Which host listens? | **A.** A laptop on a mirrored lighting-switch port (the MacBook that runs the MIDI viewer) · **B.** The playback Mac itself, via packet capture · **C.** Dominic | **A**: it keeps the show machine untouched. Dominic is on the tailnet, not the lighting network, and runs on a degraded battery. | Install plan and acceptance run |
| PX-D2 | How does the listener see unicast? | **A.** Ask the lighting team for a mirror port on the Luminex · **B.** BPF capture on the sending Mac · **C.** Switch Millumin to broadcast or sACN multicast | **Decided 2026-11-17: A** (see below) | Which input mode is used |
| PX-D3 | What is logged per universe? | **A.** 1 s summaries: rate, sources, destinations, sequence gaps and reorders, last-frame time, level hash, nonzero/max level, plus stale/resume/second-sender events · **B.** A, plus full frames whenever the hash changes · **C.** Rate and last frame only | **A** (built). B grows to gigabytes during chases; ask for it only for a specific fault hunt. | Storage and review depth |
| PX-D4 | Thresholds | Summary window 1 s; stale after 2.5 s (the E1.31 data-loss timeout); heartbeat every 30 s | Keep these defaults; tune after one rehearsal | Alert tuning |
| PX-D5 | Where do recordings live? | **A.** Beside the MIDI session in its session folder, then in the existing external archive · **B.** A separate pixel folder | **A**: one session folder per run, so the viewer can find both | Closeout and archive |
| PX-D6 | Where does the code live? | **A.** Keep it here (`apps/pixel-capture` in system-by-dave). Captures never go in this public repo · **B.** Move it into the private `frozen-rehearsal-capture` repo with the MIDI capture | **A** for now. It is generic, public-safe and synthetic-tested. Revisit when the rehearsal-capture archive schema (Phase 2b) imports pixel JSONL. | Ownership and schema work |

### PX-D2 decision (Dave, 2026-11-17)

> Prefer A: an approved Luminex mirror port feeding interface-level packet
> capture on the MacBook, piped into the recorder's pcap input. Do not use the
> ordinary UDP listener for mirrored unicast. Before a venue run, confirm the
> switch model, source and mirror ports, authorization, capture visibility,
> drop counters, and host-level no-transmit arrangements. If mirroring is
> unavailable or not approved, return for approval of B, a bounded M1-local
> packet capture during rehearsal. This decision does not authorize switch
> changes, installation, a venue capture, or pixel output. Capture may
> establish transmitted universes and protocol. C1 still requires comparing
> current show mapping with the decoder's current Out 2 setting.

The checklist, the host-level no-transmit arrangement and the drop handling
are in [runbook.md](runbook.md).

### What a capture can and cannot settle

- **C1 (upstage start universe 224 vs 227).** A capture shows only which
  universes are *transmitted* (`inspect_capture --candidate`). It cannot show
  the decoder's Out 2 setting. C1 still needs the current show mapping compared
  with the decoder's current Out 2.
- **C4 (Art-Net vs sACN).** A capture shows which protocol is present, once
  capture visibility is shown. Until then, an absent protocol is inconclusive.
- **C2 (slice overlaps).** A capture can't settle this; it needs the show's DMX
  inspector.
- **Physical pixel correctness.** A capture shows timing correlation with cues
  only, not that the right pixels lit.

Also needed before any install, and not a choice: the universe numbers, the
decoder identity and the destination addresses from the patch reconciliation.
The recorder discovers universes from traffic and does not need them to run.
`inspect_capture --expect` compares what was seen against the patch, so one
rehearsal capture settles which start universes and which protocol the show
actually sends.

## Smallest useful slice (built in this change)

- `pixelcap.recorder`: listen-only recorder with `udp` and `pcap` inputs. It
  writes JSONL (`start`, `universe_seen`, `window`, `universe_stale`,
  `universe_resumed`, `source_added`, `stream_terminated`, `heartbeat`,
  `complete`) and flushes each row. Duration is configurable (default 4 h), as
  is an absolute `--until`. SIGINT and SIGTERM write a `complete` row with the
  reason.
- `pixelcap.inspect_capture`: a read-only health snapshot (status, heartbeat
  age, per-universe totals, alerts). It opens no sockets.
- `pixelcap.viewer`: a static, self-contained HTML timeline plus a
  cue-by-universe table, and a JSON association export.
- `pixelcap.fixture`: a synthetic generator that refuses non-loopback targets
  by default, with an instant pcap mode.
- Tests: 36 unittest cases, including proof that nothing transmits.

## Exclusions

No venue install. No packets on the lighting network. No change to Millumin,
the show Mac, the relays or the projector monitor. No full-frame storage. No
RDM. No multicast join. No ArtPoll replies. No live dashboard. No integration
into the Projctl Monitor yet.

## Risks

- A BPF capture on the show Mac (PX-D2 B) needs root and must be stopped
  cleanly. Rehearse it first.
- A mirror port can drop frames under load, and the capture host can drop
  them in the kernel. Sequence gaps are then ambiguous. The inspector reads
  tcpdump's drop counters (`--capture-log`) and the recorder counts
  snaplen-truncated frames. Treat a gap as show loss only when those counters
  are zero.
- The recorder never transmitting does not make the host silent. The capture
  adapter must have IPv4 and IPv6 off, and its silence must be proven before a
  run (runbook).
- Real captures and private metadata stay out of this public repository and
  Pages. The recorder refuses `--out` inside a git working tree, and
  `.gitignore` excludes capture files.
- Destination addresses are visible only in pcap mode.
- Hash churn during effects is expected. Read "changed" together with the
  before/after counts.
- macOS system Python is 3.9 at minimum. The code avoids newer syntax.

## Acceptance

1. Synthetic: `python3 -m unittest tests/test_pixelcap.py` passes on a runner,
   and `demo/run-demo.sh` produces a receipt with the expected gap, quiet
   period, second sender, terminate event and cue alignment. Done; see the PR.
2. Approved rehearsal (after PX-D1 and PX-D2): the recorder runs for the whole
   rehearsal, heartbeats advance, every patched universe appears with the
   expected sender and destination, and the viewer lines up with the MIDI
   capture for the same session. A human compares at least three cues against
   stage photos.
3. Show use only after the rehearsal acceptance is recorded.
