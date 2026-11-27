/* Run on the private network with Playwright. Writes only to new QA projects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const origin = process.env.ENVISION_ORIGIN;
if (!origin) throw Error('Set ENVISION_ORIGIN to the private studio URL.');
const shots = process.env.ENVISION_EVIDENCE;
const owner = { 'X-Envision': 'studio', Origin: origin };
const result = { viewports: [], downloads: [], errors: [] };
async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const p = await ctx.newPage();
  const qa = [];
  const api = ctx.request;
  async function get(route) {
    const r = await api.get(origin + '/api/v1' + route);
    assert(r.ok(), route);
    return r.json();
  }
  async function write(route, b) {
    const r = await api.post(origin + '/api/v1' + route, { data: b, headers: owner });
    assert(r.ok(), route + ' ' + (await r.text()));
    return r.json();
  }
  async function checkSize(page, width, height) {
    await page.setViewportSize({ width, height });
    const metrics = await page.evaluate(() => {
      const e = document.documentElement;
      return {
        width: e.clientWidth,
        height: e.clientHeight,
        scrollW: e.scrollWidth,
        scrollH: e.scrollHeight,
      };
    });
    assert(metrics.scrollW <= width && metrics.scrollH <= height, JSON.stringify(metrics));
    result.viewports.push(metrics);
  }
  function watch(page) {
    page.on('pageerror', (err) => result.errors.push(err.message));
  }
  async function shot(page, name) {
    if (shots) {
      await page
        .locator('img[src]:visible')
        .evaluateAll((imgs) => Promise.all(imgs.map((im) => im.decode().catch(() => {}))));
      fs.mkdirSync(shots, { recursive: true });
      await page.screenshot({ path: path.join(shots, name + '.png') });
    }
  }
  try {
    watch(p);
    await p.goto(origin);
    await p.locator('#project-grid button').first().waitFor();
    await checkSize(p, 1440, 900);
    await p.locator('#computers').click();
    await p.getByRole('heading', { name: 'Computers' }).waitFor();
    assert.equal(await p.locator('#computer-dominic-state').textContent(), 'Project source online');
    assert.match(await p.locator('#computer-walter-state').textContent(), /^Walter (online|offline|paused|rendering)|^Engine offline$/);
    await checkSize(p, 375, 812);
    await p.locator('#computers-close').focus();
    assert(await p.locator('#computers-close').evaluate((node) => node === document.activeElement));
    await p.locator('#computers-close').click();
    await p.setViewportSize({ width: 1440, height: 900 });
    await shot(p, 'Projects');
    const projects = (await get('/state')).projects;
    const original = projects.find((x) => x.name === 'AfterJinx' && !x.archived);
    const fire = projects.find((x) => x.name === 'Signal Assembly Fire' && !x.archived);
    assert(original && fire, 'Private AfterJinx and Signal Assembly Fire fixtures are required.');
    await p.getByRole('button', { name: /^AfterJinx Show project/ }).click();
    await p.getByRole('button', { name: 'Library', exact: true }).click();
    await p.locator('#versions .version').first().click();
    await p.locator('#compare').click();
    await p.locator('#other-art').waitFor();
    const ref = await p
      .locator('#compare-version option')
      .evaluateAll((options) => options.find((o) => /^original\.png$/i.test(o.textContent))?.value);
    if (ref) await p.locator('#compare-version').selectOption(ref);
    await p.waitForFunction(() =>
      ['art', 'other-art'].every((id) => document.getElementById(id).naturalWidth > 0),
    );
    await shot(p, 'Compare');
    await checkSize(p, 375, 812);
    await p.locator('#swap-compare').click();
    await shot(p, 'Phone library');
    await checkSize(p, 680, 900);
    await checkSize(p, 2880, 900);
    await p.setViewportSize({ width: 375, height: 812 });
    const copy = await write('/projects/' + fire.id + '/duplicate', {});
    qa.push(copy.id);
    await p.goto(origin + '/#project/' + copy.id + '/layout');
    await p.reload();
    await p.locator('#stage').waitFor();
    await p.getByRole('button', { name: 'Layout', exact: true }).click();
    await p.locator('#stage').selectOption({ label: 'Doors' });
    await p.locator('#format').selectOption('story');
    await p.waitForFunction(() => document.getElementById('art').naturalHeight === 1920);
    await checkSize(p, 375, 812);
    await p.locator('#expand-proof').click();
    await shot(p, 'Phone doors proof');
    await p.locator('#proof-close').click();
    // The named stage shares its date and hours field with the announcement.
    const before = await get('/projects/' + copy.id);
    const jobCount = (await get('/jobs')).length;
    await p.getByText('Event fields', { exact: true }).click();
    const field = p.locator('#fields input[data-key="slot8"]');
    await field.fill('18 MAR 2027   /   DOORS AT 08:30');
    const wording = p.locator('#wording');
    await wording.fill('Doors draft one');
    await p.locator('#save-layer').click();
    await p.waitForFunction(r => document.getElementById('message').textContent.includes('Saved revision ' + r), before.revision + 1);
    assert.equal(await field.inputValue(), '18 MAR 2027   /   DOORS AT 08:30');
    await wording.fill('Doors draft two');
    await p.locator('#save-fields').click();
    await p.waitForFunction(r => document.getElementById('message').textContent.includes('Saved revision ' + r), before.revision + 2);
    assert.equal(await wording.inputValue(), 'Doors draft two');
    await p.locator('#save-layer').click();
    await p.waitForFunction(r => document.getElementById('message').textContent.includes('Saved revision ' + r), before.revision + 3);
    const after = await get('/projects/' + copy.id);
    assert(after.revision > before.revision);
    assert.equal(after.data.background, before.data.background);
    const replacement = after.versions.find((v) => v.role === 'background');
    assert(replacement);
    const logoData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z8j8AAAAASUVORK5CYII=',
      'base64',
    );
    await p.locator('#layer').selectOption({ index: 1 });
    await p
      .locator('#replace-logo')
      .setInputFiles({ name: 'test-mark.png', mimeType: 'image/png', buffer: logoData });
    await p.waitForFunction(
      (r) => document.getElementById('message').textContent.includes('Saved revision ' + r),
      after.revision + 1,
      { timeout: 10000 },
    );
    await p.locator('#output-formats input[value="lobby"]').check();
    await p.locator('#make-export').click();
    await field.fill('Next doors draft');
    await p
      .locator('#export-list')
      .getByRole('button', { name: 'Package ZIP' })
      .first()
      .waitFor({ timeout: 45000 });
    assert.equal(await field.inputValue(), 'Next doors draft');
    await p.locator('#save-fields').click();
    await p.waitForFunction(r => document.getElementById('message').textContent.includes('Saved revision ' + r), after.revision + 2);
    result.preservedDrafts = true;
    const packPromise = p.waitForEvent('download');
    await p.locator('#export-list').getByRole('button', { name: 'Package ZIP' }).first().click();
    const pack = await packPromise;
    assert.equal(await pack.failure(), null);
    result.downloads.push(pack.suggestedFilename());
    const nativePromise = p.waitForEvent('download');
    await p.locator('#native').click();
    const native = await nativePromise;
    assert.equal(await native.failure(), null);
    assert(native.suggestedFilename().endsWith('.envision.zip'));
    result.downloads.push(native.suggestedFilename());
    const done = await get('/projects/' + copy.id);
    assert.equal(done.data.background, before.data.background);
    assert.equal((await get('/jobs')).length, jobCount);
    assert.deepEqual(
      done.exports[0].files.map((f) => f.size),
      [
        [1080, 1350],
        [1080, 1920],
        [1920, 1080],
      ],
    );
    result.stageCount = done.data.stages.length;
    result.layoutJobsCreated = 0;
    result.outputSizes = done.exports[0].files.map((f) => f.size);
    await p.getByRole('button', {name:'Create',exact:true}).click();
    await p.locator('#operation').selectOption('finish');
    await p.locator('#paint-mask').click();
    await p.locator('#invert-mask').click();
    await p.locator('#mask-save').click();
    await p.locator('#mask-dialog').waitFor({state:'hidden'});
    await p.getByRole('button', {name:'Library',exact:true}).click();
    await p.locator('#versions .version:not(.active)').filter({hasText:'Imported background'}).first().click();
    await p.getByRole('button', {name:'Create',exact:true}).click();
    await p.locator('#paint-mask').click();
    await p.locator('#mask-close').click();
    await p.locator('#generate').click();
    await p.waitForFunction(() => document.getElementById('message').textContent.includes('Local finish saved'));
    const finish = (await get('/projects/' + copy.id)).versions.find(v => v.role === 'finish');
    assert(finish);assert.equal(finish.recipe.mask,null);result.cancelledMaskPreservedSource=true;
    if (process.env.ENVISION_RENDER_TRIAL === '1') {
      await p.getByRole('button', { name: 'Projects', exact: true }).click();
      await p.locator('#new-project').click();
      const name = 'Landscape acceptance ' + Date.now();
      await p.locator('#dialog-name').fill(name);
      await p.locator('#name-dialog .primary').click();
      await p
        .locator('#prompt')
        .fill(
          'A silver road case beside a quiet amber-lit concert stage. A wide editorial photograph, no lettering.',
        );
      await p.locator('#render-size').selectOption('768,432');
      await p.locator('#generate').click();
      await p.waitForFunction(() =>
        document.getElementById('message').textContent.includes('queued'),
      );
      const project = (await get('/state')).projects.find((x) => x.name === name);
      qa.push(project.id);
      const job = (await get('/jobs')).find((j) => j.project === project.id);
      assert(job);
      await p.close();
      const second = await browser.newContext({ viewport: { width: 1440, height: 900 } }),
        mac = await second.newPage();
      watch(mac);
      await mac.goto(origin);
      await mac.getByRole('button', { name: new RegExp('^' + name) }).click();
      for (let i = 0; i < 100; i++) {
        const j = await get('/jobs/' + job.id);
        if (j.state === 'failed') throw Error(j.error);
        if (j.state === 'succeeded') {
          result.wallpaper = j.receipt;
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert(result.wallpaper);
      await mac.reload();
      await mac.locator('#project-title').filter({ hasText: name }).waitFor();
      await mac.getByRole('button', { name: 'Library', exact: true }).click();
      const dl = mac.waitForEvent('download');
      await mac.locator('#download-art').click();
      const art = await dl;
      assert.equal(await art.failure(), null);
      result.downloads.push(art.suggestedFilename());
      assert(art.suggestedFilename().startsWith(name));
      await second.close();
    }
    assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
    console.log(JSON.stringify(result));
  } finally {
    for (const id of qa) {
      const q = await get('/projects/' + id);
      q.data.archived = true;
      await api.patch(origin + '/api/v1/projects/' + id, {
        headers: owner,
        data: { data: q.data, revision: q.revision },
      });
    }
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
