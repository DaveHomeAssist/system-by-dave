#!/usr/bin/env node
// Browser probe for the AV by Dave funnel links (AUD-003). Local only (not wired into CI).
// Checks, at phone and desktop widths, that the console header links to the demos hub,
// the Field Kit and the hub's subscribe section without horizontal overflow; that the
// hub shows a Field Kit card and a subscribe section that stays a "soon" note until
// config.js holds a valid beehiiv URL (then a UTM-tagged new-tab link, utm_content=hub);
// that the demos' completion action points at /field-kit/; and that the Field Kit links
// back to the demos.   node scripts/launch/probe_av_nav_funnel.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const failures = [];
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
const SHIPPED = fs.readFileSync(path.join(ROOT, 'demos/config.js'), 'utf8');

async function open(route, viewport, config = null) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await context.route(/^https:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' }));
  if (config) await context.route('**/demos/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: config }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  return { context, page, errors };
}

try {
  for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 1280, height: 800 }]) {
    const tag = `${viewport.width}x${viewport.height}`;
    const { context, page, errors } = await open('av/', viewport);
    const state = await page.evaluate(() => {
      const row = document.querySelector('.shell-nav');
      const funnel = row?.querySelector('nav.shell-funnel');
      const links = [...(funnel?.querySelectorAll('a') || [])].map((a) => { const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), href: a.getAttribute('href'), left: r.left, right: r.right, height: r.height, visible: r.width > 0 }; });
      return { label: funnel?.getAttribute('aria-label'), crumb: !!row?.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]'), links, sw: document.documentElement.scrollWidth, vw: innerWidth, rowSW: row?.scrollWidth, rowCW: row?.clientWidth };
    });
    // Demos live on systembydave.com (Dave, c4b517e): absolute, UTM-tagged; the Field Kit is same-site.
    const want = [['Demos', /^https:\/\/systembydave\.com\/demos\/\?utm_source=avbydave&utm_medium=nav&utm_campaign=console&utm_content=demos$/], ['Field Kit', /^\/field-kit\/$/], ['Subscribe', /^https:\/\/systembydave\.com\/demos\/\?utm_source=avbydave&utm_medium=nav&utm_campaign=console&utm_content=subscribe#subscribe$/]];
    if (state.links.length !== want.length || want.some(([t, re], i) => state.links[i].text !== t || !re.test(state.links[i].href))) fail(`${tag} console funnel links: ${JSON.stringify(state.links)}`);
    if (!state.label) fail(`${tag} funnel nav has no aria-label`);
    if (!state.crumb) fail(`${tag} breadcrumb lost its aria-current item`);
    if (state.sw > state.vw || state.rowSW > state.rowCW) fail(`${tag} header overflows (${state.sw}/${state.vw}, row ${state.rowSW}/${state.rowCW})`);
    for (const l of state.links) {
      if (!l.visible || l.right > state.vw || l.height < 44) fail(`${tag} ${l.text} not a visible 44px target (${JSON.stringify(l)})`);
    }
    if (viewport.height <= 500) { // short-phone landscape: the Apps launcher sits at the top right (112px)
      const last = state.links.at(-1);
      if (last && last.right > state.vw - 116) fail(`${tag} Subscribe sits under the Apps launcher (${last.right})`);
    }
    if (errors.length) fail(`${tag} console errors: ${errors.join(' | ')}`);
    await context.close();
  }

  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const tag = `${viewport.width}`;
    // The Field Kit card and subscribe section are the hub's own "Field Kit" tab (main's tabbed
    // Video Engineering Daily hub); #field-kit opens it.
    let { context, page, errors } = await open('demos/#field-kit', viewport);
    const hub = await page.evaluate(() => ({
      kit: document.querySelector('#field-kit a.card[href^="https://avbydave.com/field-kit/?utm_source=systembydave"] h2')?.textContent,
      subscribe: !!document.querySelector('section#subscribe'),
      linkHidden: !document.getElementById('subscribe-link')?.checkVisibility(),
      soonHidden: !document.getElementById('subscribe-soon')?.checkVisibility(),
      checklistUrl: window.SBD_DEMOS?.checklistUrl,
      sw: document.documentElement.scrollWidth, vw: innerWidth,
    }));
    if (!hub.kit) fail(`${tag} hub has no Field Kit card linking to https://avbydave.com/field-kit/`);
    if (!hub.subscribe) fail(`${tag} hub has no #subscribe section`);
    if (hub.linkHidden !== true || hub.soonHidden !== false) fail(`${tag} placeholder config should show the "soon" note, not a link`);
    if (!/^https:\/\/avbydave\.com\/field-kit\/\?utm_source=systembydave&/.test(hub.checklistUrl || '')) fail(`checklistUrl is ${hub.checklistUrl}`);
    if (hub.sw > hub.vw) fail(`${tag} hub overflows ${hub.sw}/${hub.vw}`);
    if (errors.length) fail(`${tag} hub errors: ${errors.join(' | ')}`);
    await context.close();

    ({ context, page, errors } = await open('demos/#field-kit', viewport, SHIPPED.replace(/emailSubscribeUrl:\s*'[^']*'/, "emailSubscribeUrl: 'https://example-pub.beehiiv.com/subscribe'")));
    const live = await page.evaluate(() => { const a = document.getElementById('subscribe-link'); return { hidden: !a.checkVisibility(), href: a.href, target: a.target, rel: a.rel, soon: !document.getElementById('subscribe-soon').checkVisibility(), height: a.getBoundingClientRect().height }; });
    const u = new URL(live.href);
    if (live.hidden || !live.soon || u.hostname !== 'example-pub.beehiiv.com' || u.searchParams.get('utm_content') !== 'hub' || live.target !== '_blank' || live.height < 44 || !/noopener/.test(live.rel)) fail(`${tag} configured subscribe link wrong: ${JSON.stringify(live)}`);
    await context.close();

    ({ context, page, errors } = await open('demos/#field-kit', viewport, SHIPPED.replace(/emailSubscribeUrl:\s*'[^']*'/, "emailSubscribeUrl: 'https://evil.example/subscribe'")));
    if (await page.evaluate(() => document.getElementById('subscribe-link').checkVisibility())) fail(`${tag} non-beehiiv subscribe URL was used`);
    await context.close();

    ({ context, page, errors } = await open('field-kit/', viewport));
    if (!(await page.locator('footer a[href^="https://systembydave.com/demos/?utm_source=avbydave"]').count())) fail(`${tag} Field Kit footer has no Demos link`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failures.length) { console.error('probe:av-nav-funnel FAILED\n- ' + failures.join('\n- ')); process.exit(1); }
console.log('probe:av-nav-funnel ok (console header links at 320/390/667x375/1280, hub Field Kit card and subscribe states, checklistUrl, Field Kit back-link)');
