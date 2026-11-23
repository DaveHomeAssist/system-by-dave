const {selectView,selectLane}=require('./operator-ui.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const { startRelay } = await import('./relay-helper.js');
 const { measuredStageFixture } = await import('./stage-fixture.js');
 const relay = await startRelay();
 const plot = measuredStageFixture();
 for (const item of Object.values(plot.measurements.projectors)) item.y = 2.7432;
 const plotFile = path.join(path.dirname(relay.rigFile), 'stage-plot.json');
 fs.writeFileSync(plotFile, JSON.stringify(plot));
 const before = fs.readFileSync(plotFile, 'utf8');
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
 try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const writes = [], errors = [];
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method() + ' ' + request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(relay.base);
  await selectView(page,'stage');
  await page.locator('#stage-3d[data-state="ready"]').waitFor();
  await page.locator('[data-stage-mode="planning"]').click();
  await page.locator('[data-plan-preset="26"]').click();
  await page.locator('#plan-result').filter({ hasText: 'PROPOSED' }).waitFor();
  assert.match(await page.locator('#plan-result').innerText(), /26 ft/);
  assert.equal(await page.locator('#stage-3d').getAttribute('data-planning-lane'), 'D');
  const footprint = () => page.locator('#stage-3d three-d-stage').evaluate(stage => Array.from(stage._object.getObjectByName('Local what-if proposal').children[0].geometry.attributes.position.array));
  const initial = await footprint();
  await page.locator('[data-plan="centerHeight"]').fill('18');
  await page.locator('[data-plan="centerHeight"]').press('Tab');
  assert.notDeepEqual(await footprint(), initial, 'visible canonical optical footprint updates');
  await page.locator('[data-plan="upShift"]').fill('10');
  await page.locator('[data-plan="upShift"]').press('Tab');
  assert.match(await page.locator('#plan-result').innerText(), /H 10%/);
  await page.locator('[data-plan="lens"]').selectOption('current');
  await page.locator('[data-plan="raster"]').fill('26');
  await page.locator('[data-plan="raster"]').press('Tab');
  await page.locator('[data-plan="upShift"]').fill('10');
  await page.locator('[data-plan="upShift"]').press('Tab');
  assert.equal(await page.locator('[data-plan="upShift"]').inputValue(),'10');
  assert.match(await page.locator('#plan-result').innerText(), /H 10%/);
  assert.match(await page.locator('#plan-result').innerText(), /21.39 ft/);
  assert.equal(await page.locator('[data-plan="raster"]').inputValue(),'26');
  for (const lane of ['A', 'B', 'C', 'D']) {
   await page.locator(`[data-plan-lane="${lane}"]`).click();
   await page.locator('[data-plan="lensOffset"]').fill('0');
   await page.locator('[data-plan="lensOffset"]').press('Tab');
   assert.equal(await page.locator('#stage-3d').getAttribute('data-planning-lane'), lane);
  }
  await page.locator('#plan-reset').click();
  assert.match(await page.locator('#plan-result').innerText(), /RECORDED FOOTPRINT/);
  await page.locator('[data-plan-preset="26"]').click();
  for (const [width, height] of [[1440,900],[375,812]]) {
   await page.setViewportSize({ width, height });
   const fit = await page.evaluate(() => ({width:document.documentElement.scrollWidth <= document.documentElement.clientWidth, height:document.documentElement.scrollHeight <= document.documentElement.clientHeight}));
   assert.deepEqual(fit, {width:true,height:true});
   assert.ok(await page.locator('#plan-reset').evaluate(el => el.scrollWidth <= el.clientWidth), 'reset label stays inside its button');
   const sidebar = page.locator('.pj-stage-sidebar');
   await sidebar.evaluate(node => { node.scrollTop = 0; });
   assert.ok(await sidebar.evaluate(node => node.clientHeight > 100));
   const output = process.env.EVIDENCE_DIR || path.join(__dirname, '../artifacts'); fs.mkdirSync(output,{recursive:true});
   await page.screenshot({path:path.join(output,`stage-planner-${width}-${height}.png`)});
  }
  await page.locator('[data-stage-mode="reference"]').click();
  assert.equal(await page.locator('#stage-3d').getAttribute('data-planning-lane'), '');
  assert.deepEqual(errors, []); assert.deepEqual(writes, [], 'planning sends no mutation requests');
  assert.equal(fs.readFileSync(plotFile,'utf8'),before,'saved baseline unchanged');
  console.log('Stage planner: canonical rendering, D study, four lanes, reset, layouts and zero network writes passed');
 } finally { await browser.close(); await relay.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
