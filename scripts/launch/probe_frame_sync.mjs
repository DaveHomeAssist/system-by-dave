#!/usr/bin/env node
// Browser probe for the frame sync demo and the Field Kit draft (docs/launch/README.md).
// Local only (not wired into CI). Checks phone (390x844) and desktop (1280x800):
// no console errors, no horizontal scroll, the interactive break/fix flow, the
// launch events in order on the no-op dispatcher (with UTM parameters), auto-play
// timing, that the optional signup never blocks the demo, the hidden Field Kit
// slot, reduced motion, no-JavaScript content and the first-focus skip link.
//   node scripts/launch/probe_frame_sync.mjs [--screens /path/to/dir]
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
const UTM = 'utm_source=instagram&utm_medium=dm&utm_campaign=framesync_launch&utm_content=reel_main';

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
const names = (page) => page.evaluate(() => window.__events.map((e) => e.name + (e.props.step ? e.props.step : '')));
async function noHorizontalScroll(page, label) {
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (m.sw > m.cw) fail(`${label}: horizontal scroll (${m.sw} > ${m.cw})`);
}
async function shot(page, name) { if (SCREENS) await page.screenshot({ path: path.join(SCREENS, name), fullPage: false }); }
async function shotFull(page, name) { if (SCREENS) await page.screenshot({ path: path.join(SCREENS, name), fullPage: true }); }
function expectOrder(actual, expected, label) {
  let i = 0;
  for (const name of actual) if (name === expected[i]) i += 1;
  if (i !== expected.length) fail(`${label}: events out of order or missing. expected subsequence ${expected.join(',')} in ${actual.join(',')}`);
}

const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };

