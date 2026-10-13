import { useEffect, useRef, useState } from 'react';
import { ConsoleWorkspace, useConsoleWorkspace } from '../../shared/av-console/Workspace';
import { useLightingPack } from './pack';

/* Standalone Lighting host: the pack inside its own workspace with page chrome.
   The suite shell at /av/ mounts the same pack beside the other applications. */
export function App() {
  const workspace = useRef<ReturnType<typeof useConsoleWorkspace> | null>(null);
  const controls = useRef<HTMLDialogElement>(null);
  const [compact, setCompact] = useState(window.innerHeight < 500);
  const [host] = useState(() => ({
    show: (type: string) => workspace.current?.show(type) ?? false,
    notify: (_text: string, error?: boolean) => { if (error && window.innerHeight < 500 && !controls.current?.open) controls.current?.showModal(); },
    resetLayout: () => { workspace.current?.setLive({}); workspace.current?.setMax({}); },
  }));
  const pack = useLightingPack(host);
  const ws = useConsoleWorkspace(pack.views, pack.library, pack.layout);
  workspace.current = ws;
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || 'dark');
  const darkTheme = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const resize = () => { setCompact(window.innerHeight < 500); controls.current?.close(); };
    const receive = (event: StorageEvent) => { if (event.key === 'av-theme-mode.v1' && ['light', 'dark', 'system'].includes(event.newValue || '')) setTheme(event.newValue!); };
    window.addEventListener('resize', resize); window.addEventListener('storage', receive);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('storage', receive); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.avTheme = theme;
    for (const meta of Array.from(document.querySelectorAll<HTMLMetaElement>('meta[data-av-theme-color]'))) meta.media = theme === 'system' ? `(prefers-color-scheme: ${meta.dataset.avThemeColor})` : meta.dataset.avThemeColor === theme ? 'all' : 'not all';
  }, [theme]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (pack.dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [pack.dirty]);
  function toggleTheme() {
    const next = darkTheme ? 'light' : 'dark'; setTheme(next);
    try { localStorage.setItem('av-theme-mode.v1', next); } catch { /* theme for this visit only */ }
  }
  const header = <header className="lighting-header"><div><small>AV BY DAVE / LIGHTING</small><h1>Lighting</h1><p>{pack.title}{pack.dirty ? ' · unsaved' : ''}</p></div><div className="lighting-header-actions"><button onClick={toggleTheme}>{darkTheme ? 'Light mode' : 'Dark mode'}</button><button id="saveBtn" className="primary" onClick={() => void pack.save()}>Save plan</button></div></header>;
  const notice = <footer id="footerMessage" className="lighting-status" role="status" aria-live="polite">{pack.status}{pack.recovery.errors.map(error => <span key={error}>{error}</span>)}</footer>;
  const recoveryControls = pack.recovery.offer && <section className="lighting-recovery" aria-label="Draft recovery"><p>Unsaved draft available.{pack.recovery.offer.baseline !== null && ' Check whether the saved plan changed since this draft.'}</p><button disabled={pack.blocked} onClick={() => void pack.recovery.restore()}>Restore draft</button><button onClick={() => void pack.recovery.discard()}>Discard draft</button></section>;
  return <main id="main" className={`lighting-app${compact ? ' lighting-compact' : ''}`} tabIndex={-1}>
    {compact ? <dialog ref={controls} className="lighting-controls" aria-label="Lighting controls">{header}{recoveryControls}{notice}<button onClick={() => controls.current?.close()}>Back to panels</button></dialog> : header}
    <div className="lighting-summary">{pack.summary.split(' · ').map(part => <span key={part}>{part}</span>)}</div>
    {!compact && recoveryControls}
    <ConsoleWorkspace ws={compact ? { ...ws, mode: 'phone' } : ws} label="Lighting" extraViews={compact && <button aria-label="Lighting controls" onClick={() => controls.current?.showModal()}>Plan{pack.dirty ? ' *' : ''}{pack.recovery.offer || pack.recovery.errors.length ? ' !' : ''}</button>} quick={pack.quick} render={pack.render} onViewsChange={pack.storeViews} notify={text => host.notify(text)} />
    {!compact && notice}
    {pack.dialogs}
  </main>;
}
