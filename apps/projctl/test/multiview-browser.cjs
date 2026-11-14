const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { selectLane } = require('./operator-ui.cjs');
(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const state = await relay.state();
    state.projectors.forEach((p,i) => { p.lane='ABCD'[i]; p.status.power='on'; });
    for (const [width,height] of [[845,900],[1440,900],[375,812]]) {
      const page = await browser.newPage({ viewport: { width,height } });
      let socket;
      await page.routeWebSocket('**/ws', ws => { socket=ws; ws.send(JSON.stringify(state)); });
      await page.goto(relay.base);
      assert.equal(await page.locator('#grid > .pj-summary-tile').count(),4);
      assert.equal(await page.locator('#tab-projector').isVisible(),false);
      await selectLane(page,'B');
      assert.match(await page.locator('#projector-detail-title').innerText(),/^B/);
      await selectLane(page,'D');
      assert.match(await page.locator('#projector-detail-title').innerText(),/^D/);
      await page.locator('#projector-back').click();
      const target=state.projectors[3]; target.status.errors={lamp:2};
      socket.send(JSON.stringify({ type:'status',slot:target.slot,status:target.status }));
      await until(async () => (await page.locator('#grid [data-lane=D]').innerText()).includes('lamp fault'));
      assert.equal(await page.locator('#grid > .pj-summary-tile').count(),4);
      assert.ok(await page.evaluate(() => document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth));
      await page.close();
      console.log('Operator lanes and detail selection',width,height);
    }
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error);process.exitCode=1; });
