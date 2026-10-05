import { useEffect, useRef, useState } from "react";
import { DisplaysPanel } from "./DisplaysPanel";
import { displayGaps, displayIssues, displayName } from "./displays";
import { FlowCanvas } from "./FlowCanvas";
import { SignalFields } from "./SignalFields";
import { createHistory, record, redo, undo } from "./history";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import type { PanelDef, View as ConsoleView } from "../../shared/av-console/layout";
import { applyImport, emptyDocument, LEGACY, loadDocument, Module, newRoute, Preview, previewImport, Route, routeGaps, sampleDocument, saveDocument, STORE, uid, VideoDocument } from "./model";

type PanelType = "flow" | "patch" | "inspector" | "displays" | "checks" | "project";
/* Panel library and the starting arrangements (docs/av-console.md). Views are
   stored in the plan only after Store or Update; these defaults cost nothing. */
const LIBRARY: PanelDef[] = [
  { type: "flow", name: "Signal Flow", group: "Common", description: "Device canvas with route tracing, zoom, pan and diagram export.", minW: 4, minH: 3, lit: true },
  { type: "patch", name: "Patch", group: "Common", description: "Route list with search, status filter and patch assignments.", minW: 3, minH: 2, module: "patch" },
  { type: "inspector", name: "Inspector", group: "Common", description: "Editable details for the selected route. Follows the selection.", minW: 3, minH: 3 },
  { type: "displays", name: "Displays & Projection", group: "Planning", description: "Destination records, projection details and linked routes.", minW: 4, minH: 3, module: "displays" },
  { type: "checks", name: "Checks", group: "Utilities", description: "Planning checks with what they evaluated and links to affected records.", minW: 3, minH: 3, module: "checks" },
  { type: "project", name: "Project", group: "Utilities", description: "Plan details, optional modules and imports from earlier sheets.", minW: 6, minH: 4 },
];
const DEFAULT_VIEWS: ConsoleView[] = [
  { id: "routing", name: "Routing", panels: [{ id: "routing-flow", type: "flow", x: 0, y: 0, w: 8, h: 5 }, { id: "routing-patch", type: "patch", x: 0, y: 5, w: 8, h: 3 }, { id: "routing-inspector", type: "inspector", x: 8, y: 0, w: 4, h: 8 }] },
  { id: "projection", name: "Projection", panels: [{ id: "projection-displays", type: "displays", x: 0, y: 0, w: 7, h: 8 }, { id: "projection-flow", type: "flow", x: 7, y: 0, w: 5, h: 8 }] },
  { id: "trouble", name: "Troubleshooting", panels: [{ id: "trouble-checks", type: "checks", x: 0, y: 0, w: 3, h: 8 }, { id: "trouble-flow", type: "flow", x: 3, y: 0, w: 6, h: 8 }, { id: "trouble-inspector", type: "inspector", x: 9, y: 0, w: 3, h: 8 }] },
  { id: "project", name: "Project", panels: [{ id: "project-project", type: "project", x: 0, y: 0, w: 12, h: 8 }] },
];
const statuses = ["planned", "pending", "patched", "routed", "tested", "ready", "verified", "issue", "spare", "backup"];
const labels: Partial<Record<keyof Route, string>> = { converterOutput: "Converter output port", converterConnector: "Converter output connector", converterFormat: "Converter output format", processorOutput: "Processor output port", processorConnector: "Processor output connector", processorFormat: "Processor output format", destinationInput: "Destination input", route: "Route name", source: "Source", destination: "Destination", system: "System", type: "Source type", format: "Format", connector: "Connector", processor: "Processor", input: "Switcher / device input", output: "Source output", converter: "Converter", backup: "Backup route", status: "Status", notes: "Operator notes" };
function download(name: string, raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function errorText(error: unknown) { return error instanceof Error ? error.message : "Operation failed. Your existing saved data is unchanged."; }

export function App() {
  const [initial] = useState(() => { try { return loadDocument(localStorage); } catch { return { doc: emptyDocument(), baseline: null, error: "Browser storage is unavailable. Export your work before leaving." }; } });
  const [history, setHistory] = useState(() => createHistory(initial.doc));
  const doc = history.present;
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial.doc));
  const baseline = useRef(initial.baseline);
  const dirty = JSON.stringify(doc) !== savedSnapshot;
  const [message, setMessage] = useState(initial.error || (new URLSearchParams(location.search).get("view") === "displays" && !initial.doc.modules.displays ? "Displays & Projection is disabled. Enable it in Project to open this view; its data is retained." : (initial.doc.routes.length || initial.doc.displays.length) ? "Plan loaded from this browser." : "Ready. Create a route or import an existing sheet."));
  const [problem, setProblem] = useState(Boolean(initial.error));
  const [selected, setSelected] = useState(initial.doc.routes[0]?.id || "");
  const [selectedDisplay, setSelectedDisplay] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reading, setReading] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.dataset.avTheme || "light");
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const importTrigger = useRef<HTMLElement | null>(null);
  const library = LIBRARY.filter(d => !d.module || doc.modules[d.module as Module]);
  const ws = useConsoleWorkspace(doc.workspace?.views || DEFAULT_VIEWS, library);
  const show = (type: PanelType) => ws.show(type);
  const update = (next: VideoDocument, group?: string) => setHistory(current => record(current, next, group));
  const finishEdit = () => setHistory(current => ({ ...current, group: undefined }));
  const notify = (text: string, error = false) => { setMessage(text); setProblem(error); };
  function undoEdit() { if (history.past.length) { setHistory(undo); notify("Undone. Save to keep this version."); } }
  function redoEdit() { if (history.future.length) { setHistory(redo); notify("Redone. Save to keep this version."); } }
  useEffect(() => {
    if (selected && !doc.routes.some(r => r.id === selected)) setSelected(doc.routes[0]?.id || "");
  }, [doc, selected]);
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("view");
    if (requested === "patch" || requested === "checks" || requested === "displays") show(initial.doc.modules[requested] ? requested : "project");
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || document.querySelector("dialog[open]")) return;
      if ((event.target as HTMLElement)?.closest("input,textarea,[contenteditable=true]")) return;
      const key = event.key.toLowerCase();
      if (key === "z") { event.preventDefault(); if (event.shiftKey) redoEdit(); else undoEdit(); }
      else if (key === "y") { event.preventDefault(); redoEdit(); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [history]);
  const route = doc.routes.find(r => r.id === selected);
  const visible = doc.routes.filter(r => {
    const fields = [r.route, r.source, r.destination, r.format, r.connector, r.processor, r.system, r.type, r.status, r.notes,
      ...(doc.modules.patch ? [r.input, r.output, r.converter, r.converterOutput, r.converterConnector, r.converterFormat, r.processorOutput, r.processorConnector, r.processorFormat, r.destinationInput] : []), ...(doc.modules.backups ? [r.backup] : [])];
    return (status === "all" || r.status === status) && fields.join(" ").toLowerCase().includes(search.toLowerCase());
  });
  const destinationIssues = displayIssues(doc);
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
    try { baseline.current = saveDocument(localStorage, doc, baseline.current); setSavedSnapshot(JSON.stringify(doc)); finishEdit(); notify("Saved in this browser."); }
    catch (error) { notify(errorText(error), true); }
  }
  function changeRoute(field: keyof Route, value: string, typing = false) { update({ ...doc, routes: doc.routes.map(r => r.id === selected ? { ...r, [field]: value } : r) }, typing ? `route:${selected}:${field}` : undefined); }
  function add() { const next = newRoute(); update({ ...doc, routes: [...doc.routes, next] }); setSelected(next.id); setSearch(""); setStatus("all"); show("inspector"); }
  function choose(id: string) { setSelected(id); if (ws.mode === "phone" || !ws.panels.some(p => p.type === "inspector")) show("inspector"); }
  function storeViews(views: ConsoleView[], text: string) { update({ ...doc, workspace: { version: 1, views } }); notify(text); }
  function toggleModule(module: Module) {
    update({ ...doc, modules: { ...doc.modules, [module]: !doc.modules[module] } });
    notify(`${module === "patch" ? "Patch view" : module === "checks" ? "Checks" : module === "displays" ? "Displays & Projection" : "Backup details"} ${doc.modules[module] ? "hidden" : "enabled"}. Saved fields are retained.`);
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
      setPreview(null); show(preview.displays.length && next.modules.displays ? "displays" : "flow"); setSelectedDisplay(preview.displays[0]?.id || ""); setSearch(""); setStatus("all");
      notify(`${preview.routes.length} routes and ${preview.displays.length} destinations ${preview.restore ? "restored" : "imported"}. Save to keep this plan in this browser.`);
    } catch (error) { setPreview(null); notify(errorText(error), true); }
  }
  function exportDoc() { download("av-video.json", JSON.stringify(doc, null, 2)); notify("Full plan exported, including hidden module data and original imports."); }
  function replace(next: VideoDocument) {
    if ((doc.routes.length || doc.displays.length || doc.graphDevices.length || dirty || Object.keys(doc.meta).length) && !window.confirm("Replace the current plan? Export first if you need to keep it.")) return;
    update(next); setSelected(next.routes[0]?.id || ""); show("flow"); setSearch(""); setStatus("all"); notify(next.routes.length ? "Plan ready. Select a cable to trace its path, or drag devices to arrange." : "New plan. Add devices or routes to begin.");
  }
  function changeTheme(value: string) {
    document.documentElement.dataset.avTheme = value; setTheme(value);
    try { localStorage.setItem("av-theme-mode.v1", value); } catch { notify("Theme changed for this visit; browser preferences could not be saved.", true); }
  }
  const field = (name: keyof Route, multiline = false) => route && <label key={name} className={multiline ? "wide" : ""}>{labels[name]}
    {multiline ? <textarea value={route[name]} onBlur={finishEdit} onChange={e => changeRoute(name, e.target.value, true)} rows={4} /> : <input value={route[name]} onBlur={finishEdit} onChange={e => changeRoute(name, e.target.value, true)} />}
  </label>;
  const checkCount = issues.length + destinationIssues.length;
  /* Onboarding lives in the lit Signal Flow panel; a neighbouring Patch panel stays compact. */
  const flowBeside = ws.mode !== "phone" && ws.panels.some(p => p.type === "flow");
  const routeLabel = (r?: Route) => r ? r.route || r.source || "Untitled route" : "";
  function renderPanel(type: string) {
    switch (type as PanelType) {
      case "flow": return { body: <FlowCanvas doc={doc} selected={selected} onChange={update} onSelect={setSelected} onChecks={() => show("checks")} onEdit={() => show("inspector")} onAddRoute={add} onSample={() => replace(sampleDocument())} onImport={() => show("project")} notify={notify} />, context: `${doc.routes.length} routes${route ? ` · tracing ${routeLabel(route)}` : ""}` };
      case "patch": return { body: <section className="route-browser" aria-label="Patch routes">
          <div className="panel-heading"><div><h2>Video patch</h2><p>One route list. Every view stays in sync.</p></div>{!flowBeside && <button type="button" className="primary" onClick={add}>Add route</button>}</div>
          <div className="filters"><input aria-label="Search routes" type="search" placeholder="Search routes…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{Array.from(new Set([...statuses, ...doc.routes.map(r => r.status)])).map(s => <option key={s} value={s}>{s || "Unspecified"}</option>)}</select></div>
          <div className="route-list">
            {!doc.routes.length ? (flowBeside ? <div className="empty compact"><h3>No routes yet</h3><p>Connect devices on Signal Flow, or create a route here. Both views edit the same plan.</p></div> : <div className="empty"><span className="empty-symbol" aria-hidden="true">↗</span><h3>Build your video path</h3><p>Connect sources to destinations, assign inputs, and track checks in one plan.</p><button type="button" className="primary" onClick={add}>Create first route</button><button type="button" onClick={() => replace(sampleDocument())}>Try a sample plan</button><button type="button" onClick={() => show("project")}>Import existing sheets</button></div>) : !visible.length ? <div className="empty"><h3>No matching routes</h3><button type="button" onClick={() => { setSearch(""); setStatus("all"); }}>Clear filters</button></div> : visible.map((r, index) => <button type="button" className={`route-card ${selected === r.id ? "selected" : ""}`} key={r.id} onClick={() => choose(r.id)} aria-pressed={selected === r.id}>
              <span className="route-card-title"><span className="route-number">{String(index + 1).padStart(2, "0")}</span><strong>{r.route || r.source || "Untitled route"}</strong><span className={`status status-${r.status === "issue" ? "issue" : "normal"}`}>{r.status || "Unspecified"}</span></span>
              <span className="patch-summary"><span><small>Source</small>{r.source || "—"}</span><span><small>Input</small>{r.input || "—"}</span><span><small>Destination</small>{r.destination || "—"}</span></span>
              <span className="route-card-footer"><span>{[r.format, r.connector].filter(Boolean).join(" · ") || "Format and connector needed"}</span>{doc.modules.checks && routeGaps(r, doc.modules).length > 0 && <span className="gap-count">{routeGaps(r, doc.modules).length} {routeGaps(r, doc.modules).length === 1 ? "check" : "checks"}</span>}</span>
            </button>)}
          </div>
        </section>, context: `${visible.length} of ${doc.routes.length} routes` };
      case "inspector": return { body: <section className="inspector" aria-label="Route editor"><div className="panel-heading"><div><h2>Route details</h2><p>{route ? "Edits appear in both views" : "Select a route to edit"}</p></div><button type="button" className="panel-back" onClick={() => show("flow")}>Back to diagram</button></div>
          {route ? <div className="editor-scroll"><div className="field-grid">{field("route")}{field("type")}{field("source")}{field("destination")}<SignalFields key={route.id} format={route.format} connector={route.connector} onChange={changeRoute} notify={notify} />{field("processor")}{field("system")}
            <label>Status<select value={route.status} onChange={e => changeRoute("status", e.target.value)}>{Array.from(new Set([...statuses, route.status])).map(s => <option key={s} value={s}>{s || "Unspecified"}</option>)}</select></label>
            {doc.modules.patch && <fieldset className="wide"><legend>Patch details</legend><div className="field-grid">{field("input")}{field("output")}{field("converter")}{route.converter && <>{field("converterOutput")}{field("converterConnector")}{field("converterFormat")}</>}{route.processor && <>{field("processorOutput")}{field("processorConnector")}{field("processorFormat")}{field("destinationInput")}</>}</div><p className="signal-note">Source format and connector describe the first cable. Specify each device output; blanks stay unknown.</p></fieldset>}
            {doc.modules.backups && field("backup")}{field("notes", true)}
          </div>
          <p className="signal-note">Status is operator reported, not a live signal test. Record who tested this route, when and what they verified in Operator notes.</p>{doc.modules.checks && <div className="route-checks"><h3>Route checks</h3>{routeGaps(route, doc.modules).length ? <ul>{routeGaps(route, doc.modules).map(g => <li key={g}>{g}</li>)}</ul> : <p>Required fields filled. Confirm the physical route before marking it ready.</p>}</div>}
          {route.origin && <p className="provenance">Imported from {doc.imports.find(i => i.id === route.origin)?.name || "an original sheet"}. Original data is included in exports.</p>}
          <div className="row-actions"><button type="button" onClick={() => { const copy = { ...route, id: uid(), route: `${route.route || route.source} copy` }; update({ ...doc, routes: [...doc.routes, copy] }); setSelected(copy.id); }}>Duplicate route</button><button type="button" className="danger" onClick={() => { if (!confirm("Remove this route from the current plan?")) return; const rows = doc.routes.filter(r => r.id !== route.id); update({ ...doc, routes: rows }); setSelected(rows[0]?.id || ""); }}>Remove route</button></div>
          </div> : <div className="empty"><p>Choose a route from the list, or create one.</p></div>}
        </section>, context: route ? `Following · ${routeLabel(route)}` : "Following selection" };
      case "displays": return { body: <DisplaysPanel doc={doc} selected={selectedDisplay} onSelect={setSelectedDisplay} onChange={update} onFinish={finishEdit} onRoute={id => { setSelected(id); show("flow"); }} onImport={() => show("project")} notify={notify} />, context: `${doc.displays.length} destinations` };
      case "checks": return { body: <section className="single-panel"><div className="panel-heading"><div><h2>Planning checks</h2><p>{doc.modules.displays ? "Displays and projection included. " : "Displays module is off. "}Checks cover {doc.modules.patch ? "signal and patch fields" : "signal fields only; patch module is off"}. These are planning checks, not a live signal test.</p></div><strong>{issues.length + destinationIssues.length} need attention</strong></div><div className="check-list">{destinationIssues.map(item => <button type="button" key={item.id} onClick={() => { setSelectedDisplay(item.id); show("displays"); }}><strong>{displayName(item)}</strong><span>{displayGaps(item, doc.routes).join(" · ")}</span><span>Edit destination →</span></button>)}{issues.length ? issues.map(r => <button type="button" key={r.id} onClick={() => { setSelected(r.id); show("inspector"); }}><strong>{r.route || r.source || "Untitled route"}</strong><span>{routeGaps(r, doc.modules).join(" · ")}</span><span>Edit route →</span></button>) : destinationIssues.length ? null : <div className="empty"><h3>{doc.routes.length || doc.displays.length ? "No field gaps in enabled modules" : "No records to check yet"}</h3><p>Operator statuses are preserved separately from these checks.</p></div>}</div></section>, context: `${checkCount} need attention` };
      case "project": return { body: <section className="single-panel project-panel"><div className="panel-heading"><div><h2>Project & modules</h2><p>Use Video on its own. Add show details only when useful.</p></div></div><div className="project-scroll">
        <section><h3>Video plan</h3><div className="field-grid"><label>Plan name<input value={doc.title} onBlur={finishEdit} onChange={e => update({ ...doc, title: e.target.value }, "title")} /></label><label>Venue<input value={doc.meta.venue || ""} onBlur={finishEdit} onChange={e => update({ ...doc, meta: { ...doc.meta, venue: e.target.value } }, "venue")} /></label><label>Video lead<input value={doc.meta.videoLead || ""} onBlur={finishEdit} onChange={e => update({ ...doc, meta: { ...doc.meta, videoLead: e.target.value } }, "videoLead")} /></label></div><div className="row-actions"><button type="button" onClick={() => replace(emptyDocument())}>New plan</button><button type="button" onClick={() => replace(sampleDocument())}>Load sample</button></div></section>
        <section><h3>Optional modules</h3><p>Turn off what you do not need. Its fields stay in the plan and full export.</p>{([ ["patch", "Patch view", "Input assignments and converters"], ["displays", "Displays & Projection", "Destinations, screens and projector setups"], ["checks", "Route checks", "Field gaps and reported issues"], ["backups", "Backup details", "Alternate routes and equipment"] ] as [Module, string, string][]).map(([id, name, description]) => <label className="module-toggle" key={id}><input type="checkbox" checked={doc.modules[id]} onChange={() => toggleModule(id)} /><span><strong>{name}</strong><small>{description}</small></span></label>)}</section>
        <section><h3>Bring existing work together</h3><p>Import Signal Flow, Video Patch, Display Plan or Projection Plan sheets. Each source stays intact. Review imports before applying them.</p><div className="import-actions"><button type="button" disabled={reading} onClick={() => fileInput.current?.click()}>Import JSON file</button>{(Object.keys(LEGACY) as (keyof typeof LEGACY)[]).map(name => <button type="button" key={name} disabled={reading} onClick={() => importSaved(name)}>Import saved {name}</button>)}</div><p className="muted">Saved sheets are available only in the browser and site where they were created. JSON files work across sites.</p>{doc.imports.length > 0 && <details><summary>{doc.imports.length} original imports retained</summary>{doc.imports.map(i => <div className="original-import" key={i.id}><span>{i.name}</span><button type="button" onClick={() => download("original-sheet.json", i.raw)}>Export original</button></div>)}</details>}</section>
      </div></section>, context: doc.title };
      default: return { body: <p className="muted">This panel is not available in this version.</p> };
    }
  }
  const quick = [{ type: "flow", label: "Signal flow" }, ...(doc.modules.patch ? [{ type: "patch", label: "Patch" }] : []), ...(doc.modules.displays ? [{ type: "displays", label: "Displays" }] : []), ...(doc.modules.checks ? [{ type: "checks", label: "Checks", badge: checkCount }] : []), { type: "project", label: "Project" }];
  return <div className="video-app">
    <header className="app-header"><div className="app-identity"><span className="app-mark" aria-hidden="true">Vi</span><div><h1>AV Video</h1><p className="header-plan" title={doc.title}>{doc.title} · {dirty ? "Unsaved" : baseline.current ? "Saved in this browser" : "New plan"}</p></div></div>
      <div className="header-actions"><label className="theme-label"><span>Theme</span><select aria-label="Theme" value={theme} onChange={e => changeTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label><button type="button" className="primary" onClick={save}>Save{dirty ? " •" : ""}</button><button type="button" onClick={exportDoc}>Export</button></div>
    </header>
    <div className="plan-bar"><div className="plan-summary"><strong title={doc.title}>{doc.title}</strong><span>{doc.routes.length} routes · {doc.displays.length} destinations · {dirty ? "Unsaved changes" : baseline.current ? "Saved in this browser" : "New plan"}</span></div><div className="history-actions" aria-label="Edit history"><button type="button" onClick={undoEdit} disabled={!history.past.length} title="Undo (⌘/Ctrl Z)">↶ Undo</button><button type="button" onClick={redoEdit} disabled={!history.future.length} title="Redo (⌘/Ctrl Shift Z)">↷ Redo</button></div></div>
    <main id="workspace" tabIndex={-1} className="workspace-host">
      <ConsoleWorkspace ws={ws} label="AV Video" quick={quick} render={renderPanel} onViewsChange={storeViews} notify={text => notify(text)} />
    </main>
    <footer role="status" className={`message ${problem ? "error" : ""}`}>{message}</footer>
    <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={async e => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; try { await inspect(await file.text(), file.name); } catch (error) { notify(errorText(error), true); } }} />
    <dialog ref={dialog} aria-labelledby="import-title" onCancel={() => setPreview(null)}><h2 id="import-title">Review import</h2>{preview && <><p>{preview.name}</p><p><strong>{preview.routes.length} routes · {preview.displays.length} destinations</strong> · {Object.keys(preview.meta).length} metadata fields</p><p>{preview.restore ? "This backup replaces the current plan, including module choices. Export your current plan first if you need to keep it." : "Records will be added to this plan. Notes, statuses, and a complete original source copy are retained. Similar records are kept separate; route links require your selection. Extra fields and metadata remain in Export original."}</p><div className="import-preview">{preview.displays.map(item => <div key={item.id}><strong>{displayName(item)}</strong><span>{item.kind} · {item.status || "Unspecified"} · {item.route || "No original route reference"}</span></div>)}{preview.routes.map(r => <div key={r.id}><strong>{r.source || "Unnamed source"} → {r.destination || "Unnamed destination"}</strong><span>{r.route} · {r.status || "Unspecified"}</span></div>)}</div><div className="row-actions"><button type="button" onClick={() => setPreview(null)}>Cancel</button>{preview.restore && <button type="button" onClick={exportDoc}>Export current plan</button>}<button type="button" className="primary" onClick={confirmImport}>{preview.restore ? "Replace with backup" : preview.displays.length ? "Add destinations to plan" : "Add routes to plan"}</button></div></>}</dialog>
  </div>;
}
