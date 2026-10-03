#!/usr/bin/env node
// Touch-enabled viewport matrix and direct-entry offline acceptance for the first shell consumers.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {join,extname,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit,devices} from 'playwright';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{let file=join(ROOT,new URL(req.url,'http://local').pathname);if((await stat(file)).isDirectory())file=join(file,'index.html');res.writeHead(200,{'content-type':MIME[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.AV_WORKSPACE_BASE||`http://127.0.0.1:${server.address().port}/`;
const engine=process.env.AV_WORKSPACE_BROWSER||'chromium';
assert.ok(['chromium','webkit'].includes(engine),'supported browser engine');
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const sizes=[[360,800],[390,844],[430,932],[768,1024],[820,1180],[1024,1366],[680,900],[1440,900],[2560,720],[320,800]];
const evidence=[];const failures=[];const output=process.env.AV_WORKSPACE_EVIDENCE;
if(output)await mkdir(output,{recursive:true});
function geometry(){
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
 const root=document.documentElement;
 const inside=(r,b)=>r.x>=b.x-1&&r.y>=b.y-1&&r.right<=b.right+1&&r.bottom<=b.bottom+1;
 const bad=[];
 // Traverse all control pages through standard focus, keeping each real input and its label together.
 for(const input of document.querySelectorAll('.av-page-content input:not([type=hidden]):not([type=file]),.av-page-content select,.av-page-content textarea,.av-page-content button,.av-page-content a[href],.av-page-content summary')){
  if(!input.checkVisibility()||input.disabled||(input.closest('details:not([open])')&&!input.matches('summary')))continue;
  input.focus({preventScroll:true});
  const win=input.closest('.av-paged').querySelector('.av-page-window');const r=rect(input),b=rect(win);
  const label=input.labels?.[0];
  if(!inside(r,b)||(label&&!inside(rect(label),b)))bad.push({id:input.id,tag:input.tagName,text:input.textContent.slice(0,60),rect:r,bounds:b,label:label?rect(label):null});
 }
 const shell=document.querySelectorAll('[data-workflow-tab],.header-actions button,.mobile-dock button,.workspace-links a,.topbar button,.topbar a,.led-section-nav button,.sbd-nav a');
 for(const control of shell){if(!control.checkVisibility())continue;const r=rect(control);if(r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1)bad.push({id:control.id,shell:control.textContent,rect:r});}
 const results=[...document.querySelectorAll('#ledResultStrip .led-result,#hDist')].filter(e=>e.checkVisibility()).map(e=>({id:e.id,rect:rect(e)}));
 const small=[...document.querySelectorAll('button,a[href],input,select,summary')].filter(e=>{
  if(!e.checkVisibility()||e.disabled)return false;const r=rect(e);
  if(r.w===0||r.h===0||r.x<0||r.y<0||r.right>innerWidth||r.bottom>innerHeight)return false;
  const win=e.closest('.av-page-window');if(win&&!inside(r,rect(win)))return false;
  return r.w<43.5||r.h<43.5;
 }).map(e=>({id:e.id,text:e.textContent.slice(0,35),rect:rect(e)}));
 return {width:innerWidth,height:innerHeight,touch:navigator.maxTouchPoints,touchEvent:window.workspaceTouchObserved===true,coarse:matchMedia('(pointer:coarse)').matches,meta:document.querySelector('meta[name=viewport]').content,root:{width:root.scrollWidth,height:root.scrollHeight,overflow:getComputedStyle(root).overflow},bodyOverflow:getComputedStyle(document.body).overflow,bad,small,results,fields:[...document.querySelectorAll('input,select,textarea')].filter(e=>e.checkVisibility()).map(e=>({id:e.id,font:parseFloat(getComputedStyle(e).fontSize)}))};
}
try{
 for(const [tool,route] of [['stage','ProjectorThrow/Stage3D.html'],['led','led-wall-calculator.html']]){
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>document.addEventListener('touchstart',()=>{window.workspaceTouchObserved=true;},{once:true}));
  const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL(route,base).href,{waitUntil:'networkidle'});
  if(tool==='stage'){await page.locator('#onboardingExplore').tap();await page.waitForFunction(()=>document.activeElement.id==='stage-workspace');await page.locator('#sw').focus();for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#sw').inputValue(),'22.5');}
  else{await page.locator('#ledCabinetsWide').tap();await page.locator('#ledCabinetsWide').fill('10');await page.locator('#ledCabinetsHigh').fill('6');await page.keyboard.press('Tab');assert.match(await page.locator('#ledNativeRaster').innerText(),/1,720 × 1,032/);}
  for(const theme of ['light','dark']){
   if(theme==='dark')await page.locator('#themeToggle').tap();
   for(const [w,h] of sizes){for(const [orientation,width,height] of [['portrait',w,h],['landscape',h,w]]){
    await page.setViewportSize({width,height});
    if(engine==='chromium')await (await context.newCDPSession(page)).send('Emulation.setDeviceMetricsOverride',{width,height,mobile:true,deviceScaleFactor:3,screenWidth:width,screenHeight:height,screenOrientation:{type:orientation==='portrait'?'portraitPrimary':'landscapePrimary',angle:orientation==='portrait'?0:90}});
    await page.waitForFunction(()=>{const root=document.documentElement,pane=parseFloat(getComputedStyle(root).getPropertyValue('--av-pane-min'));return root.dataset.workspaceShort===String(visualViewport.height<pane*2)&&root.style.getPropertyValue('--av-available-height')===`${visualViewport.height}px`;});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const state=await page.evaluate(geometry);state.tool=tool;state.theme=theme;state.orientation=orientation;
    const fail=[];
    if(state.root.width>width||state.root.height>height||state.root.overflow!=='hidden'||state.bodyOverflow!=='hidden')fail.push('viewport lock');
    if(!state.touchEvent||!state.coarse||!state.meta.includes('viewport-fit=cover'))fail.push('touch/meta');
    if(state.bad.length)fail.push('paged input or label clipped');
    if(state.small.length)fail.push('small target');
    if(state.fields.some(f=>f.font<16))fail.push('input type size');
    if(tool==='stage'){
     const onboarding=await page.evaluate(()=>{const d=document.getElementById('onboardingDialog');d.showModal();const box=e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;};const ok=box(d)&&[...d.querySelectorAll('button')].filter(e=>e.checkVisibility()).every(box)&&d.scrollHeight<=d.clientHeight+1;d.close();return ok;});
     if(!onboarding)fail.push('onboarding clipped');
    }
    if(state.results.some(({rect:r})=>r.x<0||r.y<0||r.right>width+1||r.bottom>height+1))fail.push('result clipped');
    if(tool==='stage'&&await page.locator('#sw').inputValue()!=='22.5')fail.push('rotation state');
    if(tool==='led'&&await page.locator('#ledCabinetsHigh').inputValue()!=='6')fail.push('rotation state');
    evidence.push({...state,fail});if(fail.length)failures.push(`${tool} ${width}x${height} ${theme}: ${fail.join(', ')} ${JSON.stringify({bad:state.bad,small:state.small})}`);
    if(output&&w<=1024&&h<=1366)await page.screenshot({path:join(output,`${tool}-${w}x${h}-${orientation}-${theme}.png`),scale:'css'});
   }}
  }
  // All subject tabs expose their existing fields through the same paging contract.
  await page.setViewportSize({width:844,height:390});
  if(engine==='chromium')await (await context.newCDPSession(page)).send('Emulation.clearDeviceMetricsOverride');
  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(200);
  const tabs=tool==='stage'?'[data-workflow-tab]':'[data-led-jump]';
  for(let i=0;i<await page.locator(tabs).count();i++){
   await page.locator(tabs).nth(i).tap();await page.waitForTimeout(100);
   const check=await page.evaluate(geometry);if(check.bad.length)failures.push(`${tool} tab ${i}: ${JSON.stringify(check.bad)}`);
  }
  if(tool==='stage'){
   await page.locator('#fieldVerifyToggle').tap();
   await page.waitForFunction(()=>document.activeElement.id==='measuredDistance');
   assert.equal(await page.locator('#workflowTabDeliver').getAttribute('aria-selected'),'true','Field Verify reveals Deliver');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'measuredDistance','Field Verify focuses the first measurement');
   assert.equal(await page.locator('[data-mobile-panel-button=adjust]').getAttribute('aria-expanded'),'true','Field Verify synchronizes its trigger');
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.mobilePanelButton),'adjust','Field Verify dismissal restores Adjust focus');
   for(const name of ['view','facts','export']){
    await page.locator(`[data-mobile-panel-button="${name}"]`).tap();await page.waitForTimeout(100);
    const sheet=await page.evaluate(()=>{const hud=document.querySelector('.hud').getBoundingClientRect();const visible=[...document.querySelectorAll('.scene-toolbar,.facts,.mobile-exports')].filter(e=>e.checkVisibility());return{count:visible.length,clear:visible.every(e=>{const r=e.getBoundingClientRect();return r.top>=hud.bottom-1&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;})};});
    assert.ok(sheet.count===1&&sheet.clear,'one bounded sheet stays clear of HUD');
    if(name==='facts'){const range=await page.evaluate(()=>{const e=document.getElementById('hWide'),f=document.querySelector('.facts');f.avPager.reveal(e);const r=e.getBoundingClientRect(),w=f.querySelector('.av-page-window').getBoundingClientRect();return e.checkVisibility()&&r.left>=w.left-1&&r.right<=w.right+1&&r.top>=w.top-1&&r.bottom<=w.bottom+1&&document.getElementById('hTele').checkVisibility();});assert.ok(range,'wide and tele throw distances remain readable in Facts');}
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.body.dataset.mobilePanel),'','Escape dismisses sheet');
   }
  }
  if(tool==='led')await page.locator('[data-led-jump=ledLayoutSection]').tap();
  const active=page.locator(tool==='stage'?'#measuredDistance':'#ledCabinetsWide');
  await active.focus();await page.setViewportSize({width:390,height:400});
  await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--av-available-height')===`${visualViewport.height}px`);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const reducedHeight=await page.evaluate(()=>{
   const inside=(e,b)=>{const r=e.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1;};
   const active=document.activeElement,win=active.closest('.av-paged').querySelector('.av-page-window').getBoundingClientRect();
   const results=[...document.querySelectorAll('#ledResultStrip strong,#hDist')];
   return {ok:inside(active,win)&&(!active.labels?.[0]||inside(active.labels[0],win))&&results.every(e=>inside(e,e.closest('#ledResultStrip')?.getBoundingClientRect()||{left:0,top:0,right:innerWidth,bottom:innerHeight})),results:results.map(e=>({id:e.id,text:e.textContent,rect:e.getBoundingClientRect().toJSON(),strip:e.closest('#ledResultStrip')?.getBoundingClientRect().toJSON()})),id:active.id,input:active.getBoundingClientRect().toJSON(),label:active.labels?.[0]?.getBoundingClientRect().toJSON(),win:win.toJSON()};
  });
  assert.ok(reducedHeight.ok,`${tool} reduced-height input, label and results remain visible: ${JSON.stringify(reducedHeight)}`);
  await page.setViewportSize({width:390,height:844});
  const themeBefore=await page.locator('#themeToggle').getAttribute('aria-label');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#themeToggle').getAttribute('aria-label'),themeBefore,`${tool} theme persists`);
  if(errors.length)failures.push(`${tool} runtime errors: ${errors.join('; ')}`);await context.close();
 }
 if(output)await writeFile(join(output,'matrix.json'),JSON.stringify(evidence,null,2));
 if(failures.length){console.error(failures.join('\n'));throw new Error(`${failures.length} workspace cases failed`);}
 console.log(`PASS ${engine}: ${evidence.length} touch viewport/theme cases, labels, inputs, results and rotation state`);
 // Independent first visits must prepare the SAME shared worker, then actually reload without a network.
 if(engine==='webkit')console.log('SKIP WebKit offline reload: desktop automation returns an internal navigation error with network disabled; Chromium runs perform the independent offline acceptance.');
 for(const route of engine==='webkit'?[]:['led-wall-calculator.html','ProjectorThrow/?workspace=planner','ProjectorThrow/Stage3D.html']){
  const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage();
  await page.goto(new URL(route,base).href,{waitUntil:'networkidle'});
  const stage=route.endsWith('Stage3D.html');
  await page.waitForFunction(stage?()=>document.documentElement.dataset.offline==='ready':()=>document.documentElement.dataset.workspaceOffline==='ready',null,{timeout:60000});
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
  const field=page.locator(stage||route.includes('planner')?'#sw':'#ledCabinetsWide');
  assert.ok(await field.count(),`${route} offline form`);
  if(stage){await page.locator('#onboardingExplore').tap();await page.waitForFunction(()=>document.activeElement.id==='stage-workspace');await field.focus();const before=await field.inputValue();await page.keyboard.press('ArrowRight');assert.notEqual(await field.inputValue(),before,'offline slider updates');}
  else{if(route.includes('planner'))await page.locator('button[data-mobile-view=setup]').tap();await field.fill(route.includes('planner')?'20':'12');await page.keyboard.press('Tab');assert.equal(parseFloat(await field.inputValue()),route.includes('planner')?20:12,'offline editing works');}
  await context.close();console.log(`PASS direct offline reload ${route}`);
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
