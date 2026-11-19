// Power operator page in the simulator (docs/power-operator-page.md): both checklists end to end,
// the relay's guards as the page meets them, the banner rules, keyboard and themes, and containment
// from a phone to a very wide desk. POWER_PAGE_SHOTS=<folder> also saves screenshots of the main states.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SHOTS = process.env.POWER_PAGE_SHOTS;
const STORAGE_KEY = 'projctl.powerPage.v1';
const SIZES = [[375, 812], [375, 635], [1440, 900], [844, 390], [320, 256], [3840, 1080]];

// WEB-2 containment: the page never scrolls, nothing leaves the screen or its panel, no text is cut.
const audit = () => {
  const root = document.documentElement, panels = document.querySelector('.pw-panels').getBoundingClientRect();
  const hiddenOnPurpose = el => { const r = el.getBoundingClientRect(); return !r.width || !r.height || (r.width <= 1 && r.height <= 1) || !!el.closest('.pw-skip'); };
  const name = el => `${el.tagName.toLowerCase()}.${el.className || el.id}`;
  const outside = [...document.querySelectorAll('body *')].filter(el => {
    if (hiddenOnPurpose(el)) return false;
    const r = el.getBoundingClientRect(), sheet = el.closest(':popover-open');
    if (sheet && sheet !== el) return false; // judged by its own check below
    const host = el.closest('.pw-panels') && !sheet ? panels : { bottom: innerHeight, right: innerWidth };
    return r.bottom > host.bottom + 1 || r.right > host.right + 1 || r.left < -1 || r.top < -1;
  }).map(name);
  const cut = [...document.querySelectorAll('.pw-card *, .pw-banner *, .pw-pill *, .pw-top *, .pw-rules *, [role=tab]')]
    .filter(el => !hiddenOnPurpose(el) && getComputedStyle(el).display !== 'inline' && el.scrollWidth > el.clientWidth + 1).map(name);
  const sheets = [...document.querySelectorAll(':popover-open')].filter(el => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1).map(name);
  return { scrolls: root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth || root.scrollTop !== 0 || document.body.scrollTop !== 0, outside, cut, sheets };
};

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  // The main relay has a crew notes address in its private settings, so every size is checked with
  // the optional link on screen. The address uses a reserved test name and is never requested.
  const NOTES = 'https://notes.example.test/crew';
  const relay = await startRelay({}, { files: { 'crew-links.json': JSON.stringify({ notes: { url: NOTES } }) } });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const [index, slot] of ['P1', 'P2', 'P3', 'P4'].entries()) await relay.api('projector', { slot, lane: 'ABCD'[index] });
    const projector = async slot => (await relay.state()).projectors.find(p => p.slot === slot);
    const reach = async (slot, on) => { await relay.api('sim', { slot, offline: !on }); await until(async () => (await projector(slot)).status.online === on); };
    // As at the venue: the relay gets no reply from the two lanes powered by handheld remote.
    await reach('P1', false); await reach('P4', false);

    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    const notesRequests = [];
    await context.route('https://notes.example.test/**', route => { notesRequests.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>notes fixture</title>' }); });
    const page = await context.newPage();
    const problems = [], posts = [], elsewhere = [];
    page.on('pageerror', error => problems.push(String(error)));
    page.on('console', message => { if (message.type() === 'error' && !/favicon/.test(message.text())) problems.push(message.text()); });
    page.on('request', request => {
      if (new URL(request.url()).origin !== relay.base) elsewhere.push(request.url());
      if (request.method() !== 'GET') posts.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
    });
    // A second visitor whose device clock is ten minutes fast. Checked later, after a relay heartbeat.
    const skewed = await context.newPage();
    await skewed.addInitScript(() => { const real = Date.now.bind(Date); Date.now = () => real() + 10 * 60000; });
    await skewed.goto(relay.base + '/power.html');
    const $ = selector => page.locator(selector);
    const has = (selector, text, timeout = 10000) => $(selector).filter({ hasText: text }).waitFor({ timeout });
    const go = async (mode, index) => {
      if (await $(`#${mode} [data-rail]`).isVisible()) await $(`#${mode} [data-step="${index}"]`).click();
      else for (let guard = 0; guard < 6; guard++) {
        const now = Number((await $(`#${mode} [data-count]`).textContent()).match(/Step (\d)/)[1]) - 1;
        if (now === index) break;
        await $(`#${mode} [data-${now < index ? 'next' : 'prev'}]`).click();
      }
      await $(`#${mode} [data-count]`).filter({ hasText: `Step ${index + 1} of 5` }).waitFor({ state: 'attached' });
    };
    const text = selector => $(selector).textContent();
    const disabled = async selector => await $(selector).getAttribute('aria-disabled') === 'true';
    const power = async slot => (await projector(slot)).status.power;
    const shot = async name => {
      if (!SHOTS) return;
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
    };
    const open = async () => { await page.goto(relay.base + '/power.html'); await $('#conn[data-state=online]').waitFor(); };
    const reload = async () => { await page.reload(); await $('#conn[data-state=online]').waitFor(); };

    // ---- Morning on ----
    await open();
    assert.equal(await $('#t-on').getAttribute('aria-selected'), 'true', 'Morning on is the default view');
    assert.equal(await $('#sim-flag').isVisible(), true, 'simulator data is labelled');
    await has('#on [data-banner-title]', 'Not all on yet');
    assert.equal(await text('#on [data-title]'), 'Playback app');
    await shot('phone-morning-step-1');

    await go('on', 1);
    assert.equal(await text('#on [data-title]'), 'C · Stage');
    await has('#on [data-word]', 'STANDBY'); await has('#on [data-source]', 'Relay reading');
    assert.equal(await disabled('#on [data-action]'), true);
    await has('#on [data-why]', 'Tick step 1 first.');
    await $('#on [data-action]').click({ force: true });
    await page.waitForTimeout(150);
    assert.equal(posts.length, 0, 'a relay power button waits for the playback tick');

    await go('on', 0);
    await $('#on [data-action]').click();
    await $('#on [data-step="0"][data-tone=done]').waitFor();
    assert.equal(await text('#on [data-title]'), 'Playback app', 'a tick never moves the open step under the next tap');
    assert.equal(await $('#on [data-action]').getAttribute('aria-pressed'), 'true');
    await has('#on [data-why]', /Ticked .+ Lapses/);

    await $('#on [data-next]').click();
    assert.equal(await text('#on [data-title]'), 'C · Stage');
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-title')), true, 'Next moves focus to the new step');
    assert.equal(await text('#on [data-action]'), 'Power on C');
    await shot('phone-morning-relay-standby');
    await $('#on [data-action]').click();
    await until(() => posts.length === 1);
    assert.deepEqual([posts[0].path, posts[0].body.slot, posts[0].body.cmd, posts[0].body.arg, posts[0].body.confirm], ['/api/command', 'P3', 'power', 1, undefined]);
    assert.deepEqual(posts[0].body.expectedTargets.map(target => [target.slot, /^[a-f0-9]{64}$/.test(target.revision)]), [['P3', true]]);
    await has('#on [data-why]', 'Command accepted by the relay');
    await has('#on [data-word]', 'WARMING');

    await go('on', 2);
    assert.equal(await text('#on [data-title]'), 'B · Top Portal');
    await $('#on [data-action]').click();
    await until(() => posts.length === 2);
    assert.equal(posts[1].body.slot, 'P2');

    // Manual lanes: the operator's eyes and remote. The page sends nothing and shows no relay word.
    await go('on', 3);
    assert.equal(await text('#on [data-title]'), 'A · SL Portal');
    assert.equal(await text('#on [data-word]'), 'TO DO');
    assert.equal(await text('#on [data-source]'), 'Not reached by the relay. Go by eye.');
    assert.match(await text('#on [data-pending]'), /Pending POWER-1/);
    await $('#on [data-lamp]').click();
    await has('#lamp-help', 'Not written yet');
    assert.match(await text('#lamp-help'), /have not been recorded yet[\s\S]+Do not guess an answer/);
    await shot('phone-lamp-message-pending');
    await page.keyboard.press('Escape');
    await $('#lamp-help').waitFor({ state: 'hidden' });
    await $('#on [data-action]').click();
    await has('#on [data-word]', 'LIT BY EYE');
    await go('on', 4);
    await $('#on [data-action]').click();
    await has('#on [data-word]', 'LIT BY EYE');
    for (let index = 0; index < 5; index++) { await go('on', index); assert.doesNotMatch(await text('#on [data-action]'), /off/i, 'Morning on offers no power off'); }

    await $('#on [data-banner][data-state=ready]').waitFor({ timeout: 12000 });
    assert.equal(await text('#on [data-banner-title]'), 'All four on');
    assert.equal(await text('#on [data-banner-detail]'), 'C and B read On. A and D confirmed lit by eye.');
    assert.equal(posts.length, 2, 'ticks, timers and steps send nothing');
    await shot('phone-morning-all-on');

    // ---- Nightly off, reached by keyboard ----
    await $('#t-on').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await $('#t-off').getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 't-off');
    assert.equal(new URL(page.url()).hash, '#off');
    const ring = await $('#t-off').evaluate(node => { const style = getComputedStyle(node); return [style.outlineStyle, parseFloat(style.outlineWidth)]; });
    assert.ok(ring[0] !== 'none' && ring[1] >= 2, 'keyboard focus is visible');
    assert.equal(await $('#on').isHidden(), true);
    await has('#off [data-banner-title]', 'Not safe to leave yet');
    assert.equal(await text('#off [data-banner-detail]'), 'Waiting on: B on · C on · A not ticked · D not ticked', 'a morning tick does not count at night');
    assert.equal(await text('#off [data-title]'), 'Playback app');
    await $('#off [data-action]').click();

    // Show Lock blocks power off and says so. The page cannot release it.
    await relay.api('lock', { lock: true });
    await $('#lock-flag').waitFor();
    await go('off', 1);
    assert.equal(await text('#off [data-title]'), 'B · Top Portal');
    await has('#off [data-why]', 'Show Lock is on, so power off is blocked');
    assert.equal(await disabled('#off [data-action]'), true);
    await $('#off [data-action]').click({ force: true });
    await page.waitForTimeout(150);
    assert.equal(posts.length, 2);
    await relay.api('lock', { lock: false });
    await $('#lock-flag').waitFor({ state: 'hidden' });
    await until(async () => !await disabled('#off [data-action]'));

    // Two steps. The first tap only asks the relay for a confirmation, and an unanswered one lapses.
    assert.equal(await text('#off [data-action]'), 'Power off B');
    await $('#off [data-action]').click();
    await $('#off [data-action][data-confirming]').waitFor();
    assert.equal(await text('#off [data-action]'), 'Confirm power off B');
    await has('#off [data-why]', 'Nothing sent yet');
    assert.deepEqual([posts.length, posts[2].body.slot, posts[2].body.arg, posts[2].body.confirm], [3, 'P2', 0, undefined]);
    assert.equal(await power('P2'), 'on');
    await shot('phone-night-confirm');
    await has('#off [data-why]', 'Confirmation expired. Nothing was sent.', 6000);
    assert.equal(await text('#off [data-action]'), 'Power off B');
    assert.deepEqual([posts.length, await power('P2')], [3, 'on']);

    const powerOff = async (lane, slot) => {
      const before = posts.length;
      await $('#off [data-action]').click();
      await $('#off [data-action][data-confirming]').waitFor();
      // A rapid repeat cannot stand in for the deliberate second tap.
      await page.evaluate(() => document.querySelector('#off [data-action]').click());
      await page.waitForTimeout(150);
      assert.equal(posts.length, before + 1, `${lane}: a repeat inside 400 ms is ignored`);
      await page.waitForTimeout(350);
      await $('#off [data-action]').click();
      await until(() => posts.length === before + 2);
      assert.deepEqual([posts.at(-1).body.slot, posts.at(-1).body.arg, typeof posts.at(-1).body.confirm], [slot, 0, 'string']);
      await has('#off [data-word]', 'COOLING');
    };
    await powerOff('B', 'P2');
    await go('off', 2);
    await powerOff('C', 'P3');
    assert.match(await text('#off [data-banner-detail]'), /C cooling/, 'cooling is not Standby');
    assert.equal(await text('#off [data-banner-title]'), 'Not safe to leave yet');

    // Lane A: the operator's own countdown. While it runs the tick is unavailable.
    await go('off', 3);
    assert.equal(await text('#off [data-source]'), 'Not reached by the relay. Go by eye.');
    assert.equal(await text('#off [data-timer]'), 'Start 170 s timer');
    await $('#off [data-timer]').click();
    await has('#off [data-word]', 'COOLING TIMER');
    assert.match(await text('#off [data-source]'), /^2:(50|49) left · your timer · do not cut mains power$/);
    assert.equal(await disabled('#off [data-action]'), true);
    await has('#off [data-why]', 'Wait for the cooling countdown, then check by eye.');
    await $('#off [data-action]').click({ force: true });
    assert.equal(await text('#off [data-word]'), 'COOLING TIMER');
    assert.equal(await text('#off [data-step="3"] .pw-pill__word'), 'TIMER');
    await shot('phone-night-cooling-timer');
    // The countdown is kept by its end time, so it survives a reload and ends when it should.
    await page.evaluate(key => { const saved = JSON.parse(localStorage.getItem(key)); saved.lanes.A.coolUntil = Date.now() + 1200; localStorage.setItem(key, JSON.stringify(saved)); }, STORAGE_KEY);
    await reload();
    assert.equal(await $('#t-off').getAttribute('aria-selected'), 'true', 'the view is kept in the address');
    await go('off', 3);
    await has('#off [data-why]', 'Your cooling timer ended at');
    assert.equal(await disabled('#off [data-action]'), false);
    await $('#off [data-action]').click();
    await has('#off [data-word]', 'OFF BY EYE');
    await go('off', 4);
    await $('#off [data-action]').click();
    await has('#off [data-word]', 'OFF BY EYE');

    // Reply age follows the relay's clock, so the fast-clock visitor still gets real readings.
    await skewed.locator('#off [data-step="1"] .pw-pill__word').filter({ hasText: /^(ON|STANDBY|WARMING|COOLING)$/ }).waitFor({ state: 'attached', timeout: 8000 });
    await skewed.close();

    // ---- Safe to leave: B and C in Standby from fresh replies, A and D ticked ----
    await $('#off [data-banner][data-state=safe]').waitFor({ timeout: 15000 });
    assert.equal(await text('#off [data-banner-title]'), 'Safe to leave the building');
    assert.equal(await text('#off [data-banner-detail]'), 'B and C read Standby. A and D confirmed off by eye.');
    assert.deepEqual([await power('P2'), await power('P3')], ['off', 'off']);
    await shot('phone-night-safe-to-leave');
    await page.setViewportSize({ width: 1440, height: 900 });
    await shot('desktop-night-safe-to-leave');
    await page.setViewportSize({ width: 375, height: 812 });

    // A lane that stops replying is not Standby, whatever it last said.
    await reach('P2', false);
    await $('#off [data-banner][data-state=wait]').waitFor();
    assert.match(await text('#off [data-banner-detail]'), /B no reply/);
    await go('off', 1);
    assert.equal(await text('#off [data-word]'), 'NO REPLY');
    assert.match(await text('#off [data-source]'), /No fresh reply · last known STANDBY/);
    await has('#off [data-why]', 'No reply does not confirm power off');
    assert.equal(await disabled('#off [data-action]'), true);
    await shot('phone-night-no-reply');
    await reach('P2', true);
    await $('#off [data-banner][data-state=safe]').waitFor();

    // If the relay does reach a manual lane and it is not in Standby, the tick loses.
    await reach('P4', true);
    assert.equal((await relay.api('command', { slot: 'P4', cmd: 'power', arg: 1 })).status, 200); // stands in for the handheld remote
    await $('#off [data-banner][data-state=wait]').waitFor();
    assert.match(await text('#off [data-banner-detail]'), /D ticked, but the relay reads (WARMING|ON)/);
    await go('off', 4);
    assert.equal(await text('#off [data-word]'), 'CHECK AGAIN');
    assert.match(await text('#off [data-source]'), /^Relay reading: (WARMING|ON)/);
    await has('#off [data-why]', 'Look at the surface again');

    // A tick lapses after 30 minutes.
    await page.evaluate(key => { const saved = JSON.parse(localStorage.getItem(key)); saved.lanes.A.tick.at = Date.now() - 31 * 60000; localStorage.setItem(key, JSON.stringify(saved)); }, STORAGE_KEY);
    await reload();
    assert.match(await text('#off [data-banner-detail]'), /A tick lapsed/);
    await go('off', 3);
    assert.equal(await text('#off [data-word]'), 'TICK LAPSED');

    // Everything the page sent: one power command per tap, to the two relay lanes only.
    assert.deepEqual([...new Set(posts.map(post => post.path))], ['/api/command']);
    assert.deepEqual([...new Set(posts.map(post => post.body.cmd))], ['power']);
    assert.deepEqual([...new Set(posts.map(post => post.body.slot))].sort(), ['P2', 'P3'], 'lanes A and D are never commanded');
    assert.deepEqual(elsewhere, [], 'no request leaves the relay');

    // ---- History and themes ----
    await $('#t-rules').click();
    await $('#rules').waitFor();
    assert.equal(new URL(page.url()).hash, '#rules');

    // ---- Crew notes link, configured: a labelled link in a new tab that the page itself never calls ----
    await $('[data-rule-pick=notes]').click();
    const notes = $('#rules [data-rule-set=notes]');
    await notes.waitFor();
    assert.match(await notes.innerText(), /For notes that can wait\. Not for emergencies or cue calls/);
    const link = $('#rules [data-crew-notes]');
    assert.deepEqual([await link.getAttribute('href'), await link.getAttribute('target'), await link.getAttribute('rel')], [NOTES, '_blank', 'noopener noreferrer']);
    assert.deepEqual(notesRequests, [], 'the page never requests the notes address on its own');
    await shot('phone-rules-crew-notes');
    const [opened] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await opened.waitForLoadState();
    assert.equal(opened.url(), NOTES);
    assert.equal(await opened.evaluate(() => window.opener), null, 'the new tab cannot reach back into the checklist');
    await opened.close();
    assert.equal(new URL(page.url()).pathname, '/power.html', 'the checklist stays where it was');
    await $('[data-rule-pick=never]').click();
    await page.goBack();
    await $('#off').waitFor();
    assert.equal(await $('#t-off').getAttribute('aria-selected'), 'true', 'Back returns to the earlier view');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light', 'light is the default theme');
    await $('#theme').click();
    await $('[data-theme-choice=dark]').click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'theme', 'focus returns to the theme control');

    // ---- Containment, with the longest strings on screen: Show Lock, a lane with no reply, a countdown ----
    await relay.api('lock', { lock: true });
    await reach('P2', false);
    await $('#lock-flag').waitFor();
    for (const [width, height] of SIZES) {
      for (const theme of width === 375 && height === 812 || width === 1440 ? ['light', 'dark'] : ['light']) {
        await page.setViewportSize({ width, height });
        await page.evaluate(mode => window.FrozenTheme.set(mode), theme);
        const check = async view => {
          const result = await page.evaluate(audit);
          assert.deepEqual(result, { scrolls: false, outside: [], cut: [], sheets: [] }, `${width}x${height} ${theme} ${view}`);
        };
        for (const mode of ['on', 'off']) {
          await $(`#t-${mode}`).click();
          await $(`#${mode}`).waitFor();
          for (let index = 0; index < 5; index++) {
            await go(mode, index);
            if (mode === 'off' && index === 4 && !/Cancel/.test(await text('#off [data-timer]'))) {
              if (await $('#off [data-detail-open]').isVisible()) { await $('#off [data-detail-open]').click(); await $('#off [data-timer]').click(); await page.keyboard.press('Escape'); }
              else await $('#off [data-timer]').click();
              await has('#off [data-word]', 'COOLING TIMER');
            }
            await check(`${mode} step ${index + 1}`);
            if (await $(`#${mode} [data-detail-open]`).isVisible()) {
              // Short screens: the instructions open as a sheet that fits without scrolling.
              await $(`#${mode} [data-detail-open]`).click();
              await $(`#${mode} [data-text]`).waitFor();
              await check(`${mode} step ${index + 1} details`);
              await page.keyboard.press('Escape');
              await $(`#${mode} [data-text]`).waitFor({ state: 'hidden' });
            } else assert.equal(await $(`#${mode} [data-text]`).isVisible(), true, `${width}x${height}: instructions are on the card`);
          }
        }
        await $('#t-rules').click();
        await $('#rules').waitFor();
        await check('rules');
        if (await $('[data-rule-pick=wrong]').isVisible()) for (const set of ['wrong', 'page', 'notes', 'never']) {
          await $(`[data-rule-pick=${set}]`).click();
          assert.equal(await $(`#rules [data-rule-set=${set}]`).isVisible(), true);
          await check(`rules ${set}`);
        } else for (const set of ['never', 'wrong', 'page', 'notes']) assert.equal(await $(`#rules [data-rule-set=${set}]`).isVisible(), true, `${width}x${height}: every rule set shows`);
        if (theme === 'dark' || width === 3840) await shot(`${width}x${height}-${theme}-rules`);
        // Very wide screens show the rules beside the open step. Others keep them behind the tab.
        await $('#t-off').click();
        assert.equal(await $('#off [data-aside]').isVisible(), width === 3840, `${width}x${height} rules aside`);
        if (width === 3840) assert.equal(await $('#off [data-aside] [data-crew-notes]').getAttribute('href'), NOTES, 'the rules beside the step carry the crew notes link too');
        await go('off', 1);
        await shot(`${width}x${height}-${theme}-night-no-reply-locked`);
      }
    }
    assert.deepEqual(problems, [], 'no page error or console error');
    await context.close();

    // ---- A relay lane that replies without a power state (a standby the relay's driver does not name) ----
    // The live stream is rewritten on its way to this one page so lane C reads "unknown" while still replying.
    await relay.api('lock', { lock: false });
    const odd = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    await odd.routeWebSocket(/\/ws$/, socket => {
      const upstream = socket.connectToServer();
      upstream.onMessage(message => {
        let data;
        try { data = JSON.parse(message); } catch { socket.send(message); return; }
        if (data.type === 'snapshot') for (const item of data.projectors) { if (item.lane === 'C') item.status.power = 'unknown'; }
        if (data.type === 'status' && data.slot === 'P3') data.status.power = 'unknown';
        socket.send(JSON.stringify(data));
      });
    });
    await odd.goto(relay.base + '/power.html');
    await odd.locator('#conn[data-state=online]').waitFor();
    await odd.locator('#on [data-step="1"]').click();
    await odd.locator('#on [data-word]').filter({ hasText: 'UNKNOWN' }).waitFor();
    assert.match(await odd.locator('#on [data-source]').textContent(), /no power state in it$/);
    assert.equal(await odd.locator('#on [data-action]').getAttribute('aria-disabled'), 'true', 'the playback tick still comes first');
    await odd.locator('#on [data-step="0"]').click();
    await odd.locator('#on [data-action]').click();
    await odd.locator('#on [data-step="1"]').click();
    await odd.locator('#on [data-why]').filter({ hasText: "The relay cannot read this unit's power state. Look at it first: power on only from standby." }).waitFor();
    assert.equal(await odd.locator('#on [data-action]').getAttribute('aria-disabled'), null, 'power on stays available, as on the operator console');
    assert.deepEqual([await odd.locator('#on [data-step="1"]').getAttribute('data-tone'), await odd.locator('#on [data-step="1"] .pw-pill__word').textContent()], ['waiting', 'UNKNOWN']);
    assert.match(await odd.locator('#on [data-banner-detail]').textContent(), /C unknown/, 'unknown is never counted as On');
    for (const [width, height] of [[375, 635], [320, 256]]) {
      await odd.setViewportSize({ width, height });
      assert.deepEqual(await odd.evaluate(audit), { scrolls: false, outside: [], cut: [], sheets: [] }, `${width}x${height} unknown power state`);
    }
    await odd.setViewportSize({ width: 375, height: 812 });
    const sent = odd.waitForRequest(request => request.url().endsWith('/api/command') && request.method() === 'POST');
    await odd.locator('#on [data-action]').click();
    const body = (await sent).postDataJSON();
    assert.deepEqual([body.slot, body.cmd, body.arg], ['P3', 'power', 1]);
    await odd.locator('#on [data-why]').filter({ hasText: 'Command accepted by the relay' }).waitFor();
    // Night: the relay cannot read lane C, so the operator's eyes decide, as they do for lanes A and D.
    await reach('P2', true);  // lane B reads Standby
    await reach('P4', false); // lane D is not reached, as at the venue
    await odd.locator('#t-off').click();
    await odd.locator('#off').waitFor();
    assert.match(await odd.locator('#off [data-banner-detail]').textContent(), /C unknown/, 'unknown is never counted as Standby');
    await odd.locator('#off [data-action]').click();
    await odd.locator('#off [data-step="2"]').click();
    const oddText = selector => odd.locator(selector).textContent();
    assert.deepEqual([await oddText('#off [data-title]'), await oddText('#off [data-word]'), await oddText('#off [data-action]')], ['C · Stage', 'UNKNOWN', 'Tick by eye: C is off']);
    assert.match(await oddText('#off [data-text]'), /cannot read lane C's power state, so go by eye/);
    assert.match(await oddText('#off [data-pending]'), /Pending POWER-4/);
    await odd.locator('#off [data-why]').filter({ hasText: 'Look at it: tick if it is off, power off if it is lit.' }).waitFor();
    assert.deepEqual([await odd.locator('#off [data-timer]').isVisible(), await odd.locator('#off [data-lamp]').isVisible()], [false, false], 'no remote tools on a relay lane');
    // Power off is still there beside the tick, with the same two steps.
    const alt = odd.locator('#off [data-alt]');
    assert.deepEqual([await alt.textContent(), await alt.getAttribute('aria-disabled')], ['Power off C', null]);
    await alt.click();
    await odd.locator('#off [data-alt][data-confirming]').waitFor();
    assert.equal(await alt.textContent(), 'Confirm power off C');
    await odd.waitForTimeout(450);
    const off = odd.waitForRequest(request => request.url().endsWith('/api/command') && request.method() === 'POST');
    await alt.click();
    const offBody = (await off).postDataJSON();
    assert.deepEqual([offBody.slot, offBody.cmd, offBody.arg, typeof offBody.confirm], ['P3', 'power', 0, 'string']);
    await odd.locator('#off [data-why]').filter({ hasText: 'Command accepted by the relay' }).waitFor();
    // The tick: shown as looked at, never as Standby.
    await odd.locator('#off [data-action]').click();
    await odd.locator('#off [data-word]').filter({ hasText: 'OFF BY EYE' }).waitFor();
    assert.deepEqual([await odd.locator('#off [data-action]').getAttribute('aria-pressed'), await oddText('#off [data-action]'), await oddText('#off [data-step="2"] .pw-pill__word'), await odd.locator('#off [data-step="2"]').getAttribute('data-tone')], ['true', '\u2713 C off by eye', 'TICKED', 'done']);
    assert.equal(await odd.locator('#off').getByText('STANDBY', { exact: true }).count(), 1, 'only lane B, which the relay did read, says Standby');
    for (const [width, height] of [[375, 635], [320, 256]]) {
      await odd.setViewportSize({ width, height });
      assert.deepEqual(await odd.evaluate(audit), { scrolls: false, outside: [], cut: [], sheets: [] }, `${width}x${height} night, lane read by eye`);
      if (await odd.locator('#off [data-detail-open]').isVisible()) {
        await odd.locator('#off [data-detail-open]').click();
        await alt.waitFor();
        assert.deepEqual(await odd.evaluate(audit), { scrolls: false, outside: [], cut: [], sheets: [] }, `${width}x${height} night, lane read by eye, details`);
        await odd.keyboard.press('Escape');
      }
    }
    await odd.setViewportSize({ width: 375, height: 812 });
    for (const index of [3, 4]) { await odd.locator(`#off [data-step="${index}"]`).click(); await odd.locator('#off [data-action]').click(); await odd.locator('#off [data-word]').filter({ hasText: 'OFF BY EYE' }).waitFor(); }
    await odd.locator('#off [data-banner][data-state=safe]').waitFor();
    assert.equal(await oddText('#off [data-banner-detail]'), 'B reads Standby. C, A and D confirmed off by eye.', 'the banner says which lanes were read and which were looked at');
    if (SHOTS) { await odd.waitForTimeout(250); await odd.screenshot({ path: path.join(SHOTS, 'phone-night-safe-lane-c-by-eye.png') }); await odd.locator('#off [data-step="2"]').click(); await odd.waitForTimeout(250); await odd.screenshot({ path: path.join(SHOTS, 'phone-night-lane-c-unknown-ticked.png') }); }
    // Taking the tick back takes the banner back.
    await odd.locator('#off [data-step="2"]').click();
    await odd.locator('#off [data-action]').click();
    await odd.locator('#off [data-banner][data-state=wait]').waitFor();
    assert.equal(await oddText('#off [data-banner-detail]'), 'Waiting on: C unknown');
    await odd.close();

    // ---- Signed out: sign in, then straight back to this page ----
    const guarded = await startRelay({ PJ_PASSCODE: 'fixture-only-passcode' });
    try {
      const visitor = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await visitor.goto(guarded.base + '/power.html');
      assert.equal(new URL(visitor.url()).pathname + new URL(visitor.url()).search, '/login.html?next=%2Fpower.html');
      await visitor.locator('#code').fill('fixture-only-passcode');
      await visitor.locator('button[type=submit]').click();
      await visitor.waitForURL(guarded.base + '/power.html');
      await visitor.locator('#conn[data-state=online]').waitFor();

      // ---- Crew notes link, not configured: nothing of it is shown, here or beside the step ----
      const asked = visitor.waitForResponse(response => response.url().endsWith('/api/crew-links'));
      await visitor.reload();
      assert.deepEqual(await (await asked).json(), { notes: null, state: 'not-configured' });
      await visitor.locator('#conn[data-state=online]').waitFor();
      await visitor.locator('#t-rules').click();
      await visitor.locator('#rules').waitFor();
      const shown = () => visitor.evaluate(() => ({
        visible: [...document.querySelectorAll('[data-rule-set=notes], [data-rule-pick=notes], [data-crew-notes]')].filter(node => node.getClientRects().length).length,
        addresses: [...document.querySelectorAll('a[href]')].map(node => node.getAttribute('href')).filter(href => href !== '#panels'),
      }));
      assert.deepEqual(await shown(), { visible: 0, addresses: [] });
      assert.equal(await visitor.locator('#rules [data-rule-set]:visible').count(), 1, 'the three ordinary rule sets still work, one at a time on a phone');

      // An address the relay should never send is refused by the page as well.
      for (const body of [{ notes: { url: 'javascript:alert(1)' }, state: 'configured' }, { notes: { url: 'https://user:secret@notes.example.test/' }, state: 'configured' }, 'not json']) {
        await visitor.route('**/api/crew-links', route => route.fulfill({ status: 200, contentType: 'application/json', body: typeof body === 'string' ? body : JSON.stringify(body) }));
        const again = visitor.waitForResponse(response => response.url().endsWith('/api/crew-links'));
        await visitor.reload();
        await again;
        await visitor.locator('#conn[data-state=online]').waitFor();
        await visitor.waitForTimeout(150); // let the page act on the answer before judging it
        assert.deepEqual(await shown(), { visible: 0, addresses: [] }, JSON.stringify(body));
        await visitor.unroute('**/api/crew-links');
      }
      // A relay without the route at all (an older install) also means "not configured".
      await visitor.route('**/api/crew-links', route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' }));
      const missing = visitor.waitForResponse(response => response.url().endsWith('/api/crew-links'));
      await visitor.reload();
      await missing;
      await visitor.locator('#conn[data-state=online]').waitFor();
      await visitor.waitForTimeout(150);
      assert.deepEqual(await shown(), { visible: 0, addresses: [] });
      await visitor.close();
    } finally { await guarded.close(); }

    console.log('Power operator page passed: morning on, nightly off, two-step power off and its expiry, Show Lock, no-reply and conflict guards, countdown, tick lapse, safe-to-leave banner, keyboard, themes, crew notes link configured and not configured, a lane with an unread power state (powered, and confirmed off by eye at night), sign-in return, and containment at six sizes');
  } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
