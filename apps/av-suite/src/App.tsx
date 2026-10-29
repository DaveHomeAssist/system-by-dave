import { GEAR_PANELS, GearViewerPanel, gearHref } from './gear-panel/GearViewerPanel';
import { useEffect, useMemo, useRef, useState } from "react";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import { readLayout, writeLayout, type LayoutState } from "../../shared/av-console/drafts";
import type { Panel, View } from "../../shared/av-console/layout";
import { CONTEXT_KEYS, showContext, type Pack, type PackHost } from "../../shared/av-console/pack";
import { PACKS, SPECIALISTS, specialistHref } from "./packs";
import { appOf, BLANK_VIEW, defaultViews, LAYOUT_KEY, loadViews, nativePanels, packLibrary, saveViews, shortOf, specialistLibrary, SUITE_PREFIX, TOOL_PREFIX, viewApp, viewTool } from "./views";

/* AV Suite shell (docs/av-suite-shell.md): one console. Every application is a
   native panel pack mounted here; specialist tools without a pack yet are
   chrome-less panels of their own pages (Dave, 2026-10-15). The Rail recalls
   each application's views in this same workspace. */
const RAIL_SELECT_EVENT = "sbd:rail-console-select";
const RAIL_ACTIVE_EVENT = "sbd:console-snapshot-active";
const FOCUS_KEY = "sbd.avSuite.focus.v1";
const PALETTES = ["light", "dark", "white", "black"] as const;
type Palette = typeof PALETTES[number];
type ThemeMode = Palette | "system";
type Status = { app: string; text: string; error: boolean };

function railRef(app: string, toolId?: string) {
  if (app === SUITE_PREFIX) return "toolbox";
  if (app === TOOL_PREFIX) { const tool = SPECIALISTS.find(entry => entry.id === toolId); return tool?.consoleId ? `console:${tool.consoleId}` : `tool:${toolId}`; }
  const pack = PACKS.find(entry => entry.id === app);
  return pack ? `console:${pack.consoleId}` : "";
}
/* A specialist panel is its own page with the show context forwarded and its
   chrome hidden; nothing else from this page's query reaches it. */
function embedHref(href: string) {
  const target = new URL(href, location.origin);
  const source = new URLSearchParams(location.search);
  for (const key of CONTEXT_KEYS) if (source.has(key)) target.searchParams.set(key, source.get(key)!);
  target.searchParams.set("sbdEmbed", "panel");
  return `${target.pathname}${target.search}`;
}

