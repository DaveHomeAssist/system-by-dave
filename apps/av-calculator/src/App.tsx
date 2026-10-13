import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ConsoleWorkspace, useConsoleWorkspace } from '../../shared/av-console/Workspace';
import type { LayoutState } from '../../shared/av-console/drafts';
import type { View } from '../../shared/av-console/layout';
import { CONTEXT, DEFAULT_VIEWS, LIBRARY, LAYOUT_KEY, VIEWS_KEY, load, parseLayout, parseViews, save } from './model';
import { nodes, pagers, parking } from './bridge';

// React owns the frame only. The original engine owns these nodes and listeners.
function Control({ id }: { id: string }) {
  const target = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = nodes.get(id); if (!node) return;
    target.current!.append(node); pagers.get(id)?.refresh();
    return () => { parking.append(node); };
  }, [id]);
  return <div className="calculator-leaf" data-control={id} ref={target} />;
}
export function App() {
  const storage = useMemo(() => ({ getItem: (key: string) => localStorage.getItem(key), setItem: (key: string, value: string) => localStorage.setItem(key, value) }), []);
  const [initial] = useState(() => load(storage, VIEWS_KEY, parseViews, nodes.has('showContextCard') ? [...DEFAULT_VIEWS, { id: 'context', name: 'Context', panels: [{ id: 'context-panel', type: 'showContextCard', x: 0, y: 0, w: 12, h: 8 }] }] : DEFAULT_VIEWS));
  const [initialLayout] = useState(() => load<LayoutState | null>(storage, LAYOUT_KEY, parseLayout, null));
  const [views, setViews] = useState(initial.value);
  const [saved, setSaved] = useState(JSON.stringify(initial.value));
  const baseline = useRef(initial.raw), layoutBaseline = useRef(initialLayout.raw);
  const [message, setMessage] = useState(initial.error || initialLayout.error || 'Inputs autosave. Workspace views save separately. Field estimates require verification.');
  const [compact, setCompact] = useState(innerHeight < 500);
  const controls = useRef<HTMLDialogElement>(null);
  const library = useMemo(() => nodes.has('showContextCard') ? [...LIBRARY, CONTEXT] : LIBRARY, []);
  const saveLayout = useCallback((state: LayoutState) => {
    if (initialLayout.error) return;
    if (!navigator.locks?.request) { setMessage('Layout stays in this visit: safe cross-tab storage is unavailable.'); return; }
    void navigator.locks.request(LAYOUT_KEY, () => {
      try { parseLayout({ v: 1, ...state }); layoutBaseline.current = save(storage, LAYOUT_KEY, { v: 1, ...state }, layoutBaseline.current); }
      catch (error) { setMessage(String(error)); }
    }).catch(error => setMessage(`Layout could not be stored: ${String(error)}`));
  }, [storage, initialLayout.error]);
  const persist = useMemo(() => ({ initial: initialLayout.value, save: saveLayout }), [initialLayout.value, saveLayout]);
  const ws = useConsoleWorkspace(views, library, persist);
  const workspace = useRef(ws); workspace.current = ws;
  const dirty = JSON.stringify(views) !== saved;
  function notify(text: string) { setMessage(text); }
  async function storeViews() {
    try {
      if (initial.error) throw Error(initial.error);
      if (!navigator.locks?.request) throw Error('Safe cross-tab storage unavailable. Views remain in this visit.');
      const snapshot = views; parseViews({ version: 1, views: snapshot });
      baseline.current = await navigator.locks.request(VIEWS_KEY, () => save(storage, VIEWS_KEY, { version: 1, views: snapshot }, baseline.current));
      setSaved(JSON.stringify(snapshot)); notify('Workspace views saved and verified. Calculator and LED values were not changed.');
    } catch (error) { notify(String(error)); controls.current?.showModal(); }
  }
  function changeViews(next: View[]) { setViews(next); notify('View changed. Save views to keep it. Calculator inputs are unchanged.'); }
  useEffect(() => { const resize = () => { setCompact(innerHeight < 500); controls.current?.close(); }; addEventListener('resize', resize); return () => removeEventListener('resize', resize); }, []);
  useEffect(() => {
    const status = nodes.get('actionStatus')!;
    const revealError = () => { if (status.classList.contains('error') && innerHeight < 500 && !controls.current?.open) controls.current?.showModal(); };
    const errors = new MutationObserver(revealError);
    errors.observe(status, { childList: true, attributes: true, attributeFilter: ['class'] });
    revealError(); // The original engine reports startup failures before React mounts.
    const theme = (event: StorageEvent) => { if (event.key === 'av-theme-mode.v1' && ['light', 'dark', 'system'].includes(event.newValue || '')) { document.documentElement.dataset.avTheme = event.newValue!; const dark = event.newValue === 'dark' || (event.newValue === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); const node = nodes.get('themeToggle')!; node.textContent = dark ? 'Light mode' : 'Dark mode'; node.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`); } };
    addEventListener('storage', theme); return () => { errors.disconnect(); removeEventListener('storage', theme); };
  }, []);
  useEffect(() => {
    const fromHash = () => { const id = location.hash.slice(1); if (library.some(p => p.type === id)) workspace.current.show(id); };
    fromHash(); addEventListener('hashchange', fromHash); return () => removeEventListener('hashchange', fromHash);
    // Only location changes select a deep-linked panel; edits must not reselect it.
  }, [library]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', leave); return () => removeEventListener('beforeunload', leave);
  }, [dirty]);
  const header = <header className="calculator-header"><Control id="navigation" /><h1>Calculator</h1><Control id="themeToggle" /><button onClick={() => document.querySelector<HTMLDialogElement>('#fieldSetsDialog')!.showModal()}>Field sets</button><button onClick={() => void storeViews()}>Save views{dirty ? ' *' : ''}</button></header>;
  const notice = <footer className="calculator-status"><Control id="saveStatus" /><Control id="actionStatus" /><p role="status" id="workspaceStatus">{message}</p></footer>;
  return <main id="main-content" className="calculator-app" tabIndex={-1}>
    {compact ? <dialog className="calculator-controls" ref={controls} aria-label="Calculator controls">{header}{notice}<button onClick={() => controls.current?.close()}>Back to panels</button></dialog> : header}
    <ConsoleWorkspace ws={compact ? { ...ws, mode: 'phone' } : ws} label="Calculator" quick={library.map(p => ({ type: p.type, label: p.name }))} render={type => ({ body: <Control id={type} /> })} onViewsChange={changeViews} notify={notify} extraViews={compact && <button aria-label="Calculator controls" onClick={() => controls.current?.showModal()}>Controls{dirty ? ' *' : ''}</button>} />
    {!compact && notice}
  </main>;
}
