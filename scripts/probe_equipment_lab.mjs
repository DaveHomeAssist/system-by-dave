import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
const root = resolve(import.meta.dirname,'..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
const server = createServer(async(req,res) => { let path = resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname)); if (!path.startsWith(root+'/')) return res.writeHead(403).end(); try { if ((await stat(path)).isDirectory()) path=join(path,'index.html'); res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store'});res.end(await readFile(path)); } catch {res.writeHead(404).end();} });
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = process.env.EQUIPMENT_LAB_BASE || `http://127.0.0.1:${server.address().port}`;
const channel = process.env.CHROME_CHANNEL ? {channel:process.env.CHROME_CHANNEL} : process.env.CHROME_BIN ? {executablePath:process.env.CHROME_BIN} : {};
const browser=await chromium.launch({headless:true,...channel,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[], errors=[];const out=process.env.EQUIPMENT_LAB_EVIDENCE;
if(out)await mkdir(out,{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:900}});context.setDefaultTimeout(20000); const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error' || message.text().startsWith('THREE.')) errors.push(message.text());});
async function painted() {
 if(out) console.log('Capture',page.viewportSize());
 await page.locator('.lab-canvas[data-ready=true]').waitFor();
 await page.waitForFunction(() => { const el=document.querySelector('.lab-canvas'); return el && el.clientWidth > 0 && el.clientHeight > 0 && el.dataset.renderSize === `${el.clientWidth}x${el.clientHeight}`; });
 await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function bounds(label) {const dimensions=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));assert(dimensions.sw<=dimensions.cw+1&&dimensions.sh<=dimensions.ch+1,`${label}: ${JSON.stringify(dimensions)}`);results.push({label,...dimensions});}
try {
 await page.goto(base+'/equipment-lab/?equipment=C02&component=head.panLock');
 await page.locator('.lab-canvas[data-ready=true]').waitFor({timeout:30000});
 assert.equal(await page.locator('.lab-canvas').getAttribute('data-textures'),'22');assert.equal(await page.locator('.lab-card').count(),43);assert.equal(await page.locator('.lab-canvas').getAttribute('data-controls'),'10');assert.equal(await page.locator('.lab-control select').inputValue(),'head.panLock');
 assert.equal(await page.locator('html').getAttribute('data-av-theme'),'light');
 const ids=await page.locator('.lab-control option').evaluateAll(nodes=>nodes.map(node=>node.value));
 for(const id of ids) { await page.locator('.lab-control select').selectOption(id);assert.equal(new URL(page.url()).searchParams.get('component'),id); assert.equal(await page.locator('.lab-canvas').getAttribute('data-ready'),'true'); assert.equal(await page.locator('.lab-canvas').getAttribute('data-selected'),id); }
 await page.locator('.lab-control select').selectOption('head.bubble'); await painted();
 const rect=await page.locator('.lab-canvas').boundingBox(); let picked=false;
 for(const [x,y] of [[.5,.25],[.55,.35],[.65,.5],[.5,.65],[.45,.4],[.6,.7]]) { await page.mouse.click(rect.x+rect.width*x,rect.y+rect.height*y); if(await page.locator('.lab-control select').inputValue()!=='head.bubble') {picked=true;break;} }
 assert.equal(picked,true,'A model click must select a semantic control');
 await page.getByLabel('Find equipment').fill('Panasonic');assert.equal(await page.locator('.lab-card').count(),1);await page.locator('.lab-card').click();await page.getByText('This is a generic context model.',{exact:false}).waitFor();assert.equal(await page.locator('.lab-canvas').count(),0);
 await page.getByLabel('Find equipment').fill('Cartoni');await page.locator('.lab-card').click();await page.locator('.lab-canvas[data-ready=true]').waitFor();
 for(const theme of ['light','dark']) {
  if(await page.locator('html').getAttribute('data-av-theme')!==theme) await page.getByRole('button',{name:theme==='dark'?'Dark mode':'Light mode',exact:true}).click();
  for(const [width,height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]) {
   await page.setViewportSize({width,height}); await bounds(`${theme} ${width}x${height}`);
   for(const name of ['Inspect','Practice','Reference','Library']) {await page.locator('.console-quick').getByRole('button',{name,exact:true}).click();await bounds(`${theme} ${width}x${height} ${name}`);}
   if(width===3840) { const overflow=await page.locator('.lab-card').evaluateAll(nodes=>nodes.some(node=>node.scrollHeight>node.clientHeight+1)); assert.equal(overflow,false,'Catalog card text must fit'); }
   if(out && [1440,375,3840].includes(width)) {await page.locator('.console-quick').getByRole('button',{name:'Inspect',exact:true}).click();await painted();await page.screenshot({path:join(out,`equipment-${width}-${theme}.png`)});}
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'/av/?app=equipment-lab&equipment=C02');await page.locator('.lab-canvas[data-ready=true]').waitFor({timeout:30000});assert.equal(await page.locator('iframe').count(),0);await bounds('native AV Equipment Lab');
 await page.getByLabel('Find equipment').fill('SM58');assert.equal(await page.locator('.lab-card').count(),1);
 if(out)await page.screenshot({path:join(out,'equipment-av-native.png')});
 const noGL=await browser.newContext({viewport:{width:375,height:812}});await noGL.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/^webgl/.test(type))return null;return get.call(this,type,...args);};});const fallback=await noGL.newPage();await fallback.goto(base+'/equipment-lab/?equipment=C02');await fallback.locator('.console-quick').getByRole('button',{name:'Inspect',exact:true}).click();await fallback.getByText('WebGL is unavailable.',{exact:false}).waitFor();assert.equal(await fallback.locator('.lab-control option').count(),10);await noGL.close();
 for(const type of ['missing','corrupt','schema']) {const ctx=await browser.newContext();await ctx.route('**/cartoni.maxima30.manifest.json',route=> type==='missing'?route.fulfill({status:404,body:''}):route.fulfill({json:type==='schema'?{schema:'unknown'}:{schema:'equipment.reference.manifest.v1',revision:'1.0.0',assetId:'C02',files:{}}}));const p=await ctx.newPage();await p.goto(base+'/equipment-lab/');await p.locator('.lab-error').waitFor();assert.equal(await p.locator('.lab-control option').count(),10);await ctx.close();}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'pass',entries:43,controls:ids.length,nativePanels:4,viewportChecks:results.length,fallback:true,failureCases:3,errors,base}));if(out)await writeFile(join(out,'results.json'),JSON.stringify({result:'pass',results,errors,base},null,2));
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
