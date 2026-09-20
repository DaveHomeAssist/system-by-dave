#!/usr/bin/env node
// Real browser acceptance for every source and destination origin.
// Every scenario owns a disposable context; no operator profile or data is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import domainSites from './domain_sites_lib.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const live = process.argv.includes('--live');
const captureDir = process.env.CUTOVER_CAPTURE_DIR;
if (captureDir) fs.mkdirSync(captureDir, { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sbd-cutover-'));
const servers = [];
const results = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.wasm': 'application/wasm' };

async function serve(directory) {
  const server = http.createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = path.resolve(directory, '.' + pathname);
    if (!file.startsWith(directory + path.sep) && file !== directory) { response.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!pathname.endsWith('/')) { response.writeHead(301, { Location: pathname + '/' }).end(); return; }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

let source = 'https://systembydave.com';
const sites = [
  { id: 'housevideo', origin: 'https://housevideo.app', route: '/fmp/', key: 'fmp.cutover.acceptance', database: 'fmpPhotosV1' },
  { id: 'avbydave', origin: 'https://avbydave.com', route: '/av-suite.html', key: 'sbd.showboard.cutover-acceptance', database: 'PixelForge' },
  // The preshow walk is its own origin. It claims the same fmp prefix and photo
  // database as the hub, so its acceptance key is distinct to keep the two apart.
  { id: 'fmpwalk-site', origin: 'https://walk.housevideo.app', route: '/fmpwalk/', key: 'fmp.walk-cutover.acceptance', database: 'fmpPhotosV1' }
];
function ownedPages(directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['.git', '.github', 'node_modules', '_site', '_sites'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return ownedPages(file);
    const relative = path.relative(root, file);
    const owner = /\.html$/.test(relative) && domainSites.siteFor(relative);
    return owner ? [{ site: owner.id, route: '/' + relative.replace(/index\.html$/, '') }] : [];
  });
}
const publishedPages = ownedPages();
let browser;
try {
  if (!live) {
    const sourceRoot = path.join(temporary, 'source');
    fs.cpSync(root, sourceRoot, { recursive: true, filter: file => !['.git', '.github', 'node_modules', '.agent-claim', '_site', '_sites'].includes(path.basename(file)) });
    source = await serve(sourceRoot);
    for (const site of sites) site.origin = await serve(path.join(temporary, site.id));
    execFileSync(process.execPath, [path.join(root, 'scripts/stage_domain_sites.mjs'), '--out', temporary, '--site-root', sourceRoot, '--simulate', '--source-origin', source,
      ...sites.flatMap(site => ['--site-origin', `${site.id}=${site.origin}`])], { cwd: root, stdio: 'pipe' });
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });

  async function test(name, fn) {
    if (process.env.CUTOVER_FILTER && !name.includes(process.env.CUTOVER_FILTER)) return;
    const context = await browser.newContext({ acceptDownloads: true });
    context.setDefaultTimeout(7000);
    if (captureDir) await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    try {
      const details = await fn(page, context);
      results.push({ name, pass: true, ...(details ? { details } : {}) });
      console.log(`PASS ${name}`);
    } catch (error) {
      const state = await page.evaluate(async () => ({
        visibility: document.visibilityState, controlled: Boolean(navigator.serviceWorker?.controller),
        workers: navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).map(reg => ({ scope: reg.scope, active: reg.active?.state, installing: reg.installing?.state })) : []
      })).catch(() => null);
      results.push({ name, pass: false, error: error.message, url: page.url(), state });
      console.error(`FAIL ${name}: ${error.message}`);
      if (captureDir && !page.isClosed()) await page.screenshot({ path: path.join(captureDir, name.replace(/[^a-z0-9]+/gi, '-') + '.png') }).catch(() => {});
    } finally {
      if (captureDir) await context.tracing.stop(results.at(-1)?.pass === false ? { path: path.join(captureDir, name.replace(/[^a-z0-9]+/gi, '-') + '.zip') } : {}).catch(() => {});
      await context.close();
    }
  }

  async function seed(page, site, database = false) {
    const sourceOrigin = site.sourceOrigin || source;
    await page.goto(sourceOrigin + (site.sourceOrigin ? '/transfer.html' : '/index.html'));
    await page.evaluate(async ({ key, database, includeDatabase, sourceOrigin }) => {
      localStorage.setItem(key, JSON.stringify({ text: 'Preserve this draft ✓', order: [3, 1, 2] }));
      localStorage.setItem('unrelated-private-fixture', 'must stay here');
      // A prior portfolio-to-hub migration must not skip the hub-to-walk move.
      if (sourceOrigin) localStorage.setItem('sbd.domainMove.housevideo.v1', JSON.stringify({ state: 'moved' }));
      if (!includeDatabase) return;
      await new Promise((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('acceptance', { keyPath: 'id' });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('acceptance', 'readwrite');
          tx.objectStore('acceptance').put({ id: 'photo', data: new Blob(['synthetic photo bytes'], { type: 'image/png' }), at: new Date('2026-09-19T00:00:00Z') });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      });
    }, { ...site, includeDatabase: database });
    await page.goto(sourceOrigin + (site.fromRoute || site.route) + '?cutover=acceptance#preserved');
    await page.getByRole('button', { name: 'Move my data and continue' }).waitFor();
  }

  async function move(page, context) {
    const popupReady = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Move my data and continue' }).click();
    const popup = await popupReady;
    await popup.waitForLoadState();
    return popup;
  }

  const config = JSON.parse(fs.readFileSync(path.join(root, 'scripts/domain-sites.json'), 'utf8'));
  assert.deepEqual(sites.map(site => site.id).sort(), config.sites.map(site => site.id).sort(), 'Every configured origin needs acceptance coverage');
  const migrations = sites.map(site => ({ ...site, label: site.id }));
  for (const from of config.sites) {
    for (const [route, targetId] of Object.entries(from.movedTo || {})) {
      const target = sites.find(site => site.id === targetId);
      assert.ok(target, `Missing acceptance target ${targetId}`);
      migrations.push({ ...target, sourceOrigin: sites.find(site => site.id === from.id).origin,
        fromRoute: '/' + route, label: `${from.id} ${route} to ${targetId}` });
    }
  }
  const portfolioSource = source;
  for (const site of migrations) {
    const source = site.sourceOrigin || portfolioSource;
    await test(`${site.label} clean redirect and history`, async page => {
      await page.goto(source + '/index.html');
      await page.goto(source + (site.fromRoute || site.route) + '?cutover=clean#preserved');
      await page.waitForURL(site.origin + site.route + '?cutover=clean#preserved');
      assert.ok((await page.locator('body').innerText()).length > 100);
      await page.goBack();
      assert.equal(new URL(page.url()).origin, source);
      await page.goForward();
      assert.equal(new URL(page.url()).origin, site.origin);
    });

    await test(`${site.label} lossless migration and repeated visit`, async (page, context) => {
      await seed(page, site, true);
      await move(page, context);
      await page.waitForURL(site.origin + site.route + '?cutover=acceptance#preserved');
      const stored = await page.evaluate(async site => {
        const record = await new Promise((resolve, reject) => {
          const request = indexedDB.open(site.database);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('acceptance', 'readonly');
            const read = tx.objectStore('acceptance').get('photo');
            read.onsuccess = () => resolve(read.result);
            tx.oncomplete = () => db.close();
          };
        });
        return { local: JSON.parse(localStorage.getItem(site.key)), unrelated: localStorage.getItem('unrelated-private-fixture'), bytes: await record.data.text(), date: record.at.toISOString() };
      }, site);
      assert.deepEqual(stored, { local: { text: 'Preserve this draft ✓', order: [3, 1, 2] }, unrelated: null, bytes: 'synthetic photo bytes', date: '2026-09-19T00:00:00.000Z' });
      await page.reload();
      assert.ok(await page.evaluate(key => localStorage.getItem(key), site.key));
      await page.evaluate(key => localStorage.setItem(key, 'new destination edit'), site.key);
      const original = await context.newPage();
      await original.goto(source + '/index.html');
      assert.equal(await original.evaluate(key => JSON.parse(localStorage.getItem(key)).text, site.key), 'Preserve this draft ✓');
      assert.equal(await original.evaluate(id => JSON.parse(localStorage.getItem('sbd.domainMove.' + id + '.v1')).state, site.id), 'moved');
      await page.bringToFront();
      await page.goto(source + (site.fromRoute || site.route));
      await page.waitForURL(site.origin + site.route);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), site.key), 'new destination edit');
      if (site.id === 'avbydave') {
        await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000, polling: 100 });
        await context.setOffline(true);
        await page.reload();
        assert.equal(await page.evaluate(key => localStorage.getItem(key), site.key), 'new destination edit');
        assert.ok((await page.locator('body').innerText()).includes('AV SUITE'));
      }
    });

    await test(`${site.label} interrupted popup retries`, async (page, context) => {
      await context.route(site.origin + '/js/domain-transfer.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
      await seed(page, site);
      await page.clock.install();
      const popup = await move(page, context);
      await popup.close();
      await page.clock.fastForward(31000);
      assert.equal(await page.evaluate(id => localStorage.getItem('sbd.domainMove.' + id + '.v1'), site.id), null);
      await context.unroute(site.origin + '/js/domain-transfer.js');
      await move(page, context);
      await page.clock.runFor(1700);
      await page.waitForURL(site.origin + site.route + '?cutover=acceptance#preserved');
    });

    await test(`${site.label} quota failure remains retryable`, async (page, context) => {
      await context.addInitScript(({ origin, key }) => {
        if (location.origin !== origin) return;
        if (localStorage.getItem('cutover-quota-recovered')) return;
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('Injected quota failure', 'QuotaExceededError'); return set.call(this, name, value); };
      }, site);
      await seed(page, site);
      const popup = await move(page, context);
      await popup.locator('#transferStatus').filter({ hasText: /did not finish|could not|failed/i }).waitFor();
      assert.equal(new URL(page.url()).origin, source);
      assert.equal(await page.evaluate(id => localStorage.getItem('sbd.domainMove.' + id + '.v1'), site.id), null);
      assert.ok(await page.getByRole('button', { name: 'Move my data and continue' }).isEnabled());
      await popup.evaluate(() => localStorage.setItem('cutover-quota-recovered', 'yes'));
      await popup.close();
      await move(page, context);
      await page.waitForURL(site.origin + site.route + '?cutover=acceptance#preserved');
      assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).text, site.key), 'Preserve this draft ✓');
    });

    await test(`${site.label} invalid backup rejected`, async page => {
      await page.goto(site.origin + '/transfer.html');
      for (const contents of ['not json', JSON.stringify({ schema: 'system-by-dave.domain-transfer.v0', site: site.id }), JSON.stringify({ schema: 'system-by-dave.domain-transfer.v1', site: 'wrong-site' })]) {
        await page.locator('#backupFile').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
        await page.locator('#transferStatus').filter({ hasText: 'could not be imported' }).waitFor();
        assert.equal(await page.evaluate(key => localStorage.getItem(key), site.key), null);
      }
    });

    await test(`${site.label} backup roundtrip and duplicate imports`, async page => {
      await seed(page, site, true);
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download a backup' }).click();
      const file = await (await downloaded).path();
      await page.goto(site.origin + '/transfer.html');
      await page.locator('#backupFile').setInputFiles(file);
      await page.getByRole('heading', { name: 'Transfer complete', exact: true }).waitFor();
      await page.locator('#backupFile').setInputFiles([]);
      await page.locator('#backupFile').setInputFiles(file);
      await page.locator('#transferStatus').filter({ hasText: 'Moved 0 items' }).waitFor();
      assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).text, site.key), 'Preserve this draft ✓');
    });

    await test(`${site.label} incompatible database does not acknowledge success`, async (page, context) => {
      const destination = await context.newPage();
      await destination.goto(site.origin + '/transfer.html');
      await destination.evaluate(name => new Promise(resolve => {
        const request = indexedDB.open(name, 2);
        request.onupgradeneeded = () => request.result.createObjectStore('other');
        request.onsuccess = () => { request.result.close(); resolve(); };
      }), site.database);
      await seed(page, site, true);
      const popup = await move(page, context);
      await popup.locator('#transferStatus').filter({ hasText: /did not finish|could not|incompatible/i }).waitFor();
      assert.equal(new URL(page.url()).origin, source);
      assert.equal(await page.evaluate(id => localStorage.getItem('sbd.domainMove.' + id + '.v1'), site.id), null);
    });

    await test(`${site.label} unreadable source stays recoverable`, async (page, context) => {
      await seed(page, site, true);
      await context.addInitScript(origin => {
        if (location.origin !== origin) return;
        const open = IDBFactory.prototype.open;
        window.restoreFixtureDatabaseAccess = () => { IDBFactory.prototype.open = open; };
        IDBFactory.prototype.open = function() { throw new DOMException('Injected read failure', 'SecurityError'); };
      }, source);
      await page.reload();
      await page.locator('#moveStatus').filter({ hasText: /could not|unable|failed/i }).waitFor();
      assert.equal(new URL(page.url()).origin, source);
      assert.equal(await page.evaluate(id => localStorage.getItem('sbd.domainMove.' + id + '.v1'), site.id), null);
      assert.ok(await page.getByRole('button', { name: 'Try reading saved data again' }).isVisible());
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (captureDir) await page.screenshot({ path: path.join(captureDir, site.id + '-recovery-mobile.png') });
      await page.evaluate(() => window.restoreFixtureDatabaseAccess());
      await page.getByRole('button', { name: 'Try reading saved data again' }).click();
      await page.getByRole('button', { name: 'Move my data and continue' }).waitFor();
      await move(page, context);
      await page.waitForURL(site.origin + site.route + '?cutover=acceptance#preserved');
    });
  }

  for (const mismatch of [false, true]) {
    await test(`walk transfer rejects ${mismatch ? 'forged payload source' : 'unconfigured opener origin'}`, async (page, context) => {
      const walk = sites.find(site => site.id === 'fmpwalk-site');
      const opener = sites.find(site => site.id === (mismatch ? 'housevideo' : 'avbydave'));
      await page.goto(opener.origin + '/transfer.html');
      const opened = context.waitForEvent('page');
      await page.evaluate(origin => { window.acceptancePopup = window.open(origin + '/transfer.html'); }, walk.origin);
      const popup = await opened;
      await popup.waitForLoadState();
      await popup.evaluate(() => {
        window.addEventListener('message', event => {
          if (event.data?.type === 'sbd-domain-transfer-payload') window.receivedAcceptancePayload = true;
        });
      });
      await page.evaluate(({ walk, claimedSource }) => {
        window.acceptancePopup.postMessage({ type: 'sbd-domain-transfer-payload', payload: {
          schema: 'system-by-dave.domain-transfer.v1', site: walk.id, source: claimedSource,
          localStorage: { [walk.key]: 'must not import' }, indexedDB: []
        } }, walk.origin);
      }, { walk, claimedSource: mismatch ? source : opener.origin });
      await popup.waitForFunction(() => window.receivedAcceptancePayload);
      assert.equal(await popup.evaluate(key => localStorage.getItem(key), walk.key), null);
      assert.equal(await popup.getByRole('heading', { name: 'Transfer complete', exact: true }).count(), 0);
    });
  }

  await test('source worker retires only its own caches', async page => {
    await page.goto(source + '/index.html');
    await page.evaluate(async () => {
      await (await caches.open('sbd-av-suite-acceptance-old')).put('/av-suite.html', new Response('old AV shell'));
      await (await caches.open('unrelated-acceptance-cache')).put('/unrelated', new Response('keep'));
      localStorage.setItem('sbd.showboard.retirement-acceptance', 'keep draft');
      await navigator.serviceWorker.register('/av-suite-worker.js', { scope: '/' });
    });
    await page.waitForFunction(async () => !(await caches.keys()).some(name => name.startsWith('sbd-av-suite-')) && !(await navigator.serviceWorker.getRegistrations()).length);
    assert.ok(await page.evaluate(async () => (await caches.keys()).includes('unrelated-acceptance-cache')));
    assert.equal(await page.evaluate(() => localStorage.getItem('sbd.showboard.retirement-acceptance')), 'keep draft');
  });

  for (const site of sites) {
    await test(`${site.id} all published pages and home links`, async page => {
      const broken = [];
      page.on('response', response => {
        if (response.status() >= 400 && response.url().startsWith(site.origin + '/') && !response.url().includes('/api/')) broken.push(response.url());
      });
      const routes = [...new Set(publishedPages.filter(item => item.site === site.id).map(item => item.route))];
      for (const route of routes) {
        const response = await page.goto(site.origin + route, { waitUntil: 'load' });
        assert.equal(response.status(), 200, route);
        await page.waitForLoadState('networkidle');
        const homes = await page.locator('a').evaluateAll(links => links.filter(link => /^(System by Dave( home)?|Back to System by Dave)$/i.test(link.textContent.trim())).map(link => link.href));
        assert.ok(homes.every(href => href === 'https://systembydave.com/' || href === 'https://systembydave.com/index.html'), route + ' home links');
      }
      assert.deepEqual(broken, []);
      return { pages: routes.length };
    });
  }

  await test('AV offline manifest and every supported page', async (page, context) => {
    const site = sites[1];
    await page.goto(site.origin + '/av-suite.html');
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000, polling: 100 });
    const manifest = await page.evaluate(async () => {
      const expected = SBD_REGISTRY.offlineAssets().map(asset => new URL(asset, location.href).pathname);
      const names = (await caches.keys()).filter(name => name.startsWith('sbd-av-suite-'));
      const entries = (await Promise.all(names.map(async name => (await (await caches.open(name)).keys()).map(request => new URL(request.url).pathname)))).flat();
      return { expected, entries };
    });
    assert.deepEqual([...new Set(manifest.entries)].sort(), [...new Set(manifest.expected)].sort());
    await context.setOffline(true);
    const pages = manifest.expected.filter(asset => /\.html$/.test(asset));
    for (const route of pages) {
      const response = await page.goto(site.origin + route, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, route);
      await page.waitForLoadState('networkidle');
      assert.equal(new URL(page.url()).origin, site.origin, route + ' remains available offline');
      assert.ok((await page.locator('body').innerText()).trim().length > 20, route);
    }
    return { assets: manifest.expected.length, offlinePages: pages.length };
  });

  await test('FMP published pages and intentional CSP', async page => {
    const site = sites[0];
    const routes = ['/fmp/', '/fmp/house/', '/fmp/guide/', '/fmp/rig/', '/fmp/gear/', '/fmp/build/', '/fmp/ptz/', '/fmp/camera/', '/fmpwalk/', '/fmp-index/', '/fmp-walk/', '/switcher/', '/shader/', '/backfocus/', '/transfer.html'];
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of routes) {
      console.log(`Checking FMP route ${route}`);
      try {
        const response = await page.goto(site.origin + route, { waitUntil: 'load' });
        assert.equal(response.status(), 200, route);
        await page.waitForLoadState('networkidle');
        // Software WebGL initialization can exceed the short control timeout.
        if (route === '/fmp/rig/') await page.locator('main[data-render-ready="true"]').waitFor({ state: 'attached', timeout: 30000 });
        assert.ok((await page.locator('body').innerText({ timeout: route === '/fmp/rig/' ? 30000 : 7000 })).trim().length > 30, route);
      } catch (error) {
        throw new Error(`${route} at ${page.url()}: ${error.message}`, { cause: error });
      }
    }
    await page.goto(site.origin + '/fmp/house/');
    assert.match(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'), /connect-src 'none'/);
    assert.equal(await page.evaluate(() => fetch(location.href).then(() => false, () => true)), true);
    assert.deepEqual(errors, []);
    return { pages: routes.length, cspProbeBlockedAsExpected: true };
  });
} finally {
  if (browser) await browser.close();
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
  fs.rmSync(temporary, { recursive: true, force: true });
  const report = { at: new Date().toISOString(), mode: live ? 'live' : 'simulation', results };
  if (captureDir) fs.writeFileSync(path.join(captureDir, live ? 'live.json' : 'simulation.json'), JSON.stringify(report, null, 2) + '\n');
}
const failures = results.filter(result => !result.pass);
console.log(`${results.length - failures.length}/${results.length} cutover scenarios passed`);
if (failures.length) process.exitCode = 1;
