import { useEffect, useMemo, useRef, useState } from "react";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import { KEY, ROOM_CHECK_KEY, TASK_BOARD_KEY, CREW_CALL_KEY, addRecord, updateRecord, handoff, statuses, previewRoomCheck, copyRoomCheck, previewTaskBoard, copyTaskBoard, previewCrewCall, copyCrewCall, type Kind, type RecordRow, type CopyPreview } from "../../../show-ops/model.mjs";
import { DEFAULT_VIEWS, LIBRARY, loadDocument, parseDocument, preserveWorkspace, saveDocument, type ShowDocument } from "./model";
import { useRecovery } from "./recovery";

const copies = {
  room: { label: "Room Check", key: ROOM_CHECK_KEY, kind: "rooms", status: "Needs check", preview: previewRoomCheck, copy: copyRoomCheck, checkbox: "room-check-row", fields: ["area", "check", "owner", "due", "priority", "status", "blocker", "notes"] },
  task: { label: "Show Task Board", key: TASK_BOARD_KEY, kind: "tasks", status: "Open", preview: previewTaskBoard, copy: copyTaskBoard, checkbox: "task-board-row", fields: ["task", "area", "owner", "due", "priority", "status", "source", "blocker", "notes"] },
  crew: { label: "Crew Call", key: CREW_CALL_KEY, kind: "crew", status: "Called", preview: previewCrewCall, copy: copyCrewCall, checkbox: "crew-call-row", fields: ["section", "name", "role", "status", "call", "location", "meal", "release", "phone", "notes"] },
} as const;
type CopyType = keyof typeof copies;
type PendingCopy = { type: CopyType; preview: CopyPreview; origin: "saved" | "file"; docAtPreview: string; targetAtPreview: string | null; selected: string[] };
const titles = { rooms: "Room / area", crew: "Crew member / role", tasks: "Task" };
const details = { rooms: "Owner, deadline or blocker", crew: "Call time, location or contact", tasks: "Owner, deadline or next action" };
const singular = { rooms: "room", crew: "crew member", tasks: "task" };
const errorText = (error: unknown) => error instanceof Error ? error.message : "Operation failed. Export your edits before leaving.";
function download(name: string, raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SourceDetails({ row }: { row: RecordRow }) {
  const source = row.source || row.taskSource || row.crewSource;
  if (!source) return null;
  const label = row.source ? "Room Check" : row.taskSource ? "Show Task Board" : "Crew Call";
  return <details className="ops-source source-fields"><summary>Original {label}: {source.snapshot.status}</summary><dl>{Object.entries(source.snapshot).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || "Not set"}</dd></div>)}</dl></details>;
}

function Records({ kind, rows, add, edit, remove }: { kind: Kind; rows: RecordRow[]; add: (name: string, detail: string) => void; edit: (id: string, field: string, value: string) => void; remove: (id: string) => void }) {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  return <div className="ops-record-panel" data-kind={kind} data-web2-scroll tabIndex={0} role="region" aria-label={`${kind} records and entry`}>
    <form className="ops-add" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; add(name, detail); setName(""); setDetail(""); }}>
      <label>{titles[kind]}<input name="name" required maxLength={500} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>{details[kind]}<input name="detail" maxLength={2000} value={detail} onChange={e => setDetail(e.target.value)} /></label>
      <button className="primary" type="submit">Add {singular[kind]}</button>
    </form>
    <div className="ops-records">
      {!rows.length && <p className="ops-empty">No {kind} yet. Add the first {singular[kind]} above.</p>}
      {rows.map((row, index) => <article key={row.id} className="ops-record record" data-id={row.id}>
        <div className="ops-record-heading"><strong>{String(index + 1).padStart(2, "0")}</strong><span>{row.status}</span></div>
        <label>Name<input data-field="name" value={row.name} maxLength={500} onChange={e => edit(row.id, "name", e.target.value)} /></label>
        <label>Details<input data-field="detail" value={row.detail} maxLength={2000} onChange={e => edit(row.id, "detail", e.target.value)} /></label>
        <label>Status<select data-field="status" value={row.status} onChange={e => edit(row.id, "status", e.target.value)}>{statuses[kind].map(status => <option key={status}>{status}</option>)}</select></label>
        <SourceDetails row={row} />
        <button type="button" className="ops-remove" aria-label={`Remove ${row.name}`} onClick={() => remove(row.id)}>Remove</button>
      </article>)}
    </div>
  </div>;
}

