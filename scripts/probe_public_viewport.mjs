#!/usr/bin/env node
// Exercise public subject tabs, pagination, saved themes and contact routing.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
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
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));


import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true });
const base = `http://127.0.0.1:${server.address().port}`;
let views = 0;
try {
  for (const route of ['/', '/av-suite-landing2.html', '/profile/']) {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, `${route} HTTP ${response.status()} from ${ROOT}`);
    await page.evaluate(() => document.fonts.ready);
    const theme = () => page.evaluate(() => document.documentElement.dataset.avTheme || document.documentElement.dataset.theme);
    assert.equal(await theme(), route.includes('av-suite') ? 'dark' : 'light', `${route} fresh theme`);
    await page.locator('.public-theme-toggle, #themeToggle').click();
    const choice = await theme();
    await page.reload();
    assert.equal(await theme(), choice, `${route} saved theme`);
    for (const [width, height] of [[1440,900], [375,812], [680,900], [844,390], [320,256], [3840,1080]]) {
      await page.setViewportSize({ width, height });
      for (const mode of ['light', 'dark']) {
        if (await theme() !== mode) await page.locator('.public-theme-toggle, #themeToggle').click();
        const tabs = page.getByRole('tab');
        for (let i = 0; i < await tabs.count(); i++) {
          await tabs.nth(i).click();
          const previous = page.getByRole('button', { name: '← Previous', exact: true });
          const next = page.getByRole('button', { name: 'Next →', exact: true });
          while (await previous.isEnabled()) await previous.click();
          let pages = 0;
          do {
            const result = await page.evaluate(() => {
              const root = document.documentElement;
              const panel = document.querySelector('[role="tabpanel"]:not([hidden])');
              const frame = panel.querySelector('.public-frame').getBoundingClientRect();
              const clipped = [];
              for (const node of panel.querySelectorAll('a, button, img, p, h1, h2, h3, li, td, .val')) {
                if (node.closest('[aria-hidden="true"]')) continue;
                for (const rect of node.getClientRects()) {
                  if (rect.width && rect.left >= frame.left - 1 && rect.left < frame.right - 1 &&
                      (rect.bottom > frame.bottom + 2 || rect.top < frame.top - 2 || rect.right > frame.right + 2)) {
                    clipped.push(node.tagName + ': ' + node.textContent.trim().slice(0, 45));
                  }
                }
              }
              return { overflowX: root.scrollWidth - root.clientWidth, overflowY: root.scrollHeight - root.clientHeight, clipped };
            });
            assert.deepEqual(result, { overflowX: 0, overflowY: 0, clipped: [] }, `${route} ${width}×${height} ${mode} tab ${i} page ${pages + 1}`);
            views++; pages++;
            if (await next.isDisabled()) break;
            assert(pages < 150, 'Pagination must terminate');
            await next.click();
          } while (true);
        }
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole('tab').first().focus();
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('tab').last().getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab').first().getAttribute('aria-selected'), 'true');
    // Native beforematch reveals hidden-until-found subjects. window.find covers
    // selection/page reveal within the active subject, without browser chrome.
    await page.locator('[data-public-panel]').last().dispatchEvent('beforematch');
    assert.equal(await page.getByRole('tab').last().getAttribute('aria-selected'), 'true');
    assert(await page.evaluate(() => window.find('Privacy')));
    await page.waitForFunction(() => {
      const selection = getSelection();
      if (!selection.rangeCount || selection.isCollapsed) return false;
      const box = selection.getRangeAt(0).getBoundingClientRect();
      const frame = document.querySelector('[role="tabpanel"]:not([hidden]) .public-frame').getBoundingClientRect();
      return box.left >= frame.left && box.right <= frame.right && box.top >= frame.top && box.bottom <= frame.bottom;
    });
    if (route === '/profile/') {
      await page.goto(base + '/profile/#contact');
      assert.equal(await page.getByRole('tab', { name: 'Contact', exact: true }).getAttribute('aria-selected'), 'true');
      await page.getByRole('tab', { name: 'Work', exact: true }).click();
      await page.goBack();
      assert.equal(await page.getByRole('tab', { name: 'Contact', exact: true }).getAttribute('aria-selected'), 'true');
      await page.locator('a[href="mailto:avbydave@gmail.com"]').focus();
      const box = await page.locator('a[href="mailto:avbydave@gmail.com"]').boundingBox();
      assert(box.y >= 0 && box.y + box.height < 812, 'Email focus must reveal its page');
      await page.goto(base + '/profile/#%E0%A4%A');
    }
    await page.emulateMedia({ media: 'print' });
    assert(await page.locator('[data-public-panel]').evaluateAll(panels => panels.every(panel =>
      getComputedStyle(panel).contentVisibility === 'visible' && panel.getBoundingClientRect().height > 10)), 'Print must expand every subject');
    assert.deepEqual(errors, [], route + ' browser errors');
    await page.close();
    const fallback = await browser.newPage({ javaScriptEnabled: false });
    await fallback.goto(base + route);
    assert(await fallback.locator('[data-public-panel]').last().isVisible(), 'No-script document content');
    await fallback.close();
    console.log(`${route}: layout, theme, routing, keyboard, find and print passed`);
  }
  console.log(`Public viewport: ${views} content-page views passed`);
} finally {
  await browser.close();
  server.close();
}
