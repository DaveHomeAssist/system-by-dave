#!/usr/bin/env node
// Browser probe for the Sync & Signal Field Kit draft (docs/launch/README.md).
// Local only (not wired into CI). The frame-sync demo itself is demos/frame-sync.html
// (checked by demos/check-states.js). This checks the Field Kit page on phone
// (390x844) and desktop (1280x800): noindex, TBD price, no console errors or
// horizontal scroll, and that checkout stays closed until both a valid provider
// link, a real price and the [DAVE] terms are in place, plus the noindex
// after-payment download page (field-kit/thanks/).
//   node scripts/launch/probe_field_kit.mjs [--screens /path/to/dir]
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const screensArg = args.indexOf('--screens');
const SCREENS = screensArg >= 0 ? path.resolve(args[screensArg + 1]) : '';
if (SCREENS) fs.mkdirSync(SCREENS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const failures = [];
const notes = [];
const fail = (m) => failures.push(m);

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

async function open(url, viewport, options = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 600, isMobile: viewport.width < 600, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    window.__events = [];
    window.addEventListener('sbd:event', (e) => window.__events.push({ name: e.detail.name, props: e.detail.props, at: performance.now() }));
  });
  if (options.routes) for (const [pattern, handler] of options.routes) await context.route(pattern, handler);
  await page.goto(`${BASE}${url}`);
  await page.waitForLoadState('load');
  return { page, context, errors };
}
async function noHorizontalScroll(page, label) {
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (m.sw > m.cw) fail(`${label}: horizontal scroll (${m.sw} > ${m.cw})`);
}
async function shotFull(page, name) { if (SCREENS) await page.screenshot({ path: path.join(SCREENS, name), fullPage: true }); }

const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };

