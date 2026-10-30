import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// A local fixture only. Every external request is intercepted, including scans.
const root = path.resolve(import.meta.dirname, '..');
const allowed = new Set(['/aom-show-board.html', '/js/aom-show-board.js', '/js/aom-show-board-shell.js']);
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!allowed.has(url.pathname)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript' : 'text/html');
  res.end(await readFile(path.join(root, url.pathname)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}) });
const key = 'aom_show_board_v15';
const sizes = [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]];
const errors = [];
let scanRequests = 0;
let scanFails = false;
async function context(options = {}) {
  const ctx = await browser.newContext(options);
  ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/')) return route.continue();
    if (process.env.AOM_LIVE_FONTS && /^https:\/\/(fonts.googleapis.com|fonts.gstatic.com)\//.test(url)) return route.continue();
    if (url.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ contentType:'text/css', body:'' });
    if (url === 'https://api.anthropic.com/v1/messages') {
      scanRequests++;
      const data = route.request().postDataJSON();
      assert.equal(data.model, 'claude-sonnet-4-6');
      assert.equal(data.messages[0].content[0].source.media_type, 'image/jpeg');
      return route.fulfill({ contentType:'application/json', body:JSON.stringify(scanFails ? { error:'Synthetic failure' } : {
        content:[{ type:'text', text:JSON.stringify({ room:'Test Room', date:null, sessions:[{ s:'13:00',e:'14:00',id:'67890' }] }) }]
      }) });
    }
    return route.abort();
  });
  return ctx;
}
async function ready(page) {
  await page.goto(origin + '/aom-show-board.html');
  await page.locator('.rlabel').first().waitFor();
  if (process.env.AOM_LIVE_FONTS) {
    assert.equal(await page.evaluate(async () => {
      await Promise.all([document.fonts.load('600 18px Syne'),document.fonts.load('400 12px "DM Mono"'),document.fonts.load('400 14px "DM Sans"')]);
      return document.fonts.check('600 18px Syne') && document.fonts.check('400 12px "DM Mono"') && document.fonts.check('400 14px "DM Sans"');
    }),true);
  }
}
async function view(page, name) {
  await page.locator('#tab-' + name).click();
  assert.equal(await page.locator('#tab-' + name).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#view-' + name).isVisible(), true);
}
async function containment(page) {
  assert.deepEqual(await page.evaluate(() => {
    const r = document.documentElement;
    return { width:r.scrollWidth <= r.clientWidth, height:r.scrollHeight <= r.clientHeight };
  }), { width:true, height:true });
}
// CSP intentionally forbids eval; poll serialized data from the test process instead.
async function waitSaved(page, predicate) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    if (data && predicate(data)) return data;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Expected saved board state was not observed');
}
try {
  const ctx = await context({ reducedMotion:'reduce' });
  const page = await ctx.newPage();
  await ready(page);
  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('dark')), false);
  let views = 0;
  for (const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    for (const dark of [false,true]) {
      if (await page.locator('body').evaluate(node => node.classList.contains('dark')) !== dark) await page.locator('#themebtn').click();
      for (const name of ['timeline','now','turns','tools']) {
        await view(page,name);
        await containment(page);
        assert.equal(await page.locator('#aom-main').evaluate(node => node.clientHeight > 40), true);
        const tab = await page.locator('#tab-'+name).boundingBox();
        assert.ok(tab.height >= 44 && tab.width >= 44);
        views++;
      }
      await page.locator('#settingsbtn').click();
      await page.locator('#f_day').waitFor();
      await containment(page);
      await page.locator('#f_cancel').scrollIntoViewIfNeeded();
      await page.locator('#f_cancel').click();
      assert.equal(await page.locator('#settingsbtn').evaluate(node => node === document.activeElement), true);
    }
  }
  await page.setViewportSize({width:375,height:812});
  await view(page,'timeline');
  await page.locator('.scroller').evaluate(node => { node.scrollLeft=node.scrollWidth;node.scrollTop=node.scrollHeight; });
  const position=await page.locator('.scroller').evaluate(n=>[n.scrollLeft,n.scrollTop]);
  await view(page,'turns');await view(page,'timeline');
  assert.deepEqual(await page.locator('.scroller').evaluate(n=>[n.scrollLeft,n.scrollTop]),position);
  await page.locator('.rlabel').last().scrollIntoViewIfNeeded();
  await page.locator('.rlabel').last().focus();
  await page.keyboard.press('Enter');
  await page.locator('#f_cancel').waitFor();
  assert.equal(await page.locator('#aom-shell').evaluate(node => node.inert), true);
  await page.locator('#f_cancel').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#gearlist input').first().evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('#f_cancel').evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.rlabel').last().evaluate(node => node === document.activeElement), true);
  await page.locator('#tab-timeline').focus();
  await page.keyboard.press('End');
  assert.equal(await page.locator('#tab-tools').getAttribute('aria-selected'),'true');
  await page.goBack();
  assert.equal(await page.locator('#tab-timeline').getAttribute('aria-selected'),'true');
  await page.locator('.aom-skip').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#aom-main').evaluate(node => node === document.activeElement),true);
  await page.emulateMedia({media:'print'});
  for (const id of ['timeline','now','turns']) assert.equal(await page.locator('#view-'+id).isVisible(),true);
  await page.emulateMedia({media:'screen'});
  if (process.env.AOM_SCREENSHOT) await page.screenshot({path:process.env.AOM_SCREENSHOT});
  console.log(`PASS ${views} viewport/theme/view combinations, dialogs, keyboard, history, print`);
  await ctx.close();

  const edit = await context();
  await edit.addInitScript(({key}) => {
    if (location.protocol !== 'http:' || sessionStorage.getItem('seeded')) return;
    const room = { name:'Test Room',floor:'2',note:'Keep note',sessions:[{s:'08:00',e:'09:30',id:'12345',dead:false}],gear:['Synthetic check'],issues:[] };
    localStorage.setItem(key,JSON.stringify({ active:0,theme:'dark',days:[{label:'Fixture one',rooms:[room]},{label:'Fixture two',rooms:[{...room,name:'Second Room'}]}] }));
    localStorage.setItem('unrelated','preserve');sessionStorage.setItem('seeded','yes');
  }, {key});
  const p = await edit.newPage();
  await ready(p);
  assert.equal(await p.locator('body').evaluate(node=>node.classList.contains('dark')),true);
  await p.locator('.daytab').nth(1).click();
  await waitSaved(p,d=>d.active===1);
  await p.reload();await p.locator('.rlabel').first().waitFor();
  assert.match(await p.locator('.rlabel').first().innerText(),/Second Room/);
  await p.locator('.daytab').first().click();
  await p.locator('#editbtn').click();
  await p.locator('.rlabel').first().click();
  await p.getByLabel('Room name',{exact:true}).fill('Edited Room');
  await p.locator('#f_save').click();
  await waitSaved(p,d=>d.days[0].rooms[0].name==='Edited Room');
  assert.equal(await p.locator('.rlabel').first().evaluate(node=>node===document.activeElement),true);
  await p.locator('.blk').first().focus();await p.keyboard.press('Enter');
  await p.getByLabel('Session ID (optional)',{exact:true}).fill('54321');
  await p.locator('#f_save').click();
  await waitSaved(p,d=>d.days[0].rooms[0].sessions[0].id==='54321');
  await p.locator('#editbtn').click();
  await p.locator('.blk').first().focus();await p.keyboard.press('Space');
  await waitSaved(p,d=>d.days[0].rooms[0].sessions[0].chk===true);
  await p.reload();await p.locator('.rlabel').first().waitFor();
  assert.equal(await p.locator('.blk').first().getAttribute('aria-pressed'),'true');
  await view(p,'tools');
  const before = await p.evaluate(key=>localStorage.getItem(key),key);
  const paste = async () => {
    await p.locator('#pastebtn').click();
    await p.getByLabel('Sign text',{exact:true}).fill('Room: Edited Room\n10:00AM - 11:00AM  11111 Opening');
    await p.locator('#f_read').click();await p.locator('#f_apply').waitFor();
  };
  await paste();
  assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),before);
  await p.locator('#f_cancel').click();
  assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),before);
  await paste();await p.locator('#f_apply').click();
  await waitSaved(p,d=>d.days[0].rooms[0].sessions[0].id==='11111');
  const photo = { name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64') };
  await p.locator('#scanfile').setInputFiles(photo);
  await p.locator('#f_apply').waitFor();
  assert.equal(scanRequests,1);
  assert.equal((await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).days[0].rooms[0].sessions[0].id,'11111');
  await p.locator('#f_apply').click();
  await waitSaved(p,d=>d.days[0].rooms[0].sessions[0].id==='67890');
  scanFails=true;
  await p.locator('#scanfile').setInputFiles(photo);
  await p.locator('#f_retry').waitFor();
  assert.equal(scanRequests,2);
  await p.locator('#f_cancel').click();
  assert.equal(await p.evaluate(()=>localStorage.getItem('unrelated')),'preserve');
  await p.evaluate(() => {
    window.policyViolations=[];
    document.addEventListener('securitypolicyviolation', e=>window.policyViolations.push(e.violatedDirective));
    const script=document.createElement('script');script.textContent='window.unexpectedInlineExecution=true';document.head.append(script);
    fetch('https://example.invalid/blocked').catch(()=>{});
  });
  await p.waitForFunction(()=>window.policyViolations.length>=2);
  assert.equal(await p.evaluate(()=>window.unexpectedInlineExecution),undefined);
  assert.ok((await p.evaluate(()=>window.policyViolations)).includes('connect-src'));
  await edit.close();
  console.log('PASS existing saved data/theme/day, room/session edit, reload, paste confirmation, mocked photo scan/error, CSP');

  const nojs = await context({javaScriptEnabled:false});
  const n = await nojs.newPage();await n.goto(origin+'/aom-show-board.html');
  assert.equal(await n.locator('noscript').isVisible(),true);await containment(n);await nojs.close();
  const denied=await context();
  await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Synthetic denied storage')}})});
  const d=await denied.newPage();await ready(d);await d.locator('#themebtn').click();
  await d.waitForFunction(()=>document.getElementById('savestate').textContent.includes('not saved'));
  assert.equal(await d.locator('#savestate').isVisible(),true);await denied.close();
  assert.deepEqual(errors,[]);
  console.log('PASS no-JavaScript notice, denied-storage feedback and no unexpected page errors');
} finally {
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
