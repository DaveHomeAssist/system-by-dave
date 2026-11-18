// Show backup page in a browser against the simulator relay. Lanes B and C are lit; A and D are
// made unreachable, which is how they read during a show while the playback app holds their link.
// Set SHOW_BACKUP_SHOTS to a folder to keep screenshots.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SIZES = [[1440, 900], [1024, 768], [768, 1024], [375, 812], [375, 667], [844, 390], [320, 256], [2560, 720]];
// WEB-2: the page never scrolls, nothing is pushed past the viewport, and each card holds its own text.
const audit = () => {
  const root = document.documentElement, visible = el => el.getClientRects().length > 0;
  const outside = [...document.querySelectorAll('body *')].filter(el => {
    if (!visible(el) || el.closest('.sb-sr, .sb-skip, dialog:not([open])')) return false;
    const r = el.getBoundingClientRect();
    return r.height > 0 && (r.bottom > innerHeight + 1 || r.right > innerWidth + 1);
  }).map(el => el.className || el.tagName);
  const cut = [...document.querySelectorAll('.sb-lane__in, .sb-check, .sb-top, .sb-foot')].filter(el => visible(el) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1))
    .map(el => `${el.className} ${el.closest('[data-lane]')?.dataset.lane || el.dataset.check || ''} ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
  return { pageScrolls: root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth, outside, cut };
};

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const shots = process.env.SHOW_BACKUP_SHOTS;
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };
  try {
    // A fresh test rig has no drawing lanes; assign them the way Setup does.
    for (const [slot, lane, model] of [['P1', 'A', 'PT-DW830U'], ['P2', 'B', 'PT-RZ970'], ['P3', 'C', 'UDM 4K22'], ['P4', 'D', 'PT-DW830U']]) assert.equal((await relay.api('projector', { slot, lane, model })).status, 200);
    for (const slot of ['P2', 'P3']) await relay.api('command', { slot, cmd: 'power', arg: 1 });
    for (const slot of ['P1', 'P4']) await relay.api('sim', { slot, offline: true });
    const reading = async () => Object.fromEntries((await relay.state()).projectors.map(p => [p.slot, p.status]));
    await until(async () => { const s = await reading(); return s.P2.power === 'on' && s.P3.power === 'on' && !s.P1.online && !s.P4.online; }, 20000);
    for (const slot of ['P2', 'P3']) await relay.api('command', { slot, cmd: 'shutter', arg: 0 });
    await until(async () => { const s = await reading(); return s.P2.shutter === 'open' && s.P3.shutter === 'open'; });

    // ---- Live simulator relay
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const page = await context.newPage();
    const posts = [], foreign = [], errors = [];
    page.on('request', request => {
      if (new URL(request.url()).origin !== relay.base && !request.url().startsWith('data:')) foreign.push(request.url());
      if (request.method() === 'POST') posts.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${relay.base}/show.html`);
    const lane = id => page.locator(`.sb-lane[data-lane="${id}"]`);
    const text = (id, part) => lane(id).locator(`.sb-lane__${part}`).innerText();
    const armButton = id => lane(id).locator('[data-act=arm]'), confirmButton = id => lane(id).locator('[data-act=confirm]'), cancelButton = id => lane(id).locator('[data-act=cancel]');
    const tile = id => page.locator(`.sb-check[data-check="${id}"]`);
    const tileText = async id => [await tile(id).getAttribute('data-state'), await tile(id).locator('.sb-check__value').innerText(), await tile(id).locator('.sb-check__note').innerText()];
    await page.locator('.sb-lane[data-lane="B"][data-reach="live"]').waitFor();
    await page.locator('.sb-lane[data-lane="A"][data-reach="unreached"]').waitFor();

    for (const id of ['B', 'C']) {
      assert.equal(await text(id, 'state'), 'ON');
      assert.equal(await text(id, 'shutter'), 'Shutter OPEN');
      assert.match(await text(id, 'fresh'), /^Reply (just now|\ds ago)$/);
      assert.equal(await armButton(id).innerText(), 'Close shutter');
      assert.equal(await armButton(id).getAttribute('aria-disabled'), 'false');
    }
    for (const id of ['A', 'D']) {
      assert.equal(await text(id, 'state'), 'CHECK BY EYE', `${id} never shows a state the relay could not read`);
      assert.equal(await text(id, 'shutter'), 'Shutter not reported');
      assert.match(await text(id, 'fresh'), /^Last reply \d+:\d\d [AP]M$/);
      assert.equal(await armButton(id).getAttribute('aria-disabled'), 'true');
      assert.equal(await text(id, 'why'), "Relay can't reach it. Use the remote.");
      await armButton(id).click({ force: true });
      assert.equal(await confirmButton(id).isVisible(), false, 'a blocked lane cannot be armed');
    }
    assert.deepEqual(await tileText('lanes'), ['eye', '2 of 4 lit', 'A and D: check by eye']);
    assert.deepEqual(await tileText('outputs'), ['off', 'Not read', 'Reader is off in simulation']);
    assert.equal(await tile('outputs').locator('.sb-check__state').innerText(), 'NO READING');
    assert.deepEqual(await tileText('cues'), ['off', 'Not connected', 'Console cues do not reach this page']);
    assert.deepEqual((await tileText('computer')).slice(0, 2), ['ok', 'Answering']);
    assert.equal(await page.locator('#sb-verdict').getAttribute('data-state'), 'eye');
    assert.match(await page.locator('#sb-verdict').innerText(), /NOTHING WRONG REPORTED/i);
    assert.equal(await page.locator('#sb-sim').isVisible(), true, 'simulated readings are labelled');
    assert.equal(await page.locator('#sb-lock').innerText(), 'Show Lock off');
    assert.equal(posts.length, 0, 'loading and watching sends nothing');
    await shot(page, '01-tablet-1024x768-light');

    // Two steps. The first sends nothing; Cancel, Escape and a timeout send nothing.
    await armButton('B').click();
    assert.match(await confirmButton('B').innerText(), /^Confirm close B \(\d\)$/);
    assert.equal(await armButton('B').isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.act), 'confirm', 'focus follows to the second step');
    await shot(page, '02-tablet-armed');
    await cancelButton('B').click();
    assert.equal(await armButton('B').isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.act), 'arm');
    await armButton('C').click();
    await page.keyboard.press('Escape');
    assert.equal(await armButton('C').isVisible(), true);
    assert.equal(posts.length, 0, 'cancel and Escape send nothing');

    // A double tap is not two steps: the confirm ignores its first 600 ms.
    await armButton('B').dblclick();
    await page.waitForTimeout(100);
    assert.equal(posts.length, 0);
    assert.equal(await confirmButton('B').isVisible(), true);
    await page.waitForTimeout(650);
    await confirmButton('B').click();
    await lane('B').locator('.sb-lane__why', { hasText: /^Reported CLOSED at / }).waitFor({ timeout: 10000 });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].path, '/api/command');
    assert.deepEqual({ ...posts[0].body, expectedTargets: undefined }, { slot: 'P2', cmd: 'shutter', arg: 1, expectedTargets: undefined });
    assert.match(posts[0].body.expectedTargets[0].revision, /^[a-f0-9]{64}$/);
    assert.equal(posts[0].body.expectedTargets[0].slot, 'P2');
    assert.equal((await reading()).P2.shutter, 'closed');
    assert.equal(await text('B', 'shutter'), 'Shutter CLOSED · dark on stage');
    assert.equal(await armButton('B').innerText(), 'Open shutter');
    assert.deepEqual(await tileText('lanes'), ['eye', '2 of 4 lit', 'A and D: check by eye'], 'a closed shutter does not unlight a lane');

    // Show Lock is shown, and the shutter stays available under it, as on the main console.
    await relay.api('lock', { lock: true });
    await page.locator('#sb-lock[data-lock="on"]').waitFor();
    assert.equal(await page.locator('#sb-lock').innerText(), 'Show Lock ON');
    await armButton('B').click();
    await page.waitForTimeout(650);
    await confirmButton('B').click();
    await lane('B').locator('.sb-lane__why', { hasText: /^Reported OPEN at / }).waitFor({ timeout: 10000 });
    assert.deepEqual([posts.length, posts[1].body.cmd, posts[1].body.arg], [2, 'shutter', 0]);

    // Go or no-go detail and the snapshot.
    await tile('cues').click();
    const detail = page.locator('#sb-detail');
    assert.equal(await detail.evaluate(node => node.open), true);
    assert.match(await detail.innerText(), /Cue link[\s\S]*Not connected[\s\S]*This page cannot tell[\s\S]*Whether the console sent a cue/);
    await detail.locator('[data-close]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.check), 'cues', 'focus returns to the tile');
    await page.locator('#sb-help').click();
    const snapshot = await page.locator('#sb-snapshot-text').inputValue();
    assert.match(snapshot, /^Projection snapshot, .*\(SIMULATION, not the real rig\)\n/);
    assert.match(snapshot, /\nA SL Portal: no reading \(last reply [^)]*\)\. Check by eye\.\n/);
    assert.match(snapshot, /\nB Top Portal: ON, shutter OPEN, reply [^.]+\. No alarms reported\.\n/);
    assert.match(snapshot, /\nCue link: not connected\./);
    assert.match(snapshot, /\nShow Lock: on\.\n/);
    assert.match(snapshot, /\nLast move from this page: Open shutter B, .*projector reported open\.$/);
    assert.doesNotMatch(snapshot, /undefined|null|NaN|\[object/);
    await page.locator('#sb-snapshot-status[data-state="ok"]').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), snapshot);
    assert.match(await page.locator('#sb-snapshot-sms').getAttribute('href'), /^sms:\?&body=Projection%20snapshot/);
    await shot(page, '03-tablet-snapshot');
    await page.locator('#sb-snapshot [data-close]').click();
    await relay.api('lock', { lock: false });
    await page.locator('#sb-lock[data-lock="off"]').waitFor();

    // Keyboard: the skip link is first, every control shows a focus ring, a blocked button still explains itself.
    assert.equal(await page.evaluate(() => document.body.querySelector('a[href], button, [tabindex]')?.className), 'sb-skip');
    await armButton('A').focus();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-describedby')), 'sb-lane-A-why');
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    assert.notEqual(await armButton('A').evaluate(node => getComputedStyle(node).outlineStyle), 'none');

    // Fit: every size, both themes, both small-screen views, and the taller armed state.
    for (const theme of ['light', 'dark']) for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await page.evaluate(mode => window.FrozenTheme.set(mode, { save: false }), theme);
      for (const view of ['lanes', 'checks']) {
        if (await page.locator(`[data-view-btn="${view}"]`).isVisible()) await page.locator(`[data-view-btn="${view}"]`).click();
        else if (view === 'checks') continue; // a large screen shows both at once
        const result = await page.evaluate(audit);
        assert.deepEqual(result, { pageScrolls: false, outside: [], cut: [] }, `${theme} ${width}x${height} ${view}`);
      }
      if (await page.locator('[data-view-btn="lanes"]').isVisible()) await page.locator('[data-view-btn="lanes"]').click();
      if (await page.locator('[data-pick="B"]').isVisible()) await page.locator('[data-pick="B"]').click();
      await armButton('B').click();
      assert.deepEqual(await page.evaluate(audit), { pageScrolls: false, outside: [], cut: [] }, `${theme} ${width}x${height} armed`);
      if (theme === 'dark' && width === 375 && height === 812) await shot(page, '06-phone-375x812-dark-armed');
      await cancelButton('B').click();
      if (width === 1024) await shot(page, `04-tablet-1024x768-${theme}`);
      if (width === 768) await shot(page, `05-tablet-768x1024-${theme}`);
      if (width === 375 && height === 812) {
        await shot(page, `07-phone-375x812-${theme}-lanes`);
        await page.locator('[data-view-btn="checks"]').click();
        await shot(page, `08-phone-375x812-${theme}-checks`);
        await page.locator('[data-view-btn="lanes"]').click();
      }
      if (width === 844) await shot(page, `09-phone-landscape-844x390-${theme}`);
      if (width === 320) await shot(page, `10-zoomed-320x256-${theme}`);
      if (width === 2560) await shot(page, `11-ultrawide-2560x720-${theme}`);
      if (width === 1440) await shot(page, `12-desktop-1440x900-${theme}`);
    }
    await page.setViewportSize({ width: 1024, height: 768 });
    await armButton('C').click();
    await lane('C').locator('.sb-lane__why', { hasText: 'Not sent: confirm timed out.' }).waitFor({ timeout: 9000 });
    assert.equal(await armButton('C').isVisible(), true);
    assert.equal(posts.length, 2, 'layout checks and a timed-out confirm sent nothing');
    assert.ok(posts.every(post => post.path === '/api/command' && post.body.cmd === 'shutter'), 'the page only ever sends a shutter command');
    assert.deepEqual(foreign, [], 'no request leaves the relay');
    assert.deepEqual(errors, []);
    await context.close();

    // ---- A scripted relay: display reports, alarms, stale replies, a wrong device clock and a lost relay.
    const base = await relay.state();
    const scripted = async ({ displays, skewMs = 0, lostStatus = 0 }) => {
      const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
      const tab = await ctx.newPage();
      const state = structuredClone(base), sent = [], relayNow = () => Date.now() + skewMs;
      const stamp = (p, ageMs = 500) => { p.status = { ...p.status, updatedAt: new Date(relayNow() - ageMs).toISOString(), connection: { ...p.status.connection, lastSuccessAt: new Date(relayNow() - ageMs).toISOString() } }; };
      for (const p of state.projectors) if (p.status.online) stamp(p);
      let socket, live = true;
      await tab.routeWebSocket('**/ws', ws => {
        if (!live) { ws.close(); return; }
        socket = ws;
        ws.send(JSON.stringify(state));
        ws.send(JSON.stringify({ type: 'heartbeat', at: new Date(relayNow()).toISOString() }));
      });
      await tab.route('**/api/host-displays', route => route.fulfill({ json: displays }));
      await tab.route('**/api/state', route => lostStatus ? route.fulfill({ status: lostStatus, json: { error: 'login required' } }) : route.fulfill({ json: state }));
      await tab.route('**/api/command', route => { sent.push(route.request().postDataJSON()); return route.fulfill({ json: { error: 'not expected in this test' }, status: 500 }); });
      await tab.goto(`${relay.base}/show.html`);
      await tab.locator('.sb-lane[data-lane="C"][data-reach="live"]').waitFor();
      const push = (slot, change, ageMs) => { const p = state.projectors.find(x => x.slot === slot); Object.assign(p.status, change); stamp(p, ageMs); socket.send(JSON.stringify({ type: 'status', slot, status: p.status })); };
      const drop = () => { live = false; socket.close(); };
      return { ctx, tab, push, drop, sent, relayNow };
    };
    const reported = count => ({ scope: 'relay-computer', state: 'reported', collectedAt: new Date().toISOString(), reason: null,
      displays: Array.from({ length: count }, (_, i) => ({ id: `display-${i + 1}`, name: `Display ${i + 1}`, online: true, main: i === 0, mirror: false })) });
    const tileOf = async (tab, id) => [await tab.locator(`.sb-check[data-check="${id}"]`).getAttribute('data-state'), await tab.locator(`.sb-check[data-check="${id}"] .sb-check__value`).innerText()];

    let run = await scripted({ displays: reported(5) });
    await run.tab.locator('.sb-check[data-check="outputs"][data-state="ok"]').waitFor();
    assert.deepEqual(await tileOf(run.tab, 'outputs'), ['ok', '4 outputs + main']);
    assert.match(await run.tab.locator('.sb-check[data-check="outputs"] .sb-check__note').innerText(), /^Windows not reported/);
    run.push('P3', { errors: { fan: 0, lamp: 2, temp: 0, cover: 0, filter: 0, other: 0 } });
    await run.tab.locator('.sb-lane[data-lane="C"][data-tone="attention"]').waitFor();
    assert.equal(await run.tab.locator('.sb-lane[data-lane="C"] .sb-lane__alarm').innerText(), 'Lamp error reported');
    assert.equal(await run.tab.locator('#sb-verdict').getAttribute('data-state'), 'attention');
    await shot(run.tab, '13-tablet-attention-lamp-error');
    for (const [width, height] of [[375, 667], [844, 390], [320, 256]]) {
      await run.tab.setViewportSize({ width, height });
      if (await run.tab.locator('[data-pick="C"]').isVisible()) await run.tab.locator('[data-pick="C"]').click();
      assert.deepEqual(await run.tab.evaluate(audit), { pageScrolls: false, outside: [], cut: [] }, `alarm ${width}x${height}`);
    }
    await run.tab.setViewportSize({ width: 1024, height: 768 });
    // Arm, then let the reading go stale: the armed move is withdrawn and nothing is sent.
    run.push('P3', { errors: { fan: 0, lamp: 0, temp: 0, cover: 0, filter: 0, other: 0 } });
    await run.tab.locator('.sb-lane[data-lane="C"][data-tone="ok"]').waitFor();
    await run.tab.locator('.sb-lane[data-lane="C"] [data-act=arm]').click();
    run.push('P3', {}, 60000);
    await run.tab.locator('.sb-lane[data-lane="C"][data-reach="stale"]').waitFor();
    assert.equal(await run.tab.locator('.sb-lane[data-lane="C"] .sb-lane__state').innerText(), 'CHECK BY EYE');
    assert.equal(await run.tab.locator('.sb-lane[data-lane="C"] .sb-lane__why').innerText(), 'Not sent: the reading changed.');
    assert.equal(await run.tab.locator('.sb-lane[data-lane="C"] [data-act=arm]').getAttribute('aria-disabled'), 'true');
    // The relay goes away: nothing keeps reading as current, and the lock is unknown.
    run.drop();
    await run.tab.locator('.sb-lane[data-lane="B"][data-reach="relay-offline"]').waitFor();
    assert.deepEqual(await tileOf(run.tab, 'computer'), ['attention', 'Not answering']);
    assert.deepEqual(await tileOf(run.tab, 'outputs'), ['off', 'Unknown']);
    assert.equal(await run.tab.locator('#sb-lock').innerText(), 'Show Lock unknown');
    for (const id of ['A', 'B', 'C', 'D']) assert.equal(await run.tab.locator(`.sb-lane[data-lane="${id}"] .sb-lane__state`).innerText(), 'CHECK BY EYE');
    await shot(run.tab, '14-tablet-relay-offline');
    for (const [width, height] of [[375, 667], [844, 390], [320, 256]]) {
      await run.tab.setViewportSize({ width, height });
      assert.deepEqual(await run.tab.evaluate(audit), { pageScrolls: false, outside: [], cut: [] }, `relay offline ${width}x${height}`);
    }
    assert.deepEqual(run.sent, []);
    await run.ctx.close();

    run = await scripted({ displays: reported(4) });
    await run.tab.locator('.sb-check[data-check="outputs"][data-state="attention"]').waitFor();
    assert.deepEqual(await tileOf(run.tab, 'outputs'), ['attention', '3 of 4 outputs']);
    // A refusal from the relay is shown as a refusal, with the relay's own reason.
    await run.tab.locator('.sb-lane[data-lane="B"] [data-act=arm]').click();
    await run.tab.waitForTimeout(650);
    await run.tab.locator('.sb-lane[data-lane="B"] [data-act=confirm]').click();
    await run.tab.locator('.sb-lane[data-lane="B"][data-phase="error"]').waitFor();
    assert.equal(await run.tab.locator('.sb-lane[data-lane="B"] .sb-lane__why').innerText(), 'Not done: not expected in this test');
    assert.deepEqual(run.sent.map(body => [body.slot, body.cmd, body.arg]), [['P2', 'shutter', 1]]);
    // No answer at all is different: the page does not claim the command was not sent.
    await run.tab.unroute('**/api/command');
    await run.tab.route('**/api/command', route => route.abort('connectionreset'));
    await run.tab.locator('.sb-lane[data-lane="C"] [data-act=arm]').click();
    await run.tab.waitForTimeout(650);
    await run.tab.locator('.sb-lane[data-lane="C"] [data-act=confirm]').click();
    await run.tab.locator('.sb-lane[data-lane="C"][data-phase="note"]').waitFor();
    assert.equal(await run.tab.locator('.sb-lane[data-lane="C"] .sb-lane__why').innerText(), 'No answer from the relay. Check the lane by eye.');
    await run.ctx.close();

    // A device clock ten minutes off: ages are measured on the relay's clock, so fresh stays fresh.
    for (const skewMs of [600000, -600000]) {
      run = await scripted({ displays: reported(5), skewMs });
      await run.tab.waitForTimeout(1500);
      assert.equal(await run.tab.locator('.sb-lane[data-lane="B"]').getAttribute('data-reach'), 'live', `relay clock ${skewMs} ms from the device clock`);
      assert.match(await run.tab.locator('.sb-lane[data-lane="B"] .sb-lane__fresh').innerText(), /^Reply (just now|\ds ago)$/);
      await run.ctx.close();
    }

    // A relay restart ends the session: the page goes to the sign-in and comes back here afterwards.
    run = await scripted({ displays: reported(5), lostStatus: 401 });
    run.drop();
    await run.tab.waitForURL(/\/login\.html\?next=%2Fshow\.html$/);
    await run.ctx.close();

    // Plain-http pages on a LAN address have no Clipboard API: the selection fallback still copies.
    const lan = await browser.newContext({ viewport: { width: 375, height: 812 } });
    await lan.grantPermissions(['clipboard-read', 'clipboard-write']);
    const phone = await lan.newPage();
    await phone.addInitScript(() => Object.defineProperty(window, 'isSecureContext', { get: () => false }));
    await phone.goto(`${relay.base}/show.html`);
    await phone.locator('.sb-lane[data-lane="B"][data-reach="live"]').waitFor();
    assert.equal(await phone.evaluate(() => window.isSecureContext), false);
    await phone.locator('#sb-help').click();
    await phone.locator('#sb-snapshot-status[data-state="ok"]').waitFor();
    assert.equal(await phone.evaluate(() => navigator.clipboard.readText()), await phone.locator('#sb-snapshot-text').inputValue());
    assert.deepEqual(await phone.evaluate(audit), { pageScrolls: false, outside: [], cut: [] }, 'snapshot dialog on a phone');
    await shot(phone, '15-phone-375x812-snapshot');
    await lan.close();

    console.log('Show backup page: unreached lanes by eye, strip honesty, two-step shutter, Show Lock, stale and lost-relay guards, clock skew, sign-in return, snapshot copy and fit at eight sizes in both themes passed');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
