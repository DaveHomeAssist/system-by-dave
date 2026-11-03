const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox'] });
  try {
    for (const offline of [false, true]) {
      const relay = await startRelay();
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      try {
        if (offline) await relay.api('projector', { slot: 'P1', ip: '' });
        await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
        await page.goto(relay.base);
        await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
        const bulk = page.locator('[data-all="power"][data-arg="0"]');
        for (let tap = 0; tap < 2; tap++) {
          const response = page.waitForResponse((r) => r.url().endsWith('/api/command'));
          await bulk.click(); await response;
          if (!tap) await page.locator('#toast').filter({ hasText: 'Tap again' }).waitFor();
        }
        await until(async () => (await relay.state()).projectors.filter((p) => !offline || p.slot !== 'P1').every((p) => p.status.power === 'cooling'));
        await page.locator('#toast').filter({ hasText: 'P4: command accepted' }).waitFor();
        if (offline) assert.match(await page.locator('#toast').innerText(), /P1:.*skipped/);

        // Picture controls already open must follow subsequent lock broadcasts.
        await page.locator('section[aria-label="P2 House Panasonic A"] [data-adj]').click();
        await page.getByRole('tab', { name: 'Picture', exact: true }).click();
        await page.locator('#adj-picture input').first().waitFor();
        await relay.api('lock', { lock: true });
        await until(async () => page.locator('#adj-picture input').first().isDisabled());
        assert.equal(await page.locator('#adj-picture select:enabled').count(), 0);
        await relay.api('lock', { lock: false });
        await until(async () => !(await page.locator('#adj-picture input').first().isDisabled()));
        await page.keyboard.press('Escape');

        for (const [width, height] of [[1440, 900], [680, 900], [375, 812]]) {
          await page.setViewportSize({ width, height });
          for (const theme of ['light', 'dark']) {
            await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
            const sizes = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight }));
            assert.ok(sizes.w <= sizes.cw && sizes.h <= sizes.ch, `viewport overflow ${width} ${theme}`);
            const box = await bulk.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height);
            await bulk.focus(); assert.ok(await bulk.evaluate((el) => document.activeElement === el));
          }
        }
        assert.deepEqual(errors, []);
        console.log(`Browser bulk off, picture lock, themes and viewport checks passed (P1 offline: ${offline})`);
      } finally { await page.close(); await relay.close(); }
    }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
