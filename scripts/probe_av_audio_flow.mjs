import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

/* AV Suite shell (docs/av-suite-shell.md): one console at /av/. Every Rail
   identity recalls its views in place, standalone tools are not panel choices,
   views mix applications, each application saves only its own key,
   and the page never scrolls at any size in either palette. */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://suite-probe').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) return response.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); }
});
await new Promise(ready => server.listen(0, '127.0.0.1', ready));
const BASE = process.env.AV_AUDIO_BASE || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
const context = await browser.newContext({viewport:{width:1440,height:900}, reducedMotion:'reduce'});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
const button=name=>page.getByRole('button',{name,exact:true});
const flow=()=>page.locator('.audio-flow');
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sbd.avAudio.v1')));
const openFlow=async()=>{ await page.getByRole('tab',{name:'Signal flow',exact:true}).click(); await flow().waitFor(); };
try {
  await page.goto(`${BASE}/av-audio/`);
  await openFlow();
  await button('Powered tops + passive subs template').click();
  assert.equal(await page.locator('.audio-flow-node').count(),0,'preview does not seed data');
  await button('Use unconfirmed template').click();
  assert.equal(await page.locator('.audio-flow-node').count(),6);
  await page.getByLabel('Trace device',{exact:true}).selectOption('top-l');
  assert.equal(await page.locator('.audio-flow-node:not(.audio-flow-dim)').count(),3);
  await button('Connections').click();
  assert.equal(await page.locator('.audio-flow-routes article').count(),3);
  assert.equal(await page.locator('.route-speaker').count(),0,'top trace has no power amp feed');
  await page.getByLabel('Trace device',{exact:true}).selectOption('');
  await button('Edit Sub power').click();
  await page.getByLabel('To device',{exact:true}).selectOption('top-l');
  await button('Apply connection').click();
  assert.match(await page.getByRole('alert').innerText(),/Speaker level cannot feed/);
  await page.getByLabel('To device',{exact:true}).selectOption('subs');
  await page.getByLabel('Input connector / pins',{exact:true}).fill('Pinout unconfirmed');
  await button('Apply connection').click();
  await page.getByLabel('Trace device',{exact:true}).selectOption('amp');
  await button('Edit selected device').click();
  await page.getByLabel('Name',{exact:true}).fill('Sub amp — model unconfirmed');
  await button('Apply device').click();
  await button('Save').click();
  const saved=await read();
  assert.equal(saved.signalFlow.devices.find(d=>d.id==='amp').confirmed,false);
  assert.equal(saved.signalFlow.devices.find(d=>d.id==='subs').quantity,'');
  const downloadPromise=page.waitForEvent('download'); await button('Export JSON').click();
  const download=await downloadPromise, backup=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.deepEqual(backup,saved);
  await page.reload(); await openFlow(); assert.deepEqual(await read(),saved);
  await button('Diagram').click();
  const node=page.getByRole('button',{name:'Trace Powered top L',exact:true});
  await node.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.getByLabel('Trace device',{exact:true}).inputValue(),'top-l');
  assert.equal(await node.evaluate(e=>getComputedStyle(e).outlineStyle)!=='none',true);
  await page.getByLabel('Trace device',{exact:true}).selectOption('');
  await mkdir(join(ROOT,'artifacts/audio-flow'),{recursive:true});
  for(const theme of ['light','dark','white','black']) {
    await page.evaluate(value=>document.documentElement.setAttribute('data-av-theme',value),theme);
    for(const [width,height] of [[1440,900],[680,700],[375,812],[844,390],[320,256],[3840,1080]]) {
      await page.setViewportSize({width,height});
      if(height<300) await button("Full screen focused panel").click();
      await button('Connections').click();
      const bounds=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
      assert.ok(bounds.sw<=width+1&&bounds.sh<=height+1,`${theme} ${width}x${height} page contained ${JSON.stringify(bounds)}`);
      const controls=await flow().locator('button,select').evaluateAll(nodes=>nodes.map(n=>({h:n.getBoundingClientRect().height,w:n.getBoundingClientRect().width})));
      assert.ok(controls.every(c=>c.h>=44&&c.w>=44),'flow controls meet touch size');
      await button('Diagram').click();
      if((width===1440||width===375||width===844)&&['light','dark'].includes(theme)) await page.screenshot({path:join(ROOT,`artifacts/audio-flow/${theme}-${width}.png`)});
      if(height<300) { await page.evaluate(()=>document.exitFullscreen()); await page.waitForFunction(()=>!document.fullscreenElement); }
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('tab',{name:'PA',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'flow-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await button('Confirm import').click();
  await openFlow();
  assert.equal(await page.locator('.audio-flow-node').count(),6,'backup restores graph');
  await page.goto(`${BASE}/av/`);
  await page.locator('.sbd-rail__entry[data-rail-ref="console:audio"]').click();
  await openFlow(); assert.equal(await page.locator('.audio-flow-node').count(),6);
  assert.deepEqual(await read(),saved,'opening in shared console preserves exact document');
  await button('Connections').click();
  assert.equal(await page.locator('.route-speaker').count(),1);
  await page.screenshot({path:join(ROOT,'artifacts/audio-flow/suite-connections.png')});
  assert.deepEqual(errors,[]);
  console.log('Audio flow: template preview, domain guard, edit, trace, save/reload/export, shared console, 24 viewport/palette checks and keyboard pass.');
} catch(error) { await mkdir(join(ROOT,"artifacts/audio-flow"),{recursive:true}); await page.screenshot({path:join(ROOT,"artifacts/audio-flow/failure.png")}); console.error(await page.locator("body").innerText()); throw error; } finally { await browser.close(); server.close(); }
