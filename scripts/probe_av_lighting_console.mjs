import { probeFamily } from './av-family-probe.mjs';
// Detailed retained-host regressions remain available through test:av-retained-browser.
if (!process.env.AV_RETAINED_HOST) {
  await probeFamily('lighting', process.env.LIGHTING_BASE);
  process.exit(0);
}

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { KEY, SCHEMA, LEGACY, FIELDS, fixture as newFixture } from '../av-lighting/model.mjs';

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
const base = process.env.LIGHTING_BASE || `http://127.0.0.1:${server.address().port}`;
const output = process.env.LIGHTING_OUTPUT || join(tmpdir(), 'av-lighting-console-evidence');
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.LIGHTING_CHROME ? { executablePath: process.env.LIGHTING_CHROME } : {};
const draftKey = 'sbd.avLighting.draft.v1', layoutKey = 'sbd.avLighting.layout.v1';
const fixture = {schema:SCHEMA,meta:{showName:'Synthetic lighting',venue:'Synthetic hall',lead:'Operator'},items:Array.from({length:20},(_,i)=>newFixture({id:'f'+i,unit:'LX-'+i,fixture:'Wash '+i,position:'FOH',universe:'1',address:String(1+i*10),focus:'Deck '+i,status:'planned'}))};
const source={kind:'plotforge-interop-manifest',schemaVersion:1,generatedAt:'2026-10-12T12:00:00Z',show:{name:'Source plot',metadata:{venue:'Source venue'}},positions:[{id:'pos',geometry:'retained'}],commentPins:[{text:'Retained'}],fixtures:[{id:'p1',unitNumber:1,profileName:'Wash',positionName:'FOH',mode:'Standard',dmx:{universe:2,address:101},dmxFootprint:39,channel:42,dimmer:'D12',color:'R02',focus:{xMm:100,yMm:-200},status:'needs_work',notes:{crew:'Check cable',designer:'Retained'},gdtf:{type:'retained'}},{id:'p2',profileName:'Profile',dmx:{universe:2,address:null},status:'future-status'}]};
const panels=[['Fixtures','fixtures'],['Fixture details','details'],['Focus','focus'],['Document','document']];
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
  await page.goto(`${base}/av-lighting/`); await page.locator('.console-shell').waitFor();
  return { page, context };
}
async function seed(page, value = fixture) { await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value }); await page.reload(); }
async function save(page) {
  if (!await page.locator('#saveBtn').isVisible()) await button(page, 'Lighting controls').click();
  await page.locator('#saveBtn').click();
  // A previous successful Save message can remain while the next Web Lock waits.
  await page.waitForFunction(() => !document.querySelector('.lighting-header p').textContent.includes('· unsaved') && /Saved to this browser|Recovered plan saved/.test(document.getElementById('footerMessage').textContent));
  if (await button(page, 'Back to panels').isVisible()) await button(page, 'Back to panels').click();
}
async function exportPlan(page) { await quick(page, 'Document'); const downloaded = page.waitForEvent('download'); await button(panel(page, 'document'), 'Export JSON').click(); return JSON.parse(await readFile(await (await downloaded).path(), 'utf8')); }
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

