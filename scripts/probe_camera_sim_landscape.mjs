// Landscape-phone release gate: actual picture size, bounded page, touch motion and reachable controls.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mime = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'};
const server = createServer(async (req,res) => {
  try {
    let file=join(root,decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(!file.startsWith(root+'/')) throw new Error('outside root');
    if((await stat(file)).isDirectory()) file=join(file,'index.html');
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(await readFile(file));
  } catch {res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,channel:process.env.CHROME_CHANNEL||'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.argv.includes('--no-sandbox')?['--no-sandbox']:[])]});
try {
  for(const viewport of [{width:844,height:390},{width:932,height:430}]) {
    for(const theme of ['light','dark']) {
      const context=await browser.newContext({viewport,hasTouch:true});
      await context.addInitScript(theme=>{localStorage.setItem('fmpCameraSim.onboarding.v1','done');localStorage.setItem('fmpTheme',theme);},theme);
      const page=await context.newPage();const problems=[];
      page.on('pageerror',e=>problems.push(e.message));
      page.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&/THREE\./.test(m.text())))problems.push(m.text());});
      await page.goto(`http://127.0.0.1:${server.address().port}/camera-sim/?diagnostics=1`);
      await page.waitForFunction(()=>window.__fmpCameraSim?.state().renderStatus==='ok');
      await page.waitForTimeout(700);
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      const measure=()=>page.evaluate(()=>{
        const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
        return {picture:rect('.monitor-frame'),pad:rect('.joystick-pad'),zoom:rect('.zoom-buttons'),controls:rect('.controls-panel'),overflow:document.documentElement.scrollWidth-innerWidth,height:document.documentElement.scrollHeight-innerHeight};
      });
      for(const spacing of ['', '0.08em']) {
        await page.evaluate(v=>{for(const el of document.querySelectorAll('.sim-app,.sim-app *'))el.style.letterSpacing=v;},spacing);
        const m=await measure();

        assert(m.picture.width>=300,`picture only ${m.picture.width}px at ${viewport.width}, spacing ${spacing}`);
        assert(m.picture.height>=168,`picture height ${m.picture.height}`);
        assert(m.pad.bottom<=viewport.height&&m.zoom.bottom<=viewport.height,'joystick/zoom below viewport');
        assert(m.overflow<=1&&m.height<=1,'page overflow');
      }
      await page.evaluate(()=>{for(const el of document.querySelectorAll('.sim-app,.sim-app *'))el.style.letterSpacing='';});
      const before=await page.evaluate(()=>window.__fmpCameraSim.snapshot().pose.pan);
      const pad=await page.locator('.joystick-pad').boundingBox();const x=pad.x+pad.width/2,y=pad.y+pad.height/2;
      const cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+50,y}]});
      await page.waitForTimeout(450);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const after=await page.evaluate(()=>window.__fmpCameraSim.snapshot().pose.pan);
      assert(Math.abs(after-before)>0.1,'touch did not move camera');
      await page.getByRole('button',{name:'Stop',exact:true}).click();
      await page.waitForFunction(()=>!window.__fmpCameraSim.snapshot().moving);
      await page.getByRole('button',{name:'Show venue view',exact:true}).click();
      assert(await page.getByRole('button',{name:'Hide venue view',exact:true}).isVisible());
      await page.getByRole('button',{name:'Hide venue view',exact:true}).click();
      const thirds=page.getByRole('button',{name:'Thirds',exact:true});
      const pressed=await thirds.getAttribute('aria-pressed');
      await thirds.click();
      assert.notEqual(await thirds.getAttribute('aria-pressed'),pressed);
      await page.locator('.controls-panel').evaluate(el=>el.scrollTop=0);
      await page.screenshot({path:`/tmp/camera-${viewport.width}-${theme}.png`});
      assert.equal(problems.length,0,problems.join('\n'));
      console.log(JSON.stringify({viewport,theme,...await measure(),touchPanDelta:after-before}));
      await context.close();
    }
  }
} finally {await browser.close();server.close();}
