/* Run against an isolated coordinator with an existing artwork project. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');

async function main() {
  const origin = process.env.ENVISION_ORIGIN;
  const projectName = process.env.ENVISION_REVIEW_PROJECT;
  if (!origin || !projectName) throw Error('Set ENVISION_ORIGIN and ENVISION_REVIEW_PROJECT.');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: process.env.ENVISION_FIXTURE_TLS === '1' });
    const page = await context.newPage();
    const get = async (route) => {
      const response = await context.request.get(origin + '/api/v1' + route);
      assert.ok(response.ok(), 'Studio returned ' + response.status());
      return response.json();
    };
    const project = (await get('/state')).projects.find((p) => p.name === projectName);
    assert.ok(project, 'The named project must exist.');
    const route = '/projects/' + project.id;
    const source = await get(route);
    const artwork = source.versions.filter((v) => v.role !== 'mask');
    assert.ok(artwork.length >= 2, 'Use a fixture with at least two images.');
    await page.goto(origin + '/#project/' + project.id + '/library');
    const pick = (v) => page.locator('[data-version="' + v.id + '"]').click();
    const button = page.locator('#web-download');
    const format = page.locator('#web-format');
    const name = page.locator('#web-name');
    const ready = (width) => page.waitForFunction((w) => {
      const image = document.querySelector('#web-preview');
      return !image.hidden && image.naturalWidth === w && !document.querySelector('#web-download').disabled;
    }, width);
    let encodes = 0;
    page.on('request', (request) => { if (request.url().includes('/web-asset?')) encodes++; });
    await pick(artwork[0]);
    await page.locator('#web-export').click();
    await ready(480);

    // Delay the first framing change until its replacement has finished.
    let started, release;
    const intercepted = new Promise((resolve) => { started = resolve; });
    const resume = new Promise((resolve) => { release = resolve; });
    let ended;
    const settled = new Promise((resolve) => { ended = resolve; });
    await page.route('**/web-asset?format=card&*', async (route) => {
      started();
      await resume;
      try { await route.continue(); } finally { ended(); }
    }, { times: 1 });
    await format.selectOption('card');
    await intercepted;
    await format.selectOption('share');
    await ready(1200);
    release();
    await settled;
    assert.equal(await page.locator('#web-preview').evaluate((i) => i.naturalWidth), 1200);
    const count = encodes;
    await name.fill('folder/file');
    assert.equal(await name.evaluate((n) => n.checkValidity()), false);
    await name.fill('Étude 02.JPG');
    assert.equal(await name.evaluate((n) => n.checkValidity()), true);
    const [download] = await Promise.all([page.waitForEvent('download'), name.press('Enter')]);
    assert.equal(download.suggestedFilename(), 'Étude 02.jpg');
    const expected = await context.request.get(origin + '/api/v1' + route + '/versions/' + artwork[0].id
      + '/web-asset?format=share&framing=center');
    assert.ok(expected.ok());
    assert.deepEqual(await fs.readFile(await download.path()), await expected.body());
    assert.equal(encodes, count, 'Naming and downloading must reuse the preview.');

    await page.route('**/web-asset?*', (route) => route.fulfill({
      status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Preview unavailable.' }),
    }), { times: 1 });
    await page.locator('#web-framing').selectOption('contain');
    await page.locator('#web-retry').waitFor();
    assert.equal(await button.isEnabled(), false);
    assert.equal(await page.locator('#web-status').textContent(), 'Preview unavailable.');
    await page.locator('#web-retry').click();
    await ready(1200);
    await page.keyboard.press('Escape');
    await page.locator('#web-dialog').waitFor({ state: 'hidden' });
    assert.ok(await page.locator('#web-export').evaluate((b) => document.activeElement === b));
    await pick(artwork[1]);
    await page.locator('#web-export').click();
    await ready(480);
    assert.equal(await page.locator('#web-source').textContent(), artwork[1].label);
    await page.evaluate(() => { location.hash = 'projects'; });
    await page.locator('#web-dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await get(route), source);
    console.log('Web preview, replacement, retry, Unicode name, download and navigation passed.');
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
