# AV by Dave — concept demos

Public at <https://avbydave.com/demos/> (published from here; systembydave.com/demos/ redirects there). This folder is the source of truth for the demos
and their pipeline (it moved here from the Codex project folder on 2026-10-20).

Site integration: each demo carries the public shell (skip link, `.sbd-site-return` breadcrumb,
shared nav CSS/JS), a canonical URL and a sitemap entry (`scripts/gen_sitemap.py`). GSAP is the
vendored `js/vendor/gsap.min.js`, never a CDN. `demo-shell.js` lays the stage out between the
breadcrumb bar and the completion panel, loads Umami when `config.js` has a website ID, sends
`demo_view` / `demo_start` / `demo_step_4` / `demo_complete` / `play_start` / `email_submit` /
`checklist_interest` / `next_demo_click`, and shows the post-completion email ask after the last
step. In `?drive` or `?auto` (checks and capture) the shell is hidden and the stage is laid out
exactly as before, so rendered frames are unaffected.

One HTML file per fact. Each demo is a slowed-down working model of the mechanism, told as a
short guided story: one plain sentence per step, and the animation proves the sentence before
the next one appears. GSAP drives the motion; the simulation is plain JS.

Current demos

| File | Fact | Steps |
| --- | --- | --- |
| `frame-sync.html` | A frame synchronizer's delay is not "one frame"; it depends on arrival phase and processing mode | 7, then free play |
| `fault-finding.html` | A cable swap also re-plugs the port, so one swap can't tell a bad cable from a loose port; AJA says two cables, two ports | 7, then free play (random fault, suspects list) |

## Page modes (query string)

| Query | What it does |
| --- | --- |
| *(none)* | Interactive. Real-time clock, NEXT button, free-play controls after the last step. |
| `?drive` | Manual clock. Nothing moves until `window.hr.advance(ms)` is called. Used by the checker and the capture. `hr.time()` returns simulated seconds. |
| `?auto=full` | Auto-plays all 7 steps on a timer, controls hidden. About 36 s. |
| `?auto=main` | The main reel cut, about 35 s. Opens on the failure already happening (tear on frame zero, dead screen pulsing) with the question setting in over the motion at 0.5 s, then explains. Ends with the CTA laid over the final picture. |
| `?auto=teaser` | Failure → fix → CTA. 13 to 15 s, built to loop. |
| `?drive&auto=main` | Auto cut on the manual clock. `hr.cutLength` gives the cut length in ms and `hr.done` turns true at the end. |

Auto cuts are scheduled on GSAP's own clock (`gsap.delayedCall`), so under `?drive` they are
frame-exact and identical on every render.

Cuts are lists of `[step index, ms, override?]`, so a cut may reorder or skip steps and give its opening
step different text (the question over the failure, with `textAfter` ms before it sets in). `cta: ms`
lays the call to action over the final picture for the last `ms`, replacing the subtitle under the hook;
`hold: ms` lets the final picture sit. A page sets `hr.coverAt` (ms) to choose the cover frame; without
it the capture uses the first tear plus 8 frames if the page has a `#tear`, else 1.5 s.

Grounding for these choices: the Stage One research of 2026-10-17 (Socialinsider 2026 datasets: 30 to 60 s
best reach, 45 to 60 s peak engagement; Meta: 75% of recommendations original by Q4 2025; open on the
visible failure; CTA over the final state rather than an outro).

Steps schedule their own actions through `later()`, which is cancelled when the viewer moves on, so a
fast tap can never leave a stale action firing into the next step.

## Every-state check: `check-states.js`

Inject into a running page and call `runStateCheck()`. It drives every story step, presses every
control in `#play` one at a time, sets every slider to min, mid and max, then soaks with random
presses, sampling the layout continuously. Under `?drive` it advances the page's clock itself and runs
hundreds of simulated seconds in about a second of real time.

Reports: text-on-text overlaps (glyph-accurate, not container boxes), text outside the
1080×1920 stage, text leaking past the big screen's box, page errors, steps that did not advance
when NEXT was pressed (`stuck`), and whether the run
stalled (a hidden tab stops the real-time clock; the checker flags that instead of passing
an empty run).

```js
// the pages set a Content Security Policy without 'unsafe-eval', so load the checker as a script, not via new Function
await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'check-states.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
await runStateCheck({ every: 50, perState: 4000, soak: 180000 });   // full sweep
await runStateCheck({ every: 50, observe: window.hr.cutLength });   // watch an auto cut only
```

A demo is not done until the full sweep returns zero overlaps, zero outside, zero screen
leaks and zero errors, and the stall flag is false.

## Capture: `capture.mjs`

Renders an auto cut to MP4 by stepping the manual clock one frame at a time and screenshotting
the stage, then encoding with ffmpeg. Also writes the cover frame (first frame where the tear is
visible) and a JSON receipt.

```sh
node capture.mjs --page frame-sync.html --cut main --fps 30 --out out
```

Output: `out/frame-sync-main.mp4` (1080×1920, 30 fps, H.264 high, 10 Mb/s, silent AAC track,
faststart), `out/frame-sync-main-cover.png`, `out/frame-sync-main.json`, and the frames folder.

### Where it runs

On Dominic, in the `house-reference-capture:pw1.63` image (the Playwright v1.63 noble image
plus system ffmpeg with libx264 and the `playwright` package installed globally). Built from
`~/house-reference/image/Dockerfile` on Dominic.

```sh
rsync -az --delete --exclude out demos/ dominic:~/house-reference/demos/ && rsync -az js/vendor/gsap.min.js dominic:~/house-reference/js/vendor/
ssh dominic 'cd ~/house-reference && docker run --rm -v "$PWD:/work" -w /work/demos \
  house-reference-capture:pw1.63 bash -lc "node capture.mjs --page frame-sync.html --cut main --out out"'
rsync -az dominic:~/house-reference/demos/out/ demos/out/
```

Rendering runs at roughly five frames per second on Dominic, so the main cut takes about three
minutes. Output files are owned by root because the container writes them.

Fonts (Google Fonts) and GSAP (cdnjs) load from the network inside the container; the capture
waits for `document.fonts.ready` before the first frame.

## Writing rule for every demo

If it would not make sense to someone with no video background and five minutes of searching,
it is too wordy. Plain word first, term second, one idea per step, the joke in the takeaway.
