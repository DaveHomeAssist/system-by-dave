import { z } from 'zod';
import { workspaceSchema, sanitizeView, type PanelDef, type View } from '../../shared/av-console/layout';
import type { LayoutState } from '../../shared/av-console/drafts';

export const VIEWS_KEY = 'avCalculator.views.v1';
export const LAYOUT_KEY = 'avCalculator.layout.v1';
export const LIBRARY: PanelDef[] = [
  ['audioCard', 'Audio Delay', 'Distance, temperature, frames and samples.'],
  ['projectionCard', 'Projection', 'Screen dimensions and lens throw.'],
  ['storageCard', 'Record Storage', 'Bitrate, recording time and headroom.'],
  ['powerCard', 'Power Load', 'Nameplate current or explicit manufacturer power factor.'],
  ['voltageDropCard', 'Voltage Drop', 'Cable length and copper conductor estimate.'],
  ['splCard', 'SPL Distance', 'Free-field distance loss estimate.'],
  ['summaryCard', 'Operator Summary', 'Copy, export, reset and field verification warnings.'],
].map(([type, name, description]) => ({ type, name, description, group: 'Common', minW: 3, minH: 3 }));
export const CONTEXT: PanelDef = { type: 'showContextCard', name: 'Show context', description: 'Explicit show readiness and return navigation.', group: 'Utilities', minW: 3, minH: 3 };
const trio = (id: string, name: string, first: string, second: string): View => ({ id, name, panels: [
  { id: id + '-a', type: first, x: 0, y: 0, w: 6, h: 8 },
  { id: id + '-b', type: second, x: 6, y: 0, w: 6, h: 4 },
  { id: id + '-s', type: 'summaryCard', x: 6, y: 4, w: 6, h: 4 },
] });
export const DEFAULT_VIEWS: View[] = [trio('audio', 'Audio', 'audioCard', 'splCard'), trio('video', 'Video', 'projectionCard', 'storageCard'), trio('power', 'Power', 'powerCard', 'voltageDropCard'), { id: 'summary', name: 'Summary', panels: [{ id: 'summary-s', type: 'summaryCard', x: 0, y: 0, w: 12, h: 8 }] }];
const types = new Set([...LIBRARY, CONTEXT].map(p => p.type));
export function parseViews(value: unknown): View[] {
  const views = workspaceSchema.parse(value).views;
  if (!views.length || views.length > 40 || new Set(views.map(v => v.id)).size !== views.length) throw Error('Invalid view list.');
  for (const v of views) if (v.id.length > 100 || !v.name.trim() || v.name.length > 80 || v.panels.length > types.size || sanitizeView(v).panels.length !== v.panels.length || new Set(v.panels.map(p => p.type)).size !== v.panels.length || v.panels.some(p => !types.has(p.type))) throw Error('Invalid panel arrangement.');
  return views;
}
const liveShape = z.object({ v: z.literal(1), viewId: z.string(), locked: z.boolean(), live: z.record(z.string(), z.unknown()) }).strict();
export function parseLayout(value: unknown): LayoutState {
  const data = liveShape.parse(value);
  if (Object.keys(data.live).length > 40) throw Error('Too many arrangements.');
  const live: LayoutState['live'] = {};
  for (const [id, panels] of Object.entries(data.live)) live[id] = parseViews({ version: 1, views: [{ id, name: 'Layout', panels }] })[0].panels;
  return { viewId: data.viewId, locked: data.locked, live };
}
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export function load<T>(storage: Store, key: string, parse: (value: unknown) => T, fallback: T) {
  let raw: string | null = null;
  try { raw = storage.getItem(key); return { value: raw === null ? fallback : parse(JSON.parse(raw)), raw, error: '' }; }
  catch { return { value: fallback, raw, error: 'Saved workspace could not be read. It was preserved; use default views for this visit.' }; }
}
export function save(storage: Store, key: string, value: unknown, baseline: string | null): string {
  if (storage.getItem(key) !== baseline) throw Error('Workspace changed in another tab. Reload before storing views.');
  const raw = JSON.stringify(value); storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw Error('Workspace save could not be verified.');
  return raw;
}
