import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OLD_REVISION = process.env.AV_OFFLINE_OLD_REVISION || 'adf1f1eda565b51b13d42b08968ca081e0f547a7';
const NEW_REVISION = process.env.AV_OFFLINE_NEW_REVISION || '55bec1afdd3b9e8e14f5a7ac3ed0a0caef858915';
const OLD_ROOT = process.env.AV_OFFLINE_OLD_ROOT ? resolve(process.env.AV_OFFLINE_OLD_ROOT) : '';
const NEW_ROOT = process.env.AV_OFFLINE_NEW_ROOT ? resolve(process.env.AV_OFFLINE_NEW_ROOT) : '';
const RAIL_ASSETS = [
  'av-video/index.html',
  'css/sbd-rail.css',
  'css/sbd-rail-dialogs.css',
  'js/sbd-rail.js',
  'js/sbd-rail-dialogs.js',
  'js/sbd-rail-mount.js',
  'js/sbd-registry.js'
];
const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function git(args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    execFile('git', args, { cwd: ROOT, encoding: null, maxBuffer: 32 * 1024 * 1024, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.message += `\n${String(stderr || '')}`;
        rejectRun(error);
      } else resolveRun(stdout);
    });
  });
}

async function assertRevisionRoot(root, revision, label) {
  if (!root) return;
  assert.equal((await stat(root)).isDirectory(), true, `${label} root is not a directory`);
  const head = String(await git(['-C', root, 'rev-parse', 'HEAD'])).trim();
  assert.equal(head, revision, `${label} root must be the exact requested revision`);
}

function fileReader(revision, root) {
  if (!root) return relative => git(['show', `${revision}:${relative}`]);
  const prefix = `${root}${sep}`;
  return async relative => {
    const absolute = resolve(root, relative);
    assert.ok(absolute.startsWith(prefix), 'Fixture path escaped its revision root');
    return readFile(absolute);
  };
}

function requestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://offline-transition.test').pathname);
  let relative = pathname.replace(/^\/+/, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  if (relative.split('/').includes('..')) throw new Error('Path traversal refused');
  return relative;
}

function versionFromRegistry(source, revision) {
  const match = String(source).match(/version:\s*'([^']+)'/);
  assert.ok(match, `Registry ${revision} does not expose an offline version`);
  return match[1];
}

async function workerInfo(page) {
  return page.evaluate(async () => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return null;
    return new Promise((resolveInfo, rejectInfo) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => rejectInfo(new Error('Service-worker version response timed out')), 5000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        channel.port1.close();
        resolveInfo(event.data);
      };
      controller.postMessage({ type: 'SBD_OFFLINE_VERSION' }, [channel.port2]);
    });
  });
}

async function waitForController(page) {
  try {
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 45000 });
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 45000 });
  }
}

async function storageSnapshot(page, keys) {
  return page.evaluate(keyList => Object.fromEntries(keyList.map(key => [key, localStorage.getItem(key)])), keys);
}

