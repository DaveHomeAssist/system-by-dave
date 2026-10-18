#!/usr/bin/env node
// Local reel capture for the frame-sync demo (docs/launch/README.md).
// Not part of CI. Renders av/frame-sync/?capture=1 frame by frame on a virtual
// clock (no dropped frames), then encodes with ffmpeg:
//   - main cut (9:16, 1080x1920, 30 fps) opening on the step-3 tear
//   - 15 s cut (steps 3 -> 4)
//   - one loop per step for the carousel (4:5, 1080x1350)
//   - a cover frame plus its 3:4 grid crop and a safe-area check image
// Every overlay is measured in the page and must sit inside the safe area in
// scripts/launch/reel-plan.json; the run fails otherwise. Outputs are large,
// so write them outside the repository:
//   node scripts/launch/capture_frame_sync_reel.mjs --out /path/to/reel [--only main,short15,loops,cover]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'launch', 'reel-plan.json'), 'utf8'));
const args = process.argv.slice(2);
const argValue = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const OUT = path.resolve(argValue('--out', path.join(os.tmpdir(), 'frame-sync-reel')));
const ONLY = new Set(argValue('--only', 'main,short15,loops,cover').split(','));
const FPS = plan.fps;
const SCALE = 3;
if (OUT.startsWith(ROOT + path.sep)) {
  console.error('Write reel output outside the repository (videos are not committed).');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function ffmpeg(argv) { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: 'inherit' }); }
function probe(file) {
  const json = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }));
  const video = json.streams.find((s) => s.codec_type === 'video');
  return { width: video.width, height: video.height, fps: video.r_frame_rate, duration: Number(json.format.duration), frames: Number(video.nb_frames || 0), audio: json.streams.some((s) => s.codec_type === 'audio') };
}

const VIEWPORTS = { '9x16': { width: 360, height: 640 }, '4x5': { width: 360, height: 450 } };
const SAFE = {
  '9x16': plan.safeArea,
  '4x5': { left: 12, right: 348, top: 8, bottom: 442 }
};
// The 3:4 profile-grid crop of a 1080x1920 frame keeps y 240..1680 (80..560 CSS px).
const GRID_3X4 = { top: 80, bottom: 560 };

async function openCut(browser, base, cut) {
  const viewport = VIEWPORTS[cut.aspect];
  const page = await browser.newPage({ viewport, deviceScaleFactor: SCALE });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const query = new URLSearchParams({ capture: '1', order: cut.order.join(','), durations: cut.durations.join(',') });
  if (cut.aspect === '4x5') query.set('aspect', '4x5');
  await page.goto(`${base}/av/frame-sync/?${query}`);
  await page.waitForFunction(() => window.FrameSync && document.fonts.status === 'loaded');
  await page.evaluate((overlays) => window.FrameSync.setOverlays(overlays), cut.overlays || []);
  return { page, errors };
}

async function checkOverlays(page, cut) {
  const safe = SAFE[cut.aspect];
  const problems = [];
  for (const item of cut.overlays || []) {
    const t = (item.from + item.to) / 2;
    await page.evaluate((time) => window.FrameSync.seek(time), t);
    const rect = await page.evaluate((slot) => {
      const el = document.querySelector(`[data-ov="${slot}"]`);
      if (!el || el.hidden) return null;
      // Measure the text itself, not the slot box.
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      const screen = document.querySelector('.fs-screen-wrap').getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, boxTop: box.top, boxBottom: box.bottom, screenTop: screen.top, screenBottom: screen.bottom };
    }, item.slot);
    if (!rect) { problems.push(`${cut.id} ${item.slot}@${t}s not visible`); continue; }
    const out = rect.left < safe.left || rect.right > safe.right || rect.top < safe.top || rect.bottom > safe.bottom;
    if (out) problems.push(`${cut.id} "${item.text || item.title}" outside safe area ${JSON.stringify(rect)}`);
    if (item.slot === 'top' && rect.bottom > rect.screenTop - 2) problems.push(`${cut.id} top overlay "${item.text}" overlaps the screen`);
    if (item.slot === 'bottom' && rect.top < rect.screenBottom) problems.push(`${cut.id} bottom overlay "${item.text}" overlaps the screen`);
  }
  return problems;
}

