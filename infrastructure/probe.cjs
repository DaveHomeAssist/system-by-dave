const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = __dirname;
const server = http.createServer((req,res)=>{
  const name = path.basename(new URL(req.url,'http://localhost').pathname) || 'index.html';
  fs.readFile(path.join(root,name),(error,body)=>{
    res.writeHead(error?404:200,{'Content-Type':name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});
    res.end(error?'Missing':body);
  });
});
(async()=>{
  await new Promise(resolve=>server.listen(4178,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true});
  try {
    for(const viewport of [{width:1440,height:900},{width:375,height:812}]){
      const context=await browser.newContext({viewport});
      const a=await context.newPage();const b=await context.newPage();
      await Promise.all([a.goto('http://127.0.0.1:4178/'),b.goto('http://127.0.0.1:4178/')]);
      await a.getByRole('button',{name:'Add circuit'}).click();
      await a.locator('.record input').first().fill('Primary C1');
      await a.getByRole('button',{name:'Save changes'}).click();
      await a.getByText('Saved on this device.').waitFor();
      await b.getByRole('button',{name:'Add circuit'}).click();
      await b.locator('.record input').first().fill('Stale C2');
      await b.getByRole('button',{name:'Save changes'}).click();
      await b.getByText('Save is blocked.').waitFor();
      await a.reload();
      if(await a.locator('.record input').first().inputValue()!=='Primary C1')throw Error('stale tab overwrote saved plan');
      const malformed=Buffer.from(JSON.stringify({schema:'system-by-dave.infrastructure.v1',name:'bad',records:[{id:'x',type:'power',name:'bad',status:'',issue:{}}],legacySources:[]}));
      await a.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:malformed});
      await a.getByText('Import rejected:').waitFor();
      if(await a.locator('.record input').first().inputValue()!=='Primary C1')throw Error('malformed import changed plan');
      const oversized=Buffer.from(JSON.stringify({schema:'system-by-dave.infrastructure.v1',name:'oversized',records:Array.from({length:2001},(_,i)=>({id:`x${i}`,type:'power',name:'x',status:'planned'})),legacySources:[]}));
      await a.locator('#file').setInputFiles({name:'oversized.json',mimeType:'application/json',buffer:oversized});
      await a.getByText('Import rejected:').waitFor();
      if(await a.locator('.record input').first().inputValue()!=='Primary C1')throw Error('oversized import changed plan');
      const legacy=Buffer.from(JSON.stringify({schema:'system-by-dave.network-plan.v1',devices:[{id:'n1',device:'Core switch',status:'issue',notes:'Port down'}]}));
      await a.locator('#file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:legacy});
      await a.locator('#confirmImport').click();
      await a.getByRole('button',{name:'Network'}).click();
      if(await a.locator('.record input').first().inputValue()!=='Core switch')throw Error('legacy import failed');
      const overflow=await a.evaluate(()=>({h:document.documentElement.scrollHeight-document.documentElement.clientHeight,w:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
      if(overflow.h>0||overflow.w>0)throw Error(`overflow ${viewport.width}: ${JSON.stringify(overflow)}`);
      await a.screenshot({path:`/work/infrastructure-review-${viewport.width}.png`});
      console.log(`PASS ${viewport.width}x${viewport.height} stale save, malformed import, legacy import, overflow`);
      await context.close();
    }
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
