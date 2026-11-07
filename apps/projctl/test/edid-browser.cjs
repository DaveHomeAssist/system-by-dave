const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 for(const width of [1440,680,375]){
 const page=await browser.newPage({viewport:{width,height:812}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://fixture/**',r=>r.fulfill({contentType:r.request().url().endsWith('.js')?'text/javascript':'text/html',body:r.request().url().endsWith('.js')?fs.readFileSync(require('node:path').join(__dirname,'../public/display-readout.js'),'utf8'):'<style>body{margin:0;height:100dvh;overflow:hidden}#panel{height:100%;overflow:auto;overflow-wrap:anywhere}button{min-height:44px}</style><main id="panel"></main>'}));
 await page.goto('http://fixture/');
 await page.evaluate(async()=>{const {renderHostDisplays}=await import('/display-readout.js');window.draw=renderHostDisplays;window.report={host:'fixture',state:'reported',collectedAt:new Date().toISOString(),displays:[{name:'Test display',resolution:'1920 x 1080 @ 60Hz',edid:{state:'reported',fingerprint:'a'.repeat(64),detailedTimings:[{width:1920,height:1080,refreshHz:60,preferred:true}]}}],edidRecords:[]};draw(document.querySelector('#panel'),report)});
 await page.getByRole('button',{name:'Save comparison baseline'}).click();assert.match(await page.locator('[role=status]').innerText(),/saved/);
 await page.evaluate(()=>draw(document.querySelector('#panel'),report));assert.match(await page.locator('[role=status]').innerText(),/Matches/);
 await page.reload();await page.evaluate(async()=>{const {renderHostDisplays}=await import('/display-readout.js');renderHostDisplays(document.querySelector('#panel'),{host:'fixture',state:'reported',displays:[]})});assert.match(await page.locator('[role=status]').innerText(),/changed/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));assert.deepEqual(errors,[]);await page.close();
 }console.log('EDID panel: save/reload/change and 1440/680/375 containment passed');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