try {
  // Every provider request is answered by a local route; nothing reaches a real service.
  const cfgScript = (checkout, priceLabel) => `window.SBD_LAUNCH={analytics:{provider:null},fieldKit:{checkout:${JSON.stringify(checkout || { provider: null, url: '', mode: 'link' })},priceLabel:${JSON.stringify(priceLabel)}}};`;
  async function openWith(url, checkout, extraRoutes = [], viewport = VIEWPORTS.phone, priceLabel = '$12') {
    const hits = [];
    const routes = [
      ['**/js/sbd-launch-config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: cfgScript(checkout, priceLabel) })],
      // Playwright tries the most recently added route first, so the catch-all goes first.
      [/^https:\/\//, (route) => { const r = route.request(); hits.push({ url: r.url(), method: r.method(), body: r.postData() || '' }); return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' }); }],
      ...extraRoutes
    ];
    const opened = await open(url, viewport, { routes });
    return { ...opened, hits };
  }

  // 1. Field Kit checkout: closed until configured AND the [DAVE] terms are filled in.
  const noPlaceholders = ['**/field-kit/', async (route) => {
    const html = fs.readFileSync(path.join(ROOT, 'field-kit/index.html'), 'utf8').replace(/ data-dave-placeholder/g, '');
    await route.fulfill({ contentType: 'text/html', body: html });
  }];
  {
    const { page, context } = await openWith('/field-kit/', { provider: 'gumroad', url: 'https://avbydave.gumroad.com/l/fieldkit', mode: 'link' });
    if (!(await page.locator('#kit-buy').isHidden()) || await page.locator('#kit-buy-disabled').isHidden()) fail('checkout opened while [DAVE] placeholders remain');
    await context.close();
  }
  {
    const { page, context } = await openWith('/field-kit/', { provider: 'gumroad', url: 'https://avbydave.gumroad.com/l/fieldkit', mode: 'link' }, [noPlaceholders]);
    if (await page.locator('#kit-buy').isHidden() || (await page.getAttribute('#kit-buy', 'href')) !== 'https://avbydave.gumroad.com/l/fieldkit' || !(await page.locator('#kit-buy-disabled').isHidden())) fail('gumroad link checkout did not open');
    await shotFull(page, 'field-kit-checkout-configured-phone.png');
    await context.close();
  }
  {
    const { page, context, errors } = await openWith('/field-kit/', { provider: 'lemonsqueezy', url: 'https://avbydave.lemonsqueezy.com/checkout/buy/abc', mode: 'overlay' }, [noPlaceholders]);
    const href = await page.getAttribute('#kit-buy', 'href');
    const cls = await page.getAttribute('#kit-buy', 'class');
    if (!/embed=1/.test(href || '') || !/lemonsqueezy-button/.test(cls || '')) fail(`lemon squeezy overlay not prepared (${href}, ${cls})`);
    if (await page.locator('#kit-buy').isHidden()) fail('lemon squeezy: link hidden when the overlay script is blocked');
    notes.push(`checkout lemonsqueezy overlay without the CSP change: script ${errors.some((e) => /Content Security Policy/.test(e)) ? 'blocked by CSP as documented' : 'not blocked'}, button stays a working link`);
    await context.close();
  }
  for (const bad of [{ provider: 'stripe', url: 'https://evil.example/pay', mode: 'link' }, { provider: 'stripe', url: 'http://buy.stripe.com/x', mode: 'link' }, { provider: 'paypal', url: 'https://buy.stripe.com/x', mode: 'link' }]) {
    const { page, context } = await openWith('/field-kit/', bad, [noPlaceholders]);
    if (!(await page.locator('#kit-buy').isHidden())) fail(`checkout accepted a bad link ${JSON.stringify(bad)}`);
    await context.close();
  }
  {
    const { page, context } = await openWith('/field-kit/', { provider: 'stripe', url: 'https://buy.stripe.com/test_123', mode: 'overlay' }, [noPlaceholders]);
    if ((await page.getAttribute('#kit-buy', 'target')) !== '_blank') fail('stripe: overlay request did not fall back to a new-tab link');
    await context.close();
  }
  for (const priceLabel of ['Price TBD', '[DAVE: price, e.g. $12]', '']) {
    const { page, context } = await openWith('/field-kit/', { provider: 'stripe', url: 'https://buy.stripe.com/test_123', mode: 'link' }, [noPlaceholders], VIEWPORTS.phone, priceLabel);
    if (!(await page.locator('#kit-buy').isHidden())) fail(`checkout opened with placeholder price ${JSON.stringify(priceLabel)}`);
    if (!/TBD/.test(await page.textContent('#kit-price'))) fail(`placeholder price ${JSON.stringify(priceLabel)} was shown on the page`);
    await context.close();
  }
  {
    const { page, context } = await openWith('/field-kit/', { provider: 'stripe', url: 'https://buy.stripe.com/test_123', mode: 'link' }, [noPlaceholders]);
    if (await page.locator('#kit-buy').isHidden() || (await page.getAttribute('#kit-buy', 'href')) !== 'https://buy.stripe.com/test_123') fail('stripe link checkout did not open with a real price');
    if (!/\$12/.test(await page.textContent('#kit-price'))) fail('real price not shown');
    if (!/download link appears right after payment/.test(await page.textContent('#kit-buy-note'))) fail('buy note does not describe the after-payment download page');
    await context.close();
  }
  notes.push('checkout: closed while [DAVE] placeholders remain or the price is a placeholder (Price TBD, [DAVE: …], empty); gumroad link, lemonsqueezy overlay (embed=1 + class) and stripe new-tab work; non-provider hosts, http and unknown providers stay closed');

  // 2. Field Kit draft page.
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    const { page, context, errors } = await open('/field-kit/', viewport);
    await noHorizontalScroll(page, `field kit ${label}`);
    const robots = await page.getAttribute('meta[name="robots"]', 'content');
    if (!/noindex/.test(robots || '')) fail('Field Kit draft is not noindex');
    const shownPrice = await page.textContent('#kit-price');
    if (!/^\$12/.test(shownPrice.trim()) || /not set yet|TBD/.test(shownPrice)) fail(`Field Kit should show the $12 price (got ${JSON.stringify(shownPrice)})`);
    if (!(await page.locator('#kit-buy').isHidden()) || await page.locator('#kit-buy-disabled').isHidden()) fail('shipped config opened checkout (Payment Link is still a placeholder)');
    if (errors.length) fail(`field kit ${label} console errors: ${errors.join(' | ')}`);
    await shotFull(page, `field-kit-${label}.png`);
    await context.close();
  }
  notes.push('shipped config (Stripe, [DAVE] Payment Link placeholder, price $12): $12 shown, checkout closed');

  // 3. After-payment download page (Stripe redirect target).
  const DL = 'https://drive.google.com/drive/folders/abc123';
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    const { page, context, errors } = await open(`/field-kit/thanks/?dl=${encodeURIComponent(DL)}&session_id=cs_test_a1B2c3D4e5F6g7H8`, viewport);
    const robots = await page.getAttribute('meta[name="robots"]', 'content');
    if (!/noindex/.test(robots || '')) fail('thanks page is not noindex');
    if (await page.locator('#ty-ready').isHidden() || (await page.getAttribute('#ty-download', 'href')) !== DL) fail(`thanks ${label}: download button missing for an allowed host`);
    if (await page.evaluate(() => location.search)) fail(`thanks ${label}: query not removed from the address bar`);
    if (!/e5F6g7H8/.test(await page.textContent('#ty-ref'))) fail(`thanks ${label}: order reference not shown`);
    if (await page.locator('#ty-paid').isHidden()) fail(`thanks ${label}: payment line hidden despite a Stripe session id`);
    await page.reload(); await page.waitForLoadState('load');
    if (await page.locator('#ty-ready').isHidden()) fail(`thanks ${label}: button lost after reload in the same tab`);
    await noHorizontalScroll(page, `thanks ${label}`);
    if (errors.length) fail(`thanks ${label} console errors: ${errors.join(' | ')}`);
    await shotFull(page, `field-kit-thanks-${label}.png`);
    await context.close();
  }
  for (const bad of ['https://evil.example/kit.zip', 'http://drive.google.com/x', 'javascript:alert(1)', 'https://drive.google.com.evil.example/x', '']) {
    const { page, context } = await open(`/field-kit/thanks/?dl=${encodeURIComponent(bad)}`, VIEWPORTS.phone);
    if (!(await page.locator('#ty-ready').isHidden()) || await page.locator('#ty-missing').isHidden()) fail(`thanks accepted a bad link ${JSON.stringify(bad)}`);
    if (!(await page.locator('#ty-paid').isHidden()) || /Thanks/.test(await page.textContent('#ty-title'))) fail('thanks page claims a payment without a Stripe session id');
    await context.close();
  }
  notes.push('thanks page: noindex, button only for https links on known file hosts, query stripped, survives reload, bad links fall back to "email me"');
} finally {
  await browser.close();
  server.close();
}

notes.forEach((n) => console.log(`- ${n}`));
if (failures.length) {
  console.error('Field Kit probe failed:');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Field Kit probe passed.');
