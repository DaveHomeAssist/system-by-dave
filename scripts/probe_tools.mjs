#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
const server = createServer(async (req,res) => {
  try {
    const file = resolve(root, '.' + new URL(req.url,'http://local').pathname);
    assert(file.startsWith(root + sep));
    res.setHeader('Content-Type',types[extname(file)] || 'application/octet-stream');res.end(await readFile(file));
  } catch { res.writeHead(404);res.end(); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin = `http://127.0.0.1:${server.address().port}`;
const options = {headless:true};
if(process.env.CHROME_CHANNEL) options.channel=process.env.CHROME_CHANNEL;
else if(process.env.CHROME_BIN) options.executablePath=process.env.CHROME_BIN;
let browser;
const errors=[];
const sizes=[[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]];
const categories=['All','AV','Notion','Apps','Games','Trackers','Sports','Labs'];
try {
 browser=await chromium.launch(options);
 const context=await browser.newContext({colorScheme:'dark',reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='error') errors.push(msg.text());});
 await page.goto(origin+'/tools.html?test=preserved');
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').textContent(),'Skip to content');
 await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');
 assert.equal(await page.locator('.tool-card').count(),33);
 assert.equal(await page.locator('a[href="depotops/"]').count(),1);
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});
  for(const theme of ['light','dark']){
   if(await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('.public-theme-toggle').click();
   for(const category of categories){
    if(width<=680) await page.locator('#categorySelect').selectOption(category);
    else await page.locator(`.chip-filter[data-chip="${category}"]`).click();
    const result=await page.evaluate(()=>{
     const panel=document.getElementById('directoryPanel');const r=panel.getBoundingClientRect();
     const cards=[...document.querySelectorAll('.tool-card')];
     const active=document.getElementById('categorySelect').value;
     const controls=[...document.querySelectorAll('.sbd-site-header a,.public-theme-toggle,.chip-filter,#categorySelect')].filter(e=>e.getClientRects().length);
     return {controls:controls.map(e=>({text:e.textContent,box:[e.getBoundingClientRect().x,e.getBoundingClientRect().y,e.getBoundingClientRect().width,e.getBoundingClientRect().height]})),root:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],panel:[r.x,r.y,r.right,r.bottom,r.height],correct:cards.every(c=>c.hidden===(active!=='All'&&!c.dataset.chips.split(' ').includes(active))),targets:controls.every(e=>{const b=e.getBoundingClientRect();return b.width>=44&&b.height>=44&&b.x>=0&&b.right<=innerWidth+1&&b.y>=0&&b.bottom<=innerHeight+1;}),count:cards.filter(c=>!c.hidden).length};
    });
    assert(result.root[0]<=width && result.root[1]<=height,JSON.stringify({width,height,theme,category,result}));
    assert(result.correct && result.targets,JSON.stringify({width,height,theme,category,result}));
    assert(result.panel[1]>=0&&result.panel[3]<=height+1&&result.panel[4]>70);
    assert.equal(await page.locator('#toolCount').textContent(),`${result.count} / 33 projects`);
    const last=page.locator('.tool-card:not([hidden])').last();await last.focus();
    assert(await last.evaluate(e=>{const b=e.getBoundingClientRect();const p=document.getElementById('directoryPanel').getBoundingClientRect();return b.bottom>p.top&&b.top<p.bottom;}));
   }
   assert(new URL(page.url()).searchParams.has('test'));
   if(process.env.TOOLS_SCREENSHOTS){await mkdir(process.env.TOOLS_SCREENSHOTS,{recursive:true});await page.screenshot({path:`${process.env.TOOLS_SCREENSHOTS}/${width}-${height}-${theme}.png`});}
  }
 }
 await page.setViewportSize({width:375,height:812});
 await page.locator('#categorySelect').selectOption('All');
 await page.locator('#directoryPanel').evaluate(e=>e.scrollTop=750);
 await page.reload();assert.equal(await page.locator('#directoryPanel').evaluate(e=>e.scrollTop),750);
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.goto(origin+'/privacy-policy.html');await page.goBack();
 assert.equal(await page.locator('#directoryPanel').evaluate(e=>e.scrollTop),750);
 await page.locator('#categorySelect').selectOption('Games');
 await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('.tool-card:visible').count(),33);
 assert.equal(await page.locator('#directoryPanel').evaluate(e=>getComputedStyle(e).overflow),'visible');
 await page.emulateMedia({media:'screen'});
 await page.goto(origin+'/tools.html#apps');
 assert.equal(await page.locator('#categorySelect').inputValue(),'Apps');
 assert(await page.locator('a[href="depotops/"]').isVisible());
 await context.close();
 for(const javaScriptEnabled of [false,true]){
  const c=await browser.newContext({javaScriptEnabled,viewport:{width:320,height:256}});
  await c.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  if(javaScriptEnabled) await c.addInitScript(()=>{for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{get(){throw new Error('Storage blocked');}});});
  const p=await c.newPage();await p.goto(origin+'/tools.html');
  assert.equal(await p.locator('.tool-card:visible').count(),33);
  await p.locator('.tool-card').last().focus();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight),256);
  assert(await p.locator('#directoryPanel').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.height>70;}));
  assert(await p.locator('.tool-card').last().evaluate(e=>{const r=e.getBoundingClientRect();const b=document.getElementById('directoryPanel').getBoundingClientRect();return r.bottom>b.top&&r.top<b.bottom;}));
  await c.close();
 }
 assert.deepEqual(errors,[]);
 console.log('Tools: 6 sizes, 2 themes, 8 filters; static links, DepotOps, keyboard, reload/Back, query/hash, print and blocked storage passed.');
} finally {await browser?.close();server.close();}
