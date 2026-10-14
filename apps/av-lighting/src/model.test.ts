import { describe, it, expect } from 'vitest';
import { blank, fixture, validate, fromPlotForge, conflicts, hasConflict, KEY, SCHEMA, MAX_MANIFEST_CHARS } from '../../../av-lighting/model.mjs';
import { DEFAULT_VIEWS, parsePlan, loadPlan, savePlan } from './model';

const manifest = { kind: 'plotforge-interop-manifest', schemaVersion: 1, generatedAt: '2026-10-12T12:00:00Z', show: { name: 'Synthetic plot', metadata: { venue: 'Hall' } }, positions: [], commentPins: [{ text: 'Retained' }], fixtures: [
  { id: 'p1', unitNumber: 1, profileName: 'Wash', positionName: 'FOH', mode: 'Standard', dmx: { universe: 2, address: 101 }, dmxFootprint: 39, channel: 42, dimmer: 'D12', color: 'R02', focus: { xMm: 100, yMm: -200 }, status: 'needs_work', notes: { crew: 'Inspect', designer: 'Unmapped' }, gdtf: { type: 'retained' } },
  { id: 'p2', dmx: { universe: 2, address: null }, status: 'future-status' },
] };
function storage(seed: string | null = null) { const data = new Map<string, string>(); if (seed !== null) data.set(KEY, seed); return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; }

describe('Lighting compatibility and save boundaries', () => {
  it('matches legacy normalization for all recognized fields and source IDs', () => {
    const input = { schema: 'system-by-dave.lighting-patch.v1', meta: { showName: 'Show', venue: 'V', lead: 'L' }, items: [{ id: 'f1', unit: '1', fixture: 'Wash', position: 'FOH', mode: 'M', universe: '001', address: '00101', channel: '42', dimmer: 'D', color: 'R02', focus: 'Deck', status: 'future', notes: 'n'.repeat(2100), sourceId: 'p1', extra: 'legacy discarded' }] };
    expect(validate(input).items[0]).toMatchObject({ id: 'f1', sourceId: 'p1', status: 'planned', universe: '001', address: '00101' });
    expect(validate(input).items[0].notes).toHaveLength(2000);
  });
  it('retains existing missing/duplicate ID repair and count limits', () => {
    const plan = validate({ items: [{ id: 'same' }, { id: 'same' }, {}] });
    expect(new Set(plan.items.map(row => row.id)).size).toBe(3);
    expect(plan.items[0].id).toBe('same');
    expect(() => validate({ items: Array.from({ length: 1001 }, () => ({})) })).toThrow(/1,000/);
    expect(() => validate({ schema: 'future', items: [] })).toThrow(/schema/);
    expect(() => validate({ items: [null] })).toThrow(/fixture/);
  });
  it('matches the prior PlotForge mapping and retains its entire source object', () => {
    const mapped = fromPlotForge(manifest);
    expect(mapped.needsWork).toBe(1); expect(mapped.unknownStatuses).toBe(1);
    expect(mapped.plan.items[0].focus).toBe('x 100 mm, y -200 mm');
    expect(mapped.plan.items[1].address).toBe('');
    mapped.plan.items[0].notes = 'Edited copy';
    expect(validate(mapped.plan).plotforgeSource).toEqual(manifest);
    expect(mapped.plan.items[0].sourceId).toBe('p1');
  });
  it('rejects unsupported, duplicate, excessive and malformed PlotForge sources', () => {
    for (const invalid of [{ ...manifest, schemaVersion: 2 }, { ...manifest, fixtures: [] }, { ...manifest, fixtures: [manifest.fixtures[0], manifest.fixtures[0]] }, { ...manifest, fixtures: [{ id: 'bad', dmx: { address: 0 } }] }, { ...manifest, fixtures: [{ id: 'bad', dmx: [] }] }, { ...manifest, generatedAt: null }, { ...manifest, padding: 'x'.repeat(MAX_MANIFEST_CHARS) }]) expect(() => fromPlotForge(invalid)).toThrow();
  });
  it('normalizes numeric duplicate starts, excludes spares and never infers footprint overlap', () => {
    const plan = { ...blank(), items: [fixture({ id: 'a', universe: '001', address: '00101' }), fixture({ id: 'b', universe: '1', address: '101' }), fixture({ id: 'c', universe: '1', address: '102' }), fixture({ id: 'd', universe: '1', address: '101', status: 'spare' })] };
    const map = conflicts(plan); expect(plan.items.map(row => hasConflict(row, map))).toEqual([true, true, false, false]);
  });
  it('keeps old plans unchanged and accepts only optional workspace version one', () => {
    expect(parsePlan(blank())).toEqual(blank());
    const plan = { ...blank(), workspace: { version: 1 as const, views: DEFAULT_VIEWS } };
    expect(parsePlan(plan)).toEqual(plan);
    expect(() => parsePlan({ ...plan, workspace: { version: 2, views: [] } })).toThrow();
  });
  it('does not cap valid stored documents at the import file limit', () => {
    const plan = { ...blank(), items: Array.from({ length: 1000 }, (_, i) => fixture({ id: 'f' + i, fixture: 'x'.repeat(500), notes: 'n'.repeat(2000) })) };
    expect(loadPlan(storage(JSON.stringify(plan))).plan.items).toHaveLength(1000);
  });
  it('saves with byte baseline and readback, retaining source and workspace', () => {
    const store = storage(); const plan = { ...fromPlotForge(manifest).plan, workspace: { version: 1 as const, views: DEFAULT_VIEWS } };
    const raw = savePlan(store, plan, null); expect(JSON.parse(raw)).toEqual(plan); expect(store.getItem(KEY)).toBe(raw);
    expect(() => savePlan(store, blank(), null)).toThrow(/another tab/); expect(store.getItem(KEY)).toBe(raw);
  });
  it('preserves and verifies unreadable original bytes before replacement', () => {
    const store = storage('{broken'); savePlan(store, blank(), '{broken', true);
    expect([...store.data.entries()].some(([key, value]) => key.startsWith(KEY + '.recovery.') && value === '{broken')).toBe(true);
    const refused = storage('{broken');
    expect(() => savePlan({ ...refused, setItem: () => {} }, blank(), '{broken', true)).toThrow(/preserve/);
    expect(refused.getItem(KEY)).toBe('{broken');
  });
  it('reports read denial and refused or unverified writes without inventing saved data', () => {
    expect(loadPlan({ getItem: () => { throw Error('Denied'); } }).error).toMatch(/unavailable/);
    expect(loadPlan(storage('{broken')).raw).toBe('{broken');
    const store = storage(); expect(() => savePlan({ ...store, setItem: () => { throw Error('Quota'); } }, blank(), null)).toThrow(/Quota/);
    expect(() => savePlan({ ...store, setItem: () => {} }, blank(), null)).toThrow(/verified/);
    expect(store.getItem(KEY)).toBeNull(); expect(blank().schema).toBe(SCHEMA);
  });
});
