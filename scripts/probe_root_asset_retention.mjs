import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { retainAssets } from './root_asset_retention.mjs';
const root=mkdtempSync(path.join(tmpdir(),'root-retention-browser-'));
const repo=path.join(root,'repo'),stage=path.join(root,'stage');mkdirSync(repo);mkdirSync(stage);
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
const put=(file,text)=>{mkdirSync(path.dirname(path.join(repo,file)),{recursive:true});writeFileSync(path.join(repo,file),text);};
const commit=()=>{git('add','.');git('commit','-qm','fixture');return git('rev-parse','HEAD');};
git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
put('noteforge/index.html','<!doctype html><title>Old page</title><button id="load">Load feature</button><p id="result">waiting</p><script type="module" src="./assets/entry-old.js"></script>');
put('noteforge/assets/entry-old.js',`document.getElementById('result').textContent='old ready';document.getElementById('load').onclick=async()=>{try{const m=await import('./lazy-old.js');document.getElementById('result').textContent=m.result}catch(e){document.getElementById('result').textContent='load failed'}};`);
put('noteforge/assets/lazy-old.js',`export const result='old feature loaded';`);
const previousSha=commit();const old=path.join(root,'old');cpSync(path.join(repo,'noteforge'),path.join(old,'noteforge'),{recursive:true});
rmSync(path.join(repo,'noteforge/assets'),{recursive:true});
put('noteforge/index.html','<!doctype html><title>New page</title><p id="result">waiting</p><script type="module" src="./assets/entry-new.js"></script>');
put('noteforge/assets/entry-new.js',`document.getElementById('result').textContent='new ready';`);const currentSha=commit();
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');const rel=url.pathname==='/noteforge/'?'noteforge/index.html':url.pathname.slice(1);
  if(!/^noteforge\/(?:index\.html|assets\/[\w.-]+\.js)$/.test(rel)){res.writeHead(404);res.end();return;}
  try{const bytes=readFileSync(path.join(stage,rel));res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':'text/html');res.setHeader('Cache-Control','no-store');res.end(bytes)}catch{res.writeHead(404);res.end();}
});
let browser;
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
  for(const retain of [false,true]){
    rmSync(path.join(stage,'noteforge'),{recursive:true,force:true});cpSync(path.join(old,'noteforge'),path.join(stage,'noteforge'),{recursive:true});
    const ctx=await browser.newContext();await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
    try{
      const page=await ctx.newPage();await page.goto(origin+'/noteforge/');await page.waitForFunction(()=>document.getElementById('result').textContent==='old ready');
      // The current root staging behavior replaces the entire published tree.
      rmSync(path.join(stage,'noteforge'),{recursive:true});cpSync(path.join(repo,'noteforge'),path.join(stage,'noteforge'),{recursive:true});
      if(retain)retainAssets({repo,stage,previousSha,currentSha});
      await page.locator('#load').click();await page.waitForFunction(()=>document.getElementById('result').textContent!=='old ready');
      assert.equal(await page.locator('#result').innerText(),retain?'old feature loaded':'load failed');
      const fresh=await ctx.newPage();await fresh.goto(origin+'/noteforge/');await fresh.waitForFunction(()=>document.getElementById('result').textContent==='new ready');
      assert.equal(await fresh.title(),'New page');
      console.log(retain?'PASS retained old lazy import and new-visit source':'BASELINE reproduced: open page loses lazy chunk after current-only staging');
    }finally{await ctx.close();}
  }
}finally{
  try{await browser?.close()}finally{
    if(server.listening)await new Promise(resolve=>server.close(resolve));
    rmSync(root,{recursive:true,force:true});
  }
}
