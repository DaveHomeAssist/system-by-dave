import { z } from "zod";

/* Console workspace model shared by AV by Dave consoles (docs/av-console.md).
   Pure functions only: geometry, view operations and the persisted shape. */

export const COLS = 12;
export const ROWS = 8;

export type Rect = { x: number; y: number; w: number; h: number };
export type Panel = Rect & { id: string; type: string };
export type View = { id: string; name: string; panels: Panel[] };
export type PanelDef = { type: string; name: string; group: "Common" | "Planning" | "Utilities"; description: string; minW: number; minH: number; module?: string; lit?: boolean };

const int = z.number().int();
const panelSchema = z.object({ id: z.string().min(1), type: z.string().min(1), x: int.min(0), y: int.min(0), w: int.min(1), h: int.min(1) }).strict();
const viewSchema = z.object({ id: z.string().min(1), name: z.string(), panels: z.array(panelSchema) }).strict();
/* Stored views travel inside the owning console's document. Version 1 only;
   an unknown version fails validation so the document is never rewritten. */
export const workspaceSchema = z.object({ version: z.literal(1), views: z.array(viewSchema) }).strict();
export type Workspace = z.infer<typeof workspaceSchema>;

export function overlaps(a: Rect, b: Rect) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
export function inBounds(r: Rect) { return r.x >= 0 && r.y >= 0 && r.w >= 1 && r.h >= 1 && r.x + r.w <= COLS && r.y + r.h <= ROWS; }
export function fits(r: Rect, panels: Panel[], ignore?: string) { return inBounds(r) && !panels.some(p => p.id !== ignore && overlaps(p, r)); }
const cellFree = (x: number, y: number, panels: Panel[]) => fits({ x, y, w: 1, h: 1 }, panels);

/* Nearest free rectangle for a panel requested at cell (x, y). Grows from the
   tapped cell first; otherwise searches common sizes by distance. */
export function suggest(x: number, y: number, panels: Panel[], min: { w: number; h: number } = { w: 3, h: 2 }): Rect | null {
  if (cellFree(x, y, panels)) {
    let w = 1; while (w < 6 && x + w < COLS && cellFree(x + w, y, panels)) w++;
    let h = 1;
    grow: while (h < 8 && y + h < ROWS) { for (let i = 0; i < w; i++) if (!cellFree(x + i, y + h, panels)) break grow; h++; }
    if (w >= min.w && h >= min.h) return { x, y, w, h };
  }
  let best: { r: Rect; d: number } | null = null;
  const sizes = [[4, 4], [4, 3], [3, 3], [min.w, min.h]].filter(([w, h]) => w >= min.w && h >= min.h);
  for (const [w, h] of sizes) for (let yy = 0; yy + h <= ROWS; yy++) for (let xx = 0; xx + w <= COLS; xx++) {
    const r = { x: xx, y: yy, w, h };
    if (fits(r, panels)) { const d = Math.abs(xx - x) + Math.abs(yy - y); if (!best || d < best.d) best = { r, d }; }
  }
  return best ? best.r : null;
}
export function firstFree(panels: Panel[], min?: { w: number; h: number }): Rect | null {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (cellFree(x, y, panels)) { const r = suggest(x, y, panels, min); if (r) return r; }
  return null;
}
/* A drawn rectangle shrinks to the free area that starts at its anchor cell. */
export function trim(drawn: Rect, anchor: { x: number; y: number }, panels: Panel[]): Rect | null {
  let w = 1; while (anchor.x + w < drawn.x + drawn.w && cellFree(anchor.x + w, anchor.y, panels)) w++;
  let h = 1;
  grow: while (anchor.y + h < drawn.y + drawn.h) { for (let i = 0; i < w; i++) if (!cellFree(anchor.x + i, anchor.y + h, panels)) break grow; h++; }
  const r = { x: anchor.x, y: anchor.y, w, h };
  return fits(r, panels) ? r : null;
}
export function nudge(panel: Panel, panels: Panel[], d: Partial<Rect>, min: { w: number; h: number }): Rect | null {
  const r = { x: panel.x + (d.x || 0), y: panel.y + (d.y || 0), w: Math.max(min.w, panel.w + (d.w || 0)), h: Math.max(min.h, panel.h + (d.h || 0)) };
  return fits(r, panels, panel.id) ? r : null;
}
/* Split keeps the original panel in the first half and returns the free half. */
export function split(panel: Panel, direction: "h" | "v"): { keep: Rect; rest: Rect } | null {
  if (direction === "h") { if (panel.w < 2) return null; const half = Math.ceil(panel.w / 2); return { keep: { ...rect(panel), w: half }, rest: { x: panel.x + half, y: panel.y, w: panel.w - half, h: panel.h } }; }
  if (panel.h < 2) return null; const half = Math.ceil(panel.h / 2);
  return { keep: { ...rect(panel), h: half }, rest: { x: panel.x, y: panel.y + half, w: panel.w, h: panel.h - half } };
}
const rect = (p: Rect): Rect => ({ x: p.x, y: p.y, w: p.w, h: p.h });

/* Drops overlapping or out-of-range panels so a stored view can never cover
   another panel, and unknown types are retained but not rendered. */
export function sanitizeView(view: View): View {
  const kept: Panel[] = [];
  for (const p of view.panels) if (fits(p, kept)) kept.push(p);
  return { ...view, panels: kept };
}
export const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export function storeAsNew(views: View[], current: Panel[], name: string, id: string): View[] { return [...views, { id, name, panels: clone(current) }]; }
export function updateView(views: View[], id: string, current: Panel[]): View[] { return views.map(v => v.id === id ? { ...v, panels: clone(current) } : v); }
export function renameView(views: View[], id: string, name: string): View[] { return views.map(v => v.id === id ? { ...v, name } : v); }
export function deleteView(views: View[], id: string): View[] { return views.length < 2 ? views : views.filter(v => v.id !== id); }
export function sameLayout(a: Panel[], b: Panel[]) {
  const key = (ps: Panel[]) => JSON.stringify([...ps].sort((p, q) => p.id.localeCompare(q.id)).map(p => [p.id, p.type, p.x, p.y, p.w, p.h]));
  return key(a) === key(b);
}
