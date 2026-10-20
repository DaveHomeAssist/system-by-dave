#!/usr/bin/env bash
# Lay a music track under the frame-sync Reel cuts (docs/launch/README.md).
# Local only, not CI. Never writes inside the repository; videos aren't committed.
#
#   scripts/launch/mix_reel_music.sh --reel /workspace/launch/reel [--track song.wav] [--lufs -14]
#
# Without --track it first synthesizes a clearly named PLACEHOLDER bed with
# ffmpeg (sine-tone chords plus a soft pulse, no samples, nothing downloaded)
# so the pipeline can be checked. Dave picks the real track, or posts the silent
# master and adds a song from Instagram's in-app music library.
#
# For each cut (main, short15) it trims the track to the video length, fades in
# and out, normalizes to the target integrated loudness with a two-pass EBU R128
# loudnorm (true peak -1.5 dBTP), muxes with the untouched video stream, then
# re-measures the result and fails if it's off target by more than 1 LU.
set -euo pipefail

REEL=""
TRACK=""
LUFS="-14"
TP="-1.5"
FADE_IN="0.4"
FADE_OUT="2.0"
while [ $# -gt 0 ]; do
  case "$1" in
    --reel) REEL="$2"; shift 2 ;;
    --track) TRACK="$2"; shift 2 ;;
    --lufs) LUFS="$2"; shift 2 ;;
    --fade-out) FADE_OUT="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$REEL" ] || { echo "--reel <dir with frame-sync-*.mp4> is required" >&2; exit 2; }
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
REEL="$(cd "$REEL" && pwd)"
case "$REEL/" in "$REPO"/*) echo "refusing to write inside the repository ($REEL)" >&2; exit 2 ;; esac
OUT="$REEL/music"
mkdir -p "$OUT"
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || { echo "ffmpeg/ffprobe needed" >&2; exit 2; }

dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

if [ -z "$TRACK" ]; then
  TRACK="$OUT/PLACEHOLDER-synth-bed-NOT-FINAL-music.wav"
  # 92 BPM, four chords x 2 bars, ~42 s. Pure tones: safe to use, but it's a
  # test bed, not the music to post.
  C='mod(t,20.87)'
  note() { echo "if(lt($C,5.22),$1,if(lt($C,10.43),$2,if(lt($C,15.65),$3,$4)))"; }
  EXPR="(0.16*sin(2*PI*$(note 110 87.31 130.81 98)*t)+0.09*sin(2*PI*$(note 220 174.61 261.63 196)*t)+0.07*sin(2*PI*$(note 329.63 261.63 329.63 293.66)*t)+0.05*sin(2*PI*$(note 440 349.23 392 392)*t))*(0.75+0.25*sin(2*PI*0.25*t))+0.22*sin(2*PI*55*t)*exp(-14*mod(t,0.6522))"
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "aevalsrc=exprs='$EXPR':s=48000:d=42" \
    -af "aformat=channel_layouts=stereo,highpass=f=35,lowpass=f=9000,aecho=0.8:0.6:120:0.25" -c:a pcm_s16le "$TRACK"
  echo "placeholder bed: $TRACK"
fi
[ -f "$TRACK" ] || { echo "track not found: $TRACK" >&2; exit 2; }
TRACK_DUR="$(dur "$TRACK")"

for cut in main:frame-sync-main-1080x1920.mp4 short15:frame-sync-15s-1080x1920.mp4; do
  id="${cut%%:*}"; file="${cut#*:}"
  src="$REEL/$file"
  [ -f "$src" ] || { echo "missing $src (render the reel first; see docs/launch/README.md)" >&2; exit 2; }
  D="$(dur "$src")"
  awk -v a="$TRACK_DUR" -v b="$D" 'BEGIN{exit !(a+0 >= b+0)}' || echo "note: track ($TRACK_DUR s) is shorter than $file ($D s); it will end early" >&2
  FO_START="$(awk -v d="$D" -v f="$FADE_OUT" 'BEGIN{printf "%.3f", d-f}')"
  PRE="atrim=0:$D,asetpts=N/SR/TB,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:st=0:d=$FADE_IN,afade=t=out:st=$FO_START:d=$FADE_OUT"
  # Pass 1: measure.
  stats="$(ffmpeg -hide_banner -nostats -i "$TRACK" -af "$PRE,loudnorm=I=$LUFS:TP=$TP:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
  get() { printf '%s' "$stats" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
  MI="$(get input_i)"; MTP="$(get input_tp)"; MLRA="$(get input_lra)"; MTH="$(get input_thresh)"; OFF="$(get target_offset)"
  # Pass 2: apply (linear when possible) and mux with the original video stream.
  dst="$OUT/frame-sync-$id-1080x1920-MUSIC-PLACEHOLDER.mp4"
  case "$TRACK" in *PLACEHOLDER*) ;; *) dst="$OUT/frame-sync-$id-1080x1920-music.mp4" ;; esac
  ffmpeg -hide_banner -loglevel error -y -i "$src" -i "$TRACK" -filter_complex \
    "[1:a]$PRE,loudnorm=I=$LUFS:TP=$TP:LRA=11:measured_I=$MI:measured_TP=$MTP:measured_LRA=$MLRA:measured_thresh=$MTH:offset=$OFF:linear=true,aresample=48000[a]" \
    -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -t "$D" -movflags +faststart "$dst"
  # Verify.
  got="$(ffmpeg -hide_banner -nostats -i "$dst" -map 0:a -af ebur128=peak=true -f null - 2>&1 | awk '/Integrated loudness:/{f=1} f&&/I:/{print $2; exit}')"
  peak="$(ffmpeg -hide_banner -nostats -i "$dst" -map 0:a -af ebur128=peak=true -f null - 2>&1 | awk '/True peak:/{f=1} f&&/Peak:/{print $2; exit}')"
  vd="$(dur "$dst")"
  awk -v g="$got" -v t="$LUFS" 'BEGIN{d=g-t; if (d<0) d=-d; exit !(d<=1.0)}' || { echo "$id: loudness $got LUFS is off target $LUFS" >&2; exit 1; }
  echo "$id: $dst  duration ${vd}s  integrated ${got} LUFS (target $LUFS)  true peak ${peak} dBTP  fades in ${FADE_IN}s / out ${FADE_OUT}s"
done
