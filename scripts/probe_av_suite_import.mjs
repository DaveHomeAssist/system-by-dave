#!/usr/bin/env node
// Browser regression probe for AV by Dave suite imports (docs/av-suite-doorway.md).
// Serves the repository, drives av-suite.html in Chromium with Playwright and checks that
// Import Suite JSON and Import Show Package never replace the saved show with a file of the
// wrong shape, ask before replacing a show that has work in it, and can undo an import.
//
// Usage: node scripts/probe_av_suite_import.mjs [--no-sandbox]
//        (CHROME_CHANNEL=chrome to use Chrome, or CHROME_BIN=/path/to/chrome for a specific binary)
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
const SUITE = `${BASE}/av-suite.html?entry=show`;
const KEY = 'av-suite-dashboard.v1';

const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
const dir = await mkdtemp(join(tmpdir(), 'av-suite-import-'));

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

async function fixture(name, value) {
  const file = join(dir, name);
  await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value));
  return file;
}

const SAVED = {
  schema: 'system-by-dave.av-suite.v1',
  showName: 'Spring Gala 2026',
  venue: 'Hall A',
  phase: 'prep',
  favorites: ['teleprompter', 'cue-sheet'],
  readiness: { 'cue-sheet': 'ready' },
  toolNotes: { 'cue-sheet': 'check IEMs' },
};

// Opens the suite with SAVED in storage and returns the page plus a dialog log.
async function openWithShow(dialogAnswer) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const dialogs = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    if (dialogAnswer) await dialog.accept();
    else await dialog.dismiss();
  });
  await page.goto(SUITE, { waitUntil: 'networkidle' });
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [KEY, SAVED]);
  await page.reload({ waitUntil: 'networkidle' });
  return { context, page, dialogs, errors };
}

const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), KEY);
const toast = (page) => page.locator('#toastMsg').innerText();

async function importSuite(page, file) {
  await page.locator('#suiteImportInput').setInputFiles(file);
  await page.waitForTimeout(400);
}

await check('wrong-schema suite JSON is rejected and the show is kept', async () => {
  const { context, page, dialogs, errors } = await openWithShow(true);
  await importSuite(page, await fixture('wrong.json', { hello: 'world' }));
  const state = await saved(page);
  const message = await toast(page);
  await context.close();
  assert(state.showName === 'Spring Gala 2026' && state.venue === 'Hall A', `show changed to ${JSON.stringify(state.showName)}`);
  assert(state.readiness && state.readiness['cue-sheet'] === 'ready', 'readiness was cleared');
  assert(/missing valid AV by Dave state/.test(message), `unexpected message: ${message}`);
  assert(dialogs.length === 0, 'asked for confirmation before rejecting');
  assert(errors.length === 0, errors.join('; '));
  return message;
});

await check('a suite JSON with a foreign schema is rejected', async () => {
  const { context, page } = await openWithShow(true);
  await importSuite(page, await fixture('foreign.json', { schema: 'system-by-dave.cue-sheet.v2', showName: 'Other' }));
  const state = await saved(page);
  await context.close();
  assert(state.showName === 'Spring Gala 2026', `show changed to ${JSON.stringify(state.showName)}`);
});

await check('malformed JSON reports an error and keeps the show', async () => {
  const { context, page } = await openWithShow(true);
  await importSuite(page, await fixture('broken.json', '{"showName": 12'));
  const state = await saved(page);
  const message = await toast(page);
  await context.close();
  assert(state.showName === 'Spring Gala 2026', 'show changed');
  assert(/not valid JSON/.test(message), `unexpected message: ${message}`);
});

await check('declining the confirmation keeps the current show', async () => {
  const { context, page, dialogs } = await openWithShow(false);
  await importSuite(page, await fixture('valid.json', { schema: 'system-by-dave.av-suite.v1', showName: 'Winter Keynote', venue: 'Hall B' }));
  const state = await saved(page);
  const message = await toast(page);
  await context.close();
  assert(dialogs.length === 1 && /Spring Gala 2026/.test(dialogs[0]), `confirmation not shown: ${JSON.stringify(dialogs)}`);
  assert(state.showName === 'Spring Gala 2026' && state.venue === 'Hall A', 'show replaced after cancel');
  assert(/cancelled/i.test(message), `unexpected message: ${message}`);
});

await check('accepting replaces the show and Undo restores it', async () => {
  const { context, page } = await openWithShow(true);
  await importSuite(page, await fixture('valid.json', { schema: 'system-by-dave.av-suite.v1', showName: 'Winter Keynote', venue: 'Hall B' }));
  const replaced = await saved(page);
  assert(replaced.showName === 'Winter Keynote' && replaced.venue === 'Hall B', `import not applied: ${replaced.showName}`);
  await page.locator('#toastUndoBtn').click();
  await page.waitForTimeout(200);
  const restored = await saved(page);
  await context.close();
  assert(restored.showName === 'Spring Gala 2026' && restored.venue === 'Hall A', `undo did not restore: ${restored.showName}`);
  assert(restored.toolNotes && restored.toolNotes['cue-sheet'] === 'check IEMs', 'undo lost tool notes');
});

await check('legacy suite JSON without a schema field still imports', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const dialogs = [];
  page.on('dialog', async (dialog) => { dialogs.push(dialog.message()); await dialog.accept(); });
  await page.goto(SUITE, { waitUntil: 'networkidle' });
  await importSuite(page, await fixture('legacy.json', { showName: 'Legacy Show', readiness: { 'show-timer': 'issue' } }));
  const state = await saved(page);
  await context.close();
  assert(state.showName === 'Legacy Show', `legacy import failed: ${JSON.stringify(state.showName)}`);
  assert(dialogs.length === 0, 'asked for confirmation with no show saved');
});

await check('a show package with an invalid suite block is rejected', async () => {
  const { context, page } = await openWithShow(true);
  await page.locator('#packageImportInput').setInputFiles(await fixture('package.json', { schema: 'system-by-dave.av-suite-package.v1', suite: { hello: 'world' }, toolData: [] }));
  await page.waitForTimeout(400);
  const state = await saved(page);
  const message = await toast(page);
  await context.close();
  assert(state.showName === 'Spring Gala 2026', 'package replaced the show');
  assert(/wrong schema/.test(message), `unexpected message: ${message}`);
});

await browser.close();
server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} AV suite import checks passed`);
process.exit(failed.length ? 1 : 0);
