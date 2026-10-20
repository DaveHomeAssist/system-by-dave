import { useEffect, useMemo, useRef, useState } from 'react';
import type { Panel, View } from '../../shared/av-console/layout';
import { download, errorText, showContext, type Pack, type PackDef, type PackHost } from '../../shared/av-console/pack';
import { CUE_KEY, STORE, emptyRun, fromCueSheet, cueForgeLists, fromCueForge, logEvent, type CallingSource } from '../../../show-control/model.mjs';
import { DEFAULT_VIEWS, LIBRARY, loadRun, parseRun, retainWorkspace, saveRun, type CallingRun } from './model';
import { useRecovery } from './recovery';

/* Show Control panel pack (docs/av-suite-shell.md): the calling desk (On Deck,
   Cues, Notes, Call Log), Setup and the Show Control document. Human call
   tracking only; CueForge remains the executable show-control product. */

type Action = 'setup' | 'backup' | 'add' | 'cue-sheet' | 'cueforge' | 'restore';
type Preview = { kind: 'cue-sheet' | 'cueforge' | 'restore'; run: CallingRun; before: string; stored: string | null; source?: CallingSource; browserRaw?: string };
const fallback = 'Operation failed. Keep this tab open and export your work.';
export function impact(run: CallingRun, dirty: boolean) {
  return `${run.title} · ${run.cues.length} cues · position ${run.current}/${run.cues.length} · ${run.events.length} calls${run.held ? ' · on Hold' : ''}${dirty ? ' · unsaved changes' : ''}`;
}
const titles: Record<Action, string> = { setup: 'Setup and imports', backup: 'Document controls', add: 'Add a cue', 'cue-sheet': 'Cue Sheet copy', cueforge: 'CueForge calling snapshot', restore: 'Restore backup' };