async function assertCurrentClient(page, expected) {
  await page.getByRole('heading', { name: 'AV Video', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('[data-sbd-rail-host]')?.getAttribute('data-rail-state') === 'ready');
  assert.match(await page.locator('.header-plan').textContent(), /General session · Video/);
  assert.equal(await page.locator('.sbd-rail__entry[data-rail-ref="console:audio"]').count(), 0, 'saved Rail customization was not applied');
  assert.equal(await page.locator('.sbd-rail__entry').count(), 8, 'customized Rail should retain eight pinned entries');
  const href = new URL(await page.locator('.sbd-rail__entry[data-rail-ref="console:av-video"]').getAttribute('href'), expected.base);
  assert.equal(href.searchParams.get('sbdShow'), 'Returning Client');
  assert.equal(href.searchParams.get('sbdVenue'), 'Transition Hall');
  assert.equal(href.searchParams.get('sbdDate'), '2026-10-07');
  assert.equal(href.searchParams.get('sbdOperator'), 'Dave');
  assert.equal(href.searchParams.get('sbdPhase'), 'show');
  assert.equal(href.searchParams.has('private'), false, 'unrecognized context leaked into the Rail route');
  assert.deepEqual(await storageSnapshot(page, Object.keys(expected.storage)), expected.storage);
  assert.deepEqual(await workerInfo(page), { version: expected.version, cache: expected.cache });
}

await assertRevisionRoot(OLD_ROOT, OLD_REVISION, 'Previous-release');
await assertRevisionRoot(NEW_ROOT, NEW_REVISION, 'Reviewed-release');
await git(['merge-base', '--is-ancestor', OLD_REVISION, NEW_REVISION]);
const readOld = fileReader(OLD_REVISION, OLD_ROOT);
const readNew = fileReader(NEW_REVISION, NEW_ROOT);
const oldVersion = versionFromRegistry(await readOld('js/sbd-registry.js'), OLD_REVISION);
const newVersion = versionFromRegistry(await readNew('js/sbd-registry.js'), NEW_REVISION);
assert.notEqual(oldVersion, newVersion, 'The two release fixtures must use different cache generations');
for (const asset of RAIL_ASSETS) await readNew(asset);

let phase = 'old';
const requests = { old: new Set(), new: new Set() };
const server = createServer(async (request, response) => {
  try {
    const relative = requestPath(request.url);
    requests[phase].add(relative);
    const body = await (phase === 'old' ? readOld(relative) : readNew(relative));
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': MIME[extname(relative).toLowerCase()] || 'application/octet-stream',
      'service-worker-allowed': '/'
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' || error.code === 128 ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error.code === 'ENOENT' || error.code === 128 ? 'not found' : 'fixture error');
  }
});
await new Promise(resolveReady => server.listen(0, '127.0.0.1', resolveReady));

const base = `http://127.0.0.1:${server.address().port}`;
const query = new URLSearchParams({
  sbdShow: 'Returning Client',
  sbdVenue: 'Transition Hall',
  sbdDate: '2026-10-07',
  sbdOperator: 'Dave',
  sbdPhase: 'show',
  private: 'drop'
});
const url = `${base}/av-video/?${query}`;
const args = process.argv.slice(2);
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'allow' });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'AV Video', exact: true }).waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/av-suite-worker.js', { scope: '/', updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
  });
  await waitForController(page);
  const oldInfo = await workerInfo(page);
  assert.deepEqual(oldInfo, { version: oldVersion, cache: `sbd-av-suite-${oldVersion}` });

  await page.getByRole('button', { name: 'Try a sample plan', exact: true }).click();
  await page.getByRole('button', { name: /^Save/ }).click();
  await page.waitForFunction(() => localStorage.getItem('sbd.avVideo.v1')?.includes('General session'));

  /* A returning client can receive network-first application assets while the
     previous worker still controls the page. Exercise customization in that
     real intermediate state before asking the registration to update. */
  phase = 'new';
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[data-sbd-rail-host]')?.getAttribute('data-rail-state') === 'ready');
  assert.deepEqual(await workerInfo(page), oldInfo, 'previous worker should still control the network-refreshed Rail page');
  await page.locator('.sbd-rail__customize').click();
  const customize = page.locator('#sbdRailCustomize');
  await customize.waitFor({ state: 'visible' });
  await customize.locator('[data-rail-ref="console:audio"][data-action="unpin"]').click();
  await page.getByRole('button', { name: 'Close Customize rail', exact: true }).click();
  const stored = await storageSnapshot(page, ['sbd.avVideo.v1', 'sbd.rail.v1']);
  assert.deepEqual(JSON.parse(stored['sbd.rail.v1']), {
    version: 1,
    pinned: [
      'console:av-video',
      'console:show-control',
      'console:show-ops',
      'console:front-office',
      'console:shop',
      'console:infrastructure',
      'console:lighting',
      'console:av-calculator'
    ]
  });
  assert.ok(stored['sbd.avVideo.v1']?.includes('General session · Video'));
  const oldCaches = await page.evaluate(() => caches.keys());
  assert.ok(oldCaches.includes(oldInfo.cache), 'previous-release cache was not installed');

  await page.evaluate(() => {
    window.__sbdControllerChanged = new Promise(resolveChange => {
      const timer = setTimeout(() => resolveChange(false), 45000);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(timer);
        resolveChange(true);
      }, { once: true });
    });
  });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) throw new Error('Previous-release registration disappeared');
    await registration.update();
  });
  assert.equal(await page.evaluate(() => window.__sbdControllerChanged), true, 'reviewed worker did not take control');
  const newInfo = await workerInfo(page);
  assert.deepEqual(newInfo, { version: newVersion, cache: `sbd-av-suite-${newVersion}` });

  await page.reload({ waitUntil: 'domcontentloaded' });
  const expected = { base, storage: stored, version: newVersion, cache: newInfo.cache };
  await assertCurrentClient(page, expected);
  const cacheState = await page.evaluate(async ({ oldCache, newCache, railAssets }) => {
    const names = await caches.keys();
    const cache = await caches.open(newCache);
    const matches = await Promise.all(railAssets.map(asset => cache.match(new URL(asset, location.origin).href, { ignoreSearch: true })));
    return { names, oldPresent: names.includes(oldCache), railReady: matches.every(Boolean) };
  }, { oldCache: oldInfo.cache, newCache: newInfo.cache, railAssets: RAIL_ASSETS });
  assert.equal(cacheState.oldPresent, false, 'previous cache generation survived activation');
  assert.ok(cacheState.names.includes(newInfo.cache), 'reviewed cache generation is missing');
  assert.equal(cacheState.railReady, true, 'reviewed Rail assets are not all cached');

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertCurrentClient(page, expected);
  assert.deepEqual(pageErrors, []);

  console.log(JSON.stringify({
    result: 'PASS',
    oldRevision: OLD_REVISION,
    oldDeployment: 'https://github.com/DaveHomeAssist/system-by-dave/actions/runs/37433638295',
    oldCache: oldInfo.cache,
    newRevision: NEW_REVISION,
    newCache: newInfo.cache,
    origin: base,
    protocol: ['old install and control', 'saved AV Video data', 'network-first Rail UI under the old controller plus UI customization', 'worker update and controller change', 'old-cache removal plus new Rail precache', 'offline reload'],
    preserved: Object.keys(stored),
    context: Object.fromEntries(query.entries()),
    requestCounts: { old: requests.old.size, new: requests.new.size }
  }, null, 2));
} finally {
  await context.setOffline(false).catch(() => {});
  await context.close();
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