try {
  // 1. Interactive break/fix flow on both viewports, landing with UTM parameters.
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    const { page, context, errors } = await open(`/frame-sync/?${UTM}`, viewport);
    await page.waitForTimeout(400);
    await noHorizontalScroll(page, `${label} step 1`);
    await shot(page, `${label}-step1.png`);
    if (!(await page.locator('#fs-signup').isHidden())) fail(`${label}: signup visible before the fix`);
    if (!(await page.locator('#fs-kit').isHidden())) fail(`${label}: Field Kit slot visible without a configured URL`);
    await page.click('#fs-next');
    await page.click('#fs-next');
    if ((await page.textContent('#fs-action')).trim() !== 'Cause the tear') fail(`${label}: step 3 action is not "Cause the tear"`);
    await page.click('#fs-action');
    await page.waitForTimeout(700);
    await shot(page, `${label}-step3-tear.png`);
    await page.click('#fs-next');
    await page.waitForTimeout(400);
    await shot(page, `${label}-step4-before-fix.png`);
    await page.click('#fs-action');
    await page.waitForTimeout(700);
    if (await page.locator('#fs-signup').isHidden()) fail(`${label}: signup not shown after the fix`);
    if (!(await page.locator('#fs-signup-form').isHidden())) fail(`${label}: email form shown without a configured provider`);
    if (await page.locator('#fs-mailto').isHidden()) fail(`${label}: mailto fallback not shown`);
    await shot(page, `${label}-step4-fixed.png`);
    await page.locator('#fs-signup').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shotFull(page, `${label}-step4-full-page.png`);
    // The optional signup never blocks the demo: controls stay on top and usable.
    await page.locator('#fs-next').scrollIntoViewIfNeeded();
    const onTop = await page.evaluate(() => {
      const b = document.getElementById('fs-next').getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === document.getElementById('fs-next');
    });
    if (!onTop) fail(`${label}: something covers the Next control after the signup appears`);
    const signupPos = await page.evaluate(() => getComputedStyle(document.getElementById('fs-signup')).position);
    if (signupPos === 'fixed' || signupPos === 'sticky') fail(`${label}: signup is ${signupPos}, it could cover the demo`);
    // Mailto fallback records signup_submit and leaves the demo running.
    await page.evaluate(() => { document.getElementById('fs-mailto').addEventListener('click', (e) => e.preventDefault(), { once: true }); });
    await page.click('#fs-mailto');
    await page.click('#fs-next');
    await page.click('#fs-next');
    await page.click('#fs-action'); // lock to reference
    await page.click('#fs-next');
    await page.waitForTimeout(300);
    await shot(page, `${label}-step7.png`);
    await noHorizontalScroll(page, `${label} step 7`);
    const seq = await names(page);
    expectOrder(seq, ['page_view', 'step_view1', 'step_view2', 'step_view3', 'tear_triggered', 'step_view4', 'fix_applied', 'signup_view', 'signup_submit', 'step_view5', 'step_view6', 'step_view7', 'demo_complete'], `${label} interactive`);
    const missingUtm = await page.evaluate(() => window.__events.filter((e) => e.props.utm_source !== 'instagram' || e.props.utm_medium !== 'dm' || e.props.utm_content !== 'reel_main').map((e) => e.name));
    if (missingUtm.length) fail(`${label}: events without UTM: ${missingUtm.join(',')}`);
    const configured = await page.evaluate(() => window.SBDEvents.configured());
    if (configured) fail(`${label}: dispatcher has a provider configured`);
    if (errors.length) fail(`${label}: console errors: ${errors.join(' | ')}`);
    notes.push(`${label} interactive events: ${seq.join(' > ')}`);
    await context.close();
  }

  // 2. Auto-play timing (4 s per step to keep the probe short) and the clamp.
  {
    const { page, context, errors } = await open('/frame-sync/?autoplay=1&step_s=4', VIEWPORTS.phone);
    await page.waitForTimeout(13000);
    await shot(page, 'phone-autoplay-step4.png');
    await page.waitForFunction(() => window.__events.some((e) => e.name === 'demo_complete'), null, { timeout: 25000 });
    const ev = await page.evaluate(() => window.__events);
    const seq = ev.map((e) => e.name + (e.props.step ? e.props.step : ''));
    expectOrder(seq, ['page_view', 'autoplay_started', 'step_view1', 'step_view2', 'step_view3', 'tear_triggered', 'step_view4', 'fix_applied', 'step_view5', 'step_view6', 'step_view7', 'demo_complete'], 'autoplay');
    const steps = ev.filter((e) => e.name === 'step_view');
    const gaps = steps.slice(1).map((e, i) => (e.at - steps[i].at) / 1000);
    if (gaps.some((g) => Math.abs(g - 4) > 0.35)) fail(`autoplay step gaps off 4 s: ${gaps.map((g) => g.toFixed(2)).join(',')}`);
    const s4 = steps.find((e) => e.props.step === 4);
    const fix = ev.find((e) => e.name === 'fix_applied');
    const fixDelay = (fix.at - s4.at) / 1000;
    if (Math.abs(fixDelay - 1.2) > 0.3) fail(`autoplay fix lands ${fixDelay.toFixed(2)} s into step 4 (expected 1.2)`);
    notes.push(`autoplay gaps (s): ${gaps.map((g) => g.toFixed(2)).join(', ')}; fix ${fixDelay.toFixed(2)} s into step 4`);
    if (errors.length) fail(`autoplay console errors: ${errors.join(' | ')}`);
    await context.close();
  }
  for (const [query, expected] of [['', 35], ['&step_s=10', 42], ['&step_s=1', 28]]) {
    const { page, context } = await open(`/frame-sync/?capture=1${query}`, VIEWPORTS.phone);
    const total = await page.evaluate(() => window.FrameSync.total);
    if (total !== expected) fail(`auto-play length for "${query || 'default'}": expected ${expected} s, got ${total}`);
    await context.close();
  }
  notes.push('auto-play length: default 7 x 5 s = 35 s; step_s clamps to 4-6 s');

  // 3. Email providers, one config value each. Every provider request is
  //    answered by a local route; nothing reaches a real service.
  const cfgScript = (email, checkout) => `window.SBD_LAUNCH={analytics:{provider:null},email:${JSON.stringify(email)},fieldKit:{checkout:${JSON.stringify(checkout || { provider: null, url: '', mode: 'link' })},priceLabel:'Price TBD'}};`;
  async function openWith(url, email, checkout, extraRoutes = [], viewport = VIEWPORTS.phone) {
    const hits = [];
    const routes = [
      ['**/js/sbd-launch-config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: cfgScript(email, checkout) })],
      // Playwright tries the most recently added route first, so the catch-all goes first.
      [/^https:\/\//, (route) => { const r = route.request(); hits.push({ url: r.url(), method: r.method(), body: r.postData() || '' }); return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' }); }],
      ...extraRoutes
    ];
    const opened = await open(url, viewport, { routes });
    return { ...opened, hits };
  }
  async function toFixed(page) {
    for (let i = 0; i < 3; i += 1) await page.click('#fs-next');
    await page.click('#fs-action');
  }
  async function demoStillWorks(page, label) {
    await page.click('#fs-next');
    const step = await page.evaluate(() => document.querySelector('#fs-steps li.is-current').getAttribute('data-step'));
    if (step !== '5') fail(`${label}: demo did not continue after the signup (step ${step})`);
  }
  const status = (page) => page.evaluate(() => ({ state: document.getElementById('fs-signup-form').getAttribute('data-state'), text: document.getElementById('fs-signup-status').textContent }));

  // 3a. Kit: background POST, honeypot dropped, inline success; bad email stays inline.
  {
    const { page, context, errors, hits } = await openWith('/frame-sync/', { provider: 'kit', id: '1234567', fallbackMailto: 'avbydave@gmail.com' });
    await toFixed(page);
    if (await page.locator('#fs-signup-form').isHidden()) fail('kit: form not shown');
    if (!(await page.locator('#fs-signup-fallback').isHidden())) fail('kit: mailto fallback still shown');
    if ((await page.getAttribute('#fs-email', 'name')) !== 'email_address') fail('kit: email field is not email_address');
    await page.fill('#fs-email', 'not-an-email');
    await page.click('#fs-signup-form button[type="submit"]');
    let st = await status(page);
    if (st.state !== 'error-input' || hits.length) fail(`kit: invalid email not caught inline (${st.state}, ${hits.length} requests)`);
    await page.fill('#fs-email', 'test@example.com');
    await page.click('#fs-signup-form button[type="submit"]');
    await page.waitForFunction(() => document.getElementById('fs-signup-form').getAttribute('data-state') === 'success', null, { timeout: 5000 });
    const hit = hits.find((h) => h.url === 'https://app.kit.com/forms/1234567/subscriptions');
    if (!hit || hit.method !== 'POST' || !/email_address/.test(hit.body) || !/test@example\.com/.test(hit.body)) fail(`kit: wrong request ${JSON.stringify(hits)}`);
    if (hit && /company/.test(hit.body)) fail('kit: honeypot field was sent');
    await shotFull(page, 'phone-signup-kit-success.png');
    await demoStillWorks(page, 'kit');
    const csp = errors.filter((e) => /Content Security Policy/.test(e));
    if (csp.length) fail(`kit: CSP blocked the provider: ${csp.join(' | ')}`);
    notes.push('email kit: inline invalid-email error (no request), POST to app.kit.com with email_address, honeypot not sent, success state, demo continues');
    await context.close();
  }
  // 3b. MailerLite with the network down: inline error + "finish on the sign-up page" (real form POST in a new tab).
  {
    const action = 'https://assets.mailerlite.com/jsonp/123456/forms/987654321/subscribe';
    const { page, context, hits } = await openWith('/frame-sync/', { provider: 'mailerlite', id: action, fallbackMailto: 'avbydave@gmail.com' }, null,
      [[/^https:\/\/assets\.mailerlite\.com\//, (route) => (route.request().resourceType() === 'document' ? route.fallback() : route.abort('internetdisconnected'))]]);
    await toFixed(page);
    await page.fill('#fs-email', 'test@example.com');
    await page.click('#fs-signup-form button[type="submit"]');
    await page.waitForFunction(() => document.getElementById('fs-signup-form').getAttribute('data-state') === 'error', null, { timeout: 15000 });
    if (await page.locator('[data-retry]').isHidden()) fail('mailerlite: retry button missing after a network error');
    await shotFull(page, 'phone-signup-error.png');
    const [popup] = await Promise.all([context.waitForEvent('page'), page.click('[data-retry]')]);
    await popup.waitForLoadState('load').catch(() => {});
    const posted = hits.find((h) => h.url === action && h.method === 'POST');
    if (!posted || !/fields%5Bemail%5D=test%40example\.com|fields\[email\]/.test(posted.body)) fail(`mailerlite: retry did not post the form (${JSON.stringify(hits)})`);
    if (posted && !/ml-submit=1/.test(posted.body)) fail('mailerlite: ml-submit missing');
    await demoStillWorks(page, 'mailerlite');
    notes.push('email mailerlite: network failure shows an inline error; "Finish on the sign-up page" posts fields[email] in a new tab; demo continues');
    await context.close();
  }
  // 3c. Buttondown: standard POST into a new tab with embed=1 and the UTM tags.
  {
    const { page, context, hits } = await openWith(`/frame-sync/?${UTM}`, { provider: 'buttondown', id: 'avbydave', fallbackMailto: 'avbydave@gmail.com' });
    await toFixed(page);
    await page.fill('#fs-email', 'test@example.com');
    const [popup] = await Promise.all([context.waitForEvent('page'), page.click('#fs-signup-form button[type="submit"]')]);
    await popup.waitForLoadState('load').catch(() => {});
    const posted = hits.find((h) => h.url === 'https://buttondown.com/api/emails/embed-subscribe/avbydave');
    if (!posted || posted.method !== 'POST' || !/email=test%40example\.com/.test(posted.body) || !/embed=1/.test(posted.body) || !/utm_source=instagram/.test(posted.body)) fail(`buttondown: wrong request ${JSON.stringify(hits)}`);
    if (posted && /company=/.test(posted.body)) fail('buttondown: honeypot field was sent');
    if ((await status(page)).state !== 'success') fail('buttondown: no inline confirmation');
    await demoStillWorks(page, 'buttondown');
    notes.push('email buttondown: POST to embed-subscribe in a new tab with email, embed=1 and UTM tags; inline note; demo continues');
    await context.close();
  }
  // 3d. Beehiiv: hosted subscribe link. 3e. Honeypot. 3f. Bad id falls back to mailto.
  {
    const { page, context } = await openWith('/frame-sync/', { provider: 'beehiiv', id: 'https://avbydave.beehiiv.com/subscribe', fallbackMailto: 'avbydave@gmail.com' });
    await toFixed(page);
    if (!(await page.locator('#fs-signup-form').isHidden())) fail('beehiiv: form should not show');
    if ((await page.getAttribute('#fs-signup-link', 'href')) !== 'https://avbydave.beehiiv.com/subscribe' || await page.locator('#fs-signup-link').isHidden()) fail('beehiiv: hosted subscribe link missing');
    await context.close();
  }
  {
    const { page, context, hits } = await openWith('/frame-sync/', { provider: 'kit', id: '1234567', fallbackMailto: 'avbydave@gmail.com' });
    await toFixed(page);
    await page.fill('#fs-email', 'bot@example.com');
    await page.evaluate(() => { document.getElementById('fs-company').value = 'spam inc'; });
    await page.click('#fs-signup-form button[type="submit"]');
    await page.waitForTimeout(400);
    if (hits.length) fail('honeypot: a filled trap still sent a request');
    if ((await status(page)).state !== 'success') fail('honeypot: bot did not get the quiet success state');
    await context.close();
  }
  {
    const { page, context } = await openWith('/frame-sync/', { provider: 'kit', id: 'https://evil.example/collect', fallbackMailto: 'avbydave@gmail.com' });
    await toFixed(page);
    if (!(await page.locator('#fs-signup-form').isHidden()) || await page.locator('#fs-mailto').isHidden()) fail('invalid email id did not fall back to mailto');
    await context.close();
  }
  notes.push('email beehiiv: hosted subscribe link; honeypot: quiet success, no request; invalid id: mailto fallback');

  // 3g. Field Kit checkout: closed until configured AND the [DAVE] terms are filled in.
  const noPlaceholders = ['**/field-kit/', async (route) => {
    const html = fs.readFileSync(path.join(ROOT, 'field-kit/index.html'), 'utf8').replace(/ data-dave-placeholder/g, '');
    await route.fulfill({ contentType: 'text/html', body: html });
  }];
  {
    const { page, context } = await openWith('/field-kit/', { provider: null, id: '' }, { provider: 'gumroad', url: 'https://avbydave.gumroad.com/l/fieldkit', mode: 'link' });
    if (!(await page.locator('#kit-buy').isHidden()) || await page.locator('#kit-buy-disabled').isHidden()) fail('checkout opened while [DAVE] placeholders remain');
    await context.close();
  }
  {
    const { page, context } = await openWith('/field-kit/', { provider: null, id: '' }, { provider: 'gumroad', url: 'https://avbydave.gumroad.com/l/fieldkit', mode: 'link' }, [noPlaceholders]);
    if (await page.locator('#kit-buy').isHidden() || (await page.getAttribute('#kit-buy', 'href')) !== 'https://avbydave.gumroad.com/l/fieldkit' || !(await page.locator('#kit-buy-disabled').isHidden())) fail('gumroad link checkout did not open');
    await shotFull(page, 'field-kit-checkout-configured-phone.png');
    await context.close();
  }
  {
    const { page, context, errors } = await openWith('/field-kit/', { provider: null, id: '' }, { provider: 'lemonsqueezy', url: 'https://avbydave.lemonsqueezy.com/checkout/buy/abc', mode: 'overlay' }, [noPlaceholders]);
    const href = await page.getAttribute('#kit-buy', 'href');
    const cls = await page.getAttribute('#kit-buy', 'class');
    if (!/embed=1/.test(href || '') || !/lemonsqueezy-button/.test(cls || '')) fail(`lemon squeezy overlay not prepared (${href}, ${cls})`);
    if (await page.locator('#kit-buy').isHidden()) fail('lemon squeezy: link hidden when the overlay script is blocked');
    notes.push(`checkout lemonsqueezy overlay without the CSP change: script ${errors.some((e) => /Content Security Policy/.test(e)) ? 'blocked by CSP as documented' : 'not blocked'}, button stays a working link`);
    await context.close();
  }
  for (const bad of [{ provider: 'stripe', url: 'https://evil.example/pay', mode: 'link' }, { provider: 'stripe', url: 'http://buy.stripe.com/x', mode: 'link' }, { provider: 'paypal', url: 'https://buy.stripe.com/x', mode: 'link' }]) {
    const { page, context } = await openWith('/field-kit/', { provider: null, id: '' }, bad, [noPlaceholders]);
    if (!(await page.locator('#kit-buy').isHidden())) fail(`checkout accepted a bad link ${JSON.stringify(bad)}`);
    await context.close();
  }
  {
    const { page, context } = await openWith('/field-kit/', { provider: null, id: '' }, { provider: 'stripe', url: 'https://buy.stripe.com/test_123', mode: 'overlay' }, [noPlaceholders]);
    if ((await page.getAttribute('#kit-buy', 'target')) !== '_blank') fail('stripe: overlay request did not fall back to a new-tab link');
    await context.close();
  }
  {
    const { page, context, hits } = await openWith('/frame-sync/', { provider: null, id: '' }, { provider: 'stripe', url: 'https://buy.stripe.com/test_123', mode: 'link' });
    if (await page.locator('#fs-kit').isHidden()) fail('configured checkout did not reveal the demo Field Kit slot');
    await toFixed(page);
    await page.evaluate(() => document.getElementById('fs-kit-link').addEventListener('click', (e) => e.preventDefault(), { once: true }));
    await page.click('#fs-kit-link');
    expectOrder(await names(page), ['fix_applied', 'kit_click'], 'demo kit slot');
    if (hits.length) fail('demo kit slot made an external request');
    await context.close();
  }
  notes.push('checkout: closed while [DAVE] placeholders remain; gumroad link, lemonsqueezy overlay (embed=1 + class) and stripe new-tab work; non-provider hosts, http and unknown providers stay closed; demo kit slot appears only when checkout is configured');

  // 3h. Screen description follows the state (screen readers).
  {
    const { page, context } = await open('/frame-sync/', VIEWPORTS.phone);
    await page.click('#fs-next'); await page.click('#fs-next'); await page.click('#fs-action');
    await page.waitForTimeout(200);
    const label = await page.getAttribute('#fs-screen', 'aria-label');
    if (!/torn/.test(label || '')) fail(`screen aria-label does not describe the tear: ${label}`);
    await context.close();
  }

  // 4. Reduced motion starts paused; no-JS shows every step; skip link is first.
  {
    const { page, context, errors } = await open('/frame-sync/', VIEWPORTS.phone, { reducedMotion: 'reduce' });
    if ((await page.textContent('#fs-play')).trim() !== 'Play motion') fail('reduced motion does not start paused');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement.className);
    if (!/sbd-skip-link/.test(focused)) fail(`first Tab focuses "${focused}", not the skip link`);
    if (errors.length) fail(`reduced motion console errors: ${errors.join(' | ')}`);
    await context.close();
  }
  {
    const { page, context } = await open('/frame-sync/', VIEWPORTS.phone, { javaScriptEnabled: false });
    const visible = await page.locator('#fs-steps li:visible').count();
    if (visible !== 7) fail(`no-JS shows ${visible} of 7 steps`);
    await shotFull(page, 'phone-no-js.png');
    await context.close();
  }

  // 5. Field Kit draft page.
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    const { page, context, errors } = await open('/field-kit/', viewport);
    await noHorizontalScroll(page, `field kit ${label}`);
    const robots = await page.getAttribute('meta[name="robots"]', 'content');
    if (!/noindex/.test(robots || '')) fail('Field Kit draft is not noindex');
    if (!/TBD/.test(await page.textContent('#kit-price'))) fail('Field Kit price is not a TBD placeholder');
    if (errors.length) fail(`field kit ${label} console errors: ${errors.join(' | ')}`);
    await shotFull(page, `field-kit-${label}.png`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

notes.forEach((n) => console.log(`- ${n}`));
if (failures.length) {
  console.error('Frame sync probe failed:');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Frame sync probe passed.');
