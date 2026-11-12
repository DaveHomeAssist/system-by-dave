import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';
const root = resolve(import.meta.dirname,'..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg'};
const server = createServer(async(req,res) => { let path = resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname)); if (!path.startsWith(root+'/')) return res.writeHead(403).end(); try { if ((await stat(path)).isDirectory()) path=join(path,'index.html'); res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-store'});res.end(await readFile(path)); } catch {res.writeHead(404).end();} });
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = process.env.EQUIPMENT_LAB_BASE || `http://127.0.0.1:${server.address().port}`;
const channel = process.env.CHROME_CHANNEL ? {channel:process.env.CHROME_CHANNEL} : process.env.CHROME_BIN ? {executablePath:process.env.CHROME_BIN} : {};
const browser=await chromium.launch({headless:true,...channel,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[], errors=[];const out=process.env.EQUIPMENT_LAB_EVIDENCE;
if(out)await mkdir(out,{recursive:true});
// The catalog holds the confirmed 43-entry family plus P01. Each native package is exercised the same way:
// a deep link, every listed item, a pick that must leave `away`, the layout matrix, and its failure cases.
const ENTRIES=44;
const PACKAGES=[
 {id:'C02',find:'Cartoni',link:'head.panLock',first:'head.tiltDrag',away:'head.bubble',controls:10,textures:22,views:4,manifest:'cartoni.maxima30.manifest.json',unknown:'Unknown control link.'},
 {id:'P01',find:'Barco',link:'io.hdmi',first:'io.keypad',away:'body.feet',controls:26,textures:14,views:6,manifest:'barco.udm4k22.manifest.json',unknown:'Unknown part link.'},
];
const context=await browser.newContext({viewport:{width:1440,height:900}});context.setDefaultTimeout(20000); const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));let losses=0;page.on('console',message=>{const text=message.text();if(text==='THREE.WebGLRenderer: Context Lost.'){losses++;return;}if(message.type()==='error' || text.startsWith('THREE.')) errors.push(text);});
async function painted() {
 if(out) console.log('Capture',page.viewportSize());
 await page.locator('.lab-canvas[data-ready=true]').waitFor();
 await page.waitForFunction(() => { const el=document.querySelector('.lab-canvas'); return el && el.clientWidth > 0 && el.clientHeight > 0 && el.dataset.renderSize === `${el.clientWidth}x${el.clientHeight}`; });
 await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function bounds(label) {const dimensions=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));assert(dimensions.sw<=dimensions.cw+1&&dimensions.sh<=dimensions.ch+1,`${label}: ${JSON.stringify(dimensions)}`);results.push({label,...dimensions});}
