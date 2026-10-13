import { useEffect, useMemo, useRef, useState } from "react";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import { readLayout, writeLayout, type LayoutState } from "../../shared/av-console/drafts";
import type { Panel, View } from "../../shared/av-console/layout";
import { CONTEXT_KEYS, showContext, type Pack, type PackHost } from "../../shared/av-console/pack";
import { PACKS, SPECIALISTS, specialistHref } from "./packs";
import { appOf, defaultViews, LAYOUT_KEY, loadViews, packLibrary, saveViews, shortOf, specialistLibrary, TOOL_PREFIX } from "./views";

/* AV Suite shell (docs/av-suite-shell.md): one console. Every application is a
   panel pack mounted here; specialist tools are chrome-less panels. The Rail
   recalls each application's views in this same workspace. */
const RAIL_SELECT_EVENT = "sbd:rail-console-select";
const RAIL_ACTIVE_EVENT = "sbd:console-snapshot-active";
type Status = { app: string; text: string; error: boolean };

function railRef(app: string, toolId?: string) {
  if (app === TOOL_PREFIX) { const tool = SPECIALISTS.find(entry => entry.id === toolId); return tool?.consoleId ? `console:${tool.consoleId}` : `tool:${toolId}`; }
  const pack = PACKS.find(entry => entry.id === app);
  return pack ? `console:${pack.consoleId}` : "";
}
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
  const library = useMemo(() => [...packs.flatMap(packLibrary), ...specialistLibrary()], [packs.map(pack => pack.library).flat().map(def => def.type).join("|")]);
  const [initialViews] = useState(() => loadViews(localStorage, defaultViews(PACKS)));
  const [views, setViews] = useState<View[]>(initialViews.views);
  const [layoutPersist] = useState(() => {
    let initial: LayoutState | null = null; try { initial = readLayout(localStorage, LAYOUT_KEY); } catch { /* reported on write */ }
    return { initial, save: (state: LayoutState) => { let ok = false; try { ok = writeLayout(localStorage, LAYOUT_KEY, state); } catch { /* report below */ } if (!ok) setStatus({ app: "", text: "Layout could not be saved. This arrangement is available for this visit only.", error: true }); } };
  });
  const ws = useConsoleWorkspace(views, library, layoutPersist);
  workspace.current = ws;
  const activeApp = appOf(ws.viewId);
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
    const pack = PACKS.find(entry => entry.id === id || entry.consoleId === id);
    if (pack) {
      const target = current.find(view => view.id === lastView.current[pack.id]) || current.find(view => appOf(view.id) === pack.id);
      if (!target) return false;
      ws.setViewId(target.id); setStatus({ app: pack.label, text: `${pack.label} ready.`, error: false }); return true;
    }
    const tool = SPECIALISTS.find(entry => entry.id === id || entry.consoleId === id);
    if (!tool) return false;
    const target = current.find(view => view.id === `${TOOL_PREFIX}:${tool.id}`) || current.find(view => view.panels.some(panel => panel.type === `${TOOL_PREFIX}:${tool.id}`));
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
    if (app === TOOL_PREFIX) {
      const tool = SPECIALISTS.find(entry => entry.id === short);
      if (!tool) return { body: <p className="muted">This tool is not available.</p> };
      const href = specialistHref(tool);
      return { body: <iframe className="suite-app-frame" src={embedHref(href)} title={`${tool.label}`} />, context: "Own page and saved data", actions: <a className="suite-app-open" href={href} target="_blank" rel="noreferrer">Open full</a> };
    }
    const pack = packs.find(entry => entry.id === app);
    return pack ? pack.render(short, panel) : { body: <p className="muted">This panel is not available.</p> };
  }
  const viewTabs = views.filter(view => appOf(view.id) === activeApp && (activeApp !== TOOL_PREFIX || view.id === ws.viewId));
  const quick = activePack ? activePack.quick.map(item => ({ ...item, type: `${activePack.id}:${item.type}` })) : [];
  const activeTitle = activePack ? activePack.label : SPECIALISTS.find(entry => entry.id === activeTool)?.label || "AV Suite";
  const context = showContext();
  const offer = activePack?.recovery.offer;
  const dirtyApps = packs.filter(pack => pack.dirty).map(pack => pack.label);
  return <div className="suite-app" data-active-app={activeApp}>
    <header className="suite-header">
      <div className="suite-identity"><span className="suite-mark" aria-hidden="true">AV</span><div><h1>{activeTitle}</h1><p className="suite-plan" title={activePack?.title}>{activePack ? `${activePack.title} · ${activePack.dirty ? "Unsaved" : "Saved"}` : activeTool ? "Specialist tool · own saved data" : "One console for the whole suite"}</p></div></div>
      {context && <span className="suite-context" aria-label="Read-only show context">{context}</span>}
      <div className="suite-actions">
        {activePack?.actions}
        <label className="theme-label"><span>Theme</span><select aria-label="Theme" value={theme} onChange={e => changeTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
        <button type="button" className="primary" disabled={!activePack || activePack.blocked} onClick={() => void activePack?.save()}>Save{activePack?.dirty ? " •" : ""}</button>
        <button type="button" disabled={!activePack} onClick={() => activePack?.exportDoc()}>Export</button>
      </div>
    </header>
    <div className="suite-bar"><span className="suite-summary">{activePack ? activePack.summary : activeTool ? "Panels keep working while this tool runs; its Save lives inside the panel." : ""}</span>{dirtyApps.length > 0 && <span className="suite-dirty" title={dirtyApps.join(", ")}>Unsaved: {dirtyApps.join(", ")}</span>}</div>
    {offer && activePack && <div className="draft-offer" role="alert"><p><strong>{activePack.label} unsaved edits</strong> from {new Date(offer.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}<span className="draft-more"> were kept on this device. Restore them to keep working, then Save.</span></p><div className="row-actions"><button type="button" className="primary" onClick={() => void activePack.recovery.restore()}>Restore draft</button><button type="button" onClick={() => void activePack.recovery.discard()}>Discard draft</button></div></div>}
    <main id="workspace" tabIndex={-1} className="workspace-host">
      <ConsoleWorkspace ws={ws} label="AV Suite" quick={quick} render={render} onViewsChange={storeViews} notify={text => setStatus({ app: "", text, error: false })} viewTabs={viewTabs} defaultGroup={activePack?.label || "Tools"} />
    </main>
    <footer role="status" className={`message ${status.error || activePack?.problem ? "error" : ""}`}>{[...(activePack?.recovery.errors || []), status.app ? `${status.app}: ${status.text}` : status.text].join(" ")}</footer>
    {packs.map(pack => <div key={pack.id} data-pack-dialogs={pack.id}>{pack.dialogs}</div>)}
  </div>;
}
