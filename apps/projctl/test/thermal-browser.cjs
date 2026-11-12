const { chromium } = require('playwright');
const assert = require('node:assert/strict');

// Thermal watch in a real browser: a status button in the Rig overview opens a non-modal panel
// with lane-keyed cards. The shell has no spare height, so the button and panel must add none.
// Readings come from the health reports' reader; the portrait unit's 40 C limit is set in
// health-reports.json, as on the venue rig.
(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox'] });
  const relay = await startRelay({ PROJCTL_THERMAL_SAMPLE_MS: '150' }, { files: { 'health-reports.json': JSON.stringify({ ratedAmbientC: { P4: 40 } }) } });
  try {
    // 11 Nov health report: D (PT-DW830U, SR portal) is the unit near its 40 C limit.
    for (const [slot, lane, model] of [['P1', 'A', 'PT-DW830U'], ['P2', 'B', 'PT-RZ970'], ['P3', 'C', 'UDM 4K22'], ['P4', 'D', 'PT-DW830U']]) await relay.api('projector', { slot, lane, model });
    for (const [slot, intake] of [['P1', 27], ['P2', 23], ['P3', 29.8], ['P4', 37]]) await relay.api('sim', { slot, temps: { intake } });

    // Projectors that are off are not read, and the panel says why instead of showing a number.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      try {
        await page.goto(relay.base);
        await page.locator('[data-tab="rig"]').click();
        await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
        await page.waitForFunction(() => document.querySelector('#thermal-chip [data-chip-text]')?.textContent === 'Air · no data');
        await page.locator('#thermal-chip').click();
        assert.equal(await page.locator('#thermal-watch [data-thermal-lane="D"] [data-value]').innerText(), '—');
        assert.match(await page.locator('#thermal-watch [data-thermal-lane="D"] [data-foot]').innerText(), /read while the projector is on or cooling/);
        assert.match(await page.locator('#thermal-watch .pj-thermal-note').innerText(), /read about every 1 s while it is on or cooling/);
      } finally { await page.close(); }
    }

    await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
    await until(async () => (await relay.state()).projectors.find((p) => p.slot === 'P4').thermal?.c === 37);

    const ready = (page) => page.waitForFunction(() => document.querySelector('#thermal-chip [data-chip-text]')?.textContent.startsWith('D Watch'));
    const rigBox = (page) => page.evaluate(() => { const r = document.querySelector('#tab-rig'), h = document.querySelector('.pj-header'), t = document.querySelector('.avd-shell__tabs'); return { header: Math.round(h.getBoundingClientRect().height), tabs: Math.round(t.getBoundingClientRect().height), scroll: r.scrollHeight, client: r.clientHeight }; });

    for (const [viewport, theme] of [[{ width: 1440, height: 900 }, 'light'], [{ width: 1440, height: 900 }, 'dark'], [{ width: 1366, height: 768 }, 'light'], [{ width: 845, height: 900 }, 'light'], [{ width: 680, height: 900 }, 'dark'], [{ width: 390, height: 844 }, 'dark']]) {
      const label = `${viewport.width}x${viewport.height} ${theme}`;
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
      try {
        await page.goto(relay.base);
        await page.locator('[data-tab="rig"]').click();
        await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
        await ready(page);

        // Zero layout cost: with the button hidden the shell measures exactly the same.
        const withChip = await rigBox(page);
        await page.addStyleTag({ content: '#thermal-chip{display:none!important}' });
        const without = await rigBox(page);
        assert.equal(withChip.header, without.header, `${label}: the button adds no header height`);
        assert.equal(withChip.tabs, without.tabs, `${label}: the button adds no tab bar height`);
        // Where the Rig tab is designed to fit (the multiview test asserts it does not scroll at 845 and up) the button costs no
        // height. Below 680px an existing rule stacks the overview row and the Rig tab already scrolls, so it adds one 44px row.
        if (viewport.width >= 845) assert.deepEqual(withChip, without, `${label}: the button adds no height to the Rig tab`);
        else assert.ok(withChip.scroll - without.scroll <= 48, `${label}: at most one row in an already-scrolling tab (${withChip.scroll} vs ${without.scroll})`);
        await page.evaluate(() => { document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('#thermal-chip{display:none')) s.remove(); }); });

        const chip = page.locator('#thermal-chip');
        assert.equal((await chip.innerText()).trim(), 'D Watch · 37.0 °C', `${label}: button text`);
        assert.ok((await chip.boundingBox()).height >= 44, `${label}: 44px target`);
        assert.equal(await chip.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('#thermal-dialog').isVisible(), false, `${label}: closed by default`);
        assert.equal(await page.locator('#tab-rig #thermal-watch').count(), 0, `${label}: panel is not part of the Rig layout`);

        await chip.click();
        await page.locator('#thermal-dialog').waitFor({ state: 'visible' });
        assert.equal(await chip.getAttribute('aria-expanded'), 'true');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'thermal-title', `${label}: focus moves into the panel`);
        assert.match(await page.locator('#thermal-watch [data-summary]').innerText(), /D · SR Portal.*37\.0 °C intake.*3\.0 °C below its 40 °C limit/, `${label}: summary names the tightest lane`);

        const lanes = await page.locator('#thermal-watch .pj-thermal-card').evaluateAll((cards) => cards.map((c) => c.dataset.thermalLane));
        assert.deepEqual(lanes, ['A', 'B', 'C', 'D'], `${label}: fixed lane order`);
        assert.deepEqual(await page.locator('#thermal-watch .pj-thermal-card.tightest').evaluateAll((c) => c.map((x) => x.dataset.thermalLane)), ['D'], `${label}: only the tightest non-OK unit is marked`);
        assert.match(await page.locator('#thermal-watch [data-thermal-lane="D"] [data-word]').innerText(), /Watch/);
        assert.match(await page.locator('#thermal-watch [data-thermal-lane="A"] [data-word]').innerText(), /^OK$/);
        assert.equal(await page.locator('#thermal-watch [data-thermal-lane="D"] [data-value]').innerText(), '37.0');
        assert.equal(await page.locator('#thermal-watch [data-thermal-lane="D"] [data-headroom]').innerText(), '3.0 °C');

        // The overlay fits the viewport and does not scroll sideways.
        const box = await page.locator('#thermal-dialog').boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1 && box.y >= 0 && box.y + box.height <= viewport.height + 1, `${label}: panel is inside the viewport ${JSON.stringify(box)}`);
        const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth - innerWidth, panel: document.querySelector('#thermal-dialog').scrollWidth - document.querySelector('#thermal-dialog').clientWidth }));
        assert.ok(overflow.page <= 1 && overflow.panel <= 1, `${label}: no horizontal overflow ${JSON.stringify(overflow)}`);

        // It never covers the header, the tab bar or its own button, so the shell stays reachable; Escape closes it.
        const shell = await page.evaluate(() => { const d = document.querySelector('#thermal-dialog').getBoundingClientRect(); const over = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.width > 0 && r.bottom > d.top && r.top < d.bottom && r.right > d.left && r.left < d.right; }; return { header: over('.pj-header'), tabs: over('.avd-shell__tabs'), button: over('#thermal-chip') }; });
        assert.deepEqual(shell, { header: false, tabs: false, button: false }, `${label}: overlay leaves header, tabs and button uncovered`);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#thermal-dialog').isVisible(), false, `${label}: Escape closes`);
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'thermal-chip', `${label}: focus returns to the button`);
        assert.deepEqual(errors, [], `${label}: no console errors`);
      } finally { await page.close(); }
    }

    // Live behaviour at desktop width.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    try {
      await page.goto(relay.base);
      await page.locator('[data-tab="rig"]').click();
      await ready(page);
      await page.locator('#thermal-chip').click();
      await page.locator('#thermal-dialog').waitFor({ state: 'visible' });

      // Focus survives status updates (the relay polls every 50 ms in tests).
      await page.locator('#thermal-watch [data-thermal-lane="D"] [data-open]').focus();
      await page.waitForTimeout(600);
      assert.equal(await page.evaluate(() => document.activeElement?.closest('#thermal-watch [data-thermal-lane="D"]') !== null && document.activeElement.matches('[data-open]')), true, 'focus stays on the card button through updates');

      // Recovery changes words and the button; nothing is marked tightest when every unit is OK.
      await relay.api('sim', { slot: 'P4', temps: { intake: 30 } });
      await page.waitForFunction(() => document.querySelector('#thermal-chip [data-chip-text]')?.textContent.startsWith('Air OK'));
      assert.equal(await page.locator('#thermal-watch .pj-thermal-card.tightest').count(), 0);

      // The panel stays open across tabs, and the Log shows the level changes once each.
      await page.locator('[data-tab="log"]').click();
      assert.equal(await page.locator('#thermal-dialog').isVisible(), true, 'overlay persists when the tab changes');
      const row = page.locator('#log tbody tr').filter({ hasText: 'air watch' }).first();
      await row.waitFor();
      assert.equal(await row.locator('td.warn').count(), 1, 'WARN entries are styled');
      assert.match(await row.innerText(), /D · SR Portal.*intake air 37 °C, 3 °C below the 40 °C rated limit/);
      assert.ok(await page.locator('#log tbody tr').filter({ hasText: 'air ok' }).count() >= 1, 'recovery is logged');
      assert.equal(await page.locator('#log tbody tr').filter({ hasText: 'air watch' }).count(), 1, 'one entry per level change, not per poll');
      await page.locator('[data-tab="rig"]').click();

      // A unit that keeps replying but stops returning a temperature keeps its last value. Once that
      // sample is older than three sampling intervals (3 s at least) it is marked as last known.
      await relay.api('sim', { slot: 'P2', temps: { intake: null } });
      await page.waitForFunction(() => /Last known · OK/.test(document.querySelector('#thermal-watch [data-thermal-lane="B"] [data-word]')?.textContent || ''));
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="B"].stale').count(), 1);
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="B"] [data-delta]').innerText(), '—', 'no comparison from a stale value');

      // A projector that stops replying keeps its last value, clearly marked as last known.
      await relay.api('sim', { slot: 'P4', offline: true });
      await page.waitForFunction(() => /Last known/.test(document.querySelector('#thermal-watch [data-thermal-lane="D"] [data-word]')?.textContent || ''));
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="D"].stale').count(), 1);

      // Opening a card closes the panel and goes to that lane's controls.
      await page.locator('#thermal-watch [data-thermal-lane="C"] [data-open]').click();
      await page.waitForFunction(() => document.querySelector('#projector-detail-title')?.textContent.startsWith('C ·'));
      assert.equal(await page.locator('#thermal-dialog').isVisible(), false);
      assert.match(await page.locator('.pj-thermal-csv').getAttribute('href'), /\/api\/thermal\.csv$/);

      // A lane with no device says so instead of showing a number.
      await relay.api('projector', { slot: 'P1', lane: '' });
      await page.locator('#thermal-chip').click();
      await page.waitForFunction(() => document.querySelector('#thermal-watch [data-thermal-lane="A"] [data-word]')?.textContent === 'No reading');
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="A"] [data-value]').innerText(), '—');
      assert.match(await page.locator('#thermal-watch [data-thermal-lane="A"] [data-foot]').innerText(), /No device assigned/);
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="A"] [data-open]').isDisabled(), true);
      // A projector assigned to a lane but with no IP address says that, not a vague "no reading".
      await relay.api('projector', { slot: 'P3', ip: '' });
      await page.waitForFunction(() => /No address set/.test(document.querySelector('#thermal-watch [data-thermal-lane="C"] [data-foot]')?.textContent || ''));
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="C"] [data-word]').innerText(), 'No reading');
      assert.equal(await page.locator('#thermal-watch [data-thermal-lane="C"] [data-open]').isDisabled(), false, 'the lane still opens its controls');
      await page.locator('#thermal-watch [data-close]').click();
      assert.equal(await page.locator('#thermal-dialog').isVisible(), false);
    } finally { await page.close(); }
    console.log('thermal browser checks passed');
  } finally { await relay.close(); await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
