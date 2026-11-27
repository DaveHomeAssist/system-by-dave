#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const server=createServer(async(req,res)=>{
  const file=resolve(root,'.'+new URL(req.url,'http://fixture').pathname);
  if(!file.startsWith(root+sep))return res.writeHead(403).end();
  try{res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url=`http://127.0.0.1:${server.address().port}/html/sbd-brand.html`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const ids=['logo','anatomy','palette','type','spacing','usage','rules','all'];
let views=0;
async function fixture(options={}){
  const context=await browser.newContext({colorScheme:'dark',reducedMotion:'reduce',...options});
  // Typography network is isolated. This checks layout with the existing fallback fonts.
  if (!process.env.BRAND_LIVE_FONTS) {
    await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
    await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  }
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  return {context,page,errors};
}
try{
  for(const [width,height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]){
    const {context,page,errors}=await fixture({viewport:{width,height}});
    await page.goto(url);await page.locator('#brand-theme').waitFor();
    if(process.env.BRAND_LIVE_FONTS){await page.evaluate(async()=>{await document.fonts.ready;await document.fonts.load('800 20px Syne');});const fonts=await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));assert.ok(fonts.some(f=>f.family.replaceAll('\"','')==='Syne'&&f.status==='loaded'),`Syne font loaded: ${JSON.stringify(fonts)}`);}
    assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').textContent(),'Skip to brand reference');
    for(const theme of ['light','dark']){
      if(theme==='dark')await page.locator('#brand-theme').click();
      for(const id of ids){
        await page.locator(`#tab-${id}`).click();
        assert.equal(await page.locator(`#tab-${id}`).getAttribute('aria-selected'),'true');
        const layout=await page.evaluate(()=>{
          const d=document.documentElement,m=document.querySelector('main'),b=m.getBoundingClientRect();
          return {overflow:d.scrollHeight>d.clientHeight||d.scrollWidth>d.clientWidth,mainInside:b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth,horizontal:m.scrollWidth>m.clientWidth+1,small:[...document.querySelectorAll('.brand-tabs a,.brand-controls button,.brand-controls a')].some(e=>{const b=e.getBoundingClientRect();return b.width<44||b.height<44;})};
        });
        assert.deepEqual(layout,{overflow:false,mainInside:true,horizontal:false,small:false},`${width} ${height} ${theme} ${id}`);
        await page.waitForFunction(id=>{const m=document.querySelector('main');m.scrollTop=m.scrollHeight;const e=document.getElementById(id==='all'?'rules':id);return e.getBoundingClientRect().bottom<=m.getBoundingClientRect().bottom+1;},id);
        const last=page.locator(id==='all'?'#rules':`section#${id}`);
        const edge=await last.evaluate(e=>({bottom:e.getBoundingClientRect().bottom,main:document.querySelector('main').getBoundingClientRect().bottom,scroll:document.querySelector('main').scrollTop,height:document.querySelector('main').scrollHeight}));assert.ok(edge.bottom<=edge.main+1,`${width} ${height} ${theme} ${id}: ${JSON.stringify(edge)}`);
        views++;
      }
    }
    await page.locator('#tab-logo').click();await page.keyboard.press('End');assert.equal(await page.locator(':focus').getAttribute('id'),'tab-all');
    await page.keyboard.press('Home');assert.equal(await page.locator(':focus').getAttribute('id'),'tab-logo');
    await page.keyboard.press('ArrowRight');assert.equal(await page.locator(':focus').getAttribute('id'),'tab-anatomy');
    await page.goBack();assert.equal(await page.locator('#tab-logo').getAttribute('aria-selected'),'true');
    await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    if(width===375&&process.env.BRAND_SCREENSHOT)await page.screenshot({path:process.env.BRAND_SCREENSHOT});
    assert.deepEqual(errors,[]);await context.close();
  }
  const {context,page,errors}=await fixture({viewport:{width:375,height:812}});
  await page.goto(url+'#all');await page.locator('#brand-theme').waitFor();
  await page.locator('main').evaluate(e=>{e.scrollTop=200;});await page.locator('#tab-rules').click();await page.locator('#tab-all').click();assert.equal(await page.locator('main').evaluate(e=>e.scrollTop),200);
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('section').evaluateAll(es=>es.every(e=>e.checkVisibility())),true);
  await page.emulateMedia({media:'screen'});
  // Intentional injected code and disallowed connection must be rejected by the policy.
  await page.evaluate(()=>{window.cspEvents=[];document.addEventListener('securitypolicyviolation',e=>cspEvents.push(e.effectiveDirective));const s=document.createElement('script');s.textContent='window.injectedBrand=true';document.body.append(s);fetch('/blocked-connect').catch(()=>{});});
  await page.waitForFunction(()=>cspEvents.includes('script-src-elem')&&cspEvents.includes('connect-src'));
  assert.equal(await page.evaluate(()=>window.injectedBrand),undefined);assert.deepEqual(errors,[]);await context.close();
  const nojs=await fixture({javaScriptEnabled:false,viewport:{width:375,height:812}});await nojs.page.goto(url);assert.equal(await nojs.page.locator('section').count(),7);assert.equal(await nojs.page.locator('section').evaluateAll(es=>es.every(e=>e.checkVisibility())),true);await nojs.context.close();
  const denied=await fixture();await denied.page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('denied')};Storage.prototype.setItem=()=>{throw new Error('denied')};});await denied.page.goto(url);await denied.page.locator('#tab-rules').click();assert.deepEqual(denied.errors,[]);await denied.context.close();
  console.log(`Brand reference: ${views} views; keyboard/history/theme, scroll restore, print, no-JS, blocked storage and CSP rejection pass.`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
