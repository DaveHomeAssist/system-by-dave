import { describe, it, expect } from 'vitest';
import { blank, KEY, legacyPreview, mergeLegacy, counts, issueFor } from '../../../infrastructure/model.mjs';
import { DEFAULT_VIEWS, fieldValue, loadPlan, newRecord, parsePlan, savePlan, updateRecord, type Plan } from './model';

function memory(raw: string | null = null) {
  const values = new Map<string, string>(raw === null ? [] : [[KEY, raw]]);
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const original = { schema: 'system-by-dave.power-plan.v1', circuits: [{ id: 'p1', circuit: 'C1', capacity: '20', draw: '12', status: 'custom legacy state', notes: 'original', custom: { retain: true } }] };
const fixture = () => parsePlan(mergeLegacy(blank(), legacyPreview(original)));

describe('Infrastructure native compatibility', () => {
  it('old plans stay unchanged and optional workspace survives backup roundtrip', () => {
    const old = fixture(); const raw = JSON.stringify(old); const storage = memory(raw);
    expect(loadPlan(storage).plan).toEqual(old); expect(storage.getItem(KEY)).toBe(raw);
    expect(loadPlan(storage).plan.workspace).toBeUndefined();
    const next: Plan = { ...old, workspace: { version: 1, views: DEFAULT_VIEWS } };
    expect(parsePlan(JSON.parse(savePlan(storage, next, raw)))).toEqual(next);
    expect(next.records[0].sourceRecord).toEqual(original.circuits[0]);
  });
  it('unknown workspace versions reject without changing original bytes', () => {
    const raw = JSON.stringify({ ...fixture(), workspace: { version: 42, views: [] } }); const storage = memory(raw);
    expect(loadPlan(storage).error).toMatch(/could not be opened/); expect(storage.getItem(KEY)).toBe(raw);
    expect(() => parsePlan(JSON.parse(raw))).toThrow();
  });
  it('edits preserve legacy extras and distinguish blank overrides from zero', () => {
    const base = fixture();
    expect(fieldValue(base.records[0], 'draw')).toBe('12');
    const blankDraw = updateRecord(base, 0, 'draw', '');
    expect(fieldValue(blankDraw.records[0], 'draw')).toBe('');
    const zero = updateRecord(base, 0, 'draw', '0');
    expect(fieldValue(zero.records[0], 'draw')).toBe('0');
    expect(zero.records[0].sourceRecord).toEqual(original.circuits[0]);
    expect(base.records[0].draw).toBeUndefined();
    expect(zero.records[0].status).toBe('custom legacy state');
  });
  it('arbitrary nonblank statuses and duplicate legacy IDs remain usable', () => {
    const base = fixture(); base.records.push({ ...base.records[0], name: 'Second' });
    const next = updateRecord(base, 1, 'name', 'Edited second');
    expect(next.records[0].name).toBe('C1'); expect(next.records[1].name).toBe('Edited second');
    expect(() => updateRecord(base, 0, 'status', '')).toThrow();
    expect(() => updateRecord(base, 0, 'sourceRecord', 'overwrite')).toThrow();
  });
  it('issue and readiness remain independent and whitespace produces no false warning', () => {
    const row = { ...newRecord('network'), status: 'online', issue: '  Check port 8  ' };
    expect(counts([row])).toEqual({ total: 1, ready: 1, issues: 1 }); expect(issueFor(row)).toBe('Check port 8');
    expect(counts([{ ...row, issue: '   ' }]).issues).toBe(0);
    expect(issueFor({ ...row, status: 'issue', issue: '   ' })).toBe('Marked issue');
  });
  it('power warning uses existing model without changing operator status', () => {
    const plan = updateRecord(fixture(), 0, 'draw', '25');
    expect(issueFor(plan.records[0])).toMatch(/25 A exceeds 20 A/);
    expect(plan.records[0].status).toBe('custom legacy state');
  });
  it('all three legacy imports retain original objects and current workspace', () => {
    let plan: Plan = { ...blank(), workspace: { version: 1, views: DEFAULT_VIEWS } };
    const sources = [original, { schema: 'system-by-dave.network-plan.v1', devices: [{ device: 'Core', ip: '10.0.0.5', vlan: '40', status: 'issue', notes: 'Port down' }] }, { schema: 'system-by-dave.cable-plan.v1', items: [{ cable: 'Feed', source: 'FOH', destination: 'Stage', status: 'tested' }] }];
    for (const source of sources) plan = parsePlan(mergeLegacy(plan, legacyPreview(source)));
    expect(plan.legacySources).toEqual(sources); expect(plan.workspace?.views).toEqual(DEFAULT_VIEWS);
    expect(plan.records[1].issue).toBe('Port down'); expect(fieldValue(plan.records[2], 'source')).toBe('FOH');
  });
  it('refuses stale saves and leaves in-memory edits exportable', () => {
    const plan = fixture(); const raw = JSON.stringify(plan); const storage = memory(raw);
    const changed = updateRecord(plan, 0, 'name', 'Unsaved change'); storage.setItem(KEY, 'another tab');
    expect(() => savePlan(storage, changed, raw)).toThrow(/another tab/);
    expect(storage.getItem(KEY)).toBe('another tab'); expect(JSON.parse(JSON.stringify(changed)).records[0].name).toBe('Unsaved change');
  });
  it('preserves unreadable original before replacement, and refuses unverifiable recovery copy', () => {
    const raw = '{broken'; const storage = memory(raw); savePlan(storage, fixture(), raw, true);
    expect([...storage.values.entries()].find(([key]) => key.startsWith('sbd.infrastructure.recovery.'))?.[1]).toBe(raw);
    const refused = memory(raw);
    expect(() => savePlan({ getItem: refused.getItem, setItem: (key, value) => { if (key === KEY) refused.setItem(key, value); } }, fixture(), raw, true)).toThrow(/preserve/);
    expect(refused.getItem(KEY)).toBe(raw);
  });
  it('read denial and write denial stay explicit', () => {
    expect(loadPlan({ getItem: () => { throw Error('denied'); } }).error).toMatch(/unavailable/);
    const storage = memory();
    expect(() => savePlan({ getItem: storage.getItem, setItem: () => { throw Error('quota'); } }, fixture(), null)).toThrow(/quota/);
    expect(storage.getItem(KEY)).toBeNull();
  });
  it('invalid imports and record limits cannot mutate the current plan', () => {
    const plan = fixture(); const before = JSON.stringify(plan);
    expect(() => legacyPreview({ schema: 'unknown' })).toThrow();
    expect(() => parsePlan({ ...plan, records: [{ ...plan.records[0], issue: {} }] })).toThrow();
    expect(() => parsePlan({ ...plan, records: Array.from({ length: 2001 }, () => newRecord('cable')) })).toThrow();
    expect(JSON.stringify(plan)).toBe(before);
  });
});
