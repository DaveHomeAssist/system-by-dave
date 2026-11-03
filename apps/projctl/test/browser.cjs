const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

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

        // Drawing order must never change the command target.
        for (const [slot, lane] of Object.entries({ P1: 'C', P2: 'A', P3: 'D', P4: 'B' })) {
          await relay.api('projector', { slot, lane });
        }
        await until(async () => (await page.locator('.pj-tile').first().getAttribute('data-slot')) === 'P2');
        assert.deepEqual(await page.locator('.pj-tile').evaluateAll((els) => els.map((el) => el.dataset.slot)), ['P2', 'P4', 'P1', 'P3']);
        await relay.api('command', { slot: 'P4', cmd: 'shutter', arg: 0 });
        await page.locator('.pj-tile[data-lane="A"] [data-c="shutter"][data-a="1"]').click();
        await until(async () => (await relay.state()).projectors.find((p) => p.slot === 'P2').status.shutter === 'closed');
        assert.equal((await relay.state()).projectors.find((p) => p.slot === 'P4').status.shutter, 'open');
        await page.reload();
        await page.locator('.pj-tile[data-lane="A"] h3').filter({ hasText: 'SL Portal' }).waitFor();

        // Picture controls already open must follow subsequent lock broadcasts.
        await page.locator('.pj-tile[data-slot="P2"] [data-adj]').click();
        await page.getByRole('tab', { name: 'Picture', exact: true }).click();
        await page.locator('#adj-picture input').first().waitFor();
        await relay.api('lock', { lock: true });
        await until(async () => page.locator('#adj-picture input').first().isDisabled());
        assert.equal(await page.locator('#adj-picture select:enabled').count(), 0);
        await relay.api('lock', { lock: false });
        await until(async () => !(await page.locator('#adj-picture input').first().isDisabled()));
        await page.keyboard.press('Escape');

        for (const [width, height] of [[1440, 900], [680, 900], [375, 812], [844, 390], [320, 256], [3840, 1080]]) {
          await page.setViewportSize({ width, height });
          for (const theme of ['light', 'dark']) {
            await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
            const sizes = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight }));
            assert.ok(sizes.w <= sizes.cw && sizes.h <= sizes.ch, `viewport overflow ${width} ${theme}`);
            assert.equal(await page.locator('.pj-allbar').first().evaluate((el) => el.scrollWidth <= el.clientWidth), true, `bulk controls overflow ${width}`);
            assert.equal(await page.locator('.pj-tile').first().evaluate((el) => el.scrollHeight <= el.clientHeight + 1), true, `clipped projector tile ${width}`);
            await bulk.scrollIntoViewIfNeeded(); const box = await bulk.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= height, `bulk button outside viewport ${width}x${height}: ${JSON.stringify(box)}`);
            await bulk.focus(); assert.ok(await bulk.evaluate((el) => document.activeElement === el));
            for (const name of ['Presets', 'Log', 'Setup', 'Rig']) {
              await page.locator(`[data-tab="${name.toLowerCase()}"]`).click();
              const overflow = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth);
              assert.equal(overflow, false, `${name} overflow at ${width}x${height} ${theme}`);
            }
            if (process.env.ARTIFACT_DIR && !offline) {
              fs.mkdirSync(process.env.ARTIFACT_DIR, { recursive: true });
              await page.screenshot({ path: `${process.env.ARTIFACT_DIR}/rig-${width}-${height}-${theme}.png` });
            }
          }
        }
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.locator('[data-tab="setup"]').click();
        const label = page.locator('[data-slot="P2"] [data-k="label"]');
        await label.fill('Unsaved operator edit');
        await relay.api('lock', { lock: true });
        assert.equal(await label.inputValue(), 'Unsaved operator edit');
        assert.equal(await label.evaluate((el) => document.activeElement === el), true);
        await relay.api('lock', { lock: false });
        await page.locator('[data-tab="rig"]').click();
        const adjust = page.locator('.pj-tile[data-slot="P2"] [data-adj]');
        await adjust.click();
        assert.equal(await page.locator('#adjust').evaluate((el) => el.open), true);
        assert.equal(await page.locator('#adj-title').innerText(), 'Projector A · SL Portal');
        await page.locator('#adj-close').focus();
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.querySelector('#adjust').contains(document.activeElement)), true);
        await page.keyboard.press('Escape');
        assert.equal(await adjust.evaluate((el) => document.activeElement === el), true);
        // Polling must preserve a focused tile control.
        await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 1 });
        await until(async () => (await relay.state()).projectors[1].status.shutter === 'closed');
        await page.waitForTimeout(100);
        assert.equal(await adjust.evaluate((el) => document.activeElement === el), true);
        await relay.close();
        await page.locator('#conn-word').filter({ hasText: 'Relay offline' }).waitFor();
        assert.equal(await bulk.isDisabled(), true);
        assert.equal(await page.locator('[data-all="shutter"]').first().isDisabled(), true);
        assert.deepEqual(errors, []);
        console.log(`Browser bulk off, picture lock, themes and viewport checks passed (P1 offline: ${offline})`);
      } finally { await page.close(); await relay.close(); }
    }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
