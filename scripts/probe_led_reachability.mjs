import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function firstPage(page){
  const previous=page.locator('.console-panel .led-native-pages button').first();
  for(let n=0;!await previous.isDisabled()&&n<80;n++)await previous.click();
}
async function reveal(page,target){
  await firstPage(page);
  const next=page.locator('.console-panel .led-native-pages button').last();
  for(let n=0;!await target.isVisible()&&n<80&&!await next.isDisabled();n++)await next.click();
  assert.equal(await target.isVisible(),true,'target is reachable through the panel pager');
}
async function inspectPages(page,label){
  await firstPage(page);
  const seen=new Set();
  for(let n=0;n<80;n++){
    await frames(page);
    const result=await page.evaluate(()=>{
      const leaf=document.querySelector('.console-panel .led-native-leaf'),box=leaf.getBoundingClientRect();
      const inside=e=>{const b=e.getBoundingClientRect();
        if(!b.height||b.top<box.top-1||b.bottom>box.bottom+1||b.left<box.left-1||b.right>box.right+1)return false;
        for(let parent=e.parentElement;parent&&parent!==leaf;parent=parent.parentElement){
          const style=getComputedStyle(parent),p=parent.getBoundingClientRect();
          if(/hidden|auto|scroll|clip/.test(style.overflowY)&&(b.top<p.top-1||b.bottom>p.bottom+1))return false;
        }return true;};
      const visible=[...leaf.querySelectorAll('input,select,button,summary,[data-web2-scroll]')].filter(e=>e.checkVisibility());
      const clipped=visible.filter(e=>!e.parentElement.closest('[data-web2-scroll]')&&!inside(e)).map(e=>e.id||e.textContent);
      return {clipped,ids:visible.filter(e=>!e.disabled).map(e=>e.id).filter(Boolean),root:document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth};
    });
    assert.deepEqual(result.clipped,[],`${label}: controls, readout bounds and pager fit`);
    assert.equal(result.root,true,`${label}: root fits`);
    result.ids.forEach(id=>seen.add(id));
    const next=page.locator('.console-panel .led-native-pages button').last();
    if(await next.isDisabled())return seen;
    await next.click();
  }
  throw Error(`${label}: pager did not terminate`);
}

export async function verifyLEDReachability(browser,base){
  let views=0;
  for(const type of ['profile','layout','data','power','results','tools']){
    const context=await browser.newContext({serviceWorkers:'block'});
    await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
    await context.addInitScript(type=>{
      localStorage.setItem('sbd.avSuite.intro.v1','true');
      localStorage.setItem('sbd.avSuite.workspace.v1',JSON.stringify({version:1,views:[{id:'led:reach',name:'LED reachability',panels:[{id:'reach',type:`led:${type}`,x:0,y:0,w:12,h:8}]}]}));
    },type);
    const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/av/?app=led');await page.locator('.console-panel .led-native-leaf').waitFor();
    for(const [width,height] of [[1440,900],[680,812],[375,812],[844,390],[320,256],[3840,1080]]){
      if(await page.evaluate(()=>Boolean(document.fullscreenElement)))await page.evaluate(()=>document.exitFullscreen());
      await page.setViewportSize({width,height});
      await frames(page);
      const expand=page.getByRole('button',{name:'Expand LED panel',exact:true});
      if(await expand.isVisible()){await expand.click();await frames(page);}
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>{document.documentElement.dataset.avTheme=theme},theme);
        await frames(page);
        if(type==='results'||type==='tools'){
          await page.locator('.console-panel details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
          await frames(page);
        }
        const seen=await inspectPages(page,`${type} ${width}x${height} ${theme}`);views++;
        if(type==='tools')for(const id of ['resetBtn','saveLedPresetBtn','copyLedSummaryBtn','downloadLedSummaryBtn','ledInspectRow','ledInspectColumn'])assert.ok(seen.has(id),`${id} reachable`);
        if(type==='results'){
          await reveal(page,page.getByText('Power / Viewing / Assumptions',{exact:true}));
          for(const id of ['sendLedTypicalPowerBtn','sendLedMaxPowerBtn']){
            const button=page.locator('.console-panel #'+id);await button.scrollIntoViewIfNeeded();await button.click({trial:true});
            await button.hover();
            await page.waitForFunction(id=>{
              const style=getComputedStyle(document.getElementById(id));
              const luminance=color=>{
                const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;});
                return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
              };
              const a=luminance(style.color),b=luminance(style.backgroundColor);
              return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5;
            },id,{timeout:1000});
          }
        }
        if(type==='layout'){
          for(const [mode,field] of [['targetSize','ledTargetHeightFt'],['targetRaster','ledTargetHeightPx'],['custom','ledCabinetsHigh'],['layout','ledCabinetsWide']]){
            const select=page.locator('.console-panel #ledMode');await reveal(page,select);await select.selectOption(mode);await frames(page);
            const reachable=await inspectPages(page,`${mode} ${width} ${theme}`);assert.ok(reachable.has(field),`${mode}: active fields reachable`);
          }
        }
        if(process.env.LED_NATIVE_EVIDENCE&&['results','tools'].includes(type)&&theme==='light'&&[375,844,320].includes(width)){
          await mkdir(process.env.LED_NATIVE_EVIDENCE,{recursive:true});await page.screenshot({path:`${process.env.LED_NATIVE_EVIDENCE}/${type}-${width}-reachable.png`});
        }
      }
    }
    assert.deepEqual(errors,[]);await context.close();console.log(`LED ${type}: all sizes, palettes and active fields reachable.`);
  }
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block'});
  await context.addInitScript(()=>{localStorage.setItem('sbd.avSuite.intro.v1','true');localStorage.setItem('sbd.avSuite.workspace.v1',JSON.stringify({version:1,views:[{id:'led:selection',name:'LED selection',panels:[{id:'preview',type:'led:preview',x:0,y:0,w:12,h:8}]}]}));});
  const page=await context.newPage();page.setDefaultTimeout(10000);await page.goto(base+'/av/?app=led');await page.locator('#ledWallPreview canvas').waitFor();
  // Exercise the real viewer event contract without producing physical output.
  await page.locator('#ledWallPreview').evaluate(node=>node.dispatchEvent(new CustomEvent('led-wall:select',{detail:{row:2,column:3}})));
  const report=page.locator('.console-panel #ledCabinetInspection');await report.waitFor();await report.scrollIntoViewIfNeeded();
  assert.match(await report.textContent(),/R2 C3/);await inspectPages(page,'selection handoff');
  await context.close();
  await verifyLEDMixed(browser,base);
  console.log(`LED reachability: ${views} panel/size/theme views, four planning modes, cabinet selection and mixed-panel save/reload passed.`);
}

