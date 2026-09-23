#!/usr/bin/env node
// Regenerates the FMP Camera Simulator's Open Graph card (apps/fmp-camera-sim/public/og.png).
//
// The card is a real frame from the committed build: the script serves camera-sim/ locally,
// drives the virtual P240 to a repeatable pose with the app's own keyboard controls, captures
// the monitor at 2×, then composes a 1200 × 630 card in the Stage Slate palette with the site's
// DM Sans. Run it after venue or rendering changes, then `npm run build:camera-sim` so the
// built camera-sim/og.png follows.
//
//   node scripts/make_camera_sim_og.mjs [tiltSeconds] [zoomSeconds]   (defaults 2.6 and 0.55)
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/fmp-camera-sim/public/og.png');
const [tiltS = '2.6', zoomS = '0.55'] = process.argv.slice(2);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

if (!existsSync(join(ROOT, 'camera-sim/index.html'))) {
  console.error('camera-sim/index.html is missing; run npm run build:camera-sim first.');
  process.exit(1);
}
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://og').pathname);
  const file = join(ROOT, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  response.end(readFileSync(file));
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const base = `http://127.0.0.1:${server.address().port}/camera-sim/`;

const dmSans = readFileSync(join(ROOT, 'fonts/dm-sans.woff2')).toString('base64');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${base}?diagnostics=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__fmpCameraSim), null, { timeout: 15000 });
  await page.locator('#sim-workspace').focus();
  // Speed level 4 with Shift (full deflection): tilt about 4.5°/s, zoom about 12 s of travel.
  // Reading the snapshot while a key is held advances the simulation clock explicitly, which a
  // headless page's animation frames alone do not do reliably.
  const hold = async (key, seconds) => {
    await page.keyboard.down(key);
    const until = Date.now() + Number(seconds) * 1000;
    while (Date.now() < until) {
      await page.evaluate(() => window.__fmpCameraSim.snapshot());
      await page.waitForTimeout(80);
    }
    await page.keyboard.up(key);
    await page.evaluate(() => window.__fmpCameraSim.snapshot());
  };
  await page.keyboard.down('Shift');
  await hold('ArrowDown', tiltS);
  await hold('KeyE', zoomS);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__fmpCameraSim.snapshot());
  // Clean picture: guides off, the app's OSD hidden (the card carries its own chip), monitor expanded.
  for (const name of ['Safe area', 'Centre', 'Thirds']) {
    const button = page.getByRole('button', { name, exact: true });
    if ((await button.getAttribute('aria-pressed')) === 'true') await button.click();
  }
  await page.evaluate(() => { document.querySelector('.monitor-osd').style.display = 'none'; });
  await page.getByRole('button', { name: 'Expand monitor', exact: true }).click();
  await page.waitForTimeout(600);
  const pose = await page.evaluate(() => {
    const s = window.__fmpCameraSim.snapshot();
    const f = window.__fmpCameraSim.frame();
    return { pan: +s.pose.pan.toFixed(2), tilt: +s.pose.tilt.toFixed(2), lens: +s.pose.lens.toFixed(3), hfov: +f.hfovDeg.toFixed(1) };
  });
  const shot = await page.locator('.monitor-frame').screenshot({ type: 'png' });
  console.log('captured the monitor at pose', JSON.stringify(pose));

  const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await card.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: "DM Sans"; src: url("data:font/woff2;base64,${dmSans}") format("woff2"); font-weight: 100 900; font-style: normal; }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #0c1016;
    font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #f4f0e8; }
  .pic { position: absolute; inset: 0; background: url("data:image/png;base64,${shot.toString('base64')}") center 45% / cover no-repeat; }
  .scrim { position: absolute; inset: 0; background:
    linear-gradient(180deg, rgba(12,16,22,0.55) 0%, rgba(12,16,22,0) 22%, rgba(12,16,22,0) 50%, rgba(12,16,22,0.9) 76%, rgba(12,16,22,0.97) 100%); }
  .chip, .url { position: absolute; top: 36px; display: inline-flex; gap: 10px; align-items: center; padding: 11px 16px; border-radius: 999px;
    background: rgba(12,16,22,0.72); border: 1px solid rgba(244,240,232,0.16); font: 700 19px/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace; letter-spacing: 0.04em; }
  .chip { left: 56px; }
  .chip span { color: #f0c36f; }
  .url { right: 56px; color: #d9d2c6; }
  .band { position: absolute; left: 56px; right: 56px; bottom: 52px; }
  .kicker { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 16px; font-size: 21px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase; color: #e08a4f; }
  .kicker i { display: inline-block; width: 13px; height: 13px; border-radius: 50%; background: #e08a4f; box-shadow: 0 0 0 5px rgba(224,138,79,0.25); }
  h1 { margin: 0; font-size: 78px; line-height: 1; letter-spacing: -0.02em; font-weight: 800; }
  p { margin: 16px 0 0; max-width: 1088px; font-size: 27px; line-height: 1.3; color: #d9d2c6; font-weight: 500; white-space: nowrap; }
</style></head><body>
  <div class="pic"></div><div class="scrim"></div>
  <div class="chip">SIM · CAM 4 · P240 <span>· APPROX VENUE</span></div>
  <div class="url">housevideo.app/camera-sim</div>
  <div class="band">
    <div class="kicker"><i></i> FMP Video Operations</div>
    <h1>Camera Simulator</h1>
    <p>Framing, moves and presets on a virtual BirdDog P240 at the FMP catwalk.</p>
  </div>
</body></html>`, { waitUntil: 'load' });
  await card.waitForTimeout(300);
  const png = await card.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  writeFileSync(OUT, png);
  console.log(`wrote ${OUT} (${png.length} bytes)`);
} finally {
  await browser.close();
  server.close();
}
