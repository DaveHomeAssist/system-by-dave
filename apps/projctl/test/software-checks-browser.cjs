const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const { testReport } = await import('../scripts/test-report.js');
  const report = testReport({ sourceCommit: 'a'.repeat(40), runner: 'private-runner', results: Array.from({ length: 7 }, (_, i) => ({ name: `Journey ${i + 1}`, code: i === 6 ? 124 : 0, seconds: 1 })) });
  const relay = await startRelay({}, { files: { 'software-checks.json': JSON.stringify(report) } });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
    await page.goto(relay.base + '/monitor/');
    await page.getByRole('tab', { name: 'Health', exact: true }).click();
    await page.getByRole('button', { name: 'Review checks', exact: true }).click();
    const dialog = page.locator('#mon-software-dialog');
    assert.match(await dialog.innerText(), /6 of 7 checks passed/);
    assert.match(await dialog.innerText(), /Recorded package results/);
    assert.equal(await dialog.locator('li').count(), 5);
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    assert.match(await dialog.innerText(), /Timed out/);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(el => el.open), false);
    assert.equal(await page.locator('#mon-software').evaluate(el => el === document.activeElement), true);
    for (const viewport of [{ width: 1440, height: 900 }, { width: 680, height: 900 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth), true);
      const bounds = await page.locator('#mon-software').boundingBox();
      assert.ok(bounds.width >= 44 && bounds.height >= 44 && bounds.x + bounds.width <= viewport.width);
    }
    let state = { state: 'matched', release: report.release, sourceCommit: report.sourceCommit, finishedAt: report.finishedAt, passed: true, checks: report.checks.slice(0, 6) };
    await page.route('**/api/software-checks', route => route.fulfill({ json: state }));
    await page.reload(); await page.getByRole('tab', { name: 'Health', exact: true }).click();
    await page.getByRole('button', { name: 'Checks passed', exact: true }).waitFor();
    state = { ...state, state: 'different' }; await page.reload();
    await until(async () => (await page.locator('#mon-software').textContent()) === 'Recorded checks');
    state = { state: 'invalid' }; await page.reload();
    await page.getByRole('tab', { name: 'Health', exact: true }).click();
    await page.getByRole('button', { name: 'Review checks', exact: true }).click();
    assert.match(await dialog.innerText(), /could not be read/);
    state = { state: 'absent' }; await page.reload();
    await until(async () => await page.locator('#mon-software').isHidden());
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    console.log('Software check reports: pagination, failures, matching version, mismatch, damaged and absent records, focus and viewport containment passed; zero writes');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
