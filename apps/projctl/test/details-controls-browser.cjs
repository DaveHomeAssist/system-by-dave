// Projector details control surface: pattern tiles, Stop lens, heat notices and the
// session timer, at desktop, tablet and phone sizes. Thermal readings are injected because
// the simulator does not sample them.
const { selectLane, selectView } = require('./operator-ui.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const out = process.env.EVIDENCE_DIR || path.join(__dirname, '../artifacts');
  fs.mkdirSync(out, { recursive: true });
  try {
    const base = await relay.state();
    const schema = await (await fetch(relay.base + '/api/schema')).json();
    const fixture = () => {
      const state = structuredClone(base);
      state.lock = false;
      state.projectors.forEach((p, i) => {
        p.lane = 'ABCD'[i]; p.status.online = true; p.status.power = 'on'; p.status.pattern = '00'; p.status.stale = [];
        p.capabilities = { ...(p.capabilities || {}), lensJog: { axes: ['h', 'v', 'focus', 'zoom'], speeds: ['slow', 'normal', 'fast'], mode: 'bounded-step', stop: true, positionReadback: true } };
      });
      return state;
    };
    const fresh = state => {
      const now = new Date().toISOString();
      for (const p of state.projectors) { p.status.updatedAt = now; p.status.connection = { ...(p.status.connection || {}), state: 'online', lastSuccessAt: now, consecutiveFailures: 0, error: null }; }
      return state;
    };
    const thermal = (level, ageMs = 0) => ({ c: level === 'hot' ? 41.3 : level === 'watch' ? 37.6 : 28.4, at: new Date(Date.now() - ageMs).toISOString(), sampleMs: 60000, level, kind: 'intake', limitC: 40, headroomC: level === 'hot' ? -1.3 : level === 'watch' ? 2.4 : 11.6 });

    for (const [width, height] of [[1440, 900], [1024, 768], [681, 800], [390, 844], [844, 390]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      page.setDefaultTimeout(10000);
      const errors = [], commands = [], state = fixture();
      let socket;
      const push = () => socket.send(JSON.stringify(fresh(state)));
      page.on('pageerror', error => errors.push(error.message));
      await page.routeWebSocket('**/ws', ws => { socket = ws; ws.send(JSON.stringify(fresh(state))); });
      await page.route('**/api/command', async route => {
        const body = route.request().postDataJSON();
        commands.push(body);
        const p = state.projectors.find(x => x.slot === body.slot);
        if (body.cmd === 'pattern') p.status.pattern = String(body.arg);
        fresh(state);
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ [body.slot]: { result: 'OK', status: p.status } }) });
      });
      await page.goto(relay.base);
      await page.locator('#grid .operator-card').first().waitFor();

      // Heat stays out of sight until a current Watch or Hot reading arrives.
      assert.equal(await page.locator('.operator-heat').count(), 0);
      assert.equal(await page.locator('#heat-pill').isVisible(), false);
      const laneB = state.projectors.find(p => p.lane === 'B');
      laneB.thermal = thermal('hot'); push();
      await page.locator('#heat-pill').filter({ hasText: 'B Hot · 41.3 °C' }).waitFor();
      assert.equal(await page.locator('#heat-pill').getAttribute('data-level'), 'hot');
      const pillBox = await page.locator('#heat-pill').boundingBox();
      assert.ok(pillBox.x >= 0 && pillBox.x + pillBox.width <= width, `heat pill inside the viewport at ${width}`);
      const cardB = page.locator('#grid > [data-lane="B"]');
      if (await cardB.isVisible()) {
        const chip = cardB.locator('.operator-heat');
        await chip.filter({ hasText: 'Heat Hot · 41.3 °C' }).waitFor();
        const [chipBox, cardBox] = [await chip.boundingBox(), await cardB.boundingBox()];
        assert.ok(chipBox.x >= cardBox.x && chipBox.x + chipBox.width <= cardBox.x + cardBox.width + 1, `heat chip inside card B at ${width}`);
      }
      laneB.thermal = thermal('ok'); push();
      await until(async () => !await page.locator('#heat-pill').isVisible());
      assert.equal(await page.locator('.operator-heat').count(), 0, 'OK readings stay in Thermal watch');
      laneB.thermal = thermal('hot', 10 * 60 * 1000); push();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#heat-pill').isVisible(), false, 'stale readings do not alarm');
      laneB.thermal = thermal('watch'); push();
      await page.locator('#heat-pill').filter({ hasText: 'B Watch · 37.6 °C' }).waitFor();
      if (width === 1440) {
        await page.locator('#heat-pill').click();
        await page.locator('#thermal-watch').waitFor({ state: 'visible' });
        await selectView(page, 'rig');
      }

      // Details opens the full control surface for one lane.
      await selectLane(page, 'A');
      const detail = page.locator('#tab-projector');
      await detail.locator('#projector-patterns .pj-pattern-tile').first().waitFor();
      const expectedTiles = Object.keys(schema.patterns).filter(code => !['00', 'off', '0'].includes(code.toLowerCase())).length;
      assert.equal(await detail.locator('.pj-pattern-tile').count(), expectedTiles);
      assert.equal(await detail.locator('.pj-pattern-tile .pj-thumb').count(), expectedTiles, 'every tile has a picture');
      for (const selector of ['#projector-lens-workspace', '#projector-patterns', '#projector-heat', '#session-timer']) assert.equal(await detail.locator(selector).isVisible(), true, `${selector} visible at ${width}`);
      const stop = detail.locator('[data-lens-stop]');
      await stop.scrollIntoViewIfNeeded();
      assert.equal(await stop.innerText(), 'STOP LENS');
      assert.ok((await stop.boundingBox()).height >= 48, 'Stop lens is at least 48 px tall');
      const layout = await page.evaluate(() => {
        const visible = node => node.getClientRects().length > 0;
        return {
          pageScroll: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
          clipped: [...document.querySelectorAll('#tab-projector .pj-details-canvas :is(button, select, .pj-dc-state)')].filter(node => visible(node) && node.scrollWidth > node.clientWidth + 1).map(node => node.getAttribute('aria-label') || node.textContent.trim()),
          small: [...document.querySelectorAll('#tab-projector .pj-details-canvas button')].filter(node => visible(node) && node.getBoundingClientRect().height < 44).map(node => node.textContent.trim()),
        };
      });
      assert.deepEqual(layout, { pageScroll: false, clipped: [], small: [] }, `details layout at ${width}x${height}`);

      if (width === 1440) {
        const bars = detail.locator('.pj-pattern-tile[data-pattern="08"]');
        await bars.click();
        await until(() => commands.some(c => c.cmd === 'pattern' && c.arg === '08' && c.slot === 'P1'));
        await until(async () => await bars.getAttribute('aria-pressed') === 'true');
        await detail.locator('#projector-patterns .pj-dc-state').filter({ hasText: 'Colour bars' }).waitFor();
        state.lock = true; push();
        await until(async () => await bars.isDisabled());
        assert.equal(await detail.locator('.pj-pattern-clear').isDisabled(), true, 'Show Lock blocks Clear pattern');
        state.lock = false; push();
        await until(async () => !await bars.isDisabled());
        await selectLane(page, 'B');
        await detail.locator('#projector-heat [data-heat-level="watch"]').waitFor();
        assert.match(await detail.locator('#projector-heat .pj-heat-reading').innerText(), /37\.6/);
        await selectLane(page, 'A');
        assert.match(await detail.locator('#projector-heat').innerText(), /No reading/);

        // Session timer: start, survive a reload, pause, and reset only on a second tap.
        const timer = page.locator('#session-timer');
        assert.equal(await timer.getAttribute('data-timer-state'), 'stopped');
        assert.equal(await timer.locator('[data-timer-reset]').isDisabled(), true);
        await timer.locator('[data-timer-toggle]').click();
        assert.equal(await timer.getAttribute('data-timer-state'), 'running');
        await until(async () => await timer.locator('[data-timer-time]').innerText() !== '00:00:00', 3000);
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('projctl.sessionTimer.v1')));
        assert.equal(saved.running, true);
        await page.reload();
        await page.locator('#grid .operator-card').first().waitFor();
        await selectLane(page, 'C');
        assert.equal(await timer.getAttribute('data-timer-state'), 'running', 'timer survives reload and lane change');
        await timer.locator('[data-timer-toggle]').click();
        assert.equal(await timer.getAttribute('data-timer-state'), 'paused');
        const paused = await timer.locator('[data-timer-time]').innerText();
        await timer.locator('[data-timer-reset]').click();
        assert.equal(await timer.locator('[data-timer-reset]').innerText(), 'CONFIRM RESET');
        assert.equal(await timer.locator('[data-timer-time]').innerText(), paused, 'first tap only arms reset');
        await timer.locator('[data-timer-reset]').click();
        assert.equal(await timer.locator('[data-timer-time]').innerText(), '00:00:00');
        assert.equal(await timer.getAttribute('data-timer-state'), 'stopped');
      }
      await page.screenshot({ path: path.join(out, `details-controls-${width}x${height}.png`) });
      assert.deepEqual(errors, []);
      await page.close();
      console.log('details controls: patterns, lens stop, heat notices and session timer', `${width}x${height}`);
    }
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
