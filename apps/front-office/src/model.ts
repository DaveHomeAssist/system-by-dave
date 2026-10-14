import { emptyDocument, validateDocument, KEY, type OfficeDocument } from '../../../front-office/model.mjs';
import { workspaceSchema, type Workspace, type PanelDef, type View } from '../../shared/av-console/layout';

export type Plan = OfficeDocument & { workspace?: Workspace };
export const DRAFT_KEY = 'sbd.frontOffice.draft.v1';
export const LAYOUT_KEY = 'sbd.frontOffice.layout.v1';
export const LIBRARY: PanelDef[] = [
  { type: 'jobs', name: 'Jobs', group: 'Common', description: 'Create jobs and review stages and next actions.', minW: 3, minH: 3, lit: true },
  { type: 'clients', name: 'Clients', group: 'Common', description: 'Client identity, contact and notes.', minW: 3, minH: 3 },
  { type: 'venues', name: 'Venues', group: 'Common', description: 'Venue identity, location and notes.', minW: 3, minH: 3 },
  { type: 'updates', name: 'Job updates', group: 'Common', description: 'Set a stage, next action and dated update.', minW: 3, minH: 3 },
  { type: 'document', name: 'Document', group: 'Utilities', description: 'Save, export, restore and Show Advance imports with explicit identity binding.', minW: 3, minH: 3 },
];
export const DEFAULT_VIEWS: View[] = [
  { id: 'desk', name: 'Desk', panels: [
    { id: 'jobs', type: 'jobs', x: 0, y: 0, w: 4, h: 8 },
    { id: 'clients', type: 'clients', x: 4, y: 0, w: 4, h: 8 },
    { id: 'venues', type: 'venues', x: 8, y: 0, w: 4, h: 8 },
  ] },
  { id: 'job', name: 'Job', panels: [
    { id: 'updates', type: 'updates', x: 0, y: 0, w: 6, h: 8 },
    { id: 'document', type: 'document', x: 6, y: 0, w: 6, h: 8 },
  ] },
];
export function parsePlan(value: unknown): Plan {
  const doc = validateDocument(value);
  return doc.workspace === undefined ? doc as Plan : { ...doc, workspace: workspaceSchema.parse(doc.workspace) };
}
export function loadPlan(storage: Pick<Storage, 'getItem'>) {
  let raw: string | null = null;
  try { raw = storage.getItem(KEY); return { raw, plan: raw === null ? emptyDocument() as Plan : parsePlan(JSON.parse(raw)), error: '' }; }
  catch { return { raw, plan: emptyDocument() as Plan, error: raw === null ? 'Browser storage is unavailable. Export work before leaving; Save is disabled.' : 'Saved document could not be opened. Download its original bytes, then review a valid Front Office backup or explicitly start fresh.' }; }
}
export function savePlan(storage: Pick<Storage, 'getItem' | 'setItem'>, doc: Plan, baseline: string | null, preserveOriginal = false) {
  if (storage.getItem(KEY) !== baseline) throw Error('Saved document changed in another tab. Export this work, then reload.');
  const raw = JSON.stringify(parsePlan(doc));
  if (preserveOriginal && baseline !== null) {
    const key = `sbd.frontOffice.recovery.${crypto.randomUUID()}`;
    storage.setItem(key, baseline);
    if (storage.getItem(key) !== baseline) throw Error('Could not preserve the unreadable original.');
  }
  storage.setItem(KEY, raw);
  if (storage.getItem(KEY) !== raw) throw Error('Save could not be verified. Keep this tab open and export your work.');
  return raw;
}
