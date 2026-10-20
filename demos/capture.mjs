// Render a demo's auto-play cut to a 1080x1920 MP4, frame by frame, using the page's manual clock.
// Usage: node capture.mjs --page frame-sync.html --cut main [--fps 30] [--out out] [--ffmpeg /path/to/ffmpeg]
// Runs inside the Playwright container on a runner; needs the `playwright` npm package and an ffmpeg with libx264.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/usr/lib/node_modules/playwright'); }
const { chromium } = pw;
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const page_ = resolve(arg('page', 'frame-sync.html'));
const cut = arg('cut', 'main');
const fps = parseInt(arg('fps', '30'), 10);
const out = resolve(arg('out', 'out'));
const ffmpeg = arg('ffmpeg', 'ffmpeg');
const name = basename(page_, '.html') + '-' + cut;
const frames = resolve(out, name + '-frames');
rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(pathToFileURL(page_).href + '?drive&auto=' + cut);
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => window.hr && window.hr.cutLength > 0);
const cutLength = await page.evaluate(() => window.hr.cutLength);
const total = Math.ceil(cutLength / 1000 * fps);
const stepMs = 1000 / fps;
// cover frame: the page may declare hr.coverAt (ms); otherwise the first tear + 8 frames if the page has one; otherwise 1.5 s in
const declared = await page.evaluate(() => (window.hr && window.hr.coverAt) || null);
const hasTear = await page.evaluate(() => !!document.getElementById('tear'));
let cover = declared !== null ? Math.round(declared / 1000 * fps) : (hasTear ? null : Math.round(1.5 * fps));
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate(ms => window.hr.advance(ms), stepMs);
  const file = resolve(frames, `f${String(f).padStart(5, '0')}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1080, height: 1920 }, type: 'png' });
  if (cover === null && hasTear) {
    const tearing = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('tear')).opacity) > 0.5);
    if (tearing) cover = f + 8;   // a quarter second into the tear, mid-shake, reads best as a thumbnail
  }
}
await browser.close();
if (errors.length) { console.error('page errors:', errors); process.exit(2); }
console.log(`captured ${total} frames (${(cutLength / 1000).toFixed(1)} s at ${fps} fps) in ${((Date.now() - t0) / 1000).toFixed(0)} s; cover frame ${cover}`);

const mp4 = resolve(out, name + '.mp4');
const enc = spawnSync(ffmpeg, [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-framerate', String(fps), '-i', resolve(frames, 'f%05d.png'),
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '10M', '-maxrate', '12M', '-bufsize', '20M',
  '-c:a', 'aac', '-b:a', '64k', '-shortest', '-movflags', '+faststart', mp4,
], { stdio: 'inherit' });
if (enc.status !== 0) { console.error('ffmpeg failed'); process.exit(3); }
if (cover !== null) {
  const src = resolve(frames, `f${String(cover).padStart(5, '0')}.png`);
  spawnSync('cp', [src, resolve(out, name + '-cover.png')]);
}
writeFileSync(resolve(out, name + '.json'), JSON.stringify({ page: basename(page_), cut, fps, frames: total, seconds: cutLength / 1000, cover, renderedAt: new Date().toISOString() }, null, 2));
console.log('wrote', mp4);
