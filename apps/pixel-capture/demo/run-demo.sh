#!/usr/bin/env bash
# Synthetic demo: loopback only. Never point this at a show network.
# Usage: demo/run-demo.sh OUTPUT_DIR
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:?output directory}"
mkdir -p "$OUT"
export PYTHONPATH="$PWD"

# 1. Live loopback: recorder on 127.0.0.1:6454/5568, fixture sends the 18 s scenario.
python3 -m pixelcap.recorder --out "$OUT/live-pixels.jsonl" --bind 127.0.0.1 --duration 60 \
  --heartbeat 5 --session demo-live &
REC=$!
sleep 0.5
python3 -m pixelcap.fixture live --target 127.0.0.1 --midi-out "$OUT/live-midi.jsonl" > "$OUT/live-fixture.json"
sleep 3
python3 -m pixelcap.inspect_capture "$OUT/live-pixels.jsonl" > "$OUT/live-inspect-during.json"
kill -INT "$REC"
wait "$REC"
python3 -m pixelcap.inspect_capture "$OUT/live-pixels.jsonl" > "$OUT/live-inspect-final.json"
python3 -m pixelcap.viewer --pixels "$OUT/live-pixels.jsonl" --midi "$OUT/live-midi.jsonl" \
  --title "Pixel capture demo (synthetic, loopback)" --out "$OUT/live-viewer.html" --json "$OUT/live-cues.json"

# 2. Packet-capture replay: the same scenario as a pcap file (no network at all).
python3 -m pixelcap.fixture pcap --pcap-out "$OUT/replay.pcap" --midi-out "$OUT/replay-midi.jsonl" > "$OUT/replay-fixture.json"
python3 -m pixelcap.recorder --input pcap --pcap "$OUT/replay.pcap" --out "$OUT/replay-pixels.jsonl" --heartbeat 5 \
  --session demo-replay
python3 -m pixelcap.inspect_capture "$OUT/replay-pixels.jsonl" > "$OUT/replay-inspect.json"
python3 -m pixelcap.viewer --pixels "$OUT/replay-pixels.jsonl" --midi "$OUT/replay-midi.jsonl" \
  --title "Pixel capture demo (synthetic pcap replay)" --out "$OUT/replay-viewer.html" --json "$OUT/replay-cues.json"
echo "demo written to $OUT"
