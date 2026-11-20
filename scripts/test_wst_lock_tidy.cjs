const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../wst');
const contentType = file => file.endsWith('.js') ? 'text/javascript'
  : file.endsWith('.css') ? 'text/css'
  : file.endsWith('.json') ? 'application/json'
  : file.endsWith('.txt') ? 'text/plain'
  : 'text/html';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined, args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
      const context = await browser.newContext({ viewport });
      let taskReads = 0;
      let taskWrites = 0;
      let prompts = 0;
      await context.route('https://wst.housevideo.app/**', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/tasks') {
          if (route.request().method() === 'GET') taskReads++;
          else taskWrites++;
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"tasks":[]}' });
        }
        const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const file = path.resolve(root, relative);
        if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          return route.fulfill({ status: 404, body: 'Not found' });
        }
        route.fulfill({ status: 200, contentType: contentType(file), body: fs.readFileSync(file) });
      });
      const page = await context.newPage();
      page.on('dialog', async dialog => { prompts++; await dialog.dismiss(); });
      await page.goto('https://wst.housevideo.app/');
      await page.locator('#home-title').waitFor();

      assert.equal(await page.getByText('Every captured run since November 15, with original photos').count(), 1);
      assert.equal(await page.getByText('Operator controls', { exact: true }).count(), 0);
      assert.equal(await page.locator('[data-controller-only]:visible').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true);
      assert.equal(await page.locator('.home-choices :is(button,a):visible').evaluateAll(items => items.every(item => {
        const title = item.querySelector('strong').getBoundingClientRect();
        const note = item.querySelector(':scope > span').getBoundingClientRect();
        return title.bottom <= note.top + 1;
      })), true);

      await page.locator('[data-planning-entry]').click();
      await page.locator('.planning-views [data-route=notes]').click();
      await page.locator('#notes[data-notes-ready=true]').waitFor();
      assert.equal(prompts, 0, 'reading tasks never asks for a passcode');
      assert.ok(taskReads >= 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true);
      assert.equal(await page.locator('#workspace-panels').evaluate(panel => {
        const box = panel.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
      }), true);
      assert.equal(await page.locator('#unlock-task-editing').evaluate(button => {
        const box = button.getBoundingClientRect();
        return box.width >= 44 && box.height >= 44 && box.right <= innerWidth;
      }), true);

      await page.locator('#task-text').fill('Unsaved browser fixture');
      await page.locator('#task-add button').click();
      const feedback = page.locator('#task-feedback');
      await feedback.waitFor();
      assert.equal(await feedback.textContent(), 'Editing is locked.');
      assert.equal(prompts, 1);
      assert.equal(taskWrites, 0);
      assert.equal(await page.evaluate(() => sessionStorage.length), 0);
      await context.close();
    }
    console.log('PASS hosted WST lock and tidy at desktop and phone widths');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
