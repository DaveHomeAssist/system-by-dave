'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const base=(process.env.BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,''),url=base+'/demos/engineering-daily/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']}),errors=[],views=[];
 for(const [width,height] of [[1440,900],[680,900],[375,812],[320,256],[3840,1080]]){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url);assert.equal(response.status(),200);await page.waitForFunction(()=>window.signalLab);
  assert.equal(await page.locator('.app').getAttribute('data-workspace'),'calendar');
  assert.equal(await page.locator('.dailySkip').getAttribute('href'),'#daily-main');
  assert(await page.locator('.appHeader a[href="/"]').isVisible());assert(await page.locator('.appHeader a[href="/demos/"]').isVisible());
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>{setTheme(theme);search='optical';document.getElementById('search').value=search;renderList();display(facts[0]);showWorkspace('archive');},theme);
   assert(await page.locator('#selectionContext').isVisible());await page.locator('#revealSelection').click();
   assert.equal(await page.locator('#search').inputValue(),'');assert(await page.locator('#selectionContext').isHidden());
   await page.evaluate(()=>{showWorkspace('reader');setReaderTab('fact');});await page.waitForTimeout(30);
   const complete=await page.evaluate(()=>{
    const expected='Fact: '+selected.fact+' Why it matters: '+selected.why+' Practical takeaway: '+selected.takeaway;
    const parts=[];textIndex=0;paginateText();for(let i=0;i<textPages.length;i++){textIndex=i;paginateText();parts.push(document.getElementById('readerText').textContent);}return parts.join(' ')===expected;
   });assert(complete);
   await page.evaluate(()=>{showWorkspace('lab');signalLab.setPage('controls');});
   await page.selectOption('#labMode','redundancy');if(await page.locator('#labFailure').getAttribute('aria-pressed')==='true')await page.locator('#labFailure').click();await page.locator('#labFailure').click();
   assert.match(await page.locator('#labControlCondition').textContent(),/interrupted/);
   assert.equal(await page.locator('#labControlOutcome').textContent(),'Illustrated output: '+await page.locator('#labReadout').textContent());
   const bounds=await page.evaluate(()=>{
    const shell=document.querySelector('.labShell').getBoundingClientRect();
    const clipped=[...document.querySelectorAll('.labBar button,.labBar select,.labControls button,.labControls input,#labControlOutcome')].filter(el=>el.getClientRects().length).filter(el=>{const r=el.getBoundingClientRect();return r.top<shell.top-1||r.bottom>shell.bottom+1||r.left<shell.left-1||r.right>shell.right+1;}).map(el=>el.id||el.textContent);
    return {root:document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth,headerTop:document.querySelector('.appHeader').getBoundingClientRect().top,clipped};
   });assert(bounds.root);assert(bounds.headerTop>=0,'Header scrolled out of view '+width+'x'+height);assert.deepEqual(bounds.clipped,[],'Clipped controls '+width+'x'+height);
   views.push({width,height,theme,...bounds});
   if(process.env.EVIDENCE_DIR)await page.screenshot({path:process.env.EVIDENCE_DIR+'/public-'+width+'-'+height+'-'+theme+'.png'});
  }
  const href=await page.locator('#selectedStory').getAttribute('href'),png=await page.request.get(new URL(href,url).href),bytes=await png.body();
  assert.equal(png.status(),200);assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert.equal(bytes.readUInt32BE(16),1080);assert.equal(bytes.readUInt32BE(20),1920);
  await page.reload();await page.waitForFunction(()=>window.signalLab);assert.equal(await page.locator('#labMode').inputValue(),'redundancy');assert.match(await page.locator('#labControlCondition').textContent(),/interrupted/);
  await page.close();
 }
 assert.deepEqual(errors,[]);const report={url,browser:browser.version(),views,errors};console.log(JSON.stringify(report));
 if(process.env.EVIDENCE_DIR)require('node:fs').writeFileSync(process.env.EVIDENCE_DIR+'/public-results.json',JSON.stringify(report,null,2));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
