#!/usr/bin/env node
// Regression probe for SEC-001 (teleprompter rich-text sanitizer) and SEC-002 (OnTrack
// backup import): hostile markup in stored/imported data must never execute, and the
// imported records must be normalised.
//
// Usage: node scripts/probe_import_xss.mjs [--no-sandbox]
//   CHROME_CHANNEL=chrome  use installed Chrome;  CHROME_BIN=<path>  use a specific binary
//   --teleprompter-file=<path> / --ontrack-file=<path>  serve a different file at that
//   route (used to prove the probe fails against the pre-fix pages).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const argValue = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const overrides = {
  '/teleprompter.html': argValue('teleprompter-file'),
  '/ontrack.html': argValue('ontrack-file')
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    const file = overrides[pathname] ? resolve(overrides[pathname]) : normalize(join(ROOT, pathname === '/' ? 'index.html' : pathname));
    if (!overrides[pathname] && !file.startsWith(ROOT)) throw new Error('outside root');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const BASE = `http://127.0.0.1:${server.address().port}`;

const launchOptions = { headless: true };
if (process.env.CHROME_CHANNEL) launchOptions.channel = process.env.CHROME_CHANNEL;
else if (process.env.CHROME_BIN) launchOptions.executablePath = process.env.CHROME_BIN;
if (args.includes('--no-sandbox')) launchOptions.args = ['--no-sandbox'];
const browser = await chromium.launch(launchOptions);

const failures = [];
let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name}: ${error.message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('import XSS regression probe');

await check('SEC-001 teleprompter: stored rich HTML cannot execute and is sanitised', async () => {
  const page = await (await browser.newContext()).newPage();
  await page.addInitScript(() => {
    localStorage.setItem('teleprompter.script.v2',
      '<b>hello</b><img src="x:bad" onerror="window.__xss=1"><script>window.__xss=2<\/script><span style="color:red;background:url(x)">ok</span>');
  });
  await page.goto(`${BASE}/teleprompter.html`);
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => ({
    fired: window.__xss === undefined ? null : window.__xss,
    editor: (document.querySelector('[contenteditable]') || {}).innerHTML || ''
  }));
  assert(state.fired === null, `hostile handler ran (window.__xss=${state.fired})`);
  assert(state.editor.includes('<b>hello</b>'), `allowed markup was lost: ${state.editor}`);
  assert(!/<img|<script|onerror|url\(/i.test(state.editor), `unsafe markup survived: ${state.editor}`);
  await page.close();
});

await check('SEC-002 OnTrack: hostile backup fields cannot execute and are normalised', async () => {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASE}/ontrack.html`);
  await page.waitForTimeout(800);
  const evil = (n) => `"><img src=x:bad onerror="window.__xss=${n}">`;
  const backup = {
    app: 'ontrack',
    tracks: {},
    notes: [],
    sets: [
      { id: 's1', name: 'x', kind: `played${evil(1)}`, date: `2026-01-01${evil(2)}`, trackIds: [] },
      { id: `s2${evil(3)}`, name: 'bad id', kind: 'planned', date: '2026-01-02', trackIds: [] },
      { id: 'ok1', name: 'good', kind: 'played', date: '2026-02-03', trackIds: [] }
    ]
  };
  await page.setInputFiles('#fileJson', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => ({
    fired: window.__xss === undefined ? null : window.__xss,
    sets: [...document.querySelectorAll('.setitem')].map((e) => ({
      id: e.dataset.id,
      kind: e.querySelector('.kind').className,
      text: e.textContent.replace(/\s+/g, ' ').trim()
    }))
  }));
  assert(state.fired === null, `hostile handler ran (window.__xss=${state.fired})`);
  assert(state.sets.length === 2, `expected 2 sets (bad-id set dropped), got ${state.sets.length}`);
  assert(state.sets.some((s) => s.id === 's1' && s.kind === 'kind planned'), 'hostile kind was not coerced to planned');
  assert(state.sets.some((s) => s.id === 's1' && !/2026-01-01/.test(s.text)), 'hostile date was not blanked');
  assert(state.sets.some((s) => s.id === 'ok1' && s.kind === 'kind played' && /2026-02-03/.test(s.text)), 'valid set was not preserved intact');
  await page.close();
});

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} failed, ${passed} passed` : `\nall ${passed} passed`);
process.exit(failures.length ? 1 : 0);
