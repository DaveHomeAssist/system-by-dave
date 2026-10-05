/* Preserve the calculator's data contract through task navigation and the offline shell. */
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const base = process.env.VIEWPORT_BASE || 'http://localhost:4173/';
(async () => {
  const browser = await (process.env.VIEWPORT_BROWSER === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chrome' }));
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const view = async id => {
    await page.evaluate(id => { location.hash = id; }, id);
    await page.waitForFunction(id => !document.getElementById(id).hidden, id);
  };
  await page.goto(`${base}av-calculator.html?sbdShow=Viewport%20fixture&sbdPhase=prep#powerCard`);
  await page.waitForSelector('[data-calculator-viewport=ready]');
  assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'dark');
  assert.equal(await page.locator('#powerCard').isVisible(), true);
  await page.locator('#deviceAmps').fill('3.2');
  assert.match(await page.locator('#totalAmps').textContent(), /12\.8/);
  await page.locator('#powerMethod').selectOption('watts');
  await page.locator('#deviceWatts').fill('350');
  await page.locator('#powerFactor').fill('0');
  assert.equal(await page.locator('#totalAmps').textContent(), '—');
  await page.locator('#powerFactor').fill('0.8');
  assert.match(await page.locator('#totalAmps').textContent(), /14\.58/);
  await view('audioCard'); await page.locator('#delayDistance').fill('100');
  assert.match(await page.locator('#delayMs').textContent(), /88\.8/);
  const state = await page.evaluate(() => localStorage.getItem('avCalculator.v1'));
  for (const id of ['projectionCard', 'storageCard', 'voltageDropCard', 'splCard', 'summaryCard']) await view(id);
  assert.equal(await page.evaluate(() => localStorage.getItem('avCalculator.v1')), state);
  const summary = await page.locator('#summaryOutput').textContent();
  assert.match(summary, /88\.8/);
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#downloadSummaryBtn').click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), 'av-calculator-summary.txt');
  await page.locator('#themeToggle').click(); await page.reload();
  await page.waitForSelector('[data-calculator-viewport=ready]');
  assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'light', 'the operator choice survives reload');
  assert.equal(await page.evaluate(() => localStorage.getItem('avCalculator.v1')), state);
  await view('audioCard');
  const first = page.locator('#audioCardTab'); await first.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#projectionCardTab').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#projectionCardTab').evaluate(el => el === document.activeElement), true);
  await page.goBack(); assert.equal(await page.locator('#audioCard').isVisible(), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.skip-link').getAttribute('href'), '#main-content');
  await page.emulateMedia({ media: 'print' });
  for (const id of ['audioCard', 'projectionCard', 'storageCard', 'powerCard', 'voltageDropCard', 'splCard', 'summaryCard']) assert.equal(await page.locator(`#${id}`).isVisible(), true, `print ${id}`);
  assert.equal(await page.locator('#downloadSummaryBtn').isVisible(), false, 'print hides output commands');
  await page.emulateMedia({ media: 'screen' });
  await view('summaryCard'); await page.locator('#resetBtn').click();
  assert.match(await page.locator('#delayMs').textContent(), /63\.9/);
  assert.equal(await page.locator('#showContextCard').count(), 1);
  await view('showContextCard');
  const returned = await page.locator('[data-sbd-suite-return]').getAttribute('href');
  assert.match(returned, /sbdShow=Viewport/);
  // Explicit fixture worker registration exercises the same registry/cache used by Toolbox.
  if (process.env.VIEWPORT_BROWSER !== 'webkit') {
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('av-suite-worker.js');
      await navigator.serviceWorker.ready;
    });
    await page.reload(); await page.waitForSelector('[data-calculator-viewport=ready]');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true); await page.reload(); await page.waitForSelector('[data-calculator-viewport=ready]');
    await view('audioCard'); await page.locator('#delayDistance').fill('100');
    assert.match(await page.locator('#delayMs').textContent(), /88\.8/);
  }
  assert.deepEqual(errors, []);
  await browser.close(); console.log((process.env.VIEWPORT_BROWSER === 'webkit' ? 'WebKit (offline excluded): ' : 'Chromium: ') + 'PASS calculator values, PF validation, view/history/keyboard state, theme/save/reload, summary export, reset, print, show context' + (process.env.VIEWPORT_BROWSER === 'webkit' ? '' : ' and offline'));
})().catch(error => { console.error(error); process.exit(1); });