async function renderFrames(page, seconds, dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const total = Math.round(seconds * FPS);
  for (let i = 0; i < total; i += 1) {
    await page.evaluate((t) => window.FrameSync.seek(t), i / FPS);
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(5, '0')}.png`), type: 'png' });
  }
  return total;
}

function encode(dir, file) {
  // Clean native master: H.264 High, yuv420p, 30 fps CFR, silent AAC track so
  // music can be added in-app, no watermark.
  ffmpeg(['-framerate', String(FPS), '-i', path.join(dir, '%05d.png'),
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-map', '0:v', '-map', '1:a', '-shortest',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', file]);
}

function firstFixTime(schedule) {
  let t = 0;
  for (const entry of schedule) {
    if (entry.step === 4) return t + 1.2;
    t += entry.dur;
  }
  return null;
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const manifest = { generated: new Date().toISOString(), source: 'av/frame-sync/?capture=1', outputs: [], checks: [] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frame-sync-frames-'));
let failed = false;

try {
  for (const cut of plan.cuts) {
    if (!ONLY.has(cut.id)) continue;
    const { page, errors } = await openCut(browser, base, cut);
    const total = await page.evaluate(() => window.FrameSync.total);
    const schedule = await page.evaluate(() => window.FrameSync.schedule);
    const problems = await checkOverlays(page, cut);
    const frame0 = await page.evaluate(() => window.FrameSync.stateAt(0));
    if (frame0.step !== 3 || !frame0.tearOn) problems.push(`${cut.id} does not open on the step-3 tear`);
    const fixAt = firstFixTime(schedule);
    if (fixAt === null || fixAt > 10) problems.push(`${cut.id} fix lands at ${fixAt}s (must be by 10 s)`);
    if (problems.length) { failed = true; problems.forEach((p) => console.error(`FAIL ${p}`)); }
    const dir = path.join(tmp, cut.id);
    console.log(`${cut.id}: rendering ${total}s at ${FPS} fps…`);
    await renderFrames(page, total, dir);
    const file = path.join(OUT, cut.file);
    encode(dir, file);
    const info = probe(file);
    manifest.outputs.push({ id: cut.id, file: cut.file, seconds: total, fixAt, opensOn: 'step 3 tear', ...info });
    manifest.checks.push({ id: cut.id, overlayProblems: problems, consoleErrors: errors });
    if (errors.length) { failed = true; console.error(`FAIL ${cut.id} console errors: ${errors.join(' | ')}`); }
    fs.rmSync(dir, { recursive: true, force: true });
    await page.close();
  }

  if (ONLY.has('cover')) {
    const cut = plan.cuts.find((c) => c.id === plan.cover.cut);
    const { page } = await openCut(browser, base, cut);
    await page.evaluate((t) => window.FrameSync.seek(t), plan.cover.time);
    const textRect = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[data-ov]')).filter((el) => !el.hidden);
      const rects = els.map((el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); });
      return { top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)) };
    });
    const screenRect = await page.evaluate(() => { const r = document.querySelector('.fs-screen-wrap').getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
    const coverFile = path.join(OUT, plan.cover.file);
    await page.screenshot({ path: coverFile, type: 'png' });
    ffmpeg(['-i', coverFile, '-vf', `crop=1080:1440:0:${GRID_3X4.top * SCALE}`, path.join(OUT, plan.cover.cropFile)]);
    const s = plan.safeArea;
    ffmpeg(['-i', coverFile, '-vf', [
      `drawbox=x=0:y=${GRID_3X4.top * SCALE}:w=1080:h=1440:color=yellow@0.9:t=6`,
      `drawbox=x=${s.left * SCALE}:y=${s.top * SCALE}:w=${(s.right - s.left) * SCALE}:h=${(s.bottom - s.top) * SCALE}:color=cyan@0.9:t=4`
    ].join(','), path.join(OUT, plan.cover.checkFile)]);
    const inGrid = textRect.top >= GRID_3X4.top && textRect.bottom <= GRID_3X4.bottom && screenRect.top >= GRID_3X4.top && screenRect.bottom <= GRID_3X4.bottom;
    if (!inGrid) { failed = true; console.error(`FAIL cover text/screen outside the 3:4 crop ${JSON.stringify({ textRect, screenRect })}`); }
    manifest.outputs.push({ id: 'cover', file: plan.cover.file, crop: plan.cover.cropFile, check: plan.cover.checkFile, textInsideGrid3x4: inGrid, textRect, screenRect });
    await page.close();
  }

  if (ONLY.has('loops')) {
    for (let step = 1; step <= 7; step += 1) {
      const cut = {
        id: `loop${step}`, aspect: plan.loops.aspect, order: [step], durations: [plan.loops.seconds],
        overlays: [{ slot: 'top', from: 0, to: plan.loops.seconds + 1, text: plan.loops.titles[String(step)] }]
      };
      const { page, errors } = await openCut(browser, base, cut);
      const problems = await checkOverlays(page, cut);
      if (problems.length || errors.length) { failed = true; problems.concat(errors).forEach((p) => console.error(`FAIL ${p}`)); }
      const dir = path.join(tmp, cut.id);
      console.log(`${cut.id}: rendering ${plan.loops.seconds}s…`);
      await renderFrames(page, plan.loops.seconds, dir);
      const file = path.join(OUT, plan.loops.fileTemplate.replace('{step}', String(step)));
      encode(dir, file);
      manifest.outputs.push({ id: cut.id, file: path.basename(file), ...probe(file) });
      manifest.checks.push({ id: cut.id, overlayProblems: problems, consoleErrors: errors });
      fs.rmSync(dir, { recursive: true, force: true });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest.outputs.map(({ id, file, width, height, fps, duration, fixAt }) => ({ id, file, width, height, fps, duration, fixAt })), null, 2));
if (failed) { console.error('Reel capture finished with failures.'); process.exit(1); }
console.log(`Reel capture passed. Output: ${OUT}`);
