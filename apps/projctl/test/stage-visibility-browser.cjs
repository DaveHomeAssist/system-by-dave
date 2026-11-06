const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const {startRelay,until}=await import('./relay-helper.js');
 const {measuredStageFixture}=await import('./stage-fixture.js');
 const {writeVenueFixture}=await import('./venue-fixture.js');
 const relay=await startRelay(); const dir=path.dirname(relay.rigFile);
 const plot=measuredStageFixture();
 Object.values(plot.measurements.projectors).forEach(p=>p.y=2.7432);
 fs.writeFileSync(path.join(dir,'stage-plot.json'),JSON.stringify(plot));
 await writeVenueFixture(path.join(dir,'venue'));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url());});
  await page.goto(relay.base);await page.locator('[data-tab="stage"]').click();
  await page.locator('#stage-building[data-state="ready"]').waitFor();
  const roof=page.locator('[data-venue-roof]');assert.equal(await roof.getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#stage-building').getAttribute('data-roof-meshes'),'1');
  await roof.click();assert.equal(await roof.getAttribute('aria-pressed'),'true');await roof.click();
  await page.getByRole('button',{name:'Plan with this room',exact:true}).click();
  await page.locator('#stage-3d[data-state="ready"]').waitFor();
  await until(async()=>page.locator('#stage-3d three-d-stage').evaluate(stage=>!!stage._object.getObjectByName('Approximate venue reference')));
  assert.equal(await page.locator('#stage-alignment').isVisible(),true);
  assert.match(await page.locator('#stage-alignment').innerText(),/Approximate venue alignment/);
  const stage=page.locator('#stage-3d three-d-stage');
  assert.equal(await stage.evaluate(s=>s._object.getObjectByName('Approximate venue reference').position.z),.2);
  const physical=await stage.evaluate(s=>['A','B','C','D'].map(l=>s._object.children.find(o=>o.userData.lane===l).userData.enclosure));
  await page.locator('#stage-3d .pj-stage-camera').getByRole('button',{name:'Orbit',exact:true}).click();
  const wide=await stage.evaluate(s=>s._camera.position.distanceTo(s._controls.target));
  await page.locator('#stage-3d .pj-stage-camera').getByRole('button',{name:'Projectors',exact:true}).click();
  assert.ok(await stage.evaluate(s=>s._camera.position.distanceTo(s._controls.target))<wide);
  assert.deepEqual(await stage.evaluate(s=>['A','B','C','D'].map(l=>s._object.children.find(o=>o.userData.lane===l).userData.enclosure)),physical);
  assert.equal(await stage.evaluate(s=>s._object.children.filter(o=>o.isSprite&&o.material.sizeAttenuation===false).length),4);
  for(const lane of ['A','B','C','D']) {await page.locator(`[data-plan-lane="${lane}"]`).click();assert.equal(await page.locator(`[data-plan-lane="${lane}"]`).getAttribute('aria-pressed'),'true');}
  await page.locator('[data-room-axis="z"]').evaluate(el=>el.closest('details').open=true);
  await page.locator('[data-room-axis="z"]').fill('0.4');await page.locator('[data-room-axis="z"]').press('Tab');
  assert.equal(await stage.evaluate(s=>s._object.getObjectByName('Approximate venue reference').position.z),.4);
  await page.locator('[data-plan-lane="D"]').click();
  await page.locator('[data-plan-preset="26"]').click();
  await page.locator('[data-plan="distance"]').fill('42'); await page.locator('[data-plan="distance"]').press('Tab');
  const moved = await stage.evaluate(s => {
    const label = s._object.getObjectByName('D screen-size label');
    const body = s._object.getObjectByName('D SR Portal');
    const marker = s._object.getObjectByName('Proposed lens position and schematic enclosure');
    return { label: label.position.toArray(), bodyVisible: body.visible, marker: marker.position.toArray(), apex: s._object.getObjectByName('Local what-if proposal').children.at(-1).position.toArray() };
  });
  assert.equal(moved.bodyVisible,false);
  assert.ok(moved.label.every(Number.isFinite));
  assert.equal(moved.label[0],moved.apex[0]);assert.equal(moved.label[2],moved.apex[2]);assert.ok(Math.abs(moved.label[1]-moved.apex[1]-.3)<1e-9);
  await page.locator('#plan-reset').click();
  await page.locator('[data-stage-mode="reference"]').click();
  assert.equal(await stage.evaluate(s=>s._object.getObjectByName('D SR Portal').visible),true);
  await page.locator('[data-stage-mode="planning"]').click();
  for(const [width,height] of [[1440,900],[375,812]]) {
   await page.setViewportSize({width,height});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true);
   const out=process.env.EVIDENCE_DIR||path.join(__dirname,'../artifacts');fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,`stage-visibility-${width}-${height}.png`)});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log('Visibility: roof cutaway, explicit approximate room preview, projector focus, true enclosure sizes, screen-size labels, offline lane selection and no writes passed');
 } finally {await browser.close();await relay.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
