const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const sourceKey = 'show-advance.v1';
const frontKey = 'sbd.frontOffice.document.v1';
const source = { schema: 'system-by-dave.show-advance.v1', meta: { showName: 'Synthetic show', client: 'Synthetic client', venue: 'Synthetic venue', showDate: '2026-10-08', advanceLead: 'Producer' }, items: [{ id: 'request-1', section: 'power', ask: 'Confirm shore power', owner: 'Venue', due: 'Tomorrow', priority: 'high', status: 'requested', details: 'Synthetic fixture only', notes: 'No real contacts' }] };
const sourceRaw = JSON.stringify({ ...source, savedAt: '2026-10-08T12:00:00Z' });
const initial = { version: 1, clients: [{ id: 'client-1', name: 'Existing client', contact: '', notes: '' }], venues: [{ id: 'venue-1', name: 'Existing venue', location: '', notes: '' }], jobs: [{ id: 'job-1', name: 'Existing job', clientId: 'client-1', venueId: 'venue-1', stage: 'Inquiry', nextAction: 'Keep this work', updates: [] }] };
const initialRaw = JSON.stringify(initial);
const screenshotDir = process.env.SCREENSHOT_DIR;
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
let server;
let url = process.env.FRONT_OFFICE_URL;
if (!url) {
  server = http.createServer((request, response) => {
    const requested = new URL(request.url, 'http://localhost');
    const file = path.resolve(root, '.' + decodeURIComponent(requested.pathname), requested.pathname.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
    fs.readFile(file, (error, body) => {
      if (error) return response.writeHead(404).end();
      response.setHeader('Content-Type', file.endsWith('.mjs') || file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      response.end(body);
    });
  });
}
const fileInput = (name, value) => ({ name, mimeType: 'application/json', buffer: Buffer.from(value) });
const waitForStatus = (page, phrase) => page.waitForFunction(expected => document.querySelector('#status').textContent.includes(expected), phrase);

(async () => {
  if (server) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); url = `http://127.0.0.1:${server.address().port}/front-office/`; }
  const launch = { headless: true, args: ['--no-sandbox'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : { channel: 'msedge' }) };
  const browser = await chromium.launch(launch);
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.evaluate(({ sourceKey, sourceRaw, frontKey, initialRaw }) => { localStorage.setItem(sourceKey, sourceRaw); localStorage.setItem(frontKey, initialRaw); }, { sourceKey, sourceRaw, frontKey, initialRaw });
    await page.reload();
    await page.locator('#tab-jobs').click();
    await page.locator('#advance-saved').click();
    assert.match(await page.locator('#advance-summary').innerText(), /Synthetic show.*1 requests/);
    assert.match(await page.locator('#advance-statuses').innerText(), /requested: 1/);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), frontKey), initialRaw);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#advance-preview').isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'advance-saved');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), frontKey), initialRaw);

    await page.locator('#advance-saved').click();
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: sourceKey, raw: JSON.stringify({ ...source, items: [{ ...source.items[0], status: 'confirmed' }] }) });
    await page.locator('#confirm-advance').click();
    assert.match(await page.locator('#status').innerText(), /Preview is stale/);
    assert.equal(await page.locator('.job').count(), 1);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), frontKey), initialRaw);
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: sourceKey, raw: sourceRaw });

    await page.locator('#advance-saved').click();
    await page.locator('#advance-client-choice').selectOption('client-1');
    await page.locator('#advance-venue-choice').selectOption('venue-1');
    assert.equal(await page.locator('#advance-client-name-label').isHidden(), true);
    assert.match(await page.locator('#advance-identities').innerText(), /Source client: Synthetic client.*Source venue: Synthetic venue/);
    await page.locator('#advance-job-name').fill('Synthetic show');
    await page.locator('#confirm-advance').click();
    assert.equal(await page.locator('.job').count(), 2);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), frontKey), initialRaw, 'copy is unsaved until explicit Save');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), sourceKey), sourceRaw);
    const [sourceDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export original Show Advance' }).click()]);
    assert.equal(fs.readFileSync(await sourceDownload.path(), 'utf8'), sourceRaw);
    const concurrentRaw = JSON.stringify({ ...initial, jobs: [...initial.jobs, { ...initial.jobs[0], id: 'concurrent-job' }] });
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: frontKey, raw: concurrentRaw });
    await page.locator('#save').click();
    assert.match(await page.locator('#status').innerText(), /Saved data changed in another tab/);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), frontKey), concurrentRaw, 'failed Save must not overwrite another tab');
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: frontKey, raw: initialRaw });
    await page.locator('#save').click();
    await page.reload();
    const saved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), frontKey));
    assert.equal(saved.jobs.length, 2);
    assert.deepEqual([saved.clients.length, saved.venues.length], [1, 1], 'existing identities are reused');
    assert.equal(saved.jobs[1].stage, 'Advance');
    assert.equal(saved.jobs[1].sourceAdvance.raw, sourceRaw);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), sourceKey), sourceRaw);
    const [backup] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
    const backupRaw = fs.readFileSync(await backup.path(), 'utf8');
    assert.equal(JSON.parse(backupRaw).jobs[1].sourceAdvance.raw, sourceRaw);

    await page.locator('#tab-jobs').click();
    await page.locator('#advance-file').setInputFiles(fileInput('repeat.json', JSON.stringify({ ...source, exportedAt: '2026-10-08T15:00:00Z' })));
    await waitForStatus(page, 'already copied');
    assert.match(await page.locator('#status').innerText(), /already copied/);
    assert.equal(await page.locator('#advance-preview').isHidden(), true);
    await page.locator('#advance-file').setInputFiles(fileInput('ambiguous.json', JSON.stringify({ ...source, items: [source.items[0], source.items[0]] })));
    await waitForStatus(page, 'duplicate Show Advance');
    assert.match(await page.locator('#status').innerText(), /duplicate Show Advance/);
    await page.locator('#advance-file').setInputFiles(fileInput('incomplete.json', JSON.stringify({ ...source, items: [{ id: 'request-1' }] })));
    await waitForStatus(page, 'Invalid or duplicate Show Advance request');
    assert.equal(await page.locator('#advance-preview').isHidden(), true);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), frontKey), JSON.stringify(saved));

    const changedRaw = JSON.stringify({ ...source, items: [{ ...source.items[0], status: 'confirmed' }], exportedAt: '2026-10-08T16:00:00Z' });
    await page.locator('#advance-file').setInputFiles(fileInput('changed.json', changedRaw));
    await page.locator('#advance-preview').waitFor({ state: 'visible' });
    assert.match(await page.locator('#advance-warning').innerText(), /separate job/);
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: frontKey, raw: JSON.stringify({ ...saved, jobs: [...saved.jobs, { ...saved.jobs[0], id: 'concurrent-job' }] }) });
    await page.locator('#confirm-advance').click();
    assert.match(await page.locator('#status').innerText(), /Preview is stale/);
    assert.equal(await page.locator('.job').count(), 2);
    await context.close();

    const restored = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const restoredPage = await restored.newPage();
    await restoredPage.goto(url);
    await restoredPage.locator('#import').setInputFiles(fileInput('front-office-backup.json', backupRaw));
    await restoredPage.locator('#import-preview').waitFor({ state: 'visible' });
    await restoredPage.locator('#confirm-import').click();
    await restoredPage.locator('#save').click();
    await restoredPage.reload();
    assert.equal(JSON.parse(await restoredPage.evaluate(key => localStorage.getItem(key), frontKey)).jobs[1].sourceAdvance.raw, sourceRaw);
    assert.equal(await restoredPage.evaluate(key => localStorage.getItem(key), sourceKey), null);
    await restored.close();

    for (const [width, height] of [[1440, 900], [375, 812], [844, 390], [320, 256], [3840, 1080]]) {
      const view = await browser.newContext({ viewport: { width, height } });
      const viewPage = await view.newPage();
      viewPage.on('pageerror', error => errors.push(error.message));
      await viewPage.goto(url);
      await viewPage.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: sourceKey, raw: sourceRaw });
      await viewPage.reload();
      await viewPage.locator('#tab-jobs').click();
      await viewPage.locator('#advance-saved').click();
      const geometry = await viewPage.evaluate(() => {
        const root = document.documentElement, dialog = document.querySelector('#advance-preview').getBoundingClientRect(), button = document.querySelector('#confirm-advance').getBoundingClientRect();
        return { x: root.scrollWidth - root.clientWidth, y: root.scrollHeight - root.clientHeight, left: dialog.left, right: dialog.right, top: dialog.top, bottom: dialog.bottom, targetWidth: button.width, targetHeight: button.height };
      });
      if (screenshotDir && [320, 375, 1440, 3840].includes(width)) await viewPage.screenshot({ path: path.join(screenshotDir, `front-office-advance-${width}.png`) });
      assert.deepEqual([geometry.x, geometry.y], [0, 0], `${width}×${height} root containment`);
      assert.ok(geometry.left >= 0 && geometry.right <= width + 1 && geometry.top >= 0 && geometry.bottom <= height + 1, `${width}×${height} dialog bounds`);
      assert.ok(geometry.targetHeight >= 44, `${width}×${height} confirmation target`);
      await viewPage.locator('#cancel-advance').scrollIntoViewIfNeeded();
      assert.equal(await viewPage.locator('#cancel-advance').isVisible(), true);
      await view.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS Front Office Show Advance saved/file preview, cancel, stale source/document, explicit binding, unsaved copy, backup/restart, rejection and five viewport checks');
  } finally { await browser.close(); if (server) server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; if (server) server.close(); });
