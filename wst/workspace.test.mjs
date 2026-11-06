import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('./workspace.js', import.meta.url), 'utf8');
function boot({ failStorage = false, initial = '' } = {}) {
  const elements = Object.fromEntries(['#notes', '#save-status', '#theme', '#export'].map(id => [id, { value: '', listeners: {}, addEventListener(event, fn) { this.listeners[event] = fn; }, setAttribute(name, value) { this[name] = value; } }]));
  const saved = new Map([['wst.frozen.personal-notes.v1', initial]]), links = [], listeners = {};
  const context = { document: { querySelector: id => elements[id], documentElement: { dataset: {} }, body: { append: link => links.push(link) }, createElement: () => ({ click() { this.clicked = true; }, remove() {} }) }, localStorage: { getItem(key) { if (failStorage) throw Error('blocked'); return saved.get(key); }, setItem(key, value) { if (failStorage) throw Error('quota'); saved.set(key, value); } }, Blob, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, setTimeout: fn => fn(), window: { addEventListener: (event, fn) => { listeners[event] = fn; } } };
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
test('theme preference toggles without touching personal notes', () => {
  const app = boot({ initial: 'Keep me' }); app.elements['#theme'].listeners.click();
  assert.equal(app.context.document.documentElement.dataset.theme, 'dark');
  assert.equal(app.saved.get('wst.frozen.personal-notes.v1'), 'Keep me');
});
