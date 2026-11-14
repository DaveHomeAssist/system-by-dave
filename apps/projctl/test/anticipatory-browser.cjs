const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { selectView } = require('./operator-ui.cjs');

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [index, slot] of ['P1', 'P2', 'P3', 'P4'].entries()) {
      await relay.api('projector', { slot, lane: 'ABCD'[index], model: 'PT-DW830U', inputs: { '31': 'DVI-D', '32': 'HDMI' } });
    }
    await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
    await until(async () => (await relay.state()).projectors.every(p => p.status.power === 'on'));
    const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    const calls = [], errors = [];
    page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/command')) calls.push(request.postDataJSON()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      if (!localStorage.getItem('projctl.ui.v1')) localStorage.setItem('projctl.ui.v1', JSON.stringify({ version: 1, theme: 'dark', lastLane: 'D', lastView: 'rig', presetNameTemplate: 'Intermission', showSuggestions: true }));
    });
    await page.goto(relay.base);
    await page.locator('#grid [data-lane=D]').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('[data-operator-lane=D]').getAttribute('aria-pressed'), 'true');
    assert.equal(calls.length, 0, 'restoring preferences sends no command');
    await selectView(page, 'presets');
    assert.equal(await page.locator('#preset-name').inputValue(), 'Intermission');
    await selectView(page, 'rig');
    const card = page.locator('#grid [data-lane=D]');
    const patternTable = (await relay.state()).projectors.find(p => p.slot === 'P4').patterns || (await relay.api('schema')).body.patterns;
    const red = Object.entries(patternTable).find(([, name]) => /^Red$/i.test(name));
    assert.ok(red);
    await relay.api('command', { slot: 'P4', cmd: 'pattern', arg: red[0] });
    await until(async () => (await card.locator('[data-more-patterns]').innerText()).toLowerCase().includes('red'));
    await relay.api('command', { slot: 'P4', cmd: 'pattern', arg: '08' });
    await until(async () => await card.locator('[data-action=clear]').evaluate(button => button.classList.contains('is-suggested')));
    if (process.env.EVIDENCE_DIR) { fs.mkdirSync(process.env.EVIDENCE_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.EVIDENCE_DIR, 'anticipatory-grid.png') }); }
    const beforeDismiss = calls.length;
    await card.locator('[data-dismiss-hint]').click();
    assert.equal(calls.length, beforeDismiss, 'dismissing a suggestion sends no command');
    await card.locator('[data-more-patterns]').click();
    const white = page.getByRole('button', { name: 'Favorite White', exact: true });
    await white.click();
    assert.equal(calls.length, beforeDismiss, 'favoriting a pattern sends no command');
    await page.locator('#adj-close').click();
    await page.reload();
    await page.locator('#grid [data-lane=D]').waitFor();
    await card.locator('[data-more-patterns]').click();
    assert.equal((await page.locator('#adj-patterns [data-pattern]').first().innerText()).toLowerCase(), 'white');
    await page.locator('#adj-close').click();
    await card.locator('[data-open-projector]').click();
    await page.locator('#operator-comparison').selectOption('A');
    await until(async () => (await page.locator('#operator-comparison-status').innerText()).includes('A · SL Portal'));
    assert.equal(calls.length, beforeDismiss, 'comparison is read-only');
    await page.locator('#projector-back').click();
    await selectView(page, 'preferences');
    if (process.env.EVIDENCE_DIR) await page.screenshot({ path: path.join(process.env.EVIDENCE_DIR, 'interface-preferences.png') });
    await page.locator('#preference-suggestions').uncheck();
    await page.locator('#preference-preset-name').fill('Preshow checks');
    await page.locator('#preference-preset-name').press('Tab');
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('projctl.ui.v1')));
    assert.equal(saved.showSuggestions, false);
    assert.equal(saved.presetNameTemplate, 'Preshow checks');
    assert.equal(saved.comparisonLane, 'A');
    assert.deepEqual(Object.keys(saved).sort(), ['comparisonLane', 'dismissedSuggestions', 'favoritePatterns', 'lastLane', 'lastView', 'presetNameTemplate', 'showSuggestions', 'theme', 'version'].sort());
    await page.locator('#preference-reset').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await page.locator('#preference-preset-name').inputValue(), 'Preshow');
    await selectView(page, 'all');
    let replaced = false;
    await page.route('**/api/command', async route => {
      const body = route.request().postDataJSON();
      if (!replaced && body.slot === 'all' && body.cmd === 'shutter') {
        replaced = true;
        await relay.api('projector', { slot: 'P1', model: 'Replacement after confirmation' });
      }
      await route.continue();
    });
    const shutterCount = (await relay.state()).events.filter(event => event.command?.startsWith('shutter')).length;
    await page.locator('[data-all=shutter][data-arg="0"]').click();
    await page.locator('#all-confirm-send').click();
    await page.locator('#all-confirm-note').filter({ hasText: 'configuration changed' }).waitFor();
    assert.equal((await relay.state()).events.filter(event => event.command?.startsWith('shutter')).length, shutterCount);
    await page.locator('#all-confirm-cancel').click();
    await page.unroute('**/api/command');
    await selectView(page, 'rig');
    await page.route('**/api/command', route => route.fulfill({ status: 502, json: { error: 'Simulated authentication failure' } }));
    await card.locator('[data-action=clear]').click();
    await card.locator('.operator-feedback').filter({ hasText: 'Simulated authentication failure' }).waitFor();
    await page.waitForTimeout(6100);
    assert.match(await card.locator('.operator-feedback').innerText(), /Simulated authentication failure/);
    await page.close();
    for (const mode of ['denied', 'malformed']) {
      const fallback = await browser.newPage();
      await fallback.addInitScript(mode => {
        if (mode === 'denied') Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage denied'); } });
        else localStorage.setItem('projctl.ui.v1', '{');
      }, mode);
      fallback.on('pageerror', error => errors.push(error.message));
      await fallback.goto(relay.base);
      await fallback.locator('#grid .operator-card').first().waitFor();
      await selectView(fallback, 'preferences');
      await fallback.locator('#preference-suggestions').uncheck();
      if (mode === 'denied') assert.match(await fallback.locator('#preference-message').innerText(), /session/);
      await fallback.close();
    }
    assert.deepEqual(errors, []);
    console.log('Anticipatory UX: preferences, favorites, hints, comparison, storage fallback, bound group targets and persistent errors passed');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
