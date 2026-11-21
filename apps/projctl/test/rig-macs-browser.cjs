// Rig page Mac tiles in a real browser against the simulator relay: green, red, stale, the relay going away,
// containment at the four monitor sizes in both themes, and readable text on the red tile.
// Set RIG_SHOTS_DIR to also write the review screenshots (green, red and stale, light and dark).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SIZES = [[1440, 900], [1024, 768], [680, 900], [375, 812]];
const check = (id, label, status, observed) => ({ id, label, status, observed });
const OK_CHECKS = [
  check('displays', 'Displays', 'PASS', '5 displays present · identities, resolution and refresh match'),
  check('millumin', 'Millumin process', 'PASS', 'Running · pid 4242 · same process as at startup'),
  check('show', 'Show file', 'CHANGED', 'Changed since startup (saved about 8:12 PM) · a save is reported, not treated as a fault'),
  check('relay', 'Projctl relay', 'PASS', 'Answering (12 ms)'),
];
const report = (host, over = {}) => ({ schema: 'frozen-startup.status-report.v1', host, role: host === 'm5' ? 'projectors' : 'pixel-strips', phase: 'watch', state: 'ok',
  reportedAt: new Date().toISOString(), execution: 'offline fixture', checks: OK_CHECKS, cycle: 1, intervalSeconds: 60, ...over });
