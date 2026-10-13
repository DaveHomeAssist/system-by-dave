import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import adapter from './calculator_console_adapter.cjs';
const { names, activate, reveal, fieldSets } = adapter;
const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => { try { let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://probe').pathname)); if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; } if ((await stat(path)).isDirectory()) path = join(path, 'index.html'); res.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(await readFile(path)); } catch { res.writeHead(404).end(); } });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = process.env.CALCULATOR_BASE || `http://127.0.0.1:${server.address().port}`;
const output = process.env.CALCULATOR_OUTPUT || join(tmpdir(), 'av-calculator-console-evidence');
const launch = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CALCULATOR_CHROME ? { executablePath: process.env.CALCULATOR_CHROME } : {};
const key = 'avCalculator.v1', viewsKey = 'avCalculator.views.v1', layoutKey = 'avCalculator.layout.v1';
const read = (page, key) => page.evaluate(key => localStorage.getItem(key), key);
const button = (page, name) => page.getByRole('button', { name, exact: true });
const jsonFile = value => ({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
const contexts = [], errors = [], passed = [];
let browser, page;
function pass(name) { passed.push(name); console.log('PASS ' + name); }
async function fresh(viewport = { width: 1440, height: 900 }, init) {
  const context = await browser.newContext({ viewport, hasTouch: true, acceptDownloads: true }); contexts.push(context); if (init) await context.addInitScript(init);
  const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(base + '/av-calculator.html?sbdShow=Synthetic%20show'); await page.locator('.console-shell').waitFor(); return { page, context };
}
async function fill(page, selector, value) { await (await reveal(page, selector)).fill(value); }
async function select(page, selector, value) { await (await reveal(page, selector)).selectOption(value); }
async function noOverflow(page) { const r = await page.locator('html').evaluate(el => [el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight]); assert.ok(r.every(x => x <= 0), JSON.stringify(r)); }
async function reachable(control, name) {
  await control.scrollIntoViewIfNeeded();
  const r = await control.evaluate(el => { const b = el.getBoundingClientRect(); let l = 0, t = 0, r = innerWidth, d = innerHeight; for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p), a = p.getBoundingClientRect(); if (/(auto|hidden|scroll|clip)/.test(s.overflowX)) { l = Math.max(l, a.left); r = Math.min(r, a.right); } if (/(auto|hidden|scroll|clip)/.test(s.overflowY)) { t = Math.max(t, a.top); d = Math.min(d, a.bottom); } if (p instanceof HTMLDialogElement && p.matches(':modal')) break; } const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { width: b.width, height: b.height, inside: b.x >= l - 1 && b.right <= r + 1 && b.y >= t - 1 && b.bottom <= d + 1, hit: hit === el || el.contains(hit), rect: b.toJSON(), clip: [l, t, r, d] }; });
  assert.ok(r.width >= 44 && r.height >= 44 && r.inside && r.hit, name + ': ' + JSON.stringify(r));
}
try {
  await mkdir(output, { recursive: true }); browser = await chromium.launch({ headless: true, ...launch, args: ['--no-sandbox'] });
  const primary = await fresh(); page = primary.page;
  assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'dark');
  assert.equal(await page.locator('[data-key]').count(), 26); assert.equal(await read(page, viewsKey), null);
  await fill(page, '#delayDistance', '100'); assert.match(await page.locator('#delayMs').textContent(), /88\.8/);
  await fill(page, '#screenWidth', '20'); assert.match(await page.locator('#idealThrow').textContent(), /30/);
  await fill(page, '#bitrate', '100'); assert.match(await page.locator('#baseStorage').textContent(), /270/);
  await select(page, '#powerMethod', 'amps'); await fill(page, '#deviceAmps', '3.2'); assert.match(await page.locator('#totalAmps').textContent(), /12\.8/);
  await select(page, '#powerMethod', 'watts'); await fill(page, '#powerFactor', '0'); assert.equal(await page.locator('#totalAmps').textContent(), '—'); await fill(page, '#powerFactor', '0.8'); assert.match(await page.locator('#totalAmps').textContent(), /14\.58/);
  await fill(page, '#dropAmps', '12'); assert.match(await page.locator('#voltageDrop').textContent(), /2\.4/);
  await fill(page, '#splTargetDist', '50'); assert.match(await page.locator('#splLoss').textContent(), /24\.4/);
  const before = await read(page, key); for (const id of Object.keys(names)) await activate(page, id); assert.equal(await read(page, key), before);
  await activate(page, 'summaryCard'); const download = page.waitForEvent('download'); await (await reveal(page, '#downloadSummaryBtn')).click(); const downloaded = await download; assert.equal(downloaded.suggestedFilename(), 'av-calculator-summary.txt'); assert.match(await readFile(await downloaded.path(), 'utf8'), /88\.8/);
  await page.reload(); assert.equal(await page.locator('#delayDistance').inputValue(), '100'); assert.equal(await read(page, key), before);
  pass('six unchanged calculations, explicit PF warning, summary download and autosave/reload');

  await activate(page, 'audioCard'); await button(page, 'Audio Delay options').click(); await page.getByRole('menuitem', { name: 'Close panel', exact: true }).click(); assert.equal(await page.locator('.console-panel[data-panel=audioCard]').count(), 0); await activate(page, 'audioCard'); assert.equal(await page.locator('#delayDistance').inputValue(), '100');
  await button(page, 'Maximize Audio Delay').click(); assert.equal(await page.locator('.console-panel').count(), 1); await button(page, 'Restore Audio Delay').click();
  await button(page, 'View options').click(); await page.getByRole('menuitem', { name: 'Store as new view', exact: true }).click(); await button(page, 'Save views *').click(); await page.waitForFunction(key => localStorage.getItem(key) !== null, viewsKey); const storedViews = await read(page, viewsKey); assert.equal(await read(page, key), before); await page.reload(); assert.equal(await read(page, viewsKey), storedViews); assert.equal(await page.locator('[data-key]').count(), 26);
  await page.evaluate(() => { location.hash = 'powerCard'; }); await page.locator('.console-panel[data-panel=powerCard]').waitFor(); await page.evaluate(() => { location.hash = 'audioCard'; }); await page.locator('.console-panel[data-panel=audioCard]').waitFor();
  await page.goBack(); await page.locator('.console-panel[data-panel=powerCard]').waitFor();
  pass('close/reopen, maximize, stored layouts, deep links/history and single original control instances');

  await fieldSets(page); await page.locator('#fieldSetName').fill('Synthetic A'); await page.locator('#fieldSetSave').click(); const sets = JSON.parse(await read(page, 'avCalculator.fieldSets.v1')); assert.equal(sets.sets.length, 1);
  const exportedEvent = page.waitForEvent('download'); await page.locator('#fieldSetExport').click(); const exported = JSON.parse(await readFile(await (await exportedEvent).path(), 'utf8')); assert.equal(exported.values.delayDistance, 100);
  for (const bad of ['{broken', { ...exported, schema: 'future' }, { ...exported, values: { ...exported.values, delayDistance: 100.05 } }]) { await page.locator('#fieldSetImport').setInputFiles(jsonFile(bad)); await page.getByText(/Import failed:/).waitFor(); assert.equal(await read(page, key), before); }
  await page.locator('#fieldSetImport').setInputFiles(jsonFile({ ...exported, name: 'Synthetic B', values: { ...exported.values, delayDistance: 120 } })); await page.getByText(/Ready to add/).waitFor(); assert.match(await page.locator('#fieldSetPreviewValues').textContent(), /120/); await page.locator('#fieldSetApply').click(); await page.locator('#fieldSetSelect').selectOption({ label: 'Synthetic B' }); await page.locator('#fieldSetRecall').click(); assert.equal(await page.locator('#delayDistance').inputValue(), '120');
  await page.evaluate(() => { const data = JSON.parse(localStorage.getItem('avCalculator.v1')); data.ledProductName = 'Retain LED'; localStorage.setItem('avCalculator.v1', JSON.stringify(data)); }); await fill(page, '#delayDistance', '130'); assert.equal(JSON.parse(await read(page, key)).ledProductName, 'Retain LED');
  pass('field-set save/export/review/recall, rejected imports and newer LED-field preservation');

  const bad = (await fresh()).page; await bad.evaluate(({viewsKey,layoutKey}) => { localStorage.setItem(viewsKey, '{damaged'); localStorage.setItem(layoutKey, '{damaged layout'); }, {viewsKey,layoutKey}); await bad.reload(); await button(bad,'View options').click(); await bad.getByRole('menuitem',{name:'Store as new view',exact:true}).click(); await button(bad,'Save views *').click(); assert.equal(await read(bad,viewsKey),'{damaged'); assert.equal(await read(bad,layoutKey),'{damaged layout');
  const stale = (await fresh()).page; await stale.evaluate(key=>localStorage.setItem(key,'other tab'),viewsKey); await button(stale,'Save views').click(); await stale.waitForFunction(()=>document.getElementById('workspaceStatus').textContent.includes('another tab')); assert.match(await stale.locator('#workspaceStatus').textContent(),/another tab/); assert.equal(await read(stale,viewsKey),'other tab');
  pass('new workspace data refuses unreadable or stale-tab replacement');

  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 256 } }); contexts.push(staticContext);
  const staticPage = await staticContext.newPage(); await staticPage.goto(base + '/av-calculator.html');
  const fallback = staticPage.locator('.calculator-noscript'); await fallback.waitFor();
  for (const name of Object.values(names).slice(0, 6)) assert.ok((await fallback.textContent()).includes(name), name + ' fallback description');
  assert.match(await fallback.textContent(), /Enable JavaScript and reload/); assert.match(await fallback.textContent(), /does not verify electrical safety/);
  await reachable(fallback.getByRole('link', { name: 'AV Suite', exact: true }), 'static AV Suite navigation'); await reachable(fallback.getByRole('link', { name: 'Toolbox', exact: true }), 'static Toolbox navigation');
  await fallback.getByText('Field verification required:', { exact: true }).scrollIntoViewIfNeeded(); await noOverflow(staticPage);
  assert.equal(await staticPage.locator('#calculatorSource').isVisible(), false, 'no misleading nonworking calculator controls');
  for (const denied of [false, true]) {
    const compact = await fresh({ width: 844, height: 390 }, denied
      ? () => { Storage.prototype.setItem = () => { throw new DOMException('Synthetic storage denied', 'SecurityError'); }; }
      : () => { localStorage.setItem('avCalculator.v1', '{invalid'); });
    await compact.page.locator('.calculator-controls[open]').waitFor(); assert.equal(await compact.page.locator('#actionStatus').isVisible(), true);
    assert.match(await compact.page.locator('#actionStatus').textContent(), denied ? /storage is unavailable/ : /data was invalid/);
    await button(compact.page, 'Back to panels').click(); await fill(compact.page, '#delayDistance', '100'); assert.match(await compact.page.locator('#delayMs').textContent(), /88\.8/);
  }
  pass('no-JavaScript navigation and safety fallback, and visible compact startup storage errors');

  for (const theme of ['light','dark']) {
    await page.setViewportSize({width:1440,height:900}); if(await page.locator('html').getAttribute('data-av-theme')!==theme) await page.locator('#themeToggle').click();
    assert.equal(await page.locator('.calculator-header h1').evaluate(el=>getComputedStyle(el).color),await page.locator('.calculator-app').evaluate(el=>getComputedStyle(el).color),'header uses readable foreground token');
    for (const size of [{width:1440,height:900},{width:1024,height:768},{width:680,height:812},{width:375,height:812},{width:844,height:390},{width:320,height:256},{width:3840,height:1080}]) {
      await page.setViewportSize(size); await page.waitForFunction(({width,height})=>Boolean(document.querySelector('.console-shell.mode-'+(height<500||width<720?'phone':width<1100?'tablet':'desktop'))),size);
      if(size.height<500)await button(page,'Calculator controls').click();
      const headerControls=page.locator('.calculator-header button,.calculator-header a');for(let i=0;i<await headerControls.count();i++)await reachable(headerControls.nth(i),theme+'/'+size.width+'/header/'+i);
      if(size.height<500)await button(page,'Back to panels').click();
      for(const id of Object.keys(names)) { await activate(page,id); await noOverflow(page); const area=page.locator('#'+id); const prev=button(area,'Previous'),next=button(area,'Next'); for(let i=0;i<40&&await prev.isEnabled();i++)await prev.click(); for(let i=0;i<40;i++){await reachable(prev,id+'/previous');await reachable(next,id+'/next');const controls=area.locator('input:visible,select:visible,button:visible,a:visible');for(let j=0;j<await controls.count();j++)await reachable(controls.nth(j),theme+'/'+size.width+'/'+id+'/'+j);if(!await next.isEnabled())break;await next.click();} }
      await activate(page,'audioCard'); if([375,1440,3840].includes(size.width))await page.screenshot({path:join(output,`calculator-${theme}-${size.width}.png`)});
    }
  }
  pass('every panel page and control in both themes at seven sizes, including short height and ultrawide');

  await page.setViewportSize({width:1440,height:900}); await page.emulateMedia({media:'print'}); for(const id of Object.keys(names).filter(id=>id!=='showContextCard'))assert.equal(await page.locator('#'+id).isVisible(),true,'print '+id); assert.equal(await page.locator('#downloadSummaryBtn').isVisible(),false); await page.emulateMedia({media:'screen'});
  await (await reveal(page,'#resetBtn')).click(); assert.match(await page.locator('#delayMs').textContent(),/63\.9/); assert.equal(JSON.parse(await read(page,key)).ledProductName,'Retain LED');
  pass('print includes all calculators and reset leaves LED fields separate');

  await page.evaluate(async()=>{await navigator.serviceWorker.register('/av-suite-worker.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;});await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await primary.context.setOffline(true);await page.reload();await fill(page,'#delayDistance','100');assert.match(await page.locator('#delayMs').textContent(),/88\.8/);await primary.context.setOffline(false);
  pass('prepared offline workspace reload and calculation');

  assert.deepEqual(errors,[]);
  // Keep the original named-set acceptance, including 100-set limits, in the gate.
  // The child needs this HTTP server, so do not block its event loop here.
  const fieldSetRun = await promisify(execFile)(process.execPath, [join(root,'scripts/probe_av_calculator_field_sets.mjs')], {env:{...process.env,CALCULATOR_BASE:base+'/',CALCULATOR_SCREENSHOT:join(output,'field-sets.png')},timeout:180000,maxBuffer:1_000_000});
  console.log(fieldSetRun.stdout); pass('original desktop/phone field-set suite including 100-set limit and full imported-value preview');
  const viewportRun = await promisify(execFile)(process.execPath,[join(root,'scripts/probe_calculator_viewport.cjs')],{env:{...process.env,VIEWPORT_BASE:base+'/'},timeout:180000,maxBuffer:1_000_000});
  console.log(viewportRun.stdout);pass('retained functional viewport, keyboard, theme, print, reset, show-context and offline suite');
  await writeFile(join(output,'result.json'),JSON.stringify({at:new Date().toISOString(),base,browser:browser.version(),passed,physicalDevices:'not tested',virtualKeyboard:'not tested',processRestartAndPowerLoss:'not tested'},null,2));
} catch(error) { if(page&&!page.isClosed())await page.screenshot({path:join(output,'calculator-failure.png')}).catch(()=>{});await writeFile(join(output,'failure.json'),JSON.stringify({at:new Date().toISOString(),passed,error:String(error),errors},null,2));throw error; }
finally { for(const context of contexts)await context.close().catch(()=>{});await browser?.close();await new Promise(resolve=>server.close(resolve)); }
