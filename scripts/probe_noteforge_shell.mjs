#!/usr/bin/env node
// Real-browser regression for the host shell around the managed NoteForge build.
// Optional: CHROME_CHANNEL=chrome, NOTEFORGE_CAPTURE_DIR=/absolute/evidence/path.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const capture = process.env.NOTEFORGE_CAPTURE_DIR;
const results = [];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    let file = resolve(ROOT, `.${decodeURIComponent(new URL(request.url, 'http://probe').pathname)}`);
    if (!file.startsWith(`${ROOT}${sep}`)) return response.writeHead(403).end();
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const url = `http://127.0.0.1:${server.address().port}/noteforge/`;
let browser;
try {
  if (capture) await mkdir(capture, { recursive: true });
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}),
    args: process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
  for (const width of [390, 680, 1440]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark', reducedMotion });
      const page = await context.newPage();
      const result = { width, reducedMotion, errors: [], themes: [] };
      results.push(result);
      page.on('pageerror', (error) => result.errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') result.errors.push(message.text()); });
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => Boolean(window.app?.phase6));
        await page.evaluate(() => window.app.phase6Ready);
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'fresh profile defaults light');
        await page.evaluate(() => document.activeElement?.blur());
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.className), 'sbd-skip-link', 'host skip is first focus');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'app', 'host skip focuses workspace');
        const links = page.locator('.sbd-site-return a');
        assert.deepEqual(await links.evaluateAll((items) => items.map((item) => item.getAttribute('href'))), ['/', '/tools.html']);
        await links.first().focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), '/tools.html');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link', 'native skip remains in keyboard order');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'editor', 'native skip focuses editor');
        const button = page.locator(width <= 760 ? '#mobile-theme-btn' : '#theme-btn');
        for (const theme of ['light', 'dark']) {
          if (await page.locator('html').getAttribute('data-theme') !== theme) await button.click({ timeout: 3000 });
          await page.waitForFunction(() => window.app.db.getPersistenceStatus().pendingWrites === 0);
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForFunction(() => Boolean(window.app?.phase6));
          assert.equal(await page.locator('html').getAttribute('data-theme'), theme, 'theme survives reload');
          const geometry = await button.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const nav = document.querySelector('.sbd-site-return').getBoundingClientRect();
            const app = document.querySelector('#app').getBoundingClientRect();
            const bar = document.querySelector('.mobile-bar').getBoundingClientRect();
            return { button: rect.toJSON(), nav: nav.toJSON(), app: app.toJSON(), bar: bar.toJSON(),
              hit: element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)),
              scrollWidth: document.documentElement.scrollWidth, innerWidth, innerHeight };
          });
          result.themes.push({ theme, ...geometry });
          if (capture) await page.screenshot({ path: join(capture, `${width}-${reducedMotion}-${theme}.png`) });
          assert.ok(geometry.hit, 'theme button receives pointer at its center');
          assert.ok(geometry.button.top >= geometry.nav.bottom, 'theme control clears host breadcrumb');
          assert.ok(geometry.app.bottom <= geometry.innerHeight + 1, 'workspace stays inside viewport');
          assert.ok(geometry.scrollWidth <= geometry.innerWidth, 'no horizontal overflow');
          if (width <= 760) {
            assert.ok(geometry.bar.top >= geometry.nav.bottom, 'mobile bar clears breadcrumb with intervening native skip link');
            assert.ok(geometry.app.top >= geometry.bar.bottom, 'workspace clears mobile controls');
          }
          await button.focus();
          const focus = await button.evaluate((element) => {
            const style = getComputedStyle(element);
            return { visible: element.matches(':focus-visible'), outline: style.outlineStyle, width: parseFloat(style.outlineWidth), shadow: style.boxShadow };
          });
          assert.ok(focus.visible && ((focus.outline !== 'none' && focus.width > 0) || focus.shadow !== 'none'), 'keyboard focus indicator visible');
          await button.click({ timeout: 3000 });
          const next = theme === 'light' ? 'dark' : 'light';
          await page.waitForFunction((expected) => document.documentElement.dataset.theme === expected, next);
          // Observe the normal async config write completing before testing reload.
          await page.waitForFunction(() => window.app.db.getPersistenceStatus().pendingWrites === 0);
          await page.reload({ waitUntil: 'networkidle' });
          assert.equal(await page.locator('html').getAttribute('data-theme'), next, 'real click persists opposite theme');
        }
        assert.deepEqual(result.errors, [], 'no unexpected browser errors');
        result.pass = true;
        console.log(`PASS NoteForge shell ${width}px (${reducedMotion}), both themes, real clicks and reload`);
      } catch (error) {
        result.pass = false;
        result.failure = error.message;
        throw error;
      } finally {
        await context.close();
      }
    }
  }
} finally {
  if (capture) await writeFile(join(capture, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  await browser?.close();
  await new Promise((done) => server.close(done));
}
