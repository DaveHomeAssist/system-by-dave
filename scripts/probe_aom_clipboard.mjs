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
const fixture={active:0,theme:'light',days:[{label:'Fixture day',rooms:[{name:'Room <tag> & café',floor:'2',sessions:[{s:'08:00',e:'09:00',id:'12345'}]}]}]};
const expected='AOM FIXTURE DAY\n\nROOM <TAG> & CAFÉ\n8a to 9a\n\nLast out: Room <tag> & café 9a';
const errors=[];
async function open(mode,viewport={width:375,height:812}){
  const ctx=await browser.newContext({viewport,reducedMotion:'reduce',...(mode==='real'?{permissions:['clipboard-read','clipboard-write']}:{})});
  await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')||(process.env.AOM_LIVE_FONTS&&/^https:\/\/(fonts.googleapis.com|fonts.gstatic.com)\//.test(r.request().url()))?r.continue():r.abort());
  await ctx.addInitScript(({mode,fixture})=>{
    if(location.protocol!=='http:')return;
    localStorage.setItem('aom_show_board_v15',JSON.stringify(fixture));
    window.copyFixture={modern:[],legacy:[],mode};
    if(mode==='real')return;
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='absent'?undefined:{writeText:async text=>{
      window.copyFixture.modern.push(text);
      if(mode==='modern')return;
      if(mode==='deferred')return new Promise((resolve,reject)=>{window.copyFixture.reject=()=>reject(new Error('Denied'));});
      throw new Error('Denied');
    }}});
    document.execCommand=()=>{
      window.copyFixture.legacy.push(document.activeElement.value);
      if(mode==='throw')throw new Error('Denied');
      return mode==='legacy';
    };
  },{mode,fixture});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/aom-show-board.html');await page.locator('.rlabel').first().waitFor();
  if(process.env.AOM_LIVE_FONTS)assert.equal(await page.evaluate(async()=>{
    await Promise.all([document.fonts.load('600 18px Syne'),document.fonts.load('400 12px \"DM Mono\"'),document.fonts.load('400 14px \"DM Sans\"')]);
    return document.fonts.check('600 18px Syne')&&document.fonts.check('400 12px \"DM Mono\"')&&document.fonts.check('400 14px \"DM Sans\"');
  }),true);
  await page.locator('#tab-tools').click();
  return {ctx,page};
}
try{
  // This invariant failed on fc20a71: both writes failed but the button said Copied.
  for(const mode of ['reject','absent','throw']){
    const {ctx,page}=await open(mode);
    try{
      await page.locator('#copybtn').click();
      await page.waitForFunction(()=>document.getElementById('copybtn').textContent!=='Copying');
      assert.doesNotMatch(await page.locator('#copybtn').innerText(),/copied/i,'failed clipboard must not claim success');
      const text=page.locator('#copy-manual');await text.waitFor();
      assert.equal(await text.inputValue(),expected);assert.equal(await text.getAttribute('readonly'),'');
      assert.equal(await text.evaluate(n=>n.selectionStart===0&&n.selectionEnd===n.value.length&&document.activeElement===n),true);
      assert.equal(await page.locator('#sheet tag').count(),0);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#copybtn').evaluate(n=>n===document.activeElement),true);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('aom_show_board_v15')).days[0].rooms[0].name),'Room <tag> & café');
      console.log('PASS honest failure and exact selected manual text:',mode);
    }finally{await ctx.close();}
  }
  for(const mode of ['modern','legacy','real']){
    const {ctx,page}=await open(mode);
    try{
      await page.locator('#copybtn').click();await page.waitForFunction(()=>document.getElementById('copybtn').textContent==='Copied snapshot');
      assert.equal(mode==='real'?await page.evaluate(()=>navigator.clipboard.readText()):await page.evaluate(mode=>window.copyFixture[mode==='modern'?'modern':'legacy'].at(-1),mode),expected);
      assert.equal(await page.locator('#copybtn').evaluate(n=>n===document.activeElement),true);
      assert.equal(await page.locator('#sheet').isVisible(),false);
      assert.equal(await page.locator('#copybtn').isEnabled(),true);
      console.log('PASS confirmed clipboard receipt:',mode);
    }finally{await ctx.close();}
  }
  const delayed=await open('deferred');
  try{
    await delayed.page.locator('#copybtn').click();assert.equal(await delayed.page.locator('#copybtn').isDisabled(),true);
    await delayed.page.locator('#settingsbtn').click();await delayed.page.locator('#f_day').waitFor();
    await delayed.page.evaluate(()=>window.copyFixture.reject());
    await delayed.page.waitForFunction(()=>document.getElementById('copybtn').textContent==='Copy failed');
    assert.equal(await delayed.page.locator('#f_day').isVisible(),true);
    assert.equal(await delayed.page.evaluate(()=>window.copyFixture.legacy.length),0);
    console.log('PASS delayed failure preserves an open editor');
  }finally{await delayed.ctx.close();}
  for(const [width,height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]){
    const {ctx,page}=await open('reject',{width,height});
    try{
      for(const dark of [false,true]){
        if(dark)await page.locator('#themebtn').click();
        await page.locator('#copybtn').click();await page.locator('#copy-manual').waitFor();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true);
        if(process.env.AOM_COPY_SCREENSHOTS&&width===375&&!dark)await page.screenshot({path:process.env.AOM_COPY_SCREENSHOTS+'/copy-phone.png'});
        await page.locator('#f_cancel').scrollIntoViewIfNeeded();const b=await page.locator('#f_cancel').boundingBox();assert.ok(b.width>=44&&b.height>=44);
        await page.locator('#f_cancel').click();
      }
    }finally{await ctx.close();}
  }
  assert.deepEqual(errors,[]);console.log('PASS 12 recovery viewport/theme cases; no unexpected page errors; isolated contexts closed');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
