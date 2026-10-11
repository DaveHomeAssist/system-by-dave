import { useEffect, useMemo, useRef, useState } from 'react';
import { ConsoleWorkspace, useConsoleWorkspace } from '../../shared/av-console/Workspace';
import { CUE_KEY, STORE, emptyRun, fromCueSheet, cueForgeLists, fromCueForge, logEvent, type CallingSource } from '../../../show-control/model.mjs';
import { DEFAULT_VIEWS, LIBRARY, loadRun, parseRun, retainWorkspace, saveRun, type CallingRun } from './model';
import { useRecovery } from './recovery';

type Action = 'setup' | 'backup' | 'add' | 'cue-sheet' | 'cueforge' | 'restore';
type Preview = { kind: 'cue-sheet' | 'cueforge' | 'restore'; run: CallingRun; before: string; stored: string | null; source?: CallingSource; browserRaw?: string };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Operation failed. Keep this tab open and export your work.';
function download(name: string, raw: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([raw], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function impact(run: CallingRun, dirty: boolean) {
  return `${run.title} · ${run.cues.length} cues · position ${run.current}/${run.cues.length} · ${run.events.length} calls${run.held ? ' · on Hold' : ''}${dirty ? ' · unsaved changes' : ''}`;
}
const titles: Record<Action, string> = { setup: 'Setup and imports', backup: 'Backup controls', add: 'Add a cue', 'cue-sheet': 'Cue Sheet copy', cueforge: 'CueForge calling snapshot', restore: 'Restore backup' };

export function App() {
  const [initial] = useState(() => { try { return loadRun(localStorage); } catch { return loadRun({ getItem: () => { throw Error('Unavailable'); } }); } });
  const [run, setRun] = useState<CallingRun>(initial.run);
  const [saved, setSaved] = useState(JSON.stringify(initial.run));
  const baseline = useRef(initial.raw);
  const current = useRef(run); current.current = run;
  const dirty = JSON.stringify(run) !== saved;
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [rawExported, setRawExported] = useState(false);
  const [message, setMessage] = useState(initial.error || 'Ready. Human call tracking only; Save stays explicit.');
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || 'dark');
  const darkTheme = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const [compact, setCompact] = useState(window.innerHeight < 500);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [action, setAction] = useState<Action>('setup');
  const [pending, setPending] = useState<Preview | null>(null);
  const [entry, setEntry] = useState({ number: '', action: '', owner: '' });
  const [field, setField] = useState<keyof typeof entry>('number');
  const reading = useRef(0);
  const modal = useRef<HTMLDialogElement>(null);
  const controls = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const recovery = useRecovery(run, dirty, baseline.current, initial.run, recoverRun, setMessage);
  const views = useMemo(() => run.workspace?.views.length ? run.workspace.views : DEFAULT_VIEWS, [run.workspace]);
  const ws = useConsoleWorkspace(views, LIBRARY, recovery.layout);
  const cue = run.cues[run.current];
  const [context] = useState(() => {
    const query = new URLSearchParams(location.search);
    return ['sbdShow', 'sbdVenue', 'sbdDate', 'sbdOperator', 'sbdPhase'].map(key => query.get(key)?.slice(0, 200)).filter(Boolean).join(' · ');
  });

  function recoverRun(next: CallingRun) { setRun(next); setPending(null); reading.current++; ws.setLive({}); ws.setMax({}); }
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    const resize = () => { setCompact(window.innerHeight < 500); controls.current?.close(); };
    window.addEventListener('resize', resize);
    return () => { clearInterval(timer); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => {
    const receiveTheme = (event: StorageEvent) => {
      if (event.key === 'av-theme-mode.v1' && ['light', 'dark', 'system'].includes(event.newValue || '')) setTheme(event.newValue!);
    };
    window.addEventListener('storage', receiveTheme);
    return () => window.removeEventListener('storage', receiveTheme);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.avTheme = theme;
    const lightColor = document.querySelector<HTMLMetaElement>('meta[data-av-theme-color="light"]');
    const darkColor = document.querySelector<HTMLMetaElement>('meta[data-av-theme-color="dark"]');
    if (lightColor) lightColor.media = theme === 'system' ? '(prefers-color-scheme: light)' : theme === 'light' ? 'all' : 'not all';
    if (darkColor) darkColor.media = theme === 'system' ? '(prefers-color-scheme: dark)' : theme === 'dark' ? 'all' : 'not all';
  }, [theme]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  function closeDialog() { reading.current++; setPending(null); modal.current?.close(); trigger.current?.focus(); }
  function openDialog(next: Action) {
    if (!modal.current?.open) trigger.current = document.activeElement as HTMLElement;
    reading.current++; setPending(null); setAction(next); modal.current?.showModal();
  }
  function call(value: 'Go' | 'Hold' | 'Resume') {
    if (blocked || (value === 'Go' && (run.held || !cue)) || (value === 'Hold' && (!cue || run.held)) || (value === 'Resume' && !run.held)) return;
    setRun(retainWorkspace(run, logEvent(run, value))); setMessage(`${value} recorded locally. Save the run; no outputs were triggered.`);
  }
  async function store() {
    try {
      if (blocked) throw Error('Recover the unreadable saved run before saving.');
      const snapshot = current.current;
      const raw = saveRun(localStorage, snapshot, baseline.current);
      baseline.current = raw; setSaved(raw);
      await recovery.saved(snapshot, raw);
      setMessage('Run saved and verified in this browser. Export a backup for recovery.');
    } catch (error) { setMessage(`Save failed: ${errorText(error)}`); }
  }
  function exportRun() { download('show-control-backup.json', JSON.stringify(run, null, 2)); setMessage('Backup exported.'); }
  function replace(next: CallingRun) {
    if (blocked) throw Error('Recover the unreadable saved run before replacing it.');
    setRun(parseRun(next)); ws.setLive({}); ws.setMax({}); closeDialog();
    setMessage('Run loaded as unsaved edits. Save to keep it after reload.');
  }
  function prepare(kind: Preview['kind'], raw: string, browserRaw?: string) {
    if (blocked) throw Error('Recover the unreadable saved run before importing.');
    const stored = localStorage.getItem(STORE);
    if (stored !== baseline.current) throw Error('Another tab changed this run. Export and reload before reviewing an import.');
    const source = kind === 'cueforge' ? cueForgeLists(raw) : undefined;
    const next = kind === 'restore' ? parseRun(JSON.parse(raw)) : kind === 'cue-sheet' ? fromCueSheet(raw) : fromCueForge(source!, source!.cueLists[0].id);
    setPending({ kind, run: next, before: JSON.stringify(current.current), stored, source, browserRaw });
    setMessage('Review the exact preview. Nothing has been replaced or saved.');
  }
  async function readFile(file: File, kind: Preview['kind']) {
    const generation = ++reading.current; setPending(null);
    try {
      if (file.size > 8_000_000) throw Error('Choose a file smaller than 8 MB.');
      const raw = await file.text();
      if (generation !== reading.current) return;
      prepare(kind, raw);
    } catch (error) { if (generation === reading.current) setMessage(errorText(error)); }
  }
  function readSaved() {
    reading.current++; setPending(null);
    try { const raw = localStorage.getItem(CUE_KEY); if (!raw) throw Error('No local Cue Sheet was found in this browser.'); prepare('cue-sheet', raw, raw); }
    catch (error) { setMessage(errorText(error)); }
  }
  function confirmPreview() {
    if (!pending) return;
    try {
      if (JSON.stringify(current.current) !== pending.before || localStorage.getItem(STORE) !== pending.stored) throw Error('The run changed after preview. Cancel and preview again; current work was kept.');
      if (pending.browserRaw !== undefined && localStorage.getItem(CUE_KEY) !== pending.browserRaw) throw Error('The source Cue Sheet changed after preview. Cancel and preview again.');
      if ((dirty || run.cues.length || run.events.length || run.notes || run.source) && !window.confirm(`Replace the current Show Control run?\n${impact(run, dirty)}\nExport first if you need a backup.`)) { setMessage('Replacement canceled. The current run was kept.'); return; }
      replace(pending.kind === 'restore' ? pending.run : retainWorkspace(run, pending.run));
    } catch (error) { setMessage(errorText(error)); }
  }
  function clearDamaged() {
    if (!blocked || !rawExported || initial.raw === null) return;
    if (!window.confirm('Replace the unreadable saved run? Keep the downloaded original for recovery.')) return;
    try {
      if (localStorage.getItem(STORE) !== baseline.current) throw Error('Another tab changed this run. Reload before recovery.');
      localStorage.removeItem(STORE);
      if (localStorage.getItem(STORE) !== null) throw Error('Storage removal could not be verified.');
      baseline.current = null; const next = emptyRun(); setRun(next); setSaved(JSON.stringify(next)); setBlocked(false); setRawExported(false);
      setMessage('Damaged run replaced after export. Restore a backup or start a new run.');
    } catch (error) { setMessage(errorText(error)); }
  }
  function toggleTheme() {
    const next = darkTheme ? 'light' : 'dark'; setTheme(next);
    try { localStorage.setItem('av-theme-mode.v1', next); } catch { setMessage('Theme changed for this visit only; preferences could not be saved.'); }
  }
  const actions = (kind: 'setup' | 'backup') => <div className="call-menu" data-web2-scroll tabIndex={0} role="region" aria-label={`${kind} actions`}>
    {kind === 'setup' ? <><button disabled={blocked} onClick={() => openDialog('add')}>Add a cue</button><button disabled={blocked} onClick={() => openDialog('cue-sheet')}>Review Cue Sheet</button><button disabled={blocked} onClick={() => openDialog('cueforge')}>Review CueForge file</button><p>Reviewed calling snapshots only. Playback, timer and teleprompter remain independent.</p></> : <><button onClick={exportRun}>Export backup</button><button disabled={blocked} onClick={() => openDialog('restore')}>Restore backup</button><button disabled={blocked} onClick={() => { if (window.confirm('Start an empty run? Export first to keep current work.')) { try { replace(retainWorkspace(run, emptyRun())); } catch (error) { setMessage(errorText(error)); } } }}>Start empty run</button>{blocked && initial.raw !== null && <><button onClick={() => { download('show-control-unreadable-saved-data.txt', initial.raw!, 'text/plain'); setRawExported(true); setMessage('Original saved bytes downloaded. Keep them before replacing the damaged run.'); }}>Download unreadable saved data</button><button disabled={!rawExported} onClick={clearDamaged}>Replace damaged saved run</button></>}<p>Save is explicit. Export before replacing a run or clearing browser data.</p></>}
  </div>;
  function render(type: string) {
    if (type === 'deck') return { context: run.held ? 'HOLD' : 'Human call tracking', body: <div className="call-deck"><div className="call-cue-detail" data-web2-scroll tabIndex={0} role="region" aria-label="On deck cue details"><p className="call-eyebrow">{run.held ? 'ON HOLD' : 'ON DECK'}</p><h2>{cue ? `${cue.number} · ${cue.action}` : run.cues.length ? 'End of run' : 'No cues loaded'}</h2><p>{cue ? [cue.time, cue.owner, cue.notes].filter(Boolean).join(' · ') : 'Open Setup/Import to add cues.'}</p></div><div className="call-buttons"><button className="primary" disabled={blocked || run.held || !cue} onClick={() => call('Go')}>Log Go →</button><button disabled={blocked || run.held || !cue} onClick={() => call('Hold')}>Log Hold</button><button disabled={blocked || !run.held} onClick={() => call('Resume')}>Log Resume</button></div></div> };
    if (type === 'cues') return { context: `${run.current}/${run.cues.length} called`, body: <div className="call-list" data-web2-scroll tabIndex={0} role="region" aria-label="Cue rundown">{!run.cues.length && <p>No cues loaded. Add a cue or review a source in Setup/Import.</p>}{run.cues.map((item, index) => <button className="call-cue" key={item.id} disabled={blocked} aria-current={index === run.current ? 'step' : undefined} aria-label={`Select cue ${item.number || index + 1}: ${item.action}`} onClick={() => { setRun(r => ({ ...r, current: index })); setMessage('Cue selected. Save to keep this position.'); }}><strong>{item.number} · {item.action}</strong><span>{[item.time, item.owner, item.status, index < run.current ? 'Called' : ''].filter(Boolean).join(' · ')}</span><small>{item.notes}</small></button>)}</div> };
    if (type === 'notes') return { body: <label className="call-notes">Operator notes<textarea disabled={blocked} value={run.notes} maxLength={5000} onChange={e => setRun(r => ({ ...r, notes: e.target.value }))} /></label> };
    if (type === 'log') return { context: 'Local human calls · no triggers', body: <div className="call-list" data-web2-scroll tabIndex={0} role="region" aria-label="Call history">{!run.events.length ? <p>No calls recorded yet.</p> : run.events.map((event, i) => <article className="call-event" key={`${event.at}-${i}`}><strong>{event.action}{event.cue && ` · ${event.cue}`}</strong><time>{new Date(event.at).toLocaleString()}</time></article>)}</div> };
    return { body: compact ? <div className="call-single"><button onClick={() => openDialog(type === 'setup' ? 'setup' : 'backup')}>{type === 'setup' ? 'Setup and imports' : 'Backup controls'}</button></div> : actions(type === 'setup' ? 'setup' : 'backup') };
  }
  const header = <header className="call-header"><div><small>AV BY DAVE / HUMAN CALL TRACKING</small><h1>Show Control</h1><p id="summary">{impact(run, dirty)}</p></div><div className="call-actions"><button id="theme" onClick={toggleTheme}>{darkTheme ? 'Light mode' : 'Dark mode'}</button><button id="save" className="primary" disabled={blocked} onClick={() => void store()}>Save run</button></div></header>;
  const notice = <footer id="notice" role="status" aria-live="polite" className="call-status">{message}{recovery.errors.map(error => <span key={error}>{error}</span>)}</footer>;
  const recoveryControls = recovery.offer && <section className="call-recovery" aria-label="Draft recovery"><p>Unsaved draft available.{recovery.offer.baseline !== baseline.current && ' The saved run changed since this draft.'}</p><button disabled={blocked} onClick={() => void recovery.restore()}>Restore draft</button><button onClick={() => void recovery.discard()}>Discard draft</button></section>;
  const preview = pending && <><div className="call-preview" data-web2-scroll tabIndex={0} role="region" aria-label="Import preview"><h3>{pending.run.title}</h3><p>{pending.run.cues.length} cues · {pending.run.events.length} calls</p><p>Current run: {impact(run, dirty)}. Copying replaces this tab's run; saved data stays until Save.</p>{pending.source && <p>Only safe cue identities and notes are copied. No patch, triggers, paths, settings or credentials.</p>}<ol>{pending.run.cues.map(item => <li key={item.id}><strong>{item.number} · {item.action}</strong><span>{item.notes}</span>{pending.kind === 'cueforge' && <span>Type: {String(item.sourceRow.type)} · ID: {String(item.sourceRow.id)}</span>}</li>)}</ol></div><div className="call-dialog-actions"><button className="primary" onClick={confirmPreview}>{pending.kind === 'restore' ? 'Restore this backup' : 'Copy selected cues'}</button><button onClick={() => { setPending(null); reading.current++; setMessage('Preview canceled. No saved data changed.'); }}>Cancel preview</button></div></>;
  return <main id="main" tabIndex={-1} className={`call-app${compact ? ' call-compact' : ''}`}>
    {compact ? <dialog ref={controls} className="call-controls" aria-label="Show controls">{header}{recoveryControls}{notice}<button onClick={() => controls.current?.close()}>Back to panels</button></dialog> : header}
    <div className="call-summary"><time>{clock}</time><span>{run.held ? 'HOLD — resume before Go' : 'Human call log only'}</span>{context && <span aria-label="Read-only show context">{context}</span>}</div>
    {!compact && recoveryControls}
    <ConsoleWorkspace ws={compact ? { ...ws, mode: 'phone' } : ws} label="Show Control" extraViews={compact && <button aria-label="Show controls" onClick={() => controls.current?.showModal()}>Show{dirty ? ' *' : ''}{recovery.offer || recovery.errors.length ? ' !' : ''}</button>} quick={LIBRARY.map(p => ({ type: p.type, label: p.name }))} render={render} onViewsChange={(next, text) => { if (!blocked) setRun(r => ({ ...r, workspace: { version: 1, views: next } })); setMessage(blocked ? 'Recover the saved run before storing views.' : text); }} notify={setMessage} />
    {!compact && notice}
    <dialog ref={modal} className="call-dialog" aria-label={titles[action]} onCancel={event => { event.preventDefault(); closeDialog(); }}>
      <header><h2>{titles[action]}</h2><button aria-label="Close dialog" onClick={closeDialog}>Close</button></header>
      {pending?.source && <label className="call-list-select">Cue list<select aria-label="Cue list" value={pending.run.source?.listId} onChange={e => { const listId = e.target.value; setPending(p => p?.source ? { ...p, run: fromCueForge(p.source, listId) } : p); }}>{pending.source.cueLists.map(list => <option key={list.id} value={list.id}>{list.name} · {list.cues.length} cues</option>)}</select></label>}
      {pending ? preview : action === 'setup' || action === 'backup' ? actions(action) : action === 'add' ? <form className="call-entry" onSubmit={event => { event.preventDefault(); if (blocked || !entry.number.trim() || !entry.action.trim()) return; const row = { ...entry, number: entry.number.trim(), action: entry.action.trim(), time: '', status: 'Ready', notes: '' }; setRun(r => ({ ...r, cues: [...r.cues, { id: crypto.randomUUID(), ...row, sourceRow: { ...row } }] })); setEntry({ number: '', action: '', owner: '' }); setField('number'); closeDialog(); setMessage('Cue added as unsaved work.'); }}><label>Cue field<select value={field} onChange={e => setField(e.target.value as keyof typeof entry)}><option value="number">Cue number</option><option value="action">Action</option><option value="owner">Owner</option></select></label><label>{field === 'number' ? 'Cue number' : field === 'action' ? 'Action' : 'Owner'}<input value={entry[field]} maxLength={field === 'number' ? 80 : field === 'action' ? 1200 : 200} onChange={e => setEntry(v => ({ ...v, [field]: e.target.value }))} /></label><div className="call-dialog-actions"><button type="button" onClick={() => setField(field === 'number' ? 'action' : field === 'action' ? 'owner' : 'number')}>Next field</button><button className="primary" disabled={!entry.number.trim() || !entry.action.trim()} type="submit">Add to run</button></div></form> : <div className="call-file"><p>{action === 'cueforge' ? 'Choose a version 7 .cueforge file. This is a calling snapshot, not playback.' : action === 'restore' ? 'Choose a Show Control JSON backup; review before replacement.' : 'Review a saved Cue Sheet or choose its JSON export.'}</p>{action === 'cue-sheet' && <button onClick={readSaved}>Preview local Cue Sheet</button>}<label>{action === 'restore' ? 'Backup JSON' : action === 'cueforge' ? 'CueForge show file' : 'Cue Sheet JSON'}<input type="file" accept={action === 'cueforge' ? '.cueforge,application/json' : '.json,application/json'} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file && (action === 'cue-sheet' || action === 'cueforge' || action === 'restore')) void readFile(file, action); }} /></label></div>}
      <p className="call-dialog-status" role="status">{message}</p>
    </dialog>
  </main>;
}
