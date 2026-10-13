import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

// Disposable contexts and synthetic records only, including against publication.
const root = resolve(import.meta.dirname, '..');
const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://probe').pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type':mime[extname(file)] || 'application/octet-stream', 'cache-control':'no-store' }).end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.AUDIO_BASE || `http://127.0.0.1:${server.address().port}`;
const output = process.env.AUDIO_OUTPUT || join(tmpdir(), 'av-audio-connector-evidence');
const channel = process.env.CHROME_CHANNEL ? { channel:process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath:process.env.CHROME_BIN } : {};
const key = 'sbd.avAudio.v1', producer = 'input-list.v1';
const original = JSON.stringify({schema:producer,rows:[{id:'input-7',ch:7,source:'Synthetic vocal',type:'Mic',conn:'XLR',patch:'SB A/7',stand:'Downstage',owner:'A2',status:'open',notes:'Original note'}]});
const patchSource=JSON.stringify({items:[{id:'patch-7',channel:'7',source:'Synthetic vocal',status:'patched'}]});
const checkSource=JSON.stringify({items:[{id:'check-7',channel:'7',source:'Synthetic vocal',status:'issue',problem:'Synthetic no signal'}]});
const button = (scope, name) => scope.getByRole('button', {name,exact:true});
const quick = (scope, name) => button(scope.locator('.console-quick'),name).click();
const read = (page, name = key) => page.evaluate(name => localStorage.getItem(name), name);
const file = raw => ({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(raw)});
const contexts = [], errors = [], passed = [];
let browser, page;
async function fresh() {
  const context = await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,acceptDownloads:true});
  contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/av-audio/'); await page.locator('.console-shell').waitFor();
  return {page,context};
}
async function connection(scope) {
  await quick(scope,'Inputs');
  const panel = scope.locator('.console-panel[data-panel="inputs"]');
  const toggle = panel.locator('.audio-row-title').first();
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  return panel.getByLabel('Connection',{exact:true});
}
async function patchStatus(scope) {
  await quick(scope,'Patch');
  const panel=scope.locator('.console-panel[data-panel="patch"]');
  const toggle=panel.locator('.audio-row-title').first();
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  return panel.getByRole('combobox',{name:/^patch status/i});
}
async function imported(scope, raw, saved = false, source = 'Input List') {
  await quick(scope,'Project');
  await scope.locator('.console-panel[data-panel="project"]').getByRole('combobox',{name:/^legacy tool/i}).selectOption({label:source});
  if (saved) await button(scope,'Preview saved browser sheet').click();
  else await scope.locator('input[type=file]').setInputFiles(file(raw));
  await button(scope,'Confirm import').click();
}
async function save(scope) {
  await button(scope.locator('.audio-actions'),'Save').click();
  await scope.getByRole('status').filter({hasText:'Saved and verified in this browser.'}).waitFor();
}
async function exported(scope, downloadPage) {
  const pending = downloadPage.waitForEvent('download');
  await button(scope,'Export JSON').click();
  return JSON.parse(await readFile(await (await pending).path(),'utf8'));
}
async function noOverflow(scope) {
  assert.ok(await scope.locator('html').evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth), 'root must fit viewport');
}
async function reachable(control, label) {
  await control.scrollIntoViewIfNeeded();
  const result = await control.evaluate(el => {
    const box=el.getBoundingClientRect(); let top=0,bottom=innerHeight,left=0,right=innerWidth;
    for(let node=el.parentElement;node;node=node.parentElement){
      const style=getComputedStyle(node),bounds=node.getBoundingClientRect();
      if(/(hidden|auto|scroll|clip)/.test(style.overflowY)){top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom);}
      if(/(hidden|auto|scroll|clip)/.test(style.overflowX)){left=Math.max(left,bounds.left);right=Math.min(right,bounds.right);}
    }
    const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
    return {box:box.toJSON(),top,bottom,left,right,inside:box.top>=top-1&&box.bottom<=bottom+1&&box.left>=left-1&&box.right<=right+1,hit:hit===el};
  });
  assert.ok(result.box.height>=44&&result.box.width>=44&&result.inside&&result.hit, label+': '+JSON.stringify(result));
}
function pass(name) { passed.push(name); console.log('PASS '+name); }
try {
  await mkdir(output,{recursive:true});
  browser=await chromium.launch({headless:true,...channel,args:['--no-sandbox']});
  const primary=await fresh(); page=primary.page;
  await page.evaluate(({producer,original})=>localStorage.setItem(producer,original),{producer,original});
  await imported(page,original,true);
  assert.equal(await read(page),null,'import does not save');
  let control=await connection(page); assert.equal(await control.inputValue(),'XLR');
  await control.fill('TRS / operator patch');
  let working=await exported(page,page);
  assert.equal(working.channels[0].conn,'TRS / operator patch');
  assert.equal(working.channels[0].legacy.conn,'XLR'); assert.equal(working.imports[0].raw,original);
  await save(page); const saved=await read(page); await page.reload();
  assert.equal(await (await connection(page)).inputValue(),'TRS / operator patch');
  assert.equal(await read(page,producer),original);
  await imported(page,original,true);
  assert.match(await page.getByRole('status').textContent(),/already been imported/);
  assert.equal(await read(page),saved);
  const changed=JSON.parse(original); changed.rows[0].conn='TS'; changed.rows[0].notes='Changed source';
  await imported(page,JSON.stringify(changed));
  assert.equal(await (await connection(page)).inputValue(),'TRS / operator patch');
  working=await exported(page,page); assert.equal(working.channels.length,1);
  assert.deepEqual(working.channels[0].legacy.sources,[JSON.parse(original).rows[0],changed.rows[0]]);
  assert.equal(working.imports[0].raw,original); assert.equal(await read(page,producer),original);
  await save(page);
  pass('saved-browser import, editable Connection, explicit Save/reload, exact-repeat rejection and changed-source merge preserve operator edits and originals');

  const restore=(await fresh()).page;
  await imported(restore,JSON.stringify(working)); assert.equal(await read(restore),null);
  assert.deepEqual(await exported(restore,restore),working); await save(restore); await restore.reload();
  assert.equal(await (await connection(restore)).inputValue(),'TRS / operator patch');
  const old=structuredClone(working); delete old.channels[0].conn;
  await imported(restore,JSON.stringify(old)); assert.equal(await (await connection(restore)).inputValue(),'');
  assert.deepEqual(await exported(restore,restore),old,'missing connection is not silently migrated from original');
  await save(restore); const before=await read(restore);
  await quick(restore,'Project'); await restore.locator('input[type=file]').setInputFiles(file('{bad'));
  assert.equal(await button(restore,'Confirm import').count(),0);
  assert.equal(await read(restore),before); assert.deepEqual(await exported(restore,restore),old);
  await (await connection(restore)).fill('Temporary connection');
  await (await connection(restore)).fill(''); await save(restore);
  assert.equal(JSON.parse(await read(restore)).channels[0].conn,'');
  pass('file export/restore, backward-compatible absent connection, explicit blank and malformed-import preservation');

  // A new page in the same disposable browser profile must reopen the saved bytes.
  await page.close(); page=await primary.context.newPage(); await page.goto(base+'/av-audio/');
  assert.equal(await (await connection(page)).inputValue(),'TRS / operator patch');
  pass('saved connection survives page close and reopen in the same browser context');

  await page.evaluate(({patchSource,checkSource})=>{
    localStorage.setItem('audio-patch.v1',patchSource); localStorage.setItem('line-check.v1',checkSource);
  },{patchSource,checkSource});
  await imported(page,patchSource,true,'Audio Patch');
  await imported(page,checkSource,true,'Line Check');
  control=await patchStatus(page); assert.equal(await control.inputValue(),'patched');
  const unchanged=await exported(page,page);
  for(const value of ['planned','patched','gained','linecheck','ready','issue','spare','']) {
    await control.selectOption(value);
    const edited=await exported(page,page), expected=structuredClone(unchanged);
    expected.channels[0].patchStatus=value;
    assert.deepEqual(edited,expected,'Patch edit changes only patchStatus');
    assert.equal(await page.locator('.console-panel[data-panel="patch"] .audio-row-title em').first().textContent(),'issue');
  }
  await control.selectOption('ready'); await save(page); await page.reload();
  assert.equal(await (await patchStatus(page)).inputValue(),'ready');
  const patchSaved=await read(page);
  await imported(page,patchSource,true,'Audio Patch');
  assert.match(await page.getByRole('status').textContent(),/already been imported/);
  assert.equal(await read(page),patchSaved);
  const changedPatch=JSON.parse(patchSource); changedPatch.items[0].status='spare';
  await imported(page,JSON.stringify(changedPatch),false,'Audio Patch');
  assert.equal(await (await patchStatus(page)).inputValue(),'ready');
  await save(page); const patchBackup=await exported(page,page);
  assert.equal(patchBackup.channels.length,1);
  assert.equal(patchBackup.channels[0].lineCheckStatus,'issue');
  assert.equal(patchBackup.channels[0].inputStatus,'open');
  assert.equal(patchBackup.channels[0].status,'issue');
  assert.equal(patchBackup.channels[0].conn,'TRS / operator patch');
  assert.ok(patchBackup.imports.some(source=>source.raw===patchSource));
  assert.equal(await read(page,'audio-patch.v1'),patchSource);
  assert.equal(await read(page,'line-check.v1'),checkSource);
  await imported(restore,JSON.stringify(patchBackup));
  assert.deepEqual(await exported(restore,restore),patchBackup); await save(restore); await restore.reload();
  assert.equal(await (await patchStatus(restore)).inputValue(),'ready');
  const legacy=structuredClone(patchBackup); delete legacy.channels[0].patchStatus;
  await imported(restore,JSON.stringify(legacy));
  assert.equal(await (await patchStatus(restore)).inputValue(),'');
  assert.deepEqual(await exported(restore,restore),legacy,'opening absent Patch status must not infer or migrate it');
  const custom=structuredClone(patchBackup); custom.channels[0].patchStatus='Custom operator state';
  await imported(restore,JSON.stringify(custom));
  assert.equal(await (await patchStatus(restore)).inputValue(),'Custom operator state');
  assert.deepEqual(await exported(restore,restore),custom);
  await save(restore); await restore.reload();
  assert.equal(await (await patchStatus(restore)).inputValue(),'Custom operator state');
  await (await patchStatus(restore)).selectOption(''); await save(restore); await restore.reload();
  assert.equal(await (await patchStatus(restore)).inputValue(),'');
  assert.equal(JSON.parse(await read(restore)).channels[0].lineCheckStatus,'issue');
  pass('Patch status choices, blank/custom/absent values, independent edits, issue precedence and source-preserving Save/restore/repeated imports');
  await page.close(); page=await primary.context.newPage(); await page.goto(base+'/av-audio/');
  assert.equal(await (await patchStatus(page)).inputValue(),'ready');
  assert.equal(JSON.parse(await read(page)).channels[0].lineCheckStatus,'issue');
  pass('saved Patch status and independent line-check result survive page close and reopen');

  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>localStorage.setItem('av-theme-mode.v1',theme),theme); await page.reload();
    for(const size of [{width:1440,height:900},{width:375,height:812},{width:680,height:812},{width:1024,height:768},{width:844,height:390},{width:320,height:256},{width:3840,height:1080}]) {
      await page.setViewportSize(size); control=await connection(page);
      if(size.height<500) {
        await button(page,'Full screen focused panel').click();
        await page.locator('.console-shell:fullscreen').waitFor();
      }
      await noOverflow(page); await reachable(control,theme+'/'+size.width+'x'+size.height);
      await control.focus(); assert.equal(await control.evaluate(el=>el===document.activeElement),true);
      assert.equal(await control.inputValue(),'TRS / operator patch');
      const patch=await patchStatus(page); await reachable(patch,'Patch/'+theme+'/'+size.width+'x'+size.height);
      await patch.focus(); assert.equal(await patch.evaluate(el=>el===document.activeElement),true);
      assert.equal(await patch.inputValue(),'ready');
      if([1440,375,3840].includes(size.width))await page.screenshot({path:join(output,`audio-${theme}-${size.width}.png`)});
      if(size.height<500)await page.evaluate(()=>document.exitFullscreen());
    }
  }
  pass('Connection and Patch status keyboard focus and full 44px reachability in both themes at seven sizes; existing full-screen panel path at short heights');
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/av-suite-worker.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await primary.context.setOffline(true); await page.reload();
  assert.equal(await (await connection(page)).inputValue(),'TRS / operator patch');
  await (await connection(page)).fill('Offline connection'); await save(page); await page.reload();
  assert.equal(await (await connection(page)).inputValue(),'Offline connection'); await primary.context.setOffline(false);
  pass('prepared offline reopening, connection edit and explicit Save/reload');
  await primary.context.setOffline(true);
  await (await patchStatus(page)).selectOption('gained'); await save(page); await page.reload();
  assert.equal(await (await patchStatus(page)).inputValue(),'gained');
  assert.equal(JSON.parse(await read(page)).channels[0].lineCheckStatus,'issue');
  await primary.context.setOffline(false);
  pass('prepared offline Patch status edit survives Save/reload without changing line-check issue');

  const hostContext=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,acceptDownloads:true}); contexts.push(hostContext);
  const host=await hostContext.newPage(); host.on('pageerror',error=>errors.push(error.message));
  await host.goto(base+'/av-video/');
  await host.locator('.sbd-rail__entry[data-rail-ref="console:audio"]').click();
  const frame=host.frameLocator('iframe[title="Audio application"]'); await frame.locator('.console-shell').waitFor();
  await imported(frame,original); assert.equal(await read(host),null);
  assert.equal(await (await connection(frame)).inputValue(),'XLR');
  await (await connection(frame)).fill('Embedded edit'); await save(frame);
  assert.equal(JSON.parse(await read(host)).channels[0].conn,'Embedded edit');
  assert.equal(await read(host,'sbd.avVideo.v1'),null,'Audio Save must not save AV Video');
  const backup=await exported(frame,host); assert.equal(backup.channels[0].legacy.conn,'XLR');
  await host.reload(); await frame.locator('.console-shell').waitFor();
  assert.equal(await (await connection(frame)).inputValue(),'Embedded edit');
  await imported(frame,patchSource,false,'Audio Patch'); await imported(frame,checkSource,false,'Line Check');
  await (await patchStatus(frame)).selectOption('gained'); await save(frame);
  const embedded=await exported(frame,host);
  assert.equal(embedded.channels[0].patchStatus,'gained'); assert.equal(embedded.channels[0].lineCheckStatus,'issue');
  assert.equal(embedded.channels[0].conn,'Embedded edit'); assert.equal(await read(host,'sbd.avVideo.v1'),null);
  await host.reload(); await frame.locator('.console-shell').waitFor();
  assert.equal(await (await patchStatus(frame)).inputValue(),'gained');
  for(const size of [{width:1024,height:768},{width:680,height:812},{width:375,height:812}]) {
    await host.setViewportSize(size);
    const maximize=button(frame,'Maximize Inputs');
    if(await maximize.isVisible())await maximize.click();
    await reachable(await connection(frame),'embedded/'+size.width);
    const restoreInputs=button(frame,'Restore Inputs');
    if(await restoreInputs.isVisible())await restoreInputs.click();
    const patch=await patchStatus(frame), maximizePatch=button(frame,'Maximize Patch');
    if(await maximizePatch.isVisible())await maximizePatch.click();
    await reachable(patch,'embedded Patch/'+size.width);
    const restorePatch=button(frame,'Restore Patch');
    if(await restorePatch.isVisible())await restorePatch.click();
    await noOverflow(frame); await noOverflow(host);
  }
  await host.screenshot({path:join(output,'audio-embedded-phone.png')});
  pass('actual AV Video embedded Connection/Patch import/edit/Save/export/reload, independent line-check results and document, touch-size field access using panel maximize where needed');
  assert.deepEqual(errors,[]);
  await writeFile(join(output,'result.json'),JSON.stringify({at:new Date().toISOString(),base,browser:browser.version(),passed,physicalDevice:'not tested',virtualKeyboard:'not tested',processRestartAndPowerLoss:'not tested'},null,2));
} catch(error) {
  await writeFile(join(output,'failure.json'),JSON.stringify({at:new Date().toISOString(),passed,error:String(error),stack:error.stack},null,2));
  if(page&&!page.isClosed())await page.screenshot({path:join(output,'failure.png')}).catch(()=>{});
  throw error;
} finally {
  for(const context of contexts)await context.close();
  await browser?.close(); await new Promise(resolve=>server.close(resolve));
}
