const {selectSlot,openBulk}=require('./operator-ui.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [slot,lane] of Object.entries({P1:'C',P2:'B',P4:'D'})) await relay.api('projector',{slot,lane});
    const snapshot = await relay.state();
    // A hanging HTTP auth check must not block reconnect or erase unsaved edits.
    const page = await browser.newPage();
    await page.route('**/api/state', () => {});
    const sockets = [];
    await page.routeWebSocket('**/ws', ws => { sockets.push(ws); ws.send(JSON.stringify(snapshot)); });
    await page.goto(relay.base);
    await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    assert.match(await page.locator('#relay-mode').innerText(), /DEMO/);
    await page.locator('[data-tab="setup"]').click();
    const label = page.locator('.pj-setup[data-slot="P2"] [data-k="label"]');
    await label.fill('Keep unsaved edit');
    sockets[0].close();
    await until(() => sockets.length >= 2);
    await page.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    assert.equal(await label.inputValue(), 'Keep unsaved edit');
    assert.equal(await page.locator('[data-tab="setup"]').getAttribute('aria-selected'), 'true');
    await page.close();

    // Cold unreachable devices cannot imply a healthy alarm state or guessed input.
    const cold = await browser.newPage();
    const coldState = structuredClone(snapshot);
    const device = coldState.projectors.find(p => p.slot === 'P2');
    device.status = { ...device.status, online: false, input: null, power: 'unknown', shutter: 'unknown', errors: {}, connection: { state: 'unreachable', lastSuccessAt: null, error: 'timeout' } };
    let coldSocket;
    await cold.routeWebSocket('**/ws', ws => { coldSocket = ws; ws.send(JSON.stringify(coldState)); });
    await cold.goto(relay.base);
    await cold.locator('[data-tab="rig"]').click();
    await cold.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    const coldUnassigned = cold.locator('.pj-unassigned');
    if (await coldUnassigned.count() && !await coldUnassigned.evaluate(el => el.open)) await coldUnassigned.locator(':scope > summary').click();
    await selectSlot(cold,'P2');const coldCard = cold.locator('#projector-controls [data-slot="P2"]');
    await coldCard.locator('details[data-input-options] > summary').click();
    assert.match(await coldCard.locator('.pj-health').innerText(), /Alarms\s+Unavailable/i);
    assert.equal(await coldCard.locator('select[data-c="input"]').inputValue(), '');
    assert.match(await coldCard.locator('option:checked').innerText(), /No input reported/);
    const successful = { ...device.status, online: true, input: '31', connection: { state: 'online', lastSuccessAt: new Date().toISOString(), error: null } };
    coldSocket.send(JSON.stringify({ type: 'status', slot: 'P2', status: successful }));
    await until(async () => (await coldCard.locator('select[data-c="input"]').inputValue()) === '31');
    assert.match(await coldCard.locator('.pj-health').innerText(), /Alarms\s+None reported/i);
    coldSocket.send(JSON.stringify({ type: 'status', slot: 'P2', status: { ...successful, online: false, connection: { ...successful.connection, state: 'unreachable', error: 'timeout' } } }));
    await until(() => coldCard.locator('select[data-c="input"]').isDisabled());
    assert.equal(await coldCard.locator('select[data-c="input"]').inputValue(), '31');
    assert.match(await coldCard.locator('.pj-telemetry-note').innerText(), /last known/);
    coldSocket.send(JSON.stringify({ type: 'status', slot: 'P2', status: { ...successful, input: 'opaque-input' } }));
    await until(async () => (await coldCard.locator('option:checked').textContent()).includes('opaque-input'));
    assert.match(await coldCard.locator('option:checked').innerText(), /Reported input: opaque-input/);
    await cold.close();

    // Default reset is explicit, live metadata enables it, and guards stay active.
    const hdmi = await browser.newPage();
    const hdmiState = structuredClone(snapshot), requests = [];
    hdmiState.projectors.find(p => p.slot === 'P2').inputPreference = { label: 'HDMI', value: null, available: false };
    let hdmiSocket;
    await hdmi.routeWebSocket('**/ws', ws => { hdmiSocket = ws; ws.send(JSON.stringify(hdmiState)); });
    await hdmi.route('**/api/command', route => { const body = route.request().postDataJSON(); requests.push(body); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ [body.slot]: { result: 'OK' } }) }); });
    await hdmi.goto(relay.base);
    await hdmi.locator('[data-tab="rig"]').click();
    await hdmi.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    const hdmiUnassigned = hdmi.locator('.pj-unassigned');
    if (await hdmiUnassigned.count()) await hdmiUnassigned.locator(':scope > summary').click();
    await selectSlot(hdmi,'P2');const hdmiCard = hdmi.locator('#projector-controls [data-slot="P2"]');
    assert.equal(await hdmiCard.locator('[data-reset-input]').isDisabled(), true);
    assert.equal(requests.length, 0, 'boot must never reset hardware');
    const report = hdmiState.projectors.find(p => p.slot === 'P2');
    hdmiSocket.send(JSON.stringify({ type: 'status', slot: 'P2', status: report.status, inputPreference: { label: 'HDMI', value: '32', available: true } }));
    await until(async () => !await hdmiCard.locator('[data-reset-input]').isDisabled());
    await hdmiCard.locator('details[data-input-options] > summary').click();
    await hdmiCard.locator('[data-reset-input]').click();
    await until(() => requests.length === 1);
    assert.deepEqual(requests[0], { slot: 'P2', cmd: 'resetInput' });
    assert.equal(await hdmiCard.locator('details[data-input-options]').evaluate(el => el.open), true);
    await openBulk(hdmi);await hdmi.locator('[data-all="resetInput"]').click();
    await until(() => requests.length === 2);
    assert.deepEqual(requests[1], { slot: 'all', cmd: 'resetInput' });
    for (const [width, height] of [[1440, 900], [375, 812], [320, 256], [3840, 1080]]) {
      await hdmi.setViewportSize({ width, height });
      const size = await hdmi.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, cw: innerWidth, ch: innerHeight }));
      assert.ok(size.w <= size.cw && size.h <= size.ch, `HDMI layout overflow at ${width}x${height}`);
      if (process.env.ARTIFACT_DIR) { fs.mkdirSync(process.env.ARTIFACT_DIR, { recursive: true }); await hdmi.screenshot({ path: `${process.env.ARTIFACT_DIR}/hdmi-${width}-${height}.png` }); }
    }
    hdmiSocket.send(JSON.stringify({ type: 'busy', slot: 'P2', busy: 'lens' }));
    await until(() => hdmiCard.locator('[data-reset-input]').isDisabled());
    hdmiState.lock = true;
    hdmiSocket.send(JSON.stringify(hdmiState));
    await until(() => hdmi.locator('[data-all="resetInput"]').isDisabled());
    assert.equal(await hdmiCard.locator('details[data-input-options]').evaluate(el => el.open), true);
    assert.equal(requests.length, 2, 'polls and fresh snapshots must never reset inputs');
    await hdmi.close();

    // An open socket without a snapshot cannot enable commands, and is retried.
    const waiting = await browser.newPage();
    let connections = 0;
    await waiting.routeWebSocket('**/ws', ws => { connections++; if (connections > 1) ws.send(JSON.stringify(snapshot)); });
    await waiting.goto(relay.base);
    assert.equal(await waiting.locator('[data-all="power"]').first().isDisabled(), true);
    await until(() => connections >= 2, 9000);
    await waiting.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    await waiting.close();

    // A healthy heartbeat prevents stale-state recovery; silence forces it.
    const silent = await browser.newPage();
    await silent.clock.install();
    const quietSockets = [];
    await silent.routeWebSocket('**/ws', ws => { quietSockets.push(ws); ws.send(JSON.stringify(snapshot)); });
    await silent.goto(relay.base);
    await silent.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    await silent.clock.fastForward(14000);
    quietSockets[0].send(JSON.stringify({ type: 'heartbeat', at: Date.now() }));
    await new Promise(resolve => setTimeout(resolve, 100));
    await silent.clock.fastForward(14000);
    assert.equal(quietSockets.length, 1);
    assert.equal(await silent.locator('#conn-word').innerText(), 'Relay connected');
    await silent.clock.fastForward(1100);
    assert.equal(await silent.locator('#conn-word').innerText(), 'Relay offline');
    await silent.clock.fastForward(1600);
    await until(() => quietSockets.length === 2);
    await silent.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    await silent.close();

    // Native input selection keeps the same node during polls, but lock disables it.
    const choosing = await browser.newPage();
    await choosing.goto(relay.base);
    await choosing.locator('[data-tab="rig"]').click();
    await choosing.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    const unassigned = choosing.locator('.pj-unassigned');
    if (await unassigned.count() && !await unassigned.evaluate(el => el.open)) await unassigned.locator(':scope > summary').click();
    await selectSlot(choosing,'P2');await choosing.locator('details[data-input-options="P2"] > summary').click();
    const select = choosing.locator('#projector-controls [data-slot="P2"] select[data-c="input"]');
    await select.evaluate(el => { el.focus(); el.dataset.fixtureToken = 'keep'; el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(await select.getAttribute('data-fixture-token'), 'keep');
    await relay.api('lock', { lock: true });
    await until(() => select.isDisabled());
    await relay.api('lock', { lock: false });
    await choosing.close();

    // Recovering from an expired session retains the login redirect.
    const expired = await browser.newPage();
    await expired.route('**/api/state', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"login required"}' }));
    await expired.routeWebSocket('**/ws', ws => ws.close());
    await expired.goto(relay.base);
    await expired.waitForURL('**/login.html');
    await expired.close();
    console.log('Reconnect: hanging HTTP, missing snapshot, dirty setup retention, heartbeat/silence, input-menu safety, cold telemetry and 401 redirect passed');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
