import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import {chromium} from 'playwright';
import worker from '../dist/server/index.js';
import {destinations,opening} from '../navigation/model.mjs';

const env={DB:{prepare(){return {all:async()=>({results:[]})};}}};
const out=new URL('../navigation-evidence/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{
  try{
    assert(['GET','HEAD'].includes(req.method),'Browser navigation must stay read only');
    const result=await worker.fetch(new Request('https://wst.housevideo.app'+req.url,{method:req.method}),env);
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch(e){res.writeHead(500);res.end(e.message);}
});
await new Promise(resolve=>server.listen(8875,'127.0.0.1',resolve));
let executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH||chromium.executablePath();
try{await fs.access(executablePath);}catch{const cached=(await fs.readdir('/ms-playwright')).find(name=>/^chromium-/.test(name));executablePath='/ms-playwright/'+cached+'/chrome-linux64/chrome';await fs.access(executablePath);}
console.log('Using verified Chromium:',executablePath);
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
  const sizes=[{width:1440,height:900},{width:375,height:812},{width:680,height:900},{width:2560,height:1080},{width:375,height:568}];
  for(const viewport of sizes)for(const theme of ['light','dark']){
    const context=await browser.newContext({viewport,reducedMotion:'reduce',serviceWorkers:'block'});
    await context.addInitScript(theme=>{try{localStorage.setItem('frozen.theme.v1',theme);}catch{/* Opaque blocked frames have no storage. */}},theme);
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.hostname!=='wst.housevideo.app'){await route.abort();return;}
      const response=await fetch('http://127.0.0.1:8875'+u.pathname+u.search);
      const headers=Object.fromEntries(response.headers);delete headers['content-length'];delete headers['transfer-encoding'];delete headers['content-encoding'];
      await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    for(const path of ['/#home','/handoff.html','/run-review/','/stage/index.html','/scenic/']){
      await page.goto('https://wst.housevideo.app'+path,{waitUntil:'domcontentloaded'});
      await page.locator('[data-wst-header] .wst-nav a').last().waitFor();
      await page.waitForFunction(()=>document.readyState==='complete');
      assert.deepEqual(await page.locator('.wst-nav [data-nav-key]').evaluateAll(nodes=>nodes.map(n=>n.dataset.navKey)),destinations.map(d=>d.id),path+' ordered destinations');
      assert.equal(await page.locator('.wst-nav [aria-current="page"]').count(),1,path+' active state');
      const bounds=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));
      assert(bounds.scrollWidth<=bounds.width+1,path+' horizontal overflow '+JSON.stringify(bounds));
      assert(bounds.scrollHeight<=bounds.height+1,path+' vertical overflow '+JSON.stringify(bounds));
      const small=await page.locator('.wst-nav a,.wst-header button').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<43.5||r.height<43.5);}).map(n=>n.textContent));
      assert.deepEqual(small,[],path+' touch targets');
      const layout=await page.locator('[data-wst-header]').evaluate(header=>{const top=header.querySelector('.wst-header-top').getBoundingClientRect(),nav=header.querySelector('.wst-nav').getBoundingClientRect(),outer=header.getBoundingClientRect();return {topBottom:top.bottom,navTop:nav.top,height:outer.height};});
      assert(layout.navTop>=layout.topBottom-1,path+' navigation is below the shared brand and utility row '+JSON.stringify(layout));
      assert(layout.height>=95,path+' shared header retains its layout');
      if(path==='/run-review/'){
        assert((await page.locator('nav.tabs').boundingBox()).height<70,'Review tabs do not consume a flexible content row');
        assert((await page.locator('#shell>main').boundingBox()).height>Math.min(160,viewport.height*.25),'Review retains the capture workspace');
      }

      assert.equal(await page.locator('html').getAttribute('data-theme'),theme,path+' shared theme');
      await page.getByRole('button',{name:'Find a workspace page',exact:true}).click();
      const dialog=page.locator('dialog[open]');await dialog.waitFor();
      await page.keyboard.press('Escape');assert.equal(await dialog.count(),0,path+' Escape');
      if(path==='/#home'){
        await page.waitForFunction(()=>document.querySelector('[data-count="seconds"]').textContent!=='··');
        assert.equal(await page.locator('.home-choices > :is(button,a):visible').count(),6,'six Home slots');
        const last=page.locator('.home-choices > :is(button,a):visible').last();
        assert(await last.getAttribute('data-opening-at'),'sixth slot is opening night');
        assert.equal(await page.locator('.wst-nav [aria-current]').getAttribute('data-nav-key'),'home');
      }
      if((viewport.width===1440||viewport.width===375&&viewport.height===812)&&['/#home','/handoff.html','/run-review/'].includes(path)){
        await page.locator('[data-nav-location]').click();
        const name=path==='/#home'?'home':path.includes('handoff')?'handoff':'review';
        await page.screenshot({path:new URL(name+'-'+viewport.width+'-'+theme+'.png',out).pathname});
      }
      results.push({path,viewport,theme,bounds});
      console.log('Checked',viewport.width+'x'+viewport.height,theme,path);
    }
    if(viewport.width===1440&&theme==='light'||viewport.width===375&&viewport.height===812&&theme==='dark'){
      for(const item of destinations){
        await page.goto('https://wst.housevideo.app'+item.href,{waitUntil:'domcontentloaded'});
        await page.locator('.wst-nav [aria-current="page"]').waitFor();
        assert.equal(await page.locator('.wst-nav [aria-current="page"]').getAttribute('data-nav-key'),item.id,'Destination '+item.id);
        if(item.href.startsWith('/#')){
          const id={home:'home-panel',handoff:'handoff-panel',schedule:'schedule-panel',rig:'projector-info',stage:'public-stage-panel',pixels:'pixel-reference',notes:'workspace-panels',updates:'updates-panel',documents:'documents-panel',throw:'throw-panel'}[item.id];
          await page.locator('#'+id+':not([hidden])').waitFor();
          assert((await page.locator('#'+id).boundingBox()).height>100,'Usable panel '+item.id);
        }
      }
      console.log('Checked all 12 destinations at',viewport.width);
    }
    assert.deepEqual(errors,[],'Browser exceptions '+JSON.stringify({viewport,theme}));
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference',serviceWorkers:'block'});
  await context.route('https://wst.housevideo.app/**',async route=>{
    const u=new URL(route.request().url()),r=await fetch('http://127.0.0.1:8875'+u.pathname+u.search);
    const headers=Object.fromEntries(r.headers);delete headers['content-length'];delete headers['transfer-encoding'];delete headers['content-encoding'];
    await route.fulfill({status:r.status,headers,body:Buffer.from(await r.arrayBuffer())});
  });
  const page=await context.newPage();
  await page.goto('https://wst.housevideo.app/#home');
  await page.waitForFunction(()=>window.gsap&&[...document.querySelectorAll('.home-choices > :is(button,a):not([hidden])')].every(n=>Number(getComputedStyle(n).opacity)>.99));
  await page.locator('.wst-nav [data-nav-key="schedule"]').click();
  await page.waitForURL('**/#schedule');
  await page.locator('#schedule-panel:not([hidden])').waitFor();
  assert.equal(await page.locator('.wst-nav [aria-current]').getAttribute('data-nav-key'),'schedule');
  await page.goBack();await page.locator('#home-panel:not([hidden])').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(at=>{Date.now=()=>Date.parse(at)+1000;document.dispatchEvent(new Event('visibilitychange'));},opening.at);
  assert.equal(await page.locator('.opening-state:visible').count(),1,'expired countdown state');
  assert.equal(await page.locator('.opening-digits:visible').count(),0,'expired countdown has no negative numbers');
  await context.close();
  await fs.writeFile(new URL('results.json',out),JSON.stringify({checks:results,opening:opening.at,passed:true},null,2));
  console.log('PASS navigation, finder, theme, keyboard dismissal, touch targets and containment across 50 page/viewport/theme cases; GSAP route/back and expired countdown.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
