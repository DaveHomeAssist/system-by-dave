import { emptyRun, validate, STORE, type Run } from '../../../show-control/model.mjs';
import { workspaceSchema, type Workspace, type PanelDef, type View } from '../../shared/av-console/layout';

export type CallingRun = Run & { workspace?: Workspace };
export const DRAFT_KEY = 'sbd.showControl.draft.v1';
export const LAYOUT_KEY = 'sbd.showControl.layout.v1';
export const LIBRARY: PanelDef[] = [
  { type: 'deck', name: 'On Deck', group: 'Common', description: 'Next cue and human Go, Hold and Resume calls.', minW: 3, minH: 3, lit: true },
  { type: 'cues', name: 'Cues', group: 'Common', description: 'Rundown and shared cue selection.', minW: 3, minH: 3 },
  { type: 'notes', name: 'Notes', group: 'Common', description: 'Operator notes saved with this run.', minW: 3, minH: 3 },
  { type: 'log', name: 'Call Log', group: 'Common', description: 'Time-stamped human calls, never hardware commands.', minW: 3, minH: 3 },
  { type: 'setup', name: 'Setup/Import', group: 'Utilities', description: 'Add cues or review a Cue Sheet or CueForge calling snapshot.', minW: 3, minH: 3 },
  { type: 'backup', name: 'Backup', group: 'Utilities', description: 'Export, restore and damaged-save recovery.', minW: 3, minH: 3 },
];
export const DEFAULT_VIEWS: View[] = [
  { id: 'calling', name: 'Calling', panels: [
    { id: 'deck', type: 'deck', x: 0, y: 0, w: 4, h: 8 },
    { id: 'cues', type: 'cues', x: 4, y: 0, w: 4, h: 8 },
    { id: 'log', type: 'log', x: 8, y: 0, w: 4, h: 8 },
  ] },
  { id: 'prepare', name: 'Prepare', panels: [
    { id: 'setup', type: 'setup', x: 0, y: 0, w: 4, h: 8 },
    { id: 'notes', type: 'notes', x: 4, y: 0, w: 4, h: 8 },
    { id: 'backup', type: 'backup', x: 8, y: 0, w: 4, h: 8 },
  ] },
];
// Compose presentation validation without changing the pure calling/import model.
export function parseRun(value: unknown): CallingRun {
  const run = validate(value);
  const workspace = (value as { workspace?: unknown }).workspace;
  return workspace === undefined ? run : { ...run, workspace: workspaceSchema.parse(workspace) };
}
export function retainWorkspace(current: CallingRun, next: Run): CallingRun {
  return current.workspace ? { ...next, workspace: current.workspace } : next;
}
export function loadRun(storage: Pick<Storage, 'getItem'>) {
  let raw: string | null = null;
  try { raw = storage.getItem(STORE); return { raw, run: raw === null ? emptyRun() : parseRun(JSON.parse(raw)), error: '' }; }
  catch { return { raw, run: emptyRun(), error: raw === null ? 'Browser storage is unavailable. Calling controls remain disabled.' : 'Saved run could not be opened. Download its original bytes in Backup before explicit recovery.' }; }
}
export function saveRun(storage: Pick<Storage, 'getItem' | 'setItem'>, run: CallingRun, baseline: string | null) {
  if (storage.getItem(STORE) !== baseline) throw Error('Another tab changed this run. Export your work, then reload before saving.');
  const raw = JSON.stringify(parseRun(run));
  storage.setItem(STORE, raw);
  if (storage.getItem(STORE) !== raw) throw Error('Save could not be verified. Keep this tab open and export your work.');
  return raw;
}
