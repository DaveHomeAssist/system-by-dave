import { useEffect, useMemo, useRef, useState } from "react";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import { readLayout, writeLayout, type LayoutState } from "../../shared/av-console/drafts";
import type { Panel, View } from "../../shared/av-console/layout";
import { showContext, type Pack, type PackHost } from "../../shared/av-console/pack";
import { PACKS, SPECIALISTS, specialistHref } from "./packs";
import { appOf, BLANK_VIEW, defaultViews, LAYOUT_KEY, loadViews, nativePanels, packLibrary, saveViews, shortOf, SUITE_PREFIX, TOOL_PREFIX, viewApp } from "./views";

/* AV Suite shell (docs/av-suite-shell.md): one console. Every application is a
   native panel pack mounted here; standalone tools are links, never tiles. The Rail
   recalls each application's views in this same workspace. */
const RAIL_SELECT_EVENT = "sbd:rail-console-select";
const RAIL_ACTIVE_EVENT = "sbd:console-snapshot-active";
type Status = { app: string; text: string; error: boolean };

function railRef(app: string, toolId?: string) {
  if (app === SUITE_PREFIX) return "toolbox";
  if (app === TOOL_PREFIX) { const tool = SPECIALISTS.find(entry => entry.id === toolId); return tool?.consoleId ? `console:${tool.consoleId}` : `tool:${toolId}`; }
  const pack = PACKS.find(entry => entry.id === app);
  return pack ? `console:${pack.consoleId}` : "";
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
  const library = useMemo(() => PACKS.flatMap(packLibrary), []);
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
  const activeTool = activeApp === TOOL_PREFIX ? shortOf(ws.viewId) : "";
  const activePack = packs.find(pack => pack.id === activeApp);
  const lastView = useRef<Record<string, string>>({});
  const viewsRef = useRef(views); viewsRef.current = views;
  useEffect(() => {
    if (activeApp) lastView.current[activeApp === TOOL_PREFIX ? ws.viewId : activeApp] = ws.viewId;
    const ref = railRef(activeApp, activeTool);
    if (ref) window.dispatchEvent(new CustomEvent(RAIL_ACTIVE_EVENT, { detail: { ref } }));
  }, [ws.viewId, activeApp, activeTool]);
  useEffect(() => {
    if (initialViews.error) setStatus({ app: "", text: initialViews.error, error: true });
    const requested = new URLSearchParams(location.search).get("app");
    if (requested) openApp(requested);
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
    // Standalone tools retain their normal Rail links, not nested applications.
    return false;
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
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || "dark");
  useEffect(() => {
    const receive = (event: StorageEvent) => { if (event.key === "av-theme-mode.v1" && ["light", "dark", "system"].includes(event.newValue || "")) { document.documentElement.dataset.avTheme = event.newValue!; setTheme(event.newValue!); } };
    window.addEventListener("storage", receive); return () => window.removeEventListener("storage", receive);
  }, []);
  function changeTheme(value: string) {
    document.documentElement.dataset.avTheme = value; setTheme(value);
    for (const meta of Array.from(document.querySelectorAll<HTMLMetaElement>("meta[data-av-theme-color]"))) meta.media = value === "system" ? `(prefers-color-scheme: ${meta.dataset.avThemeColor})` : meta.dataset.avThemeColor === value ? "all" : "not all";
    try { localStorage.setItem("av-theme-mode.v1", value); } catch { setStatus({ app: "", text: "Theme changed for this visit; browser preferences could not be saved.", error: true }); }
  }
  function storeViews(next: View[], text: string) {
    try { saveViews(localStorage, next); setViews(next); setStatus({ app: "", text: text.replace(/ in the plan/, " in this console").replace(/ Save to keep it\.?/, ""), error: false }); }
    catch (error) { setViews(next); setStatus({ app: "", text: `${error instanceof Error ? error.message : "Views could not be stored."} They stay for this visit.`, error: true }); }
  }
  function render(type: string, panel: Panel) {
    const app = appOf(type), short = shortOf(type);
    const pack = packs.find(entry => entry.id === app);
    return pack ? pack.render(short, panel) : { body: <p className="muted">This panel is not available.</p> };
  }
  const viewTabs = views.filter(view => viewApp(view) === activeApp && (activeApp !== TOOL_PREFIX || view.id === ws.viewId));
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
  return <div className="suite-app" data-active-app={activeApp}>
    <header className="suite-header">
      <div className="suite-identity"><span className="suite-mark" aria-hidden="true">AV</span><div><h1>{activeTitle}</h1><p className="suite-plan" title={activePack?.title}>{activePack ? `${activePack.title} · ${activePack.dirty ? "Unsaved" : "Saved"}` : activeTool ? "Specialist tool · own saved data" : "Empty workspace · add any panel"}</p></div></div>
      {context && <span className="suite-context" aria-label="Read-only show context">{context}</span>}
      <div className="suite-actions">
        {activePack?.actions}
        <label className="theme-label"><span>Theme</span><select aria-label="Theme" value={theme} onChange={e => changeTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
        <button type="button" className="primary" disabled={!activePack || activePack.blocked} onClick={() => void activePack?.save()}>Save{activePack?.dirty ? " •" : ""}</button>
        <button type="button" disabled={!activePack} onClick={() => activePack?.exportDoc()}>Export</button>
      </div>
    </header>
    <div className="suite-bar"><span className="suite-summary">{activePack ? activePack.summary : "Tap empty space or + Add panel to call up any individual panel from any department. Store the arrangement as a view."}{offline === "ready" && <span className="suite-offline">Offline ready</span>}</span>{dirtyApps.length > 0 && <span className="suite-dirty" title={dirtyApps.join(", ")}>Unsaved: {dirtyApps.join(", ")}</span>}</div>
    {offer && activePack && <div className="draft-offer" role="alert"><p><strong>{activePack.label} unsaved edits</strong> from {new Date(offer.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}<span className="draft-more"> were kept on this device. Restore them to keep working, then Save.</span></p><div className="row-actions"><button type="button" className="primary" onClick={() => void activePack.recovery.restore()}>Restore draft</button><button type="button" onClick={() => void activePack.recovery.discard()}>Discard draft</button></div></div>}
    <main id="workspace" tabIndex={-1} className="workspace-host">
      {ws.hidden > 0 && <div className="console-notice" role="note">{ws.hidden} unavailable saved slot{ws.hidden === 1 ? " is" : "s are"} retained in this layout. Whole apps no longer run inside tiles. Add individual panels here; standalone tools keep their own saved data.{SPECIALISTS.filter(tool => (ws.live[ws.viewId] || ws.view?.panels || []).some(panel => panel.type === `${TOOL_PREFIX}:${tool.id}`)).map(tool => <a key={tool.id} href={specialistHref(tool)} target="_blank" rel="noopener noreferrer"> Open {tool.label} separately</a>)}</div>}
      <ConsoleWorkspace ws={{ ...ws, hidden: 0 }} label="AV Suite" quick={quick} render={render} onViewsChange={storeViews} notify={text => setStatus({ app: "", text, error: false })} viewTabs={viewTabs} defaultGroup={activePack?.label || "AV Video"} />
    </main>
    <footer role="status" className={`message ${status.error || activePack?.problem ? "error" : ""}`}>{[...(activePack?.recovery.errors || []), status.app ? `${status.app}: ${status.text}` : status.text].join(" ")}</footer>
    {packs.map(pack => <div key={pack.id} data-pack-dialogs={pack.id}>{pack.dialogs}</div>)}
  </div>;
}
