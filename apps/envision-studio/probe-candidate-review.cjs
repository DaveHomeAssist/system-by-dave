/* Read-only browser checks. Edge cases use responses visible only to the test browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const playwright = require('playwright');

const origin = process.env.ENVISION_ORIGIN;
const projectName = process.env.ENVISION_REVIEW_PROJECT;
const evidence = process.env.ENVISION_EVIDENCE;
const engine = process.env.ENVISION_BROWSER || 'chromium';
if (!origin || !projectName) throw Error('Set ENVISION_ORIGIN and ENVISION_REVIEW_PROJECT.');

async function json(request, route) {
  const response = await request.get(origin + '/api/v1' + route);
  assert.ok(response.ok(), route + ' returned ' + response.status());
  return response.json();
}
async function settled(page, selector) {
  await page.locator(selector).evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
}
async function shot(page, name) {
  // Playwright's WebKit screenshot preparation injects an inline stylesheet.
  // Keep the studio's CSP enforced throughout the WebKit interaction checks.
  if (evidence && engine === 'chromium') {
    await fs.mkdir(evidence, {recursive: true});
    await page.screenshot({path: path.join(evidence, name + '.png'), caret: 'initial'});
  }
}
const selected = page => page.locator('#versions [aria-pressed="true"]').getAttribute('data-version');

async function checkFullView(page) {
  const dialog = page.locator('#proof-dialog');
  assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), 'Full view overflows horizontally');
  const frame = await dialog.boundingBox();
  for (const id of ['proof-art', 'proof-prev', 'proof-next', 'proof-swap', 'proof-close']) {
    const box = await page.locator('#' + id).boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44 && box.x >= frame.x && box.y >= frame.y
      && box.x + box.width <= frame.x + frame.width && box.y + box.height <= frame.y + frame.height, id);
  }
}

async function actual(page, project, rev, width) {
  await page.goto(origin + '/#project/' + project.id + '/library');
  const card = page.locator('[data-version="' + rev.id + '"]');
  await card.click();
  await settled(page, '#art, #versions img:visible');
  await card.evaluate(el => { window.reviewCard = el; window.reviewThumb = el.firstElementChild; });
  const thumbRequests = [];
  page.on('request', req => { if (new URL(req.url()).searchParams.has('thumb')) thumbRequests.push(req.url()); });
  const thumbCount = thumbRequests.length;
  await page.locator('#compare').click();
  assert.equal(await page.locator('#compare-version').inputValue(), rev.parent);
  await settled(page, '#art, #other-art');
  const parent = project.versions.find(item => item.id === rev.parent);
  assert.ok((await page.locator('#other-art').getAttribute('src')).endsWith('/' + parent.hash));
  await page.locator('#swap-compare').click();
  assert.equal(await selected(page), rev.id);
  await page.locator('#swap-compare').click();
  assert.equal(await selected(page), rev.id);
  await page.locator('#expand-proof').click();
  await checkFullView(page);
  assert.ok((await page.locator('#proof-details').textContent()).includes('Render ' + rev.recipe.receipt.engineSeconds.toFixed(1) + ' s'));
  assert.ok((await page.locator('#proof-details').textContent()).includes(rev.width + ' × ' + rev.height));
  await page.locator('#proof-swap').click();
  assert.equal(await page.locator('#proof-label').textContent(), parent.label);
  assert.match(await page.locator('#proof-details').textContent(), /^Original · /);
  await page.locator('#proof-swap').click();
  const next = page.locator('#proof-next');
  await next.click();
  assert.notEqual(await selected(page), rev.id);
  assert.ok(await page.locator('#proof-dialog').isVisible());
  await page.locator('#proof-prev').click();
  assert.equal(await selected(page), rev.id);
  await settled(page, '#proof-art');
  if (width === 375) await shot(page, 'Phone full view ' + engine);
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#expand-proof').evaluate(el => el === document.activeElement));
  await card.focus();
  await card.press('ArrowRight');
  assert.notEqual(await selected(page), rev.id);
  assert.ok(await page.locator('#versions [aria-pressed="true"]').evaluate(el => el === document.activeElement));
  await page.keyboard.press('ArrowLeft');
  assert.equal(await selected(page), rev.id);
  assert.ok(await card.evaluate(el => el === window.reviewCard && el.firstElementChild === window.reviewThumb));
  assert.equal(thumbRequests.length, thumbCount, 'Selection re-requested thumbnails');
  const alternate = project.versions.find(item => item.role !== 'mask' && item.id !== rev.id && item.id !== rev.parent);
  await page.locator('#compare-version').selectOption(alternate.id);
  assert.ok((await page.locator('#other-art').getAttribute('src')).endsWith('/' + alternate.hash));
  await page.locator('#compare-version').selectOption(parent.id);
  const search = page.locator('#library-search');
  await search.fill('no candidate matches this sentence');
  assert.equal(await page.locator('#versions button').count(), 0);
  assert.equal(await page.locator('#art').getAttribute('src'), null);
  for (const id of ['compare', 'expand-proof', 'zoom', 'review-prev', 'review-next'])
    assert.ok(await page.locator('#' + id).isDisabled(), id);
  assert.ok(await page.locator('#version-actions').isHidden());
  assert.match(await page.locator('#no-art').textContent(), /No matching artwork/);
  await search.fill('');
  await card.click();
  await page.locator('#compare').click();
  await settled(page, '#art, #other-art');
  if (width === 1440) await shot(page, 'Desktop original and revision ' + engine);
  const contained = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth
    && document.documentElement.scrollHeight <= innerHeight);
  assert.ok(contained, 'Document overflow at ' + width);
  for (const id of ['review-prev', 'review-next', 'expand-proof']) {
    const box = await page.locator('#' + id).boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width, id);
  }
  await page.getByRole('button', {name: 'Layout', exact: true}).click();
  const url = new URL(await page.locator('#art').getAttribute('src'), origin);
  assert.equal(url.searchParams.get('background'), project.data.stages[0].background || project.data.background || null);
  assert.ok(await page.locator('#compare-tools').isHidden());
}

async function browserFixture(page, project, rev) {
  await page.goto('about:blank');
  const parent = project.versions.find(v => v.id === rev.parent);
  const twin = {...parent, id: '1'.repeat(32), label: 'Second label for same pixels', role: 'reference', recipe: {}, favorite: true};
  const copy = {...rev, label: 'Revision <angle> ' + 'a very long candidate title '.repeat(3), favorite: false, hash: parent.hash};
  const source = {...parent, label: 'Original', favorite: false};
  const mask = {...source, id: '2'.repeat(32), role: 'mask'};
  const fixture = {...project, data: {...project.data, selected: copy.id}, versions: [copy, twin, source, mask]};
  await page.route('**/api/v1/projects/' + project.id, route => route.fulfill({json: fixture}));
  const job = '3'.repeat(32);
  await page.route('**/api/v1/jobs', route => route.fulfill({json: [{id: job, project: project.id, state: 'running'}]}));
  await page.route('**/api/v1/jobs/' + job, route => route.fulfill({json: {state: 'succeeded', result: twin.id}}));
  await page.goto(origin + '/#project/' + project.id + '/library');
  await page.locator('[data-version="' + copy.id + '"]').waitFor();
  assert.equal(await page.locator('#versions button').count(), 3);
  const catalogRefresh = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/projects/' + project.id));
  await catalogRefresh;
  assert.equal(await selected(page), copy.id, 'A completed background job changed the review selection');
  await page.locator('#compare').click();
  assert.equal(await page.locator('#compare-version').inputValue(), source.id);
  await page.locator('#expand-proof').click();
  await checkFullView(page);
  await page.locator('#proof-swap').click();
  assert.equal(await page.locator('#proof-label').textContent(), 'Original');
  await page.locator('#proof-swap').click();
  assert.equal(await page.locator('#proof-label').textContent(), copy.label);
  await page.locator('#proof-close').click();
  await page.locator('#favorites').click();
  assert.equal(await selected(page), twin.id);
  assert.equal(await page.locator('#review-position').textContent(), '1 / 1');
  assert.ok(await page.locator('#review-next').isDisabled());
  await page.locator('#expand-proof').click();
  assert.equal(await page.locator('#proof-details').textContent(), 'Selected · ' + twin.width + ' × ' + twin.height);
  await page.locator('#proof-close').click();
  await page.locator('#favorites').click();
  await page.locator('#library-search').fill('Original');
  await page.locator('#library-search').press('ArrowLeft');
  assert.ok(await page.locator('#library-search').evaluate(el => el === document.activeElement));
  assert.equal(await selected(page), source.id);
}

