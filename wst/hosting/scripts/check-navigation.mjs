import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {destinations,opening} from '../navigation/model.mjs';

execFileSync('bash',['scripts/build.sh'],{stdio:'inherit'});
execFileSync('node',['scripts/validate-artifact.mjs'],{stdio:'inherit'});
execFileSync('node',['--test','navigation/navigation.test.mjs'],{stdio:'inherit'});
const {default:worker}=await import('../dist/server/index.js');
const read=async path=>{
  const response=await worker.fetch(new Request('https://wst.housevideo.app'+path),{});
  assert.equal(response.status,200,path);
  return response.text();
};
const pages=['/','/index.html','/handoff.html','/run-review/','/stage/index.html','/scenic/'];
for(const path of pages){
  const html=await read(path);
  assert.equal((html.match(/data-wst-header/g)||[]).length,1,path+' shared header count');
  const nav=html.match(/<nav class="wst-nav"[\s\S]*?<\/nav>/)?.[0];
  assert(nav,path+' navigation');
  assert.deepEqual([...nav.matchAll(/data-nav-key="([^"]+)"/g)].map(x=>x[1]),destinations.map(x=>x.id),path+' order');
  for(const [,script] of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)){
    if(html.includes('script-src '))assert(html.includes(createHash('sha256').update(script).digest('base64')),path+' inline CSP hash');
  }
}
const home=await read('/');
assert(home.includes('data-opening-at="'+opening.at+'"'));
assert(!home.includes('class="show-pages"'));
assert(!home.includes('class="workspace-navigation"'));
assert(!home.includes('class="planning-views"'));
for(const path of ['/workspace-navigation.js','/opening-night.js','/snow-splash.js'])new vm.Script(await read(path),{filename:path});
for(const path of ['/workspace-navigation.css','/frozen-theme.js','/frozen-theme.css','/vendor/gsap.min.js'])assert((await read(path)).length>100,path);
const review=await read('/run-review/');
assert(!review.includes("$('#theme-btn')"));
assert(review.includes('id="session-picker"'));
assert(review.includes('id="open-btn"'));
console.log('PASS canonical navigation on all 6 HTML routes, opening instant, browser syntax, Review controls and CSP.');
