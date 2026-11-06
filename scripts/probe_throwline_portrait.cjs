'use strict';
// Portrait planning, saved jobs, handoff and rotated housing regression.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let base, browser;
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const target=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
  const mime={'.html':'text/html','.js':'text/javascript','.cjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(target)]||'application/octet-stream';
  fs.readFile(target,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime});res.end(error?'Not found':data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
  const chrome=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean).find(file=>fs.existsSync(file));
  if(!chrome)throw new Error('Set CHROME_BIN to the installed Chrome/Chromium executable.');
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('throwline:stage-onboarding:v1','complete'));
  const hash='v=4&u=ft&w=108&h=192&r=1.7777778%7C1920%7C1080&a=1.5&z=1.5&d=288&sb=0&lh=96&orientation=portrait-cw';
  await page.goto(`${base}/ProjectorThrow/#${hash}`);
  await page.waitForFunction(()=>document.querySelector('#stage3dLink').href.includes('orientation=portrait-cw'));
  assert.equal(await page.locator('#orientation').inputValue(),'portrait-cw');
  assert.match(await page.locator('#imageOut').textContent(),/image height/);
  const transfer=await page.locator('#stage3dLink').getAttribute('href');
  const params=new URL(transfer,`${base}/ProjectorThrow/`).searchParams;
  assert.equal(Number(params.get('basisW')),16);
  assert.ok(Math.abs(Number(params.get('rasterAr'))-16/9)<1e-5);
  await page.reload();
  assert.equal(await page.locator('#orientation').inputValue(),'portrait-cw');
  // Use explicit manual dimensions so the exported housing has asymmetric geometry.
  await page.goto(new URL(transfer+'&bw=4&bh=2&bd=3&lp=0.5',`${base}/ProjectorThrow/`).href);
  await page.waitForFunction(()=>document.querySelector('three-d-stage')._scene?.getObjectByName('rotated_projector_housing'));
  await page.evaluate(()=>document.querySelector('#saveScene').click());
  const initial=await page.evaluate(()=>{
    const api=window.ThrowlineSceneState,scene=api.normalizeSceneState(JSON.parse(localStorage.getItem(api.STORAGE_KEY)));
    const p=api.activeProjector(scene),g=api.calculateProjectorGeometry(scene);
    return {orientation:p.orientation,width:g.image.width,height:g.image.height,rotation:document.querySelector('three-d-stage')._scene.getObjectByName('rotated_projector_housing')?.rotation.z};
  });
  assert.equal(initial.orientation,'portrait-cw');assert.ok(Math.abs(initial.width-9)<1e-4);assert.ok(Math.abs(initial.height-16)<1e-4);assert.equal(initial.rotation,Math.PI/2);

  await page.evaluate(()=>{
    const api=window.ThrowlineSceneState,scene=api.stampFieldVerification(JSON.parse(localStorage.getItem(api.STORAGE_KEY)),{measuredDistance:24,measuredWidth:9,verifiedBy:'Test crew'});
    localStorage.setItem(api.STORAGE_KEY,JSON.stringify(scene));document.querySelector('#restoreScene').click();
  });
  const label=await page.evaluate(()=>{document.querySelector('#saveScene').click();return JSON.parse(localStorage.getItem(window.ThrowlineSceneState.STORAGE_KEY)).projectors[0].provenance.mode;});assert.equal(label,'field_verified');
  await page.evaluate(()=>{const el=document.querySelector('#orientation');el.value='portrait-ccw';el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.evaluate(()=>{document.querySelector('#saveScene').click();return JSON.parse(localStorage.getItem(window.ThrowlineSceneState.STORAGE_KEY)).projectors[0].provenance.mode;}),'manual');
  assert.equal(await page.evaluate(()=>document.querySelector('three-d-stage')._scene.getObjectByName('rotated_projector_housing').rotation.z),-Math.PI/2);
  const handoff=await page.evaluate(()=>{document.querySelector('#jobSheetOpen').click();return document.querySelector('#jsPlacement').textContent;});assert.match(handoff,/Portrait · counterclockwise 90°/);
  await page.evaluate(()=>document.querySelector('#jobSheetClose').click());
  assert.match(await page.locator('#sceneSummary').textContent(),/Portrait · counterclockwise 90°/);
  const downloadEvent=page.waitForEvent('download');
  await page.evaluate(()=>document.querySelector('#downloadHandoff').click());
  const download=await downloadEvent;
  const html=fs.readFileSync(await download.path(),'utf8');
  assert.match(html,/Portrait · counterclockwise 90°/);
  assert.match(html,/portrait-ccw/);
  await page.screenshot({path:'/tmp/throwline-portrait-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.screenshot({path:'/tmp/throwline-portrait-phone.png'});
  assert.deepEqual(errors,[]);
  console.log('Portrait planner, reload, Stage transfer, housing rotation, field invalidation, handoff and phone containment passed.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
