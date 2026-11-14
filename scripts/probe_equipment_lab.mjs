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
// The catalog holds the confirmed 43-entry family plus P01, P02 and P03. Each native package is exercised the same way:
// a deep link, every listed item, a pick that must leave `away`, the layout matrix, and its failure cases.
// P02 has service states: `states` adds the state row to every layout check and runs the state checks below.
// P03 lays out exactly as P01 does with one more view button, so `matrix:false` spares it the full theme and size matrix.
const ENTRIES=46;
// The two phone sizes whose panels were unusable: a phone held sideways, and the narrowest phone upright.
const SMALL=[[844,390],[320,568]];
const PACKAGES=[
 {id:'C02',find:'Cartoni',link:'head.panLock',first:'head.tiltDrag',away:'head.bubble',controls:10,textures:22,views:4,manifest:'cartoni.maxima30.manifest.json',unknown:'Unknown control link.'},
 {id:'P01',find:'Barco',link:'io.hdmi',first:'io.keypad',away:'body.feet',controls:26,textures:14,views:6,manifest:'barco.udm4k22.manifest.json',unknown:'Unknown part link.'},
 {id:'P02',find:'PT-DW830',link:'io.hdmiIn',first:'lamp.cover',away:'body.feet',controls:60,textures:43,views:8,manifest:'panasonic.ptdw830.manifest.json',unknown:'Unknown part link.',
  states:[['Closed','closed'],['Lamp cover open','coverOpen'],['Lamp unit 1 out','lampUnit1Out'],['Lamp unit 2 out','lampUnit2Out'],['Air filter case out','filterCaseOut']],joints:140,hidden:['lamp.unit1','lampUnit1Out'],steps:[10,8]},
 {id:'P03',find:'PT-RZ970',link:'io.sdiIn',first:'panel.plate',away:'body.feet',controls:45,textures:38,views:7,manifest:'panasonic.ptrz970.manifest.json',unknown:'Unknown part link.',matrix:false},
];
const context=await browser.newContext({viewport:{width:1440,height:900}});context.setDefaultTimeout(20000); const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));let losses=0;page.on('console',message=>{const text=message.text();if(text==='THREE.WebGLRenderer: Context Lost.'){losses++;return;}if(message.type()==='error' || text.startsWith('THREE.')) errors.push(text);});
async function painted() {
 if(out) console.log('Capture',page.viewportSize());
 await page.locator('.lab-canvas[data-ready=true]').waitFor();
 await page.waitForFunction(() => { const el=document.querySelector('.lab-canvas'); return el && el.clientWidth > 0 && el.clientHeight > 0 && el.dataset.renderSize === `${el.clientWidth}x${el.clientHeight}`; });
 await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function bounds(label) {const dimensions=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));assert(dimensions.sw<=dimensions.cw+1&&dimensions.sh<=dimensions.ch+1,`${label}: ${JSON.stringify(dimensions)}`);results.push({label,...dimensions});}