const FAULT = (label, id, text) => ({ state: 'fault', checks: [check(id, label, 'FAIL', text), ...OK_CHECKS.filter(c => c.id !== id && c.id !== 'show')] });

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay({ PROJCTL_MAC_STALE_MS: '15000' });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox'] });
  const shots = process.env.RIG_SHOTS_DIR;
  if (shots) fs.mkdirSync(shots, { recursive: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const post = async body => { const r = await relay.api('mac-status', body); assert.equal(r.status, 200, JSON.stringify(r.body)); };
    const tile = host => page.locator(`.fm-mac[data-host=${host}]`);
    const state = host => tile(host).getAttribute('data-state');
    // The tiles read "Connecting" until the relay's first snapshot and the first report read arrive; wait for real data.
    const open = async () => { await page.goto(relay.base + '/monitor/rig.html'); await until(async () => (await page.locator('.fm-mac').count()) >= 2 && (await state('m5')) !== 'unknown'); };
    const word = async host => (await tile(host).locator('.fm-mac__word').textContent()).trim();
    const noScroll = () => page.evaluate(() => { const d = document.documentElement; return d.scrollHeight <= d.clientHeight && d.scrollWidth <= d.clientWidth; });
    const theme = async t => { await page.locator(`[data-theme-choice="${t}"]`).click(); assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), t); };
    const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, `rig-macs-${name}.png`) }); };

    // 1. Nothing has reported: both tiles say so, and neither is green.
    await open();
    assert.deepEqual([await state('m5'), await state('m1')], ['none', 'none']);
    assert.equal(await word('m5'), 'No report');
    assert.match(await tile('m5').textContent(), /No report since this relay started/);
    assert.equal(await page.locator('#macs-tag').textContent(), '2 not reporting');
    console.log('rig tiles: no report');

    // 2. Both Macs report ok: green, with the last report time and the saved-show note (a note, not a fault).
    await post(report('m5')); await post(report('m1', { phase: 'startup', state: 'running', checks: OK_CHECKS.map(c => ({ ...c, status: 'RUNNING' })) }));
    await until(async () => (await state('m5')) === 'ok', 25000); // picked up by the page's own refresh, no reload
    assert.equal(await word('m5'), 'OK');
    assert.match(await tile('m5').locator('.fm-mac__line').textContent(), /^Last report \d{1,2}:\d{2}:\d{2} (AM|PM) E[SD]T · watching · /);
    assert.match(await tile('m5').textContent(), /Show file: Changed since startup/);
    assert.equal(await tile('m5').locator('.fm-mac__fail').count(), 0);
    assert.equal(await tile('m5').locator('.fm-mac__practice').count(), 1, 'a practice report is labelled');
    await until(async () => (await state('m1')) === 'starting');
    assert.equal(await word('m1'), 'Starting');
    await post(report('m1'));
    await open();
    assert.deepEqual([await state('m5'), await state('m1')], ['ok', 'ok']);
    const okEdge = await tile('m5').evaluate(el => getComputedStyle(el).borderLeftColor);
    await shot('green-light'); await theme('dark'); await shot('green-dark'); await theme('light');
    console.log('rig tiles: green');

    // 3. A fault turns that Mac's tile red and names the failing check. Red only: no sound, nothing sent.
    await post(report('m5', FAULT('Displays', 'displays', 'B display is missing; D refreshRate differs from the approved mode')));
    await open();
    assert.equal(await state('m5'), 'fault');
    assert.equal(await state('m1'), 'ok', 'the other Mac stays green');
    assert.equal(await word('m5'), 'Fault');
    assert.equal((await tile('m5').locator('.fm-mac__fail strong').textContent()).trim(), 'Displays');
    assert.match(await tile('m5').locator('.fm-mac__fail').textContent(), /B display is missing/);
    assert.notEqual(await tile('m5').evaluate(el => getComputedStyle(el).borderLeftColor), okEdge, 'red is a different colour from green');
    assert.equal(await page.locator('audio').count(), 0);
    assert.equal(await page.evaluate(() => typeof Notification === 'undefined' ? 'none' : Notification.permission), await page.evaluate(() => typeof Notification === 'undefined' ? 'none' : Notification.permission));
    await shot('red-light'); await theme('dark'); await shot('red-dark');
    const contrast = await page.evaluate(() => {
      const parse = value => { const m = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/); if (m) return [m[1], m[2], m[3]].map(Number); const r = value.match(/rgba?\((\d+), (\d+), (\d+)/); return r.slice(1, 4).map(n => n / 255); };
      const lum = ([r, g, b]) => [r, g, b].map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
      const el = document.querySelector('.fm-mac[data-host=m5] .fm-mac__fail'), tileEl = document.querySelector('.fm-mac[data-host=m5]');
      const a = lum(parse(getComputedStyle(el).color)), b = lum(parse(getComputedStyle(tileEl).backgroundColor));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    assert.ok(contrast >= 4.5, `red tile text contrast ${contrast.toFixed(2)} in dark theme`);
    await theme('light');
    console.log('rig tiles: red');

    // 4. A Mac that stops reporting goes stale on the relay clock; the old fault is not shown as current.
    await post(report('m1', FAULT('Pixel output', 'pixel', 'No ping reply from Strip B')));
    await open();
    assert.equal(await state('m1'), 'fault');
    await page.waitForTimeout(15500);
    await post(report('m5'));
    await until(async () => (await state('m1')) === 'stale', 25000);
    assert.equal(await word('m1'), 'Stale');
    assert.match(await tile('m1').textContent(), /Last known: fault · Pixel output/);
    assert.equal(await tile('m1').locator('.fm-mac__fail').count(), 0);
    await until(async () => (await state('m5')) === 'ok', 20000); // the page's next refresh brings the fresh M5 report
    assert.equal(await state('m1'), 'stale');
    await shot('stale-light'); await theme('dark'); await shot('stale-dark'); await theme('light');
    console.log('rig tiles: stale');

    // 5. The next report brings it back.
    await post(report('m1'));
    await open();
    assert.equal(await state('m1'), 'ok');
    console.log('rig tiles: recovery');

    // 6. Worst-case content stays inside the page at the four monitor sizes, in both themes.
    const long = 'x'.repeat(40) + ' ' + 'long failing detail '.repeat(12);
    const worst = async () => {
      await post(report('m5', { ...FAULT('Displays', 'displays', long.slice(0, 240)), message: 'Displays check failed' }));
      await post(report('m1', { checks: [...OK_CHECKS, check('memory', 'Memory pressure', 'WARN', 'Elevated (warning level)')] }));
    };
    for (const t of ['light', 'dark']) {
      for (const [width, height] of SIZES) {
        await page.setViewportSize({ width, height });
        await worst();
        await open();
        assert.equal(await state('m5'), 'fault');
        if (t === 'dark') await theme('dark');
        assert.ok(await noScroll(), `rig scrolls the page at ${width}x${height} (${t}) with Mac tiles showing`);
        const panel = await page.locator('#rig-macs').boundingBox();
        assert.ok(panel && panel.height > 40, `Show Macs panel is visible at ${width}x${height}`);
        const fits = await page.locator('.fm-mac').evaluateAll(els => els.every(el => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= window.innerWidth + 1));
        assert.ok(fits, `a Mac tile overflows sideways at ${width}x${height} (${t})`);
        const links = await page.locator('.fm-nav a').evaluateAll(as => as.every(a => a.getBoundingClientRect().height >= 44));
        assert.ok(links, 'navigation stays reachable');
      }
      if (t === 'dark') await theme('light');
      console.log('rig tiles contained', t);
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // 7. When the relay goes away the tiles say so; they never keep showing green.
    await open();
    assert.equal(await state('m1'), 'ok');
    await relay.close();
    await until(async () => (await state('m1')) === 'unknown' && (await word('m1')) === 'Relay offline', 30000);
    assert.equal(await state('m5'), 'unknown');
    assert.deepEqual(errors.filter(e => !/ERR_CONNECTION_REFUSED|WebSocket|Failed to load resource|net::/.test(e)), [], 'browser errors');
    console.log('rig tiles: relay offline');
    await context.close();
  } finally { await browser.close(); await relay.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
