import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {destinations,header,opening,countdown,openingCard,adaptWorkspaceScript} from './model.mjs';
import {adaptPage} from '../scripts/apply-navigation.mjs';

test('one ordered model gives every page the same complete set of real destinations',()=>{
  assert.equal(new Set(destinations.map(item=>item.id)).size,destinations.length);
  for(const current of destinations.map(item=>item.id)){
    const html=header({current});
    const entries=[...html.matchAll(/data-nav-key="([^"]+)"/g)].map(x=>x[1]);
    assert.deepEqual(entries,destinations.map(item=>item.id));
    assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
    for(const item of destinations)assert(html.includes('href="'+item.href+'"'));
    assert(html.includes('Find a workspace page'));
    assert(html.includes('aria-label="Appearance"'));
  }
});

test('opening night uses the exact Eastern instant and never returns negative values',()=>{
  assert.equal(Date.parse(opening.at),Date.parse('2026-11-26T00:00:00Z'));
  assert.deepEqual(countdown(Date.parse(opening.at)-90061000),{remaining:90061,days:1,hours:1,minutes:1,seconds:1});
  assert.deepEqual(countdown(Date.parse(opening.at)),{remaining:0,days:0,hours:0,minutes:0,seconds:0});
  assert.equal(countdown(Date.parse(opening.at)+86400000).remaining,0);
  assert(openingCard().includes('<time datetime="2026-11-25T19:00:00-05:00"'));
  assert(openingCard().includes('aria-live="off"'));
});

test('page adapter keeps Review controls, rehashes inline scripts and restores all navigation',()=>{
  const inline="const btn = $('#theme-btn');\n    drawStrip();";
  const original=`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'sha256-old'; object-src 'none'"><script>${inline}</script></head><body><div id="shell"><header class="top"><h1>Review</h1><button id="open-btn">Open</button><button id="help-btn">Help</button><button type="button" id="theme-btn" class="btn icon"></button></header><main id="review">Retained capture content</main></div></body></html>`;
  const result=adaptPage('/run-review/',original);
  assert(result.includes('Retained capture content'));
  assert(result.includes('id="open-btn"'));
  assert(result.includes('id="help-btn"'));
  assert(result.includes('data-wst-header'));
  assert(result.includes("script-src 'self'"));
  for(const [,script] of result.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g))assert(result.includes(createHash('sha256').update(script).digest('base64')));
  assert(result.includes("object-src 'none'"));
});

test('standalone pages receive the canonical shell without losing page content',()=>{
  for(const route of ['/handoff.html','/stage/index.html','/scenic/']){
    const original='<!doctype html><html><head></head><body><header>Old header</header><main id="kept">Page controls</main></body></html>';
    const html=adaptPage(route,original);
    assert(html.includes('id="kept"'));
    assert(html.includes('Page controls'));
    for(const item of destinations)assert(html.includes('data-nav-key="'+item.id+'"'));
  }
});

test('root navigation retains native hrefs while binding compatible hash routes',()=>{
  const html=header({root:true});
  assert(html.includes('href="/#schedule" data-nav-key="schedule" data-route="schedule"'));
  assert(html.includes('href="/run-review/"'));
  assert(html.includes('id="show-lock"'));
  assert(html.includes('id="poll-age"'));
  assert.throws(()=>adaptWorkspaceScript('unexpected source'),/source changed/);
});
