// Frozen Monitor in a real browser against the simulator relay: live state, the six pages at
// desktop, tablet and phone sizes without page scroll, theme memory, Stop lens, and the offline view.
// Shared tasks are served from a fixture; no request reaches the public task service.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const PAGES = ['index.html', 'cues.html', 'rig.html', 'network.html', 'notes.html', 'calendar.html'];
const SIZES = [[1440, 900], [1024, 768], [680, 900], [375, 812]];

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox'] });
  try {
    for (const [slot, lane] of [['P1', 'C'], ['P2', 'D'], ['P3', 'A'], ['P4', 'B']]) assert.equal((await relay.api('projector', { slot, lane })).status, 200);
    for (const slot of ['P1', 'P2', 'P3', 'P4']) await relay.api('command', { slot, cmd: 'power', arg: 1 });
    await relay.api('lock', { lock: true });

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    let taskWrites = 0;
    await context.route('https://wst.housevideo.app/**', route => {
      if (route.request().method() !== 'GET') taskWrites++;
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ tasks: [{ id: 't1', text: 'Fixture task', done: false, revision: 1 }] }) });
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const noPageScroll = () => page.evaluate(() => { const d = document.documentElement; return d.scrollHeight <= d.clientHeight && d.scrollWidth <= d.clientWidth; });

    await page.goto(relay.base + '/monitor/');
    await until(async () => /4 of 4 replying/.test(await page.locator('#mv-count').textContent()));
    await until(async () => (await page.locator('[data-lock-word]').textContent()) === 'Show Lock on');
    assert.match(await page.locator('[data-relay-word]').textContent(), /Simulator relay · live/);
    await until(async () => (await page.locator('#mon-log [role=row]').count()) > 2);
    // Recorded lamp notes keep their date and label; they never read as a current reading.
    assert.match(await page.locator('#mon-insp').textContent(), /Recorded: Lamp 1 on · Lamp 2 FAILED · Nov 13 snapshot/);
    assert.match(await page.locator('.fm-feed[data-lane=A] .fm-feed__foot').textContent(), /Recorded: Lamp 1 on · Lamp 2 FAILED · Nov 13 snapshot/);
    await page.locator('.fm-feed[data-lane=B]').click();
    assert.equal(await page.locator('#insp-title').textContent(), 'BProjector B');
    assert.equal(await page.locator('#mon-insp').getAttribute('data-lane'), 'B');
    assert.equal(await page.locator('.fm-feed[data-lane=B]').getAttribute('aria-pressed'), 'true');
    console.log('monitor live state');

    // Theme: a fresh browser starts light; the choice is remembered across pages.
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    await page.locator('[data-theme-choice="deep-freeze"]').click();
    await page.goto(relay.base + '/monitor/rig.html');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'deep-freeze');
    console.log('theme memory');

    // Rig: Stop lens is the only live control, and the relay accepts it under Show Lock.
    await until(async () => !(await page.locator('#rig-stop').isDisabled()));
    assert.equal(await page.locator('.fm-ctl button:not(#rig-stop):not([disabled])').count(), 0);
    await page.locator('#rig-stop').click();
    await until(async () => /accepted by the relay for P1/.test(await page.locator('#rig-stop-status').textContent()));
    console.log('stop lens');

    await page.goto(relay.base + '/monitor/network.html');
    await page.locator('[data-view=picture]').click();
    assert.equal(await page.locator('[data-map=picture]').isVisible(), true);
    await page.locator('[data-node=aten]').click();
    assert.equal(await page.locator('#dev-title').textContent(), 'EDID emulator');
    console.log('network maps');

    await page.goto(relay.base + '/monitor/notes.html');
    await until(async () => /Fixture task/.test(await page.locator('#fm-task-list').textContent()));
    await page.locator('#fm-notes-text').fill('Check the D lens label');
    assert.equal(await page.evaluate(() => localStorage.getItem('wst.frozen.personal-notes.v1')), 'Check the D lens label');
    console.log('notes and tasks fixture');

    await page.goto(relay.base + '/monitor/calendar.html');
    await until(async () => (await page.locator('.fm-day').count()) > 20);
    await page.locator('.fm-day[data-date="2026-11-25"]').click();
    assert.match(await page.locator('#cal-agenda').textContent(), /Opening Night/i);
    console.log('calendar');

    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      for (const file of PAGES) {
        await page.goto(relay.base + '/monitor/' + file);
        await page.waitForTimeout(150);
        assert.ok(await noPageScroll(), `${file} scrolls the page at ${width}x${height}`);
        assert.equal(await page.locator(`.fm-nav [aria-current=page]`).getAttribute('href'), file);
        const links = await page.locator('.fm-nav a').evaluateAll(as => as.map(a => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height >= 44 && a.scrollWidth <= a.clientWidth; }));
        assert.ok(links.length === 6 && links.every(Boolean), `${file} navigation is not fully available at ${width}x${height}`);
      }
      console.log('contained', width, height);
    }

    assert.deepEqual(errors, [], 'browser errors while the relay was up');
    assert.equal(taskWrites, 0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(relay.base + '/monitor/');
    await until(async () => /4 of 4 replying/.test(await page.locator('#mv-count').textContent()));
    await relay.close();
    await until(async () => (await page.locator('[data-relay-word]').textContent()) === 'Relay offline', 20000);
    assert.equal(await page.locator('[data-lock-word]').textContent(), 'Show Lock unknown');
    // Feeds repaint on the next frame; no lane may keep a stale reading.
    await until(async () => (await page.locator('.fm-feed .fm-word').allTextContents()).every(t => t.trim() === 'Relay offline'));
    console.log('offline view');
    await context.close();
  } finally { await browser.close(); await relay.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
