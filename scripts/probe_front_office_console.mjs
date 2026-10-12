import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { KEY, ADVANCE_KEY, ADVANCE_SCHEMA } from '../front-office/model.mjs';

// Synthetic records and disposable browser contexts only, including on live URLs.
const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://probe').pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.OFFICE_BASE || `http://127.0.0.1:${server.address().port}`;
const output = process.env.OFFICE_OUTPUT || join(tmpdir(), 'front-office-console-evidence');
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.OFFICE_CHROME ? { executablePath: process.env.OFFICE_CHROME } : {};
const draftKey = 'sbd.frontOffice.draft.v1', layoutKey = 'sbd.frontOffice.layout.v1';
const fixture = {version:1,clients:[{id:'c1',name:'Synthetic client',contact:'Contact',notes:'Client notes'},{id:'c2',name:'Second client',contact:'',notes:''}],venues:[{id:'v1',name:'Synthetic venue',location:'Location',notes:'Venue notes'},{id:'v2',name:'Second venue',location:'',notes:''}],jobs:Array.from({length:20},(_,i)=>({id:'j'+i,name:'Synthetic show '+(i+1),clientId:'c1',venueId:'v1',stage:'Inquiry',nextAction:'Confirm date',updates:[{id:'u'+i,body:'Initial note',date:'2026-10-12T12:00:00Z'}]}))};
const source = {schema:ADVANCE_SCHEMA,meta:{showName:'Advance fixture',client:'Source client',venue:'Source venue',showDate:'2026-10-12'},items:[{id:'a1',section:'power',ask:'Confirm shore power',owner:'Venue',due:'Tomorrow',priority:'high',status:'custom-status',details:'Synthetic',notes:'Retained'}]};
const panels = [['Jobs','jobs'],['Clients','clients'],['Venues','venues'],['Job updates','updates'],['Advance import','advance'],['Backup','backup']];

