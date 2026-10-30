#!/usr/bin/env node
// Browser probe for the AV by Dave home first-visit explainer (AUD-004). Local only.
// First visit: an in-flow region (heading, demo/Field Kit links, Dismiss) that never
// covers the workspace or overflows. Dismiss hides it, moves focus to the workspace and
// is remembered across reloads; following a link is remembered too. Returning visitors
// (any saved state), deep links (?app=, ?gear=) and embeds never see it.
//   node scripts/launch/probe_home_explainer.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suiteTopic, closeTopics } from '../av-menu-journey.mjs';

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
const INTRO = '.suite-intro';

async function open(viewport, { query = '', seed = null } = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await context.route(/^https:\/\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' }));
  if (seed) await context.addInitScript((entries) => { if (!sessionStorage.getItem('probe-seeded')) { sessionStorage.setItem('probe-seeded', '1'); for (const [k, v] of entries) localStorage.setItem(k, v); } }, Object.entries(seed));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/av/${query}`, { waitUntil: 'load' });
  await page.locator('#workspace').waitFor();
  await page.waitForTimeout(300);
  return { context, page, errors };
}

try {
  for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 1280, height: 800 }]) {
    const tag = `${viewport.width}x${viewport.height}`;
    const { context, page, errors } = await open(viewport);
    const s = await page.evaluate((sel) => {
      const box = document.querySelector(sel);
      if (!box) return null;
      const r = box.getBoundingClientRect();
      const h = box.querySelector('h2');
      const ctl = [...box.querySelectorAll('a,button')].map((el) => { const b = el.getBoundingClientRect(); return { text: el.textContent.trim(), href: el.getAttribute('href'), h: b.height, right: b.right, visible: b.width > 0 && b.height > 0 }; });
      const add = [...document.querySelectorAll('#workspace button')].find((b) => /Add panel/.test(b.textContent) && b.getBoundingClientRect().height > 0);
      let addHit = null;
      if (add) { const a = add.getBoundingClientRect(); const hit = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2); addHit = !!hit && (hit === add || add.contains(hit)); }
      const ws = document.getElementById('workspace').getBoundingClientRect();
      return { labelled: box.getAttribute('aria-labelledby') === h?.id && !!h?.textContent, role: box.tagName, modal: box.getAttribute('aria-modal') || box.getAttribute('role'), top: r.top, bottom: r.bottom, ctl, addHit, wsTop: ws.top, wsH: ws.height, sw: document.documentElement.scrollWidth, vw: innerWidth };
    }, INTRO);
    if (!s) { fail(`${tag} first visit shows no explainer`); await context.close(); continue; }
    if (!s.labelled || s.role !== 'SECTION' || s.modal) fail(`${tag} explainer should be a labelled, non-modal section (${JSON.stringify({ labelled: s.labelled, role: s.role, modal: s.modal })})`);
    // The demos live on systembydave.com (Dave, c4b517e); the Field Kit is same-site.
    const want = [['Try a demo', 'https://systembydave.com/demos/?utm_source=avbydave&utm_medium=home-explainer&utm_campaign=console'], ['See the Field Kit', '/field-kit/'], ['Dismiss', null]];
    if (JSON.stringify(s.ctl.map((c) => [c.text, c.href])) !== JSON.stringify(want)) fail(`${tag} controls ${JSON.stringify(s.ctl)}`);
    for (const c of s.ctl) if (!c.visible || c.h < 44 || c.right > s.vw) fail(`${tag} ${c.text} not a visible 44px target in view (${JSON.stringify(c)})`);
    if (s.sw > s.vw) fail(`${tag} page overflows ${s.sw}/${s.vw}`);
    if (s.wsTop < s.bottom - 1) fail(`${tag} explainer overlaps the workspace (${s.bottom} > ${s.wsTop})`);
    if (s.addHit === false) fail(`${tag} workspace Add panel is covered`);
    if (s.wsH < viewport.height * 0.3) fail(`${tag} workspace squeezed to ${Math.round(s.wsH)}px`);
    if (errors.length) fail(`${tag} errors: ${errors.join(' | ')}`);

    // Keyboard dismiss: focus goes to the workspace, choice survives a reload.
    await page.getByRole('button', { name: 'Dismiss', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    if (await page.locator(INTRO).count()) fail(`${tag} Dismiss did not hide the explainer`);
    if ((await page.evaluate(() => document.activeElement?.id)) !== 'workspace') fail(`${tag} focus not moved to the workspace after Dismiss`);
    await page.reload({ waitUntil: 'load' }); await page.locator('#workspace').waitFor(); await page.waitForTimeout(300);
    if (await page.locator(INTRO).count()) fail(`${tag} dismissal not remembered after reload`);
    await context.close();
  }

  // Following a link also counts as seen.
  {
    const { context, page } = await open({ width: 390, height: 844 });
    await page.getByRole('link', { name: 'Try a demo' }).click();
    await page.waitForURL(/systembydave\.com\/demos\//);
    await page.goto(`${BASE}/av/`, { waitUntil: 'load' }); await page.locator('#workspace').waitFor(); await page.waitForTimeout(300);
    if (await page.locator(INTRO).count()) fail('explainer shown again after following Try a demo');
    await context.close();
  }
  // Returning visitors and deep links never see it.
  for (const [name, opts] of [
    ['saved layout', { seed: { 'sbd.avSuite.layout.v1': '{}' } }],
    ['saved theme', { seed: { 'av-theme-mode.v1': 'light' } }],
    ['focus mode', { seed: { 'sbd.avSuite.focus.v1': 'true' } }],
    ['?app=', { query: '?app=av-video' }],
    ['?gear=', { query: '?gear=ion' }],
  ]) {
    const { context, page } = await open({ width: 1280, height: 800 }, opts);
    if (await page.locator(INTRO).count()) fail(`explainer shown for ${name}`);
    await context.close();
  }
  // Light palette renders it too (no theme-specific breakage).
  {
    const { context, page } = await open({ width: 1280, height: 800 });
    await suiteTopic(page, 'Appearance');
    await page.getByLabel('Palette', { exact: true }).selectOption('light');
    await closeTopics(page);
    if (!(await page.locator(INTRO).isVisible())) fail('explainer vanished on palette change');
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failures.length) { console.error('probe:home-explainer FAILED\n- ' + failures.join('\n- ')); process.exit(1); }
console.log('probe:home-explainer ok (first visit at 320/390/667x375/1280, keyboard dismiss + focus + reload, link counts as seen, returning/deep-link/focus hidden, light palette)');
