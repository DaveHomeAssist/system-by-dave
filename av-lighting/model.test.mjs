import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { validate, fromPlotForge } from './model.mjs';

// Compare the extracted pure model with the retained original editor functions.
const source = readFileSync(new URL('./lighting.js', import.meta.url), 'utf8');
const legacy = runInNewContext(source.slice(source.indexOf('  const KEY'), source.indexOf('  let plan')).replace(/  const \$ = .*\n/, '') + '\n({validate,fromPlotForge})', { crypto });
const plain = value => JSON.parse(JSON.stringify(value));
test('extracted Lighting normalization equals the original editor', () => {
  const input = { schema: 'system-by-dave.lighting-patch.v1', meta: { showName: 'Show', venue: 'Hall', lead: 'Lead' }, items: [{ id: 'f1', unit: '1', fixture: 'Wash', position: 'FOH', mode: 'M', universe: '001', address: '00101', channel: '42', dimmer: 'D', color: 'R02', focus: 'Deck', status: 'future', notes: 'n'.repeat(2100), sourceId: 'p1', extra: 'discarded by prior model' }] };
  assert.deepEqual(validate(input), plain(legacy.validate(input)));
});
test('extracted PlotForge mapping equals original and retains unmapped source', () => {
  const manifest = { kind: 'plotforge-interop-manifest', schemaVersion: 1, generatedAt: '2026-10-12T12:00:00Z', show: { name: 'Plot', metadata: { venue: 'Hall' } }, positions: [], commentPins: [{ text: 'Retained' }], fixtures: [{ id: 'p1', unitNumber: 1, profileName: 'Wash', positionName: 'FOH', mode: 'Standard', dmx: { universe: 2, address: 101 }, dmxFootprint: 39, channel: 42, dimmer: 'D12', color: 'R02', focus: { xMm: 100, yMm: -200 }, status: 'needs_work', notes: { crew: 'Inspect', designer: 'Unmapped' }, gdtf: { type: 'retained' } }, { id: 'p2', dmx: { universe: 2, address: null }, status: 'future' }] };
  assert.deepEqual(fromPlotForge(manifest), plain(legacy.fromPlotForge(manifest)));
  assert.deepEqual(fromPlotForge(manifest).plan.plotforgeSource, manifest);
});
