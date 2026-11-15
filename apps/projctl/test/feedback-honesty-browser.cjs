const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {selectLane,selectView}=require('./operator-ui.cjs');
(async()=>{
 const {startRelay,until}=await import('./relay-helper.js');
 const relay=await startRelay(), browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const state=await relay.state(); state.projectors.forEach((p,i)=>p.lane='ABCD'[i]);
  const p=state.projectors[0];
  p.status={...p.status,power:'on',shutter:'closed',input:'32',pattern:null,errors:null};
  p.status.connection.lastSuccessAt=new Date().toISOString();
  let socket, commands=0;
  const page=await browser.newPage({viewport:{width:1440,height:900}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.routeWebSocket('**/ws',ws=>{socket=ws;ws.send(JSON.stringify(state));});
  await page.route('**/api/command',async route=>{
   commands++;
   await route.fulfill({json:{[p.slot]:{result:'OK',status:{...p.status,power:'off',updatedAt:'2000-01-01T00:00:00Z'}}}});
  });
  await page.goto(relay.base);
  const card=page.locator('#grid [data-lane=A]');
  await card.waitFor();
  assert.match(await card.locator('.operator-patterns').innerText(),/Not reported/i);
  assert.match(await card.locator('.operator-status').innerText(),/Alarms not reported/);
  assert.equal(await card.locator('[data-action=power][data-value="1"]').isDisabled(),true);
  await card.locator('[data-action=shutter][data-value="0"]').click();
  await card.locator('.operator-feedback').filter({hasText:'Request accepted'}).waitFor();
  assert.equal(await card.locator('.operator-power-state').getAttribute('data-power-state'),'on','late command response cannot overwrite newer telemetry');
  p.status={...p.status,power:'on',pattern:'08',errors:{lamp:2},online:false,connection:{state:'reconnecting',lastSuccessAt:new Date(Date.now()-90000).toISOString()}};
  socket.send(JSON.stringify({type:'status',slot:p.slot,status:p.status}));
  await until(async()=>(await card.locator('.operator-power-state').getAttribute('data-power-state'))==='unknown');
  assert.match(await card.innerText(),/Last reported power: on/);
  assert.match(await card.locator('.operator-patterns').innerText(),/last known/i);
  assert.match(await card.locator('.operator-readback').innerText(),/last known/i);
  assert.match(await card.locator('.operator-alert').innerText(),/Last known Fault/i);
  assert.equal(await card.locator('[data-action=pattern][aria-pressed=true]').count(),0);
  await selectLane(page,'A');
  await page.locator('#projector-patterns .pj-dc-state').filter({hasText:'last known'}).waitFor();
  assert.equal(await page.locator('#projector-patterns [aria-pressed=true]').count(),0);
  await page.locator('#projector-back').click();
  await selectView(page,'rig');
  // A fresh connection can still carry an individually stale field.
  p.status={...p.status,online:true,stale:['pattern','errors','power'],connection:{state:'online',lastSuccessAt:new Date().toISOString()}};
  socket.send(JSON.stringify({type:'status',slot:p.slot,status:p.status}));
  await selectLane(page,'A');
  await page.locator('#projector-patterns .pj-dc-state').filter({hasText:'last known'}).waitFor();
  assert.equal(await page.locator('#projector-patterns [aria-pressed=true]').count(),0);
  await page.locator('#projector-back').click();
  assert.equal(commands,1,'only the deliberate mocked click issued a request');
  if(process.env.EVIDENCE_DIR){fs.mkdirSync(process.env.EVIDENCE_DIR,{recursive:true});await page.screenshot({path:process.env.EVIDENCE_DIR+'/last-known.png'});}
  assert.deepEqual(errors,[]);
  await page.close();
  const monitor=await browser.newPage();
  p.status={...p.status,stale:[],online:true,power:'off',pattern:null,shutter:'unknown',errors:null,connection:{state:'online',lastSuccessAt:new Date().toISOString()}};
  await monitor.routeWebSocket('**/ws',ws=>ws.send(JSON.stringify(state)));
  await monitor.goto(relay.base+'/monitor/');
  await monitor.waitForFunction(()=>document.querySelector('[data-relay-word]')?.textContent.includes('live'));
  const lane=await monitor.evaluate(async()=>{const {laneModels}=await import('/monitor/monitor.js');const v=laneModels().A;return {power:v.power,pattern:v.pattern,shutter:v.shutter};});
  assert.equal(lane.power,'OFF');assert.equal(lane.pattern,'Not reported');assert.equal(lane.shutter,'Unknown');
  console.log('Feedback honesty passed: missing values, cached alarms/input/pattern, late HTTP response, repeated power-on disabled, Monitor unknown state');
 }finally{await browser.close();await relay.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
