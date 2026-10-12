import { describe, it, expect } from 'vitest';
import { KEY, emptyDocument, addClient, addVenue, addJob, updateJob, appendShowAdvance, parseShowAdvance, ADVANCE_SCHEMA } from '../../../front-office/model.mjs';
import { DEFAULT_VIEWS, loadPlan, parsePlan, savePlan, type Plan } from './model';

function memory(raw: string | null = null) {
  const values = new Map<string, string>(raw === null ? [] : [[KEY, raw]]);
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function fixture() {
  let doc = addClient(emptyDocument(), 'Synthetic client', 'Contact', 'Client note');
  doc = addVenue(doc, 'Synthetic venue', 'Location', 'Venue note');
  return parsePlan(addJob(doc, 'Synthetic show', doc.clients[0].id, doc.venues[0].id, 'Confirm date'));
}
describe('Front Office native document boundary', () => {
  it('opens old v1 bytes without a migration or implicit workspace', () => {
    const raw = JSON.stringify(fixture(), null, 2), storage = memory(raw);
    expect(loadPlan(storage).error).toBe(''); expect(storage.getItem(KEY)).toBe(raw);
    expect(loadPlan(storage).plan.workspace).toBeUndefined();
  });
  it('roundtrips optional views and preserves unknown legacy fields', () => {
    const old = fixture(), storage = memory();
    const next: Plan = { ...old, retained: { original: true }, workspace: { version: 1, views: DEFAULT_VIEWS } };
    expect(parsePlan(JSON.parse(savePlan(storage, next, null)))).toEqual(next);
    const updated = parsePlan(updateJob(next, next.jobs[0].id, 'Show', 'Run', 'Go', '2026-10-12T18:00:00Z'));
    expect(updated.workspace).toEqual(next.workspace); expect(updated.retained).toEqual({ original: true });
  });
  it('rejects unknown or malformed workspace without replacing saved bytes', () => {
    for (const workspace of [{ version: 42, views: [] }, { version: 1, views: [{ id: '', panels: [] }] }]) {
      const raw = JSON.stringify({ ...fixture(), workspace }), storage = memory(raw);
      expect(loadPlan(storage).error).toMatch(/could not be opened/); expect(storage.getItem(KEY)).toBe(raw);
      expect(() => parsePlan(JSON.parse(raw))).toThrow();
    }
  });
  it('retains exact source bytes and explicit bindings through views, updates and backup', () => {
    const source = JSON.stringify({ schema: ADVANCE_SCHEMA, meta: { showName: 'Source', client: 'Different name', venue: '', showDate: '' }, items: [] }, null, 4);
    const old = fixture(); old.workspace = { version: 1, views: DEFAULT_VIEWS };
    const next = parsePlan(appendShowAdvance(old, parseShowAdvance(source), { clientId: old.clients[0].id, venueId: old.venues[0].id, jobName: 'Chosen job' }));
    const exported = parsePlan(JSON.parse(savePlan(memory(), next, null)));
    expect(exported.jobs[1].sourceAdvance?.raw).toBe(source); expect(exported.clients).toEqual(old.clients); expect(exported.venues).toEqual(old.venues);
    expect(exported.jobs[1].nextAction).toBe(''); expect(exported.workspace).toEqual(old.workspace);
  });
  it('refuses stale writes without modifying either document', () => {
    const doc = fixture(), raw = JSON.stringify(doc), storage = memory('newer tab');
    expect(() => savePlan(storage, doc, raw)).toThrow(/another tab/); expect(storage.getItem(KEY)).toBe('newer tab');
    expect(doc.jobs[0].name).toBe('Synthetic show');
  });
  it('preserves unreadable originals before recovery and refuses a failed preservation', () => {
    const raw = '{broken', storage = memory(raw); savePlan(storage, fixture(), raw, true);
    expect([...storage.values.entries()].find(([key]) => key.startsWith('sbd.frontOffice.recovery.'))?.[1]).toBe(raw);
    const refused = memory(raw);
    expect(() => savePlan({ getItem: refused.getItem, setItem: (key, value) => { if (key === KEY) refused.setItem(key, value); } }, fixture(), raw, true)).toThrow(/preserve/);
    expect(refused.getItem(KEY)).toBe(raw);
  });
  it('read denial, write denial and unverifiable writes remain explicit', () => {
    expect(loadPlan({ getItem: () => { throw Error('denied'); } }).error).toMatch(/unavailable/);
    const storage = memory();
    expect(() => savePlan({ getItem: storage.getItem, setItem: () => { throw Error('quota'); } }, fixture(), null)).toThrow(/quota/);
    expect(() => savePlan({ getItem: storage.getItem, setItem: () => {} }, fixture(), null)).toThrow(/verified/);
    expect(storage.getItem(KEY)).toBeNull();
  });
  it('invalid references and record limits cannot mutate the current document', () => {
    const doc = fixture(), before = JSON.stringify(doc);
    expect(() => parsePlan(addJob(doc, 'Broken', 'missing', doc.venues[0].id, ''))).toThrow(/reference/);
    expect(() => parsePlan({ ...doc, clients: Array.from({ length: 501 }, (_, i) => ({ id: `c${i}`, name: 'Client', contact: '', notes: '' })) })).toThrow(/excessive/);
    expect(JSON.stringify(doc)).toBe(before);
  });
  it('does not impose the import-file cap on valid legacy browser documents', () => {
    const doc: Plan = { ...emptyDocument(), clients: Array.from({ length: 500 }, (_, i) => ({ id: `c${i}`, name: 'Client', contact: 'x'.repeat(2000), notes: 'x'.repeat(2000) })) };
    const raw = JSON.stringify(doc); expect(raw.length).toBeGreaterThan(2_000_000);
    expect(loadPlan(memory(raw)).error).toBe(''); expect(savePlan(memory(raw), doc, raw)).toBe(raw);
  });
});