const ready=pack=>page.locator(`.lab-canvas[data-ready=true][data-controls="${pack.controls}"]`).waitFor({timeout:30000});
try {
 for(const pack of PACKAGES) {
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${base}/equipment-lab/?equipment=${pack.id}&component=${pack.link}`);
  await ready(pack);
  assert.equal(await page.locator('.lab-canvas').getAttribute('data-textures'),String(pack.textures));assert.equal(await page.locator('.lab-card').count(),ENTRIES);assert.equal(await page.locator('.lab-control select').inputValue(),pack.link);
  assert.equal(await page.locator('.lab-view-buttons button').count(),pack.views);
  assert.equal(await page.locator('html').getAttribute('data-av-theme'),'light');
  const ids=await page.locator('.lab-control option').evaluateAll(nodes=>nodes.map(node=>node.value));assert.equal(ids.length,pack.controls);assert.equal(new Set(ids).size,pack.controls);
  for(const id of ids) { await page.locator('.lab-control select').selectOption(id);assert.equal(new URL(page.url()).searchParams.get('component'),id); assert.equal(await page.locator('.lab-canvas').getAttribute('data-ready'),'true'); assert.equal(await page.locator('.lab-canvas').getAttribute('data-selected'),id); }
  for(const view of await page.locator('.lab-view-buttons button').all()) { await view.click(); await painted(); }
  await page.locator('.lab-view-buttons button').first().click();
  await page.locator('.lab-control select').selectOption(pack.away); await painted();
  const rect=await page.locator('.lab-canvas').boundingBox(); let picked=false;
  for(const [x,y] of [[.5,.25],[.55,.35],[.65,.5],[.5,.65],[.45,.4],[.6,.7],[.5,.5]]) { await page.mouse.click(rect.x+rect.width*x,rect.y+rect.height*y); if(await page.locator('.lab-control select').inputValue()!==pack.away) {picked=true;break;} }
  assert.equal(picked,true,`${pack.id}: a model click must select a semantic item`);
  await page.getByLabel('Find equipment').fill('Panasonic');assert.equal(await page.locator('.lab-card').count(),1);await page.locator('.lab-card').click();await page.getByText('This is a generic context model.',{exact:false}).waitFor();assert.equal(await page.locator('.lab-canvas').count(),0);
  await page.getByLabel('Find equipment').fill(pack.find);await page.locator('.lab-card').click();await ready(pack);
  assert.equal(await page.locator('.lab-control select').inputValue(),pack.first);
  for(const theme of ['light','dark']) {
   if(await page.locator('html').getAttribute('data-av-theme')!==theme) await page.getByRole('button',{name:theme==='dark'?'Dark mode':'Light mode',exact:true}).click();
   for(const [width,height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]) {
    await page.setViewportSize({width,height}); await bounds(`${pack.id} ${theme} ${width}x${height}`);
    for(const name of ['Inspect','Practice','Reference','Library']) {await page.locator('.console-quick').getByRole('button',{name,exact:true}).click();await bounds(`${pack.id} ${theme} ${width}x${height} ${name}`);}
    if(width===3840) { const overflow=await page.locator('.lab-card').evaluateAll(nodes=>nodes.some(node=>node.scrollHeight>node.clientHeight+1)); assert.equal(overflow,false,'Catalog card text must fit'); }
    if(out && [1440,375,3840].includes(width)) {await page.locator('.console-quick').getByRole('button',{name:'Inspect',exact:true}).click();await painted();await page.screenshot({path:join(out,`equipment-${pack.id}-${width}-${theme}.png`)});}
   }
  }
  await page.getByRole('button',{name:'Light mode',exact:true}).click();
  // A link naming an item this package does not have opens on the package default and says so.
  await page.setViewportSize({width:1440,height:900});await page.goto(`${base}/equipment-lab/?equipment=${pack.id}&component=not.a.part`);await ready(pack);
  assert.equal(await page.locator('.lab-control select').inputValue(),pack.first);await page.getByRole('alert').getByText(pack.unknown,{exact:false}).waitFor();
  // Losing the graphics context on purpose leaves the notice and the whole list. three.js logs that loss once; it is counted, not ignored.
  await page.evaluate(()=>{const canvas=document.querySelector('.lab-canvas canvas');(canvas.getContext('webgl2')||canvas.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext();});
  await page.locator('.lab-error').getByText('3D view unavailable.',{exact:false}).waitFor();assert.equal(await page.locator('.lab-control option').count(),pack.controls);
  await page.goto(`${base}/av/?app=equipment-lab&equipment=${pack.id}`);await ready(pack);assert.equal(await page.locator('iframe').count(),0);await bounds(`native AV Equipment Lab ${pack.id}`);
  await page.getByLabel('Find equipment').fill('SM58');assert.equal(await page.locator('.lab-card').count(),1);
  if(out)await page.screenshot({path:join(out,`equipment-av-native-${pack.id}.png`)});
 }
 // Changing package inside one visit replaces the viewer and its item list.
 await page.goto(`${base}/equipment-lab/?equipment=C02`);await ready(PACKAGES[0]);
 await page.getByLabel('Find equipment').fill('Barco');await page.locator('.lab-card').click();await ready(PACKAGES[1]);assert.equal(await page.locator('.lab-control option').count(),26);assert.equal(new URL(page.url()).searchParams.get('component'),'io.keypad');
 await page.getByLabel('Find equipment').fill('Cartoni');await page.locator('.lab-card').click();await ready(PACKAGES[0]);assert.equal(await page.locator('.lab-control option').count(),10);assert.equal(new URL(page.url()).searchParams.get('component'),'head.tiltDrag');
 // The bare route is the splash library; deep links keep opening the workspace.
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'/equipment-lab/');await page.locator('.lab-splash').waitFor();
 assert.equal(await page.locator('.splash-card').count(),ENTRIES);assert.equal(await page.locator('.lab-canvas').count(),0);
 const tabCounts=await page.locator('.splash-tabs [role=tab]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.count)));assert.equal(tabCounts[0],ENTRIES);assert.equal(tabCounts.slice(1).reduce((sum,count)=>sum+count,0),ENTRIES);
 const previews=await page.locator('.splash-window img').evaluateAll(nodes=>[...new Set(nodes.map(node=>node.getAttribute('src')))]);assert.equal(previews.length,26);
 for(const src of previews) assert.equal((await page.request.get(new URL(src,base).href)).status(),200,src);
 assert.equal(await page.locator('.splash-grid .splash-window.pending').count(),2);
 await page.getByLabel('Find equipment').fill('Panasonic');assert.equal(await page.locator('.splash-card').count(),1);await page.locator('.splash-card').click();await page.locator('.splash-sheet').getByText('Generic context model.',{exact:false}).waitFor();await page.getByLabel('Find equipment').fill('');
 for(const theme of ['light','dark']) {
  if(await page.locator('html').getAttribute('data-av-theme')!==theme) await page.getByRole('button',{name:theme==='dark'?'Dark mode':'Light mode',exact:true}).click();
  for(const [width,height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]) {
   await page.setViewportSize({width,height});await bounds(`splash ${theme} ${width}x${height}`);
   const clipped=await page.locator('.splash-card').evaluateAll(nodes=>nodes.some(node=>node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1));assert.equal(clipped,false,`Splash cards must fit at ${theme} ${width}x${height}`);
   if(out&&[1440,375,3840].includes(width))await page.screenshot({path:join(out,`splash-${width}-${theme}.png`)});
  }
 }
 await page.setViewportSize({width:375,height:812});await page.locator('.splash-card').filter({hasText:'SM58'}).click();await page.locator('.splash-sheet[role=dialog]').waitFor();await bounds('splash phone sheet');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.splash-sheet').count(),0);
 for(const pack of PACKAGES) {
  await page.setViewportSize({width:1440,height:900});await page.goto(base+'/equipment-lab/');await page.locator('.lab-splash').waitFor();await page.getByLabel('Find equipment').fill(pack.find);await page.locator('.splash-card').click();
  await page.locator('.splash-sheet .splash-flag.native').waitFor();await page.locator('.splash-sheet').getByRole('link',{name:'Inspect in 3D'}).click();
  await page.waitForURL(new RegExp(`equipment=${pack.id}`));await ready(pack);
  const noGL=await browser.newContext({viewport:{width:375,height:812}});await noGL.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/^webgl/.test(type))return null;return get.call(this,type,...args);};});const fallback=await noGL.newPage();await fallback.goto(`${base}/equipment-lab/?equipment=${pack.id}`);await fallback.locator('.console-quick').getByRole('button',{name:'Inspect',exact:true}).click();await fallback.getByText('WebGL is unavailable.',{exact:false}).waitFor();assert.equal(await fallback.locator('.lab-control option').count(),pack.controls);await noGL.close();
  for(const type of ['missing','corrupt','schema','other']) {const ctx=await browser.newContext();await ctx.route(`**/${pack.manifest}`,route=> type==='missing'?route.fulfill({status:404,body:''}):route.fulfill({json:type==='schema'?{schema:'unknown'}:{schema:'equipment.reference.manifest.v1',revision:'1.0.0',assetId:type==='other'?'X00':pack.id,files:{}}}));const p=await ctx.newPage();await p.goto(`${base}/equipment-lab/?equipment=${pack.id}`);await p.locator('.lab-error').waitFor();assert.equal(await p.locator('.lab-control option').count(),pack.controls);await ctx.close();}
 }
 assert.deepEqual(errors,[]);assert.equal(losses,PACKAGES.length,'each package loses its context once, on purpose');console.log(JSON.stringify({result:'pass',entries:ENTRIES,packages:Object.fromEntries(PACKAGES.map(pack=>[pack.id,{controls:pack.controls,textures:pack.textures,views:pack.views}])),nativePanels:4,splashCards:ENTRIES,splashPreviews:previews.length,viewportChecks:results.length,fallback:true,contextLoss:losses,failureCases:4*PACKAGES.length,errors,base}));if(out)await writeFile(join(out,'results.json'),JSON.stringify({result:'pass',results,errors,base},null,2));
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