const read = (page, key = KEY) => page.evaluate(key => localStorage.getItem(key), key);
const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const quick = (page, name) => button(page.locator('.console-quick'), name).click();
const panel = (page, type) => page.locator(`.console-panel[data-panel="${type}"]`);
const jsonFile = value => ({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
const contexts = [], errors = [], passed = [];
let browser, page;
async function fresh(viewport = { width: 1440, height: 900 }, init) {
  const context = await browser.newContext({ viewport, hasTouch: true, acceptDownloads: true }); contexts.push(context);
  if (init) await context.addInitScript(init);
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.goto(`${base}/front-office/`); await page.locator('.console-shell').waitFor();
  return { page, context };
}
async function seed(page, value = fixture) { await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value }); await page.reload(); }
async function save(page) {
  if (!await page.locator('#saveBtn').isVisible()) await button(page, 'Front Office controls').click();
  await page.locator('#saveBtn').click();
  // A previous successful Save message can remain while the next Web Lock waits.
  await page.waitForFunction(() => !document.querySelector('.office-header p').textContent.includes('Unsaved records') && /Saved to this browser|Recovered document saved/.test(document.getElementById('footerMessage').textContent));
  if (await button(page, 'Back to panels').isVisible()) await button(page, 'Back to panels').click();
}
async function exportPlan(page) { await quick(page, 'Backup'); const downloaded = page.waitForEvent('download'); await button(panel(page, 'backup'), 'Export JSON').click(); return JSON.parse(await readFile(await (await downloaded).path(), 'utf8')); }
async function reachable(control, label = String(control)) {
  await control.scrollIntoViewIfNeeded();
  const r = await control.evaluate(element => {
    const box = element.getBoundingClientRect(); let top = 0, bottom = innerHeight, left = 0, right = innerWidth;
    const clips = [];
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
      if (/(hidden|auto|scroll|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      if (/(hidden|auto|scroll|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      if (/(hidden|auto|scroll|clip)/.test(style.overflowX+' '+style.overflowY)) clips.push({tag:node.tagName,className:node.className,rect:bounds.toJSON(),clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,scrollTop:node.scrollTop,overflowX:style.overflowX,overflowY:style.overflowY});
      if (node instanceof HTMLDialogElement && node.matches(':modal')) break;
    }
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return { width: box.width, height: box.height, inside: box.top >= top - 1 && box.bottom <= bottom + 1 && box.left >= left - 1 && box.right <= right + 1, hit: hit === element || element.contains(hit), viewport:{width:innerWidth,height:innerHeight},box:box.toJSON(),visible:{top,bottom,left,right},clips };
  });
  assert.ok(r.width >= 44 && r.height >= 44 && r.inside && r.hit, `${label}: ${JSON.stringify(r)}`);
}
async function noOverflow(scope, label) {
  const bounds = await scope.locator('html').evaluate(el => ({ h: el.scrollHeight, ch: el.clientHeight, w: el.scrollWidth, cw: el.clientWidth }));
  assert.ok(bounds.h <= bounds.ch && bounds.w <= bounds.cw, `${label}: ${JSON.stringify(bounds)}`);
}
function pass(name) { passed.push(name); console.log(`PASS ${name}`); }

async function importSource(page, value, saved = false) {
  await quick(page,'Advance import'); await button(page,'Import Show Advance').click();
  if(saved){await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:ADVANCE_KEY,raw:typeof value==='string'?value:JSON.stringify(value)});await button(page,'Read saved Show Advance').click();}
  else await page.locator('#importFile').setInputFiles(jsonFile(value));
  await page.locator('#confirmImport:enabled').waitFor();
}
async function bindNew(page) {await page.getByLabel('Bind client').selectOption('');await page.getByLabel('Bind venue').selectOption('');}
async function editJob(page, text) {await quick(page,'Job updates');await panel(page,'updates').getByLabel('Next action',{exact:true}).fill(text);await button(page,'Update job').click();}
try {
  await mkdir(output,{recursive:true});
  browser=await chromium.launch({headless:true,...channel,args:['--no-sandbox']});
  const primary=await fresh();page=primary.page;
  assert.deepEqual(await page.locator('.console-panel').evaluateAll(nodes=>nodes.map(n=>n.dataset.panel)),['jobs','clients','venues']);
  assert.equal(await read(page),null);assert.equal(await read(page,layoutKey),null);
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
  const clients=panel(page,'clients'),venues=panel(page,'venues'),jobs=panel(page,'jobs');
  await clients.getByLabel('Client name',{exact:true}).fill('New client');await clients.getByLabel('Contact',{exact:true}).fill('Synthetic contact');await clients.getByLabel('Client notes').fill('Retained client note');
  await quick(page,'Backup');await page.locator('#saveBtn').click();assert.match(await page.locator('#footerMessage').textContent(),/unfinished forms/);assert.equal(await read(page),null);
  await quick(page,'Clients');assert.equal(await clients.getByLabel('Client name',{exact:true}).inputValue(),'New client');await button(clients,'Add client').click();
  await venues.getByLabel('Venue name',{exact:true}).fill('New venue');await venues.getByLabel('Location',{exact:true}).fill('Synthetic location');await venues.getByLabel('Venue notes').fill('Retained venue note');await button(venues,'Add venue').click();
  await jobs.getByLabel('Job name',{exact:true}).fill('New show');await jobs.getByRole('combobox',{name:/^Client/}).selectOption({label:'New client'});await jobs.getByRole('combobox',{name:/^Venue/}).selectOption({label:'New venue'});await jobs.getByLabel('Next action',{exact:true}).fill('Book room');await button(jobs,'Add job').click();
  assert.equal(await read(page),null);await quick(page,'Job updates');
  await page.getByRole('combobox',{name:/^Stage/}).selectOption('Confirmed');await page.getByLabel('Update note').fill('Date agreed');await page.getByLabel('Next action',{exact:true}).fill('Book crew');await button(page,'Update job').click();await save(page);
  let saved=JSON.parse(await read(page));assert.equal(saved.clients[0].notes,'Retained client note');assert.equal(saved.venues[0].location,'Synthetic location');assert.equal(saved.jobs[0].stage,'Confirmed');assert.equal(saved.jobs[0].updates[0].body,'Date agreed');assert.equal(saved.jobs[0].nextAction,'Book crew');
  await quick(page,'Jobs');await jobs.getByLabel('Filter jobs by stage').selectOption('Show');assert.equal(await page.locator('.office-job').count(),0);await jobs.getByLabel('Filter jobs by stage').selectOption('all');assert.equal(await page.locator('.office-job').count(),1);
  assert.deepEqual(await exportPlan(page),saved);await page.reload();await quick(page,'Job updates');assert.match(await panel(page,'updates').textContent(),/Date agreed/);
  pass('six working panels, complete record fields, pending-form protection, stages, dated history, explicit Save/reload/export');

  await seed(page);await quick(page,'Job updates');await page.getByLabel('Update note').fill('Unfinished first job');await page.getByLabel('Selected job').selectOption('j1');assert.equal(await page.getByLabel('Update note').inputValue(),'');await page.getByLabel('Selected job').selectOption('j0');assert.equal(await page.getByLabel('Update note').inputValue(),'Unfinished first job');
  await button(page,'Job updates options').click();await page.getByRole('menuitem',{name:'Close panel',exact:true}).click();await quick(page,'Job updates');assert.equal(await page.getByLabel('Update note').inputValue(),'Unfinished first job');await button(page,'Clear update form').click();
  await button(page,'Maximize Job updates').click();assert.equal(await page.locator('.console-panel').count(),1);await button(page,'Restore Job updates').click();
  await button(page,'Job updates options').click();await page.getByRole('menuitem',{name:'Move and size…',exact:true}).click();await page.getByRole('menuitem',{name:'Narrower',exact:true}).focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Job updates options');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Job updates options');
  await button(page,'View options').click();await page.getByRole('menuitem',{name:'Store as new view',exact:true}).click();await button(page,'View options').click();await page.getByRole('menuitem',{name:'Rename…',exact:true}).click();await page.getByLabel('View name').fill('Production desk');await page.getByRole('menuitem',{name:'Rename',exact:true}).click();await save(page);
  saved=JSON.parse(await read(page));assert.equal(saved.workspace.views.at(-1).name,'Production desk');assert.equal(saved.jobs.length,20);await page.reload();await page.getByRole('tab',{name:'Production desk',exact:true}).waitFor();
  pass('panel close/reopen, selection-safe pending updates, maximize, keyboard sizing/focus and named-view backup');

  const imports=(await fresh()).page;const raw=JSON.stringify(source,null,4);
  await importSource(imports,raw,true);assert.equal(await imports.getByLabel('Bind client').inputValue(),'__choose');assert.match(await imports.getByRole('dialog',{name:'Review import'}).textContent(),/Unrecognized source statuses retained: custom-status/);
  await imports.locator('#confirmImport').click();assert.match(await imports.locator('#importPreview').textContent(),/Explicitly choose/);assert.equal(await read(imports),null);
  await bindNew(imports);await button(imports,'Close import').click();assert.equal(await read(imports),null);
  await importSource(imports,raw,true);await bindNew(imports);await imports.locator('#confirmImport').click();assert.equal(await read(imports),null);await save(imports);
  const first=JSON.parse(await read(imports));assert.equal(first.jobs[0].sourceAdvance.raw,raw);assert.equal(first.jobs[0].stage,'Advance');assert.equal(first.jobs[0].nextAction,'');assert.equal(await read(imports,ADVANCE_KEY),raw);
  await quick(imports,'Job updates');let downloaded=imports.waitForEvent('download');await button(imports,'Export original Show Advance').click();assert.equal(await readFile(await(await downloaded).path(),'utf8'),raw);
  await quick(imports,'Advance import');await button(imports,'Import Show Advance').click();await button(imports,'Read saved Show Advance').click();assert.match(await imports.locator('#importPreview').textContent(),/already copied/);assert.equal(await imports.locator('#confirmImport').isDisabled(),true);await button(imports,'Close import').click();
  const changed=structuredClone(source);changed.items[0].status='confirmed';await importSource(imports,changed);assert.match(await imports.locator('#importPreview').textContent(),/separate job/);await imports.getByLabel('Bind client').selectOption(first.clients[0].id);await imports.getByLabel('Bind venue').selectOption(first.venues[0].id);await imports.locator('#confirmImport').click();await save(imports);
  const copied=JSON.parse(await read(imports));assert.equal(copied.jobs.length,2);assert.equal(copied.clients.length,1);assert.equal(copied.venues.length,1);assert.equal(copied.jobs[0].sourceAdvance.raw,raw);
  const blank=structuredClone(source);blank.meta={showName:'',client:'',venue:'',showDate:''};await importSource(imports,blank);await bindNew(imports);await imports.locator('#confirmImport').click();assert.match(await imports.locator('#importPreview').textContent(),/Client name is required/);await imports.getByLabel('New client name').fill('Explicit client');await imports.getByLabel('New venue name').fill('Explicit venue');await imports.getByLabel('Imported job name').fill('Explicit show');await imports.locator('#confirmImport').click();assert.equal((await exportPlan(imports)).jobs.length,3);
  pass('saved/file Advance review, explicit existing/new identity binding, blank metadata, exact-original export, repeat rejection and changed-source separation');

  await quick(imports,'Advance import');await button(imports,'Import Show Advance').click();
  for(const bad of ['{bad',{schema:'future'},{...source,items:[source.items[0],source.items[0]]},'x'.repeat(1_000_001)]){await imports.locator('#importFile').setInputFiles(jsonFile(bad));await imports.getByText(/Import rejected:/).waitFor();assert.equal(await imports.locator('#confirmImport').isDisabled(),true);}
  await button(imports,'Close import').click();await quick(imports,'Backup');await button(imports,'Restore backup').click();
  for(const bad of [{...copied,workspace:{version:42,views:[]}},'x'.repeat(2_000_001),{...copied,jobs:[{...copied.jobs[0],clientId:'missing'}]}]){await imports.locator('#importFile').setInputFiles(jsonFile(bad));await imports.getByText(/Import rejected:/).waitFor();assert.equal(await imports.locator('#confirmImport').isDisabled(),true);}
  await imports.locator('#importFile').setInputFiles(jsonFile(copied));await imports.locator('#confirmImport:enabled').waitFor();await button(imports,'Close import').click();assert.equal((await exportPlan(imports)).jobs.length,3);
  await button(imports,'Restore backup').click();await imports.locator('#importFile').setInputFiles(jsonFile(copied));await imports.locator('#confirmImport:enabled').waitFor();await imports.evaluate(key=>localStorage.setItem(key,'{"other":"tab"}'),KEY);await imports.locator('#confirmImport').click();assert.match(await imports.locator('#importPreview').textContent(),/changed after preview/);await button(imports,'Close import').click();assert.equal(await read(imports),'{"other":"tab"}');assert.equal((await exportPlan(imports)).jobs.length,3);
  const stale=(await fresh()).page;await importSource(stale,raw,true);await bindNew(stale);await stale.evaluate(key=>localStorage.setItem(key,'changed source'),ADVANCE_KEY);await stale.locator('#confirmImport').click();assert.match(await stale.locator('#importPreview').textContent(),/changed after preview/);assert.equal(await read(stale),null);
  const restore=(await fresh()).page;await quick(restore,'Backup');await button(restore,'Restore backup').click();await restore.locator('#importFile').setInputFiles(jsonFile(copied));await restore.locator('#confirmImport').click();assert.equal(await read(restore),null);await save(restore);assert.deepEqual(await exportPlan(restore),copied);
  pass('malformed/excessive/unknown-version imports refused, cancel preserves work, stale backup/source guarded, exact backup roundtrip');

  await editJob(page,'Unsaved recovery action');await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.doc.jobs[0].nextAction==='Unsaved recovery action',draftKey);assert.deepEqual(JSON.parse(await read(page)),saved);
  await page.reload();await button(page,'Restore draft').click();await quick(page,'Job updates');assert.equal(await page.getByLabel('Next action',{exact:true}).inputValue(),'Unsaved recovery action');await save(page);await page.waitForFunction(key=>localStorage.getItem(key)===null,draftKey);
  const other=await primary.context.newPage();other.on('dialog',dialog=>dialog.accept());await other.goto(base+'/front-office/');await other.locator('.console-shell').waitFor();
  await editJob(page,'First tab action');await save(page);await editJob(other,'Stale second tab action');await other.locator('#saveBtn').click();await other.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('another tab'));assert.equal(JSON.parse(await read(other)).jobs[0].nextAction,'First tab action');assert.equal((await exportPlan(other)).jobs[0].nextAction,'Stale second tab action');await other.close();
  const malformed=(await fresh()).page;await seed(malformed);await malformed.evaluate(key=>localStorage.setItem(key,'{bad draft'),draftKey);await malformed.reload();await editJob(malformed,'Exportable action');await malformed.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('Draft recovery unavailable'));assert.equal(await read(malformed,draftKey),'{bad draft');assert.equal((await exportPlan(malformed)).jobs[0].nextAction,'Exportable action');
  pass('draft offered/restored/cleared, stale-tab write refusal, malformed draft retained and conflicts exportable');

  const damaged=(await fresh()).page;await damaged.evaluate(key=>localStorage.setItem(key,'{unreadable original'),KEY);await damaged.reload();await quick(damaged,'Backup');downloaded=damaged.waitForEvent('download');await button(damaged,'Download unreadable original').click();assert.equal(await readFile(await(await downloaded).path(),'utf8'),'{unreadable original');
  await button(damaged,'Restore backup').click();await damaged.locator('#importFile').setInputFiles(jsonFile(fixture));await damaged.locator('#confirmImport').click();assert.equal(await read(damaged),'{unreadable original');await save(damaged);assert.equal(await damaged.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('sbd.frontOffice.recovery.')).some(key=>localStorage.getItem(key)==='{unreadable original')),true);assert.deepEqual(JSON.parse(await read(damaged)),fixture);
  const refused=(await fresh()).page;await seed(refused);await editJob(refused,'Storage refused');const before=await read(refused);await refused.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Synthetic quota');return set.call(this,k,v);};},KEY);await refused.locator('#saveBtn').click();await refused.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('Synthetic quota'));assert.equal(await read(refused),before);assert.equal((await exportPlan(refused)).jobs[0].nextAction,'Storage refused');
  const unavailable=(await fresh(undefined,()=>{Storage.prototype.getItem=()=>{throw new DOMException('Synthetic denied storage','SecurityError');};})).page;assert.match(await unavailable.locator('#footerMessage').textContent(),/unavailable/);assert.equal(await panel(unavailable,'clients').getByLabel('Client name',{exact:true}).isDisabled(),true);
  const noLocks=(await fresh(undefined,()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}))).page;await seed(noLocks);await editJob(noLocks,'Without locks');await noLocks.locator('#saveBtn').click();await noLocks.getByText(/cannot coordinate saves/).waitFor();assert.equal(JSON.parse(await read(noLocks)).jobs[0].nextAction,'Confirm date');assert.equal((await exportPlan(noLocks)).jobs[0].nextAction,'Without locks');
  pass('unreadable originals preserved before recovery, denied/refused storage and missing Web Locks fail safely');

  const limit=(await fresh({width:320,height:256})).page;
  const full={...fixture,clients:Array.from({length:500},(_,i)=>({id:i===0?'c1':'limit'+i,name:'Client '+i,contact:'',notes:''}))};
  await seed(limit,full);await quick(limit,'Clients');await panel(limit,'clients').getByLabel('Client name',{exact:true}).fill('One too many');await button(limit,'Add client').click();
  assert.match(await limit.locator('#footerMessage').textContent(),/excessive records/);assert.deepEqual(JSON.parse(await read(limit)),full);
  await limit.screenshot({path:join(output,'office-short-validation.png')});
  assert.ok(await limit.locator('#footerMessage').isVisible() || await panel(limit,'clients').getByRole('alert').isVisible(),'Record-limit feedback must be visible beside the active short-height form');
  await quick(limit,'Backup');await button(panel(limit,'backup'),'Save document').click();await limit.locator('#footerMessage').waitFor({state:'visible'});assert.match(await limit.locator('#footerMessage').textContent(),/unfinished forms/);await button(limit,'Back to panels').click();

  await page.reload();await quick(page,'Jobs');
  const sizes=[{width:1440,height:900},{width:1100,height:900},{width:1024,height:768},{width:720,height:900},{width:680,height:812},{width:375,height:812},{width:844,height:390},{width:320,height:256},{width:3840,height:1080}];
  for(const theme of ['light','dark']){
    await page.setViewportSize({width:1440,height:900});if(await page.locator('html').getAttribute('data-av-theme')!==theme)await page.locator('.office-header').getByRole('button',{name:theme==='light'?'Light mode':'Dark mode'}).click();
    for(const size of sizes){
      await page.setViewportSize(size);await page.waitForFunction(({width,height})=>Boolean(document.querySelector('.console-shell.mode-'+(height<500||width<720?'phone':width<1100?'tablet':'desktop'))),size);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      for(const [name,type]of panels){
        await reachable(button(page.locator('.console-quick'),name),theme+'/'+size.width+'/'+name+' switcher');await quick(page,name);await noOverflow(page,theme+'/'+size.width+'/'+name);
        const area=panel(page,type);assert.equal(await area.count(),1);
        const controls=area.locator('input,textarea,select,button,a');for(let i=0;i<await controls.count();i++)await reachable(controls.nth(i),theme+'/'+size.width+'/'+name+'/'+i);
      }
      await button(page,'Restore backup').click();await reachable(page.locator('#importFile'));await reachable(page.locator('#confirmImport'));await button(page,'Close import').click();
      await importSource(page,source);await bindNew(page);for(const label of ['Bind client','Bind venue','New client name','New venue name','Imported job name'])await reachable(page.getByLabel(label));await reachable(page.locator('#confirmImport'));await button(page,'Close import').click();
      if(size.height<500){await button(page,'Front Office controls').click();await reachable(page.locator('#saveBtn'));await reachable(button(page,'Back to panels'));await button(page,'Back to panels').click();}
      await quick(page,'Jobs');if([320,375,1024,1440,3840].includes(size.width))await page.screenshot({path:join(output,'office-'+theme+'-'+size.width+'.png')});
    }
  }
  pass('every panel and import form control reachable at 44px in both themes across nine sizes');

  await page.setViewportSize({width:1440,height:900});const beforeOffline=await read(page);
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/av-suite-worker.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;});await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  assert.equal(await page.evaluate(async()=>{const cache=await caches.open('sbd-av-suite-'+window.SBD_REGISTRY.version);return(await Promise.all(['/front-office/','/front-office/assets/front-office.js','/front-office/assets/index.css'].map(path=>cache.match(path)))).every(Boolean);}),true);
  await primary.context.setOffline(true);await page.reload();await quick(page,'Jobs');assert.equal(await read(page),beforeOffline);assert.equal(await page.locator('.office-job').count(),20);await primary.context.setOffline(false);
  pass('entry and native assets cached, saved records reopened offline');

  const embedded=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});contexts.push(embedded);const host=await embedded.newPage();host.on('dialog',dialog=>dialog.accept());host.on('pageerror',error=>errors.push(error.message));host.setDefaultTimeout(10000);
  await host.goto(base+'/av-video/?sbdShow=Context%20only&sbdVenue=Host%20venue&private=do-not-forward');await host.locator('.sbd-rail__entry[data-rail-ref="console:front-office"]').tap();
  const frame=host.frameLocator('iframe[title="Front Office application"]');await frame.locator('.console-shell').waitFor();assert.equal(new URL(host.url()).pathname,'/av-video/');assert.equal(await frame.locator('.office-nav').isVisible(),false);assert.equal(await frame.locator('.sbd-rail').isVisible(),false);
  await quick(frame,'Advance import');assert.match(await frame.getByLabel('Read-only show context').textContent(),/Context only/);await quick(frame,'Clients');assert.equal(await panel(frame,'clients').getByLabel('Client name',{exact:true}).inputValue(),'');
  for(const size of [{width:1024,height:768},{width:680,height:812},{width:375,height:812},{width:3840,height:1080}]){
    await host.setViewportSize(size);await quick(frame,'Clients');const form=panel(frame,'clients');await reachable(form.getByLabel('Client name',{exact:true}));await noOverflow(frame,'embedded '+size.width);await noOverflow(host,'host '+size.width);await form.getByLabel('Client name',{exact:true}).fill('Touch client '+size.width);await button(form,'Add client').tap();
    await quick(frame,'Backup');await reachable(button(panel(frame,'backup'),'Save document'));await button(panel(frame,'backup'),'Save document').tap();await host.waitForFunction(({key,name})=>JSON.parse(localStorage.getItem(key)||'null')?.clients.some(c=>c.name===name),{key:KEY,name:'Touch client '+size.width});assert.equal(await read(host,'sbd.avVideo.v1'),null);if(size.width===1024)await host.screenshot({path:join(output,'office-embedded-tablet.png')});
  }
  assert.equal((await host.locator('iframe[title="Front Office application"]').getAttribute('src')).includes('private='),false);await host.evaluate(()=>localStorage.setItem('av-theme-mode.v1','light'));await frame.locator('html[data-av-theme="light"]').waitFor();
  pass('real AV Video embedding, independent Save, read-only allowlisted host context and shared theme at touch sizes');
  assert.deepEqual(errors,[]);await writeFile(join(output,'result.json'),JSON.stringify({at:new Date().toISOString(),base,browser:browser.version(),passed,physicalDevices:'not tested',virtualKeyboard:'not tested',processRestartAndPowerLoss:'not tested'},null,2));
}catch(error){
  if(page&&!page.isClosed())await page.screenshot({path:join(output,'office-failure.png')}).catch(()=>{});
  await writeFile(join(output,'failure.json'),JSON.stringify({at:new Date().toISOString(),passed,error:String(error),errors},null,2)).catch(()=>{});throw error;
}finally{for(const context of contexts)await context.close().catch(()=>{});await browser?.close();await new Promise(resolve=>server.close(resolve));}
