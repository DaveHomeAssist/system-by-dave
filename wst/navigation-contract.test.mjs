// The published HTML is adapted after each page's own build step.
import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptPage} from './hosting/scripts/apply-navigation.mjs';
import {destinations,header} from './hosting/navigation/model.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const source=read('./index.html');
const published=adaptPage('/',source);
const nav=html=>[...html.matchAll(/<a href="([^"]+)" data-nav-key="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(([,href,id,label])=>({id,label,href}));

test('every published page gets the same ordered menu and one current location',()=>{
  const samples=[['/',source],['/handoff.html',read('./handoff.html')],['/run-review/','<html><head></head><body><header class="top"><h1>Run review</h1></header></body></html>'],['/stage/index.html',read('./stage/index.html')],['/scenic/','<html><head></head><body>Scenic</body></html>']];
  for(const [route,html] of samples){
    const result=adaptPage(route,html);
    assert.deepEqual(nav(result),destinations,route+' canonical labels and destinations');
    assert.equal((result.match(/data-wst-header/g)||[]).length,1,route+' one header');
    assert.equal((result.match(/aria-current="page"/g)||[]).length,1,route+' one current location');
    assert.deepEqual(nav(adaptPage(route,result)),destinations,route+' repeat build keeps one menu');
  }
});

test('canonical labels and destinations have no collisions',()=>{
  for(const field of ['id','label','href'])assert.equal(new Set(destinations.map(item=>item[field])).size,destinations.length,field+' is unique');
  assert.equal(destinations.length,12);
  assert(!published.includes('class="workspace-navigation"'));
  assert(!published.includes('class="planning-views"'));
  assert(!published.includes('class="show-pages"'));
});

test('every in-workspace destination opens an existing router view',()=>{
  const table=read('./workspace.js').match(/const ROUTES=\{([\s\S]*?)\};/);
  assert.ok(table,'workspace route table');
  const served=new Set([...table[1].matchAll(/(?:^|,)(\w+):\{/g)].map(match=>match[1]));
  for(const {id,href} of destinations)if(href.startsWith('/#'))assert(served.has(id),id+' exists in the router');
  assert(destinations.some(item=>item.href==='/run-review/'));
  assert(destinations.some(item=>item.href==='/scenic/'));
});

test('controller tools remain present and initially hidden on the public workspace',()=>{
  const shared=header({root:true});
  assert.match(shared,/<details id="nav-more"[^>]*data-controller-only hidden>/);
  for(const route of ['rig','presets','log','configuration'])assert.match(shared,new RegExp('data-route="'+route+'"'));
});

test('the local Projctl source copy stays in sync with the canonical workspace inputs',()=>{
  for(const file of ['index.html','snow-splash.css','snow-splash.js','workspace.css','workspace.js','workspace-offline.js'])assert.equal(read('../apps/projctl/public/workspace/'+file),read('./'+file),file+' source parity; run node wst/embed-hosted-assets.mjs');
});
