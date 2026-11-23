import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
const root=path.resolve(import.meta.dirname,'..');
const server=createServer(async(req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname;
  if(!['/aom-show-board.html','/js/aom-show-board.js','/js/aom-show-board-shell.js'].includes(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');
  res.end(await readFile(path.join(root,file)));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const KEY='aom_show_board_v15';
const fixture={active:0,theme:'light',days:[{label:'Fixture day',rooms:[{name:'Original room',floor:'2',note:'Retain this',sessions:[{s:'08:00',e:'09:00',id:'12345',dead:false}]}]}]};
const valid=JSON.stringify(fixture);
const errors=[];
async function open(raw,mode='local',viewport={width:375,height:812}){
  const ctx=await browser.newContext({viewport,reducedMotion:'reduce',acceptDownloads:true});
  await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')||(process.env.AOM_LIVE_FONTS&&/^https:\/\/(fonts.googleapis.com|fonts.gstatic.com)\//.test(r.request().url()))?r.continue():r.abort());
  await ctx.addInitScript(({raw,mode,KEY})=>{
    if(location.protocol!=='http:')return;
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
    if(!get.call(sessionStorage,'seeded')){
      if(raw!==null)set.call(localStorage,KEY,raw);
      set.call(localStorage,'unrelated','keep');set.call(sessionStorage,'seeded','yes');
    }
    window.fixture={writes:0,failRead:mode.includes('read-error')&&!get.call(sessionStorage,'recover-read'),failWrite:mode.includes('write-error'),falseWrite:mode==='artifact-false',readRaw:()=>get.call(localStorage,KEY),setRaw:value=>set.call(localStorage,KEY,value)};
    if(mode.startsWith('artifact')){
      window.storage={
        async get(key){if(window.fixture.failRead)throw new Error('Synthetic read failure');const value=get.call(localStorage,key);return value===null?null:{value};},
        async set(key,value){window.fixture.writes++;if(window.fixture.failWrite)throw new Error('Synthetic write failure');if(window.fixture.falseWrite)return false;set.call(localStorage,key,value);return true;}
      };
    }else{
      Storage.prototype.getItem=function(key){if(this===localStorage&&key===KEY&&window.fixture.failRead)throw new Error('Synthetic read failure');return get.call(this,key);};
      Storage.prototype.setItem=function(key,value){if(this===localStorage&&key===KEY){window.fixture.writes++;if(window.fixture.failWrite)throw new Error('Synthetic quota failure');}return set.call(this,key,value);};
    }
  },{raw,mode,KEY});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/aom-show-board.html');
  await page.locator('.rlabel').first().waitFor({timeout:5000});
  if(process.env.AOM_LIVE_FONTS)assert.equal(await page.evaluate(async()=>{
    await Promise.all([document.fonts.load('600 18px Syne'),document.fonts.load('400 12px "DM Mono"'),document.fonts.load('400 14px "DM Sans"')]);
    return document.fonts.check('600 18px Syne')&&document.fonts.check('400 12px "DM Mono"')&&document.fonts.check('400 14px "DM Sans"');
  }),true);
  return {ctx,page};
}
async function changeTheme(page){
  await page.locator('#themebtn').click();
  await page.waitForFunction(()=>document.getElementById('savestate').classList.contains('show'));
}
async function unchanged(page,raw){assert.equal(await page.evaluate(()=>window.fixture.readRaw()===null?null:window.fixture.readRaw()),raw,'original saved bytes must survive');}
try{
  // Stop immediately on the first failed data invariant. Context closure discards the fixture.
  for(const [label,raw,mode] of [
    ['malformed JSON','{"days":[','local'],
    ['empty stored string','','local'],
    ['null JSON','null','local'],
    ['invalid shape','{"active":0,"days":[]}','local'],
    ['invalid session',JSON.stringify({...fixture,days:[{label:'Bad',rooms:[{name:'Room',floor:'2',sessions:[{s:null,e:'09:00'}]}]}]}),'local'],
    ['local read rejection',valid,'local-read-error'],
    ['artifact malformed JSON','{"days":[','artifact'],
    ['artifact read rejection',valid,'artifact-read-error']
  ]){
    const {ctx,page}=await open(raw,mode);
    try{
      await changeTheme(page);
      assert.equal(await page.evaluate(raw=>window.fixture.readRaw()===raw,raw),true,label+': original bytes were overwritten');
      assert.equal(await page.evaluate(()=>window.fixture.writes),0,label+': writes must be blocked');
      await page.locator('#storage-warning').waitFor();
      assert.match(await page.locator('#storage-warning').innerText(),/not saved/i);
      await page.reload();await page.locator('#storage-warning').waitFor();await unchanged(page,raw);
      if(label==='malformed JSON'){
        await page.locator('#settingsbtn').click();await page.locator('#f_reset').click();await page.locator('#f_yes').click();
        await unchanged(page,raw);assert.equal(await page.evaluate(()=>window.fixture.writes),0);
      }
      console.log('PASS preservation and reload:',label);
    }finally{await ctx.close();}
  }
  for(const mode of ['local','artifact']){
    const original='{"days":['+String.fromCharCode(0xd800)+'\u0000';
    const {ctx,page}=await open(original,mode);
    try{
      await page.locator('#storage-details').click();
      const download=page.waitForEvent('download');await page.locator('#storage-original').click();
      const output=await download;const stream=await output.createReadStream();let body='';for await(const chunk of stream)body+=chunk;
      const recovery=JSON.parse(body);assert.equal(recovery.schema,'system-by-dave.aom-recovery.v1');assert.equal(recovery.storageKey,KEY);assert.equal(recovery.raw,original);assert.equal(await page.evaluate(()=>window.fixture.writes),0);
      await page.evaluate(value=>window.fixture.setRaw(value),valid);
      await page.locator('#storage-retry').click();
      await page.waitForFunction(()=>document.querySelector('.rlabel')?.textContent.includes('Original room'));
      assert.equal(await page.locator('#storage-warning').isVisible(),false);
      await changeTheme(page);await page.waitForFunction(()=>window.fixture.writes===1);
      assert.equal(JSON.parse(await page.evaluate(()=>window.fixture.readRaw())).days[0].rooms[0].note,'Retain this');
      await page.reload();await page.locator('.rlabel').first().waitFor();
      assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('dark')),true);
      assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated')),'keep');
      console.log('PASS original export, explicit retry and valid restart:',mode);
    }finally{await ctx.close();}
  }
  for(const mode of ['local-read-error','artifact-read-error']){
    const {ctx,page}=await open(valid,mode);
    try{
      await page.locator('#storage-details').click();assert.equal(await page.locator('#storage-original').count(),0);
      await page.evaluate(()=>sessionStorage.setItem('recover-read','yes'));
      await page.locator('#storage-retry').click();await page.waitForFunction(()=>document.querySelector('.rlabel')?.textContent.includes('Original room'));
      await unchanged(page,valid);assert.equal(await page.evaluate(()=>window.fixture.writes),0);
      console.log('PASS healed read retry without data writes:',mode);
    }finally{await ctx.close();}
  }
  for(const mode of ['local-write-error','artifact-write-error','artifact-false']){
    const {ctx,page}=await open(valid,mode);
    try{
      await changeTheme(page);await page.waitForFunction(()=>window.fixture.writes===1);
      await unchanged(page,valid);
      assert.match(await page.locator('#savestate').innerText(),/not saved|save failed/i);
      await page.clock.install();await page.clock.fastForward(4000);
      assert.equal(await page.locator('#savestate').evaluate(n=>getComputedStyle(n).opacity==='1'),true,'save failure must stay visible');
      await page.reload();await page.locator('.rlabel').first().waitFor();await unchanged(page,valid);
      console.log('PASS rejected write retains committed bytes and visible failure:',mode);
    }finally{await ctx.close();}
  }
  for(const size of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]){
    const {ctx,page}=await open('{"days":[','local',{width:size[0],height:size[1]});
    try{
      for(const dark of [false,true]){
        if(await page.locator('body').evaluate(n=>n.classList.contains('dark'))!==dark)await changeTheme(page);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true);
        if(process.env.AOM_STORAGE_SCREENSHOTS&&size[0]===375&&!dark)await page.screenshot({path:process.env.AOM_STORAGE_SCREENSHOTS+'/storage-phone.png'});
        for(const selector of ['#storage-details','#tab-tools','#themebtn']){
          const bounds=await page.locator(selector).boundingBox();
          assert.ok(bounds.x>=0&&bounds.x+bounds.width<=size[0]+1,selector+' must remain inside viewport');
        }
        await page.locator('#storage-details').click();
        if(process.env.AOM_STORAGE_SCREENSHOTS&&size[0]===320&&!dark)await page.screenshot({path:process.env.AOM_STORAGE_SCREENSHOTS+'/storage-short-dialog.png'});
        await page.locator('#storage-original').scrollIntoViewIfNeeded();
        const box=await page.locator('#storage-original').boundingBox();assert.ok(box.width>=44&&box.height>=44);
        await page.locator('#f_cancel').click();
      }
    }finally{await ctx.close();}
  }
  for(const mode of ['local','artifact']){
    const fresh=await open(null,mode);
    try{
      await changeTheme(fresh.page);await fresh.page.waitForFunction(()=>window.fixture.writes===1);
      assert.equal(JSON.parse(await fresh.page.evaluate(()=>window.fixture.readRaw())).theme,'dark');
      await fresh.page.locator('#editbtn').click();await fresh.page.locator('.rlabel').first().click();
      await fresh.page.locator('#f_nm').fill('Temporary room');await fresh.page.locator('#f_save').click();
      await fresh.page.waitForFunction(()=>{const b=JSON.parse(window.fixture.readRaw());return b.days[b.active].rooms[0].name==='Temporary room'});
      await fresh.page.locator('#settingsbtn').click();await fresh.page.locator('#f_reset').click();await fresh.page.locator('#f_yes').click();
      await fresh.page.waitForFunction(()=>{const b=JSON.parse(window.fixture.readRaw());return b.days[b.active].rooms[0].name==='Parlor A'});
      console.log('PASS new store save and explicit reset:',mode);
    }finally{await fresh.ctx.close();}
  }
  assert.deepEqual(errors,[]);
  console.log('PASS failure view in 12 viewport/theme cases, fresh save, no unexpected page errors; disposable contexts closed');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
