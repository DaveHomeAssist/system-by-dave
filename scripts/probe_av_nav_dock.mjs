#!/usr/bin/env node
// Render the AV tool navigation beside the show dock at representative widths.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  let file = resolve(ROOT, '.' + decodeURIComponent(new URL(request.url, 'http://probe').pathname));
  if (!file.startsWith(ROOT + '/')) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));

const browserOptions = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
let browser;
try {
  browser = await chromium.launch({ headless: true, ...browserOptions,
    args: process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
  const base = `http://127.0.0.1:${server.address().port}/cable-plan.html`;
  const show = `${base}?sbdShow=Winter%20Keynote&sbdVenue=Hall%20B`;

  async function checkLayout(page, label) {
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const nav = document.querySelector('.sbd-nav');
      const dock = document.querySelector('[data-sbd-suite-dock]');
      if (!nav || !dock) return { missing: !nav ? 'tool navigation' : 'show dock' };
      const a = nav.getBoundingClientRect();
      const b = dock.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const blockedLink = Array.from(nav.querySelectorAll('a')).find((link) => {
        const box = link.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return !hit || !nav.contains(hit);
      });
      const shortestLink = Math.min(...Array.from(nav.querySelectorAll('a'),
        (link) => link.getBoundingClientRect().height));
      return { overlap, navTop: a.top, navBottom: a.bottom, blockedLink: blockedLink?.textContent,
        shortestLink, clearance: parseFloat(getComputedStyle(document.body).paddingBottom) };
    });
    if (result.missing || result.overlap > 0.5 || result.navTop < -1
        || result.navBottom > page.viewportSize().height + 1 || result.blockedLink || result.shortestLink < 44
        || result.clearance < page.viewportSize().height - result.navTop - 1) {
      throw new Error(`${label}: ${JSON.stringify(result)}`);
    }
    console.log(`ok - ${label}`);
  }

  for (const [width, height] of [[390, 844], [390, 667], [680, 720], [768, 844], [1200, 900], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(show, { waitUntil: 'networkidle' });
    await checkLayout(page, `${width}x${height} expanded dock`);
    if (width === 390 && height === 844) {
      await page.locator('.sbd-nav a').first().focus();
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => ({ inNav: !!document.activeElement?.closest('.sbd-nav'),
        visible: document.activeElement?.matches(':focus-visible'),
        outline: getComputedStyle(document.activeElement).outlineWidth }));
      if (!focus.inNav || !focus.visible || focus.outline === '0px') {
        throw new Error(`keyboard focus is not visible: ${JSON.stringify(focus)}`);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const motion = await page.locator('.sbd-nav a').first().evaluate((link) => getComputedStyle(link).transitionDuration);
      if (motion.split(',').some((duration) => parseFloat(duration) > 0.001)) {
        throw new Error(`reduced motion still transitions: ${motion}`);
      }
    }
    if (width === 390 || width === 768) {
      await page.locator('[data-sbd-suite-note-button]').click();
      await checkLayout(page, `${width}x${height} note editor`);
      await page.locator('[data-sbd-suite-compact-toggle]').click();
      await checkLayout(page, `${width}x${height} compact dock`);
    }
    const showLink = await page.locator('.sbd-nav a[href*="sbdShow="]').count();
    if (!showLink || errors.length) throw new Error(`${width}x${height}: context link=${showLink}, page errors=${errors.join('; ')}`);
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  const noShow = await page.evaluate(() => ({ nav: !!document.querySelector('.sbd-nav'),
    dock: !!document.querySelector('[data-sbd-suite-dock]'),
    bottom: document.querySelector('.sbd-nav')?.getBoundingClientRect().bottom }));
  if (!noShow.nav || noShow.dock || Math.abs(noShow.bottom - 834) > 1) {
    throw new Error(`no-show navigation changed: ${JSON.stringify(noShow)}`);
  }
  console.log('ok - tool navigation without show context');
  await page.close();
} finally {
  if (browser) await browser.close();
  server.close();
}
