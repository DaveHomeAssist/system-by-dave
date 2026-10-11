import { emptyPlan, validatePlan, KEY, type ShopPlan, type ShopItem } from '../../../the-shop/model.mjs';
import { workspaceSchema, type Workspace, type PanelDef, type View } from '../../shared/av-console/layout';

export type Plan = ShopPlan & { workspace?: Workspace };
export const DRAFT_KEY = 'sbd.shop.draft.v1';
export const LAYOUT_KEY = 'sbd.shop.layout.v1';
export const LIBRARY: PanelDef[] = [
  { type: 'worklist', name: 'Worklist', group: 'Common', description: 'Filter and select prep, pack, load in and strike work.', minW: 3, minH: 3, lit: true },
  { type: 'inspector', name: 'Item inspector', group: 'Common', description: 'Edit the selected item, quantities, ownership and blockers.', minW: 3, minH: 3 },
  { type: 'plan', name: 'Plan/Import', group: 'Utilities', description: 'Name this plan and review copies from four legacy tools.', minW: 3, minH: 3 },
  { type: 'backup', name: 'Backup', group: 'Utilities', description: 'Explicit Save, export, restore and damaged-save recovery.', minW: 3, minH: 3 },
];
export const DEFAULT_VIEWS: View[] = [
  { id: 'work', name: 'Work', panels: [
    { id: 'worklist', type: 'worklist', x: 0, y: 0, w: 5, h: 8 },
    { id: 'inspector', type: 'inspector', x: 5, y: 0, w: 7, h: 8 },
  ] },
  { id: 'manage', name: 'Manage', panels: [
    { id: 'plan', type: 'plan', x: 0, y: 0, w: 6, h: 8 },
    { id: 'backup', type: 'backup', x: 6, y: 0, w: 6, h: 8 },
  ] },
];
// Keep the pure logistics model unchanged; validate optional presentation data here.
export function parsePlan(value: unknown): Plan {
  const plan = validatePlan(value);
  const workspace = (value as { workspace?: unknown }).workspace;
  return workspace === undefined ? plan : { ...plan, workspace: workspaceSchema.parse(workspace) };
}
export function retainWorkspace(current: Plan, next: ShopPlan): Plan {
  return current.workspace ? { ...next, workspace: current.workspace } : next;
}
export function loadPlan(storage: Pick<Storage, 'getItem'>) {
  let raw: string | null = null;
  try { raw = storage.getItem(KEY); return { raw, plan: raw === null ? emptyPlan() : parsePlan(JSON.parse(raw)), error: '' }; }
  catch { return { raw, plan: emptyPlan(), error: raw === null ? 'Browser storage is unavailable. Export work before leaving; Save is disabled until storage is available.' : 'Saved plan could not be opened. Export its original bytes, then review a valid Shop backup before Save.' }; }
}
export function savePlan(storage: Pick<Storage, 'getItem' | 'setItem'>, plan: Plan, baseline: string | null, preserveOriginal = false) {
  if (storage.getItem(KEY) !== baseline) throw Error('Saved plan changed in another tab. Export this work, then reload.');
  const raw = JSON.stringify(parsePlan(plan));
  if (preserveOriginal && baseline !== null) {
    const recoveryKey = `sbd.shop.recovery.${crypto.randomUUID()}`;
    storage.setItem(recoveryKey, baseline);
    if (storage.getItem(recoveryKey) !== baseline) throw Error('Could not preserve the unreadable original.');
  }
  storage.setItem(KEY, raw);
  if (storage.getItem(KEY) !== raw) throw Error('Save could not be verified. Keep this tab open and export your work.');
  return raw;
}
export function quantityLabel(item: ShopItem) {
  return `Requested ${item.requestedQty ?? 'unknown'} · Packed ${item.packedQty ?? 'not counted'}${item.requestedQty !== null && item.packedQty !== null ? ` / ${item.requestedQty}${item.packedQty < item.requestedQty ? ' (partial)' : ''}` : ''}`;
}
export function filterItems(items: ShopItem[], phase: string, status: string, search: string) {
  const query = search.trim().toLowerCase();
  return items.filter(item => (phase === 'all' || item.phase === phase) && (status === 'all' || item.status === status) && (!query || [item.title, item.caseId, item.department, item.owner, item.location, item.destination, item.blocker].join(' ').toLowerCase().includes(query)));
}
