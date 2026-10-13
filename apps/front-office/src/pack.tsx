import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Panel, View } from '../../shared/av-console/layout';
import { download, errorText, showContext, type Pack, type PackDef, type PackHost } from '../../shared/av-console/pack';
import { KEY, ADVANCE_KEY, STAGES, emptyDocument, addClient, addVenue, addJob, updateJob, parseShowAdvance, alreadyImportedAdvance, appendShowAdvance, type Advance, type Binding, type Job } from '../../../front-office/model.mjs';
import { DEFAULT_VIEWS, LIBRARY, loadPlan, parsePlan, savePlan, type Plan } from './model';
import { useRecovery } from './recovery';

/* Front Office panel pack (docs/av-suite-shell.md): jobs, clients, venues,
   job updates and the Front Office document with its Show Advance imports. */

type Preview = { before: string; stored: string | null; sourceRaw?: string; doc?: Plan; advance?: Advance };
type Update = { stage: string; nextAction: string; note: string };
const blankClient = { name: '', contact: '', notes: '' };
const blankVenue = { name: '', location: '', notes: '' };
const blankJob = { name: '', clientId: '', venueId: '', nextAction: '' };
const updateFor = (job: Job): Update => ({ stage: job.stage, nextAction: job.nextAction, note: '' });

