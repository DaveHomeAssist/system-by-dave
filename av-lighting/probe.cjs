const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  for(const viewport of [{width:1440,height:900},{width:375,height:812}]){
   const context=await browser.newContext({viewport});
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'index.html'));
   await page.getByRole('button',{name:'Add fixture'}).click();
   await page.locator('[name=unit]').fill('LX-01');
   await page.locator('[name=fixture]').fill('Wash');
   await page.locator('[name=position]').fill('Front truss');
   await page.locator('[name=universe]').fill('1');
   await page.locator('[name=address]').fill('101');
   await page.getByRole('button',{name:'Save plan'}).click();
   await page.reload();
   assert.equal(await page.locator('[name=unit]').inputValue(),'');
   await page.getByRole('button',{name:/LX-01/}).click();
   assert.equal(await page.locator('[name=unit]').inputValue(),'LX-01');
   await page.getByRole('button',{name:'Add fixture'}).click();
   await page.locator('[name=universe]').fill('1');
   await page.locator('[name=address]').fill('101');
   assert.equal(await page.locator('#conflicts').textContent(),'2');
   await page.locator('[data-tab=handoff]').click();
   await page.locator('#importInput').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
   await page.waitForFunction(() => document.getElementById('importPreview').textContent.includes('Import rejected'));
   assert.match(await page.locator('#importPreview').textContent(),/Import rejected/);
   assert.equal(await page.locator('#count').textContent(),'2');
   await page.evaluate(() => localStorage.setItem('lighting-patch.v1', JSON.stringify({schema:'system-by-dave.lighting-patch.v1',meta:{showName:'Legacy show'},items:[{id:'legacy-one',unit:'LEG-01',fixture:'Profile',position:'FOH',status:'focused'}]})));
   await page.getByRole('button',{name:'Review saved Lighting Patch'}).click();
   await page.waitForFunction(() => document.getElementById('confirmImport').hidden === false);
   assert.match(await page.locator('#importPreview').textContent(),/1 fixtures/);
   page.once('dialog',dialog=>dialog.accept());
   await page.getByRole('button',{name:'Replace plan with preview'}).click();
   assert.equal(await page.locator('#count').textContent(),'1');
   assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lighting-patch.v1')).items[0].unit),'LEG-01');
   const dimensions=await page.evaluate(()=>({h:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight,w:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
   assert.ok(dimensions.h<=dimensions.ch && dimensions.w<=dimensions.cw,JSON.stringify(dimensions));
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`/work/av-lighting-${viewport.width}.png`,fullPage:true});
   await context.close();
  }
  console.log('Lighting browser probe passed: save/reload, duplicate, invalid import, viewport bounds, screenshots');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
