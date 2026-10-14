import type { DepartmentPresentation } from "../../shared/av-console/Department";
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConsoleWorkspace, useConsoleWorkspace } from '../../shared/av-console/Workspace';
import { KEY, FIELDS, STATUSES, MAX_IMPORT_BYTES, PLOTFORGE_KIND, blank, fixture, fromPlotForge, conflicts, hasConflict, type Field } from '../../../av-lighting/model.mjs';
import { DEFAULT_VIEWS, LIBRARY, loadPlan, parsePlan, savePlan, type Plan } from './model';
import { useRecovery } from './recovery';

const LEGACY_KEY = 'lighting-patch.v1';
const labels: Record<Field, string> = { unit: 'Unit', fixture: 'Fixture', position: 'Position', mode: 'Mode', universe: 'Universe', address: 'Address', channel: 'Channel', dimmer: 'Dimmer', color: 'Color', focus: 'Focus notes', status: 'Status', notes: 'Crew notes' };
type Preview = { plan: Plan; before: string; stored: string | null; legacyRaw?: string };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Operation failed. Export your work before leaving.';
function download(name: string, raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function App({ present }: DepartmentPresentation = {}) {
  const [initial] = useState(() => { try { return loadPlan(localStorage); } catch { return loadPlan({ getItem: () => { throw Error('Unavailable'); } }); } });
  const [plan, setPlan] = useState<Plan>(initial.plan);
  const [saved, setSaved] = useState(JSON.stringify(initial.plan));
  const baseline = useRef(initial.raw);
  const current = useRef(plan); current.current = plan;
  const dirty = JSON.stringify(plan) !== saved;
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [recoveryAuthorized, setRecoveryAuthorized] = useState(false);
  const editable = !blocked || recoveryAuthorized;
  const [message, setMessage] = useState(initial.error || 'Ready. Fixture edits stay unsaved until Save plan.');
  const [selection, setSelection] = useState('');
  const selected = plan.items.find(row => row.id === selection) || plan.items[0];
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<Preview | null>(null);
  const [previewMessage, setPreviewMessage] = useState('Select a JSON file to preview.');
  const [purpose, setPurpose] = useState<'source' | 'backup'>('source');
  const reading = useRef(0);
  const modal = useRef<HTMLDialogElement>(null);
  const controls = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [compact, setCompact] = useState(window.innerHeight < 500);
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || 'dark');
  const darkTheme = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const recovery = useRecovery(plan, dirty, baseline.current, initial.plan, recoverPlan, notify, () => editable);
  const views = useMemo(() => plan.workspace?.views.length ? plan.workspace.views : DEFAULT_VIEWS, [plan.workspace]);
  const ws = useConsoleWorkspace(views, LIBRARY, recovery.layout);
  const conflictMap = useMemo(() => conflicts(plan), [plan]);
  const [context] = useState(() => {
    const params = new URLSearchParams(location.search);
    return ['sbdShow', 'sbdVenue', 'sbdDate', 'sbdOperator', 'sbdPhase'].map(key => params.get(key)?.slice(0, 200)).filter(Boolean).join(' · ');
  });
  function notify(text: string, reveal = false) { setMessage(text); if (reveal && compact && !controls.current?.open) controls.current?.showModal(); }
  function recoverPlan(next: Plan) { setPlan(next); setSelection(''); setPending(null); reading.current++; ws.setLive({}); ws.setMax({}); }
  useEffect(() => {
    const resize = () => { setCompact(window.innerHeight < 500); controls.current?.close(); };
    const receive = (event: StorageEvent) => {
      if (event.key === 'av-theme-mode.v1' && ['light', 'dark', 'system'].includes(event.newValue || '')) setTheme(event.newValue!);
      if (event.key === KEY || event.key === null) {
        try { if (localStorage.getItem(KEY) !== baseline.current) setMessage('Saved plan changed in another tab. Export edits, then reload. Save will be refused.'); }
        catch { setMessage('Browser storage is unavailable. Export working edits before leaving.'); }
      }
    };
    window.addEventListener('resize', resize); window.addEventListener('storage', receive);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('storage', receive); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.avTheme = theme;
    for (const meta of Array.from(document.querySelectorAll<HTMLMetaElement>('meta[data-av-theme-color]'))) meta.media = theme === 'system' ? `(prefers-color-scheme: ${meta.dataset.avThemeColor})` : meta.dataset.avThemeColor === theme ? 'all' : 'not all';
  }, [theme]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  function add() {
    if (!editable) return;
    if (plan.items.length >= 1000) { notify('This plan already has 1,000 fixtures. Remove a fixture before adding another.', true); return; }
    const row = fixture({ fixture: 'New fixture', status: 'planned' });
    setPlan(p => ({ ...p, items: [...p.items, row] })); setSelection(row.id); ws.show('details');
    notify('Fixture added as unsaved work.');
    setTimeout(() => document.querySelector<HTMLInputElement>('.lighting-fields input[name="unit"]')?.focus(), 0);
  }
  function edit(id: string, field: Field, value: string) {
    if (!editable) return;
    setPlan(p => ({ ...p, items: p.items.map(row => row.id === id ? { ...row, [field]: value } : row) }));
  }
  function remove() {
    if (!editable || !selected || !window.confirm(`Remove ${selected.unit || selected.fixture || 'this fixture'} from the working plan? Save stays explicit.`)) return;
    setPlan(p => ({ ...p, items: p.items.filter(row => row.id !== selected.id) })); setSelection(''); notify('Fixture removed from the working plan. Save is still required.');
  }
  async function store() {
    try {
      if (!editable) throw Error('Review a valid backup or explicitly start fresh before replacing unreadable saved data.');
      if (!navigator.locks?.request) throw Error('This browser cannot coordinate saves across tabs. Export a backup and use a browser with Web Locks to save.');
      const snapshot = current.current;
      const raw = await navigator.locks.request(KEY, () => savePlan(localStorage, snapshot, baseline.current, recoveryAuthorized));
      baseline.current = raw; setSaved(raw); if (current.current === snapshot) setPlan(parsePlan(JSON.parse(raw)));
      setBlocked(false); setRecoveryAuthorized(false); await recovery.saved(snapshot, raw);
      notify(recoveryAuthorized ? 'Recovered plan saved; unreadable original preserved in browser storage.' : 'Saved to this browser and verified. Export a backup for recovery.');
    } catch (error) { notify(`Save failed: ${errorText(error)}`, true); }
  }
  function exportPlan(original = false) {
    if (blocked && !recoveryAuthorized && baseline.current === null) { notify('Export unavailable: saved records could not be read. No original backup was created. Restore storage access and reload.', true); return; }
    const preserve = original || (blocked && !recoveryAuthorized);
    download(preserve ? 'lighting-unreadable-original.json' : 'av-lighting-plan.json', preserve && baseline.current !== null ? baseline.current : JSON.stringify(plan, null, 2));
    notify('JSON downloaded. Backups include retained PlotForge source data; store them safely.');
  }
  function startFresh() {
    if (baseline.current === null || !window.confirm('Start a blank working plan? The unreadable original stays untouched until Save preserves a verified recovery copy.')) return;
    recoverPlan(blank()); setRecoveryAuthorized(true); notify('Blank recovery plan ready. Save will preserve the unreadable original before replacement.');
  }
  function closeImport() { reading.current++; setPending(null); modal.current?.close(); trigger.current?.focus(); }
  function openImport(next: 'source' | 'backup') {
    trigger.current = document.activeElement as HTMLElement; setPurpose(next); setPending(null); setPreviewMessage('Select a JSON file to preview.'); reading.current++; modal.current?.showModal();
  }
  function preview(raw: string, before: Plan, legacyRaw?: string) {
    if (before !== current.current) throw Error('The working plan changed while reading. Preview again.');
    if (localStorage.getItem(KEY) !== baseline.current) throw Error('Saved plan changed in another tab. Export and reload.');
    const value = JSON.parse(raw);
    const mapped = value?.kind === PLOTFORGE_KIND ? fromPlotForge(value) : null;
    if (purpose === 'backup' && mapped) throw Error('Choose a Lighting backup. Review PlotForge manifests through Plan/Import.');
    const candidate = parsePlan(mapped ? mapped.plan : value);
    setPending({ plan: candidate, before: JSON.stringify(before), stored: baseline.current, legacyRaw });
    setPreviewMessage(`${mapped ? 'PlotForge' : legacyRaw ? 'Saved Lighting Patch' : 'Lighting plan'}: ${candidate.items.length} fixtures from ${candidate.meta.showName}. ${mapped ? `${mapped.needsWork} needs-work statuses map to issue; ${mapped.unknownStatuses} unknown statuses map to planned. Full source stays in the backup; no sync, footprint, geometry or output control. ` : ''}Replace working plan only after confirmation. Export it first if needed; Save stays explicit.`);
  }
  async function readFile(file: File) {
    const generation = ++reading.current; const before = current.current; setPending(null);
    try {
      if (file.size > MAX_IMPORT_BYTES) throw Error('File exceeds the 12 MB import limit.');
      const raw = await file.text(); if (generation !== reading.current) return;
      preview(raw, before);
    } catch (error) { if (generation === reading.current) setPreviewMessage(`Import rejected: ${errorText(error)}`); }
  }
  function readLegacy() {
    reading.current++; setPending(null);
    try { const raw = localStorage.getItem(LEGACY_KEY); if (!raw) throw Error('No saved Lighting Patch was found on this origin.'); preview(raw, current.current, raw); }
    catch (error) { setPreviewMessage(`Import rejected: ${errorText(error)}`); }
  }
  function confirmImport() {
    if (!pending) return;
    try {
      if (JSON.stringify(current.current) !== pending.before || localStorage.getItem(KEY) !== pending.stored || (pending.legacyRaw !== undefined && localStorage.getItem(LEGACY_KEY) !== pending.legacyRaw)) throw Error('Plan or source changed after preview. Preview again; current work was kept.');
      if (!window.confirm(blocked ? 'Restore this plan? Save will preserve the unreadable original before replacement.' : 'Replace the current working plan? Export it first if needed. Save is still required.')) return;
      setRecoveryAuthorized(blocked); recoverPlan(pending.plan); closeImport(); notify('Import applied to the unsaved working plan. Review, then Save.');
    } catch (error) { setPending(null); setPreviewMessage(errorText(error)); }
  }
  function toggleTheme() {
    const next = darkTheme ? 'light' : 'dark'; setTheme(next);
    try { localStorage.setItem('av-theme-mode.v1', next); } catch { notify('Theme changed for this visit only.'); }
  }
  function render(type: string) {
    if (type === 'fixtures') return { context: `${plan.items.length} fixtures`, body: <div className="lighting-menu" data-web2-scroll role="region" aria-label="Fixture list" tabIndex={0}>
      <button id="addBtn" disabled={!editable} onClick={add}>Add fixture</button><label>Search fixtures<input id="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
      {plan.items.filter(row => !query.trim() || FIELDS.some(field => row[field].toLowerCase().includes(query.trim().toLowerCase()))).map(row => <button className="lighting-fixture" key={row.id} aria-pressed={selected?.id === row.id} onClick={() => { setSelection(row.id); ws.show('details'); }}><strong>{row.unit || 'No unit'} · {row.fixture || 'Unnamed fixture'}</strong><span>{row.position || 'No position'} · U{row.universe || '—'} / {row.address || '—'}</span><small className={hasConflict(row, conflictMap) || row.status === 'issue' ? 'error' : ''}>{hasConflict(row, conflictMap) ? 'Duplicate start' : row.status}</small></button>)}
      {!plan.items.length && <p>No fixtures yet. Add one or review a Lighting Patch or PlotForge import.</p>}
    </div> };
    if (type === 'details') return { context: selected?.unit || 'Select a fixture', body: <div className="lighting-menu" data-web2-scroll role="region" aria-label="Fixture details" tabIndex={0}>{selected ? <>
      <label>Selected fixture<select value={selected.id} onChange={e => setSelection(e.target.value)}>{plan.items.map(row => <option key={row.id} value={row.id}>{row.unit || 'No unit'} · {row.fixture || 'Unnamed fixture'}</option>)}</select></label>
      <fieldset disabled={!editable}><legend>{selected.sourceId ? 'Imported copy · source retained' : 'Fixture record'}</legend><div className="lighting-fields">{FIELDS.map(field => <label key={field}>{labels[field]}{field === 'status' ? <select name={field} value={selected[field]} onChange={e => edit(selected.id, field, e.target.value)}>{STATUSES.map(status => <option key={status}>{status}</option>)}</select> : field === 'notes' ? <textarea name={field} maxLength={2000} value={selected[field]} onChange={e => edit(selected.id, field, e.target.value)} /> : <input name={field} maxLength={500} value={selected[field]} onChange={e => edit(selected.id, field, e.target.value)} />}</label>)}</div></fieldset>
      {hasConflict(selected, conflictMap) && <p id="fixtureWarning" className="error">Another fixture has this same universe and starting address. Review before patching.</p>}
      <button disabled={!editable} onClick={remove}>Remove fixture</button><p>Duplicate starting addresses only; no footprint overlap detection or DMX output.</p>
    </> : <p>Select or add a fixture in Fixtures.</p>}</div> };
    if (type === 'focus') return { body: <div className="lighting-menu" data-web2-scroll role="region" aria-label="Focus list" tabIndex={0}>{plan.items.map(row => <section className="lighting-focus-row" key={row.id}><button onClick={() => { setSelection(row.id); ws.show('details'); }}><strong>{row.unit || 'No unit'} · {row.fixture || 'Unnamed fixture'}</strong></button><p>{row.position || 'No position'} · {row.focus || 'Focus not recorded'}</p><label>Status for {row.unit || row.fixture || 'fixture'}<select disabled={!editable} value={row.status} onChange={e => edit(row.id, 'status', e.target.value)}>{STATUSES.map(status => <option key={status}>{status}</option>)}</select></label></section>)}{!plan.items.length && <p>No fixtures to focus yet.</p>}</div> };
    if (type === 'plan') return { body: <div className="lighting-menu" data-web2-scroll role="region" aria-label="Plan and import controls" tabIndex={0}>{(['showName', 'venue', 'lead'] as const).map(field => <label key={field}>{field === 'showName' ? 'Show name' : field === 'venue' ? 'Venue' : 'Lighting lead'}<input disabled={!editable} maxLength={field === 'lead' ? 80 : 120} value={plan.meta[field]} onChange={e => setPlan(p => ({ ...p, meta: { ...p.meta, [field]: e.target.value } }))} /></label>)}
      <button id="importBtn" onClick={() => openImport('source')}>Import plan</button><a className="lighting-link" href="../plotforge.html" target="_blank" rel="noopener noreferrer">Open PlotForge</a><p>Review saved Lighting Patch, Lighting JSON or PlotForge interop manifests. Full source objects remain in backups; no live sync or source edits.</p>{context && <p aria-label="Read-only show context">{context}</p>}
    </div> };
    return { body: <div className="lighting-menu" data-web2-scroll role="region" aria-label="Backup controls" tabIndex={0}><button className="primary" onClick={() => void store()}>Save plan</button><button onClick={() => exportPlan()}>Export JSON</button><button onClick={() => openImport('backup')}>Restore backup</button>{blocked && baseline.current !== null && <><button onClick={() => exportPlan(true)}>Download unreadable original</button><button onClick={startFresh}>Start fresh after recovery</button></>}<p>{dirty ? 'Unsaved changes. Save affects only Lighting, never the AV Video host.' : 'Working plan matches this tab’s saved baseline.'}</p><p>Device-local drafts are recovery, not portable backups. Export before clearing browser data.</p></div> };
  }
  const header = <header className="lighting-header"><div><small>AV BY DAVE / LIGHTING</small><h1>Lighting</h1><p>{plan.meta.showName}{dirty ? ' · unsaved' : ''}</p></div><div className="lighting-header-actions"><button onClick={toggleTheme}>{darkTheme ? 'Light mode' : 'Dark mode'}</button><button id="saveBtn" className="primary" onClick={() => void store()}>Save plan</button></div></header>;
  const notice = <footer id="footerMessage" className="lighting-status" role="status" aria-live="polite">{message}{recovery.errors.map(error => <span key={error}>{error}</span>)}</footer>;
  const recoveryControls = recovery.offer && <section className="lighting-recovery" aria-label="Draft recovery"><p>Unsaved draft available.{recovery.offer.baseline !== baseline.current && ' Saved plan changed since this draft.'}</p><button disabled={!editable} onClick={() => void recovery.restore()}>Restore draft</button><button onClick={() => void recovery.discard()}>Discard draft</button></section>;
  const screen = <main id="main" className={`lighting-app${compact ? ' lighting-compact' : ''}`} tabIndex={-1}>
    {compact ? <dialog ref={controls} className="lighting-controls" aria-label="Lighting controls">{header}{recoveryControls}{notice}<button onClick={() => controls.current?.close()}>Back to panels</button></dialog> : header}
    <div className="lighting-summary"><span>{plan.items.length} fixtures</span><span>{plan.items.filter(row => ['patched', 'focused'].includes(row.status)).length} ready</span><span>{plan.items.filter(row => row.status === 'issue').length} issues</span><span>{plan.items.filter(row => hasConflict(row, conflictMap)).length} duplicate starts</span></div>
    {!compact && recoveryControls}
    <ConsoleWorkspace ws={compact ? { ...ws, mode: 'phone' } : ws} label="Lighting" extraViews={compact && <button aria-label="Lighting controls" onClick={() => controls.current?.showModal()}>Plan{dirty ? ' *' : ''}{recovery.offer || recovery.errors.length ? ' !' : ''}</button>} quick={LIBRARY.map(p => ({ type: p.type, label: p.name }))} render={render} onViewsChange={(next, text) => { if (editable) setPlan(p => ({ ...p, workspace: { version: 1, views: next } })); notify(editable ? text : 'Recover the saved plan before storing views.', !editable); }} notify={notify} />
    {!compact && notice}
    <dialog ref={modal} className="lighting-dialog" aria-label="Import plan" onCancel={event => { event.preventDefault(); closeImport(); }}><header><h2>{purpose === 'backup' ? 'Restore backup' : 'Review lighting plan'}</h2><button aria-label="Close import" onClick={closeImport}>Close</button></header><div className="lighting-import-body" data-web2-scroll>{purpose === 'source' && <button onClick={readLegacy}>Read saved Lighting Patch</button>}<label>Import JSON<input id="importFile" type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readFile(file); }} /></label><div id="importPreview" role="status"><p>{previewMessage}</p>{pending && <ul>{pending.plan.items.map(row => <li key={row.id}><strong>{row.unit || 'No unit'} · {row.fixture || 'Unnamed fixture'}</strong><span>{row.status}</span></li>)}</ul>}</div></div><button id="confirmImport" className="primary" disabled={!pending} onClick={confirmImport}>Apply preview</button></dialog>
  </main>;
  return present ? present(screen) : screen;
}