// A page that does not scroll can still hide its panel: before this check the phone switcher filled a phone held sideways
// (844x390) and the page column ran past a 320px screen, and every viewport check passed. `usable` asserts what an operator
// needs: the page frame and its controls are on screen, the switcher is a bar, each open panel has a body, and a model
// inspector shows its picture at a readable size with every control reachable inside the panel and no part over another.
// NO_ROOM is the one height in the matrix where the header, view strip and switcher leave the panel no body (320x256);
// it stays a page-containment case.
const NO_ROOM=300;let panelChecks=0;
async function usable(label,inspect) {
 if(page.viewportSize().height<NO_ROOM) return;
 if(inspect) await painted(); else await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const problems=await page.evaluate(inspect=>{
  const problems=[],need=(ok,what)=>{if(!ok)problems.push(what);};
  const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};};
  const inside=(a,b)=>a.x>=b.x-1&&a.y>=b.y-1&&a.right<=b.right+1&&a.bottom<=b.bottom+1;
  const size=node=>{const b=box(node);return `${Math.round(b.w)}x${Math.round(b.h)}`;};
  const name=node=>(node.getAttribute('aria-label')||node.textContent).trim().slice(0,24);
  const screen={x:0,y:0,right:innerWidth,bottom:innerHeight};
  for(const selector of ['.lab-header','.console-strip','.console-grid','.console-shell>.console-quick']) {const node=document.querySelector(selector);if(node)need(inside(box(node),screen),`${selector} leaves the screen`);}
  for(const node of document.querySelectorAll('.lab-header a,.lab-header button,.console-strip>.console-icon,.console-tools button,.console-shell>.console-quick button')) if(node.checkVisibility()) need(inside(box(node),screen),`"${name(node)}" leaves the screen`);
  for(const node of document.querySelectorAll('.lab-header button,.console-strip>.console-icon,.console-tools button,.console-shell>.console-quick button')) if(node.checkVisibility()) need(box(node).h>=43.5,`"${name(node)}" is ${size(node)}`);
  const quick=document.querySelector('.console-shell>.console-quick');
  if(quick) {need(box(quick).h<=72,`the panel switcher is ${size(quick)}, not a bar`);need(quick.querySelectorAll('[aria-pressed=true]').length===1,'the switcher marks one panel');for(const button of quick.querySelectorAll('button'))need(button.scrollWidth<=button.clientWidth+1,`switcher label "${name(button)}" is cut`);}
  const panels=[...document.querySelectorAll('.console-panel')];need(panels.length>0,'no panel is shown');
  for(const panel of panels) {const body=box(panel.querySelector('.console-body'));need(inside(box(panel),screen),`${panel.dataset.panel} panel leaves the screen`);need(body.w>=200&&body.h>=120,`${panel.dataset.panel} panel body is ${Math.round(body.w)}x${Math.round(body.h)}`);}
  for(const region of document.querySelectorAll('.lab-list,.equipment-lab-native>.lab-copy')) {const body=box(region.closest('.console-body'));need(inside(box(region),body)&&box(region).w>=200&&box(region).h>=80,`${region.className} is ${size(region)} in a ${Math.round(body.w)}x${Math.round(body.h)} panel`);}
  for(const field of document.querySelectorAll('.lab-filter input,.lab-filter select')) need(inside(box(field),box(field.closest('.console-body'))),`library field "${name(field.closest('label'))}" leaves its panel`);
  const panel=inspect&&document.querySelector('.console-panel[data-panel=inspector]');
  if(inspect) need(panel,'the inspector is not shown');
  if(panel) {
   const body=box(panel.querySelector('.console-body')),canvas=panel.querySelector('.lab-canvas'),row=panel.querySelector('.lab-view-buttons'),states=panel.querySelector('.lab-state-buttons'),scroller=panel.querySelector('.lab-inspector');
   // A phone held sideways gets at least 120px of picture; an upright one keeps the stylesheet's floor.
   need(inside(box(canvas),body)&&box(canvas).w>=180&&box(canvas).h>=(innerWidth>innerHeight?119:95),`the picture is ${size(canvas)} in a ${Math.round(body.w)}x${Math.round(body.h)} panel`);
   need(canvas.dataset.renderSize===`${canvas.clientWidth}x${canvas.clientHeight}`,`the picture is drawn at ${canvas.dataset.renderSize}, not ${canvas.clientWidth}x${canvas.clientHeight}`);
   const parts=['.lab-heading','.lab-canvas','.lab-view-buttons','.lab-state-buttons','.lab-help,.lab-error','.lab-control'].map(selector=>panel.querySelector(selector)).filter(node=>node&&node.checkVisibility());
   for(const [index,first] of parts.entries()) for(const second of parts.slice(index+1)) {const a=box(first),b=box(second);need(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=1,`${first.className} overlaps ${second.className}`);}
   // Each control can be brought wholly into the panel, is then the thing under its own centre, and is a full-size target.
   for(const control of [...row.querySelectorAll('button'),...(states?states.querySelectorAll('button'):[]),panel.querySelector('.lab-control select')]) {
    control.scrollIntoView({block:'nearest',inline:'nearest'});const at=box(control),hit=document.elementFromPoint(at.x+at.w/2,at.y+at.h/2),label=control.matches('select')?'the item list':`${states&&states.contains(control)?'state':'view'} button "${name(control)}"`;
    need(inside(at,body)&&(hit===control||control.contains(hit)),`${label} cannot be reached`);need(at.h>=43.5,`${label} is ${size(control)}`);
   }
   scroller.scrollTop=0;row.scrollLeft=0;if(states)states.scrollLeft=0;
  }
  return problems;
 },Boolean(inspect));
 assert.deepEqual(problems,[],label);panelChecks++;
}
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
  assert.equal(await page.locator('.lab-state-buttons button').count(),pack.states?pack.states.length:0);
  if(pack.states) {
   // Service states: each button moves the tagged parts, marks itself, and is named in the link. An item that is hidden
   // while closed opens the state that shows it; any other item leaves the model as it stands. Nothing draws while idle.
   const canvas=page.locator('.lab-canvas'),settle=async id=>{await page.locator(`.lab-canvas[data-ready=true][data-state="${id}"]`).waitFor();await painted();},depth=async()=>Number((await canvas.getAttribute('data-extent')).split('x')[2]);
   const pressed=()=>page.locator('.lab-state-buttons button[aria-pressed=true]').evaluateAll(nodes=>nodes.map(node=>node.textContent));
   assert.equal(await canvas.getAttribute('data-joints'),String(pack.joints));
   await page.locator('.lab-state-buttons').getByRole('button',{name:pack.states[0][0],exact:true}).click();await settle(pack.states[0][1]);const closed=await depth();
   for(const [label,id] of pack.states.slice(1)) {
    await page.locator('.lab-state-buttons').getByRole('button',{name:label,exact:true}).click();await settle(id);
    assert.deepEqual(await pressed(),[label]);assert.equal(new URL(page.url()).searchParams.get('state'),id);assert(await depth()>closed+250,`${pack.id} ${id} must reach further back than closed`);
    await page.locator('.lab-state-note').getByText(label,{exact:false}).waitFor();
   }
   await page.locator('.lab-state-buttons').getByRole('button',{name:pack.states[0][0],exact:true}).click();await settle(pack.states[0][1]);
   assert.equal(await depth(),closed);assert.equal(new URL(page.url()).searchParams.has('state'),false);
   const idle=Number(await canvas.getAttribute('data-renders'));await page.waitForTimeout(600);assert.equal(Number(await canvas.getAttribute('data-renders')),idle,`${pack.id} must not draw while idle`);
   await page.locator('.lab-control select').selectOption(pack.hidden[0]);await settle(pack.hidden[1]);
   await page.locator('.lab-control select').selectOption(pack.away);await painted();assert.equal(await canvas.getAttribute('data-state'),pack.hidden[1]);
   // The maker's steps are listed in order; showing one selects its part in its state and returns to the inspector.
   await page.locator('.console-quick').getByRole('button',{name:'Practice',exact:true}).click();
   assert.deepEqual(await page.locator('.lab-procedure').evaluateAll(nodes=>nodes.map(node=>node.querySelectorAll('.lab-steps li').length)),pack.steps);
   assert.equal(await page.locator('.lab-caution').count(),1);
   await page.locator('.lab-procedure').first().locator('.lab-steps li').nth(3).getByRole('button').click();await settle(pack.states[1][1]);
   assert.equal(await page.locator('.lab-control select').inputValue(),pack.first);
   // A link may name a state, and an unknown state falls back to the resting one.
   await page.goto(`${base}/equipment-lab/?equipment=${pack.id}&component=${pack.away}&state=${pack.states[2][1]}`);await settle(pack.states[2][1]);assert.deepEqual(await pressed(),[pack.states[2][0]]);
   await page.goto(`${base}/equipment-lab/?equipment=${pack.id}&state=not-a-state`);await settle(pack.states[0][1]);
  }
  await page.getByLabel('Find equipment').fill('Panasonic');assert.equal(await page.locator('.lab-card').count(),3);
  await page.getByLabel('Find equipment').fill('Generic Panasonic');assert.equal(await page.locator('.lab-card').count(),1);await page.locator('.lab-card').click();await page.getByText('This is a generic context model.',{exact:false}).waitFor();assert.equal(await page.locator('.lab-canvas').count(),0);
  await page.getByLabel('Find equipment').fill(pack.find);await page.locator('.lab-card').click();await ready(pack);
  assert.equal(await page.locator('.lab-control select').inputValue(),pack.first);
  for(const theme of ['light','dark']) {
   if(await page.locator('html').getAttribute('data-av-theme')!==theme) await page.getByRole('button',{name:theme==='dark'?'Dark mode':'Light mode',exact:true}).click();
   for(const [width,height] of pack.matrix===false?[[1440,900],[375,812]]:[[1440,900],[680,900],[375,812],[844,390],[320,568],[320,256],[3840,1080]]) {
    await page.setViewportSize({width,height}); await bounds(`${pack.id} ${theme} ${width}x${height}`);
    for(const name of ['Inspect','Practice','Reference','Library']) {await page.locator('.console-quick').getByRole('button',{name,exact:true}).click();await bounds(`${pack.id} ${theme} ${width}x${height} ${name}`);await usable(`${pack.id} ${theme} ${width}x${height} ${name}`,name==='Inspect');}
    if(width===3840) { const overflow=await page.locator('.lab-card').evaluateAll(nodes=>nodes.some(node=>node.scrollHeight>node.clientHeight+1)); assert.equal(overflow,false,'Catalog card text must fit'); }
    if(out && [1440,375,3840].includes(width)) {await page.locator('.console-quick').getByRole('button',{name:'Inspect',exact:true}).click();await painted();await page.screenshot({path:join(out,`equipment-${pack.id}-${width}-${theme}.png`)});}
    if(out && SMALL.some(size=>size[0]===width&&size[1]===height)) {await page.locator('.console-quick').getByRole('button',{name:'Inspect',exact:true}).click();await painted();await page.screenshot({path:join(out,`equipment-${pack.id}-${width}x${height}-${theme}.png`)});}
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
  // The same inspector inside the AV console, which shows two panels across at 844x390 and one with a switcher at 320x568.
  for(const theme of ['light','dark']) {
   await page.evaluate(value=>{document.documentElement.dataset.avTheme=value;},theme);
   for(const [width,height] of SMALL) {
    await page.setViewportSize({width,height});await page.locator(`.console-shell.mode-${width<720?'phone':'tablet'}`).waitFor();
    if(width<720) await page.locator('.console-shell>.console-quick').getByRole('button',{name:'Inspect',exact:true}).click();
    await bounds(`native AV ${pack.id} ${theme} ${width}x${height}`);await usable(`native AV ${pack.id} ${theme} ${width}x${height}`,true);
    if(out) await page.screenshot({path:join(out,`equipment-av-native-${pack.id}-${width}x${height}-${theme}.png`)});
   }
  }
  await page.evaluate(()=>{document.documentElement.dataset.avTheme='light';});await page.setViewportSize({width:1440,height:900});
  await page.getByLabel('Find equipment').fill('SM58');assert.equal(await page.locator('.lab-card').count(),1);
  if(out)await page.screenshot({path:join(out,`equipment-av-native-${pack.id}.png`)});
 }
 // Changing package inside one visit replaces the viewer and its item list.
 await page.goto(`${base}/equipment-lab/?equipment=C02`);await ready(PACKAGES[0]);
 await page.getByLabel('Find equipment').fill('Barco');await page.locator('.lab-card').click();await ready(PACKAGES[1]);assert.equal(await page.locator('.lab-control option').count(),26);assert.equal(new URL(page.url()).searchParams.get('component'),'io.keypad');
 // Leaving a package that has states and coming back starts it at rest again.
 await page.getByLabel('Find equipment').fill('PT-DW830');await page.locator('.lab-card').click();await ready(PACKAGES[2]);await page.locator('.lab-state-buttons').getByRole('button',{name:'Lamp cover open',exact:true}).click();await page.locator('.lab-canvas[data-state=coverOpen]').waitFor();
 await page.getByLabel('Find equipment').fill('PT-RZ970');await page.locator('.lab-card').click();await ready(PACKAGES[3]);assert.equal(await page.locator('.lab-state-buttons').count(),0);assert.equal(new URL(page.url()).searchParams.has('state'),false);
 await page.getByLabel('Find equipment').fill('PT-DW830');await page.locator('.lab-card').click();await ready(PACKAGES[2]);await page.locator('.lab-canvas[data-state=closed]').waitFor();
 await page.getByLabel('Find equipment').fill('Cartoni');await page.locator('.lab-card').click();await ready(PACKAGES[0]);assert.equal(await page.locator('.lab-control option').count(),10);assert.equal(new URL(page.url()).searchParams.get('component'),'head.tiltDrag');
 // The bare route is the splash library; deep links keep opening the workspace.
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'/equipment-lab/');await page.locator('.lab-splash').waitFor();
 assert.equal(await page.locator('.splash-card').count(),ENTRIES);assert.equal(await page.locator('.lab-canvas').count(),0);
 const tabCounts=await page.locator('.splash-tabs [role=tab]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.count)));assert.equal(tabCounts[0],ENTRIES);assert.equal(tabCounts.slice(1).reduce((sum,count)=>sum+count,0),ENTRIES);
 const previews=await page.locator('.splash-window img').evaluateAll(nodes=>[...new Set(nodes.map(node=>node.getAttribute('src')))]);assert.equal(previews.length,28);
 for(const src of previews) assert.equal((await page.request.get(new URL(src,base).href)).status(),200,src);
 assert.equal(await page.locator('.splash-grid .splash-window.pending').count(),2);
 await page.getByLabel('Find equipment').fill('Panasonic');assert.equal(await page.locator('.splash-card').count(),3);
 await page.getByLabel('Find equipment').fill('Generic Panasonic');assert.equal(await page.locator('.splash-card').count(),1);await page.locator('.splash-card').click();await page.locator('.splash-sheet').getByText('Generic context model.',{exact:false}).waitFor();await page.getByLabel('Find equipment').fill('');
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
 assert.deepEqual(errors,[]);assert.equal(losses,PACKAGES.length,'each package loses its context once, on purpose');console.log(JSON.stringify({result:'pass',entries:ENTRIES,packages:Object.fromEntries(PACKAGES.map(pack=>[pack.id,{controls:pack.controls,textures:pack.textures,views:pack.views,...(pack.states?{states:pack.states.length,jointNodes:pack.joints,steps:pack.steps}:{})}])),nativePanels:4,splashCards:ENTRIES,splashPreviews:previews.length,viewportChecks:results.length,panelChecks,fallback:true,contextLoss:losses,failureCases:4*PACKAGES.length,errors,base}));if(out)await writeFile(join(out,'results.json'),JSON.stringify({result:'pass',results,errors,base},null,2));
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
