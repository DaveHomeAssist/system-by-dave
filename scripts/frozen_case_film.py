#!/usr/bin/env python3
"""Turn a recorded run of the Frozen case into a captioned film.

    python3 scripts/frozen_case_film.py <run-dir> <out.mp4>

Run the case with --film first, so the session is at operator pace:
    node scripts/probe_frozen_case.mjs <run-dir> --film

The session film is set above a caption band that names each step as it happens and shows its result,
between an opening card and a closing card built from the run's own summary. Needs ffmpeg and Pillow.
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
intro = card('intro.png', 'AV by Dave  ·  recorded test case  ·  pilot', 'Frozen: projection lanes A to D',
    [(RUST, 'The four projection lanes of the Frozen rig, entered into the console through its own controls.'),
     (RUST, 'Every step is journalled and filmed. Monitors watch for page errors, failed requests, unexpected saved data and page scrolling.'),
     (RUST, 'The application\'s planning checks must come out as exactly the unknowns in the reference.')],
    f"Facts come from the public Frozen reference in the repository (wst/projectors.json, updated {summary['referenceUpdated']}, and wst/stage/plot.json). "
    f"They are plan records and operator reports, not the state of the show. Run against {summary['base']} at {summary['commit'][:8]}.")
lines = [(GREEN, f"{sum(step['status'] == 'passed' for step in steps)} of {len(steps)} steps passed.")]
for step in failed: lines.append((RED, f"Failed, step {step['index']}: {step['error']}"))
for step in flagged: lines.append((AMBER, f"Flagged, step {step['index']}: {'; '.join(step['flags'])}"))
for note in summary.get('findings', []): lines.append((AMBER, f"Noted, {note['id']}: {note['text']}"))
checks = next((step for step in steps if step['step'] == 'checks'), None)
if checks and checks['status'] == 'passed': lines.append((GREEN, f"Planning checks matched the reference: {checks['observed']['needAttention']} records need attention, all of them known unknowns."))
outro = card('outro.png', 'Result', 'One step failed' if len(failed) == 1 else f'{len(failed)} steps failed' if failed else 'All steps passed', lines,
    'Automated run in headless Chromium on SwiftShader. No hardware, no physical device, no operator acceptance. The pointer in the film is added by the recorder.')

# Caption band: one line for the step, one for what to expect, and the result as the step ends.
filters = [f"[0:v]scale={VW}:{VH}:flags=lanczos,pad={W}:{H}:{(W - VW) // 2}:0:color=0x0e1114,drawbox=x=0:y={VH}:w={W}:h={H - VH}:color=0x16181b:t=fill"]
def text(name, body, **options):
    (work / name).write_text(body)
    pairs = ':'.join(f'{key}={value}' for key, value in options.items())
    filters.append(f"drawtext=textfile='{work / name}':expansion=none:{pairs}")
colour = {'passed': GREEN, 'failed': RED, 'flagged': AMBER}
for position, step in enumerate(steps):
    start = step['film'][0]; end = steps[position + 1]['film'][0] if position + 1 < len(steps) else step['film'][1] + 1.2
    done = max(start + 0.4, step['film'][1] - 1.0)
    span = f"enable='between(t,{start:.2f},{end:.2f})'"
    text(f"n{position}.txt", f"{step['index']:02d} / {len(steps):02d}", fontfile=SEMI, fontsize=30, fontcolor=RUST.replace('#', '0x'), x=96, y=VH + 22, **{'enable': span[7:]})
    text(f"t{position}.txt", step['title'], fontfile=SEMI, fontsize=36, fontcolor='white', x=250, y=VH + 18, **{'enable': span[7:]})
    note = step.get('error') if step['status'] == 'failed' else ('; '.join(step['flags']) if step['status'] == 'flagged' else step.get('detail', ''))
    before = f"'between(t,{start:.2f},{done:.2f})'"; after = f"'between(t,{done:.2f},{end:.2f})'"
    if step.get('detail'): text(f"d{position}.txt", step['detail'][:150], fontfile=REGULAR, fontsize=24, fontcolor=GREY.replace('#', '0x'), x=250, y=VH + 66, **{'enable': before if step['status'] != 'passed' else span[7:]})
    if step['status'] != 'passed' and note: text(f"e{position}.txt", note[:150], fontfile=SEMI, fontsize=24, fontcolor=colour[step['status']].replace('#', '0x'), x=250, y=VH + 66, **{'enable': after})
    text(f"s{position}.txt", step['status'].upper(), fontfile=BOLD, fontsize=30, fontcolor=colour[step['status']].replace('#', '0x'), x=f'{W - 96}-tw', y=VH + 22, **{'enable': after})
(work / 'filters.txt').write_text(',\n'.join(filters) + '[body]')
body = work / 'body.mp4'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(run / 'film' / 'session.webm'), '-filter_complex_script', str(work / 'filters.txt'), '-map', '[body]', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', str(body)], check=True)
def still(image, seconds, name):
    target = work / name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-t', str(seconds), '-i', str(image), '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', str(target)], check=True); return target
parts = [still(intro, 5, 'intro.mp4'), body, still(outro, 9, 'outro.mp4')]
(work / 'parts.txt').write_text(''.join(f"file '{part}'\n" for part in parts))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(work / 'parts.txt'), '-c', 'copy', '-movflags', '+faststart', '-metadata', 'title=Frozen case pilot: projection lanes A to D in the AV by Dave console', str(out)], check=True)
print(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames', '-of', 'default=noprint_wrappers=1', str(out)], capture_output=True, text=True).stdout)
