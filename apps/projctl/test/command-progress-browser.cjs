const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { startRelay } = await import('./relay-helper.js');
  const relay = await startRelay(), browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [], commands = [];
  try {
    const state = await relay.state(); state.lock = false;
    state.projectors.forEach((p, i) => { p.lane = 'ABCD'[i]; p.status.power = 'on'; p.status.shutter = 'closed'; });
    const p = state.projectors[3];
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/command', route => { commands.push(route.request().postData()); return route.abort(); });
    let socket;
    await page.routeWebSocket('**/ws', ws => { socket = ws; ws.send(JSON.stringify(state)); });
    async function send(phase) {
      p.commandFeedback = { field: 'shutter', expected: 'open', phase, startedAt: Date.now() - 8000,
        finishedAt: phase === 'waiting' ? null : Date.now(), elapsedSeconds: phase === 'unconfirmed' ? 30 : 1.4 };
      p.status.connection = { ...p.status.connection, state: p.status.online ? 'online' : 'reconnecting', lastSuccessAt: new Date().toISOString() };
      socket.send(JSON.stringify({ type: 'status', slot: p.slot, status: p.status, commandFeedback: p.commandFeedback }));
    }
    const dir = process.env.EVIDENCE_DIR; if (dir) fs.mkdirSync(dir, { recursive: true });
    for (const [width, height] of [[1440, 900], [680, 900], [375, 812], [844, 390], [3840, 1080]]) {
      await page.setViewportSize({ width, height });
      p.status.online = true; p.status.shutter = 'closed'; p.commandFeedback = null;
      state.projectors.forEach(p => { p.status.connection.lastSuccessAt = new Date().toISOString(); });
      await page.goto(relay.base);
      const card = page.locator('#grid [data-lane=D]');
      if (!await card.isVisible()) await page.locator('[data-operator-lane=D]').click();
      const feedback = card.locator('.operator-feedback');
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => window.FrozenTheme.set(theme), theme);
        p.status.online = true; p.status.shutter = 'closed'; await send('waiting');
        await feedback.filter({ hasText: 'Waiting for Shutter OPEN' }).waitFor();
        assert.equal(await card.locator('[data-action=shutter][data-value="0"]').isDisabled(), true);
        assert.equal(await card.locator('[data-action=shutter][data-value="1"]').isDisabled(), false, 'protective close remains available');
        assert.equal(await card.locator('[data-action=shutter][data-value="0"]').getAttribute('aria-pressed'), 'false');
        await send('unconfirmed');
        await feedback.filter({ hasText: 'not confirmed after 30 s. Check projector before retrying.' }).waitFor();
        const fits = await page.evaluate(() => {
          const d = document.documentElement, card = document.querySelector('#grid [data-lane=D]');
          return d.scrollHeight <= innerHeight && d.scrollWidth <= innerWidth && card.scrollHeight <= card.clientHeight + 1 && card.scrollWidth <= card.clientWidth + 1;
        });
        if (!fits) {
          if (dir) await page.screenshot({ path: `${dir}/overflow-${width}-${height}.png` });
          console.log(await card.evaluate(card => ({ size: [card.clientHeight, card.scrollHeight], children: [...card.children].map(c => [c.className, c.getBoundingClientRect().y, c.getBoundingClientRect().height]) })));
        }
        assert.equal(fits, true, `feedback fits ${width}x${height} ${theme}`);
        if (dir && [1440, 375].includes(width)) await page.screenshot({ path: `${dir}/unconfirmed-${width}-${theme}.png` });
        p.status.shutter = 'open'; await send('confirmed');
        await feedback.filter({ hasText: 'Shutter OPEN confirmed by projector in 1.4 s.' }).waitFor();
        p.status.online = false; await send('waiting');
        await feedback.filter({ hasText: 'Connection lost; confirmation unavailable.' }).waitFor();
        assert.equal(await card.locator('.operator-power-state').getAttribute('data-power-state'), 'unknown');
      }
      p.status.online = true; await send('confirmed');
      await page.reload();
      if (!await card.isVisible()) await page.locator('[data-operator-lane=D]').click();
      await feedback.filter({ hasText: 'confirmed by projector' }).waitFor();
      if (width === 1440) {
        p.status.shutter = 'closed'; await send('waiting');
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('projctl:navigate', { detail: { panel: 'all' } })));
        await page.locator('#all-targets').filter({ hasText: 'Waiting for Shutter OPEN' }).waitFor();
        assert.equal(await page.locator('[data-all=shutter][data-arg="0"]').isDisabled(), true);
        assert.equal(await page.locator('[data-all=shutter][data-arg="1"]').isDisabled(), false);
      }
    }
    assert.deepEqual(commands, []); assert.deepEqual(errors, []);
    console.log('Command feedback: waiting, timeout, confirmation, disconnect, reload and protective action at five sizes in both themes; zero commands or page errors');
  } finally { await browser.close(); await relay.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
