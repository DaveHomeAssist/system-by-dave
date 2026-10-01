#!/usr/bin/env node
// Browser regression probe for show-context fill (docs/av-suite-consolidation-stage2-video.md, V0-1).
// Serves the repository and opens Video tools three times with the same console show link. Each
// show detail must land in exactly one field: the operator name goes only into the field marked
// data-sbd-context="operator", repeat visits change nothing, and tools without an operator field
// never receive the name.
//
// Usage: node scripts/probe_av_context_fill.mjs [--no-sandbox]
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
const SHOW = 'Probe Show';
const OPERATOR = 'Pat Lee';
const QUERY = `?sbdShow=${encodeURIComponent(SHOW)}&sbdOperator=${encodeURIComponent(OPERATOR)}`;
const VISITS = 3;

// Tools with an operator target: that field, and only that field, takes the operator name.
// `people` lists every name field in the tool's saved meta (field matrix in the Stage 2 plan).
const FILLED = [
  { page: 'playback-check.html', key: 'playback-check.v1', operator: 'playbackOp', people: ['playbackOp', 'tdName', 'audioLead'] },
  { page: 'signal-flow.html', key: 'signal-flow.v1', operator: 'videoLead', people: ['videoLead', 'audioLead', 'networkLead', 'tdName'] },
  { page: 'record-log.html', key: 'record-log.v1', operator: 'recordOp', people: ['recordOp', 'producer', 'audioLead', 'handoffTo'] },
  { page: 'stream-plan.html', key: 'sbd.streamPlan.v1', operator: 'streamTech', people: ['streamTech', 'producer', 'handoffTo'] },
  { page: 'display-plan.html', key: 'display-plan.v1', operator: 'lead', people: ['lead', 'processor', 'handoffTo'] },
];
// Tools without an operator field: the name must not be written anywhere in their meta.
const UNTOUCHED = [
  { page: 'video-patch.html', key: 'sbd.videoPatch.v1' },
  { page: 'projection-plan.html', key: 'sbd.projectionPlan.v1' },
  { page: 'camera-shot-list.html', key: 'camera-shot-list.v1' },
];

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

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
}

async function storedMeta(page, key) {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), key);
  assert(raw !== null, `${key} was never saved`);
  const meta = JSON.parse(raw).meta;
  assert(meta && typeof meta === 'object', `${key} has no meta`);
  return meta;
}

// Starts a tool from empty storage so the first linked visit takes the fill path (no saved show
// means no Keep / Switch choice). Returns the page and the tool's own default name fields.
async function freshTool(context, tool) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${BASE}/${tool.page}`, { waitUntil: 'networkidle' });
  const defaults = tool.people ? await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, document.getElementById(id)?.value ?? null])), tool.people) : {};
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  return { page, errors, defaults };
}

for (const tool of FILLED) {
  await check(`${tool.page}: ${VISITS} visits put "${OPERATOR}" only in #${tool.operator}`, async () => {
    const context = await browser.newContext();
    const { page, errors, defaults } = await freshTool(context, tool);
    let first = null;
    try {
      for (let visit = 1; visit <= VISITS; visit += 1) {
        if (visit === 1) await page.goto(`${BASE}/${tool.page}${QUERY}`);
        else await page.reload();
        await settle(page);
        assert(await page.locator('[data-sbd-context-choice]').count() === 0, `visit ${visit} asked Keep / Switch`);
        const marked = await page.evaluate(() => [...document.querySelectorAll('[data-sbd-context="operator"]')].map((el) => el.id));
        assert(marked.length === 1 && marked[0] === tool.operator, `operator target is ${JSON.stringify(marked)}`);
        const meta = await storedMeta(page, tool.key);
        assert(meta.showName === SHOW, `visit ${visit}: showName is ${JSON.stringify(meta.showName)}`);
        assert(meta[tool.operator] === OPERATOR, `visit ${visit}: ${tool.operator} is ${JSON.stringify(meta[tool.operator])}`);
        for (const field of tool.people) {
          if (field === tool.operator) continue;
          assert(meta[field] !== OPERATOR, `visit ${visit}: operator name written into ${field}`);
          assert(meta[field] === defaults[field], `visit ${visit}: ${field} changed from ${JSON.stringify(defaults[field])} to ${JSON.stringify(meta[field])}`);
        }
        if (visit === 1) first = meta;
        else assert(JSON.stringify(meta) === JSON.stringify(first), `visit ${visit} changed saved meta: ${JSON.stringify(meta)}`);
      }
      assert(errors.length === 0, errors.join('; '));
      return `other names kept: ${tool.people.filter((field) => field !== tool.operator).map((field) => `${field}=${JSON.stringify(first[field])}`).join(', ')}`;
    } finally {
      await context.close();
    }
  });
}

for (const tool of UNTOUCHED) {
  await check(`${tool.page}: ${VISITS} visits write "${OPERATOR}" nowhere`, async () => {
    const context = await browser.newContext();
    const { page, errors } = await freshTool(context, tool);
    try {
      for (let visit = 1; visit <= VISITS; visit += 1) {
        if (visit === 1) await page.goto(`${BASE}/${tool.page}${QUERY}`);
        else await page.reload();
        await settle(page);
        assert(await page.locator('[data-sbd-context="operator"]').count() === 0, 'page has an operator target');
        const meta = await storedMeta(page, tool.key);
        assert(meta.showName === SHOW, `visit ${visit}: showName is ${JSON.stringify(meta.showName)}`);
        const holders = Object.keys(meta).filter((field) => meta[field] === OPERATOR);
        assert(holders.length === 0, `visit ${visit}: operator name written into ${holders.join(', ')}`);
      }
      assert(errors.length === 0, errors.join('; '));
    } finally {
      await context.close();
    }
  });
}

await browser.close();
server.close();
const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} AV context fill checks passed`);
process.exit(failed.length ? 1 : 0);
