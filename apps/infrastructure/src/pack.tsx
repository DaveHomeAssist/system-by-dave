import { useEffect, useMemo, useRef, useState } from 'react';
import type { Panel, View } from '../../shared/av-console/layout';
import { download, errorText, showContext, type Pack, type PackDef, type PackHost } from '../../shared/av-console/pack';
import { KEY, SCHEMA, TYPES, legacyPreview, mergeLegacy, counts, issueFor, type Kind, type RecordRow } from '../../../infrastructure/model.mjs';
import { DEFAULT_VIEWS, LIBRARY, fieldValue, loadPlan, newRecord, parsePlan, savePlan, updateRecord, type Plan } from './model';
import { useRecovery } from './recovery';

/* Infrastructure panel pack (docs/av-suite-shell.md): power, network and cable
   records, the issue queue and the Infrastructure document. */

type Preview = { plan: Plan; before: string; stored: string | null; replacement: boolean; count: number };

export function useInfrastructurePack(host: PackHost): Pack {
  const [initial] = useState(() => { try { return loadPlan(localStorage); } catch { return loadPlan({ getItem: () => { throw Error('Unavailable'); } }); } });
  const [plan, setPlan] = useState<Plan>(initial.plan);
  const [saved, setSaved] = useState(JSON.stringify(initial.plan));
  const baseline = useRef(initial.raw);
  const current = useRef(plan); current.current = plan;
  const dirty = JSON.stringify(plan) !== saved;
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [recoveryAuthorized, setRecoveryAuthorized] = useState(false);
  const editable = !blocked || recoveryAuthorized;
  const [message, setMessage] = useState(initial.error || 'Ready. Record edits stay unsaved until Save plan.');
  const [problem, setProblem] = useState(Boolean(initial.error));
  // Positions avoid conflating two legacy records that happen to share an ID.
  const [selection, setSelection] = useState<Partial<Record<Kind, number>>>({});
  const [pending, setPending] = useState<Preview | null>(null);
  const [previewMessage, setPreviewMessage] = useState('Select a JSON file to preview.');
  const [purpose, setPurpose] = useState<'source' | 'backup'>('source');
  const reading = useRef(0);
  const modal = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const recovery = useRecovery(plan, dirty, baseline.current, initial.plan, recoverPlan, text => notify(text), () => true);
  const views = useMemo(() => plan.workspace?.views.length ? plan.workspace.views : DEFAULT_VIEWS, [plan.workspace]);
  const summary = counts(plan.records);
  const [context] = useState(() => showContext());
  function notify(text: string, error = false) { setMessage(text); setProblem(error); host.notify(text, error); }
  function recoverPlan(next: Plan) { setPlan(next); setSelection({}); setPending(null); reading.current++; host.resetLayout(); }
  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if ((event.key === KEY || event.key === null) && localStorage.getItem(KEY) !== baseline.current) notify('Saved plan changed in another tab. Export your edits, then reload. Save will be refused.', true);
    };
    window.addEventListener('storage', receive);
    return () => window.removeEventListener('storage', receive);
  }, []);
  function add(type: Kind) {
    if (!editable) return;
    try {
      const index = plan.records.length;
      setPlan(parsePlan({ ...plan, records: [...plan.records, newRecord(type)] }));
      setSelection(value => ({ ...value, [type]: index })); notify(`${TYPES[type].title} record added as unsaved work.`);
    } catch (error) { notify(errorText(error), true); }
  }
  function edit(index: number, field: string, value: string) {
    if (!editable) return;
    try { setPlan(updateRecord(current.current, index, field, value)); }
    catch (error) { notify(errorText(error), true); }
  }
  function remove(index: number) {
    if (!editable || !window.confirm('Remove this record from the working plan? Retained source imports remain unchanged. Save stays explicit.')) return;
    setPlan(p => ({ ...p, records: p.records.filter((_, i) => i !== index) })); setSelection({});
    notify('Record removed from the working plan. Save is still required.');
  }
  async function store() {
    try {
      if (!editable) throw Error('Review a valid Infrastructure backup before replacing unreadable saved data.');
      if (!navigator.locks?.request) throw Error('This browser cannot coordinate saves across tabs. Export a backup and use a browser with Web Locks to save.');
      const snapshot = current.current;
      const raw = await navigator.locks.request(KEY, () => savePlan(localStorage, snapshot, baseline.current, recoveryAuthorized));
      baseline.current = raw; setSaved(raw); setBlocked(false); setRecoveryAuthorized(false);
      await recovery.saved(snapshot, raw);
      notify(recoveryAuthorized ? 'Recovered plan saved; unreadable original preserved in browser storage.' : 'Saved to this browser and verified. Export a backup for recovery.');
    } catch (error) { notify(`Save failed: ${errorText(error)}`, true); }
  }
  function exportPlan(original = false) {
    const preserve = original || (blocked && !recoveryAuthorized);
    download(preserve ? 'infrastructure-unreadable-original.json' : 'infrastructure-plan.json', preserve && baseline.current !== null ? baseline.current : JSON.stringify(plan, null, 2));
    notify('JSON backup downloaded.');
  }
  function closeImport() { reading.current++; setPending(null); modal.current?.close(); trigger.current?.focus(); }
  function openImport(next: 'source' | 'backup') {
    trigger.current = document.activeElement as HTMLElement; setPurpose(next); setPending(null); setPreviewMessage('Select a JSON file to preview.'); reading.current++; modal.current?.showModal();
  }
  async function readFile(file: File) {
    const generation = ++reading.current; const before = current.current; setPending(null);
    try {
      if (file.size > 5_000_000) throw Error('File is too large (5 MB limit).');
      const raw = await file.text(); if (generation !== reading.current) return;
      if (before !== current.current) throw Error('The working plan changed while reading. Preview again.');
      if (localStorage.getItem(KEY) !== baseline.current) throw Error('Saved plan changed in another tab. Export and reload.');
      const value = JSON.parse(raw);
      const replacement = value?.schema === SCHEMA;
      if (replacement !== (purpose === 'backup')) throw Error(purpose === 'backup' ? 'Choose an Infrastructure backup.' : 'Choose a Power Plan, Network Plan or Cable Plan export. Use Restore backup for a full plan.');
      if (blocked && !replacement) throw Error('Review a valid Infrastructure backup to recover unreadable saved data.');
      const source = replacement ? null : legacyPreview(value);
      const candidate = parsePlan(replacement ? value : mergeLegacy(before, source!));
      const count = source ? source.records.length : candidate.records.length;
      setPending({ plan: candidate, before: JSON.stringify(before), stored: baseline.current, replacement, count });
      setPreviewMessage(replacement ? `Replace working plan with “${candidate.name}” and ${count} records? Saved data remains until explicit Save.` : `Copy ${count} ${TYPES[source!.kind].title} records. Their original fields and source document remain in this backup. Source tool data is unchanged.`);
    } catch (error) { if (generation === reading.current) setPreviewMessage(`Import rejected: ${errorText(error)}`); }
  }
  function confirmImport() {
    if (!pending) return;
    try {
      if (JSON.stringify(current.current) !== pending.before || localStorage.getItem(KEY) !== pending.stored) throw Error('Plan changed after preview. Preview again; current work was kept.');
      if (pending.replacement && !window.confirm(blocked ? 'Restore this backup? The unreadable original will be preserved before Save replaces it.' : 'Replace the current working plan? Export it first if needed. Save is still required.')) return;
      if (pending.replacement) { setRecoveryAuthorized(blocked); host.resetLayout(); }
      setPlan(pending.plan); setSelection({}); closeImport(); notify('Import applied to the unsaved working plan. Review, then Save.');
    } catch (error) { setPending(null); setPreviewMessage(errorText(error)); }
  }
  function recordField(row: RecordRow, index: number, field: string, label: string) {
    return <label>{label}{field === 'issue' ? <textarea name={field} value={fieldValue(row, field)} onChange={e => edit(index, field, e.target.value)} /> : <input name={field} value={fieldValue(row, field)} onChange={e => edit(index, field, e.target.value)} />}</label>;
  }
  function render(type: string, _panel: Panel) {
    if (type === 'power' || type === 'network' || type === 'cable') {
      const spec = TYPES[type];
      const entries = plan.records.map((row, index) => ({ row, index })).filter(entry => entry.row.type === type);
      const chosen = entries.find(entry => entry.index === selection[type]) || entries[0];
      const row = chosen?.row; const index = chosen?.index ?? -1;
      return { context: `${entries.length} records`, body: <div className="infra-records" data-web2-scroll tabIndex={0} role="region" aria-label={`${spec.title} records`}>
        <div className="infra-record-actions"><button disabled={!editable} onClick={() => add(type)}>Add {spec.label}</button>{row && <button disabled={!editable} onClick={() => remove(index)}>Remove record</button>}</div>
        {row ? <><label>{spec.title} record<select value={index} onChange={e => setSelection(v => ({ ...v, [type]: Number(e.target.value) }))}>{entries.map(({ row, index }) => <option key={index} value={index}>{row.name.trim() || `Unnamed ${spec.label}`} · {row.status}</option>)}</select></label>
          <fieldset disabled={!editable}><legend>{row.sourceRecord ? 'Imported copy · original retained' : 'Independent planning record'}</legend><div className="infra-record-fields">
            {recordField(row, index, 'name', spec.label[0].toUpperCase() + spec.label.slice(1))}{recordField(row, index, 'location', 'Location / zone / path')}
            <label>Status<select name="status" value={row.status} onChange={e => edit(index, 'status', e.target.value)}>{Array.from(new Set([...spec.status, row.status])).map(status => <option key={status} value={status}>{status}</option>)}</select></label>
            {recordField(row, index, 'issue', 'Issue / blocker')}
            {type === 'power' && <>{recordField(row, index, 'capacity', 'Capacity (A)')}{recordField(row, index, 'draw', 'Draw (A)')}</>}
            {type === 'network' && <>{recordField(row, index, 'ip', 'IP address')}{recordField(row, index, 'vlan', 'VLAN')}</>}
            {type === 'cable' && <>{recordField(row, index, 'source', 'Source')}{recordField(row, index, 'destination', 'Destination')}</>}
          </div></fieldset>
          {issueFor(row) && <p className="error" aria-label="Record issue">{issueFor(row)}</p>}
          <p className="infra-provenance">{type === 'power' ? 'Blank is unknown, not measured zero. Capacity and draw are planning inputs, not an electrical safety approval.' : 'Status is an operator record, not a live equipment test.'}</p>
        </> : <p>No {spec.title.toLowerCase()} records. Add one or review a legacy export in Document.</p>}
      </div> };
    }
    if (type === 'issues') return { context: `${summary.issues} issues`, body: <div className="infra-menu" data-web2-scroll tabIndex={0} role="region" aria-label="Issue queue">{plan.records.map((row, index) => issueFor(row) ? <button className="infra-issue" key={index} onClick={() => { setSelection(v => ({ ...v, [row.type]: index })); host.show(row.type); }}><strong>{row.name.trim() || 'Unnamed record'}</strong><span>{TYPES[row.type].title} · {row.status}</span><small>{issueFor(row)}</small></button> : null)}{!summary.issues && <p>No issues recorded. This is not a safety verdict.</p>}<p>Opening a record never changes its status. Ready and issue counts are independent.</p></div> };
    return { context: plan.name, body: <div className="infra-menu" data-web2-scroll tabIndex={0} role="region" aria-label="Infrastructure document">
      <section><h3>Plan</h3><label>Plan name<input id="planName" disabled={!editable} value={plan.name} onChange={e => setPlan(p => ({ ...p, name: e.target.value }))} /></label>{context && <p aria-label="Read-only show context">{context}</p>}<p>Planning assistance only. No electrical safety approval, network test or equipment control.</p></section>
      <section><h3>Save and backup</h3><button id="saveDocBtn" className="primary" onClick={() => void store()}>Save plan</button><button onClick={() => exportPlan()}>Export JSON</button><button onClick={() => openImport('backup')}>Restore backup</button>{blocked && baseline.current !== null && <button onClick={() => exportPlan(true)}>Download unreadable original</button>}<p>{dirty ? 'Unsaved changes. Save affects only Infrastructure.' : 'The working plan matches this tab’s saved baseline.'} Drafts are device-local recovery; export a backup before clearing browser data.</p></section>
      <section><h3>Import</h3><button id="importBtn" onClick={() => openImport('source')}>Import source</button><p>Review Power Plan, Network Plan or Cable Plan JSON exports. Original source objects remain in this plan; other tools are never changed.</p></section>
    </div> };
  }
  const dialogs = <dialog ref={modal} className="infra-dialog" aria-label="Import source" onCancel={event => { event.preventDefault(); closeImport(); }}><header><h2>{purpose === 'backup' ? 'Restore backup' : 'Review source'}</h2><button aria-label="Close import" onClick={closeImport}>Close</button></header><div className="infra-import-body" data-web2-scroll><p>{purpose === 'backup' ? 'Choose an Infrastructure JSON backup. Preview before replacing working records.' : 'Choose a Power Plan, Network Plan or Cable Plan JSON export.'}</p><label>Import JSON<input id="importFile" type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readFile(file); }} /></label><div id="importPreview" role="status"><p>{previewMessage}</p>{pending && <ul>{pending.plan.records.slice(pending.replacement ? 0 : plan.records.length).map((row, index) => <li key={index}><strong>{row.name.trim() || 'Unnamed record'}</strong><span>{TYPES[row.type].title} · {row.status}</span></li>)}</ul>}</div></div><button id="confirmImport" className="primary" disabled={!pending} onClick={confirmImport}>Apply preview</button></dialog>;
  return {
    id: 'infrastructure', label: 'Infrastructure', title: plan.name, summary: `${summary.total} records · ${summary.ready} marked ready · ${summary.issues} issues`,
    dirty, blocked: !editable, save: store, exportDoc: () => exportPlan(), status: message, problem, notify,
    recovery: { offer: recovery.offer, restore: recovery.restore, discard: recovery.discard, errors: recovery.errors },
    render, dialogs, quick: LIBRARY.map(p => ({ type: p.type, label: p.name })), library: LIBRARY, views,
    storeViews: (next: View[], text: string) => { if (editable) setPlan(p => ({ ...p, workspace: { version: 1, views: next } })); notify(editable ? text : 'Recover the saved plan before storing views.', !editable); },
    layout: recovery.layout,
  };
}

export const infrastructurePack: PackDef = { id: 'infrastructure', label: 'Infrastructure', consoleId: 'infrastructure', library: LIBRARY, defaultViews: DEFAULT_VIEWS, use: useInfrastructurePack };
