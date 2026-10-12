import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { KEY, blank, legacyPreview, mergeLegacy } from '../infrastructure/model.mjs';

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
const base = process.env.INFRA_BASE || `http://127.0.0.1:${server.address().port}`;
const output = process.env.INFRA_OUTPUT || join(tmpdir(), 'infrastructure-console-evidence');
const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.INFRA_CHROME ? { executablePath: process.env.INFRA_CHROME } : {};
const draftKey = 'sbd.infrastructure.draft.v1', layoutKey = 'sbd.infrastructure.layout.v1';
const sources = [
  { schema: 'system-by-dave.power-plan.v1', circuits: Array.from({length:20},(_,i)=>({id:`p${i}`,circuit:`Circuit ${i+1}`,capacity:'20',draw:'12',status:'ready',custom:{retained:true}})) },
  { schema: 'system-by-dave.network-plan.v1', devices: [{id:'n1',device:'Core switch',ip:'10.0.0.5',vlan:'40',status:'issue',notes:'Port down'}] },
  { schema: 'system-by-dave.cable-plan.v1', items: [{id:'c1',cable:'FOH feed',source:'FOH',destination:'Stage',status:'tested'}] }
];
const fixture = sources.reduce((plan,source)=>mergeLegacy(plan,legacyPreview(source)),{...blank(),name:'Synthetic infrastructure'});
const panels = [['Power','power'],['Network','network'],['Cable','cable'],['Issues','issues'],['Plan/Import','plan'],['Backup','backup']];

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
  await page.goto(`${base}/infrastructure/`); await page.locator('.console-shell').waitFor();
  return { page, context };
}
async function seed(page, value = fixture) { await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value }); await page.reload(); }
async function save(page) {
  if (!await page.locator('#saveBtn').isVisible()) await button(page, 'Infrastructure controls').click();
  await page.locator('#saveBtn').click();
  // A previous successful Save message can remain while the next Web Lock waits.
  await page.waitForFunction(() => !document.querySelector('.infra-header p').textContent.endsWith(' · unsaved') && /Saved to this browser|Recovered plan saved/.test(document.getElementById('footerMessage').textContent));
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
try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...channel, args: ['--no-sandbox'] });
  const primary = await fresh(); page = primary.page;
  assert.deepEqual(await page.locator('.console-panel').evaluateAll(nodes => nodes.map(n => n.dataset.panel)), ['power','network','cable']);
  assert.equal(await read(page), null); assert.equal(await read(page,layoutKey),null);
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
  await seed(page);
  const power = panel(page,'power'), network = panel(page,'network'), cable = panel(page,'cable');
  await power.getByLabel('Draw (A)',{exact:true}).fill('25');
  assert.match(await power.getByLabel('Record issue').textContent(),/25 A exceeds 20 A/);
  assert.equal(await power.locator('[name=status]').inputValue(),'ready');
  await network.getByLabel('IP address',{exact:true}).fill('10.0.0.8');
  await cable.getByLabel('Destination',{exact:true}).fill('Stage left');
  assert.deepEqual(JSON.parse(await read(page)),fixture);
  await quick(page,'Issues'); await button(panel(page,'issues'),/Circuit 1/).click();
  assert.equal(await panel(page,'power').getByRole('combobox',{name:/^Power record/}).inputValue(),'0');
  await power.getByLabel('Draw (A)',{exact:true}).fill('');
  await power.getByLabel('Issue / blocker',{exact:true}).fill('   ');
  assert.equal(await power.getByLabel('Record issue').count(),0);
  await save(page);
  let saved=JSON.parse(await read(page));
  assert.equal(saved.records[0].draw,''); assert.equal(saved.records[0].status,'ready');
  assert.equal(saved.records[0].issue,'   '); assert.deepEqual(saved.records[0].sourceRecord,fixture.records[0].sourceRecord);
  assert.equal(saved.records[20].ip,'10.0.0.8'); assert.equal(saved.records[21].destination,'Stage left');
  await power.getByLabel('Draw (A)',{exact:true}).fill('0'); await save(page);
  saved=JSON.parse(await read(page)); assert.equal(saved.records[0].draw,'0');
  await page.reload(); assert.deepEqual(JSON.parse(await read(page)),saved);
  pass('Power/Network/Cable fields operate together; issue selection, independent status, whitespace, blank versus zero and explicit Save/reload preserve originals');

  await button(page,'Power options').click(); await page.getByRole('menuitem',{name:'Close panel',exact:true}).click();
  assert.equal(await panel(page,'power').count(),0); assert.deepEqual(JSON.parse(await read(page)),saved); await quick(page,'Power');
  await button(page,'Maximize Power').click(); assert.equal(await page.locator('.console-panel').count(),1); await button(page,'Restore Power').click();
  await button(page,'Power options').click(); await page.getByRole('menuitem',{name:'Move and size…',exact:true}).click();
  await page.getByRole('menuitem',{name:'Narrower',exact:true}).click(); await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Power options');
  await button(page,'View options').click(); await page.getByRole('menuitem',{name:'Store as new view',exact:true}).click();
  assert.deepEqual(JSON.parse(await read(page)),saved); await save(page); saved=JSON.parse(await read(page)); assert.ok(saved.workspace.views.length>3);
  await page.reload(); assert.deepEqual(await exportPlan(page),saved);
  pass('close/reopen, maximize, keyboard resize/focus return and stored-view Save/export/reload');

  const imports=(await fresh()).page;
  const legacyKeys=['power-plan.v1','network-plan.v1','cable-plan.v1'];
  for(let i=0;i<sources.length;i++){
    const raw=JSON.stringify(sources[i]); await imports.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:legacyKeys[i],raw});
    await quick(imports,'Plan/Import'); await button(imports,'Import source').click(); await imports.locator('#importFile').setInputFiles(jsonFile(sources[i]));
    await imports.locator('#confirmImport:enabled').waitFor();
    if(i===0){await button(imports,'Close import').click(); assert.equal(await read(imports),null); await button(imports,'Import source').click(); await imports.locator('#importFile').setInputFiles(jsonFile(sources[i]));}
    await imports.locator('#confirmImport').click(); assert.equal(await read(imports),null); assert.equal(await read(imports,legacyKeys[i]),raw);
  }
  await save(imports); const copied=JSON.parse(await read(imports)); assert.equal(copied.records.length,22); assert.deepEqual(copied.legacySources,sources);
  await quick(imports,'Plan/Import'); await button(imports,'Import source').click();
  await imports.locator('#importFile').setInputFiles(jsonFile({schema:'unknown'})); await imports.getByText(/Import rejected:/).waitFor();
  assert.equal(await imports.locator('#confirmImport').isDisabled(),true); assert.deepEqual(JSON.parse(await read(imports)),copied);
  await imports.locator('#importFile').setInputFiles(jsonFile({schema:sources[1].schema,devices:[null]})); await imports.getByText(/Invalid legacy record/).waitFor();
  assert.deepEqual(JSON.parse(await read(imports)),copied); await button(imports,'Close import').click();
  await quick(imports,'Backup'); await button(imports,'Restore backup').click();
  await imports.locator('#importFile').setInputFiles(jsonFile({...copied,records:[{id:'x',type:'power',name:'bad',status:'',issue:{}}]}));
  await imports.getByText(/Import rejected:/).waitFor(); assert.equal(await imports.locator('#confirmImport').isDisabled(),true);
  await imports.locator('#importFile').setInputFiles(jsonFile({...copied,records:Array.from({length:2001},(_,i)=>({id:String(i),type:'power',name:'C',status:'planned'}))}));
  await imports.getByText(/supported size/).waitFor(); assert.deepEqual(JSON.parse(await read(imports)),copied);
  await imports.locator('#importFile').setInputFiles(jsonFile({...copied,workspace:{version:99,views:[]}})); await imports.getByText(/Import rejected:/).waitFor();
  await imports.locator('#importFile').setInputFiles(jsonFile(copied)); await imports.locator('#confirmImport:enabled').waitFor();
  await imports.evaluate(key=>localStorage.setItem(key,'{"changed":"other tab"}'),KEY);
  await imports.locator('#confirmImport').click(); await imports.getByText(/Plan changed after preview/).waitFor();
  assert.equal(await read(imports),'{"changed":"other tab"}'); await button(imports,'Close import').click();
  assert.deepEqual(await exportPlan(imports),copied);
  pass('three legacy imports and originals, cancel, malformed/oversized/unknown-workspace rejection, stale preview and exportable work');

  await quick(page,'Plan/Import'); await page.getByLabel('Plan name').fill('Unsaved recovery plan');
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.doc.name==='Unsaved recovery plan',draftKey);
  assert.deepEqual(JSON.parse(await read(page)),saved); await page.reload(); await button(page,'Restore draft').click();
  await quick(page,'Plan/Import'); assert.equal(await page.getByLabel('Plan name').inputValue(),'Unsaved recovery plan'); await save(page);
  await page.waitForFunction(key=>localStorage.getItem(key)===null,draftKey);
  const other=await primary.context.newPage(); other.on('dialog',dialog=>dialog.accept()); await other.goto(base+'/infrastructure/'); await other.locator('.console-shell').waitFor();
  await quick(page,'Plan/Import'); await page.getByLabel('Plan name').fill('First tab'); await save(page);
  await quick(other,'Plan/Import'); await other.getByLabel('Plan name').fill('Stale second tab'); await other.locator('#saveBtn').click();
  await other.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('another tab'));
  assert.equal(JSON.parse(await read(other)).name,'First tab'); assert.equal((await exportPlan(other)).name,'Stale second tab'); await other.close();
  const malformed=(await fresh()).page; await malformed.evaluate(key=>localStorage.setItem(key,'{bad draft'),draftKey); await malformed.reload();
  await quick(malformed,'Plan/Import'); await malformed.getByLabel('Plan name').fill('Exportable');
  await malformed.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('Draft recovery unavailable'));
  assert.equal(await read(malformed,draftKey),'{bad draft'); assert.equal((await exportPlan(malformed)).name,'Exportable');
  pass('draft offered/restored/cleared, stale-tab Save refusal, malformed draft preservation and exportable conflicts');

  const damaged=(await fresh()).page; await damaged.evaluate(key=>localStorage.setItem(key,'{unreadable original'),KEY); await damaged.reload();
  await quick(damaged,'Backup'); const originalDownload=damaged.waitForEvent('download'); await button(damaged,'Download unreadable original').click();
  assert.equal(await readFile(await (await originalDownload).path(),'utf8'),'{unreadable original');
  await button(damaged,'Restore backup').click(); await damaged.locator('#importFile').setInputFiles(jsonFile(fixture)); await damaged.locator('#confirmImport').click();
  assert.equal(await read(damaged),'{unreadable original'); await save(damaged);
  assert.equal(await damaged.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('sbd.infrastructure.recovery.')).map(key=>localStorage.getItem(key)).includes('{unreadable original')),true);
  assert.deepEqual(JSON.parse(await read(damaged)),fixture);
  const refused=(await fresh()).page; await seed(refused); await quick(refused,'Plan/Import'); await refused.getByLabel('Plan name').fill('Storage refused'); const before=await read(refused);
  await refused.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Synthetic quota');return set.call(this,k,v);};},KEY);
  await refused.locator('#saveBtn').click(); await refused.waitForFunction(()=>document.getElementById('footerMessage').textContent.includes('Synthetic quota'));
  assert.equal(await read(refused),before); assert.equal((await exportPlan(refused)).name,'Storage refused');
  const unavailable=(await fresh(undefined,()=>{Storage.prototype.getItem=()=>{throw new DOMException('Synthetic denied storage','SecurityError');};})).page;
  assert.match(await unavailable.locator('#footerMessage').textContent(),/unavailable/);
  assert.equal(await button(panel(unavailable,'power'),'Add circuit').isDisabled(),true);
  const noLocks=(await fresh(undefined,()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}))).page;
  await button(panel(noLocks,'power'),'Add circuit').click(); await noLocks.locator('#saveBtn').click();
  await noLocks.getByText(/cannot coordinate saves/).waitFor(); assert.equal(await read(noLocks),null); assert.equal((await exportPlan(noLocks)).records.length,1);
  pass('unreadable original download and verified preservation, refused/denied storage and missing Web Locks fail safely');

  await page.reload(); await quick(page,'Power');
  const sizes=[{width:1440,height:900},{width:1100,height:900},{width:1024,height:768},{width:720,height:900},{width:680,height:812},{width:375,height:812},{width:844,height:390},{width:320,height:256},{width:3840,height:1080}];
  for(const theme of ['light','dark']){
    await page.setViewportSize({width:1440,height:900});
    if(await page.locator('html').getAttribute('data-av-theme')!==theme)await page.locator('.infra-header').getByRole('button',{name:theme==='light'?'Light mode':'Dark mode'}).click();
    for(const size of sizes){
      await page.setViewportSize(size);
      await page.waitForFunction(({width,height})=>Boolean(document.querySelector('.console-shell.mode-'+(height<500||width<720?'phone':width<1100?'tablet':'desktop'))),size);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      for(const [name,type]of panels){
        await reachable(button(page.locator('.console-quick'),name),size.width+' '+name+' switcher'); await quick(page,name); await noOverflow(page,theme+'/'+size.width+'/'+name);
        const area=panel(page,type); assert.equal(await area.count(),1);
        if(['power','network','cable'].includes(type)){
          const select=area.getByRole('combobox',{name:new RegExp('^'+name+' record')}); await reachable(select); const last=await select.locator('option').last().getAttribute('value'); await select.selectOption(last);
          await reachable(area.locator('[name=name]')); await reachable(area.locator('[name=issue]')); await reachable(area.locator('[name=status]'));
          await reachable(area.locator(type==='power'?'[name=draw]':type==='network'?'[name=vlan]':'[name=destination]'));
          await reachable(button(area,'Remove record'));
        }
        if(type==='issues')await reachable(area.locator('.infra-issue').last());
        if(type==='plan'){await reachable(page.getByLabel('Plan name'));await reachable(button(page,'Import source'));}
        if(type==='backup'){await reachable(button(area,'Export JSON'));await reachable(button(page,'Restore backup'));}
      }
      await button(page,'Restore backup').click(); await reachable(page.locator('#importFile')); await reachable(page.locator('#confirmImport')); await button(page,'Close import').click();
      if(size.height<500){await button(page,'Infrastructure controls').click();await reachable(page.locator('#saveBtn'));await reachable(button(page,'Back to panels'));await button(page,'Back to panels').click();}
      await quick(page,'Power'); if([320,375,1024,1440,3840].includes(size.width))await page.screenshot({path:join(output,'infra-'+theme+'-'+size.width+'.png')});
    }
  }
  pass('six panels, record fields and import controls reachable with 44px targets in both themes at nine sizes');

  await page.setViewportSize({width:1440,height:900});const beforeOffline=await read(page);
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/av-suite-worker.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  assert.equal(await page.evaluate(async()=>{const cache=await caches.open('sbd-av-suite-'+window.SBD_REGISTRY.version);return(await Promise.all(['/infrastructure/','/infrastructure/assets/infrastructure.js','/infrastructure/assets/index.css'].map(path=>cache.match(path)))).every(Boolean);}),true);
  await primary.context.setOffline(true);await page.reload();await quick(page,'Power');assert.equal(await read(page),beforeOffline);assert.equal(await panel(page,'power').getByRole('combobox',{name:/^Power record/}).locator('option').count(),20);await primary.context.setOffline(false);
  pass('published entry/native assets cached and saved plan reopened offline');

  const embedded=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});contexts.push(embedded);
  const host=await embedded.newPage();host.on('dialog',dialog=>dialog.accept());host.on('pageerror',error=>errors.push(error.message));host.setDefaultTimeout(10000);
  await host.goto(base+'/av-video/?sbdShow=Context%20only&private=do-not-forward');
  await host.locator('.sbd-rail__entry[data-rail-ref="console:infrastructure"]').tap();
  const frame=host.frameLocator('iframe[title="Infrastructure application"]');await frame.locator('.console-shell').waitFor();
  assert.equal(new URL(host.url()).pathname,'/av-video/');assert.equal(await frame.locator('.infra-nav').isVisible(),false);assert.equal(await frame.locator('.sbd-rail').isVisible(),false);
  await quick(frame,'Plan/Import');assert.match(await frame.getByLabel('Read-only show context').textContent(),/Context only/);
  assert.equal(await frame.getByLabel('Plan name').inputValue(),'Untitled infrastructure plan');
  for(const size of [{width:1024,height:768},{width:680,height:812},{width:375,height:812},{width:3840,height:1080}]){
    await host.setViewportSize(size);await quick(frame,'Plan/Import');await reachable(frame.getByLabel('Plan name'));await noOverflow(frame,'embedded '+size.width);await noOverflow(host,'host '+size.width);
    await frame.getByLabel('Plan name').fill('Touch Infrastructure '+size.width);await quick(frame,'Backup');await reachable(button(panel(frame,'backup'),'Save plan'));await button(panel(frame,'backup'),'Save plan').tap();
    await host.waitForFunction(({key,name})=>JSON.parse(localStorage.getItem(key)||'null')?.name===name,{key:KEY,name:'Touch Infrastructure '+size.width});assert.equal(await read(host,'sbd.avVideo.v1'),null);
    if(size.width===1024)await host.screenshot({path:join(output,'infra-embedded-tablet.png')});
  }
  assert.equal((await host.locator('iframe[title="Infrastructure application"]').getAttribute('src')).includes('private='),false);
  await host.evaluate(()=>localStorage.setItem('av-theme-mode.v1','light'));await frame.locator('html[data-av-theme="light"]').waitFor();
  pass('real AV Video embedding, independent Save, allowlisted read-only context and shared theme at touch sizes');
  assert.deepEqual(errors,[]);
  await writeFile(join(output,'result.json'),JSON.stringify({at:new Date().toISOString(),base,browser:browser.version(),passed,physicalDevices:'not tested',processRestartAndPowerLoss:'not tested'},null,2));
}catch(error){
  if(page&&!page.isClosed())await page.screenshot({path:join(output,'infra-failure.png')}).catch(()=>{});
  await writeFile(join(output,'failure.json'),JSON.stringify({at:new Date().toISOString(),passed,error:String(error),errors},null,2)).catch(()=>{});
  throw error;
}finally{
  for(const context of contexts)await context.close().catch(()=>{});
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
