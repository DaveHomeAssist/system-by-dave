const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium, webkit } = require('playwright');
const registry = require('../js/sbd-registry.js').SBD_REGISTRY;
const base = process.env.VIEWPORT_BASE || 'http://localhost:4173/';
const routes = (process.env.VIEWPORT_ROUTES || 'show-advance').split(',');
(async () => {
 const browser = await (process.env.VIEWPORT_BROWSER === 'webkit' ? webkit.launch() : chromium.launch({ channel:'chrome' }));
 for (const id of routes) {
  const tool = registry.toolById(id);
  const context = await browser.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce', colorScheme:'dark', acceptDownloads:true });
  const page = await context.newPage(); const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(base+tool.href);await page.waitForSelector('[data-av-viewport=ready]');
  assert.equal(await page.locator('html').getAttribute('data-av-theme'),'dark');
  async function activate(view) {await page.evaluate(view=>{const url=new URL(location.href);url.searchParams.set('taskView',view);history.pushState(null,'',url);dispatchEvent(new PopStateEvent('popstate'));},view);}
  async function reveal(selector) {
   const view=await page.locator(selector).evaluate(node=>node.closest('.av-view')?.id);if(view)await activate(view);
   const panel=page.locator('#'+view);const previous=panel.getByRole('button',{name:'Previous',exact:true});
   while(await previous.isEnabled())await previous.click();
   for(let n=0;n<40&&!await page.locator(selector).isVisible();n++){const next=panel.getByRole('button',{name:'Next',exact:true});assert.equal(await next.isEnabled(),true,`No page contains ${selector}`);await next.click();}
   assert.equal(await page.locator(selector).isVisible(),true,selector);
  }
  const handoff=id==='show-handoff';
  const sample=handoff?'#sampleBtn':'#loadSampleBtn',exportButton=handoff?'#exportBtn':'#exportJsonBtn',importInput=handoff?'#importFile':'#importInput';
  await reveal(sample);await page.locator(sample).click();
  const key=tool.storageKeys[0].key;
  await page.waitForFunction(key=>!!localStorage.getItem(key),key);
  await reveal('#showName');await page.locator('#showName').fill('Viewport round trip fixture');
  await page.waitForTimeout(400);
  const before=await page.evaluate(key=>localStorage.getItem(key),key);
  for(const view of await page.locator('.av-view').evaluateAll(nodes=>nodes.map(node=>node.id)))await activate(view);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before,'navigation must not write application state');
  await reveal(exportButton);
  let pending=page.waitForEvent('download');await page.locator(exportButton).click();const exported=await pending;
  const payload=JSON.parse(await fs.readFile(await exported.path(),'utf8'));assert.equal(payload.meta.showName,'Viewport round trip fixture');
  await page.locator(importInput).setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await page.waitForFunction(()=>/imported/i.test(document.getElementById('hint').textContent));
  await reveal(exportButton);pending=page.waitForEvent('download');await page.locator(exportButton).click();const repeated=JSON.parse(await fs.readFile(await (await pending).path(),'utf8'));
  delete payload.exportedAt;delete repeated.exportedAt;assert.deepEqual(repeated,payload,'JSON round trip preserves every exported field and record identity');
  if(await page.locator('#exportCsvBtn').count()){await reveal('#exportCsvBtn');const pendingCsv=page.waitForEvent('download');await page.locator('#exportCsvBtn').click();const csv=await pendingCsv;assert.match(csv.suggestedFilename(),/\.csv$/);assert((await fs.readFile(await csv.path(),'utf8')).split('\n').length>1);}
  const copyButton=handoff?'#copyBtn':'#copySummaryBtn';
  if(await page.locator(copyButton).count()){await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copyFixture=text;}}}));await reveal(copyButton);await page.locator(copyButton).click();await page.waitForFunction(()=>!!window.copyFixture);assert((await page.evaluate(()=>window.copyFixture)).includes('Viewport round trip fixture'));}
  const saved=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.locator(importInput).setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});
  await page.waitForFunction(()=>document.getElementById('hint').classList.contains('error'));
  assert.equal(await page.locator('#hint').isVisible(),true,'failed import is reachable');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved,'invalid import preserves saved work');
  await page.locator('#viewportTheme').click();await page.reload();await page.waitForSelector('[data-av-viewport=ready]');
  assert.equal(await page.locator('html').getAttribute('data-av-theme'),'light','the operator choice survives reload');assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),saved);
  await activate(handoff?'actionsView':'recordsView');const panel=page.locator('.table-wrap').first();await panel.evaluate(node=>{node.scrollTop=node.scrollHeight;node.scrollLeft=node.scrollWidth;});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const scroll=await panel.evaluate(node=>({top:node.scrollTop,left:node.scrollLeft}));await activate('metadataView');await activate(handoff?'actionsView':'recordsView');
  assert.deepEqual(await panel.evaluate(node=>({top:node.scrollTop,left:node.scrollLeft})),scroll,'record scroll position restores');
  await page.setViewportSize({width:375,height:812});const notes = await page.locator(handoff?'#notesView textarea':'#selectedView textarea').first().getAttribute('id');await reveal('#'+notes);await page.locator('#'+notes).fill('Fixture notes remain attached to the selected record.');
  await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));await page.emulateMedia({media:'print'});for(const view of await page.locator('.av-view:not(#operatorView)').all())assert.equal(await view.isVisible(),true);assert((await page.locator('.av-print-text').allTextContents()).some(text=>text.includes('Fixture notes remain attached')));await page.emulateMedia({media:'screen'});
  assert.deepEqual(errors,[]);await context.close();console.log('PASS',id,'navigation, all-field JSON round trip, rejected import, theme/save/reload, selected edit, scroll restoration, print');
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
