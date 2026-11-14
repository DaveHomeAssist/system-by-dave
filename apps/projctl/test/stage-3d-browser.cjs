const {selectView,selectLane}=require('./operator-ui.cjs');
const assert = require('node:assert/strict');

exports.instrument3D = async page => page.addInitScript(() => {
  window.stageDraws = 0;
  for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = type.prototype[name]; if (!original) continue;
      type.prototype[name] = function (...args) { window.stageDraws++; return original.apply(this, args); };
    }
  }
});

const pointFor = (page, lane) => page.locator('three-d-stage').evaluate((stage, id) => stage.getActivationTargetScreenPoint(id), lane);
exports.check3D = async (page, relay, offline, until) => {
  await page.locator('[data-stage-view="3d"]').click();
  await page.locator('#stage-3d[data-state="ready"]').waitFor();
  const canvas = page.locator('three-d-stage canvas');
  assert.ok(await page.evaluate(() => window.stageDraws > 0), '3D must actually draw');
  if (!offline) {
    assert.match(await page.locator('#stage-foot').innerText(), /Metres.*heights unknown/);
    assert.match(await page.locator('.pj-stage-card[data-lane="A"]').innerText(), /500 \/ 200 \/ 600 mm/);
    assert.equal(await page.locator('three-d-stage').evaluate(stage => stage._object.getObjectByName('A enclosure').geometry.parameters.width), .2);
    assert.equal(await page.locator('three-d-stage').evaluate(stage => stage._object.getObjectByName('B enclosure').geometry.parameters.width), .5);
  }
  const writes = [];
  const onRequest = req => { if (req.method() === 'POST' && req.url().includes('/api/command')) writes.push(req.postDataJSON()); };
  page.on('request', onRequest);
  for (const [lane, slot] of Object.entries({ A: 'P2', B: 'P4', C: 'P1', D: 'P3' })) {
    const p = await pointFor(page, lane); assert.ok(p?.visible);
    await page.mouse.click(p.x, p.y);
    if (offline && lane === 'C') { assert.equal(await page.locator('#adjust').isVisible(), false); continue; }
    await page.locator('#adjust').waitFor(); assert.match(await page.locator('#adj-sub').innerText(), new RegExp('^' + slot));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator(`.pj-stage-card[data-lane="${lane}"]`).evaluate(el => document.activeElement === el), true);
  }
  const initial = await canvas.screenshot();
  await canvas.press('ArrowLeft'); await page.waitForTimeout(700);
  assert.notDeepEqual(await canvas.screenshot(), initial, 'orbit changes the rendered scene');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  const p = await pointFor(page, 'A');
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 80, p.y + 25, { steps: 8 }); await page.mouse.up();
  assert.equal(await page.locator('#adjust').isVisible(), false, 'orbit drag must not activate a model');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await page.waitForTimeout(1200);
  const visible = await canvas.screenshot();
  await page.locator('[data-coverage="A"]').click(); await page.waitForTimeout(100);
  assert.notDeepEqual(await canvas.screenshot(), visible, 'coverage toggle changes the 3D drawing');
  await page.locator('[data-coverage="A"]').click();
  await page.waitForTimeout(1200);
  const beforeIdle = await page.evaluate(() => window.stageDraws);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.stageDraws), beforeIdle, 'idle 3D must not draw during status polling');
  await page.locator('[data-stage-view="front"]').click();
  await page.waitForTimeout(100);
  const beforeHidden = await page.evaluate(() => window.stageDraws);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => window.stageDraws), beforeHidden, 'hidden 3D must not draw');
  await page.locator('[data-stage-view="3d"]').click();
  await until(async () => (await page.evaluate(() => window.stageDraws)) > beforeHidden);
  assert.deepEqual(writes, [], '3D inspection never sends commands'); page.off('request', onRequest);
  if (!offline) {
    await canvas.evaluate(el => { window.contextRecovery = el.getContext('webgl2').getExtension('WEBGL_lose_context'); window.contextRecovery.loseContext(); });
    await page.locator('#stage-3d[data-state="lost"]').waitFor();
    await page.evaluate(() => window.contextRecovery.restoreContext());
    await page.locator('#stage-3d[data-state="ready"]').waitFor();
    const fallback = await page.context().browser().newPage();
    try {
      await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); }; });
      await fallback.goto(relay.base); await selectView(fallback,'stage');
      await fallback.locator('#stage-3d-message').filter({ hasText: 'Use Front or Plan' }).waitFor();
      await fallback.locator('[data-stage-view="front"]').click();
      await fallback.locator('.pj-stage-marker[data-lane="A"]').click();
      assert.match(await fallback.locator('#adj-sub').innerText(), /^P2/);
    } finally { await fallback.close(); }
    const unavailable = await page.context().browser().newPage();
    try {
      await unavailable.route('**/ProjectorThrow/three-d-stage.js', route => route.abort());
      await unavailable.goto(relay.base); await selectView(unavailable,'stage');
      await unavailable.locator('#stage-3d-message').filter({ hasText: 'Use Front or Plan' }).waitFor();
      await unavailable.locator('[data-stage-view="plan"]').click();
      assert.equal(await unavailable.locator('.pj-stage-marker[data-lane="A"]').isVisible(), true);
    } finally { await unavailable.close(); }
  }
};

exports.check3DLayout = async (page, width, height) => {
  await page.locator('[data-stage-view="3d"]').click();
  await page.locator('#stage-3d[data-state="ready"]').waitFor();
  const canvas = await page.locator('three-d-stage canvas').boundingBox();
  assert.ok(canvas.width > 100 && canvas.height > 75, `3D collapsed at ${width}x${height}`);
  assert.equal(await page.locator('.pj-stage-camera').evaluate(el => el.scrollWidth <= el.clientWidth), true);
  for (const button of await page.locator('.pj-stage-camera button').all()) {
    const b = await button.boundingBox(); assert.ok(b.width >= 44 && b.height >= 44, 'camera target too small');
  }
};
