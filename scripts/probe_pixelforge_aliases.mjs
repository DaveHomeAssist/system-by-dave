#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const aliases = [];
for (const name of await readdir(resolve(root, 'pixelforge'))) {
  if (!name.endsWith('.html') || name === 'index.html') continue;
  const html = await readFile(resolve(root, 'pixelforge', name), 'utf8');
  const target = html.match(/http-equiv="refresh" content="0; url=([^"]+)"/)?.[1];
  if (target) aliases.push({ name, html, target });
}
assert.equal(aliases.length, 12);
for (const { name, html, target } of aliases) {
  assert.match(html, /Content-Security-Policy/ , name);
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'), name);
  assert.match(html, /default-src 'none'; script-src 'self'; style-src 'self'/, name);
  assert.match(html, /base-uri 'none'; object-src 'none'; form-action 'none'/, name);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval|<script\s*>/i, name);
  assert.ok(html.includes(`data-redirect-target href="${target}"`), name);
}
// A synthetic destination prevents opening the editor or its network features.
// The fallback fixture suppresses only navigation, leaving CSP and UI bytes intact.
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  if (url.pathname === '/pixelforge/') return res.writeHead(200, { 'content-type': 'text/html' }).end('<title>Destination fixture</title>');
  const file = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    let text = await readFile(file, 'utf8');
    if (url.searchParams.has('scriptOnly')) text = text.replace(/<meta http-equiv="refresh"[^>]+>/, '');
    if (url.searchParams.has('fallback')) {
      text = text.replace(/<meta http-equiv="refresh"[^>]+>/, '').replace(/<script src="..\/js\/redirect-target.js" defer><\/script>/, '');
      if (url.searchParams.has('inject')) text = text.replace('</body>', '<script>window.injected=true</script></body>');
    }
    res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' })[extname(file)] || 'text/plain' }).end(text);
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let views = 0;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ javaScriptEnabled });
    const page = await context.newPage();
    for (const { name, target } of aliases) {
      await page.goto(`${base}/pixelforge/${encodeURIComponent(name)}${javaScriptEnabled ? '?scriptOnly' : ''}`);
      await page.waitForURL(new URL(target, `${base}/pixelforge/${encodeURIComponent(name)}`).href);
    }
    await context.close();
  }
  for (const { name } of aliases) {
    const context = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(`${base}/pixelforge/${encodeURIComponent(name)}?fallback`);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    for (const [width, height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]) {
      await page.setViewportSize({ width, height });
      for (const theme of ['light', 'dark']) {
        if (await page.evaluate(() => document.documentElement.dataset.theme) !== theme) await page.locator('button.public-theme-toggle').click();
        const issues = await page.evaluate(() => {
          const result = [];
          const doc = document.documentElement;
          if (doc.scrollHeight > doc.clientHeight || doc.scrollWidth > doc.clientWidth) result.push('root overflow');
          for (const node of document.querySelectorAll('nav a, nav button, main h1, main p, main a')) {
            const box = node.getBoundingClientRect();
            if (box.left < 0 || box.top < 0 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1 || node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) result.push(node.textContent);
            if (node.matches('a,button') && (box.width < 44 || box.height < 44)) result.push('small target');
          }
          return result;
        });
        assert.deepEqual(issues, [], `${name} ${width}x${height} ${theme}`);
        if (process.env.ALIAS_SCREENSHOTS && name === 'guide.html' && theme === 'dark' && [375, 3840].includes(width)) {
          await page.screenshot({ path: `${process.env.ALIAS_SCREENSHOTS}/alias-${width}.png` });
        }
        views++;
      }
    }
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('class'), 'redirect-skip');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'redirect-main');
    assert.notEqual(await page.locator(':focus').evaluate(node => getComputedStyle(node).outlineStyle), 'none');
    assert.deepEqual(errors, [], name);
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => { window.policyViolations = []; document.addEventListener('securitypolicyviolation', event => window.policyViolations.push(event.effectiveDirective)); });
  await page.goto(`${base}/pixelforge/guide.html?fallback&inject`);
  assert.equal(await page.evaluate(() => window.injected), undefined, 'CSP must block injected inline script');
  assert.equal(await page.evaluate(async () => { try { await fetch('https://example.invalid/'); return true; } catch { return false; } }), false, 'CSP must block connections');
  await page.waitForFunction(() => window.policyViolations.includes('script-src-elem') && window.policyViolations.includes('connect-src'));
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.goto(`${base}/pixelforge/guide.html?fallback`);
  await page.locator('button.public-theme-toggle').click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('header').isVisible(), false);
  assert.equal(await page.locator('[data-redirect-target]').isVisible(), true);
  await context.close();
  console.log(`PixelForge aliases passed: 24 redirects, ${views} fallback views, keyboard, saved/blocked storage, print and CSP denial.`);
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
