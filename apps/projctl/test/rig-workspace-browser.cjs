const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const{startRelay}=await import('./relay-helper.js');const relay=await startRelay();const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const snapshot=await relay.state();for(const p of snapshot.projectors){p.lane={P1:'C',P2:'B',P3:'',P4:'D'}[p.slot];p.status.online=false;p.displayInfo={slot:p.slot,scope:'projector',input:{state:'offline',value:'32',label:'HDMI',observedAt:'2026-11-06T04:00:00Z'},signal:{state:'unsupported',value:null},edid:{state:'unsupported',value:null,reason:'EDID is not read by this driver.'}};}
  for(const[width,height]of[[1440,900],[375,812]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[],writes=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
   let relaySocket;await page.routeWebSocket('**/ws',ws=>{relaySocket=ws;ws.send(JSON.stringify(snapshot));});
   await page.route('https://avbydave.com/ProjectorThrow/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Canonical Throwline test fixture</h1><label>Distance<input value="38.5"></label>'}));
   await page.goto(relay.base);await page.locator('#tab-home.on').waitFor();
   assert.deepEqual(await page.locator('[data-primary-nav]').evaluateAll(nodes=>nodes.map(n=>n.childNodes[0].textContent.trim())),['My Projector Rig','3D Stage View','Presets','Log','Configuration','Throw Calc']);
   await page.locator('#tab-btn-rig').click();await page.locator('#grid [data-lane="B"] [data-open-projector]').click();
   await page.locator('#tab-projector.on').waitFor();assert.match(await page.locator('#projector-detail-title').innerText(),/^B/);
   assert.equal(await page.locator('#projector-controls [data-reset-input]').isDisabled(),true);
   assert.match(await page.locator('#projector-display-info').innerText(),/HDMI/);assert.match(await page.locator('#projector-display-info').innerText(),/EDID is not read/);assert.match(await page.locator('#projector-display-info').innerText(),/Last known/);
   await page.locator('[data-detail-lane="A"]').click();assert.match(await page.locator('#projector-detail-title').innerText(),/^A/);assert.match(await page.locator('#projector-controls').innerText(),/No assigned live device/);
   await page.locator('#projector-static-info').filter({hasText:'ET-DLE170'}).waitFor();
   for(const lane of ['B','C','D']){await page.locator(`[data-detail-lane="${lane}"]`).click();assert.match(await page.locator('#projector-detail-title').innerText(),new RegExp('^'+lane));}
   await page.locator('#tab-btn-info').click();await page.locator('[data-reference-view="catalog"]').click();await page.locator('.fr-search input').fill('ET-DLE150');
   assert.match(await page.locator('[data-catalog-count]').innerText(),/^1 documented/);assert.match(await page.locator('[data-catalog-results]').innerText(),/1.36–1.98/);
   await page.locator('[data-reference-view="flow"]').click();assert.match(await page.locator('#reference-view').innerText(),/Patch and transport unknown/);
   const relayNode=page.locator('[data-flow-relay]');assert.equal(await relayNode.getAttribute('data-status'),'verified');
   const originalRelay=await relayNode.elementHandle();relaySocket.close();await relayNode.filter({hasText:'Live relay status unavailable'}).waitFor();assert.equal(await relayNode.getAttribute('data-status'),'unknown');
   await relayNode.filter({hasText:'Connected now'}).waitFor();assert.equal(await relayNode.getAttribute('data-status'),'verified');assert.equal(await relayNode.evaluate((node,old)=>node===old,originalRelay),true,'connection updates keep the open flow view in place');
   await page.locator('.fr-flow-node[data-open-lane="B"]').click();assert.match(await page.locator('#projector-detail-title').innerText(),/^B/);
   await page.locator('#tab-btn-throw').click();assert.equal(await page.locator('#throw-calc-frame').getAttribute('src'),'https://avbydave.com/ProjectorThrow/');await page.frameLocator('#throw-calc-frame').getByRole('heading').waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
   const out=process.env.EVIDENCE_DIR||path.join(__dirname,'../artifacts');fs.mkdirSync(out,{recursive:true});await page.locator('#tab-btn-rig').click();await page.locator('#grid [data-lane="D"] [data-open-projector]').click();await page.screenshot({path:path.join(out,`rig-workspace-${width}-${height}.png`)});
   assert.deepEqual(errors,[]);assert.deepEqual(writes,[],'navigation/reference/offline detail never sends setters');await page.close();
  }
  const page=await browser.newPage();const calls=[];let socket;
  const online=structuredClone(snapshot);online.lock=false;online.presets=[{name:'Lens fixture',perSlot:{P1:{lens:{h:.2},power:true,shutter:'open',input:'HDMI'}}}];online.projectors.find(p=>p.slot==='P1').capabilities={lensRecall:true};
  await page.routeWebSocket('**/ws',ws=>{socket=ws;ws.send(JSON.stringify(online));});
  await page.route('**/api/preset/recall',route=>{calls.push(route.request().postDataJSON());return route.fulfill({contentType:'application/json',body:JSON.stringify(calls.length===1?{confirm:'fixture-token',message:'Confirm lens recall'}:{projectors:{P1:{position:'match',motors:'unknown'}}})});});
  await page.goto(relay.base);await page.locator('#tab-btn-presets').click();await page.locator('[data-recall]').click();
  assert.deepEqual(calls,[{name:'Lens fixture'}]);await page.locator('[data-recall]').filter({hasText:'Confirm lens recall'}).waitFor();
  // A fresh snapshot rebuilds presets: the explicit confirmation must retain its token.
  socket.send(JSON.stringify(online));await page.locator('[data-recall]').filter({hasText:'Confirm lens recall'}).click();assert.deepEqual(calls[1],{name:'Lens fixture',confirmLens:'fixture-token'});
  await page.locator('[role=status]').filter({hasText:'match'}).waitFor();
  await page.locator('#tab-btn-rig').click();await page.locator('#grid [data-lane=D] [data-open-projector]').click();
  const d=online.projectors.find(p=>p.lane==='D');socket.send(JSON.stringify({type:'status',slot:d.slot,status:d.status,displayInfo:{...d.displayInfo,input:{state:'offline',label:'Updated fixture input',value:'new',observedAt:'2026-11-06T05:00:00Z'}}}));
  await page.locator('#projector-display-info').filter({hasText:'Updated fixture input'}).waitFor();await page.close();
  console.log('Rig workspace: six menus, offline/unassigned A–D details, truthful EDID, catalog, signal flow, embedded Throw Calc and zero writes passed');
 }finally{await browser.close();await relay.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
