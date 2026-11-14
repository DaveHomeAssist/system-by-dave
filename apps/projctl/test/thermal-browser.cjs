const { selectView } = require('./operator-ui.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

// Thermal watch end to end in a real browser. The relay samples the simulator's air temperature
// through the health reports' reader, and the page shows it in the Thermal watch tab, on the
// header heat pill, on the projector's card and in its Details. Nothing is injected into the
// page. The portrait unit's 40 C limit is set in health-reports.json, as on the venue rig.
(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox'] });
  const relay = await startRelay({ PROJCTL_THERMAL_SAMPLE_MS: '150' }, { files: { 'health-reports.json': JSON.stringify({ ratedAmbientC: { P4: 40 } }) } });
  const card = (page, lane) => page.locator(`#thermal-watch [data-thermal-lane="${lane}"]`);
  const open = async (page) => { await page.goto(relay.base); await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor(); };
  const text = (page, lane, part) => page.evaluate(([l, p]) => document.querySelector(`#thermal-watch [data-thermal-lane="${l}"] [data-${p}]`)?.textContent || '', [lane, part]);
  try {
    // 11 Nov health report: D (PT-DW830U, SR portal) is the unit near its 40 C limit.
    for (const [slot, lane, model] of [['P1', 'A', 'PT-DW830U'], ['P2', 'B', 'PT-RZ970'], ['P3', 'C', 'UDM 4K22'], ['P4', 'D', 'PT-DW830U']]) await relay.api('projector', { slot, lane, model });
    for (const [slot, intake] of [['P1', 27], ['P2', 23], ['P3', 29.8], ['P4', 37]]) await relay.api('sim', { slot, temps: { intake } });

    // Projectors that are off are not read. The tab says why instead of showing a number, and nothing alarms.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      try {
        await open(page);
        await selectView(page, 'health');
        await page.locator('#thermal-watch').waitFor({ state: 'visible' });
        await page.waitForFunction(() => /read while the projector is on or cooling/.test(document.querySelector('#thermal-watch [data-thermal-lane="D"] [data-foot]')?.textContent || ''));
        assert.equal(await text(page, 'D', 'value'), 'N/A');
        assert.equal(await text(page, 'D', 'word'), 'No reading');
        assert.match(await page.locator('#thermal-watch .pj-thermal-note').innerText(), /read about every 1 s while it is on or cooling/);
        assert.equal(await page.locator('#heat-pill').isVisible(), false, 'no heat pill without a reading');
        assert.equal(await page.locator('.operator-heat').count(), 0, 'no card chip without a reading');
        const csv = page.locator('#thermal-watch .pj-thermal-csv');
        assert.equal(await csv.isVisible(), true, 'the relay supplies thermal data, so the log download is offered');
        assert.match(await csv.getAttribute('href'), /\/api\/thermal\.csv$/);
      } finally { await page.close(); }
    }

    await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
    await until(async () => (await relay.state()).projectors.find((p) => p.slot === 'P4').thermal?.c === 37);

    for (const [viewport, theme] of [[{ width: 1440, height: 900 }, 'light'], [{ width: 1440, height: 900 }, 'dark'], [{ width: 1024, height: 768 }, 'light'], [{ width: 681, height: 800 }, 'light'], [{ width: 390, height: 844 }, 'dark'], [{ width: 844, height: 390 }, 'light']]) {
      const label = `${viewport.width}x${viewport.height} ${theme}`;
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      try {
        await open(page);
        if (theme === 'dark') await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });

        // A current Watch reading shows outside the tab: the header pill and that projector's card.
        const pill = page.locator('#heat-pill');
        await pill.filter({ hasText: 'D Watch · 37.0 °C' }).waitFor();
        assert.equal(await pill.getAttribute('data-level'), 'watch', `${label}: pill level`);
        const pillBox = await pill.boundingBox();
        assert.ok(pillBox.x >= 0 && pillBox.x + pillBox.width <= viewport.width + 1, `${label}: heat pill inside the viewport`);
        assert.ok(pillBox.height >= 44, `${label}: heat pill keeps a 44 px target`);
        const cardD = page.locator('#grid > [data-lane="D"]');
        if (await cardD.isVisible()) await cardD.locator('.operator-heat').filter({ hasText: 'Heat Watch · 37.0 °C' }).waitFor();
        assert.equal(await page.locator('#grid > [data-lane="A"] .operator-heat').count(), 0, `${label}: an OK unit carries no chip`);

        // The pill opens Thermal watch, which names the tightest lane and keeps a fixed lane order.
        await pill.click();
        await page.locator('#thermal-watch').waitFor({ state: 'visible' });
        assert.match(await page.locator('#thermal-watch [data-summary]').innerText(), /D · SR Portal.*37\.0 °C intake.*3\.0 °C below its 40 °C limit/, `${label}: summary names the tightest lane`);
        const lanes = await page.locator('#thermal-watch .pj-thermal-card').evaluateAll((cards) => cards.map((c) => c.dataset.thermalLane));
        assert.deepEqual(lanes, ['A', 'B', 'C', 'D'], `${label}: fixed lane order`);
        assert.deepEqual(await page.locator('#thermal-watch .pj-thermal-card.tightest').evaluateAll((c) => c.map((x) => x.dataset.thermalLane)), ['D'], `${label}: only the tightest non-OK unit is marked`);
        assert.match(await text(page, 'D', 'word'), /^Watch$/, `${label}: D level`);
        assert.match(await text(page, 'A', 'word'), /^OK$/, `${label}: A level`);
        assert.equal(await text(page, 'D', 'value'), '37.0');
        assert.equal(await text(page, 'D', 'headroom'), '3.0 °C');
        assert.equal(await text(page, 'D', 'limit'), '40 °C', `${label}: limit from health-reports.json`);
        assert.equal(await text(page, 'B', 'limit'), '45 °C', `${label}: model default from health reports`);
        assert.equal(await text(page, 'C', 'value'), '29.8');

        // The tab fits the viewport and does not scroll sideways.
        const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth - innerWidth, panel: document.querySelector('#thermal-watch').scrollWidth - document.querySelector('#thermal-watch').clientWidth }));
        assert.ok(overflow.page <= 1 && overflow.panel <= 1, `${label}: no horizontal overflow ${JSON.stringify(overflow)}`);
        assert.deepEqual(errors, [], `${label}: no page errors`);
      } finally { await page.close(); }
    }

    // Live behaviour at desktop width.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    try {
      await open(page);
      await page.locator('#heat-pill').filter({ hasText: 'D Watch' }).waitFor();
      await page.locator('#heat-pill').click();
      await page.locator('#thermal-watch').waitFor({ state: 'visible' });

      // Focus survives status updates (the relay polls every 50 ms in tests).
      await card(page, 'D').locator('[data-open]').focus();
      await page.waitForTimeout(600);
      assert.equal(await page.evaluate(() => document.activeElement?.closest('#thermal-watch [data-thermal-lane="D"]') !== null && document.activeElement.matches('[data-open]')), true, 'focus stays on the card button through updates');

      // Recovery clears the pill and the chip; nothing is marked tightest when every unit is OK.
      await relay.api('sim', { slot: 'P4', temps: { intake: 30 } });
      await page.waitForFunction(() => document.querySelector('#heat-pill').hidden && /^OK$/.test(document.querySelector('#thermal-watch [data-thermal-lane="D"] [data-word]')?.textContent || ''));
      assert.equal(await page.locator('#thermal-watch .pj-thermal-card.tightest').count(), 0);
      assert.equal(await page.locator('.operator-heat').count(), 0, 'OK readings stay in Thermal watch');

      // The Log shows each level change once.
      await selectView(page, 'log');
      const row = page.locator('#log tbody tr').filter({ hasText: 'air watch' }).first();
      await row.waitFor();
      assert.match(await row.innerText(), /WARN · D · SR Portal: intake air 37 °C, 3 °C below the 40 °C rated limit/);
      assert.ok(await page.locator('#log tbody tr').filter({ hasText: 'air ok' }).count() >= 1, 'recovery is logged');
      assert.equal(await page.locator('#log tbody tr').filter({ hasText: 'air watch' }).count(), 1, 'one entry per level change, not per poll');
      await selectView(page, 'health');

      // A unit that keeps replying but stops returning a temperature keeps its last value. Once that
      // sample is older than three sampling intervals (3 s at least) it is marked as last known.
      await relay.api('sim', { slot: 'P2', temps: { intake: null } });
      await page.waitForFunction(() => /Last known · OK/.test(document.querySelector('#thermal-watch [data-thermal-lane="B"] [data-word]')?.textContent || ''));
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="B"].stale').count(), 1);
      assert.equal(await text(page, 'B', 'delta'), 'N/A', 'no comparison from a stale value');

      // A projector that stops replying keeps its last value, clearly marked as last known.
      await relay.api('sim', { slot: 'P4', offline: true });
      await page.waitForFunction(() => /Last known/.test(document.querySelector('#thermal-watch [data-thermal-lane="D"] [data-word]')?.textContent || ''));
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="D"].stale').count(), 1);

      // Opening a card goes to that lane's Details, which shows the same reading.
      await card(page, 'C').locator('[data-open]').click();
      await page.waitForFunction(() => document.querySelector('#projector-detail-title')?.textContent.startsWith('C ·'));
      await page.locator('#projector-heat .pj-heat-reading').filter({ hasText: '29.8' }).waitFor();
      assert.equal(await page.locator('#projector-heat [data-heat-level="ok"]').count(), 1, 'Details shows the level the relay reported');

      // A lane with no device says so instead of showing a number.
      await relay.api('projector', { slot: 'P1', lane: '' });
      await selectView(page, 'health');
      await page.waitForFunction(() => document.querySelector('#thermal-watch [data-thermal-lane="A"] [data-word]')?.textContent === 'No reading');
      assert.equal(await text(page, 'A', 'value'), 'N/A');
      assert.match(await text(page, 'A', 'foot'), /No device assigned/);
      assert.equal(await card(page, 'A').locator('[data-open]').isDisabled(), true);
      // A projector assigned to a lane but with no IP address says that, not a vague "no reading".
      await relay.api('projector', { slot: 'P3', ip: '' });
      await page.waitForFunction(() => /No address set/.test(document.querySelector('#thermal-watch [data-thermal-lane="C"] [data-foot]')?.textContent || ''));
      assert.equal(await text(page, 'C', 'word'), 'No reading');
      assert.equal(await card(page, 'C').locator('[data-open]').isDisabled(), false, 'the lane still opens its controls');

      // Close returns to the projector controls.
      await page.locator('#thermal-watch [data-close]').click();
      await page.locator('#thermal-watch').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#tab-btn-rig').getAttribute('aria-selected'), 'true');
    } finally { await page.close(); }

    // The download holds what the page showed.
    const lines = (await (await fetch(relay.base + '/api/thermal.csv')).text()).trimEnd().split('\n');
    assert.equal(lines[0], 'time_utc,slot,lane,model,air_kind,air_c,rated_max_c');
    assert.ok(lines.some((l) => /,P4,D,PT-DW830U,intake,37,40$/.test(l)), 'the Watch reading is in the CSV');
    console.log('thermal browser checks passed');
  } finally { await relay.close(); await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
