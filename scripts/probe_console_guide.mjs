#!/usr/bin/env node
// Browser probe for the Lighting Console Spec Guide (console-guide/). Local only,
// not wired into CI. Phone (375x812) and desktop (1280x800): the JSON loads, every
// row has an https source, search and the brand/size/type filters work, no
// horizontal scroll, no console errors, no off-site requests, no images, and the
// Field Kit CTA points at avbydave.com/field-kit/.
//   node scripts/probe_console_guide.mjs [--screens /path/to/dir]
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const si = args.indexOf('--screens');
const SCREENS = si >= 0 ? path.resolve(args[si + 1]) : '';
if (SCREENS) fs.mkdirSync(SCREENS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const failures = [];
const notes = [];
const fail = (m) => failures.push(m);

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'console-guide/consoles.json'), 'utf8'));
const rows = data.consoles;
for (const r of rows) {
  if (!/^https:\/\//.test(r.source || '')) fail(`${r.model}: source is not https`);
  for (const u of Object.values(r.fieldSources || {})) if (!/^https:\/\//.test(u)) fail(`${r.model}: field source is not https`);
}
if (new Set(rows.map((r) => r.id)).size !== rows.length) fail('duplicate row ids');
notes.push(`data: ${rows.length} rows, all with https sources`);

const server = await new Promise((resolve) => {
  const s = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const VIEWPORTS = { phone: { width: 375, height: 812 }, desktop: { width: 1280, height: 800 } };

try {
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
    const page = await context.newPage();
    const errors = [];
    const offsite = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) offsite.push(r.url()); });
    await page.goto(`${BASE}/console-guide/`);
    await page.waitForSelector('#cg-body tr');
    const count = async () => page.locator('#cg-body tr').count();
    const noScroll = async (what) => {
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (m.sw > m.cw) fail(`${label} ${what}: horizontal scroll (${m.sw} > ${m.cw})`);
    };
    if ((await count()) !== rows.length) fail(`${label}: shows ${await count()} rows, expected ${rows.length}`);
    if (!new RegExp(`of ${rows.length} consoles`).test(await page.textContent('#cg-status'))) fail(`${label}: status line wrong`);
    if (await page.locator('img').count()) fail(`${label}: page has images (photos should be links out)`);
    await noScroll('initial');
    if (SCREENS) await page.screenshot({ path: path.join(SCREENS, `console-guide-${label}-top.png`) });
    if (SCREENS) await page.screenshot({ path: path.join(SCREENS, `console-guide-${label}-full.png`), fullPage: true });

    await page.fill('#cg-q', 'apex');
    const apex = rows.filter((r) => /apex/i.test(r.model)).length;
    if ((await count()) !== apex) fail(`${label}: search "apex" shows ${await count()}, expected ${apex}`);
    if (!/q=apex/.test(page.url())) fail(`${label}: search not kept in the URL`);
    await page.fill('#cg-q', '64 universes');
    if ((await count()) < 1) fail(`${label}: search "64 universes" found nothing`);
    notes.push(`${label}: search "64 universes" -> ${await count()} rows`);
    await page.fill('#cg-q', 'zzzz-no-such-console');
    if (!(await page.locator('#cg-empty').isVisible())) fail(`${label}: empty state not shown`);
    await page.click('#cg-empty-reset');
    await page.waitForTimeout(50);
    if ((await count()) !== rows.length) fail(`${label}: clear did not restore all rows`);

    await page.selectOption('#cg-brand', 'ChamSys');
    const chamsys = rows.filter((r) => r.brand === 'ChamSys').length;
    if ((await count()) !== chamsys) fail(`${label}: brand ChamSys shows ${await count()}, expected ${chamsys}`);
    await page.selectOption('#cg-size', 's');
    const chS = rows.filter((r) => r.brand === 'ChamSys' && r.widthMm != null && r.widthMm < 600).length;
    if ((await count()) !== chS) fail(`${label}: ChamSys + small shows ${await count()}, expected ${chS}`);
    if (SCREENS) await page.screenshot({ path: path.join(SCREENS, `console-guide-${label}-chamsys-small.png`), fullPage: true });
    await noScroll('filtered');
    await page.selectOption('#cg-brand', '');
    await page.selectOption('#cg-size', 'l');
    const large = rows.filter((r) => r.widthMm >= 1000).length;
    if ((await count()) !== large) fail(`${label}: large shows ${await count()}, expected ${large}`);
    await page.selectOption('#cg-size', '');
    await page.uncheck('#cg-wings');
    const consoles = rows.filter((r) => r.type === 'console').length;
    if ((await count()) !== consoles) fail(`${label}: consoles-only shows ${await count()}, expected ${consoles}`);
    await page.uncheck('#cg-legacy');
    const cur = rows.filter((r) => r.type === 'console' && r.status === 'current').length;
    if ((await count()) !== cur) fail(`${label}: current consoles shows ${await count()}, expected ${cur}`);
    await page.check('#cg-wings'); await page.check('#cg-legacy');
    await page.selectOption('#cg-sort', 'kg');
    const firstModel = (await page.locator('#cg-body tr .cg-model').first().textContent()).trim();
    const lightest = [...rows].filter((r) => r.weightKg != null).sort((a, b) => a.weightKg - b.weightKg)[0].model;
    if (firstModel !== lightest) fail(`${label}: weight sort starts with ${firstModel}, expected ${lightest}`);

    await page.goto(`${BASE}/console-guide/?brand=${encodeURIComponent('MA Lighting (grandMA)')}`);
    await page.waitForSelector('#cg-body tr');
    if ((await count()) !== rows.filter((r) => r.brand === 'MA Lighting (grandMA)').length) fail(`${label}: brand from URL not applied`);

    const cta = await page.getAttribute('.cg-cta a', 'href');
    if (!/^https:\/\/avbydave\.com\/field-kit\//.test(cta || '')) fail(`${label}: Field Kit CTA href is ${cta}`);
    const links = await page.locator('#cg-body a').evaluateAll((as) => as.map((a) => [a.href, a.target, a.rel]));
    if (links.some(([h, t, r]) => !h.startsWith('https://') || t !== '_blank' || !/noopener/.test(r))) fail(`${label}: an outbound link is not https/_blank/noopener`);
    if (errors.length) fail(`${label}: console errors: ${errors.join(' | ')}`);
    if (offsite.length) fail(`${label}: off-site requests: ${[...new Set(offsite)].join(', ')}`);
    await context.close();
  }
  notes.push('phone 375 and desktop 1280: all rows load, search/brand/size/type/legacy/sort/URL state work, no horizontal scroll, no images, no off-site requests, CTA to avbydave.com/field-kit/');
} finally {
  await browser.close();
  server.close();
}
for (const n of notes) console.log(`- ${n}`);
if (failures.length) { for (const f of failures) console.log(`FAIL ${f}`); process.exit(1); }
console.log('Console guide probe passed.');