export function useFrontOfficePack(host: PackHost): Pack {
  const [initial] = useState(() => { try { return loadPlan(localStorage); } catch { return loadPlan({ getItem: () => { throw Error('Unavailable'); } }); } });
  const [plan, setPlan] = useState<Plan>(initial.plan);
  const [saved, setSaved] = useState(JSON.stringify(initial.plan));
  const baseline = useRef(initial.raw);
  const current = useRef(plan); current.current = plan;
  const dirty = JSON.stringify(plan) !== saved;
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [recoveryAuthorized, setRecoveryAuthorized] = useState(false);
  const editable = !blocked || recoveryAuthorized;
  const [message, setMessage] = useState(initial.error || 'Ready. Add or update records, then Save.');
  const [problem, setProblem] = useState(Boolean(initial.error));
  // Forms live above the panels so switching, closing or maximizing cannot discard input.
  const [clientForm, setClientForm] = useState(blankClient);
  const [venueForm, setVenueForm] = useState(blankVenue);
  const [jobForm, setJobForm] = useState(blankJob);
  const [updates, setUpdates] = useState<Record<string, Update>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const pendingForms = [...Object.values(clientForm), ...Object.values(venueForm), ...Object.values(jobForm)].some(Boolean) || plan.jobs.some(job => updates[job.id] && JSON.stringify(updates[job.id]) !== JSON.stringify(updateFor(job)));
  const pendingRef = useRef(pendingForms); pendingRef.current = pendingForms;
  const [selected, setSelected] = useState('');
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewMessage, setPreviewMessage] = useState('Choose a source to preview.');
  const [purpose, setPurpose] = useState<'advance' | 'backup'>('advance');
  const [binding, setBinding] = useState<Binding>({ clientId: '__choose', venueId: '__choose', jobName: '' });
  const reading = useRef(0);
  const modal = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const recovery = useRecovery(plan, dirty, baseline.current, initial.plan, recoverPlan, text => notify(text), () => !pendingRef.current);
  const views = useMemo(() => plan.workspace?.views.length ? plan.workspace.views : DEFAULT_VIEWS, [plan.workspace]);
  const [context] = useState(() => showContext());
  const job = plan.jobs.find(row => row.id === selected) || plan.jobs[0];

  function notify(text: string, error = false) { setMessage(text); setProblem(error); host.notify(text, error); }
  function recoverPlan(next: Plan) { setPlan(next); setSelected(''); setUpdates({}); setFormErrors({}); setPreview(null); reading.current++; host.resetLayout(); }
  function noPending() {
    if (!pendingRef.current) return true;
    notify('Add or update unfinished forms, or clear them, before Save, export or replacement. Unapplied form input is kept while this tab stays open; drafts protect applied records only.', true);
    return false;
  }
  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) {
        try { if (localStorage.getItem(KEY) !== baseline.current) notify('Saved document changed in another tab. Export edits, then reload. Save will be refused.', true); }
        catch { notify('Browser storage became unavailable. Keep this tab open and export your work.', true); }
      }
    };
    window.addEventListener('storage', receive);
    return () => window.removeEventListener('storage', receive);
  }, []);
  function apply(event: FormEvent<HTMLFormElement>, make: () => Plan, clear: () => void) {
    event.preventDefault(); if (!editable) return;
    const form = event.currentTarget, kind = form.dataset.kind!;
    try { setPlan(parsePlan(make())); clear(); setFormErrors(v => ({ ...v, [kind]: '' })); notify('Record applied to working document. Save is still required.'); }
    catch (error) {
      const text = errorText(error); notify(text, true); setFormErrors(v => ({ ...v, [kind]: text }));
      // Report at the form without discarding input or forcing the operator out of the panel.
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[data-form-feedback]')?.focus());
    }
  }
  async function store() {
    if (!noPending()) return;
    try {
      if (!editable) throw Error('Review a valid backup or explicitly start fresh before replacing unreadable data.');
      if (!navigator.locks?.request) throw Error('This browser cannot coordinate saves across tabs. Export a backup and use a browser with Web Locks to save.');
      const snapshot = current.current, expected = baseline.current;
      const raw = await navigator.locks.request(KEY, () => savePlan(localStorage, snapshot, expected, recoveryAuthorized));
      baseline.current = raw; setSaved(raw); setBlocked(false); setRecoveryAuthorized(false);
      await recovery.saved(snapshot, raw);
      notify(recoveryAuthorized ? 'Recovered document saved; unreadable original preserved in browser storage.' : 'Saved to this browser and verified. Export a backup for recovery.');
    } catch (error) { notify(`Save failed: ${errorText(error)}`, true); }
  }
  function exportPlan(original = false) {
    if (!original && !noPending()) return;
    if (blocked && !recoveryAuthorized && baseline.current === null) { notify('Export unavailable: saved records could not be read. No original backup was created. Restore browser storage access and reload.', true); return; }
    const preserve = original || (blocked && !recoveryAuthorized);
    download(preserve ? 'front-office-unreadable-original.json' : 'front-office.json', preserve && baseline.current !== null ? baseline.current : JSON.stringify(plan, null, 2));
    notify('JSON downloaded. Backups may contain private contact and original Show Advance data.');
  }
  function startFresh() {
    if (!noPending() || !window.confirm('Start a fresh working document? The unreadable original stays untouched until explicit Save, which first preserves a recovery copy.')) return;
    recoverPlan(emptyDocument()); setRecoveryAuthorized(true); notify('Fresh working document. The original remains unchanged until explicit Save.');
  }
  function closeImport() { reading.current++; setPreview(null); modal.current?.close(); trigger.current?.focus(); }
  function openImport(next: 'advance' | 'backup') {
    if (!noPending()) return;
    if (next === 'advance' && !editable) { notify('Recover the saved document before importing an advance.', true); return; }
    trigger.current = document.activeElement as HTMLElement; setPurpose(next); setPreview(null); setPreviewMessage('Choose a source to preview.'); reading.current++; modal.current?.showModal();
  }
  function stagePreview(raw: string, before: Plan, fromSaved = false) {
    if (before !== current.current || pendingRef.current) throw Error('Working document changed while reading. Preview again.');
    if (localStorage.getItem(KEY) !== baseline.current) throw Error('Saved document changed in another tab. Export and reload.');
    const guard = { before: JSON.stringify(before), stored: baseline.current };
    if (purpose === 'backup') {
      const doc = parsePlan(JSON.parse(raw));
      setPreview({ ...guard, doc }); setPreviewMessage(`${doc.clients.length} clients · ${doc.venues.length} venues · ${doc.jobs.length} jobs. Replaces working records only after confirmation. Save remains explicit.`);
    } else {
      const advance = parseShowAdvance(raw);
      if (alreadyImportedAdvance(before, advance)) throw Error('This exact Show Advance is already copied into a job.');
      setPreview({ ...guard, advance, ...(fromSaved ? { sourceRaw: raw } : {}) });
      setBinding({ clientId: '__choose', venueId: '__choose', clientName: advance.meta.client, venueName: advance.meta.venue, jobName: advance.meta.showName });
      setPreviewMessage(before.jobs.some(row => row.name === advance.meta.showName) ? 'A job has this show name. This changed source will create a separate job, never merge it.' : 'Review the original and explicitly choose a client and venue.');
    }
  }
  async function readFile(file: File) {
    const generation = ++reading.current, before = current.current; setPreview(null);
    try {
      if (file.size > (purpose === 'backup' ? 2_000_000 : 1_000_000)) throw Error(purpose === 'backup' ? 'Backup is larger than 2 MB.' : 'Source is larger than 1 MB.');
      const raw = await file.text(); if (generation !== reading.current) return;
      stagePreview(raw, before);
    } catch (error) { if (generation === reading.current) setPreviewMessage(`Import rejected: ${errorText(error)}`); }
  }
  function readSavedAdvance() {
    reading.current++; setPreview(null);
    try { const raw = localStorage.getItem(ADVANCE_KEY); if (!raw) throw Error('No saved Show Advance on this origin. Choose an exported file instead.'); stagePreview(raw, current.current, true); }
    catch (error) { setPreviewMessage(`Import rejected: ${errorText(error)}`); }
  }
  function confirmImport() {
    if (!preview) return;
    try {
      if (pendingRef.current || JSON.stringify(current.current) !== preview.before || localStorage.getItem(KEY) !== preview.stored || (preview.sourceRaw !== undefined && localStorage.getItem(ADVANCE_KEY) !== preview.sourceRaw)) throw Error('Source or Front Office changed after preview. Preview again; current work was kept.');
      if (preview.doc) {
        if (!window.confirm(blocked ? 'Restore this backup? The unreadable original will be preserved before Save replaces it.' : 'Replace the working document? Export it first if needed. Save is still required.')) return;
        recoverPlan(preview.doc); setRecoveryAuthorized(blocked);
      } else if (preview.advance) {
        if (binding.clientId === '__choose' || binding.venueId === '__choose') throw Error('Explicitly choose an existing client and venue, or create each one.');
        const next = parsePlan(appendShowAdvance(current.current, preview.advance, binding));
        setPlan(next); setSelected(next.jobs.at(-1)!.id); host.show('updates');
      }
      closeImport(); notify('Import applied to working document. Review, then Save. Source tools are unchanged.');
    } catch (error) { setPreviewMessage(errorText(error)); }
  }
  function render(type: string, _panel: Panel) {
    const feedback = formErrors[type] && <p className="office-form-error" data-form-feedback role="alert" tabIndex={-1}>{formErrors[type]}</p>;
    if (type === 'clients') return { context: `${plan.clients.length} clients`, body: <div className="office-scroll" data-web2-scroll tabIndex={0} role="region" aria-label="Client records">
      <form data-kind={type} onSubmit={event => apply(event, () => addClient(current.current, clientForm.name, clientForm.contact, clientForm.notes), () => setClientForm(blankClient))}><fieldset disabled={!editable}><legend>New client</legend>
        <label>Client name<input required maxLength={500} value={clientForm.name} onChange={e => setClientForm(v => ({ ...v, name: e.target.value }))} /></label><label>Contact<input maxLength={2000} value={clientForm.contact} onChange={e => setClientForm(v => ({ ...v, contact: e.target.value }))} /></label><label>Client notes<textarea maxLength={2000} value={clientForm.notes} onChange={e => setClientForm(v => ({ ...v, notes: e.target.value }))} /></label>
        <div className="office-actions"><button type="submit" className="primary">Add client</button><button type="button" onClick={() => setClientForm(blankClient)}>Clear client form</button></div>{feedback}</fieldset></form>
      {plan.clients.map(row => <article key={row.id}><h3>{row.name}</h3><p>{row.contact || 'No contact recorded'}</p><p className="notes">{row.notes}</p></article>)}{!plan.clients.length && <p>No clients yet. Add one to link a job.</p>}
    </div> };
    if (type === 'venues') return { context: `${plan.venues.length} venues`, body: <div className="office-scroll" data-web2-scroll tabIndex={0} role="region" aria-label="Venue records">
      <form data-kind={type} onSubmit={event => apply(event, () => addVenue(current.current, venueForm.name, venueForm.location, venueForm.notes), () => setVenueForm(blankVenue))}><fieldset disabled={!editable}><legend>New venue</legend>
        <label>Venue name<input required maxLength={500} value={venueForm.name} onChange={e => setVenueForm(v => ({ ...v, name: e.target.value }))} /></label><label>Location<input maxLength={2000} value={venueForm.location} onChange={e => setVenueForm(v => ({ ...v, location: e.target.value }))} /></label><label>Venue notes<textarea maxLength={2000} value={venueForm.notes} onChange={e => setVenueForm(v => ({ ...v, notes: e.target.value }))} /></label>
        <div className="office-actions"><button type="submit" className="primary">Add venue</button><button type="button" onClick={() => setVenueForm(blankVenue)}>Clear venue form</button></div>{feedback}</fieldset></form>
      {plan.venues.map(row => <article key={row.id}><h3>{row.name}</h3><p>{row.location || 'No location recorded'}</p><p className="notes">{row.notes}</p></article>)}{!plan.venues.length && <p>No venues yet. Add one to link a job.</p>}
    </div> };
    if (type === 'jobs') return { context: `${plan.jobs.length} jobs`, body: <div className="office-scroll" data-web2-scroll tabIndex={0} role="region" aria-label="Job records">
      <label>Filter jobs by stage<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All stages</option>{STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></label>
      {plan.jobs.filter(row => filter === 'all' || row.stage === filter).map(row => <button className="office-job" key={row.id} aria-pressed={job?.id === row.id} onClick={() => { setSelected(row.id); host.show('updates'); }}><strong>{row.name}</strong><span>{row.stage} · {plan.clients.find(c => c.id === row.clientId)?.name} · {plan.venues.find(v => v.id === row.venueId)?.name}</span><small>{row.nextAction || 'No next action'}</small></button>)}
      {!plan.jobs.length && <p>Create a client and venue, then connect them to a job.</p>}
      <form data-kind={type} onSubmit={event => apply(event, () => addJob(current.current, jobForm.name, jobForm.clientId, jobForm.venueId, jobForm.nextAction), () => setJobForm(blankJob))}><fieldset disabled={!editable}><legend>New job</legend>
        <label>Job name<input required maxLength={500} value={jobForm.name} onChange={e => setJobForm(v => ({ ...v, name: e.target.value }))} /></label>
        <label>Client<select required value={jobForm.clientId} onChange={e => setJobForm(v => ({ ...v, clientId: e.target.value }))}><option value="">Choose client</option>{plan.clients.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label>Venue<select required value={jobForm.venueId} onChange={e => setJobForm(v => ({ ...v, venueId: e.target.value }))}><option value="">Choose venue</option>{plan.venues.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label>Next action<input maxLength={2000} value={jobForm.nextAction} onChange={e => setJobForm(v => ({ ...v, nextAction: e.target.value }))} /></label>
        <div className="office-actions"><button type="submit" className="primary">Add job</button><button type="button" onClick={() => setJobForm(blankJob)}>Clear job form</button></div>{feedback}</fieldset></form>
    </div> };
    if (type === 'updates') {
      const draft = job ? updates[job.id] || updateFor(job) : null;
      const field = (key: keyof Update, value: string) => { if (job && draft) setUpdates(v => ({ ...v, [job.id]: { ...draft, [key]: value } })); };
      return { context: job?.name || 'No job selected', body: <div className="office-scroll" data-web2-scroll tabIndex={0} role="region" aria-label="Job update records">{job && draft ? <>
        <label>Selected job<select value={job.id} onChange={e => setSelected(e.target.value)}>{plan.jobs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <p>{plan.clients.find(c => c.id === job.clientId)?.name} · {plan.venues.find(v => v.id === job.venueId)?.name}</p>
        <form data-kind={type} onSubmit={event => apply(event, () => updateJob(current.current, job.id, draft.stage, draft.nextAction, draft.note, new Date().toISOString()), () => setUpdates(v => { const next = { ...v }; delete next[job.id]; return next; }))}><fieldset disabled={!editable}><legend>Update this job</legend>
          <label>Stage<select value={draft.stage} onChange={e => field('stage', e.target.value)}>{STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></label><label>Next action<input maxLength={2000} value={draft.nextAction} onChange={e => field('nextAction', e.target.value)} /></label><label>Update note<textarea maxLength={500} value={draft.note} onChange={e => field('note', e.target.value)} /></label>
          <div className="office-actions"><button type="submit" className="primary">Update job</button><button type="button" onClick={() => setUpdates(v => { const next = { ...v }; delete next[job.id]; return next; })}>Clear update form</button></div>{feedback}</fieldset></form>
        {job.sourceAdvance && <article><h3>Copied Show Advance</h3><p>Imported {job.sourceAdvance.importedAt}. Original requests are retained, not converted into job updates.</p><button onClick={() => download('show-advance-original.json', job.sourceAdvance!.raw)}>Export original Show Advance</button></article>}
        <h3>Update history</h3>{job.updates.map(row => <article key={row.id}><time dateTime={row.date}>{row.date}</time><p className="notes">{row.body}</p></article>)}{!job.updates.length && <p>No dated updates yet.</p>}
      </> : <p>Select or create a job in Jobs.</p>}</div> };
    }
    return { context: `${plan.jobs.length} jobs`, body: <div className="office-scroll" data-web2-scroll tabIndex={0} role="region" aria-label="Front Office document">
      <section><h3>Save and backup</h3><button id="saveDocBtn" className="primary" onClick={() => void store()}>Save document</button><button onClick={() => exportPlan()}>Export JSON</button><button onClick={() => openImport('backup')}>Restore backup</button>{blocked && baseline.current !== null && <><button onClick={() => exportPlan(true)}>Download unreadable original</button><button onClick={startFresh}>Start fresh</button></>}<p>{dirty ? 'Unsaved record or view changes.' : 'Working records match this tab’s saved baseline.'} Apply form input with Add or Update before saving, exporting or restoring; draft recovery protects applied records only.</p></section>
      <section><h3>Import</h3><button className="primary" onClick={() => openImport('advance')}>Import Show Advance</button><p>Copy a saved or exported Show Advance into one new job. Choose the client and venue yourself; similar names never bind automatically. Original source JSON travels in the backup and may include private contact data.</p>{context && <p aria-label="Read-only show context">Host context (read-only): {context}. It does not bind client or venue identity.</p>}</section>
    </div> };
  }
  const dialogs = <dialog ref={modal} className="office-dialog" aria-label="Review import" onCancel={event => { event.preventDefault(); closeImport(); }}><header><h2>{purpose === 'backup' ? 'Restore backup' : 'Review Show Advance'}</h2><button aria-label="Close import" onClick={closeImport}>Close</button></header><div className="office-scroll" data-web2-scroll>
      {purpose === 'advance' && <button onClick={readSavedAdvance}>Read saved Show Advance</button>}<label>{purpose === 'backup' ? 'Backup JSON' : 'Show Advance JSON'}<input id="importFile" type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readFile(file); }} /></label>
      <p id="importPreview" role="status">{previewMessage}</p>
      {preview?.advance && <><article><h3>{preview.advance.meta.showName || 'Unnamed source show'}</h3><p>Source client: {preview.advance.meta.client || 'Not supplied'}</p><p>Source venue: {preview.advance.meta.venue || 'Not supplied'}</p><p>Date: {preview.advance.meta.showDate || 'Not supplied'}</p><p>{preview.advance.items.length} requests · {Object.entries(preview.advance.statusCounts).map(([state, count]) => `${count} ${state}`).join(' · ') || 'No requests'}</p>{preview.advance.unsupportedStatuses.length > 0 && <p>Unrecognized source statuses retained: {preview.advance.unsupportedStatuses.join(', ')}</p>}</article>
        <label>Bind client<select value={binding.clientId} onChange={e => setBinding(v => ({ ...v, clientId: e.target.value }))}><option value="__choose">Choose explicitly</option><option value="">Create new client</option>{plan.clients.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>{binding.clientId === '' && <label>New client name<input maxLength={500} value={binding.clientName || ''} onChange={e => setBinding(v => ({ ...v, clientName: e.target.value }))} /></label>}
        <label>Bind venue<select value={binding.venueId} onChange={e => setBinding(v => ({ ...v, venueId: e.target.value }))}><option value="__choose">Choose explicitly</option><option value="">Create new venue</option>{plan.venues.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>{binding.venueId === '' && <label>New venue name<input maxLength={500} value={binding.venueName || ''} onChange={e => setBinding(v => ({ ...v, venueName: e.target.value }))} /></label>}
        <label>Imported job name<input maxLength={500} value={binding.jobName} onChange={e => setBinding(v => ({ ...v, jobName: e.target.value }))} /></label><p>This copy starts at Advance with no inferred next action. The exact original source, including private data, remains in exported backups.</p>
      </>}
    </div><button id="confirmImport" className="primary" disabled={!preview} onClick={confirmImport}>Apply preview</button></dialog>;
  return {
    id: 'front-office', label: 'Front Office', title: `${plan.jobs.length} jobs`, summary: `${plan.jobs.length} jobs · ${plan.clients.length} clients · ${plan.venues.length} venues`,
    dirty, blocked: !editable, pending: pendingForms, save: store, exportDoc: () => exportPlan(), status: message, problem,
    recovery: { offer: recovery.offer, restore: recovery.restore, discard: recovery.discard, errors: recovery.errors },
    render, dialogs, quick: LIBRARY.map(p => ({ type: p.type, label: p.name })), library: LIBRARY, views,
    storeViews: (next: View[], text: string) => { if (editable) setPlan(p => ({ ...p, workspace: { version: 1, views: next } })); notify(editable ? text : 'Recover the saved document before storing views.', !editable); },
    layout: recovery.layout,
  };
}

export const frontOfficePack: PackDef = { id: 'front-office', label: 'Front Office', consoleId: 'front-office', library: LIBRARY, defaultViews: DEFAULT_VIEWS, use: useFrontOfficePack };
