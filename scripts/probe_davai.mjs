#!/usr/bin/env node
// Disposable browser records only. Serve the checked-out page, never production.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.json':'application/json' };
const server = createServer(async (req, res) => {
  try {
    const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(root + sep)) throw new Error('Outside root');
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const launch = { headless:true, args: process.argv.includes('--no-sandbox') ? ['--no-sandbox'] : [] };
if (process.env.CHROME_CHANNEL) launch.channel = process.env.CHROME_CHANNEL;
else if (process.env.CHROME_BIN) launch.executablePath = process.env.CHROME_BIN;

let browser;
const errors = [];
const base = `http://127.0.0.1:${server.address().port}/systembydave/`;
const routes = ['index','index-md','routing','lifecycle','sync','voice','implementation', ...['identity','semantic','episodic','procedural','decisions','working','reference'].map(s => 'layers/' + s)];
const sizes = process.argv.includes('--short-screen') ? [[320,256]] : [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]];
async function fit(page, label) {
  const result = await page.evaluate(() => {
    const root = document.documentElement, main = document.querySelector('main');
    const controls = [...document.querySelectorAll('.primary-nav a,.reference-controls button,.reference-controls summary,.sbd-site-return a')]
      .filter(e => e.getClientRects().length).map(e => ({text:e.textContent.trim(), r:e.getBoundingClientRect().toJSON()}));
    return {root:[root.scrollWidth,root.scrollHeight],size:[innerWidth,innerHeight],main:main.getBoundingClientRect().toJSON(), content:[main.scrollWidth,main.clientWidth],controls};
  });
  assert(result.root[0] <= result.size[0] && result.root[1] <= result.size[1], label + ': root overflow ' + JSON.stringify(result));
  assert(result.main.height >= 48, label + ': reading panel too short ' + result.main.height);
  assert(result.content[0] <= result.content[1] + 1, label + ': horizontal reading overflow ' + JSON.stringify(result.content));
  for (const {text,r} of result.controls) {
    assert(r.x >= 0 && r.y >= 0 && r.right <= result.size[0]+1 && r.bottom <= result.size[1]+1, label + ': clipped ' + text);
    assert(r.width >= 43 && r.height >= 43, label + ': small target ' + text);
  }
}
try {
  browser = await chromium.launch(launch);
  const context = await browser.newContext({viewport:{width:1440,height:900},colorScheme:'dark',reducedMotion:'reduce'});
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(base+'index.html');
  assert.equal(await page.locator('html').getAttribute('data-davai-theme'),'light');
  await page.locator('#davai-theme').click();
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-davai-theme'),'dark');
  for (const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    for (const theme of ['light','dark']) {
      await page.evaluate(theme => localStorage.setItem('davai.theme.v1',theme),theme);
      for (const route of routes) {
        await page.goto(base+route+'.html');
        await page.keyboard.press('Tab');
        assert.equal(await page.locator(':focus').textContent(),'Skip to content');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator(':focus').getAttribute('id'),'main');
        assert.equal(await page.locator('html').getAttribute('data-davai-theme'),theme);
        await fit(page,`${route} ${width}x${height} ${theme}`);
        await page.locator('.layer-menu summary').click();
        const last = page.locator('.layer-strip a').last();
        await last.focus();
        await last.scrollIntoViewIfNeeded();
        assert(await last.isVisible());
        await page.keyboard.press('Escape');
        assert.equal(await page.locator(':focus').evaluate(e => e.tagName),'SUMMARY');
        await page.locator('main').focus();
        await page.keyboard.press('Control+End');
        await page.waitForFunction(() => { const e=document.querySelector('main'); return e.scrollHeight <= e.clientHeight || e.scrollTop > 0; });
      }
      if (process.env.DAVAI_OUTPUT) {
        await page.goto(base+'index.html');
        await page.locator('main').evaluate(e=>e.scrollTop=0);
        await mkdir(process.env.DAVAI_OUTPUT,{recursive:true});
        await page.screenshot({path:`${process.env.DAVAI_OUTPUT}/${width}-${theme}.png`});
      }
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'implementation.html');
  await page.locator('main').evaluate(e=>e.scrollTop=600);
  await page.reload();
  assert(await page.locator('main').evaluate(e=>e.scrollTop>=590));
  await page.goto(base+'index.html#layers');
  await page.waitForFunction(() => Math.abs(document.querySelector('#layers').getBoundingClientRect().top - document.querySelector('main').getBoundingClientRect().top) < 24);
  await page.locator('.primary-nav a[href="routing.html"]').click();
  assert(page.url().endsWith('/routing.html'));
  await page.goBack();
  assert(page.url().endsWith('/index.html#layers'));
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('main').evaluate(e=>getComputedStyle(e).overflow),'visible');
  assert.equal(await page.locator('.primary-nav').evaluate(e=>getComputedStyle(e).display),'none');
  assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).getPropertyValue('--ink').trim()),'black');
  for (const selector of ['.band-ink','.band-ink p','.site-footer','.site-footer a']) {
    assert.equal(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).color),'rgb(0, 0, 0)');
  }
  const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});
  const fallback = await noJS.newPage();
  for (const route of routes) {
    await fallback.goto(base+route+'.html');
    await fallback.keyboard.press('Tab');
    await fallback.keyboard.press('Enter');
    assert.equal(await fallback.locator(':focus').getAttribute('id'),'main');
    await fit(fallback,route+' no JavaScript');
    assert.equal(await fallback.locator('main h1').count(),1);
  }
  await fallback.locator('.layer-menu summary').click();
  await fallback.locator('.layer-strip a[href="identity.html"]').click();
  assert(fallback.url().includes('layers/identity.html'));
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}}));
  const blockedPage=await blocked.newPage();
  blockedPage.on('pageerror',error=>errors.push(error.message));
  await blockedPage.goto(base+'index.html');
  await blockedPage.locator('#davai-theme').click();
  assert.equal(await blockedPage.locator('html').getAttribute('data-davai-theme'),'dark');
  assert.deepEqual(errors,[]);
  console.log(`Davai: 14 routes, ${sizes.length} viewports, both themes, keyboard skip, layer disclosure, scroll restore, print, no JavaScript and blocked storage passed.`);
} finally { await browser?.close(); server.close(); }
