import { workspaceSchema, type Panel, type PanelDef, type View } from "../../shared/av-console/layout";
import type { Pack, PackDef } from "../../shared/av-console/pack";
import { SPECIALISTS, type Specialist } from "./packs";
import { DEFAULT_VIEWS as calculatorViews } from "../../av-calculator/src/model";

/* Shell-owned views (docs/av-suite-shell.md). Panel types and view ids are
   namespaced `<app>:<name>`; application documents never hold them. The
   console opens on an empty Workspace view: call up any panels from there. */
export const WORKSPACE_KEY = "sbd.avSuite.workspace.v1";
export const LAYOUT_KEY = "sbd.avSuite.layout.v1";
export const TOOL_PREFIX = "tool";
export const SUITE_PREFIX = "suite";
export const BLANK_VIEW: View = { id: `${SUITE_PREFIX}:workspace`, name: "Workspace", panels: [] };

export const appOf = (id: string) => id.includes(":") ? id.slice(0, id.indexOf(":")) : "";
export const shortOf = (id: string) => id.slice(id.indexOf(":") + 1);
export const namespaced = (app: string, panel: Panel): Panel => ({ ...panel, id: `${app}:${panel.id}`, type: `${app}:${panel.type}` });

export function packLibrary(pack: Pick<Pack, "id" | "label" | "library">): PanelDef[] {
  return pack.library.map(def => ({ ...def, type: `${pack.id}:${def.type}`, key: def.type, app: pack.label }));
}
/* Display-time compatibility only: never rewrite stored layouts on opening.
   A former Calculator app tile becomes native controls inside its old bounds.
   Small tiles show Audio Delay; every other calculation remains in the menu. */
export function nativePanels(panels: Panel[]): Panel[] {
  const occupied = new Set(panels.filter(panel => panel.type !== "tool:av-calculator").map(panel => panel.type));
  return panels.flatMap(panel => {
    if (panel.type !== "tool:av-calculator") return [panel];
    const defaults = panel.w >= 6 && panel.h >= 6 ? calculatorViews[0].panels : [{ ...panel, type: "audioCard", x: 0, y: 0, w: 12, h: 8 }];
    return defaults.flatMap((child, index) => {
      const type = `calculator:${child.type}`;
      if (occupied.has(type)) return [];
      occupied.add(type);
      const x = Math.floor(child.x * panel.w / 12), y = Math.floor(child.y * panel.h / 8);
      return [{ id: index ? `${panel.id}:native:${index}` : panel.id, type, x: panel.x + x, y: panel.y + y, w: Math.floor((child.x + child.w) * panel.w / 12) - x, h: Math.floor((child.y + child.h) * panel.h / 8) - y }];
    });
  });
}
export function specialistLibrary(): PanelDef[] {
  return SPECIALISTS.map(tool => ({ type: `${TOOL_PREFIX}:${tool.id}`, key: tool.id, name: tool.label, group: "Utilities", description: tool.description, minW: tool.minW, minH: tool.minH, app: "Tools" }));
}
export function defaultViews(packs: PackDef[], specialists: Specialist[] = SPECIALISTS): View[] {
  return [
    BLANK_VIEW,
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
    const stored = workspaceSchema.parse(JSON.parse(raw)).views.map(view => ({ ...view, panels: nativePanels(view.panels) }));
    const missing = defaults.filter(view => !stored.some(existing => existing.id === view.id) && !stored.some(existing => appOf(existing.id) === appOf(view.id) && view.panels.length > 0 && view.panels.every(panel => existing.panels.some(p => p.type === panel.type))));
    const views = [...stored, ...missing];
    // The empty Workspace view always leads, so the console can open blank.
    return { views: [...views.filter(view => view.id === BLANK_VIEW.id), ...views.filter(view => view.id !== BLANK_VIEW.id)] };
  } catch { return { views: defaults, error: "Stored console views could not be read; defaults are shown. They are left in place." }; }
}
export function saveViews(storage: Pick<Storage, "setItem" | "getItem">, views: View[]) {
  const raw = JSON.stringify({ version: 1, views });
  storage.setItem(WORKSPACE_KEY, raw);
  if (storage.getItem(WORKSPACE_KEY) !== raw) throw Error("Console views could not be verified after writing.");
}
/* The application a view belongs to: its id prefix, or for a view the engine
   named itself (Store as new, Duplicate, New view) the application owning
   most of its panels; an empty view belongs to the suite Workspace. */
export function viewApp(view: View | undefined): string {
  if (!view) return "";
  if (view.id === "tool:av-calculator") return "calculator";
  const prefix = appOf(view.id);
  if (prefix) return prefix;
  const counts = new Map<string, number>();
  for (const panel of view.panels) { const app = appOf(panel.type); counts.set(app, (counts.get(app) || 0) + 1); }
  let best = SUITE_PREFIX, max = 0;
  for (const [app, count] of counts) if (count > max) { best = app; max = count; }
  return best;
}
