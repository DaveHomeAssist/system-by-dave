'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const options={headless:true,args:['--no-sandbox']};if(process.env.CHROME_BIN)options.executablePath=process.env.CHROME_BIN;else if(process.env.CHROME_CHANNEL)options.channel=process.env.CHROME_CHANNEL;
 const browser=await chromium.launch(options),base=(process.env.BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,''),views=[],errors=[];
 for(const [width,height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]){
  const context=await browser.newContext({viewport:{width,height},colorScheme:'dark'}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  assert.equal((await page.goto(base+'/demos/')).status(),200);await page.waitForSelector('.public-shell');await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await page.locator('#demoTheme').click();await page.reload();await page.waitForSelector('.public-shell');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.getByRole('tab').first().focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{selected:true}).textContent(),'Frame sync');await page.keyboard.press('Home');assert.equal(await page.getByRole('tab',{selected:true}).textContent(),'Daily');
  await page.waitForTimeout(20);assert(await page.locator('[data-public-panel][hidden]').evaluateAll(nodes=>nodes.every(node=>node.tabIndex===-1)));
  for(const theme of ['light','dark']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#demoTheme').click();
   const contrast=await page.evaluate(()=>{const heading=document.querySelector('#demos h2'),card=heading.closest('.card');const lum=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const a=lum(getComputedStyle(heading).color),b=lum(getComputedStyle(card).backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});assert(contrast>=4.5,'Catalog heading contrast '+contrast);
   const tabs=page.getByRole('tab');assert.equal(await tabs.count(),4);
   for(let tab=0;tab<4;tab++){
    await tabs.nth(tab).click();const prev=page.getByRole('button',{name:'← Previous',exact:true}),next=page.getByRole('button',{name:'Next →',exact:true});while(await prev.isEnabled())await prev.click();
    const seen=new Map();let pages=0,total=[];
    for(;;){
     const state=await page.evaluate(()=>{
      const panel=document.querySelector('[role="tabpanel"]:not([hidden])'),frame=panel.querySelector('.public-frame').getBoundingClientRect();
      const text=[...panel.querySelectorAll('h1,h2,p,footer,.n,.fact,.eyebrow,a.go')].map((el,id)=>{const range=document.createRange();range.selectNodeContents(el);const rects=[...range.getClientRects()].filter(r=>r.width&&r.height);return {id,count:rects.length,visible:rects.map((r,i)=>({r,i})).filter(({r})=>r.left>=frame.left-1&&r.right<=frame.right+1&&r.top>=frame.top-1&&r.bottom<=frame.bottom+1).map(({i})=>i)};});
      const small=[...document.querySelectorAll('.public-shell button,.public-shell a')].filter(el=>el.getClientRects().length&&el.closest('[role="tabpanel"]')===null&&!el.disabled).filter(el=>{const r=el.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).map(el=>el.id||el.textContent);
      return {root:document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth,text,small};
     });assert(state.root,'Hub root overflow');assert.deepEqual(state.small,[],'Hub small targets');total=state.text;
     for(const item of state.text){if(!seen.has(item.id))seen.set(item.id,new Set());for(const line of item.visible)seen.get(item.id).add(line);}
     if(!await next.isEnabled())break;await next.click();assert(++pages<100,'Hub pagination did not terminate');
    }
    for(const item of total)assert.equal(seen.get(item.id)?.size,item.count,'Hub content clipped '+width+'x'+height+' tab '+tab+' element '+item.id);
    views.push({width,height,theme,tab,pages:pages+1,root:true,completeText:true});
   }
   await tabs.nth(0).click();const prev=page.getByRole('button',{name:'← Previous',exact:true});while(await prev.isEnabled())await prev.click();
   if(process.env.EVIDENCE_DIR)await page.screenshot({path:process.env.EVIDENCE_DIR+'/entry-'+width+'-'+height+'-'+theme+'.png'});
   await page.getByRole('link',{name:'Open calendar →',exact:true}).click();await page.waitForFunction(()=>window.signalLab);
   assert.equal(await page.locator('.app').getAttribute('data-workspace'),'calendar');assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   await page.locator('.appHeader a[href="/demos/"]').click();await page.waitForSelector('.public-shell');assert.equal(await page.getByRole('tab',{selected:true}).textContent(),'Daily');
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);const report={url:base+'/demos/',browser:browser.version(),views,errors};console.log(JSON.stringify({views:views.length,errors}));
 if(process.env.EVIDENCE_DIR)require('node:fs').writeFileSync(process.env.EVIDENCE_DIR+'/entry-results.json',JSON.stringify(report,null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
