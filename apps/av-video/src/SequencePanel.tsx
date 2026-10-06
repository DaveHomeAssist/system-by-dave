import { useState } from "react";
import { PresetSelect } from "./PresetSelect";
import { moveSequence, SequenceRecord, sequenceCsv } from "./sequences";
import type { VideoDocument } from "./model";

const labels: Record<string, string> = { number: "Shot number", cue: "Cue", camera: "Camera", type: "Type", subject: "Subject", framing: "Framing", movement: "Movement", preset: "Preset", status: "Status", notes: "Notes", file: "File", duration: "Duration", aspect: "Aspect ratio", audio: "Audio", destination: "Destination", backup: "Backup" };
export function SequencePanel<T extends SequenceRecord>({ family, rows, fields, statuses, create, name, summary, gaps, doc, selected, onSelect, onChange, onFinish, onRoute, onImport, notify }: {
  family: "cameras" | "playback"; rows: T[]; fields: readonly (keyof T & string)[]; statuses: string[];
  create: () => T; name: (row: T) => string; summary: (row: T) => string; gaps: (row: T, routes: VideoDocument["routes"]) => string[];
  doc: VideoDocument; selected: string; onSelect: (id: string) => void; onChange: (rows: T[], group?: string) => void;
  onFinish: () => void; onRoute: (id: string) => void; onImport: () => void; notify: (message: string, error?: boolean) => void;
}) {
  const camera = family === "cameras", title = camera ? "Cameras" : "Playback", noun = camera ? "shot" : "cue";
  const [detail, setDetail] = useState(Boolean(selected));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const item = rows.find(row => row.id === selected);
  const choose = (id: string) => { onSelect(id); setDetail(true); };
  const visible = rows.filter(row => (status === "all" || row.status === status) && fields.filter(field => doc.modules.backups || field !== "backup").map(field => row[field]).join(" ").toLowerCase().includes(query.toLowerCase()));
  const next = rows.find(row => camera ? row.status !== "taken" : row.status === "ready");
  const linked = doc.routes.find(route => route.id === item?.routeId);
  const setField = (key: keyof T & string, value: string, typing = false) => onChange(rows.map(row => row.id === selected ? { ...row, [key]: value } : row), typing ? `${family}:${selected}:${key}` : undefined);
  function add(duplicate = false) {
    const row = duplicate && item ? { ...item, id: crypto.randomUUID() } : create();
    const index = item ? rows.indexOf(item) + 1 : rows.length;
    onChange([...rows.slice(0, index), row, ...rows.slice(index)]); setQuery(""); setStatus("all"); choose(row.id);
  }
  function markNext() {
    if (!next) return;
    onChange(rows.map(row => row.id === next.id ? { ...row, status: camera ? "taken" : "played" } : row));
    setQuery(""); setStatus("all"); choose(next.id);
    notify(`${name(next)} marked ${camera ? "taken" : "played"}. Operator record only; no equipment command was sent.`);
  }
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([sequenceCsv(rows, fields)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `av-video-${family}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`All ${title.toLowerCase()} records exported. Use Export for a complete restorable plan.`);
  }
  return <div className={`sequence-layout ${detail && item ? "sequence-detail-open" : ""}`}>
    <section className="route-browser" aria-label={`${title} list`}>
      <div className="panel-heading"><div><h2>{title}</h2><p>{rows.length} {noun}{rows.length === 1 ? "" : "s"} · {rows.filter(row => row.status === (camera ? "taken" : "played")).length} {camera ? "taken" : "played"}</p></div></div>
      <div className="sequence-actions"><button className="primary" type="button" onClick={() => add()}>Add {noun}</button><button type="button" onClick={markNext} disabled={!next}>{camera ? "Take next" : "Mark next ready played"}</button><button type="button" onClick={exportCsv} disabled={!rows.length}>Export {noun}s CSV</button></div>
      <p className="sequence-next">Next: {next ? name(next) : camera ? "No untaken shots" : "No ready cues"}</p>
      <div className="filters"><input type="search" aria-label={`Search ${title.toLowerCase()}`} placeholder={`Find a ${noun}…`} value={query} onChange={e => setQuery(e.target.value)} /><PresetSelect label={`${title} status filter`} value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, ...Array.from(new Set([...statuses, ...rows.map(row => row.status)])).map(value => ({ value, label: value || "Unspecified" }))]} /></div>
      <div className="route-list">{visible.map(row => <button type="button" key={row.id} className={`route-card ${row.id === selected ? "selected" : ""}`} aria-pressed={row.id === selected} onClick={() => choose(row.id)}>
        <span className="route-card-title"><strong>{name(row)}</strong><span className={`status status-${["problem", "issue"].includes(row.status) ? "issue" : "normal"}`}>{row.status || "Unspecified"}</span></span>
        <span className="destination-summary">{summary(row)}</span>
        {doc.modules.checks && <span className="route-card-footer">{gaps(row, doc.routes).length} planning checks</span>}
      </button>)}{!visible.length && <div className="empty"><h3>{rows.length ? `No matching ${noun}s` : `Prepare your ${noun}s`}</h3><p>{rows.length ? "Adjust the search or status filter." : `Add a ${noun} or preview an existing sheet. Original text and statuses stay intact.`}</p>{rows.length ? <button type="button" onClick={() => { setQuery(""); setStatus("all"); }}>Clear filters</button> : <button type="button" onClick={onImport}>Import {camera ? "camera" : "playback"} sheet</button>}</div>}</div>
    </section>
    <section className="inspector sequence-inspector" aria-label={`${title} editor`}>
      <div className="panel-heading"><div><h2>{camera ? "Shot" : "Cue"} details</h2><p>{camera ? "Shot calls are operator records." : "Marks playback history; does not play media."}</p></div><button type="button" className="sequence-back" onClick={() => setDetail(false)}>Back to {noun}s</button></div>
      {item ? <div className="editor-scroll">
        <div className="field-grid">{fields.filter(key => doc.modules.backups || key !== "backup").map(key => <label key={key} className={key === "notes" ? "wide" : ""}>{labels[key] || key}
          {key === "status" ? <PresetSelect label={`${camera ? "Shot" : "Cue"} status`} value={item.status} onChange={value => setField(key, value)} options={Array.from(new Set([...statuses, item.status])).map(value => ({ value, label: value || "Unspecified" }))} /> : key === "notes" ? <textarea aria-label={`${camera ? "Shot" : "Cue"} notes`} rows={4} value={String(item[key])} onBlur={onFinish} onChange={e => setField(key, e.target.value, true)} /> : <input aria-label={`${camera ? "Shot" : "Playback"} ${labels[key] || key}`} value={String(item[key])} onBlur={onFinish} onChange={e => setField(key, e.target.value, true)} />}
        </label>)}</div>
        <fieldset className="route-link sequence-route"><legend>Optional signal route</legend><PresetSelect label={`${title} linked route`} value={item.routeId} onChange={value => setField("routeId", value)} options={[{ value: "", label: "Not linked" }, ...(item.routeId && !linked ? [{ value: item.routeId, label: "Removed route — choose a replacement" }] : []), ...doc.routes.map(route => ({ value: route.id, label: route.route || `${route.source || "Source needed"} → ${route.destination || "Destination needed"}` }))]} />{linked && <button type="button" onClick={() => onRoute(linked.id)}>Trace linked route</button>}<p>Link explicitly; labels never merge devices automatically.</p></fieldset>
        {doc.modules.checks && <div className="route-checks"><h3>{camera ? "Shot" : "Cue"} checks</h3>{gaps(item, doc.routes).length ? <ul>{gaps(item, doc.routes).map(gap => <li key={gap}>{gap}</li>)}</ul> : <p>No required field gaps. Confirm the physical source and operator readiness separately.</p>}</div>}
        {item.origin && <p className="provenance">Imported from {doc.imports.find(source => source.id === item.origin)?.name || "an original sheet"}. Metadata, original IDs and extra fields remain in Export original.</p>}
        <div className="row-actions"><button type="button" onClick={() => add(true)}>Duplicate {noun}</button><button type="button" disabled={rows.indexOf(item) === 0} onClick={() => onChange(moveSequence(rows, item.id, -1))}>Move {noun} up</button><button type="button" disabled={rows.indexOf(item) === rows.length - 1} onClick={() => onChange(moveSequence(rows, item.id, 1))}>Move {noun} down</button><button type="button" className="danger" onClick={() => { if (!confirm(`Remove this ${noun}? The original import and signal route are retained.`)) return; onChange(rows.filter(row => row.id !== item.id)); onSelect(""); setDetail(false); }}>Remove {noun}</button></div>
      </div> : <div className="empty"><p>Select a {noun} or add one.</p></div>}
    </section>
  </div>;
}
