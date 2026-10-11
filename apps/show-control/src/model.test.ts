import { describe, expect, it } from 'vitest';
import { STORE, emptyRun, fromCueSheet, logEvent, cueForgeLists, fromCueForge } from '../../../show-control/model.mjs';
import { DEFAULT_VIEWS, loadRun, parseRun, retainWorkspace, saveRun } from './model';

const legacy = () => fromCueSheet(JSON.stringify({ title: 'Acceptance calling desk', rows: [
  { number: '001', action: 'Doors', owner: 'Caller', custom: { retained: true } },
  { number: '002', action: 'Walk on', owner: 'Stage manager' },
] }));
const storedRun = () => ({ ...legacy(), workspace: { version: 1 as const, views: structuredClone(DEFAULT_VIEWS) } });
function storage() {
  const rows = new Map<string, string>();
  return { rows, getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, raw: string) => { rows.set(key, raw); } };
}

describe('Show Control console compatibility', () => {
  it('opens prior v1 backups without adding a workspace or changing safe source rows', () => {
    const old = legacy(); expect(parseRun(old)).toEqual(old); expect(parseRun(old).workspace).toBeUndefined();
    expect(parseRun(old).cues[0].sourceRow.custom).toEqual({ retained: true });
  });
  it('round-trips workspace, selection, hold and events through explicit Save', () => {
    const store = storage();
    const run = retainWorkspace(storedRun(), logEvent(logEvent(storedRun(), 'Go', '2026-10-09T12:00:00Z'), 'Hold', '2026-10-09T12:01:00Z'));
    const raw = saveRun(store, run, null);
    expect(loadRun(store).run).toEqual(run); expect(parseRun(JSON.parse(raw)).workspace).toEqual(run.workspace);
    expect(run.current).toBe(1); expect(run.held).toBe(true); expect(run.events).toHaveLength(2);
    const resumed = retainWorkspace(run, logEvent(run, 'Resume'));
    expect(resumed.workspace).toEqual(run.workspace); expect(resumed.held).toBe(false);
  });
  it('keeps layouts when copying a new calling source, without changing that source', () => {
    const original = legacy(); const next = retainWorkspace(storedRun(), original);
    expect(next.workspace?.views).toEqual(DEFAULT_VIEWS); expect(original).not.toHaveProperty('workspace');
  });
  it('rejects malformed or unknown workspace versions and keeps stored bytes', () => {
    const store = storage();
    for (const workspace of [{ version: 2, views: [] }, { version: 1, views: [{ id: 'bad', name: 'Bad', panels: [{ id: 'p', type: 'deck', x: 0, y: 0, w: -1, h: 2 }] }] }]) {
      const raw = JSON.stringify({ ...legacy(), workspace }); store.setItem(STORE, raw);
      expect(loadRun(store)).toMatchObject({ raw, error: expect.stringMatching(/could not be opened/) });
      expect(() => parseRun(JSON.parse(raw))).toThrow(); expect(store.getItem(STORE)).toBe(raw);
    }
  });
  it('leaves stored plans and source tools unchanged on stale save and storage refusal', () => {
    const store = storage(); store.setItem('cueSheet.v1', 'Original source');
    const raw = saveRun(store, storedRun(), null);
    expect(() => saveRun(store, emptyRun(), null)).toThrow(/Another tab/);
    expect(store.getItem(STORE)).toBe(raw);
    expect(() => saveRun({ getItem: store.getItem, setItem: () => { throw Error('Quota exceeded'); } }, emptyRun(), raw)).toThrow(/Quota/);
    expect(store.getItem(STORE)).toBe(raw); expect(store.getItem('cueSheet.v1')).toBe('Original source');
  });
  it('retains only approved CueForge calling data with stored views', () => {
    const source = { version: 7, name: 'Safe source', modifiedAt: '2026-10-09', settings: { secret: 'do-not-copy' }, cueLists: [{ id: 'main', name: 'Main', cues: [{ id: 'a', number: '1', name: 'Start', type: 'audio', notes: 'Standby', properties: { path: 'private.wav' } }] }] };
    const run = retainWorkspace(storedRun(), fromCueForge(cueForgeLists(JSON.stringify(source)), 'main'));
    expect(parseRun(run)).toEqual(run); expect(JSON.stringify(run)).not.toMatch(/do-not-copy|private.wav/);
    expect(run.cues[0].sourceRow).toEqual({ id: 'a', number: '1', name: 'Start', type: 'audio', notes: 'Standby' });
  });
  it('reports unavailable storage rather than inferring an empty saved run', () => {
    expect(loadRun({ getItem: () => { throw Error('Blocked'); } })).toMatchObject({ raw: null, error: expect.stringMatching(/unavailable/) });
  });
});
