import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./frozen-zone-nav.js', import.meta.url), 'utf8');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(source, sandbox);
const api = sandbox.module.exports;

test('zone menu keeps the workspace labels and highlights the open page', () => {
  assert.equal(Array.from(api.zones, zone => zone.label).join('|'), 'Home|Handoff|Planning|My Projector Rig|3D Stage View|Live controls|Pixel Strips|Presets|Log|Configuration|Throw Calc');
  assert.equal(api.zoneFromLocation({ pathname: '/', hash: '' }), 'home');
  assert.equal(api.zoneFromLocation({ pathname: '/handoff.html', hash: '' }), 'handoff');
  assert.equal(api.zoneFromLocation({ pathname: '/stage/', hash: '' }), 'stage');
  assert.equal(api.zoneFromLocation({ pathname: '/', hash: '#schedule' }), 'planning');
  assert.equal(api.zoneFromLocation({ pathname: '/', hash: '#notes' }), 'planning');
  assert.equal(api.zoneFromLocation({ pathname: '/', hash: '#rig/controls' }), 'controls');
  assert.equal(api.zoneFromLocation({ pathname: '/', hash: '#rig/D' }), 'rig');
  assert.equal(api.zoneFromLocation({ pathname: '/monitor/', hash: '' }), '');
  assert.equal(api.zoneFromLocation({ pathname: '/login.html', hash: '' }), '');
  assert.equal(api.zoneFromLocation({ pathname: '/', hash: '' }, { controllerTab: 'rig' }), 'controls');
  assert.equal(api.zoneFromLocation({ pathname: '/', hash: '' }, { controllerTab: 'setup' }), 'configuration');
  assert.equal(api.zoneFromLocation({ pathname: '/', hash: '' }, { controllerTab: 'info' }), 'rig');
  assert.equal(api.zoneFromLocation({ pathname: '/stage/', hash: '' }, { embedded: true }), '');
  assert.equal(api.hrefFor('handoff', {}), '/handoff.html');
  assert.equal(api.hrefFor('stage', { publicStage: true }), '/stage/');
  assert.equal(api.hrefFor('planning', {}), '/#schedule');
  assert.equal(api.hrefFor('controls', { projctl: true, controller: true }), '/#controls');
  assert.equal(api.hrefFor('pixels', { projctl: true, controller: true }), '/workspace/#pixels');
  assert.equal(api.hrefFor('handoff', { projctl: true }), '/workspace/handoff.html');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
});
