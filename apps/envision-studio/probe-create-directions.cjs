/* Run against the disposable loopback coordinator. These checks create fixture projects and jobs. */
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const path = require('node:path');

const origin = process.env.ENVISION_ORIGIN;
if (!origin || !['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
  throw Error('Set ENVISION_ORIGIN to the disposable loopback coordinator.');
const evidence = process.env.ENVISION_EVIDENCE;
const headers = { Origin: origin, 'X-Envision': 'studio' };

async function run(browserType, width) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true, reducedMotion: 'reduce',
    viewport: { width, height: width > 680 ? 900 : 812 } });
  try {
    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', (err) => errors.push(err.message));
    const el = (id) => page.locator('#' + id);
    const nav = (name) => page.locator('nav [data-tab="' + name + '"]').click();
    const get = async (route) => {
      const res = await context.request.get(origin + '/api/v1' + route);
      assert.ok(res.ok());
      return res.json();
    };
    const write = async (method, route, data) => {
      const res = await context.request.fetch(origin + '/api/v1' + route, { method, headers, data });
      assert.ok(res.ok(), route + ' returned ' + res.status());
      return res.json();
    };
    const stamp = browserType.name() + ' ' + width + ' ' + Date.now();
    const a = await write('POST', '/projects', { name: 'Directions A ' + stamp, kind: 'image' });
    const b = await write('POST', '/projects', { name: 'Directions B ' + stamp, kind: 'image' });
    const route = '/projects/' + a.id;
    if (width === 1440) {
      const base = await get(route);
      await write('PATCH', route, { revision: base.revision,
        data: { ...base.data, fields: { ...base.data.fields, caption: 'First caption' } } });
    }
    const openCard = async (name) => {
      await page.locator('#project-grid button.card').filter({ hasText: name }).click();
      await page.waitForFunction((title) => document.getElementById('project-title').textContent === title, name);
    };
    await page.goto(origin);
    await page.waitForFunction(() => location.hash === '#projects');
    await openCard(a.data?.name || 'Directions A ' + stamp);
    await el('empty-directions').click();
    const gallery = el('direction-gallery');
    const items = await page.evaluate(() => globalThis.EnvisionDirections);
    assert.equal(await gallery.locator('button').count(), 3);
    await gallery.locator('img').evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
    for (const btn of await gallery.locator('button').all()) {
      const box = await btn.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth
      && document.documentElement.scrollHeight <= innerHeight));
    if (evidence && browserType === chromium)
      await page.screenshot({ path: path.join(evidence, 'Direction picker ' + width + '.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'empty-directions');
    await el('recall-direction').click();
    await gallery.getByRole('button', { name: 'Use Fiber lights direction' }).click();
    assert.equal(await el('prompt').inputValue(), items[1].prompt);
    assert.deepEqual((await get(route)).versions, []);
    assert.equal((await get(route)).data.brief || '', '');
    const wording = items[1].prompt + ' Keep the tips in focus.';
    await el('prompt').fill(wording);
    await page.reload();
    await el('prompt').waitFor();
    assert.equal(await el('prompt').inputValue(), wording);
    await el('recall-direction').click();
    page.once('dialog', (dialog) => dialog.dismiss());
    await gallery.getByRole('button', { name: 'Use Folded paper direction' }).click();
    assert.equal(await el('prompt').inputValue(), wording);
    await el('close-directions').click();
    await nav('library');
    await nav('queue');
    await page.goBack();
    await el('library').waitFor();
    await page.goBack();
    await el('create').waitFor();
    assert.equal(await el('prompt').inputValue(), wording);
    await page.goForward();
    await el('library').waitFor();
    await nav('projects');
    await openCard('Directions B ' + stamp);
    assert.equal(await el('prompt').inputValue(), '');
    await nav('projects');
    await openCard('Directions A ' + stamp);
    assert.equal(await el('prompt').inputValue(), wording);
    await write('PATCH', route + '/brief', { brief: 'A second device saved this direction.', expectedBrief: '' });
    await el('save-brief').click();
    await el('direction-conflict').waitFor();
    assert.equal(await el('prompt').inputValue(), wording);
    assert.ok(await el('save-brief').isDisabled());
    await el('keep-direction-draft').click();
    await el('save-brief').click();
    await page.waitForFunction(() => document.querySelector('#direction-state').textContent === 'Saved to project');
    assert.equal((await get(route)).data.brief, wording);
    await el('prompt').fill('Another temporary draft.');
    await write('PATCH', route + '/brief', { brief: 'Second saved version', expectedBrief: wording });
    await page.reload();
    await el('take-saved-direction').click();
    assert.equal(await el('prompt').inputValue(), 'Second saved version');
    await el('prompt').fill('');
    await page.reload();
    await el('prompt').waitFor();
    assert.equal(await el('prompt').inputValue(), '');
    assert.ok(await el('save-brief').isEnabled());
    if (width === 1440) {
      await nav('layout');
      await page.getByText('Event fields', {exact: true}).click();
      const caption = page.locator('#fields [data-key="caption"]');
      await caption.fill('An unsaved caption');
      page.once('dialog', (dialog) => dialog.dismiss());
      await page.goBack();
      await page.waitForFunction(() => location.hash.endsWith('/layout'));
      assert.equal(await caption.inputValue(), 'An unsaved caption');
      page.once('dialog', (dialog) => dialog.accept());
      await page.goBack();
      await el('create').waitFor();
      await page.goForward();
      await el('layout').waitFor();
      assert.equal(await caption.inputValue(), 'First caption');
      await nav('create');
      await el('prompt').fill('A fiber study for this project.');
      await el('count').selectOption('1');
      const requestRoute = '**/api/v1' + route + '/jobs';
      let release, accepted;
      const hold = new Promise((done) => { release = done; });
      const received = new Promise((done) => { accepted = done; });
      await page.route(requestRoute, async (intercept) => {
        const response = await intercept.fetch();
        assert.ok(response.ok());
        accepted(intercept.request().postDataJSON().key);
        await hold;
        await intercept.abort('failed');
      });
      await el('generate').click();
      const firstKey = await received;
      await nav('projects');
      await openCard('Directions B ' + stamp);
      assert.ok(await el('generate').isEnabled());
      release();
      await page.unrouteAll({ behavior: 'wait' });
      await nav('projects');
      await openCard('Directions A ' + stamp);
      await page.reload();
      await el('generate').waitFor();
      await el('count').selectOption('1');
      const submitted = page.waitForRequest((req) => req.url().endsWith(route + '/jobs'));
      await el('generate').click();
      assert.equal((await submitted).postDataJSON().key, firstKey);
      await page.waitForFunction(() => !document.getElementById('generate').disabled);
      const jobs = await get('/jobs');
      assert.equal(jobs.filter((job) => job.project === a.id).length, 1);
      assert.equal(jobs.filter((job) => job.project === b.id).length, 0);
      // Recover a corrupt tab draft using the saved project direction.
      await page.evaluate((id) => sessionStorage.setItem('envision.create.direction.v1.' + id, '{'), a.id);
      await page.reload();
      await el('prompt').waitFor();
      assert.equal(await el('prompt').inputValue(), 'Second saved version');
      await page.addInitScript(() => {
        Object.defineProperty(window, 'sessionStorage', { get() { throw Error('Storage disabled'); } });
      });
      await page.reload();
      await el('prompt').fill('This page still works with tab storage disabled.');
      await nav('library');
      await nav('create');
      assert.equal(await el('prompt').inputValue(), 'This page still works with tab storage disabled.');
    }
    assert.deepEqual(errors, []);
    console.log(browserType.name(), width, 'direction picker, draft recovery, history and conflict choices passed.');
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const width of [1440, 680, 375, 320]) await run(chromium, width);
  await run(webkit, 375);
})().catch((err) => { console.error(err); process.exitCode = 1; });
