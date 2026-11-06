const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
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
    await choosing.locator('#conn-word').filter({ hasText: 'Relay connected' }).waitFor();
    const unassigned = choosing.locator('.pj-unassigned');
    if (await unassigned.count() && !await unassigned.evaluate(el => el.open)) await unassigned.locator('summary').click();
    const select = choosing.locator('.pj-tile[data-slot="P2"] select[data-c="input"]');
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
    console.log('Reconnect: hanging HTTP, missing snapshot, dirty setup retention, heartbeat/silence, input-menu safety and 401 redirect passed');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
