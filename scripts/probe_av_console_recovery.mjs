import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://probe').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) {
    response.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const BASE = process.env.AV_VIDEO_BASE || `http://127.0.0.1:${server.address().port}`;

const channel = process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL }
  : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {};
const browser = await chromium.launch({ headless: true, ...channel, args: args.includes('--no-sandbox') ? ['--no-sandbox'] : [] });

const STORE = 'sbd.avVideo.v1', DRAFT = 'sbd.avVideo.draft.v1', LAYOUT = 'sbd.avVideo.layout.v1', INDEX = 'sbd.consoleDrafts.v1';
const url = `${BASE}/av-video/`;
const failures = [];
let seed;
const setup = await browser.newContext();
try {
  const p = await setup.newPage(); await p.goto(url);
  await p.getByRole('button', { name: 'Try a sample plan', exact: true }).click();
  await p.getByRole('button', { name: /^Save/ }).click();
  seed = await p.evaluate(k => localStorage.getItem(k), STORE);
} finally { await setup.close(); }
async function scenario(name, initial, check) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const errors = [];
  await ctx.addInitScript(({ seed, initial, STORE }) => {
    if (!sessionStorage.getItem('recovery-seed') && !localStorage.getItem(STORE)) {
      localStorage.setItem(STORE, seed);
      for (const [k, v] of Object.entries(initial)) localStorage.setItem(k, v);
    }
    sessionStorage.setItem('recovery-seed', '1');
    window.recoveryFault = null;
    const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(k,v) { if (window.recoveryFault === `set:${k}`) throw new DOMException('Injected quota failure', 'QuotaExceededError'); return set.call(this,k,v); };
    Storage.prototype.removeItem = function(k) { if (window.recoveryFault === `remove:${k}`) throw new DOMException('Injected removal failure', 'SecurityError'); return remove.call(this,k); };
  }, { seed, initial, STORE });
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept()); await p.goto(url); await p.getByRole('tab', { name: /^Routing/ }).waitFor(); return p; };
  try { await check(await open(), open); assert.deepEqual(errors, []); console.log(`PASS ${name}`); }
  catch(e) { failures.push(name); console.error(`FAIL ${name}: ${e.message.slice(0,400)}`); }
  finally { await ctx.close(); }
}
const read = (p,k) => p.evaluate(k => localStorage.getItem(k), k);
const settle = p => p.waitForTimeout(750); // Cross the documented 400ms draft debounce.
const edit = (p,s) => p.getByLabel('Source', { exact: true }).fill(s);
const warning = async (p,pattern) => assert.match(await p.getByRole('status').textContent(), pattern);
const offered = (source='Old draft') => { const doc=JSON.parse(seed); doc.routes[0].source=source; return JSON.stringify({v:1,console:'av-video',at:'2026-10-05T10:00:00Z',baseline:seed,doc}); };
try {
  await scenario('draft write failure is visible and Export works', {}, async p => {
    await p.evaluate(k => window.recoveryFault=`set:${k}`, DRAFT); await edit(p,'Export me'); await settle(p);
    await warning(p,/draft.*(failed|unavailable|could not)/i); assert.equal(await read(p,STORE),seed);
    const download=p.waitForEvent('download'); await p.getByRole('button',{name:'Export',exact:true}).click();
    const saved=await (await download).path(); assert.equal(JSON.parse(await readFile(saved,'utf8')).routes[0].source,'Export me');
  });
  await scenario('failed removal retains offer and draft index', {[DRAFT]:offered(),[INDEX]:JSON.stringify({'av-video':{at:'x',label:'Plan'}})}, async p => {
    await p.evaluate(k => window.recoveryFault=`remove:${k}`,DRAFT); await p.getByRole('button',{name:'Discard draft',exact:true}).click(); await settle(p);
    assert.ok(await read(p,DRAFT)); assert.ok(JSON.parse(await read(p,INDEX))['av-video']);
    assert.equal(await p.getByRole('button',{name:'Discard draft',exact:true}).count(),1); await warning(p,/draft.*(failed|could not)/i);
  });
  await scenario('index failure is distinguished from draft failure', {}, async p => {
    await p.evaluate(k => window.recoveryFault=`set:${k}`, INDEX); await edit(p,'Stored draft'); await settle(p);
    assert.ok(await read(p,DRAFT)); await warning(p,/index.*(failed|could not|unavailable)/i);
    await p.getByRole('button',{name:/^Save/}).click(); await settle(p); assert.equal(await read(p,DRAFT),null);
    await warning(p,/index.*(failed|could not|unavailable)/i);
  });
  await scenario('layout write failure is visible', {}, async p => {
    await p.evaluate(k => window.recoveryFault=`set:${k}`,LAYOUT); await p.getByRole('tab',{name:'Projection',exact:true}).click(); await settle(p);
    await warning(p,/layout.*(failed|could not|unavailable)/i); assert.equal(await read(p,STORE),seed);
  });
  await scenario('opening does not write layout', {}, async p => { await settle(p); assert.equal(await read(p,LAYOUT),null); });
  const layout=JSON.stringify({v:1,viewId:'routing',locked:true,live:{routing:[{id:'good',type:'flow',x:0,y:0,w:8,h:5},{id:'overlap',type:'patch',x:0,y:0,w:8,h:5},{id:'outside',type:'inspector',x:12,y:0,w:4,h:8}]}});
  await scenario('cached geometry is sanitized without overwriting bytes', {[LAYOUT]:layout}, async p => {
    await settle(p); assert.deepEqual(await p.locator('.console-panel').evaluateAll(es=>es.map(e=>e.dataset.panel)),['flow']);
    assert.equal(await read(p,LAYOUT),layout); assert.equal(await read(p,STORE),seed);
  });
  await scenario('second editor cannot replace first draft', {}, async (a,open) => {
    const b=await open(); await settle(b); await edit(a,'Tab A'); await settle(a); const first=await read(a,DRAFT);
    await edit(b,'Tab B'); await settle(b); assert.equal(await read(a,DRAFT),first); assert.equal(await b.getByLabel('Source',{exact:true}).inputValue(),'Tab B'); await warning(b,/draft.*(changed|conflict)/i);
  });
  await scenario('clean tab cannot clear another tab draft', {}, async (a,open) => {
    const b=await open(); await settle(b); await edit(a,'Tab A'); await settle(a); const first=await read(a,DRAFT);
    await edit(b,'Transient'); await b.getByRole('button',{name:/Undo/}).click(); await settle(b); assert.equal(await read(a,DRAFT),first);
  });
  await scenario('stale offer cannot discard newer draft', {[DRAFT]:offered()}, async (a,open) => {
    const b=await open(); await a.getByRole('button',{name:'Restore draft',exact:true}).click(); await a.waitForFunction(()=>!document.querySelector('.draft-offer')); await edit(a,'Newer draft'); await settle(a); const newer=await read(a,DRAFT); assert.equal(JSON.parse(newer).doc.routes[0].source,'Newer draft');
    await b.getByRole('button',{name:'Discard draft',exact:true}).click(); await settle(b); assert.equal(await read(a,DRAFT),newer); await warning(b,/draft.*(changed|conflict)/i);
  });
  await scenario('simultaneous edits preserve the first draft and conflicting local edits', {}, async (a,open) => {
    const b=await open(); await settle(b);
    await Promise.all([edit(a,'Concurrent A'),edit(b,'Concurrent B')]); await settle(a);
    const stored=JSON.parse(await read(a,DRAFT)).doc.routes[0].source;
    assert.ok(['Concurrent A','Concurrent B'].includes(stored));
    const other=stored==='Concurrent A'?b:a;
    await warning(other,/draft.*(changed|conflict)/i);
    assert.equal(await a.getByLabel('Source',{exact:true}).inputValue(),'Concurrent A');
    assert.equal(await b.getByLabel('Source',{exact:true}).inputValue(),'Concurrent B');
    assert.equal(await read(a,STORE),seed);
  });
  await scenario('explicit Save clears only the owned draft and reload keeps saved edits', {}, async p => {
    await edit(p,'Saved camera'); await settle(p); assert.ok(await read(p,DRAFT));
    await p.getByRole('button',{name:/^Save/}).click(); await settle(p);
    assert.equal(await read(p,DRAFT),null); await p.reload();
    assert.equal(await p.getByLabel('Source',{exact:true}).inputValue(),'Saved camera');
  });
  await scenario('restore never replaces current unsaved edits', {[DRAFT]:offered()}, async p => {
    await edit(p,'Keep current');
    await p.getByRole('button',{name:'Restore draft',exact:true}).focus(); await p.keyboard.press('Enter');
    await settle(p); assert.equal(await p.getByLabel('Source',{exact:true}).inputValue(),'Keep current');
    assert.equal(await read(p,DRAFT),offered()); assert.equal(await read(p,STORE),seed);
    await warning(p,/Export current edits/i);
  });
  await scenario('recovery controls work by keyboard and fit themes and responsive boundaries', {[DRAFT]:offered()}, async p => {
    for(const theme of ['light','dark']) for(const width of [375,719,720,1099,1100,1440]) {
      await p.setViewportSize({width,height:width===375?812:900});
      await p.evaluate(theme=>document.documentElement.dataset.avTheme=theme,theme);
      await p.waitForFunction(width=>document.querySelector('.console-shell')?.classList.contains(width<720?'mode-phone':width<1100?'mode-tablet':'mode-desktop'),width);
      assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=document.documentElement.clientHeight && document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${theme} ${width}: page overflow`);
      for(const name of ['Restore draft','Discard draft']) {
        const box=await p.getByRole('button',{name,exact:true}).boundingBox(); assert.ok(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.x+box.width<=width,`${name} fits at ${width}`);
      }
    }
    await p.getByRole('button',{name:'Restore draft',exact:true}).focus(); await p.keyboard.press('Enter');
    await settle(p); assert.equal(await p.getByLabel('Source',{exact:true}).inputValue(),'Old draft'); assert.equal(await read(p,STORE),seed);
  });
  const hiddenDoc=JSON.parse(seed); hiddenDoc.modules.patch=false;
  const hiddenLayout=JSON.stringify({v:1,viewId:'routing',locked:true,live:{routing:[{id:'flow',type:'flow',x:0,y:0,w:8,h:5},{id:'patch',type:'patch',x:0,y:5,w:8,h:3}]}});
  await scenario('disabled module cache remains intact and can return', {[STORE]:JSON.stringify(hiddenDoc),[LAYOUT]:hiddenLayout}, async p => {
    await settle(p); assert.equal(await p.locator('[data-panel="patch"]').count(),0);
    assert.match(await p.locator('.console-notice').textContent(),/1 panel/);
    assert.equal(await read(p,LAYOUT),hiddenLayout);
    await p.evaluate(k=>{const d=JSON.parse(localStorage.getItem(k));d.modules.patch=true;localStorage.setItem(k,JSON.stringify(d));},STORE);
    await p.reload(); await p.locator('[data-panel="patch"]').waitFor(); assert.equal(await read(p,LAYOUT),hiddenLayout);
  });
  if(failures.length) throw new Error(`${failures.length} recovery regressions: ${failures.join('; ')}`);
  console.log('AV console recovery verification passed.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
