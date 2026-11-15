#!/usr/bin/env python3
"""Turn a recorded run of the Frozen case into a captioned film.

    python3 scripts/frozen_case_film.py <run-dir> <out.mp4>

Run the case with --film first, so the session is at operator pace:
    node scripts/probe_frozen_case.mjs <run-dir> --film

The session film is set above a caption band that names each step as it happens and shows its result,
between an opening card and a closing card built from the run's own summary. Needs Pillow and any ffmpeg
with libx264: Pillow draws the captions, so ffmpeg needs no text filter.
Inter is used when installed; otherwise the first of the usual system sans fonts found."""
import json, subprocess, sys, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

run, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
summary = json.loads((run / 'summary.json').read_text())
steps = summary['steps']
work = run / 'film' / 'work'; work.mkdir(parents=True, exist_ok=True)
def face(*candidates):
    for candidate in candidates:
        if Path(candidate).is_file(): return candidate
    sys.exit('No usable font found. Install Inter or DejaVu Sans, or add a path to the lists in this script.')
BOLD = face('/usr/share/fonts/opentype/inter/Inter-Bold.otf', '/Library/Fonts/Inter-Bold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf')
SEMI = face('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', '/Library/Fonts/Inter-SemiBold.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf')
REGULAR = face('/usr/share/fonts/opentype/inter/Inter-Regular.otf', '/Library/Fonts/Inter-Regular.otf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf')
INK, PAPER, RUST, GREY, GREEN, RED, AMBER = '#16181b', '#f3efe8', '#d8672e', '#a9afb7', '#57c084', '#ff6b5e', '#f0b24a'
W, H, VW, VH = 1920, 1080, 1728, 972
font = lambda path, size: ImageFont.truetype(path, size)

def card(name, kicker, title, lines, foot):
    image = Image.new('RGB', (W, H), INK); pen = ImageDraw.Draw(image); y = 150
    pen.text((150, y), kicker.upper(), font=font(BOLD, 30), fill='#e8a06c'); y += 78
    for line in textwrap.wrap(title, 34): pen.text((150, y), line, font=font(BOLD, 84), fill='#ffffff'); y += 100
    y += 26
    for colour, text in lines:
        wrapped = textwrap.wrap(text, 92)
        pen.ellipse((154, y + 16, 172, y + 34), fill=colour)
        for line in wrapped: pen.text((200, y), line, font=font(REGULAR, 36), fill=PAPER); y += 50
        y += 16
    y = max(y + 10, 930)
    for line in textwrap.wrap(foot, 120): pen.text((150, y), line, font=font(REGULAR, 26), fill=GREY); y += 38
    image.save(work / name); return work / name

failed = [step for step in steps if step['status'] == 'failed']
flagged = [step for step in steps if step['status'] == 'flagged']
stages = summary.get('stages') or [{'n': 1, 'title': 'Projection lanes in AV Video'}]
intro = card('intro.png', 'AV by Dave  ·  recorded test case', 'Frozen case',
    [(RUST, f"Stage {stage['n']}: {stage['title']}.") for stage in stages] +
    [(RUST, 'The Frozen rig is entered through the application\'s own controls. Every step is journalled and filmed.'),
     (RUST, 'Monitors watch for page errors, failed requests, unexpected saved data and page scrolling.')],
    f"Facts come from the public Frozen reference in the repository (wst/projectors.json, updated {summary['referenceUpdated']}, and wst/stage/plot.json). "
    f"They are plan records and operator reports, not the state of the show. Run against {summary['base']} at {(summary.get('deployed') or {}).get('commit') or summary['commit']:.8}.")

def closing():
    """The result card: totals, every failure, then as many findings as fit."""
    image = Image.new('RGB', (W, H), INK); pen = ImageDraw.Draw(image); y = 110
    pen.text((150, y), 'RESULT', font=font(BOLD, 30), fill='#e8a06c'); y += 66
    title = 'One step failed' if len(failed) == 1 else f'{len(failed)} steps failed' if failed else 'All steps passed'
    pen.text((150, y), title, font=font(BOLD, 76), fill='#ffffff'); y += 112
    rows = [(GREEN, f"{sum(step['status'] == 'passed' for step in steps)} of {len(steps)} steps passed.")]
    rows += [(RED, f"Failed, step {step['index']}: {step['error']}") for step in failed]
    rows += [(AMBER, f"Flagged, step {step['index']}: {'; '.join(step['flags'])}") for step in flagged]
    notes = summary.get('findings', []); rows += [(AMBER, f"{note['id']}: {note['text']}") for note in notes]
    shown = 0
    for colour, body in rows:
        lines = textwrap.wrap(body, 118)
        if len(lines) > 3: lines = lines[:3]; lines[-1] = lines[-1][:114].rstrip() + ' …'
        if y + len(lines) * 36 > 950: break
        pen.ellipse((154, y + 12, 168, y + 26), fill=colour)
        for line in lines: pen.text((196, y), line, font=font(REGULAR, 27), fill=PAPER); y += 36
        y += 12; shown += 1
    if shown < len(rows): pen.text((196, y), f'and {len(rows) - shown} more in the journal', font=font(REGULAR, 27), fill=GREY)
    pen.text((150, 990), 'Automated run in headless Chromium on SwiftShader. No hardware, no physical device, no operator acceptance. The pointer in the film is added by the recorder.', font=font(REGULAR, 23), fill=GREY)
    image.save(work / 'outro.png'); return work / 'outro.png'
