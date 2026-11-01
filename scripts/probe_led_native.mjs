import assert from 'node:assert/strict';
import {verifyLEDReachability} from './probe_led_reachability.mjs';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('.');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const seed={delayDistance:123,ledCabinetsWide:9,ledCabinetsHigh:4,ledCabinetPixelsWide:172,ledCabinetPixelsHigh:172,ledCabinetWidthMm:500,ledCabinetHeightMm:500,ledPitchMm:2.9,ledPowerFactor:0.9,ledPowerFactorEntered:true};
const results=['ledPreviewArray','ledNativeRaster','ledWallDimensions','ledPower','ledContentFit'];
const readResults=page=>page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.textContent])),results);
const errors=[];
async function reveal(page, locator) {
  const previous=page.locator('.console-panel .led-native-pages button').first();
  while(!await locator.isVisible()&&!await previous.isDisabled())await previous.click();
  const next=page.locator('.console-panel .led-native-pages button').last();
  for(let n=0;!await locator.isVisible()&&n<40&&!await next.isDisabled();n++)await next.click();
  assert.equal(await locator.isVisible(),true,'requested LED control is on a reachable page');
}
try{
  const standalone=await browser.newPage();
  await standalone.addInitScript(value=>localStorage.setItem('avCalculator.v1',JSON.stringify(value)),seed);
  await standalone.goto(`${base}/led-wall-calculator.html`);
  await standalone.waitForFunction(()=>document.querySelector('#ledNativeRaster')?.textContent.includes('1,548'));
  const expected=await readResults(standalone);
  for(const type of ['profile','layout','data','power','results','tools','preview']){
    const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
    await context.addInitScript(({seed,type})=>{
      if(!localStorage.getItem('avCalculator.v1'))localStorage.setItem('avCalculator.v1',JSON.stringify(seed));
      localStorage.setItem('sbd.avSuite.intro.v1','true');
      if(!localStorage.getItem('sbd.avSuite.workspace.v1'))localStorage.setItem('sbd.avSuite.workspace.v1',JSON.stringify({version:1,views:[{id:'led:fixture',name:'LED fixture',panels:[{id:'led-fixture',type:`led:${type}`,x:0,y:0,w:12,h:8}]}]}));
    },{seed,type});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/av/?app=led`);
    await page.locator('.console-panel .led-native-leaf').waitFor();
    assert.equal(await page.locator('.console-panel iframe').count(),0,`${type} is native`);
    assert.deepEqual(await readResults(page),expected,`${type} retains standalone results`);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('avCalculator.v1')).delayDistance),123,'unrelated calculator value retained');
    for(const [width,height] of [[1440,900],[375,812],[3840,1080]]){
      await page.setViewportSize({width,height});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true,`${type} root containment ${width}`);
      if(process.env.LED_NATIVE_EVIDENCE && ['profile','preview'].includes(type) && width===375){await mkdir(process.env.LED_NATIVE_EVIDENCE,{recursive:true});await page.screenshot({path:`${process.env.LED_NATIVE_EVIDENCE}/${type}-phone.png`});}
      if(type==='layout'){
        const field=page.locator('.console-panel #ledCabinetsWide');
        for(let n=0;!await field.isVisible()&&n<20;n++){await page.getByRole('button',{name:'Next',exact:true}).click();}
        await field.fill('10');await field.dispatchEvent('change');
        await page.waitForFunction(()=>JSON.parse(localStorage.getItem('avCalculator.v1')).ledCabinetsWide===10);
        assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('avCalculator.v1')).delayDistance),123);
      }
    }
    if(type==='layout'){await page.reload();await page.locator('.console-panel .led-native-leaf').waitFor();assert.equal(await page.locator('#ledCabinetsWide').inputValue(),'10','acknowledged layout input survives reload');}
    if(type==='tools'){
      await page.locator('.console-panel #saveLedPresetBtn').click();
      const downloadWait=page.waitForEvent('download');await page.locator('.console-panel #downloadLedSummaryBtn').click();const download=await downloadWait;assert.equal(download.suggestedFilename(),'led-wall-configuration.txt');assert.match(await readFile(await download.path(),'utf8'),/LED/);
      assert.ok(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('avCalculator.ledProfiles.v1'))).length>0),'preset save retained');
    }
    if(type==='results'){
      await reveal(page,page.getByText('Power / Viewing / Assumptions',{exact:true}));
      await page.getByText('Power / Viewing / Assumptions',{exact:true}).click();
      await page.locator('.console-panel #sendLedTypicalPowerBtn').click();
      await page.waitForURL('**/av-calculator.html?app=led#powerCard');
      assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('avCalculator.v1')).deviceWatts>0),'power handoff persists the calculated wattage');
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('avCalculator.v1')).delayDistance),123);
    }
    if(type==='preview')assert.equal(await page.locator('.console-panel #ledWallPreview canvas').count(),1,'original viewer initialized once');
    await context.close();
  }
  const legacy=await browser.newContext({serviceWorkers:'block'});
  const oldViews=JSON.stringify({version:1,views:[{id:'tool:led-wall-calculator',name:'Saved LED',panels:[{id:'legacy-led',type:'tool:led-wall-calculator',x:0,y:0,w:12,h:8}]}]});
  const oldLayout=JSON.stringify({v:1,viewId:'tool:led-wall-calculator',locked:false,live:{'tool:led-wall-calculator':[{id:'legacy-led',type:'tool:led-wall-calculator',x:0,y:0,w:12,h:8}]}});
  await legacy.addInitScript(({oldViews,oldLayout})=>{localStorage.setItem('sbd.avSuite.workspace.v1',oldViews);localStorage.setItem('sbd.avSuite.layout.v1',oldLayout);},{oldViews,oldLayout});
  const oldPage=await legacy.newPage();await oldPage.goto(`${base}/av/?app=led-wall-calculator`);await oldPage.locator('.console-panel #ledCabinetsWide').waitFor();
  assert.equal(await oldPage.locator('.console-panel iframe').count(),0);assert.equal(await oldPage.evaluate(()=>localStorage.getItem('sbd.avSuite.workspace.v1')),oldViews);assert.equal(await oldPage.evaluate(()=>localStorage.getItem('sbd.avSuite.layout.v1')),oldLayout);await legacy.close();
  const offline=await browser.newContext({serviceWorkers:'allow'});
  const offlinePage=await offline.newPage();await offlinePage.goto(`${base}/av/?app=led`);
  await offlinePage.locator('.console-panel .led-native-leaf').waitFor();
  await offlinePage.evaluate(async()=>{await navigator.serviceWorker.register('/av-suite-worker.js');await navigator.serviceWorker.ready;});
  await offlinePage.waitForFunction(async()=>{
    const names=await caches.keys();const name=names.find(n=>n==='sbd-av-suite-v20261030-led-native-panels');
    return Boolean(name&&await(await caches.open(name)).match('/av/assets/av-suite-_led-native.js'));
  },null,{timeout:30000});
  await offline.setOffline(true);await offlinePage.reload();await offlinePage.locator('.console-panel .led-native-leaf').waitFor();
  assert.equal(await offlinePage.locator('.console-panel iframe').count(),0,'native LED pack reopens offline');await offline.close();
  await verifyLEDReachability(browser,base);
  assert.deepEqual(errors,[]);
  console.log('LED native: seven native panels, standalone calculation parity, unrelated saved values and three viewport shells passed.');
}finally{await browser.close();server.close();}