export function App() {
  const [initial] = useState(() => {
    try { return loadDocument(localStorage); }
    catch { return loadDocument({ getItem: () => { throw new Error("Storage unavailable"); } }); }
  });
  const [doc, setDoc] = useState<ShowDocument>(initial.doc);
  const [saved, setSaved] = useState(JSON.stringify(initial.doc));
  const baseline = useRef(initial.raw);
  const currentDoc = useRef(doc); currentDoc.current = doc;
  const dirty = JSON.stringify(doc) !== saved;
  const blocked = Boolean(initial.error);
  const [message, setMessage] = useState(initial.error || "Ready. Add records or open Setup to name the show. Save is explicit.");
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || "dark");
  const [compact, setCompact] = useState(window.innerHeight < 500);
  const [setupField, setSetupField] = useState("identity");
  const controls = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<{ doc: ShowDocument; before: string; stored: string | null } | null>(null);
  const [copy, setCopy] = useState<PendingCopy | null>(null);
  const reading = useRef(0);
  const recovery = useRecovery(doc, dirty, baseline.current, initial.doc, recoverDocument, setMessage);
  const views = useMemo(() => doc.workspace?.views.length ? doc.workspace.views : DEFAULT_VIEWS, [doc.workspace]);
  const ws = useConsoleWorkspace(views, LIBRARY, recovery.layout);
  const open = handoff(doc);
  function recoverDocument(next: ShowDocument) {
    setDoc(next); setCopy(null); setPending(null); ws.setLive({}); ws.setMax({});
  }
  useEffect(() => {
    const resize = () => { setCompact(window.innerHeight < 500); controls.current?.close(); };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);

  function store() {
    try {
      if (blocked) throw new Error("Saved data could not be read. Download the original bytes and export new work before recovery.");
      const raw = saveDocument(localStorage, doc, baseline.current);
      baseline.current = raw; setSaved(raw); setMessage("Show saved and verified on this device. Export a backup for recovery.");
    } catch (error) { setMessage(`Save failed: ${errorText(error)}`); }
  }
  function themeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.avTheme = next; setTheme(next);
    try { localStorage.setItem("av-theme-mode.v1", next); } catch { setMessage("Theme changed for this visit only; preferences could not be saved."); }
  }
  function prepareCopy(type: CopyType, raw: string, origin: "saved" | "file") {
    if (blocked) throw new Error("Saved Show Ops data could not be read. Export and review it before copying.");
    const target = localStorage.getItem(KEY);
    if (target !== baseline.current) throw new Error("Show Ops changed in another tab. Export edits, reload and review before copying.");
    const preview = copies[type].preview(currentDoc.current, raw);
    setCopy({ type, preview, origin, docAtPreview: JSON.stringify(currentDoc.current), targetAtPreview: target, selected: preview.available.map(row => row.id) });
    setMessage("Review the source and selected records. Nothing has been copied or saved.");
  }
  function readSaved(type: CopyType) {
    reading.current++; setCopy(null);
    try {
      const raw = localStorage.getItem(copies[type].key);
      if (!raw) throw new Error(`No saved ${copies[type].label} was found on this origin. Export a JSON file from the original tool instead.`);
      prepareCopy(type, raw, "saved");
    } catch (error) { setMessage(errorText(error)); }
  }
  async function readFile(file: File, type?: CopyType) {
    const generation = ++reading.current;
    if (type) setCopy(null); else setPending(null);
    try {
      if (file.size > (type ? 500000 : 5000000)) throw new Error(`Choose a JSON file smaller than ${type ? "500 KB" : "5 MB"}.`);
      const raw = await file.text();
      if (generation !== reading.current) return;
      if (type) prepareCopy(type, raw, "file");
      else {
        setPending({ doc: parseDocument(JSON.parse(raw)), before: JSON.stringify(currentDoc.current), stored: localStorage.getItem(KEY) });
        setMessage("Backup validated. Review its summary, then confirm to replace the current show as unsaved edits.");
      }
    } catch (error) { if (generation === reading.current) setMessage(errorText(error)); }
  }
  function confirmCopy() {
    if (!copy) return;
    try {
      const config = copies[copy.type];
      if (JSON.stringify(doc) !== copy.docAtPreview || localStorage.getItem(KEY) !== copy.targetAtPreview || (copy.origin === "saved" && localStorage.getItem(config.key) !== copy.preview.raw)) throw new Error(`The ${config.label} or Show Ops document changed after preview. Review a fresh copy.`);
      const next = config.copy(doc, copy.preview, copy.selected, copy.origin, new Date().toISOString());
      setDoc(preserveWorkspace(doc, next)); setCopy(null); ws.show(config.kind);
      setMessage(`${copy.selected.length} ${config.label} records copied as unsaved ${config.status} edits. Review them, then Save.`);
    } catch (error) { setCopy(null); setMessage(errorText(error)); }
  }
  function confirmRestore() {
    if (!pending) return;
    try {
      if (JSON.stringify(doc) !== pending.before || localStorage.getItem(KEY) !== pending.stored) throw new Error("Show Ops changed after preview. Review the backup again before replacing edits.");
      setDoc(pending.doc); setPending(null); setCopy(null); ws.setLive({}); ws.setMax({});
      setMessage("Backup loaded as unsaved edits. Save to keep it on this device.");
    } catch (error) { setPending(null); setMessage(errorText(error)); }
  }
  function fileInput(id: string, label: string, type?: CopyType) {
    return <label>{label}<input id={id} type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void readFile(file, type); }} /></label>;
  }
  function render(type: string) {
    if (type === "rooms" || type === "crew" || type === "tasks") {
      const kind = type;
      return { context: `${doc[kind].length} records`, body: <Records kind={kind} rows={doc[kind]} add={(name, detail) => setDoc(d => preserveWorkspace(d, addRecord(d, kind, name, detail)))} edit={(id, field, value) => setDoc(d => preserveWorkspace(d, updateRecord(d, kind, id, field, value)))} remove={id => setDoc(d => ({ ...d, [kind]: d[kind].filter(row => row.id !== id) }))} /> };
    }
    if (type === "setup") return { actions: <select className="ops-field-picker" aria-label="Setup field" value={setupField} onChange={e => setSetupField(e.target.value)}><option value="identity">Name</option><option value="date">Date</option><option value="notes">Notes</option><option value="tools">Tools</option></select>, body: <div className="ops-form">
      {setupField === "identity" && <label>Show name<input id="name" maxLength={200} value={doc.show} onChange={e => setDoc(d => ({ ...d, show: e.target.value }))} placeholder="e.g. Fall gala" /></label>}
      {setupField === "date" && <label>Show date<input id="date" type="date" value={doc.date} onChange={e => setDoc(d => ({ ...d, date: e.target.value }))} /></label>}
      {setupField === "notes" && <label className="ops-notes">Operating notes<textarea id="notes" maxLength={10000} value={doc.notes} onChange={e => setDoc(d => ({ ...d, notes: e.target.value }))} placeholder="Venue, contacts, briefing…" /></label>}
      {setupField === "tools" && <label>Open original specialist<select defaultValue="" onChange={e => { if (e.target.value) window.location.assign(e.target.value); }}><option value="">Choose a tool…</option><option value="/show-board.html">Show Board timeline</option><option value="/room-check.html">Room Check</option><option value="/crew-call.html">Crew Call</option><option value="/show-task-board.html">Show Task Board</option></select></label>}
    </div> };
    if (type === "handoff") return { body: <div className="ops-scroll" data-web2-scroll role="region" aria-label="Current show handoff" tabIndex={0}>
      <h2>{doc.show || "Untitled show"}</h2><p>{doc.date || "Date not set"}</p><p className="ops-note">{doc.notes || "No operating notes yet."}</p>
      {(["rooms", "crew", "tasks"] as Kind[]).map(kind => <section key={kind}><h3>{kind === "rooms" ? "Rooms needing attention" : kind === "crew" ? "Crew not released" : "Tasks not done"} <span>{open[kind].length}</span></h3>{open[kind].length ? <ul>{open[kind].map(row => <li key={row.id}><strong>{row.name}</strong><span>{row.status}{row.detail && ` · ${row.detail}`}</span></li>)}</ul> : <p className="ops-empty">Clear</p>}</section>)}
      <p className="ops-muted">Internal operating summary. Confirm client-facing output in the original Show Report or Client Sign Off tool.</p>
    </div> };
    return { body: <div className="ops-scroll ops-backup" data-web2-scroll role="region" aria-label="Backup and source review" tabIndex={0}>
      <section><h2>Portable backup</h2><p>Export current edits, views and exact source text. Copies may contain crew phone numbers; keep backups private.</p><button id="export" onClick={() => download("show-ops-backup.json", JSON.stringify(doc, null, 2))}>Export JSON</button>{initial.raw !== null && blocked && <button onClick={() => download("show-ops-original.txt", initial.raw!)}>Download original saved bytes</button>}</section>
      <section><h2>Restore a Show Ops backup</h2>{fileInput("import", "JSON backup")}<div id="preview">{pending && <div className="ops-preview"><strong>{pending.doc.show || "Untitled show"}</strong><p>{pending.doc.date || "No date"} · {pending.doc.rooms.length} rooms · {pending.doc.crew.length} crew · {pending.doc.tasks.length} tasks</p><button id="confirm-import" className="primary" onClick={confirmRestore}>Replace current show</button><button id="cancel-import" onClick={() => { reading.current++; setPending(null); setMessage("Import cancelled. Nothing saved."); }}>Cancel</button></div>}</div></section>
      {(Object.keys(copies) as CopyType[]).map(type => {
        const config = copies[type], review = copy?.type === type ? copy : null;
        return <section key={type}><h2>Copy {config.label}</h2><p>Reviewed one-way copy. Originals stay unchanged. Every copy begins <strong>{config.status}</strong>; original statuses are retained, not treated as acceptance.{type === "task" && " Done, canceled and deferred tasks are excluded."}{type === "crew" && " Wrapped members are excluded. Called does not confirm attendance."}</p>
          <button id={`${type}-saved`} onClick={() => readSaved(type)}>Review saved {config.label}</button>{fileInput(`${type}-file`, `${config.label} JSON file`, type)}
          <div id={`${type}-preview`}>{review && <div className="ops-preview"><strong>{review.preview.meta.showName} · {review.preview.meta.showDate}</strong><p>{review.preview.meta.venue || "Venue not set"} · {review.preview.alreadyCopied} previously copied{review.preview.excluded !== undefined && ` · ${review.preview.excluded} excluded`}. Target: {doc.show || review.preview.meta.showName}. Copies begin {config.status}.</p>
            <div className="ops-source-list" role="group" aria-label={`${config.label} records to copy`}>{review.preview.available.map(row => <label className="ops-choice" key={row.id}><input type="checkbox" name={config.checkbox} value={row.id} checked={review.selected.includes(row.id)} onChange={event => { const checked = event.target.checked; setCopy(p => p && ({ ...p, selected: checked ? [...p.selected, row.id] : p.selected.filter(id => id !== row.id) })); }} /><span><strong>{row.check || row.task || row.name}</strong><small>{config.fields.map(field => `${field}: ${row[field] || "Not set"}`).join(" · ")}</small></span></label>)}</div>
            <div className="ops-preview-actions"><button id={`confirm-${type}`} className="primary" onClick={confirmCopy}>Copy selected as unsaved {config.status} edits</button><button id={`cancel-${type}`} onClick={() => { reading.current++; setCopy(null); setMessage(`${config.label} copy cancelled. Neither saved document changed.`); }}>Cancel</button></div>
          </div>}</div></section>;
      })}
    </div> };
  }
  const header = <header className="ops-header"><div><small>AV BY DAVE / SHOW OPS</small><h1 id="show-title">{doc.show || "Untitled show"}</h1><span id="show-date">{doc.date || "Set a date in Setup"}</span></div><div className="ops-actions"><span id="dirty">{dirty ? "Unsaved edits" : baseline.current === null ? "Not saved" : "Saved"}</span><button id="theme" onClick={themeToggle}>{theme === "dark" ? "Light mode" : "Dark mode"}</button><button className="primary" id="save" disabled={blocked} onClick={store}>Save show</button></div></header>;
  const notice = <footer id="notice" className="ops-status" role="status" aria-live="polite">{message}{recovery.errors.map(error => <span key={error}>{error}</span>)}</footer>;
  const recoveryControls = recovery.offer && <section className="ops-recovery" aria-label="Draft recovery"><p>Unsaved draft available.{recovery.offer.baseline !== baseline.current && " The saved show has changed since this draft."}</p><button onClick={() => void recovery.restore()}>Restore draft</button><button onClick={() => void recovery.discard()}>Discard draft</button></section>;
  return <main id="main" className={`ops-app${compact ? " ops-compact" : ""}`} tabIndex={-1}>
    {compact ? <dialog ref={controls} className="ops-controls" aria-label="Show controls">{header}{recoveryControls}{notice}<button onClick={() => controls.current?.close()}>Back to panels</button></dialog> : header}
    <div className="ops-summary" id="counts"><span><b>{open.rooms.length}</b> rooms to check</span><span><b>{open.crew.length}</b> crew not released</span><span><b>{open.tasks.length}</b> tasks open</span></div>
    {!compact && recoveryControls}
    <ConsoleWorkspace ws={compact ? { ...ws, mode: "phone" } : ws} label="Show Ops" extraViews={compact && <button aria-label="Show controls" onClick={() => controls.current?.showModal()}>Show{dirty ? " *" : ""}{recovery.errors.length || recovery.offer ? " !" : ""}</button>} quick={LIBRARY.map(panel => ({ type: panel.type, label: panel.name }))} render={render} onViewsChange={(next, text) => { setDoc(d => ({ ...d, workspace: { version: 1, views: next } })); setMessage(text); }} notify={setMessage} />
    {!compact && notice}
  </main>;
}