outro = closing()

# Caption band: one line for the step, one for what to expect, and the result as the step ends.
# Pillow draws each band and the bands run under the film as a timed image sequence, so ffmpeg needs no text
# filter (many builds, Homebrew's among them, lack drawtext) and no filter script file (ffmpeg 8 dropped
# -filter_complex_script). Text is placed by its top edge, as drawtext placed it.
colour = {'passed': GREEN, 'failed': RED, 'flagged': AMBER}
def band(name, step=None, line='', tint=GREY, status=None):
    image = Image.new('RGB', (W, H - VH), '#16181b'); pen = ImageDraw.Draw(image)
    if step:
        pen.text((96, 68), f"STAGE {step.get('stage', 1)}", font=font(SEMI, 20), fill=GREY, anchor='la')
        pen.text((96, 22), f"{step['index']:02d} / {len(steps):02d}", font=font(SEMI, 30), fill=RUST, anchor='la')
        pen.text((250, 18), step['title'], font=font(SEMI, 36), fill='white', anchor='la')
        if line: pen.text((250, 66), line[:150], font=font(REGULAR if tint == GREY else SEMI, 24), fill=tint, anchor='la')
        if status: pen.text((W - 96, 22), status.upper(), font=font(BOLD, 30), fill=colour[status], anchor='ra')
    image.save(work / name); return work / name
quote = lambda path: "'" + str(path).replace("'", "'\\''") + "'"
blank, segments, cursor = band('band-blank.png'), [], 0.0
for position, step in enumerate(steps):
    start = step['film'][0]; end = steps[position + 1]['film'][0] if position + 1 < len(steps) else step['film'][1] + 1.2
    done = min(end, max(start + 0.4, step['film'][1] - 1.0))
    if start > cursor: segments.append((blank, start - cursor))
    detail = step.get('detail', '')
    note = step.get('error') if step['status'] == 'failed' else ('; '.join(step['flags']) if step['status'] == 'flagged' else detail)
    segments.append((band(f'band-{position:02d}-step.png', step, detail), done - start))
    segments.append((band(f'band-{position:02d}-result.png', step, note, GREY if step['status'] == 'passed' else colour[step['status']], step['status']), end - done))
    cursor = max(cursor, end)
segments.append((blank, 3600))  # outlasts any film; shortest=1 ends the body with the film
# The concat demuxer honours an image's duration only when another entry follows it.
(work / 'bands.txt').write_text(''.join(f"file {quote(image)}\nduration {seconds:.3f}\n" for image, seconds in segments if seconds > 0) + f"file {quote(blank)}\n")
graph = f"[0:v]scale={VW}:{VH}:flags=lanczos,pad={W}:{H}:{(W - VW) // 2}:0:color=0x0e1114[film];[film][1:v]overlay=0:{VH}:shortest=1[body]"
body = work / 'body.mp4'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(run / 'film' / 'session.webm'), '-f', 'concat', '-safe', '0', '-i', str(work / 'bands.txt'), '-filter_complex', graph, '-map', '[body]', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', str(body)], check=True)
def still(image, seconds, name):
    target = work / name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-t', str(seconds), '-i', str(image), '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', str(target)], check=True); return target
parts = [still(intro, 5, 'intro.mp4'), body, still(outro, 12, 'outro.mp4')]
(work / 'parts.txt').write_text(''.join(f"file '{part}'\n" for part in parts))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(work / 'parts.txt'), '-c', 'copy', '-movflags', '+faststart', '-metadata', 'title=Frozen case pilot: projection lanes A to D in the AV by Dave console', str(out)], check=True)
print(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames', '-of', 'default=noprint_wrappers=1', str(out)], capture_output=True, text=True).stdout)