async function run() {
  const browser = await playwright[engine].launch();
  const failures = [], writes = [];
  try {
    for (const [width,height] of [[1440,900],[680,820],[375,812]]) {
      const context = await browser.newContext({viewport:{width,height}, reducedMotion:'reduce',
        ignoreHTTPSErrors: process.env.ENVISION_FIXTURE_TLS === '1'});
      await context.route('**/api/v1/**', route => {
        if (route.request().method() === 'GET') return route.continue();
        writes.push(route.request().method() + ' ' + new URL(route.request().url()).pathname);
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', err => failures.push(err.message));
      page.on('console', msg => { if (msg.type() === 'error') failures.push(msg.text()); });
      const state = await json(context.request, '/state');
      const item = state.projects.find(p => !p.archived && p.name === projectName);
      assert.ok(item, 'Review project unavailable');
      const project = await json(context.request, '/projects/' + item.id);
      const rev = project.versions.find(v => v.parent && Number.isFinite(v.recipe?.receipt?.engineSeconds)
        && project.versions.some(other => other.id === v.parent));
      assert.ok(rev, 'A generated revision with a recorded parent and timing is required');
      await actual(page, project, rev, width);
      if (width === 375) await browserFixture(page, project, rev);
      const after = await json(context.request, '/projects/' + item.id);
      assert.equal(after.revision, project.revision);
      assert.equal(after.data.selected, project.data.selected);
      assert.equal(after.data.background, project.data.background);
      await context.close();
      console.log(engine + ' ' + width + 'px passed. Project revision and background preserved.');
    }
    assert.deepEqual(failures, []);
    assert.deepEqual(writes, []);
  } finally { await browser.close(); }
}
run().catch(err => { console.error(err.message); process.exitCode = 1; });
