const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const {startRelay,until}=await import('./relay-helper.js');
 const {measuredStageFixture}=await import('./stage-fixture.js');
 const {writeVenueFixture,fixtureGLB}=await import('./venue-fixture.js');
 const relay=await startRelay(); const dir=path.dirname(relay.rigFile);
 const plot=measuredStageFixture();
 Object.values(plot.measurements.projectors).forEach(p=>p.y=2.7432);
 fs.writeFileSync(path.join(dir,'stage-plot.json'),JSON.stringify(plot));
 await writeVenueFixture(path.join(dir,'venue'),fixtureGLB(undefined,['Side auditorium wall','V3 mezzanine terrace 1','Orchestra center row 1','Upper mezzanine center row 1','Stage deck']));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url());});
  await page.goto(relay.base);await page.locator('[data-tab="stage"]').click();
  await page.locator('#stage-3d[data-state="ready"]').waitFor();
  const stage=page.locator('#stage-3d three-d-stage');
  await until(async()=>stage.evaluate(s=>!!s._object.getObjectByName('Approximate venue reference')));
  assert.equal(await page.locator('[data-stage-mode="reference"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#stage-planner').isVisible(),false);
  assert.equal(await page.locator('[data-stage-view="building"]').textContent(),'Room + projectors');
  assert.equal(await stage.evaluate(s=>s._object.children.filter(o=>o.isSprite&&o.visible).length),4);
  assert.equal(await page.locator('#stage-3d').getAttribute('data-camera-preset'),'Stage');
  const opening = await stage.evaluate(s => {
    const points = [];
    for (const group of s._object.children.filter(o=>o.name.endsWith('drawing coverage'))) {
      for (const object of group.children) {
        const positions = object.geometry.attributes.position;
        for (let i=0;i<positions.count;i++) points.push(new s._THREE.Vector3().fromBufferAttribute(positions,i).project(s._camera));
      }
    }
    return {towardStage:s._camera.position.z>s._controls.target.z,contained:points.every(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1)};
  });
  assert.deepEqual(opening,{towardStage:true,contained:true},'opening view faces the stage and contains every beam');
  const roof=page.locator('#stage-3d [data-venue-roof]');assert.equal(await roof.getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#stage-3d').getAttribute('data-roof-meshes'),'1');
  await roof.click();assert.equal(await roof.getAttribute('aria-pressed'),'true');await roof.click();
  await page.locator('[data-stage-mode="planning"]').click();
  assert.equal(await page.locator('#stage-alignment').isVisible(),true);
  assert.match(await page.locator('#stage-alignment').innerText(),/Approximate venue alignment/);
  assert.equal(await stage.evaluate(s=>s._object.getObjectByName('Approximate venue reference').position.z),.2);
  const physical=await stage.evaluate(s=>['A','B','C','D'].map(l=>s._object.children.find(o=>o.userData.lane===l).userData.enclosure));
  await page.locator('#stage-3d .pj-stage-camera').getByRole('button',{name:'Coverage',exact:true}).click();
  const fill = await stage.evaluate(s => {
    const selected=s.parentElement.dataset.planningLane, points=[];
    s._object.updateMatrixWorld(true);
    const add=mesh=>{const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)points.push(new s._THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).project(s._camera));};
    s._object.children.filter(o=>o.name.endsWith('drawing coverage')&&!o.name.startsWith(selected+' ')).forEach(o=>add(o.children[0]));
    const proposal=s._object.getObjectByName('Local what-if proposal');if(proposal.children.length)add(proposal.children[0]);
    return Math.max((Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))/2,(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))/2);
  });
  assert.ok(fill>.7&&fill<=1.001,`coverage must fill viewport, got ${fill}`);
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
  await page.locator('#stage-3d .pj-stage-camera').getByRole('button',{name:'Selected side',exact:true}).click();
  const sideAngle=await stage.evaluate(s=>{
    const proposal=s._object.getObjectByName('Local what-if proposal'),apex=proposal.children.at(-1).position;
    const attr=proposal.children[0].geometry.attributes.position,center=new s._THREE.Vector3();
    for(let i=0;i<attr.count;i++)center.add(new s._THREE.Vector3().fromBufferAttribute(attr,i));center.multiplyScalar(1/attr.count);
    const beam=center.sub(apex),eye=s._camera.position.clone().sub(s._controls.target);
    return Math.abs((beam.x*eye.x+beam.z*eye.z)/(Math.hypot(beam.x,beam.z)*Math.hypot(eye.x,eye.z)));
  });
  assert.ok(sideAngle<.00001,`side camera must be perpendicular to beam, got ${sideAngle}`);
  const cameraBefore = await stage.evaluate(s=>({position:s._camera.position.toArray(),target:s._controls.target.toArray()}));
  await page.locator('[data-room-axis="x"]').fill('1');await page.locator('[data-room-axis="x"]').press('Tab');
  assert.deepEqual(await stage.evaluate(s=>({position:s._camera.position.toArray(),target:s._controls.target.toArray()})),cameraBefore);
  await page.locator('[data-plan="distance"]').fill('43');await page.locator('[data-plan="distance"]').press('Tab');
  assert.deepEqual(await stage.evaluate(s=>({position:s._camera.position.toArray(),target:s._controls.target.toArray()})),cameraBefore);
  await page.locator('[data-plan-lane="A"]').click();
  assert.equal(await stage.evaluate(s=>s._object.getObjectByName('Local what-if proposal').visible),false,'a D side view must not show the new A proposal');
  assert.deepEqual(await stage.evaluate(s=>({position:s._camera.position.toArray(),target:s._controls.target.toArray()})),cameraBefore);
  const layers=page.locator('#stage-3d .pj-room-layers');await layers.locator('summary').click();
  const visible= name=>stage.evaluate((s,name)=>{let found; s._object.getObjectByName('Approximate venue reference').traverse(o=>{if((o.userData.name||o.name).replace(/_/g,' ')===name)found=o;});return found?.visible;},name);
  await layers.locator('[data-room-layer="walls"]').click();assert.equal(await visible('Side auditorium wall'),false);
  await layers.locator('[data-room-layer="balcony"]').click();assert.equal(await visible('V3 mezzanine terrace 1'),false);assert.equal(await visible('Stage deck'),true);
  await page.locator('#stage-3d .pj-stage-camera').getByRole('button',{name:'Plan',exact:true}).click();assert.equal(await visible('V3 mezzanine terrace 1'),false);
  await layers.locator('[data-room-layer="seats"]').click();assert.equal(await visible('Orchestra center row 1'),false);
  await layers.locator('[data-room-layer="room"]').click();assert.equal(await stage.evaluate(s=>s._object.getObjectByName('Approximate venue reference').visible),false);
  assert.equal(await page.locator('#stage-3d').getAttribute('data-camera-preset'),'Plan');
  assert.equal(await stage.evaluate(s=>s._object.getObjectByName('Local what-if proposal').visible),true);
  await layers.locator('[data-room-layer="restore"]').click();assert.equal(await visible('Side auditorium wall'),true);assert.equal(await visible('Stage deck'),true);
  await layers.locator('summary').click();
  await page.locator('#stage-3d .pj-stage-camera').getByRole('button',{name:'Reset view',exact:true}).click();
  assert.equal(await page.locator('[data-plan="distance"]').inputValue()!== '',true);
  for(const [width,height] of [[1440,900],[680,900],[375,812]]) {
   await page.setViewportSize({width,height});
   await layers.locator('summary').click();
   const menuFit = await page.locator('.pj-room-layer-panel').evaluate(panel=>{
     const p=panel.getBoundingClientRect(),d=panel.closest('.pj-stage-drawing').getBoundingClientRect();
     return p.left>=d.left&&p.right<=d.right&&p.top>=d.top;
   });
   assert.equal(menuFit,true,`room menu stays inside the drawing at ${width}`);
   await layers.locator('summary').press('Escape');
   assert.equal(await layers.getAttribute('open'),null);
   await page.locator('[data-room-axis="x"]').fill('0.5');
   await page.locator('[data-room-axis="x"]').press('Tab');
   const fieldFit=await page.locator('[data-room-axis="x"]').evaluate(input=>{
     const field=input.getBoundingClientRect(),label=input.previousElementSibling.getBoundingClientRect();
     return label.bottom<=field.top&&field.left>=0&&field.right<=innerWidth;
   });
   assert.equal(fieldFit,true,'expanded room alignment keeps label and field separate');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true);
   const out=process.env.EVIDENCE_DIR||path.join(__dirname,'../artifacts');fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,`stage-visibility-${width}-${height}.png`)});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log('Visibility: roof cutaway, explicit approximate room preview, projector focus, true enclosure sizes, screen-size labels, offline lane selection and no writes passed');
 } finally {await browser.close();await relay.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
