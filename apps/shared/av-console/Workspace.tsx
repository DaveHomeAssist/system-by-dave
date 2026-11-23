import { TopicMenu } from "./TopicMenu";
import { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LayoutState } from "./drafts";
import { clone, COLS, deleteView, findSpace, firstFree, fits, nudge, Panel, PanelDef, Rect, renameView, ROWS, sameLayout, sanitizeView, split, STEP, storeAsNew, suggest, trim, updateView, View } from "./layout";

/* Console workspace: grandMA-style panel host shared by AV by Dave consoles.
   The owning console supplies its panel library, its stored views (which live
   in its own document) and a renderer. Live arrangements are interface state:
   they never write records, and only Store/Update View edits the document. */

export type Mode = "phone" | "tablet" | "desktop";
export type PanelRender = { body: ReactNode; context?: string; title?: string; actions?: ReactNode };
type Chooser = { mode: "add" | "replace" | "nospace"; rect?: Rect; panelId?: string; left: number; top: number; auto?: boolean };
/* A new panel from "Add panel" opens at this size (or its own minimum, if larger) in the first free spot. */
const ADD_SIZE = { w: 4, h: 4 };
type Menu = { kind: "panel" | "view"; id: string; left: number; top: number; sub?: "move" | "rename" };
type Drag = { id: string; kind: "move" | "resize"; px: number; py: number; orig: Panel; rect?: Rect; valid?: boolean };

const uid = () => (globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random())).slice(0, 8);
function modeFor(width: number): Mode { return width < 720 ? "phone" : width < 1100 ? "tablet" : "desktop"; }

/* persist: device-local layout state (current view, unstored arrangements,
   lock). It is restored on load and written on change; it never touches the
   console's document. */
