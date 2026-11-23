# Runbook: mirrored-port pixel capture (PX-D2 option A)

Status: **decided path, not yet authorized to run.** PX-D2 (Dave, 2026-11-17)
picks an approved Luminex mirror port that feeds interface-level packet capture
on the MacBook, piped into the recorder's pcap input. That decision does **not**
authorize switch changes, installation, a venue capture or pixel output. Each of
those needs its own approval. If mirroring is unavailable or not approved,
return for approval of option B, a bounded packet capture on the M1 during a
rehearsal. Do not fall back to it on your own.

Real addresses, port numbers and capture files stay private. They never go in
this public repository or its Pages site. The recorder refuses to write inside a
git working tree, and `.gitignore` excludes capture files.

## Why packet capture and not the UDP listener

Millumin sends Art-Net **unicast** to the decoders. A mirror port copies those
frames out to the capture laptop, but they are still addressed to the
decoder's MAC and IP. The laptop's network stack discards them before any
socket sees them. A UDP socket bound to 6454 or 5568 will not receive them,
even with the interface in promiscuous mode, because promiscuous mode only
widens what the capture layer (BPF) can see. It does not deliver another
host's datagrams to local sockets. On an ordinary, unmirrored switch port, the
switch never forwards the unicast at all.

So, for mirrored traffic, always use:

```bash
sudo tcpdump -i <capture-if> -p -n -U -s 0 -w - 'udp port 6454 or udp port 5568' 2> SESSION/tcpdump.log \
  | python3 -m pixelcap.recorder --input pcap --pcap - --pcap-live --out SESSION/pixels.jsonl --session SESSION_ID
```

- `-s 0` captures whole frames. Frames cut short by a snaplen are counted as
  `snaplen-truncated` capture loss.
- `-U -w -` streams packets to the recorder as they arrive.
- `2> SESSION/tcpdump.log` keeps tcpdump's exit summary, which holds the drop
  counters (see below).
- `-p` (no promiscuous flag) is fine on a dedicated mirror port: the switch
  already sends the copied frames. Remove it only if the capture shows nothing
  and the checklist confirms the mirror is live.

## Pre-run checklist (from the PX-D2 decision)

Record each answer in the private session notes before any venue run.

1. **Switch model and firmware.** Confirm which Luminex unit and how it is
   managed. Read only; make no change yourself.
2. **Source and mirror ports.** Which port carries the playback Mac (or the
   decoders), which port is the mirror destination, and the direction
   (ingress, egress or both). Mirroring the playback Mac's port, both
   directions, is the narrowest choice.
3. **Authorization.** The lighting team or switch owner approves the mirror
   session and makes the change. Note who approved it and when.
4. **Capture visibility.** Before trusting an absence, show that the capture
   sees the expected sender at all, for example ArtDmx from the playback Mac's
   address in the first minute. Until that is shown, "protocol not seen" and
   "universe not seen" are inconclusive.
5. **Drop counters.** Keep the tcpdump log. Check the switch's mirror and
   egress drop counters if the switch exposes them. Note the link speed of the
   mirror port and the source.
6. **Host-level no-transmit arrangement** (below), checked on the actual
   laptop and adapter.

## Host-level no-transmit arrangement

The recorder never sends, but that proves nothing about the laptop. macOS can
send DHCP, IPv6 router solicitations, mDNS/Bonjour, NetBIOS and other
announcements on any interface that has an address. The capture interface must
be configured so the **host** stays silent:

- Use a **dedicated USB or Thunderbolt Ethernet adapter** for the mirror port.
  Never use the laptop's normal network connection.
- In Network settings for that adapter: **Configure IPv4: Off** and **Configure
  IPv6: Off** (no DHCP, no self-assigned address, no link-local announcements).
  Leave DNS and proxies empty. Put the adapter last in the service order.
- Don't let any service bind to it: no Internet Sharing, no Bridge, no
  Thunderbolt Bridge on that adapter, and no VPN or Tailscale route to it.
- Run only the capture on it: `tcpdump` (read-only BPF) piped into the
  recorder. Don't run the fixture generator on this machine during a run.
- **Prove silence before the run.** Read the adapter's MAC (`ifconfig
  <capture-if> ether`), connect it to the mirror port, and capture its own
  outbound frames for at least two minutes:

  ```bash
  sudo tcpdump -i <capture-if> -n -c 1 'ether src <adapter-mac>'
  ```

  Expected result: no packet before you stop it. Any frame from the adapter's
  MAC means the host is not silent, so stop and fix the configuration. Keep
  the output with the session notes.
- Many switches drop frames that arrive on a mirror destination port. Treat
  that as a backstop and don't rely on it; the adapter configuration above is
  the control.

## Drops make sequence gaps ambiguous

A mirror port can be oversubscribed: the mirrored traffic can exceed the
destination's link speed, and bursts can overflow its buffer. The capture
laptop can also drop frames in the kernel. Either way, Art-Net or sACN
sequence gaps in the JSONL then look like show loss when they may be capture
loss.

- Pass the tcpdump log to the inspector:
  `python3 -m pixelcap.inspect_capture SESSION/pixels.jsonl --capture-log SESSION/tcpdump.log`.
  The inspector reports `dropped by kernel` and `dropped by interface`. When a
  count is nonzero, it says gaps are ambiguous. When the log is missing, it
  says drop counters are unknown.
- The recorder counts snaplen-truncated frames in its heartbeat `skipped`
  counters.
- Count a gap as show-side only when the capture and switch drop counters are
  zero for that period.

## What a capture can and cannot settle

| Question | A capture can show | It cannot show |
| --- | --- | --- |
| C1, upstage start universe (224 vs 227) | Which universes the show transmits (`--candidate upstage-A=artnet:224-226 --candidate upstage-B=artnet:227-229`) | What the decoder's Out 2 listens to. C1 still needs the current show mapping compared with the decoder's Out 2 setting |
| C4, Art-Net vs sACN | Which protocol is present on the wire, once visibility is shown | Anything, if visibility hasn't been shown |
| C2, slice overlaps in the show | Nothing. Universes carry overlapping slices identically | Overlaps; use the show's own DMX inspector |
| Physical pixel correctness | Timing: whether data and level changes line up with cues | Whether the right pixels lit in the right colours; that needs eyes or photos |

Example review command (private session, ranges from the patch sheet):

```bash
python3 -m pixelcap.inspect_capture SESSION/pixels.jsonl --capture-log SESSION/tcpdump.log \
  --candidate downstage=artnet:221-223 --candidate upstage-A=artnet:224-226 --candidate upstage-B=artnet:227-229
```

The inspector reports observed, partly observed or not observed for each
range. A mismatch with `--expect` or a candidate is an observation about this
capture. It is not proof of a bad patch.
