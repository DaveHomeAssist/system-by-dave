const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    for (const [i,slot] of ['P1','P2','P3','P4'].entries()) {
      await relay.api('projector', { slot, model: ['PT-DW830U','PT-RZ970','Barco UDM 4K22','PT-DW830U'][i], lane: 'ABCD'[i], inputs: { '31': 'DVI-D', '32': 'HDMI' } });
    }
    await relay.api('command', { slot: 'all', cmd: 'power', arg: 1 });
    await until(async () => (await relay.state()).projectors.every(p => p.status.power === 'on'));
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => { errors.push(error.message); console.log('page error',error.message); });
    await page.goto(relay.base);
    await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    await page.locator('#grid .operator-card').first().waitFor();
    assert.equal(await page.locator('#grid .operator-card').count(), 4);
    assert.equal(await page.locator('#tab-projector').isVisible(), false);
    const card = page.locator('#grid [data-lane=A]');
    await card.locator('[data-action=shutter][data-value="0"]').click();
    await until(async () => (await relay.state()).projectors[0].status.shutter === 'open');
    await card.locator('[data-action=pattern]').first().click();
    await until(async () => (await relay.state()).projectors[0].status.pattern === '08');
    await card.locator('[data-action=clear]').click();
    await card.locator('.operator-feedback').filter({ hasText: 'Test pattern cleared.' }).waitFor();
    await relay.api('command', { slot: 'P1', cmd: 'input', arg: '31' });
    await card.locator('[data-action=pattern]').first().click();
    await until(async () => (await relay.state()).projectors[0].status.pattern === '08');
    await card.locator('[data-action=reset]').click();
    try { await card.locator('.operator-feedback').filter({ hasText: 'HDMI restored.' }).waitFor(); } catch (error) { console.log('recovery feedback',await card.innerText()); console.log('relay',JSON.stringify((await relay.state()).projectors[0])); throw error; }
    const st = (await relay.state()).projectors[0].status;
    assert.equal(st.input, '32'); assert.equal(st.pattern, '00');
    for (const [index,lane] of ['B','C','D'].entries()) {
      const tile = page.locator(`#grid [data-lane=${lane}]`);
      const slot = `P${index + 2}`;
      await relay.api('command', { slot, cmd: 'input', arg: '31' });
      await tile.locator('[data-action=pattern]').first().click();
      await tile.locator('[data-action=reset]').click();
      await tile.locator('.operator-feedback').filter({ hasText: 'HDMI restored.' }).waitFor();
      const result = (await relay.state()).projectors.find(p => p.slot === slot);
      assert.equal(result.status.input, '32'); assert.equal(result.status.pattern, '00');
    }
    await card.locator('[data-action=power][data-value="0"]').click();
    await card.locator('[data-action=power][data-value="0"]').filter({ hasText: 'Confirm power off' }).waitFor();
    assert.equal((await relay.state()).projectors[0].status.power, 'on');
    await card.locator('[data-action=power][data-value="0"]').click();
    assert.equal((await relay.state()).projectors[0].status.power, 'on', 'rapid repeat does not confirm power off');
    await page.waitForTimeout(450);
    await card.locator('[data-action=power][data-value="0"]').click();
    await until(async () => (await relay.state()).projectors[0].status.power === 'cooling');
    await until(() => card.locator('[data-action=power][data-value="1"]').isDisabled());
    await relay.api('lock', { lock: true });
    await until(() => page.locator('#grid [data-lane=B] [data-action=pattern]').first().isDisabled());
    assert.equal(await page.locator('#grid [data-lane=B] [data-action=shutter]').first().isDisabled(), false);
    await relay.api('lock', { lock: false });
    await until(async () => !await page.locator('#grid [data-lane=B] [data-action=pattern]').first().isDisabled());
    await card.locator('[data-open-projector]').click();
    await page.locator('#tab-projector[open]').waitFor();
    await page.locator('#projector-back').click();
    assert.equal(await page.locator('#tab-projector').isVisible(), false);
    const evidence = process.env.EVIDENCE_DIR || '/tmp/projctl-operator-evidence';
    fs.mkdirSync(evidence, { recursive: true });
    for (const [width,height] of [[1440,900],[1280,900],[1024,768],[681,900],[930,1574],[680,900],[375,812],[844,390],[3840,1080]]) {
      await page.setViewportSize({ width, height });
      const singleProjector = width <= 680 || (width < 1280 && height < 700);
      if (singleProjector) {
        await page.locator('[data-operator-lane=B]').click();
        assert.equal(await page.locator('#grid [data-lane=B]').isVisible(), true);
        assert.equal(await page.locator('#grid [data-lane=A]').isVisible(), false);
      }
      const visibleCards = await page.locator('#grid .operator-card').filter({ visible: true }).all();
      assert.equal(visibleCards.length, singleProjector ? 1 : 4);
      if (width > 680 && width < 1280 && height >= 700) {
        const boxes = await page.locator('#grid .operator-card').evaluateAll(cards => cards.map(card => {
          const box = card.getBoundingClientRect();
          return { x: box.x, y: box.y };
        }));
        assert.equal(boxes[0].y, boxes[1].y, 'first row has two projectors');
        assert.equal(boxes[2].y, boxes[3].y, 'second row has two projectors');
        assert.ok(boxes[2].y > boxes[0].y && boxes[1].x > boxes[0].x);
        assert.equal(await page.locator('#operator-lanes').isVisible(), false);
      }
      for (const theme of ['light','dark']) {
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        assert.ok(await page.locator('#grid [data-lane=B] .operator-power-state').evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 24), 'power state stays prominent');
        if (width === 930) assert.ok((await page.locator('#grid [data-lane=B] .reset-hdmi').evaluate(b => b.getBoundingClientRect().height)) <= 64, 'tall tablet keeps recovery buttons compact');
        const overflow = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, cw: innerWidth, ch: innerHeight }));
        assert.ok(overflow.w <= width && overflow.h <= height, JSON.stringify(overflow));
        await page.screenshot({ animations: 'disabled', path: path.join(evidence, `operator-${width}-${height}-${theme}.png`) });
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#workspace-menu').click();
    await page.locator('[data-tab=health]').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#workspace-menu').evaluate(b => b === document.activeElement), true);
    await page.locator('#workspace-menu').click();
    await page.locator('[data-tab=health]').click();
    assert.equal(await page.locator('#thermal-watch').isVisible(), true);
    assert.equal(await page.locator('.pj-thermal-card').count(), 4);
    assert.equal(await page.locator('.pj-thermal-csv').isVisible(), (await relay.state()).projectors.some(p => p.thermal != null));
    await page.locator('[data-tab=rig]').click();
    await page.locator('#grid [data-lane=B] .shutter-open').focus();
    await relay.api('command', { slot: 'P2', cmd: 'shutter', arg: 1 });
    await until(() => page.evaluate(() => document.activeElement?.dataset.focusKey === 'B:operator:shutter:0'));
    const simple = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const simpleState = await relay.state(), simpleCalls = [];
    const simpleProjector = simpleState.projectors[0];
    Object.assign(simpleProjector, { driver: 'pjlink', patterns: null });
    simpleProjector.status.input = '31'; simpleProjector.status.pattern = undefined;
    let simpleSocket;
    await simple.routeWebSocket('**/ws', ws => { simpleSocket = ws; ws.send(JSON.stringify(simpleState)); });
    await simple.route('**/api/state', route => route.fulfill({ json: simpleState }));
    await simple.route('**/api/command', route => {
      const body = route.request().postDataJSON(); simpleCalls.push(body);
      simpleProjector.status.input = body.arg;
      simpleProjector.status.updatedAt = Date.now();
      simpleProjector.status.connection.lastSuccessAt = new Date().toISOString();
      simpleSocket.send(JSON.stringify({ type: 'status', slot: simpleProjector.slot, status: simpleProjector.status }));
      return route.fulfill({ json: { [simpleProjector.slot]: { result: 'OK' } } });
    });
    simpleProjector.status.errors = { lamp: 2, other: 1 };
    await simple.goto(relay.base);
    const simpleCard = simple.locator('#grid [data-lane=A]');
    await simpleCard.waitFor();
    assert.equal(await simpleCard.getAttribute('data-alarm-severity'), 'fault');
    assert.match(await simpleCard.locator('.operator-alert').innerText(), /Fault.*lamp fault/i);
    assert.ok(await simpleCard.locator('.operator-alert').evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 14));
    assert.equal(await simpleCard.locator('[data-action=clear]').isDisabled(), true);
    assert.equal(await simpleCard.locator('[data-more-patterns]').isDisabled(), true);
    assert.equal(await simpleCard.locator('[data-action=pattern]').count(), 0);
    await simpleCard.locator('[data-action=reset]').click();
    await simpleCard.locator('.operator-feedback').filter({ hasText: 'HDMI restored.' }).waitFor();
    assert.deepEqual(simpleCalls.map(({cmd,arg}) => [cmd,arg]), [['input','32']]);
    simpleProjector.status.power = 'on';
    simpleProjector.status.stale = ['power'];
    simpleSocket.send(JSON.stringify({ type: 'status', slot: simpleProjector.slot, status: simpleProjector.status }));
    await until(async () => await simpleCard.locator('.operator-power-state').textContent() === 'unknown');
    await simple.setViewportSize({ width: 1024, height: 768 });
    assert.equal(await simpleCard.locator('.operator-alert').isVisible(), true);
    await simple.screenshot({ path: path.join(evidence, 'warning-1024.png') });
    simpleProjector.status.errors = { lamp: 1 };
    simpleSocket.send(JSON.stringify({ type: 'status', slot: simpleProjector.slot, status: simpleProjector.status }));
    await until(async () => await simpleCard.getAttribute('data-alarm-severity') === 'warning');
    assert.match(await simpleCard.locator('.operator-alert').innerText(), /Warning.*lamp warning/i);
    await simple.close();
    assert.deepEqual(errors, []);
    console.log('Operator console actions, recovery, guards, details, nine viewports and both themes passed');
  } finally {
    await browser.close();
    await relay.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