export function useShowControlPack(host: PackHost): Pack {
  const [initial] = useState(() => { try { return loadRun(localStorage); } catch { return loadRun({ getItem: () => { throw Error('Unavailable'); } }); } });
  const [run, setRun] = useState<CallingRun>(initial.run);
  const [saved, setSaved] = useState(JSON.stringify(initial.run));
  const baseline = useRef(initial.raw);
  const current = useRef(run); current.current = run;
  const dirty = JSON.stringify(run) !== saved;
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [rawExported, setRawExported] = useState(false);
  const [message, setMessage] = useState(initial.error || 'Ready. Human call tracking only; Save stays explicit.');
  const [problem, setProblem] = useState(Boolean(initial.error));
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [action, setAction] = useState<Action>('setup');
  const [pending, setPending] = useState<Preview | null>(null);
  const [entry, setEntry] = useState({ number: '', action: '', owner: '' });
  const [field, setField] = useState<keyof typeof entry>('number');
  const reading = useRef(0);
  const modal = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const recovery = useRecovery(run, dirty, baseline.current, initial.run, recoverRun, text => notify(text));
  const views = useMemo(() => run.workspace?.views.length ? run.workspace.views : DEFAULT_VIEWS, [run.workspace]);
  const cue = run.cues[run.current];
  const [context] = useState(() => showContext());

  function notify(text: string, error = false) { setMessage(text); setProblem(error); host.notify(text, error); }
  function recoverRun(next: CallingRun) { setRun(next); setPending(null); reading.current++; host.resetLayout(); }
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);
  function closeDialog() { reading.current++; setPending(null); modal.current?.close(); trigger.current?.focus(); }
  function openDialog(next: Action) {
    if (!modal.current?.open) trigger.current = document.activeElement as HTMLElement;
    reading.current++; setPending(null); setAction(next); modal.current?.showModal();
  }
  function call(value: 'Go' | 'Hold' | 'Resume') {
    if (blocked || (value === 'Go' && (run.held || !cue)) || (value === 'Hold' && (!cue || run.held)) || (value === 'Resume' && !run.held)) return;
    setRun(retainWorkspace(run, logEvent(run, value))); notify(`${value} recorded locally. Save the run; no outputs were triggered.`);
  }
  async function store() {
    try {
      if (blocked) throw Error('Recover the unreadable saved run before saving.');
      const snapshot = current.current;
      const raw = saveRun(localStorage, snapshot, baseline.current);
      baseline.current = raw; setSaved(raw);
      await recovery.saved(snapshot, raw);
      notify('Run saved and verified in this browser. Export a backup for recovery.');
    } catch (error) { notify(`Save failed: ${errorText(error, fallback)}`, true); }
  }
  function exportRun() { download('show-control-backup.json', JSON.stringify(run, null, 2)); notify('Backup exported.'); }
  function replace(next: CallingRun) {
    if (blocked) throw Error('Recover the unreadable saved run before replacing it.');
    setRun(parseRun(next)); host.resetLayout(); closeDialog();
    notify('Run loaded as unsaved edits. Save to keep it after reload.');
  }
  function prepare(kind: Preview['kind'], raw: string, browserRaw?: string) {
    if (blocked) throw Error('Recover the unreadable saved run before importing.');
    const stored = localStorage.getItem(STORE);
    if (stored !== baseline.current) throw Error('Another tab changed this run. Export and reload before reviewing an import.');
    const source = kind === 'cueforge' ? cueForgeLists(raw) : undefined;
    const next = kind === 'restore' ? parseRun(JSON.parse(raw)) : kind === 'cue-sheet' ? fromCueSheet(raw) : fromCueForge(source!, source!.cueLists[0].id);
    setPending({ kind, run: next, before: JSON.stringify(current.current), stored, source, browserRaw });
    notify('Review the exact preview. Nothing has been replaced or saved.');
  }
  async function readFile(file: File, kind: Preview['kind']) {
    const generation = ++reading.current; setPending(null);
    try {
      if (file.size > 8_000_000) throw Error('Choose a file smaller than 8 MB.');
      const raw = await file.text();
      if (generation !== reading.current) return;
      prepare(kind, raw);
    } catch (error) { if (generation === reading.current) notify(errorText(error, fallback), true); }
  }
  function readSaved() {
    reading.current++; setPending(null);
    try { const raw = localStorage.getItem(CUE_KEY); if (!raw) throw Error('No local Cue Sheet was found in this browser.'); prepare('cue-sheet', raw, raw); }
    catch (error) { notify(errorText(error, fallback), true); }
  }
  function confirmPreview() {
    if (!pending) return;
    try {
      if (JSON.stringify(current.current) !== pending.before || localStorage.getItem(STORE) !== pending.stored) throw Error('The run changed after preview. Cancel and preview again; current work was kept.');
      if (pending.browserRaw !== undefined && localStorage.getItem(CUE_KEY) !== pending.browserRaw) throw Error('The source Cue Sheet changed after preview. Cancel and preview again.');
      if ((dirty || run.cues.length || run.events.length || run.notes || run.source) && !window.confirm(`Replace the current Show Control run?\n${impact(run, dirty)}\nExport first if you need a backup.`)) { notify('Replacement canceled. The current run was kept.'); return; }
      replace(pending.kind === 'restore' ? pending.run : retainWorkspace(run, pending.run));
    } catch (error) { notify(errorText(error, fallback), true); }
  }
  function clearDamaged() {
    if (!blocked || !rawExported || initial.raw === null) return;
    if (!window.confirm('Replace the unreadable saved run? Keep the downloaded original for recovery.')) return;
    try {
      if (localStorage.getItem(STORE) !== baseline.current) throw Error('Another tab changed this run. Reload before recovery.');
      localStorage.removeItem(STORE);
      if (localStorage.getItem(STORE) !== null) throw Error('Storage removal could not be verified.');
      baseline.current = null; const next = emptyRun(); setRun(next); setSaved(JSON.stringify(next)); setBlocked(false); setRawExported(false);
      notify('Damaged run replaced after export. Restore a backup or start a new run.');
    } catch (error) { notify(errorText(error, fallback), true); }
  }
  const setupActions = <div className="call-menu" data-web2-scroll tabIndex={0} role="region" aria-label="setup actions">
    <button disabled={blocked} onClick={() => openDialog('add')}>Add a cue</button><button disabled={blocked} onClick={() => openDialog('cue-sheet')}>Review Cue Sheet</button><button disabled={blocked} onClick={() => openDialog('cueforge')}>Review CueForge file</button><p>Reviewed calling snapshots only. Playback, timer and teleprompter are their own panels.</p>
  </div>;
  function render(type: string, _panel: Panel) {
    if (type === 'deck') return { context: run.held ? 'HOLD' : `${clock} · Human call tracking`, body: <div className="call-deck"><div className="call-cue-detail" data-web2-scroll tabIndex={0} role="region" aria-label="On deck cue details"><p className="call-eyebrow">{run.held ? 'ON HOLD' : 'ON DECK'}</p><h2>{cue ? `${cue.number} · ${cue.action}` : run.cues.length ? 'End of run' : 'No cues loaded'}</h2><p>{cue ? [cue.time, cue.owner, cue.notes].filter(Boolean).join(' · ') : 'Open Setup to add cues.'}</p></div><div className="call-buttons"><button className="primary" disabled={blocked || run.held || !cue} onClick={() => call('Go')}>Log Go →</button><button disabled={blocked || run.held || !cue} onClick={() => call('Hold')}>Log Hold</button><button disabled={blocked || !run.held} onClick={() => call('Resume')}>Log Resume</button></div></div> };
    if (type === 'cues') return { context: `${run.current}/${run.cues.length} called`, body: <div className="call-list" data-web2-scroll tabIndex={0} role="region" aria-label="Cue rundown">{!run.cues.length && <p>No cues loaded. Add a cue or review a source in Setup.</p>}{run.cues.map((item, index) => <button className="call-cue" key={item.id} disabled={blocked} aria-current={index === run.current ? 'step' : undefined} aria-label={`Select cue ${item.number || index + 1}: ${item.action}`} onClick={() => { setRun(r => ({ ...r, current: index })); notify('Cue selected. Save to keep this position.'); }}><strong>{item.number} · {item.action}</strong><span>{[item.time, item.owner, item.status, index < run.current ? 'Called' : ''].filter(Boolean).join(' · ')}</span><small>{item.notes}</small></button>)}</div> };
    if (type === 'notes') return { body: <label className="call-notes">Operator notes<textarea disabled={blocked} value={run.notes} maxLength={5000} onChange={e => setRun(r => ({ ...r, notes: e.target.value }))} /></label> };
    if (type === 'log') return { context: 'Local human calls · no triggers', body: <div className="call-list" data-web2-scroll tabIndex={0} role="region" aria-label="Call history">{!run.events.length ? <p>No calls recorded yet.</p> : run.events.map((event, i) => <article className="call-event" key={`${event.at}-${i}`}><strong>{event.action}{event.cue && ` · ${event.cue}`}</strong><time>{new Date(event.at).toLocaleString()}</time></article>)}</div> };
    const compact = window.innerHeight < 500;
    if (type === 'setup') return { body: compact ? <div className="call-single"><button onClick={() => openDialog('setup')}>Setup and imports</button></div> : setupActions };
    return { context: run.title, body: compact ? <div className="call-single"><button onClick={() => openDialog('backup')}>Document controls</button></div> : documentBody };
  }
  const documentBody = <div className="call-menu" data-web2-scroll tabIndex={0} role="region" aria-label="Show Control document">
      <label>Run title<input disabled={blocked} maxLength={200} value={run.title} onChange={e => setRun(r => ({ ...r, title: e.target.value }))} /></label>{context && <p aria-label="Read-only show context">{context}</p>}
      <button onClick={exportRun}>Export backup</button><button disabled={blocked} onClick={() => openDialog('restore')}>Restore backup</button><button disabled={blocked} onClick={() => { if (window.confirm('Start an empty run? Export first to keep current work.')) { try { replace(retainWorkspace(run, emptyRun())); } catch (error) { notify(errorText(error, fallback), true); } } }}>Start empty run</button>{blocked && initial.raw !== null && <><button onClick={() => { download('show-control-unreadable-saved-data.txt', initial.raw!, 'text/plain'); setRawExported(true); notify('Original saved bytes downloaded. Keep them before replacing the damaged run.'); }}>Download unreadable saved data</button><button disabled={!rawExported} onClick={clearDamaged}>Replace damaged saved run</button></>}<p>Save is explicit. Export before replacing a run or clearing browser data.</p>
    </div>;
  const preview = pending && <><div className="call-preview" data-web2-scroll tabIndex={0} role="region" aria-label="Import preview"><h3>{pending.run.title}</h3><p>{pending.run.cues.length} cues · {pending.run.events.length} calls</p><p>Current run: {impact(run, dirty)}. Copying replaces this tab's run; saved data stays until Save.</p>{pending.source && <p>Only safe cue identities and notes are copied. No patch, triggers, paths, settings or credentials.</p>}<ol>{pending.run.cues.map(item => <li key={item.id}><strong>{item.number} · {item.action}</strong><span>{item.notes}</span>{pending.kind === 'cueforge' && <span>Type: {String(item.sourceRow.type)} · ID: {String(item.sourceRow.id)}</span>}</li>)}</ol></div><div className="call-dialog-actions"><button className="primary" onClick={confirmPreview}>{pending.kind === 'restore' ? 'Restore this backup' : 'Copy selected cues'}</button><button onClick={() => { setPending(null); reading.current++; notify('Preview canceled. No saved data changed.'); }}>Cancel preview</button></div></>;
  const dialogs = <dialog ref={modal} className="call-dialog" aria-label={titles[action]} onCancel={event => { event.preventDefault(); closeDialog(); }}>
    <header><h2>{titles[action]}</h2><button aria-label="Close dialog" onClick={closeDialog}>Close</button></header>
    {pending?.source && <label className="call-list-select">Cue list<select aria-label="Cue list" value={pending.run.source?.listId} onChange={e => { const listId = e.target.value; setPending(p => p?.source ? { ...p, run: fromCueForge(p.source, listId) } : p); }}>{pending.source.cueLists.map(list => <option key={list.id} value={list.id}>{list.name} · {list.cues.length} cues</option>)}</select></label>}
    {pending ? preview : action === 'setup' ? setupActions : action === 'backup' ? documentBody : action === 'add' ? <form className="call-entry" onSubmit={event => { event.preventDefault(); if (blocked || !entry.number.trim() || !entry.action.trim()) return; const row = { ...entry, number: entry.number.trim(), action: entry.action.trim(), time: '', status: 'Ready', notes: '' }; setRun(r => ({ ...r, cues: [...r.cues, { id: crypto.randomUUID(), ...row, sourceRow: { ...row } }] })); setEntry({ number: '', action: '', owner: '' }); setField('number'); closeDialog(); notify('Cue added as unsaved work.'); }}><label>Cue field<select value={field} onChange={e => setField(e.target.value as keyof typeof entry)}><option value="number">Cue number</option><option value="action">Action</option><option value="owner">Owner</option></select></label><label>{field === 'number' ? 'Cue number' : field === 'action' ? 'Action' : 'Owner'}<input value={entry[field]} maxLength={field === 'number' ? 80 : field === 'action' ? 1200 : 200} onChange={e => setEntry(v => ({ ...v, [field]: e.target.value }))} /></label><div className="call-dialog-actions"><button type="button" onClick={() => setField(field === 'number' ? 'action' : field === 'action' ? 'owner' : 'number')}>Next field</button><button className="primary" disabled={!entry.number.trim() || !entry.action.trim()} type="submit">Add to run</button></div></form> : <div className="call-file"><p>{action === 'cueforge' ? 'Choose a version 7 .cueforge file. This is a calling snapshot, not playback.' : action === 'restore' ? 'Choose a Show Control JSON backup; review before replacement.' : 'Review a saved Cue Sheet or choose its JSON export.'}</p>{action === 'cue-sheet' && <button onClick={readSaved}>Preview local Cue Sheet</button>}<label>{action === 'restore' ? 'Backup JSON' : action === 'cueforge' ? 'CueForge show file' : 'Cue Sheet JSON'}<input type="file" accept={action === 'cueforge' ? '.cueforge,application/json' : '.json,application/json'} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file && (action === 'cue-sheet' || action === 'cueforge' || action === 'restore')) void readFile(file, action); }} /></label></div>}
    <p className="call-dialog-status" role="status">{message}</p>
  </dialog>;
  return {
    id: 'show-control', label: 'Show Control', title: run.title, summary: `${impact(run, false)} · ${run.held ? 'HOLD — resume before Go' : 'Human call log only'}`,
    dirty, blocked, save: store, exportDoc: exportRun, status: message, problem, notify,
    recovery: { offer: recovery.offer, restore: recovery.restore, discard: recovery.discard, errors: recovery.errors },
    render, dialogs, quick: LIBRARY.map(p => ({ type: p.type, label: p.name })), library: LIBRARY, views,
    storeViews: (next: View[], text: string) => { if (!blocked) setRun(r => ({ ...r, workspace: { version: 1, views: next } })); notify(blocked ? 'Recover the saved run before storing views.' : text, blocked); },
    layout: recovery.layout,
  };
}

export const showControlPack: PackDef = { id: 'show-control', label: 'Show Control', consoleId: 'show-control', library: LIBRARY, defaultViews: DEFAULT_VIEWS, use: useShowControlPack };
