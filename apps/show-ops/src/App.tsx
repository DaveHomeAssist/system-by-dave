import { useEffect, useRef, useState } from "react";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import { useShowOpsPack } from "./pack";

/* Standalone Show Ops host: the pack inside its own workspace with page chrome.
   The suite shell at /av/ mounts the same pack beside the other applications. */
export function App() {
  const workspace = useRef<ReturnType<typeof useConsoleWorkspace> | null>(null);
  const controls = useRef<HTMLDialogElement>(null);
  const [compact, setCompact] = useState(window.innerHeight < 500);
  const [host] = useState(() => ({
    show: (type: string) => workspace.current?.show(type) ?? false,
    notify: (_text: string, error?: boolean) => { if (error && window.innerHeight < 500 && !controls.current?.open) controls.current?.showModal(); },
    resetLayout: () => { workspace.current?.setLive({}); workspace.current?.setMax({}); },
    panels: () => (workspace.current?.panels || []).map(panel => panel.type),
    mode: () => workspace.current?.mode || 'desktop',
  }));
  const pack = useShowOpsPack(host);
  const ws = useConsoleWorkspace(pack.views, pack.library, pack.layout);
  workspace.current = ws;
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || "dark");
  useEffect(() => {
    const resize = () => { setCompact(window.innerHeight < 500); controls.current?.close(); };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (pack.dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [pack.dirty]);
  function themeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.avTheme = next; setTheme(next);
    try { localStorage.setItem("av-theme-mode.v1", next); } catch { /* theme for this visit only */ }
  }
  const [date, ...counts] = pack.summary.split(" · ");
  const header = <header className="ops-header"><div><small>AV BY DAVE / SHOW OPS</small><h1 id="show-title">{pack.title}</h1><span id="show-date">{date === "No date" ? "Set a date in Document" : date}</span></div><div className="ops-actions"><span id="dirty">{pack.dirty ? "Unsaved edits" : "Saved"}</span><button id="theme" onClick={themeToggle}>{theme === "dark" ? "Light mode" : "Dark mode"}</button><button className="primary" id="save" disabled={pack.blocked} onClick={() => void pack.save()}>Save show</button></div></header>;
  const notice = <footer id="notice" className="ops-status" role="status" aria-live="polite">{pack.status}{pack.recovery.errors.map(error => <span key={error}>{error}</span>)}</footer>;
  const recoveryControls = pack.recovery.offer && <section className="ops-recovery" aria-label="Draft recovery"><p>Unsaved draft available. Check whether the saved show changed since this draft.</p><button onClick={() => void pack.recovery.restore()}>Restore draft</button><button onClick={() => void pack.recovery.discard()}>Discard draft</button></section>;
  return <main id="main" className={`ops-app${compact ? " ops-compact" : ""}`} tabIndex={-1}>
    {compact ? <dialog ref={controls} className="ops-controls" aria-label="Show controls">{header}{recoveryControls}{notice}<button onClick={() => controls.current?.close()}>Back to panels</button></dialog> : header}
    <div className="ops-summary" id="counts">{counts.map(part => <span key={part}><b>{part.split(" ")[0]}</b> {part.split(" ").slice(1).join(" ")}</span>)}</div>
    {!compact && recoveryControls}
    <ConsoleWorkspace ws={compact ? { ...ws, mode: "phone" } : ws} label="Show Ops" extraViews={compact && <button aria-label="Show controls" onClick={() => controls.current?.showModal()}>Show{pack.dirty ? " *" : ""}{pack.recovery.errors.length || pack.recovery.offer ? " !" : ""}</button>} quick={pack.quick} render={pack.render} onViewsChange={pack.storeViews} notify={text => pack.notify(text)} />
    {!compact && notice}
  </main>;
}
