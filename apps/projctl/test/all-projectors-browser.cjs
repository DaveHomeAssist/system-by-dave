const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const { startRelay, until } = await import('./relay-helper.js');
  const relay = await startRelay();
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  try {
    for (const [i,slot] of ['P1','P2','P3','P4'].entries()) await relay.api('projector',{slot,lane:'ABCD'[i],model:['PT-DW830U','PT-RZ970','Barco UDM 4K22','PT-DW830U'][i],inputs:i===2?{'L1 HDMI':'L1 HDMI',DP:'DisplayPort'}:{'31':'DVI-D','32':'HDMI'}});
    await relay.api('command',{slot:'all',cmd:'power',arg:1});
    await until(async()=>(await relay.state()).projectors.every(p=>p.status.power==='on'));
    const page=await browser.newPage({viewport:{width:1440,height:900}}), calls=[], errors=[];
    page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/command'))calls.push(r.postDataJSON());});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(relay.base);
    await page.locator('#tab-btn-all').click();
    await page.locator('#tab-all.on').waitFor();
    assert.equal(await page.locator('.pj-rig-all').count(),0,'group actions are not in a disclosure');
    for(const [command,arg] of [['shutter','0'],['shutter','1'],['power','1'],['pattern','08'],['pattern','00'],['resetInput',null]]) {
      const button=page.locator(`[data-all="${command}"]${arg===null?'':`[data-arg="${arg}"]`}`);
      const before=calls.length;
      await button.click(); await page.locator('#all-confirm[open]').waitFor();
      assert.equal(calls.length,before,'opening a review sends no command');
      assert.equal(await page.locator('#all-confirm-targets li').count(),4);
      if(command==='shutter'&&arg==='1') await page.keyboard.press('Escape'); else await page.locator('#all-confirm-cancel').click();
      assert.equal(calls.length,before,'Cancel sends no command');
      await button.click(); await page.locator('#all-confirm-send').click();
      await page.locator('#all-confirm').waitFor({state:'hidden'});
      assert.ok(calls.length>before,'only confirmation sends commands');
    }
    assert.ok((await relay.state()).projectors.every(p=>p.status.input===(p.slot==='P3'?'L1 HDMI':'32')&&p.status.pattern==='00'),'group reset clears patterns and selects HDMI: '+await page.locator('#all-results').innerText());
    const shutter=page.locator('[data-all="shutter"][data-arg="0"]');
    await shutter.click(); const count=calls.length;
    await relay.api('projector',{slot:'P1',model:'Changed review target'});
    await page.locator('#all-targets').filter({hasText:'Changed review target'}).waitFor();
    await page.locator('#all-confirm-send').click();
    await page.locator('#all-confirm-note').filter({hasText:'changed'}).waitFor();
    assert.equal(calls.length,count,'changed target requires a fresh review');
    await page.locator('#all-confirm-cancel').click();
    await relay.api('command',{slot:'all',cmd:'power',arg:1});
    await until(async()=>(await relay.state()).projectors.every(p=>p.status.power==='on'));
    await until(async()=>(await page.locator('#all-targets li span').allTextContents()).every(text=>text.startsWith('on')));
    await page.locator('[data-all="pattern"][data-arg="08"]').click();
    const lockedCount=calls.length;
    await relay.api('lock',{lock:true});
    await until(async()=>await page.locator('#show-lock').getAttribute('aria-pressed')==='true');
    await page.locator('#all-confirm-send').click();
    await until(()=>page.locator('#all-confirm-send').isDisabled());
    assert.equal(calls.length,lockedCount,'a new show lock prevents the group command');
    await page.locator('#all-confirm-cancel').click();
    await relay.api('lock',{lock:false});
    await until(async()=>!await page.locator('[data-all="power"][data-arg="0"]').isDisabled());
    const off=page.locator('[data-all="power"][data-arg="0"]');
    await off.click(); const powerCount=calls.length;
    await page.locator('#all-confirm-send').click();
    await page.locator('#all-confirm-send').filter({hasText:'Confirm power off'}).waitFor();
    assert.equal(calls.length,powerCount+1);
    assert.ok((await relay.state()).projectors.every(p=>p.status.power==='on'),'server preflight does not power off');
    await page.waitForTimeout(450);
    await page.locator('#all-confirm-send').click();
    await page.locator('#all-confirm').waitFor({state:'hidden'});
    await until(async()=>(await relay.state()).projectors.every(p=>p.status.power==='cooling'));
    const dir=process.env.EVIDENCE_DIR||'/tmp/projctl-all-evidence';fs.mkdirSync(dir,{recursive:true});
    for(const [width,height] of [[1440,900],[375,812],[930,1574],[320,256]]) {
      await page.setViewportSize({width,height});
      assert.equal(await page.locator('#tab-btn-all').isVisible(),true);
      assert.equal(await page.locator('#workspace-menu').getAttribute('aria-expanded'),'false');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight), JSON.stringify(await page.evaluate(()=>({width:innerWidth,height:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,boxes:['#app','.pj-header','#workspace-nav','.pj-main','#tab-all','#all-confirm','#toast','body','html'].map(sel=>{const e=document.querySelector(sel),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [sel,r.y,r.height,c.minHeight,c.gridTemplateRows,c.overflow,c.display,e.scrollHeight,r.bottom]}),wide:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().right>innerWidth).slice(0,8).map(e=>[e.tagName,e.id,e.className,e.getBoundingClientRect().right])}))));
      if(height>500)await page.screenshot({path:path.join(dir,`all-projectors-${width}.png`),animations:'disabled'});
    }
    assert.deepEqual(errors,[]);
    console.log('All Projectors tab: confirmation, cancellation, all actions, target changes, power-off protection and responsive layout passed');
  } finally { await browser.close();await relay.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
