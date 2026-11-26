const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

const base = process.env.ENVISION_PUBLIC_BASE || 'http://127.0.0.1:8080';
const evidence = process.env.ENVISION_BRIEF_EVIDENCE;

async function verifyExport(page, card, entry) {
  const waiting = page.waitForEvent('download');
  await card.getByRole('button', {name: 'Export for Envision'}).click();
  const file = await waiting;
  const bytes = await fs.readFile(await file.path());
  const expected = {format: 'envision-brief-1', kind: 'image', title: entry.name, prompt: entry.img};
  assert.deepEqual(JSON.parse(bytes), expected);
  assert.equal(file.suggestedFilename(), entry.name.replace(/[<>:"/\\|?*]/g, '-') + '.brief.json');
  if (entry.id === 35 && evidence) await fs.writeFile(path.join(evidence, 'Urban Architecture.brief.json'), bytes);
  await file.delete();
}

async function verifyCopyRecovery(page, card, prompt) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
      writeText: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); }
    }});
    document.execCommand = () => false;
  });
  const copy = card.getByRole('button', {name: 'Copy image prompt'});
  await copy.click();
  const textarea = page.getByRole('textbox', {name: 'Text to copy'});
  assert.equal(await textarea.inputValue(), prompt);
  assert.deepEqual(await textarea.evaluate(el => [el.selectionStart, el.selectionEnd]), [0, prompt.length]);
  assert.equal(await copy.textContent(), 'Copy image prompt');
  await page.getByRole('button', {name: 'Done', exact: true}).click();
  assert.ok(await copy.evaluate(el => el === document.activeElement));
}

async function verifySavedVariables(context, page) {
  await context.grantPermissions(['clipboard-read','clipboard-write'], {origin: new URL(base).origin});
  await page.evaluate(() => localStorage.setItem('plb_vars','null'));
  await page.reload();
  const card = page.locator('.card:has([data-fill])').first();
  await card.locator('[data-fill]').click();
  const input = card.locator('[data-var]').first();
  const value = 'North "Hall" & West';
  await input.fill(value);
  const filled = await card.locator('.vprev').textContent();
  await card.getByRole('button', {name: 'Copy filled'}).click();
  await page.waitForFunction(() => document.getElementById('sr').textContent === 'Copied');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), filled);
  await page.reload();
  await card.locator('[data-fill]').click();
  assert.equal(await input.inputValue(), value);
  await card.locator('[data-fill]').click();
}

async function run() {
  const browser = await chromium.launch();
  const errors = [];
  try {
    for (const [width, height] of [[1440,900], [680,820], [375,812], [2560,720]]) {
      const context = await browser.newContext({viewport: {width,height}, reducedMotion: 'reduce'});
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(new URL('/prompts/', base).href);
      const data = await page.locator('#prompt-data').evaluate(el => JSON.parse(el.textContent));
      const entries = data.filter(entry => entry.img);
      const example = data.find(entry => entry.id === 35);
      assert.equal(await page.locator('.card').count(), data.length);
      assert.equal(await page.locator('[data-img]').count(), entries.length);
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      await page.getByRole('button', {name: 'Dark theme'}).click();
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.getByRole('button', {name: 'Light theme'}).click();
      if (width === 1440) await verifySavedVariables(context, page);
      await page.getByRole('button', {name: 'Image prompts', exact: true}).press('Space');
      assert.equal(await page.locator('.card').count(), entries.length);
      assert.equal(await page.locator('#t-img').getAttribute('aria-pressed'), 'true');

      for (const entry of width === 1440 ? entries : [example]) {
        const card = page.locator('#p-' + entry.id);
        const toggle = card.locator('[data-img]');
        await toggle.click();
        assert.equal(await card.locator('.image-panel pre').textContent(), entry.img);
        await verifyExport(page, card, entry);
        await toggle.click();
        assert.equal(await card.locator('.image-panel, .export-image').count(), 0);
        assert.equal(await card.getByRole('button', {name: 'Copy image prompt'}).count(), 0);
      }
      await page.getByRole('link', {name: 'See rendered example'}).click();
      const card = page.locator('#p-35');
      await card.locator('figure img').evaluate(img => img.decode());
      assert.equal(await card.locator('figure img').evaluate(img => img.naturalWidth), 768);
      assert.ok(await page.evaluate(() => {
        const root = document.documentElement, pane = document.getElementById('prompt-library');
        return root.scrollHeight <= root.clientHeight && root.scrollWidth <= root.clientWidth
          && pane.scrollWidth <= pane.clientWidth && pane.scrollHeight > pane.clientHeight;
      }));
      for (const button of await card.locator('.image-actions button').all()) {
        const box = await button.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width);
      }
      if (evidence) await page.screenshot({path: path.join(evidence, 'Prompt Library ' + width + '.png')});
      await verifyCopyRecovery(page, card, example.img);
      await card.getByRole('button', {name: 'Copy image prompt'}).press('/');
      assert.ok(await page.locator('#q').evaluate(el => el === document.activeElement));

      await page.goto(new URL('/tools.html', base).href);
      for (const slug of ['prompts','trailkeeper']) {
        const image = page.locator('[data-track-cta="tools:' + slug + '"] img');
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(img => img.decode());
        assert.equal(await image.evaluate(img => img.naturalWidth), 448);
      }
      await context.close();
      console.log('Library handoff, theme, copy recovery and both directory cards passed at ' + width + 'px. '
        + (width === 1440 ? entries.length : 1) + ' named image briefs verified.');
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
