import { blank, validate, KEY, type LightingPlan } from '../../../av-lighting/model.mjs';
import { workspaceSchema, type Workspace, type PanelDef, type View } from '../../shared/av-console/layout';

export type Plan = LightingPlan & { workspace?: Workspace };
export const DRAFT_KEY = 'sbd.avLighting.draft.v1';
export const LAYOUT_KEY = 'sbd.avLighting.layout.v1';
export const LIBRARY: PanelDef[] = [
  { type: 'fixtures', name: 'Fixtures', group: 'Common', description: 'Search, select and add fixture records.', minW: 3, minH: 3, lit: true },
  { type: 'details', name: 'Fixture details', group: 'Common', description: 'Edit all patch, focus and status fields.', minW: 3, minH: 3 },
  { type: 'focus', name: 'Focus', group: 'Common', description: 'Review focus notes and set fixture status.', minW: 3, minH: 3 },
  { type: 'plan', name: 'Plan/Import', group: 'Utilities', description: 'Show metadata, Lighting Patch and PlotForge imports.', minW: 3, minH: 3 },
  { type: 'backup', name: 'Backup', group: 'Utilities', description: 'Explicit Save, export, restore and recovery.', minW: 3, minH: 3 },
];
export const DEFAULT_VIEWS: View[] = [
  { id: 'patch', name: 'Patch', panels: [
    { id: 'fixtures', type: 'fixtures', x: 0, y: 0, w: 5, h: 8 },
    { id: 'details', type: 'details', x: 5, y: 0, w: 7, h: 8 },
  ] },
  { id: 'focus', name: 'Focus', panels: [{ id: 'focus', type: 'focus', x: 0, y: 0, w: 12, h: 8 }] },
  { id: 'plan', name: 'Plan', panels: [
    { id: 'plan', type: 'plan', x: 0, y: 0, w: 6, h: 8 },
    { id: 'backup', type: 'backup', x: 6, y: 0, w: 6, h: 8 },
  ] },
];
export function parsePlan(value: unknown): Plan {
  const plan = validate(value);
  const workspace = (value as { workspace?: unknown }).workspace;
  return workspace === undefined ? plan : { ...plan, workspace: workspaceSchema.parse(workspace) };
}
export function loadPlan(storage: Pick<Storage, 'getItem'>) {
  let raw: string | null = null;
  try { raw = storage.getItem(KEY); return { raw, plan: raw === null ? blank() as Plan : parsePlan(JSON.parse(raw)), error: '' }; }
  catch { return { raw, plan: blank() as Plan, error: raw === null ? 'Browser storage is unavailable. Save and original backup are disabled until access returns.' : 'Saved plan could not be opened. Download its original bytes, then review a valid backup or explicitly start fresh.' }; }
}
export function savePlan(storage: Pick<Storage, 'getItem' | 'setItem'>, plan: Plan, baseline: string | null, preserveOriginal = false) {
  if (storage.getItem(KEY) !== baseline) throw Error('Saved plan changed in another tab. Export this work, then reload.');
  const raw = JSON.stringify(parsePlan(plan));
  if (preserveOriginal && baseline !== null) {
    const key = `${KEY}.recovery.${Date.now()}.${crypto.randomUUID()}`;
    storage.setItem(key, baseline);
    if (storage.getItem(key) !== baseline) throw Error('Could not preserve the unreadable original.');
  }
  storage.setItem(KEY, raw);
  if (storage.getItem(KEY) !== raw) throw Error('Save could not be verified. Keep this tab open and export your work.');
  return raw;
}
