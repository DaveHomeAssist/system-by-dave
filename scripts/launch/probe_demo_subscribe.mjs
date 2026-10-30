#!/usr/bin/env node
// Browser probe for the demos' post-completion email ask (demos/demo-shell.js,
// docs/launch/email.md). Local only (not wired into CI). Checks, on phone and
// desktop, that the shipped placeholder leaves the ask as it was (no link, no
// broken state), that a beehiiv subscribe URL turns it into a UTM-tagged
// new-tab link (rel=noopener) with no CSP errors, and that anything that isn't
// an https beehiiv.com link is ignored.
//   node scripts/launch/probe_demo_subscribe.mjs [--screens /path/to/dir]
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
const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };
const SHIPPED = fs.readFileSync(path.join(ROOT, 'demos/config.js'), 'utf8');
const shippedValue = (SHIPPED.match(/emailSubscribeUrl:\s*'([^']*)'/) || [])[1];
if (!shippedValue || !/^\[DAVE/.test(shippedValue)) fail(`demos/config.js emailSubscribeUrl is not the marked [DAVE: …] placeholder (${shippedValue})`);

// config: null = the shipped file; otherwise emailSubscribeUrl (and emailFormAction) replaced.
async function openDemo(demo, viewport, { subscribe = null, formAction = null, query = '' } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 600, isMobile: viewport.width < 600 });
  const errors = [];
  const external = [];
  await context.route(/^https:\/\//, (route) => { external.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' }); });
  if (subscribe !== null || formAction !== null) {
    let body = SHIPPED;
    if (subscribe !== null) body = body.replace(/emailSubscribeUrl:\s*'[^']*'/, `emailSubscribeUrl: ${JSON.stringify(subscribe)}`);
    if (formAction !== null) body = body.replace(/emailFormAction:\s*'[^']*'/, `emailFormAction: ${JSON.stringify(formAction)}`);
    await context.route('**/demos/config.js', (route) => route.fulfill({ contentType: 'text/javascript', body }));
  }
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/demos/${demo}${query}`);
  await page.waitForLoadState('load');
  await page.evaluate(() => window.sbdComplete && window.sbdComplete());
  await page.waitForSelector('#sbd-after:not([hidden])', { timeout: 5000 }).catch(() => fail(`${demo}: completion panel did not appear`));
  return { page, context, errors, external };
}
const ignore404 = (errors) => errors.filter((e) => !/favicon|404/.test(e));

try {
  for (const demo of ['frame-sync.html', 'fault-finding.html']) {
    for (const [label, viewport] of Object.entries(VIEWPORTS)) {
      // 1. Shipped config: placeholder -> exactly the no-provider ask; no link, no form.
      {
        const { page, context, errors } = await openDemo(demo, viewport);
        if (await page.locator('#sbd-subscribe').count()) fail(`${demo} ${label}: subscribe link shown with the placeholder`);
        if (await page.locator('#sbd-after form').count()) fail(`${demo} ${label}: form shown with no form action`);
        if (!/next demo is coming/i.test(await page.textContent('#sbd-after'))) fail(`${demo} ${label}: no-provider message missing`);
        if (/\[DAVE|undefined|null/.test(await page.textContent('#sbd-after'))) fail(`${demo} ${label}: placeholder or broken text visible`);
        if (ignore404(errors).length) fail(`${demo} ${label} console errors (shipped): ${errors.join(' | ')}`);
        if (SCREENS) await page.screenshot({ path: path.join(SCREENS, `${demo.replace('.html', '')}-ask-shipped-${label}.png`) });
        await context.close();
      }
      // 2. beehiiv URL set: link replaces the form (even if a form action is also set).
      {
        const { page, context, errors, external } = await openDemo(demo, viewport, { subscribe: 'https://avbydave.beehiiv.com/subscribe', formAction: 'https://buttondown.com/api/emails/embed-subscribe/x' });
        const a = page.locator('#sbd-subscribe');
        if (!(await a.count())) { fail(`${demo} ${label}: subscribe link missing`); await context.close(); continue; }
        const href = new URL(await a.getAttribute('href'));
        if (href.origin + href.pathname !== 'https://avbydave.beehiiv.com/subscribe') fail(`${demo} ${label}: wrong subscribe target ${href}`);
        const want = { utm_source: 'avbydave', utm_medium: 'demo', utm_campaign: 'demos', utm_content: demo.replace('.html', '') };
        for (const [k, v] of Object.entries(want)) if (href.searchParams.get(k) !== v) fail(`${demo} ${label}: ${k}=${href.searchParams.get(k)}, want ${v}`);
        if ((await a.getAttribute('rel')) !== 'noopener' || (await a.getAttribute('target')) !== '_blank') fail(`${demo} ${label}: link is not target=_blank rel=noopener`);
        if (await page.locator('#sbd-after form').count()) fail(`${demo} ${label}: form still shown next to the subscribe link`);
        const box = await a.boundingBox();
        if (!box || box.height < 44) fail(`${demo} ${label}: subscribe button smaller than 44px (${box && box.height})`);
        const [popup] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }).catch(() => null), a.click()]);
        if (!popup) fail(`${demo} ${label}: click did not open a new tab`);
        else {
          await popup.waitForLoadState('load').catch(() => {});
          if (!/avbydave\.beehiiv\.com\/subscribe/.test(popup.url())) fail(`${demo} ${label}: new tab at ${popup.url()}`);
          if (await popup.evaluate(() => window.opener !== null)) fail(`${demo} ${label}: new tab kept window.opener`);
        }
        if (!external.some((u) => /beehiiv/.test(u))) fail(`${demo} ${label}: no request reached the (mocked) beehiiv page`);
        if (errors.some((e) => /Content Security Policy/.test(e))) fail(`${demo} ${label}: CSP blocked the link: ${errors.join(' | ')}`);
        if (ignore404(errors).length) fail(`${demo} ${label} console errors (link): ${errors.join(' | ')}`);
        if (SCREENS) await page.screenshot({ path: path.join(SCREENS, `${demo.replace('.html', '')}-ask-beehiiv-${label}.png`) });
        await context.close();
      }
    }
    // 3. Visitor UTM tags pass through unchanged.
    {
      const q = '?utm_source=instagram&utm_medium=dm&utm_campaign=framesync_launch&utm_content=reel_main&fbclid=zzz';
      const { page, context } = await openDemo(demo, VIEWPORTS.phone, { subscribe: 'https://avbydave.beehiiv.com/subscribe', query: q });
      const href = new URL(await page.getAttribute('#sbd-subscribe', 'href'));
      const want = { utm_source: 'instagram', utm_medium: 'dm', utm_campaign: 'framesync_launch', utm_content: 'reel_main' };
      for (const [k, v] of Object.entries(want)) if (href.searchParams.get(k) !== v) fail(`${demo}: visitor ${k} not passed (${href.searchParams.get(k)})`);
      if (href.searchParams.has('fbclid')) fail(`${demo}: non-UTM parameter leaked to beehiiv`);
      await context.close();
    }
    // 4. Anything that isn't an https beehiiv.com link is ignored (falls back to today's ask).
    for (const bad of ['', '[DAVE: beehiiv subscribe URL]', 'http://avbydave.beehiiv.com/subscribe', 'https://beehiiv.com.evil.example/subscribe', 'https://evil.example/subscribe', 'javascript:alert(1)', 'https://user:pw@avbydave.beehiiv.com/subscribe', '"><img src=x onerror=alert(1)>']) {
      const { page, context, errors } = await openDemo(demo, VIEWPORTS.phone, { subscribe: bad });
      if (await page.locator('#sbd-subscribe').count()) fail(`${demo}: accepted bad subscribe URL ${JSON.stringify(bad)}`);
      if (!/next demo is coming/i.test(await page.textContent('#sbd-after'))) fail(`${demo}: bad URL ${JSON.stringify(bad)} broke the ask`);
      if (ignore404(errors).length) fail(`${demo}: console errors with ${JSON.stringify(bad)}: ${errors.join(' | ')}`);
      await context.close();
    }
  }
  // 5. Capture mode: nothing renders.
  {
    const context = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    await context.route('**/demos/config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: SHIPPED.replace(/emailSubscribeUrl:\s*'[^']*'/, "emailSubscribeUrl: 'https://avbydave.beehiiv.com/subscribe'") }));
    const page = await context.newPage();
    await page.goto(`${BASE}/demos/frame-sync.html?drive`);
    await page.evaluate(() => window.sbdComplete && window.sbdComplete());
    if (await page.locator('#sbd-after').count()) fail('capture mode rendered the completion panel');
    await context.close();
  }
  notes.push('shipped [DAVE] placeholder: unchanged no-provider ask, no link, no form, no visible placeholder');
  notes.push('beehiiv URL: 44px new-tab link (rel=noopener, no opener), default UTM tags or the visitor\'s own, replaces the form, no CSP errors, no CSP change');
  notes.push('ignored: empty, placeholder, http, look-alike and other hosts, javascript:, credentials, markup; capture mode unchanged');
} finally {
  await browser.close();
  server.close();
}

notes.forEach((n) => console.log(`- ${n}`));
if (failures.length) {
  console.error('Demo subscribe probe failed:');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Demo subscribe probe passed.');
