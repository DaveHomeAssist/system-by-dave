#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const commandTarget = 'https://davehomeassist.github.io/command-center-061eed/private.html';
const gameTarget = 'https://mixmash.games/mars/';
const raw = JSON.stringify({ version: 1, colony: 'Test Ω 🚀', day: 17, records: ['first', 'second'] });
const html = await readFile(resolve(root, 'marsscape/index.html'), 'utf8');
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
assert.ok(html.includes(`'sha256-${createHash('sha256').update(style).digest('base64')}'`), 'CSP style hash must match source');
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(root, '.' + pathname);
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    let body = await readFile(file, 'utf8');
    if (url.searchParams.has('fallback')) body = body.replace(/<meta http-equiv="refresh"[^>]+>/, '').replace(/<script src="redirect.js" defer><\/script>/, '');
    if (url.searchParams.has('scriptOnly')) body = body.replace(/<meta http-equiv="refresh"[^>]+>/, '');
    res.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(file)] || 'text/plain' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let views = 0;
let cases = 0;
async function fixture({ value = raw, denied = false, clipboard = 'success', javaScriptEnabled = true } = {}) {
  const context = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce', javaScriptEnabled });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.route('https://**/*', route => {
    if ([commandTarget,gameTarget].includes(route.request().url()) && route.request().isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: '<title>Destination fixture</title>' });
    return route.abort();
  });
  await page.addInitScript(({ value, denied, clipboard }) => {
    if (!sessionStorage.getItem('fixture-seeded')) {
      if (value !== null) localStorage.setItem('marsscape_v1', value);
      localStorage.setItem('unrelated-fixture', 'preserve');
      sessionStorage.setItem('fixture-seeded', 'yes');
    }
    window.saveMutations = [];
    for (const name of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[name];
      Storage.prototype[name] = function (...args) { if (name === 'clear' || args[0] === 'marsscape_v1') window.saveMutations.push(name); return original.apply(this, args); };
    }
    if (denied) {
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) { if (key === 'marsscape_v1') throw new DOMException('denied','SecurityError'); return get.call(this,key); };
    }
    Object.defineProperty(navigator, 'clipboard', { value: clipboard === 'absent' ? undefined : { writeText: async code => {
      if (clipboard === 'reject') throw new Error('denied');
      if (clipboard === 'pending') await new Promise(done => { window.finishCopy = done; });
      window.copiedValue = code;
    } } });
    if (clipboard === 'absent') document.execCommand = () => false;
  }, { value, denied, clipboard });
  await page.clock.install();
  return { page, context, errors };
}
async function layout(page, label) {
  const failures = await page.evaluate(() => {
    const issues = [];
    const d = document.documentElement;
    if (d.scrollHeight > d.clientHeight || d.scrollWidth > d.clientWidth) issues.push('root overflow');
    for (const node of document.querySelectorAll('header a, header button, [role="tab"], [role="tabpanel"] *, #redirect-main *')) {
      if (!node.checkVisibility() || node.closest('[hidden]')) continue;
      const b = node.getBoundingClientRect();
      if (b.left < 0 || b.top < 0 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1) issues.push(node.id || node.textContent);
      if (!node.matches('textarea') && (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1)) issues.push('clipped ' + (node.id || node.tagName));
      if (node.matches('a,button') && (b.width < 44 || b.height < 44)) issues.push('small target');
    }
    return issues;
  });
  assert.deepEqual(failures, [], label);
  views++;
}
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
  for (const javaScriptEnabled of [true,false]) {
    const f = await fixture({javaScriptEnabled});
    await f.page.goto(`${base}/command53/${javaScriptEnabled ? '?scriptOnly' : ''}`);
    await f.page.waitForURL(commandTarget); cases++;
    await f.context.close();
  }
  for (const route of ['/command53/?fallback','/marsscape/']) {
    const f = await fixture(); const p = f.page;
    await p.goto(base + route);
    assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'light');
    for (const [width,height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]) {
      await p.setViewportSize({width,height});
      for (const theme of ['light','dark']) {
        if (await p.evaluate(() => document.documentElement.dataset.theme) !== theme) await p.locator('.public-theme-toggle').click();
        const panels = route.includes('marsscape') ? ['status','save','next'] : [null];
        for (const panel of panels) {
          if (panel) await p.locator('#tab-' + panel).click();
          await layout(p, `${route} ${width}x${height} ${theme} ${panel}`);
          if (process.env.HANDOFF_SCREENSHOTS && width === 375 && theme === 'dark' && (panel === 'save' || !panel)) await p.screenshot({path:`${process.env.HANDOFF_SCREENSHOTS}/${panel || 'command'}.png`});
        }
      }
    }
    await p.reload();
    assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await p.keyboard.press('Tab'); assert.match(await p.locator(':focus').getAttribute('class'), /skip/);
    await p.keyboard.press('Enter'); assert.match(await p.locator(':focus').getAttribute('id'), /main/);
    if (route.includes('marsscape')) {
      await p.locator('#tab-status').focus(); await p.keyboard.press('ArrowRight'); assert.equal(await p.locator(':focus').getAttribute('id'), 'tab-save');
      await p.locator('#copy').click(); assert.match(await p.locator('#copied').textContent(), /^Copied\./);
      assert.equal(Buffer.from(await p.evaluate(() => window.copiedValue),'base64').toString('utf8'), raw);
      await p.reload(); assert.equal(await p.evaluate(() => localStorage.getItem('marsscape_v1')), raw);
      assert.equal(await p.evaluate(() => localStorage.getItem('unrelated-fixture')), 'preserve');
      assert.deepEqual(await p.evaluate(() => window.saveMutations), []);
    }
    assert.deepEqual(f.errors, [], route); await f.context.close(); cases++;
  }
  for (const clipboard of ['reject','absent']) {
    const f = await fixture({ clipboard }); const p = f.page; await p.goto(base+'/marsscape/'); await p.locator('#show-save').click(); await p.locator('#copy').click();
    assert.match(await p.locator('#copied').textContent(), /^Copy failed/);
    await p.setViewportSize({width:320,height:256}); await layout(p, 'copy failure short screen');
    assert.equal(await p.locator('#code').evaluate(el=>el.selectionEnd-el.selectionStart), (await p.locator('#code').inputValue()).length);
    await p.clock.runFor(6000); assert.ok(p.url().startsWith(base));
    assert.equal(await p.evaluate(()=>localStorage.getItem('marsscape_v1')),raw); cases++;await f.context.close();
  }
  for (const denied of [false,true]) {
    const f=await fixture({value:null,denied});const p=f.page;await p.goto(base+'/marsscape/');await p.clock.runFor(6000);
    if(denied){assert.ok(p.url().startsWith(base));assert.match(await p.locator('#save-status').textContent(),/cannot be read/);await p.setViewportSize({width:320,height:256});await layout(p,'blocked storage short screen');}else await p.waitForURL(gameTarget);
    cases++;await f.context.close();
  }
  const cancel=await fixture({value:null});await cancel.page.goto(base+'/marsscape/');await cancel.page.locator('#cancel-redirect').click();await cancel.page.clock.runFor(6000);assert.ok(cancel.page.url().startsWith(base));cases++;await cancel.context.close();
  for(const value of [JSON.stringify({colony:'x'.repeat(65536)}),'\ud800']){
    const f=await fixture({value});const p=f.page;await p.goto(base+'/marsscape/');await p.locator('#show-save').click();
    if(value==='\ud800'){assert.equal(await p.locator('#code').inputValue(),value);assert.equal(await p.locator('#copy').isDisabled(),true);assert.match(await p.locator('#copied').textContent(),/Encoding failed/);await p.setViewportSize({width:320,height:256});await layout(p,'encoding failure short screen');}else assert.equal(Buffer.from(await p.locator('#code').inputValue(),'base64').toString('utf8'),value);
    assert.equal(await p.evaluate(()=>localStorage.getItem('marsscape_v1')),value);await p.clock.runFor(6000);assert.ok(p.url().startsWith(base));cases++;await f.context.close();
  }
  const change=await fixture({clipboard:'pending'});const p=change.page;await p.goto(base+'/marsscape/');await p.locator('#show-save').click();const oldCode=await p.locator('#code').inputValue();await p.locator('#copy').click();
  const changed=JSON.stringify({colony:'Newer save'});await p.evaluate(value=>{localStorage.setItem('marsscape_v1',value);dispatchEvent(new StorageEvent('storage',{key:'marsscape_v1',newValue:value}));},changed);await p.evaluate(()=>window.finishCopy());await p.waitForFunction(()=>document.querySelector('#copied').textContent.startsWith('Earlier code copied'));
  assert.equal(await p.evaluate(()=>window.copiedValue),oldCode);assert.equal(Buffer.from(await p.locator('#code').inputValue(),'base64').toString('utf8'),changed);
  const backup=await p.locator('#code').inputValue();await p.evaluate(()=>{localStorage.removeItem('marsscape_v1');dispatchEvent(new StorageEvent('storage',{key:'marsscape_v1'}));});assert.equal(await p.locator('#code').inputValue(),backup);assert.match(await p.locator('#copied').textContent(),/Previous code preserved/);await p.setViewportSize({width:320,height:256});await layout(p,'preserved backup short screen');await p.clock.runFor(6000);assert.ok(p.url().startsWith(base));cases++;await change.context.close();
  const arriving=await fixture({value:null});await arriving.page.goto(base+'/marsscape/');await arriving.page.evaluate(value=>localStorage.setItem('marsscape_v1',value),raw);await arriving.page.clock.runFor(6000);assert.ok(arriving.page.url().startsWith(base));assert.match(await arriving.page.locator('#save-status').textContent(),/save was found/);cases++;await arriving.context.close();
  const nojs=await fixture({javaScriptEnabled:false});await nojs.page.goto(base+'/marsscape/');assert.match(await nojs.page.locator('#save-status').textContent(),/Enable JavaScript/);assert.equal(await nojs.page.getByRole('link',{name:'Open game',exact:true}).isVisible(),true);await nojs.page.setViewportSize({width:320,height:256});await layout(nojs.page,'no JavaScript short screen');cases++;await nojs.context.close();
  const stale=await fixture();await stale.page.goto(base+'/marsscape/');await stale.page.locator('#show-save').click();await stale.page.evaluate(value=>localStorage.setItem('marsscape_v1',value),changed);await stale.page.locator('#copy').click();assert.equal(await stale.page.evaluate(()=>window.copiedValue),undefined);assert.match(await stale.page.locator('#copied').textContent(),/Save changed/);assert.equal(Buffer.from(await stale.page.locator('#code').inputValue(),'base64').toString('utf8'),changed);cases++;await stale.context.close();
  const print=await fixture();await print.page.goto(base+'/marsscape/');await print.page.emulateMedia({media:'print'});assert.equal(await print.page.locator('#panel-save').isVisible(),true);assert.equal(await print.page.locator('header').isVisible(),false);assert.equal(await print.page.locator('#code').inputValue(),Buffer.from(raw).toString('base64'));cases++;await print.context.close();
  console.log(`Legacy handoffs passed: ${cases} behavior cases and ${views} viewport/theme/panel views. Original save readback and unrelated key preserved.`);
} finally {await browser?.close();await new Promise(done=>server.close(done));}