export function App() {
  const workspace = useRef<ReturnType<typeof useConsoleWorkspace> | null>(null);
  const [status, setStatus] = useState<Status>({ app: "", text: "Ready. Pick an application on the Rail, or add any panel to this view.", error: false });
  const [hosts] = useState<Record<string, PackHost>>(() => Object.fromEntries(PACKS.map(def => [def.id, {
    show: (type: string) => workspace.current?.show(`${def.id}:${type}`) ?? false,
    notify: (text: string, error = false) => setStatus({ app: def.label, text, error }),
    resetLayout: () => { workspace.current?.setMax({}); },
    panels: () => (workspace.current?.panels || []).filter(panel => appOf(panel.type) === def.id).map(panel => shortOf(panel.type)),
    mode: () => workspace.current?.mode || "desktop",
  }])));
  // PACKS is a module constant, so this hook order never changes between renders.
  const packs: Pack[] = PACKS.map(def => def.use(hosts[def.id]));
  const library = useMemo(() => [...PACKS.flatMap(packLibrary), ...specialistLibrary(), ...GEAR_PANELS], []);
  const [initialViews] = useState(() => loadViews(localStorage, defaultViews(PACKS)));
  const [views, setViews] = useState<View[]>(initialViews.views);
  const [layoutPersist] = useState(() => {
    let initial: LayoutState | null = null; try { initial = readLayout(localStorage, LAYOUT_KEY); } catch { /* reported on write */ }
    if (initial) initial = { ...initial, live: Object.fromEntries(Object.entries(initial.live).map(([id, panels]) => [id, nativePanels(panels)])) };
    return { initial, save: (state: LayoutState) => { let ok = false; try { ok = writeLayout(localStorage, LAYOUT_KEY, state); } catch { /* report below */ } if (!ok) setStatus({ app: "", text: "Layout could not be saved. This arrangement is available for this visit only.", error: true }); } };
  });
  const ws = useConsoleWorkspace(views, library, layoutPersist);
  workspace.current = ws;
  const activeApp = viewApp(ws.view);
  const activeTool = viewTool(ws.view);
  const activePack = packs.find(pack => pack.id === activeApp);
  // The view each application or specialist was last on, so the Rail recalls stored arrangements, not defaults.
  const lastView = useRef<Record<string, string>>({});
  const viewsRef = useRef(views); viewsRef.current = views;
  useEffect(() => {
    if (activeApp) lastView.current[activeApp === TOOL_PREFIX ? `${TOOL_PREFIX}:${activeTool}` : activeApp] = ws.viewId;
    const ref = railRef(activeApp, activeTool);
    if (ref) window.dispatchEvent(new CustomEvent(RAIL_ACTIVE_EVENT, { detail: { ref } }));
  }, [ws.viewId, activeApp, activeTool]);
  const requestedGearOpened = useRef(false);
  useEffect(() => {
    if (initialViews.error) setStatus({ app: "", text: initialViews.error, error: true });
    const requested = new URLSearchParams(location.search).get("app");
    if (requested) openApp(requested);
    const gear = new URLSearchParams(location.search).get("gear");
    if ((gear === "ion" || gear === "wing" || gear === "smartfade1248" || gear === "smartfade1248-second") && !requestedGearOpened.current) {
      requestedGearOpened.current = true;
      if (!ws.show(`gear:${gear}`)) setStatus({ app: "Gear 3D", text: "No room in this view. Add the gear panel to an empty workspace area.", error: true });
    }
  }, []);
  function openApp(id: string): boolean {
    const current = viewsRef.current;
    if (id === "toolbox" || id === "workspace") {
      const blank = current.find(view => view.id === BLANK_VIEW.id);
      if (!blank) return false;
      ws.setViewId(blank.id); setStatus({ app: "", text: "Empty workspace. Add any panel, or pick an application on the Rail.", error: false }); return true;
    }
    const pack = PACKS.find(entry => entry.id === id || entry.consoleId === id);
    if (pack) {
      const target = current.find(view => view.id === lastView.current[pack.id]) || current.find(view => viewApp(view) === pack.id);
      if (!target) return false;
      ws.setViewId(target.id); setStatus({ app: pack.label, text: `${pack.label} ready.`, error: false }); return true;
    }
    const tool = SPECIALISTS.find(entry => entry.id === id || entry.consoleId === id);
    if (!tool) return false;
    const key = `${TOOL_PREFIX}:${tool.id}`;
    const target = current.find(view => view.id === lastView.current[key]) || current.find(view => view.id === key) || current.find(view => viewTool(view) === tool.id);
    if (!target) return false;
    ws.setViewId(target.id); setStatus({ app: tool.label, text: `${tool.label} opened as a panel. Open full for its own page.`, error: false }); return true;
  }
  useEffect(() => {
    const select = (event: Event) => {
      const detail = (event as CustomEvent<{ ref?: string }>).detail;
      const ref = detail?.ref || "";
      const id = ref.slice(ref.indexOf(":") + 1);
      if (openApp(id)) event.preventDefault();
    };
    window.addEventListener(RAIL_SELECT_EVENT, select);
    return () => window.removeEventListener(RAIL_SELECT_EVENT, select);
  }, []);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (packs.some(pack => pack.dirty || pack.pending)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", leave); return () => window.removeEventListener("beforeunload", leave);
  }, [packs.map(pack => pack.dirty || pack.pending).join(",")]);
  const systemQuery = useMemo(() => matchMedia("(prefers-color-scheme: dark)"), []);
  const [systemPalette, setSystemPalette] = useState<Palette>(() => systemQuery.matches ? "dark" : "light");
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const value = document.documentElement.dataset.avTheme;
    return value === "system" || PALETTES.includes(value as Palette) ? value as ThemeMode : "dark";
  });
  const [focusMode, setFocusMode] = useState(() => {
    let active = false; try { active = localStorage.getItem(FOCUS_KEY) === "true"; } catch { /* focus remains available for this visit */ }
    document.documentElement.dataset.avFocus = active ? "true" : "false";
    return active;
  });
  useEffect(() => {
    const receive = (event: MediaQueryListEvent) => setSystemPalette(event.matches ? "dark" : "light");
    systemQuery.addEventListener("change", receive); return () => systemQuery.removeEventListener("change", receive);
  }, [systemQuery]);
  useEffect(() => {
    const receive = (event: StorageEvent) => { if (event.key === "av-theme-mode.v1" && (event.newValue === "system" || PALETTES.includes(event.newValue as Palette))) { document.documentElement.dataset.avTheme = event.newValue!; setTheme(event.newValue as ThemeMode); } };
    window.addEventListener("storage", receive); return () => window.removeEventListener("storage", receive);
  }, []);
  function changeTheme(value: ThemeMode) {
    document.documentElement.dataset.avTheme = value; setTheme(value);
    for (const meta of Array.from(document.querySelectorAll<HTMLMetaElement>("meta[data-av-theme-color]"))) meta.media = value === "system" ? (["light", "dark"].includes(meta.dataset.avThemeColor || "") ? `(prefers-color-scheme: ${meta.dataset.avThemeColor})` : "not all") : meta.dataset.avThemeColor === value ? "all" : "not all";
    try { localStorage.setItem("av-theme-mode.v1", value); } catch { setStatus({ app: "", text: "Theme changed for this visit; browser preferences could not be saved.", error: true }); }
  }
  function toggleFocus() {
    const next = !focusMode;
    document.documentElement.dataset.avFocus = next ? "true" : "false"; setFocusMode(next);
    try { localStorage.setItem(FOCUS_KEY, String(next)); } catch { setStatus({ app: "", text: "Focus mode changed for this visit; browser preferences could not be saved.", error: true }); }
  }
  function storeViews(next: View[], text: string) {
    try { saveViews(localStorage, next); setViews(next); setStatus({ app: "", text: text.replace(/ in the plan/, " in this console").replace(/ Save to keep it\.?/, ""), error: false }); }
    catch (error) { setViews(next); setStatus({ app: "", text: `${error instanceof Error ? error.message : "Views could not be stored."} They stay for this visit.`, error: true }); }
  }
  function render(type: string, panel: Panel) {
    const app = appOf(type), short = shortOf(type);
    if (app === "gear" && (short === "ion" || short === "wing" || short === "smartfade1248" || short === "smartfade1248-second")) return {
      body: <GearViewerPanel viewId={ws.viewId} panelId={panel.id} gear={short} theme={theme === "system" ? systemPalette : theme} />,
      context: "Private gear viewer · local practice only",
      actions: <a className="suite-app-open" href={gearHref(short)} target="_blank" rel="noopener noreferrer">Open full</a>,
    };
    if (app === TOOL_PREFIX) {
      const tool = SPECIALISTS.find(entry => entry.id === short);
      if (!tool) return { body: <p className="muted">This tool is not available.</p> };
      const href = specialistHref(tool);
      return { body: <iframe className="suite-app-frame" src={embedHref(href)} title={tool.label} />, context: "Own page and saved data", actions: <a className="suite-app-open" href={href} target="_blank" rel="noreferrer">Open full</a> };
    }
    const pack = packs.find(entry => entry.id === app);
    return pack ? pack.render(short, panel) : { body: <p className="muted">This panel is not available.</p> };
  }
  const viewTabs = views.filter(view => viewApp(view) === activeApp && (activeApp !== TOOL_PREFIX || viewTool(view) === activeTool));
  const quick = activePack ? activePack.quick.map(item => ({ ...item, type: `${activePack.id}:${item.type}` })) : [];
  const activeTitle = activePack ? activePack.label : SPECIALISTS.find(entry => entry.id === activeTool)?.label || "AV by Dave";
  const [offline, setOffline] = useState(document.documentElement.dataset.workspaceOffline || "");
  useEffect(() => {
    const observer = new MutationObserver(() => setOffline(document.documentElement.dataset.workspaceOffline || ""));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-workspace-offline"] });
    return () => observer.disconnect();
  }, []);
  const context = showContext();
  const offer = activePack?.recovery.offer;
  const dirtyApps = packs.filter(pack => pack.dirty).map(pack => pack.label);
  // Hidden legacy app slots must not collide with a newly chosen native panel.
  // Only an explicit arrangement action changes the live layout; saved views stay intact.
  const panelWorkspace = {
    ...ws, hidden: 0,
    setPanels: (change: (panels: Panel[]) => Panel[]) => ws.setPanels(current => change(current.filter(panel => library.some(def => def.type === panel.type)))),
    // Menu selection must supersede the phone quick bar's previously selected type.
    setFocus: (id: Parameters<typeof ws.setFocus>[0]) => { ws.setPhoneType(null); ws.setFocus(id); },
  };
  return <div className="suite-app" data-active-app={activeApp}>
    <header className="suite-header">
      <div className="suite-identity"><span className="suite-mark" aria-hidden="true">AV</span><div><h1>{activeTitle}</h1><p className="suite-plan" title={activePack?.title}>{activePack ? `${activePack.title} · ${activePack.dirty ? "Unsaved" : "Saved"}` : activeTool ? "Specialist tool · own saved data" : "Empty workspace · add any panel"}</p></div></div>
      {context && <span className="suite-context" aria-label="Read-only show context">{context}</span>}
      <div className="suite-actions">
        {activePack?.actions}
        <button type="button" className="focus-toggle" aria-label={focusMode ? "Exit focus" : "Focus"} aria-pressed={focusMode} title={focusMode ? "Restore workspace chrome" : "Collapse workspace chrome"} onClick={toggleFocus}><svg aria-hidden="true" viewBox="0 0 24 24"><path d={focusMode ? "M9 4v5H4m16 0h-5V4m0 16v-5h5M4 15h5v5" : "M9 4H4v5m16 0V4h-5m0 16h5v-5M4 15v5h5"} /></svg><span>{focusMode ? "Exit focus" : "Focus"}</span></button>
        <label className="theme-label"><span>Palette</span><select aria-label="Palette" value={theme === "system" ? systemPalette : theme} onChange={e => changeTheme(e.target.value as Palette)}><option value="light">Light</option><option value="dark">Dark</option><option value="white">White</option><option value="black">Black</option></select></label>
        <label className="follow-system"><input type="checkbox" checked={theme === "system"} onChange={e => changeTheme(e.target.checked ? "system" : systemPalette)} /><span>Follow system</span></label>
        <button type="button" className="primary" disabled={!activePack || activePack.blocked} onClick={() => void activePack?.save()}>Save{activePack?.dirty ? " •" : ""}</button>
        <button type="button" disabled={!activePack} onClick={() => activePack?.exportDoc()}>Export</button>
      </div>
    </header>
    <div className="suite-bar"><span className="suite-summary">{activePack ? activePack.summary : activeTool ? "Panels keep working while this tool runs; its Save lives inside the panel." : "Tap empty space or + Add panel to call up any panel from any department or tool. Store the arrangement as a view."}{offline === "ready" && <span className="suite-offline">Offline ready</span>}</span>{dirtyApps.length > 0 && <span className="suite-dirty" title={dirtyApps.join(", ")}>Unsaved: {dirtyApps.join(", ")}</span>}</div>
    {offer && activePack && <div className="draft-offer" role="alert"><p><strong>{activePack.label} unsaved edits</strong> from {new Date(offer.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}<span className="draft-more"> were kept on this device. Restore them to keep working, then Save.</span></p><div className="row-actions"><button type="button" className="primary" onClick={() => void activePack.recovery.restore()}>Restore draft</button><button type="button" onClick={() => void activePack.recovery.discard()}>Discard draft</button></div></div>}
    <main id="workspace" tabIndex={-1} className="workspace-host">
      {ws.hidden > 0 && <div className="console-notice" role="note">{ws.hidden} unavailable saved slot{ws.hidden === 1 ? " is" : "s are"} retained in this layout. Add panels here; the saved view changes only when you store or update it.</div>}
      <ConsoleWorkspace ws={panelWorkspace} label="AV Suite" quick={quick} render={render} onViewsChange={storeViews} notify={text => setStatus({ app: "", text, error: false })} viewTabs={viewTabs} currentGroup={activePack?.label || (activeApp === TOOL_PREFIX ? "Tools" : undefined)} />
    </main>
    <footer role="status" className={`message ${status.error || activePack?.problem ? "error" : ""}`}>{[...(activePack?.recovery.errors || []), status.app ? `${status.app}: ${status.text}` : status.text].join(" ")}</footer>
    {packs.map(pack => <div key={pack.id} data-pack-dialogs={pack.id}>{pack.dialogs}</div>)}
  </div>;
}
