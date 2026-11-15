const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay(), browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const state = await relay.state();
    state.lock = true;
    state.projectors.forEach((p, i) => { p.lane = 'ABCD'[i]; p.status.power = 'off'; p.status.shutter = 'closed'; });
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('https://wst.housevideo.app/**', route => route.fulfill({ json: { tasks: [] } }));
    const page = await context.newPage(), errors = [], commands = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', req => { if (req.url().endsWith('/api/command')) commands.push(req.url()); });
    await page.routeWebSocket('**/ws', socket => {
      state.projectors.forEach(p => { p.status.connection.lastSuccessAt = new Date().toISOString(); });
      socket.send(JSON.stringify(state));
    });
    const evidence = process.env.EVIDENCE_DIR;
    if (evidence) fs.mkdirSync(evidence, { recursive: true });
    for (const [width, height] of [[1440, 900], [1024, 768], [680, 900], [375, 812], [844, 390], [2560, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.goto(relay.base + '/monitor/');
      await until(async () => /4 of 4/.test(await page.locator('#mv-count').textContent()));
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => window.FrozenTheme.set(theme), theme);
        for (const view of ['house', 'activity', 'today', 'health']) {
          await page.locator(`[data-dashboard-view=${view}]`).click();
          await page.waitForTimeout(50);
          const layout = await page.evaluate(() => {
            const d = document.documentElement, panel = document.querySelector('.fm-dashboard-panel:not([hidden])');
            return {
              document: d.scrollHeight <= innerHeight && d.scrollWidth <= innerWidth,
              panel: panel.scrollHeight <= panel.clientHeight + 1 && panel.scrollWidth <= panel.clientWidth + 1,
              size: [panel.clientWidth,panel.scrollWidth,panel.clientHeight,panel.scrollHeight],
              overflow: [...panel.querySelectorAll('*')].filter(el => el.getClientRects().length && getComputedStyle(el).display !== 'inline' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)).map(el => [el.tagName,el.id,el.className,el.clientWidth,el.scrollWidth,el.clientHeight,el.scrollHeight]),
              feeds: [...panel.querySelectorAll('.fm-feed')].map(el => ({ lane: el.dataset.lane, fits: el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1 })),
            };
          });
          if ((!layout.document || !layout.panel) && evidence) await page.screenshot({ path: `${evidence}/dashboard-failure-${width}-${view}.png` });
          assert.ok(layout.document && layout.panel && layout.feeds.every(f => f.fits), `${width}x${height} ${theme} ${view}: ${JSON.stringify(layout)}`);
          if (evidence && view === 'house') await page.screenshot({ path: `${evidence}/dashboard-${width}-${height}-${theme}.png` });
        }
      }
      await page.locator('[data-dashboard-view=house]').click();
      await page.locator('#mon-details').click();
      assert.equal(await page.locator('#mon-detail-dialog').evaluate(el => el.open), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#mon-details').evaluate(el => el === document.activeElement), true);
      await page.locator('[data-dashboard-view=house]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-dashboard-view=activity]').getAttribute('aria-selected'), 'true');
      console.log('Dashboard fits without vertical scrolling:', width, height);
    }
    for (const [width, height] of [[1440, 900], [1024, 768], [680, 900], [375, 812], [844, 390]]) {
      await page.setViewportSize({ width, height }); await page.goto(relay.base);
      await page.locator('#grid .operator-card').first().waitFor();
      const cards = await page.locator('#grid .operator-card').evaluateAll(cards => cards.filter(el => el.getClientRects().length).map(el => ({ lane: el.dataset.lane, height: el.clientHeight, content: el.scrollHeight })));
      if (evidence) await page.screenshot({ path: `${evidence}/controller-space-${width}-${height}.png` });
      assert.ok(cards.every(c => c.content <= c.height + 1), `Controller cards require scrolling at ${width}x${height}: ${JSON.stringify(cards)}`);
    }
    assert.deepEqual(errors, []); assert.deepEqual(commands, [], 'read-only journeys must not issue projector commands');
    console.log('Dashboard space, themes, keyboard, details and no-command journeys passed');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
