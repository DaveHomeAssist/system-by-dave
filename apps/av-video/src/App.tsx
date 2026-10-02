import { useEffect, useRef, useState } from "react";
import { FlowCanvas } from "./FlowCanvas";
import { applyImport, emptyDocument, LEGACY, loadDocument, Module, newRoute, Preview, previewImport, Route, routeGaps, sampleDocument, saveDocument, STORE, uid, VideoDocument } from "./model";

type View = "flow" | "patch" | "checks" | "project";
const statuses = ["planned", "pending", "patched", "routed", "tested", "ready", "verified", "issue", "spare", "backup"];
const labels: Partial<Record<keyof Route, string>> = { route: "Route name", source: "Source", destination: "Destination", system: "System", type: "Source type", format: "Format", connector: "Connector", processor: "Processor", input: "Switcher / device input", output: "Source output", converter: "Converter", backup: "Backup route", status: "Status", notes: "Operator notes" };
function download(name: string, raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function errorText(error: unknown) { return error instanceof Error ? error.message : "Operation failed. Your existing saved data is unchanged."; }

export function App() {
  const [initial] = useState(() => { try { return loadDocument(localStorage); } catch { return { doc: emptyDocument(), baseline: null, error: "Browser storage is unavailable. Export your work before leaving." }; } });
  const [doc, setDoc] = useState(initial.doc);
  const baseline = useRef(initial.baseline);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(initial.error || (initial.doc.routes.length ? "Plan loaded from this browser." : "Ready. Create a route or import an existing sheet."));
  const [problem, setProblem] = useState(Boolean(initial.error));
  const [view, setView] = useState<View>(() => {
    const requested = new URLSearchParams(location.search).get("view");
    return requested === "patch" || requested === "checks" ? (initial.doc.modules[requested] ? requested : "project") : "flow";
  });
  const [selected, setSelected] = useState(initial.doc.routes[0]?.id || "");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reading, setReading] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || "light");
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const importTrigger = useRef<HTMLElement | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const update = (next: VideoDocument) => { setDoc(next); setDirty(true); };
  const notify = (text: string, error = false) => { setMessage(text); setProblem(error); };
  const route = doc.routes.find(r => r.id === selected);
  const visible = doc.routes.filter(r => {
    const fields = [r.route, r.source, r.destination, r.format, r.connector, r.processor, r.system, r.type, r.status, r.notes,
      ...(doc.modules.patch ? [r.input, r.converter] : []), ...(doc.modules.backups ? [r.backup] : [])];
    return (status === "all" || r.status === status) && fields.join(" ").toLowerCase().includes(search.toLowerCase());
  });
  const issues = doc.routes.filter(r => routeGaps(r, doc.modules).length);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    const changed = (event: StorageEvent) => { if (event.key === STORE || event.key === null) notify("Saved data changed in another tab. Export unsaved edits, then reload before saving.", true); };
    window.addEventListener("beforeunload", unload); window.addEventListener("storage", changed);
    return () => { window.removeEventListener("beforeunload", unload); window.removeEventListener("storage", changed); };
  }, [dirty]);
  useEffect(() => {
    if (preview && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!preview && dialog.current?.open) { dialog.current.close(); importTrigger.current?.focus(); }
  }, [preview]);
  function save() {
    if (initial.error) { notify(initial.error, true); return; }
    try { baseline.current = saveDocument(localStorage, doc, baseline.current); setDirty(false); notify("Saved in this browser."); }
    catch (error) { notify(errorText(error), true); }
  }
  function changeRoute(field: keyof Route, value: string) { update({ ...doc, routes: doc.routes.map(r => r.id === selected ? { ...r, [field]: value } : r) }); }
  function add() { const next = newRoute(); update({ ...doc, routes: [...doc.routes, next] }); setSelected(next.id); setSearch(""); setStatus("all"); setMobileDetail(true); setInspectorOpen(true); if (view !== "flow" && view !== "patch") setView("flow"); }
  function choose(id: string) { setSelected(id); setMobileDetail(true); }
  function switchView(next: View) { setView(next); setMobileDetail(false); setInspectorOpen(false); }
  function toggleModule(module: Module) {
    update({ ...doc, modules: { ...doc.modules, [module]: !doc.modules[module] } });
    if (view === module) setView("project");
    notify(`${module === "patch" ? "Patch view" : module === "checks" ? "Checks" : "Backup details"} ${doc.modules[module] ? "hidden" : "enabled"}. Saved fields are retained.`);
  }
  async function inspect(raw: string, name: string, browserKey?: string) {
    importTrigger.current = document.activeElement as HTMLElement;
    setReading(true);
    try { setPreview(await previewImport(raw, name, browserKey)); } catch (error) { notify(errorText(error), true); }
    finally { setReading(false); }
  }
  function importSaved(name: keyof typeof LEGACY) {
    try { const raw = localStorage.getItem(LEGACY[name]); if (raw === null) { notify(`No saved ${name} sheet on this site. Import its JSON export instead.`); return; } void inspect(raw, "Saved in this browser", LEGACY[name]); }
    catch (error) { notify(errorText(error), true); }
  }
  function confirmImport() {
    if (!preview) return;
    try {
      if (preview.browserKey && localStorage.getItem(preview.browserKey) !== preview.raw) throw new Error("The source changed after preview. Cancel and import again.");
      const next = applyImport(doc, preview); update(next); setSelected(next.routes[0]?.id || "");
      setPreview(null); setView("flow"); setSearch(""); setStatus("all"); setMobileDetail(false);
      notify(`${preview.routes.length} routes ${preview.restore ? "restored" : "imported"}. Save to keep this plan in this browser.`);
    } catch (error) { setPreview(null); notify(errorText(error), true); }
  }
  function exportDoc() { download("av-video.json", JSON.stringify(doc, null, 2)); notify("Full plan exported, including hidden module data and original imports."); }
  function replace(next: VideoDocument) {
    if ((doc.routes.length || doc.graphDevices.length || dirty || Object.keys(doc.meta).length) && !window.confirm("Replace the current plan? Export first if you need to keep it.")) return;
    update(next); setSelected(next.routes[0]?.id || ""); setView("flow"); setSearch(""); setStatus("all"); setMobileDetail(false); setInspectorOpen(false); notify(next.routes.length ? "Plan ready. Select a cable to trace its path, or drag devices to arrange." : "New plan. Add devices or routes to begin.");
  }
  function changeTheme(value: string) {
    document.documentElement.dataset.avTheme = value; setTheme(value);
    try { localStorage.setItem("av-theme-mode.v1", value); } catch { notify("Theme changed for this visit; browser preferences could not be saved.", true); }
  }
  const field = (name: keyof Route, multiline = false) => route && <label key={name} className={multiline ? "wide" : ""}>{labels[name]}
    {multiline ? <textarea value={route[name]} onChange={e => changeRoute(name, e.target.value)} rows={4} /> : <input value={route[name]} onChange={e => changeRoute(name, e.target.value)} />}
  </label>;
  const nav = <nav className="view-tabs" aria-label="Video workspace">
    {([ ["flow", "Signal flow"], ...(doc.modules.patch ? [["patch", "Patch"]] : []), ...(doc.modules.checks ? [["checks", "Checks"]] : []), ["project", "Project"] ] as [View, string][]).map(([id, label]) => <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => switchView(id)}>{label}{id === "checks" && <span>{issues.length}</span>}</button>)}
  </nav>;
  return <div className="video-app">
    <header className="app-header"><div className="app-identity"><span className="app-mark" aria-hidden="true">Vi</span><div><h1>AV Video</h1><p>Signal flow + video patch</p></div></div>
      <div className="header-actions"><label className="theme-label"><span>Theme</span><select aria-label="Theme" value={theme} onChange={e => changeTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label><button type="button" className="primary" onClick={save}>Save{dirty ? " •" : ""}</button><button type="button" onClick={exportDoc}>Export</button></div>
    </header>
    <div className="plan-bar"><strong title={doc.title}>{doc.title}</strong><span>{doc.routes.length} routes · {dirty ? "Unsaved changes" : baseline.current ? "Saved in this browser" : "New plan"}</span></div>
    {nav}
    <main id="workspace" tabIndex={-1} className={`workspace view-${view} ${inspectorOpen ? "inspector-open" : ""} ${mobileDetail ? "detail-open" : ""}`}>
      {(view === "flow" || view === "patch") && <>
        {view === "flow" ? <FlowCanvas doc={doc} selected={selected} onChange={update} onSelect={setSelected} onEdit={() => { setInspectorOpen(true); setMobileDetail(true); }} onAddRoute={add} onSample={() => replace(sampleDocument())} onImport={() => switchView("project")} notify={notify} /> :         <section className="route-browser" aria-label="Patch routes">
          <div className="panel-heading"><div><h2>Video patch</h2><p>One route list. Every view stays in sync.</p></div><button type="button" className="primary" onClick={add}>Add route</button></div>
          <div className="filters"><input aria-label="Search routes" type="search" placeholder="Search routes…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{Array.from(new Set([...statuses, ...doc.routes.map(r => r.status)])).map(s => <option key={s} value={s}>{s || "Unspecified"}</option>)}</select></div>
          <div className="route-list">
            {!doc.routes.length ? <div className="empty"><span className="empty-symbol" aria-hidden="true">↗</span><h3>Build your video path</h3><p>Connect sources to destinations, assign inputs, and track checks in one plan.</p><button type="button" className="primary" onClick={add}>Create first route</button><button type="button" onClick={() => replace(sampleDocument())}>Try a sample plan</button><button type="button" onClick={() => switchView("project")}>Import existing sheets</button></div> : !visible.length ? <div className="empty"><h3>No matching routes</h3><button type="button" onClick={() => { setSearch(""); setStatus("all"); }}>Clear filters</button></div> : visible.map((r, index) => <button type="button" className={`route-card ${selected === r.id ? "selected" : ""}`} key={r.id} onClick={() => choose(r.id)} aria-pressed={selected === r.id}>
              <span className="route-card-title"><span className="route-number">{String(index + 1).padStart(2, "0")}</span><strong>{r.route || r.source || "Untitled route"}</strong><span className={`status status-${r.status === "issue" ? "issue" : "normal"}`}>{r.status || "Unspecified"}</span></span>
              <span className="patch-summary"><span><small>Source</small>{r.source || "—"}</span><span><small>Input</small>{r.input || "—"}</span><span><small>Destination</small>{r.destination || "—"}</span></span>
              <span className="route-card-footer"><span>{[r.format, r.connector].filter(Boolean).join(" · ") || "Format and connector needed"}</span>{doc.modules.checks && routeGaps(r, doc.modules).length > 0 && <span className="gap-count">{routeGaps(r, doc.modules).length} {routeGaps(r, doc.modules).length === 1 ? "check" : "checks"}</span>}</span>
            </button>)}
          </div>
        </section>}
        {(view === "patch" || inspectorOpen) && <section className="inspector" aria-label="Route editor"><div className="panel-heading"><div><h2>Route details</h2><p>{route ? "Edits appear in both views" : "Select a route to edit"}</p></div><button type="button" className="mobile-back" onClick={() => { setMobileDetail(false); setInspectorOpen(false); }}>{view === "flow" ? "Back to diagram" : "Back to routes"}</button></div>
          {route ? <div className="editor-scroll"><div className="field-grid">{field("route")}{field("type")}{field("source")}{field("destination")}{field("format")}{field("connector")}{field("processor")}{field("system")}
            <label>Status<select value={route.status} onChange={e => changeRoute("status", e.target.value)}>{Array.from(new Set([...statuses, route.status])).map(s => <option key={s} value={s}>{s || "Unspecified"}</option>)}</select></label>
            {doc.modules.patch && <fieldset className="wide"><legend>Patch details</legend><div className="field-grid">{field("input")}{field("output")}{field("converter")}</div></fieldset>}
            {doc.modules.backups && field("backup")}{field("notes", true)}
          </div>
          {doc.modules.checks && <div className="route-checks"><h3>Route checks</h3>{routeGaps(route, doc.modules).length ? <ul>{routeGaps(route, doc.modules).map(g => <li key={g}>{g}</li>)}</ul> : <p>Required fields filled. Confirm the physical route before marking it ready.</p>}</div>}
          {route.origin && <p className="provenance">Imported from {doc.imports.find(i => i.id === route.origin)?.name || "an original sheet"}. Original data is included in exports.</p>}
          <div className="row-actions"><button type="button" onClick={() => { const copy = { ...route, id: uid(), route: `${route.route || route.source} copy` }; update({ ...doc, routes: [...doc.routes, copy] }); setSelected(copy.id); }}>Duplicate route</button><button type="button" className="danger" onClick={() => { if (!confirm("Remove this route from the current plan?")) return; const rows = doc.routes.filter(r => r.id !== route.id); update({ ...doc, routes: rows }); setSelected(rows[0]?.id || ""); setMobileDetail(false); }}>Remove route</button></div>
          </div> : <div className="empty"><p>Choose a route from the list, or create one.</p></div>}
        </section>}
      </>}
      {view === "checks" && <section className="single-panel"><div className="panel-heading"><div><h2>Route checks</h2><p>Checks cover {doc.modules.patch ? "signal and patch fields" : "signal fields only; patch module is off"}. These are planning checks, not a live signal test.</p></div><strong>{issues.length} need attention</strong></div><div className="check-list">{issues.length ? issues.map(r => <button type="button" key={r.id} onClick={() => { setView("flow"); setInspectorOpen(true); choose(r.id); }}><strong>{r.route || r.source || "Untitled route"}</strong><span>{routeGaps(r, doc.modules).join(" · ")}</span><span>Edit route →</span></button>) : <div className="empty"><h3>{doc.routes.length ? "No field gaps in enabled modules" : "No routes to check yet"}</h3><p>Operator statuses are preserved separately from these checks.</p></div>}</div></section>}
      {view === "project" && <section className="single-panel project-panel"><div className="panel-heading"><div><h2>Project & modules</h2><p>Use Video on its own. Add show details only when useful.</p></div></div><div className="project-scroll">
        <section><h3>Video plan</h3><div className="field-grid"><label>Plan name<input value={doc.title} onChange={e => update({ ...doc, title: e.target.value })} /></label><label>Venue<input value={doc.meta.venue || ""} onChange={e => update({ ...doc, meta: { ...doc.meta, venue: e.target.value } })} /></label><label>Video lead<input value={doc.meta.videoLead || ""} onChange={e => update({ ...doc, meta: { ...doc.meta, videoLead: e.target.value } })} /></label></div><div className="row-actions"><button type="button" onClick={() => replace(emptyDocument())}>New plan</button><button type="button" onClick={() => replace(sampleDocument())}>Load sample</button></div></section>
        <section><h3>Optional modules</h3><p>Turn off what you do not need. Its fields stay in the plan and full export.</p>{([ ["patch", "Patch view", "Input assignments and converters"], ["checks", "Route checks", "Field gaps and reported issues"], ["backups", "Backup details", "Alternate routes and equipment"] ] as [Module, string, string][]).map(([id, name, description]) => <label className="module-toggle" key={id}><input type="checkbox" checked={doc.modules[id]} onChange={() => toggleModule(id)} /><span><strong>{name}</strong><small>{description}</small></span></label>)}</section>
        <section><h3>Bring existing work together</h3><p>Import Signal Flow or Video Patch sheets into this route list. Each source stays intact. Review imports before applying them.</p><div className="import-actions"><button type="button" disabled={reading} onClick={() => fileInput.current?.click()}>Import JSON file</button>{(Object.keys(LEGACY) as (keyof typeof LEGACY)[]).map(name => <button type="button" key={name} disabled={reading} onClick={() => importSaved(name)}>Import saved {name}</button>)}</div><p className="muted">Saved sheets are available only in the browser and site where they were created. JSON files work across sites.</p>{doc.imports.length > 0 && <details><summary>{doc.imports.length} original imports retained</summary>{doc.imports.map(i => <div className="original-import" key={i.id}><span>{i.name}</span><button type="button" onClick={() => download("original-sheet.json", i.raw)}>Export original</button></div>)}</details>}</section>
      </div></section>}
    </main>
    <footer role="status" className={`message ${problem ? "error" : ""}`}>{message}</footer>
    <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={async e => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; try { await inspect(await file.text(), file.name); } catch (error) { notify(errorText(error), true); } }} />
    <dialog ref={dialog} aria-labelledby="import-title" onCancel={() => setPreview(null)}><h2 id="import-title">Review import</h2>{preview && <><p>{preview.name}</p><p><strong>{preview.routes.length} routes</strong> · {Object.keys(preview.meta).length} metadata fields</p><p>{preview.restore ? "This backup replaces the current plan, including module choices. Export your current plan first if you need to keep it." : "Routes will be added to this plan. Notes, statuses, and a complete original source copy are retained. Similar routes are kept separate; no automatic merging."}</p><div className="import-preview">{preview.routes.map(r => <div key={r.id}><strong>{r.source || "Unnamed source"} → {r.destination || "Unnamed destination"}</strong><span>{r.route} · {r.status || "Unspecified"}</span></div>)}</div><div className="row-actions"><button type="button" onClick={() => setPreview(null)}>Cancel</button>{preview.restore && <button type="button" onClick={exportDoc}>Export current plan</button>}<button type="button" className="primary" onClick={confirmImport}>{preview.restore ? "Replace with backup" : "Add routes to plan"}</button></div></>}</dialog>
  </div>;
}