async function review(page,value,{saved=false,backup=false}={}) {
  await quick(page,backup?'Document':'Document');await button(page,backup?'Restore backup':'Import plan').click();
  if(saved){await page.evaluate(raw=>localStorage.setItem('lighting-patch.v1',raw),JSON.stringify(value));await button(page,'Read saved Lighting Patch').click();}
  else await page.locator('#importFile').setInputFiles(jsonFile(value));
  await page.locator('#confirmImport:enabled').waitFor();
}
async function editNote(page,value){await quick(page,'Fixture details');await panel(page,'details').locator('[name=notes]').fill(value);}
function contrast(a,b){const luminance=value=>{const hex=value.trim().match(/^#([0-9a-f]{6})$/i);assert.ok(hex,value);const [r,g,b]=[0,2,4].map(i=>parseInt(hex[1].slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;};const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
try {
  await mkdir(output,{recursive:true});browser=await chromium.launch({headless:true,...channel,args:['--no-sandbox']});
  const primary=await fresh();page=primary.page;
  assert.deepEqual(await page.locator('.console-panel').evaluateAll(nodes=>nodes.map(n=>n.dataset.panel)),['fixtures','details']);assert.equal(await read(page),null);assert.equal(await read(page,layoutKey),null);
  await page.locator('.skip').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
  await button(page,'Add fixture').click();const details=panel(page,'details');
  const values={unit:'LX-01',fixture:'Wash',position:'Front truss',mode:'Mode 1',universe:'001',address:'00101',channel:'42',dimmer:'D12',color:'R02',focus:'Downstage',status:'focused',notes:'Crew note'};
  for(const field of FIELDS){if(field==='status')await details.locator('[name=status]').selectOption(values[field]);else await details.locator(`[name=${field}]`).fill(values[field]);}
  await quick(page,'Focus');assert.match(await panel(page,'focus').textContent(),/Downstage/);await panel(page,'focus').getByRole('combobox').selectOption('patched');
  await quick(page,'Document');await page.getByLabel('Show name',{exact:true}).fill('Working show');await page.getByLabel('Venue',{exact:true}).fill('Working venue');await page.getByLabel('Lighting lead').fill('Operator');
  assert.equal(await read(page),null);await save(page);let saved=JSON.parse(await read(page));assert.deepEqual(Object.fromEntries(FIELDS.map(f=>[f,saved.items[0][f]])),{...values,status:'patched'});assert.equal(saved.meta.showName,'Working show');await page.reload();assert.deepEqual(await exportPlan(page),saved);
  await quick(page,'Fixtures');await page.locator('#search').fill('not-found');assert.equal(await page.locator('.lighting-fixture').count(),0);await page.locator('#search').fill('Wash');assert.equal(await page.locator('.lighting-fixture').count(),1);await page.locator('#search').fill('');
  const firstFixture=saved.items[0].id;
  await button(page,'Add fixture').click();
  // React selection and summary commits are observable boundaries, not sleeps.
  await page.waitForFunction(first=>{
    const select=document.querySelector('.console-panel[data-panel="details"] select');
    return select?.options.length===2 && select.value!==first;
  },firstFixture);
  await details.locator('[name=universe]').fill('1');await details.locator('[name=address]').fill('101');
  await page.locator('.lighting-summary').getByText('2 duplicate starts',{exact:true}).waitFor();
  assert.equal(await details.locator('[name=universe]').inputValue(),'1');
  assert.equal(await details.locator('[name=address]').inputValue(),'101');
  assert.match(await page.locator('.lighting-summary').textContent(),/2 duplicate starts/);
  await details.locator('[name=status]').selectOption('spare');
  await page.locator('.lighting-summary').getByText('0 duplicate starts',{exact:true}).waitFor();
  assert.equal(await details.locator('[name=status]').inputValue(),'spare');
  assert.match(await page.locator('.lighting-summary').textContent(),/0 duplicate starts/);
  page.removeAllListeners('dialog');page.once('dialog',dialog=>dialog.dismiss());await button(page,'Remove fixture').click();assert.equal((await exportPlan(page)).items.length,2);page.on('dialog',dialog=>dialog.accept());await quick(page,'Fixture details');await button(page,'Remove fixture').click();assert.equal((await exportPlan(page)).items.length,1);
  pass('all fixture and metadata fields, status/focus/search, duplicate starts/spares, confirmed removal and explicit Save/reload/export');

  await seed(page);await quick(page,'Fixture details');await details.locator('[name=notes]').fill('Panel close retains work');await button(page,'Fixture details options').click();await page.getByRole('menuitem',{name:'Close panel',exact:true}).click();await quick(page,'Fixture details');assert.equal(await details.locator('[name=notes]').inputValue(),'Panel close retains work');
  await button(page,'Fixture details options').click();await page.getByRole('menuitem',{name:'Maximize',exact:true}).click();await button(page,'Fixture details options').click();await page.getByRole('menuitem',{name:'Restore',exact:true}).click();
  await button(page,'Fixture details options').click();await page.getByRole('menuitem',{name:'Move and size…',exact:true}).click();await page.getByRole('menuitem',{name:'Narrower',exact:true}).focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Fixture details options');
  await button(page,'View options').click();await page.getByRole('menuitem',{name:'Store as new view',exact:true}).click();await button(page,'View options').click();await page.getByRole('menuitem',{name:'Rename…',exact:true}).click();await page.getByLabel('View name').fill('Lighting desk');await page.getByRole('menuitem',{name:'Rename',exact:true}).click();await save(page);saved=JSON.parse(await read(page));assert.equal(saved.workspace.views.at(-1).name,'Lighting desk');await page.reload();await page.getByRole('tab',{name:'Lighting desk',exact:true}).waitFor();
  pass('panel close/reopen retains edits, maximize, keyboard sizing/focus and named-view roundtrip');

  const imports=(await fresh()).page;const legacy={schema:LEGACY,meta:{showName:'Legacy show'},items:[{id:'legacy',unit:'LEG-01',fixture:'Profile',status:'focused'}]};await review(imports,legacy,{saved:true});await button(imports,'Close import').click();assert.equal(await read(imports),null);await review(imports,legacy,{saved:true});await imports.locator('#confirmImport').click();assert.equal(await read(imports),null);await save(imports);assert.equal(JSON.parse(await read(imports)).items[0].unit,'LEG-01');assert.deepEqual(JSON.parse(await read(imports,'lighting-patch.v1')),legacy);
  await review(imports,source);assert.match(await imports.locator('#importPreview').textContent(),/1 needs-work statuses map to issue; 1 unknown statuses map to planned/);imports.removeAllListeners('dialog');imports.once('dialog',d=>d.dismiss());await imports.locator('#confirmImport').click();assert.equal(JSON.parse(await read(imports)).items.length,1);imports.on('dialog',d=>d.accept());await imports.locator('#confirmImport').click();await save(imports);
  const mapped=JSON.parse(await read(imports));assert.equal(mapped.items[0].status,'issue');assert.equal(mapped.items[0].focus,'x 100 mm, y -200 mm');assert.equal(mapped.items[1].address,'');assert.equal(mapped.items[1].status,'planned');assert.deepEqual(mapped.plotforgeSource,source);await editNote(imports,'Edited copy');await save(imports);await imports.reload();const backup=await exportPlan(imports);assert.deepEqual(backup.plotforgeSource,source);await review(imports,backup,{backup:true});await imports.locator('#confirmImport').click();await save(imports);assert.deepEqual(await exportPlan(imports),backup);
  pass('saved legacy and PlotForge review/cancel/mapping, source unchanged, full retained source and backup roundtrip');

  await quick(imports,'Document');await button(imports,'Import plan').click();const before=await read(imports);
  for(const bad of ['{bad',{schema:'future',items:[]},{...fixture,workspace:{version:42,views:[]}},{...source,schemaVersion:2},{...source,fixtures:[source.fixtures[0],source.fixtures[0]]},{...source,fixtures:[{id:'bad',dmx:{address:0}}]},'x'.repeat(12_000_001)]){await imports.locator('#importFile').setInputFiles(jsonFile(bad));await imports.getByText(/Import rejected:/).waitFor();assert.equal(await imports.locator('#confirmImport').isDisabled(),true);assert.equal(await read(imports),before);}
  await button(imports,'Close import').click();await review(imports,legacy,{saved:true});await imports.evaluate(()=>localStorage.setItem('lighting-patch.v1','changed'));await imports.locator('#confirmImport').click();assert.match(await imports.locator('#importPreview').textContent(),/changed after preview/);assert.equal(await read(imports),before);await button(imports,'Close import').click();
  await review(imports,fixture,{backup:true});await imports.evaluate(key=>localStorage.setItem(key,'{"other":"tab"}'),KEY);await imports.locator('#confirmImport').click();assert.match(await imports.locator('#importPreview').textContent(),/changed after preview/);await button(imports,'Close import').click();assert.deepEqual(await exportPlan(imports),backup);
  pass('invalid, excessive and unknown-version imports refused; canceled and stale source/saved-baseline imports preserve work');

  await editNote(page,'Unsaved recovery note');await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.doc.items[0].notes==='Unsaved recovery note',draftKey);assert.deepEqual(JSON.parse(await read(page)),saved);await page.reload();await button(page,'Restore draft').click();await quick(page,'Fixture details');assert.equal(await details.locator('[name=notes]').inputValue(),'Unsaved recovery note');await save(page);await page.waitForFunction(key=>localStorage.getItem(key)===null,draftKey);
  const other=await primary.context.newPage();other.on('dialog',d=>d.accept());await other.goto(base+'/av-lighting/');await other.locator('.console-shell').waitFor();await editNote(page,'First tab');await save(page);await editNote(other,'Stale tab');await other.locator('#saveBtn').click();await other.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('another tab'));assert.equal(JSON.parse(await read(other)).items[0].notes,'First tab');assert.equal((await exportPlan(other)).items[0].notes,'Stale tab');await other.close();
  const malformed=(await fresh()).page;await seed(malformed);await malformed.evaluate(key=>localStorage.setItem(key,'{bad draft'),draftKey);await malformed.reload();await editNote(malformed,'Exportable');await malformed.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('Draft recovery unavailable'));assert.equal(await read(malformed,draftKey),'{bad draft');assert.equal((await exportPlan(malformed)).items[0].notes,'Exportable');
  pass('draft restore/clear, stale-tab save refusal and malformed-draft preservation with working-data export');

  const damaged=(await fresh()).page;await damaged.evaluate(key=>localStorage.setItem(key,'{unreadable original'),KEY);await damaged.reload();await quick(damaged,'Document');const original=damaged.waitForEvent('download');await button(damaged,'Download unreadable original').click();assert.equal(await readFile(await(await original).path(),'utf8'),'{unreadable original');await review(damaged,fixture,{backup:true});await damaged.locator('#confirmImport').click();assert.equal(await read(damaged),'{unreadable original');await save(damaged);assert.equal(await damaged.evaluate(key=>Object.keys(localStorage).some(k=>k.startsWith(key+'.recovery.')&&localStorage.getItem(k)==='{unreadable original'),KEY),true);
  const refused=(await fresh()).page;await seed(refused);await editNote(refused,'Storage refused');const originalSaved=await read(refused);await refused.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Synthetic quota');return set.call(this,k,v);};},KEY);await refused.locator('#saveBtn').click();await refused.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('Synthetic quota'));assert.equal(await read(refused),originalSaved);assert.equal((await exportPlan(refused)).items[0].notes,'Storage refused');
  const unavailable=(await fresh(undefined,()=>{Storage.prototype.getItem=()=>{throw new DOMException('Synthetic denied storage','SecurityError');};})).page;assert.equal(await button(unavailable,'Add fixture').isDisabled(),true);await quick(unavailable,'Document');const deniedDownload=unavailable.waitForEvent('download',{timeout:1000}).then(()=>true,()=>false);await button(unavailable,'Export JSON').click();assert.equal(await deniedDownload,false);assert.match(await unavailable.locator('#footerMessage').textContent(),/No original backup was created/);
  const noLocks=(await fresh(undefined,()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}))).page;await seed(noLocks);await editNote(noLocks,'No locks');await noLocks.locator('#saveBtn').click();await noLocks.getByText(/cannot coordinate saves/).waitFor();assert.equal(JSON.parse(await read(noLocks)).items[0].notes,'');assert.equal((await exportPlan(noLocks)).items[0].notes,'No locks');
  pass('unreadable original recovery, denied/refused storage and unavailable Web Locks fail safely');

  const limit=(await fresh({width:320,height:256})).page;await seed(limit,{...fixture,items:Array.from({length:1000},(_,i)=>({...fixture.items[0],id:'limit'+i}))});await button(limit,'Add fixture').click();await limit.locator('#footerMessage').waitFor({state:'visible'});assert.match(await limit.locator('#footerMessage').textContent(),/1,000 fixtures/);assert.equal(JSON.parse(await read(limit)).items.length,1000);await button(limit,'Back to panels').click();
  const discard=(await fresh()).page;await seed(discard);await editNote(discard,'Discard me');await discard.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.doc.items[0].notes==='Discard me',draftKey);await discard.reload();await button(discard,'Discard draft').click();
  // Discard completes asynchronously under the shared Web Lock.
  await discard.waitForFunction(key=>localStorage.getItem(key)===null,draftKey);assert.deepEqual(JSON.parse(await read(discard)),fixture);
  const noScript=await browser.newContext({javaScriptEnabled:false});contexts.push(noScript);const inert=await noScript.newPage();await inert.goto(base+'/av-lighting/');assert.equal(await inert.locator('noscript').isVisible(),true);assert.equal(await inert.getByRole('button',{name:'Add fixture'}).count(),0);

  await seed(page);const sizes=[{width:1440,height:900},{width:1100,height:900},{width:1024,height:768},{width:720,height:900},{width:680,height:812},{width:375,height:812},{width:844,height:390},{width:320,height:256},{width:3840,height:1080}];
  for(const theme of ['light','dark']){
    await page.setViewportSize({width:1440,height:900});if(await page.locator('html').getAttribute('data-av-theme')!==theme)await page.locator('.lighting-header').getByRole('button',{name:theme==='light'?'Light mode':'Dark mode'}).click();
    const tokens=await page.evaluate(()=>{const style=getComputedStyle(document.documentElement);return Object.fromEntries(['--av-text','--av-bg','--av-muted','--av-surface','--av-accent','--av-primary-ink','--av-focus'].map(key=>[key,style.getPropertyValue(key).trim()]));});for(const [a,b,min]of [['--av-text','--av-bg',4.5],['--av-muted','--av-surface',4.5],['--av-accent','--av-surface',4.5],['--av-primary-ink','--av-accent',4.5],['--av-focus','--av-surface',3]])assert.ok(contrast(tokens[a],tokens[b])>=min,theme+'/'+a);
    for(const size of sizes){await page.setViewportSize(size);await page.waitForFunction(({width,height})=>Boolean(document.querySelector('.console-shell.mode-'+(height<500||width<720?'phone':width<1100?'tablet':'desktop'))),size);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      for(const [name,type]of panels){await reachable(button(page.locator('.console-quick'),name),theme+'/'+size.width+'/'+name);await quick(page,name);await noOverflow(page,theme+'/'+size.width+'/'+name);const area=panel(page,type);assert.equal(await area.count(),1);const controls=area.locator('input,textarea,select,button,a');for(let i=0;i<await controls.count();i++)await reachable(controls.nth(i),theme+'/'+size.width+'/'+name+'/'+i);}
      await review(page,source);await reachable(button(page,'Read saved Lighting Patch'));await reachable(page.locator('#importFile'));await reachable(page.locator('#confirmImport'));await button(page,'Close import').click();
      await quick(page,'Document');const plot=page.getByRole('link',{name:'Open PlotForge'});await reachable(plot);assert.equal(await plot.getAttribute('href'),'../plotforge.html');assert.equal(await plot.getAttribute('target'),'_blank');assert.match(await plot.getAttribute('rel'),/noopener noreferrer/);
      if(size.height<500){await button(page,'Lighting controls').click();await reachable(page.locator('#saveBtn'));await reachable(button(page,'Back to panels'));await button(page,'Back to panels').click();}
      await quick(page,'Fixture details');if([320,375,1024,1440,3840].includes(size.width))await page.screenshot({path:join(output,'lighting-'+theme+'-'+size.width+'.png')});
    }
  }
  pass('every panel and import control reachable at 44px in both themes across nine sizes');

  await page.setViewportSize({width:1440,height:900});const beforeOffline=await read(page);await page.evaluate(async()=>{await navigator.serviceWorker.register('/av-suite-worker.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;});await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));assert.equal(await page.evaluate(async()=>{const cache=await caches.open('sbd-av-suite-'+window.SBD_REGISTRY.version);return(await Promise.all(['/av-lighting/','/av-lighting/assets/av-lighting.js','/av-lighting/assets/index.css'].map(path=>cache.match(path)))).every(Boolean);}),true);await primary.context.setOffline(true);await page.reload();await quick(page,'Fixtures');assert.equal(await read(page),beforeOffline);assert.equal(await page.locator('.lighting-fixture').count(),20);await primary.context.setOffline(false);
  pass('entry and native assets cached, saved fixture plan reopened offline');

  assert.deepEqual(errors,[]);await writeFile(join(output,'result.json'),JSON.stringify({at:new Date().toISOString(),base,browser:browser.version(),passed,physicalDevices:'not tested',virtualKeyboard:'not tested',processRestartAndPowerLoss:'not tested'},null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:join(output,'lighting-failure.png')}).catch(()=>{});await writeFile(join(output,'failure.json'),JSON.stringify({at:new Date().toISOString(),passed,error:String(error),errors},null,2)).catch(()=>{});throw error;}
finally{for(const context of contexts)await context.close().catch(()=>{});await browser?.close();await new Promise(resolve=>server.close(resolve));}
