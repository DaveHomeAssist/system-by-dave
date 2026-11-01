import { useEffect, useRef, useState } from 'react';
import { ConsoleWorkspace, useConsoleWorkspace } from '../../shared/av-console/Workspace';
import type { PackHost } from '../../shared/av-console/pack';
import { useEquipmentLabPack } from './pack';
export function App() {
  const workspace = useRef<ReturnType<typeof useConsoleWorkspace> | null>(null);
  const [host] = useState<PackHost>(() => ({ show: type => workspace.current?.show(type) ?? false, notify: () => {}, resetLayout: () => {}, panels: () => workspace.current?.panels.map(panel => panel.type) || [], mode: () => workspace.current?.mode || 'desktop' }));
  const pack = useEquipmentLabPack(host), ws = useConsoleWorkspace(pack.views, pack.library); workspace.current = ws;
  const [short, setShort] = useState(innerHeight < 500);
  const [theme, setTheme] = useState(() => { try { const value = localStorage.getItem('av-theme-mode.v1'); return value && ['light','dark','white','black','system'].includes(value) ? value : 'light'; } catch { return 'light'; } });
  const dark = ['dark','black'].includes(theme) || theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches;
  useEffect(() => { const resize = () => setShort(innerHeight < 500); addEventListener('resize',resize); return () => removeEventListener('resize',resize); }, []);
  useEffect(() => { document.documentElement.dataset.avTheme = theme; for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[data-av-theme-color]')) meta.media = theme === 'system' ? `(prefers-color-scheme: ${meta.dataset.avThemeColor})` : meta.dataset.avThemeColor === (dark ? 'dark' : 'light') ? 'all' : 'not all'; }, [theme, dark]);
  function toggle() { const next = dark ? 'light' : 'dark'; setTheme(next); try { localStorage.setItem('av-theme-mode.v1',next); } catch { /* Theme remains available for this visit. */ } }
  return <main id="main" className="lab-standalone" tabIndex={-1}><header className="lab-header"><h1>Equipment Lab</h1><div><nav aria-label="Breadcrumb" className="lab-nav"><a href="/" className="lab-home">Home</a><a href="/av/">AV workspace</a></nav><button onClick={toggle}>{dark ? 'Light mode' : 'Dark mode'}</button></div></header><ConsoleWorkspace ws={short ? { ...ws, mode: 'phone' } : ws} label="Equipment Lab" quick={pack.quick.map(item => ({ ...item, label: ({ library:'Library',inspector:'Inspect',practice:'Practice',reference:'Reference' } as Record<string,string>)[item.type] }))} render={pack.render} onViewsChange={pack.storeViews} notify={pack.notify} /></main>;
}
