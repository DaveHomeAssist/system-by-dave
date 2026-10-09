import { empty, validate, KEY, type Document } from "../../../show-ops/model.mjs";
import { workspaceSchema, type Workspace, type PanelDef, type View } from "../../shared/av-console/layout";

export type ShowDocument = Document & { workspace?: Workspace };
export const DRAFT_KEY = "sbd.showOps.draft.v1";
export const LAYOUT_KEY = "sbd.showOps.layout.v1";
export const LIBRARY: PanelDef[] = [
  { type: "rooms", name: "Rooms", group: "Common", description: "Room readiness, owners and blockers.", minW: 3, minH: 3, lit: true },
  { type: "crew", name: "Crew", group: "Common", description: "Crew calls, details and attendance recorded by the operator.", minW: 3, minH: 3 },
  { type: "tasks", name: "Tasks", group: "Common", description: "Open work, owners and next actions.", minW: 3, minH: 3 },
  { type: "handoff", name: "Handoff", group: "Planning", description: "Live summary of outstanding rooms, crew and tasks.", minW: 3, minH: 3 },
  { type: "setup", name: "Setup", group: "Utilities", description: "Show identity, date and operating notes.", minW: 3, minH: 3 },
  { type: "backup", name: "Backup", group: "Utilities", description: "Export, restore and reviewed copies from original tools.", minW: 4, minH: 4 },
];
export const DEFAULT_VIEWS: View[] = [
  { id: "operations", name: "Operations", panels: [
    { id: "rooms", type: "rooms", x: 0, y: 0, w: 4, h: 8 },
    { id: "crew", type: "crew", x: 4, y: 0, w: 4, h: 8 },
    { id: "tasks", type: "tasks", x: 8, y: 0, w: 4, h: 8 },
  ] },
  { id: "briefing", name: "Briefing", panels: [
    { id: "setup", type: "setup", x: 0, y: 0, w: 6, h: 8 },
    { id: "handoff", type: "handoff", x: 6, y: 0, w: 6, h: 8 },
  ] },
  { id: "backup", name: "Backup", panels: [{ id: "backup", type: "backup", x: 0, y: 0, w: 12, h: 8 }] },
];

// Keep the existing domain validator and copy functions authoritative. Layout
// validation is composed at the console boundary, never mixed into domain data.
export function parseDocument(value: unknown): ShowDocument {
  const doc = validate(value);
  const workspace = (value as { workspace?: unknown }).workspace;
  return workspace === undefined ? doc : { ...doc, workspace: workspaceSchema.parse(workspace) };
}
export function preserveWorkspace(current: ShowDocument, next: Document): ShowDocument {
  return current.workspace ? { ...next, workspace: current.workspace } : next;
}
export function loadDocument(storage: Pick<Storage, "getItem">) {
  let raw: string | null = null;
  try { raw = storage.getItem(KEY); return { raw, doc: raw === null ? empty() : parseDocument(JSON.parse(raw)), error: "" }; }
  catch { return { raw, doc: empty(), error: "Saved Show Ops data could not be read. It has not been changed. Save is disabled; download original bytes and export new work before recovery." }; }
}
export function saveDocument(storage: Pick<Storage, "getItem" | "setItem">, doc: ShowDocument, baseline: string | null) {
  if (storage.getItem(KEY) !== baseline) throw new Error("Another tab changed this show. Export your edits, reload and review before saving.");
  const raw = JSON.stringify(parseDocument(doc));
  storage.setItem(KEY, raw);
  if (storage.getItem(KEY) !== raw) throw new Error("Save readback failed. Keep this tab open and export your edits.");
  return raw;
}
