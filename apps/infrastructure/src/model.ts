import { blank, validPlan, KEY, type InfrastructurePlan, type RecordRow, type Kind } from '../../../infrastructure/model.mjs';
import { workspaceSchema, type Workspace, type PanelDef, type View } from '../../shared/av-console/layout';

export type Plan = InfrastructurePlan & { workspace?: Workspace };
export const DRAFT_KEY = 'sbd.infrastructure.draft.v1';
export const LAYOUT_KEY = 'sbd.infrastructure.layout.v1';
export const LIBRARY: PanelDef[] = [
  { type: 'power', name: 'Power', group: 'Common', description: 'Edit circuit, capacity and draw planning records.', minW: 3, minH: 3, lit: true },
  { type: 'network', name: 'Network', group: 'Common', description: 'Edit device, address and VLAN records.', minW: 3, minH: 3 },
  { type: 'cable', name: 'Cable', group: 'Common', description: 'Edit runs, endpoints and testing status.', minW: 3, minH: 3 },
  { type: 'issues', name: 'Issues', group: 'Common', description: 'Review issues and open their source records.', minW: 3, minH: 3 },
  { type: 'plan', name: 'Plan/Import', group: 'Utilities', description: 'Name the plan and review legacy JSON sources.', minW: 3, minH: 3 },
  { type: 'backup', name: 'Backup', group: 'Utilities', description: 'Explicit Save, export, restore and recovery.', minW: 3, minH: 3 },
];
export const DEFAULT_VIEWS: View[] = [
  { id: 'systems', name: 'Systems', panels: [
    { id: 'power', type: 'power', x: 0, y: 0, w: 4, h: 8 },
    { id: 'network', type: 'network', x: 4, y: 0, w: 4, h: 8 },
    { id: 'cable', type: 'cable', x: 8, y: 0, w: 4, h: 8 },
  ] },
  { id: 'review', name: 'Review', panels: [
    { id: 'issues', type: 'issues', x: 0, y: 0, w: 6, h: 8 },
    { id: 'plan', type: 'plan', x: 6, y: 0, w: 6, h: 8 },
  ] },
  { id: 'backup', name: 'Backup', panels: [{ id: 'backup', type: 'backup', x: 0, y: 0, w: 12, h: 8 }] },
];
export function parsePlan(value: unknown): Plan {
  const plan = validPlan(value);
  return plan.workspace === undefined ? plan as Plan : { ...plan, workspace: workspaceSchema.parse(plan.workspace) };
}
export function loadPlan(storage: Pick<Storage, 'getItem'>) {
  let raw: string | null = null;
  try { raw = storage.getItem(KEY); return { raw, plan: raw === null ? blank() as Plan : parsePlan(JSON.parse(raw)), error: '' }; }
  catch { return { raw, plan: blank() as Plan, error: raw === null ? 'Browser storage is unavailable. Export work before leaving; Save is disabled.' : 'Saved plan could not be opened. Download its original bytes, then review a valid Infrastructure backup before Save.' }; }
}
export function savePlan(storage: Pick<Storage, 'getItem' | 'setItem'>, plan: Plan, baseline: string | null, preserveOriginal = false) {
  if (storage.getItem(KEY) !== baseline) throw Error('Saved plan changed in another tab. Export this work, then reload.');
  const raw = JSON.stringify(parsePlan(plan));
  if (preserveOriginal && baseline !== null) {
    const key = `sbd.infrastructure.recovery.${crypto.randomUUID()}`;
    storage.setItem(key, baseline);
    if (storage.getItem(key) !== baseline) throw Error('Could not preserve the unreadable original.');
  }
  storage.setItem(KEY, raw);
  if (storage.getItem(KEY) !== raw) throw Error('Save could not be verified. Keep this tab open and export your work.');
  return raw;
}
export function newRecord(type: Kind): RecordRow {
  return { id: crypto.randomUUID(), type, name: '', location: '', status: 'planned', issue: '' };
}
// Empty is an explicit override; only absent values fall back to legacy originals.
export function fieldValue(row: RecordRow, field: string): string {
  return String(row[field] ?? row.sourceRecord?.[field] ?? '');
}
export function updateRecord(plan: Plan, index: number, field: string, value: string): Plan {
  if (!['name','location','status','issue','capacity','draw','ip','vlan','source','destination'].includes(field)) throw Error('Unsupported editable field');
  if (!plan.records[index]) throw Error('Record no longer exists');
  return parsePlan({ ...plan, records: plan.records.map((row, position) => position === index ? { ...row, [field]: value } : row) });
}
