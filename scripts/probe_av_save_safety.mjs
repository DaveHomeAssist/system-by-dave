#!/usr/bin/env node
// Browser regression probe for AV by Dave save safety (docs/av-suite-doorway.md).
// Serves the repository, drives Cable Plan and av-suite.html in Chromium with Playwright and
// checks that console show details never silently replace a tool's saved show (Keep / Switch),
// that a change from another tab is announced, that full or blocked storage is reported, that
// an unreadable saved show is kept aside, and that an uncached page has an offline fallback.
//
// Usage: node scripts/probe_av_save_safety.mjs [--no-sandbox]
//        (CHROME_CHANNEL=chrome to use Chrome, or CHROME_BIN=/path/to/chrome for a specific binary)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const results = [];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://probe').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) {
    response.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const BASE = `http://127.0.0.1:${server.address().port}`;
const TOOL = `${BASE}/cable-plan.html`;
const CONSOLE_SHOW = `${TOOL}?sbdShow=Winter%20Keynote&sbdVenue=Hall%20B`;
const TOOL_KEY = 'cable-plan.v1';
const SUITE_KEY = 'av-suite-dashboard.v1';

const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });

function record(ok, name, detail = '') {
  results.push({ ok, name, detail });
  console.log(`${ok ? 'ok' : 'not ok'} - ${name}${detail ? `: ${detail}` : ''}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(true, name, detail || '');
  } catch (error) {
    record(false, name, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function open(context, url) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  return { page, errors };
}

// Saves a show name in Cable Plan through its own form, the way an operator would.
async function saveToolShow(page, name) {
  await page.fill('#showName', name);
  await page.dispatchEvent('#showName', 'input');
  await page.dispatchEvent('#showName', 'change');
  await page.waitForTimeout(400);
}

const prompt = (page) => page.locator('[data-sbd-context-choice]');
const guard = (page, kind) => page.locator(`[data-sbd-save-guard="${kind}"]`);

await check('a tool with a different saved show asks before switching, and Keep is remembered', async () => {
  const context = await browser.newContext();
  const { page } = await open(context, TOOL);
  await saveToolShow(page, 'Spring Gala 2026');
  await page.goto(CONSOLE_SHOW, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  assert(await prompt(page).isVisible(), 'no Keep / Switch prompt');
  assert(await page.inputValue('#showName') === 'Spring Gala 2026', 'saved show was replaced before choosing');
  assert(await page.inputValue('#venue') !== 'Hall B', 'venue was replaced before choosing');
  await page.locator('[data-sbd-context-keep]').click();
  assert(await prompt(page).count() === 0, 'prompt stayed open after Keep');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const reprompt = await prompt(page).count();
  const name = await page.inputValue('#showName');
  await context.close();
  assert(reprompt === 0, 'asked again after Keep in the same session');
  assert(name === 'Spring Gala 2026', `kept show changed to ${name}`);
});

await check('Switch applies the console show details', async () => {
  const context = await browser.newContext();
  const { page } = await open(context, TOOL);
  await saveToolShow(page, 'Spring Gala 2026');
  await page.goto(CONSOLE_SHOW, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  await page.locator('[data-sbd-context-switch]').click();
  await page.waitForTimeout(300);
  const name = await page.inputValue('#showName');
  const venue = await page.inputValue('#venue');
  const stored = await page.evaluate((key) => localStorage.getItem(key), TOOL_KEY);
  await context.close();
  assert(name === 'Winter Keynote' && venue === 'Hall B', `switch applied ${name} / ${venue}`);
  assert(/Winter Keynote/.test(stored || ''), 'switched show was not saved');
});

await check('a fresh tool takes the console show without asking', async () => {
  const context = await browser.newContext();
  const { page, errors } = await open(context, CONSOLE_SHOW);
  const asked = await prompt(page).count();
  const name = await page.inputValue('#showName');
  await context.close();
  assert(asked === 0, 'asked on a tool with no saved show');
  assert(name === 'Winter Keynote', `fresh tool shows ${name}`);
  assert(errors.length === 0, errors.join('; '));
});

await check('an Untitled default is replaced without asking', async () => {
  const context = await browser.newContext();
  const { page } = await open(context, TOOL);
  await page.fill('#venue', 'Hall A');
  await page.dispatchEvent('#venue', 'change');
  await page.waitForTimeout(400);
  await page.goto(CONSOLE_SHOW, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const asked = await prompt(page).count();
  const name = await page.inputValue('#showName');
  await context.close();
  assert(asked === 0, 'asked about an Untitled default');
  assert(name === 'Winter Keynote', `default not replaced: ${name}`);
});

await check('a change in another tab is announced with Reload / Keep editing', async () => {
  const context = await browser.newContext();
  const first = await open(context, TOOL);
  const second = await open(context, TOOL);
  await saveToolShow(first.page, 'Changed In Tab A');
  await second.page.waitForTimeout(200);
  const notice = guard(second.page, 'other-tab');
  const visible = await notice.isVisible();
  const text = visible ? await notice.innerText() : '';
  const own = await guard(first.page, 'other-tab').count();
  if (visible) await notice.getByRole('button', { name: 'Keep editing here' }).click();
  const dismissed = await notice.count();
  await context.close();
  assert(visible, 'no notice in the other tab');
  assert(/another tab/i.test(text) && /Reload/.test(text), `unexpected notice: ${text}`);
  assert(own === 0, 'the saving tab warned about itself');
  assert(dismissed === 0, 'Keep editing here did not close the notice');
});

await check('a save that hits full storage is reported', async () => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).includes('probe')) return original.call(this, key, value);
      throw new DOMException('Storage is full', 'QuotaExceededError');
    };
  });
  const { page } = await open(context, TOOL);
  await page.fill('#showName', 'Quota Test');
  await page.dispatchEvent('#showName', 'input');
  await page.dispatchEvent('#showName', 'change');
  await page.waitForTimeout(400);
  const notice = guard(page, 'full');
  const visible = await notice.isVisible();
  const text = visible ? await notice.innerText() : '';
  await context.close();
  assert(visible, 'no storage-full notice');
  assert(/not saved/.test(text) && /Export/.test(text), `unexpected notice: ${text}`);
});

await check('blocked storage is reported on tools and on the console', async () => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  const tool = await open(context, TOOL);
  const toolNotice = await guard(tool.page, 'blocked').isVisible();
  const suite = await open(context, `${BASE}/av-suite.html?entry=show`);
  const suiteNotice = await suite.page.locator('#storageNotice').isVisible();
  const suiteText = suiteNotice ? await suite.page.locator('#storageNoticeMsg').innerText() : '';
  await context.close();
  assert(toolNotice, 'tool shows no blocked-storage notice');
  assert(suiteNotice && /not saving/.test(suiteText), `console notice: ${suiteText}`);
});

await check('an unreadable saved show is reported and kept aside', async () => {
  const context = await browser.newContext();
  const { page } = await open(context, `${BASE}/av-suite.html?entry=toolbox`);
  await page.evaluate((key) => localStorage.setItem(key, '{not json'), SUITE_KEY);
  await page.goto(`${BASE}/av-suite.html?entry=show`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const visible = await page.locator('#storageNotice').isVisible();
  const text = visible ? await page.locator('#storageNoticeMsg').innerText() : '';
  const backup = await page.evaluate((key) => localStorage.getItem(`${key}.unreadable`), SUITE_KEY);
  await page.locator('#storageNoticeDismiss').click();
  const hidden = await page.locator('#storageNotice').isHidden();
  await context.close();
  assert(visible && /could not be read/.test(text), `notice: ${text}`);
  assert(backup === '{not json', `backup holds ${JSON.stringify(backup)}`);
  assert(hidden, 'Dismiss did not hide the notice');
});

await check('an uncached page opens an offline fallback instead of the browser error', async () => {
  const context = await browser.newContext();
  const { page } = await open(context, `${BASE}/av-suite.html?entry=toolbox`);
  const controlled = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return false;
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 40 && !navigator.serviceWorker.controller; i += 1) await new Promise((wait) => setTimeout(wait, 250));
    return Boolean(navigator.serviceWorker.controller);
  });
  assert(controlled, 'service worker never took control');
  await context.setOffline(true);
  let title = '';
  let body = '';
  try {
    await page.goto(`${BASE}/no-such-page.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    title = await page.title();
    body = await page.locator('body').innerText();
  } catch (error) {
    title = `navigation failed: ${error.message.split('\n')[0]}`;
  }
  const consoleLink = await page.locator('a[href*="av-suite.html?entry=show"]').count();
  await context.close();
  assert(/Offline/.test(title), `title: ${title}`);
  assert(/isn.t saved on this device/.test(body) && consoleLink === 1, 'fallback page is missing its text or links');
});

await browser.close();
server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} AV save safety checks passed`);
process.exit(failed.length ? 1 : 0);
