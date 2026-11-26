const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.ENVISION_PUBLIC_BASE || 'http://127.0.0.1:8080';
const evidence = process.env.ENVISION_BRIEF_EVIDENCE;
const key = 'sbd.envision.events.v1';

async function download(page, button) {
  const waiting = page.waitForEvent('download');
  await button.click();
  const file = await waiting;
  return { name: file.suggestedFilename(), data: JSON.parse(await fs.readFile(await file.path(), 'utf8')) };
}

async function run() {
  const browser = await chromium.launch();
  const errors = [];
  try {
    for (const width of [1440, 680, 375]) {
      const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 812 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(new URL('/envision/', base).href);
      assert.equal(await page.locator('#mode').inputValue(), 'image');
      assert.equal(await page.locator('#format').inputValue(), 'square');
      assert.equal(await page.locator('#copy-details').isVisible(), false);

      await page.locator('#project-name').fill('Paper study');
      await page.locator('#preset').selectOption('paper');
      await page.locator('#format').selectOption('wide');
      await page.locator('#direction').fill('Soft light from camera left.');
      const dimensions = await page.evaluate(() => ({
        fits: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
        art: getComputedStyle(document.querySelector('#art-crop')).backgroundImage
      }));
      assert.ok(dimensions.fits);
      assert.match(dimensions.art, /paper-study\.webp/);
      if (evidence) await page.screenshot({ path: path.join(evidence, 'Envision brief ' + width + '.png') });
      await page.getByRole('button', { name: 'Build prompt' }).click();
      const prompt = await page.locator('#prompt-output').inputValue();
      assert.match(prompt, /16:9/);
      assert.match(prompt, /Soft light from camera left/);
      assert.doesNotMatch(prompt, /billing|event copy|headliner|flyer/i);
      assert.equal(await page.locator('#layout-sample').isVisible(), false);
      const exported = await download(page, page.locator('#export-current'));
      assert.equal(exported.name, 'Paper study.brief.json');
      assert.deepEqual(exported.data, { format: 'envision-brief-1', kind: 'image', title: 'Paper study', prompt });

      if (width <= 680) await page.locator('#show-brief').click();
      await page.locator('#save-event').click();
      await page.reload();
      await page.locator('#tab-saved').click();
      assert.deepEqual((await download(page, page.getByRole('button', {name: 'Export brief for Paper study'}))).data, exported.data);
      await page.getByRole('button', {name: 'Open Paper study'}).click();
      assert.equal(await page.locator('#preset').inputValue(), 'paper');
      await page.locator('#mode').selectOption('image-revise');
      assert.equal(await page.locator('#format').inputValue(), 'keep');
      await page.locator('#preserve').fill('The pencil and its shadow.');
      await page.getByRole('button', {name: 'Build prompt'}).click();
      assert.match(await page.locator('#prompt-output').inputValue(), /The pencil and its shadow/);

      if (width === 1440) {
        if (evidence) await fs.writeFile(path.join(evidence, 'Paper study.brief.json'), JSON.stringify(exported.data));
        const old = { id: 'legacy', title: 'AfterJinx', mode: 'revise', format: 'keep', preset: 'afterjinx',
          direction: 'Darken the scanlines.', preserve: 'Keep the eye.', copy: '5 minute walk from the convention center' };
        await page.evaluate(({ key, old }) => localStorage.setItem(key, JSON.stringify([old])), { key, old });
        await page.locator('#tab-saved').click();
        await page.getByRole('button', {name: 'Open AfterJinx'}).click();
        assert.equal(await page.locator('#format').inputValue(), 'keep');
        assert.equal(await page.locator('#event-copy').inputValue(), old.copy);
        await page.getByRole('button', {name: 'Build prompt'}).click();
        const flyer = await download(page, page.locator('#export-current'));
        assert.equal(flyer.data.kind, 'show');
        assert.match(flyer.data.prompt, /Edit the supplied flyer for AfterJinx/);
        assert.doesNotMatch(flyer.data.prompt, /5 minute walk/);
        assert.equal(flyer.data.copy, old.copy);
        await page.locator('#mode').selectOption('new');
        assert.equal(await page.locator('#format').inputValue(), 'feed');
        assert.equal(await page.locator('#preset').inputValue(), 'afterjinx');
        assert.match(await page.locator('#prompt-output').inputValue(), /deep-sea/);
        await page.locator('#mode').selectOption('image');
        await page.locator('#preset').selectOption('subject');
        await page.locator('#direction').fill('');
        assert.equal(await page.locator('#direction').evaluate(el => el.checkValidity()), false);
        assert.equal(await page.locator('#export-current').isVisible(), false);
      }
      await context.close();
      console.log('Public image and flyer brief flow passed at ' + width + ' CSS pixels.');
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
