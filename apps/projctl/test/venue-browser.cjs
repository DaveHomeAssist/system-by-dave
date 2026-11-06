const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { instrument3D } = require('./stage-3d-browser.cjs');

(async () => {
  const { startRelay } = await import('./relay-helper.js');
  const { writeVenueFixture } = await import('./venue-fixture.js');
  const { stageFixture } = await import('./stage-fixture.js');
  const relay = await startRelay();
  await relay.api('projector', { slot: 'P2', lane: 'A' });
  const dir = path.dirname(relay.rigFile);
  await writeVenueFixture(path.join(dir, 'venue'));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await instrument3D(page);
    const errors = [], writes = [], layers = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', m => { if (['warning', 'error'].includes(m.type()) && /^THREE\./.test(m.text())) errors.push(m.text()); });
    page.on('request', r => {
      if (r.method() === 'POST') writes.push(r.url());
      if (/\/api\/venue-model\//.test(r.url())) layers.push(r.url().split('/').pop());
    });
    await page.goto(relay.base); await page.locator('[data-tab="stage"]').click();
    await page.locator('#stage-building[data-state="ready"]').waitFor();
    assert.deepEqual(layers, ['room'], 'large optional layers load only on request');
    assert.equal(await page.locator('[data-stage-view="3d"]').isVisible(), false, 'model-only bundle works');
    const canvas = page.locator('#stage-building three-d-stage canvas');
    assert.ok(await page.evaluate(() => window.stageDraws > 0));
    const before = await canvas.screenshot();
    await page.locator('#stage-building').getByRole('button', { name: 'Roof', exact: true }).click();
    await page.waitForTimeout(100);
    assert.notDeepEqual(await canvas.screenshot(), before, 'cutaway restores the named shell geometry');
    await page.locator('#stage-building').getByRole('button', { name: 'Roof', exact: true }).click();
    await page.locator('#stage-building').getByRole('button', { name: 'Plan', exact: true }).click();
    await page.waitForTimeout(200);
    assert.notDeepEqual(await canvas.screenshot(), before, 'camera changes rendered geometry');
    for (const role of ['plot', 'scan']) {
      await page.locator(`[data-venue-layer="${role}"]`).click();
      await page.locator(`[data-venue-layer="${role}"][aria-pressed="true"]`).waitFor();
    }
    assert.deepEqual(layers, ['room', 'plot', 'scan']);
    await page.waitForTimeout(1200);
    const idle = await page.evaluate(() => window.stageDraws); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => window.stageDraws), idle, 'polling does not redraw');
    for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(300);
      const box = await canvas.boundingBox(); assert.ok(box.width > 100 && box.height > 75, `canvas collapsed at ${width}`);
      assert.equal(await page.locator('#stage-building .pj-stage-camera').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      for (const b of await page.locator('#stage-building .pj-stage-camera button').all()) {
        const bounds = await b.boundingBox(); assert.ok(bounds.width >= 44 && bounds.height >= 44);
      }
    }
    await page.locator('.pj-stage-card[data-lane="A"]').click();
    await page.locator('#adjust').waitFor(); assert.match(await page.locator('#adj-sub').innerText(), /^P2/);
    await page.keyboard.press('Escape');
    await page.locator('[data-tab="rig"]').click(); await page.waitForTimeout(200);
    const hidden = await page.evaluate(() => window.stageDraws); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => window.stageDraws), hidden);
    assert.deepEqual(writes, [], 'model and lane inspection send no commands');
    await page.locator('[data-tab="stage"]').click();
    await canvas.evaluate(el => { window.recoverVenue = el.getContext('webgl2').getExtension('WEBGL_lose_context'); window.recoverVenue.loseContext(); });
    await page.locator('#stage-building[data-state="lost"]').waitFor();
    await page.evaluate(() => window.recoverVenue.restoreContext());
    await page.locator('#stage-building[data-state="ready"]').waitFor();
    assert.deepEqual(errors, []);

    // Both sources coexist, with the original diagram semantics preserved.
    await fs.writeFile(path.join(dir, 'stage-plot.json'), JSON.stringify(stageFixture()));
    await page.reload(); await page.locator('[data-tab="stage"]').click();
    await page.locator('#stage-building[data-state="ready"]').waitFor();
    await page.locator('[data-stage-view="front"]').click();
    assert.equal(await page.locator('.pj-stage-marker[data-lane="A"]').isVisible(), true);
    await page.locator('[data-stage-view="3d"]').click();
    await page.locator('#stage-3d[data-state="ready"]').waitFor();
    await page.locator('[data-stage-view="building"]').click();
    assert.equal(await page.locator('#stage-3d three-d-stage').getAttribute('paused'), '');
    await page.close();

    const fallback = await browser.newPage();
    await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); }; });
    await fallback.goto(relay.base); await fallback.locator('[data-tab="stage"]').click();
    await fallback.locator('#stage-building[data-state="unavailable"]').waitFor();
    await fallback.locator('[data-tab="rig"]').click();
    assert.equal(await fallback.locator('.pj-tile').first().isVisible(), true);
    console.log('Venue browser passed: lazy metric GLBs, inert inspection, existing lane controls, mobile, idle/hidden, context recovery, drawing coexistence and no-WebGL fallback.');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
