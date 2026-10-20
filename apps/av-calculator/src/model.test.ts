import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEWS, LAYOUT_KEY, VIEWS_KEY, load, parseLayout, parseViews, save } from './model';
const store = () => { const data = new Map<string, string>(); return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } }; };
describe('Calculator workspace is separate from calculations', () => {
  it('validates defaults and sparse live arrangements', () => {
    expect(parseViews({ version: 1, views: DEFAULT_VIEWS })).toEqual(DEFAULT_VIEWS);
    expect(parseLayout({ v: 1, viewId: 'audio', locked: false, live: { audio: [] } }).live.audio).toEqual([]);
  });
  it('refuses unknown versions, duplicate controls, overlapping panels and invalid views', () => {
    for (const value of [{ version: 2, views: DEFAULT_VIEWS }, { version: 1, views: [] }, { version: 1, views: [DEFAULT_VIEWS[0], DEFAULT_VIEWS[0]] }, { version: 1, views: [{ ...DEFAULT_VIEWS[0], panels: [{ id: 'a', type: 'audioCard', x: 0, y: 0, w: 6, h: 8 }, { id: 'b', type: 'audioCard', x: 6, y: 0, w: 6, h: 8 }] }] }, { version: 1, views: [{ ...DEFAULT_VIEWS[0], panels: [{ id: 'a', type: 'audioCard', x: 12, y: 0, w: 1, h: 1 }] }] }]) expect(() => parseViews(value)).toThrow();
  });
  it('preserves unreadable views and read denial', () => {
    const s = store(); s.setItem(VIEWS_KEY, '{bad'); expect(load(s, VIEWS_KEY, parseViews, DEFAULT_VIEWS).error).toBeTruthy(); expect(s.getItem(VIEWS_KEY)).toBe('{bad');
    expect(load({ ...s, getItem: () => { throw Error('Denied'); } }, VIEWS_KEY, parseViews, DEFAULT_VIEWS).error).toBeTruthy();
  });
  it('saves only the selected workspace key and verifies readback', () => {
    const s = store(); s.setItem('avCalculator.v1', 'calculator and LED values'); s.setItem('avCalculator.fieldSets.v1', 'named sets');
    const raw = save(s, VIEWS_KEY, { version: 1, views: DEFAULT_VIEWS }, null); expect(s.getItem(VIEWS_KEY)).toBe(raw); expect(s.getItem('avCalculator.v1')).toBe('calculator and LED values'); expect(s.getItem('avCalculator.fieldSets.v1')).toBe('named sets'); expect(s.getItem(LAYOUT_KEY)).toBeNull();
    expect(() => save(s, VIEWS_KEY, {}, null)).toThrow(/another tab/);
    expect(() => save({ getItem: () => null, setItem: () => {} }, LAYOUT_KEY, {}, null)).toThrow(/verified/);
    expect(() => save({ ...s, setItem: () => { throw Error('Quota'); } }, LAYOUT_KEY, {}, null)).toThrow(/Quota/);
  });
});