export async function verifyLEDMixed(browser,base){
  const mixed=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  await mixed.addInitScript(()=>{
    localStorage.setItem('sbd.avSuite.intro.v1','true');
    localStorage.setItem('sbd.avSuite.workspace.v1',JSON.stringify({version:1,views:[{id:'led:mixed',name:'Mixed planning',panels:[{id:'led',type:'led:layout',x:0,y:0,w:6,h:8},{id:'delay',type:'calculator:audioCard',x:6,y:0,w:6,h:8}]}]}));
  });
  const mixedPage=await mixed.newPage();await mixedPage.goto(base+'/av/?app=led');
  await mixedPage.locator('.console-panel #ledCabinetsWide').waitFor();await mixedPage.locator('.console-panel #delayDistance').waitFor();
  for(const [led,delay] of [[9,123],[10,456]]){
    await mixedPage.locator('.console-panel #ledCabinetsWide').fill(String(led));
    await mixedPage.locator('.console-panel #ledCabinetsWide').dispatchEvent('change');
    await mixedPage.locator('.console-panel #delayDistance').fill(String(delay));
    await mixedPage.locator('.console-panel #delayDistance').dispatchEvent('change');
    const stored=await mixedPage.evaluate(()=>JSON.parse(localStorage.getItem('avCalculator.v1')));
    assert.equal(stored.ledCabinetsWide,led);assert.equal(stored.delayDistance,delay);
  }
  await mixedPage.reload();await mixedPage.locator('.console-panel #ledCabinetsWide').waitFor();
  assert.equal(await mixedPage.locator('.console-panel #ledCabinetsWide').inputValue(),'10');
  assert.equal(await mixedPage.locator('.console-panel #delayDistance').inputValue(),'456');
  await mixedPage.setViewportSize({width:320,height:256});
  const expand=mixedPage.getByRole('button',{name:'Expand LED panel',exact:true});await expand.waitFor();
  await mixedPage.evaluate(()=>{HTMLElement.prototype.requestFullscreen=()=>Promise.reject(Error('Fixture fullscreen denied'));});
  await expand.click();await mixedPage.getByRole('button',{name:'Retry full screen',exact:true}).waitFor();
  assert.equal(await mixedPage.getByRole('link',{name:'Open standalone',exact:true}).getAttribute('href'),'/led-wall-calculator.html');
  assert.equal(await mixedPage.evaluate(()=>JSON.parse(localStorage.getItem('avCalculator.v1')).ledCabinetsWide),10);
  await mixed.close();
  console.log('LED mixed panel alternating save and reload passed.');
}
