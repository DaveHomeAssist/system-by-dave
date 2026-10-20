#!/usr/bin/env node
// Phone-width probe for the demos/ pages. Local only (not wired into CI).
// Under real mobile emulation (isMobile + touch), at 320, 360, 390 and 430 px wide,
// every demo page must lay out at exactly the device width: innerWidth and
// scrollWidth equal the viewport (no zoom-out, no horizontal scroll). Nothing outside
// the scaled stage may cross the edges, the scaled stage must fit, and no text box may
// be clipped (scrollWidth > clientWidth) in the breadcrumb, the completion panel or
// the hub. Runs before and after the completion panel appears.
//   node scripts/launch/probe_demos_viewport.mjs [--screens /path/to/dir] [--width 390]
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : ''; };
const SCREENS = opt('screens') ? path.resolve(opt('screens')) : '';
if (SCREENS) fs.mkdirSync(SCREENS, { recursive: true });
const PHONES = [[320, 568], [360, 740], [390, 844], [430, 932]].filter(([w]) => !opt('width') || String(w) === opt('width'));
const PAGES = ['index.html', 'frame-sync.html', 'fault-finding.html'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
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

async function measure(page, width) {
  return page.evaluate((W) => {
    const de = document.documentElement;
    const out = { innerWidth: innerWidth, clientWidth: de.clientWidth, scrollWidth: de.scrollWidth, bodyScroll: document.body.scrollWidth, visual: window.visualViewport ? visualViewport.width : innerWidth, scale: window.visualViewport ? visualViewport.scale : 1, crossing: [], clipped: [], fit: null };
    const fit = document.getElementById('fit');
    if (fit) { const r = fit.getBoundingClientRect(); out.fit = { left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10 }; }
    const shown = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length; };
    for (const el of document.querySelectorAll('body *')) {
      if (fit && fit.contains(el)) continue;
      if (!shown(el)) continue;
      if (el.matches('.sbd-skip-link, .sr-only, .visually-hidden') || el.closest('.sbd-skip-link')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      if (r.right > W + 0.5 || r.left < -0.5) out.crossing.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} [${Math.round(r.left)}..${Math.round(r.right)}]`);
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && getComputedStyle(el).overflowX !== 'visible' && el !== document.body) out.clipped.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} (${el.scrollWidth} > ${el.clientWidth})`);
    }
    // text that wraps out of its box without overflow:hidden (e.g. a long unbroken string)
    for (const el of document.querySelectorAll('.sbd-site-return *, #sbd-after *, main *')) {
      if (fit && fit.contains(el)) continue;
      if (!shown(el) || !el.clientWidth) continue;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible' && getComputedStyle(el).display !== 'inline') out.clipped.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} overflows its box (${el.scrollWidth} > ${el.clientWidth})`);
    }
    return out;
  }, width);
}

const results = [];
try {
  for (const [width, height] of PHONES) {
    for (const demo of PAGES) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${BASE}/demos/${demo}`);
      await page.waitForLoadState('load');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const states = [['start', await measure(page, width)]];
      if (SCREENS && width === 390) await page.screenshot({ path: path.join(SCREENS, `${demo.replace('.html', '')}-390-start.png`) });
      if (demo !== 'index.html') {
        await page.evaluate(() => window.sbdComplete && window.sbdComplete());
        await page.waitForTimeout(150);
        states.push(['completed', await measure(page, width)]);
        if (SCREENS && width === 390) await page.screenshot({ path: path.join(SCREENS, `${demo.replace('.html', '')}-390-completed.png`) });
      }
      for (const [state, m] of states) {
        const label = `${demo} @${width} ${state}`;
        if (m.innerWidth !== width) fail(`${label}: lays out ${m.innerWidth}px wide (page zoomed out to ${m.scale.toFixed(3)})`);
        if (m.scrollWidth !== width || m.clientWidth !== width) fail(`${label}: scrollWidth ${m.scrollWidth}, clientWidth ${m.clientWidth}, want ${width}`);
        if (m.fit && (m.fit.left < -0.5 || m.fit.right > width + 0.5)) fail(`${label}: stage spans ${m.fit.left}..${m.fit.right}`);
        if (m.crossing.length) fail(`${label}: crosses the edge: ${m.crossing.slice(0, 6).join(', ')}`);
        if (m.clipped.length) fail(`${label}: clipped: ${m.clipped.slice(0, 6).join(', ')}`);
        results.push({ page: demo, width, state, innerWidth: m.innerWidth, scrollWidth: m.scrollWidth, fit: m.fit });
      }
      if (errors.length) fail(`${demo} @${width}: page errors ${errors.join(' | ')}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
for (const r of results) console.log(`- ${r.page} @${r.width} ${r.state}: innerWidth ${r.innerWidth}, scrollWidth ${r.scrollWidth}${r.fit ? `, stage ${r.fit.left}..${r.fit.right}` : ''}`);
if (failures.length) {
  console.error('Demos viewport probe failed:');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Demos viewport probe passed.');
