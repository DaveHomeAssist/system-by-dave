import { useEffect, useRef, useState } from 'react';
import { ConsoleWorkspace, useConsoleWorkspace } from '../../shared/av-console/Workspace';
import { useShowControlPack } from './pack';

/* Standalone Show Control host: the pack inside its own workspace with page
   chrome. The suite shell at /av/ mounts the same pack beside the others. */
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
  const pack = useShowControlPack(host);
  const ws = useConsoleWorkspace(pack.views, pack.library, pack.layout);
  workspace.current = ws;
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || 'dark');
  const darkTheme = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    const resize = () => { setCompact(window.innerHeight < 500); controls.current?.close(); };
    const receiveTheme = (event: StorageEvent) => { if (event.key === 'av-theme-mode.v1' && ['light', 'dark', 'system'].includes(event.newValue || '')) setTheme(event.newValue!); };
    window.addEventListener('resize', resize); window.addEventListener('storage', receiveTheme);
    return () => { clearInterval(timer); window.removeEventListener('resize', resize); window.removeEventListener('storage', receiveTheme); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.avTheme = theme;
    const lightColor = document.querySelector<HTMLMetaElement>('meta[data-av-theme-color="light"]');
    const darkColor = document.querySelector<HTMLMetaElement>('meta[data-av-theme-color="dark"]');
    if (lightColor) lightColor.media = theme === 'system' ? '(prefers-color-scheme: light)' : theme === 'light' ? 'all' : 'not all';
    if (darkColor) darkColor.media = theme === 'system' ? '(prefers-color-scheme: dark)' : theme === 'dark' ? 'all' : 'not all';
  }, [theme]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (pack.dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [pack.dirty]);
  function toggleTheme() {
    const next = darkTheme ? 'light' : 'dark'; setTheme(next);
    try { localStorage.setItem('av-theme-mode.v1', next); } catch { /* theme for this visit only */ }
  }
  const [impactText, hold] = pack.summary.split(/ · (?=HOLD|Human)/);
  const header = <header className="call-header"><div><small>AV BY DAVE / HUMAN CALL TRACKING</small><h1>Show Control</h1><p id="summary">{impactText}{pack.dirty ? ' · unsaved changes' : ''}</p></div><div className="call-actions"><button id="theme" onClick={toggleTheme}>{darkTheme ? 'Light mode' : 'Dark mode'}</button><button id="save" className="primary" disabled={pack.blocked} onClick={() => void pack.save()}>Save run</button></div></header>;
  const notice = <footer id="notice" role="status" aria-live="polite" className="call-status">{pack.status}{pack.recovery.errors.map(error => <span key={error}>{error}</span>)}</footer>;
  const recoveryControls = pack.recovery.offer && <section className="call-recovery" aria-label="Draft recovery"><p>Unsaved draft available. Check whether the saved run changed since this draft.</p><button disabled={pack.blocked} onClick={() => void pack.recovery.restore()}>Restore draft</button><button onClick={() => void pack.recovery.discard()}>Discard draft</button></section>;
  return <main id="main" tabIndex={-1} className={`call-app${compact ? ' call-compact' : ''}`}>
    {compact ? <dialog ref={controls} className="call-controls" aria-label="Show controls">{header}{recoveryControls}{notice}<button onClick={() => controls.current?.close()}>Back to panels</button></dialog> : header}
    <div className="call-summary"><time>{clock}</time><span>{hold}</span></div>
    {!compact && recoveryControls}
    <ConsoleWorkspace ws={compact ? { ...ws, mode: 'phone' } : ws} label="Show Control" extraViews={compact && <button aria-label="Show controls" onClick={() => controls.current?.showModal()}>Show{pack.dirty ? ' *' : ''}{pack.recovery.offer || pack.recovery.errors.length ? ' !' : ''}</button>} quick={pack.quick} render={pack.render} onViewsChange={pack.storeViews} notify={text => pack.notify(text)} />
    {!compact && notice}
    {pack.dialogs}
  </main>;
}
