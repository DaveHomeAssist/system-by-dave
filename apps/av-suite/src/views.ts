import { workspaceSchema, type Panel, type PanelDef, type View } from "../../shared/av-console/layout";
import type { Pack, PackDef } from "../../shared/av-console/pack";
import { SPECIALISTS, type Specialist } from "./packs";

/* Shell-owned views (docs/av-suite-shell.md). Panel types and view ids are
   namespaced `<app>:<name>`; application documents never hold them. */
export const WORKSPACE_KEY = "sbd.avSuite.workspace.v1";
export const LAYOUT_KEY = "sbd.avSuite.layout.v1";
export const TOOL_PREFIX = "tool";

export const appOf = (id: string) => id.slice(0, id.indexOf(":"));
export const shortOf = (id: string) => id.slice(id.indexOf(":") + 1);
export const namespaced = (app: string, panel: Panel): Panel => ({ ...panel, id: `${app}:${panel.id}`, type: `${app}:${panel.type}` });

export function packLibrary(pack: Pack): PanelDef[] {
  return pack.library.map(def => ({ ...def, type: `${pack.id}:${def.type}`, key: def.type, app: pack.label }));
}
export function specialistLibrary(): PanelDef[] {
  return SPECIALISTS.map(tool => ({ type: `${TOOL_PREFIX}:${tool.id}`, key: tool.id, name: tool.label, group: "Utilities", description: tool.description, minW: tool.minW, minH: tool.minH, app: "Tools" }));
}
export function defaultViews(packs: PackDef[], specialists: Specialist[] = SPECIALISTS): View[] {
  return [
    ...packs.flatMap(pack => pack.defaultViews.map(view => ({ id: `${pack.id}:${view.id}`, name: view.name, panels: view.panels.map(panel => namespaced(pack.id, panel)) }))),
    ...specialists.map(tool => ({ id: `${TOOL_PREFIX}:${tool.id}`, name: tool.label, panels: [{ id: `${TOOL_PREFIX}:${tool.id}:main`, type: `${TOOL_PREFIX}:${tool.id}`, x: 0, y: 0, w: 12, h: 8 }] })),
  ];
}
/* Stored views plus any default view that a newer pack adds, in memory only. */
export function loadViews(storage: Pick<Storage, "getItem">, defaults: View[]): { views: View[]; error?: string } {
  let raw: string | null = null;
  try { raw = storage.getItem(WORKSPACE_KEY); } catch { return { views: defaults, error: "Browser storage is unavailable. Views stay in this visit." }; }
  if (raw === null) return { views: defaults };
  try {
    const stored = workspaceSchema.parse(JSON.parse(raw)).views;
    const missing = defaults.filter(view => !stored.some(existing => existing.id === view.id) && !stored.some(existing => appOf(existing.id) === appOf(view.id) && view.panels.every(panel => existing.panels.some(p => p.type === panel.type))));
    return { views: [...stored, ...missing] };
  } catch { return { views: defaults, error: "Stored console views could not be read; defaults are shown. They are left in place." }; }
}
export function saveViews(storage: Pick<Storage, "setItem" | "getItem">, views: View[]) {
  const raw = JSON.stringify({ version: 1, views });
  storage.setItem(WORKSPACE_KEY, raw);
  if (storage.getItem(WORKSPACE_KEY) !== raw) throw Error("Console views could not be verified after writing.");
}
/* The application a view belongs to: its id prefix, or the application that
   owns the most panels in a mixed view stored under another prefix. */
export function viewApp(view: View | undefined): string {
  if (!view) return "";
  return appOf(view.id);
}
