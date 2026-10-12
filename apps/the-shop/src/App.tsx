import { useEffect, useMemo, useRef, useState } from 'react';
import { ConsoleWorkspace, useConsoleWorkspace } from '../../shared/av-console/Workspace';
import { KEY, SOURCES, PHASES, STATUSES, emptyPlan, stageLegacy, assertFreshSourceRows, countPair, type ShopItem, type SourceKind } from '../../../the-shop/model.mjs';
import { DEFAULT_VIEWS, LIBRARY, filterItems, loadPlan, normalizeItemEdit, parsePlan, quantityLabel, savePlan, type Plan } from './model';
import { useRecovery } from './recovery';

type Kind = SourceKind | 'shop-backup';
type Edit = Omit<ShopItem, 'requestedQty' | 'packedQty'> & { requestedQty: string; packedQty: string };
type Preview = { plan: Plan; kind: Kind; before: string; stored: string | null; sourceRaw?: string; added: ShopItem[] };
const editItem = (item: ShopItem): Edit => ({ ...item, requestedQty: String(item.requestedQty ?? ''), packedQty: String(item.packedQty ?? '') });
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Operation failed. Keep this tab open and export your work.';
const countHelp = 'Blank means unknown, not zero. Packed is an explicit count, never automatic readiness.';
function download(name: string, raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function App() {
  const [initial] = useState(() => { try { return loadPlan(localStorage); } catch { return loadPlan({ getItem: () => { throw Error('Unavailable'); } }); } });
  const [plan, setPlan] = useState<Plan>(initial.plan);
  const [saved, setSaved] = useState(JSON.stringify(initial.plan));
  const baseline = useRef(initial.raw);
  const current = useRef(plan); current.current = plan;
  const dirty = JSON.stringify(plan) !== saved;
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [recoveryAuthorized, setRecoveryAuthorized] = useState(false);
  const [message, setMessage] = useState(initial.error || 'Ready. Apply item edits, then Save this plan explicitly.');
  const [selected, setSelected] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const item = plan.items.find(row => row.id === selected);
  const formDirty = Boolean(item && edit && JSON.stringify(edit) !== JSON.stringify(editItem(item)));
  const editPending = useRef(formDirty); editPending.current = formDirty;
  const [countError, setCountError] = useState('');
  const [phase, setPhase] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Kind>('gear-prep');
  const [pending, setPending] = useState<Preview | null>(null);
  const [previewMessage, setPreviewMessage] = useState('Select a source to preview.');
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || 'dark');
  const darkTheme = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const [compact, setCompact] = useState(window.innerHeight < 500);
  const modal = useRef<HTMLDialogElement>(null);
  const controls = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const reading = useRef(0);
  const recovery = useRecovery(plan, dirty, baseline.current, initial.plan, recoverPlan, setMessage, () => !editPending.current);
  const views = useMemo(() => plan.workspace?.views.length ? plan.workspace.views : DEFAULT_VIEWS, [plan.workspace]);
  const ws = useConsoleWorkspace(views, LIBRARY, recovery.layout);
  const rows = filterItems(plan.items, phase, status, search);
  const [context] = useState(() => {
    const query = new URLSearchParams(location.search);
    return ['sbdShow', 'sbdVenue', 'sbdDate', 'sbdOperator', 'sbdPhase'].map(key => query.get(key)?.slice(0, 200)).filter(Boolean).join(' · ');
  });
  const editable = !blocked || recoveryAuthorized;

  function recoverPlan(next: Plan) { setPlan(next); setSelected(null); setEdit(null); setPending(null); reading.current++; ws.setLive({}); ws.setMax({}); }
  useEffect(() => {
    const resize = () => { setCompact(window.innerHeight < 500); controls.current?.close(); };
    const receiveTheme = (event: StorageEvent) => { if (event.key === 'av-theme-mode.v1' && ['light', 'dark', 'system'].includes(event.newValue || '')) setTheme(event.newValue!); };
    window.addEventListener('resize', resize); window.addEventListener('storage', receiveTheme);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('storage', receiveTheme); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.avTheme = theme;
    const light = document.querySelector<HTMLMetaElement>('meta[data-av-theme-color="light"]');
    const dark = document.querySelector<HTMLMetaElement>('meta[data-av-theme-color="dark"]');
    if (light) light.media = theme === 'system' ? '(prefers-color-scheme: light)' : theme === 'light' ? 'all' : 'not all';
    if (dark) dark.media = theme === 'system' ? '(prefers-color-scheme: dark)' : theme === 'dark' ? 'all' : 'not all';
  }, [theme]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (dirty || formDirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [dirty, formDirty]);
  function mayLeaveItem() { return !formDirty || window.confirm('Discard unapplied item changes? Apply first to include them in Save, export and draft recovery.'); }
  function select(row: ShopItem) {
    if (selected !== row.id && !mayLeaveItem()) return;
    if (selected !== row.id || !edit) { setSelected(row.id); setEdit(editItem(row)); setCountError(''); }
    ws.show('inspector');
  }
  function addItem() {
    if (!editable || !mayLeaveItem()) return;
    const row: ShopItem = { id: crypto.randomUUID(), title: 'New shop item', caseId: '', department: '', owner: '', location: '', destination: '', notes: '', blocker: '', phase: PHASES.find(p => p === phase) || 'prep', status: 'queued', requestedQty: null, packedQty: null, source: null, original: null };
    setPlan(p => ({ ...p, items: [row, ...p.items] })); setSelected(row.id); setEdit(editItem(row)); setCountError(''); ws.show('inspector'); setMessage('Item added as unsaved work.');
  }
  function applyItem() {
    if (!editable || !edit || !item) return;
    if (!edit.title.trim()) { setMessage('Item name is required.'); document.querySelector<HTMLInputElement>('[name="title"]')?.focus(); return; }
    try {
      const counts = countPair(edit.requestedQty, edit.packedQty);
      const candidate = normalizeItemEdit({ ...edit, ...counts });
      const next = parsePlan({ ...plan, items: plan.items.map(row => row.id === selected ? candidate : row) });
      setPlan(next); setEdit(editItem(next.items.find(row => row.id === selected)!)); setCountError(''); setMessage('Item changes applied. Save plan to keep them.');
    } catch (error) { const text = errorText(error); setMessage(text); setCountError(text); requestAnimationFrame(() => document.getElementById('countHelp')?.scrollIntoView({ block: 'nearest' })); }
  }
  async function store() {
    try {
      if (!editable) throw Error('Existing saved plan is unreadable. Preview a valid Shop backup to recover it.');
      if (formDirty) throw Error('Apply item changes before Save. The inspector still holds your pending edits.');
      setMessage('Saving plan…');
      const snapshot = current.current;
      const action = () => savePlan(localStorage, snapshot, baseline.current, recoveryAuthorized);
      const raw = navigator.locks ? await navigator.locks.request(KEY, action) : action();
      baseline.current = raw; setSaved(raw); setBlocked(false); setRecoveryAuthorized(false);
      await recovery.saved(snapshot, raw);
      setMessage(recoveryAuthorized ? 'Recovered plan saved; unreadable original preserved in browser storage.' : 'Saved to this browser and verified. Export a backup for recovery.');
    } catch (error) { setMessage(`Save failed: ${errorText(error)}`); }
  }
  function exportPlan(original = false) {
    if (!original && editable && formDirty) { setMessage('Apply item changes before export. Pending inspector edits have not been included in the plan.'); return; }
    const raw = (original || (blocked && !recoveryAuthorized)) && baseline.current !== null ? baseline.current : JSON.stringify(plan, null, 2);
    download(original || (blocked && !recoveryAuthorized) ? 'the-shop-unreadable-original.json' : 'the-shop-plan.json', raw);
    setMessage('JSON backup downloaded.');
  }
  function closeImport() { reading.current++; setPending(null); modal.current?.close(); trigger.current?.focus(); }
  function openImport(next: Kind = kind) {
    trigger.current = document.activeElement as HTMLElement; setKind(next); setPending(null); setPreviewMessage('Select a source to preview.'); reading.current++; modal.current?.showModal();
  }
  function prepare(raw: string, sourceRaw?: string) {
    const payload: unknown = JSON.parse(raw);
    if (blocked && kind !== 'shop-backup') throw Error('Preview a valid Shop backup to recover the unreadable saved plan.');
    if (localStorage.getItem(KEY) !== baseline.current) throw Error('Saved plan changed in another tab. Export this work, then reload.');
    const added = kind === 'shop-backup' ? [] : stageLegacy(kind, payload);
    if (kind !== 'shop-backup') assertFreshSourceRows(plan.items, added);
    const next = kind === 'shop-backup' ? parsePlan(payload) : parsePlan({ ...plan, items: [...plan.items, ...added] });
    setPending({ kind, plan: next, added, before: JSON.stringify(current.current), stored: baseline.current, sourceRaw });
    setPreviewMessage(kind === 'shop-backup' ? `${next.items.length} Shop rows ready to restore. Confirming replaces the in-memory plan; Save is still required.` : `${added.length} rows ready to copy. Original records and legacy saved bytes remain unchanged.`);
  }
  function readSaved() {
    reading.current++; setPending(null);
    try { if (kind === 'shop-backup') throw Error('Choose a Shop JSON backup file.'); const raw = localStorage.getItem(SOURCES[kind].key); if (!raw) throw Error(`No saved ${SOURCES[kind].label} plan found in this browser.`); prepare(raw, raw); }
    catch (error) { setPreviewMessage(errorText(error)); }
  }
  async function readFile(file: File) {
    const generation = ++reading.current; setPending(null);
    const before = current.current;
    try { if (file.size > 5_000_000) throw Error('File is too large (5 MB limit).'); const raw = await file.text(); if (generation !== reading.current) return; if (current.current !== before) throw Error('The plan changed while reading. Preview again; current work was kept.'); prepare(raw); }
    catch (error) { if (generation === reading.current) setPreviewMessage(errorText(error)); }
  }
  function confirmImport() {
    if (!pending) return;
    try {
      if (JSON.stringify(current.current) !== pending.before || localStorage.getItem(KEY) !== pending.stored) throw Error('The plan changed after preview. Preview again; current work was kept.');
      if (pending.kind !== 'shop-backup') {
        if (pending.sourceRaw !== undefined && localStorage.getItem(SOURCES[pending.kind].key) !== pending.sourceRaw) throw Error('Saved source changed after preview. Preview it again.');
        assertFreshSourceRows(plan.items, pending.added);
      }
      if (!mayLeaveItem()) return;
      if (pending.kind === 'shop-backup' && !window.confirm(blocked ? 'Restore this valid backup? The unreadable saved original will be preserved before Save replaces it.' : 'Replace the current in-memory Shop plan with this backup? Saved data remains until you Save.')) return;
      if (pending.kind === 'shop-backup') { setRecoveryAuthorized(blocked); ws.setLive({}); ws.setMax({}); }
      setPlan(pending.plan); setSelected(null); setEdit(null); closeImport(); ws.show('worklist'); setMessage('Rows loaded as unsaved work. Review and Save.');
    } catch (error) { setPending(null); setPreviewMessage(errorText(error)); }
  }
  function toggleTheme() { const next = darkTheme ? 'light' : 'dark'; setTheme(next); try { localStorage.setItem('av-theme-mode.v1', next); } catch { setMessage('Theme changed for this visit only.'); } }
  const field = (key: keyof Pick<Edit, 'title' | 'caseId' | 'department' | 'owner' | 'location' | 'destination' | 'notes' | 'blocker' | 'requestedQty' | 'packedQty'>, label: string) => <label>{label}{key === 'notes' || key === 'blocker' ? <textarea name={key} value={edit![key]} maxLength={key === 'notes' ? 2000 : 1000} onChange={event => setEdit(e => e && ({ ...e, [key]: event.target.value }))} /> : <input name={key} value={edit![key]} inputMode={key.endsWith('Qty') ? 'numeric' : undefined} aria-invalid={key.endsWith('Qty') ? Boolean(countError) : undefined} aria-describedby={key.endsWith('Qty') ? 'countHelp' : undefined} maxLength={key.endsWith('Qty') ? 6 : ['title', 'location', 'destination'].includes(key) ? 240 : key === 'department' ? 80 : 120} onChange={event => { setEdit(e => e && ({ ...e, [key]: event.target.value })); setCountError(''); }} />}</label>;
  function render(type: string) {
    if (type === 'worklist') return { context: `${rows.length}/${plan.items.length} items`, actions: <button disabled={!editable} onClick={addItem}>Add item</button>, body: <div id="worklist" className="shop-worklist" tabIndex={-1}>
      <div className="shop-filters" data-web2-scroll><label>Search<input id="search" type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Phase<select id="phaseFilter" value={phase} onChange={e => setPhase(e.target.value)}><option value="all">All phases</option>{PHASES.map(p => <option key={p}>{p}</option>)}</select></label><label>Status<select id="statusFilter" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label></div>
      <div id="rows" className="shop-list" data-web2-scroll tabIndex={0} role="region" aria-label="Work items">{rows.length ? rows.map(row => <button className="row" key={row.id} aria-pressed={row.id === selected} onClick={() => select(row)}><strong>{row.title}</strong><span>{row.phase} · {row.status} · {[row.caseId, row.owner, row.department].filter(Boolean).join(' · ') || 'Unassigned'}</span><small>{quantityLabel(row)}</small>{row.blocker.trim() && <small className="shop-blocker">Blocker: {row.blocker}</small>}</button>) : <p>No items in this view. Add an item or review a source in Plan/Import.</p>}</div></div> };
    if (type === 'inspector') return { context: formDirty ? 'Unapplied item edits' : 'Apply before Save', body: item && edit ? <form id="itemForm" className="shop-inspector" onSubmit={e => { e.preventDefault(); applyItem(); }}>
      <div className="shop-editor" data-web2-scroll><h2 id="detailTitle">{item.title}</h2><p className="shop-provenance">{item.source ? `Copied from ${SOURCES[item.source.kind]?.label || item.source.kind}${item.source.show ? ` · ${item.source.show}` : ''}. Original record retained.` : 'Independent Shop item.'}</p><fieldset disabled={!editable}><legend>Item details</legend><div className="shop-fields">{field('title', 'Item name')}{field('caseId', 'Case')}{field('department', 'Department')}{field('owner', 'Owner')}{field('location', 'Location')}{field('destination', 'Destination')}<label>Phase<select name="phase" value={edit.phase} onChange={e => setEdit(v => v && ({ ...v, phase: e.target.value as ShopItem['phase'] }))}>{PHASES.map(p => <option key={p}>{p}</option>)}</select></label><label>Status<select name="status" value={edit.status} onChange={e => setEdit(v => v && ({ ...v, status: e.target.value as ShopItem['status'] }))}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>{field('requestedQty', 'Requested quantity')}{field('packedQty', 'Packed quantity')}<p id="countHelp" className={countError ? 'error wide' : 'wide'} role={countError ? 'alert' : undefined}>{countError || countHelp}</p>{field('blocker', 'Blocker')}{field('notes', 'Notes')}</div></fieldset><button type="button" disabled={!editable} onClick={() => { if (window.confirm('Remove this item from The Shop? The original source record stays saved.')) { setPlan(p => ({ ...p, items: p.items.filter(row => row.id !== selected) })); setSelected(null); setEdit(null); ws.show('worklist'); setMessage('Item removed from this working plan. Save stays explicit.'); } }}>Remove item</button></div>
      <div className="shop-editor-actions"><button type="button" onClick={() => ws.show('worklist')}>Worklist</button><button className="primary" disabled={!editable} type="submit">Apply changes</button></div></form> : <div className="shop-menu" data-web2-scroll><p>Select an item in Worklist to edit it here.</p><button onClick={() => ws.show('worklist')}>Show worklist</button><button disabled={!editable} onClick={addItem}>Add item</button></div> };
    if (type === 'plan') return { body: <div className="shop-menu" data-web2-scroll tabIndex={0} role="region" aria-label="Plan and import controls"><label>Plan name<input id="planName" disabled={!editable} value={plan.name} maxLength={120} onChange={e => setPlan(p => ({ ...p, name: e.target.value }))} /></label><button id="importBtn" onClick={() => openImport('gear-prep')}>Import source</button><button disabled={!editable} onClick={addItem}>Add item</button><p>Review copies from Gear Prep, Truck Pack Plan, Load In Plan and Strike Plan. Originals remain with their tools.</p><p>Counts never set status or clear a blocker. Unknown is not zero.</p>{context && <p aria-label="Read-only show context">{context}</p>}</div> };
    return { body: <div className="shop-menu" data-web2-scroll tabIndex={0} role="region" aria-label="Backup controls"><button className="primary" onClick={() => void store()}>Save plan</button><button onClick={() => exportPlan()}>Export JSON</button><button onClick={() => openImport('shop-backup')}>Restore backup</button>{blocked && baseline.current !== null && <button onClick={() => exportPlan(true)}>Download unreadable original</button>}<p>{formDirty ? 'Apply pending inspector edits before Save or export. They remain in this tab until applied or discarded.' : dirty ? 'Unsaved changes. Save is independent of the AV Video host.' : 'The working plan matches this tab’s saved baseline.'}</p><p>Draft recovery protects applied working-plan edits. Export a backup before clearing browser data.</p></div> };
  }
  const header = <header className="shop-header"><div><small>AV BY DAVE / PREP TO STRIKE</small><h1>The Shop</h1><p>{plan.name} · {plan.items.length} items{dirty ? ' · unsaved' : ''}{formDirty ? ' · item edits pending' : ''}</p></div><div className="shop-actions"><button onClick={toggleTheme}>{darkTheme ? 'Light mode' : 'Dark mode'}</button><button id="saveBtn" className="primary" onClick={() => void store()}>Save plan</button></div></header>;
  const notice = <footer id="footerMessage" className="shop-status" role="status" aria-live="polite">{message}{recovery.errors.map(error => <span key={error}>{error}</span>)}</footer>;
  const recoveryControls = recovery.offer && <section className="shop-recovery" aria-label="Draft recovery"><p>Unsaved draft available.{recovery.offer.baseline !== baseline.current && ' The saved plan changed since this draft.'}</p><button disabled={!editable || formDirty} onClick={() => void recovery.restore()}>Restore draft</button><button onClick={() => void recovery.discard()}>Discard draft</button></section>;
  return <main id="main" className={`shop-app${compact ? ' shop-compact' : ''}`} tabIndex={-1}>
    {compact ? <dialog ref={controls} className="shop-controls" aria-label="Shop controls">{header}{recoveryControls}{notice}<button onClick={() => controls.current?.close()}>Back to panels</button></dialog> : header}
    <div className="shop-summary"><span>{plan.items.filter(row => row.status === 'working').length} working</span><span>{plan.items.filter(row => row.status === 'hold' || row.blocker.trim()).length} held / blocked</span><span>{plan.items.filter(row => row.status === 'ready').length} marked ready</span></div>
    {!compact && recoveryControls}
    <ConsoleWorkspace ws={compact ? { ...ws, mode: 'phone' } : ws} label="The Shop" extraViews={compact && <button aria-label="Shop controls" onClick={() => controls.current?.showModal()}>Shop{dirty || formDirty ? ' *' : ''}{recovery.offer || recovery.errors.length ? ' !' : ''}</button>} quick={LIBRARY.map(p => ({ type: p.type, label: p.name }))} render={render} onViewsChange={(next, text) => { if (editable) setPlan(p => ({ ...p, workspace: { version: 1, views: next } })); setMessage(editable ? text : 'Recover the saved plan before storing views.'); }} notify={setMessage} />
    {!compact && notice}
    <dialog ref={modal} className="shop-dialog" aria-label="Import source" onCancel={e => { e.preventDefault(); closeImport(); }}><header><h2>Review source</h2><button aria-label="Close import" onClick={closeImport}>Close</button></header><div className="shop-import-body" data-web2-scroll><label>Source<select id="sourceKind" value={kind} onChange={e => { setKind(e.target.value as Kind); setPending(null); reading.current++; setPreviewMessage('Select a source to preview.'); }}>{Object.entries(SOURCES).map(([key, spec]) => <option value={key} key={key}>{spec.label}</option>)}<option value="shop-backup">Shop backup</option></select></label><button disabled={kind === 'shop-backup'} onClick={readSaved}>Preview saved source</button><label>Import JSON<input id="importFile" type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readFile(file); }} /></label><div id="importPreview" role="status"><p>{previewMessage}</p>{pending && <ul>{(pending.kind === 'shop-backup' ? pending.plan.items : pending.added).map(row => <li key={row.id}><strong>{row.title}</strong><span>{quantityLabel(row)}</span></li>)}</ul>}</div></div><button className="primary" disabled={!pending || (pending.kind !== 'shop-backup' && !pending.added.length)} onClick={confirmImport}>Add previewed rows</button></dialog>
  </main>;
}
