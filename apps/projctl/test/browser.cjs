const {selectSlot,openLegacy,openBulk}=require('./operator-ui.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { checkStage, checkStageLayout } = require('./stage-browser.cjs');
const { instrument3D } = require('./stage-3d-browser.cjs');

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const { stageFixture, measuredStageFixture } = await import('./stage-fixture.js');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const offline of [false, true]) {
      const relay = await startRelay();
      fs.writeFileSync(path.join(path.dirname(relay.rigFile), 'stage-plot.json'), JSON.stringify(offline ? stageFixture() : measuredStageFixture()));
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      await instrument3D(page);
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', message => { if (['warning', 'error'].includes(message.type()) && /^THREE\./.test(message.text())) errors.push(message.text()); });
      try {
        if (offline) await relay.api('projector', { slot: 'P1', ip: '' });
        await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
        await page.goto(relay.base);
    await page.locator('[data-tab="rig"]').click();
        await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
        await openBulk(page);
        const bulk = page.locator('[data-all="power"][data-arg="0"]');
        for (let tap = 0; tap < 2; tap++) {
          const response = page.waitForResponse((r) => r.url().endsWith('/api/command'));
          await bulk.click(); await response;
          if (!tap) {
            await page.locator('#toast').filter({ hasText: 'Tap again' }).waitFor();
            await bulk.filter({ hasText: 'Confirm power off' }).waitFor();
            await page.waitForTimeout(500);
          }
        }
        await until(async () => (await relay.state()).projectors.filter((p) => !offline || p.slot !== 'P1').every((p) => p.status.power === 'cooling'));
        await page.locator('#toast').filter({ hasText: 'P4: command accepted' }).waitFor();
        if (offline) assert.match(await page.locator('#toast').innerText(), /P1:.*skipped/);

        // An unassigned first lane must not shift B/C/D or steal a device.
        for (const [slot, lane] of Object.entries({ P1: 'C', P2: 'B', P4: 'D' })) await relay.api('projector', { slot, lane });
        await page.locator('#grid > .pj-tile[data-lane="B"][data-slot="P2"]').waitFor();
        const laneOrder = () => page.locator('#grid > .pj-tile').evaluateAll(els => els.map(el => [el.dataset.lane, el.dataset.slot || null]));
        assert.deepEqual(await laneOrder(), [['A', null], ['B', 'P2'], ['C', 'P1'], ['D', 'P4']]);
        assert.equal(await page.locator('.pj-unbound[data-lane="A"] [data-c]').count(), 0);
        assert.doesNotMatch(await page.locator('#grid > .pj-tile[data-lane="C"]').innerText(), /\bP1\b/);
        await page.locator('#rig-extra-devices').click();
        await page.locator('#setup .pj-setup[data-slot="P3"]').waitFor();
        await page.locator('#tab-btn-rig').click();
        await relay.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
        await until(async () => (await relay.state()).projectors.find(p => p.slot === 'P2').status.shutter === 'open');
        await selectSlot(page,'P2');
        await page.locator('#projector-controls [data-slot="P2"] [data-c="shutter"][data-a="1"]').click();
        await until(async () => (await relay.state()).projectors.find(p => p.slot === 'P2').status.shutter === 'closed');
        assert.equal((await relay.state()).projectors.find(p => p.slot === 'P4').status.shutter, 'open');
        assert.equal(await page.locator('#grid > .pj-tile[data-slot="P3"]').count(),0,'unbound device must not steal a lane');
        await page.reload(); await page.locator('[data-tab="rig"]').click();
        await page.locator('#grid > .pj-tile[data-lane="D"][data-slot="P4"]').waitFor();
        assert.deepEqual(await laneOrder(), [['A', null], ['B', 'P2'], ['C', 'P1'], ['D', 'P4']]);
        await relay.api('projector', { slot: 'P2', lane: '' });
        await relay.api('projector', { slot: 'P4', lane: '' });

        // Drawing order must never change the command target.
        for (const [slot, lane] of Object.entries({ P1: 'C', P2: 'A', P3: 'D', P4: 'B' })) {
          await relay.api('projector', { slot, lane });
        }
        await until(async () => (await page.locator('.pj-tile').first().getAttribute('data-slot')) === 'P2');
        assert.deepEqual(await page.locator('.pj-tile').evaluateAll((els) => els.map((el) => el.dataset.slot)), ['P2', 'P4', 'P1', 'P3']);
        await relay.api('command', { slot: 'all', cmd: 'shutter', arg: 0 });
        await until(async () => (await relay.state()).projectors.filter((p) => ['P2', 'P4'].includes(p.slot)).every((p) => p.status.shutter === 'open'));
        await selectSlot(page,'P2');
        await page.locator('#projector-controls [data-slot="P2"] [data-c="shutter"][data-a="1"]').click();
        await until(async () => (await relay.state()).projectors.find((p) => p.slot === 'P2').status.shutter === 'closed');
        assert.equal((await relay.state()).projectors.find((p) => p.slot === 'P4').status.shutter, 'open');
        await page.reload(); await page.locator('[data-tab="rig"]').click();
        await page.locator('.pj-tile[data-lane="A"] .pj-summary-heading strong').filter({ hasText: 'SL Portal' }).waitFor();

        // Operator direction labels use the selected slot's saved mounting correction.
        await page.locator('[data-tab="setup"]').click();
        const slotSetup = page.locator('.pj-setup[data-slot="P2"]');
        await slotSetup.locator('[data-k="reverseH"]').selectOption('true');
        await slotSetup.locator('[data-k="reverseV"]').selectOption('true');
        await slotSetup.getByRole('button', { name: 'Save', exact: true }).click();
        await slotSetup.getByRole('button', { name: 'Confirm save', exact: true }).waitFor();
        await page.waitForTimeout(500);
        await slotSetup.getByRole('button', { name: 'Confirm save', exact: true }).click();
        await until(async () => (await relay.state()).projectors.find((p) => p.slot === 'P2').reverseV === true);
        await page.reload(); await page.locator('[data-tab="rig"]').click();
        await page.locator('[data-tab="rig"]').click();
        await openLegacy(page,'P2','lens');
        await page.getByRole('tab', { name: 'Lens', exact: true }).click();
        for (const [label, axis, dir] of [['Shift left', 'h', '+'], ['Shift right', 'h', '-'], ['Shift up', 'v', '-'], ['Shift down', 'v', '+'], ['Focus forward', 'focus', '+'], ['Zoom out', 'zoom', '-']]) {
          const sent = page.waitForRequest((r) => r.url().endsWith('/api/command') && r.method() === 'POST');
          await page.getByRole('button', { name: label, exact: true }).click();
          const body = (await sent).postDataJSON();
          assert.equal(body.slot, 'P2'); assert.equal(body.cmd, 'lens');
          assert.equal(body.arg.axis, axis); assert.equal(body.arg.dir, dir);
          await until(async () => !(await page.getByRole('button', { name: label, exact: true }).isDisabled()));
        }
        await page.keyboard.press('Escape');

        // Picture controls already open must follow subsequent lock broadcasts.
        await openLegacy(page,'P2','picture');
        await page.getByRole('tab', { name: 'Picture', exact: true }).click();
        await page.locator('#adj-picture input').first().waitFor();
        await relay.api('lock', { lock: true });
        await until(async () => page.locator('#adj-picture input').first().isDisabled());
        assert.equal(await page.locator('#adj-picture select:enabled').count(), 0);
        await relay.api('lock', { lock: false });
        await until(async () => !(await page.locator('#adj-picture input').first().isDisabled()));
        await page.keyboard.press('Escape');

        // Keyboard Picture selection must load the current slot, even after a late old reply.
        let latePicture;
        await page.route('**/api/picture?slot=P2', route => { latePicture = route; });
        await openLegacy(page,'P2','picture');
        await until(() => !!latePicture);
        await page.keyboard.press('Escape');
        await openLegacy(page,'P4','lens');
        assert.equal(await page.locator('#adj-picture input, #adj-picture select').count(), 0);
        const currentPicture = page.waitForRequest(r => r.url().endsWith('/api/picture?slot=P4'));
        await page.getByRole('tab', { name: 'Lens', exact: true }).focus();
        await page.keyboard.press('ArrowRight'); await currentPicture;
        await page.locator('#adj-picture input').first().waitFor();
        const currentValue = await page.locator('#adj-picture input').first().inputValue();
        await latePicture.fulfill({ contentType: 'application/json', body: JSON.stringify({ brightness: -99 }) });
        await page.unroute('**/api/picture?slot=P2');
        await page.waitForTimeout(50);
        assert.equal(await page.locator('#adj-picture input').first().inputValue(), currentValue);
        const pictureWrite = page.waitForRequest(r => r.url().endsWith('/api/command') && r.method() === 'POST');
        await page.locator('#adj-picture input').first().evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
        const pictureCommand = (await pictureWrite).postDataJSON();
        assert.equal(pictureCommand.slot, 'P4'); assert.equal(pictureCommand.cmd, 'picture');
        await page.keyboard.press('Escape');

        await checkStage(page, relay, offline, until);

        for (const [width, height] of [[1440, 900], [680, 900], [375, 812], [844, 390], [320, 256], [3840, 1080]]) {
          await page.setViewportSize({ width, height });
          for (const theme of ['light', 'dark']) {
            await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
            const sizes = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight }));
            assert.ok(sizes.w <= sizes.cw && sizes.h <= sizes.ch, `viewport overflow ${width} ${theme}`);
            await openBulk(page);
            assert.equal(await page.locator('.pj-allbar').first().evaluate((el) => el.scrollWidth <= el.clientWidth), true, `bulk controls overflow ${width}`);
            assert.equal(await page.locator('.pj-tile').first().evaluate((el) => el.scrollHeight <= el.clientHeight + 1), true, `clipped projector tile ${width}`);
            await openBulk(page);await bulk.scrollIntoViewIfNeeded(); const box = await bulk.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= height, `bulk button outside viewport ${width}x${height}: ${JSON.stringify(box)}`);
            await bulk.focus(); assert.ok(await bulk.evaluate((el) => document.activeElement === el));
            for (const name of ['Stage', 'Presets', 'Log', 'Setup', 'Rig']) {
              await page.locator(`[data-tab="${name.toLowerCase()}"]`).click();
              if (name === 'Stage') await checkStageLayout(page, width, height, theme);
              const overflow = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth);
              assert.equal(overflow, false, `${name} overflow at ${width}x${height} ${theme}`);
            }
            if (process.env.ARTIFACT_DIR && !offline) {
              await page.locator('#grid').evaluate(el => { el.scrollTop = 0; });
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
        await selectSlot(page,'P2');
        const adjust = page.locator('#projector-controls [data-slot="P2"] [data-adj="lens"]');
        await adjust.click();
        assert.equal(await page.locator('#adjust').evaluate((el) => el.open), true);
        assert.equal(await page.locator('#adj-title').innerText(), 'Projector A · SL Portal');
        await page.locator('#adj-close').focus();
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.querySelector('#adjust').contains(document.activeElement)), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.activeElement.matches('#projector-controls [data-slot="P2"] [data-adj="lens"]')), true);
        // Polling must preserve a focused tile control.
        await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 1 });
        await until(async () => (await relay.state()).projectors[1].status.shutter === 'closed');
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => document.activeElement.matches('#projector-controls [data-slot="P2"] [data-adj="lens"]')), true);
        const plotFile = path.join(path.dirname(relay.rigFile), 'stage-plot.json');
        fs.renameSync(plotFile, plotFile + '.saved');
        await page.reload(); await page.locator('[data-tab="stage"]').click();
        await page.locator('#stage-message').filter({ hasText: 'No stage plot loaded' }).waitFor();
        fs.writeFileSync(plotFile, '{broken');
        await page.reload(); await page.locator('[data-tab="stage"]').click();
        await page.locator('#stage-message').filter({ hasText: 'could not be loaded' }).waitFor();
        fs.writeFileSync(plotFile, JSON.stringify(stageFixture()));
        await page.reload(); await page.locator('[data-tab="stage"]').click();
        await page.locator('#stage-workspace').waitFor();
        await relay.close();
        await page.locator('#conn-word').filter({ hasText: 'Relay offline' }).waitFor();
        assert.equal(await bulk.isDisabled(), true);
        assert.equal(await page.locator('[data-all="shutter"]').first().isDisabled(), true);
        await page.locator('[data-tab="stage"]').click();
        assert.equal(await page.locator('#stage-status-kind').innerText(), 'Relay offline');
        assert.equal(await page.locator('.pj-stage-card[data-lane="A"]').getAttribute('aria-disabled'), 'true');
        assert.deepEqual(errors, []);
        console.log(`Browser bulk off, picture lock, themes and viewport checks passed (P1 offline: ${offline})`);
      } finally { await page.close(); await relay.close(); }
    }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
