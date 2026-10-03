import { useEffect, useState } from "react";
import { PresetSelect } from "./PresetSelect";
import { Display, displayFields, displayGaps, displayName, displaysCsv, newDisplay, projectionFields, suggestedRoutes } from "./displays";
import { uid, VideoDocument } from "./model";

const labels: Record<string, string> = { display: "Display name", type: "Display type", input: "Destination input", processor: "Display processor", resolution: "Resolution", aspect: "Aspect ratio", refresh: "Refresh rate", route: "Original route reference", backup: "Backup plan", status: "Destination status", notes: "Destination notes", screen: "Screen name", surface: "Surface", size: "Screen size", projector: "Projector", lens: "Lens", throwDistance: "Throw distance", position: "Projector position", blend: "Blend" };
const statuses = ["planned", "cabled", "routed", "rigged", "focused", "lined", "tested", "ready", "issue", "backup", "spare"];
export function DisplaysPanel({ doc, selected, onSelect, onChange, onFinish, onRoute, onImport, notify }: {
  doc: VideoDocument; selected: string; onSelect: (id: string) => void;
  onChange: (doc: VideoDocument, group?: string) => void; onFinish: () => void;
  onRoute: (id: string) => void; onImport: () => void; notify: (message: string, error?: boolean) => void;
}) {
  const [detail, setDetail] = useState(Boolean(selected));
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const item = doc.displays.find(row => row.id === selected);
  useEffect(() => { if (selected && !item) { onSelect(""); setDetail(false); } }, [selected, item, onSelect]);
  const choose = (id: string) => { onSelect(id); setDetail(true); };
  const add = (kind: Display["kind"]) => { const next = newDisplay(kind); onChange({ ...doc, displays: [...doc.displays, next] }); setQuery(""); setKind("all"); choose(next.id); };
  const edit = (field: keyof Display, value: string, typing = false) => onChange({ ...doc, displays: doc.displays.map(row => row.id === selected ? { ...row, [field]: value } : row) }, typing ? `display:${selected}:${field}` : undefined);
  const visible = doc.displays.filter(row => (kind === "all" || row.kind === kind) && [...(row.kind === "display" ? displayFields : projectionFields)].filter(field => doc.modules.backups || field !== "backup").map(field => row[field]).join(" ").toLowerCase().includes(query.toLowerCase()));
  const linked = doc.routes.find(route => route.id === item?.routeId);
  const suggestions = item ? suggestedRoutes(item, doc.routes) : [];
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([displaysCsv(doc.displays)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "av-video-displays.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("All display and projection records exported. Use Export for a restorable full plan.");
  }
  const field = (name: keyof Display) => item && <label key={name} className={name === "notes" ? "wide" : ""}>{labels[name]}
    {name === "notes" ? <textarea aria-label={labels[name]} rows={4} value={item[name]} onBlur={onFinish} onChange={e => edit(name, e.target.value, true)} /> : name === "status" ? <PresetSelect label="Destination status" value={item.status} onChange={value => edit("status", value)} options={Array.from(new Set([...statuses, item.status])).map(status => ({ value: status, label: status || "Unspecified" }))} /> : <input aria-label={labels[name]} value={item[name]} onBlur={onFinish} onChange={e => edit(name, e.target.value, true)} />}
  </label>;
  return <div className={`displays-layout ${detail ? "display-detail-open" : ""}`}>
    <section className="route-browser" aria-label="Display and projection destinations">
      <div className="panel-heading"><div><h2>Displays & Projection</h2><p>{doc.displays.length} {doc.displays.length === 1 ? "destination" : "destinations"} · link each to its signal route</p></div></div>
      <div className="display-actions"><button className="primary" type="button" onClick={() => add("display")}>Add display</button><button type="button" onClick={() => add("projection")}>Add projection</button><button type="button" onClick={exportCsv} disabled={!doc.displays.length}>Export CSV</button></div>
      <div className="filters"><input type="search" aria-label="Search destinations" placeholder="Find a destination…" value={query} onChange={e => setQuery(e.target.value)} /><PresetSelect label="Destination kind" value={kind} onChange={setKind} options={[{ value: "all", label: "All types" }, { value: "display", label: "Displays" }, { value: "projection", label: "Projection" }]} /></div>
      <div className="route-list">{visible.map(row => {
        const route = doc.routes.find(route => route.id === row.routeId);
        return <button type="button" key={row.id} className={`route-card ${selected === row.id ? "selected" : ""}`} aria-pressed={selected === row.id} onClick={() => choose(row.id)}>
          <span className="route-card-title"><strong>{displayName(row)}</strong><span className={`status status-${row.status === "issue" ? "issue" : "normal"}`}>{row.status || "Unspecified"}</span></span>
          <span className="destination-summary">{row.kind === "projection" ? ["Projection", row.projector, row.size].filter(Boolean).join(" · ") : ["Display", row.type, row.resolution].filter(Boolean).join(" · ")}</span>
          <span className="destination-route">{route ? `${route.source || "Source needed"} → ${route.destination || "Destination needed"}` : row.routeId ? "Linked route removed" : "Route not linked"}</span>
          {doc.modules.checks && <span className="route-card-footer">{displayGaps(row, doc.routes).length ? `${displayGaps(row, doc.routes).length} planning ${displayGaps(row, doc.routes).length === 1 ? "check" : "checks"}` : "Required fields filled · physical test still required"}</span>}
        </button>;
      })}{!visible.length && <div className="empty"><h3>{doc.displays.length ? "No matching destinations" : "Plan the destination"}</h3><p>{doc.displays.length ? "Change the search or destination filter." : "Add a display or projection setup, then link it to a route. Existing sheets can be imported with their original notes and statuses."}</p>{doc.displays.length ? <button type="button" onClick={() => { setQuery(""); setKind("all"); }}>Clear destination filters</button> : <button type="button" onClick={onImport}>Import display or projection sheets</button>}</div>}</div>
      <div className="specialist-links"><a href="/ProjectorThrow/">Open Throwline</a><a href="/led-wall-calculator.html">LED Wall Calculator</a><small>Separate planners; your video plan stays here. Save before leaving.</small></div>
    </section>
    <section className="inspector display-inspector" aria-label="Destination editor"><div className="panel-heading"><div><h2>{item?.kind === "projection" ? "Projection details" : "Display details"}</h2><p>Destination status is reported separately from its route.</p></div><button type="button" className="mobile-back" onClick={() => setDetail(false)}>Back to destinations</button></div>
      {item ? <div className="editor-scroll">
        <fieldset className="route-link"><legend>Signal route</legend><label>Linked route<PresetSelect label="Linked route" value={item.routeId} onChange={value => edit("routeId", value)} options={[{ value: "", label: "Not linked" }, ...(item.routeId && !linked ? [{ value: item.routeId, label: "Removed route — choose a replacement" }] : []), ...doc.routes.map(route => ({ value: route.id, label: route.route || `${route.source || "Source needed"} → ${route.destination || "Destination needed"}` }))]} /></label>
          {linked ? <><p>{linked.source || "Source needed"} → {linked.destination || "Destination needed"} · {linked.status || "Unspecified"}</p><button type="button" onClick={() => onRoute(linked.id)}>Trace linked route</button></> : <p>Choose a route to connect this record to the signal canvas. Linking does not overwrite either record.</p>}
          {!item.routeId && suggestions.length > 0 && <p>Possible matches: {suggestions.map(route => route.route || route.destination).join(" · ")}. Select the correct route above.</p>}
        </fieldset>
        <div className="field-grid">{(item.kind === "display" ? displayFields : projectionFields).filter(name => doc.modules.backups || name !== "backup").map(name => field(name))}</div>
        <p className="signal-note">Enter dimensions with units. Status is operator reported; no physical test or optical calculation is inferred.</p>
        {doc.modules.checks && <div className="route-checks"><h3>Destination checks</h3>{displayGaps(item, doc.routes).length ? <ul>{displayGaps(item, doc.routes).map(gap => <li key={gap}>{gap}</li>)}</ul> : <p>Required fields filled. Verify the physical setup before marking it ready.</p>}</div>}
        {item.origin && <p className="provenance">Imported from {doc.imports.find(entry => entry.id === item.origin)?.name || "an original sheet"}. Full source and metadata remain in Export original.</p>}
        <div className="row-actions"><button type="button" onClick={() => { const copy = { ...item, id: uid() }; onChange({ ...doc, displays: [...doc.displays, copy] }); choose(copy.id); }}>Duplicate destination</button><button type="button" className="danger" onClick={() => { if (!confirm("Remove this destination record? Its signal route is retained.")) return; onChange({ ...doc, displays: doc.displays.filter(row => row.id !== item.id) }); onSelect(""); setDetail(false); }}>Remove destination</button></div>
      </div> : <div className="empty"><p>Select a destination or add a new one.</p></div>}
    </section>
  </div>;
}
