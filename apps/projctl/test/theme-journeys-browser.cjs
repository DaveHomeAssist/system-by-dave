// One preference follows the operator across private pages. All services use isolated fixtures.
const browsers = require('playwright');
const engine = process.env.THEME_BROWSER || 'chromium';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { selectView } = require('./operator-ui.cjs');
(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay({ PJ_PASSCODE: 'fixture-only-passcode' });
  const browser = await browsers[engine].launch({ headless: true, args: engine === 'chromium' ? ['--no-sandbox'] : [] });
  const evidence = process.env.EVIDENCE_DIR;
  const choose = async (page, mode) => {
    const trigger = page.locator('#theme');
    if (await trigger.count()) await trigger.click();
    await page.locator(`[data-theme-choice=${mode}]`).click();
  };
  const isTheme = async (page, mode, actual) => {
    await until(async () => (await page.locator('html').getAttribute('data-theme')) === actual);
    assert.equal(await page.locator('html').getAttribute('data-theme-preference'), mode);
  };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    await context.route('https://wst.housevideo.app/**', r => r.fulfill({ json: { tasks: [] }, headers: { 'access-control-allow-origin': '*' } }));
    const page = await context.newPage(), errors = [], commands = [];
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    page.on('pageerror', e => errors.push(e.message));
    context.on('request', r => { if (r.url().endsWith('/api/command')) commands.push(r.method()); });
    await page.goto(relay.base + '/monitor/rig.html');
    await page.waitForURL('**/login.html?next=*');
    assert.equal(await page.locator('#code').getAttribute('inputmode'), 'text');
    await isTheme(page, 'light', 'light'); // New browser keeps the documented light default, even on a dark OS.
    await choose(page, 'system'); await isTheme(page, 'system', 'dark');
    await page.emulateMedia({ colorScheme: 'light' }); await isTheme(page, 'system', 'light');
    await page.emulateMedia({ colorScheme: 'dark' }); await isTheme(page, 'system', 'dark');
    await choose(page, 'light'); await page.emulateMedia({ colorScheme: 'light' }); await page.emulateMedia({ colorScheme: 'dark' });
    await isTheme(page, 'light', 'light'); // Explicit choice wins over system changes.
    await choose(page, 'dark');
    await page.locator('#code').fill('fixture-only-passcode');
    await page.locator('button[type=submit]').click();
    await page.waitForURL(relay.base + '/monitor/rig.html');
    await isTheme(page, 'dark', 'dark');
    await page.goto(relay.base); await isTheme(page, 'dark', 'dark');
    await page.locator('#theme').focus(); await page.keyboard.press('Enter');
    await page.locator('#frozen-theme-menu:popover-open').waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.themeChoice), 'light', 'popover enters the keyboard sequence after its trigger');
    await page.keyboard.press('Escape'); await until(async () => await page.locator('#theme').getAttribute('aria-expanded') === 'false');
    await choose(page, 'system'); await isTheme(page, 'system', 'dark');
    await selectView(page, 'notes');
    const notes = page.frameLocator('[data-workspace=notes]');
    await notes.locator('#notes[data-notes-ready=true]').waitFor();
    await until(async () => await notes.locator('html').getAttribute('data-theme-preference') === 'system');
    await page.emulateMedia({ colorScheme: 'light' });
    await until(async () => await notes.locator('html').getAttribute('data-theme') === 'light');
    const sibling = await context.newPage(); await sibling.goto(relay.base + '/monitor/');
    await choose(sibling, 'dark'); await isTheme(page, 'dark', 'dark');
    await page.reload(); await isTheme(page, 'dark', 'dark');
    await page.goto(relay.base + '/workspace/handoff.html'); await isTheme(page, 'dark', 'dark');
    assert.equal(await page.locator('#handoff-title').count(), 1);
    for (const width of [1440, 680, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of ['light', 'dark']) {
        await choose(page, mode); await isTheme(page, mode, mode);
        assert.equal(await page.locator('#theme').evaluate(el => el.scrollWidth <= el.clientWidth), true, 'theme trigger content fits');
        await page.locator('#theme').click();
        const menu = page.locator('#frozen-theme-menu');
        assert.equal(await menu.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }), true);
        assert.equal(await menu.locator('button').evaluateAll(items => items.every(el => el.getBoundingClientRect().height >= 44)), true);
        const contrast = await menu.locator('button').first().evaluate(el => {
          const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
          const css = getComputedStyle(el), a = luminance(css.color), b = luminance(css.backgroundColor);
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        });
        assert.ok(contrast >= 4.5, `theme button contrast ${contrast} at ${width} ${mode}`);
        if (evidence) { fs.mkdirSync(evidence, { recursive: true }); await page.screenshot({ path: `${evidence}/theme-${engine}-${width}-${mode}.png` }); }
        await page.keyboard.press('Escape');
      }
    }
    assert.deepEqual(commands, [], 'theme and navigation journeys never dispatch projector commands');
    assert.deepEqual(errors, []);
    await context.close();

    // Storage can be denied. The current visit must remain usable and explain the limitation.
    const denied = await browser.newContext({ colorScheme: 'dark' });
    await denied.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
    const visit = await denied.newPage(); await visit.goto(relay.base + '/login.html');
    await choose(visit, 'dark'); await isTheme(visit, 'dark', 'dark');
    await visit.locator('#theme').click();
    assert.match(await visit.locator('[data-theme-storage]').innerText(), /For this visit only/);
    await denied.close();

    // Existing Monitor-only booth preferences migrate without carrying a third, inconsistent palette.
    const legacy = await browser.newContext();
    await legacy.addInitScript(() => localStorage.setItem('projctl.monitor.theme.v1', 'deep-freeze'));
    const old = await legacy.newPage(); await old.goto(relay.base + '/login.html'); await isTheme(old, 'dark', 'dark');
    await legacy.close();
    console.log('Theme journeys passed: login return, explicit/system priority, cross-page and cross-tab persistence, embedded notes, reload, handoff, keyboard, 1440/680/375, blocked storage, legacy migration, zero device commands');
  } finally { await browser.close(); await relay.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
