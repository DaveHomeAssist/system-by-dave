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
const url = `http://127.0.0.1:${server.address().port}/ontrack.html`;
const output = process.env.ONTRACK_OUTPUT;
async function fit(page, label) {
  const result = await page.evaluate(() => {
    const root = document.documentElement, body = document.body;
    const shell = document.querySelector('.unit').getBoundingClientRect();
    const controls = [...document.querySelectorAll('.plate button,.plate a,.rail button,.view.on > .vtitle button,.view.on summary')]
      .filter(el => el.getClientRects().length).map(el => ({ text:el.textContent.trim(), r:el.getBoundingClientRect().toJSON() }));
    return { width:innerWidth, height:innerHeight, root:[root.scrollWidth, root.scrollHeight], body:[body.scrollWidth, body.scrollHeight], shell:shell.toJSON(), controls };
  });
  assert(result.root[0] <= result.width && result.root[1] <= result.height, `${label}: root overflow ${JSON.stringify(result)}`);
  assert(result.body[0] <= result.width && result.body[1] <= result.height, `${label}: body overflow`);
  assert(result.shell.bottom <= result.height + 1, `${label}: shell extends below viewport`);
  for (const {text,r} of result.controls) assert(r.x >= 0 && r.y >= 0 && r.right <= result.width + 1 && r.bottom <= result.height + 1, `${label}: clipped ${text}`);
}
async function view(page, name) { await page.locator(`[data-view="${name}"]`).click(); }
async function dataCard(page, name) { await view(page,'data'); const open=page.locator('.dcard[open]'); if(await open.count() && await open.locator('summary').textContent()!==name) await open.locator('summary').click(); const card = page.locator('.dcard').filter({has:page.locator('summary',{hasText:name})}); if (!await card.getAttribute('open').then(v => v !== null)) await card.locator('summary').click(); }
try {
  browser = await chromium.launch(launch);
  const context = await browser.newContext({viewport:{width:1440,height:900}, colorScheme:'dark', reducedMotion:'reduce'});
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
  await page.goto(url);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Skip to workspace');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'ontrack-workspace');
  assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'light');
  await page.locator('[data-view=library]').focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator(':focus').getAttribute('data-view'),'sets');
  assert.equal(await page.locator('[data-view=sets]').getAttribute('aria-selected'),'true');
  await page.keyboard.press('Home');
  await page.locator('#themeToggle').click();
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-av-theme'), 'dark');
  // Import the same supported public shapes used by real operators.
  await page.locator('#fileXml').setInputFiles({name:'collection.xml',mimeType:'text/xml',buffer:Buffer.from('<DJ_PLAYLISTS><COLLECTION><TRACK TrackID="1" Name="Keyboard Song" Artist="Probe Artist" AverageBpm="124" Tonality="8A" Genre="House"/></COLLECTION></DJ_PLAYLISTS>')});
  await page.locator('.track-open').waitFor();
  await view(page,'sets');
  await page.locator('#filePlanned').setInputFiles({name:'Plan.txt',mimeType:'text/plain',buffer:Buffer.from('Title\tArtist\tBPM\nKeyboard Song\tProbe Artist\t124')});
  await page.locator('#filePlayed').setInputFiles({name:'Played.txt',mimeType:'text/plain',buffer:Buffer.from('Title\tArtist\tBPM\nKeyboard Song\tProbe Artist\t124')});
  await page.waitForFunction(() => document.querySelector('#statSets').textContent === '2');
  await view(page,'library');
  await page.locator('.track-open').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(':focus').getAttribute('id'),'drawerX');
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('#drawer :focus').count());
  await page.locator('#tagIn').fill('verified');
  await page.locator('#tagIn').press('Enter');
  await page.locator('#dNoteText').fill('Keyboard note retained across reload');
  await page.locator('#dNoteSave').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator(':focus').getAttribute('class'),'track-open');
  await page.getByRole('button',{name:'Sort by title',exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('th[data-s="title"]').getAttribute('aria-sort'),'ascending');
  assert.equal(await page.locator(':focus').getAttribute('aria-label'),'Sort by title');
  await view(page,'debrief');
  await page.locator('.dbrow').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('#dbText').fill('Debrief note retained');
  await page.locator('#dbSave').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('ontrack_v1') || '{}').notes?.length === 2);
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ontrack_v1')));
  assert.equal(saved.notes.length,2); assert.equal(saved.sets.length,2);
  assert.deepEqual(Object.values(saved.tracks)[0].tags,['verified']);
  await dataCard(page,'Backup');
  const downloadEvent=page.waitForEvent('download');
  await page.locator('#btnExport').click();
  const download=await downloadEvent;
  const backup=await readFile(await download.path());
  assert.equal(JSON.parse(backup).version,1);
  await dataCard(page,'Reset');
  page.once('dialog',d=>d.accept()); await page.locator('#btnWipe').click();
  assert.equal(await page.locator('#statTracks').textContent(),'0');
  await dataCard(page,'Backup');
  await page.locator('#fileJson').setInputFiles({name:'ontrack-backup.json',mimeType:'application/json',buffer:backup});
  await page.waitForFunction(() => document.querySelector('#statNotes').textContent === '2');
  // Populate an inherently long record list to exercise bounded scrolling.
  await dataCard(page,'Reset'); page.once('dialog',d=>d.accept()); await page.locator('#btnSample').click();
  await page.waitForFunction(()=>document.querySelector('#statTracks').textContent==='13');
  await view(page,'library');
  const sizes=[[320,256],[1440,900],[680,900],[375,812],[844,390],[3840,1080]];
  if(output) await mkdir(output,{recursive:true});
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    for(const theme of ['light','dark']){
      if(await page.locator('html').getAttribute('data-av-theme')!==theme) await page.locator('#themeToggle').click();
      console.log(`Checking ${width}x${height} ${theme}`);
      for(const name of ['library','sets','debrief','data']){
        await view(page,name); await fit(page,`${width}x${height} ${theme} ${name}`);
        if(name==='data') for(const cardName of ['Status','Backup','Storage','Reset']){await dataCard(page,cardName);await fit(page,`${width} ${theme} Data ${cardName}`);}
      }
      await view(page,'library');
      await page.locator('.filter-panel > summary').click();
      await fit(page,`${width} ${theme} filters`);
      await page.locator('#q').fill('Keyboard Song');
      assert.equal(await page.locator('.track-open').count(),1);
      await page.locator('#clearF').click();
      await page.locator('.filter-panel > summary').click();
      await page.locator('.track-open').first().click();
      await fit(page,`${width} ${theme} drawer`);
      await page.locator('#drawerX').click();
      if(output) await page.screenshot({path:`${output}/${width}-${theme}.png`});
    }
  }
  await page.setViewportSize({width:375,height:812});
  await page.goto(url+'?sbdShow=Probe%20show&sbdVenue=Test%20venue');
  await page.locator('#showContext').click();
  assert(await page.locator('#contextDialog').isVisible());
  assert.equal(await page.locator('body > [data-sbd-suite-dock]').count(),0);
  await page.locator('#contextDialog button').filter({hasText:'Close'}).click();
  assert.equal(await page.locator(':focus').getAttribute('id'),'showContext');
  await page.locator('#showContext').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator(':focus').getAttribute('id'),'showContext');
  await fit(page,'show context mobile');
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.view:visible').count(),4);
  assert.equal(await page.locator('.toast').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  assert.deepEqual(errors,[]);
  console.log('PASS OnTrack: keyboard entry, sorting, drawer focus after edits, XML/text/JSON imports, backup/reset/reload, notes/tags/sets, 6 viewport sizes in both themes, four views, filters, drawer, print and reduced motion');
} finally { await browser?.close(); await new Promise(r=>server.close(r)); }
