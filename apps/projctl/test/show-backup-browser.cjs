// The role pages in a browser against the simulator relay: show.html (four tabs) and power.html
// (the same shared control, power only). Every projector action with its two steps, the relay's
// one all-four run seen from two pages, Show Lock, the MIDI test against an observer file this test
// appends to, the setup check, the Know tab, the signed-in path with a relay restart mid-run, and
// fit at eight sizes.
// Nothing here reaches a projector or sends MIDI. Set SHOW_BACKUP_SHOTS to keep screenshots.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const SIZES = [[1440, 900], [1024, 768], [768, 1024], [375, 812], [375, 667], [844, 390], [320, 256], [2560, 720]];
const TABS = ['control', 'setup', 'midi', 'know'];
// WEB-2: the page never scrolls, nothing sits past the viewport unless it is inside one of the
// bounded scroll panels, and no card or bar cuts its own content.
const audit = () => {
  const root = document.documentElement, visible = el => el.getClientRects().length > 0;
  const outside = [...document.querySelectorAll('body *')].filter(el => {
    if (!visible(el) || el.closest('.sb-sr, .pc-sr, .sb-skip, dialog:not([open]), [popover]:not(:popover-open)')) return false;
    if (el.parentElement?.closest('.sb-scroll')) return false; // long content inside a scroll panel
    const r = el.getBoundingClientRect();
    return r.height > 0 && (r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1 || r.top < -1);
  }).map(el => `${el.className || el.tagName}`);
  const cut = [...document.querySelectorAll('.pc-card__in, .pc-picker, .pc-pick, .pc-btn, .sb-check, .sb-top, .sb-strip, .sb-tabs, [role=tab], .sb-card, .sb-bar, .sb-know__bar, .sb-know__side, .sb-step, .sb-btn, .sb-night__head, .sb-night__verdict, .sb-notice')]
    .filter(el => visible(el) && !el.closest('dialog:not([open])') && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1))
    .map(el => `${el.className} ${el.closest('[data-lane]')?.dataset.lane || el.dataset.check || el.id || ''} ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
  return { pageScrolls: root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth, outside, cut };
};
const CLEAN = { pageScrolls: false, outside: [], cut: [] };
const innerHeightMin = height => Math.round(height * 0.45); // header, tabs and the rest leave the panel at least this much

// The observer's row format: one Show Control message spread over several midi rows.
const ascii = text => [...text].map(char => char.charCodeAt(0));
const msc = (cue, command = 1) => [0xf0, 0x7f, 3, 0x02, 0x01, command, ...ascii(cue), 0x00, 0x31, 0xf7];
const midiRows = (bytes, at = Date.now()) => { const rows = []; for (let i = 0; i < bytes.length; i += 4) rows.push(JSON.stringify({ type: 'midi', hex: bytes.slice(i, i + 4).map(b => b.toString(16).padStart(2, '0')).join(''), length: Math.min(4, bytes.length - i), direction: 'incoming', name: 'Console A', endpoint: 2666519, unixSeconds: at / 1000, utc: new Date(at).toISOString() })); return rows.map(row => `${row}\n`).join(''); };
const heartbeat = (at = Date.now()) => `${JSON.stringify({ type: 'heartbeat', unixSeconds: at / 1000, sources: 2, destinations: 2 })}\n`;

(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-show-browser-')), observer = path.join(scratch, 'observer.jsonl');
  fs.writeFileSync(observer, heartbeat());
  const beat = setInterval(() => fs.appendFileSync(observer, heartbeat()), 2000); // the listener stays alive for the whole test
  const NOTES = 'https://notes.example.test/crew';
  const relay = await startRelay({}, { files: { 'host-paths.json': JSON.stringify({ cueObserver: observer }), 'crew-links.json': JSON.stringify({ notes: { url: NOTES } }) } });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const shots = process.env.SHOW_BACKUP_SHOTS;
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };
  try {
    // A fresh test rig has no drawing lanes; assign them the way Setup does.
    for (const [slot, lane, model] of [['P1', 'A', 'PT-DW830U'], ['P2', 'B', 'PT-RZ970'], ['P3', 'C', 'UDM 4K22'], ['P4', 'D', 'PT-DW830U']]) assert.equal((await relay.api('projector', { slot, lane, model })).status, 200);
    // B and C lit with open shutters and no test pattern; A reachable and off; D unreachable.
    for (const slot of ['P2', 'P3']) await relay.api('command', { slot, cmd: 'power', arg: 1 });
    await relay.api('sim', { slot: 'P4', offline: true });
    const reading = async () => Object.fromEntries((await relay.state()).projectors.map(p => [p.slot, p.status]));
    await until(async () => { const s = await reading(); return s.P2.power === 'on' && s.P3.power === 'on' && !s.P4.online; }, 20000);
    for (const slot of ['P2', 'P3']) { await relay.api('command', { slot, cmd: 'shutter', arg: 0 }); await relay.api('command', { slot, cmd: 'pattern', arg: '00' }); }
    // The simulator starts on another input; put the lanes on the rig's preferred one so nothing is flagged yet.
    for (const slot of ['P1', 'P2', 'P3']) assert.equal((await relay.api('command', { slot, cmd: 'resetInput' })).status, 200);
    await until(async () => (await relay.state()).projectors.filter(p => p.slot !== 'P4').every(p => p.inputPreference.available && String(p.status.input) === String(p.inputPreference.value)));
    await until(async () => { const s = await reading(); return s.P2.shutter === 'open' && s.P3.shutter === 'open' && s.P2.pattern === '00' && s.P3.pattern === '00'; });

    // ---- Live simulator relay
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    const posts = [], foreign = [], errors = [];
    let refusalsExpected = false; // the test asks for files it must not get; the browser logs each 404
    page.on('request', request => {
      if (new URL(request.url()).origin !== relay.base && !request.url().startsWith('data:')) foreign.push(request.url());
      if (request.method() === 'POST') posts.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !refusalsExpected) errors.push(message.text()); });
    await page.goto(`${relay.base}/show.html`);
    const card = id => page.locator(`.pc-card[data-lane="${id}"]`);
    const act = (id, name) => card(id).locator(`[data-act="${name}"]`);
    const msg = id => card(id).locator('.pc-msg').innerText();
    const fact = (id, name) => card(id).locator(`[data-fact="${name}"] dd`).innerText();
    const chip = id => page.locator(`.sb-check[data-check="${id}"]`);
    const settled = (id, phase) => page.locator(`.pc-card[data-lane="${id}"][data-phase="${phase}"]`).waitFor();
    const revision = async slot => (await relay.state()).projectors.find(p => p.slot === slot).controlRevision;
    const sent = () => posts.filter(post => post.path === '/api/command').map(post => post.body);
    await page.locator('.pc-card[data-lane="B"][data-reach="live"]').waitFor();
    await page.locator('.pc-card[data-lane="D"][data-reach="unreached"]').waitFor();
    await page.locator('.sb-check[data-check="cues"][data-state="ok"]').waitFor();

    // The strip sits above every tab, and Control is the tab that opens.
    assert.deepEqual(await page.locator('[role=tab]').evaluateAll(tabs => tabs.map(tab => [tab.id, tab.getAttribute('aria-selected')])), [['t-control', 'true'], ['t-setup', 'false'], ['t-midi', 'false'], ['t-know', 'false']]);
    assert.deepEqual(await page.locator('.sb-check').evaluateAll(chips => chips.map(node => node.dataset.check)), ['lanes', 'outputs', 'cues', 'computer']);
    assert.match(await chip('lanes').getAttribute('aria-label'), /^Lanes lit: Attention\. 2 of 4 lit\. A reports OFF · D by eye\.$/);
    assert.match(await chip('cues').getAttribute('aria-label'), /^Cue link: OK\. Listening\. Listening · no cue heard yet\.$/);
    assert.match(await chip('outputs').getAttribute('aria-label'), /^Outputs: No reading\. Not read\. Reader is off in simulation\.$/);
    assert.equal(await page.locator('#sb-verdict [data-f=title]').innerText(), 'ATTENTION');
    assert.equal(await page.locator('#sb-sim').isVisible(), true, 'simulation is labelled');
    // The design reference's looks (November 19): the power banner takes the reading's look, a lane with no
    // current reply keeps its own tone (D: CHECK BY EYE), and Show Lock here is a status, never a control.
    const looks = () => page.locator('.pc-card').evaluateAll(cards => cards.filter(c => c.dataset.lane !== 'ALL').map(c => [c.dataset.lane, c.dataset.power ?? null]));
    assert.deepEqual(await looks(), [['A', 'off'], ['B', 'lit'], ['C', 'lit'], ['D', null]]);
    assert.equal(await page.locator('#sb-lock').evaluate(node => node.tagName + ':' + node.getAttribute('role')), 'SPAN:status');
    assert.equal(await page.locator('button', { hasText: /lock/i }).count(), 0, 'no Show Lock control on this page (blocked buttons may name it in their reason)');
    assert.equal(await page.locator('#sb-help, a[href^="sms:"], a[href^="tel:"]').count(), 0, 'the help and contact control is gone');

    // Readings: a lane the relay reads shows its state and link; one it cannot reach shows no state at all.
    assert.deepEqual([await card('B').locator('.pc-state').innerText(), await fact('B', 'shutter'), await fact('B', 'pattern'), await fact('B', 'link')], ['ON', 'OPEN', 'Off', 'Simulator']);
    assert.match(await card('B').locator('.pc-fresh').innerText(), /^Reply (just now|\ds ago)$/);
    assert.deepEqual([await card('A').locator('.pc-state').innerText(), await card('A').getAttribute('data-tone')], ['OFF', 'attention']);
    assert.deepEqual([await card('D').locator('.pc-state').innerText(), await fact('D', 'shutter'), await fact('D', 'link'), await msg('D')], ['CHECK BY EYE', 'Not reported', 'Not reported', "Relay can't reach it. Check by eye."]);
    for (const name of ['power-on', 'power-off', 'shutter-open', 'shutter-close']) {
      assert.equal(await act('D', name).getAttribute('aria-disabled'), 'true');
      assert.match(await act('D', name).getAttribute('aria-label'), /lane D\. Blocked: Relay can't reach it\. Check by eye\.$/);
    }
    assert.deepEqual(await card('A').locator('.pc-actions [data-act]').evaluateAll(buttons => buttons.map(b => [b.dataset.act, b.getAttribute('aria-disabled')])), [['power-on', 'false'], ['power-off', 'true'], ['shutter-open', 'true'], ['shutter-close', 'true']]);
    assert.deepEqual(await card('B').locator('.pc-actions [data-act]').evaluateAll(buttons => buttons.map(b => [b.dataset.act, b.getAttribute('aria-disabled')])), [['power-on', 'true'], ['power-off', 'false'], ['shutter-open', 'true'], ['shutter-close', 'false']]);
    assert.equal(await card('ALL').locator('.pc-state').innerText(), '3 OF 4 READING');
    await shot(page, '01-tablet-control');

    // A blocked action says why when it is tapped, and sends nothing.
    // (A blocked button is aria-disabled, which a person can still tap; the test taps it the same way.)
    await act('A', 'shutter-close').click({ force: true });
    assert.equal(await msg('A'), 'Close shutter is blocked. Reports OFF, so no shutter move.');
    await act('D', 'power-on').click({ force: true });
    assert.equal(await msg('D'), "Power on is blocked. Relay can't reach it. Check by eye.");
    assert.deepEqual(sent(), []);

    // Shutter, two steps. A double tap, Cancel and Escape never send.
    await act('B', 'shutter-close').click();
    await settled('B', 'armed');
    assert.match(await act('B', 'confirm').innerText(), /^Confirm close shutter B \(\d\)$/);
    assert.equal(await card('B').locator('.pc-confirm__text').innerText(), 'Nothing sent yet. Shared sign-in: the relay logs the command, not who sent it.');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.act), 'confirm', 'focus moves to the confirm step');
    await act('B', 'confirm').click(); // inside the 600 ms guard: not a second step
    await page.waitForTimeout(100);
    assert.deepEqual(sent(), []);
    await act('B', 'cancel').click();
    await settled('B', 'idle');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.act), 'shutter-close', 'focus returns to the action');
    await act('B', 'shutter-close').click();
    await settled('B', 'armed');
    await page.keyboard.press('Escape');
    await settled('B', 'idle');
    assert.deepEqual(sent(), []);
    await act('B', 'shutter-close').click();
    await page.waitForTimeout(700);
    await act('B', 'confirm').click();
    await settled('B', 'done');
    assert.deepEqual(sent(), [{ slot: 'P2', cmd: 'shutter', arg: 1, expectedTargets: [{ slot: 'P2', revision: await revision('P2') }] }]);
    assert.match(await msg('B'), /^Reported CLOSED at \d+:\d\d [AP]M\.$/);
    assert.equal(await fact('B', 'shutter'), 'CLOSED · dark on stage');
    assert.equal(await card('B').locator('[data-fact="shutter"]').getAttribute('data-shutter'), 'closed', 'the shutter pill');
    assert.equal(await act('B', 'shutter-open').getAttribute('data-recover'), '', 'a lit lane with a closed shutter: Open is marked as the way back');
    assert.equal(await act('C', 'shutter-open').getAttribute('data-recover'), null);
    assert.equal((await reading()).P2.shutter, 'closed');
    await act('B', 'shutter-open').click();
    await page.waitForTimeout(700);
    await act('B', 'confirm').click();
    await page.locator('.pc-card[data-lane="B"] [data-fact="shutter"] dd', { hasText: /^OPEN$/ }).waitFor();
    assert.deepEqual(sent().at(-1), { slot: 'P2', cmd: 'shutter', arg: 0, expectedTargets: [{ slot: 'P2', revision: await revision('P2') }] });

    // Power on: armed on the page, then the projector's own report.
    posts.length = 0;
    await act('A', 'power-on').click();
    await settled('A', 'armed');
    assert.match(await act('A', 'confirm').innerText(), /^Confirm power on A \(\d\)$/);
    await page.waitForTimeout(700);
    await act('A', 'confirm').click();
    await settled('A', 'done');
    assert.deepEqual(sent(), [{ slot: 'P1', cmd: 'power', arg: 1, expectedTargets: [{ slot: 'P1', revision: await revision('P1') }] }]);
    assert.match(await msg('A'), /^Reported (WARMING|ON) at \d+:\d\d [AP]M\.$/);
    await page.locator('.pc-card[data-lane="A"] .pc-state', { hasText: /^ON$/ }).waitFor({ timeout: 15000 });

    // Power off uses the relay's own confirmation: the first tap asks, the second sends, inside three seconds.
    posts.length = 0;
    await act('A', 'power-off').click();
    await settled('A', 'relay-armed');
    assert.match(await act('A', 'confirm').innerText(), /^Confirm power off A \(\d\)$/);
    assert.match(await card('A').locator('.pc-confirm__text').innerText(), /^The relay is ready\. Nothing sent to the projector yet\./);
    assert.equal(sent().length, 1);
    assert.equal(sent()[0].confirm, undefined, 'the first request carries no confirmation');
    assert.equal((await reading()).P1.power, 'on', 'nothing has reached the projector');
    await page.waitForTimeout(700);
    await act('A', 'confirm').click();
    await settled('A', 'done');
    assert.deepEqual([sent().length, typeof sent()[1].confirm, sent()[1].cmd, sent()[1].arg], [2, 'string', 'power', 0]);
    assert.match(await msg('A'), /^Reported (COOLING|OFF) at \d+:\d\d [AP]M\.$/);
    // Left alone, the relay's confirmation runs out and nothing is sent.
    posts.length = 0;
    await act('C', 'power-off').click();
    await settled('C', 'relay-armed');
    await settled('C', 'note');
    assert.equal(await msg('C'), 'Not sent: confirm timed out.');
    assert.deepEqual([sent().length, (await reading()).P3.power], [1, 'on']);

    // All lanes: the first step lists exactly who gets it and who is skipped; the second sends one command per lane.
    posts.length = 0;
    await act('ALL', 'shutter-close').click();
    await settled('ALL', 'armed');
    assert.match(await act('ALL', 'confirm').innerText(), /^Confirm close shutter B and C \(\d\)$/);
    assert.match(await card('ALL').locator('.pc-confirm__text').innerText(), /^Nothing sent yet\. Goes to B and C\. Skipping A: reports (COOLING|OFF), so no shutter move · D: relay can't reach it\. Check by eye\. Shared sign-in/);
    await shot(page, '02-tablet-control-all-lanes-armed');
    await page.waitForTimeout(700);
    await act('ALL', 'confirm').click();
    await settled('ALL', 'done');
    assert.deepEqual(sent().map(body => [body.slot, body.cmd, body.arg, body.expectedTargets.length]).sort(), [['P2', 'shutter', 1, 1], ['P3', 'shutter', 1, 1]], 'one command per lane, never a group target');
    assert.match(await msg('ALL'), /^\d+:\d\d [AP]M · Close shutter: B and C reported CLOSED$/);
    assert.equal(await card('ALL').locator('[data-fact="closed"] dd').innerText(), '2');
    await act('ALL', 'shutter-open').click();
    await page.waitForTimeout(700);
    await act('ALL', 'confirm').click();
    await page.locator('.pc-card[data-lane="C"] [data-fact="shutter"] dd', { hasText: /^OPEN$/ }).waitFor();
    await page.locator('.pc-card[data-lane="B"] [data-fact="shutter"] dd', { hasText: /^OPEN$/ }).waitFor();

    // ---- The all-four run: one run in the relay, started from one page and shown on every page.
    await relay.api('sim', { slot: 'P4', offline: false });
    await page.locator('.pc-card[data-lane="D"][data-reach="live"]').waitFor();
    await page.locator('.pc-card[data-lane="A"] .pc-state', { hasText: /^OFF$/ }).waitFor({ timeout: 15000 });
    const other = await context.newPage(); // a second person, on the power page
    await other.goto(`${relay.base}/power.html`);
    await other.locator('.pc-card[data-lane="B"][data-reach="live"]').waitFor({ state: 'attached' });
    const otherCard = id => other.locator(`.pc-card[data-lane="${id}"]`);
    assert.deepEqual(await other.locator('[role=tab]').evaluateAll(tabs => tabs.map(tab => tab.firstChild.textContent)), ['Power', 'Night', 'Know']);
    assert.equal(await other.locator('h1').innerText(), 'Power');
    assert.deepEqual(await otherCard('ALL').locator('.pc-actions [data-act]').allInnerTexts(), ['Turn all on', 'Turn all off'], 'the power page carries power only');
    assert.equal(await other.locator('[data-act="shutter-open"], [data-act="shutter-close"]').count(), 0);
    assert.equal(await other.locator('.sb-strip').isVisible(), false, 'the power page has no go or no-go strip to read');
    const powerPosts = [];
    other.on('request', request => { if (request.method() === 'POST') powerPosts.push(request.url()); });
    const ground = () => other.locator('body').evaluate(node => getComputedStyle(node).backgroundColor);
    const liveGround = await ground();
    await relay.api('lock', { lock: true });
    await other.locator('html[data-power-mode="blind"]').waitFor({ state: 'attached' });
    assert.notEqual(await ground(), liveGround, 'Blind changes the page background');
    for (const [direction, order] of [['on', 'C → B → A → D'], ['off', 'A → D → B → C']]) {
      await otherCard('ALL').locator(`[data-act="power-${direction}"]`).click();
      await other.locator('#sb-power-preview[open]').waitFor();
      assert.equal(await other.locator('[data-preview-order]').innerText(), order);
      assert.deepEqual(await other.locator('#sb-power-preview button').allInnerTexts(), ['Close']);
      if (direction === 'on') await other.getByRole('button', { name: 'Close', exact: true }).click();
    }
    assert.deepEqual(powerPosts, [], 'Blind previews are local, without any POST');
    await relay.api('lock', { lock: false });
    await other.locator('html[data-power-mode="live"]').waitFor({ state: 'attached' });
    assert.equal(await other.locator('#sb-power-preview').isVisible(), false, 'unlock discards the preview');
    assert.equal(await ground(), liveGround);

    assert.deepEqual(await card('ALL').locator('.pc-actions [data-act]').allInnerTexts(), ['Turn all on', 'Turn all off', 'Open', 'Close']);
    assert.equal(await page.locator('#pc-run').isVisible(), false);
    // B and C read ON and Show Lock is off: the off run is suggested. A suggestion only highlights and explains.
    assert.deepEqual(await card('ALL').locator('[data-suggest]').evaluateAll(buttons => buttons.map(button => button.dataset.act)), ['power-off']);
    assert.match(await card('ALL').locator('[data-act="power-off"]').getAttribute('aria-label'), /, suggested: B and C read ON and Show Lock is off\. Night: Turn all off\?$/);
    posts.length = 0;
    await act('ALL', 'power-on').click();
    await settled('ALL', 'relay-armed');
    assert.match(await act('ALL', 'confirm').innerText(), /^Confirm: turn all on \(\d+\)$/);
    assert.match(await card('ALL').locator('.pc-confirm__text').innerText(), /^The relay is ready\. Nothing sent yet\. One run, in order C, B, A, D\. C already ON · B already ON · A power on · D power on\. Shared sign-in/);
    assert.deepEqual(posts.map(post => [post.path, post.body]), [['/api/power-run/plan', { direction: 'on' }]], 'the first tap asks the relay and sends nothing to a projector');
    assert.equal((await reading()).P1.power, 'off');
    await page.waitForTimeout(700);
    await act('ALL', 'confirm').click();
    await page.locator('#pc-run[data-state="running"]').waitFor();
    assert.equal(await page.locator('#pc-run .pc-run__title').innerText(), 'TURNING ALL FOUR ON');
    assert.equal(await page.locator('#pc-run .pc-run__stop').innerText(), 'Stop the run');
    // The other page shows the same run, and its button waits for it.
    await other.locator('#pc-run[data-state="running"]').waitFor();
    assert.equal(await other.locator('#pc-run .pc-run__title').innerText(), 'TURNING ALL FOUR ON');
    assert.equal(await otherCard('ALL').locator('[data-act="power-off"]').getAttribute('aria-disabled'), 'true');
    await otherCard('ALL').locator('[data-act="power-on"]').click({ force: true });
    assert.equal(await otherCard('ALL').locator('.pc-msg').innerText(), 'Turn all on is blocked. A run is already in progress.');
    assert.match(await act('B', 'power-off').getAttribute('aria-label'), /Blocked: An all-four run is in progress\.$/);
    assert.equal(await act('B', 'shutter-close').getAttribute('aria-disabled'), 'false', 'shutters stay available during a run');
    await page.locator('#pc-run[data-state="done"]').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('#pc-run .pc-run__title').innerText(), 'ALL FOUR ON');
    assert.deepEqual(await looks(), [['A', 'lit'], ['B', 'lit'], ['C', 'lit'], ['D', 'lit']]);
    assert.match(await page.locator('#pc-run .pc-run__text').innerText(), /^Every lane reports ON\. Finished \d+:\d\d [AP]M\.$/);
    assert.deepEqual(await page.locator('#pc-run .pc-run__step').allInnerTexts(), ['C ✓', 'B ✓', 'A ✓', 'D ✓']);
    assert.equal(await page.locator('#pc-run .pc-run__stop').isVisible(), false);
    // The finished run's summary, to pass on, and no off suggestion straight after the morning on run.
    assert.match(await page.locator('#pc-run .pc-run__summary').innerText(), /^Units on at \d+:\d\d [AP]M\. Every lane reports ON\.$/);
    await page.locator('#pc-run .pc-run__copy').click();
    await page.waitForFunction(() => /^(Copied|Selected)$/.test(document.querySelector('#pc-run .pc-run__copy').textContent), null, { timeout: 5000 });
    assert.equal(await card('ALL').locator('[data-suggest]').count(), 0);
    await other.locator('#pc-run[data-state="done"]').waitFor();
    assert.equal(await other.locator('#pc-run .pc-run__title').innerText(), 'ALL FOUR ON');
    assert.deepEqual(posts.map(post => post.path), ['/api/power-run/plan', '/api/power-run/start'], 'the page started one run and sent no command of its own');
    assert.deepEqual((await relay.state()).events.filter(event => event.source === 'run').map(event => `${event.slot} ${event.command}`), ['P1 power 1', 'P4 power 1'], 'the relay commanded only the two that were off, A then D');
    await shot(page, '07-tablet-run-all-four-on');
    // Night, from the other page: one press, one banner, on both pages.
    await otherCard('ALL').locator('[data-act="power-off"]').click();
    await other.locator('.pc-card[data-lane="ALL"][data-phase="relay-armed"]').waitFor();
    assert.equal(await otherCard('ALL').locator('[data-act="confirm"]').innerText(), 'Confirm off');
    assert.match(await otherCard('ALL').locator('.pc-confirm__text').innerText(), /One run, in order A, D, B, C\. A power off · D power off · B power off · C power off\./);
    await other.waitForTimeout(700);
    await otherCard('ALL').locator('[data-act="confirm"]').click();
    await page.locator('#pc-run[data-state="running"][data-direction="off"]').waitFor();
    assert.equal(await page.locator('#pc-run .pc-run__title').innerText(), 'TURNING ALL FOUR OFF');
    // The Power tab keeps progress in view. The detailed timeline stays available.
    await other.locator('#pc-run[data-state="running"]').waitFor();
    await other.locator('#t-night').click();
    assert.equal(await page.locator('#t-control').getAttribute('aria-selected'), 'true', 'only the page that pressed moves to its timeline');
    assert.deepEqual(await other.locator('.sb-night__row').evaluateAll(rows => rows.map(row => row.dataset.lane)), ['A', 'D', 'B', 'C'], 'the off order');
    assert.deepEqual(await other.locator('.sb-night__unit').allInnerTexts(), ['Lamp unit', 'Lamp unit', 'Laser unit', 'Barco laser']);
    assert.deepEqual(await other.locator('.sb-night__expect').allInnerTexts(), ['about 170 s of cooling', 'about 170 s of cooling', 'about 5 s', 'about 30 s to READY']);
    assert.deepEqual([await other.locator('.sb-night__total').innerText(), await other.locator('.sb-night__mains').innerText()], ['All off, about 3 min', 'Never cut mains while a lamp unit is cooling.']);
    assert.match(await other.locator('.sb-night__source').innerText(), /researched from the manufacturers. documents, not yet tested on this rig\.$/);
    assert.equal(await other.locator('.sb-night__stop').isVisible(), true, 'the run can be stopped from the timeline');
    await shot(other, '08-tablet-power-page-run-off');
    await other.locator('.sb-night__verdict[data-state="ok"]').waitFor({ timeout: 40000 });
    assert.equal(await other.locator('.sb-night__verdict').innerText(), 'Safe to leave the building', 'only when all four read OFF');
    assert.deepEqual(await other.locator('.sb-night__now').allInnerTexts(), ['OFF', 'OFF', 'OFF', 'OFF · READY'], 'the Barco shows its raw state, READY being the target');
    await other.locator('#t-control').click();
    await other.locator('#pc-run[data-state="done"]').waitFor({ timeout: 40000 });
    assert.equal(await other.locator('#pc-run .pc-run__title').innerText(), 'SAFE TO LEAVE THE BUILDING');
    assert.equal(await other.locator('.sb-night__stop').isVisible(), false);
    assert.match(await other.locator('#pc-run .pc-run__summary').innerText(), /^Units off at \d+:\d\d [AP]M\. Every lane reports OFF\. C reads READY\.$/);
    assert.equal(await otherCard('ALL').locator('[data-suggest]').count(), 0, 'no morning suggestion the same night');
    await page.locator('#pc-run[data-state="done"][data-direction="off"]').waitFor();
    assert.equal(await page.locator('#pc-run .pc-run__title').innerText(), 'SAFE TO LEAVE THE BUILDING');
    // Off for the night: the Barco at READY is the one this page can wake, and says so.
    assert.deepEqual(await looks(), [['A', 'off'], ['B', 'off'], ['C', 'ready'], ['D', 'off']]);
    assert.equal(await card('C').locator('.pc-state').getAttribute('data-note'), 'READY · this page can wake it');
    assert.equal((await relay.state()).projectors.every(p => p.status.power === 'off'), true);
    assert.deepEqual((await relay.state()).events.filter(event => event.source === 'run').slice(-4).map(event => `${event.slot} ${event.command}`), ['P1 power 0', 'P4 power 0', 'P2 power 0', 'P3 power 0'], 'A, D, B, C');
    // The power page's own words: how it works, the nevers, and no "app closed" step or remote steps anywhere.
    await other.locator('#t-know').click();
    assert.match(await other.locator('.sb-tips').innerText(), /Turn all on\. Night: Turn all off\./);
    assert.match(await other.locator('.sb-tips').innerText(), /Never cut power at a breaker/);
    assert.doesNotMatch(await other.locator('body').innerText(), /app closed|remote/i);
    await other.locator('.sb-know__item').first().waitFor();
    assert.deepEqual(await other.locator('.sb-know__name').allInnerTexts(), ['Sample signal flow', 'Sample power-up and power-down order'], 'the power page asks for the power audience');
    await other.close();
    // Back to the state the rest of this test expects: B and C lit, A off, D unreachable.
    for (const slot of ['P2', 'P3']) await relay.api('command', { slot, cmd: 'power', arg: 1 });
    await relay.api('sim', { slot: 'P4', offline: true });
    await until(async () => { const s = await reading(); return s.P2.power === 'on' && s.P3.power === 'on' && !s.P4.online; }, 20000);
    await page.locator('.pc-card[data-lane="D"][data-reach="unreached"]').waitFor();
    for (const id of ['B', 'C']) await page.locator(`.pc-card[data-lane="${id}"] .pc-state`, { hasText: /^ON$/ }).waitFor();

    // Show Lock blocks power off, on one lane and in the run, as the relay does. Power on and shutters stay
    // available. On this page the MIDI test and the setup check lock too.
    await relay.api('lock', { lock: true });
    await page.locator('#sb-lock[data-lock="on"]').waitFor();
    assert.equal(await page.locator('#sb-lock').innerText(), 'Show Lock ON');
    const outline = () => page.evaluate(() => getComputedStyle(document.querySelector('.sb-shell'), '::after').borderTopStyle);
    assert.equal(await outline(), 'solid', 'Show Lock on: the page is outlined');
    assert.deepEqual(await card('B').locator('.pc-actions [data-act]').evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-disabled'))), ['true', 'true', 'true', 'false']);
    assert.match(await act('B', 'power-off').getAttribute('aria-label'), /Blocked: Show Lock is on\. Power off is locked\.$/);
    assert.deepEqual(await card('ALL').locator('.pc-actions [data-act]').evaluateAll(buttons => buttons.map(b => [b.textContent, b.getAttribute('aria-disabled')])),
      [['Turn all on', 'false'], ['Turn all off', 'true'], ['Open', 'true'], ['Close', 'false']], 'only the off run is locked; the morning on run and the shutters are not');
    assert.equal(await act('A', 'power-on').getAttribute('aria-disabled'), 'false', 'power on for one lane stays available under Show Lock');
    posts.length = 0;
    await act('ALL', 'power-off').click({ force: true });
    assert.equal(await msg('ALL'), 'Turn all off is blocked. Show Lock is on. Power off is locked.');
    await act('B', 'power-off').click({ force: true });
    assert.equal(await msg('B'), 'Power off is blocked. Show Lock is on. Power off is locked.');
    assert.deepEqual(posts, [], 'a blocked press asks the relay nothing');
    assert.deepEqual(sent(), []);
    await act('B', 'shutter-close').click();
    await page.waitForTimeout(700);
    await act('B', 'confirm').click();
    await settled('B', 'done');
    assert.deepEqual(sent().map(body => [body.slot, body.cmd, body.arg]), [['P2', 'shutter', 1]], 'a one-lane shutter still works under Show Lock');
    await act('B', 'shutter-open').click();
    await page.waitForTimeout(700);
    await act('B', 'confirm').click();
    await page.locator('.pc-card[data-lane="B"] [data-fact="shutter"] dd', { hasText: /^OPEN$/ }).waitFor();
    await page.locator('#t-setup').click();
    assert.deepEqual([await page.locator('#sb-setup-run').getAttribute('aria-disabled'), await page.locator('#sb-setup-why').innerText()], ['true', 'Show Lock is on. The setup check is locked.']);
    await page.locator('#sb-setup-run').click({ force: true });
    assert.equal(await page.locator('#sb-setup-summary').innerText(), 'Not run yet.');
    await page.locator('#t-midi').click();
    assert.deepEqual([await page.locator('#sb-midi-start').getAttribute('aria-disabled'), await page.locator('#sb-midi-text').innerText()], ['true', 'Show Lock is on. The MIDI test is locked.']);
    await page.locator('#sb-midi-start').click({ force: true });
    assert.equal(await page.locator('#sb-midi-title').innerText(), 'Not run yet');
    await relay.api('lock', { lock: false });
    await page.locator('#sb-lock[data-lock="off"]').waitFor();
    assert.equal(await outline(), 'none', 'Show Lock off: no outline');

    // ---- Tabs: pointer, keyboard, and the address keeps the open tab.
    assert.equal(new URL(page.url()).hash, '#midi');
    await page.locator('#t-control').click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'control', 'a tab click moves focus to its panel');
    await page.locator('#t-control').focus();
    await page.keyboard.press('ArrowRight');
    assert.deepEqual([await page.locator('#t-setup').getAttribute('aria-selected'), await page.locator('#setup').isVisible(), await page.locator('#control').isVisible(), new URL(page.url()).hash], ['true', true, false, '#setup']);
    await page.keyboard.press('End');
    assert.deepEqual([await page.evaluate(() => document.activeElement?.id), new URL(page.url()).hash], ['t-know', '#know']);
    await page.keyboard.press('ArrowRight');
    assert.equal(new URL(page.url()).hash, '#control', 'the arrow keys wrap');
    await page.keyboard.press('Home');
    await page.goBack();
    assert.deepEqual([new URL(page.url()).hash, await page.locator('#t-know').getAttribute('aria-selected')], ['#know', 'true'], 'Back returns to the tab before');
    assert.deepEqual(await page.locator('[role=tab]').evaluateAll(tabs => tabs.map(tab => tab.tabIndex)), [-1, -1, -1, 0]);

    // ---- Setup check: one press, a reading on every line, and nothing sent to a projector.
    posts.length = 0;
    await page.locator('#t-setup').click();
    assert.equal(await page.locator('#sb-setup-run').getAttribute('aria-disabled'), 'false');
    await page.locator('#sb-setup-run').click();
    await page.locator('.sb-line[data-line="relay"]').waitFor();
    const line = async id => [await page.locator(`.sb-line[data-line="${id}"]`).getAttribute('data-state'), await page.locator(`.sb-line[data-line="${id}"] .sb-line__state`).innerText(), await page.locator(`.sb-line[data-line="${id}"] .sb-line__reading`).innerText()];
    assert.match(await page.locator('#sb-setup-summary').innerText(), /^\d+ pass · \d+ fail · \d+ cannot check · checked \d+:\d\d:\d\d [AP]M$/);
    assert.match((await line('relay'))[2], /^Answering, release [\d.]+, up since \d+:\d\d [AP]M$/);
    assert.deepEqual((await line('relay')).slice(0, 2), ['pass', 'PASS']);
    assert.deepEqual(await line('lock'), ['reading', 'READING', 'Off']);
    assert.deepEqual((await line('B-reach')).slice(0, 2), ['pass', 'PASS']);
    assert.deepEqual([await line('B-power'), await line('B-shutter'), await line('B-pattern'), await line('B-link')], [['pass', 'PASS', 'ON'], ['pass', 'PASS', 'OPEN'], ['pass', 'PASS', 'Off'], ['reading', 'READING', 'Simulator']]);
    assert.ok(['pass', 'cannot'].includes((await line('B-input'))[0]), 'the input is judged only against a preferred input');
    assert.deepEqual((await line('D-reach'))[0], 'fail');
    assert.match((await line('D-reach'))[2], /^Relay can't reach it\. Check by eye\. /);
    assert.deepEqual([await line('D-power'), await line('D-shutter')], [['cannot', 'CANNOT CHECK', 'Lane not reachable'], ['cannot', 'CANNOT CHECK', 'Lane not reachable']]);
    assert.deepEqual((await line('A-power')).slice(0, 2), ['fail', 'FAIL']);
    assert.deepEqual(await line('displays'), ['cannot', 'CANNOT CHECK', 'Reader is off in simulation']);
    assert.deepEqual((await line('listener')).slice(0, 2), ['pass', 'PASS']);
    assert.match((await line('listener'))[2], /^Running, last row (just now|\ds ago), 2 MIDI sources$/);
    for (const id of ['playback-app', 'midi-interface', 'computer-awake']) assert.deepEqual(await line(id), ['cannot', 'CANNOT CHECK', 'No provider is configured for this check.']);
    assert.deepEqual(await page.locator('.sb-group__h').allInnerTexts(), ['Relay and show computer', 'Lane A · SL Portal', 'Lane B · Top Portal', 'Lane C · Stage', 'Lane D · SR Portal', 'Displays', 'Cues']);
    assert.equal(await page.locator('.sb-line').count(), 2 + 4 * 6 + 1 + 1 + 3);
    assert.deepEqual(sent(), [], 'the setup check sends no command');
    assert.equal(await page.locator('#sb-setup-run').innerText(), 'Run setup check again');
    await shot(page, '03-tablet-setup-check');

    // ---- MIDI test: the page waits for cue 999 from the console. It sends nothing.
    await page.locator('#t-midi').click();
    assert.deepEqual([await page.locator('#sb-feed-title').innerText(), await page.locator('#sb-last-title').innerText()], ['Listening', 'No cue heard yet']);
    assert.match(await page.locator('#sb-midi-text').innerText(), /^Tap Start, then fire cue 999 on the console inside 30 seconds\.$/);
    fs.appendFileSync(observer, midiRows(msc('999'))); // a cue 999 from before the tap must never count
    await page.locator('#sb-last-title', { hasText: 'Cue 999, list 1' }).waitFor({ timeout: 10000 });
    await page.locator('#sb-midi-start').click();
    await page.locator('#sb-midi-test[data-state="eye"]').waitFor();
    assert.equal(await page.locator('#sb-midi-title').innerText(), 'Fire cue 999 on the console now');
    assert.match(await page.locator('#sb-midi-stop').innerText(), /^Stop test \(\d+\)$/);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'sb-midi-stop');
    assert.deepEqual(await page.locator('.sb-step').evaluateAll(steps => steps.map(step => step.dataset.state)), ['wait', 'idle']);
    await shot(page, '04-tablet-midi-waiting');
    fs.appendFileSync(observer, midiRows(msc('12')) + midiRows(msc('999', 2))); // another cue, and a STOP for 999: neither passes it
    await page.waitForTimeout(2500);
    assert.equal(await page.locator('#sb-midi-title').innerText(), 'Fire cue 999 on the console now');
    fs.appendFileSync(observer, midiRows(msc('999')));
    await page.locator('#sb-midi-test[data-state="ok"]').waitFor({ timeout: 10000 });
    assert.equal(await page.locator('#sb-midi-title').innerText(), 'Pass: the cue arrived');
    assert.match(await page.locator('#sb-midi-text').innerText(), /^Cue 999 arrived at \d+:\d\d:\d\d [AP]M from Console A\. Now fire the clear cue 999\.5\. Waiting \d+ s\.$/);
    assert.match(await page.locator('#sb-midi-hint').innerText(), /^An arrival is not a picture\..*check the playback app\.$/);
    assert.match(await page.locator('.sb-step').first().innerText(), /Cue 999 arrives\s+Pass · \d+:\d\d:\d\d [AP]M · from Console A/);
    await shot(page, '05-tablet-midi-pass');
    fs.appendFileSync(observer, midiRows(msc('999.5')));
    await page.locator('#sb-midi-title', { hasText: 'Pass: cue and clear both arrived' }).waitFor({ timeout: 10000 });
    assert.deepEqual(await page.locator('.sb-step').evaluateAll(steps => steps.map(step => step.dataset.state)), ['pass', 'pass']);
    assert.equal(await page.locator('#sb-midi-start').innerText(), 'Start MIDI test again');
    assert.equal(await page.locator('#sb-last-title').innerText(), 'Cue 999.5, list 1');
    assert.match(await page.locator('#sb-last-text').innerText(), /^\d+:\d\d:\d\d [AP]M · from Console A · /);
    assert.deepEqual((await page.locator('.sb-recent__row strong').allInnerTexts()).slice(0, 5), ['Cue 999.5, list 1', 'Cue 999, list 1', 'STOP cue 999, list 1', 'Cue 12, list 1', 'Cue 999, list 1'], 'newest first');
    assert.match(await chip('cues').getAttribute('aria-label'), /^Cue link: OK\. Cue 999\.5, list 1\. Heard \d+:\d\d [AP]M from Console A · not proof that video followed\.$/);
    assert.equal(await chip('cues').locator('.sb-check__value').innerText(), 'Cue 999.5');
    assert.deepEqual(posts.filter(post => post.path !== '/api/command'), [], 'the MIDI test posts nothing');
    // Stop ends a test with no result.
    await page.locator('#sb-midi-start').click();
    await page.locator('#sb-midi-stop').click();
    assert.deepEqual([await page.locator('#sb-midi-title').innerText(), await page.locator('#sb-midi-text').innerText()], ['Test stopped', 'Stopped before a cue arrived. No result.']);

    // ---- Know: the invented sample set, a zoomable diagram, documents as text, and the notes link.
    await page.locator('#t-know').click();
    await page.locator('.sb-know__item').first().waitFor();
    assert.equal(await page.locator('#sb-know-status').innerText(), '4 items · sample set for the simulator, not a real rig');
    // The recovery ladder, least disruptive first, each step with when it is allowed; the lane C shutter is the first rung.
    assert.deepEqual(await page.locator('.sb-ladder > li > strong').allInnerTexts(), ['Shutter.', 'Input.', 'Power cycle that one projector.', 'Relaunch the playback app.', 'Restart the show computer.']);
    assert.deepEqual(await page.locator('.sb-ladder .sb-when').allInnerTexts(), ['Any time, mid-show too', 'Before a show', 'Before a show', 'Before a show, all four on', "Only on the video lead's word"]);
    assert.match(await page.locator('.sb-ladder').innerText(), /On lane C, a shutter closed from the playback app may not reopen from there; the Open button on that card is the way back\./, 'the way back from a dark stage is on the Know tab');
    assert.match(await page.locator('.sb-ladder__note').innerText(), /^Researched, not yet tested on this rig:/);
    // A hold set in the documents folder shows above the list, and the tab says so.
    assert.equal(await page.locator('#sb-notices .sb-notice').innerText(), 'Hold: Sample hold: no playback app quit or relaunch until the approved show file change is saved.');
    assert.deepEqual([await page.locator('#t-know').getAttribute('aria-label'), await page.locator('#sb-know-count').isVisible()], ['Know, 1 hold', true]);
    assert.deepEqual(await page.locator('#sb-know-list .sb-know__group').allInnerTexts(), ['DIAGRAMS', 'DOCUMENTS']);
    assert.deepEqual(await page.locator('#sb-know-list li').evaluateAll(rows => rows.map(row => [row.parentElement.getAttribute('aria-label'), row.querySelector('.sb-know__name').textContent, row.querySelector('.sb-know__type').textContent])),
      [['Diagrams', 'Sample signal flow', 'Diagram'], ['Documents', 'Sample recovery steps', 'Document'], ['Documents', 'Sample cue notes', 'Text'], ['Documents', 'Sample output map', 'Data']]);
    assert.equal(await page.locator('#sb-know-tools').isVisible(), false);
    await page.locator('.sb-know__item', { hasText: 'Sample signal flow' }).click();
    const image = page.locator('#sb-know-stage img');
    await page.waitForFunction(() => document.querySelector('#sb-know-stage img')?.naturalWidth === 960);
    assert.deepEqual([await page.locator('#sb-know-title').innerText(), await page.locator('#sb-know-stage').getAttribute('data-mode'), await page.locator('#sb-know-stage').getAttribute('data-zoom'), await image.getAttribute('alt')], ['Sample signal flow', 'diagram', 'fit', 'Sample signal flow']);
    assert.equal(await page.locator('.sb-know__item[aria-current="true"] .sb-know__name').innerText(), 'Sample signal flow');
    const fitted = await image.evaluate(node => node.getBoundingClientRect().width), stageWidth = await page.locator('#sb-know-stage').evaluate(node => node.clientWidth);
    assert.ok(fitted <= stageWidth + 1, 'fit keeps the whole diagram in the viewer');
    await shot(page, '06-tablet-know-diagram');
    await page.locator('#sb-know-tools [data-zoom="in"]').click();
    await page.locator('#sb-know-tools [data-zoom="in"]').click();
    assert.equal(await page.locator('#sb-know-stage').getAttribute('data-zoom'), 'scale');
    const zoomed = await image.evaluate(node => node.getBoundingClientRect().width);
    assert.ok(zoomed > stageWidth * 1.5, `zoomed diagram is larger than the viewer (${zoomed} in ${stageWidth})`);
    // The image box grows as a scaled copy of the viewer and the picture stays contained in it, so a
    // diagram that declares no size of its own (a viewBox only) can never be stretched out of shape.
    assert.deepEqual(await page.evaluate(() => { const stage = document.querySelector('#sb-know-stage'), image = stage.querySelector('img'), box = image.getBoundingClientRect(); return [getComputedStyle(image).objectFit, Math.round(box.width / stage.clientWidth), Math.round(box.height / stage.clientHeight)]; }), ['contain', 2, 2]);
    const box = await page.locator('#sb-know-stage').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 - 40, { steps: 4 }); await page.mouse.up();
    assert.ok(await page.locator('#sb-know-stage').evaluate(node => node.scrollLeft) >= 100, 'dragging pans the zoomed diagram');
    assert.deepEqual(await page.evaluate(audit), CLEAN, 'a zoomed diagram scrolls inside its viewer, not the page');
    await page.locator('#sb-know-tools [data-zoom="actual"]').click();
    assert.deepEqual([Math.round(await image.evaluate(node => node.getBoundingClientRect().width)), await page.locator('#sb-know-tools [data-zoom="actual"]').getAttribute('aria-pressed')], [960, 'true']);
    await page.locator('#sb-know-tools [data-zoom="fit"]').click();
    assert.ok(Math.abs(await image.evaluate(node => node.getBoundingClientRect().width) - fitted) < 2);
    await page.locator('.sb-know__item', { hasText: 'Sample recovery steps' }).click();
    await page.locator('.sb-know__text h4').waitFor();
    assert.deepEqual([await page.locator('.sb-know__text h4').innerText(), await page.locator('.sb-know__text h5').first().innerText(), await page.locator('#sb-know-tools').isVisible(), await page.locator('#sb-know-stage').getAttribute('data-mode')], ['Sample recovery steps', 'A surface is wrong: least disruptive first', false, 'text']);
    assert.match(await page.locator('.sb-know__text').innerText(), /1\. Shutter\. Any time, mid-show too\. A lit lane with its shutter CLOSED is dark on stage: open it from Control\./);
    await page.locator('.sb-know__item', { hasText: 'Sample output map' }).click();
    await page.locator('.sb-know__text pre').waitFor();
    assert.match(await page.locator('.sb-know__text pre').innerText(), /"surface": "SR Portal"/);
    assert.equal(await page.locator('.sb-know__text script, .sb-know__text a, .sb-know__text img').count(), 0, 'a document is text, never markup');
    // Only files the manifest names are served.
    refusalsExpected = true;
    assert.deepEqual(await page.evaluate(async () => Promise.all(['manifest.json', '../know/manifest.json', '..%2F..%2Fpackage.json', 'power-up.md'].map(async name => (await fetch(`api/know/file?f=${name}`)).status))), [404, 404, 404, 200]);
    await page.waitForTimeout(100);
    refusalsExpected = false;
    const link = page.locator('#sb-notes-link');
    assert.deepEqual([await link.isVisible(), await link.getAttribute('href'), await link.getAttribute('target'), await link.getAttribute('rel')], [true, NOTES, '_blank', 'noopener noreferrer']);
    assert.equal(await page.locator('#sb-notes-hint').innerText(), 'For notes that can wait. Not for emergencies or cue calls.');
    assert.equal(await link.evaluate(node => !!node.closest('#know')), true, 'the notes link lives with the documents, away from every control');
    await page.locator('#t-control').click();
    assert.equal(await link.isVisible(), false);

    // The shared sign-in note, and a strip item's explanation.
    await page.locator('#sb-shared').click();
    assert.match(await page.locator('#sb-shared-note').innerText(), /The relay records each command and its time\. It does not record who sent it\./);
    await page.locator('#sb-shared-note [data-close]').click();
    await chip('cues').click();
    assert.match(await page.locator('#sb-detail').innerText(), /CUE LINK|Cue link/);
    assert.match(await page.locator('#sb-detail').innerText(), /Whether the playback app followed the cue/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#sb-detail').evaluate(node => node.open), false);

    // A reload on a tab comes back to that tab.
    await page.goto(`${relay.base}/show.html#setup`);
    await page.locator('.pc-card[data-lane="B"][data-reach="live"]').waitFor({ state: 'attached' });
    assert.deepEqual([await page.locator('#t-setup').getAttribute('aria-selected'), await page.locator('#setup').isVisible()], ['true', true]);

    // ---- Fit: every tab at eight sizes in both themes, with real content on each.
    await page.locator('#sb-setup-run').click();
    await page.locator('.sb-line[data-line="relay"]').waitFor();
    await page.locator('#t-know').click();
    await page.locator('.sb-know__item', { hasText: 'Sample signal flow' }).click();
    await page.waitForFunction(() => document.querySelector('#sb-know-stage img')?.naturalWidth === 960);
    for (const theme of ['light', 'dark']) for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await page.evaluate(mode => window.FrozenTheme.set(mode, { save: false }), theme);
      const label = `${theme} ${width}x${height}`, small = width < 700 || height < 520, key = `${width}x${height}`;
      for (const tab of TABS) {
        await page.locator(`#t-${tab}`).click();
        await page.waitForTimeout(60);
        assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} ${tab}`);
        assert.ok(await page.locator('#sb-main').evaluate(node => node.getBoundingClientRect().height) >= innerHeightMin(height) - 40, `${label} ${tab} the panel fills the page`);
        if (tab === 'control') {
          assert.equal(await page.locator('#pc-pick').isVisible(), small, `${label} one card at a time only on a small screen`);
          if (await page.locator('#pc-pick').isVisible()) {
            for (const pick of ['B', 'D', 'ALL', 'A']) {
              await page.locator(`#pc-pick [data-pick="${pick}"]`).click();
              assert.equal(await page.locator('.pc-card:visible').count(), 1);
              assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} control card ${pick}`);
            }
            await page.locator('#pc-pick [data-pick="B"]').click();
          } else assert.equal(await page.locator('.pc-card:visible').count(), 5);
          // The armed state fits too: confirm, cancel and the note.
          await act('B', 'shutter-close').click();
          await settled('B', 'armed');
          assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} control armed`);
          if (theme === 'light' && key === '375x812') await shot(page, '11-phone-control-armed');
          await act('B', 'cancel').click();
          await act('ALL', 'shutter-close').isVisible() && await act('ALL', 'shutter-close').click().then(async () => { await settled('ALL', 'armed'); assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} all lanes armed`); await act('ALL', 'cancel').click(); });
        }
        if (tab === 'midi') {
          // A waiting test, a pass and a cleared test all fit: these are the longest wordings on the card.
          await page.locator('#sb-midi-start').click();
          await page.locator('#sb-midi-test[data-state="eye"]').waitFor();
          assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} midi waiting`);
          fs.appendFileSync(observer, midiRows(msc('999')));
          await page.locator('#sb-midi-test[data-state="ok"]').waitFor({ timeout: 10000 });
          assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} midi pass`);
          if (theme === 'light' && key === '375x812') await shot(page, '16-phone-midi-pass');
          fs.appendFileSync(observer, midiRows(msc('999.5')));
          await page.locator('#sb-midi-title', { hasText: 'both arrived' }).waitFor({ timeout: 10000 });
          assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} midi cleared`);
        }
        if (tab === 'midi' && await page.locator('#sb-midi-heard').isVisible()) {
          // A tiny screen shows the test or what was heard, one at a time.
          assert.equal(await page.locator('#sb-feed').isVisible(), false);
          await page.locator('#sb-midi-heard').click();
          assert.deepEqual([await page.locator('#sb-feed').isVisible(), await page.locator('#sb-midi-test').isVisible(), await page.evaluate(() => document.activeElement?.id)], [true, false, 'sb-midi-back']);
          assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} midi heard`);
          await page.locator('#sb-midi-back').click();
          assert.equal(await page.locator('#sb-midi-test').isVisible(), true);
        } else if (tab === 'midi') assert.deepEqual([await page.locator('#sb-feed').isVisible(), await page.locator('#sb-midi-test').isVisible()], [true, true]);
        if (tab === 'know' && small) {
          // A small screen shows the list or the viewer, one at a time.
          if (await page.locator('#sb-know-back').isVisible()) await page.locator('#sb-know-back').click();
          assert.deepEqual([await page.locator('#sb-know-list').isVisible(), await page.locator('#sb-know-stage').isVisible()], [true, false]);
          assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} know list`);
          await page.locator('.sb-know__item', { hasText: 'Sample signal flow' }).click();
          await page.locator('#sb-know-back').waitFor();
          assert.equal(await page.locator('#sb-know-list').isVisible(), false);
          assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} know diagram`);
          if (theme === 'light' && key === '375x812') await shot(page, '14-phone-know-diagram');
          await page.locator('#sb-know-back').click();
          await page.locator('.sb-know__item', { hasText: 'Sample recovery steps' }).click();
          await page.locator('.sb-know__text h4').waitFor();
          assert.deepEqual(await page.evaluate(audit), CLEAN, `${label} know document`);
          if (theme === 'light' && key === '375x812') await shot(page, '15-phone-know-document');
          await page.locator('#sb-know-back').click();
        }
        if (theme === 'light' && key === '768x1024') await shot(page, `2${TABS.indexOf(tab)}-tablet-portrait-${tab}`);
        if (theme === 'dark' && key === '1024x768') await shot(page, `3${TABS.indexOf(tab)}-tablet-landscape-${tab}-dark`);
        if (theme === 'light' && key === '375x812') await shot(page, `1${TABS.indexOf(tab)}-phone-${tab}`);
        if (theme === 'dark' && key === '375x812') await shot(page, `4${TABS.indexOf(tab)}-phone-${tab}-dark`);
        if (theme === 'light' && key === '844x390') await shot(page, `5${TABS.indexOf(tab)}-phone-landscape-${tab}`);
        if (theme === 'light' && key === '320x256') await shot(page, `6${TABS.indexOf(tab)}-tiny-${tab}`);
        if (theme === 'light' && key === '1440x900') await shot(page, `7${TABS.indexOf(tab)}-laptop-${tab}`);
        if (theme === 'light' && key === '2560x720') await shot(page, `8${TABS.indexOf(tab)}-ultrawide-${tab}`);
      }
      // Tabs are a bottom rail on a phone and along the top otherwise.
      const tabsTop = await page.locator('.sb-tabs').evaluate(node => node.getBoundingClientRect().top), panelTop = await page.locator('#sb-main').evaluate(node => node.getBoundingClientRect().top);
      assert.equal(tabsTop > panelTop, small, `${label} tab rail position`);
      // On a small screen the MIDI explanation moves behind a button, and its dialog fits.
      await page.locator('#t-midi').click();
      if (await page.locator('#sb-midi-more').isVisible()) {
        assert.equal(await page.locator('#sb-midi-text').isVisible(), false);
        await page.locator('#sb-midi-more').click();
        assert.match(await page.locator('#sb-midi-detail').innerText(), /This page sends no MIDI\./);
        assert.equal((await page.evaluate(audit)).pageScrolls, false);
        await page.locator('#sb-midi-detail [data-close]').click();
      } else assert.equal(await page.locator('#sb-midi-text').isVisible(), true);
    }
    // ---- The power page: the same control, power only, at the same eight sizes in both themes.
    const power = await context.newPage();
    await power.setViewportSize({ width: 375, height: 812 });
    await power.goto(`${relay.base}/power.html`);
    await power.locator('.pc-card[data-lane="ALL"][data-reach="live"]').waitFor();
    assert.deepEqual(await power.locator('#pc-root .pc-actions button').allInnerTexts(), ['Turn all on', 'Turn all off']);
    assert.equal(await power.locator('#pc-root .pc-card:visible').count(), 5);
    for (const theme of ['light', 'dark']) for (const [width, height] of SIZES) {
      await power.setViewportSize({ width, height });
      await power.evaluate(mode => window.FrozenTheme.set(mode, { save: false }), theme);
      const label = `power page ${theme} ${width}x${height}`, small = width < 700 || height < 520, key = `${width}x${height}`;
      await power.locator('#t-control').click();
      assert.deepEqual(await power.evaluate(audit), CLEAN, `${label} power`);
      // The cards have real room: a collapsed panel would pass a fit audit while showing nothing.
      assert.ok(await power.locator('.pc-card:visible').first().evaluate(node => node.getBoundingClientRect().height) >= 70, `${label} cards have height`);
      assert.ok(await power.locator('#sb-main').evaluate(node => node.getBoundingClientRect().height) >= innerHeightMin(height), `${label} the panel fills the page`);
      // The reviewed run fits too: the plan, Confirm and Cancel.
      await power.locator('.pc-card[data-lane="ALL"] [data-act="power-off"]').click();
      await power.locator('.pc-card[data-lane="ALL"][data-phase="relay-armed"]').waitFor();
      assert.deepEqual(await power.evaluate(audit), CLEAN, `${label} run reviewed`);
      if (theme === 'light' && key === '375x812') await shot(power, '17-phone-power-page-run-reviewed');
      await power.locator('.pc-card[data-lane="ALL"] [data-act="cancel"]').click();
      if (theme === 'light' && key === '375x812') await shot(power, '18-phone-power-page');
      if (theme === 'light' && key === '768x1024') await shot(power, '24-tablet-portrait-power-page');
      if (theme === 'dark' && key === '1024x768') await shot(power, '34-tablet-landscape-power-page-dark');
      if (theme === 'light' && key === '320x256') await shot(power, '64-tiny-power-page');
      await power.locator('#t-night').click();
      await power.waitForTimeout(60);
      assert.deepEqual(await power.evaluate(audit), CLEAN, `${label} night`);
      assert.ok(await power.locator('.sb-night__rows').evaluate(node => node.getBoundingClientRect().height) >= Math.min(140, Math.round(height / 6)), `${label} night rows have room`);
      assert.equal(await power.locator('.sb-night__verdict').isVisible(), true, `${label} night verdict shows`);
      if (theme === 'light' && key === '375x812') await shot(power, '19-phone-power-page-night');
      if (theme === 'dark' && key === '1440x900') await shot(power, '44-desktop-power-page-night-dark');
      if (theme === 'light' && key === '1440x900') await shot(power, '43-desktop-power-page-night');
      await power.locator('#t-know').click();
      await power.waitForTimeout(60);
      if (small && await power.locator('#sb-know-back').isVisible()) await power.locator('#sb-know-back').click();
      assert.deepEqual(await power.evaluate(audit), CLEAN, `${label} know`);
      const tabsTop = await power.locator('.sb-tabs').evaluate(node => node.getBoundingClientRect().top), panelTop = await power.locator('#sb-main').evaluate(node => node.getBoundingClientRect().top);
      assert.equal(tabsTop > panelTop, small, `${label} tab rail position`);
    }
    await power.close();
    await page.setViewportSize({ width: 1024, height: 768 });
    assert.deepEqual(foreign, [], 'the page asks nothing of any other host, the notes address included');
    assert.deepEqual(errors, [], 'no page or console errors');
    await context.close();

    // ---- A scripted relay: the control-port link, flags, stale replies, refusals, clock skew, a lost relay and an older relay.
    const base = await relay.state();
    const scripted = async ({ skewMs = 0, lostStatus = 0, command, feed, older = false, hash = '', fakeClock = false, edit, runRoute, file = 'show.html', viewport = { width: 1024, height: 768 } } = {}) => {
      const ctx = await browser.newContext({ viewport });
      const tab = await ctx.newPage();
      let advanced = 0;
      if (fakeClock) await tab.clock.install({ time: Date.now() });
      const state = structuredClone(base), sentHere = [], relayNow = () => Date.now() + skewMs + advanced;
      const stamp = (p, ageMs = 500) => { p.status = { ...p.status, updatedAt: new Date(relayNow() - ageMs).toISOString(), connection: { ...p.status.connection, lastSuccessAt: new Date(relayNow() - ageMs).toISOString() } }; };
      state.lock = false;
      for (const p of state.projectors) if (p.status.online) stamp(p);
      edit?.(state, stamp);
      let socket, live = true;
      await tab.routeWebSocket('**/ws', ws => {
        if (!live) { ws.close(); return; }
        socket = ws;
        ws.send(JSON.stringify(state));
        ws.send(JSON.stringify({ type: 'heartbeat', at: new Date(relayNow()).toISOString() }));
      });
      const missing = route => route.fulfill({ status: 404, body: 'not found' });
      await tab.route('**/api/host-displays', route => route.fulfill({ json: { scope: 'relay-computer', state: 'reported', collectedAt: new Date(relayNow()).toISOString(), reason: null, displays: Array.from({ length: 5 }, (_, i) => ({ id: `d${i}`, online: true, main: i === 0, mirror: false, resolution: '1920 x 1080 @ 60.00Hz' })) } }));
      await tab.route('**/api/state', route => lostStatus ? route.fulfill({ status: lostStatus, json: { error: 'login required' } }) : route.fulfill({ json: state }));
      await tab.route('**/api/command', route => { const body = route.request().postDataJSON(); sentHere.push(body); return command ? command(route, body) : route.fulfill({ status: 500, json: { error: 'not expected in this test' } }); });
      await tab.route('**/api/cue-feed', route => older ? missing(route) : route.fulfill({ json: feed ? feed(relayNow()) : { feedId: 'scripted', state: 'not-configured', seq: 0, lastCue: null, recent: [] } }));
      await tab.route('**/api/host-checks', route => older ? missing(route) : route.fulfill({ json: { checks: [] } }));
      await tab.route('**/api/know**', route => older ? missing(route) : route.fulfill({ json: { state: 'not-configured', sample: false, items: [] } }));
      await tab.route('**/api/crew-links', route => older ? missing(route) : route.fulfill({ json: { notes: null, state: 'not-configured' } }));
      await tab.route('**/api/power-run**', route => older ? missing(route) : runRoute ? runRoute(route) : route.fulfill({ json: { active: false, run: null } }));
      await tab.goto(`${relay.base}/${file}${hash}`);
      await tab.locator('.pc-card[data-lane="C"][data-reach="live"]').waitFor({ state: 'attached' });
      const push = (slot, change, ageMs) => { const p = state.projectors.find(x => x.slot === slot); Object.assign(p.status, change); stamp(p, ageMs); socket.send(JSON.stringify({ type: 'status', slot, status: p.status })); };
      const pulse = () => { for (const p of state.projectors) if (p.status.online) { stamp(p); socket.send(JSON.stringify({ type: 'status', slot: p.slot, status: p.status })); } socket.send(JSON.stringify({ type: 'heartbeat', at: new Date(relayNow()).toISOString() })); };
      const forward = async ms => { advanced += ms; await tab.clock.fastForward(ms); };
      const drop = () => { live = false; socket.close(); };
      const at = id => tab.locator(`.pc-card[data-lane="${id}"]`);
      const tell = message => socket.send(JSON.stringify(message));
      return { ctx, tab, push, pulse, forward, drop, tell, sent: sentHere, relayNow, at };
    };

    // The control port is named and tagged "power untested"; a wrong input and a pattern left on are flagged.
    let run = await scripted({ edit: state => {
      const [a, b, c] = ['P1', 'P2', 'P3'].map(slot => state.projectors.find(p => p.slot === slot));
      Object.assign(a, { driver: 'panasonic' }); Object.assign(a.status, { power: 'on', shutter: 'open', input: null, errors: null, pattern: '00', controlLink: 'control-port' });
      Object.assign(b, { inputs: { 31: 'HDMI 1', 32: 'SDI 1' }, inputPreference: { available: true, value: '31', label: 'HDMI 1' } }); Object.assign(b.status, { input: '32' });
      Object.assign(c, { patterns: { '00': 'Off', '08': 'Crosshatch' } }); Object.assign(c.status, { pattern: '08' });
    } });
    assert.deepEqual([await run.at('A').locator('[data-fact="link"] dd').innerText(), await run.at('A').locator('[data-fact="link"]').getAttribute('data-flag'), await run.at('A').locator('[data-fact="input"] dd').innerText()], ['Control port · power untested', '', 'Not reported']);
    assert.match(await run.at('A').locator('[data-fact="link"]').getAttribute('title'), /^Shutter over this link is proven on the rig\. Power over it has not been tested on the rig yet\.$/);
    assert.deepEqual([await run.at('B').locator('[data-fact="input"] dd').innerText(), await run.at('B').locator('[data-fact="input"]').getAttribute('data-flag'), await run.at('B').getAttribute('data-tone')], ['SDI 1 · expected hdmi 1', '', 'attention']);
    assert.deepEqual([await run.at('C').locator('[data-fact="pattern"] dd').innerText(), await run.at('C').getAttribute('data-tone')], ['ON · Crosshatch', 'attention']);
    assert.match(await run.tab.locator('.sb-check[data-check="lanes"]').getAttribute('aria-label'), /B input SDI 1 · C test pattern on/);
    assert.match(await run.tab.locator('.sb-check[data-check="outputs"]').getAttribute('aria-label'), /^Outputs: OK\. 4 outputs \+ main\./);
    assert.match(await run.tab.locator('.sb-check[data-check="cues"]').getAttribute('aria-label'), /^Cue link: No reading\. Not connected\./);
    await shot(run.tab, '09-tablet-control-port-and-flags');
    // A reply that goes stale while an action is armed withdraws it, and nothing is sent.
    await run.at('C').locator('[data-act="shutter-close"]').click();
    await run.tab.locator('.pc-card[data-lane="C"][data-phase="armed"]').waitFor();
    run.push('P3', {}, 60000);
    await run.tab.locator('.pc-card[data-lane="C"][data-phase="note"]').waitFor();
    assert.deepEqual([await run.at('C').locator('.pc-msg').innerText(), await run.at('C').locator('.pc-state').innerText(), run.sent.length], ['Not sent: the reading changed.', 'CHECK BY EYE', 0]);
    await run.ctx.close();

    // A refusal stays on the card in the relay's own words; a withdrawn confirm clears itself.
    run = await scripted({ fakeClock: true, command: (route, body) => route.fulfill({ json: { [body.slot]: { error: 'ERR3 Unavailable at this time' } } }) });
    await run.at('B').locator('[data-act="shutter-close"]').click();
    await run.forward(700); run.pulse();
    await run.at('B').locator('[data-act="confirm"]').click();
    await run.tab.locator('.pc-card[data-lane="B"][data-phase="error"]').waitFor();
    assert.match(await run.at('B').locator('.pc-msg').innerText(), /^\d+:\d\d [AP]M · Close shutter: Not done: ERR3 Unavailable at this time$/);
    await run.at('C').locator('[data-act="shutter-close"]').click();
    await run.tab.locator('.pc-card[data-lane="C"][data-phase="armed"]').waitFor();
    await run.forward(6500); run.pulse();
    await run.tab.locator('.pc-card[data-lane="C"][data-phase="note"]').waitFor();
    assert.equal(await run.at('C').locator('.pc-msg').innerText(), 'Not sent: confirm timed out.');
    for (let i = 0; i < 5; i++) { await run.forward(5000); run.pulse(); }
    await run.tab.locator('.pc-card[data-lane="C"][data-phase="idle"]').waitFor();
    assert.equal(await run.at('C').locator('.pc-msg').innerText(), '');
    assert.match(await run.at('B').locator('.pc-msg').innerText(), /Not done: ERR3 Unavailable at this time$/, 'the refusal is still there');
    assert.equal(await run.at('B').getAttribute('data-phase'), 'error');
    await run.ctx.close();

    // No answer is not a refusal: the page does not claim the command was not sent.
    run = await scripted({ command: route => route.abort() });
    await run.at('C').locator('[data-act="shutter-close"]').click();
    await run.tab.waitForTimeout(700);
    await run.at('C').locator('[data-act="confirm"]').click();
    await run.tab.locator('.pc-card[data-lane="C"][data-phase="error"]').waitFor();
    assert.match(await run.at('C').locator('.pc-msg').innerText(), /No answer from the relay\. Check the lane by eye\.$/);
    await run.ctx.close();
    // The relay's confirmation expiring between the two taps sends nothing and says so.
    let asked = 0;
    run = await scripted({ command: (route, body) => route.fulfill({ json: { [body.slot]: { confirm: `token-${++asked}`, targets: [body.slot], message: 'Tap again' } } }) });
    await run.at('B').locator('[data-act="power-off"]').click();
    await run.tab.locator('.pc-card[data-lane="B"][data-phase="relay-armed"]').waitFor();
    await run.tab.waitForTimeout(700);
    await run.at('B').locator('[data-act="confirm"]').click();
    await run.tab.locator('.pc-card[data-lane="B"][data-phase="error"]').waitFor();
    assert.match(await run.at('B').locator('.pc-msg').innerText(), /Confirm expired at the relay\. Nothing sent\.$/);
    assert.deepEqual(run.sent.map(body => body.confirm), [undefined, 'token-1']);
    await run.ctx.close();

    // A device clock ten minutes off: ages are measured on the relay's clock, so fresh stays fresh.
    for (const skewMs of [600000, -600000]) {
      run = await scripted({ skewMs });
      await run.tab.waitForTimeout(1500);
      assert.equal(await run.at('B').getAttribute('data-reach'), 'live', `relay clock ${skewMs} ms from the device clock`);
      assert.match(await run.at('B').locator('.pc-fresh').innerText(), /^Reply (just now|\ds ago)$/);
      await run.ctx.close();
    }

    // A lost relay: every lane goes to "check by eye" and everything locks.
    run = await scripted({});
    run.drop();
    await run.tab.locator('.pc-card[data-lane="B"][data-reach="relay-offline"]').waitFor();
    assert.deepEqual([await run.at('B').locator('.pc-state').innerText(), await run.at('B').locator('.pc-msg').innerText(), await run.tab.locator('#sb-lock').innerText()], ['CHECK BY EYE', 'Relay not answering. Check by eye.', 'Show Lock unknown']);
    assert.equal(await run.tab.locator('.pc-btn[aria-disabled="false"]').count(), 0);
    await run.tab.locator('#t-setup').click();
    assert.equal(await run.tab.locator('#sb-setup-why').innerText(), 'Relay not answering.');
    await run.ctx.close();
    // A relay restart ends the session: the page goes to the sign-in and comes back to the same tab.
    run = await scripted({ lostStatus: 401, hash: '#midi' });
    run.drop();
    await run.tab.waitForURL(/\/login\.html\?next=%2Fshow\.html%23midi$/);
    await run.ctx.close();

    // The MIDI test with nothing arriving: a timeout that points at the console side.
    const listening = now => ({ feedId: 'scripted', state: 'listening', reason: null, seq: 0, staleAfterMs: 90000, now: new Date(now).toISOString(), lastRowAt: new Date(now - 1000).toISOString(), heartbeatAt: new Date(now - 1000).toISOString(), sources: 2, destinations: 2, sourceNames: ['Console A'], lastCue: null, recent: [], skippedLines: 0 });
    run = await scripted({ fakeClock: true, hash: '#midi', feed: listening });
    await run.tab.locator('#sb-feed-title', { hasText: 'Listening' }).waitFor();
    await run.tab.locator('#sb-midi-start').click();
    await run.tab.locator('#sb-midi-test[data-state="eye"]').waitFor();
    for (let i = 0; i < 7; i++) { await run.forward(5000); run.pulse(); await run.tab.waitForTimeout(40); }
    await run.tab.locator('#sb-midi-test[data-state="attention"]').waitFor();
    assert.equal(await run.tab.locator('#sb-midi-title').innerText(), 'Timed out: cue 999 did not arrive');
    assert.match(await run.tab.locator('#sb-midi-text').innerText(), /Check the console side: the cue on the console, the cable, and the MIDI interface\.$/);
    assert.equal(await run.tab.locator('#sb-midi-hint').innerText(), 'The playback app is not the cause when nothing arrives.');
    assert.deepEqual(await run.tab.locator('.sb-step').evaluateAll(steps => steps.map(step => step.dataset.state)), ['fail', 'idle']);
    await shot(run.tab, '10-tablet-midi-timeout');
    await run.ctx.close();
    // The listener stopping during the wait is "no result", never a failed cue.
    let stop = false;
    run = await scripted({ fakeClock: true, hash: '#midi', feed: now => stop ? { ...listening(now), state: 'stopped', reason: 'No row from the listener inside the limit.', lastRowAt: new Date(now - 200000).toISOString() } : listening(now) });
    await run.tab.locator('#sb-feed-title', { hasText: 'Listening' }).waitFor();
    await run.tab.locator('#sb-midi-start').click();
    await run.tab.locator('#sb-midi-test[data-state="eye"]').waitFor();
    stop = true;
    for (let i = 0; i < 7; i++) { await run.forward(5000); run.pulse(); await run.tab.waitForTimeout(40); }
    await run.tab.locator('#sb-midi-title', { hasText: 'No result: the listener stopped' }).waitFor();
    assert.match(await run.tab.locator('#sb-midi-text').innerText(), /This is not a failed cue\.$/);
    assert.equal(await run.tab.locator('#sb-feed-title').innerText(), 'Listener stopped');
    assert.equal(await run.tab.locator('#sb-midi-start').getAttribute('aria-disabled'), 'true');
    await run.ctx.close();

    // The run as another page started it: this page shows it, blocks its own power, and can stop it.
    const SURFACES = { A: 'SL Portal', B: 'Top Portal', C: 'Stage', D: 'SR Portal' };
    const runOf = (state, extra = {}) => ({ id: 'run-1', direction: 'off', state, phase: 'units', startedAt: new Date(Date.now() - 20000).toISOString(), endedAt: state === 'running' ? null : new Date().toISOString(), banner: null, message: '',
      steps: [['A', 'reported', 'Reported COOLING'], ['D', 'checking', 'Lit 20 s ago. Waiting 40 s before any command'], ['B', 'pending', 'Waiting for its turn'], ['C', 'pending', 'Waiting for its turn']]
        .map(([lane, step, note]) => ({ lane, surface: SURFACES[lane], slot: lane, state: step, note, confirmed: false, sentAt: null })), ...extra });
    const stops = [];
    run = await scripted({ runRoute: route => { if (route.request().method() !== 'POST') return route.fulfill({ json: { active: false, run: null } }); stops.push(new URL(route.request().url()).pathname); return route.fulfill({ json: { active: false, run: runOf('stopped', { message: 'Stopped from a page. Nothing more was sent. Check each lane.' }) } }); } });
    run.tell({ type: 'powerRun', active: true, run: runOf('running') });
    await run.tab.locator('#pc-run[data-state="running"]').waitFor();
    assert.deepEqual([await run.tab.locator('#pc-run .pc-run__title').innerText(), await run.tab.locator('#pc-run .pc-run__text').innerText()], ['TURNING ALL FOUR OFF', 'D · SR Portal: Lit 20 s ago. Waiting 40 s before any command']);
    assert.deepEqual(await run.tab.locator('#pc-run .pc-run__step').allInnerTexts(), ['A ✓', 'D …', 'B ·', 'C ·']);
    assert.match(await run.at('ALL').locator('[data-act="power-on"]').getAttribute('aria-label'), /Blocked: A run is already in progress\.$/);
    assert.match(await run.at('B').locator('[data-act="power-off"]').getAttribute('aria-label'), /Blocked: An all-four run is in progress\.$/);
    assert.equal(await run.at('D').locator('.pc-msg').innerText(), 'Run: Lit 20 s ago. Waiting 40 s before any command', 'each lane card carries its own step');
    for (const [width, height] of [[1024, 768], [375, 667], [844, 390], [320, 256]]) {
      await run.tab.setViewportSize({ width, height });
      assert.deepEqual(await run.tab.evaluate(audit), CLEAN, `running banner ${width}x${height}`);
      if (width === 375) await shot(run.tab, '19-phone-run-in-progress');
    }
    await run.tab.setViewportSize({ width: 1024, height: 768 });
    await run.tab.locator('#pc-run .pc-run__stop').click();
    await run.tab.locator('#pc-run[data-state="stopped"]').waitFor();
    assert.deepEqual(stops, ['/api/power-run/stop']);
    assert.equal(await run.tab.locator('#pc-run .pc-run__title').innerText(), 'RUN STOPPED');
    assert.match(await run.tab.locator('#pc-run .pc-run__text').innerText(), /^Stopped from a page\. Nothing more was sent\. Check each lane\. Ended \d+:\d\d [AP]M\.$/);
    run.tell({ type: 'powerRun', active: false, run: runOf('attention', { message: 'Not confirmed OFF: D (no current reply). Check by eye.' }) });
    await run.tab.locator('#pc-run[data-state="attention"]').waitFor();
    assert.equal(await run.tab.locator('#pc-run .pc-run__title').innerText(), 'NOT SAFE TO LEAVE YET');
    run.tell({ type: 'powerRun', active: false, run: runOf('attention', { direction: 'on', message: 'Not confirmed ON: A (reports WARMING). Check by eye.' }) });
    await run.tab.locator('#pc-run[data-direction="on"]').waitFor();
    assert.equal(await run.tab.locator('#pc-run .pc-run__title').innerText(), 'NOT ALL FOUR ON');
    run.tell({ type: 'powerRun', active: false, run: runOf('interrupted', { message: 'The relay restarted during this run. Nothing more was sent. Check each lane.' }) });
    await run.tab.locator('#pc-run[data-state="interrupted"]').waitFor();
    assert.equal(await run.tab.locator('#pc-run .pc-run__title').innerText(), 'RUN INTERRUPTED');
    // A finished run's banner does not linger into the next day.
    run.tell({ type: 'powerRun', active: false, run: runOf('done', { banner: 'Safe to leave the building', endedAt: new Date(Date.now() - 16 * 60000).toISOString() }) });
    await run.tab.locator('#pc-run').waitFor({ state: 'hidden' });
    await run.ctx.close();

    // An older relay without the new routes: the page still runs and says what it does not have.
    // The night timeline against scripted relay states: a lamp unit cooling, one sent but not confirmed, the Barco in deep standby.
    run = await scripted({ file: 'power.html', hash: '#night', viewport: { width: 375, height: 812 }, edit: (state, stamp) => {
      const lane = id => state.projectors.find(p => p.lane === id);
      Object.assign(lane('C').status, { power: 'off', rawState: 'eco', shutter: 'unknown' });
      Object.assign(lane('B').status, { power: 'off' });
      Object.assign(lane('A').status, { power: 'cooling' });
      lane('D').status = { ...lane('D').status, online: false, connection: { ...lane('D').status.connection, state: 'reconnecting', lastSuccessAt: new Date(Date.now() - 900000).toISOString() } };
    } });
    const nightRun = runOf('running', { steps: [['A', 'reported', 'Reported COOLING', 72000], ['D', 'sent', 'Sent. Waiting for it to report COOLING or OFF', 60000], ['B', 'reported', 'Reported OFF', 50000], ['C', 'reported', 'Reported COOLING', 40000]]
      .map(([lane, step, note, ago]) => ({ lane, surface: SURFACES[lane], slot: lane, state: step, note, confirmed: lane === 'B', sentAt: run.relayNow() - ago })) });
    run.tell({ type: 'powerRun', active: true, run: nightRun });
    await run.tab.locator('.sb-night__row[data-lane="D"][data-state="eye"]').waitFor();
    const nowOf = lane => run.tab.locator(`.sb-night__row[data-lane="${lane}"] .sb-night__now`).innerText();
    assert.match(await nowOf('A'), /^COOLING · 1:[12]\d so far$/, 'the lamp unit counts from its off command');
    assert.equal(await run.tab.locator('.sb-night__row[data-lane="A"] .sb-night__detail').innerText(), 'Never cut mains while a lamp unit is cooling.');
    assert.equal(await run.tab.locator('.sb-night__mains').getAttribute('data-hot'), '', 'the mains line stands out while a lamp unit cools');
    assert.deepEqual([await nowOf('D'), await run.tab.locator('.sb-night__row[data-lane="D"] .sb-night__detail').innerText()], ['Sent, not confirmed', 'Check it by eye.'], 'no reply after an off is not success');
    assert.deepEqual([await nowOf('C'), await run.tab.locator('.sb-night__row[data-lane="C"]').getAttribute('data-state'), await run.tab.locator('.sb-night__row[data-lane="C"] .sb-night__detail').innerText()],
      ['OFF · ECO', 'warn', 'Deep standby: the morning power on cannot reach it.']);
    assert.match(await run.tab.locator('.sb-night__verdict').innerText(), /^Not safe to leave yet: A \(COOLING · \d:\d\d so far\), D \(Sent, not confirmed\)$/);
    assert.deepEqual(await run.tab.evaluate(audit), CLEAN, 'the night timeline fits a phone');
    await shot(run.tab, '20-phone-power-page-night-scripted');
    await run.tab.locator('#t-control').click();
    assert.match(await run.at('C').locator('.pc-state').getAttribute('data-note'), /ECO/);
    await run.tab.locator('#t-night').click();
    // All four read off, the Barco in READY: now it is safe to leave.
    run.push('P3', { power: 'off', rawState: 'ready' }); run.push('P1', { power: 'off' }); run.push('P4', { power: 'off', online: true, connection: { state: 'online' } });
    run.tell({ type: 'powerRun', active: false, run: { ...nightRun, state: 'done', banner: 'Safe to leave the building', endedAt: new Date().toISOString() } });
    await run.tab.locator('.sb-night__verdict[data-state="ok"]').waitFor();
    assert.deepEqual([await run.tab.locator('.sb-night__verdict').innerText(), await nowOf('C'), await run.tab.locator('.sb-night__mains').getAttribute('data-hot')], ['Safe to leave the building', 'OFF · READY', null]);
    await run.ctx.close();

    run = await scripted({ older: true });
    await run.tab.locator('.sb-check[data-check="cues"][data-state="off"]').waitFor();
    assert.match(await run.tab.locator('.sb-check[data-check="cues"]').getAttribute('aria-label'), /^Cue link: No reading\. Not connected\. Console cues do not reach this page\.$/);
    await run.at('ALL').locator('[data-act="power-on"]').click({ force: true });
    assert.equal(await run.at('ALL').locator('.pc-msg').innerText(), 'Turn all on is blocked. This relay has no all-four run.');
    assert.equal(run.sent.length, 0);
    await run.tab.locator('#t-midi').click();
    assert.deepEqual([await run.tab.locator('#sb-feed-title').innerText(), await run.tab.locator('#sb-midi-start').getAttribute('aria-disabled'), await run.tab.locator('#sb-midi-text').innerText()], ['Not connected', 'true', 'No cue feed is connected, so a cue cannot be seen arriving.']);
    await run.tab.locator('#t-know').click();
    await run.tab.locator('#sb-know-status', { hasText: 'No documents folder is set up on the relay.' }).waitFor();
    assert.deepEqual([await run.tab.locator('.sb-know__item').count(), await run.tab.locator('#sb-notes').isVisible()], [0, false]);
    await run.tab.locator('#t-setup').click();
    await run.tab.locator('#sb-setup-run').click();
    await run.tab.locator('.sb-line[data-line="playback-app"]').waitFor();
    assert.deepEqual([await run.tab.locator('.sb-line[data-line="playback-app"]').getAttribute('data-state'), await run.tab.locator('.sb-line[data-line="listener"]').getAttribute('data-state'), await run.tab.locator('.sb-line[data-line="displays"]').getAttribute('data-state')], ['cannot', 'cannot', 'pass']);
    await run.ctx.close();

    // ---- Signed in, on a phone: the path the crew uses. Then the relay restarts in the middle of a run.
    const freePort = () => new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); }); });
    const CODE = 'simulator-only-code', home = fs.mkdtempSync(path.join(os.tmpdir(), 'projctl-signed-in-'));
    const secure = { PJ_PASSCODE: CODE, RIG: path.join(home, 'rig.json'), STAGE_PLOT: path.join(home, 'stage-plot.json'), VENUE_MODEL: path.join(home, 'venue'), PORT: String(await freePort()) };
    fs.writeFileSync(path.join(home, 'host-paths.json'), JSON.stringify({ cueObserver: observer })); // the same observer file, so the MIDI test runs signed in too
    let secured = await startRelay(secure);
    try {
      const pocket = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const phone = await pocket.newPage();
      const signIn = async next => { await phone.waitForURL(new RegExp(`/login\\.html\\?next=%2F${next}\\.html(?:%23[a-z]+)?$`)); await phone.locator('#code').fill(CODE); await phone.locator('button[type=submit]').click(); await phone.waitForURL(new RegExp(`/${next}\\.html(?:#[a-z]+)?$`)); };
      await phone.goto(`${secured.base}/show.html`);
      await signIn('show');
      assert.equal(await phone.evaluate(async () => { for (const [slot, lane] of [['P1', 'A'], ['P2', 'B'], ['P3', 'C'], ['P4', 'D']]) { const reply = await fetch('api/projector', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot, lane }) }); if (!reply.ok) return reply.status; } return 200; }), 200);
      await phone.locator('.pc-card[data-lane="B"][data-reach="live"]').waitFor({ state: 'attached' });
      // Morning, from the phone, signed in.
      await phone.locator('#pc-pick [data-pick="ALL"]').click();
      await phone.locator('.pc-card[data-lane="ALL"] [data-act="power-on"]').click();
      await phone.locator('.pc-card[data-lane="ALL"][data-phase="relay-armed"]').waitFor();
      await phone.waitForTimeout(700);
      await phone.locator('.pc-card[data-lane="ALL"] [data-act="confirm"]').click();
      await phone.locator('#pc-run[data-state="done"]').waitFor({ timeout: 30000 });
      assert.equal(await phone.locator('#pc-run .pc-run__title').innerText(), 'ALL FOUR ON');
      assert.deepEqual(await phone.evaluate(audit), CLEAN, 'signed in on a phone, the finished run fits');
      // The other tabs work signed in too.
      await phone.locator('#t-setup').click();
      await phone.locator('#sb-setup-run').click();
      await phone.locator('.sb-line[data-line="A-power"][data-state="pass"]').waitFor();
      await phone.locator('#t-midi').click();
      assert.equal(await phone.locator('#sb-midi-title').innerText(), 'Not run yet');
      await phone.locator('#sb-midi-start[aria-disabled="false"]').waitFor({ timeout: 10000 });
      await phone.locator('#sb-midi-start').click();
      await phone.locator('#sb-midi-test[data-state="eye"]').waitFor();
      fs.appendFileSync(observer, midiRows(msc('999')));
      await phone.locator('#sb-midi-test[data-state="ok"]').waitFor({ timeout: 10000 });
      assert.equal(await phone.locator('#sb-midi-title').innerText(), 'Pass: the cue arrived');
      assert.deepEqual(await phone.evaluate(audit), CLEAN, 'signed in on a phone, a passed MIDI test fits');
      await phone.locator('#sb-midi-stop').click();
      await phone.locator('#t-know').click();
      await phone.locator('.sb-know__item').first().waitFor();
      await phone.locator('.sb-know__item', { hasText: 'Sample recovery steps' }).click();
      await phone.locator('.sb-know__text h4').waitFor();
      // The power page at its own address, same session: it opens on the button and shows the same last run.
      await phone.goto(`${secured.base}/power.html`);
      await phone.locator('.pc-card[data-lane="ALL"][data-reach="live"]').waitFor();
      await phone.locator('#pc-run[data-state="done"]').waitFor();
      assert.equal(await phone.locator('#pc-run .pc-run__title').innerText(), 'ALL FOUR ON');
      await phone.locator('.pc-card[data-lane="ALL"] [data-act="power-off"]').click();
      await phone.locator('.pc-card[data-lane="ALL"][data-phase="relay-armed"]').waitFor();
      await phone.waitForTimeout(700);
      await phone.locator('.pc-card[data-lane="ALL"] [data-act="confirm"]').click();
      await phone.locator('#pc-run[data-state="running"]').waitFor();
      await phone.locator('#t-night').click();
      await phone.locator('.sb-night__stop').waitFor();
      assert.deepEqual(await phone.evaluate(audit), CLEAN, 'signed in on a phone, the night timeline fits during a run');
      await shot(phone, '89-phone-signed-in-night-run');
      // The relay restarts mid-run. Sessions end with it: the page goes to the sign-in, not to a silent failure,
      // and comes back to the same tab.
      await secured.close();
      secured = await startRelay(secure);
      await signIn('power');
      await phone.locator('#t-night[aria-selected="true"]').waitFor();
      await phone.locator('#t-control').click();
      await phone.locator('#pc-run[data-state="interrupted"]').waitFor();
      assert.equal(await phone.locator('#pc-run .pc-run__title').innerText(), 'RUN INTERRUPTED');
      assert.match(await phone.locator('#pc-run .pc-run__text').innerText(), /^The relay restarted during this run\. Nothing more was sent\. Check each lane\. Ended \d+:\d\d [AP]M\.$/);
      assert.deepEqual(await phone.evaluate(audit), CLEAN, 'the interrupted notice fits on a phone');
      await shot(phone, '90-phone-signed-in-run-interrupted');
      // A new run can be reviewed straight away.
      await phone.locator('.pc-card[data-lane="ALL"] [data-act="power-off"]').click();
      await phone.locator('.pc-card[data-lane="ALL"][data-phase="relay-armed"]').waitFor();
      await phone.locator('.pc-card[data-lane="ALL"] [data-act="cancel"]').click();
      await pocket.close();
    } finally { await secured.close(); fs.rmSync(home, { recursive: true, force: true }); }

    console.log('Role pages: show.html and power.html with one shared control; guarded power and shutter; the relay all-four run from two pages with one state, its banners, stop and a restart mid-run; Show Lock; refusals that stay; stale and lost-relay guards; clock skew; the signed-in path on a phone; the MIDI test; the setup check; the Know tab; the crew notes link; an older relay; and fit on every tab at eight sizes in both themes passed');
  } finally { clearInterval(beat); await browser.close(); await relay.close(); fs.rmSync(scratch, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
