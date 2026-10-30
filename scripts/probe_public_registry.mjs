#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {parse} from './public_registry_lib.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const data=parse(await readFile(resolve(root,'project-registry-public.js'),'utf8'));
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://fixture');const file=resolve(root,'.'+url.pathname);if(!file.startsWith(root+sep))return res.writeHead(403).end();try{const bytes=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'text/plain'}).end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${server.address().port}`;
let browser,views=0;
async function layout(p,label){
 const issues=await p.evaluate(()=>{const problems=[];const d=document.documentElement;if(d.scrollHeight>d.clientHeight||d.scrollWidth>d.clientWidth)problems.push('root overflow');
 for(const node of document.querySelectorAll('header a,header button,[role="tab"],h1,h2,main p,form label,input,select,form button,#panel-about a,.search')){if(!node.checkVisibility()||node.closest('[hidden]'))continue;const b=node.getBoundingClientRect();if(b.left<0||b.top<0||b.right>innerWidth+1||b.bottom>innerHeight+1)problems.push('outside '+(node.id||node.tagName));if(!node.matches('select,input')&&(node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1))problems.push('clipped '+(node.id||node.tagName));if(node.matches('a,button,input,select')&&(b.width<44||b.height<44))problems.push('small '+(node.id||node.tagName));}return problems;});assert.deepEqual(issues,[],label);views++;
}
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 const context=await browser.newContext({colorScheme:'dark',reducedMotion:'reduce'});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.route('https://**/*',route=>route.abort());
 await p.goto(base+'/project-registry.html');assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'light');assert.equal(await p.locator('#registry-rows tr').count(),data.projects.length);
 for(const [width,height] of [[1440,900],[680,900],[375,812],[844,390],[320,256],[3840,1080]]){
  await p.setViewportSize({width,height});for(const theme of ['light','dark']){if(await p.evaluate(()=>document.documentElement.dataset.theme)!==theme)await p.locator('.public-theme-toggle').click();
   for(const tab of ['directory','filters','about']){await p.locator('#tab-'+tab).click();await layout(p,`${width}x${height} ${theme} ${tab}`);if(tab==='directory'){const region=p.locator('.directory');await region.evaluate(el=>el.scrollTop=el.scrollHeight);await p.locator('#registry-rows tr:last-child a').scrollIntoViewIfNeeded();assert.equal(await p.locator('#registry-rows tr:last-child a').isVisible(),true);await region.evaluate(el=>el.scrollTop=0);}
    if(process.env.REGISTRY_SCREENSHOTS&&[375,3840].includes(width)&&theme==='dark'&&tab==='directory')await p.screenshot({path:`${process.env.REGISTRY_SCREENSHOTS}/registry-${width}.png`});
   }
  }
 }
 await p.locator('#tab-directory').click();await p.locator('#registry-search').fill('zzzz-no-fixture-match');assert.match(await p.locator('#registry-rows').textContent(),/No public repositories/);await layout(p,'empty results');await p.locator('#registry-search').fill('');
 await p.locator('#tab-filters').click();
 for(const state of ['active','archived','all']){await p.locator('#registry-status').selectOption(state);const expected=state==='all'?data.projects.length:data.projects.filter(x=>x.status===state).length;assert.equal(await p.locator('#registry-count').textContent(),expected+' of '+data.projects.length+' repositories');}
 const categories=[...new Set(data.projects.map(p=>p.category))];for(const category of categories){await p.locator('#registry-category').selectOption(category);assert.equal(await p.locator('#registry-rows tr').count(),data.projects.filter(p=>p.category===category).length);}await p.locator('#registry-category').selectOption('all');
 for(const mode of ['name','category','activity','updated']){await p.locator('#registry-sort').selectOption(mode);const expected=data.projects.slice().sort((a,b)=>{const first=mode==='name'?0:mode==='category'?a.category.localeCompare(b.category):mode==='activity'?b.recentCommits90d-a.recentCommits90d:(Date.parse(b.lastRemoteUpdate)||0)-(Date.parse(a.lastRemoteUpdate)||0);return first||a.name.localeCompare(b.name);});assert.deepEqual(await p.locator('#registry-rows a').allTextContents(),expected.map(x=>x.name));}
 await p.locator('#registry-status').selectOption('archived');await p.getByRole('button',{name:'Reset filters'}).click();await p.waitForFunction(n=>document.querySelectorAll('#registry-rows tr').length===n,data.projects.length);await p.locator('#show-results').click();assert.equal(await p.locator(':focus').getAttribute('class'),'directory');
 await p.locator('.directory').evaluate(el=>el.scrollTop=200);await p.reload();assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'dark');assert.ok(await p.locator('.directory').evaluate(el=>el.scrollTop)>0);
 await p.keyboard.press('Tab');assert.equal(await p.locator(':focus').getAttribute('class'),'skip');await p.keyboard.press('Enter');assert.equal(await p.locator(':focus').getAttribute('id'),'main-content');
 await p.locator('#tab-directory').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator(':focus').getAttribute('id'),'tab-filters');await p.keyboard.press('End');assert.equal(await p.locator(':focus').getAttribute('id'),'tab-about');await p.keyboard.press('Home');assert.equal(await p.locator(':focus').getAttribute('id'),'tab-directory');
 await p.emulateMedia({media:'print'});assert.equal(await p.locator('header').isVisible(),false);assert.equal(await p.locator('#panel-about').isVisible(),true);assert.equal(await p.locator('.directory').evaluate(el=>getComputedStyle(el).overflow),'visible');assert.deepEqual(errors,[]);await context.close();
 for(const javaScriptEnabled of [false,true]){const c=await browser.newContext({javaScriptEnabled,viewport:{width:375,height:812}});const page=await c.newPage();if(javaScriptEnabled){await page.route('**/project-registry-public.js',route=>route.abort());await page.addInitScript(()=>{Storage.prototype.setItem=Storage.prototype.getItem=function(){throw new DOMException('denied','SecurityError');};});}await page.goto(base+'/project-registry.html');assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');assert.equal(await page.locator('#registry-rows a').count(),data.projects.length);assert.match(await page.locator('#registry-generated').textContent(),/2026/);await layout(page,javaScriptEnabled?'data unavailable':'no JavaScript');await page.setViewportSize({width:320,height:256});await layout(page,'fallback short screen');assert.equal(await page.locator('#registry-tabs').isVisible(),false);await c.close();}
 console.log(`Public registry browser passed: ${views} views; all ${data.projects.length} static links; ${categories.length} categories; status/search/sort/reset; theme, storage, keyboard, print and no-script/data-failure fallback.`);
}finally{await browser?.close();await new Promise(done=>server.close(done));}
