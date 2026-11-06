const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const { startRelay } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [width, height] of [[1440, 900], [375, 812]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.route('https://wst.housevideo.app/api/tasks**', route => route.fulfill({
        contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ tasks: [{ id: 'fixture', text: 'Shared fixture task', done: false, revision: 1 }] }),
      }));
      let releaseModule;
      const moduleReady = new Promise(resolve => { releaseModule = resolve; });
      await context.route('**/workspace/workspace.js', async route => { await moduleReady; await route.continue(); });
      const page = await context.newPage(), errors = [], commands = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.url().endsWith('/api/command')) commands.push(request.method()); });
      await page.goto(relay.base);
      assert.equal(await page.locator('#tab-btn-home').getAttribute('aria-selected'), 'true');
      await page.locator('[data-local-target="notes"]').click();
      const notes = page.frameLocator('[data-workspace="notes"]');
      await notes.locator('#notes').waitFor({ state: 'attached' });
      assert.equal(await notes.locator('#notes').isDisabled(), true, 'do not accept edits before saved content and autosave initialize');
      releaseModule();
      await notes.locator('#notes').fill('Isolated browser fixture note');
      assert.equal(await notes.locator('#notes').evaluate(el => localStorage.getItem('wst.frozen.personal-notes.v1')), 'Isolated browser fixture note');
      await notes.locator('#task-list').getByText('Shared fixture task').waitFor();
      await page.locator('#tab-btn-info').click();
      await page.frameLocator('[data-workspace="info"]').locator('#projector-cards h3').filter({ hasText: 'Projector D' }).waitFor();
      await page.locator('#tab-btn-stage').click();
      assert.equal(await page.locator('#tab-stage').isVisible(), true);
      await page.locator('#tab-btn-rig').click();
      assert.equal(await page.locator('#grid').isVisible(), true);
      await page.locator('#tab-btn-notes').click();
      assert.equal(await notes.locator('#notes').inputValue(), 'Isolated browser fixture note');
      await page.reload();
      await page.locator('[data-local-target="notes"]').click();
      await notes.locator('#notes[data-notes-ready="true"]').waitFor();
      assert.equal(await notes.locator('#notes').inputValue(), 'Isolated browser fixture note');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok(await notes.locator('html').evaluate(el => el.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []); assert.deepEqual(commands, []);
      await context.close();
    }
    console.log('Unified workspace: Home choices, shared task read, info, Stage/Rig return, note reload and desktop/mobile containment passed');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
