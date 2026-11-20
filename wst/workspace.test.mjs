import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptPage} from './hosting/scripts/apply-navigation.mjs';
const workspaceHtml=()=>adaptPage('/',readFileSync(new URL('./index.html',import.meta.url),'utf8'));
const source = readFileSync(new URL('./workspace.js', import.meta.url), 'utf8').split('const taskCacheKey =')[0].replace(/^import [^\n]*\n/, '');
function boot({ failStorage = false, initial = '' } = {}) {
  const elements = Object.fromEntries(['#notes', '#save-status', '#theme', '#export'].map(id => [id, { value: '', listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; }, setAttribute(name, value) { this[name] = value; } }]));
  const saved = new Map([['wst.frozen.personal-notes.v1', initial]]), links = [], listeners = {};
  const context = { location: { hostname: 'wst.housevideo.app' }, document: { querySelector: id => elements[id], documentElement: { dataset: {} }, body: { append: link => links.push(link) }, createElement: () => ({ click() { this.clicked = true; }, remove() {} }) }, localStorage: { getItem(key) { if (failStorage) throw Error('blocked'); return saved.get(key); }, setItem(key, value) { if (failStorage) throw Error('quota'); saved.set(key, value); } }, Blob, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, setTimeout: fn => fn(), window: { addEventListener: (event, fn) => { listeners[event] = fn; } } };
  vm.runInNewContext(source, context);
  return { elements, saved, links, listeners, context };
}
test('restores existing local notes and autosaves edits without a network API', () => {
  const app = boot({ initial: 'My private reminder' });
  assert.equal(app.elements['#notes'].value, 'My private reminder');
  app.elements['#notes'].value = 'Updated private note';
  app.elements['#notes'].listeners.input();
  assert.equal(app.saved.get('wst.frozen.personal-notes.v1'), 'Updated private note');
  assert.equal(boot({ initial: app.saved.get('wst.frozen.personal-notes.v1') }).elements['#notes'].value, 'Updated private note');
  assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/);
});
test('storage failure retains editor contents, explains recovery, and allows export', () => {
  const app = boot({ failStorage: true });
  app.elements['#notes'].value = 'Unsaved note'; app.elements['#notes'].listeners.input();
  assert.match(app.elements['#save-status'].textContent, /Could not save/);
  let prevented = false; app.listeners.beforeunload({ preventDefault() { prevented = true; } }); assert.equal(prevented, true);
  app.elements['#export'].listeners.click();
  assert.equal(app.links[0].clicked, true); assert.match(app.links[0].download, /^frozen-personal-notes-.*\.txt$/);
  assert.equal(app.elements['#notes'].value, 'Unsaved note');
});
test('snow splash stays same-origin and keeps the home routes', () => {
  const html = workspaceHtml();
  const splash = readFileSync(new URL('./snow-splash.js', import.meta.url), 'utf8');
  assert.match(html, /script-src 'self'/);
  assert.match(html, /style-src 'self'/);
  assert.match(html, /vendor\/gsap\.min\.js/);
  assert.match(html, /snow-splash\.css/);
  assert.match(html, /snow-splash\.js/);
  assert.match(html, /id="home-title"/);
  assert.match(html, /id="snow"[^>]*aria-hidden="true"/);
  for (const route of ['notes', 'rig', 'stage', 'throw', 'schedule', 'pixels']) assert.match(html, new RegExp('data-route="' + route + '"'));
  assert.match(html, /id="open-controller"[^>]*href="http:\/\/localhost:8080\/"/);
  assert.match(html, /id="connect-mac"/);
  assert.match(html, /id="relay-frame"[^>]*hidden/);
  assert.match(html, /connect-src [^;]*http:\/\/localhost:8080/);
  assert.match(html, /frame-src [^;]*http:\/\/localhost:8080/);
  assert.doesNotMatch(html, /<iframe[^>]*src="http/);
  assert.match(html, /id="documents-panel"/);
  assert.match(html, /id="nav-more"/);
  assert.match(html, /id="schedule-panel"/);
  assert.match(html, /id="pixel-reference"/);
  // Scripts, styles and images stay same-origin; the pixel reference may link out to manufacturer datasheets.
  assert.doesNotMatch(html, /<(?:script|img|iframe)[^>]*src="https?:|<link[^>]*rel="stylesheet"[^>]*href="https?:/);
  assert.doesNotMatch(html, /jsdelivr|<style|unsafe-inline|unsafe-eval/);
  assert.doesNotMatch(splash, /https?:\/\//);
  assert.match(readFileSync(new URL('./vendor/gsap.min.js', import.meta.url), 'utf8'), /3\.15\.0/);
});
test('Home has six public choices and every page uses the canonical navigation', () => {
  const html=workspaceHtml();
  const home=html.slice(html.indexOf('<div class="home-choices">'),html.indexOf('</div>',html.indexOf('<div class="home-choices">')));
  const choices=[...home.matchAll(/<(?:button|a)\b[^>]*>/g)].map(match=>match[0]).filter(tag=>!tag.includes('hidden'));
  assert.equal(choices.length,6);
  assert.match(home, /href="\/run-review\/"/);
  assert.match(home, /data-opening-at="2026-11-25T19:00:00-05:00"/);
  assert.match(html, /class="wst-nav" aria-label="Workspace"/);
  assert.doesNotMatch(html, /class="show-pages"|class="planning-views"|class="workspace-navigation"/);
  for(const route of ['home','handoff','schedule','review','rig','stage','pixels','notes','updates','documents','scenic','throw'])assert.match(html,new RegExp('data-nav-key="'+route+'"'));
  assert.doesNotMatch(html, /\sstyle="/);
});

test('shared theme events update the workspace without touching personal notes', () => {
  const app = boot({ initial: 'Keep me' }); app.listeners['frozen:themechange']({detail:{theme:'dark'}});
  assert.equal(app.context.document.documentElement.dataset.theme, 'dark');
  assert.equal(app.saved.get('wst.frozen.personal-notes.v1'), 'Keep me');
});

test('task editing keeps the crew passcode in session storage and reading stays public', () => {
  const html = workspaceHtml();
  const app = readFileSync(new URL('./workspace.js', import.meta.url), 'utf8');
  assert.match(html, /id="unlock-task-editing"/);
  assert.match(app, /sessionStorage\.setItem\(TASK_PASSCODE_KEY/);
  assert.match(app, /'X-Frozen-Task-Passcode':passcode/);
  assert.doesNotMatch(app, /localStorage\.(?:getItem|setItem)\(TASK_PASSCODE_KEY/);
  assert.match(app, /if \(data && \(response\.status === 401 \|\| response\.status === 403\)\)/);
  assert.match(app, /Editing is locked\./);
});

test('public controller entries start hidden and robots disallows crawling', () => {
  const html = workspaceHtml();
  const app = readFileSync(new URL('./workspace.js', import.meta.url), 'utf8');
  assert.match(html, /<details id="nav-more" class="wst-operator-nav" data-controller-only hidden>/);
  for(const route of ['presets','log','configuration'])assert.match(html,new RegExp('data-route="'+route+'"'));
  assert.match(app, /cfg\.control\?\.verified&&cfg\.control\.url/);
  assert.equal(readFileSync(new URL('./robots.txt', import.meta.url), 'utf8'), 'User-agent: *\nDisallow: /\n');
});