export function useConsoleWorkspace(views: View[], library: PanelDef[], persist?: { initial: LayoutState | null; save: (state: LayoutState) => void }) {
  const [viewId, setViewId] = useState(() => views.find(v => v.id === persist?.initial?.viewId)?.id || views[0]?.id || "");
  const [live, setLive] = useState<Record<string, Panel[]>>(() => persist?.initial?.live || {});
  const [focus, setFocus] = useState<string | null>(null);
  const [max, setMax] = useState<Record<string, string | null>>({});
  const [locked, setLocked] = useState(() => persist?.initial?.locked || false);
  const save = persist?.save;
  const previousLayout = useRef(JSON.stringify({ viewId, live, locked }));
  useEffect(() => {
    const next = JSON.stringify({ viewId, live, locked });
    if (previousLayout.current === next) return;
    previousLayout.current = next;
    save?.({ viewId, live, locked });
  }, [viewId, live, locked, save]);
  const [phoneType, setPhoneType] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(() => modeFor(typeof window === "undefined" ? 1440 : window.innerWidth));
  useEffect(() => { const resize = () => setMode(modeFor(window.innerWidth)); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);
  const view = views.find(v => v.id === viewId) || views[0];
  useEffect(() => { if (view && view.id !== viewId) setViewId(view.id); }, [view, viewId]);
  const available = useMemo(() => new Set(library.map(d => d.type)), [library]);
  const arrangement = view ? sanitizeView({ ...view, panels: live[view.id] || view.panels }).panels : [];
  const panels = arrangement.filter(p => available.has(p.type));
  const hidden = arrangement.length - panels.length;
  const setPanels = useCallback((fn: (current: Panel[]) => Panel[]) => {
    if (!view) return;
    setLive(state => ({ ...state, [view.id]: fn(sanitizeView({ ...view, panels: state[view.id] || view.panels }).panels) }));
  }, [view]);
  /* Bring a panel type forward: focus it here, otherwise open the first view
     that holds it, otherwise place it in free space. Returns false when the
     panel is unavailable (for example, its module is disabled). */
  const show = useCallback((type: string) => {
    if (!available.has(type) || !view) return false;
    setPhoneType(type);
    const here = arrangement.find(p => p.type === type);
    if (here) { setFocus(here.id); if (max[view.id] && max[view.id] !== here.id) setMax(m => ({ ...m, [view.id]: null })); return true; }
    const other = views.find(v => (live[v.id] || v.panels).some(p => p.type === type));
    if (other) { setViewId(other.id); const p = (live[other.id] || other.panels).find(q => q.type === type); setFocus(p ? p.id : null); return true; }
    const def = library.find(d => d.type === type);
    const r = firstFree(arrangement, def ? { w: def.minW, h: def.minH } : undefined);
    if (r) { const id = `p-${uid()}`; setPanels(ps => [...ps, { id, type, ...r }]); setFocus(id); return true; }
    return false;
  }, [available, view, arrangement, views, live, library, max, setPanels]);
  return { views, view, viewId: view?.id || "", setViewId: (id: string) => { setViewId(id); setPhoneType(null); }, live, setLive, panels, hidden, setPanels, focus, setFocus, max, setMax, locked, setLocked, mode, phoneType, setPhoneType, show, library };
}
export type ConsoleWorkspace = ReturnType<typeof useConsoleWorkspace>;

type Props = {
  ws: ConsoleWorkspace;
  label: string;
  quick: { type: string; label: string; badge?: number }[];
  render: (type: string, panel: Panel) => PanelRender;
  onViewsChange: (views: View[], message: string) => void;
  notify: (text: string) => void;
  viewTabs?: View[];
  extraViews?: ReactNode;
  /* Chooser group marked as the current one on its first step: an
     application name when the library carries `app`, otherwise a category. */
  defaultGroup?: string;
  /* Icons for the chooser's group tiles, keyed by group name: path data on a
     24 by 24 grid, drawn as strokes. Groups show as icon tiles when supplied. */
  groupIcons?: Record<string, string[]>;
  compact?: boolean;
};

export function ConsoleWorkspace({ ws, label, quick, render, onViewsChange, notify, viewTabs, extraViews, defaultGroup: currentGroup, groupIcons, compact = false }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const chooserDialog = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [chooser, setChooser] = useState<Chooser | null>(null);
  const [query, setQuery] = useState("");
  /* Chooser step: null shows the group tiles; a name shows that group's panels. */
  const [group, setGroup] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [rename, setRename] = useState("");
  const [drag, setDrag] = useState<Drag | null>(null);
  const [draw, setDraw] = useState<{ anchor: { x: number; y: number }; px: number; py: number; rect?: Rect } | null>(null);
  const { view, panels, mode, locked } = ws;
  const visibleViewTabs = viewTabs || ws.views;
  const maxId = view ? ws.max[view.id] || null : null;
  const def = (type: string) => ws.library.find(d => d.type === type);
  const apps = Array.from(new Set(ws.library.map(d => d.app).filter((app): app is string => Boolean(app))));
  const groupOf = (d: PanelDef) => apps.length ? d.app : d.group;
  // Only groups that hold a panel: a tile never opens onto an empty list.
  const groups: string[] = (apps.length ? apps : ["Common", "Planning", "Utilities"]).filter(g => ws.library.some(d => groupOf(d) === g));
  // One group needs no first step; its panels show straight away.
  const activeGroup = groups.length > 1 ? group : groups[0] ?? null;
  const drilled = Boolean(group) && groups.length > 1 && !query;
  const stored = view ? sanitizeView(view).panels : [];
  const changed = view ? !sameLayout(ws.live[view.id] || stored, stored) : false;

  /* Layout before a split, put back if the chooser closes without adding a panel. */
  const splitUndo = useRef<{ viewId: string; panels: Panel[] } | null>(null);
  const setLive = ws.setLive;
  const close = useCallback(() => {
    const undo = splitUndo.current; splitUndo.current = null;
    if (undo) setLive(l => ({ ...l, [undo.viewId]: undo.panels }));
    setChooser(null); setMenu(null);
    const t = trigger.current; trigger.current = null;
    if (t && document.contains(t)) setTimeout(() => t.focus(), 0);
  }, [setLive]);
  /* A pointer press outside an options menu dismisses it and leaves focus where
     the press landed. The menu's own trigger is left to its click, which toggles. */
  const menuOpen = Boolean(menu);
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || trigger.current?.contains(target)) return;
      setMenu(null);
      // Empty workspace space closes through gridDown, which hands focus back to the trigger.
      if (target !== grid.current) trigger.current = null;
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [menuOpen]);
  /* Two-step chooser: a group tile opens its panels in place of the tiles, and
     Back (or Escape) returns to the tiles with focus on the group just left. */
  const focusIn = (selector: string) => setTimeout(() => chooserDialog.current?.querySelector<HTMLElement>(selector)?.focus(), 0);
  function openGroup(g: string) { setGroup(g); focusIn(".console-choices button"); }
  const backToGroups = useCallback(() => {
    const from = group; setGroup(null);
    if (from) focusIn(`.console-groups button[data-group="${CSS.escape(from)}"]`);
  }, [group]);
  function chooserKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (!compact || e.key !== "Tab") return;
    const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')).filter(el => el.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && e.target === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && e.target === last) { e.preventDefault(); first?.focus(); }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (chooser && drilled && !menu && !drag && !draw) { e.preventDefault(); backToGroups(); return; }
      if (chooser || menu || drag || draw) { e.preventDefault(); setDrag(null); setDraw(null); close(); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [chooser, menu, drag, draw, close, drilled, backToGroups]);
  useLayoutEffect(() => {
    if (compact && chooser && !chooserDialog.current?.open) chooserDialog.current?.showModal();
  }, [compact, chooser]);
  /* Options menus take focus on open (or on a sub-page change) unless a field already has it. */
  const menuKey = menu ? `${menu.kind}:${menu.id}:${menu.sub || ""}` : "";
  useEffect(() => {
    const el = menuRef.current;
    if (!menuKey || !el || el.contains(document.activeElement)) return;
    el.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [menuKey]);
  function menuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) || (e.target as HTMLElement).matches("input, select, textarea")) return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
    if (!items.length) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : e.key === "ArrowDown" ? (at + 1) % items.length : (at <= 0 ? items.length - 1 : at - 1);
    items[next].focus();
  }
  const at = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.bottom + 6 }; };
  const clampPos = (left: number, top: number, w: number, h: number) => ({ left: Math.max(8, Math.min(left, window.innerWidth - w - 8)), top: Math.max(8, Math.min(top, window.innerHeight - h - 8)) });

  function cellAt(clientX: number, clientY: number) {
    const box = grid.current!.getBoundingClientRect();
    const sx = box.width / COLS, sy = box.height / ROWS;
    const at = (offset: number, size: number, max: number) => Math.max(0, Math.min(max - STEP, Math.floor(offset / size / STEP) * STEP));
    return { x: at(clientX - box.left, sx, COLS), y: at(clientY - box.top, sy, ROWS), sx, sy };
  }
  function openChooser(c: Omit<Chooser, "left" | "top">, left: number, top: number) {
    if (!trigger.current || !document.contains(trigger.current)) trigger.current = (document.activeElement as HTMLElement) || null;
    setQuery(""); setGroup(null); setMenu(null);
    setChooser({ ...c, ...clampPos(left, top, 460, 420) });
  }
  function addPanelButton(e: React.MouseEvent<HTMLButtonElement>) {
    trigger.current = e.currentTarget;
    const r = firstFree(panels); const p = at(e.currentTarget);
    openChooser(r ? { mode: "add", rect: r, auto: true } : { mode: "nospace" }, p.left - 200, p.top);
  }
  function place(type: string) {
    const c = chooser; if (!c || !view) return;
    const d = def(type);
    const existing = panels.find(p => p.type === type);
    if (c.mode === "replace" && c.panelId) {
      if (existing && existing.id !== c.panelId) { notify(`${d?.name || type} is already open in this view.`); ws.setFocus(existing.id); close(); return; }
      ws.setPanels(ps => ps.map(p => p.id === c.panelId ? { ...p, type } : p)); ws.setFocus(c.panelId); close(); return;
    }
    if (existing) { ws.setFocus(existing.id); notify(`${d?.name || type} is already open in this view. It now has focus.`); close(); return; }
    if (!c.rect) return;
    const minW = d?.minW || 1, minH = d?.minH || 1;
    const sized = c.auto ? findSpace(panels, { w: Math.min(COLS, Math.max(minW, ADD_SIZE.w)), h: Math.min(ROWS, Math.max(minH, ADD_SIZE.h)) }) || findSpace(panels, { w: Math.min(COLS, minW), h: Math.min(ROWS, minH) }) : null;
    const rect = sized || { ...c.rect, w: Math.max(c.rect.w, Math.min(d?.minW || 1, COLS - c.rect.x)), h: Math.max(c.rect.h, Math.min(d?.minH || 1, ROWS - c.rect.y)) };
    const target = fits(rect, panels) ? rect : c.rect;
    const id = `p-${uid()}`; splitUndo.current = null;
    ws.setPanels(ps => [...ps, { id, type, ...target }]); ws.setFocus(id); ws.setPhoneType(type);
    notify(`${d?.name || type} added. Store the view to keep this arrangement in the plan.`);
    close();
  }

  /* Pointer: tap empty space to add; drag across it (unlocked) to size first. */
  function gridDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || (e.button && e.button !== 0) || maxId || mode !== "desktop") return;
    if (chooser || menu) { close(); return; }
    const c = cellAt(e.clientX, e.clientY);
    if (locked) { const r = suggest(c.x, c.y, panels); openChooser(r ? { mode: "add", rect: r } : { mode: "nospace" }, e.clientX, e.clientY); return; }
    setDraw({ anchor: { x: c.x, y: c.y }, px: e.clientX, py: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function gridMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draw) return;
    if (Math.abs(e.clientX - draw.px) + Math.abs(e.clientY - draw.py) < 6) return;
    const c = cellAt(e.clientX, e.clientY);
    setDraw({ ...draw, rect: { x: Math.min(draw.anchor.x, c.x), y: Math.min(draw.anchor.y, c.y), w: Math.abs(c.x - draw.anchor.x) + STEP, h: Math.abs(c.y - draw.anchor.y) + STEP } });
  }
  function gridUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draw) return; const d = draw; setDraw(null);
    if (!d.rect) { const r = suggest(d.anchor.x, d.anchor.y, panels); openChooser(r ? { mode: "add", rect: r } : { mode: "nospace" }, e.clientX, e.clientY); return; }
    const r = trim(d.rect, d.anchor, panels);
    if (!r) { notify("Draw across empty space. That area is covered by a panel."); return; }
    openChooser({ mode: "add", rect: r }, e.clientX, e.clientY);
  }
  function dragStart(p: Panel, kind: Drag["kind"]) {
    return (e: React.PointerEvent<HTMLElement>) => {
      if (locked || maxId || mode !== "desktop" || (e.button && e.button !== 0)) return;
      if ((e.target as HTMLElement).closest("button,input,select,textarea,a")) return;
      e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({ id: p.id, kind, px: e.clientX, py: e.clientY, orig: { ...p } });
    };
  }
  function dragMove(e: React.PointerEvent<HTMLElement>) {
    if (!drag || !grid.current) return;
    const c = cellAt(e.clientX, e.clientY);
    const dx = Math.round((e.clientX - drag.px) / (c.sx * STEP)) * STEP, dy = Math.round((e.clientY - drag.py) / (c.sy * STEP)) * STEP;
    const o = drag.orig; const d = def(o.type) || { minW: 1, minH: 1 };
    const r = drag.kind === "move" ? { x: o.x + dx, y: o.y + dy, w: o.w, h: o.h } : { x: o.x, y: o.y, w: Math.max(d.minW, o.w + dx), h: Math.max(d.minH, o.h + dy) };
    setDrag({ ...drag, rect: r, valid: fits(r, panels, o.id) });
  }
  /* The browser can take the pointer away mid-gesture (a scroll, a system gesture, a
     lost capture). Nothing is committed; the outline and drag state just clear. */
  function pointerAbort() { setDrag(null); setDraw(null); }
  function dragEnd() {
    const d = drag; setDrag(null); if (!d || !d.rect) return;
    if (d.valid) ws.setPanels(ps => ps.map(p => p.id === d.id ? { ...p, ...d.rect } : p));
    else notify("No room there. Panels never overlap, so it stays where it was.");
  }

  /* Panel menu commands. */
  const menuPanel = menu?.kind === "panel" ? panels.find(p => p.id === menu.id) : undefined;
  const menuPanelName = menuPanel ? def(menuPanel.type)?.name || "Panel" : "Panel";
  const menuTitle = !menu ? "" : menu.kind === "panel" ? (menu.sub === "move" ? `Move and size · ${menuPanelName}` : menuPanelName)
    : menu.sub === "rename" ? "Rename view" : `${view?.name || "View"}${changed ? " · changed" : ""}`;
  function doNudge(d: Partial<Rect>) {
    if (!menuPanel) return; const x = def(menuPanel.type) || { minW: 1, minH: 1 };
    const r = nudge(menuPanel, panels, d, { w: x.minW, h: x.minH });
    if (r) ws.setPanels(ps => ps.map(p => p.id === menuPanel.id ? { ...p, ...r } : p)); else notify("No room. Panels never overlap.");
  }
  function doSplit(direction: "h" | "v") {
    if (!menuPanel) return; const md = def(menuPanel.type); const s = split(menuPanel, direction, { w: md?.minW || STEP, h: md?.minH || STEP });
    if (!s) { notify("This panel is too small to split."); return; }
    splitUndo.current = view ? { viewId: view.id, panels: clone(panels) } : null;
    ws.setPanels(ps => ps.map(p => p.id === menuPanel.id ? { ...p, ...s.keep } : p));
    const pos = { left: menu!.left - 240, top: menu!.top }; setMenu(null);
    openChooser({ mode: "add", rect: s.rest }, pos.left, pos.top);
  }
  function toggleMax(id: string) { if (!view) return; ws.setMax(m => ({ ...m, [view.id]: m[view.id] === id ? null : id })); ws.setFocus(id); }
  function closePanel(id: string) {
    const p = panels.find(x => x.id === id);
    ws.setPanels(ps => ps.filter(x => x.id !== id));
    if (view && ws.max[view.id] === id) ws.setMax(m => ({ ...m, [view.id]: null }));
    notify(`${p ? def(p.type)?.name || p.type : "Panel"} closed. Its records and module are untouched.`);
    close();
  }
  function fullScreen() {
    const target = panels.find(p => p.id === ws.focus) || panels.find(p => def(p.type)?.lit) || panels[0];
    if (!target || !view) return;
    ws.setMax(m => ({ ...m, [view.id]: target.id })); ws.setFocus(target.id);
    shell.current?.requestFullscreen?.().catch(() => undefined);
    notify(`${def(target.type)?.name || "Panel"} fills the workspace. Press Escape or Restore to return.`);
  }
  useEffect(() => {
    const exit = () => { if (!document.fullscreenElement && view && ws.max[view.id]) ws.setMax(m => ({ ...m, [view.id]: null })); };
    document.addEventListener("fullscreenchange", exit); return () => document.removeEventListener("fullscreenchange", exit);
  }, [view, ws]);

  /* View commands: these are document edits staged until Save. */
  function storeNew() { if (!view) return; const id = `v-${uid()}`; const next = storeAsNew(ws.views, panels, `${view.name} ${ws.views.length + 1}`, id); ws.setLive(l => ({ ...l, [id]: clone(panels) })); ws.setViewId(id); onViewsChange(next, "View stored in the plan. Save to keep it."); close(); }
  function storeUpdate() { if (!view) return; onViewsChange(updateView(ws.views, view.id, ws.live[view.id] || stored), `${view.name} updated. Save to keep it.`); close(); }
  function revert() { if (!view) return; ws.setLive(l => { const n = { ...l }; delete n[view.id]; return n; }); notify(`${view.name} restored to its stored arrangement.`); close(); }
  function duplicate() { if (!view) return; const id = `v-${uid()}`; onViewsChange(storeAsNew(ws.views, panels, `${view.name} copy`, id), "View duplicated. Save to keep it."); ws.setLive(l => ({ ...l, [id]: clone(panels) })); ws.setViewId(id); close(); }
  function remove() { if (!view || ws.views.length < 2) return; const next = deleteView(ws.views, view.id); onViewsChange(next, `${view.name} deleted. No records were touched.`); ws.setViewId(next[0].id); close(); }
  function commitRename() { if (!view) return; const name = rename.trim(); if (name) onViewsChange(renameView(ws.views, view.id, name), "View renamed. Save to keep it."); close(); }

  const phoneShown = mode === "phone" ? (panels.find(p => p.type === ws.phoneType) || panels.find(p => p.id === ws.focus) || panels.find(p => def(p.type)?.lit) || panels[0]) : undefined;
  const ordered = [...panels].sort((a, b) => a.y - b.y || a.x - b.x);
  const visible = maxId ? panels.filter(p => p.id === maxId) : mode === "phone" ? (phoneShown ? [phoneShown] : []) : panels;
  // A lone tablet panel uses the available workspace without changing its stored desktop geometry.
  const singleTabletPanel = mode === "tablet" && panels.length === 1;
  const area = (p: Panel) => {
    if (maxId || mode === "phone" || singleTabletPanel) return { gridColumn: "1 / -1", gridRow: "1 / -1" };
    if (mode === "tablet") { const i = ordered.findIndex(x => x.id === p.id); return { gridColumn: String(i % 2 + 1), gridRow: String(Math.floor(i / 2) + 1) }; }
    return { gridColumn: `${p.x / STEP + 1} / ${(p.x + p.w) / STEP + 1}`, gridRow: `${p.y / STEP + 1} / ${(p.y + p.h) / STEP + 1}` };
  };
  const gridStyle = maxId || mode === "phone" || singleTabletPanel ? { gridTemplateColumns: "minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr)" }
    : mode === "tablet" ? { gridTemplateColumns: "repeat(2,minmax(0,1fr))", gridTemplateRows: `repeat(${Math.max(1, Math.ceil(panels.length / 2))},minmax(0,1fr))` }
    : { gridTemplateColumns: `repeat(${COLS / STEP},minmax(0,1fr))`, gridTemplateRows: `repeat(${ROWS / STEP},minmax(0,1fr))` };
  const shownTypes = new Set((mode === "phone" ? visible : panels).map(p => p.type));
  const choices = query ? ws.library.filter(d => `${d.name} ${d.app || ""} ${d.description}`.toLowerCase().includes(query.toLowerCase()))
    : activeGroup ? ws.library.filter(d => groupOf(d) === activeGroup) : [];
  const ghost = drag?.rect || draw?.rect || (chooser?.rect && chooser.mode !== "replace" ? chooser.rect : undefined);
  /* The chooser opens where it was asked for and rises when its options need the room, so a
     group is never cut short while the screen has space above. Phones and short screens place
     it by stylesheet instead. */
  const [chooserTop, setChooserTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = chooserDialog.current;
    if (!chooser || !el) { setChooserTop(null); return; }
    const limit = el.style.maxHeight; el.style.maxHeight = "none";
    const natural = el.offsetHeight; el.style.maxHeight = limit;
    setChooserTop(Math.max(8, Math.min(chooser.top, window.innerHeight - natural - 8)));
  }, [chooser, group, query, choices.length, mode, compact]);
  const popTop = chooser ? chooserTop ?? chooser.top : 0;

  const viewBar = <div role="tablist" aria-label={`${label} views`} className="console-views">
        {visibleViewTabs.map(v => <button key={v.id} type="button" role="tab" aria-selected={v.id === ws.viewId} onClick={() => { ws.setViewId(v.id); close(); }}>{v.name}{v.id === ws.viewId && changed && <span className="console-dot" title="Arrangement changed. Store or update the view to keep it." aria-label="arrangement changed" />}</button>)}
        {extraViews}
      </div>;
  const quickBar = <nav className="console-quick" aria-label="Panels">
        {quick.map(q => <button key={q.type} type="button" aria-pressed={shownTypes.has(q.type) && (mode !== "phone" || phoneShown?.type === q.type)} onClick={() => { if (!ws.show(q.type)) notify(`${q.label} is not available. Check Project modules.`); }}>{q.label}{q.badge !== undefined && <span className="console-badge">{q.badge}</span>}</button>)}
      </nav>;
  return <div ref={shell} className={`console-shell ${compact ? "console-compact" : ""} mode-${mode} ${locked ? "is-locked" : ""}`}>
    <div className="console-strip">
      {compact ? <TopicMenu label={view?.name || "Workspace"} topics={[
        { name: "Views", closeOnAction: true, description: "Switch the workspace arrangement", content: viewBar },
        { name: "Panels", closeOnAction: true, description: "Recall panels in this topic", content: quickBar },
        { name: "Layout", closeOnAction: true, description: "Lock the arrangement or focus a panel", content: <><button type="button" aria-pressed={locked} onClick={() => { ws.setLocked(!locked); notify(locked ? "Layout unlocked." : "Layout locked."); }}>{locked ? "Locked" : "Unlocked"}</button><button type="button" onClick={fullScreen}>Full screen focused panel</button></> },
      ]} /> : viewBar}
      <button type="button" className="console-icon" aria-label="View options" aria-haspopup="menu" aria-expanded={menu?.kind === "view"} onClick={e => { if (menu?.kind === "view") { close(); return; } trigger.current = e.currentTarget; const p = at(e.currentTarget); setChooser(null); setMenu({ kind: "view", id: ws.viewId, ...clampPos(p.left, p.top, 280, 340) }); }}>▾</button>
      {mode !== "phone" && !compact && quickBar}
      <div className="console-tools">
        <button type="button" onClick={addPanelButton}>＋ Add panel</button>
        {!compact && <>
        <button type="button" aria-pressed={locked} onClick={() => { ws.setLocked(!locked); notify(locked ? "Layout unlocked. Drag title bars and corner handles, or draw across empty space." : "Layout locked. Menu commands still work."); }}>{locked ? "Locked" : "Unlocked"}</button>
        <button type="button" className="console-icon" aria-label="Full screen focused panel" onClick={fullScreen}>⛶</button>
        </>}
      </div>
    </div>
    {ws.hidden > 0 && <p className="console-notice">{ws.hidden} panel{ws.hidden === 1 ? " is" : "s are"} hidden because {ws.hidden === 1 ? "its module is" : "their modules are"} off. The view keeps {ws.hidden === 1 ? "it" : "them"} for when the module returns.</p>}
    <div ref={grid} className="console-grid" style={gridStyle} onPointerDown={gridDown} onPointerMove={gridMove} onPointerUp={gridUp} onPointerCancel={pointerAbort} onLostPointerCapture={pointerAbort} aria-label={`${label} workspace. Tap empty space to add a panel.`}>
      {!visible.length && <div className="console-empty"><p>This view is empty.</p><button type="button" onClick={addPanelButton}>＋ Add panel</button></div>}
      {visible.map(p => {
        const d = def(p.type); if (!d) return null;
        const out = render(p.type, p);
        const focused = ws.focus === p.id; const isMax = maxId === p.id;
        const canDrag = !locked && !maxId && mode === "desktop";
        return <section key={p.id} className={`console-panel ${d.lit ? "is-lit" : ""} ${focused ? "is-focused" : ""} ${drag?.id === p.id ? "is-dragging" : ""}`} style={area(p)} data-panel={d.key || p.type} data-app={d.app} onPointerDownCapture={() => { if (!focused) ws.setFocus(p.id); }}>
          <header className={`console-bar ${canDrag ? "can-drag" : ""}`} onPointerDown={dragStart(p, "move")} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={pointerAbort} onLostPointerCapture={pointerAbort}>
            <strong className="console-title">{out.title || d.name}</strong>{out.context && <span className="console-context">{out.context}</span>}
            <span className="console-bar-actions">{out.actions}
              <button type="button" className="console-icon" aria-label={`${d.name} options`} aria-haspopup="menu" aria-expanded={menu?.kind === "panel" && menu.id === p.id} onClick={e => { if (menu?.kind === "panel" && menu.id === p.id) { close(); return; } trigger.current = e.currentTarget; const r = e.currentTarget.getBoundingClientRect(); setChooser(null); setMenu({ kind: "panel", id: p.id, ...clampPos(r.right - 280, r.bottom + 6, 280, 380) }); }}>⋯</button>
              {!compact && mode !== "phone" && <button type="button" className="console-icon" aria-label={isMax ? `Restore ${d.name}` : `Maximize ${d.name}`} onClick={() => toggleMax(p.id)}>{isMax ? "▭" : "▢"}</button>}
            </span>
          </header>
          <div className="console-body">{out.body}</div>
          {canDrag && <span className="console-resize" aria-hidden="true" onPointerDown={dragStart(p, "resize")} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={pointerAbort} onLostPointerCapture={pointerAbort} />}
        </section>;
      })}
      {ghost && mode === "desktop" && !maxId && <div className={`console-ghost ${drag && drag.valid === false ? "is-invalid" : ""}`} style={{ gridColumn: `${ghost.x / STEP + 1} / ${(ghost.x + ghost.w) / STEP + 1}`, gridRow: `${ghost.y / STEP + 1} / ${(ghost.y + ghost.h) / STEP + 1}` }} aria-hidden="true" />}
    </div>
    {mode === "phone" && quickBar}

    {chooser && <dialog ref={chooserDialog} open={compact ? undefined : true} className="console-pop console-chooser" aria-label="Add panel" onKeyDown={chooserKeyDown} onCancel={event => { event.preventDefault(); if (drilled) backToGroups(); else close(); }} style={{ left: chooser.left, top: popTop, margin: 0, "--pop-top": `${popTop}px` } as React.CSSProperties}>
      {/* One bar: back, where you are, search and close. Everything below it is options. */}
      <header className="console-chooser-bar">
        {drilled && <button type="button" className="console-bar-icon console-back" aria-label="Back" onClick={backToGroups}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" /></svg></button>}
        <h3>{chooser.mode === "nospace" ? "No room for another panel" : drilled ? activeGroup : chooser.mode === "replace" ? "Change panel" : "Add panel"}</h3>
        {chooser.mode !== "nospace" && <label className="console-search"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z" /><path d="M15.5 15.5l4.5 4.5" /></svg><input type="search" aria-label="Search panels" placeholder="Search" value={query} autoFocus onChange={e => setQuery(e.target.value)} /></label>}
        <button type="button" className="console-bar-icon console-close" aria-label="Close" onClick={close}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      </header>
      {chooser.mode === "nospace" ? <>
        <p>Nothing is covered silently. Choose how to make space.</p>
        <div className="console-choice-actions">
          <button type="button" onClick={() => { const p = panels.find(x => x.id === ws.focus) || panels[0]; if (!p) return; setChooser(c => c && { ...c, mode: "replace", panelId: p.id }); }}>Replace the focused panel</button>
          <button type="button" onClick={() => { const p = panels.find(x => x.id === ws.focus) || panels[0]; if (!p) return; const pd = def(p.type); const s = split(p, p.w >= p.h ? "h" : "v", { w: pd?.minW || STEP, h: pd?.minH || STEP }); if (!s) { notify("The focused panel is too small to split."); return; } splitUndo.current = view ? { viewId: view.id, panels: clone(panels) } : null; ws.setPanels(ps => ps.map(x => x.id === p.id ? { ...x, ...s.keep } : x)); setChooser(c => c && { ...c, mode: "add", rect: s.rest }); }}>Split the focused panel</button>
          <button type="button" onClick={() => { if (!view) return; const id = `v-${uid()}`; onViewsChange(storeAsNew(ws.views, [], "New view", id), "New empty view created. Save to keep it."); ws.setViewId(id); setChooser(c => c && { ...c, mode: "add", rect: { x: 0, y: 0, w: COLS, h: ROWS } }); }}>Create a new view</button>
        </div>
      </> : !query && !activeGroup ? <div className={`console-groups ${groupIcons ? "is-tiles" : ""}`} role="group" aria-label="Panel categories">{groups.map(g => <button key={g} type="button" data-group={g} aria-current={g === currentGroup || undefined} onClick={() => openGroup(g)}>{groupIcons?.[g] && <svg className="console-group-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{groupIcons[g].map((d, i) => <path key={i} d={d} />)}</svg>}<span>{g}</span></button>)}</div>
        : <div className="console-choices">
          {choices.length ? choices.map(d => <button key={d.type} type="button" onClick={() => place(d.type)}><strong>{d.name}{panels.some(p => p.type === d.type) && <small> · open</small>}</strong><span>{d.description}</span></button>) : <p>No panels match.</p>}
        </div>}
    </dialog>}

    {menu && <div ref={menuRef} className="console-pop console-menu" role="menu" aria-orientation="vertical" onKeyDown={menuKeyDown} aria-label={menu.kind === "panel" ? "Panel options" : "View options"} style={{ left: menu.left, top: menu.top }}>
      <div className="console-menu-head"><p className="console-menu-title">{menuTitle}</p><button type="button" className="console-menu-x" aria-label="Close menu" onClick={close}><span aria-hidden="true">✕</span></button></div>
      {menu.kind === "panel" && menuPanel && (menu.sub === "move" ? <>
        <div className="console-pad">
          <button type="button" role="menuitem" aria-label="Move left" onClick={() => doNudge({ x: -STEP })}>←</button><button type="button" role="menuitem" aria-label="Move up" onClick={() => doNudge({ y: -STEP })}>↑</button><button type="button" role="menuitem" aria-label="Move down" onClick={() => doNudge({ y: STEP })}>↓</button><button type="button" role="menuitem" aria-label="Move right" onClick={() => doNudge({ x: STEP })}>→</button>
          <button type="button" role="menuitem" onClick={() => doNudge({ w: STEP })}>Wider</button><button type="button" role="menuitem" onClick={() => doNudge({ w: -STEP })}>Narrower</button><button type="button" role="menuitem" onClick={() => doNudge({ h: STEP })}>Taller</button><button type="button" role="menuitem" onClick={() => doNudge({ h: -STEP })}>Shorter</button>
        </div>
        <button type="button" role="menuitem" onClick={() => setMenu({ ...menu, sub: undefined })}>Done</button>
      </> : <>
        <button type="button" role="menuitem" onClick={() => { const pos = { left: menu.left - 200, top: menu.top }; setMenu(null); openChooser({ mode: "replace", panelId: menuPanel.id }, pos.left, pos.top); }}>Change panel…</button>
        {mode === "desktop" && <button type="button" role="menuitem" onClick={() => setMenu({ ...menu, sub: "move" })}>Move and size…</button>}
        {mode === "desktop" && <button type="button" role="menuitem" onClick={() => doSplit("h")}>Split side by side</button>}
        {mode === "desktop" && <button type="button" role="menuitem" onClick={() => doSplit("v")}>Split top and bottom</button>}
        <button type="button" role="menuitem" onClick={() => { toggleMax(menuPanel.id); close(); }}>{maxId === menuPanel.id ? "Restore" : "Maximize"}</button>
        <button type="button" role="menuitem" className="danger" onClick={() => closePanel(menuPanel.id)}>Close panel</button>
      </>)}
      {menu.kind === "view" && view && (menu.sub === "rename" ? <>
        <label className="console-rename">View name<input value={rename} autoFocus onChange={e => setRename(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commitRename(); }} /></label>
        <button type="button" role="menuitem" onClick={commitRename}>Rename</button>
      </> : <>
        <button type="button" role="menuitem" onClick={storeUpdate} disabled={!changed}>Update “{view.name}”</button>
        <button type="button" role="menuitem" onClick={storeNew}>Store as new view</button>
        <button type="button" role="menuitem" onClick={revert} disabled={!changed}>Revert to stored</button>
        <button type="button" role="menuitem" onClick={() => { setRename(view.name); setMenu({ ...menu, sub: "rename" }); }}>Rename…</button>
        <button type="button" role="menuitem" onClick={duplicate}>Duplicate</button>
        <button type="button" role="menuitem" className="danger" onClick={remove} disabled={ws.views.length < 2}>Delete view</button>
        <p className="console-menu-note">Views store arrangements only. Deleting one never deletes records.</p>
      </>)}
    </div>}
  </div>;
}
