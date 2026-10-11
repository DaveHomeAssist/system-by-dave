import { describe, expect, it } from 'vitest';
import { KEY, SOURCES, emptyPlan, stageLegacy, type SourceKind } from '../../../the-shop/model.mjs';
import { DEFAULT_VIEWS, DRAFT_KEY, filterItems, loadPlan, parsePlan, quantityLabel, retainWorkspace, savePlan } from './model';
import { createDraftSession, draftSnapshot } from '../../shared/av-console/drafts';

function storage() {
  const rows = new Map<string, string>();
  return { rows, getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, raw: string) => { rows.set(key, raw); }, removeItem: (key: string) => { rows.delete(key); } };
}
const fixture = () => ({ ...emptyPlan(), items: stageLegacy('gear-prep', { schema: SOURCES['gear-prep'].schema, items: [{ id: 'gear1', item: 'Camera kit', qty: '3', owner: 'Video', status: 'loaded', custom: { keep: true } }] }), workspace: { version: 1 as const, views: structuredClone(DEFAULT_VIEWS) } });

describe('Shop native workspace and persistence', () => {
  it('opens old v1 backups without fabricating quantities or workspace', () => {
    const old = { ...emptyPlan(), items: [{ id: 'old', title: 'Rack', phase: 'pack', status: 'ready' }] };
    const next = parsePlan(old); expect(next.workspace).toBeUndefined(); expect(next.items[0]).toMatchObject({ requestedQty: null, packedQty: null });
    expect(quantityLabel(next.items[0])).toContain('Requested unknown · Packed not counted');
  });
  it('round-trips all four source originals and stored views', () => {
    for (const kind of Object.keys(SOURCES) as SourceKind[]) {
      const original = { id: 'a', item: 'Case', qty: '3', nested: { keep: [1, 2] } };
      const source = { schema: SOURCES[kind].schema, items: [original] };
      const bytes = JSON.stringify(source); const plan = retainWorkspace(fixture(), { ...emptyPlan(), items: stageLegacy(kind, source) });
      const store = storage(); savePlan(store, plan, null);
      expect(loadPlan(store).plan).toEqual(plan); expect(plan.items[0].original).toEqual(original); expect(JSON.stringify(source)).toBe(bytes);
    }
  });
  it('filters phase, status, owner and blockers without changing the plan', () => {
    const plan = fixture(); plan.items[0].blocker = 'Missing power supply';
    expect(filterItems(plan.items, 'prep', 'ready', 'power')).toHaveLength(1);
    expect(filterItems(plan.items, 'prep', 'ready', 'video')).toHaveLength(1);
    expect(filterItems(plan.items, 'strike', 'all', '')).toHaveLength(0);
    expect(plan.items[0].status).toBe('ready'); expect(plan.items[0].packedQty).toBeNull();
  });
  it('retains zero and partial counts independently of status and blockers', () => {
    const plan = fixture(); const item = plan.items[0]; item.packedQty = 0; item.blocker = 'Review';
    const next = parsePlan(plan); expect(quantityLabel(next.items[0])).toContain('Packed 0 / 3 (partial)');
    expect(next.items[0]).toMatchObject({ status: 'ready', blocker: 'Review', requestedQty: 3, packedQty: 0 });
  });
  it('rejects unknown or malformed workspace metadata without touching saved bytes', () => {
    for (const workspace of [{ version: 2, views: [] }, { version: 1, views: [{ id: 'bad', name: 'Bad', panels: [{ id: 'a', type: 'worklist', x: 0, y: 0, w: -1, h: 1 }] }] }]) {
      const store = storage(); const raw = JSON.stringify({ ...fixture(), workspace }); store.setItem(KEY, raw);
      expect(loadPlan(store).error).toMatch(/could not be opened/); expect(() => parsePlan(JSON.parse(raw))).toThrow(); expect(store.getItem(KEY)).toBe(raw);
    }
  });
  it('refuses stale saves without changing the source or another tab', () => {
    const store = storage(); store.setItem(SOURCES['gear-prep'].key, 'legacy unchanged');
    const raw = savePlan(store, fixture(), null);
    expect(() => savePlan(store, emptyPlan(), null)).toThrow(/another tab/); expect(store.getItem(KEY)).toBe(raw); expect(store.getItem(SOURCES['gear-prep'].key)).toBe('legacy unchanged');
  });
  it('preserves exact damaged bytes before explicit recovery save', () => {
    const store = storage(); store.setItem(KEY, '{broken'); const raw = savePlan(store, fixture(), '{broken', true);
    expect(store.getItem(KEY)).toBe(raw); expect([...store.rows].filter(([key]) => key.startsWith('sbd.shop.recovery.')).map(([, value]) => value)).toEqual(['{broken']);
  });
  it('refuses recovery if preservation fails or cannot be verified', () => {
    for (const fail of ['throw', 'silent']) {
      const store = storage(); store.setItem(KEY, '{broken');
      const broken = { getItem: store.getItem, setItem: (key: string, raw: string) => { if (key.startsWith('sbd.shop.recovery.')) { if (fail === 'throw') throw Error('Quota'); return; } store.setItem(key, raw); } };
      expect(() => savePlan(broken, fixture(), '{broken', true)).toThrow(); expect(store.getItem(KEY)).toBe('{broken');
    }
  });
  it('reports unavailable storage and failed writes without pretending to save', () => {
    expect(loadPlan({ getItem: () => { throw Error('Blocked'); } }).error).toMatch(/unavailable/);
    const store = storage(); expect(() => savePlan({ getItem: store.getItem, setItem: () => {} }, fixture(), null)).toThrow(/verified/); expect(store.getItem(KEY)).toBeNull();
  });
  it('recovers workspace drafts without altering the saved plan or foreign draft', async () => {
    const store = storage(); const plan = fixture(); const lock = async <T,>(action: () => T) => action();
    const session = createDraftSession(store, DRAFT_KEY, 'shop', draftSnapshot(store, DRAFT_KEY, 'shop', parsePlan), lock);
    expect((await session.sync(plan, null, true, plan.name)).ok).toBe(true);
    expect(draftSnapshot(store, DRAFT_KEY, 'shop', parsePlan).draft?.doc).toEqual(plan); expect(store.getItem(KEY)).toBeNull();
    store.setItem(DRAFT_KEY, '{changed elsewhere'); expect((await session.sync(plan, null, true, plan.name)).error).toMatch(/another tab/); expect(store.getItem(DRAFT_KEY)).toBe('{changed elsewhere');
  });
});
