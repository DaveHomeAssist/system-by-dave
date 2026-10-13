import { useEffect, useRef, useState } from "react";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import { useVideoPack } from "./pack";

const RAIL_SELECT_EVENT = "sbd:rail-console-select";
const RAIL_ACTIVE_EVENT = "sbd:console-snapshot-active";

/* Standalone AV Video host: the pack inside its own workspace with page chrome
   and the production Rail. The suite shell at /av/ mounts the same pack beside
   the other applications; other Rail entries here follow their standalone
   routes until that shell replaces this page. */
export function App() {
  const workspace = useRef<ReturnType<typeof useConsoleWorkspace> | null>(null);
  const [host] = useState(() => ({
    show: (type: string) => workspace.current?.show(type) ?? false,
    notify: (_text: string, _error?: boolean) => undefined,
    resetLayout: () => { workspace.current?.setLive({}); workspace.current?.setMax({}); },
  }));
  const pack = useVideoPack(host);
  const ws = useConsoleWorkspace(pack.views, pack.library, pack.layout);
  workspace.current = ws;
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || "light");
  useEffect(() => { window.dispatchEvent(new CustomEvent(RAIL_ACTIVE_EVENT, { detail: { ref: "console:av-video" } })); }, []);
  useEffect(() => {
    const select = (event: Event) => {
      if ((event as CustomEvent<{ ref?: string }>).detail?.ref !== "console:av-video") return;
      event.preventDefault(); workspace.current?.setViewId(pack.views[0]?.id || "");
    };
    window.addEventListener(RAIL_SELECT_EVENT, select);
    return () => window.removeEventListener(RAIL_SELECT_EVENT, select);
  }, [pack.views]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (pack.dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [pack.dirty]);
  function changeTheme(value: string) {
    document.documentElement.dataset.avTheme = value; setTheme(value);
    try { localStorage.setItem("av-theme-mode.v1", value); } catch { /* theme for this visit only */ }
  }
  const offer = pack.recovery.offer;
  return <div className="video-app">
    <header className="app-header"><div className="app-identity"><span className="app-mark" aria-hidden="true">Vi</span><div><h1>AV Video</h1><p className="header-plan" title={pack.title}>{pack.title} · {pack.summary.split(" · ").at(-1)}</p></div></div>
      <div className="header-actions"><label className="theme-label"><span>Theme</span><select aria-label="Theme" value={theme} onChange={e => changeTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label><button type="button" className="primary" onClick={() => void pack.save()}>Save{pack.dirty ? " •" : ""}</button><button type="button" onClick={pack.exportDoc}>Export</button></div>
    </header>
    <div className="plan-bar"><div className="plan-summary"><strong title={pack.title}>{pack.title}</strong><span>{pack.summary}</span></div>{pack.actions}</div>
    {offer && <div className="draft-offer" role="alert"><p><strong>Unsaved edits</strong> from {new Date(offer.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}<span className="draft-more"> were kept on this device. Restore them to keep working, then Save.</span></p><div className="row-actions"><button type="button" className="primary" onClick={() => void pack.recovery.restore()}>Restore draft</button><button type="button" onClick={() => void pack.recovery.discard()}>Discard draft</button></div></div>}
    <main id="workspace" tabIndex={-1} className="workspace-host">
      <ConsoleWorkspace ws={ws} label="AV Video" quick={pack.quick} render={pack.render} onViewsChange={pack.storeViews} notify={text => host.notify(text)} />
    </main>
    <footer role="status" className={`message ${pack.problem ? "error" : ""}`}>{[...pack.recovery.errors, pack.status].join(" ")}</footer>
    {pack.dialogs}
  </div>;
}
