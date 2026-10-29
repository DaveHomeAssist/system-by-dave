import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

export const FAMILIES = {
  video: { route: 'av-video', label: 'AV Video', key: 'sbd.avVideo.v1', document: 'Project', field: 'Plan name' },
  audio: { route: 'av-audio', label: 'Audio', key: 'sbd.avAudio.v1', document: 'Document', field: 'Plan title' },
  'show-control': { route: 'show-control', label: 'Show Control', key: 'sbd.showControl.v1', document: 'Document', field: 'Run title' },
  'show-ops': { route: 'show-ops', label: 'Show Ops', key: 'sbd.showOps.document.v1', document: 'Document', field: 'Show name' },
  'front-office': { route: 'front-office', label: 'Front Office', key: 'sbd.frontOffice.document.v1', document: 'Clients', field: 'Client name' },
  shop: { route: 'the-shop', label: 'The Shop', key: 'sbd.shop.v1', document: 'Document', field: 'Plan name' },
  infrastructure: { route: 'infrastructure', label: 'Infrastructure', key: 'sbd.infrastructure.v1', document: 'Document', field: 'Plan name' },
  lighting: { route: 'av-lighting', label: 'Lighting', key: 'sbd.avLighting.v1', document: 'Document', field: 'Show name' },
};
const ROOT = resolve(import.meta.dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

export async function serveFamilies({ retained = false } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://probe').pathname);
      let file = resolve(ROOT, `.${pathname}`);
      if (!file.startsWith(ROOT + sep)) return res.writeHead(403).end();
      if (retained) for (const { route } of Object.values(FAMILIES)) {
        if (pathname.startsWith(`/${route}/`)) {
          const fixtureRoot = resolve(ROOT, `apps/${route}/dist`);
          file = resolve(fixtureRoot, pathname.slice(route.length + 2) || 'index.html');
          if (!file.startsWith(fixtureRoot + sep)) return res.writeHead(403).end();
        }
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(ready => server.listen(0, '127.0.0.1', ready));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => server.close(done)) };
}

// Disposable contexts only. Every family exercises the actual shared shell,
// its own document, all default views and Save/export/reload isolation.
export async function probeFamily(pack, baseOverride) {
  const family = FAMILIES[pack];
  assert.ok(family, `Unknown family ${pack}`);
  const server = await serveFamilies();
  const base = baseOverride || process.env.AV_FAMILY_BASE || server.base;
  const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...channel, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const url = `${base}/av/?app=${pack}`;
    const header = page.locator('.suite-header');
    const quick = name => page.locator('.console-quick').getByRole('button', { name, exact: true });
    const saved = () => page.evaluate(key => localStorage.getItem(key), family.key);
    await page.goto(url);
    await page.locator(`.suite-app[data-active-app="${pack}"]`).waitFor();
    assert.equal(await header.locator('h1').textContent(), family.label);
    assert.equal(await page.locator('.console-strip').count(), 1);
    assert.equal(await page.locator('.console-panel iframe').count(), 0);
    assert.equal(await saved(), null, 'opening a pack never saves its document');
    const tabs = await page.getByRole('tab').allTextContents();
    assert.ok(tabs.length > 0, `${pack} exposes default views`);
    for (const name of tabs) {
      await page.getByRole('tab', { name, exact: true }).click();
      assert.ok(await page.locator('.console-panel').count() > 0, `${pack}/${name} renders panels`);
      assert.equal(await page.locator('.console-panel iframe').count(), 0);
    }
    await quick(family.document).click();
    const field = page.getByLabel(family.field, { exact: true });
    await field.fill(`Synthetic ${pack} cutover`);
    if (pack === 'front-office') await page.getByRole('button', { name: 'Add client', exact: true }).click();
    assert.equal(await saved(), null, 'edits remain unsaved');
    const before = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => !/draft|recovery/i.test(k)).map(k => [k, localStorage.getItem(k)])));
    await header.getByRole('button', { name: /^Save/ }).click();
    await page.waitForFunction(({ key, value }) => localStorage.getItem(key)?.includes(value), { key: family.key, value: `Synthetic ${pack} cutover` });
    const raw = await saved();
    const after = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => !/draft|recovery/i.test(k)).map(k => [k, localStorage.getItem(k)])));
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) if (key !== family.key) assert.equal(after[key], before[key], `Save keeps ${key}`);
    const download = page.waitForEvent('download');
    await header.getByRole('button', { name: 'Export', exact: true }).click();
    assert.deepEqual(JSON.parse(await readFile(await (await download).path(), 'utf8')), JSON.parse(raw));
    await page.reload();
    await quick(family.document).click();
    if (pack === 'front-office') await page.getByRole('heading', { name: `Synthetic ${pack} cutover`, exact: true }).waitFor();
    else assert.equal(await field.inputValue(), `Synthetic ${pack} cutover`);
    assert.equal(await saved(), raw, 'reload preserves exact saved bytes');
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Palette', { exact: true }).selectOption(theme);
      for (const [width, height] of [[1440, 900], [680, 700], [375, 812], [3840, 1080]]) {
        await page.setViewportSize({ width, height });
        const metrics = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }));
        assert.ok(metrics.w <= metrics.cw && metrics.h <= metrics.ch, `${pack}/${theme}/${width}: ${JSON.stringify(metrics)}`);
      }
    }
    assert.deepEqual(errors, []);
    console.log(`PASS shared-console ${pack}: /av/?app=${pack}, ${tabs.length} views, edit, isolated Save, export, reload, light/dark and four viewports`);
  } finally { await browser?.close(); await server.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const pack of Object.keys(FAMILIES)) await probeFamily(pack);
}
